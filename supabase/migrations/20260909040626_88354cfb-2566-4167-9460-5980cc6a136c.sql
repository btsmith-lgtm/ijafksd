DROP POLICY IF EXISTS usage_stats_select ON public.usage_stats;
CREATE POLICY usage_stats_select ON public.usage_stats FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = off) AS
SELECT u.user_id,
       p.username,
       p.display_name,
       p.avatar_url,
       u.classroom_ms,
       u.media_ms,
       u.tiktok_ms,
       u.today_ms,
       u.today_date,
       u.sessions,
       u.best_ms
FROM public.usage_stats u
LEFT JOIN public.profiles p ON p.id = u.user_id;

GRANT SELECT ON public.leaderboard TO authenticated;