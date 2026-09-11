DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  classroom_ms bigint,
  media_ms bigint,
  tiktok_ms bigint,
  today_ms bigint,
  today_date date,
  sessions integer,
  best_ms bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.user_id, p.username, p.display_name, p.avatar_url,
         u.classroom_ms, u.media_ms, u.tiktok_ms, u.today_ms, u.today_date,
         u.sessions, u.best_ms
  FROM public.usage_stats u
  LEFT JOIN public.profiles p ON p.id = u.user_id
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;