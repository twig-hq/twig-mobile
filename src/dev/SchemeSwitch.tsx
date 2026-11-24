import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Scheme } from '@/theme';

/** Light / Dark switch for the development-only screens. */
export function SchemeSwitch({ scheme, onScheme }: { scheme: Scheme; onScheme: (s: Scheme) => void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.row, { gap: t.space.sm }]}>
      {(['light', 'dark'] as const).map((s) => {
        const on = s === scheme;
        return (
          <Pressable
            key={s}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onScheme(s)}
            style={{
              minHeight: t.size.minTapTarget,
              paddingHorizontal: t.space.lg,
              justifyContent: 'center',
              borderRadius: t.radius.pill,
              borderWidth: 1.5,
              borderColor: on ? t.colors.primary : t.colors.borderInput,
              backgroundColor: on ? t.colors.primary : t.colors.surface,
            }}
          >
            <Text style={[t.text.label, { color: on ? t.colors.onPrimary : t.colors.text }]}>
              {s === 'light' ? 'Light' : 'Dark'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
