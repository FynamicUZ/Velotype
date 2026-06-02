import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface Props {
  trigger: number;
  direction: 'right' | 'left';
  color?: string;
}

export function SpellAnimation({ trigger, direction, color = 'bg-arcane-violet' }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 600);
    return () => window.clearTimeout(t);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div
      key={trigger}
      className={clsx(
        'absolute top-1/2 h-3 w-12 rounded-full',
        color,
        'shadow-lg',
        direction === 'right' ? 'left-1/4 spell-fly-right' : 'right-1/4 spell-fly-left',
      )}
      style={{
        boxShadow: '0 0 24px currentColor',
        animation:
          direction === 'right'
            ? 'spellRight 0.6s ease-out forwards'
            : 'spellLeft 0.6s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes spellRight { to { transform: translateX(50vw) scale(0.5); opacity: 0; } }
        @keyframes spellLeft { to { transform: translateX(-50vw) scale(0.5); opacity: 0; } }
      `}</style>
    </div>
  );
}
