import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type ColorTokens, type TextVariant } from '@/theme';

type Props = TextProps & {
  /** A text style from the theme. Defaults to `body`. */
  variant?: TextVariant;
  /** A colour role from the theme. Defaults to `text`. */
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right';
};

/**
 * Text in Twig's type scale. It grows with the phone's text-size setting,
 * like every React Native text unless told otherwise.
 */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: Props) {
  const t = useTheme();
  return (
    <RNText
      {...rest}
      style={[t.text[variant], { color: t.colors[color] }, align && { textAlign: align }, style]}
    />
  );
}
