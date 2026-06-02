import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  children: ReactNode;
  color?: 'violet' | 'cyan' | 'lime' | 'orange' | 'rose' | 'gold';
  className?: string;
}

const colorClasses = {
  violet: 'bg-arcane-violet/20 text-arcane-violet border-arcane-violet/40',
  cyan: 'bg-arcane-cyan/20 text-arcane-cyan border-arcane-cyan/40',
  lime: 'bg-arcane-lime/20 text-arcane-lime border-arcane-lime/40',
  orange: 'bg-arcane-orange/20 text-arcane-orange border-arcane-orange/40',
  rose: 'bg-arcane-rose/20 text-arcane-rose border-arcane-rose/40',
  gold: 'bg-arcane-gold/20 text-arcane-gold border-arcane-gold/40',
};

export function Badge({ children, color = 'violet', className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold',
        colorClasses[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
