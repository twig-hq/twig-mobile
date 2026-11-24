import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme, type ColorTokens } from '@/theme';

// Pen-drawn line icons in the hand of the designs: round caps, 24 x 24 grid.
const paths = {
  back: 'M 14.5 5 L 7.5 12 L 14.5 19',
  forward: 'M 9.5 5 L 16.5 12 L 9.5 19',
  close: 'M 6 6 L 18 18 M 18 6 L 6 18',
  check: 'M 5 12.5 L 10 17.5 L 19 7',
  plus: 'M 12 5 V 19 M 5 12 H 19',
  mail: 'M 5.5 5 H 18.5 C 19.9 5 21 6.1 21 7.5 V 16.5 C 21 17.9 19.9 19 18.5 19 H 5.5 C 4.1 19 3 17.9 3 16.5 V 7.5 C 3 6.1 4.1 5 5.5 5 Z M 3.5 6.5 L 12 13 L 20.5 6.5',
  alert: 'M 12 7.5 V 13 M 12 16.6 V 16.8 M 12 3.5 C 16.7 3.5 20.5 7.3 20.5 12 C 20.5 16.7 16.7 20.5 12 20.5 C 7.3 20.5 3.5 16.7 3.5 12 C 3.5 7.3 7.3 3.5 12 3.5 Z',
} as const;

export type IconName = keyof typeof paths;

type Props = {
  name: IconName;
  /** A colour role from the theme. Defaults to `text`. */
  color?: keyof ColorTokens;
  size?: number;
  strokeWidth?: number;
};

/** A decorative icon: screen readers skip it, so give its button or row a label. */
export function Icon({ name, color = 'text', size, strokeWidth = 2.3 }: Props) {
  const t = useTheme();
  const s = size ?? t.size.icon;
  return (
    // hidden on the wrapping View: react-native-svg passes these props to the DOM on web
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <Path
          d={paths[name]}
          stroke={t.colors[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
