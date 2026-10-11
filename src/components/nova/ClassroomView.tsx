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
import cover_bo1z from "@/assets/nova-games/cover-bo1z.jpg.asset.json";
import cover_moon from "@/assets/nova-games/cover-moon.jpg.asset.json";
import cover_kino from "@/assets/nova-games/cover-kino.jpg.asset.json";
import cover_cheese from "@/assets/nova-games/cover-cheese.jpg.asset.json";
import cover_bo2 from "@/assets/nova-games/cover-bo2.jpg.asset.json";
import cover_mw2 from "@/assets/nova-games/cover-mw2.jpg.asset.json";
import cover_gta5 from "@/assets/nova-games/cover-gta5.jpg.asset.json";
import cover_halo from "@/assets/nova-games/cover-halo.jpg.asset.json";
import cover_halomobile from "@/assets/nova-games/cover-halomobile.jpg.asset.json";
import cover_quake1 from "@/assets/nova-games/cover-quake1.jpg.asset.json";
import cover_quake2 from "@/assets/nova-games/cover-quake2.jpg.asset.json";
import cover_quake3 from "@/assets/nova-games/cover-quake3.jpg.asset.json";
import cover_rtcw from "@/assets/nova-games/cover-rtcw.jpg.asset.json";
import cover_ut from "@/assets/nova-games/cover-ut.jpg.asset.json";
import cover_hl from "@/assets/nova-games/cover-hl.jpg.asset.json";
import cover_cs16 from "@/assets/nova-games/cover-cs16.jpg.asset.json";
import imgSkateRust from "@/assets/nova-games/skaterust.jpg";
import imgCsSurf from "@/assets/nova-games/cssurf.jpg";
import imgHedgewars from "@/assets/nova-games/hedgewars.jpg";
import imgWasm from "@/assets/nova-games/wasm.jpg";


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
  { name: "COD Zombies (BO1)", url: "https://vel.gg/bo1z", image: cover_bo1z.url },
  { name: "Moon", url: "https://moon-zombies.pages.dev", image: cover_moon.url },
  { name: "Kino der Toten", url: "https://kino-der-toten.pages.dev", image: cover_kino.url },
  { name: "BO3 Cheese Cube", url: "https://cheese-cube.pages.dev", image: cover_cheese.url },
  { name: "Black Ops 2", url: "https://vibeslops.luckeysystems.com", image: cover_bo2.url },
  { name: "Modern Warfare 2", url: "https://ovz-game-production.up.railway.app", image: cover_mw2.url },
  { name: "GTA 5", url: "https://web.archive.org/web/20261005232456/https://playgta5.com/", image: cover_gta5.url },
  { name: "Skate 3", url: "https://skate.aaddpp.lol", image: "https://upload.wikimedia.org/wikipedia/en/8/84/Skate-3-Boxart.jpg" },
  { name: "Skate Rust", url: "https://global-terror.net", image: imgSkateRust },
  { name: "CS Surf", url: "https://surfd.net", image: imgCsSurf },
  { name: "Halo CE", url: "https://mitchellhynes.com/halo", image: cover_halo.url },
  { name: "Halo CE Mobile", url: "https://hcemobile.com", image: cover_halomobile.url },
  { name: "PES 6", url: "https://pes6.optijuegos.net", image: "https://upload.wikimedia.org/wikipedia/en/0/0f/PES6.jpg" },
  { name: "The Simpsons: Hit & Run", url: "https://shar-wasm.cjoseph.workers.dev/?skipmovie", image: "https://upload.wikimedia.org/wikipedia/en/5/5f/The_Simpsons_Hit_and_Run_cover.png" },
  { name: "Quake 1", url: "https://q1.pieter.com", image: cover_quake1.url },
  { name: "Quake 2", url: "https://q2.pieter.com", image: cover_quake2.url },
  { name: "Quake 3", url: "https://q3.pieter.com", image: cover_quake3.url },
  { name: "Return to Castle Wolfenstein", url: "https://rtcw.pieter.com", image: cover_rtcw.url },
  { name: "Unreal Tournament", url: "https://ut.pieter.com", image: cover_ut.url },
  { name: "Half Life", url: "https://pixelsuft.github.io/hl/", image: cover_hl.url },
  { name: "Half Life / CS 1.6", url: "https://x8bitrain.github.io/webXash/", image: cover_cs16.url },
  { name: "Diablo", url: "https://johnimril.github.io/diablo_web/", image: "https://upload.wikimedia.org/wikipedia/en/3/3a/Diablo_Coverart.png" },
  { name: "Hedgewars", url: "https://webwars.link", image: imgHedgewars },
  { name: "More GTA / Minecraft", url: "https://wasmarcade.com", image: imgWasm },
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
                  className="group overflow-hidden rounded-xl bg-secondary/50 text-left text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <img
                    src={g.image}
                    alt={g.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="truncate px-3 py-2">{g.name}</div>
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
