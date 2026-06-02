import type { DCMessage } from './types';

export class GameChannel {
  private listeners = new Set<(m: DCMessage) => void>();

  private dc: RTCDataChannel;

  constructor(dc: RTCDataChannel) {
    this.dc = dc;
    dc.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data)) as DCMessage;
        this.listeners.forEach((l) => l(m));
      } catch {}
    };
  }

  send(msg: DCMessage): void {
    if (this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(msg));
    }
  }

  onMessage(l: (m: DCMessage) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  close(): void {
    try {
      this.dc.close();
    } catch {}
    this.listeners.clear();
  }
}
