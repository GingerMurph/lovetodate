
-- Add restrictive RLS policies to rate_limits table
-- Only service_role should access this table (edge functions use service_role key)
-- These policies deny all access to anon and authenticated users

CREATE POLICY "No public read access"
ON public.rate_limits
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "No public insert access"
ON public.rate_limits
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No public update access"
ON public.rate_limits
FOR UPDATE
TO anon, authenticated
USING (false);

CREATE POLICY "No public delete access"
ON public.rate_limits
FOR DELETE
TO anon, authenticated
USING (false);
