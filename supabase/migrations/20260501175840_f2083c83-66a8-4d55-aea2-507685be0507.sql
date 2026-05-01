REVOKE EXECUTE ON FUNCTION public.redirect_location_to_private() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_unlock_first_month_mutual_likes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;