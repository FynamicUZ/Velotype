import type { WeaponId } from '@/lib/game/secondaryWeapons';

export type ClientToServer =
  | { type: 'create-room'; roomCode: string }
  | { type: 'join-room'; roomCode: string }
  | { type: 'find-match'; elo: number }
  | { type: 'cancel-match' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'leave' };

export type ServerToClient =
  | { type: 'room-created'; roomCode: string }
  | { type: 'peer-joined'; isHost: boolean }
  | { type: 'match-found'; roomCode: string; isHost: boolean }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'peer-disconnected' }
  | { type: 'error'; message: string };

export interface PeerInfo {
  name: string;
  level: number;
  elo: number;
  cosmetics: { wand: string; hat: string; particles: string };
  equippedWeapon: WeaponId | null;
}

export type DCMessage =
  | { type: 'hello'; info: PeerInfo }
  | { type: 'ready' }
  | { type: 'start'; seed: number; totalWords: number }
  // Host-owned room settings, pushed so the guest sees the real word limit.
  | { type: 'settings'; totalWords: number }
  | { type: 'damage'; amount: number; tier: number; streak: number }
  | { type: 'weapon'; weaponId: WeaponId }
  // Authoritative HP broadcast: each player owns their own HP, so the opponent
  // bar is synced from this rather than inferred from damage (shields, timing
  // and packet order would otherwise let the two sides drift apart).
  | { type: 'hp'; hp: number; maxHp: number }
  | { type: 'finished'; reason: 'hp-zero' | 'forfeit' | 'words-done' }
  | { type: 'rematch' };
