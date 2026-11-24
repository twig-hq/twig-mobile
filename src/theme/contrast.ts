import type { ColorTokens } from './colors';

// WCAG 2.1 contrast ratio between two opaque hex colours (#RRGGBB).
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Not an opaque #RRGGBB colour: ${hex}`);
  const [r, g, b] = m.slice(1).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type Role = keyof ColorTokens;

// The pairs the app puts together, and the ratio each must reach in both modes:
// 4.5 for text (WCAG AA), 3 for controls and graphics that carry meaning.
export const contrastRules: readonly { fg: Role; bg: Role; min: number }[] = [
  { fg: 'text', bg: 'background', min: 4.5 },
  { fg: 'text', bg: 'surface', min: 4.5 },
  { fg: 'text', bg: 'surfaceSunken', min: 4.5 },
  { fg: 'textMuted', bg: 'background', min: 4.5 },
  { fg: 'textMuted', bg: 'surface', min: 4.5 },
  { fg: 'textMuted', bg: 'surfaceSunken', min: 4.5 },
  { fg: 'textSubtle', bg: 'surface', min: 4.5 },
  { fg: 'onPrimary', bg: 'primary', min: 4.5 },
  { fg: 'danger', bg: 'background', min: 4.5 },
  { fg: 'danger', bg: 'surface', min: 4.5 },
  { fg: 'onDanger', bg: 'danger', min: 4.5 },
  { fg: 'link', bg: 'background', min: 4.5 },
  { fg: 'link', bg: 'surface', min: 4.5 },
  { fg: 'link', bg: 'surfaceSunken', min: 4.5 },
  { fg: 'primary', bg: 'background', min: 3 },
  { fg: 'accent', bg: 'background', min: 3 },
  { fg: 'accent', bg: 'surface', min: 3 },
  { fg: 'borderInput', bg: 'background', min: 3 },
  { fg: 'borderInput', bg: 'surface', min: 3 },
  { fg: 'focus', bg: 'background', min: 3 },
  { fg: 'pen', bg: 'background', min: 3 },
];
