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


const MENU_TABS = [
  { id: "selenite", label: "Selenite", url: "https://selenite.cc/projects.html" },
  { id: "cinesteam", label: "PC Games", url: "https://ghostcloud.ghostos.workers.dev" },
  { id: "noah", label: "Noah's Tutoring", url: "https://ibu.openchain.pt/" },
  { id: "strictly", label: "Strictly Math", url: "https://strictlymath.cc" },
  { id: "quackprep", label: "QuackPrep", url: "https://quackprep.org" },
  { id: "kizi", label: "Kizi", url: "https://kizi.com" },
  { id: "dubdoo", label: "Dubdoo", url: "https://dubdoo.com" },
] as const;

const BUTTON_TABS = [
  { id: "fortnite", label: "Fortnite", url: "https://play.geforcenow.com/games?game-id=46bfab06-d864-465d-9e56-2d9e45cdee0a&lang=en_US&asset-id=01_9b412ae4-1af5-4a5a-b560-20632b95106a" },
  { id: "minecraft", label: "Minecraft", url: "https://4texas4.github.io/EaglyMC" },
  { id: "nowgg-10011", label: "Stumble Guys", url: "https://nowgg.fun/apps/a/10011/b.html" },
  { id: "nowgg-19900", label: "Roblox", url: "https://nowgg.fun/apps/a/19900/b.html" },
  { id: "retro", label: "Retro Games", url: "https://emulatorgameszone.com/" },
] as const;

const TABS = [...MENU_TABS, ...BUTTON_TABS] as const;


export function ClassroomView() {
  const [frameKey, setFrameKey] = useState(0);
  const [activeId, setActiveId] = useState<(typeof TABS)[number]["id"]>("selenite");
  const active = TABS.find((t) => t.id === activeId) ?? TABS[0];
  const src = useProxySrc(active.url, frameKey);
  const containerRef = useRef<HTMLDivElement>(null);


  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-secondary/50 p-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  MENU_TABS.some((t) => t.id === activeId)
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {MENU_TABS.find((t) => t.id === activeId)?.label ?? "Sites"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              {MENU_TABS.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => setActiveId(t.id)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {BUTTON_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeId === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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
