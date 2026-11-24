import { forwardRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Shown above the field and read by screen readers. */
  label: string;
  /** A short note under the field. */
  hint?: string;
  /** Replaces the hint, outlines the field in the danger colour and is announced. */
  error?: string;
};

export const TextField = forwardRef<ComponentRef<typeof TextInput>, Props>(function TextField(
  { label, hint, error, onFocus, onBlur, editable = true, ...input },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? t.colors.danger : focused ? t.colors.focus : t.colors.borderInput;

  return (
    <View style={{ gap: t.space.sm }}>
      <Text variant="label" accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <TextInput
        ref={ref}
        {...input}
        editable={editable}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled: !editable }}
        placeholderTextColor={t.colors.textSubtle}
        selectionColor={t.colors.accent}
        cursorColor={t.colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          // size and face from the body style; no line height, which
          // misplaces single-line text on iOS
          { fontFamily: t.text.body.fontFamily, fontSize: t.text.body.fontSize },
          styles.input,
          {
            minHeight: t.size.control,
            paddingHorizontal: t.space.lg + t.space.xxs,
            paddingVertical: t.space.md,
            borderRadius: t.radius.md,
            borderWidth: focused || error ? 2 : 1.5,
            borderColor,
            backgroundColor: t.colors.surface,
            color: t.colors.text,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      />
      {error ? (
        <View
          style={[styles.row, { gap: t.space.xs + t.space.xxs }]}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          accessibilityLabel={error}
        >
          <Icon name="alert" color="danger" size={t.size.iconSmall} />
          <Text variant="footnote" color="danger" style={styles.grow}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="footnote" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  input: { textAlignVertical: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  grow: { flex: 1 },
});
