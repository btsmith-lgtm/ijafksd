
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  banned_until timestamptz,
  ban_message text,
  banned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  bookmarks jsonb NOT NULL DEFAULT '[]'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.usage_stats (
  user_id uuid PRIMARY KEY,
  classroom_ms bigint NOT NULL DEFAULT 0,
  media_ms bigint NOT NULL DEFAULT 0,
  tiktok_ms bigint NOT NULL DEFAULT 0,
  today_ms bigint NOT NULL DEFAULT 0,
  today_date text,
  sessions integer NOT NULL DEFAULT 0,
  best_ms bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.usage_stats TO authenticated;
GRANT ALL ON public.usage_stats TO service_role;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.leaderboard_notice (
  id integer PRIMARY KEY DEFAULT 1,
  message text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_notice_single_row CHECK (id = 1)
);
GRANT SELECT ON public.leaderboard_notice TO authenticated;
GRANT ALL ON public.leaderboard_notice TO service_role;
ALTER TABLE public.leaderboard_notice ENABLE ROW LEVEL SECURITY;
INSERT INTO public.leaderboard_notice (id, message) VALUES (1, '');

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER usage_stats_updated_at BEFORE UPDATE ON public.usage_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profiles policies
CREATE POLICY "Profiles are readable by signed-in users" ON public.profiles
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- block self-editing of ban fields
CREATE OR REPLACE FUNCTION public.protect_ban_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.banned_until := OLD.banned_until;
    NEW.ban_message := OLD.ban_message;
    NEW.banned_at := OLD.banned_at;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_protect_ban BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_ban_fields();

CREATE POLICY "Users manage their own settings" ON public.user_settings
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usage is readable by signed-in users" ON public.usage_stats
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users write their own usage" ON public.usage_stats
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own usage" ON public.usage_stats
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Roles are readable by signed-in users" ON public.user_roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Notice readable by signed-in users" ON public.leaderboard_notice
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update notice" ON public.leaderboard_notice
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- make the account named "benne" an admin automatically
CREATE OR REPLACE FUNCTION public.grant_benne_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.username) = 'benne' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_grant_benne_admin AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_benne_admin();

-- leaderboard feed
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid, username text, display_name text, avatar_url text,
  classroom_ms bigint, media_ms bigint, tiktok_ms bigint,
  today_ms bigint, today_date text, sessions integer, best_ms bigint,
  banned_until timestamptz, ban_message text, is_admin boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url,
         COALESCE(u.classroom_ms, 0), COALESCE(u.media_ms, 0), COALESCE(u.tiktok_ms, 0),
         COALESCE(u.today_ms, 0), u.today_date, COALESCE(u.sessions, 0), COALESCE(u.best_ms, 0),
         p.banned_until, p.ban_message,
         public.has_role(p.id, 'admin')
  FROM public.profiles p
  LEFT JOIN public.usage_stats u ON u.user_id = p.id
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_ban_user(_user_id uuid, _minutes integer, _message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban people';
  END IF;
  UPDATE public.profiles
  SET banned_until = CASE WHEN _minutes IS NULL THEN 'infinity'::timestamptz
                          ELSE now() + make_interval(mins => _minutes) END,
      ban_message = _message,
      banned_at = now()
  WHERE id = _user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unban_user(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can unban people';
  END IF;
  UPDATE public.profiles
  SET banned_until = NULL, ban_message = NULL, banned_at = NULL
  WHERE id = _user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_notice(_message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change the leaderboard message';
  END IF;
  UPDATE public.leaderboard_notice
  SET message = _message, updated_by = auth.uid(), updated_at = now()
  WHERE id = 1;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_notice(text) TO authenticated;
