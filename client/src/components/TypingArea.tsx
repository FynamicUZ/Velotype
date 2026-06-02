import { useEffect, useRef } from 'react';
import { WordQueue } from '@/components/WordQueue';
import type { QueuedWord } from '@/lib/game/wordPool';
import type { TypingEngineApi } from '@/hooks/useTypingEngine';

interface Props {
  words: QueuedWord[];
  engine: TypingEngineApi;
  spellWordSet?: Set<string>;
  glitch?: boolean;
  letterDrop?: boolean;
  enabled: boolean;
}

export function TypingArea({ words, engine, spellWordSet, glitch, letterDrop, enabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const focus = () => inputRef.current?.focus();
    focus();
    window.addEventListener('click', focus);
    return () => window.removeEventListener('click', focus);
  }, [enabled]);

  const optimal = words[engine.currentIndex];
  const totalTimeoutBudget = optimal ? (optimal.text.length * 300 + 1500) * 2 : 1;
  const timePct = Math.max(0, Math.min(100, (engine.remainingTimeMs / totalTimeoutBudget) * 100));

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
      <div className="w-full">
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-arcane-lime via-arcane-cyan to-arcane-violet transition-all duration-100"
            style={{ width: `${timePct}%` }}
          />
        </div>
      </div>

      <WordQueue
        words={words}
        currentIndex={engine.currentIndex}
        typed={engine.typed}
        hasError={engine.hasError}
        charStates={engine.charStates}
        spellWordSet={spellWordSet}
        glitch={glitch}
        letterDrop={letterDrop}
      />

      <input
        ref={inputRef}
        autoFocus
        className="absolute opacity-0 -z-10 pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
