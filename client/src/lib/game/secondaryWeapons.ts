export type WeaponId = 'glitch' | 'letterDrop' | 'slowCurse' | 'shield';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  description: string;
  icon: string;
  effectMs: number;
  cooldownMs: number;
  pricePerPack: { count: number; coins: number }[];
  color: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  glitch: {
    id: 'glitch',
    name: 'Glitch',
    description: "Distort opponent's word display for 4s",
    icon: '⚡',
    effectMs: 4000,
    cooldownMs: 30_000,
    pricePerPack: [
      { count: 3, coins: 60 },
      { count: 10, coins: 180 },
    ],
    color: 'text-arcane-cyan',
  },
  letterDrop: {
    id: 'letterDrop',
    name: 'Letter Drop',
    description: "Hide random letters in opponent's words for 6s",
    icon: '👁',
    effectMs: 6000,
    cooldownMs: 35_000,
    pricePerPack: [
      { count: 3, coins: 75 },
      { count: 10, coins: 220 },
    ],
    color: 'text-arcane-violet',
  },
  slowCurse: {
    id: 'slowCurse',
    name: 'Slow Curse',
    description: "Shrink opponent's word timeout by 30% for 8s",
    icon: '🕸',
    effectMs: 8000,
    cooldownMs: 40_000,
    pricePerPack: [
      { count: 3, coins: 90 },
      { count: 10, coins: 250 },
    ],
    color: 'text-arcane-rose',
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    description: 'Reduce next damage taken by 50%',
    icon: '🛡',
    effectMs: 0,
    cooldownMs: 25_000,
    pricePerPack: [
      { count: 3, coins: 50 },
      { count: 10, coins: 150 },
    ],
    color: 'text-arcane-gold',
  },
};

export const ALL_WEAPONS: WeaponDef[] = Object.values(WEAPONS);

export function getWeapon(id: WeaponId): WeaponDef {
  return WEAPONS[id];
}
