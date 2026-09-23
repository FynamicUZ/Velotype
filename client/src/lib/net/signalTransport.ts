/**
 * Connects to the signaling server, over a WebSocket when the network allows
 * one and over plain HTTP requests when it does not.
 *
 * Some networks pass ordinary HTTPS but silently drop WebSocket upgrades — ad
 * blockers, security suites and national filtering of workers.dev all do it —
 * and the browser reports that as an unexplained "connection failed". Rather
 * than leaving those players stuck on "Disconnected from signaling server",
 * the client retries the same lobby over polling, which works anywhere HTTPS
 * does. Matches themselves are peer-to-peer either way, so only the handshake
 * takes the slower path.
 */

export interface SignalTransport {
  send(data: string): void;
  close(): void;
  onMessage(cb: (data: string) => void): void;
  onClose(cb: () => void): void;
  /** Which carrier ended up being used — surfaced for diagnostics. */
  readonly kind: 'websocket' | 'polling';
}

/** How long to wait for the WebSocket before falling back. */
const WS_CONNECT_TIMEOUT_MS = 5000;

function toHttp(url: string): string {
  return url.replace(/^ws/, 'http').replace(/\/+$/, '');
}

class WebSocketTransport implements SignalTransport {
  readonly kind = 'websocket' as const;
  private messageCbs = new Set<(data: string) => void>();
  private closeCbs = new Set<() => void>();

  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.onmessage = (e) => {
      const data = String(e.data);
      this.messageCbs.forEach((cb) => cb(data));
    };
    ws.onclose = () => this.closeCbs.forEach((cb) => cb());
  }

  send(data: string): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
  }

  close(): void {
    if (this.ws.readyState !== WebSocket.CLOSED) this.ws.close();
  }

  onMessage(cb: (data: string) => void): void { this.messageCbs.add(cb); }
  onClose(cb: () => void): void { this.closeCbs.add(cb); }
}

class PollingTransport implements SignalTransport {
  readonly kind = 'polling' as const;
  private messageCbs = new Set<(data: string) => void>();
  private closeCbs = new Set<() => void>();
  private running = true;

  private base: string;
  private sessionId: string;

  constructor(base: string, sessionId: string) {
    this.base = base;
    this.sessionId = sessionId;
    void this.loop();
  }

  private async loop(): Promise<void> {
    let failures = 0;
    while (this.running) {
      try {
        // The server holds this open until it has something to say, so this is
        // a long poll rather than a busy loop.
        const res = await fetch(`${this.base}/poll/recv?s=${this.sessionId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`recv ${res.status}`);
        const body = (await res.json()) as { messages?: string[]; closed?: boolean };
        failures = 0;
        for (const m of body.messages ?? []) {
          this.messageCbs.forEach((cb) => cb(m));
        }
        if (body.closed) break;
      } catch {
        // A blip shouldn't kill the session, but a dead server should.
        if (++failures >= 5) break;
        await new Promise((r) => setTimeout(r, 400 * failures));
      }
    }
    if (this.running) this.fireClose();
  }

  private fireClose(): void {
    this.running = false;
    this.closeCbs.forEach((cb) => cb());
  }

  send(data: string): void {
    if (!this.running) return;
    void fetch(`${this.base}/poll/send?s=${this.sessionId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: data,
    }).catch(() => {});
  }

  close(): void {
    if (!this.running) return;
    this.running = false;
    void fetch(`${this.base}/poll/close?s=${this.sessionId}`, { method: 'POST' }).catch(() => {});
  }

  onMessage(cb: (data: string) => void): void { this.messageCbs.add(cb); }
  onClose(cb: () => void): void { this.closeCbs.add(cb); }
}

function tryWebSocket(url: string): Promise<WebSocket | null> {
  return new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* already gone */ }
      resolve(null);
    }, WS_CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ws);
    };
    ws.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    };
  });
}

/**
 * Opens the polling session, retrying a few times.
 *
 * On networks with no UDP path the browser's first attempt can die with
 * ERR_QUIC_PROTOCOL_ERROR, because Chromium reaches Cloudflare over HTTP/3
 * before it knows QUIC is unusable here. It demotes the broken QUIC session
 * after a failure, so a retry goes out over TCP and succeeds — but only if we
 * bother to retry.
 */
async function startPolling(url: string): Promise<PollingTransport> {
  const base = toHttp(url);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    try {
      const res = await fetch(`${base}/poll/connect`, { method: 'POST', cache: 'no-store' });
      if (!res.ok) throw new Error(`signaling unavailable (${res.status})`);
      const { sessionId } = (await res.json()) as { sessionId: string };
      return new PollingTransport(base, sessionId);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('signaling unavailable');
}

export async function connectSignaling(url: string): Promise<SignalTransport> {
  const ws = await tryWebSocket(url);
  if (ws) return new WebSocketTransport(ws);

  console.warn('[velotype] WebSocket blocked on this network — falling back to HTTP polling');
  return startPolling(url);
}
