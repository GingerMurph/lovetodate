CREATE TABLE public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  user_id uuid,
  reason_code text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log (created_at DESC);
CREATE INDEX idx_security_audit_log_function ON public.security_audit_log (function_name, created_at DESC);
CREATE INDEX idx_security_audit_log_user ON public.security_audit_log (user_id, created_at DESC);

GRANT ALL ON public.security_audit_log TO service_role;
GRANT SELECT ON public.security_audit_log TO authenticated;

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "No client insert audit log"
  ON public.security_audit_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No client update audit log"
  ON public.security_audit_log
  FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "No client delete audit log"
  ON public.security_audit_log
  FOR DELETE
  TO anon, authenticated
  USING (false);