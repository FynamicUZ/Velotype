import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  glow?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-arcane-violet to-arcane-cyan text-white hover:brightness-110 active:brightness-95',
  secondary:
    'bg-arcane-panel border border-arcane-border text-white hover:bg-arcane-border',
  ghost: 'bg-transparent text-white/80 hover:text-white hover:bg-white/5',
  danger: 'bg-arcane-rose/90 text-white hover:bg-arcane-rose',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-7 py-3.5 text-lg rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', glow, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={clsx(
        'font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        glow && 'animate-pulse-glow',
        className,
      )}
    >
      {children}
    </button>
  );
}
