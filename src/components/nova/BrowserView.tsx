import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Star, Pin, X, Plus, Maximize2, Copy, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeUrl, type Bookmark, type HistoryEntry, type Settings, type DownloadItem } from "@/lib/store";
import { useProxySrc } from "@/lib/scramjet";

type Tab = {
  id: string;
  title: string;
  url: string;
  history: string[];
  index: number;
  pinned: boolean;
  group?: string;
};

const NEW_TAB: Omit<Tab, "id"> = { title: "New Tab", url: "", history: [], index: -1, pinned: false };

const uid = () => Math.random().toString(36).slice(2, 10);

export function BrowserView({
  settings, initialUrl, onConsumedInitial, onAddHistory, onAddBookmark, onAddDownload, bookmarks,
}: {
  settings: Settings;
  initialUrl: string | null;
  onConsumedInitial: () => void;
  onAddHistory: (e: HistoryEntry) => void;
  onAddBookmark: (b: Bookmark) => void;
  onAddDownload: (d: DownloadItem) => void;
  bookmarks: Bookmark[];
}) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: uid(), ...NEW_TAB }]);
  const [activeId, setActiveId] = useState<string>(tabs[0].id);
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const active = tabs.find((t) => t.id === activeId)!;

  const updateTab = (id: string, patch: Partial<Tab>) =>
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const openInActive = (raw: string) => {
    const url = normalizeUrl(raw, settings.searchEngine);
    if (!url) return;
    setLoading(true);
    setTabs((prev) => prev.map((t) => {
      if (t.id !== activeId) return t;
      const cutHistory = t.history.slice(0, t.index + 1);
      const nextHist = [...cutHistory, url];
      return { ...t, url, title: url, history: nextHist, index: nextHist.length - 1 };
    }));
    onAddHistory({ url, title: url, at: Date.now() });
  };

  const newTab = (url?: string) => {
    const t: Tab = { id: uid(), ...NEW_TAB };
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
    if (url) setTimeout(() => openInActive(url), 0);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const nt = { id: uid(), ...NEW_TAB };
        setActiveId(nt.id);
        return [nt];
      }
      if (id === activeId) setActiveId(next[Math.max(0, idx - 1)].id);
      return next;
    });
  };

  // Consume initial URL from parent
  useEffect(() => {
    if (!initialUrl) return;
    if (initialUrl === "__new__") { newTab(); onConsumedInitial(); return; }
    openInActive(initialUrl);
    onConsumedInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  // Sync address bar with active tab
  useEffect(() => { setAddr(active.url); }, [active.url, active.id]);

  const back = () => {
    if (active.index <= 0) return;
    const i = active.index - 1;
    updateTab(active.id, { index: i, url: active.history[i] });
    setLoading(true);
  };
  const fwd = () => {
    if (active.index >= active.history.length - 1) return;
    const i = active.index + 1;
    updateTab(active.id, { index: i, url: active.history[i] });
    setLoading(true);
  };
  const reload = () => {
    if (!active.url) return;
    setLoading(true);
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };
  const goHome = () => openInActive("https://duckduckgo.com");

  const isBookmarked = useMemo(() => bookmarks.some((b) => b.url === active.url), [bookmarks, active.url]);

  const src = useProxySrc(active.url);

  return (
    <div className={`flex h-full flex-col p-3 ${fullscreen ? "fixed inset-0 z-50 bg-background p-0" : ""}`}>
      {!fullscreen && (
        <>
          {/* Tab strip */}
          <div className="glass mb-2 flex items-center gap-1 overflow-x-auto rounded-2xl p-1.5"
               style={{ borderRadius: "var(--radius)" }}>
            {tabs.map((t) => {
              const isActive = t.id === activeId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`group grid min-w-0 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-all ${
                    isActive
                      ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_var(--glass-border)]"
                      : "text-muted-foreground hover:bg-white/5"
                  } ${t.pinned ? "max-w-[42px]" : "max-w-[220px]"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${t.pinned ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  {!t.pinned && (
                    <span className="truncate">{t.title || "New Tab"}</span>
                  )}
                  {!t.pinned && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                      className="hidden rounded-full p-0.5 hover:bg-white/10 group-hover:block"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => newTab()}
              className="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="New tab"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Address bar */}
          <div className="glass mb-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-2xl p-1.5"
               style={{ borderRadius: "var(--radius)" }}>
            <div className="flex items-center gap-0.5">
              <IconBtn onClick={back} disabled={active.index <= 0} label="Back"><ArrowLeft className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={fwd} disabled={active.index >= active.history.length - 1} label="Forward"><ArrowRight className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={reload} label="Reload"><RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></IconBtn>
              <IconBtn onClick={goHome} label="Home"><Home className="h-4 w-4" /></IconBtn>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); openInActive(addr); }} className="min-w-0">
              <input
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder="Search or type a URL"
                className="w-full rounded-lg bg-white/5 px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
              />
            </form>
            <div className="flex items-center gap-0.5">
              <IconBtn
                onClick={() => {
                  if (!active.url) return;
                  if (isBookmarked) toast.info("Already bookmarked");
                  else { onAddBookmark({ url: active.url, title: active.title, at: Date.now() }); toast.success("Bookmarked"); }
                }}
                label="Bookmark"
              >
                <Star className={`h-4 w-4 ${isBookmarked ? "fill-primary text-primary" : ""}`} />
              </IconBtn>
              <IconBtn
                onClick={() => updateTab(active.id, { pinned: !active.pinned })}
                label={active.pinned ? "Unpin" : "Pin"}
              >
                <Pin className={`h-4 w-4 ${active.pinned ? "text-primary" : ""}`} />
              </IconBtn>
              <IconBtn onClick={() => setFullscreen(true)} label="Fullscreen"><Maximize2 className="h-4 w-4" /></IconBtn>
              <IconBtn
                onClick={() => { if (active.url) { navigator.clipboard.writeText(active.url); toast.success("URL copied"); } }}
                label="Copy URL"
              >
                <Copy className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => { if (active.url) window.open(active.url, "_blank"); }} label="Open in new window">
                <ExternalLink className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                onClick={() => { if (active.url) onAddDownload({ name: active.title || active.url, url: active.url, at: Date.now() }); toast.info("Added to downloads list"); }}
                label="Save link"
              >
                <span className="text-[10px] font-bold">SAVE</span>
              </IconBtn>
            </div>
          </div>

          {/* Loading bar */}
          <div className="relative -mt-1 mb-1 h-0.5 overflow-hidden rounded-full bg-transparent">
            {loading && (
              <div className="absolute inset-y-0 left-0 w-1/3 animate-[shimmer_1.2s_linear_infinite] rounded-full"
                   style={{ background: "var(--gradient-primary)", backgroundSize: "200% 100%" }} />
            )}
          </div>
        </>
      )}

      {/* Content */}
      <div className={`relative min-h-0 flex-1 overflow-hidden ${fullscreen ? "" : "glass rounded-2xl"}`}
           style={{ borderRadius: fullscreen ? 0 : "var(--radius)" }}>
        {fullscreen && (
          <button
            onClick={() => setFullscreen(false)}
            className="glass absolute right-4 top-4 z-10 rounded-full p-2 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {!active.url ? (
          <StartPage onOpen={openInActive} />
        ) : !src ? (
          <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">Connecting to proxy…</div>
        ) : (
          <iframe
            key={active.id + active.url}
            ref={iframeRef}
            src={src}
            title={active.title}
            className="h-full w-full border-0 bg-white"
            onLoad={() => setLoading(false)}
            sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
            referrerPolicy="no-referrer"
          />
        )}

      </div>
    </div>
  );
}

function IconBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="ripple grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StartPage({ onOpen }: { onOpen: (u: string) => void }) {
  const [q, setQ] = useState("");
  const suggestions = ["news", "weather", "youtube", "github", "tanstack router", "unsplash"];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="grid h-16 w-16 place-items-center rounded-3xl animate-float"
           style={{ background: "var(--gradient-primary)" }}>
        <span className="text-2xl font-black text-white">N</span>
      </div>
      <h2 className="text-2xl font-bold gradient-text">Where to?</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (q) onOpen(q); }}
            className="glass-strong flex w-full max-w-xl items-center gap-3 rounded-2xl px-4 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search or enter URL"
          className="flex-1 bg-transparent text-base outline-none"
          autoFocus
        />
      </form>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onOpen(s)}
            className="glass rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
