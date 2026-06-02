import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { getWeapon, type WeaponId } from '@/lib/game/secondaryWeapons';

interface Props {
  weaponId: WeaponId | null;
  cooldownEndsAt: number | null;
  count: number;
}

export function SecondaryWeaponSlot({ weaponId, cooldownEndsAt, count }: Props) {
  const [now, setNow] = useState(performance.now());

  useEffect(() => {
    if (!cooldownEndsAt) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [cooldownEndsAt]);

  if (!weaponId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-arcane-panel/40 border border-dashed border-white/10 text-white/40 text-sm">
        <span className="text-xl opacity-50">∅</span>
        <span>No weapon</span>
      </div>
    );
  }

  const w = getWeapon(weaponId);
  const onCooldown = cooldownEndsAt !== null && now < cooldownEndsAt;
  const ready = !onCooldown && count > 0;
  const cooldownPct = onCooldown
    ? Math.max(0, Math.min(100, ((cooldownEndsAt! - now) / w.cooldownMs) * 100))
    : 0;

  return (
    <div
      className={clsx(
        'relative flex items-center gap-3 px-3 py-2 rounded-xl bg-arcane-panel/70 border border-arcane-border min-w-[200px]',
        ready && 'animate-pulse-glow',
      )}
    >
      <div className={clsx('text-2xl', w.color)}>{w.icon}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{w.name}</div>
        <div className="text-xs text-white/50 flex items-center gap-1">
          {onCooldown ? (
            <span>Charging…</span>
          ) : count > 0 ? (
            <>
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-arcane-gold/30 border border-arcane-gold/50 text-arcane-gold font-mono text-[10px]">
                Tab
              </kbd>
            </>
          ) : (
            <span>Empty</span>
          )}
        </div>
      </div>
      <div className="text-sm font-mono text-arcane-gold">×{count}</div>
      {onCooldown && (
        <div
          className="absolute inset-x-0 bottom-0 h-1 bg-arcane-cyan rounded-b-xl transition-all"
          style={{ width: `${100 - cooldownPct}%` }}
        />
      )}
    </div>
  );
}
