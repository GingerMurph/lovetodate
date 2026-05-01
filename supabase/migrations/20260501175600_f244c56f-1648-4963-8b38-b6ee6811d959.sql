ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.likes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.games;
ALTER PUBLICATION supabase_realtime DROP TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime DROP TABLE public.video_calls;

ALTER TABLE public.profile_private_data
  ADD COLUMN IF NOT EXISTS date_of_birth_verified date,
  ADD COLUMN IF NOT EXISTS verification_selfie_url text,
  ADD COLUMN IF NOT EXISTS age_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

UPDATE public.profile_private_data ppd
SET date_of_birth_verified = COALESCE(ppd.date_of_birth_verified, p.date_of_birth_verified),
    verification_selfie_url = COALESCE(ppd.verification_selfie_url, p.verification_selfie_url)
FROM public.profiles p
WHERE p.user_id = ppd.user_id
  AND (
    p.date_of_birth_verified IS NOT NULL
    OR p.verification_selfie_url IS NOT NULL
  );

INSERT INTO public.profile_private_data (
  user_id,
  date_of_birth,
  phone_number,
  verification_selfie_url,
  date_of_birth_verified,
  age_verified_at
)
SELECT
  p.user_id,
  p.date_of_birth,
  p.phone_number,
  p.verification_selfie_url,
  p.date_of_birth_verified,
  p.age_verified_at
FROM public.profiles p
WHERE p.date_of_birth IS NOT NULL
   OR p.phone_number IS NOT NULL
   OR p.verification_selfie_url IS NOT NULL
   OR p.date_of_birth_verified IS NOT NULL
   OR p.age_verified_at IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET date_of_birth = COALESCE(public.profile_private_data.date_of_birth, EXCLUDED.date_of_birth),
    phone_number = COALESCE(public.profile_private_data.phone_number, EXCLUDED.phone_number),
    verification_selfie_url = COALESCE(public.profile_private_data.verification_selfie_url, EXCLUDED.verification_selfie_url),
    date_of_birth_verified = COALESCE(public.profile_private_data.date_of_birth_verified, EXCLUDED.date_of_birth_verified),
    age_verified_at = COALESCE(public.profile_private_data.age_verified_at, EXCLUDED.age_verified_at);

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS verification_selfie_url,
  DROP COLUMN IF EXISTS date_of_birth_verified,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;