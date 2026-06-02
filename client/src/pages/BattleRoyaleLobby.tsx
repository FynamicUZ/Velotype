import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useBrStore } from '@/store/useBrStore';

const PLAYER_SPRITES = ['🧙', '🧝', '🧌', '🐉', '🔮', '👁', '⚡', '💀'];

export default function BattleRoyaleLobby() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const { status, roomCode, myId, isHost, players, errorMsg, createRoom, joinRoom, startGame, cleanup } =
    useBrStore();

  const [codeInput, setCodeInput] = useState('');

  useEffect(() => {
    if (status === 'round-active') {
      navigate('/br/battle', { replace: true });
    }
  }, [status, navigate]);

  const handleLeave = () => {
    cleanup();
    navigate('/');
  };

  if (status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="font-display text-white/60 animate-pulse mb-4">Connecting...</div>
          <Button variant="ghost" onClick={handleLeave}>Cancel</Button>
        </Card>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={handleLeave}>← Leave</Button>
          <h1 className="font-display text-2xl text-arcane-rose">👑 Battle Royale</h1>
          <Badge color="rose">LOBBY</Badge>
        </div>

        <Card className="p-6 mb-6 text-center">
          <div className="text-xs uppercase text-white/40 tracking-widest mb-2">Room Code</div>
          <div className="font-mono text-4xl tracking-widest text-arcane-cyan mb-1">{roomCode}</div>
          <p className="text-white/40 text-sm">Share this code with friends to join</p>
        </Card>

        <div className="flex flex-col gap-2 mb-6">
          {players.map((p, i) => (
            <Card
              key={p.id}
              className={`p-3 flex items-center justify-between ${p.id === myId ? 'border-arcane-violet/60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{PLAYER_SPRITES[i % PLAYER_SPRITES.length]}</span>
                <span className="font-medium">{p.name}</span>
                {p.id === myId && <Badge color="violet">You</Badge>}
                {isHost && p.id === myId && <Badge color="gold">Host</Badge>}
              </div>
              <div className="w-2 h-2 rounded-full bg-arcane-lime animate-pulse" />
            </Card>
          ))}
          {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
            <Card key={`empty-${i}`} className="p-3 opacity-30">
              <span className="text-white/30 text-sm italic">Waiting for player...</span>
            </Card>
          ))}
        </div>

        {isHost ? (
          <Button
            glow
            onClick={startGame}
            disabled={players.length < 2}
            className="w-full"
          >
            {players.length < 2
              ? 'Need 2+ players to start'
              : `Start Battle (${players.length} players)`}
          </Button>
        ) : (
          <p className="text-center text-white/50 text-sm">Waiting for host to start the battle...</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Home</Button>
        <h1 className="font-display text-2xl text-arcane-rose">👑 Battle Royale</h1>
        <div />
      </div>

      <div className="mb-5 p-4 rounded-xl bg-arcane-rose/10 border border-arcane-rose/30">
        <p className="text-sm text-white/70">
          Up to 4 mages compete simultaneously. Every word you type deals damage to a random
          opponent. Last mage standing wins — no ELO change, just glory.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-arcane-rose/20 border border-arcane-rose/40 text-arcane-rose text-sm">
          {errorMsg}
        </div>
      )}

      <Card className="p-6 mb-4">
        <h2 className="font-display text-lg text-arcane-rose mb-2">Create Room</h2>
        <p className="text-white/50 text-sm mb-4">
          Host a room for up to 4 players. Share the code with friends.
        </p>
        <Button glow onClick={() => createRoom(profile.displayName, 4)} className="w-full">
          Create Room
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg text-arcane-cyan mb-2">Join Room</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ENTER CODE"
            className="flex-1 px-3 py-2 bg-black/40 border border-arcane-border rounded-xl font-mono text-center tracking-widest uppercase outline-none focus:border-arcane-cyan text-white placeholder-white/30"
          />
          <Button
            variant="secondary"
            disabled={codeInput.length !== 6}
            onClick={() => joinRoom(codeInput, profile.displayName)}
          >
            Join
          </Button>
        </div>
      </Card>
    </div>
  );
}
