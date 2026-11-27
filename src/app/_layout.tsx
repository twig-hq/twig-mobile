import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ToastProvider } from '@/components';
import { AccountError } from '@/session/AccountError';
import { SessionProvider, useSession } from '@/session';
import { fontFiles, useTheme } from '@/theme';

// Keep the splash screen up until the fonts are ready and the stored session
// has been read, so the first screen is the right one in the right typeface.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}

// Signed-out people only reach the (auth) screens, people who have not
// finished onboarding only reach (onboarding), and everyone else reaches the
// tabs and Settings (the rule is statusFor in src/session). The development
// screens and invite links are open to all.
function Shell() {
  const [loaded, error] = useFonts(fontFiles);
  const theme = useTheme();
  const { status } = useSession();
  const ready = (loaded || error !== null) && status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

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
        {status === 'error' ? (
          <AccountError />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={status === 'signedIn'}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" />
            </Stack.Protected>
            <Stack.Protected guard={status === 'onboarding'}>
              <Stack.Screen name="(onboarding)" />
            </Stack.Protected>
            <Stack.Protected guard={status === 'signedOut'}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}
