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
  { id: "strictly", label: "Strictly Math", url: "https://strictlymath.cc" },
  { id: "studysync", label: "StudySync", url: "https://studysync.co.uk/" },
  { id: "cinesteam", label: "PC Games", url: "https://ghostcloud-eight.vercel.app" },
  { id: "genizymath", label: "Genizy Math", url: "https://genizymath.github.io" },
  { id: "quackprep", label: "QuackPrep", url: "https://quackprep.org" },
  { id: "dubdoo", label: "Dubdoo", url: "https://dubdoo.com" },
] as const;

const NOVA_GAMES = [
  { name: "COD Zombies (BO1)", url: "https://vel.gg/bo1z" },
  { name: "Moon", url: "https://moon-zombies.pages.dev" },
  { name: "Kino der Toten", url: "https://kino-der-toten.pages.dev" },
  { name: "BO3 Cheese Cube", url: "https://cheese-cube.pages.dev" },
  { name: "Black Ops 2", url: "https://vibeslops.luckeysystems.com" },
  { name: "Modern Warfare 2", url: "https://ovz-game-production.up.railway.app" },
  { name: "Skate 3", url: "https://skate.aaddpp.lol" },
  { name: "Skate Rust", url: "https://global-terror.net" },
  { name: "CS Surf", url: "https://surfd.net" },
  { name: "Halo CE", url: "https://mitchellhynes.com/halo" },
  { name: "Halo CE Mobile", url: "https://hcemobile.com" },
  { name: "PES 6", url: "https://pes6.optijuegos.net" },
  { name: "The Simpsons: Hit & Run", url: "https://shar-wasm.cjoseph.workers.dev/?skipmovie" },
  { name: "Quake 1", url: "https://q1.pieter.com" },
  { name: "Quake 2", url: "https://q2.pieter.com" },
  { name: "Quake 3", url: "https://q3.pieter.com" },
  { name: "Return to Castle Wolfenstein", url: "https://rtcw.pieter.com" },
  { name: "Unreal Tournament", url: "https://ut.pieter.com" },
  { name: "Half Life", url: "https://pixelsuft.github.io/hl/" },
  { name: "Half Life / CS 1.6", url: "https://x8bitrain.github.io/webXash/" },
  { name: "Diablo", url: "https://johnimril.github.io/diablo_web/" },
  { name: "Hedgewars", url: "https://webwars.link" },
  { name: "More GTA / Minecraft", url: "https://wasmarcade.com" },
];

const BUTTON_TABS = [
  { id: "novagames", label: "Nova Games", url: "" },
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
  const [novaGame, setNovaGame] = useState<(typeof NOVA_GAMES)[number] | null>(null);
  const isNova = activeId === "novagames";
  const frameUrl = isNova ? novaGame?.url ?? "" : active.url;
  const src = useProxySrc(frameUrl || NOVA_GAMES[0].url, frameKey);
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
              onClick={() => { setActiveId(t.id); if (t.id === "novagames") setNovaGame(null); }}
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
          {isNova && novaGame && (
            <button onClick={() => setNovaGame(null)} className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">All games</button>
          )}
          <FullscreenButton containerRef={containerRef} />
        </div>

      </div>
      <div
        ref={containerRef}
        className="glass flex-1 min-h-0 overflow-hidden rounded-2xl"
        style={{ borderRadius: "var(--radius)" }}
      >

        {isNova && !novaGame ? (
          <div className="h-full overflow-auto p-4">
            <div className="mb-3 text-lg font-semibold">Nova Games</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {NOVA_GAMES.map((g) => (
                <button
                  key={g.url}
                  onClick={() => setNovaGame(g)}
                  className="rounded-xl bg-secondary/50 px-4 py-4 text-left text-sm font-medium transition-colors hover:bg-secondary"
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        ) : src ? (
          <iframe
            key={`${active.id}-${frameKey}`}
            src={src}
            title={isNova ? novaGame?.name : active.label}
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
