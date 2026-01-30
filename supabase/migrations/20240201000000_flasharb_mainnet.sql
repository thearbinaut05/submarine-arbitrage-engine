-- Supabase Migration: FlashArb Arbitrage Engine Database
-- Run this in Supabase SQL Editor to set up the database

-- =============================================================================
-- Enable UUID extension
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Create enum types
-- =============================================================================
CREATE TYPE opportunity_status AS ENUM ('pending', 'executing', 'completed', 'failed');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE opportunity_type AS ENUM ('flash_loan', 'flash_swap', 'cross_chain');

-- =============================================================================
-- Create tables
-- =============================================================================

-- 1. Arbitrage Opportunities Table
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type opportunity_type NOT NULL DEFAULT 'flash_loan',
  source_network VARCHAR(50) NOT NULL,
  source_dex VARCHAR(100) NOT NULL,
  target_dex VARCHAR(100) NOT NULL,
  token_in VARCHAR(100) NOT NULL,
  token_out VARCHAR(100) NOT NULL,
  amount_in DECIMAL(36, 0) DEFAULT 0,
  profit_percent DECIMAL(10, 4) DEFAULT 0,
  profit_usd DECIMAL(36, 0) DEFAULT 0,
  gas_estimate VARCHAR(50) DEFAULT '0',
  net_profit DECIMAL(36, 0) DEFAULT 0,
  confidence DECIMAL(5, 2) DEFAULT 0,
  route TEXT[] DEFAULT '{}',
  status opportunity_status DEFAULT 'pending',
  is_gasless BOOLEAN DEFAULT false,
  is_submarine BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES arbitrage_opportunities(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'flash_loan',
  status transaction_status DEFAULT 'pending',
  network VARCHAR(50) NOT NULL,
  hash VARCHAR(255) DEFAULT 'pending', -- Gelato task ID or tx hash
  real_tx_hash VARCHAR(255), -- Real blockchain transaction hash
  from_address VARCHAR(100),
  to_address VARCHAR(100),
  value DECIMAL(36, 0) DEFAULT 0,
  gas_used VARCHAR(50),
  gas_cost DECIMAL(36, 0) DEFAULT 0,
  is_gasless BOOLEAN DEFAULT false,
  is_submarine BOOLEAN DEFAULT false,
  relayer_address VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Positions Table
CREATE TABLE IF NOT EXISTS user_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol VARCHAR(100) NOT NULL,
  network VARCHAR(50) NOT NULL,
  position_type VARCHAR(50) NOT NULL,
  asset VARCHAR(100) NOT NULL,
  amount DECIMAL(36, 0) DEFAULT 0,
  value_usd DECIMAL(36, 0) DEFAULT 0,
  apy DECIMAL(10, 4) DEFAULT 0,
  health_factor DECIMAL(10, 4),
  collateral DECIMAL(36, 0),
  debt DECIMAL(36, 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Scan History Table
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  network VARCHAR(50) NOT NULL,
  opportunities_found INTEGER DEFAULT 0,
  profitable_count INTEGER DEFAULT 0,
  scan_duration_ms INTEGER DEFAULT 0,
  errors TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Create indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON arbitrage_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON arbitrage_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_network ON arbitrage_opportunities(source_network);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON arbitrage_opportunities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);
CREATE INDEX IF NOT EXISTS idx_transactions_real_tx_hash ON transactions(real_tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_network ON transactions(network);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_network ON user_positions(network);

-- =============================================================================
-- Enable Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- Create policies for arbitrage_opportunities
CREATE POLICY "Users can view their own opportunities" ON arbitrage_opportunities
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own opportunities" ON arbitrage_opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunities" ON arbitrage_opportunities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opportunities" ON arbitrage_opportunities
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_positions
CREATE POLICY "Users can view their own positions" ON user_positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own positions" ON user_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions" ON user_positions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own positions" ON user_positions
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for scan_history (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view scan history" ON scan_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert scan history" ON scan_history
  FOR INSERT WITH CHECK (auth.uid() IS NULL); -- System inserts

-- =============================================================================
-- Create functions for updated_at timestamps
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_arbitrage_opportunities_updated_at
  BEFORE UPDATE ON arbitrage_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_positions_updated_at
  BEFORE UPDATE ON user_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Create webhook handler function for Gelato callbacks
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_gelato_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Update transaction with real blockchain hash
  UPDATE transactions
  SET 
    real_tx_hash = NEW.real_tx_hash,
    status = NEW.status,
    updated_at = NOW()
  WHERE hash = NEW.task_id;
  
  -- Update opportunity status if transaction succeeded
  IF NEW.status = 'confirmed' THEN
    UPDATE arbitrage_opportunities
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id IN (
      SELECT opportunity_id FROM transactions WHERE hash = NEW.task_id
    );
  ELSIF NEW.status = 'failed' THEN
    UPDATE arbitrage_opportunities
    SET 
      status = 'failed',
      updated_at = NOW()
    WHERE id IN (
      SELECT opportunity_id FROM transactions WHERE hash = NEW.task_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- Create a function to calculate total profit
-- =============================================================================
CREATE OR REPLACE FUNCTION get_total_profit(user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_profit DECIMAL;
BEGIN
  SELECT COALESCE(SUM(net_profit), 0) INTO total_profit
  FROM arbitrage_opportunities
  WHERE user_id = get_total_profit.user_id AND status = 'completed';
  
  RETURN total_profit;
END;
$$ language 'plpgsql' STABLE;

-- =============================================================================
-- Create a view for dashboard statistics
-- =============================================================================
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  user_id,
  COUNT(*) as total_opportunities,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_trades,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_trades,
  COUNT(*) FILTER (WHERE status = 'executing') as pending_trades,
  SUM(net_profit) FILTER (WHERE status = 'completed') as total_profit_wei,
  AVG(profit_percent) FILTER (WHERE status = 'completed') as avg_profit_percent,
  MAX(created_at) as last_trade_time
FROM arbitrage_opportunities
GROUP BY user_id;

-- =============================================================================
-- Grant execute permission on functions for authenticated users
-- =============================================================================
GRANT EXECUTE ON FUNCTION handle_gelato_webhook() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_profit(UUID) TO authenticated;
GRANT SELECT ON dashboard_stats TO authenticated;

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON TABLE arbitrage_opportunities IS 'Stores detected and executed arbitrage opportunities';
COMMENT ON TABLE transactions IS 'Tracks blockchain transactions including gasless relay transactions';
COMMENT ON TABLE user_positions IS 'Stores user DeFi positions across protocols';
COMMENT ON TABLE scan_history IS 'Historical record of arbitrage scans';

-- =============================================================================
-- Seed some sample data for testing (optional)
-- =============================================================================
-- INSERT INTO scan_history (network, opportunities_found, profitable_count, scan_duration_ms)
-- VALUES ('ethereum', 5, 2, 150);

PRINT 'FlashArb database migration complete!';

