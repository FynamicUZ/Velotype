import { useEffect, useState } from 'react';

export function useCountdown(startSeconds: number, onZero: () => void) {
  const [n, setN] = useState(startSeconds);
  useEffect(() => {
    if (n <= 0) {
      onZero();
      return;
    }
    const t = window.setTimeout(() => setN((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [n, onZero]);
  return n;
}
