interface Props {
  hp: number;
  maxHp: number;
  label?: string;
}

export function RunHpBar({ hp, maxHp, label }: Props) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const color = pct > 0.5 ? '#a3e635' : pct > 0.25 ? '#facc15' : '#fb7185';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="uppercase tracking-wider text-white/50">{label ?? 'Health'}</span>
        <span className="font-mono text-white/70">
          {Math.max(0, Math.round(hp))} / {maxHp}
        </span>
      </div>
      <div className="h-3 rounded-full bg-black/50 overflow-hidden border border-arcane-border">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, background: color, boxShadow: `0 0 12px ${color}` }}
        />
      </div>
    </div>
  );
}
