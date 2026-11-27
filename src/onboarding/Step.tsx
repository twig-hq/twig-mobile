import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader, Text } from '@/components';
import { useTheme } from '@/theme';

export const STEPS = 3;

type Props = {
  step: number;
  title: string;
  subtitle?: string;
  /** The buttons at the bottom, which stay in view while the rest scrolls. */
  footer: ReactNode;
  children: ReactNode;
  /** Shows the back button. The first step has nowhere to go back to. */
  back?: boolean;
};

/** One onboarding screen: back, "Step 2 of 3", a heading, the content and the buttons. */
export function Step({ step, title, subtitle, footer, children, back = true }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <ScreenHeader
        onBack={back ? () => router.back() : undefined}
        right={
          <Text variant="footnote" color="textMuted" style={{ fontFamily: t.text.label.fontFamily }}>
            Step {step} of {STEPS}
          </Text>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: t.gutter, paddingBottom: t.space.xl, gap: t.space.xl }}
        >
          <View style={{ gap: t.space.sm }}>
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text color="textMuted">{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
        <View
          style={{
            paddingHorizontal: t.gutter,
            paddingTop: t.space.sm,
            paddingBottom: Math.max(insets.bottom, t.space.lg),
            gap: t.space.xs,
          }}
        >
          {footer}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
