
-- Fix 1: Revoke SELECT on sensitive columns from authenticated/anon on profiles table
-- (date_of_birth and verification_selfie_url may already be revoked, but this ensures completeness)
REVOKE SELECT (phone_number, latitude, longitude, weight_kg, date_of_birth, verification_selfie_url, date_of_birth_verified) ON public.profiles FROM anon, authenticated;

-- Fix 2: Restrict subscriber_cache SELECT policy to own row only
DROP POLICY IF EXISTS "Anyone can read subscriber cache" ON public.subscriber_cache;
CREATE POLICY "Users can view own subscription status"
  ON public.subscriber_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
