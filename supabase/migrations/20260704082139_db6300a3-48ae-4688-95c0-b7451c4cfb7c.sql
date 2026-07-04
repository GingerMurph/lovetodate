-- 1. Prevent self-write of verification timestamps on profile_private_data
CREATE OR REPLACE FUNCTION public.prevent_self_verification_ppd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _jwt_role text;
BEGIN
  _jwt_role := current_setting('request.jwt.claim.role', true);
  IF _jwt_role IS NULL OR _jwt_role = '' THEN
    BEGIN
      _jwt_role := (current_setting('request.jwt.claims', true)::json ->> 'role');
    EXCEPTION WHEN others THEN
      _jwt_role := NULL;
    END;
  END IF;

  IF _jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.age_verified_at IS DISTINCT FROM OLD.age_verified_at
     OR NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at
     OR NEW.date_of_birth_verified IS DISTINCT FROM OLD.date_of_birth_verified
  THEN
    RAISE EXCEPTION 'Verification timestamps can only be modified by server-side verification flows'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_verification_ppd ON public.profile_private_data;
CREATE TRIGGER trg_prevent_self_verification_ppd
BEFORE UPDATE ON public.profile_private_data
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verification_ppd();

-- 2. Restrict sensitive profile columns from bulk cross-user reads.
-- Cross-user profile fetches must go through the view-profile / discover-profiles
-- edge functions (service_role). Own-profile reads use get_own_profile() below.
REVOKE SELECT (weight_kg, political_beliefs, religion, ethnicity, nationality, non_negotiables, voice_intro_url)
  ON public.profiles FROM authenticated;
REVOKE SELECT (weight_kg, political_beliefs, religion, ethnicity, nationality, non_negotiables, voice_intro_url)
  ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;