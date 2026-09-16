import { Megaphone } from "lucide-react";
import { useIsAdmin, useLeaderboardNotice } from "@/lib/admin";

/**
 * Admin broadcast: while a message is posted it covers every signed-in
 * non-admin screen and blocks all interaction until an admin clears it.
 */
export function GlobalNotice({ userId }: { userId: string | null }) {
  const { message } = useLeaderboardNotice();
  const isAdmin = useIsAdmin(userId);

  if (!message.trim() || isAdmin) return null;

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-background/95 p-6 backdrop-blur-xl">
      <div
        className="glass w-full max-w-md rounded-2xl p-8 text-center ring-1 ring-primary/50"
        style={{ borderRadius: "var(--radius)" }}
      >
        <Megaphone className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-xl font-bold tracking-tight">Message from admin</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          Everything is paused until an admin clears this message.
        </p>
      </div>
    </div>
  );
}
