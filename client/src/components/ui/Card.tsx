import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: boolean;
}

export function Card({ children, glow, className, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={clsx(
        'bg-arcane-panel/70 backdrop-blur border border-arcane-border rounded-2xl shadow-xl',
        glow && 'shadow-arcane-violet/30',
        className,
      )}
    >
      {children}
    </div>
  );
}
