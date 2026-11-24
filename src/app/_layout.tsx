import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ToastProvider } from '@/components';
import { fontFiles, useTheme } from '@/theme';

// Keep the splash screen up until the fonts are ready, so the first screen
// never shows in a fallback typeface.
SplashScreen.preventAutoHideAsync();

// The real navigation (Home, Discover, Archive, Relationships, Settings)
// arrives with the app shell (issue #22). Until then: one stack.
export default function RootLayout() {
  const [loaded, error] = useFonts(fontFiles);
  const theme = useTheme();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ToastProvider>
    </ThemeProvider>
  );
}
