import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { QueuedWord } from '@/lib/game/wordPool';

interface Props {
  words: QueuedWord[];
  currentIndex: number;
  typed: string;
  hasError: boolean;
  charStates: ('pending' | 'correct' | 'incorrect')[];
  spellWordSet?: Set<string>;
  glitch?: boolean;
  letterDrop?: boolean;
}

export function WordQueue({
  words,
  currentIndex,
  typed,
  hasError,
  charStates,
  spellWordSet,
  glitch,
  letterDrop,
}: Props) {
  const current = words[currentIndex];
  const upcoming = words.slice(currentIndex + 1, currentIndex + 5);

  const dropMap = useDropMap(current?.text ?? '', letterDrop ?? false);

  if (!current) return null;

  const isSpell = spellWordSet?.has(current.text);

  return (
    <div className={clsx('flex flex-col items-center gap-4', glitch && 'animate-shake')}>
      <div
        className={clsx(
          'flex items-center justify-center gap-1 font-mono text-5xl select-none',
          isSpell && 'animate-pulse-glow rounded-2xl px-6 py-3',
          hasError && 'animate-shake',
        )}
        style={isSpell ? { textShadow: '0 0 24px rgba(251, 191, 36, 0.9)' } : undefined}
      >
        {current.text.split('').map((ch, i) => {
          const state = charStates[i] ?? 'pending';
          const dropped = dropMap[i];
          return (
            <span
              key={i}
              className={clsx(
                'transition-colors',
                isSpell && 'text-arcane-gold',
                !isSpell && state === 'pending' && 'text-white/40',
                !isSpell && state === 'correct' && 'text-arcane-cyan',
                !isSpell && state === 'incorrect' && 'text-arcane-rose',
                glitch && 'glitch-char',
                dropped && 'opacity-0',
              )}
              style={glitch ? { transform: `translateY(${(i % 3 - 1) * 2}px)` } : undefined}
            >
              {ch}
            </span>
          );
        })}
      </div>

      <div className="font-mono text-base text-white/30 truncate max-w-2xl">
        {typed && <span className="text-white/60">› {typed}</span>}
      </div>

      <div className="flex items-center gap-4 mt-2 opacity-60">
        {upcoming.map((w, i) => (
          <span
            key={`${w.index}-${i}`}
            className={clsx(
              'font-mono',
              i === 0 ? 'text-lg text-white/60' : 'text-base text-white/35',
              spellWordSet?.has(w.text) && 'text-arcane-gold/70',
            )}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function useDropMap(word: string, active: boolean): boolean[] {
  const [seedTick, setSeedTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSeedTick((s) => s + 1), 700);
    return () => window.clearInterval(id);
  }, [active]);

  return useMemo(() => {
    if (!active) return word.split('').map(() => false);
    return word.split('').map((_, i) => {
      const r = ((seedTick * 9301 + 49297 + i * 137) % 233280) / 233280;
      return r < 0.4;
    });
  }, [word, active, seedTick]);
}
