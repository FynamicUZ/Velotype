import type { SignalingClient } from './SignalingClient';

const TURN_URL = import.meta.env.VITE_TURN_URL as string | undefined;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME as string | undefined;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  ...(TURN_URL && TURN_USERNAME && TURN_CREDENTIAL
    ? [{ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }]
    : []),
];

export interface PeerOptions {
  signaling: SignalingClient;
  isHost: boolean;
  onChannelOpen: (channel: RTCDataChannel) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export class PeerConnectionManager {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private remoteDescSet = false;
  private iceBuffer: RTCIceCandidateInit[] = [];

  private opts: PeerOptions;

  constructor(opts: PeerOptions) {
    this.opts = opts;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        opts.signaling.send({ type: 'ice-candidate', candidate: e.candidate.toJSON() });
      }
    };

    this.pc.onconnectionstatechange = () => {
      opts.onConnectionStateChange?.(this.pc.connectionState);
    };

    this.pc.ondatachannel = (e) => {
      this.attachChannel(e.channel);
    };

    if (opts.isHost) {
      const dc = this.pc.createDataChannel('game', { ordered: true });
      this.attachChannel(dc);
    }
  }

  private attachChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => this.opts.onChannelOpen(dc);
  }

  async initiateOffer(): Promise<void> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.opts.signaling.send({
      type: 'offer',
      sdp: { type: offer.type, sdp: offer.sdp ?? '' },
    });
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(sdp);
    this.remoteDescSet = true;
    await this.flushIceBuffer();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.opts.signaling.send({
      type: 'answer',
      sdp: { type: answer.type, sdp: answer.sdp ?? '' },
    });
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(sdp);
    this.remoteDescSet = true;
    await this.flushIceBuffer();
  }

  async addIceCandidate(c: RTCIceCandidateInit): Promise<void> {
    if (!this.remoteDescSet) {
      this.iceBuffer.push(c);
      return;
    }
    try {
      await this.pc.addIceCandidate(c);
    } catch {}
  }

  private async flushIceBuffer(): Promise<void> {
    for (const c of this.iceBuffer) {
      try {
        await this.pc.addIceCandidate(c);
      } catch {}
    }
    this.iceBuffer = [];
  }

  close(): void {
    try {
      this.dc?.close();
    } catch {}
    try {
      this.pc.close();
    } catch {}
    this.dc = null;
  }
}
