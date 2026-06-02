export type ClientToServer =
  | { type: 'create-room'; roomCode: string }
  | { type: 'join-room'; roomCode: string }
  | { type: 'find-match'; elo: number }
  | { type: 'cancel-match' }
  | { type: 'offer'; sdp: unknown }
  | { type: 'answer'; sdp: unknown }
  | { type: 'ice-candidate'; candidate: unknown }
  | { type: 'leave' }
  // Battle Royale
  | { type: 'br-create'; name: string; maxPlayers: number }
  | { type: 'br-join'; roomCode: string; name: string }
  | { type: 'br-start' }
  | { type: 'br-word-done' }
  | { type: 'br-leave' };

export type ServerToClient =
  | { type: 'room-created'; roomCode: string }
  | { type: 'peer-joined'; isHost: boolean }
  | { type: 'match-found'; roomCode: string; isHost: boolean }
  | { type: 'offer'; sdp: unknown }
  | { type: 'answer'; sdp: unknown }
  | { type: 'ice-candidate'; candidate: unknown }
  | { type: 'peer-disconnected' }
  | { type: 'error'; message: string }
  // Battle Royale
  | { type: 'br-created'; roomCode: string; myId: string }
  | { type: 'br-joined'; roomCode: string; myId: string; players: { id: string; name: string }[] }
  | { type: 'br-player-joined'; player: { id: string; name: string } }
  | { type: 'br-player-left'; playerId: string }
  | { type: 'br-round-start'; roundNum: number; word: string; timeoutMs: number }
  | { type: 'br-player-done'; playerId: string }
  | { type: 'br-round-end'; eliminated: { id: string; name: string }[]; survivorCount: number }
  | { type: 'br-finished'; winnerId: string; winnerName: string }
  | { type: 'br-error'; message: string };
