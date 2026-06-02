import clsx from 'clsx';

interface Props {
  streak: number;
}

export function ComboCounter({ streak }: Props) {
  if (streak < 2) return null;
  const tier = streak >= 10 ? 'gold' : streak >= 5 ? 'cyan' : 'violet';
  const colorMap = {
    gold: 'text-arcane-gold',
    cyan: 'text-arcane-cyan',
    violet: 'text-arcane-violet',
  };
  return (
    <div className={clsx('font-display text-2xl animate-cast', colorMap[tier])}>
      {streak}× COMBO
    </div>
  );
}
