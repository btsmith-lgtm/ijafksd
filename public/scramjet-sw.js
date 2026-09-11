// Scramjet service worker bootstrap.
importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const PREFIX = "/scramjet/";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isProxied =
    url.origin === self.location.origin && url.pathname.startsWith(PREFIX);

  if (!isProxied) return;

  // Never let a Scramjet URL fall through to the SPA/server router.
  event.respondWith(handleProxyRequest(event));
});

async function handleProxyRequest(event) {
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

    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }

  return retryResponse(lastError ? String(lastError) : "Proxy unavailable");
}

function retryResponse(detail) {
  const body = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{height:100%;margin:0;background:#0b0d13;color:#8b93a7;
font:14px/1.5 system-ui,sans-serif;display:grid;place-items:center}
div{text-align:center}
</style>
</head>
<body>
<div>Connecting to proxy…</div>
</body>
</html>`;

  return new Response(body, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-scramjet-error": String(detail || "").slice(0, 200),
    },
  });
}
