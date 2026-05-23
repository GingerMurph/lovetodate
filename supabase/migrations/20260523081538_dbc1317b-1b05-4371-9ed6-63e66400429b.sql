REVOKE EXECUTE ON FUNCTION public.is_security_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_security_admin(uuid) TO service_role;