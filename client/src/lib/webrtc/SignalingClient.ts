import type { ClientToServer, ServerToClient } from './types';

type Listener = (msg: ServerToClient) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private openListeners = new Set<() => void>();
  private closeListeners = new Set<() => void>();
  private errorListeners = new Set<() => void>();

  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }
      this.ws.onopen = () => {
        this.openListeners.forEach((l) => l());
        resolve();
      };
      this.ws.onclose = () => this.closeListeners.forEach((l) => l());
      this.ws.onerror = () => {
        this.errorListeners.forEach((l) => l());
        reject(new Error('signaling error'));
      };
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as ServerToClient;
          this.listeners.forEach((l) => l(msg));
        } catch {}
      };
    });
  }

  send(msg: ClientToServer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  onClose(l: () => void): () => void {
    this.closeListeners.add(l);
    return () => this.closeListeners.delete(l);
  }

  onError(l: () => void): () => void {
    this.errorListeners.add(l);
    return () => this.errorListeners.delete(l);
  }

  close(): void {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      try {
        this.send({ type: 'leave' });
      } catch {}
      this.ws.close();
    }
    this.ws = null;
  }
}
