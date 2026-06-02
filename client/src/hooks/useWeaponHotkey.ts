import { useEffect } from 'react';

interface Opts {
  enabled: boolean;
  onFire: () => void;
  hotkey?: string;
}

export function useWeaponHotkey({ enabled, onFire, hotkey = 'Tab' }: Opts) {
  useEffect(() => {
    if (!enabled) return;
    function handle(e: KeyboardEvent) {
      if (e.key !== hotkey) return;
      e.preventDefault();
      e.stopPropagation();
      onFire();
    }
    window.addEventListener('keydown', handle, { capture: true });
    return () => window.removeEventListener('keydown', handle, { capture: true });
  }, [enabled, onFire, hotkey]);
}
