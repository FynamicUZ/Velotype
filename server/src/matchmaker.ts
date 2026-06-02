import type { WebSocket } from 'ws';

interface QueuedPlayer {
  socket: WebSocket;
  elo: number;
  joinedAt: number;
}

export class Matchmaker {
  private queue: QueuedPlayer[] = [];

  enqueue(socket: WebSocket, elo: number): void {
    if (this.queue.find((p) => p.socket === socket)) return;
    this.queue.push({ socket, elo, joinedAt: Date.now() });
  }

  dequeue(socket: WebSocket): void {
    this.queue = this.queue.filter((p) => p.socket !== socket);
  }

  tryMatch(): [WebSocket, WebSocket] | null {
    if (this.queue.length < 2) return null;
    this.queue.sort((a, b) => a.elo - b.elo);
    const a = this.queue.shift()!;
    const b = this.queue.shift()!;
    return [a.socket, b.socket];
  }
}
