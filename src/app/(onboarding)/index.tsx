import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Egg } from '@/auth/Egg';
import { Button, Text, useToast } from '@/components';
import { useSession } from '@/session';
import { useTheme } from '@/theme';

// A stand-in for onboarding until issue #29 builds it: it says what is
// coming and lets the person into the app.
export default function OnboardingScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { setOnboarded } = useSession();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await setOnboarded(true);
    } catch {
      setSaving(false);
      toast.show("That didn't save. Check your connection and try again.", { tone: 'error' });
    }
  };

  return (
    <View
      style={[
        styles.fill,
        {
          backgroundColor: t.colors.background,
          paddingTop: insets.top + t.space.xxl,
          paddingBottom: insets.bottom + t.space.xl,
          paddingHorizontal: t.gutter,
        },
      ]}
    >
      <View style={[styles.fill, styles.center, { gap: t.space.lg }]}>
        <Egg mood="hatched" size={110} />
        <View style={{ gap: t.space.sm }}>
          <Text variant="display" align="center" accessibilityRole="header">
            Welcome to Twig
          </Text>
          <Text color="textMuted" align="center">
            Next you&apos;ll make your bird and tell Twig a little about you. That part arrives in the next
            update.
          </Text>
        </View>
      </View>
      <Button label="Continue" loading={saving} onPress={finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
