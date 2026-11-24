import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import type { TextStyle } from 'react-native';

// DM Sans, the typeface every approved screen uses. Each weight is its own
// font family, so text styles set `fontFamily` and never `fontWeight`
// (Android would otherwise pick a fallback face).
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

/** Passed to `useFonts` in the root layout. */
export const fontFiles = {
  [fonts.regular]: DMSans_400Regular,
  [fonts.medium]: DMSans_500Medium,
  [fonts.semibold]: DMSans_600SemiBold,
  [fonts.bold]: DMSans_700Bold,
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
  display: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  /** Sheet titles and big numbers. */
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  /** Names in rows, emphasised lines. */
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  /** Running text. */
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  /** Field labels and section labels. */
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  /** Button text. */
  button: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  /** Hints under fields and small notes. */
  footnote: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19 },
  /** Tags and tiny labels. */
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
