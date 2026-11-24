import { palette } from './palette';

// Colours by role. Screens use these names, never a colour value, so dark mode
// and any later palette change happen here only.
export type ColorTokens = {
  /** The page behind everything. */
  background: string;
  /** Raised areas on the page: fields, cards, sheets, list rows. */
  surface: string;
  /** Areas set into the page, like a grouped section. */
  surfaceSunken: string;
  /** Main text and icons. */
  text: string;
  /** Secondary text: hints, captions, labels. */
  textMuted: string;
  /** Placeholder text in fields. */
  textSubtle: string;
  /** Primary buttons and other filled controls. */
  primary: string;
  /** Text and icons on `primary`. */
  onPrimary: string;
  /** Small accents that are not text: the caret, the active tab's mark. */
  accent: string;
  /** Text of small text-only actions, like "Send the code again". */
  link: string;
  /** Destructive actions and errors, as text or as a fill. */
  danger: string;
  /** Text and icons on `danger`. */
  onDanger: string;
  /** Hairline dividers and quiet outlines that carry no meaning on their own. */
  border: string;
  /** Outline of a field or control, strong enough to see where it is. */
  borderInput: string;
  /** Focus and selection rings. */
  focus: string;
  /** Dims the screen behind a sheet or dialog. */
  scrim: string;
  /** The birds' pen lines. */
  pen: string;
};

export const lightColors: ColorTokens = {
  background: palette.cream,
  surface: palette.paper,
  surfaceSunken: palette.oat,
  text: palette.forest,
  textMuted: palette.slate,
  textSubtle: '#5F6E66',
  primary: palette.forest,
  onPrimary: palette.cream,
  accent: palette.orange,
  link: '#AD4522',
  danger: '#B4441F',
  onDanger: palette.paper,
  border: 'rgba(31, 69, 53, 0.14)',
  borderInput: '#7A8F84',
  focus: palette.forest,
  scrim: 'rgba(20, 30, 25, 0.4)',
  pen: palette.pen,
};

// Dark mode is the logo reversed: cream on a deep green. A first pass, not yet
// reviewed on the design canvas.
export const darkColors: ColorTokens = {
  background: '#13221B',
  surface: '#1B2F25',
  surfaceSunken: '#0E1A14',
  text: palette.cream,
  textMuted: '#B9C4BD',
  textSubtle: '#93A39A',
  primary: palette.cream,
  onPrimary: palette.forest,
  accent: '#E8774F',
  link: '#F2A283',
  danger: '#F08A6A',
  onDanger: '#13221B',
  border: 'rgba(247, 241, 230, 0.14)',
  borderInput: '#737D72',
  focus: palette.cream,
  scrim: 'rgba(0, 0, 0, 0.55)',
  pen: '#E9E4D6',
};
