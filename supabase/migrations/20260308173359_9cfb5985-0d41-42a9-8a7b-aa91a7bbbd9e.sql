-- Create profile_private_data table for storing sensitive PII
CREATE TABLE public.profile_private_data (
  user_id uuid PRIMARY KEY,
  date_of_birth date,
  phone_number text,
  verification_selfie_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_private_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private data"
  ON public.profile_private_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private data"
  ON public.profile_private_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private data"
  ON public.profile_private_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Migrate existing DOB data from profiles to profile_private_data
INSERT INTO public.profile_private_data (user_id, date_of_birth, phone_number, verification_selfie_url)
SELECT user_id, date_of_birth, phone_number, verification_selfie_url
FROM public.profiles
WHERE date_of_birth IS NOT NULL OR phone_number IS NOT NULL OR verification_selfie_url IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;