import { getTierWords, type WordTier } from '@/assets/words/wordlist';
import { mulberry32, pick } from '@/lib/utils/seededRandom';

export interface QueuedWord {
  text: string;
  tier: WordTier;
  index: number;
}

interface RampConfig {
  totalWords: number;
  levelOffset: number;
}

function tierForProgress(progress: number, levelOffset: number): WordTier {
  const shift = Math.min(2, Math.floor(levelOffset / 5));
  let baseTier: number;
  if (progress < 0.2) baseTier = 1;
  else if (progress < 0.5) baseTier = 2;
  else if (progress < 0.8) baseTier = 3;
  else if (progress < 0.95) baseTier = 4;
  else baseTier = 5;
  const tier = Math.max(1, Math.min(5, baseTier + shift));
  return tier as WordTier;
}

export function generateWordSequence(
  seed: number,
  config: RampConfig,
): QueuedWord[] {
  const rand = mulberry32(seed);
  const words: QueuedWord[] = [];
  for (let i = 0; i < config.totalWords; i++) {
    const progress = i / config.totalWords;
    const tier = tierForProgress(progress, config.levelOffset);
    const pool = getTierWords(tier);
    const text = pick(rand, pool);
    words.push({ text, tier, index: i });
  }
  return words;
}

export function optimalTimeForWord(text: string): number {
  const baseTime = 1500;
  const perCharTime = 300;
  return baseTime + text.length * perCharTime;
}
