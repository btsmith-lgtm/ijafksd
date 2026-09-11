import { useRef, useState } from "react";
import { RotateCcw, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProxySrc } from "@/lib/scramjet";
import { FullscreenButton } from "./FullscreenButton";

const MOVIE_TABS = [
  { id: "aether", label: "Aether", url: "https://aether.ist" },
  { id: "stellar", label: "Stellar", url: "https://stellar.gdn" },
] as const;

export function MediaView() {
  const [frameKey, setFrameKey] = useState(0);
  const [activeId, setActiveId] = useState<(typeof MOVIE_TABS)[number]["id"]>("aether");
  const active = MOVIE_TABS.find((t) => t.id === activeId) ?? MOVIE_TABS[0];
  const src = useProxySrc(active.url, frameKey);
  const containerRef = useRef<HTMLDivElement>(null);


  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-secondary/50 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
            >
              {active.label}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            {MOVIE_TABS.map((t) => (
              <DropdownMenuItem key={t.id} onSelect={() => setActiveId(t.id)}>
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFrameKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            aria-label="Reload"
          >
            <RotateCcw className="h-4 w-4" />
            Reload
          </button>
          <FullscreenButton containerRef={containerRef} />
        </div>
      </div>
      <div
        ref={containerRef}
        className="glass flex-1 min-h-0 overflow-hidden rounded-2xl"
        style={{ borderRadius: "var(--radius)" }}
      >

        {src ? (
          <iframe
            key={`${active.id}-${frameKey}`}
            src={src}
            title={active.label}
            className="h-full w-full border-0 bg-background"
            sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">Connecting to proxy…</div>
        )}
      </div>
    </div>
  );
}
