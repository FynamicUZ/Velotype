import { nanoid } from 'nanoid';
import type { WebSocket } from 'ws';

export interface BRPlayer {
  id: string;
  socket: WebSocket;
  name: string;
  alive: boolean;
}

export interface BRRoom {
  code: string;
  hostId: string;
  maxPlayers: number;
  players: Map<string, BRPlayer>;
  state: 'waiting' | 'in-game' | 'finished';
  createdAt: number;
}

export class BRRoomManager {
  private rooms = new Map<string, BRRoom>();
  private socketRef = new WeakMap<WebSocket, { roomCode: string; playerId: string }>();

  create(
    socket: WebSocket,
    name: string,
    maxPlayers: number,
  ): { room: BRRoom; playerId: string } {
    const code = nanoid(6).toUpperCase();
    const playerId = nanoid(8);
    const player: BRPlayer = { id: playerId, socket, name, alive: true };
    const room: BRRoom = {
      code,
      hostId: playerId,
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 8),
      players: new Map([[playerId, player]]),
      state: 'waiting',
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    this.socketRef.set(socket, { roomCode: code, playerId });
    return { room, playerId };
  }

  join(
    code: string,
    socket: WebSocket,
    name: string,
  ): { room: BRRoom; playerId: string } | null {
    const room = this.rooms.get(code);
    if (!room || room.state !== 'waiting') return null;
    if (room.players.size >= room.maxPlayers) return null;
    const playerId = nanoid(8);
    const player: BRPlayer = { id: playerId, socket, name, alive: true };
    room.players.set(playerId, player);
    this.socketRef.set(socket, { roomCode: code, playerId });
    return { room, playerId };
  }

  getBySocket(socket: WebSocket): { room: BRRoom; player: BRPlayer } | null {
    const ref = this.socketRef.get(socket);
    if (!ref) return null;
    const room = this.rooms.get(ref.roomCode);
    if (!room) return null;
    const player = room.players.get(ref.playerId);
    if (!player) return null;
    return { room, player };
  }

  send(socket: WebSocket, msg: unknown): void {
    if (socket.readyState === 1) socket.send(JSON.stringify(msg));
  }

  broadcast(room: BRRoom, msg: unknown, exceptId?: string): void {
    const str = JSON.stringify(msg);
    for (const [id, p] of room.players) {
      if (id === exceptId) continue;
      if (p.socket.readyState === 1) p.socket.send(str);
    }
  }

  removePlayer(socket: WebSocket): {
    room: BRRoom;
    player: BRPlayer;
    aliveCount: number;
    winner: BRPlayer | null;
  } | null {
    const result = this.getBySocket(socket);
    if (!result) return null;
    const { room, player } = result;

    player.alive = false;
    room.players.delete(player.id);

    if (room.players.size === 0) {
      this.rooms.delete(room.code);
      return { room, player, aliveCount: 0, winner: null };
    }

    if (room.hostId === player.id) {
      const [newHostId] = room.players.keys();
      if (newHostId) room.hostId = newHostId;
    }

    let aliveCount = 0;
    let lastAlive: BRPlayer | null = null;
    for (const p of room.players.values()) {
      if (p.alive) { aliveCount++; lastAlive = p; }
    }

    return { room, player, aliveCount, winner: aliveCount === 1 ? lastAlive : null };
  }

  eliminatePlayer(
    playerId: string,
    room: BRRoom,
  ): { aliveCount: number; winner: BRPlayer | null } {
    const player = room.players.get(playerId);
    if (player) player.alive = false;

    let aliveCount = 0;
    let lastAlive: BRPlayer | null = null;
    for (const p of room.players.values()) {
      if (p.alive) { aliveCount++; lastAlive = p; }
    }

    return { aliveCount, winner: aliveCount === 1 ? lastAlive : null };
  }

  cleanup(maxAgeMs = 10 * 60 * 1000): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > maxAgeMs) this.rooms.delete(code);
    }
  }
}
