
-- Fix 1: Add RLS policies to user_locations table
-- Users should only be able to read/write their own location
CREATE POLICY "Users can view own location"
ON public.user_locations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location"
ON public.user_locations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location"
ON public.user_locations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Block anon access entirely
CREATE POLICY "No anon read access"
ON public.user_locations FOR SELECT
TO anon
USING (false);

-- Fix 2: Restrict phone_number column access on notification_preferences
-- Revoke SELECT on phone_number from anon (belt-and-suspenders)
REVOKE SELECT (phone_number) ON public.notification_preferences FROM anon;

-- Grant SELECT only on non-phone columns to authenticated
-- (RLS already restricts to own rows, but CLS adds defense-in-depth)
REVOKE SELECT ON public.notification_preferences FROM authenticated;
GRANT SELECT (id, user_id, in_app_sound, email_notifications, sms_notifications, created_at, updated_at) ON public.notification_preferences TO authenticated;

-- Users still need INSERT/UPDATE on all columns including phone_number
GRANT INSERT, UPDATE ON public.notification_preferences TO authenticated;
