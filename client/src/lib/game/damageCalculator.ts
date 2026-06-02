import type { WordTier } from '@/assets/words/wordlist';
import { optimalTimeForWord } from '@/lib/game/wordPool';

export interface DamageInput {
  word: string;
  tier: WordTier;
  actualTimeMs: number;
  correctChars: number;
  totalKeystrokes: number;
  streak: number;
  playerLevel?: number;
}

export interface DamageResult {
  damage: number;
  parts: {
    base: number;
    complexityMult: number;
    speedMult: number;
    accuracyMult: number;
    streakMult: number;
    levelMult: number;
  };
}

const BASE_DAMAGE = 10;

export function calculateDamage(input: DamageInput): DamageResult {
  const optimalMs = optimalTimeForWord(input.word);
  const complexityMult = 1.0 + (input.tier - 1) * 0.3;
  const speedMult = clamp(optimalMs / Math.max(input.actualTimeMs, 1), 0.5, 2.0);
  const accuracyMult =
    input.totalKeystrokes > 0 ? input.correctChars / input.totalKeystrokes : 1.0;
  const streakMult = 1.0 + Math.min(input.streak, 10) * 0.1;
  const levelMult = input.playerLevel ? 1 + input.playerLevel * 0.05 : 1;

  const damage = Math.round(
    BASE_DAMAGE * complexityMult * speedMult * accuracyMult * streakMult * levelMult,
  );

  return {
    damage,
    parts: { base: BASE_DAMAGE, complexityMult, speedMult, accuracyMult, streakMult, levelMult },
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
