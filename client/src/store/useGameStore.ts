import { create } from 'zustand';
import type { QueuedWord } from '@/lib/game/wordPool';
import type { WeaponId } from '@/lib/game/secondaryWeapons';
import type { EnemyDef } from '@/lib/game/botAI';

export type BattlePhase = 'IDLE' | 'CONNECTING' | 'LOBBY' | 'COUNTDOWN' | 'BATTLE' | 'RESULTS';
export type BattleMode = 'solo-practice' | 'singleplayer' | 'mp-ranked' | 'mp-friend';
export type BattleResult = 'win' | 'loss' | 'draw';

export interface FloatingDamage {
  id: number;
  side: 'local' | 'opponent';
  amount: number;
  isHeavy?: boolean;
  isMiss?: boolean;
}

export interface BattleStats {
  damageDealt: number;
  damageTaken: number;
  wordsTyped: number;
  wordsFailed: number;
  bestStreak: number;
  correctChars: number;
  totalKeystrokes: number;
  durationMs: number;
}

interface GameStoreState {
  phase: BattlePhase;
  mode: BattleMode | null;
  seed: number | null;
  words: QueuedWord[];

  localHP: number;
  localMaxHP: number;
  opponentHP: number;
  opponentMaxHP: number;

  enemy: EnemyDef | null;
  opponentName: string;
  result: BattleResult | null;

  startedAt: number | null;
  damageNumbers: FloatingDamage[];
  damageNumberSeq: number;

  localStats: BattleStats;

  equippedWeapon: WeaponId | null;
  weaponCooldownEndsAt: number | null;
  weaponCastSeq: number;
  lastCastWeaponId: WeaponId | null;
  shieldActive: boolean;
  opponentEffects: { glitchUntil: number; letterDropUntil: number; slowUntil: number };

  setPhase: (p: BattlePhase) => void;
  startBattle: (cfg: {
    mode: BattleMode;
    seed: number;
    words: QueuedWord[];
    localMaxHP: number;
    opponentMaxHP: number;
    enemy?: EnemyDef | null;
    opponentName?: string;
    equippedWeapon?: WeaponId | null;
  }) => void;
  damageOpponent: (amount: number) => void;
  damageLocal: (amount: number, isHeavy?: boolean) => void;
  syncOpponentHP: (hp: number, maxHp: number) => void;
  pushFloatingDamage: (d: Omit<FloatingDamage, 'id'>) => void;
  clearFloatingDamage: (id: number) => void;
  recordWordResult: (correctChars: number, keystrokes: number, failed: boolean, bestStreak: number) => void;
  setWeaponCooldown: (endsAt: number | null) => void;
  triggerWeaponCast: (id: WeaponId) => void;
  applyOpponentEffect: (effect: 'glitch' | 'letterDrop' | 'slow', durationMs: number) => void;
  activateShield: () => void;
  consumeShield: () => boolean;
  finishBattle: (result?: BattleResult) => void;
  finishByHpComparison: () => void;
  resetBattle: () => void;
}

