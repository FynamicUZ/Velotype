import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { nanoid } from 'nanoid';
import { RoomManager } from './roomManager.js';
import { Matchmaker } from './matchmaker.js';
import type { ClientToServer, ServerToClient } from './types.js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const RATE_LIMIT_MSGS_PER_SEC = 50;

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
  const matchmaker = new Matchmaker();
  const cleanupInterval = setInterval(() => rooms.cleanup(), 60_000);
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
      }
    });

    socket.on('close', () => {
      matchmaker.dequeue(socket);
      const room = rooms.getByPeer(socket);
      if (room) {
        relay(socket, { type: 'peer-disconnected' });
        rooms.remove(room.code);
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
