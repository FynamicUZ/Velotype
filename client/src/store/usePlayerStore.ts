import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeaponId } from '@/lib/game/secondaryWeapons';

export interface PlayerProfile {
  uid: string | null;
  displayName: string;
  username: string | null;
  photoURL: string | null;
  elo: number;
  level: number;
  xp: number;
  coins: number;
  inventory: Partial<Record<WeaponId, number>>;
  equippedWeapon: WeaponId | null;
  cosmetics: { wand: string; hat: string; particles: string };
  ownedCosmetics: string[];
  stats: { wins: number; losses: number; totalMatches: number };
  spProgress: { worldsUnlocked: number; defeatedFighters: string[] };
  createdAt: number;
}

const FREE_COSMETICS = ['oak', 'apprentice', 'spark'];

export const defaultProfile: PlayerProfile = {
  uid: null,
  displayName: 'Apprentice',
  username: null,
  photoURL: null,
  elo: 1000,
  level: 1,
  xp: 0,
  coins: 0,
  inventory: { glitch: 20, letterDrop: 20, slowCurse: 20, shield: 20 },
  equippedWeapon: 'glitch',
  cosmetics: { wand: 'oak', hat: 'apprentice', particles: 'spark' },
  ownedCosmetics: [...FREE_COSMETICS],
  stats: { wins: 0, losses: 0, totalMatches: 0 },
  spProgress: { worldsUnlocked: 1, defeatedFighters: [] },
  createdAt: Date.now(),
};

const XP_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

export function levelForXp(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= (XP_THRESHOLDS[i] ?? 0)) return i + 1;
  }
  return 1;
}

export function xpForNextLevel(level: number): number {
  return XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1] ?? 9999;
}

interface PlayerStoreState {
  profile: PlayerProfile;
  setProfile: (p: Partial<PlayerProfile>) => void;
  addCoins: (n: number) => void;
  addXp: (n: number) => void;
  applyEloDelta: (delta: number) => void;
  recordWin: () => void;
  recordLoss: () => void;
  consumeWeapon: (id: WeaponId) => boolean;
  addToInventory: (id: WeaponId, count: number) => void;
  equipWeapon: (id: WeaponId | null) => void;
  setCosmetic: (slot: keyof PlayerProfile['cosmetics'], value: string) => void;
  ownCosmetic: (id: string) => void;
  markFighterDefeated: (id: string) => void;
  unlockWorld: (worldId: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerStoreState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      addCoins: (n) =>
        set((s) => ({ profile: { ...s.profile, coins: Math.max(0, s.profile.coins + n) } })),
      addXp: (n) =>
        set((s) => {
          const xp = s.profile.xp + n;
          const level = levelForXp(xp);
          return { profile: { ...s.profile, xp, level } };
        }),
      applyEloDelta: (delta) =>
        set((s) => ({ profile: { ...s.profile, elo: Math.max(0, s.profile.elo + delta) } })),
      recordWin: () =>
        set((s) => ({
          profile: {
            ...s.profile,
            stats: {
              wins: s.profile.stats.wins + 1,
              losses: s.profile.stats.losses,
              totalMatches: s.profile.stats.totalMatches + 1,
            },
          },
        })),
      recordLoss: () =>
        set((s) => ({
          profile: {
            ...s.profile,
            stats: {
              wins: s.profile.stats.wins,
              losses: s.profile.stats.losses + 1,
              totalMatches: s.profile.stats.totalMatches + 1,
            },
          },
        })),
      consumeWeapon: (id) => {
        const inv = get().profile.inventory;
        const count = inv[id] ?? 0;
        if (count <= 0) return false;
        set((s) => ({
          profile: { ...s.profile, inventory: { ...s.profile.inventory, [id]: count - 1 } },
        }));
        return true;
      },
      addToInventory: (id, count) =>
        set((s) => ({
          profile: {
            ...s.profile,
            inventory: { ...s.profile.inventory, [id]: (s.profile.inventory[id] ?? 0) + count },
          },
        })),
      equipWeapon: (id) => set((s) => ({ profile: { ...s.profile, equippedWeapon: id } })),
      setCosmetic: (slot, value) =>
        set((s) => ({
          profile: { ...s.profile, cosmetics: { ...s.profile.cosmetics, [slot]: value } },
        })),
      ownCosmetic: (id) =>
        set((s) => {
          if (s.profile.ownedCosmetics.includes(id)) return s;
          return {
            profile: { ...s.profile, ownedCosmetics: [...s.profile.ownedCosmetics, id] },
          };
        }),
      markFighterDefeated: (id) =>
        set((s) => {
          if (s.profile.spProgress.defeatedFighters.includes(id)) return s;
          return {
            profile: {
              ...s.profile,
              spProgress: {
                ...s.profile.spProgress,
                defeatedFighters: [...s.profile.spProgress.defeatedFighters, id],
              },
            },
          };
        }),
      unlockWorld: (worldId) =>
        set((s) => ({
          profile: {
            ...s.profile,
            spProgress: {
              ...s.profile.spProgress,
              worldsUnlocked: Math.max(s.profile.spProgress.worldsUnlocked, worldId),
            },
          },
        })),
      reset: () => set({ profile: defaultProfile }),
    }),
    { name: 'velotype-player-v2' },
  ),
);
