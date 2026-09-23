/**
 * A WebSocket stand-in for players whose network blocks the upgrade.
 *
 * Some networks pass ordinary HTTPS but drop WebSocket upgrades (ad blockers,
 * security suites, national filtering of workers.dev). For those players the
 * client falls back to plain HTTP requests, and this class makes that look like
 * a socket to the rest of the lobby: the room, matchmaking and battle royale
 * code is identical either way, because all it needs is `send`, `readyState`
 * and a stable object identity to key its maps on.
 */
export class PollingSocket {
  /** 1 = OPEN, 3 = CLOSED — mirrors the WebSocket readyState constants. */
  readyState = 1;

  readonly id: string;
  private outbox: string[] = [];
  private waiting: ((messages: string[]) => void) | null = null;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;

  /** Last time the client polled; used to expire abandoned sessions. */
  lastSeen = Date.now();

  constructor(id: string) {
    this.id = id;
  }

  /** Called by the lobby exactly as it would call WebSocket.send. */
  send(data: string): void {
    if (this.readyState !== 1) return;
    this.outbox.push(data);
    this.flush();
  }

  close(): void {
    this.readyState = 3;
    this.flush();
  }

  /**
   * Hand the client whatever is queued. Waits up to `timeoutMs` for something
   * to arrive so an idle client is not hammering the server, but always returns
   * promptly once the lobby produces a message.
   */
  receive(timeoutMs: number): Promise<string[]> {
    this.lastSeen = Date.now();

    if (this.outbox.length > 0 || this.readyState === 3) {
      const messages = this.outbox;
      this.outbox = [];
      return Promise.resolve(messages);
    }

    return new Promise((resolve) => {
      this.waiting = resolve;
      this.waitTimer = setTimeout(() => {
        this.waiting = null;
        this.waitTimer = null;
        resolve([]);
      }, timeoutMs);
    });
  }

  private flush(): void {
    if (!this.waiting) return;
    const resolve = this.waiting;
    const messages = this.outbox;
    this.outbox = [];
    this.waiting = null;
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    resolve(messages);
  }
}
