
-- Create a rate limiting table for edge functions
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_user_function ON public.rate_limits (user_id, function_name, window_start);

-- Enable RLS (no user access - only service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = no client access, only service role can read/write

-- Auto-cleanup: delete old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '24 hours';
END;
$$;
