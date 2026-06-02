import { create } from 'zustand';
import { customAlphabet } from 'nanoid';
import { SignalingClient } from '@/lib/webrtc/SignalingClient';
import { PeerConnectionManager } from '@/lib/webrtc/PeerConnection';
import { GameChannel } from '@/lib/webrtc/GameChannel';
import type { DCMessage, PeerInfo, ServerToClient } from '@/lib/webrtc/types';

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const SIGNAL_URL =
  (import.meta.env.VITE_SIGNAL_URL as string | undefined) ?? 'ws://localhost:3001';

export type MpStatus =
  | 'idle'
  | 'connecting'
  | 'matchmaking'
  | 'waiting-peer'
  | 'handshaking'
  | 'lobby'
  | 'in-game'
  | 'finished'
  | 'error'
  | 'closed';

export type MpMode = 'ranked' | 'friend';

interface MpStoreState {
  status: MpStatus;
  mode: MpMode | null;
  errorMsg: string | null;
  roomCode: string | null;
  isHost: boolean;
  peerInfo: PeerInfo | null;
  channel: GameChannel | null;
  signaling: SignalingClient | null;
  peer: PeerConnectionManager | null;

  setStatus: (s: MpStatus) => void;
  setError: (m: string) => void;

  startFriendCreate: (myInfo: PeerInfo) => Promise<void>;
  startFriendJoin: (code: string, myInfo: PeerInfo) => Promise<void>;
  startMatchmaking: (myInfo: PeerInfo) => Promise<void>;
  cancelMatchmaking: () => void;

  send: (msg: DCMessage) => void;
  onMessage: (l: (m: DCMessage) => void) => () => void;

  goInGame: () => void;
  goFinished: () => void;
  cleanup: () => void;
}

export const useMpStore = create<MpStoreState>((set, get) => {
  let myInfoCache: PeerInfo | null = null;
  let helloSent = false;

  function bindServerMessages() {
    const sig = get().signaling;
    if (!sig) return;
    sig.onMessage((msg: ServerToClient) => {
      void handleServerMsg(msg);
    });
    sig.onClose(() => {
      const s = get().status;
      if (s !== 'finished' && s !== 'closed') {
        set({ status: 'closed', errorMsg: 'Disconnected from signaling server' });
      }
    });
    sig.onError(() => {
      set({ status: 'error', errorMsg: 'Signaling connection error' });
    });
  }

  async function handleServerMsg(msg: ServerToClient) {
    switch (msg.type) {
      case 'room-created':
        set({ roomCode: msg.roomCode, status: 'waiting-peer' });
        break;
      case 'peer-joined':
        set({ isHost: msg.isHost, status: 'handshaking' });
        startWebRTC();
        break;
      case 'match-found':
        set({ roomCode: msg.roomCode, isHost: msg.isHost, status: 'handshaking' });
        startWebRTC();
        break;
      case 'offer':
        await get().peer?.handleOffer(msg.sdp);
        break;
      case 'answer':
        await get().peer?.handleAnswer(msg.sdp);
        break;
      case 'ice-candidate':
        await get().peer?.addIceCandidate(msg.candidate);
        break;
      case 'peer-disconnected':
        set({ status: 'closed', errorMsg: 'Opponent disconnected' });
        break;
      case 'error':
        set({ status: 'error', errorMsg: msg.message });
        break;
    }
  }

  function startWebRTC() {
    const sig = get().signaling;
    if (!sig) return;
    const isHost = get().isHost;

    const peer = new PeerConnectionManager({
      signaling: sig,
      isHost,
      onChannelOpen: (dc) => {
        const channel = new GameChannel(dc);
        channel.onMessage((m) => handleDcMessage(m));
        set({ channel, status: 'lobby' });
        if (myInfoCache && !helloSent) {
          channel.send({ type: 'hello', info: myInfoCache });
          helloSent = true;
        }
      },
    });
    set({ peer });

    if (isHost) {
      void peer.initiateOffer();
    }
  }

  function handleDcMessage(m: DCMessage) {
    if (m.type === 'hello') {
      set({ peerInfo: m.info });
      return;
    }
    // Other DC messages are dispatched to subscribers via onMessage callback
    extDcListeners.forEach((l) => l(m));
  }

  const extDcListeners = new Set<(m: DCMessage) => void>();

  async function ensureSignalingOpen(): Promise<SignalingClient> {
    let sig = get().signaling;
    if (sig) return sig;
    sig = new SignalingClient(SIGNAL_URL);
    set({ signaling: sig, status: 'connecting' });
    bindServerMessages();
    await sig.connect();
    return sig;
  }

  return {
    status: 'idle',
    mode: null,
    errorMsg: null,
    roomCode: null,
    isHost: false,
    peerInfo: null,
    channel: null,
    signaling: null,
    peer: null,

    setStatus: (s) => set({ status: s }),
    setError: (m) => set({ status: 'error', errorMsg: m }),

    startFriendCreate: async (myInfo) => {
      myInfoCache = myInfo;
      helloSent = false;
      set({ mode: 'friend', errorMsg: null, peerInfo: null, isHost: true });
      const sig = await ensureSignalingOpen();
      const code = makeCode();
      sig.send({ type: 'create-room', roomCode: code });
    },

    startFriendJoin: async (code, myInfo) => {
      myInfoCache = myInfo;
      helloSent = false;
      set({ mode: 'friend', errorMsg: null, peerInfo: null, isHost: false, roomCode: code });
      const sig = await ensureSignalingOpen();
      sig.send({ type: 'join-room', roomCode: code });
    },

    startMatchmaking: async (myInfo) => {
      myInfoCache = myInfo;
      helloSent = false;
      set({ mode: 'ranked', errorMsg: null, peerInfo: null, status: 'matchmaking' });
      const sig = await ensureSignalingOpen();
      sig.send({ type: 'find-match', elo: myInfo.elo });
    },

    cancelMatchmaking: () => {
      const sig = get().signaling;
      sig?.send({ type: 'cancel-match' });
      get().cleanup();
    },

    send: (msg) => get().channel?.send(msg),

    onMessage: (l) => {
      extDcListeners.add(l);
      return () => extDcListeners.delete(l);
    },

    goInGame: () => set({ status: 'in-game' }),
    goFinished: () => set({ status: 'finished' }),

    cleanup: () => {
      try {
        get().channel?.close();
        get().peer?.close();
        get().signaling?.close();
      } catch {}
      myInfoCache = null;
      helloSent = false;
      extDcListeners.clear();
      set({
        status: 'idle',
        mode: null,
        errorMsg: null,
        roomCode: null,
        isHost: false,
        peerInfo: null,
        channel: null,
        signaling: null,
        peer: null,
      });
    },
  };
});
