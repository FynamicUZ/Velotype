import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { nanoid } from 'nanoid';
import { RoomManager } from './roomManager.js';
import { BRRoomManager, type BRRoom } from './brRoomManager.js';
import { Matchmaker } from './matchmaker.js';
import type { ClientToServer, ServerToClient } from './types.js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const RATE_LIMIT_MSGS_PER_SEC = 50;

// Word pool organized by tier (difficulty increases each 3 rounds)
const WORD_TIERS = [
  ['cat', 'dog', 'fire', 'mage', 'wand', 'cast', 'bolt', 'rune', 'dart', 'wave', 'hex', 'orb'],
  ['dragon', 'battle', 'arcane', 'shield', 'portal', 'specter', 'frozen', 'hunter', 'typing', 'wizard'],
  ['sorcerer', 'firestorm', 'darkness', 'mystical', 'crystals', 'wanderer', 'midnight', 'silently'],
  ['necromancer', 'spellcaster', 'thunderbolt', 'catastrophe', 'annihilate', 'obliterate', 'devastating'],
];

export interface SignalingServer {
  wss: WebSocketServer;
  http: http.Server;
  close: () => Promise<void>;
}

export function createSignalingServer(port: number): SignalingServer {
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/healthz' || req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({
    server: httpServer,
    verifyClient: ({ origin }, done) => {
      if (ALLOWED_ORIGINS.length === 0) return done(true);
      if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
        return done(false, 403, 'Origin not allowed');
      }
      done(true);
    },
  });

  const rooms = new RoomManager();
  const brRooms = new BRRoomManager();
  const matchmaker = new Matchmaker();
  const cleanupInterval = setInterval(() => { rooms.cleanup(); brRooms.cleanup(); }, 60_000);
  const rateState = new WeakMap<WebSocket, { count: number; windowStart: number }>();

  function send(socket: WebSocket, msg: ServerToClient): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }

  function relay(from: WebSocket, msg: ServerToClient): void {
    const peer = rooms.peerOf(from);
    if (peer) send(peer, msg);
  }

  function handleMatch(): void {
    const pair = matchmaker.tryMatch();
    if (!pair) return;
    const [hostSock, guestSock] = pair;
    const code = nanoid(6).toUpperCase();
    rooms.create(code, hostSock);
    rooms.join(code, guestSock);
    send(hostSock, { type: 'match-found', roomCode: code, isHost: true });
    send(guestSock, { type: 'match-found', roomCode: code, isHost: false });
  }

  function isRateLimited(socket: WebSocket): boolean {
    const now = Date.now();
    const state = rateState.get(socket) ?? { count: 0, windowStart: now };
    if (now - state.windowStart > 1000) {
      state.count = 0;
      state.windowStart = now;
    }
    state.count += 1;
    rateState.set(socket, state);
    return state.count > RATE_LIMIT_MSGS_PER_SEC;
  }

  // ── Battle Royale round logic ──────────────────────────────────────────────

  function pickWord(room: BRRoom): string {
    const roundNum = (room.currentRound?.roundNum ?? 0) + 1;
    const tierIdx = Math.min(Math.floor((roundNum - 1) / 3), WORD_TIERS.length - 1);
    const tier = WORD_TIERS[tierIdx]!;
    const available = tier.filter((w) => !room.usedWords.has(w));
    const pool = available.length > 0 ? available : tier;
    const word = pool[Math.floor(Math.random() * pool.length)]!;
    room.usedWords.add(word);
    return word;
  }

  function startBRRound(room: BRRoom): void {
    if (room.state === 'finished') return;
    const word = pickWord(room);
    const timeoutMs = Math.max(6000, word.length * 1100);
    const roundNum = (room.currentRound?.roundNum ?? 0) + 1;

    const timer = setTimeout(() => endBRRound(room), timeoutMs);
    room.currentRound = { word, timeoutMs, roundNum, completions: new Map(), startedAt: Date.now(), timer };
    room.state = 'round-active';

    brRooms.broadcast(room, { type: 'br-round-start', roundNum, word, timeoutMs });
  }

  function endBRRound(room: BRRoom): void {
    if (room.state !== 'round-active' || !room.currentRound) return;

    if (room.currentRound.timer) {
      clearTimeout(room.currentRound.timer);
      room.currentRound.timer = null;
    }
    room.state = 'round-end';

    const alive = brRooms.alivePlayers(room);
    const completions = room.currentRound.completions;

    // Players who didn't complete the word in time are eliminated
    const failed = alive.filter((p) => !completions.has(p.id));
    const eliminated: { id: string; name: string }[] = [];

    for (const p of failed) {
      brRooms.eliminatePlayer(p.id, room);
      eliminated.push({ id: p.id, name: p.name });
    }

    const survivors = brRooms.alivePlayers(room);
    brRooms.broadcast(room, { type: 'br-round-end', eliminated, survivorCount: survivors.length });

    if (survivors.length === 1) {
      setTimeout(() => {
        room.state = 'finished';
        const w = survivors[0]!;
        brRooms.broadcast(room, { type: 'br-finished', winnerId: w.id, winnerName: w.name });
      }, 2500);
    } else if (survivors.length === 0) {
      // All failed the same round — nobody wins (edge case)
      room.state = 'finished';
    } else {
      // Continue — next round after short pause
      setTimeout(() => {
        if (room.state === 'round-end') startBRRound(room);
      }, 2500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  wss.on('connection', (socket) => {
    socket.on('message', (raw) => {
      if (isRateLimited(socket)) {
        send(socket, { type: 'error', message: 'Rate limit exceeded' });
        socket.close(1008, 'rate limit');
        return;
      }
      let msg: ClientToServer;
      try {
        msg = JSON.parse(raw.toString()) as ClientToServer;
      } catch {
        send(socket, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      switch (msg.type) {
        // ── 1v1 / ranked ───────────────────────────────────────────────────
        case 'create-room': {
          const room = rooms.create(msg.roomCode.toUpperCase(), socket);
          if (!room) {
            send(socket, { type: 'error', message: 'Room already exists' });
            return;
          }
          send(socket, { type: 'room-created', roomCode: room.code });
          break;
        }
        case 'join-room': {
          const room = rooms.join(msg.roomCode.toUpperCase(), socket);
          if (!room) {
            send(socket, { type: 'error', message: 'Room not found or full' });
            return;
          }
          send(room.host, { type: 'peer-joined', isHost: true });
          send(socket, { type: 'peer-joined', isHost: false });
          break;
        }
        case 'find-match':
          matchmaker.enqueue(socket, msg.elo);
          handleMatch();
          break;
        case 'cancel-match':
          matchmaker.dequeue(socket);
          break;
        case 'offer':
          relay(socket, { type: 'offer', sdp: msg.sdp });
          break;
        case 'answer':
          relay(socket, { type: 'answer', sdp: msg.sdp });
          break;
        case 'ice-candidate':
          relay(socket, { type: 'ice-candidate', candidate: msg.candidate });
          break;
        case 'leave': {
          relay(socket, { type: 'peer-disconnected' });
          const room = rooms.getByPeer(socket);
          if (room) rooms.remove(room.code);
          break;
        }

        // ── Battle Royale ──────────────────────────────────────────────────
        case 'br-create': {
          const { room, playerId } = brRooms.create(socket, msg.name, msg.maxPlayers);
          send(socket, { type: 'br-created', roomCode: room.code, myId: playerId });
          break;
        }
        case 'br-join': {
          const result = brRooms.join(msg.roomCode.toUpperCase(), socket, msg.name);
          if (!result) {
            send(socket, { type: 'br-error', message: 'Room not found, full, or already started' });
            return;
          }
          const { room, playerId } = result;
          const players = Array.from(room.players.values()).map((p) => ({ id: p.id, name: p.name }));
          send(socket, { type: 'br-joined', roomCode: room.code, myId: playerId, players });
          brRooms.broadcast(room, { type: 'br-player-joined', player: { id: playerId, name: msg.name } }, playerId);
          break;
        }
        case 'br-start': {
          const brRef = brRooms.getBySocket(socket);
          if (!brRef) return;
          const { room: brRoom, player: brPlayer } = brRef;
          if (brRoom.hostId !== brPlayer.id) return;
          if (brRoom.players.size < 2) {
            send(socket, { type: 'br-error', message: 'Need at least 2 players to start' });
            return;
          }
          startBRRound(brRoom);
          break;
        }
        case 'br-word-done': {
          const brRef = brRooms.getBySocket(socket);
          if (!brRef) return;
          const { room: brRoom, player: brPlayer } = brRef;
          if (brRoom.state !== 'round-active' || !brRoom.currentRound) return;
          if (!brPlayer.alive) return;

          const elapsed = Date.now() - brRoom.currentRound.startedAt;
          brRoom.currentRound.completions.set(brPlayer.id, elapsed);

          // Notify everyone that this player finished
          brRooms.broadcast(brRoom, { type: 'br-player-done', playerId: brPlayer.id });

          // If all alive players have completed, end the round early
          const alive = brRooms.alivePlayers(brRoom);
          const allDone = alive.every((p) => brRoom.currentRound!.completions.has(p.id));
          if (allDone) endBRRound(brRoom);
          break;
        }
        case 'br-leave': {
          const brLeaveResult = brRooms.removePlayer(socket);
          if (brLeaveResult && brLeaveResult.room.players.size > 0) {
            brRooms.broadcast(brLeaveResult.room, { type: 'br-player-left', playerId: brLeaveResult.player.id });
          }
          break;
        }
      }
    });

    socket.on('close', () => {
      matchmaker.dequeue(socket);
      const room = rooms.getByPeer(socket);
      if (room) {
        relay(socket, { type: 'peer-disconnected' });
        rooms.remove(room.code);
      }
      const brResult = brRooms.removePlayer(socket);
      if (brResult && brResult.room.players.size > 0) {
        const { room: brRoom, player } = brResult;
        brRooms.broadcast(brRoom, { type: 'br-player-left', playerId: player.id });
        // If game is active and only 1 alive remains after disconnect, declare winner
        if (brRoom.state === 'round-active' || brRoom.state === 'round-end') {
          const survivors = brRooms.alivePlayers(brRoom);
          if (survivors.length === 1) {
            if (brRoom.currentRound?.timer) clearTimeout(brRoom.currentRound.timer);
            brRoom.state = 'finished';
            const w = survivors[0]!;
            brRooms.broadcast(brRoom, { type: 'br-finished', winnerId: w.id, winnerName: w.name });
          }
        }
      }
    });

    socket.on('error', () => {});
  });

  httpServer.listen(port, '0.0.0.0', () => {
    const originNote = ALLOWED_ORIGINS.length
      ? `origins=[${ALLOWED_ORIGINS.join(', ')}]`
      : 'origins=* (set ALLOWED_ORIGINS to restrict)';
    console.log(`[velotype] signaling server listening on port ${port} — ${originNote}`);
  });

  return {
    wss,
    http: httpServer,
    close: () =>
      new Promise((resolve) => {
        clearInterval(cleanupInterval);
        wss.clients.forEach((c) => c.close(1001, 'server shutdown'));
        wss.close(() => httpServer.close(() => resolve()));
      }),
  };
}
