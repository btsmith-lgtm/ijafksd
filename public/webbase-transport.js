function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function readBody(body) {
  if (!body) return null;
  const buf = await new Response(body).arrayBuffer();
  return bufToBase64(buf);
}

export default class BareTransport {
  constructor({ proxyHttp = '/proxy-http/', bare = '/bare/', wsProxy = '/proxy-ws/' } = {}) {
    this.proxyHttp = new URL(proxyHttp, self.location.href).toString();
    const wsBase = new URL(wsProxy, self.location.href);
    wsBase.protocol = wsBase.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsUrl = wsBase.toString();
    this.ready = false;
  }

  async init() {
    this.ready = true;
  }

  async request(url, method, body, headers, _) {
    const b64Body = await readBody(body);

    const resp = await fetch(this.proxyHttp, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.toString(),
        method,
        headers,
        body: b64Body,
      }),
    });

    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    return {
      status: data.status,
      statusText: data.statusText,
      headers: data.headers,
      body: data.body ? base64ToBuf(data.body) : null,
      finalURL: data.finalURL || url.toString(),
    };
  }

  connect(url, protocols, requestHeaders, onOpen, onMessage, onClose, onError) {
    const ws = new WebSocket(this.wsUrl);
    ws.binaryType = 'arraybuffer';
    let opened = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'connect',
        remote: url.toString(),
        protocols: protocols || [],
        headers: requestHeaders || {},
        forwardHeaders: ['accept-encoding', 'accept-language'],
      }));
    };

    ws.onmessage = (event) => {
      if (!opened) {
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'open') {
              opened = true;
              onOpen(data.protocol || (protocols && protocols[0]) || '');
              return;
            }
          } catch {}
        }
        return;
      }
      onMessage(event.data);
    };

    ws.onclose = (e) => onClose(e.code, e.reason);
    ws.onerror = () => onError(new Error('WebSocket error'));

    return [
      (data) => ws.readyState === WebSocket.OPEN && ws.send(data),
      (code, reason) => ws.close(code, reason),
    ];
  }
}
