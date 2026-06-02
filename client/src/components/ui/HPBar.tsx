import clsx from 'clsx';

interface Props {
  hp: number;
  maxHp: number;
  name: string;
  align?: 'left' | 'right';
  color?: 'violet' | 'cyan' | 'rose';
}

const colorClasses = {
  violet: 'from-arcane-violet to-fuchsia-500',
  cyan: 'from-arcane-cyan to-sky-400',
  rose: 'from-arcane-rose to-arcane-orange',
};

export function HPBar({ hp, maxHp, name, align = 'left', color = 'violet' }: Props) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(maxHp, 1)) * 100));
  return (
    <div className={clsx('w-full', align === 'right' && 'text-right')}>
      <div className={clsx('flex items-baseline gap-2 mb-1', align === 'right' && 'justify-end')}>
        <span className="font-display text-xs uppercase tracking-wider text-white/90">{name}</span>
        <span className="font-mono text-sm text-white/60">
          {Math.ceil(hp)}/{maxHp}
        </span>
      </div>
      <div className="h-3 bg-black/40 border border-white/10 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full bg-gradient-to-r transition-all duration-300 ease-out rounded-full shadow-lg',
            colorClasses[color],
          )}
          style={{
            width: `${pct}%`,
            marginLeft: align === 'right' ? `${100 - pct}%` : 0,
          }}
        />
      </div>
    </div>
  );
}
