CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  network public.network_type NOT NULL DEFAULT 'ethereum',
  points INTEGER NOT NULL DEFAULT 0,
  daily_taps INTEGER NOT NULL DEFAULT 0,
  total_taps INTEGER NOT NULL DEFAULT 0,
  last_tap_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_points_wallet_network_key UNIQUE (wallet_address, network)
);

CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT,
  ad_type TEXT NOT NULL DEFAULT 'banner_impression',
  estimated_revenue NUMERIC(12, 4) NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gas_pool_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_eth NUMERIC(20, 8) NOT NULL DEFAULT 0,
  sponsor_type TEXT NOT NULL,
  funded_by_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_points_wallet_network ON public.user_points (wallet_address, network);
CREATE INDEX IF NOT EXISTS idx_ad_events_created_at ON public.ad_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gas_pool_logs_created_at ON public.gas_pool_logs (created_at DESC);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_pool_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view user points" ON public.user_points;
CREATE POLICY "Public can view user points"
ON public.user_points
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Service role manages user points" ON public.user_points;
CREATE POLICY "Service role manages user points"
ON public.user_points
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages ad events" ON public.ad_events;
CREATE POLICY "Service role manages ad events"
ON public.ad_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages gas pool logs" ON public.gas_pool_logs;
CREATE POLICY "Service role manages gas pool logs"
ON public.gas_pool_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS update_user_points_updated_at ON public.user_points;
CREATE TRIGGER update_user_points_updated_at
BEFORE UPDATE ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();