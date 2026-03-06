
-- Drop the overly broad policy
DROP POLICY IF EXISTS "Users can view prompts of active profiles" ON public.profile_prompts;

-- Drop the anon deny policy (redundant with restrictive default, but let's keep it clean)
DROP POLICY IF EXISTS "No anon access" ON public.profile_prompts;

-- Create a tighter policy: users can only view their own prompts
CREATE POLICY "Users can view own prompts"
ON public.profile_prompts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Re-add anon deny
CREATE POLICY "No anon access"
ON public.profile_prompts
FOR SELECT
TO anon
USING (false);
