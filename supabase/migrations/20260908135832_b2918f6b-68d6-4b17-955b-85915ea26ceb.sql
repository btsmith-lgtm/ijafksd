CREATE TABLE public.usage_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_ms bigint NOT NULL DEFAULT 0,
  media_ms bigint NOT NULL DEFAULT 0,
  tiktok_ms bigint NOT NULL DEFAULT 0,
  today_ms bigint NOT NULL DEFAULT 0,
  today_date date NOT NULL DEFAULT current_date,
  sessions integer NOT NULL DEFAULT 0,
  best_ms bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_stats TO authenticated;
GRANT ALL ON public.usage_stats TO service_role;

ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_stats_select ON public.usage_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY usage_stats_insert ON public.usage_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY usage_stats_update ON public.usage_stats FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY usage_stats_delete ON public.usage_stats FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_usage_stats_updated_at BEFORE UPDATE ON public.usage_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();