import type { EnemyDef, EnemyKind } from '@/lib/game/botAI';
import { mulberry32, pick } from '@/lib/utils/seededRandom';

/**
 * Opponents for the two endless/ladder modes. Campaign fighters live in
 * enemies.ts and are hand-authored; these are generated from a seed so a run
 * can be replayed, shared, and rebuilt after a reload without storing rosters.
 */

const TITLES = [
  'Wandering', 'Ashen', 'Silent', 'Crimson', 'Hollow', 'Gilded', 'Grim',
  'Pale', 'Storm', 'Iron', 'Vile', 'Radiant', 'Cursed', 'Feral', 'Runed',
] as const;

const NAMES = [
  'Duelist', 'Scribe', 'Warden', 'Acolyte', 'Reaver', 'Hexer', 'Marauder',
  'Sentinel', 'Oracle', 'Bladewright', 'Nomad', 'Inquisitor', 'Revenant',
] as const;

const SPRITES = [
  '🧙', '🧝', '🥷', '🧟', '👹', '👺', '🦹', '🧛', '🧞', '🐉', '🦂', '🕷',
  '⚔️', '🗡', '🪄', '🔮', '👻', '🤖', '🦅', '🐺',
] as const;

const FLAVORS = [
  'Has never lost a duel they cared about.',
  'Types in a language no one else remembers.',
  'Counts your mistakes out loud.',
  'Was champion here, once.',
  'Fights only to stay warm.',
  'Claims to have read every word there is.',
  'Does not blink.',
  'Smells faintly of burnt parchment.',
  'Older than the arena floor.',
  'Wagered everything to be here.',
] as const;

function nameFor(rand: () => number): string {
  return `${pick(rand, TITLES)} ${pick(rand, NAMES)}`;
}

/** Every 10th wave is a boss, every 5th a bodyguard — the rest are regulars. */
export function survivalKindForWave(wave: number): EnemyKind {
  if (wave % 10 === 0) return 'boss';
  if (wave % 5 === 0) return 'bodyguard';
  return 'normal';
}

/**
 * Difficulty climbs about one level per wave and never plateaus, so every run
 * ends eventually — the question is only how deep you get.
 */
export function survivalLevelForWave(wave: number): number {
  return 1 + Math.floor((wave - 1) * 1.15);
}

export function survivalOpponent(runSeed: number, wave: number): EnemyDef {
  const rand = mulberry32(runSeed + wave * 7919);
  const kind = survivalKindForWave(wave);
  const base = nameFor(rand);
  return {
    id: `surv-${runSeed}-${wave}`,
    name: kind === 'boss' ? `${base} the Undying` : base,
    kind,
    level: survivalLevelForWave(wave),
    worldId: 0,
    sprite: pick(rand, SPRITES),
    flavor: pick(rand, FLAVORS),
  };
}

export const TOURNAMENT_SIZE = 8;

export interface TournamentTier {
  id: number;
  name: string;
  entryFee: number;
  prizeCoins: number;
  prizeXp: number;
}

/** Tier N draws on world N, so the ladder opens up as the campaign does. */
export const TOURNAMENT_TIERS: TournamentTier[] = [
  { id: 1, name: 'Bronze Circuit', entryFee: 0, prizeCoins: 250, prizeXp: 300 },
  { id: 2, name: 'Iron Circuit', entryFee: 50, prizeCoins: 500, prizeXp: 500 },
  { id: 3, name: 'Silver Circuit', entryFee: 120, prizeCoins: 900, prizeXp: 750 },
  { id: 4, name: 'Gold Circuit', entryFee: 250, prizeCoins: 1600, prizeXp: 1100 },
  { id: 5, name: 'Astral Circuit', entryFee: 450, prizeCoins: 2800, prizeXp: 1600 },
  { id: 6, name: 'Eternal Circuit', entryFee: 800, prizeCoins: 5000, prizeXp: 2400 },
];

export function getTournamentTier(id: number): TournamentTier | undefined {
  return TOURNAMENT_TIERS.find((t) => t.id === id);
}

/**
 * The ladder is ordered weakest-first: you enter at the bottom rank and climb,
 * so the final opponent is the reigning champion.
 */
export function tournamentLadder(tierId: number, seed: number): EnemyDef[] {
  const rand = mulberry32(seed);
  const floor = 1 + (tierId - 1) * 4;
  const used = new Set<string>();
  const ladder: EnemyDef[] = [];

  for (let i = 0; i < TOURNAMENT_SIZE; i++) {
    let name = nameFor(rand);
    for (let guard = 0; guard < 12 && used.has(name); guard++) name = nameFor(rand);
    used.add(name);

    const isChampion = i === TOURNAMENT_SIZE - 1;
    const isRunnerUp = i === TOURNAMENT_SIZE - 2;
    ladder.push({
      id: `tour-${tierId}-${i}`,
      name: isChampion ? `${name}, Champion` : name,
      kind: isChampion ? 'boss' : isRunnerUp ? 'bodyguard' : 'normal',
      level: floor + i,
      worldId: 0,
      sprite: pick(rand, SPRITES),
      flavor: pick(rand, FLAVORS),
    });
  }
  return ladder;
}
