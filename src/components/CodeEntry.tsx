import { forwardRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

/** Characters an invite code can contain: no I, O, 0 or 1, so nothing is misread. */
export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const DIGITS = '0123456789';

/**
 * Turns whatever was typed or pasted into a code: upper case, only allowed
 * characters, at most `length` of them. Spaces and dashes from a pasted
 * "K7QM-2XRT" simply drop out.
 */
export function cleanCode(input: string, alphabet: string, length: number): string {
  let out = '';
  for (const ch of input.toUpperCase()) {
    if (alphabet.includes(ch)) out += ch;
    if (out.length === length) break;
  }
  return out;
}

type Props = {
  value: string;
  onChangeText: (code: string) => void;
  /** Called once the last box is filled. */
  onComplete?: (code: string) => void;
  /** What a screen reader calls the field, like "Invite code". */
  label: string;
  /** 8 for invite codes, 6 for the emailed sign-in code. */
  length?: number;
  alphabet?: string;
  /** `error` outlines every box in the danger colour, `success` in the primary colour. */
  status?: 'normal' | 'error' | 'success';
  editable?: boolean;
  autoFocus?: boolean;
};

/**
 * One box per character, split into two groups. Underneath is a single
 * text input, so typing, pasting and the phone's code autofill all work,
 * and screen readers meet one field instead of eight.
 */
export const CodeEntry = forwardRef<ComponentRef<typeof TextInput>, Props>(function CodeEntry(
  {
    value,
    onChangeText,
    onComplete,
    label,
    length = 8,
    alphabet = INVITE_ALPHABET,
    status = 'normal',
    editable = true,
    autoFocus,
  },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const digits = alphabet === DIGITS;
  const split = Math.ceil(length / 2);
  const active = focused && status === 'normal' ? Math.min(value.length, length - 1) : -1;

  const change = (text: string) => {
    const code = cleanCode(text, alphabet, length);
    onChangeText(code);
    if (code.length === length && value.length < length) onComplete?.(code);
  };

  const boxBorder = (i: number) => {
    if (status === 'error') return t.colors.danger;
    if (status === 'success') return t.colors.primary;
    if (i === active) return t.colors.focus;
    return t.colors.borderInput;
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.row, { gap: t.space.xs + t.space.xxs }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[
              styles.box,
              {
                marginLeft: i === split ? t.space.md - (t.space.xs + t.space.xxs) : 0,
                minHeight: t.size.control - t.space.xs - t.space.xxs,
                borderRadius: t.radius.sm,
                borderWidth: i === active || status !== 'normal' ? 2 : 1.5,
                borderColor: boxBorder(i),
                backgroundColor: t.colors.surface,
                opacity: editable ? 1 : 0.6,
              },
            ]}
          >
            <Text variant="code" align="center">
              {value[i] ?? ''}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={change}
        editable={editable}
        autoFocus={autoFocus}
        maxLength={length + 8}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        keyboardType={digits ? 'number-pad' : 'default'}
        textContentType={digits ? 'oneTimeCode' : 'none'}
        autoComplete={digits ? 'one-time-code' : 'off'}
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? value.split('').join(' ') : 'empty' }}
        accessibilityHint={`${length} characters`}
        caretHidden
        selectionColor="transparent"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // invisible, but covering the boxes so taps and long-press paste land on it
        style={[StyleSheet.absoluteFill, styles.hidden]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  box: { flex: 1, maxWidth: 48, alignItems: 'center', justifyContent: 'center' },
  hidden: { color: 'transparent', opacity: 0.02 },
});
