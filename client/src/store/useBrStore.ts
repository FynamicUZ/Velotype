import { create } from 'zustand';

const SIGNAL_URL =
  (import.meta.env.VITE_SIGNAL_URL as string | undefined) ?? 'ws://localhost:3001';

export interface BrPlayer {
  id: string;
  name: string;
}

export type BrStatus = 'idle' | 'connecting' | 'waiting' | 'in-game' | 'results';

export type BrInboundMsg =
  | { type: 'br-relay'; fromId: string; payload: unknown }
  | { type: 'br-eliminated'; playerId: string }
  | { type: 'br-finished'; winnerId: string; winnerName: string }
  | { type: 'br-player-joined'; player: BrPlayer }
  | { type: 'br-player-left'; playerId: string };

interface BrStoreState {
  status: BrStatus;
  roomCode: string | null;
  myId: string | null;
  isHost: boolean;
  players: BrPlayer[];
  gameSeed: number | null;
  gameTotalWords: number;
  winner: { id: string; name: string } | null;
  errorMsg: string | null;

  createRoom: (myName: string, maxPlayers?: number) => Promise<void>;
  joinRoom: (code: string, myName: string) => Promise<void>;
  startGame: () => void;
  sendRelay: (payload: unknown) => void;
  sendEliminated: () => void;
  onBrMessage: (cb: (msg: BrInboundMsg) => void) => () => void;
  cleanup: () => void;
}

export const useBrStore = create<BrStoreState>((set, get) => {
  let ws: WebSocket | null = null;
  let myNameCache = '';
  const subscribers = new Set<(msg: BrInboundMsg) => void>();

  function wsSend(msg: unknown): void {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function notify(msg: BrInboundMsg): void {
    subscribers.forEach((cb) => cb(msg));
  }

  function handleMsg(raw: unknown): void {
    const msg = raw as Record<string, unknown>;
    switch (msg.type) {
      case 'br-created':
        set({
          status: 'waiting',
          isHost: true,
          roomCode: msg.roomCode as string,
          myId: msg.myId as string,
          players: [{ id: msg.myId as string, name: myNameCache }],
          errorMsg: null,
        });
        break;
      case 'br-joined':
        set({
          status: 'waiting',
          isHost: false,
          roomCode: msg.roomCode as string,
          myId: msg.myId as string,
          players: msg.players as BrPlayer[],
          errorMsg: null,
        });
        break;
      case 'br-player-joined': {
        const player = msg.player as BrPlayer;
        set((s) => ({ players: [...s.players, player] }));
        notify({ type: 'br-player-joined', player });
        break;
      }
      case 'br-player-left': {
        const playerId = msg.playerId as string;
        set((s) => ({ players: s.players.filter((p) => p.id !== playerId) }));
        notify({ type: 'br-player-left', playerId });
        break;
      }
      case 'br-started':
        set({
          status: 'in-game',
          gameSeed: msg.seed as number,
          gameTotalWords: msg.totalWords as number,
        });
        break;
      case 'br-relay':
        notify({ type: 'br-relay', fromId: msg.fromId as string, payload: msg.payload });
        break;
      case 'br-eliminated':
        notify({ type: 'br-eliminated', playerId: msg.playerId as string });
        break;
      case 'br-finished': {
        const winner = { id: msg.winnerId as string, name: msg.winnerName as string };
        set({ status: 'results', winner });
        notify({ type: 'br-finished', winnerId: winner.id, winnerName: winner.name });
        break;
      }
      case 'br-error':
        set({ errorMsg: msg.message as string });
        break;
    }
  }

  function connectWs(): Promise<void> {
    return new Promise((resolve, reject) => {
      ws = new WebSocket(SIGNAL_URL);
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('WebSocket connection failed'));
      ws.onmessage = (e) => {
        try { handleMsg(JSON.parse(e.data as string)); } catch {}
      };
      ws.onclose = () => {
        if (get().status !== 'idle') {
          set({ status: 'idle', errorMsg: 'Connection closed' });
        }
      };
    });
  }

  return {
    status: 'idle',
    roomCode: null,
    myId: null,
    isHost: false,
    players: [],
    gameSeed: null,
    gameTotalWords: 100,
    winner: null,
    errorMsg: null,

    createRoom: async (myName, maxPlayers = 4) => {
      myNameCache = myName;
      set({ status: 'connecting', errorMsg: null });
      try {
        await connectWs();
        wsSend({ type: 'br-create', name: myName, maxPlayers });
      } catch {
        set({ status: 'idle', errorMsg: 'Failed to connect to server' });
      }
    },

    joinRoom: async (code, myName) => {
      myNameCache = myName;
      set({ status: 'connecting', errorMsg: null });
      try {
        await connectWs();
        wsSend({ type: 'br-join', roomCode: code.toUpperCase(), name: myName });
      } catch {
        set({ status: 'idle', errorMsg: 'Failed to connect to server' });
      }
    },

    startGame: () => wsSend({ type: 'br-start' }),
    sendRelay: (payload) => wsSend({ type: 'br-relay', payload }),
    sendEliminated: () => wsSend({ type: 'br-eliminated' }),

    onBrMessage: (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },

    cleanup: () => {
      try { wsSend({ type: 'br-leave' }); ws?.close(); } catch {}
      ws = null;
      myNameCache = '';
      subscribers.clear();
      set({
        status: 'idle',
        roomCode: null,
        myId: null,
        isHost: false,
        players: [],
        gameSeed: null,
        gameTotalWords: 100,
        winner: null,
        errorMsg: null,
      });
    },
  };
});
