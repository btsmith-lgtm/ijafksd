import { Home, Globe, Settings, Film, Gamepad2, LayoutGrid, Music2, Sparkles, Trophy, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { View } from "./NovaApp";
import { BackgroundAudioToggle } from "./BackgroundVideo";
import novaEmblemAsset from "@/assets/nova-emblem.png.asset.json";

const items: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "media", label: "Movies", icon: Film },
  { id: "classroom", label: "Games", icon: Gamepad2 },
  { id: "tiktok", label: "TikTok", icon: Music2 },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "settings", label: "Settings", icon: Settings },
];

function openAboutBlank() {
  // Cloak the page the user is currently on inside an about:blank tab.
  const url = window.location.href;
  const win = window.open("about:blank", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(`<!doctype html><html><head><title></title><style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden;}iframe{border:0;width:100%;height:100%;display:block;}</style></head><body><iframe src="${url}" allow="clipboard-read; clipboard-write; fullscreen; autoplay; camera; microphone; display-capture"></iframe></body></html>`);
  win.document.close();
}

export function Sidebar({
  view, onChange, collapsed, onToggleCollapse, musicUrl, musicVolume, musicEnabled,
}: {
  view: View;
  onChange: (v: View) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  musicUrl?: string;
  musicVolume?: number;
  musicEnabled?: boolean;
}) {
  return (
    <aside
      className={`glass relative m-2.5 flex flex-col rounded-2xl p-2.5 transition-[width] duration-300 ease-out ${
        collapsed ? "w-16" : "w-56"
      }`}
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className={`mb-5 flex items-center gap-2.5 px-2 pt-1 ${collapsed ? "justify-center" : ""}`}>
        <img
          src={novaEmblemAsset.url}
          alt="Nova emblem"
          className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-[var(--shadow-glow)]"
        />
        {!collapsed && <span className="text-base font-semibold tracking-tight">Nova</span>}
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? it.label : undefined}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
              {!collapsed && <span className="truncate">{it.label}</span>}
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>


      <div className="mt-auto pt-2">
        <BackgroundAudioToggle collapsed={collapsed} musicUrl={musicUrl} volume={musicVolume} enabled={musicEnabled ?? true} />
        <button
          onClick={openAboutBlank}
          className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "about:blank" : undefined}
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">about:blank</span>}
        </button>
        <button
          onClick={onToggleCollapse}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
