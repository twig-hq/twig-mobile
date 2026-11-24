import { StyleSheet, Text as RNText, View } from 'react-native';

import { contrastRatio, palette, useTheme } from '@/theme';

type Props = {
  /** The person's name. Its first letter is shown, and screen readers hear the name. */
  name: string;
  /** The person's bird colour, from `birdColors`. */
  color: string;
  size?: number;
  /** Set when the name is already written next to the avatar, so it is not read twice. */
  decorative?: boolean;
};

/**
 * A stand-in for a person's thumbprint bird: a circle in their bird colour
 * with their first letter. The drawn bird will replace the inside; the props
 * stay the same.
 */
export function Avatar({ name, color, size, decorative = false }: Props) {
  const t = useTheme();
  const d = size ?? t.size.control;
  const letter = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '';
  // whichever of the two brand inks reads better on this colour
  const ink =
    contrastRatio(color, palette.cream) >= contrastRatio(color, palette.forest)
      ? palette.cream
      : palette.forest;
  return (
    <View
      accessible={!decorative}
      accessibilityRole="image"
      accessibilityLabel={name}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={[styles.circle, { width: d, height: d, borderRadius: d / 2, backgroundColor: color }]}
    >
      {/* sized to the circle, so it does not grow with the text-size setting */}
      <RNText
        allowFontScaling={false}
        style={{
          fontFamily: t.text.title.fontFamily,
          fontSize: d * 0.42,
          color: ink,
        }}
      >
        {letter}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
