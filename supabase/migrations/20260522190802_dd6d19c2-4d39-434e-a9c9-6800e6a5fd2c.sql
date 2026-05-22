
-- 1. subscriber_cache: deny client writes
CREATE POLICY "No client insert subscriber cache"
ON public.subscriber_cache FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No client update subscriber cache"
ON public.subscriber_cache FOR UPDATE TO authenticated, anon
USING (false);

CREATE POLICY "No client delete subscriber cache"
ON public.subscriber_cache FOR DELETE TO authenticated, anon
USING (false);

-- 2. notification_preferences: drop phone_number column, restrict to authenticated
ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS phone_number;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;

CREATE POLICY "Users can view own preferences"
ON public.notification_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.notification_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.notification_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. profile_private_data: restrict to authenticated
DROP POLICY IF EXISTS "Users can view own private data" ON public.profile_private_data;
DROP POLICY IF EXISTS "Users can insert own private data" ON public.profile_private_data;
DROP POLICY IF EXISTS "Users can update own private data" ON public.profile_private_data;

CREATE POLICY "Users can view own private data"
ON public.profile_private_data FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private data"
ON public.profile_private_data FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private data"
ON public.profile_private_data FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
