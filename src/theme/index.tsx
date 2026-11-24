import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ColorTokens } from './colors';
import { elevationFor, type ElevationTokens } from './elevation';
import { gutter, radius, size, space } from './layout';
import { duration, easing } from './motion';
import { fonts, text } from './typography';

export type Scheme = 'light' | 'dark';

export type Theme = {
  scheme: Scheme;
  colors: ColorTokens;
  elevation: ElevationTokens;
  text: typeof text;
  fonts: typeof fonts;
  space: typeof space;
  gutter: typeof gutter;
  radius: typeof radius;
  size: typeof size;
  duration: typeof duration;
  easing: typeof easing;
};

export function themeFor(scheme: Scheme): Theme {
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    elevation: elevationFor(scheme),
    text,
    fonts,
    space,
    gutter,
    radius,
    size,
    duration,
    easing,
  };
}

const ThemeContext = createContext<Scheme | null>(null);

/** Forces light or dark for everything inside it (the token screen uses this). */
export function ThemeScheme({ scheme, children }: { scheme: Scheme; children: ReactNode }) {
  return <ThemeContext.Provider value={scheme}>{children}</ThemeContext.Provider>;
}

/** The current theme: the phone's light or dark setting, unless a `ThemeScheme` above says otherwise. */
export function useTheme(): Theme {
  const forced = useContext(ThemeContext);
  const system = useColorScheme();
  return themeFor(forced ?? (system === 'dark' ? 'dark' : 'light'));
}

export { birdColors, palette, type BirdColor } from './palette';
export { contrastRatio, contrastRules } from './contrast';
export { useMotion, useReduceMotion, type DurationName } from './motion';
export { fontFiles, type TextVariant } from './typography';
export type { ColorTokens, ElevationTokens };
