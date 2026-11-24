import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Makes the whole card one button. Give it an `accessibilityLabel`. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Adds the card shadow. Most cards sit flat with a hairline edge. */
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A raised area on the page that groups related things. */
export function Card({ children, onPress, accessibilityLabel, raised = false, style }: Props) {
  const t = useTheme();
  const base: ViewStyle = {
    padding: t.space.lg,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    boxShadow: raised ? t.elevation.card : undefined,
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}
