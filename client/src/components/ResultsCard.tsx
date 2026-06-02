import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { BattleStats } from '@/store/useGameStore';

interface Props {
  won: boolean;
  stats: BattleStats;
  rewards?: { coins?: number; xp?: number; eloDelta?: number };
  onPlayAgain?: () => void;
  onHome: () => void;
}

export function ResultsCard({ won, stats, rewards, onPlayAgain, onHome }: Props) {
  const wpm = computeWpm(stats);
  const accuracy = stats.totalKeystrokes > 0
    ? Math.round((stats.correctChars / stats.totalKeystrokes) * 100)
    : 0;

  return (
    <Card className="p-8 max-w-xl w-full" glow>
      <div className="text-center mb-6">
        <div
          className="font-display text-5xl mb-2"
          style={{
            color: won ? '#a3e635' : '#fb7185',
            textShadow: `0 0 32px ${won ? 'rgba(163,230,53,0.7)' : 'rgba(251,113,133,0.7)'}`,
          }}
        >
          {won ? 'VICTORY' : 'DEFEAT'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Stat label="WPM" value={wpm.toString()} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Damage Dealt" value={stats.damageDealt.toString()} />
        <Stat label="Damage Taken" value={stats.damageTaken.toString()} />
        <Stat label="Best Combo" value={`${stats.bestStreak}×`} />
        <Stat label="Words" value={`${stats.wordsTyped - stats.wordsFailed}/${stats.wordsTyped}`} />
      </div>

      {rewards && (
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {rewards.coins !== undefined && (
            <Badge color="gold">+{rewards.coins} coins</Badge>
          )}
          {rewards.xp !== undefined && <Badge color="cyan">+{rewards.xp} XP</Badge>}
          {rewards.eloDelta !== undefined && (
            <Badge color={rewards.eloDelta >= 0 ? 'lime' : 'rose'}>
              {rewards.eloDelta >= 0 ? '+' : ''}
              {rewards.eloDelta} ELO
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        {onPlayAgain && (
          <Button variant="primary" onClick={onPlayAgain}>
            Play Again
          </Button>
        )}
        <Button variant="secondary" onClick={onHome}>
          Home
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/30 rounded-xl px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-white/50 mb-1">{label}</div>
      <div className="font-display text-2xl text-arcane-cyan">{value}</div>
    </div>
  );
}

function computeWpm(stats: BattleStats): number {
  const minutes = stats.durationMs / 60_000;
  if (minutes <= 0) return 0;
  return Math.round(stats.correctChars / 5 / minutes);
}
