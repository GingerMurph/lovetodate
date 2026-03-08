
-- Drop all existing restrictive policies on profile_prompts
DROP POLICY IF EXISTS "Users can view own prompts" ON public.profile_prompts;
DROP POLICY IF EXISTS "Users can insert own prompts" ON public.profile_prompts;
DROP POLICY IF EXISTS "Users can update own prompts" ON public.profile_prompts;
DROP POLICY IF EXISTS "Users can delete own prompts" ON public.profile_prompts;
DROP POLICY IF EXISTS "No anon access" ON public.profile_prompts;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can view own prompts"
  ON public.profile_prompts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
  ON public.profile_prompts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON public.profile_prompts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON public.profile_prompts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
