import { palette } from '@/theme';

import { between, seeded } from './random';

// The thumbprint birds, as drawn on the design canvas: one 120 x 140 drawing
// that every size scales from. The print is a seeded whorl of dashed ridges
// clipped to a blob; the pen lines (beak, eye, wing, tail, legs and the
// person's extra) are drawn over it.

export const VIEW = { width: 120, height: 140 } as const;

/** The print's outline. */
export const BLOB =
  'M 60 34 C 84 33 97 56 95 82 C 93 107 78 119 58 119 C 38 119 24 105 24 80 C 24 54 37 35 60 34 Z';

export type Ridge = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  dashes: number[];
  phase: number;
};

/** The print's ridges for a seed: the same seed always gives the same print. */
export function ridges(seed: number): Ridge[] {
  const rnd = seeded(seed);
  const cx = 60 + between(rnd, -5, 5);
  const cy = 76 + between(rnd, -6, 6);
  const rotate = between(rnd, -25, 25);
  const out: Ridge[] = [];
  for (let i = 1; i < 16; i++) {
    const ry = i * 4.7;
    const rx = ry * 0.78;
    const length = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
    // broken ridges: runs of ink with small gaps, like a real print
    const dashes: number[] = [];
    let left = length;
    while (left > 0) {
      const on = between(rnd, 0.16, 0.42) * length;
      dashes.push(Math.round(on), Math.round(between(rnd, 2.5, 6)));
      left -= on;
    }
    out.push({ cx, cy, rx, ry, rotate, dashes, phase: Math.round(between(rnd, 0, 40)) });
  }
  return out;
}

/** Pen lines every bird has. */
export const PEN = {
  beak: 'M 27 66 L 13 71 L 27 77 Z',
  wing: 'M 58 80 C 68 70 86 74 84 90 C 76 98 64 94 58 80 Z M 66 84 C 70 82 76 83 78 88',
  tail: 'M 92 94 L 110 88 M 93 99 L 112 100 M 91 104 L 108 112',
  legs: 'M 50 118 L 48 127 M 68 118 L 70 127 M 41 129 L 48 127 L 53 130 M 63 129 L 70 127 L 75 130',
  eye: { cx: 41, cy: 62, r: 3.2 },
} as const;

export const EXTRAS = ['none', 'headphones', 'flower', 'hat', 'bun', 'glasses'] as const;
export type Extra = (typeof EXTRAS)[number];

/** One piece of an extra: a pen line, or a filled shape outlined in pen. */
export type Piece =
  | { kind: 'line'; d: string; width?: number }
  | { kind: 'fill'; d: string; fill: string; width?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; width?: number };

const petal = (c: number, s: number) =>
  ({ kind: 'circle', cx: 58 + 5.4 * c, cy: 14 + 5.4 * s, r: 3.6, fill: palette.orange, width: 1.6 }) as const;

export const EXTRA_PIECES: Record<Extra, Piece[]> = {
  none: [],
  flower: [
    { kind: 'line', d: 'M 56 34 C 56 28 57 24 58 20' },
    petal(0, -1),
    petal(0.95, -0.31),
    petal(0.59, 0.81),
    petal(-0.59, 0.81),
    petal(-0.95, -0.31),
    { kind: 'circle', cx: 58, cy: 14, r: 2.4, fill: palette.butter, width: 1.4 },
  ],
  headphones: [
    { kind: 'line', d: 'M 30 56 C 26 22 84 18 86 50' },
    {
      kind: 'fill',
      d: 'M 29 52 h 0 a 5 5 0 0 1 5 5 v 7 a 5 5 0 0 1 -10 0 v -7 a 5 5 0 0 1 5 -5 Z',
      fill: palette.forest,
      width: 2,
    },
    {
      kind: 'fill',
      d: 'M 87 46 a 5 5 0 0 1 5 5 v 7 a 5 5 0 0 1 -10 0 v -7 a 5 5 0 0 1 5 -5 Z',
      fill: palette.forest,
      width: 2,
    },
  ],
  hat: [
    { kind: 'fill', d: 'M 42 33 L 44 14 L 72 14 L 74 32 Z', fill: palette.butter },
    { kind: 'line', d: 'M 32 36 C 48 30 68 30 84 34' },
    { kind: 'line', d: 'M 43.5 26 L 73 25', width: 4 },
  ],
  bun: [
    { kind: 'circle', cx: 62, cy: 27, r: 9, fill: palette.paper },
    { kind: 'line', d: 'M 56 26 C 59 23 64 23 67 27 M 59 30 C 61 28 64 28 66 30' },
    { kind: 'line', d: 'M 70 20 L 80 10 M 72 24 L 84 18' },
  ],
  glasses: [
    { kind: 'circle', cx: 41, cy: 62, r: 8, fill: 'transparent', width: 2 },
    { kind: 'line', d: 'M 49 61 L 62 56', width: 2 },
  ],
};

/** The hat's band is rust, not pen. */
export const HAT_BAND = palette.rust;
