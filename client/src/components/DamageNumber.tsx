import { useEffect } from 'react';
import clsx from 'clsx';
import type { FloatingDamage } from '@/store/useGameStore';

interface Props {
  d: FloatingDamage;
  onDone: (id: number) => void;
}

export function DamageNumber({ d, onDone }: Props) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone(d.id), 1000);
    return () => window.clearTimeout(t);
  }, [d.id, onDone]);

  const color = d.isMiss
    ? 'text-white/40'
    : d.side === 'opponent'
      ? d.isHeavy
        ? 'text-arcane-gold'
        : 'text-arcane-cyan'
      : 'text-arcane-rose';

  return (
    <div
      className={clsx(
        'absolute font-display select-none pointer-events-none animate-float-up',
        d.isHeavy ? 'text-5xl' : 'text-3xl',
        color,
      )}
      style={{
        left: `${30 + (d.id % 7) * 6}%`,
        top: '40%',
        textShadow: '0 0 16px currentColor',
      }}
    >
      {d.isMiss ? 'MISS' : `-${d.amount}`}
    </div>
  );
}
