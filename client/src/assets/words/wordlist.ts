export type WordTier = 1 | 2 | 3 | 4 | 5;

export const TIER_1: readonly string[] = [
  'cat', 'dog', 'sun', 'run', 'fix', 'big', 'red', 'top', 'box', 'cup',
  'hat', 'map', 'pen', 'arm', 'leg', 'eye', 'ear', 'fly', 'sky', 'sea',
  'fox', 'owl', 'bee', 'ice', 'bow', 'key', 'jar', 'tea', 'pie', 'cab',
  'fire', 'wind', 'rock', 'tree', 'leaf', 'star', 'moon', 'wolf', 'bear', 'fish',
  'gold', 'coin', 'ring', 'sand', 'wave', 'lake', 'cave', 'gate', 'door', 'hand',
  'mind', 'soul', 'time', 'rain', 'snow', 'cold', 'warm', 'fast', 'slow', 'jump',
  'walk', 'talk', 'sing', 'play', 'work', 'read', 'glow', 'cast', 'spell', 'wand',
  'mage', 'orb', 'bolt', 'gem', 'staff', 'rune', 'echo', 'mist', 'dawn', 'dusk',
];

export const TIER_2: readonly string[] = [
  'stone', 'brave', 'magic', 'shine', 'flame', 'frost', 'storm', 'cloud', 'river', 'forest',
  'castle', 'shield', 'sword', 'arrow', 'crown', 'jewel', 'ember', 'spark', 'flash', 'glade',
  'knight', 'wizard', 'dragon', 'goblin', 'phoenix', 'silver', 'mighty', 'silent', 'hidden', 'sacred',
  'spirit', 'shadow', 'breath', 'thunder', 'lightning', 'glory', 'honor', 'quest', 'realm', 'tower',
  'temple', 'crystal', 'golden', 'ancient', 'mystic', 'glimmer', 'whisper', 'wonder', 'wisdom', 'valor',
  'cursed', 'glowing', 'haunted', 'twisted', 'frozen', 'burning', 'fading', 'rising', 'falling', 'soaring',
  'serpent', 'phantom', 'warrior', 'archer', 'ranger', 'cleric', 'druid', 'paladin', 'rogue', 'scholar',
  'forge', 'anvil', 'helmet', 'plate', 'amulet', 'totem', 'rune', 'scroll', 'tome', 'grimoire',
];

export const TIER_3: readonly string[] = [
  'enchanted', 'mysterious', 'legendary', 'dangerous', 'beautiful', 'wonderful', 'powerful', 'dreadful',
  'venomous', 'poisonous', 'ferocious', 'glorious', 'mountain', 'fortress', 'kingdom', 'wilderness',
  'lightning', 'whirlwind', 'starlight', 'moonbeam', 'firestorm', 'icestorm', 'dragonfire', 'spellbook',
  'invisible', 'invincible', 'unstoppable', 'unbreakable', 'invocation', 'incantation', 'manifest',
  'summoning', 'banishing', 'transform', 'conjuring', 'channeling', 'meditation', 'concentration',
  'protection', 'destruction', 'creation', 'corruption', 'elemental', 'celestial', 'ethereal', 'infernal',
  'sorcerer', 'enchanter', 'necromancer', 'illusionist', 'spellcaster', 'archmage', 'guardian',
  'champion', 'crusader', 'mercenary', 'apprentice', 'mentor', 'disciple', 'overlord', 'warlord',
  'twilight', 'eclipse', 'tempest', 'cataclysm', 'maelstrom', 'tornado', 'hurricane', 'avalanche',
];

export const TIER_4: readonly string[] = [
  'enchantment', 'sorcery', 'alchemist', 'archmagus', 'archvillain', 'apparition', 'banishment',
  'consecration', 'desolation', 'devastation', 'enlightenment', 'transformation', 'transmutation',
  'manifestation', 'investigation', 'preservation', 'restoration', 'incarnation', 'illumination',
  'extraordinary', 'unfathomable', 'unforgettable', 'inconceivable', 'unimaginable', 'incomprehensible',
  'thunderstrike', 'soulshatter', 'mindbender', 'bonecrusher', 'spellweaver', 'doomslayer',
  'starforged', 'moonblessed', 'sunscorched', 'voidtouched', 'shadowbound', 'frostbitten',
  'wildfire', 'firestarter', 'icebreaker', 'stormcaller', 'soulkeeper', 'gatekeeper', 'lorekeeper',
  'witchhunter', 'dragonslayer', 'demonbane', 'lightbringer', 'duskweaver', 'spellforger',
];

export const TIER_5: readonly string[] = [
  'thaumaturgical', 'necromantically', 'transcendental', 'metamorphosis', 'incomprehensibly',
  'extraterrestrial', 'unconditionally', 'simultaneously', 'incontrovertible', 'phantasmagoria',
  'paraphernalia', 'antediluvian', 'sesquipedalian', 'arithmancer', 'ornithomancer',
  'pyrokinesis', 'cryomancer', 'electromancer', 'chronomancer', 'aeromancer',
  'unconquerable', 'indestructible', 'imperturbable', 'unchallengeable', 'unprecedented',
  'thunderbringer', 'starswallower', 'moondestroyer', 'soulharvester', 'mindobliterator',
  'unfathomably', 'incandescently', 'preternaturally', 'cataclysmically', 'apocalyptically',
];

export const ALL_TIERS = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5] as const;

export function getTierWords(tier: WordTier): readonly string[] {
  return ALL_TIERS[tier - 1] ?? TIER_1;
}
