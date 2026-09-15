import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { banEndMs, formatBanLength, type BanInfo } from "@/lib/admin";

/** Full-screen block shown to a banned account. There is no way out of it. */
export function BannedScreen({ ban, username }: { ban: BanInfo; username?: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  const end = banEndMs(ban.bannedUntil);
  const started = ban.bannedAt ? Date.parse(ban.bannedAt) : now;
  const length = end == null ? 0 : end - started;
  const remaining = end == null ? 0 : Math.max(0, end - now);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/95 p-6 backdrop-blur-xl">
      <div
        className="glass w-full max-w-md rounded-2xl p-8 text-center ring-1 ring-destructive/50"
        style={{ borderRadius: "var(--radius)" }}
      >
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          You've been banned for {formatBanLength(length)}
        </h1>
        {username && (
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {username}
          </p>
        )}
        {ban.banMessage?.trim() && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {ban.banMessage}
          </p>
        )}
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Time left
          </div>
          <div className="mt-1 font-mono text-3xl font-semibold tabular-nums">
            {formatBanLength(remaining) || "0 seconds"}
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          You can't sign out while banned. This screen clears itself when the ban ends.
        </p>
      </div>
    </div>
  );
}
