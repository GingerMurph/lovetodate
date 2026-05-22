CREATE OR REPLACE FUNCTION public.hash_otp(_otp text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.crypt(_otp, extensions.gen_salt('bf', 8));
$$;

CREATE OR REPLACE FUNCTION public.verify_otp(_otp text, _hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT _hash IS NOT NULL AND extensions.crypt(_otp, _hash) = _hash;
$$;

REVOKE ALL ON FUNCTION public.hash_otp(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_otp(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hash_otp(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_otp(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_otp(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_otp(text, text) TO service_role;
