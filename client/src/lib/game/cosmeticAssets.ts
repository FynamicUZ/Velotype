export const HAT_SPRITES: Record<string, string> = {
  apprentice: '🧙',
  wizard: '🧙‍♂️',
  crown: '🤴',
};

export const WAND_PROJECTILE: Record<string, string> = {
  oak: 'bg-arcane-violet',
  crystal: 'bg-arcane-cyan',
  phoenix: 'bg-arcane-orange',
};

export const WAND_EMOJI: Record<string, string> = {
  oak: '🪄',
  crystal: '🔮',
  phoenix: '🔥',
};

export const WAND_GLOW: Record<string, string> = {
  oak: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.9))',
  crystal: 'drop-shadow(0 0 12px rgba(34, 211, 238, 0.9))',
  phoenix: 'drop-shadow(0 0 12px rgba(251, 146, 60, 0.9))',
};

export const PARTICLE_EMOJI: Record<string, string> = {
  spark: '✨',
  starfall: '🌠',
  inferno: '🔥',
};

export function spriteForHat(hatId: string): string {
  return HAT_SPRITES[hatId] ?? '🧙';
}

export function colorForWand(wandId: string): string {
  return WAND_PROJECTILE[wandId] ?? 'bg-arcane-violet';
}

export function emojiForWand(wandId: string): string {
  return WAND_EMOJI[wandId] ?? '🪄';
}

export function glowForWand(wandId: string): string {
  return WAND_GLOW[wandId] ?? WAND_GLOW.oak!;
}

export function emojiForParticles(particleId: string): string {
  return PARTICLE_EMOJI[particleId] ?? '✨';
}
