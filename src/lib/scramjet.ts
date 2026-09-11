// Proxy bootstrap (Scramjet + Ultraviolet + Chemical) with reliable
// service-worker control and auto-reconnect.
//
// Every engine tunnels through the built-in "webbase" bare-mux transport
// (public/webbase-transport.js), which forwards traffic to this origin's own
// /api/public/proxy-http (HTTP) and /api/public/proxy-ws (WebSocket)
// endpoints — no external Wisp server is involved anymore.
import { useEffect, useMemo, useState } from "react";

export type ProxyEngine = "scramjet" | "ultraviolet" | "chemical" | "epoxy" | "wonginx";

const WEBBASE_TRANSPORT = "/webbase-transport.js";
const WEBBASE_ARGS = [
  { proxyHttp: "/api/public/proxy-http", wsProxy: "/api/public/proxy-ws" },
];

let initPromise: Promise<boolean> | null = null;
let activeEngine: ProxyEngine = "scramjet";
let bareConn: any = null;
let reconnectPromise: Promise<boolean> | null = null;
let monitorTimer: number | null = null;
const readyListeners = new Set<() => void>();


function notifyReady() {
  readyListeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

export function getProxyEngine(): ProxyEngine {
  return activeEngine;
}

export function isScramjetReady(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.__scramjetReady && !!navigator.serviceWorker?.controller;
}

const AUTO_RECOVER_KEY = "nova-proxy-auto-reload";
const AUTO_RECOVER_MAX = 2;

/** Returns "" until the proxy service worker actually controls this page. */
export function useProxySrc(url: string, key: unknown = 0): string {
  const [ready, setReady] = useState(() => isScramjetReady());

  useEffect(() => {
    if (!ready) return;
    // Successful connection — allow future auto-recovery attempts again.
    try { sessionStorage.removeItem(AUTO_RECOVER_KEY); } catch {}
    // Watch for the proxy dropping out later so recovery can kick in.
    const drop = () => { if (!isScramjetReady()) setReady(false); };
    readyListeners.add(drop);
    const id = window.setInterval(drop, 1000);
    return () => {
      readyListeners.delete(drop);
      window.clearInterval(id);
    };
  }, [ready]);


  useEffect(() => {
    if (ready) return;

    const check = () => {
      if (isScramjetReady()) setReady(true);
    };

    readyListeners.add(check);
    const id = window.setInterval(check, 250);
    navigator.serviceWorker?.addEventListener("controllerchange", check);
    check();

    // Auto-heal: if we're still stuck on "Connecting to proxy…" after a while,
    // try a soft reconnect, then a hard proxy reset + reload.
    const softTimer = window.setTimeout(() => {
      if (!isScramjetReady()) void reconnectProxy();
    }, 8000);

    const hardTimer = window.setTimeout(() => {
      if (isScramjetReady()) return;
      let count = 0;
      try { count = Number(sessionStorage.getItem(AUTO_RECOVER_KEY) ?? "0") || 0; } catch {}
      if (count >= AUTO_RECOVER_MAX) return;
      try { sessionStorage.setItem(AUTO_RECOVER_KEY, String(count + 1)); } catch {}
      console.warn("[nova] proxy stuck — resetting and reloading");
      void resetProxy();
    }, 20000);

    return () => {
      readyListeners.delete(check);
      window.clearInterval(id);
      window.clearTimeout(softTimer);
      window.clearTimeout(hardTimer);
      navigator.serviceWorker?.removeEventListener("controllerchange", check);
    };
  }, [ready]);

  return useMemo(
    () => (ready && url ? proxyUrl(url) : ""),
    [ready, url, key],
  );
}


declare global {
  interface Window {
    ScramjetController?: any;
    $scramjetLoadController?: () => { ScramjetController: any };
    $scramjetController?: any;
    __scramjetReady?: boolean;
    __novaActiveWisp?: string;
    __novaProxyEngine?: ProxyEngine;

    __uv$config?: any;
    Ultraviolet?: any;
    chemical?: any;
    __chemicalOptions?: { transport?: string; wisp?: string };
  }
}

async function loadScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

function waitForController(timeoutMs = 12000): Promise<boolean> {
  if (navigator.serviceWorker.controller) return Promise.resolve(true);

  return new Promise((resolve) => {
    let finished = false;

    const finish = (value: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      resolve(value);
    };

    const onChange = () => finish(!!navigator.serviceWorker.controller);
    const timer = window.setTimeout(() => finish(false), timeoutMs);

    navigator.serviceWorker.addEventListener("controllerchange", onChange);
  });
}

function encodeFor(engine: ProxyEngine, url: string): string {
  const w = window as any;
  if (engine === "ultraviolet" || engine === "chemical" || engine === "epoxy" || engine === "wonginx") {
    const cfg = w.__uv$config;
    if (!cfg?.encodeUrl) return "";
    return cfg.prefix + cfg.encodeUrl(url);
  }
  if (!w.$scramjetController?.encodeUrl) return "";
  return w.$scramjetController.encodeUrl(url);
}

/** Probe the proxy end-to-end through the service worker. */
async function probeProxy(engine: ProxyEngine, timeoutMs = 8000): Promise<boolean> {
  if (!navigator.serviceWorker.controller) return false;
  const testUrl = encodeFor(engine, "https://example.com/");
  if (!testUrl) return false;

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // A 404/500 here means the SW or the transport is broken — never accept it.
    const res = await fetch(testUrl, { signal: ctrl.signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Point bare-mux at the built-in webbase transport and verify it end-to-end. */
async function setWebbaseTransport(conn: any, engine: ProxyEngine): Promise<boolean> {
  try {
    await conn.setTransport(WEBBASE_TRANSPORT, WEBBASE_ARGS);
    return await probeProxy(engine);
  } catch (err) {
    console.warn("[nova] webbase transport failed:", err);
    return false;
  }
}


async function loadChemical() {
  const w = window as any;
  w.__chemicalOptions = {};

  if (w.chemical?.loaded) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-chemical="1"]',
    );
    if (existing) {
      if (w.chemical?.loaded) return resolve();
      window.addEventListener("chemicalLoaded", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.type = "module";
    s.src = "/chemical/chemical.js";
    s.dataset.chemical = "1";
    window.addEventListener("chemicalLoaded", () => resolve(), { once: true });
    s.onerror = () => reject(new Error("Failed to load Chemical.js"));
    document.head.appendChild(s);
  });
}

export async function initScramjet(
  _wispUrl: string,
  engine: ProxyEngine = "scramjet",
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (engine !== activeEngine) {
    // Engine switch: force a fresh init.
    window.__scramjetReady = false;
    initPromise = null;
  }
  activeEngine = engine;
  window.__novaProxyEngine = engine;
  if (window.__scramjetReady && navigator.serviceWorker?.controller) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!("serviceWorker" in navigator)) return false;

      // Clear a stale ready flag from an older/broken boot.
      window.__scramjetReady = false;

      await loadScript("/baremux/index.js");

      if (engine === "chemical") {
        await loadChemical();
        if (!(window as any).__uv$config) return false;
      } else if (engine === "ultraviolet" || engine === "epoxy" || engine === "wonginx") {
        await loadScript("/uv/uv.bundle.js");
        await loadScript("/uv/uv.config.js");
        if (!(window as any).__uv$config) return false;
      } else {
        await loadScript("/scram/scramjet.all.js");

        const w = window as any;
        const ScramjetController =
          w.$scramjetLoadController?.().ScramjetController ?? w.ScramjetController;
        if (!ScramjetController) return false;

        const controller = new ScramjetController({
          prefix: "/scramjet/",
          files: {
            wasm: "/scram/scramjet.wasm.wasm",
            all: "/scram/scramjet.all.js",
            sync: "/scram/scramjet.sync.js",
          },
        });

        w.$scramjetController = controller;
        await controller.init();
      }

      const w = window as any;

      const reg = await navigator.serviceWorker.register("/proxy-sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      // Force the browser to check for a newer SW. This helps after a deploy
      // where an old service worker is still cached.
      try {
        await reg.update();
      } catch {}

      if (reg.installing || reg.waiting) {
        await new Promise<void>((resolve) => {
          const sw = reg.installing || reg.waiting;
          if (!sw) return resolve();

          if (sw.state === "activated") return resolve();

          const onState = () => {
            if (sw.state === "activated") {
              sw.removeEventListener("statechange", onState);
              resolve();
            }
          };
          sw.addEventListener("statechange", onState);
        });
      }

      await navigator.serviceWorker.ready;

      // IMPORTANT: don't continue until this page is actually controlled.
      // Otherwise proxied URLs fall through to the app router and become
      // the "Not Found" page inside the iframe.
      const controlled = await waitForController();
      if (!controlled) {
        console.warn("[nova] service worker activated but does not control this page");
        return false;
      }

      const conn =
        engine === "chemical" && w.chemical?.connection
          ? w.chemical.connection
          : new w.BareMux.BareMuxConnection("/baremux/worker.js");

      bareConn = conn;

      if (!(await setWebbaseTransport(conn, engine))) {
        console.warn("[nova] webbase transport probe failed");
        return false;
      }

      window.__novaActiveWisp = "webbase (built-in)";
      window.__scramjetReady = true;
      startHealthMonitor();
      notifyReady();
      return true;
    } catch (err) {
      console.warn("[nova] Proxy init failed:", err);
      return false;
    } finally {
      // Never permanently cache a failed initialization.
      if (!window.__scramjetReady) initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * If the transport link breaks (e.g. service worker update), re-run
 * setTransport and only report success once a real proxied fetch works again.
 */
export async function reconnectProxy(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (reconnectPromise) return reconnectPromise;

  reconnectPromise = (async () => {
    if (!bareConn || !navigator.serviceWorker?.controller) {
      // Nothing to repair — do a clean cold boot instead.
      resetScramjet();
      return false;
    }

    if (await setWebbaseTransport(bareConn, activeEngine)) {
      window.__scramjetReady = true;
      notifyReady();
      console.info("[nova] proxy reconnected via webbase transport");
      return true;
    }

    console.warn("[nova] proxy reconnect failed");
    window.__scramjetReady = false;
    notifyReady();
    return false;
  })();

  try {
    return await reconnectPromise;
  } finally {
    reconnectPromise = null;
  }
}

/** Periodically verify the proxy still works and self-heal when it doesn't. */
function startHealthMonitor() {
  if (monitorTimer != null) return;

  const check = async () => {
    if (document.hidden) return;
    if (!window.__scramjetReady) return;
    if (reconnectPromise) return;
    const ok = await probeProxy(activeEngine, 6000);
    if (!ok) {
      console.warn("[nova] proxy health check failed — reconnecting");
      await reconnectProxy();
    }
  };

  monitorTimer = window.setInterval(check, 30000);

  // React immediately to the events that usually break the transport link.
  window.addEventListener("online", () => void reconnectProxy());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void check();
  });
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    void reconnectProxy();
  });
}

export function proxyUrl(url: string): string {
  const w = window as any;
  if (!w.__scramjetReady) return "";
  try {
    return encodeFor(activeEngine, url);
  } catch {
    return "";
  }
}

/** Drop a broken proxy state so the next init can start cleanly. */
export function resetScramjet() {
  window.__scramjetReady = false;
  window.__novaActiveWisp = undefined;
  bareConn = null;
  initPromise = null;
  notifyReady();
}

/** Hard-reset the proxy: unregister service workers, clear bare-mux state, and reload. */
export async function resetProxy() {
  if (typeof window === "undefined") return;
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
  } catch {}
  try {
    localStorage.removeItem("bare-mux-path");
    localStorage.removeItem("bare-mux-port");
  } catch {}
  resetScramjet();
  window.location.reload();
}
