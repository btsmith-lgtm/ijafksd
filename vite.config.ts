// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { WebSocketServer, WebSocket as WsSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

// Dev-only WebSocket endpoint for the built-in "webbase" proxy transport.
// The dev server runs on Node (no WebSocketPair), so the /api/public/proxy-ws
// upgrade is handled here; in the published edge build the server route in
// src/routes/api/public/proxy-ws.ts handles it instead.
const WS_PROXY_PATH = "/api/public/proxy-ws";

function handleTunnel(client: WsSocket) {
  let remote: WsSocket | null = null;
  const queue: Buffer[] = [];

  client.on("message", (data: Buffer, isBinary: boolean) => {
    if (!remote) {
      if (isBinary) return;
      let msg: any;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (msg?.type !== "connect" || typeof msg.remote !== "string") {
        client.close(4400, "bad connect frame");
        return;
      }
      try {
        const headers: Record<string, string> = {};
        const fwd: string[] = Array.isArray(msg.forwardHeaders) ? msg.forwardHeaders : [];
        for (const name of fwd) {
          const v = msg.headers?.[name] ?? msg.headers?.[String(name).toLowerCase()];
          if (typeof v === "string") headers[name] = v;
        }
        const protocols: string[] = Array.isArray(msg.protocols) ? msg.protocols.map(String) : [];
        remote = new WsSocket(msg.remote, protocols, { headers });
        remote.binaryType = "arraybuffer";
      } catch {
        client.close(4402, "upstream connect failed");
        return;
      }
      remote.on("open", () => {
        client.send(JSON.stringify({ type: "open", protocol: remote?.protocol ?? "" }));
        for (const m of queue.splice(0)) remote?.send(m);
      });
      remote.on("message", (rdata: Buffer, rBinary: boolean) => {
        client.send(rdata, { binary: rBinary });
      });
      remote.on("close", (code: number, reason: Buffer) => {
        try {
          client.close(code, reason.toString());
        } catch {}
      });
      remote.on("error", () => {
        try {
          client.close(1011, "upstream error");
        } catch {}
      });
      return;
    }
    if (remote.readyState === WsSocket.OPEN) remote.send(data, { binary: isBinary });
    else if (remote.readyState === WsSocket.CONNECTING) queue.push(data);
  });

  const closeRemote = () => {
    try {
      remote?.close();
    } catch {}
  };
  client.on("close", closeRemote);
  client.on("error", closeRemote);
}

function devWsProxy(): Plugin {
  return {
    name: "nova-dev-ws-proxy",
    apply: "serve",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      server.httpServer?.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        let pathname = "";
        try {
          pathname = new URL(req.url ?? "", "http://localhost").pathname;
        } catch {
          return;
        }
        if (pathname !== WS_PROXY_PATH && pathname !== WS_PROXY_PATH + "/") return;
        wss.handleUpgrade(req, socket, head, (client) => handleTunnel(client));
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [devWsProxy()],
  },
});
