import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResultsCard, type ResultsAction } from '@/components/ResultsCard';
import { getWorld, nextFightInWorld } from '@/lib/game/enemies';
import { useGameStore } from '@/store/useGameStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMpStore } from '@/store/useMpStore';

export default function ResultsPage() {
  const navigate = useNavigate();
  const phase = useGameStore((s) => s.phase);
  const localHP = useGameStore((s) => s.localHP);
  const result = useGameStore((s) => s.result);
  const stats = useGameStore((s) => s.localStats);
  const mode = useGameStore((s) => s.mode);
  const enemy = useGameStore((s) => s.enemy);
  const resetBattle = useGameStore((s) => s.resetBattle);

  const profile = usePlayerStore((s) => s.profile);
  const addCoins = usePlayerStore((s) => s.addCoins);
  const addXp = usePlayerStore((s) => s.addXp);
  const applyEloDelta = usePlayerStore((s) => s.applyEloDelta);
  const recordWin = usePlayerStore((s) => s.recordWin);
  const recordLoss = usePlayerStore((s) => s.recordLoss);
  const markFighterDefeated = usePlayerStore((s) => s.markFighterDefeated);
  const unlockWorld = usePlayerStore((s) => s.unlockWorld);
  const mpCleanup = useMpStore((s) => s.cleanup);
  const mpReturnToLobby = useMpStore((s) => s.returnToLobby);
  const mpOnMessage = useMpStore((s) => s.onMessage);
  const mpGoInGame = useMpStore((s) => s.goInGame);
  const mpPeerInfo = useMpStore((s) => s.peerInfo);
  const mpSend = useMpStore((s) => s.send);
  const mpStatus = useMpStore((s) => s.status);
  const mpChannel = useMpStore((s) => s.channel);

  const isMp = mode === 'mp-ranked' || mode === 'mp-friend';
  const [granted, setGranted] = useState(false);
  const won = isMp
    ? result === 'win'
    : localHP > 0 && (stats.damageDealt > 0 || mode === 'solo-practice');
  const draw = isMp && result === 'draw';
  // The room only survives while the peer link does.
  const canRematch = isMp && mpChannel !== null && mpStatus !== 'closed';

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
      if (draw) return { coins: 25, xp: 60, eloDelta: 0 };
      const eloDelta = won ? 16 : -16;
      return won
        ? { coins: 50, xp: 100, eloDelta }
        : { coins: 10, xp: 30, eloDelta };
    }
    return undefined;
  }, [mode, won, draw, enemy]);

  // Landing here without a finished battle means the page was opened directly.
  // Checked once on mount: later the battle is cleared on the way out, and that
  // must not bounce us to the front page.
  useEffect(() => {
    if (useGameStore.getState().phase !== 'RESULTS') navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (phase !== 'RESULTS') return;
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
    if (mode === 'mp-ranked' && !draw) {
      if (won) recordWin();
      else recordLoss();
    }
  }, [
    phase,
    granted,
    mode,
    enemy,
    won,
    draw,
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

  const backToLobby = useCallback(() => {
    resetBattle();
    mpReturnToLobby();
    navigate('/play', { replace: true });
  }, [resetBattle, mpReturnToLobby, navigate]);

  // The opponent may still be reading their own results when the rematch
  // starts, so follow them back to the room — or straight into the next round.
  useEffect(() => {
    if (!isMp) return;
    return mpOnMessage((m) => {
      if (m.type === 'rematch') {
        backToLobby();
      } else if (m.type === 'start') {
            resetBattle();
        mpGoInGame();
        navigate('/battle', {
          state: {
            mode: mode === 'mp-ranked' ? 'mp-ranked' : 'mp-friend',
            seed: m.seed,
            totalWords: m.totalWords,
            opponentName: mpPeerInfo?.name ?? 'Opponent',
            opponentInfo: mpPeerInfo,
          },
          replace: true,
        });
      }
    });
  }, [
    isMp,
    mpOnMessage,
    backToLobby,
    resetBattle,
    mpGoInGame,
    navigate,
    mode,
    mpPeerInfo,
  ]);

  const goHome = useCallback(() => {
    if (isMp) mpCleanup();
    resetBattle();
    navigate('/');
  }, [isMp, mpCleanup, resetBattle, navigate]);

  // Where a fight lets out depends on where it started: a campaign fight
  // returns to its world, not to the front page.
  const actions = useMemo<ResultsAction[]>(() => {
    if (isMp) {
      const list: ResultsAction[] = [];
      if (canRematch) {
        list.push({
          label: '⚔️ Rematch',
          variant: 'primary',
          onClick: () => {
            mpSend({ type: 'rematch' });
            backToLobby();
          },
        });
      }
      list.push({ label: 'Home', onClick: goHome });
      return list;
    }

    if (mode === 'singleplayer' && enemy) {
      const world = getWorld(enemy.worldId);
      const list: ResultsAction[] = [];
      const defeated = won
        ? [...profile.spProgress.defeatedFighters, enemy.id]
        : profile.spProgress.defeatedFighters;
      const next = world ? nextFightInWorld(world, defeated, enemy.id) : undefined;

      const startFight = (enemyId: string) => {
            resetBattle();
        navigate('/battle', { state: { mode: 'singleplayer', enemyId }, replace: true });
      };

      if (won && next) {
        list.push({
          label: `Next: ${next.name}`,
          variant: 'primary',
          onClick: () => startFight(next.id),
        });
      }
      if (!won) {
        list.push({
          label: '⚔️ Try Again',
          variant: 'primary',
          onClick: () => startFight(enemy.id),
        });
      }
      if (world) {
        list.push({
          label: `← ${world.name}`,
          variant: won && next ? 'secondary' : 'primary',
          onClick: () => {
                    resetBattle();
            navigate(`/sp/world/${world.id}`, { replace: true });
          },
        });
      }
      list.push({ label: 'Home', variant: 'ghost', onClick: goHome });
      return list;
    }

    if (mode === 'solo-practice') {
      return [
        {
          label: '↻ Practice Again',
          variant: 'primary',
          onClick: () => {
                    resetBattle();
            navigate('/battle', { state: { mode: 'solo-practice' }, replace: true });
          },
        },
        { label: 'Home', onClick: goHome },
      ];
    }

    return [{ label: 'Home', onClick: goHome }];
  }, [
    isMp,
    canRematch,
    mpSend,
    backToLobby,
    goHome,
    mode,
    enemy,
    won,
    profile.spProgress.defeatedFighters,
    resetBattle,
    navigate,
  ]);

  if (phase !== 'RESULTS') return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <ResultsCard
        won={won}
        draw={draw}
        stats={stats}
        rewards={rewards}
        actions={actions}
      />
      {isMp && !canRematch && (
        <p className="text-sm text-white/50">Your opponent left the room.</p>
      )}
    </div>
  );
}
