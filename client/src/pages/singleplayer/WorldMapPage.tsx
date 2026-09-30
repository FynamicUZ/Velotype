import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WORLDS } from '@/lib/game/enemies';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useRunStore } from '@/store/useRunStore';
import { TOURNAMENT_TIERS } from '@/lib/game/runOpponents';
import clsx from 'clsx';

export default function WorldMapPage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const unlocked = profile.spProgress.worldsUnlocked;
  const bestWave = useRunStore((s) => s.bestWave);
  const titlesWon = useRunStore((s) => s.titlesWon);
  const survivalRun = useRunStore((s) => s.survival);
  const tournamentRun = useRunStore((s) => s.tournament);
  const activeTournament =
    tournamentRun && tournamentRun.status === 'ready' ? tournamentRun : null;
  const activeTier = activeTournament
    ? TOURNAMENT_TIERS.find((t) => t.id === activeTournament.tierId)
    : undefined;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Home
        </Button>
        <h1 className="font-display text-2xl">World Map</h1>
        <Badge color="cyan">Worlds {unlocked}/{WORLDS.length}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {WORLDS.map((w) => {
          const isLocked = w.id > unlocked;
          const fightersDefeated = w.fighters.filter((f) =>
            profile.spProgress.defeatedFighters.includes(f.id),
          ).length;
          return (
            <Card
              key={w.id}
              className={clsx(
                'p-5 transition',
                isLocked ? 'opacity-50' : 'hover:border-arcane-violet/60 cursor-pointer',
              )}
              onClick={() => !isLocked && navigate(`/sp/world/${w.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                    World {w.id}
                  </div>
                  <h2 className="font-display text-lg">{w.name}</h2>
                </div>
                <Badge color={isLocked ? 'rose' : 'lime'}>
                  {isLocked ? '🔒 Locked' : `${fightersDefeated}/${w.fighters.length}`}
                </Badge>
              </div>
              <p className="text-sm text-white/60">
                Boss: {w.boss.name} <span className="text-arcane-rose">Lvl {w.boss.level}</span>
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💀</span>
            <h3 className="font-display text-lg">Survival</h3>
            {bestWave > 0 && <Badge color="gold">Best: wave {bestWave}</Badge>}
          </div>
          <p className="text-sm text-white/60 mb-3">
            Endless waves. Health carries between fights and barely recovers.
            See how deep you can get.
          </p>
          <Button variant="secondary" onClick={() => navigate('/sp/survival')}>
            {survivalRun && survivalRun.status === 'ready'
              ? `Resume — wave ${survivalRun.wave}`
              : 'Enter Survival'}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h3 className="font-display text-lg">Tournament</h3>
            {titlesWon.length > 0 && (
              <Badge color="gold">
                {titlesWon.length} title{titlesWon.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-sm text-white/60 mb-3">
            Climb a ladder of eight fighters. Every match is best of three.
          </p>
          {activeTournament && activeTier && (
            <button
              type="button"
              onClick={() => navigate(`/sp/tournament/${activeTier.id}`)}
              className="w-full mb-3 rounded-xl border border-arcane-violet/60 bg-arcane-violet/10 px-3 py-2 text-left hover:border-arcane-violet transition"
            >
              <div className="text-xs uppercase tracking-wider text-arcane-violet mb-0.5">
                In progress — resume
              </div>
              <div className="text-sm">
                {activeTier.name} · rank {8 - activeTournament.index} ·{' '}
                {activeTournament.matchesWon}/8 won
              </div>
            </button>
          )}
          <div className="flex flex-col gap-2">
            {TOURNAMENT_TIERS.slice(0, Math.max(1, unlocked)).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/sp/tournament/${t.id}`)}
                className="flex items-center justify-between rounded-xl border border-arcane-border px-3 py-2 text-left text-sm hover:border-arcane-violet/60 transition"
              >
                <span className="flex items-center gap-2">
                  {t.name}
                  {titlesWon.includes(t.id) && <span className="text-arcane-lime text-xs">✓</span>}
                  {activeTournament?.tierId === t.id && (
                    <span className="text-arcane-violet text-xs">· in progress</span>
                  )}
                </span>
                <span className="text-xs text-white/40 font-mono">
                  {t.entryFee > 0 ? `${t.entryFee} coins` : 'free'}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
