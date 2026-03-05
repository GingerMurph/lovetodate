
CREATE TABLE public.subscriber_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_subscribed BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriber_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscriber cache"
  ON public.subscriber_cache
  FOR SELECT
  TO authenticated
  USING (true);
