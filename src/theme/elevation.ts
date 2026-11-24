import type { ColorSchemeName } from 'react-native';

// Shadows, as `boxShadow` values (supported on iOS and Android with the New
// Architecture). Dark mode needs darker, wider shadows to show at all.

export type ElevationTokens = {
  /** Cards and list groups resting on the page. */
  card: string;
  /** Things that float above content: the Share button, toasts. */
  floating: string;
  /** Bottom sheets, casting upwards. */
  sheet: string;
};

const light: ElevationTokens = {
  card: '0px 1px 2px rgba(42, 28, 22, 0.08), 0px 6px 16px rgba(60, 40, 20, 0.08)',
  floating: '0px 8px 18px rgba(31, 69, 53, 0.3)',
  sheet: '0px -10px 30px rgba(0, 0, 0, 0.18)',
};

const dark: ElevationTokens = {
  card: '0px 1px 2px rgba(0, 0, 0, 0.4), 0px 6px 16px rgba(0, 0, 0, 0.3)',
  floating: '0px 8px 20px rgba(0, 0, 0, 0.5)',
  sheet: '0px -10px 30px rgba(0, 0, 0, 0.5)',
};

export function elevationFor(scheme: ColorSchemeName): ElevationTokens {
  return scheme === 'dark' ? dark : light;
}
