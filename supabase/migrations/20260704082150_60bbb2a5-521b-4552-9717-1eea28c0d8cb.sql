-- Trigger function should not be callable directly by any client
REVOKE EXECUTE ON FUNCTION public.prevent_self_verification_ppd() FROM PUBLIC, anon, authenticated;

-- Own-profile fetch: signed-in only, never anon
REVOKE EXECUTE ON FUNCTION public.get_own_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;