-- Create enum types for transaction and opportunity tracking
CREATE TYPE public.network_type AS ENUM ('ethereum', 'arbitrum', 'polygon', 'bsc');
CREATE TYPE public.opportunity_type AS ENUM ('flash_loan', 'flash_swap', 'cross_chain');
CREATE TYPE public.opportunity_status AS ENUM ('pending', 'executing', 'completed', 'failed');
CREATE TYPE public.transaction_type AS ENUM ('flash_loan', 'swap', 'bridge', 'rebalance');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'confirmed', 'failed');

-- Create arbitrage_opportunities table
CREATE TABLE public.arbitrage_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type opportunity_type NOT NULL,
  source_network network_type NOT NULL,
  target_network network_type,
  source_dex TEXT NOT NULL,
  target_dex TEXT NOT NULL,
  token_in TEXT NOT NULL,
  token_out TEXT NOT NULL,
  amount_in NUMERIC NOT NULL,
  profit_percent NUMERIC NOT NULL,
  profit_usd NUMERIC NOT NULL,
  gas_estimate TEXT NOT NULL,
  net_profit NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  route TEXT[] NOT NULL,
  status opportunity_status NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.arbitrage_opportunities(id) ON DELETE SET NULL,
  hash TEXT,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  network network_type NOT NULL,
  gas_used TEXT,
  gas_price TEXT,
  profit NUMERIC,
  is_gasless BOOLEAN DEFAULT false,
  is_submarine BOOLEAN DEFAULT false,
  relayer_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table for scanner config
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  auto_execute BOOLEAN DEFAULT false,
  min_profit_percent NUMERIC DEFAULT 0.5,
  min_profit_usd NUMERIC DEFAULT 50,
  max_gas_gwei NUMERIC DEFAULT 100,
  scan_interval INTEGER DEFAULT 2000,
  enabled_networks network_type[] DEFAULT ARRAY['ethereum', 'arbitrum', 'polygon', 'bsc']::network_type[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_wallets table
CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for arbitrage_opportunities
CREATE POLICY "Users can view their own opportunities" 
ON public.arbitrage_opportunities FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own opportunities" 
ON public.arbitrage_opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunities" 
ON public.arbitrage_opportunities FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings" 
ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallets" 
ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallets" 
ON public.user_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets" 
ON public.user_wallets FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.arbitrage_opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_opportunities_user_id ON public.arbitrage_opportunities(user_id);
CREATE INDEX idx_opportunities_status ON public.arbitrage_opportunities(status);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_wallets_user_id ON public.user_wallets(user_id);