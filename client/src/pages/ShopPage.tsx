import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ALL_WEAPONS, type WeaponId } from '@/lib/game/secondaryWeapons';
import { usePlayerStore } from '@/store/usePlayerStore';
import clsx from 'clsx';

interface CosmeticItem {
  id: string;
  slot: 'wand' | 'hat' | 'particles';
  name: string;
  icon: string;
  price: number;
}

const COSMETICS: CosmeticItem[] = [
  { id: 'oak', slot: 'wand', name: 'Oak Wand', icon: '🪄', price: 0 },
  { id: 'crystal', slot: 'wand', name: 'Crystal Staff', icon: '💎', price: 250 },
  { id: 'phoenix', slot: 'wand', name: 'Phoenix Feather', icon: '🪶', price: 500 },
  { id: 'apprentice', slot: 'hat', name: 'Apprentice Cap', icon: '🎓', price: 0 },
  { id: 'wizard', slot: 'hat', name: 'Wizard Hat', icon: '🧙', price: 200 },
  { id: 'crown', slot: 'hat', name: 'Arcane Crown', icon: '👑', price: 800 },
  { id: 'spark', slot: 'particles', name: 'Spark', icon: '✨', price: 0 },
  { id: 'starfall', slot: 'particles', name: 'Starfall', icon: '🌠', price: 300 },
  { id: 'inferno', slot: 'particles', name: 'Inferno', icon: '🔥', price: 600 },
];

export default function ShopPage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const addCoins = usePlayerStore((s) => s.addCoins);
  const addToInventory = usePlayerStore((s) => s.addToInventory);
  const equipWeapon = usePlayerStore((s) => s.equipWeapon);
  const setCosmetic = usePlayerStore((s) => s.setCosmetic);
  const ownCosmetic = usePlayerStore((s) => s.ownCosmetic);

  const buyWeapon = (id: WeaponId, count: number, coins: number) => {
    if (profile.coins < coins) return;
    addCoins(-coins);
    addToInventory(id, count);
  };

  const buyOrEquipCosmetic = (item: CosmeticItem) => {
    const owned = profile.ownedCosmetics.includes(item.id);
    if (owned) {
      setCosmetic(item.slot, item.id);
      return;
    }
    if (profile.coins < item.price) return;
    addCoins(-item.price);
    ownCosmetic(item.id);
    setCosmetic(item.slot, item.id);
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Home
        </Button>
        <h1 className="font-display text-2xl">Shop</h1>
        <Badge color="gold">{profile.coins} 🪙</Badge>
      </div>

      <h2 className="font-display text-lg mb-3">Secondary Weapons</h2>
      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {ALL_WEAPONS.map((w) => {
          const owned = profile.inventory[w.id] ?? 0;
          const equipped = profile.equippedWeapon === w.id;
          return (
            <Card key={w.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className={clsx('text-3xl', w.color)}>{w.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{w.name}</h3>
                    <Badge color="cyan">×{owned}</Badge>
                    {equipped && <Badge color="lime">Equipped</Badge>}
                  </div>
                  <p className="text-sm text-white/60">{w.description}</p>
                  <p className="text-xs text-arcane-gold mt-1">Hotkey in battle: Tab</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {w.pricePerPack.map((pack) => (
                  <Button
                    key={pack.count}
                    size="sm"
                    variant="secondary"
                    disabled={profile.coins < pack.coins}
                    onClick={() => buyWeapon(w.id, pack.count, pack.coins)}
                  >
                    +{pack.count} · {pack.coins}🪙
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

      <h2 className="font-display text-lg mb-3">Cosmetics</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {COSMETICS.map((c) => {
          const equipped = profile.cosmetics[c.slot] === c.id;
          const owned = profile.ownedCosmetics.includes(c.id);
          const canAfford = profile.coins >= c.price;
          return (
            <Card
              key={c.id}
              className={clsx(
                'p-4 cursor-pointer transition',
                equipped && 'border-arcane-lime/60',
                !owned && !canAfford && 'opacity-50 cursor-not-allowed',
              )}
              onClick={() => buyOrEquipCosmetic(c)}
            >
              <div className="flex items-center gap-3">
                <div className="text-4xl">{c.icon}</div>
                <div className="flex-1">
                  <div className="text-xs uppercase text-white/40 tracking-wider">{c.slot}</div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-arcane-gold">
                    {owned ? (equipped ? 'Equipped' : 'Owned · click to equip') : `${c.price}🪙`}
                  </div>
                </div>
                {equipped ? (
                  <Badge color="lime">✓</Badge>
                ) : owned ? (
                  <Badge color="cyan">Owned</Badge>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
