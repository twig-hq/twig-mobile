import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  /** Something on the left, like a bird or an icon. Decorative. */
  leading?: ReactNode;
  /** Something small on the right, like a status tag. Decorative. */
  trailing?: ReactNode;
  /** Makes the row a button and shows a chevron. */
  onPress?: () => void;
  /** Makes the row an on/off switch. The whole row toggles it. */
  toggle?: { value: boolean; onValueChange: (on: boolean) => void };
  /** The danger colour for the title, for rows like Block. */
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * A soft filled row: a person, a setting, a link to another screen.
 * Screen readers hear it as one element: the title, then the subtitle.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  toggle,
  destructive = false,
  disabled = false,
}: Props) {
  const t = useTheme();

  const content = (
    <>
      {leading && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {leading}
        </View>
      )}
      <View style={[styles.text, { gap: t.space.xxs }]}>
        <Text variant="headline" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {trailing}
        </View>
      )}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          disabled={disabled}
          trackColor={{ true: t.colors.primary, false: t.colors.borderInput }}
          thumbColor={t.colors.surface}
          ios_backgroundColor={t.colors.borderInput}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : onPress ? (
        <Icon name="forward" color="textMuted" size={t.size.iconSmall} />
      ) : null}
    </>
  );

  const rowStyle = [
    styles.row,
    {
      minHeight: t.size.control + t.space.md,
      paddingVertical: t.space.md,
      paddingHorizontal: t.space.lg,
      gap: t.space.md,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.surfaceSunken,
      opacity: disabled ? 0.5 : 1,
    },
  ];
  const label = subtitle ? `${title}, ${subtitle}` : title;

  if (toggle) {
    return (
      <Pressable
        onPress={() => toggle.onValueChange(!toggle.value)}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: toggle.value, disabled }}
        style={rowStyle}
      >
        {content}
      </Pressable>
    );
  }
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [rowStyle, pressed && { opacity: 0.75 }]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityLabel={label} style={rowStyle}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
});
