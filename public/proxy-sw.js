// Combined proxy service worker: Scramjet (/scramjet/) + Ultraviolet (/service/).
importScripts("/scram/scramjet.all.js");
importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");
importScripts("/uv/uv.sw.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const SCRAM_PREFIX = "/scramjet/";
const UV_PREFIX = self.__uv$config.prefix;
const uv = new UVServiceWorker();

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(UV_PREFIX)) {
    event.respondWith(handleUv(event));
    return;
  }

  if (url.pathname.startsWith(SCRAM_PREFIX)) {
    event.respondWith(handleScramjet(event));
  }
});

async function handleUv(event) {
  try {
    return await uv.fetch(event);
  } catch (err) {
    return new Response("Ultraviolet proxy error: " + (err && err.message), {
      status: 502,
      headers: { "content-type": "text/plain" },
    });
  }
}

async function handleScramjet(event) {
  let lastError = null;

  // Config can briefly be unavailable immediately after activation.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await scramjet.loadConfig();

      if (scramjet.route(event)) {
        return await scramjet.fetch(event);
      }

      lastError = new Error("Scramjet did not route the request");
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return new Response("Proxy error: " + (lastError && lastError.message), {
    status: 502,
    headers: { "content-type": "text/plain" },
  });
}
