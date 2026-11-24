// Where everything sits in the welcome animation, in the design's own units:
// a 390 x 844 phone. The screen scales these to its width. The numbers come
// from the design canvas ("Sign-in: the logo becomes the birds"); the images
// in assets/images/welcome are exported from the same drawing.

export const DESIGN = { width: 390, height: 844 } as const;

/** The scene sits this far below the top of the design. */
const SH = 30;
/** A bird on the twig is drawn at this fraction of its 120 x 140 box. */
const SC = 0.68;
/** Clear space around the bird inside its image, for hats, tails and flowers. */
const PAD = 24;

export const BIRD_IMAGE = { width: (120 + 2 * PAD) * SC, height: (140 + 2 * PAD) * SC } as const;
/** The centre of the print, measured from the image's top left. Birds on the left of the twig face right. */
export const PRINT_CENTRE = { x: (120 - 59.5 + PAD) * SC, y: (76.5 + PAD) * SC } as const;
/** The point a bird squashes and tilts around: its feet. */
export const FEET = { x: '50%', y: `${(((0.92 * 140 + PAD) / (140 + 2 * PAD)) * 100).toFixed(1)}%` } as const;

const perch = (left: number, top: number) => ({ left: left - PAD * SC, top: SH + top - PAD * SC });

/** The two prints of the logo: where each starts (as the splash screen shows them) and when it leaves. */
export const FLYERS = [
  {
    key: 'mom',
    ...perch(14, 255.96),
    from: { x: 184, y: SH + 348, scale: 2.07, rotate: 4 },
    go: 1.5,
    turns: true,
  },
  {
    key: 'sam',
    ...perch(90, 261.45),
    from: { x: 227, y: SH + 373, scale: 1.5, rotate: -9 },
    go: 1.68,
    turns: false,
  },
] as const;
/** How long a print takes to reach the twig. */
export const FLY = 0.85;

/** The rest of the family, pressed onto the twig once the first two have landed. */
export const STAMPED = [
  { key: 'dad', ...perch(166, 261.13), at: 2.75, scale: SC },
  { key: 'nana', ...perch(242, 255.01), at: 2.95, scale: SC },
] as const;
export const EGG = {
  left: 318 - PAD * 0.5,
  top: SH + 266.28 - PAD * 0.5,
  width: 168 * 0.5,
  height: 188 * 0.5,
  at: 3.2,
} as const;

export const TWIG = { left: 0, top: SH + 285, width: 390, height: 120, at: 1.35 } as const;
export const WORD = { left: 143, top: 466, width: 104, height: 52 } as const;
export const TAGLINE = { top: 500, at: 3.0 } as const;
export const BUTTONS_AT = 3.4;

/** The pop-ups loop from here, one round every LOOP seconds. */
export const LOOP_AT = 4.1;
export const LOOP = 16;

/** Each pop-up: its box, when in the loop it appears and leaves (0 to 1), and which bird hops as it appears. */
const M = 34; // the shadow's room around each pop-up image
const bubble = (
  n: number,
  x: number,
  y: number,
  w: number,
  h: number,
  show: number,
  hide: number,
  hops: number,
) => ({
  n,
  left: x - M,
  top: SH + y - M,
  width: w + 2 * M,
  height: h + 2 * M,
  show,
  hide,
  hops,
});
export const BUBBLES = [
  bubble(1, 8, 200, 195.72, 54, 0.02, 0.44, 0),
  bubble(2, 20, 76, 128, 108, 0.08, 0.44, 1),
  bubble(3, 203.14, 200, 178.86, 54, 0.14, 0.44, 2),
  bubble(4, 161.28, 132, 220.72, 54, 0.2, 0.44, 3),
  bubble(5, 8, 200, 174.38, 54, 0.52, 0.94, 0),
  bubble(6, 14, 132, 186.19, 54, 0.58, 0.94, 1),
  bubble(7, 231.72, 200, 150.28, 54, 0.64, 0.94, 2),
  bubble(8, 202.75, 114, 179.25, 70, 0.7, 0.94, 3),
] as const;

export const HEARTS = [
  { left: 176, top: SH + 110, size: 26, delay: 0 },
  { left: 196, top: SH + 122, size: 18, delay: 0.35 / LOOP },
  { left: 160, top: SH + 124, size: 15, delay: 0.7 / LOOP },
] as const;

/** What a screen reader says in place of the whole picture. */
export const SCENE_LABEL = 'Thumbprint birds on a twig, sharing check-ins, photos and voice notes';
