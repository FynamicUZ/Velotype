import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMpStore } from '@/store/useMpStore';
import { randomSeed } from '@/lib/utils/seededRandom';
import { spriteForHat, emojiForWand } from '@/lib/game/cosmeticAssets';
import type { PeerInfo } from '@/lib/webrtc/types';

const TOTAL_WORDS_MP = 200;

interface LobbyNavState {
  autoCreate?: boolean;
  autoJoin?: boolean;
  roomCode?: string;
  challengedFriend?: string;
  hostUsername?: string;
}

export default function MultiplayerLobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? null) as LobbyNavState | null;
  const profile = usePlayerStore((s) => s.profile);

  const status = useMpStore((s) => s.status);
  const mode = useMpStore((s) => s.mode);
  const errorMsg = useMpStore((s) => s.errorMsg);
  const roomCode = useMpStore((s) => s.roomCode);
  const isHost = useMpStore((s) => s.isHost);
  const peerInfo = useMpStore((s) => s.peerInfo);
  const startFriendCreate = useMpStore((s) => s.startFriendCreate);
  const startFriendJoin = useMpStore((s) => s.startFriendJoin);
  const startMatchmaking = useMpStore((s) => s.startMatchmaking);
  const cancelMatchmaking = useMpStore((s) => s.cancelMatchmaking);
  const cleanup = useMpStore((s) => s.cleanup);
  const send = useMpStore((s) => s.send);
  const onMessage = useMpStore((s) => s.onMessage);
  const goInGame = useMpStore((s) => s.goInGame);

  const [roomInput, setRoomInput] = useState('');
  const didAutoConnect = useRef(false);

  const myInfoRef = useRef<PeerInfo>({
    name: profile.displayName,
    level: profile.level,
    elo: profile.elo,
    cosmetics: profile.cosmetics,
    equippedWeapon: profile.equippedWeapon,
  });
  myInfoRef.current = {
    name: profile.displayName,
    level: profile.level,
    elo: profile.elo,
    cosmetics: profile.cosmetics,
    equippedWeapon: profile.equippedWeapon,
  };

  // Auto-connect when arriving from a friend challenge/invite
  useEffect(() => {
    if (didAutoConnect.current) return;
    if (navState?.autoCreate && navState.roomCode && status === 'idle') {
      didAutoConnect.current = true;
      void startFriendCreate(myInfoRef.current, navState.roomCode);
    } else if (navState?.autoJoin && navState.roomCode && status === 'idle') {
      didAutoConnect.current = true;
      void startFriendJoin(navState.roomCode, myInfoRef.current);
    }
  }, [navState, status, startFriendCreate, startFriendJoin]);

  const myInfo: PeerInfo = {
    name: profile.displayName,
    level: profile.level,
    elo: profile.elo,
    cosmetics: profile.cosmetics,
    equippedWeapon: profile.equippedWeapon,
  };

  useEffect(() => {
    return onMessage((m) => {
      if (m.type === 'start') {
        goInGame();
        navigate('/battle', {
          state: {
            mode: mode === 'ranked' ? 'mp-ranked' : 'mp-friend',
            seed: m.seed,
            totalWords: m.totalWords,
            opponentName: peerInfo?.name ?? 'Opponent',
            opponentInfo: peerInfo,
          },
          replace: true,
        });
      }
    });
  }, [onMessage, navigate, goInGame, mode, peerInfo]);

  useEffect(() => {
    return () => {
      const s = useMpStore.getState().status;
      if (s !== 'in-game') cleanup();
    };
  }, [cleanup]);

  const handleStartGame = () => {
    const seed = randomSeed();
    send({ type: 'start', seed, totalWords: TOTAL_WORDS_MP });
    goInGame();
    navigate('/battle', {
      state: {
        mode: mode === 'ranked' ? 'mp-ranked' : 'mp-friend',
        seed,
        totalWords: TOTAL_WORDS_MP,
        opponentName: peerInfo?.name ?? 'Opponent',
        opponentInfo: peerInfo,
      },
      replace: true,
    });
  };

  const handleHome = () => {
    cleanup();
    navigate('/');
  };

  if (status === 'lobby') {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={handleHome}>
            ← Leave
          </Button>
          <h1 className="font-display text-2xl">
            {mode === 'ranked' ? 'Ranked Lobby' : 'Friend Lobby'}
          </h1>
          <Badge color={mode === 'ranked' ? 'gold' : 'cyan'}>
            {mode === 'ranked' ? 'RANKED' : 'FRIEND'}
          </Badge>
        </div>

        {roomCode && mode === 'friend' && (
          <Card className="p-4 mb-4 text-center">
            <div className="text-xs uppercase text-white/40 tracking-wider mb-1">Room Code</div>
            <div className="font-mono text-3xl tracking-widest text-arcane-cyan">{roomCode}</div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <PlayerCard
            label="You"
            name={profile.displayName}
            level={profile.level}
            elo={profile.elo}
            sprite={spriteForHat(profile.cosmetics.hat)}
            wand={emojiForWand(profile.cosmetics.wand)}
            highlight
          />
          <PlayerCard
            label="Opponent"
            name={peerInfo?.name ?? 'Connecting…'}
            level={peerInfo?.level ?? 0}
            elo={peerInfo?.elo ?? 0}
            sprite={peerInfo ? spriteForHat(peerInfo.cosmetics.hat) : '🌀'}
            wand={peerInfo ? emojiForWand(peerInfo.cosmetics.wand) : ''}
          />
        </div>

        {isHost ? (
          <Button glow onClick={handleStartGame} disabled={!peerInfo}>
            {peerInfo ? 'Start Battle' : 'Waiting for opponent…'}
          </Button>
        ) : (
          <p className="text-center text-white/60">
            {peerInfo ? 'Waiting for host to start…' : 'Connecting…'}
          </p>
        )}
      </div>
    );
  }

  if (status === 'matchmaking') {
    return (
      <CenterCard
        title="Searching for opponent…"
        sub="Matching by ELO. This may take a moment."
        onCancel={() => {
          cancelMatchmaking();
        }}
      />
    );
  }

  if (status === 'connecting' || status === 'waiting-peer' || status === 'handshaking') {
    return (
      <CenterCard
        title={
          status === 'connecting'
            ? 'Connecting to server…'
            : status === 'waiting-peer'
            ? 'Waiting for friend to join…'
            : 'Establishing connection…'
        }
        sub={roomCode ? `Room: ${roomCode}` : ''}
        onCancel={handleHome}
      />
    );
  }

  if (status === 'error' || status === 'closed') {
    return (
      <CenterCard
        title={status === 'error' ? 'Error' : 'Disconnected'}
        sub={errorMsg ?? 'Something went wrong.'}
        onCancel={handleHome}
      />
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Home
        </Button>
        <h1 className="font-display text-2xl">Multiplayer</h1>
        <Badge color="violet">ELO {profile.elo}</Badge>
      </div>

      <Card className="p-6 mb-4 text-center">
        <h2 className="font-display text-xl mb-2 text-arcane-gold">Ranked Match</h2>
        <p className="text-white/60 text-sm mb-4">
          Get matched with a random player. Win to climb the ranks.
        </p>
        <Button glow onClick={() => startMatchmaking(myInfo)}>
          Find Match
        </Button>
      </Card>

      <Card className="p-6 mb-4">
        <h2 className="font-display text-xl mb-2 text-arcane-cyan">Friend Match</h2>
        <p className="text-white/60 text-sm mb-4">
          No ELO change. Share a code or join one.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => startFriendCreate(myInfo)}>
            Create Room
          </Button>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="CODE"
              className="flex-1 px-3 py-2 bg-black/40 border border-arcane-border rounded-xl font-mono text-center tracking-widest uppercase outline-none focus:border-arcane-cyan"
            />
            <Button
              variant="secondary"
              disabled={roomInput.length !== 6}
              onClick={() => startFriendJoin(roomInput, myInfo)}
            >
              Join
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-white/40 mt-6">
        Signaling server: <code className="text-arcane-cyan">cd server && npm run dev</code>
      </p>
    </div>
  );
}

function CenterCard({
  title,
  sub,
  onCancel,
}: {
  title: string;
  sub?: string;
  onCancel: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 text-center max-w-md w-full">
        <div className="font-display text-xl mb-2">{title}</div>
        {sub && <div className="text-white/60 text-sm mb-6">{sub}</div>}
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </Card>
    </div>
  );
}

function PlayerCard({
  label,
  name,
  level,
  elo,
  sprite,
  wand,
  highlight,
}: {
  label: string;
  name: string;
  level: number;
  elo: number;
  sprite: string;
  wand: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-4 ${highlight ? 'border-arcane-violet/60' : ''}`}>
      <div className="text-xs uppercase text-white/40 tracking-wider mb-2">{label}</div>
      <div className="flex items-center gap-3">
        <div className="text-5xl">{sprite}</div>
        <div className="text-3xl">{wand}</div>
      </div>
      <div className="mt-3">
        <div className="font-semibold truncate">{name}</div>
        <div className="text-xs text-white/50">
          Lvl {level} · ELO {elo}
        </div>
      </div>
    </Card>
  );
}
