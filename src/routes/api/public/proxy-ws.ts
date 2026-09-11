import { createFileRoute } from "@tanstack/react-router";

// WebSocket leg of the built-in "webbase" proxy transport.
// Protocol (matches public/webbase-transport.js):
//   client -> { type: "connect", remote, protocols, headers, forwardHeaders }
//   server -> { type: "open", protocol } once the upstream socket is open
//   then raw binary/text frames are piped both ways.
//
// In production this runs on the edge runtime, which supports WebSocketPair.
// In the dev server (Node) the upgrade is handled by a Vite plugin instead
// (see vite.config.ts), so this handler is only a fallback there.

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/api/public/proxy-ws")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if ((request.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
          return new Response("Expected a WebSocket upgrade", { status: 426 });
        }

        const Pair = (globalThis as any).WebSocketPair;
        if (!Pair) {
          return new Response("WebSocket proxying is not supported in this runtime", { status: 501 });
        }

        const pair = new Pair();
        const client = pair[0];
        const server = pair[1] as any;
        server.accept();

        let remote: any = null;
        const queue: unknown[] = [];

        server.addEventListener("message", (ev: MessageEvent) => {
          const data = ev.data as string | ArrayBuffer;

          if (!remote) {
            if (typeof data !== "string") return;
            let msg: any;
            try {
              msg = JSON.parse(data);
            } catch {
              return;
            }
            if (msg?.type !== "connect" || typeof msg.remote !== "string") {
              try { server.close(4400, "bad connect frame"); } catch {}
              return;
            }
            try {
              const protocols: string[] = Array.isArray(msg.protocols) ? msg.protocols.map(String) : [];
              remote = protocols.length ? new WebSocket(msg.remote, protocols) : new WebSocket(msg.remote);
              remote.binaryType = "arraybuffer";
            } catch {
              try { server.close(4402, "upstream connect failed"); } catch {}
              return;
            }
            remote.addEventListener("open", () => {
              try {
                server.send(JSON.stringify({ type: "open", protocol: remote?.protocol ?? "" }));
                for (const m of queue.splice(0)) remote.send(m);
              } catch {}
            });
            remote.addEventListener("message", (rev: MessageEvent) => {
              try { server.send(rev.data); } catch {}
            });
            remote.addEventListener("close", (cev: CloseEvent) => {
              try { server.close(cev.code, cev.reason); } catch {}
            });
            remote.addEventListener("error", () => {
              try { server.close(1011, "upstream error"); } catch {}
            });
            return;
          }

          if (remote.readyState === 1) remote.send(data);
          else if (remote.readyState === 0) queue.push(data);
        });

        server.addEventListener("close", () => {
          try { remote?.close(); } catch {}
        });
        server.addEventListener("error", () => {
          try { remote?.close(); } catch {}
        });

        return new Response(null, { status: 101, webSocket: client } as any);
      },
    },
  },
});
