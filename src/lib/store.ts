import { useEffect, useState } from "react";

/** Tiny localStorage-backed state hook. SSR-safe. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {}
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}

export type HistoryEntry = { url: string; title: string; at: number };
export type Bookmark = { url: string; title: string; at: number };
export type DownloadItem = { name: string; url: string; at: number };
export type MediaItem = {
  id: string;
  title: string;
  kind: "movie" | "show";
  genre: string;
  year: number;
  poster: string;
  hero?: string;
  progress?: number; // 0..1
  favorite?: boolean;
  watchLater?: boolean;
  addedAt: number;
};

export type Settings = {
  theme: "dark" | "light";
  accent: string; // hex
  wallpaper: string; // url or ""
  liveWallpaper: string; // live wallpaper preset id, "" = off
  sidebarPos: "left" | "right";
  fontFamily: string;
  radius: number; // px
  transparency: number; // 0-100
  blur: number; // px
  animations: boolean;
  searchEngine: "google" | "duckduckgo" | "bing" | "brave";
  startupPage: "home" | "browser";
  customCss: string;
  customJs: string;
  bareProxy: string; // wisp url

  proxyEngine: "scramjet" | "ultraviolet" | "chemical" | "epoxy" | "wonginx";
  panicUrl: string;
  panicKey: string; // single key like "`" or "Escape"
  cloakTitle: string;
  cloakFavicon: string;
  cursorEmoji: string;
  cursorSize: number;
  cursorRotation: number;
  cursorEnabled: boolean;
  musicUrl: string; // YouTube link/ID for background music
  musicEnabled: boolean;
  musicVolume: number; // 0-100
};

export const defaultSettings: Settings = {
  theme: "dark",
  accent: "#a78bfa",
  wallpaper: "",
  liveWallpaper: "",
  sidebarPos: "left",
  fontFamily: "Inter",
  radius: 16,
  transparency: 55,
  blur: 24,
  animations: true,
  searchEngine: "duckduckgo",
  startupPage: "home",
  customCss: "",
  customJs: "",
  // Exits from 129.80.53.163 — Ashburn, Virginia, US
  bareProxy: "wss://wisp.terbiumon.top/wisp/",

  proxyEngine: "scramjet",
  panicUrl: "https://classroom.google.com",
  panicKey: "`",
  cloakTitle: "",
  cloakFavicon: "",
  cursorEmoji: "🖕",
  cursorSize: 40,
  cursorRotation: 0,
  cursorEnabled: true,
  musicUrl: "",
  musicEnabled: false,
  musicVolume: 40,
};


export const searchEngineUrl = (engine: Settings["searchEngine"], q: string) => {
  const enc = encodeURIComponent(q);
  switch (engine) {
    case "google": return `https://www.google.com/search?q=${enc}`;
    case "bing": return `https://www.bing.com/search?q=${enc}`;
    case "brave": return `https://search.brave.com/search?q=${enc}`;
    default: return `https://duckduckgo.com/?q=${enc}`;
  }
};

export function normalizeUrl(input: string, engine: Settings["searchEngine"]) {
  const s = input.trim();
  if (!s) return "";
  // Looks like a URL?
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(s)) return `https://${s}`;
  return searchEngineUrl(engine, s);
}
