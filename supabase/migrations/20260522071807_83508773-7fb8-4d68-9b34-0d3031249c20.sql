-- Ensure pgcrypto is available for hashing OTPs
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Prevent users from self-granting verification flags via direct table updates
DROP TRIGGER IF EXISTS prevent_self_verification_trigger ON public.profiles;
CREATE TRIGGER prevent_self_verification_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_verification();

-- Also redirect location writes to private table
DROP TRIGGER IF EXISTS redirect_location_to_private_trigger ON public.profiles;
CREATE TRIGGER redirect_location_to_private_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.redirect_location_to_private();
