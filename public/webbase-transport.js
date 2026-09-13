/**
 * Highly optimized chunked binary-to-base64 stream utility.
 * Eradicates massive array allocations and prevents UI freezing on large files.
 */
class Base64StreamTransformer {
  static arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    if (typeof bytes.toBase64 === 'function') return bytes.toBase64();
    let binary = '';
    const CHUNK_SIZE = 16384; // Optimized L1/L2 cache-friendly chunk size
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
    }
    return btoa(binary);
  }

  static base64ToArrayBuffer(b64) {
    if (typeof Uint8Array.fromBase64 === 'function') {
      return Uint8Array.fromBase64(b64).buffer;
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Extracts and prepares bodies for transport.
 * Supports streams, blobs, buffers, and string types natively.
 */
async function serializeBody(body) {
  if (!body) return null;
  // Directly pull data out of unified payload types
  const responseWrapper = new Response(body);
  const buffer = await responseWrapper.arrayBuffer();
  return Base64StreamTransformer.arrayBufferToBase64(buffer);
}

export default class BareTransport {
  #proxyHttp;
  #wsUrl;
  #ready = false;

  constructor({ proxyHttp = '/proxy-http/', bare = '/bare/', wsProxy = '/proxy-ws/' } = {}) {
    // Resolve absolute paths safely from relative configurations
    this.#proxyHttp = new URL(proxyHttp, self.location.href).toString();
    const wsBase = new URL(wsProxy, self.location.href);
    wsBase.protocol = wsBase.protocol === 'https:' ? 'wss:' : 'ws:';
    this.#wsUrl = wsBase.toString();
  }

  get ready() {
    return this.#ready;
  }

  async init() {
    this.#ready = true;
  }

  /**
   * Dispatches a proxied HTTP request over the network.
   * @param {URL|string} url Target URL destination.
   * @param {string} method HTTP Method (GET, POST, etc.)
   * @param {ReadableStream|Blob|ArrayBuffer|string|null} body Request payload.
   * @param {Record<string, string>} headers Outbound headers.
   * @param {AbortSignal} [signal] Optional abort tracking instance.
   */
  async request(url, method, body, headers, signal) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const b64Body = await serializeBody(body);

    const response = await fetch(this.#proxyHttp, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        url: url.toString(),
        method: method.toUpperCase(),
        headers,
        body: b64Body,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Transport Gateway Failure: Remote returned status code ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Remote Proxy Execution Error: ${data.error}`);
    }

    return {
      status: data.status ?? 200,
      statusText: data.statusText ?? 'OK',
      headers: data.headers ?? {},
      body: data.body ? Base64StreamTransformer.base64ToArrayBuffer(data.body) : null,
      finalURL: data.finalURL || url.toString(),
    };
  }

  /**
   * Establishes an encapsulated full-duplex WebSocket tunnel through the proxy framework.
   */
  connect(url, protocols, requestHeaders, onOpen, onMessage, onClose, onError) {
    const ws = new WebSocket(this.#wsUrl);
    ws.binaryType = 'arraybuffer';
    let isHandshakeComplete = false;

    // Hard connection timeout safeguard (Stops sockets from hanging forever if backend stalls)
    const connectionTimeoutTracker = setTimeout(() => {
      if (!isHandshakeComplete) {
        ws.close(4008, 'Proxy Connection Timeout');
        onError(new Error('WebSocket tunnel handshake timed out after 10000ms'));
      }
    }, 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'connect',
        remote: url.toString(),
        protocols: Array.isArray(protocols) ? protocols : (protocols ? [protocols] : []),
        headers: requestHeaders || {},
        forwardHeaders: ['accept-encoding', 'accept-language'],
      }));
    };

    ws.onmessage = (event) => {
      // Protocol handshake processing phase
      if (!isHandshakeComplete) {
        if (typeof event.data !== 'string') {
          // Unexpected protocol frame anomaly detected
          ws.close(4003, 'Protocol Violation');
          onError(new Error('Protocol Violation: Expected JSON protocol string message initialization vector.'));
          return;
        }
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'open') {
            isHandshakeComplete = true;
            clearTimeout(connectionTimeoutTracker);
            // Hand over protocol execution variables downstream safely
            const activeProtocol = payload.protocol || (Array.isArray(protocols) ? protocols[0] : protocols) || '';
            onOpen(activeProtocol);
            return;
          }
          if (payload.type === 'error') {
            throw new Error(payload.message || 'Remote tunnel creation refused by target backend service.');
          }
        } catch (err) {
          clearTimeout(connectionTimeoutTracker);
          onError(err);
          ws.close(4000, 'Handshake Parsing Exception');
        }
        return;
      }

      // Handshake Complete: Stream direct binary payloads safely down the pipe
      onMessage(event.data);
    };

    ws.onclose = (event) => {
      clearTimeout(connectionTimeoutTracker);
      onClose(event.code, event.reason);
    };

    ws.onerror = (err) => {
      clearTimeout(connectionTimeoutTracker);
      onError(err || new Error('WebSocket baseline physical layer network exception.'));
    };

    // Return strict interface controls for the application layer
    return [
      (binaryPayload) => {
        if (ws.readyState !== WebSocket.OPEN) {
          throw new Error(`Data Write Panic: WebSocket state invalid (${ws.readyState}). Target stream dropped.`);
        }
        ws.send(binaryPayload);
      },
      (closeCode, closeReason) => {
        clearTimeout(connectionTimeoutTracker);
        ws.close(closeCode || 1000, closeReason || 'Client closed connection context.');
      },
    ];
  }
}
