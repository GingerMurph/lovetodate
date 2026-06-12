CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _jwt_role text;
BEGIN
  -- Detect service-role callers via the JWT claim set by PostgREST/GoTrue.
  -- SECURITY DEFINER changes current_user, so we cannot rely on it.
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

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.age_verified IS DISTINCT FROM OLD.age_verified
     OR NEW.age_verified_at IS DISTINCT FROM OLD.age_verified_at
     OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
  THEN
    RAISE EXCEPTION 'Verification flags can only be modified by server-side verification flows'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;