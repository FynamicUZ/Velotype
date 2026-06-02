import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ALL_WEAPONS, type WeaponId } from '@/lib/game/secondaryWeapons';
import { usePlayerStore } from '@/store/usePlayerStore';
import clsx from 'clsx';

// ── Cosmetic catalogue ────────────────────────────────────────────────────────

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface CosmeticItem {
  id: string;
  slot: 'wand' | 'hat' | 'particles';
  name: string;
  icon: string;
  rarity: Rarity;
}

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'text-white/60',
  rare: 'text-arcane-cyan',
  epic: 'text-arcane-violet',
  legendary: 'text-arcane-gold',
};

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-white/20',
  rare: 'border-arcane-cyan/50',
  epic: 'border-arcane-violet/60',
  legendary: 'border-arcane-gold/70',
};

const RARITY_BG: Record<Rarity, string> = {
  common: 'bg-white/5',
  rare: 'bg-arcane-cyan/10',
  epic: 'bg-arcane-violet/15',
  legendary: 'bg-arcane-gold/15',
};

const DUST_COINS: Record<Rarity, number> = {
  common: 10,
  rare: 50,
  epic: 150,
  legendary: 500,
};

const COSMETICS: CosmeticItem[] = [
  // Common — starter items, already owned
  { id: 'oak',         slot: 'wand',      name: 'Oak Wand',         icon: '🪄', rarity: 'common' },
  { id: 'apprentice',  slot: 'hat',       name: 'Apprentice Cap',   icon: '🎓', rarity: 'common' },
  { id: 'spark',       slot: 'particles', name: 'Spark',            icon: '✨', rarity: 'common' },
  // Rare
  { id: 'crystal',     slot: 'wand',      name: 'Crystal Staff',    icon: '💎', rarity: 'rare' },
  { id: 'wizard',      slot: 'hat',       name: 'Wizard Hat',       icon: '🧙', rarity: 'rare' },
  { id: 'starfall',    slot: 'particles', name: 'Starfall',         icon: '🌠', rarity: 'rare' },
  // Epic
  { id: 'phoenix',     slot: 'wand',      name: 'Phoenix Feather',  icon: '🪶', rarity: 'epic' },
  { id: 'crown',       slot: 'hat',       name: 'Arcane Crown',     icon: '👑', rarity: 'epic' },
  { id: 'inferno',     slot: 'particles', name: 'Inferno',          icon: '🔥', rarity: 'epic' },
  // Legendary
  { id: 'void_staff',  slot: 'wand',      name: 'Void Staff',       icon: '🌑', rarity: 'legendary' },
  { id: 'lich_crown',  slot: 'hat',       name: "Lich's Crown",     icon: '💀', rarity: 'legendary' },
  { id: 'aurora',      slot: 'particles', name: 'Aurora Veil',      icon: '🌌', rarity: 'legendary' },
];

// Only non-common cosmetics drop from packs
const DROPPABLE = COSMETICS.filter((c) => c.rarity !== 'common');

// ── Pack catalogue ────────────────────────────────────────────────────────────

interface Pack {
  id: string;
  name: string;
  icon: string;
  price: number;
  flavor: string;
  // weight per rarity tier (must sum to 100)
  weights: Partial<Record<Rarity, number>>;
}

