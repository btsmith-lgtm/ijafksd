import { useEffect, useRef, useState } from "react";

export type UsageCategory = "classroom" | "media" | "tiktok";

export type UsageStats = {
  totals: Record<UsageCategory, number>; // ms all-time
  daily: Record<string, Partial<Record<UsageCategory, number>>>; // yyyy-mm-dd -> ms
  sessions: Record<UsageCategory, number>; // number of visits
  best: Record<UsageCategory, number>; // longest single session ms
};

export const USAGE_KEY = "nova.usage";

export const emptyUsage = (): UsageStats => ({
  totals: { classroom: 0, media: 0, tiktok: 0 },
  daily: {},
  sessions: { classroom: 0, media: 0, tiktok: 0 },
  best: { classroom: 0, media: 0, tiktok: 0 },
});

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function read(): UsageStats {
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    if (!raw) return emptyUsage();
    const parsed = JSON.parse(raw) as Partial<UsageStats>;
    const base = emptyUsage();
    return {
      totals: { ...base.totals, ...(parsed.totals ?? {}) },
      daily: parsed.daily ?? {},
      sessions: { ...base.sessions, ...(parsed.sessions ?? {}) },
      best: { ...base.best, ...(parsed.best ?? {}) },
    };
  } catch {
    return emptyUsage();
  }
}

function write(stats: UsageStats) {
  try {
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent("nova-usage-updated"));
  } catch {}
}

export function readUsage(): UsageStats {
  if (typeof window === "undefined") return emptyUsage();
  return read();
}

export function clearUsage() {
  write(emptyUsage());
}

function addTime(category: UsageCategory, ms: number, newSession: boolean, sessionMs: number) {
  if (ms <= 0 && !newSession) return;
  const stats = read();
  stats.totals[category] = (stats.totals[category] ?? 0) + ms;
  const key = todayKey();
  stats.daily[key] = { ...(stats.daily[key] ?? {}) };
  stats.daily[key][category] = (stats.daily[key][category] ?? 0) + ms;
  if (newSession) stats.sessions[category] = (stats.sessions[category] ?? 0) + 1;
  if (sessionMs > (stats.best[category] ?? 0)) stats.best[category] = sessionMs;
  write(stats);
}

/** Tracks how long the given category stays active (tab visible, view open). */
export function useUsageTracker(active: UsageCategory | null) {
  const startedRef = useRef<number | null>(null);
  const sessionMsRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    let counted = 0;
    sessionMsRef.current = 0;
    startedRef.current = Date.now();
    addTime(active, 0, true, 0);

    const flush = () => {
      if (startedRef.current == null) return;
      const now = Date.now();
      const delta = now - startedRef.current;
      startedRef.current = now;
      if (delta <= 0) return;
      counted += delta;
      sessionMsRef.current += delta;
      addTime(active, delta, false, sessionMsRef.current);
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") flush();
      else startedRef.current = Date.now();
    }, 5000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") startedRef.current = Date.now();
      else flush();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (document.visibilityState === "visible") flush();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      startedRef.current = null;
      void counted;
    };
  }, [active]);
}

/** Live-updating usage stats for display. */
export function useUsageStats() {
  const [stats, setStats] = useState<UsageStats>(() => emptyUsage());
  useEffect(() => {
    const sync = () => setStats(read());
    sync();
    window.addEventListener("nova-usage-updated", sync);
    window.addEventListener("storage", sync);
    const id = window.setInterval(sync, 3000);
    return () => {
      window.removeEventListener("nova-usage-updated", sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);
  return [stats, () => { clearUsage(); setStats(emptyUsage()); }] as const;
}

export function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ---------------- Shared (multi-user) leaderboard ---------------- */

export type LeaderboardEntry = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  classroom: number;
  media: number;
  tiktok: number;
  total: number;
  today: number;
  sessions: number;
  best: number;
};

let lastPush = 0;
let pushTimer: number | null = null;

async function pushNow() {
  lastPush = Date.now();
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const s = read();
    const today = s.daily[todayKey()] ?? {};
    const todayMs =
      (today.classroom ?? 0) + (today.media ?? 0) + (today.tiktok ?? 0);
    await supabase.from("usage_stats").upsert(
      {
        user_id: uid,
        classroom_ms: Math.round(s.totals.classroom ?? 0),
        media_ms: Math.round(s.totals.media ?? 0),
        tiktok_ms: Math.round(s.totals.tiktok ?? 0),
        today_ms: Math.round(todayMs),
        today_date: todayKey(),
        sessions:
          (s.sessions.classroom ?? 0) + (s.sessions.media ?? 0) + (s.sessions.tiktok ?? 0),
        best_ms: Math.round(Math.max(s.best.classroom ?? 0, s.best.media ?? 0, s.best.tiktok ?? 0)),
      },
      { onConflict: "user_id" },
    );
  } catch {}
}

/** Push local stats to the shared leaderboard, at most once every 15s. */
export function syncUsageToCloud() {
  if (typeof window === "undefined") return;
  const since = Date.now() - lastPush;
  if (since >= 15000) {
    void pushNow();
    return;
  }
  if (pushTimer != null) return;
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, 15000 - since);
}

/** Live list of everyone's usage, joined with their profile. */
export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: auth } = await supabase.auth.getUser();
        if (alive) setMeId(auth.user?.id ?? null);
        const [{ data: rows }, { data: profiles }] = await Promise.all([
          supabase.from("usage_stats").select("*"),
          supabase.from("profiles").select("id, username, display_name, avatar_url"),
        ]);
        if (!alive) return;
        const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
        const list: LeaderboardEntry[] = (rows ?? []).map((r) => {
          const p = byId.get(r.user_id);
          const classroom = Number(r.classroom_ms ?? 0);
          const media = Number(r.media_ms ?? 0);
          const tiktok = Number(r.tiktok_ms ?? 0);
          return {
            userId: r.user_id,
            username: p?.username ?? "Unknown",
            displayName: p?.display_name ?? null,
            avatarUrl: p?.avatar_url ?? null,
            classroom,
            media,
            tiktok,
            total: classroom + media + tiktok,
            today: r.today_date === todayKey() ? Number(r.today_ms ?? 0) : 0,
            sessions: Number(r.sessions ?? 0),
            best: Number(r.best_ms ?? 0),
          };
        });
        list.sort((a, b) => b.total - a.total);
        setEntries(list);
      } catch {}
      if (alive) setLoading(false);
    };
    void load();
    const id = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return { entries, meId, loading };
}
