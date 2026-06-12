ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

COMMENT ON FUNCTION public.cleanup_old_rate_limits() IS
  'Service-role-only cleanup of public.rate_limits. SECURITY DEFINER is required because the table is service-role-only and EXECUTE is revoked from anon/authenticated.';