export type ClientToServer =
  | { type: 'create-room'; roomCode: string }
  | { type: 'join-room'; roomCode: string }
  | { type: 'find-match'; elo: number }
  | { type: 'cancel-match' }
  | { type: 'offer'; sdp: unknown }
  | { type: 'answer'; sdp: unknown }
  | { type: 'ice-candidate'; candidate: unknown }
  | { type: 'leave' };

export type ServerToClient =
  | { type: 'room-created'; roomCode: string }
  | { type: 'peer-joined'; isHost: boolean }
  | { type: 'match-found'; roomCode: string; isHost: boolean }
  | { type: 'offer'; sdp: unknown }
  | { type: 'answer'; sdp: unknown }
  | { type: 'ice-candidate'; candidate: unknown }
  | { type: 'peer-disconnected' }
  | { type: 'error'; message: string };