const PACKS: Pack[] = [
  {
    id: 'scroll',
    name: 'Arcane Scroll',
    icon: '📜',
    price: 300,
    flavor: 'A rolled parchment imbued with low-tier magic.',
    weights: { rare: 70, epic: 25, legendary: 5 },
  },
  {
    id: 'chest',
    name: 'Spell Chest',
    icon: '🧿',
    price: 800,
    flavor: 'An ornate chest with a higher chance of epic loot.',
    weights: { rare: 35, epic: 50, legendary: 15 },
  },
  {
    id: 'tome',
    name: 'Legendary Tome',
    icon: '📖',
    price: 2000,
    flavor: 'Ancient knowledge bound in shadow. Epic or better guaranteed.',
    weights: { epic: 60, legendary: 40 },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function rollRarity(weights: Partial<Record<Rarity, number>>): Rarity {
  const total = Object.values(weights).reduce<number>((a, b) => a + (b ?? 0), 0);
  let roll = Math.random() * total;
  for (const [rarity, w] of Object.entries(weights) as [Rarity, number][]) {
    roll -= w;
    if (roll <= 0) return rarity;
  }
  return (Object.keys(weights)[0] ?? 'rare') as Rarity;
}

function pickCosmetic(rarity: Rarity, ownedIds: string[]): CosmeticItem {
  const pool = DROPPABLE.filter((c) => c.rarity === rarity);
  const unowned = pool.filter((c) => !ownedIds.includes(c.id));
  const candidates = unowned.length > 0 ? unowned : pool;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpenResult {
  item: CosmeticItem;
  isDuplicate: boolean;
  dustCoins: number;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ShopPage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const addCoins = usePlayerStore((s) => s.addCoins);
  const addToInventory = usePlayerStore((s) => s.addToInventory);
  const equipWeapon = usePlayerStore((s) => s.equipWeapon);
  const setCosmetic = usePlayerStore((s) => s.setCosmetic);
  const ownCosmetic = usePlayerStore((s) => s.ownCosmetic);

  const [tab, setTab] = useState<'packs' | 'weapons' | 'collection'>('packs');
  const [revealing, setRevealing] = useState(false);
  const [openResult, setOpenResult] = useState<OpenResult | null>(null);

  const handleOpenPack = (pack: Pack) => {
    if (profile.coins < pack.price || revealing) return;
    const rarity = rollRarity(pack.weights);
    const item = pickCosmetic(rarity, profile.ownedCosmetics);
    const isDuplicate = profile.ownedCosmetics.includes(item.id);
    const dustCoins = isDuplicate ? DUST_COINS[item.rarity] : 0;

    addCoins(-pack.price);
    if (!isDuplicate) ownCosmetic(item.id);
    if (dustCoins > 0) addCoins(dustCoins);

    setRevealing(true);
    setTimeout(() => {
      setOpenResult({ item, isDuplicate, dustCoins });
      setRevealing(false);
    }, 900);
  };

  const buyWeapon = (id: WeaponId, count: number, coins: number) => {
    if (profile.coins < coins) return;
    addCoins(-coins);
    addToInventory(id, count);
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Home
        </Button>
        <h1 className="font-display text-2xl">Shop</h1>
        <Badge color="gold">{profile.coins} 🪙</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['packs', 'weapons', 'collection'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t
                ? 'bg-arcane-violet/30 text-white border border-arcane-violet/50'
                : 'text-white/50 hover:text-white/80',
            )}
          >
            {t === 'packs' ? '📦 Packs' : t === 'weapons' ? '⚔️ Weapons' : '🎭 Collection'}
          </button>
        ))}
      </div>

      {/* ── Packs tab ── */}
      {tab === 'packs' && (
        <>
          <p className="text-white/50 text-sm mb-5">
            Open packs to unlock cosmetics. Duplicate items convert to 🪙 dust.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PACKS.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                canAfford={profile.coins >= pack.price}
                disabled={revealing}
                onOpen={() => handleOpenPack(pack)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Weapons tab ── */}
      {tab === 'weapons' && (
        <div className="grid md:grid-cols-2 gap-3">
          {ALL_WEAPONS.map((w) => {
            const owned = profile.inventory[w.id] ?? 0;
            const equipped = profile.equippedWeapon === w.id;
            return (
              <Card key={w.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={clsx('text-3xl', w.color)}>{w.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{w.name}</h3>
                      <Badge color="cyan">×{owned}</Badge>
                      {equipped && <Badge color="lime">Equipped</Badge>}
                    </div>
                    <p className="text-sm text-white/60 mt-0.5">{w.description}</p>
                    <p className="text-xs text-arcane-gold mt-1">Tab to use in battle</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {w.pricePerPack.map((p) => (
                    <Button
                      key={p.count}
                      size="sm"
                      variant="secondary"
                      disabled={profile.coins < p.coins}
                      onClick={() => buyWeapon(w.id, p.count, p.coins)}
                    >
                      +{p.count} · {p.coins}🪙
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant={equipped ? 'ghost' : 'primary'}
                    disabled={owned <= 0 && !equipped}
                    onClick={() => equipWeapon(equipped ? null : w.id)}
                  >
                    {equipped ? 'Unequip' : 'Equip'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Collection tab ── */}
      {tab === 'collection' && (
        <div className="flex flex-col gap-8">
          {(['wand', 'hat', 'particles'] as const).map((slot) => (
            <div key={slot}>
              <h2 className="font-display text-base mb-3 capitalize">{slot}s</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {COSMETICS.filter((c) => c.slot === slot).map((c) => {
                  const owned = profile.ownedCosmetics.includes(c.id);
                  const equipped = profile.cosmetics[slot] === c.id;
                  return (
                    <CollectionCard
                      key={c.id}
                      item={c}
                      owned={owned}
                      equipped={equipped}
                      onEquip={() => owned && setCosmetic(slot, c.id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pack opening overlay ── */}
      {(revealing || openResult) && (
        <PackOpenModal
          revealing={revealing}
          result={openResult}
          onClose={() => setOpenResult(null)}
          onEquip={(item) => {
            setCosmetic(item.slot, item.id);
            setOpenResult(null);
            setTab('collection');
          }}
        />
      )}
    </div>
  );
}

// ── PackCard ──────────────────────────────────────────────────────────────────

function PackCard({
  pack,
  canAfford,
  disabled,
  onOpen,
}: {
  pack: Pack;
  canAfford: boolean;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <Card className="p-6 flex flex-col items-center gap-4 hover:border-arcane-violet/50 transition-colors">
      <div className="text-6xl">{pack.icon}</div>
      <h3 className="font-display text-base text-center">{pack.name}</h3>
      <p className="text-white/50 text-xs text-center flex-1">{pack.flavor}</p>

      {/* Odds display */}
      <div className="flex gap-3 text-xs flex-wrap justify-center">
        {(Object.entries(pack.weights) as [Rarity, number][]).map(([r, w]) => (
          <span key={r} className={RARITY_COLOR[r]}>
            {RARITY_LABEL[r]} {w}%
          </span>
        ))}
      </div>

      <Button className="w-full" disabled={!canAfford || disabled} onClick={onOpen}>
        Open · {pack.price} 🪙
      </Button>
    </Card>
  );
}

// ── CollectionCard ────────────────────────────────────────────────────────────

function CollectionCard({
  item,
  owned,
  equipped,
  onEquip,
}: {
  item: CosmeticItem;
  owned: boolean;
  equipped: boolean;
  onEquip: () => void;
}) {
  return (
    <div
      onClick={onEquip}
      className={clsx(
        'p-4 rounded-xl border transition-all',
        RARITY_BORDER[item.rarity],
        owned ? 'cursor-pointer' : 'opacity-35 cursor-default grayscale',
        equipped ? 'ring-2 ring-arcane-lime/60' : owned && 'hover:border-arcane-violet/60',
        RARITY_BG[item.rarity],
      )}
    >
      <div className="text-3xl mb-2">{owned ? item.icon : '❓'}</div>
      <div className="text-xs text-white/40 uppercase tracking-wider mb-0.5">{item.slot}</div>
      <div className="font-semibold text-sm">{owned ? item.name : '???'}</div>
      <div className={clsx('text-xs mt-1', RARITY_COLOR[item.rarity])}>
        {RARITY_LABEL[item.rarity]}
      </div>
      {equipped && (
        <Badge color="lime" className="mt-2 text-xs">Equipped</Badge>
      )}
    </div>
  );
}

// ── PackOpenModal ─────────────────────────────────────────────────────────────

function PackOpenModal({
  revealing,
  result,
  onClose,
  onEquip,
}: {
  revealing: boolean;
  result: OpenResult | null;
  onClose: () => void;
  onEquip: (item: CosmeticItem) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-xs w-full p-8 text-center border-arcane-violet/40">
        {revealing ? (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="text-5xl animate-spin">✨</div>
            <p className="font-display text-sm text-arcane-violet animate-pulse">Opening…</p>
          </div>
        ) : result ? (
          <div className="flex flex-col items-center gap-4">
            {/* Item reveal */}
            <div
              className={clsx(
                'w-28 h-28 rounded-2xl border-2 flex items-center justify-center text-6xl',
                RARITY_BG[result.item.rarity],
                RARITY_BORDER[result.item.rarity],
                'animate-cast',
              )}
            >
              {result.item.icon}
            </div>

            <div>
              <div className={clsx('font-display text-base', RARITY_COLOR[result.item.rarity])}>
                {result.item.name}
              </div>
              <div className="text-xs text-white/40 mt-1 capitalize">
                {RARITY_LABEL[result.item.rarity]} · {result.item.slot}
              </div>
            </div>

            {result.isDuplicate ? (
              <p className="text-sm text-arcane-gold">
                Already owned! Converted to <span className="font-bold">+{result.dustCoins} 🪙</span>
              </p>
            ) : (
              <p className="text-sm text-arcane-lime">New cosmetic unlocked!</p>
            )}

            <div className="flex gap-2 w-full mt-1">
              {!result.isDuplicate && (
                <Button className="flex-1" size="sm" onClick={() => onEquip(result.item)}>
                  Equip
                </Button>
              )}
              <Button
                className="flex-1"
                size="sm"
                variant="ghost"
                onClick={onClose}
              >
                {result.isDuplicate ? 'OK' : 'Save'}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
