
-- Drop all existing restrictive policies on profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view liked profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view connected profiles" ON public.profiles;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view liked profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id IN (
  SELECT likes.liked_id FROM likes WHERE likes.liker_id = auth.uid()
  UNION
  SELECT likes.liker_id FROM likes WHERE likes.liked_id = auth.uid()
));

CREATE POLICY "Users can view connected profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id IN (
  SELECT unlocked_connections.target_id FROM unlocked_connections WHERE unlocked_connections.unlocker_id = auth.uid()
  UNION
  SELECT unlocked_connections.unlocker_id FROM unlocked_connections WHERE unlocked_connections.target_id = auth.uid()
));
