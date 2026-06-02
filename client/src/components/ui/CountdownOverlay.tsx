import { useEffect, useRef, useState } from 'react';

interface Props {
  seconds?: number;
  onDone: () => void;
}

export function CountdownOverlay({ seconds = 3, onDone }: Props) {
  const [n, setN] = useState(seconds);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (n <= 0) {
      const t = window.setTimeout(() => onDoneRef.current(), 400);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setN((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [n]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-arcane-bg/80 backdrop-blur-sm pointer-events-none">
      <div
        key={n}
        className="font-display text-9xl text-arcane-violet animate-cast"
        style={{ textShadow: '0 0 40px rgba(168,85,247,0.8)' }}
      >
        {n > 0 ? n : 'GO!'}
      </div>
    </div>
  );
}
