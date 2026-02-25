
-- =============================================
-- FIX 1: Prevent client-side verification bypass
-- Users should not be able to set is_verified=true directly
-- =============================================

-- Trigger that prevents authenticated users from setting is_verified to true directly
-- Only service_role (edge functions) can set is_verified = true
CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If is_verified is being changed to true and the caller is not service_role
  IF NEW.is_verified = true AND OLD.is_verified = false THEN
    -- Check if the current role is service_role (edge functions use service_role)
    IF current_setting('role') != 'service_role' THEN
      -- Block the change - revert to old value
      NEW.is_verified := OLD.is_verified;
      NEW.verified_at := OLD.verified_at;
      NEW.verification_selfie_url := OLD.verification_selfie_url;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_self_verification_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_verification();

-- =============================================
-- FIX 2: Protect GPS coordinates from direct access
-- Move lat/lng to a separate table only accessible by service_role
-- =============================================

-- Create private locations table
CREATE TABLE public.user_locations (
  user_id uuid NOT NULL PRIMARY KEY,
  latitude double precision,
  longitude double precision,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS with NO policies = only service_role can access
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Migrate existing data
INSERT INTO public.user_locations (user_id, latitude, longitude)
SELECT user_id, latitude, longitude FROM public.profiles
WHERE latitude IS NOT NULL OR longitude IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Nullify lat/lng in profiles table (keep columns for type compatibility)
UPDATE public.profiles SET latitude = NULL, longitude = NULL WHERE latitude IS NOT NULL OR longitude IS NOT NULL;

-- Trigger: intercept lat/lng writes to profiles, redirect to user_locations, nullify in profiles
CREATE OR REPLACE FUNCTION public.redirect_location_to_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If lat/lng are being set, redirect to user_locations table
  IF NEW.latitude IS NOT NULL OR NEW.longitude IS NOT NULL THEN
    INSERT INTO public.user_locations (user_id, latitude, longitude, updated_at)
    VALUES (NEW.user_id, NEW.latitude, NEW.longitude, now())
    ON CONFLICT (user_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      updated_at = now();
    -- Nullify in profiles so they're never exposed via RLS
    NEW.latitude := NULL;
    NEW.longitude := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER redirect_location_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.redirect_location_to_private();
