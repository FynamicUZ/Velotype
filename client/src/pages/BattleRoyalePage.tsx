import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CountdownOverlay } from '@/components/ui/CountdownOverlay';
import { TypingArea } from '@/components/TypingArea';
import { ComboCounter } from '@/components/ComboCounter';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useBrStore, type BrPlayer } from '@/store/useBrStore';
import { useTypingEngine, type WordCompletion } from '@/hooks/useTypingEngine';
import { generateWordSequence } from '@/lib/game/wordPool';

const MAX_HP = 500;
const PLAYER_SPRITES = ['🧙', '🧝', '🧌', '🐉', '🔮', '👁', '⚡', '💀'];

export default function BattleRoyalePage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const { status, myId, players, gameSeed, gameTotalWords, winner, sendRelay, sendEliminated, onBrMessage, cleanup } =
    useBrStore();

  // Snapshot players at mount — list is stable after game starts
  const [battlePlayers] = useState<BrPlayer[]>(() => players);

  // HP for all players (updated via br-relay messages broadcast to all)
  const [hpMap, setHpMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(battlePlayers.map((p) => [p.id, MAX_HP])),
  );

  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const eliminatedRef = useRef(new Set<string>());

  const [selfEliminated, setSelfEliminated] = useState(false);
  const selfEliminatedRef = useRef(false);

  const [phase, setPhase] = useState<'countdown' | 'battle' | 'done'>('countdown');
  const [elimNotif, setElimNotif] = useState<string | null>(null);
  const notifTimeout = useRef<ReturnType<typeof setTimeout>>();

  function showNotif(text: string) {
    if (notifTimeout.current) clearTimeout(notifTimeout.current);
    setElimNotif(text);
    notifTimeout.current = setTimeout(() => setElimNotif(null), 3000);
  }

  function addEliminated(id: string) {
    eliminatedRef.current = new Set([...eliminatedRef.current, id]);
    setEliminated(new Set(eliminatedRef.current));
    setHpMap((prev) => ({ ...prev, [id]: 0 }));
  }

  // Redirect if not in a game
  useEffect(() => {
    if (status === 'idle') navigate('/', { replace: true });
  }, [status, navigate]);

  // Subscribe to server messages during battle
  useEffect(() => {
    return onBrMessage((msg) => {
      if (msg.type === 'br-relay') {
        const p = msg.payload as { type: string; targetId?: string; amount?: number };
        if (p.type === 'damage' && p.targetId && p.amount) {
          const { targetId, amount } = p;
          setHpMap((prev) => {
            const next = { ...prev, [targetId]: Math.max(0, (prev[targetId] ?? MAX_HP) - amount) };
            // Check if I died
            if (targetId === myId && next[myId] <= 0 && !selfEliminatedRef.current) {
              selfEliminatedRef.current = true;
              setSelfEliminated(true);
              setPhase('done');
              sendEliminated();
            }
            return next;
          });
        }
      } else if (msg.type === 'br-eliminated') {
        addEliminated(msg.playerId);
        const p = battlePlayers.find((bp) => bp.id === msg.playerId);
        if (p && msg.playerId !== myId) showNotif(`💀 ${p.name} was eliminated!`);
      } else if (msg.type === 'br-player-left') {
        addEliminated(msg.playerId);
        const p = battlePlayers.find((bp) => bp.id === msg.playerId);
        if (p && msg.playerId !== myId) showNotif(`🚪 ${p.name} disconnected`);
      }
    });
  }, [onBrMessage, myId, sendEliminated, battlePlayers]);

  const words = useMemo(
    () =>
      gameSeed
        ? generateWordSequence(gameSeed, {
            totalWords: gameTotalWords,
            levelOffset: profile.level - 1,
          })
        : [],
    [gameSeed, gameTotalWords, profile.level],
  );

  const handleWordComplete = useCallback(
    (c: WordCompletion) => {
      if (c.failed || c.damage <= 0 || !myId || phase !== 'battle') return;
      const aliveOpponents = battlePlayers.filter(
        (p) => p.id !== myId && !eliminatedRef.current.has(p.id),
      );
      if (aliveOpponents.length === 0) return;
      const target = aliveOpponents[Math.floor(Math.random() * aliveOpponents.length)]!;
      sendRelay({ type: 'damage', targetId: target.id, amount: c.damage });
    },
    [battlePlayers, myId, phase, sendRelay],
  );

  const engine = useTypingEngine({
    words,
    enabled: phase === 'battle',
    playerLevel: profile.level,
    onWordComplete: handleWordComplete,
  });

  const handleLeave = () => {
    cleanup();
    navigate('/');
  };

  if (!gameSeed || !myId) return null;

  // Winner / results screen
  if (status === 'results' && winner) {
    const iWon = winner.id === myId;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-10 text-center max-w-md">
          <div className="text-7xl mb-4">{iWon ? '👑' : '💀'}</div>
          <h1 className="font-display text-4xl mb-2 text-arcane-rose">
            {iWon ? 'Victory!' : 'Defeated'}
          </h1>
          <p className="text-white/60 text-sm mb-2">
            {iWon ? 'You outlasted every opponent!' : `${winner.name} wins the Battle Royale!`}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-xs text-white/30 font-mono">
              {engine.totalCorrectChars} chars · {engine.bestStreak}x best streak
            </p>
            <Button glow onClick={handleLeave}>Back to Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  const myHp = hpMap[myId] ?? MAX_HP;
  const battling = phase === 'battle';

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleLeave}>← Leave</Button>
        <span className="font-display text-arcane-rose text-sm">👑 BATTLE ROYALE</span>
        <div className="text-xs text-white/40 font-mono">
          {battlePlayers.length - eliminated.size} / {battlePlayers.length} alive
        </div>
      </div>

      {/* HP Bars — all players */}
      <div className="grid grid-cols-2 gap-2">
        {battlePlayers.map((p, i) => {
          const hp = p.id === myId ? myHp : (hpMap[p.id] ?? MAX_HP);
          const isMe = p.id === myId;
          const isDead = eliminated.has(p.id) || hp <= 0;
          const pct = Math.max(0, (hp / MAX_HP) * 100);
          const sprite = PLAYER_SPRITES[i % PLAYER_SPRITES.length];
          return (
            <div
              key={p.id}
              className={`p-2 rounded-lg transition-opacity ${isDead ? 'opacity-30' : ''} ${
                isMe ? 'bg-arcane-violet/10 border border-arcane-violet/40' : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`flex items-center gap-1 ${isMe ? 'text-arcane-violet' : 'text-white/60'}`}>
                  <span>{sprite}</span>
                  <span className="truncate max-w-[80px]">{p.name}</span>
                  {isMe && <span className="text-arcane-violet/60">(you)</span>}
                </span>
                <span className={isDead ? 'text-arcane-rose' : 'text-white/40'}>
                  {isDead ? '💀' : `${hp}/${MAX_HP}`}
                </span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isMe ? 'bg-gradient-to-r from-arcane-violet to-arcane-cyan' : 'bg-arcane-cyan/70'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Elimination notification */}
      {elimNotif && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-arcane-rose/90 text-white text-xs px-4 py-2 rounded-full font-medium animate-cast z-50">
          {elimNotif}
        </div>
      )}

      {/* Main typing area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <ComboCounter streak={engine.streak} />
        <TypingArea
          words={words}
          engine={engine}
          glitch={false}
          letterDrop={false}
          enabled={battling}
        />
        <div className="text-sm text-white/40 font-mono">
          Word {Math.min(engine.currentIndex + 1, words.length)} / {words.length}
        </div>
      </div>

      {/* Self-eliminated spectator overlay */}
      {selfEliminated && status !== 'results' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 pointer-events-none">
          <Card className="p-8 text-center pointer-events-auto">
            <div className="text-5xl mb-3">💀</div>
            <h2 className="font-display text-2xl text-arcane-rose mb-2">You were eliminated!</h2>
            <p className="text-white/50 text-sm">Spectating the remaining battle...</p>
          </Card>
        </div>
      )}

      {phase === 'countdown' && (
        <CountdownOverlay seconds={3} onDone={() => setPhase('battle')} />
      )}
    </div>
  );
}