const emptyStats: BattleStats = {
  damageDealt: 0,
  damageTaken: 0,
  wordsTyped: 0,
  wordsFailed: 0,
  bestStreak: 0,
  correctChars: 0,
  totalKeystrokes: 0,
  durationMs: 0,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  phase: 'IDLE',
  mode: null,
  seed: null,
  words: [],
  localHP: 200,
  localMaxHP: 200,
  opponentHP: 200,
  opponentMaxHP: 200,
  enemy: null,
  opponentName: 'Opponent',
  result: null,
  startedAt: null,
  damageNumbers: [],
  damageNumberSeq: 0,
  localStats: { ...emptyStats },
  equippedWeapon: null,
  weaponCooldownEndsAt: null,
  weaponCastSeq: 0,
  lastCastWeaponId: null,
  shieldActive: false,
  opponentEffects: { glitchUntil: 0, letterDropUntil: 0, slowUntil: 0 },

  setPhase: (p) => set({ phase: p }),

  startBattle: (cfg) =>
    set({
      phase: 'COUNTDOWN',
      mode: cfg.mode,
      seed: cfg.seed,
      words: cfg.words,
      localHP: cfg.localMaxHP,
      localMaxHP: cfg.localMaxHP,
      opponentHP: cfg.opponentMaxHP,
      opponentMaxHP: cfg.opponentMaxHP,
      enemy: cfg.enemy ?? null,
      opponentName: cfg.opponentName ?? cfg.enemy?.name ?? 'Opponent',
      result: null,
      equippedWeapon: cfg.equippedWeapon ?? null,
      shieldActive: false,
      opponentEffects: { glitchUntil: 0, letterDropUntil: 0, slowUntil: 0 },
      startedAt: performance.now(),
      damageNumbers: [],
      localStats: { ...emptyStats },
    }),

  damageOpponent: (amount) => {
    const { opponentHP, mode } = get();
    const isMp = mode === 'mp-friend' || mode === 'mp-ranked';
    // In multiplayer the opponent owns their own HP: this is an optimistic
    // local prediction held just above zero, and the authoritative value
    // arrives via syncOpponentHP. Only that value can end the match.
    const minHp = isMp ? 1 : 0;
    const newHP = Math.max(minHp, opponentHP - amount);
    set((s) => ({
      opponentHP: newHP,
      localStats: { ...s.localStats, damageDealt: s.localStats.damageDealt + amount },
    }));
    if (amount > 0) {
      get().pushFloatingDamage({ side: 'opponent', amount });
    }
    if (!isMp && newHP <= 0) get().finishBattle('win');
  },

  damageLocal: (amount, isHeavy) => {
    let dmg = amount;
    if (get().consumeShield()) dmg = Math.round(dmg * 0.5);
    const { localHP } = get();
    const newHP = Math.max(0, localHP - dmg);
    set((s) => ({
      localHP: newHP,
      localStats: { ...s.localStats, damageTaken: s.localStats.damageTaken + dmg },
    }));
    if (dmg > 0) {
      get().pushFloatingDamage({ side: 'local', amount: dmg, isHeavy });
    }
    if (newHP <= 0) get().finishBattle('loss');
  },

  syncOpponentHP: (hp, maxHp) => {
    if (get().phase === 'RESULTS') return;
    set({ opponentHP: Math.max(0, hp), opponentMaxHP: maxHp });
    if (hp <= 0) get().finishBattle('win');
  },

  pushFloatingDamage: (d) =>
    set((s) => ({
      damageNumberSeq: s.damageNumberSeq + 1,
      damageNumbers: [...s.damageNumbers, { ...d, id: s.damageNumberSeq + 1 }],
    })),

  clearFloatingDamage: (id) =>
    set((s) => ({ damageNumbers: s.damageNumbers.filter((d) => d.id !== id) })),

  recordWordResult: (correctChars, keystrokes, failed, bestStreak) =>
    set((s) => ({
      localStats: {
        ...s.localStats,
        wordsTyped: s.localStats.wordsTyped + 1,
        wordsFailed: s.localStats.wordsFailed + (failed ? 1 : 0),
        correctChars: s.localStats.correctChars + correctChars,
        totalKeystrokes: s.localStats.totalKeystrokes + keystrokes,
        bestStreak: Math.max(s.localStats.bestStreak, bestStreak),
      },
    })),

  setWeaponCooldown: (endsAt) => set({ weaponCooldownEndsAt: endsAt }),

  triggerWeaponCast: (id) =>
    set((s) => ({ weaponCastSeq: s.weaponCastSeq + 1, lastCastWeaponId: id })),

  applyOpponentEffect: (effect, durationMs) => {
    const until = performance.now() + durationMs;
    set((s) => {
      const eff = { ...s.opponentEffects };
      if (effect === 'glitch') eff.glitchUntil = until;
      if (effect === 'letterDrop') eff.letterDropUntil = until;
      if (effect === 'slow') eff.slowUntil = until;
      return { opponentEffects: eff };
    });
  },

  activateShield: () => set({ shieldActive: true }),

  consumeShield: () => {
    const active = get().shieldActive;
    if (active) set({ shieldActive: false });
    return active;
  },

  finishBattle: (result) => {
    const s = get();
    if (s.phase === 'RESULTS') return;
    const duration = s.startedAt ? performance.now() - s.startedAt : 0;
    set({
      phase: 'RESULTS',
      result: result ?? s.result ?? (s.localHP > 0 ? 'win' : 'loss'),
      localStats: { ...s.localStats, durationMs: duration },
    });
  },

  // The word list is a round limit, not the win condition. If it runs out with
  // both mages still standing, the healthier one takes the round.
  finishByHpComparison: () => {
    const s = get();
    if (s.phase === 'RESULTS') return;
    const localPct = s.localMaxHP > 0 ? s.localHP / s.localMaxHP : 0;
    const oppPct = s.opponentMaxHP > 0 ? s.opponentHP / s.opponentMaxHP : 0;
    const result =
      localPct > oppPct ? 'win' : localPct < oppPct ? 'loss' : 'draw';
    get().finishBattle(result);
  },

  resetBattle: () =>
    set({
      phase: 'IDLE',
      mode: null,
      seed: null,
      words: [],
      localHP: 200,
      localMaxHP: 200,
      opponentHP: 200,
      opponentMaxHP: 200,
      enemy: null,
      opponentName: 'Opponent',
      result: null,
      startedAt: null,
      damageNumbers: [],
      localStats: { ...emptyStats },
      equippedWeapon: null,
      weaponCooldownEndsAt: null,
      weaponCastSeq: 0,
      lastCastWeaponId: null,
      shieldActive: false,
      opponentEffects: { glitchUntil: 0, letterDropUntil: 0, slowUntil: 0 },
    }),
}));
