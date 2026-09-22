import { DurableObject } from 'cloudflare:workers';
import { nanoid } from 'nanoid';
import { RoomManager } from '../../server/src/roomManager.js';
import { BRRoomManager, type BRRoom } from '../../server/src/brRoomManager.js';
import { Matchmaker } from '../../server/src/matchmaker.js';
import type { ClientToServer, ServerToClient } from '../../server/src/types.js';

const RATE_LIMIT_MSGS_PER_SEC = 50;

// Mirrors the tiers in ../server/src/signalingServer.ts — keep the two in sync
// for as long as both servers exist.
const WORD_TIERS = [
  ['cat', 'dog', 'fire', 'mage', 'wand', 'cast', 'bolt', 'rune', 'dart', 'wave', 'hex', 'orb'],
  ['dragon', 'battle', 'arcane', 'shield', 'portal', 'specter', 'frozen', 'hunter', 'typing', 'wizard'],
  ['sorcerer', 'firestorm', 'darkness', 'mystical', 'crystals', 'wanderer', 'midnight', 'silently'],
  ['necromancer', 'spellcaster', 'thunderbolt', 'catastrophe', 'annihilate', 'obliterate', 'devastating'],
];

/**
 * One global Durable Object holds every room, the matchmaking queue and all
 * battle royale state, exactly as the single Node process used to. Sockets are
 * accepted with accept() rather than the hibernation API on purpose: the
 * managers keep their state in memory, so the object must stay resident while
 * anyone is connected.
 */
export class Lobby extends DurableObject {
  private rooms = new RoomManager();
  private brRooms = new BRRoomManager();
  private matchmaker = new Matchmaker();
  private rateState = new Map<WebSocket, { count: number; windowStart: number }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  fetch(_request: Request): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.startCleanup();

    server.addEventListener('message', (event: MessageEvent) => {
      this.onMessage(server, event.data);
    });
    server.addEventListener('close', () => this.onDisconnect(server));
    server.addEventListener('error', () => this.onDisconnect(server));

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── plumbing ────────────────────────────────────────────────────────────

