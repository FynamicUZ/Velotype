import { connectSignaling, type SignalTransport } from '@/lib/net/signalTransport';
import type { ClientToServer, ServerToClient } from './types';

type Listener = (msg: ServerToClient) => void;

export class SignalingClient {
  private transport: SignalTransport | null = null;
  private listeners = new Set<Listener>();
  private openListeners = new Set<() => void>();
  private closeListeners = new Set<() => void>();
  private errorListeners = new Set<() => void>();

  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  /** 'websocket' or 'polling' once connected — useful when diagnosing a player's network. */
  get kind(): string | null {
    return this.transport?.kind ?? null;
  }

  async connect(): Promise<void> {
    try {
      // Falls back to HTTP polling by itself on networks that block WebSockets.
      this.transport = await connectSignaling(this.url);
    } catch (e) {
      this.errorListeners.forEach((l) => l());
      throw e instanceof Error ? e : new Error('signaling error');
    }

    this.transport.onMessage((data) => {
      try {
        const msg = JSON.parse(data) as ServerToClient;
        this.listeners.forEach((l) => l(msg));
      } catch {}
    });
    this.transport.onClose(() => this.closeListeners.forEach((l) => l()));

    this.openListeners.forEach((l) => l());
  }

  send(msg: ClientToServer): void {
    this.transport?.send(JSON.stringify(msg));
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
    if (!this.transport) return;
    try {
      this.send({ type: 'leave' });
    } catch {}
    this.transport.close();
    this.transport = null;
  }
}
