-- Align RLS policies with actual application behavior (public discovery)
-- Add a permissive SELECT policy so all authenticated users can view active (non-paused) profiles
-- This matches what the edge functions already do and removes the architectural inconsistency

CREATE POLICY "Users can view active profiles for discovery"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (is_paused = false OR auth.uid() = user_id);
