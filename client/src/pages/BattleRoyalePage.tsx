import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useBrStore, type BrPlayer } from '@/store/useBrStore';

const PLAYER_SPRITES = ['🧙', '🧝', '🧌', '🐉', '🔮', '👁', '⚡', '💀'];

type RoundPhase = 'waiting' | 'active' | 'end';

export default function BattleRoyalePage() {
  const navigate = useNavigate();
  const { status, myId, players, winner, sendWordDone, onBrMessage, cleanup } = useBrStore();

  // Snapshot players at game start — list is stable once game begins
  const [battlePlayers] = useState<BrPlayer[]>(() => players);

  const [roundPhase, setRoundPhase] = useState<RoundPhase>('waiting');
  const [currentWord, setCurrentWord] = useState('');
  const [roundNum, setRoundNum] = useState(0);
  const [timeoutMs, setTimeoutMs] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  const [typed, setTyped] = useState('');
  const [hasError, setHasError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [lastEliminated, setLastEliminated] = useState<{ id: string; name: string }[]>([]);

  const [timerPct, setTimerPct] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const errorTimeout = useRef<ReturnType<typeof setTimeout>>();

  const iAmEliminated = myId ? eliminatedIds.has(myId) : false;

  // Redirect if disconnected
  useEffect(() => {
    if (status === 'idle') navigate('/', { replace: true });
  }, [status, navigate]);

  // Subscribe to server messages
  useEffect(() => {
    return onBrMessage((msg) => {
      if (msg.type === 'br-round-start') {
        setCurrentWord(msg.word);
        setRoundNum(msg.roundNum);
        setTimeoutMs(msg.timeoutMs);
        setStartedAt(Date.now());
        setTyped('');
        setHasError(false);
        setSubmitted(false);
        setCompletedIds(new Set());
        setTimerPct(100);
        setRoundPhase('active');
      } else if (msg.type === 'br-player-done') {
        setCompletedIds((prev) => new Set([...prev, msg.playerId]));
      } else if (msg.type === 'br-round-end') {
        setLastEliminated(msg.eliminated);
        setEliminatedIds((prev) => new Set([...prev, ...msg.eliminated.map((e) => e.id)]));
        setRoundPhase('end');
      } else if (msg.type === 'br-player-left') {
        setEliminatedIds((prev) => new Set([...prev, msg.playerId]));
      }
    });
  }, [onBrMessage]);

  // Auto-focus input when round becomes active
  useEffect(() => {
    if (roundPhase === 'active' && !iAmEliminated) {
      inputRef.current?.focus();
    }
  }, [roundPhase, iAmEliminated]);

  // Timer bar countdown
  useEffect(() => {
    if (roundPhase !== 'active' || timeoutMs === 0) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.max(0, ((timeoutMs - elapsed) / timeoutMs) * 100);
      setTimerPct(pct);
      if (pct === 0) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [roundPhase, timeoutMs, startedAt]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (submitted || roundPhase !== 'active' || iAmEliminated) return;

      const val = e.target.value;
      const target = currentWord.toLowerCase();

      if (target.startsWith(val.toLowerCase())) {
        setTyped(val);
        if (val.toLowerCase() === target) {
          setTyped('');
          setSubmitted(true);
          sendWordDone();
        }
      } else {
        // Wrong character — clear and flash error
        setTyped('');
        if (errorTimeout.current) clearTimeout(errorTimeout.current);
        setHasError(true);
        errorTimeout.current = setTimeout(() => setHasError(false), 300);
      }
    },
    [submitted, roundPhase, iAmEliminated, currentWord, sendWordDone],
  );

  const handleLeave = () => {
    cleanup();
    navigate('/');
  };

  // ── Winner screen ──────────────────────────────────────────────────────────
  if (status === 'results' && winner) {
    const iWon = winner.id === myId;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-10 text-center max-w-sm">
          <div className="text-7xl mb-4">{iWon ? '👑' : '💀'}</div>
          <h1 className="font-display text-3xl mb-2 text-arcane-rose">
            {iWon ? 'Victory!' : 'Defeated'}
          </h1>
          <p className="text-white/60 text-sm mb-6">
            {iWon
              ? 'You survived every round!'
              : `${winner.name} outlasted everyone!`}
          </p>
          <Button glow onClick={handleLeave}>
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  // ── Waiting for first round ───────────────────────────────────────────────
  if (roundPhase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3 animate-pulse">👑</div>
          <p className="font-display text-white/60">Get ready...</p>
          <p className="text-white/30 text-sm mt-2">The first word is coming!</p>
        </Card>
      </div>
    );
  }

  // ── Main battle view ──────────────────────────────────────────────────────
  const aliveCount = battlePlayers.filter((p) => !eliminatedIds.has(p.id)).length;

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleLeave}>← Leave</Button>
        <div className="flex items-center gap-2">
          <span className="font-display text-arcane-rose text-sm">👑 BATTLE ROYALE</span>
          <Badge color="rose">Round {roundNum}</Badge>
        </div>
        <span className="text-xs text-white/40">{aliveCount} alive</span>
      </div>

      {/* Player status list */}
      <div className="grid grid-cols-2 gap-2">
        {battlePlayers.map((p, i) => {
          const isMe = p.id === myId;
          const isDead = eliminatedIds.has(p.id);
          const done = completedIds.has(p.id);
          const sprite = PLAYER_SPRITES[i % PLAYER_SPRITES.length];
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-opacity ${
                isDead ? 'opacity-30 line-through' : ''
              } ${isMe ? 'bg-arcane-violet/15 border border-arcane-violet/40' : 'bg-white/5 border border-white/10'}`}
            >
              <span className="text-xl">{isDead ? '💀' : sprite}</span>
              <span className={`text-sm truncate flex-1 ${isMe ? 'text-arcane-violet' : 'text-white/70'}`}>
                {p.name}
                {isMe && <span className="text-arcane-violet/50 ml-1">(you)</span>}
              </span>
              <span className="text-base">
                {isDead ? '' : done ? '✅' : roundPhase === 'active' ? '⌛' : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Timer bar */}
      {roundPhase === 'active' && (
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-none ${
              timerPct > 50
                ? 'bg-arcane-lime'
                : timerPct > 25
                ? 'bg-arcane-gold'
                : 'bg-arcane-rose'
            }`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}

      {/* Round end summary */}
      {roundPhase === 'end' && (
        <Card className={`p-4 text-center ${lastEliminated.length > 0 ? 'border-arcane-rose/50 bg-arcane-rose/10' : 'border-arcane-lime/50 bg-arcane-lime/5'}`}>
          {lastEliminated.length > 0 ? (
            <>
              <p className="text-arcane-rose font-display text-sm mb-1">💀 Eliminated!</p>
              <p className="text-white/70 text-sm">
                {lastEliminated.map((e) => e.name).join(', ')} failed the word
              </p>
            </>
          ) : (
            <>
              <p className="text-arcane-lime font-display text-sm mb-1">✓ Everyone survived!</p>
              <p className="text-white/50 text-sm">Next round will be harder...</p>
            </>
          )}
          <p className="text-white/30 text-xs mt-2">Next word coming...</p>
        </Card>
      )}

      {/* Word display + input */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {roundPhase === 'active' && (
          <>
            {/* Word with character highlights */}
            <div
              className={`font-mono text-5xl tracking-widest transition-all ${
                hasError ? 'animate-shake text-arcane-rose' : ''
              }`}
            >
              {currentWord.split('').map((ch, i) => (
                <span
                  key={i}
                  className={
                    i < typed.length
                      ? 'text-arcane-lime'
                      : submitted
                      ? 'text-arcane-lime'
                      : 'text-white/80'
                  }
                >
                  {ch}
                </span>
              ))}
            </div>

            {/* Typing input */}
            {!iAmEliminated ? (
              submitted ? (
                <div className="text-arcane-lime font-display text-sm animate-pulse">
                  ✓ Done! Waiting for others...
                </div>
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={typed}
                  onChange={handleChange}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onPaste={(e) => e.preventDefault()}
                  className={`bg-black/40 border rounded-xl px-6 py-3 font-mono text-2xl text-center tracking-widest outline-none text-white w-64 transition-colors ${
                    hasError
                      ? 'border-arcane-rose/70 bg-arcane-rose/10'
                      : 'border-arcane-violet/50 focus:border-arcane-cyan'
                  }`}
                  placeholder="type here..."
                />
              )
            ) : (
              <div className="text-white/30 text-sm">You are spectating</div>
            )}
          </>
        )}

        {roundPhase === 'end' && (
          <div className="text-white/20 font-mono text-3xl tracking-widest">
            {currentWord}
          </div>
        )}
      </div>

      {/* Self-eliminated banner */}
      {iAmEliminated && status !== 'results' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-arcane-rose/80 text-white text-xs px-5 py-2 rounded-full font-medium z-50">
          💀 You were eliminated — spectating
        </div>
      )}
    </div>
  );
}
