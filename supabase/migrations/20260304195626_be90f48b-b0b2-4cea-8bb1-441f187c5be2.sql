
CREATE TABLE public.profile_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_text text NOT NULL,
  answer_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_text)
);

ALTER TABLE public.profile_prompts ENABLE ROW LEVEL SECURITY;

-- Users can view prompts of active profiles (same access pattern as profiles)
CREATE POLICY "Users can view prompts of active profiles"
  ON public.profile_prompts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT p.user_id FROM public.profiles p WHERE p.is_paused = false
    )
  );

CREATE POLICY "Users can insert own prompts"
  ON public.profile_prompts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON public.profile_prompts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON public.profile_prompts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- No anon access
CREATE POLICY "No anon access"
  ON public.profile_prompts FOR SELECT TO anon
  USING (false);
