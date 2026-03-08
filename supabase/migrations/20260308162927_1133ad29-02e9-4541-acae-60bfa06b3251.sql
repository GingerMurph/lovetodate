
-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS prevent_self_verification_trigger ON public.profiles;

-- Expand prevent_self_verification to cover ALL verification columns
CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      NEW.is_verified := OLD.is_verified;
      NEW.verified_at := OLD.verified_at;
    END IF;
    IF NEW.age_verified IS DISTINCT FROM OLD.age_verified THEN
      NEW.age_verified := OLD.age_verified;
      NEW.age_verified_at := OLD.age_verified_at;
    END IF;
    IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
      NEW.phone_verified := OLD.phone_verified;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_self_verification_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_verification();

-- Nullify existing sensitive data in profiles (already migrated to profile_private_data)
UPDATE public.profiles SET
  phone_number = NULL,
  date_of_birth = NULL,
  verification_selfie_url = NULL,
  date_of_birth_verified = NULL;
