
-- Add phone verification and age verification columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS age_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS age_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS date_of_birth_verified date;

-- Phone OTP verifications table
CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- No client access - managed by edge functions only
CREATE POLICY "No public read" ON public.phone_verifications FOR SELECT USING (false);
CREATE POLICY "No public insert" ON public.phone_verifications FOR INSERT WITH CHECK (false);
CREATE POLICY "No public update" ON public.phone_verifications FOR UPDATE USING (false);
CREATE POLICY "No public delete" ON public.phone_verifications FOR DELETE USING (false);

-- Age verifications table (stores ID document verification results)
CREATE TABLE public.age_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_type text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  extracted_dob date,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view own age verifications
CREATE POLICY "Users can view own age verifications" ON public.age_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "No client insert age verifications" ON public.age_verifications FOR INSERT WITH CHECK (false);
CREATE POLICY "No client update age verifications" ON public.age_verifications FOR UPDATE USING (false);
CREATE POLICY "No client delete age verifications" ON public.age_verifications FOR DELETE USING (false);
