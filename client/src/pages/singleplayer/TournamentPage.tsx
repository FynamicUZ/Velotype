import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useGameStore } from '@/store/useGameStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import {
  ROUNDS_TO_WIN,
  currentTournamentLadder,
  currentTournamentOpponent,
  useRunStore,
} from '@/store/useRunStore';
import { useRunRewards } from '@/hooks/useRunRewards';
import { getEnemyHP } from '@/lib/game/botAI';
import { TOURNAMENT_SIZE, getTournamentTier } from '@/lib/game/runOpponents';

export default function TournamentPage() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const tierId = Number(worldId) || 1;
  const tier = getTournamentTier(tierId);

  const profile = usePlayerStore((s) => s.profile);
  const addCoins = usePlayerStore((s) => s.addCoins);
  const phase = useGameStore((s) => s.phase);

  const run = useRunStore((s) => s.tournament);
  const titlesWon = useRunStore((s) => s.titlesWon);
  const startTournament = useRunStore((s) => s.startTournament);
  const resolveTournamentRound = useRunStore((s) => s.resolveTournamentRound);
  const endTournament = useRunStore((s) => s.endTournament);

  useRunRewards();

  // Settle the round we just came back from, reading fresh state and clearing
  // it before advancing so a repeat pass does nothing.
  useEffect(() => {
    const g = useGameStore.getState();
    if (g.phase !== 'RESULTS' || g.mode !== 'tournament') return;
    const won = g.result === 'win';
    g.resetBattle();
    resolveTournamentRound(won);
  }, [phase, resolveTournamentRound]);

  if (!tier) {
    return (
      <Shell onBack={() => navigate('/sp')}>
        <Card className="p-8 text-center">
          <p className="text-white/60">No such circuit.</p>
        </Card>
      </Shell>
    );
  }

  const active = run && run.tierId === tierId ? run : null;
  const alreadyWon = titlesWon.includes(tierId);

  const enter = () => {
    if (profile.coins < tier.entryFee) return;
    if (tier.entryFee > 0) addCoins(-tier.entryFee);
    startTournament(tierId);
  };

  const canEnter = !run || run.status !== 'ready' || run.tierId === tierId;

  // Leaving keeps the run: a tournament is eight matches and is meant to be
  // played across sittings. Only an explicit abandon throws it away.
  const goBack = () => navigate('/sp');

  const abandon = () => {
    endTournament();
    navigate('/sp');
  };

  const fightRound = () => {
    const current = useRunStore.getState().tournament;
    if (!current) return;
    const opponent = currentTournamentOpponent(current);
    if (!opponent) return;
    navigate('/battle', {
      state: {
        mode: 'tournament',
        enemyDef: opponent,
        returnTo: `/sp/tournament/${current.tierId}`,
        subtitle: `ROUND ${current.roundsWon + current.roundsLost + 1} · ${current.roundsWon}-${current.roundsLost}`,
      },
    });
  };

  // ── not entered ───────────────────────────────────────────────────────────
  if (!active) {
    const canAfford = profile.coins >= tier.entryFee;
    const elsewhere = run && run.status === 'ready' ? run : null;
    const elsewhereTier = elsewhere ? getTournamentTier(elsewhere.tierId) : undefined;
    return (
      <Shell onBack={() => navigate('/sp')}>
        {elsewhere && elsewhereTier && (
          <Card className="p-5 mb-4 border-arcane-orange/60">
            <p className="text-sm text-white/80 mb-1">
              You are {elsewhere.matchesWon} match
              {elsewhere.matchesWon === 1 ? '' : 'es'} into the{' '}
              <span className="text-arcane-gold">{elsewhereTier.name}</span>.
            </p>
            <p className="text-xs text-white/50 mb-3">
              Entering this one abandons that run — you only hold one tournament
              place at a time.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => navigate(`/sp/tournament/${elsewhere.tierId}`)}
              >
                Resume {elsewhereTier.name}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => endTournament()}>
                Abandon it
              </Button>
            </div>
          </Card>
        )}
        <Card className="p-8 text-center" glow>
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="font-display text-3xl mb-1">{tier.name}</h1>
          <p className="text-white/50 text-sm mb-5">Tournament · Tier {tier.id}</p>
          <p className="text-white/60 mb-2">
            Eight fighters stand between you and the title. Beat them one at a
            time, climbing from the bottom rank to the reigning champion.
          </p>
          <p className="text-white/60 mb-6">
            Every match is best of three. Health resets each round — lose two
            rounds to anyone and you are out of the tournament.
          </p>
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            <Badge color="cyan">{TOURNAMENT_SIZE} fighters</Badge>
            <Badge color="violet">Best of {ROUNDS_TO_WIN * 2 - 1}</Badge>
            <Badge color="gold">
              Prize {tier.prizeCoins} coins · {tier.prizeXp} XP
            </Badge>
            {alreadyWon && <Badge color="lime">✓ Title held</Badge>}
          </div>
          <p className="text-sm mb-4">
            {tier.entryFee > 0 ? (
              <>
                Entry fee:{' '}
                <span className={canAfford ? 'text-arcane-gold' : 'text-arcane-rose'}>
                  {tier.entryFee} coins
                </span>{' '}
                <span className="text-white/40">(you have {profile.coins})</span>
              </>
            ) : (
              <span className="text-arcane-lime">Free entry</span>
            )}
          </p>
          <Button glow onClick={enter} disabled={!canAfford || !canEnter}>
            {!canAfford
              ? 'Not enough coins'
              : canEnter
                ? 'Enter Tournament'
                : 'Finish or abandon your other run first'}
          </Button>
        </Card>
      </Shell>
    );
  }

  const ladder = currentTournamentLadder(active);
  const opponent = currentTournamentOpponent(active);

  // ── knocked out ───────────────────────────────────────────────────────────
  if (active.status === 'over') {
    const beaten = ladder[active.index];
    return (
      <Shell onBack={abandon}>
        <Card className="p-8 text-center" glow>
          <div className="font-display text-4xl mb-2 text-arcane-rose">KNOCKED OUT</div>
          <p className="text-white/60 mb-6">
            {beaten ? `${beaten.name} took the match ${active.roundsLost}-${active.roundsWon}.` : 'Your run is over.'}
          </p>
          <p className="text-white/70 mb-6">
            You won <span className="font-mono text-arcane-cyan">{active.matchesWon}</span> of{' '}
            {TOURNAMENT_SIZE} matches — rank{' '}
            <span className="font-mono">{TOURNAMENT_SIZE - active.matchesWon}</span>.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { endTournament(); }}>Try Again</Button>
            <Button variant="secondary" onClick={abandon}>
              World Map
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  // ── champion ──────────────────────────────────────────────────────────────
  if (active.status === 'champion') {
    return (
      <Shell onBack={abandon}>
        <Card className="p-8 text-center" glow>
          <div className="text-6xl mb-3">🏆</div>
          <div className="font-display text-4xl mb-2 text-arcane-gold">CHAMPION</div>
          <p className="text-white/60 mb-6">
            You took all {TOURNAMENT_SIZE} matches of the {tier.name}.
          </p>
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            <Badge color="gold">+{tier.prizeCoins} coins</Badge>
            <Badge color="cyan">+{tier.prizeXp} XP</Badge>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { endTournament(); }}>Defend the Title</Button>
            <Button variant="secondary" onClick={abandon}>
              World Map
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  // ── mid-tournament ────────────────────────────────────────────────────────
  return (
    <Shell onBack={goBack}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl">{tier.name}</h1>
          <p className="text-sm text-white/50">
            Rank {TOURNAMENT_SIZE - active.index} of {TOURNAMENT_SIZE}
          </p>
        </div>
        <Badge color="gold">{active.matchesWon} won</Badge>
      </div>

      {opponent && (
        <Card className="p-6 mb-4 border-arcane-violet/50">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-3">
            Current Match — best of {ROUNDS_TO_WIN * 2 - 1}
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">{opponent.sprite}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-lg">{opponent.name}</h2>
                <Badge color={opponent.kind === 'boss' ? 'rose' : opponent.kind === 'bodyguard' ? 'orange' : 'cyan'}>
                  Lvl {opponent.level}
                </Badge>
              </div>
              <p className="text-sm text-white/60">{opponent.flavor}</p>
              <p className="text-xs text-white/40 mt-1 font-mono">
                {getEnemyHP(opponent.level, opponent.kind)} HP
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mb-4">
            <RoundPips label="You" won={active.roundsWon} color="bg-arcane-lime" />
            <div className="font-display text-xl text-white/30">vs</div>
            <RoundPips label="Them" won={active.roundsLost} color="bg-arcane-rose" />
          </div>

          <Button glow onClick={fightRound}>
            {active.roundsWon + active.roundsLost === 0
              ? 'Start Match'
              : `Fight Round ${active.roundsWon + active.roundsLost + 1}`}
          </Button>
          <p className="text-xs text-white/40 mt-3 text-center">
            Full health at the start of every round.
          </p>
        </Card>
      )}

      <Card className="p-5">
        <div className="text-xs uppercase tracking-wider text-white/40 mb-3">The Ladder</div>
        <div className="flex flex-col gap-2">
          {ladder.map((f, i) => {
            const done = i < active.index;
            const current = i === active.index;
            return (
              <div
                key={f.id}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2 border',
                  current
                    ? 'border-arcane-violet/70 bg-arcane-violet/10'
                    : done
                      ? 'border-transparent opacity-45'
                      : 'border-transparent',
                )}
              >
                <span className="font-mono text-xs text-white/40 w-10">
                  #{TOURNAMENT_SIZE - i}
                </span>
                <span className="text-xl">{f.sprite}</span>
                <span className={clsx('flex-1 text-sm', done && 'line-through')}>{f.name}</span>
                <span className="text-xs text-white/40 font-mono">Lvl {f.level}</span>
                {done && <span className="text-arcane-lime text-xs">✓</span>}
                {current && <Badge color="violet">Now</Badge>}
              </div>
            );
          })}
        </div>
      </Card>
      <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
        <p className="text-xs text-white/40">
          ✓ Progress is saved after every match — you can leave and pick this up
          later.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={goBack}>
            Continue Later
          </Button>
          <Button variant="ghost" size="sm" onClick={abandon}>
            Abandon
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function RoundPips({ label, won, color }: { label: string; won: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <div className="flex gap-1.5">
        {Array.from({ length: ROUNDS_TO_WIN }, (_, i) => (
          <div
            key={i}
            className={clsx(
              'w-4 h-4 rounded-full border border-white/20',
              i < won ? color : 'bg-black/40',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← World Map
      </Button>
      <div className="mt-6">{children}</div>
    </div>
  );
}
