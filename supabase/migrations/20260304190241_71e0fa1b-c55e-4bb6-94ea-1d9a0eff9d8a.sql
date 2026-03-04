
-- Revoke SELECT on sensitive columns from anon and authenticated roles
-- They should only be accessible via service_role (edge functions)
REVOKE SELECT (date_of_birth, verification_selfie_url, verification_selfie_url, verified_at) ON public.profiles FROM anon, authenticated;

-- Re-grant SELECT on all non-sensitive columns to authenticated
-- (RLS policies still control row-level access)
GRANT SELECT (
  id, user_id, display_name, bio, gender, body_build, height_cm, weight_kg,
  location_city, location_country, nationality, occupation, education,
  smoking, drinking, children, interests, relationship_goal, looking_for,
  avatar_url, photo_urls, is_paused, is_verified, religion, ethnicity,
  languages, pets, political_beliefs, favourite_music, favourite_film,
  favourite_sport, favourite_hobbies, personality_type, max_distance_miles,
  non_negotiables, latitude, longitude, created_at, updated_at
) ON public.profiles TO authenticated;

-- Anon should not read profiles at all (RLS already blocks, but belt-and-suspenders)
GRANT SELECT (
  id, user_id, display_name, bio, gender, body_build, height_cm,
  location_city, nationality, is_verified, is_paused, avatar_url,
  created_at, updated_at
) ON public.profiles TO anon;
