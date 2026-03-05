-- Add explicit deny-all INSERT/UPDATE/DELETE policies on unlocked_connections
-- Connections must only be created via server-side edge functions (service_role)

CREATE POLICY "No client insert" ON public.unlocked_connections
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "No client update" ON public.unlocked_connections
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "No client delete" ON public.unlocked_connections
  FOR DELETE TO authenticated
  USING (false);