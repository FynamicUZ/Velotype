import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RunHpBar } from '@/components/RunHpBar';
import { useGameStore } from '@/store/useGameStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import {
  currentSurvivalOpponent,
  survivalWaveReward,
  useRunStore,
} from '@/store/useRunStore';
import { useRunRewards } from '@/hooks/useRunRewards';
import { getEnemyHP } from '@/lib/game/botAI';
import { survivalKindForWave } from '@/lib/game/runOpponents';

export default function SurvivalPage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const phase = useGameStore((s) => s.phase);

  const run = useRunStore((s) => s.survival);
  const bestWave = useRunStore((s) => s.bestWave);
  const startSurvival = useRunStore((s) => s.startSurvival);
  const resolveSurvivalWave = useRunStore((s) => s.resolveSurvivalWave);
  const endSurvival = useRunStore((s) => s.endSurvival);

  useRunRewards();

  // Settle the fight we just came back from. State is read fresh and cleared
  // before the run advances, so running this again is a no-op.
  useEffect(() => {
    const g = useGameStore.getState();
    if (g.phase !== 'RESULTS' || g.mode !== 'survival') return;
    const won = g.result === 'win';
    const hpLeft = g.localHP;
    g.resetBattle();
    resolveSurvivalWave(won, hpLeft);
  }, [phase, resolveSurvivalWave]);

  const maxHp = 100 + profile.level * 20;

  const beginRun = () => startSurvival(maxHp);

  // Stepping away keeps the run and its carried health; only Retire ends it.
  const goBack = () => navigate('/sp');

  const retire = () => {
    endSurvival();
    navigate('/sp');
  };

  const fightWave = () => {
    const active = useRunStore.getState().survival;
    if (!active) return;
    const opponent = currentSurvivalOpponent(active);
    navigate('/battle', {
      state: {
        mode: 'survival',
        enemyDef: opponent,
        startHP: active.hp,
        returnTo: '/sp/survival',
        subtitle: `WAVE ${active.wave}`,
      },
    });
  };

  if (!run) {
    return (
      <Shell onBack={() => navigate('/sp')}>
        <Card className="p-8 text-center" glow>
          <div className="text-5xl mb-3">💀</div>
          <h1 className="font-display text-3xl mb-3">Survival</h1>
          <p className="text-white/60 mb-2">
            Endless waves, one after another. Whatever health you walk out of a
            fight with is what you walk into the next one with — nothing heals
            between waves.
          </p>
          <p className="text-white/60 mb-6">
            There is no winning — only how far you get before you fall.
          </p>
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            <Badge color="cyan">Every 5th wave: bodyguard</Badge>
            <Badge color="rose">Every 10th: boss</Badge>
            <Badge color="rose">No healing between waves</Badge>
            <Badge color="gold">Rewards scale with depth</Badge>
          </div>
          {bestWave > 0 && (
            <p className="text-sm text-white/50 mb-6">
              Deepest run:{' '}
              <span className="text-arcane-gold font-mono">wave {bestWave}</span>
            </p>
          )}
          <Button glow onClick={beginRun}>
            Enter the Gauntlet
          </Button>
        </Card>
      </Shell>
    );
  }

  if (run.status === 'over') {
    const isBest = run.wavesCleared > 0 && run.wave >= bestWave;
    return (
      <Shell onBack={retire}>
        <Card className="p-8 text-center" glow>
          <div className="font-display text-4xl mb-2 text-arcane-rose">YOU FELL</div>
          <p className="text-white/60 mb-6">
            Cut down on wave <span className="font-mono text-white">{run.wave}</span>.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat label="Waves Cleared" value={run.wavesCleared.toString()} />
            <Stat label="Coins" value={`+${run.coinsEarned}`} />
            <Stat label="XP" value={`+${run.xpEarned}`} />
          </div>
          {isBest && <Badge color="gold">🏆 New personal best</Badge>}
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={beginRun}>Run Again</Button>
            <Button variant="secondary" onClick={retire}>
              World Map
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  const opponent = currentSurvivalOpponent(run);
  const reward = survivalWaveReward(run.wave);
  const kind = survivalKindForWave(run.wave);
  const accent = kind === 'boss' ? 'rose' : kind === 'bodyguard' ? 'orange' : 'cyan';

  return (
    <Shell onBack={goBack}>
      <Card className="p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">Next Up</div>
            <h1 className="font-display text-2xl">Wave {run.wave}</h1>
          </div>
          <Badge color="lime">{run.wavesCleared} cleared</Badge>
        </div>

        <RunHpBar hp={run.hp} maxHp={run.maxHp} />
        <p className="text-xs text-white/40 mt-2">
          Carried over from the last fight — nothing heals between waves.
        </p>
        {run.hp <= run.maxHp * 0.25 && (
          <p className="text-xs text-arcane-rose mt-2">
            You are badly hurt, and this is all you have left.
          </p>
        )}
      </Card>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{opponent.sprite}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-lg">{opponent.name}</h2>
              <Badge color={accent}>
                {kind === 'normal'
                  ? `Lvl ${opponent.level}`
                  : `${kind.toUpperCase()} · Lvl ${opponent.level}`}
              </Badge>
            </div>
            <p className="text-sm text-white/60">{opponent.flavor}</p>
            <p className="text-xs text-white/40 mt-1 font-mono">
              {getEnemyHP(opponent.level, opponent.kind)} HP
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-white/50">
          Reward: <span className="text-arcane-gold">+{reward.coins} coins</span> ·{' '}
          <span className="text-arcane-cyan">+{reward.xp} XP</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={goBack}>
            Continue Later
          </Button>
          <Button variant="ghost" onClick={retire}>
            Retire
          </Button>
          <Button glow onClick={fightWave}>
            Fight
          </Button>
        </div>
      </div>
      <p className="text-xs text-white/40 mt-4 text-center">
        ✓ The run is saved between waves — leave and come back whenever. Your
        health will be exactly as you left it. Retiring ends the run for good
        and keeps everything you have earned.
      </p>
    </Shell>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/30 rounded-xl px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">{label}</div>
      <div className="font-display text-xl text-arcane-cyan">{value}</div>
    </div>
  );
}
