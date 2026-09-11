import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// HTTP leg of the built-in "webbase" proxy transport (public/webbase-transport.js).
// The in-page bare-mux transport POSTs { url, method, headers, body(base64) }
// here and expects { status, statusText, headers, body(base64), finalURL }.

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const requestSchema = z.object({
  url: z.string().max(4096),
  method: z.string().max(16).default("GET"),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().max(40_000_000).nullable().optional(),
});

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const Route = createFileRoute("/api/public/proxy-http")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Browser-only guard: refuse cross-site pages embedding us as an open proxy.
          const sfs = request.headers.get("sec-fetch-site");
          if (sfs && sfs !== "same-origin" && sfs !== "none") {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const parsed = requestSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Bad request" }, { status: 400 });
          }
          const { url, method, headers, body } = parsed.data;

          let target: URL;
          try {
            target = new URL(url);
          } catch {
            return Response.json({ error: "Invalid URL" }, { status: 400 });
          }
          if (target.protocol !== "http:" && target.protocol !== "https:") {
            return Response.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
          }

          const fwd = new Headers();
          for (const [k, v] of Object.entries(headers ?? {})) {
            if (HOP_BY_HOP.has(k.toLowerCase())) continue;
            try {
              fwd.set(k, v);
            } catch {
              // skip header names/values the runtime rejects
            }
          }
          // Ask upstream for identity encoding so every runtime returns plain bytes.
          fwd.set("accept-encoding", "identity");

          const upper = method.toUpperCase();
          const hasBody = !!body && upper !== "GET" && upper !== "HEAD";

          const resp = await fetch(target.toString(), {
            method: upper,
            headers: fwd,
            body: hasBody ? (base64ToBuf(body!).buffer as ArrayBuffer) : undefined,
            redirect: "follow",
            signal: AbortSignal.timeout(30_000),
          });

          const respHeaders: Record<string, string> = {};
          resp.headers.forEach((v, k) => {
            if (HOP_BY_HOP.has(k.toLowerCase())) return;
            respHeaders[k] = v;
          });
          const getSetCookie = (resp.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
          const cookies = getSetCookie ? getSetCookie.call(resp.headers) : [];
          if (cookies.length) respHeaders["set-cookie"] = cookies.join(", ");

          const buf = await resp.arrayBuffer();

          return Response.json({
            status: resp.status,
            statusText: resp.statusText,
            headers: respHeaders,
            body: buf.byteLength ? bufToBase64(buf) : null,
            finalURL: resp.url || target.toString(),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Proxy fetch failed";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
