
-- Fix 1: Restrict profile visibility
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view liked profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT liked_id FROM public.likes WHERE liker_id = auth.uid()
      UNION
      SELECT liker_id FROM public.likes WHERE liked_id = auth.uid()
    )
  );

CREATE POLICY "Users can view connected profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT target_id FROM public.unlocked_connections WHERE unlocker_id = auth.uid()
      UNION
      SELECT unlocker_id FROM public.unlocked_connections WHERE target_id = auth.uid()
    )
  );

-- Fix 2: Remove direct insert on unlocked_connections to prevent payment bypass
DROP POLICY IF EXISTS "Users can insert own connections" ON public.unlocked_connections;
