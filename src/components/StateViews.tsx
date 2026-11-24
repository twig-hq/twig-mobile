import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

type Action = { label: string; onPress: () => void };

type EmptyProps = {
  /** A drawing above the words, like a bird on an empty branch. Decorative. */
  art?: ReactNode;
  title: string;
  message?: string;
  action?: Action;
};

/** What a screen shows when there is nothing in it yet, with one thing to do next. */
export function EmptyView({ art, title, message, action }: EmptyProps) {
  const t = useTheme();
  return (
    <View style={[styles.center, { padding: t.space.xl, gap: t.space.lg }]}>
      {art && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {art}
        </View>
      )}
      <View style={{ gap: t.space.xs + t.space.xxs }}>
        <Text variant="title" align="center" accessibilityRole="header">
          {title}
        </Text>
        {message ? (
          <Text color="textMuted" align="center">
            {message}
          </Text>
        ) : null}
      </View>
      {action && <Button label={action.label} onPress={action.onPress} style={styles.stretch} />}
    </View>
  );
}

/** A spinner with words, for a screen that is still fetching. */
export function LoadingView({ label = 'Loading' }: { label?: string }) {
  const t = useTheme();
  return (
    <View
      style={[styles.center, { padding: t.space.xl, gap: t.space.md }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator color={t.colors.primary} />
      <Text variant="footnote" color="textMuted" align="center">
        {label}
      </Text>
    </View>
  );
}

type ErrorProps = {
  title?: string;
  /** What went wrong and what to do, in plain words. */
  message?: string;
  onRetry?: () => void;
};

/** What a screen shows when it could not load. */
export function ErrorView({
  title = "That didn't load",
  message = 'Check your connection and try again.',
  onRetry,
}: ErrorProps) {
  const t = useTheme();
  return (
    <View style={[styles.center, { padding: t.space.xl, gap: t.space.lg }]}>
      <View
        style={{ gap: t.space.xs + t.space.xxs }}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${message}`}
      >
        <Text variant="title" align="center">
          {title}
        </Text>
        <Text color="textMuted" align="center">
          {message}
        </Text>
      </View>
      {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} style={styles.stretch} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  stretch: { alignSelf: 'stretch' },
});
