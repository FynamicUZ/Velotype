export interface StreakState {
  current: number;
  best: number;
}

export function initStreak(): StreakState {
  return { current: 0, best: 0 };
}

export function incrementStreak(s: StreakState): StreakState {
  const current = s.current + 1;
  return { current, best: Math.max(s.best, current) };
}

export function breakStreak(s: StreakState): StreakState {
  return { current: 0, best: s.best };
}
