import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Sidebar } from "@/components/nova/Sidebar";
import { HomeView } from "@/components/nova/HomeView";
import { BrowserView } from "@/components/nova/BrowserView";
import { SettingsView } from "@/components/nova/SettingsView";
import { MediaView } from "@/components/nova/MediaView";
import { ClassroomView } from "@/components/nova/ClassroomView";
import { TikTokView } from "@/components/nova/TikTokView";
import { AIView } from "@/components/nova/AIView";
import { SimpleListView } from "@/components/nova/SimpleListView";
import { AppsView } from "@/components/nova/AppsView";
import { LeaderboardView } from "@/components/nova/LeaderboardView";
import { useUsageTracker, type UsageCategory } from "@/lib/usage";
import { ProxySiteMenu } from "@/components/nova/ProxySiteMenu";
import { ProxyFrameView } from "@/components/nova/ProxyFrameView";

import { LoadingScreen } from "@/components/nova/LoadingScreen";

import { LiveWallpaper, type LiveWallpaperId } from "@/components/nova/LiveWallpaper";

import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocalStorage, defaultSettings, type Settings, type Bookmark, type HistoryEntry, type DownloadItem, normalizeUrl } from "@/lib/store";
import { initScramjet, resetProxy } from "@/lib/scramjet";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthPanel } from "@/components/nova/AuthPanel";
import { SkywardGate } from "@/components/nova/SkywardGate";
import { loadCloudState, useCloudSettingsSync } from "@/lib/cloudSync";


export type View = "home" | "browser" | "bookmarks" | "history" | "downloads" | "settings" | "media" | "classroom" | "tiktok" | "ai" | "apps" | "leaderboard";

