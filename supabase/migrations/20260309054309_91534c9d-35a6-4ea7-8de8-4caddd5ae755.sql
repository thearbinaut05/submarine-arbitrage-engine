
-- Embedded wallets for users who don't have MetaMask
CREATE TABLE public.embedded_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  encrypted_private_key text NOT NULL,
  network text NOT NULL DEFAULT 'ethereum',
  label text DEFAULT 'Embedded Wallet',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, network)
);

-- RLS
ALTER TABLE public.embedded_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embedded wallets"
  ON public.embedded_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own embedded wallets"
  ON public.embedded_wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own embedded wallets"
  ON public.embedded_wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role needs access for edge functions
CREATE POLICY "Service role full access embedded wallets"
  ON public.embedded_wallets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_embedded_wallets_updated_at
  BEFORE UPDATE ON public.embedded_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
