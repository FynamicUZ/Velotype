export type EnemyKind = 'normal' | 'bodyguard' | 'boss' | 'dummy';

export interface EnemyDef {
  id: string;
  name: string;
  kind: EnemyKind;
  level: number;
  worldId: number;
  sprite: string;
  flavor: string;
}

export interface BotAttack {
  damage: number;
  isHeavy: boolean;
  delayMs: number;
}

export function getBotAttackInterval(level: number, kind: EnemyKind, hpPct: number): number {
  if (kind === 'dummy') return 999_999_999;
  const base = 3000;
  const minInterval = 800;
  const variance = 0.4;
  let interval = Math.max(minInterval, base - (level - 1) * 150);
  if (kind === 'boss' && hpPct <= 0.5) interval *= 0.7;
  if (kind === 'bodyguard') interval *= 0.9;
  return interval * (1 - variance / 2 + Math.random() * variance);
}

export function getBotAttackDamage(level: number, kind: EnemyKind): BotAttack {
  if (kind === 'dummy') return { damage: 0, isHeavy: false, delayMs: 0 };
  const base = 8 + level * 2;
  const variance = 0.3;
  let damage = Math.round(base * (1 - variance / 2 + Math.random() * variance));
  let isHeavy = false;
  if (kind === 'boss' && Math.random() < 0.18) {
    damage = Math.round(damage * 2.5);
    isHeavy = true;
  } else if (kind === 'bodyguard' && Math.random() < 0.1) {
    damage = Math.round(damage * 1.8);
    isHeavy = true;
  }
  return { damage, isHeavy, delayMs: isHeavy ? 700 : 0 };
}

export function getEnemyHP(level: number, kind: EnemyKind): number {
  const base = 50 + level * 30;
  if (kind === 'dummy') return 99999;
  if (kind === 'boss') return Math.round(base * 1.8);
  if (kind === 'bodyguard') return Math.round(base * 1.3);
  return base;
}
