import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EnemyDef } from '@/lib/game/botAI';
import {
  TOURNAMENT_SIZE,
  getTournamentTier,
  survivalOpponent,
  tournamentLadder,
} from '@/lib/game/runOpponents';
import { randomSeed } from '@/lib/utils/seededRandom';

/** Fraction of max HP handed back after clearing a survival wave. */
export const SURVIVAL_WAVE_HEAL = 0.12;
/** Rounds needed to take a tournament match — best of three. */
export const ROUNDS_TO_WIN = 2;

export type RunStatus = 'ready' | 'over' | 'champion';

export interface SurvivalRun {
  seed: number;
  wave: number;
  hp: number;
  maxHp: number;
  wavesCleared: number;
  coinsEarned: number;
  xpEarned: number;
  status: RunStatus;
  lastOutcome: 'win' | 'loss' | null;
  lastHeal: number;
}

export interface TournamentRun {
  seed: number;
  tierId: number;
  index: number;
  roundsWon: number;
  roundsLost: number;
  matchesWon: number;
  status: RunStatus;
  lastRoundOutcome: 'win' | 'loss' | null;
  /** Set only on the round that decides a match, so the page can celebrate it. */
  lastMatchOutcome: 'win' | 'loss' | null;
}

interface RunStoreState {
  survival: SurvivalRun | null;
  tournament: TournamentRun | null;
  /** Rewards banked by the run but not yet written to the player profile. */
  unclaimedCoins: number;
  unclaimedXp: number;
  bestWave: number;
  titlesWon: number[];

  startSurvival: (maxHp: number) => void;
  resolveSurvivalWave: (won: boolean, hpLeft: number) => void;
  endSurvival: () => void;

  startTournament: (tierId: number) => void;
  resolveTournamentRound: (won: boolean) => void;
  endTournament: () => void;

  claimRewards: () => { coins: number; xp: number };
}

export function survivalWaveReward(wave: number): { coins: number; xp: number } {
  return { coins: 10 + wave * 5, xp: 15 + wave * 5 };
}

export const useRunStore = create<RunStoreState>()(
  persist(
    (set, get) => ({
      survival: null,
      tournament: null,
      unclaimedCoins: 0,
      unclaimedXp: 0,
      bestWave: 0,
      titlesWon: [],

      startSurvival: (maxHp) =>
        set({
          survival: {
            seed: randomSeed(),
            wave: 1,
            hp: maxHp,
            maxHp,
            wavesCleared: 0,
            coinsEarned: 0,
            xpEarned: 0,
            status: 'ready',
            lastOutcome: null,
            lastHeal: 0,
          },
        }),

      resolveSurvivalWave: (won, hpLeft) => {
        const run = get().survival;
        if (!run || run.status !== 'ready') return;

        if (!won) {
          set({
            survival: { ...run, hp: 0, status: 'over', lastOutcome: 'loss', lastHeal: 0 },
          });
          return;
        }

        // A sliver of health back per wave — enough to keep a good run alive,
        // never enough to undo the damage of a bad one.
        const heal = Math.round(run.maxHp * SURVIVAL_WAVE_HEAL);
        const healed = Math.min(run.maxHp, Math.max(1, hpLeft) + heal);
        const reward = survivalWaveReward(run.wave);

        set((s) => ({
          survival: {
            ...run,
            wave: run.wave + 1,
            hp: healed,
            wavesCleared: run.wavesCleared + 1,
            coinsEarned: run.coinsEarned + reward.coins,
            xpEarned: run.xpEarned + reward.xp,
            status: 'ready',
            lastOutcome: 'win',
            lastHeal: healed - Math.max(1, hpLeft),
          },
          unclaimedCoins: s.unclaimedCoins + reward.coins,
          unclaimedXp: s.unclaimedXp + reward.xp,
          bestWave: Math.max(s.bestWave, run.wave),
        }));
      },

      endSurvival: () => set({ survival: null }),

      startTournament: (tierId) =>
        set({
          tournament: {
            seed: randomSeed(),
            tierId,
            index: 0,
            roundsWon: 0,
            roundsLost: 0,
            matchesWon: 0,
            status: 'ready',
            lastRoundOutcome: null,
            lastMatchOutcome: null,
          },
        }),

      resolveTournamentRound: (won) => {
        const run = get().tournament;
        if (!run || run.status !== 'ready') return;

        const roundsWon = run.roundsWon + (won ? 1 : 0);
        const roundsLost = run.roundsLost + (won ? 0 : 1);

        // The match is still open until someone takes two rounds.
        if (roundsWon < ROUNDS_TO_WIN && roundsLost < ROUNDS_TO_WIN) {
          set({
            tournament: {
              ...run,
              roundsWon,
              roundsLost,
              lastRoundOutcome: won ? 'win' : 'loss',
              lastMatchOutcome: null,
            },
          });
          return;
        }

        if (roundsLost >= ROUNDS_TO_WIN) {
          set({
            tournament: {
              ...run,
              roundsWon,
              roundsLost,
              status: 'over',
              lastRoundOutcome: 'loss',
              lastMatchOutcome: 'loss',
            },
          });
          return;
        }

        const matchesWon = run.matchesWon + 1;
        const isChampion = run.index + 1 >= TOURNAMENT_SIZE;
        const tier = getTournamentTier(run.tierId);

        set((s) => ({
          tournament: {
            ...run,
            index: run.index + 1,
            roundsWon: 0,
            roundsLost: 0,
            matchesWon,
            status: isChampion ? 'champion' : 'ready',
            lastRoundOutcome: 'win',
            lastMatchOutcome: 'win',
          },
          unclaimedCoins: s.unclaimedCoins + (isChampion && tier ? tier.prizeCoins : 0),
          unclaimedXp: s.unclaimedXp + (isChampion && tier ? tier.prizeXp : 0),
          titlesWon:
            isChampion && !s.titlesWon.includes(run.tierId)
              ? [...s.titlesWon, run.tierId]
              : s.titlesWon,
        }));
      },

      endTournament: () => set({ tournament: null }),

      claimRewards: () => {
        const { unclaimedCoins, unclaimedXp } = get();
        if (unclaimedCoins === 0 && unclaimedXp === 0) return { coins: 0, xp: 0 };
        set({ unclaimedCoins: 0, unclaimedXp: 0 });
        return { coins: unclaimedCoins, xp: unclaimedXp };
      },
    }),
    { name: 'velotype-run-v1' },
  ),
);

/** The opponent the active survival run is about to face. */
export function currentSurvivalOpponent(run: SurvivalRun): EnemyDef {
  return survivalOpponent(run.seed, run.wave);
}

export function currentTournamentLadder(run: TournamentRun): EnemyDef[] {
  return tournamentLadder(run.tierId, run.seed);
}

export function currentTournamentOpponent(run: TournamentRun): EnemyDef | undefined {
  return currentTournamentLadder(run)[run.index];
}
