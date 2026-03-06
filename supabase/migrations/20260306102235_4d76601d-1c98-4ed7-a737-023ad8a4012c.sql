
CREATE TABLE public.video_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  channel_name text NOT NULL,
  status text NOT NULL DEFAULT 'ringing',
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calls" ON public.video_calls
FOR SELECT TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls" ON public.video_calls
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id AND caller_id <> callee_id);

CREATE POLICY "Users can update own calls" ON public.video_calls
FOR UPDATE TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_calls;
