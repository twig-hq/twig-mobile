import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type Action = { label: string; onPress: () => void; accessibilityHint?: string };

type Props = {
  /** Shows the round back button. */
  onBack?: () => void;
  /** A short title in the middle, like "Name and bird". */
  title?: string;
  /** A text action on the right, like Skip or Save. */
  action?: Action;
  /** Anything else on the right instead of `action`, like the person's bird. */
  right?: ReactNode;
};

/** The row at the top of a screen, below the status bar. */
export function ScreenHeader({ onBack, title, action, right }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const side = t.size.minTapTarget;

  return (
    <View
      style={[
        styles.row,
        {
          paddingTop: insets.top + t.space.sm,
          paddingHorizontal: t.space.lg,
          paddingBottom: t.space.sm,
          gap: t.space.sm,
        },
      ]}
    >
      <View style={[styles.side, { minWidth: side }]}>
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={t.space.xs}
            style={({ pressed }) => [
              styles.round,
              {
                width: side,
                height: side,
                borderRadius: side / 2,
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon name="back" size={t.size.iconSmall + 2} strokeWidth={2.4} />
          </Pressable>
        )}
      </View>

      <View style={styles.middle}>
        {title ? (
          <Text variant="headline" align="center" accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.end, { minWidth: side }]}>
        {right ??
          (action && (
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityHint={action.accessibilityHint}
              style={({ pressed }) => ({
                minHeight: side,
                paddingHorizontal: t.space.sm + t.space.xxs,
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text variant="label">{action.label}</Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { flexShrink: 0 },
  end: { alignItems: 'flex-end' },
  middle: { flex: 1 },
  round: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
