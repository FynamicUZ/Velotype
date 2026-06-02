import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResultsCard } from '@/components/ResultsCard';
import { useGameStore } from '@/store/useGameStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMpStore } from '@/store/useMpStore';

export default function ResultsPage() {
  const navigate = useNavigate();
  const phase = useGameStore((s) => s.phase);
  const localHP = useGameStore((s) => s.localHP);
  const stats = useGameStore((s) => s.localStats);
  const mode = useGameStore((s) => s.mode);
  const enemy = useGameStore((s) => s.enemy);
  const resetBattle = useGameStore((s) => s.resetBattle);

  const addCoins = usePlayerStore((s) => s.addCoins);
  const addXp = usePlayerStore((s) => s.addXp);
  const applyEloDelta = usePlayerStore((s) => s.applyEloDelta);
  const recordWin = usePlayerStore((s) => s.recordWin);
  const recordLoss = usePlayerStore((s) => s.recordLoss);
  const markFighterDefeated = usePlayerStore((s) => s.markFighterDefeated);
  const unlockWorld = usePlayerStore((s) => s.unlockWorld);
  const mpCleanup = useMpStore((s) => s.cleanup);

  const isMp = mode === 'mp-ranked' || mode === 'mp-friend';
  const [granted, setGranted] = useState(false);
  const won = isMp
    ? localHP > 0
    : localHP > 0 && (stats.damageDealt > 0 || mode === 'solo-practice');

  const rewards = useMemo(() => {
    if (mode === 'solo-practice' || mode === 'mp-friend') return undefined;
    if (mode === 'singleplayer') {
      if (!enemy) return undefined;
      const baseCoins = enemy.kind === 'boss' ? 100 : enemy.kind === 'bodyguard' ? 50 : 25;
      const baseXp = enemy.kind === 'boss' ? 150 : enemy.kind === 'bodyguard' ? 75 : 40;
      return won
        ? { coins: baseCoins + enemy.level * 5, xp: baseXp + enemy.level * 10 }
        : { coins: 5, xp: 10 };
    }
    if (mode === 'mp-ranked') {
      const eloDelta = won ? 16 : -16;
      return won
        ? { coins: 50, xp: 100, eloDelta }
        : { coins: 10, xp: 30, eloDelta };
    }
    return undefined;
  }, [mode, won, enemy]);

  useEffect(() => {
    if (phase !== 'RESULTS') {
      navigate('/', { replace: true });
      return;
    }
    if (granted) return;
    setGranted(true);

    if (mode === 'singleplayer' && enemy && won) {
      markFighterDefeated(enemy.id);
      if (enemy.kind === 'boss' && enemy.worldId < 6) {
        unlockWorld(enemy.worldId + 1);
      }
    }
    if (rewards) {
      if (rewards.coins) addCoins(rewards.coins);
      if (rewards.xp) addXp(rewards.xp);
      if (rewards.eloDelta !== undefined) applyEloDelta(rewards.eloDelta);
    }
    if (mode === 'mp-ranked') {
      if (won) recordWin();
      else recordLoss();
    }
  }, [
    phase,
    granted,
    mode,
    enemy,
    won,
    rewards,
    addCoins,
    addXp,
    applyEloDelta,
    recordWin,
    recordLoss,
    markFighterDefeated,
    unlockWorld,
    navigate,
  ]);

  if (phase !== 'RESULTS') return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <ResultsCard
        won={won}
        stats={stats}
        rewards={rewards}
        onHome={() => {
          if (isMp) mpCleanup();
          resetBattle();
          navigate('/');
        }}
      />
    </div>
  );
}
