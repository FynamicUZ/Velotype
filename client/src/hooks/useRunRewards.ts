import { useEffect } from 'react';
import { useRunStore } from '@/store/useRunStore';
import { usePlayerStore } from '@/store/usePlayerStore';

/**
 * Moves coins and XP banked by a run onto the player profile. The run store
 * zeroes the balance as it hands it over, so paying out twice is impossible
 * even if this runs again.
 */
export function useRunRewards(): void {
  const pending = useRunStore((s) => s.unclaimedCoins + s.unclaimedXp);
  const claimRewards = useRunStore((s) => s.claimRewards);
  const addCoins = usePlayerStore((s) => s.addCoins);
  const addXp = usePlayerStore((s) => s.addXp);

  useEffect(() => {
    if (pending <= 0) return;
    const { coins, xp } = claimRewards();
    if (coins > 0) addCoins(coins);
    if (xp > 0) addXp(xp);
  }, [pending, claimRewards, addCoins, addXp]);
}
