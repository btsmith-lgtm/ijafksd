
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_ban_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_benne_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ban_user(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unban_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_notice(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_notice(text) TO authenticated;
