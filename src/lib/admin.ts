import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BanInfo = {
  bannedUntil: string | null;
  banMessage: string | null;
  bannedAt: string | null;
};

const FOREVER = 8640000000000000; // ms

export function banEndMs(bannedUntil: string | null): number | null {
  if (!bannedUntil) return null;
  if (bannedUntil.startsWith("infinity")) return FOREVER;
  const t = Date.parse(bannedUntil);
  return Number.isNaN(t) ? null : t;
}

export function isBanActive(bannedUntil: string | null) {
  const end = banEndMs(bannedUntil);
  return end != null && end > Date.now();
}

/** "3 days", "2 hours 15 minutes", "forever" */
export function formatBanLength(ms: number) {
  if (ms >= FOREVER / 2) return "forever";
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (!d && !h && (s || !m)) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.slice(0, 2).join(" ");
}

/** Is this account an admin? */
export function useIsAdmin(userId: string | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (alive) setIsAdmin(Boolean(data));
    })();
    return () => {
      alive = false;
    };
  }, [userId]);
  return isAdmin;
}

/** The signed-in account's own ban, refreshed regularly. */
export function useMyBan(userId: string | null) {
  const [ban, setBan] = useState<BanInfo | null>(null);

  useEffect(() => {
    if (!userId) {
      setBan(null);
      return;
    }
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("banned_until, ban_message, banned_at")
        .eq("id", userId)
        .maybeSingle();
      if (!alive) return;
      setBan(
        data
          ? {
              bannedUntil: data.banned_until,
              banMessage: data.ban_message,
              bannedAt: data.banned_at,
            }
          : null,
      );
    };
    void load();
    const id = window.setInterval(load, 10000);
    window.addEventListener("nova-bans-updated", load);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("nova-bans-updated", load);
    };
  }, [userId]);

  return ban && isBanActive(ban.bannedUntil) ? ban : null;
}

/** The custom message admins can show on the leaderboard. */
export function useLeaderboardNotice() {
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("leaderboard_notice")
      .select("message")
      .eq("id", 1)
      .maybeSingle();
    setMessage(data?.message ?? "");
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 15000);
    window.addEventListener("nova-notice-updated", load);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("nova-notice-updated", load);
    };
  }, [load]);

  const save = useCallback(
    async (next: string) => {
      const { error } = await supabase.rpc("admin_set_notice", { _message: next });
      if (error) throw new Error(error.message);
      setMessage(next);
      window.dispatchEvent(new CustomEvent("nova-notice-updated"));
    },
    [],
  );

  return { message, save, reload: load };
}

export async function banUser(userId: string, minutes: number | null, message: string) {
  const { error } = await supabase.rpc("admin_ban_user", {
    _user_id: userId,
    _minutes: minutes as unknown as number,
    _message: message,
  });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new CustomEvent("nova-bans-updated"));
  window.dispatchEvent(new CustomEvent("nova-leaderboard-updated"));
}

export async function unbanUser(userId: string) {
  const { error } = await supabase.rpc("admin_unban_user", { _user_id: userId });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new CustomEvent("nova-bans-updated"));
  window.dispatchEvent(new CustomEvent("nova-leaderboard-updated"));
}
