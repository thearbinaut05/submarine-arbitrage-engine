-- Supabase migration: Tap to Earn + Gas Pool
-- Run: supabase db push (or npx supabase migration up)

-- Enable RLS policies later
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL, -- 'ethereum', 'arbitrum', etc.
  points BIGINT DEFAULT 0 NOT NULL,
  daily_taps INTEGER DEFAULT 0 NOT NULL,
  total_taps BIGINT DEFAULT 0 NOT NULL,
  last_tap_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_points_wallet ON public.user_points(wallet_address, network);

CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet_address TEXT,
  ad_type TEXT NOT NULL, -- 'banner_impression', 'video_view', 'click'
  estimated_revenue NUMERIC(10,6) DEFAULT 0, -- USD cents
  duration_seconds INTEGER,
  network TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_wallet ON public.ad_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON public.ad_events(created_at);

CREATE TABLE IF NOT EXISTS public.gas_pool_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_hash TEXT,
  amount_eth NUMERIC(20,8),
  sponsor_type TEXT NOT NULL, -- 'ad_revenue', 'tap_referral', 'manual_deposit'
  funded_by_wallet TEXT,
  pool_contract TEXT NOT NULL, -- GasPoolSponsor address after deploy
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE
  ON public.user_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: User dashboard stats
CREATE VIEW public.user_tap_stats AS
SELECT 
  wallet_address,
  network,
  points,
  daily_taps,
  total_taps,
  last_tap_timestamp,
  COUNT(*) OVER (PARTITION BY wallet_address) as ad_views,
  COALESCE(SUM(estimated_revenue), 0) as total_ad_revenue
FROM public.user_points up
LEFT JOIN public.ad_events ae ON up.wallet_address = ae.wallet_address
GROUP BY up.id, up.wallet_address, up.network, up.points, up.daily_taps, up.total_taps, up.last_tap_timestamp;

-- RLS (enable after testing)
-- ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY user_points_own ON public.user_points FOR ALL USING (auth.uid() = user_id);

