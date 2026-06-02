import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QueuedWord } from '@/lib/game/wordPool';
import { optimalTimeForWord } from '@/lib/game/wordPool';
import { calculateDamage } from '@/lib/game/damageCalculator';

export interface WordCompletion {
  word: QueuedWord;
  damage: number;
  streakAfter: number;
  failed: boolean;
  actualTimeMs: number;
}

interface UseTypingEngineOpts {
  words: QueuedWord[];
  enabled: boolean;
  playerLevel?: number;
  timeoutMultiplier?: number;
  onWordComplete: (c: WordCompletion) => void;
  onSpellWord?: (word: string) => void;
  spellWordSet?: Set<string>;
}

export interface TypingEngineApi {
  currentIndex: number;
  typed: string;
  hasError: boolean;
  charStates: ('pending' | 'correct' | 'incorrect')[];
  streak: number;
  bestStreak: number;
  remainingTimeMs: number;
  totalCorrectChars: number;
  totalKeystrokes: number;
  done: boolean;
}

export function useTypingEngine(opts: UseTypingEngineOpts): TypingEngineApi {
  const {
    words,
    enabled,
    playerLevel,
    timeoutMultiplier = 1,
    onWordComplete,
    onSpellWord,
    spellWordSet,
  } = opts;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [hasError, setHasError] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [remainingTimeMs, setRemainingTimeMs] = useState(0);
  const [totalCorrectChars, setTotalCorrectChars] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);

  const wordStartRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const currentWord = words[currentIndex];

  const finishWord = useCallback(
    (failed: boolean) => {
      if (!currentWord) return;
      const actualTimeMs = performance.now() - wordStartRef.current;
      const correctChars = failed
        ? Math.min(typed.length, currentWord.text.length)
        : currentWord.text.length;
      const keystrokes = Math.max(typed.length, currentWord.text.length);

      const newStreak = failed ? 0 : streak + 1;
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));

      const result = failed
        ? { damage: 0 }
        : calculateDamage({
            word: currentWord.text,
            tier: currentWord.tier,
            actualTimeMs,
            correctChars,
            totalKeystrokes: keystrokes,
            streak: newStreak,
            playerLevel,
          });

      onWordComplete({
        word: currentWord,
        damage: result.damage,
        streakAfter: newStreak,
        failed,
        actualTimeMs,
      });

      if (spellWordSet?.has(currentWord.text) && !failed) {
        onSpellWord?.(currentWord.text);
      }

      setCurrentIndex((i) => i + 1);
      setTyped('');
      setHasError(false);
      wordStartRef.current = performance.now();
    },
    [currentWord, typed, streak, playerLevel, onWordComplete, onSpellWord, spellWordSet],
  );

  useEffect(() => {
    if (currentIndex === 0) wordStartRef.current = performance.now();
  }, [currentIndex]);

  useEffect(() => {
    if (!enabled || !currentWord) return;
    const optimal = optimalTimeForWord(currentWord.text);
    const timeoutMs = optimal * 2 * timeoutMultiplier;
    const elapsed = performance.now() - wordStartRef.current;
    setRemainingTimeMs(Math.max(0, timeoutMs - elapsed));

    const id = window.setInterval(() => {
      const e = performance.now() - wordStartRef.current;
      const remain = Math.max(0, timeoutMs - e);
      setRemainingTimeMs(remain);
      if (remain <= 0 && enabledRef.current) {
        window.clearInterval(id);
        finishWord(true);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [currentWord, enabled, timeoutMultiplier, finishWord, currentIndex]);

  useEffect(() => {
    if (!enabled) return;

    function handleKey(e: KeyboardEvent) {
      if (!enabledRef.current || !currentWord) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Backspace') {
        if (typed.length > 0) {
          setTyped((t) => t.slice(0, -1));
          setHasError(false);
        }
        e.preventDefault();
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (typed === currentWord.text) {
          finishWord(false);
        }
        return;
      }

      if (e.key.length !== 1) return;
      e.preventDefault();

      const nextTyped = typed + e.key;
      const expected = currentWord.text[typed.length];
      setTotalKeystrokes((k) => k + 1);

      if (e.key === expected) {
        setTotalCorrectChars((c) => c + 1);
        setTyped(nextTyped);
        if (nextTyped === currentWord.text) {
          finishWord(false);
        }
      } else {
        setHasError(true);
        if (streak > 0) setStreak(0);
        finishWord(true);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [enabled, currentWord, typed, streak, finishWord]);

  const charStates = useMemo(() => {
    if (!currentWord) return [];
    return currentWord.text.split('').map((ch, i) => {
      if (i < typed.length) {
        return typed[i] === ch ? 'correct' : 'incorrect';
      }
      return 'pending';
    }) as ('pending' | 'correct' | 'incorrect')[];
  }, [currentWord, typed]);

  return {
    currentIndex,
    typed,
    hasError,
    charStates,
    streak,
    bestStreak,
    remainingTimeMs,
    totalCorrectChars,
    totalKeystrokes,
    done: currentIndex >= words.length,
  };
}
