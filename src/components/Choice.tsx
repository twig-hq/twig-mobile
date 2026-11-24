import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** radio: one of a group (the default). checkbox: any number can be on. */
  kind?: 'radio' | 'checkbox';
};

/** One full-width answer in a list of answers. Put radios in a View with `accessibilityRole="radiogroup"`. */
export function ChoiceRow({ label, selected, onPress, kind = 'radio' }: Props) {
  const t = useTheme();
  const dot = t.size.icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={kind}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: t.size.control,
          paddingVertical: t.space.md - 2,
          paddingLeft: t.space.xl - 2,
          paddingRight: t.space.lg - 2,
          gap: t.space.md,
          borderRadius: t.radius.xl,
          borderWidth: 2,
          borderColor: selected ? t.colors.focus : 'transparent',
          backgroundColor: selected ? t.colors.surface : t.colors.surfaceSunken,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text variant="headline" style={styles.grow}>
        {label}
      </Text>
      <View
        style={[
          styles.dot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            borderWidth: selected ? 0 : 1.5,
            borderColor: t.colors.borderInput,
            backgroundColor: selected ? t.colors.primary : 'transparent',
          },
        ]}
      >
        {selected && <Icon name="check" color="onPrimary" size={dot * 0.6} strokeWidth={3.2} />}
      </View>
    </Pressable>
  );
}

/** A small pill that turns on and off, for picking several from a wrapping group. */
export function Chip({ label, selected, onPress }: Omit<Props, 'kind'>) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: t.size.minTapTarget + t.space.xs,
          paddingVertical: t.space.sm,
          paddingHorizontal: t.space.lg + t.space.xxs,
          gap: t.space.xs + t.space.xxs,
          borderRadius: t.radius.xl,
          backgroundColor: selected ? t.colors.primary : t.colors.surfaceSunken,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {selected && <Icon name="check" color="onPrimary" size={t.size.iconSmall - 2} strokeWidth={3} />}
      <Text variant="label" color={selected ? 'onPrimary' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
