import { useEffect, useState } from "react";
import { Trophy, Gamepad2, Film, Music2, ShieldAlert, Megaphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDuration, useLeaderboard } from "@/lib/usage";
import {
  banUser,
  formatBanLength,
  banEndMs,
  isBanActive,
  unbanUser,
  useIsAdmin,
  useLeaderboardNotice,
} from "@/lib/admin";

const MEDALS = ["🥇", "🥈", "🥉"];

const DURATIONS: { label: string; minutes: number | null }[] = [
  { label: "5 minutes", minutes: 5 },
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 60 * 24 },
  { label: "1 week", minutes: 60 * 24 * 7 },
  { label: "Forever", minutes: null },
];

export function LeaderboardView() {
  const { entries, meId, loading } = useLeaderboard();
  const isAdmin = useIsAdmin(meId);
  const { message: notice, save: saveNotice } = useLeaderboardNotice();
  const [noticeDraft, setNoticeDraft] = useState("");
  const [noticeTouched, setNoticeTouched] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>("60");
  const [customMinutes, setCustomMinutes] = useState("");
  const [banMessage, setBanMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!noticeTouched) setNoticeDraft(notice);
  }, [notice, noticeTouched]);

  const doBan = async (userId: string) => {
    setBusy(true);
    try {
      const minutes =
        duration === "custom"
          ? Math.max(1, Number(customMinutes) || 0)
          : duration === "forever"
            ? null
            : Number(duration);
      if (duration === "custom" && (!customMinutes || Number(customMinutes) <= 0)) {
        toast.error("Enter how many minutes the ban should last");
        return;
      }
      await banUser(userId, minutes, banMessage.trim());
      toast.success("Ban applied");
      setOpenFor(null);
      setBanMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't ban that person");
    } finally {
      setBusy(false);
    }
  };

  const doUnban = async (userId: string) => {
    setBusy(true);
    try {
      await unbanUser(userId);
      toast.success("Ban lifted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't lift that ban");
    } finally {
      setBusy(false);
    }
  };

  const max = Math.max(1, ...entries.map((e) => e.total));
  const grandTotal = entries.reduce((s, e) => s + e.total, 0);
  const todayTotal = entries.reduce((s, e) => s + e.today, 0);

  const myIndex = entries.findIndex((e) => e.userId === meId);
  const me = myIndex >= 0 ? entries[myIndex] : null;
  const ahead = myIndex > 0 ? entries[myIndex - 1] : null;
  const gap = me && ahead ? ahead.total - me.total : 0;

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            <span className="gradient-text">Leaderboard</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everyone's time across Games, Movies and TikTok, ranked 1st to last.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Players" value={String(entries.length)} />
          <Stat label="Total time" value={formatDuration(grandTotal)} />
          <Stat label="Today" value={formatDuration(todayTotal)} />
        </div>

        {me && (
          <div
            className="glass rounded-2xl p-5 ring-1 ring-primary/60"
            style={{ borderRadius: "var(--radius)" }}
          >
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Your standing
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div className="font-mono text-3xl font-semibold tabular-nums">
                #{myIndex + 1}
                <span className="ml-1 text-sm text-muted-foreground">
                  of {entries.length}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDuration(me.total)} total · {formatDuration(me.today)} today
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {ahead
                ? `${formatDuration(gap)} behind ${ahead.displayName?.trim() || ahead.username} in #${myIndex}.`
                : "You're in first place — nice."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {entries.map((e, i) => {
            const name = e.displayName?.trim() || e.username;
            const isMe = e.userId === meId;
            return (
              <div
                key={e.userId}
                className={`glass hover-lift rounded-2xl p-4 ${isMe ? "ring-1 ring-primary/60" : ""}`}
                style={{ borderRadius: "var(--radius)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex w-10 shrink-0 flex-col items-center">
                    <span className="text-lg leading-none">{MEDALS[i] ?? "•"}</span>
                    <span className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                      #{i + 1}
                    </span>
                  </span>

                  {e.avatarUrl ? (
                    <img
                      src={e.avatarUrl}
                      alt={`${name}'s profile picture`}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {name} {isMe && <span className="text-xs text-primary">(you)</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Gamepad2 className="h-3 w-3" /> {formatDuration(e.classroom)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Film className="h-3 w-3" /> {formatDuration(e.media)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Music2 className="h-3 w-3" /> {formatDuration(e.tiktok)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold tabular-nums">
                      {formatDuration(e.total)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      today {formatDuration(e.today)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.round((e.total / max) * 100)}%` }}
                  />
                </div>

                <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
                  <span>{e.sessions} {e.sessions === 1 ? "visit" : "visits"}</span>
                  <span>longest {formatDuration(e.best)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && entries.length === 0 && (
          <div
            className="glass flex flex-col items-center gap-2 rounded-2xl p-10 text-center"
            style={{ borderRadius: "var(--radius)" }}
          >
            <Trophy className="h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              Nothing tracked yet — open Games, Movies or TikTok and times will show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4" style={{ borderRadius: "var(--radius)" }}>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
