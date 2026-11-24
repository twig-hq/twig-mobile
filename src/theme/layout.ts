// Spacing, corner radii and fixed sizes, in points (dp on Android).

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Space between a screen's content and its left and right edges. */
export const gutter = space.xl;

export const radius = {
  xs: 6,
  sm: 12, // code-entry boxes
  md: 18, // fields, cards, list groups
  lg: 22,
  xl: 28, // sheets
  pill: 999, // buttons, chips, tags
} as const;

export const size = {
  /** Smallest tap target for anything a person can press (Apple's guideline). */
  minTapTarget: 44,
  /** Height of buttons and single-line fields. */
  control: 56,
  icon: 24,
  iconSmall: 18,
} as const;
