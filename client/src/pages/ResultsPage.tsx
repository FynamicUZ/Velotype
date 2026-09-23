import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResultsCard } from '@/components/ResultsCard';
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

  if (phase !== 'RESULTS') return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <ResultsCard
        won={won}
        draw={draw}
        stats={stats}
        rewards={rewards}
        onPlayAgain={
          canRematch
            ? () => {
                mpSend({ type: 'rematch' });
                backToLobby();
              }
            : undefined
        }
        onHome={() => {
          if (isMp) mpCleanup();
          resetBattle();
          navigate('/');
        }}
      />
      {isMp && !canRematch && (
        <p className="text-sm text-white/50">Your opponent left the room.</p>
      )}
    </div>
  );
}
