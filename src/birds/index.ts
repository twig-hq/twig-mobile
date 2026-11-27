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

/** Parents' birds are drawn a little bigger, like the parent print in the logo. */
export function birdScale(role: 'parent' | 'child' | null | undefined): number {
  return role === 'parent' ? 1 : 0.84;
}

/** A print's number, shown under a new bird ("Print no. 4821"). */
export function printNumber(seed: number): number {
  return 1000 + (Math.abs(seed) % 9000);
}

/** A new print pattern: a positive 31-bit whole number, as the database stores it. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

/** The database's name for a bird colour ('gold'), from its display name ('Gold'). */
export function colorKey(name: string): string {
  return name.toLowerCase();
}
