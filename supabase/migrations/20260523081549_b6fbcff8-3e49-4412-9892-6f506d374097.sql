DROP POLICY IF EXISTS "Admin can view scans" ON public.security_scans;
DROP FUNCTION IF EXISTS public.is_security_admin(uuid);

CREATE POLICY "Admin can view scans"
ON public.security_scans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND lower(email) = 'ianwmurphy@gmail.com'
  )
);