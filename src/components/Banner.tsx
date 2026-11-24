import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export type Tone = 'info' | 'success' | 'error';

type Props = {
  message: string;
  /** info: a plain note. success: a tick. error: an outline in the danger colour, announced at once. */
  tone?: Tone;
  /** A text action after the message, like "Try again". */
  action?: { label: string; onPress: () => void };
  /** Shows a close button. */
  onDismiss?: () => void;
};

/** A message that sits in the page, above the content it is about. */
export function Banner({ message, tone = 'info', action, onDismiss }: Props) {
  const t = useTheme();
  const error = tone === 'error';
  return (
    <View
      style={[
        styles.row,
        {
          padding: t.space.md,
          paddingLeft: t.space.lg,
          gap: t.space.md,
          borderRadius: t.radius.md,
          borderWidth: 1.5,
          borderColor: error ? t.colors.danger : 'transparent',
          backgroundColor: t.colors.surfaceSunken,
        },
      ]}
    >
      {tone !== 'info' && (
        <Icon
          name={error ? 'alert' : 'check'}
          color={error ? 'danger' : 'text'}
          size={t.size.iconSmall + t.space.xxs}
        />
      )}
      <View
        style={[styles.grow, { gap: t.space.xs }]}
        accessible
        accessibilityRole={error ? 'alert' : 'text'}
        accessibilityLiveRegion={error ? 'assertive' : 'polite'}
        accessibilityLabel={message}
      >
        <Text variant="label">{message}</Text>
      </View>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={t.space.md}
          style={[styles.tap, { minHeight: t.size.minTapTarget }]}
        >
          <Text variant="label" color="link">
            {action.label}
          </Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={[styles.tap, { minWidth: t.size.minTapTarget, minHeight: t.size.minTapTarget }]}
        >
          <Icon name="close" color="textMuted" size={t.size.iconSmall} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  tap: { alignItems: 'center', justifyContent: 'center' },
});
