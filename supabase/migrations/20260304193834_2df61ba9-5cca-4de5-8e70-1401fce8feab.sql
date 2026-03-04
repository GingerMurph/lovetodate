
-- Table to store server-issued verification challenges
CREATE TABLE public.verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pose text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_challenges ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon and authenticated (service_role only)
CREATE POLICY "No public read" ON public.verification_challenges FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "No public insert" ON public.verification_challenges FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No public update" ON public.verification_challenges FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No public delete" ON public.verification_challenges FOR DELETE TO anon, authenticated USING (false);
