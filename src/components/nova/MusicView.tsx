import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useProxySrc } from "@/lib/scramjet";
import { FullscreenButton } from "./FullscreenButton";


const MUSIC_URL = "https://audiomack.com";

export function MusicView() {
  const [frameKey, setFrameKey] = useState(0);
  const src = useProxySrc(MUSIC_URL, frameKey);
  const containerRef = useRef<HTMLDivElement>(null);


  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-2 flex items-center justify-end gap-2">
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
      <div
        ref={containerRef}
        className="glass flex-1 min-h-0 overflow-hidden rounded-2xl"
        style={{ borderRadius: "var(--radius)" }}
      >

        {src ? (
          <iframe
            key={frameKey}
            src={src}
            title="Music"
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
