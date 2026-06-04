-- user_points: require authentication to view (no user_id column to scope further)
DROP POLICY IF EXISTS "Public can view user points" ON public.user_points;
CREATE POLICY "Authenticated can view user points"
ON public.user_points
FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.user_points FROM anon;

-- embedded_wallets: restrict column-level SELECT so encrypted_private_key is not readable by clients
REVOKE SELECT ON public.embedded_wallets FROM authenticated;
GRANT SELECT (id, user_id, address, network, label, is_active, created_at, updated_at)
  ON public.embedded_wallets TO authenticated;

CREATE POLICY "Users can delete own embedded wallets"
ON public.embedded_wallets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);