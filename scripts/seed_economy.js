const { query } = require('../src/db');

async function seedEconomy() {
  console.log('[Seed] Starting Economy Seeding...');

  try {
    // 1. Seed Items
    const items = [
      // Weapons
      { name: 'Practice Dagger', type: 'weapon', rarity: 'Common', animation_id: 'dagger_basic' },
      { name: 'Neon Katana', type: 'weapon', rarity: 'Rare', animation_id: 'katana_neon' },
      { name: 'Void Blade', type: 'weapon', rarity: 'Legendary', animation_id: 'void_blade' },
      // Auras
      { name: 'Blue Glow', type: 'aura', rarity: 'Common', animation_id: 'aura_blue' },
      { name: 'Dragon Spirit', type: 'aura', rarity: 'Rare', animation_id: 'aura_dragon' },
      { name: 'Phoenix Silhouette', type: 'aura', rarity: 'Legendary', animation_id: 'aura_phoenix' },
      // Skins
      { name: 'Grey Silhouette', type: 'skin', rarity: 'Common', animation_id: 'skin_grey' },
      { name: 'Obsidian Shadow', type: 'skin', rarity: 'Rare', animation_id: 'skin_obsidian' },
      { name: 'Golden Champion', type: 'skin', rarity: 'Legendary', animation_id: 'skin_gold' }
    ];

    for (const item of items) {
      await query(
        'INSERT INTO items (name, type, rarity, animation_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [item.name, item.type, item.rarity, item.animation_id]
      );
    }
    console.log(`[Seed] ${items.length} items seeded.`);

    // 2. Seed Lootboxes
    const boxes = [
      {
        name: 'Common Box',
        cost: 100,
        rates: JSON.stringify({ Common: 80, Rare: 15, Legendary: 5 })
      },
      {
        name: 'Rare Box',
        cost: 500,
        rates: JSON.stringify({ Common: 50, Rare: 40, Legendary: 10 })
      },
      {
        name: 'Legendary Box',
        cost: 2000,
        rates: JSON.stringify({ Common: 10, Rare: 30, Legendary: 60 })
      }
    ];

    for (const box of boxes) {
      await query(
        'INSERT INTO lootboxes (name, cost_in_coins, drop_rates) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET cost_in_coins = $2, drop_rates = $3',
        [box.name, box.cost, box.rates]
      );
    }
    console.log(`[Seed] ${boxes.length} lootboxes seeded.`);

    console.log('[Seed] Economy seeding COMPLETED.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
}

seedEconomy();
