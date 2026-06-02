import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WORLDS } from '@/lib/game/enemies';
import { usePlayerStore } from '@/store/usePlayerStore';
import clsx from 'clsx';

export default function WorldMapPage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const unlocked = profile.spProgress.worldsUnlocked;

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
          <h3 className="font-display text-lg mb-2">Survival</h3>
          <p className="text-sm text-white/60 mb-3">
            Endless waves. HP doesn't restore between fights. Coins per wave survived.
          </p>
          <Button variant="secondary" onClick={() => navigate('/sp/survival')}>
            Enter Survival
          </Button>
        </Card>
        <Card className="p-5">
          <h3 className="font-display text-lg mb-2">Tournament</h3>
          <p className="text-sm text-white/60 mb-3">
            8-bot bracket. Win three fights, claim the prize.
          </p>
          <Button
            variant="secondary"
            disabled={unlocked < 1}
            onClick={() => navigate(`/sp/tournament/${unlocked}`)}
          >
            Enter Tournament
          </Button>
        </Card>
      </div>
    </div>
  );
}
