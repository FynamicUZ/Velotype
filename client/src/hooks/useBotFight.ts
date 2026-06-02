import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getBotAttackDamage, getBotAttackInterval } from '@/lib/game/botAI';
import type { EnemyDef } from '@/lib/game/botAI';

export function useBotFight(enemy: EnemyDef | null, active: boolean) {
  const damageLocal = useGameStore((s) => s.damageLocal);
  const opponentMaxHP = useGameStore((s) => s.opponentMaxHP);
  const opponentHP = useGameStore((s) => s.opponentHP);
  const localHP = useGameStore((s) => s.localHP);

  const timeoutRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (!active || !enemy || enemy.kind === 'dummy') return;
    if (localHP <= 0 || opponentHP <= 0) return;

    const hpPct = opponentHP / Math.max(opponentMaxHP, 1);
    const interval = getBotAttackInterval(enemy.level, enemy.kind, hpPct);

    timeoutRef.current = window.setTimeout(() => {
      if (cancelledRef.current) return;
      const attack = getBotAttackDamage(enemy.level, enemy.kind);
      if (attack.delayMs > 0) {
        window.setTimeout(() => {
          if (!cancelledRef.current) damageLocal(attack.damage, attack.isHeavy);
        }, attack.delayMs);
      } else {
        damageLocal(attack.damage, attack.isHeavy);
      }
    }, interval);

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [active, enemy, opponentHP, opponentMaxHP, localHP, damageLocal]);
}