export default function NovaApp() {
  const [settings, setSettings, hydrated] = useLocalStorage<Settings>("nova.settings", defaultSettings);
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>("nova.bookmarks", []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>("nova.history", []);
  const [downloads, setDownloads] = useLocalStorage<DownloadItem[]>("nova.downloads", []);
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("nova.sidebarCollapsed", false);

  const [view, setView] = useState<View>("home");
  const [loadedViews, setLoadedViews] = useState<Set<View>>(() => new Set<View>(["home"]));
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  useUsageTracker(
    view === "classroom" || view === "media" || view === "tiktok" ? (view as UsageCategory) : null,
  );
  const [booting, setBooting] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [proxyMenuOpen, setProxyMenuOpen] = useState(false);
  const [proxySite, setProxySite] = useState<{ url: string; label: string } | null>(null);
  const [novaTransitioning, setNovaTransitioning] = useState(false);
  const novaTransitionTimerRef = useRef<number | null>(null);


  // Account: sign in comes right after the calculator code.
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const userId = session?.user.id ?? null;
  const [cloudReady, setCloudReady] = useState(false);

  // Discord popup shown once after the Nova loading screen finishes.
  const [discordPopupOpen, setDiscordPopupOpen] = useState(false);
  const loadingJustFinishedRef = useRef(false);

  // Skyward disguise gates the sign-in page; code 1111 in the site search unlocks it.
  const [gateUnlocked, setGateUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem("nova.gateUnlocked") === "1";
    } catch {
      return false;
    }
  });
  const gated = !gateUnlocked;

  useEffect(() => {
    if (gated) {
      // Keep Nova fully dormant behind the Skyward disguise.
      setAuthReady(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => () => {
    if (novaTransitionTimerRef.current) window.clearTimeout(novaTransitionTimerRef.current);
  }, []);

  // Show the Discord popup once after the Nova loading screen finishes.
  useEffect(() => {
    const loading = !authReady || novaTransitioning || booting;
    if (loading) {
      loadingJustFinishedRef.current = true;
      return;
    }
    if (loadingJustFinishedRef.current && session) {
      const alreadyShown = sessionStorage.getItem("nova.discordPopupShown") === "1";
      if (!alreadyShown) {
        setDiscordPopupOpen(true);
        try {
          sessionStorage.setItem("nova.discordPopupShown", "1");
        } catch {}
      }
      loadingJustFinishedRef.current = false;
    }
  }, [authReady, novaTransitioning, booting, session]);


  // Pull this account's saved settings, bookmarks and history.
  useEffect(() => {
    if (!userId || !hydrated) return;
    let cancelled = false;
    setCloudReady(false);
    (async () => {
      const saved = await loadCloudState(userId);
      if (cancelled) return;
      if (saved) {
        setSettings((prev) => ({ ...prev, ...saved.settings }));
        if (saved.bookmarks.length) setBookmarks(saved.bookmarks);
        if (saved.history.length) setHistory(saved.history);
      }
      setCloudReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hydrated]);

  // Push changes back up so the account keeps its settings everywhere.
  useCloudSettingsSync(userId, cloudReady, { settings, bookmarks, history });


  // Track views the user has actually opened; once loaded, keep them mounted.
  useEffect(() => {
    setLoadedViews((prev) => {
      if (prev.has(view)) return prev;
      const next = new Set(prev);
      next.add(view);
      return next;
    });
  }, [view]);


  // Calculator disguise gates the app; no timed splash.
  useEffect(() => {
    setSplashDone(true);
  }, []);

  // Apply theme + design tokens from settings
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("light", settings.theme === "light");
    root.classList.toggle("dark", settings.theme === "dark");
    root.style.setProperty("--radius", `${settings.radius}px`);
    root.style.setProperty("--blur-strength", `${settings.blur}px`);
    root.style.fontFamily = settings.fontFamily;
    // Accent → primary
    root.style.setProperty("--primary", settings.accent);
    root.style.setProperty("--ring", settings.accent);
    // Transparency affects glass alpha
    const alpha = Math.max(10, Math.min(95, settings.transparency)) / 100;
    root.style.setProperty("--glass", `color-mix(in oklch, var(--card) ${Math.round(alpha * 100)}%, transparent)`);

    // Wallpaper
    if (settings.wallpaper) {
      document.body.style.backgroundImage = `linear-gradient(color-mix(in oklch, var(--background) 55%, transparent), color-mix(in oklch, var(--background) 55%, transparent)), url("${settings.wallpaper}")`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
    } else {
      document.body.style.backgroundImage = "";
    }

    // Custom cursor — override every element (buttons, links, inputs) via !important
    let cursorStyle = document.getElementById("nova-cursor-style") as HTMLStyleElement | null;
    if (!cursorStyle) {
      cursorStyle = document.createElement("style");
      cursorStyle.id = "nova-cursor-style";
      document.head.appendChild(cursorStyle);
    }
    if (settings.cursorEnabled && settings.cursorEmoji) {
      const size = settings.cursorSize;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='${size * 0.8}' transform='rotate(${settings.cursorRotation} ${size / 2} ${size / 2})'>${settings.cursorEmoji}</text></svg>`;
      const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${size / 2} ${size / 2}, auto`;
      cursorStyle.textContent = `html, body, *, *::before, *::after { cursor: ${url} !important; }`;
    } else {
      cursorStyle.textContent = "";
    }
  }, [settings, hydrated]);

  // Custom CSS + JS injection
  useEffect(() => {
    if (!hydrated) return;
    let style = document.getElementById("nova-custom-css") as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = "nova-custom-css";
      document.head.appendChild(style);
    }
    style.textContent = settings.customCss;
  }, [settings.customCss, hydrated]);

  useEffect(() => {
    if (!hydrated || !settings.customJs) return;
    try {
      // eslint-disable-next-line no-new-func
      new Function(settings.customJs)();
    } catch (e) {
      console.warn("Custom JS error:", e);
    }
  }, [settings.customJs, hydrated]);

  // Cloak: override document title + favicon (Skyward while the gate is up)
  useEffect(() => {
    if (!hydrated) return;
    document.title = gated
      ? "Skyward | A Better SIS and ERP Experience"
      : settings.cloakTitle || "Nova";
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = gated
      ? "https://www.skyward.com/favicon.ico"
      : settings.cloakFavicon || "/favicon.ico";
  }, [settings.cloakTitle, settings.cloakFavicon, hydrated, gated]);

  // Boot: scramjet + startup page (only after Nova is actually entered)
  useEffect(() => {
    if (!hydrated || gated) return;
    let cancelled = false;
    (async () => {
      const ok = await initScramjet(settings.bareProxy, settings.proxyEngine ?? "scramjet");
      if (cancelled) return;
      if (!ok) toast.warning("Proxy engine unavailable — some sites may not load.");
      else toast.success("Nova ready");
      setBooting((wasBooting) => {
        if (wasBooting) setView(settings.startupPage);
        return false;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, settings.bareProxy, settings.proxyEngine]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Panic key: redirect immediately
      if (settings.panicKey && settings.panicUrl && e.key === settings.panicKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          window.location.href = settings.panicUrl;
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setView("browser");
        setPendingUrl("__new__");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setView("browser");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setView("settings");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings.panicKey, settings.panicUrl]);

  // Secret code "1111" opens the proxy-site picker anywhere in the app.
  const keyBufferRef = useRef("");
  const keyTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keyTimeoutRef.current) window.clearTimeout(keyTimeoutRef.current);
      keyBufferRef.current += e.key;
      if (keyBufferRef.current.length > 4) {
        keyBufferRef.current = keyBufferRef.current.slice(-4);
      }
      if (keyBufferRef.current === "1111") {
        e.preventDefault();
        keyBufferRef.current = "";
        setProxyMenuOpen(true);
        return;
      }
      keyTimeoutRef.current = window.setTimeout(() => {
        keyBufferRef.current = "";
      }, 1500);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (keyTimeoutRef.current) window.clearTimeout(keyTimeoutRef.current);
    };
  }, []);


  const openUrl = (raw: string) => {
    const u = normalizeUrl(raw, settings.searchEngine);
    if (!u) return;
    setPendingUrl(u);
    setView("browser");
    setHistory((h) => [{ url: u, title: u, at: Date.now() }, ...h].slice(0, 500));
  };

  const addBookmark = (b: Bookmark) => setBookmarks((prev) => [b, ...prev.filter((x) => x.url !== b.url)]);
  const removeBookmark = (url: string) => setBookmarks((prev) => prev.filter((x) => x.url !== url));

  if (!authReady) return <LoadingScreen />;
  if (novaTransitioning) return <LoadingScreen />;

  if (gated)
    return (
      <>
        <SkywardGate onUnlock={() => setProxyMenuOpen(true)} />
        <ProxySiteMenu
          open={proxyMenuOpen}
          onClose={() => setProxyMenuOpen(false)}
          onSelectProxySite={(site) => {
            setProxyMenuOpen(false);
            setProxySite(site);
          }}
          onSelectNova={() => {
            // Only now load Nova: show the loading screen, then unlock and
            // reset the proxy engine so Nova always starts clean.
            setProxyMenuOpen(false);
            setNovaTransitioning(true);
            if (novaTransitionTimerRef.current) window.clearTimeout(novaTransitionTimerRef.current);
            novaTransitionTimerRef.current = window.setTimeout(() => {
              novaTransitionTimerRef.current = null;
              try {
                sessionStorage.setItem("nova.gateUnlocked", "1");
              } catch {}
              setGateUnlocked(true);
              void resetProxy();
            }, 4500);
          }}
        />
        {proxySite && (
          <ProxyFrameView
            url={proxySite.url}
            title={proxySite.label}
            onBack={() => setProxySite(null)}
          />
        )}
        <Toaster richColors position="bottom-right" theme={settings.theme} />
      </>
    );

  if (!session)
    return (
      <>
        <LiveWallpaper id={(settings.liveWallpaper ?? "") as LiveWallpaperId} />
        <AuthPanel
          title="Sign in to Nova"
          subtitle="Your settings are saved to your account."
        />
        <Toaster />
      </>
    );
  if (!hydrated || booting || novaTransitioning) return <LoadingScreen />;


  const sidebar = (
    <Sidebar
      view={view}
      onChange={setView}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((c) => !c)}
      musicUrl={settings.musicUrl ?? ""}
      musicVolume={settings.musicVolume ?? 40}
      musicEnabled={settings.musicEnabled ?? true}
    />
  );

  return (
    <div className={`flex h-dvh w-full overflow-hidden ${settings.animations ? "" : "[&_*]:!animate-none [&_*]:!transition-none"}`}>
      <LiveWallpaper id={(settings.liveWallpaper ?? "") as LiveWallpaperId} />
      {settings.sidebarPos === "left" && sidebar}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="relative flex-1 min-h-0">
          {([
            ["home", (
              <HomeView
                settings={settings}
                bookmarks={bookmarks}
                history={history}
                onOpen={openUrl}
                onGoBrowser={() => setView("browser")}
              />
            )],
            ["browser", (
              <BrowserView
                settings={settings}
                initialUrl={pendingUrl}
                onConsumedInitial={() => setPendingUrl(null)}
                onAddHistory={(e) => setHistory((h) => [e, ...h].slice(0, 500))}
                onAddBookmark={addBookmark}
                onAddDownload={(d) => setDownloads((prev) => [d, ...prev])}
                bookmarks={bookmarks}
              />
            )],
            ["bookmarks", (
              <SimpleListView
                title="Bookmarks"
                items={bookmarks.map((b) => ({ title: b.title, subtitle: b.url, at: b.at }))}
                emptyLabel="No bookmarks yet"
                onOpen={(i) => openUrl(bookmarks[i].url)}
                onDelete={(i) => removeBookmark(bookmarks[i].url)}
              />
            )],
            ["history", (
              <SimpleListView
                title="History"
                items={history.map((h) => ({ title: h.title, subtitle: h.url, at: h.at }))}
                emptyLabel="Nothing here yet"
                onOpen={(i) => openUrl(history[i].url)}
                onDelete={(i) => setHistory((prev) => prev.filter((_, idx) => idx !== i))}
                clearAll={() => setHistory([])}
              />
            )],
            ["downloads", (
              <SimpleListView
                title="Downloads"
                items={downloads.map((d) => ({ title: d.name, subtitle: d.url, at: d.at }))}
                emptyLabel="No downloads yet"
                onOpen={(i) => openUrl(downloads[i].url)}
                onDelete={(i) => setDownloads((prev) => prev.filter((_, idx) => idx !== i))}
              />
            )],
            ["settings", (
              <SettingsView
                session={session}
                settings={settings}
                onChange={setSettings}
                onReset={() => setSettings(defaultSettings)}
                bookmarks={bookmarks}
                history={history}
                downloads={downloads}
                onOpenUrl={openUrl}
                onDeleteBookmark={removeBookmark}
                onDeleteHistory={(i) => setHistory((prev) => prev.filter((_, idx) => idx !== i))}
                onClearHistory={() => setHistory([])}
                onDeleteDownload={(i) => setDownloads((prev) => prev.filter((_, idx) => idx !== i))}
              />
            )],
            ["media", <MediaView />],
            ["classroom", <ClassroomView />],
            ["tiktok", <TikTokView />],
            ["ai", <AIView />],
            ["apps", <AppsView onOpen={openUrl} />],
            ["leaderboard", <LeaderboardView />],
            
          ] as [View, React.ReactNode][]).filter(([id]) => loadedViews.has(id)).map(([id, node]) => (
            <div
              key={id}
              aria-hidden={view !== id}
              className={`absolute inset-0 ${view === id ? "block" : "hidden"}`}
            >
              {node}
            </div>
          ))}

        </div>
      </main>
      {settings.sidebarPos === "right" && sidebar}
      <ProxySiteMenu
        open={proxyMenuOpen}
        onClose={() => setProxyMenuOpen(false)}
        onSelectProxySite={(site) => {
          setProxyMenuOpen(false);
          setProxySite(site);
        }}
        onSelectNova={() => {
          setNovaTransitioning(true);
          if (novaTransitionTimerRef.current) window.clearTimeout(novaTransitionTimerRef.current);
          novaTransitionTimerRef.current = window.setTimeout(() => {
            setNovaTransitioning(false);
            novaTransitionTimerRef.current = null;
          }, 2200);
        }}
      />
      {proxySite && (
        <ProxyFrameView
          url={proxySite.url}
          title={proxySite.label}
          onBack={() => setProxySite(null)}
        />
      )}
      <Dialog open={discordPopupOpen} onOpenChange={setDiscordPopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#5865F2]" />
              Join the Nova Discord
            </DialogTitle>
            <DialogDescription>
              Join our Discord for leaks and to make suggestions!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDiscordPopupOpen(false)}>
              Maybe later
            </Button>
            <Button asChild>
              <a
                href="https://discord.gg/6bzDUFbKTC"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Join Discord
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster richColors position="bottom-right" theme={settings.theme} />
    </div>
  );
}
