import type { EnemyDef } from '@/lib/game/botAI';

export interface World {
  id: number;
  name: string;
  theme: string;
  fighters: EnemyDef[];
  bodyguard: EnemyDef;
  boss: EnemyDef;
}

const enemy = (
  id: string,
  name: string,
  level: number,
  worldId: number,
  sprite: string,
  flavor: string,
): EnemyDef => ({ id, name, kind: 'normal', level, worldId, sprite, flavor });

const bodyguard = (
  id: string,
  name: string,
  level: number,
  worldId: number,
  sprite: string,
  flavor: string,
): EnemyDef => ({ id, name, kind: 'bodyguard', level, worldId, sprite, flavor });

const boss = (
  id: string,
  name: string,
  level: number,
  worldId: number,
  sprite: string,
  flavor: string,
): EnemyDef => ({ id, name, kind: 'boss', level, worldId, sprite, flavor });

export const WORLDS: World[] = [
  {
    id: 1,
    name: 'The Misty Forest',
    theme: 'forest',
    fighters: [
      enemy('w1-f1', 'Forest Sprite', 1, 1, '🧚', 'Mischievous and quick.'),
      enemy('w1-f2', 'Mossy Goblin', 2, 1, '👺', 'Smells of rotten leaves.'),
      enemy('w1-f3', 'Wild Hunter', 3, 1, '🏹', 'Tracks his prey for days.'),
      enemy('w1-f4', 'Owl Druid', 4, 1, '🦉', 'Sees through the night.'),
    ],
    bodyguard: bodyguard('w1-bg', 'Thornfist Brute', 5, 1, '🪓', 'Boss\'s personal bouncer.'),
    boss: boss('w1-boss', 'Elder of Roots', 6, 1, '🌳', 'Older than the forest itself.'),
  },
  {
    id: 2,
    name: 'Frostfang Castle',
    theme: 'castle',
    fighters: [
      enemy('w2-f1', 'Ice Squire', 5, 2, '⚔️', 'Cold to the touch.'),
      enemy('w2-f2', 'Frostbite Mage', 6, 2, '❄️', 'Specializes in slow curses.'),
      enemy('w2-f3', 'Glacial Knight', 7, 2, '🛡', 'Armor of solid ice.'),
      enemy('w2-f4', 'Snow Wraith', 8, 2, '👻', 'Drifts like a blizzard.'),
    ],
    bodyguard: bodyguard('w2-bg', 'Captain Hailstone', 9, 2, '🪖', 'Trained in glacier warfare.'),
    boss: boss('w2-boss', 'Queen Pyrrha', 10, 2, '👸', 'Rules with frostbitten cruelty.'),
  },
  {
    id: 3,
    name: 'Sunken Catacombs',
    theme: 'dungeon',
    fighters: [
      enemy('w3-f1', 'Skeleton Mage', 9, 3, '💀', 'Bones held by spite alone.'),
      enemy('w3-f2', 'Crypt Stalker', 10, 3, '🦇', 'Drinks the moonlight.'),
      enemy('w3-f3', 'Bone Conjurer', 11, 3, '🦴', 'Reassembles after every fall.'),
      enemy('w3-f4', 'Shade Priest', 12, 3, '🕯', 'Whispers forbidden words.'),
    ],
    bodyguard: bodyguard('w3-bg', 'The Grave Speaker', 13, 3, '⚰️', 'Knows all your sins.'),
    boss: boss('w3-boss', 'Lich King Morvath', 14, 3, '🧛', 'Has died and returned eight times.'),
  },
  {
    id: 4,
    name: 'Volcanic Wastes',
    theme: 'volcano',
    fighters: [
      enemy('w4-f1', 'Magma Imp', 13, 4, '🔥', 'Bursts of pure heat.'),
      enemy('w4-f2', 'Ashwalker', 14, 4, '🌋', 'Cinders for skin.'),
      enemy('w4-f3', 'Forge Brute', 15, 4, '🔨', 'Hammers shake the ground.'),
      enemy('w4-f4', 'Flame Oracle', 16, 4, '🔮', 'Reads futures in fire.'),
    ],
    bodyguard: bodyguard('w4-bg', 'Captain Cinder', 17, 4, '⚡', 'Lieutenant of the Inferno.'),
    boss: boss('w4-boss', 'Pyrelord Ashar', 18, 4, '🐉', 'The volcano answers to him.'),
  },
  {
    id: 5,
    name: 'The Void Spire',
    theme: 'void',
    fighters: [
      enemy('w5-f1', 'Void Apprentice', 17, 5, '🌀', 'Reality bends around them.'),
      enemy('w5-f2', 'Echo of Self', 18, 5, '👤', 'Wears your face.'),
      enemy('w5-f3', 'Star Devourer', 19, 5, '⭐', 'Eats light itself.'),
      enemy('w5-f4', 'Time Twister', 20, 5, '⏳', 'Steals seconds.'),
    ],
    bodyguard: bodyguard('w5-bg', 'The Nameless One', 21, 5, '❓', 'Was someone, once.'),
    boss: boss('w5-boss', 'Voidlord Yhthak', 22, 5, '👁', 'Older than language.'),
  },
  {
    id: 6,
    name: 'The Throne of Stars',
    theme: 'celestial',
    fighters: [
      enemy('w6-f1', 'Celestial Guard', 21, 6, '🌟', 'Forged from constellations.'),
      enemy('w6-f2', 'Comet Rider', 22, 6, '☄️', 'Moves at lightspeed.'),
      enemy('w6-f3', 'Astral Sage', 23, 6, '🌌', 'Charts the cosmos.'),
      enemy('w6-f4', 'Twin Eclipse', 24, 6, '🌑', 'Two minds, one body.'),
    ],
    bodyguard: bodyguard('w6-bg', 'Lord of Galaxies', 25, 6, '🪐', 'Rules a thousand worlds.'),
    boss: boss('w6-boss', 'The First Mage', 26, 6, '✨', 'Wrote the rules of magic.'),
  },
];

export function getWorld(id: number): World | undefined {
  return WORLDS.find((w) => w.id === id);
}

export function getEnemyById(id: string): EnemyDef | undefined {
  for (const w of WORLDS) {
    const all = [...w.fighters, w.bodyguard, w.boss];
    const found = all.find((e) => e.id === id);
    if (found) return found;
  }
  return undefined;
}

export const TRAINING_DUMMY: EnemyDef = {
  id: 'training-dummy',
  name: 'Training Dummy',
  kind: 'dummy',
  level: 1,
  worldId: 0,
  sprite: '🪵',
  flavor: 'It does not fight back. Practice freely.',
};
