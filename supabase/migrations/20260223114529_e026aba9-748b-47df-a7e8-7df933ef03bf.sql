
-- Restrict cleanup_old_rate_limits to service_role only
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;