  private startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.rooms.cleanup();
      this.brRooms.cleanup();
    }, 60_000);
  }

  private send(socket: WebSocket, msg: ServerToClient): void {
    if (socket.readyState === 1) socket.send(JSON.stringify(msg));
  }

  private relay(from: WebSocket, msg: ServerToClient): void {
    const peer = this.rooms.peerOf(from);
    if (peer) this.send(peer, msg);
  }

  private handleMatch(): void {
    const pair = this.matchmaker.tryMatch();
    if (!pair) return;
    const [hostSock, guestSock] = pair;
    const code = nanoid(6).toUpperCase();
    this.rooms.create(code, hostSock);
    this.rooms.join(code, guestSock);
    this.send(hostSock, { type: 'match-found', roomCode: code, isHost: true });
    this.send(guestSock, { type: 'match-found', roomCode: code, isHost: false });
  }

  private isRateLimited(socket: WebSocket): boolean {
    const now = Date.now();
    const state = this.rateState.get(socket) ?? { count: 0, windowStart: now };
    if (now - state.windowStart > 1000) {
      state.count = 0;
      state.windowStart = now;
    }
    state.count += 1;
    this.rateState.set(socket, state);
    return state.count > RATE_LIMIT_MSGS_PER_SEC;
  }

  // ── battle royale rounds ────────────────────────────────────────────────

  private pickWord(room: BRRoom): string {
    const roundNum = (room.currentRound?.roundNum ?? 0) + 1;
    const tierIdx = Math.min(Math.floor((roundNum - 1) / 3), WORD_TIERS.length - 1);
    const tier = WORD_TIERS[tierIdx]!;
    const available = tier.filter((w) => !room.usedWords.has(w));
    const pool = available.length > 0 ? available : tier;
    const word = pool[Math.floor(Math.random() * pool.length)]!;
    room.usedWords.add(word);
    return word;
  }

  private startBRRound(room: BRRoom): void {
    if (room.state === 'finished') return;
    const word = this.pickWord(room);
    const timeoutMs = Math.max(6000, word.length * 1100);
    const roundNum = (room.currentRound?.roundNum ?? 0) + 1;

    const timer = setTimeout(() => this.endBRRound(room), timeoutMs);
    room.currentRound = { word, timeoutMs, roundNum, completions: new Map(), startedAt: Date.now(), timer };
    room.state = 'round-active';

    this.brRooms.broadcast(room, { type: 'br-round-start', roundNum, word, timeoutMs });
  }

  private endBRRound(room: BRRoom): void {
    if (room.state !== 'round-active' || !room.currentRound) return;

    if (room.currentRound.timer) {
      clearTimeout(room.currentRound.timer);
      room.currentRound.timer = null;
    }
    room.state = 'round-end';

    const alive = this.brRooms.alivePlayers(room);
    const completions = room.currentRound.completions;

    const failed = alive.filter((p) => !completions.has(p.id));
    const eliminated: { id: string; name: string }[] = [];

    for (const p of failed) {
      this.brRooms.eliminatePlayer(p.id, room);
      eliminated.push({ id: p.id, name: p.name });
    }

    const survivors = this.brRooms.alivePlayers(room);
    this.brRooms.broadcast(room, { type: 'br-round-end', eliminated, survivorCount: survivors.length });

    if (survivors.length === 1) {
      setTimeout(() => {
        room.state = 'finished';
        const w = survivors[0]!;
        this.brRooms.broadcast(room, { type: 'br-finished', winnerId: w.id, winnerName: w.name });
      }, 2500);
    } else if (survivors.length === 0) {
      room.state = 'finished';
    } else {
      setTimeout(() => {
        if (room.state === 'round-end') this.startBRRound(room);
      }, 2500);
    }
  }

  // ── message handling ────────────────────────────────────────────────────

  private onMessage(socket: WebSocket, raw: unknown): void {
    if (this.isRateLimited(socket)) {
      this.send(socket, { type: 'error', message: 'Rate limit exceeded' });
      socket.close(1008, 'rate limit');
      return;
    }

    let msg: ClientToServer;
    try {
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer);
      msg = JSON.parse(text) as ClientToServer;
    } catch {
      this.send(socket, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      // ── 1v1 / ranked ──────────────────────────────────────────────────────
      case 'create-room': {
        const room = this.rooms.create(msg.roomCode.toUpperCase(), socket);
        if (!room) {
          this.send(socket, { type: 'error', message: 'Room already exists' });
          return;
        }
        this.send(socket, { type: 'room-created', roomCode: room.code });
        break;
      }
      case 'join-room': {
        const room = this.rooms.join(msg.roomCode.toUpperCase(), socket);
        if (!room) {
          this.send(socket, { type: 'error', message: 'Room not found or full' });
          return;
        }
        this.send(room.host, { type: 'peer-joined', isHost: true });
        this.send(socket, { type: 'peer-joined', isHost: false });
        break;
      }
      case 'find-match':
        this.matchmaker.enqueue(socket, msg.elo);
        this.handleMatch();
        break;
      case 'cancel-match':
        this.matchmaker.dequeue(socket);
        break;
      case 'offer':
        this.relay(socket, { type: 'offer', sdp: msg.sdp });
        break;
      case 'answer':
        this.relay(socket, { type: 'answer', sdp: msg.sdp });
        break;
      case 'ice-candidate':
        this.relay(socket, { type: 'ice-candidate', candidate: msg.candidate });
        break;
      case 'leave': {
        this.relay(socket, { type: 'peer-disconnected' });
        const room = this.rooms.getByPeer(socket);
        if (room) this.rooms.remove(room.code);
        break;
      }

      // ── battle royale ─────────────────────────────────────────────────────
      case 'br-create': {
        const { room, playerId } = this.brRooms.create(socket, msg.name, msg.maxPlayers);
        this.send(socket, { type: 'br-created', roomCode: room.code, myId: playerId });
        break;
      }
      case 'br-join': {
        const result = this.brRooms.join(msg.roomCode.toUpperCase(), socket, msg.name);
        if (!result) {
          this.send(socket, { type: 'br-error', message: 'Room not found, full, or already started' });
          return;
        }
        const { room, playerId } = result;
        const players = Array.from(room.players.values()).map((p) => ({ id: p.id, name: p.name }));
        this.send(socket, { type: 'br-joined', roomCode: room.code, myId: playerId, players });
        this.brRooms.broadcast(room, { type: 'br-player-joined', player: { id: playerId, name: msg.name } }, playerId);
        break;
      }
      case 'br-start': {
        const brRef = this.brRooms.getBySocket(socket);
        if (!brRef) return;
        const { room: brRoom, player: brPlayer } = brRef;
        if (brRoom.hostId !== brPlayer.id) return;
        if (brRoom.players.size < 2) {
          this.send(socket, { type: 'br-error', message: 'Need at least 2 players to start' });
          return;
        }
        this.startBRRound(brRoom);
        break;
      }
      case 'br-word-done': {
        const brRef = this.brRooms.getBySocket(socket);
        if (!brRef) return;
        const { room: brRoom, player: brPlayer } = brRef;
        if (brRoom.state !== 'round-active' || !brRoom.currentRound) return;
        if (!brPlayer.alive) return;

        const elapsed = Date.now() - brRoom.currentRound.startedAt;
        brRoom.currentRound.completions.set(brPlayer.id, elapsed);

        this.brRooms.broadcast(brRoom, { type: 'br-player-done', playerId: brPlayer.id });

        const alive = this.brRooms.alivePlayers(brRoom);
        const allDone = alive.every((p) => brRoom.currentRound!.completions.has(p.id));
        if (allDone) this.endBRRound(brRoom);
        break;
      }
      case 'br-leave': {
        const brLeaveResult = this.brRooms.removePlayer(socket);
        if (brLeaveResult && brLeaveResult.room.players.size > 0) {
          this.brRooms.broadcast(brLeaveResult.room, { type: 'br-player-left', playerId: brLeaveResult.player.id });
        }
        break;
      }
    }
  }

  private onDisconnect(socket: WebSocket): void {
    this.rateState.delete(socket);
    this.matchmaker.dequeue(socket);

    const room = this.rooms.getByPeer(socket);
    if (room) {
      this.relay(socket, { type: 'peer-disconnected' });
      this.rooms.remove(room.code);
    }

    const brResult = this.brRooms.removePlayer(socket);
    if (brResult && brResult.room.players.size > 0) {
      const { room: brRoom, player } = brResult;
      this.brRooms.broadcast(brRoom, { type: 'br-player-left', playerId: player.id });
      if (brRoom.state === 'round-active' || brRoom.state === 'round-end') {
        const survivors = this.brRooms.alivePlayers(brRoom);
        if (survivors.length === 1) {
          if (brRoom.currentRound?.timer) clearTimeout(brRoom.currentRound.timer);
          brRoom.state = 'finished';
          const w = survivors[0]!;
          this.brRooms.broadcast(brRoom, { type: 'br-finished', winnerId: w.id, winnerName: w.name });
        }
      }
    }
  }
}
