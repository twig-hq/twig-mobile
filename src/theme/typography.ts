import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import type { TextStyle } from 'react-native';

// Figtree, a round, friendly typeface. Each weight is its own
// font family, so text styles set `fontFamily` and never `fontWeight`
// (Android would otherwise pick a fallback face).
export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

/** Passed to `useFonts` in the root layout. */
export const fontFiles = {
  [fonts.regular]: Figtree_400Regular,
  [fonts.medium]: Figtree_500Medium,
  [fonts.semibold]: Figtree_600SemiBold,
  [fonts.bold]: Figtree_700Bold,
};

type TextToken = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'
>;

// Sizes are at the phone's default text size. React Native scales both size
// and line height with the person's text-size setting, so nothing here turns
// that off.
export const text = {
  /** Screen titles. */
  display: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  /** Sheet titles and big numbers. */
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  /** Names in rows, emphasised lines. */
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  /** Running text. */
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  /** Field labels and section labels. */
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  /** Button text. */
  button: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  /** Hints under fields and small notes. */
  footnote: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19 },
  /** Tags, tiny labels and the label inside a field. */
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 16 },
  /** Small uppercase headings above a group, like "ABOUT YOU · 3 OF 3". */
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  /** One character in the 8-character code entry. */
  code: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
} satisfies Record<string, TextToken>;

export type TextVariant = keyof typeof text;
