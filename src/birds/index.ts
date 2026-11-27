import { birdColors } from '@/theme';

import { EXTRAS, type Extra } from './drawing';

export { Bird } from './Bird';
export { EXTRAS, type Extra } from './drawing';

/** A person's bird, as stored on their profile. */
export type BirdLook = {
  /** A bird colour by name ('gold' … 'forest'); null until chosen. */
  color: string | null;
  seed: number;
  extra: Extra;
};

/** The colour to draw: the chosen one, or one picked from the print's seed until then. */
export function birdColor(look: Pick<BirdLook, 'color' | 'seed'>): string {
  const chosen = birdColors.find((c) => c.name.toLowerCase() === look.color);
  return (chosen ?? birdColors[Math.abs(look.seed) % birdColors.length]).color;
}

/** An extra from the database, or none if it is not one the app knows. */
export function toExtra(value: string | null | undefined): Extra {
  return (EXTRAS as readonly string[]).includes(value ?? '') ? (value as Extra) : 'none';
}

/** The bird shown in development previews and anywhere a person is not known yet. */
export const SAMPLE_BIRD: BirdLook = { color: 'gold', seed: 7, extra: 'headphones' };
