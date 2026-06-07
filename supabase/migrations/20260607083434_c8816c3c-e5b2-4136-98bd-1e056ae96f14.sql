CREATE POLICY "deny_insert_user_roles" ON public.user_roles AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_update_user_roles" ON public.user_roles AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_delete_user_roles" ON public.user_roles AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);