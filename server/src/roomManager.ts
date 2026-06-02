import type { WebSocket } from 'ws';

export interface Room {
  code: string;
  host: WebSocket;
  guest: WebSocket | null;
  createdAt: number;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketRoom = new WeakMap<WebSocket, string>();

  create(code: string, host: WebSocket): Room | null {
    if (this.rooms.has(code)) return null;
    const room: Room = { code, host, guest: null, createdAt: Date.now() };
    this.rooms.set(code, room);
    this.socketRoom.set(host, code);
    return room;
  }

  join(code: string, guest: WebSocket): Room | null {
    const room = this.rooms.get(code);
    if (!room || room.guest) return null;
    room.guest = guest;
    this.socketRoom.set(guest, code);
    return room;
  }

  remove(code: string): void {
    this.rooms.delete(code);
  }

  getByPeer(socket: WebSocket): Room | undefined {
    const code = this.socketRoom.get(socket);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  peerOf(socket: WebSocket): WebSocket | null {
    const room = this.getByPeer(socket);
    if (!room) return null;
    if (room.host === socket) return room.guest;
    if (room.guest === socket) return room.host;
    return null;
  }

  cleanup(maxAgeMs = 10 * 60 * 1000): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > maxAgeMs) {
        this.rooms.delete(code);
      }
    }
  }
}
