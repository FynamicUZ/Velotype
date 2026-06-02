import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getWorld } from '@/lib/game/enemies';
import { usePlayerStore } from '@/store/usePlayerStore';
import type { EnemyDef } from '@/lib/game/botAI';

export default function FightSelectPage() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);

  const world = worldId ? getWorld(Number(worldId)) : undefined;
  if (!world) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/sp')}>← Back</Button>
        <p className="mt-4">World not found.</p>
      </div>
    );
  }

  const isDefeated = (e: EnemyDef) => profile.spProgress.defeatedFighters.includes(e.id);
  const allFightersDefeated = world.fighters.every(isDefeated);
  const bodyguardDefeated = isDefeated(world.bodyguard);

  const startFight = (enemyId: string) => {
    navigate('/battle', {
      state: { mode: 'singleplayer', enemyId },
    });
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sp')}>
          ← World Map
        </Button>
        <h1 className="font-display text-2xl">{world.name}</h1>
        <div />
      </div>

      <h2 className="font-display text-lg mb-3 text-white/80">Fighters</h2>
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {world.fighters.map((f) => (
          <FighterCard
            key={f.id}
            enemy={f}
            defeated={isDefeated(f)}
            locked={false}
            onFight={() => startFight(f.id)}
          />
        ))}
      </div>

      <h2 className="font-display text-lg mb-3 text-arcane-orange">Bodyguard</h2>
      <FighterCard
        enemy={world.bodyguard}
        defeated={bodyguardDefeated}
        locked={!allFightersDefeated}
        lockedReason="Defeat all fighters first"
        onFight={() => startFight(world.bodyguard.id)}
      />

      <h2 className="font-display text-lg mb-3 mt-6 text-arcane-rose">Boss</h2>
      <FighterCard
        enemy={world.boss}
        defeated={isDefeated(world.boss)}
        locked={!bodyguardDefeated}
        lockedReason="Defeat the bodyguard first"
        onFight={() => startFight(world.boss.id)}
      />
    </div>
  );
}

function FighterCard({
  enemy,
  defeated,
  locked,
  lockedReason,
  onFight,
}: {
  enemy: EnemyDef;
  defeated: boolean;
  locked: boolean;
  lockedReason?: string;
  onFight: () => void;
}) {
  const accent =
    enemy.kind === 'boss' ? 'rose' : enemy.kind === 'bodyguard' ? 'orange' : 'cyan';
  return (
    <Card className={clsx('p-4 flex items-center gap-4', defeated && 'opacity-60')}>
      <div className="text-4xl">{enemy.sprite}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{enemy.name}</h3>
          <Badge color={accent}>Lvl {enemy.level}</Badge>
          {defeated && <Badge color="lime">✓ Defeated</Badge>}
        </div>
        <p className="text-sm text-white/60">{enemy.flavor}</p>
        {locked && lockedReason && (
          <p className="text-xs text-arcane-rose mt-1">🔒 {lockedReason}</p>
        )}
      </div>
      <Button disabled={locked} onClick={onFight} variant={defeated ? 'secondary' : 'primary'}>
        {defeated ? 'Replay' : 'Fight'}
      </Button>
    </Card>
  );
}
