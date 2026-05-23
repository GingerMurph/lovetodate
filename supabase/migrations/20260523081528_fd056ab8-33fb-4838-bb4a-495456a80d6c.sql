-- Helper to check if current user is the security admin
CREATE OR REPLACE FUNCTION public.is_security_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'ianwmurphy@gmail.com'
  )
$$;

-- Scan history
CREATE TABLE public.security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  pass_count int NOT NULL DEFAULT 0,
  warn_count int NOT NULL DEFAULT 0,
  fail_count int NOT NULL DEFAULT 0,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_scans_created_at ON public.security_scans (created_at DESC);

ALTER TABLE public.security_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view scans"
ON public.security_scans
FOR SELECT
TO authenticated
USING (public.is_security_admin(auth.uid()));

CREATE POLICY "No client insert"
ON public.security_scans
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No client update"
ON public.security_scans
FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "No client delete"
ON public.security_scans
FOR DELETE
TO authenticated, anon
USING (false);