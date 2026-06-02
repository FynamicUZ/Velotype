import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { HPBar } from '@/components/ui/HPBar';
import { DamageNumber } from '@/components/DamageNumber';
import { SpellAnimation } from '@/components/SpellAnimation';
import { useGameStore } from '@/store/useGameStore';
import { getWeapon } from '@/lib/game/secondaryWeapons';

interface Props {
  localName: string;
  localSprite?: string;
  opponentSprite?: string;
  localWandColor?: string;
  localWandEmoji?: string;
  localWandGlow?: string;
  particleEmoji?: string;
}

export function MageArena({
  localName,
  localSprite = '🧙',
  opponentSprite = '🧌',
  localWandColor = 'bg-arcane-cyan',
  localWandEmoji = '🪄',
  localWandGlow,
  particleEmoji,
}: Props) {
  const localHP = useGameStore((s) => s.localHP);
  const localMaxHP = useGameStore((s) => s.localMaxHP);
  const opponentHP = useGameStore((s) => s.opponentHP);
  const opponentMaxHP = useGameStore((s) => s.opponentMaxHP);
  const opponentName = useGameStore((s) => s.opponentName);
  const damageNumbers = useGameStore((s) => s.damageNumbers);
  const clearFloatingDamage = useGameStore((s) => s.clearFloatingDamage);
  const shieldActive = useGameStore((s) => s.shieldActive);
  const weaponCastSeq = useGameStore((s) => s.weaponCastSeq);
  const lastCastWeaponId = useGameStore((s) => s.lastCastWeaponId);

  const [localCastTrigger, setLocalCastTrigger] = useState(0);
  const [opponentCastTrigger, setOpponentCastTrigger] = useState(0);
  const [localHit, setLocalHit] = useState(false);
  const [opponentHit, setOpponentHit] = useState(false);
  const [castIcon, setCastIcon] = useState<{ id: number; icon: string } | null>(null);

  useEffect(() => {
    if (damageNumbers.length === 0) return;
    const last = damageNumbers[damageNumbers.length - 1];
    if (!last) return;
    if (last.side === 'opponent') {
      setLocalCastTrigger((t) => t + 1);
      setOpponentHit(true);
      const id = window.setTimeout(() => setOpponentHit(false), 300);
      return () => window.clearTimeout(id);
    } else {
      setOpponentCastTrigger((t) => t + 1);
      setLocalHit(true);
      const id = window.setTimeout(() => setLocalHit(false), 300);
      return () => window.clearTimeout(id);
    }
  }, [damageNumbers.length]);

  useEffect(() => {
    if (weaponCastSeq === 0 || !lastCastWeaponId) return;
    setLocalCastTrigger((t) => t + 1);
    const w = getWeapon(lastCastWeaponId);
    setCastIcon({ id: weaponCastSeq, icon: w.icon });
    const t = window.setTimeout(() => setCastIcon(null), 900);
    return () => window.clearTimeout(t);
  }, [weaponCastSeq, lastCastWeaponId]);

  return (
    <div className="relative w-full">
      <div className="grid grid-cols-2 gap-8 mb-4">
        <HPBar hp={localHP} maxHp={localMaxHP} name={localName} align="left" color="cyan" />
        <HPBar hp={opponentHP} maxHp={opponentMaxHP} name={opponentName} align="right" color="rose" />
      </div>

      <div className="relative h-48 grid grid-cols-2 items-end">
        <div className="flex justify-start pl-12 relative items-end gap-2">
          <div className="relative">
            <MageSprite
              emoji={localSprite}
              facing="right"
              hit={localHit}
              shielded={shieldActive}
            />
            {particleEmoji && (
              <span
                key={localCastTrigger}
                className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl animate-float-up pointer-events-none select-none"
              >
                {particleEmoji}
              </span>
            )}
          </div>
          <span
            className="text-4xl select-none pointer-events-none mb-2"
            style={{ filter: localWandGlow, transform: 'rotate(25deg)' }}
            title="Wand"
          >
            {localWandEmoji}
          </span>
          {castIcon && (
            <span
              key={`cast-${castIcon.id}`}
              className="absolute -top-2 left-20 text-3xl animate-float-up pointer-events-none select-none"
              style={{ filter: 'drop-shadow(0 0 16px rgba(251, 191, 36, 0.9))' }}
            >
              {castIcon.icon}
            </span>
          )}
        </div>
        <div className="flex justify-end pr-12">
          <MageSprite emoji={opponentSprite} facing="left" hit={opponentHit} />
        </div>

        <SpellAnimation trigger={localCastTrigger} direction="right" color={localWandColor} />
        <SpellAnimation trigger={opponentCastTrigger} direction="left" color="bg-arcane-rose" />

        {damageNumbers.map((d) => (
          <div
            key={d.id}
            className={clsx(
              'absolute top-0 bottom-0',
              d.side === 'local' ? 'left-0 w-1/2' : 'right-0 w-1/2',
            )}
          >
            <DamageNumber d={d} onDone={clearFloatingDamage} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MageSprite({
  emoji,
  facing,
  hit,
  shielded,
}: {
  emoji: string;
  facing: 'left' | 'right';
  hit: boolean;
  shielded?: boolean;
}) {
  return (
    <div
      className={clsx(
        'text-7xl transition-transform select-none',
        facing === 'left' && 'scale-x-[-1]',
        hit && 'animate-shake',
      )}
      style={{
        filter: hit ? 'drop-shadow(0 0 24px rgba(251, 113, 133, 0.9))' : 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5))',
      }}
    >
      {emoji}
      {shielded && (
        <div className="absolute inset-0 rounded-full ring-4 ring-arcane-gold/60 animate-pulse-glow" />
      )}
    </div>
  );
}
