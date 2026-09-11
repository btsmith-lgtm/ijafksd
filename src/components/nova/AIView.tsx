import { ExternalLink } from "lucide-react";

export function AIView({ onOpen }: { onOpen: (url: string) => void }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-card/40 p-8 text-center"
      style={{ borderRadius: "var(--radius)" }}
    >
      <h2 className="text-2xl font-semibold text-foreground">Arena AI</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        arena.ai blocks direct embedding, so it opens in the Nova browser instead.
      </p>
      <button
        type="button"
        onClick={() => onOpen("https://arena.ai")}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Open in Nova Browser
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  );
}
