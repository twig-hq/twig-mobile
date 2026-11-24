import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { useTheme } from "@/theme";

import { Icon } from "./Icon";
import { Text } from "./Text";

type Props = Omit<TextInputProps, "style" | "placeholderTextColor"> & {
  /** Shown inside the box, above the text, and read by screen readers. */
  label: string;
  /** A short note under the field. */
  hint?: string;
  /** Replaces the hint, outlines the field in the danger colour and is announced. */
  error?: string;
};

type Input = ComponentRef<typeof TextInput>;

export const TextField = forwardRef<Input, Props>(function TextField(
  { label, hint, error, onFocus, onBlur, editable = true, ...input },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const inner = useRef<Input | null>(null);
  const setRef = useCallback(
    (node: Input | null) => {
      inner.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const borderColor = error
    ? t.colors.danger
    : focused
      ? t.colors.focus
      : t.colors.borderInput;

  const border = focused || error ? 2 : 1.5;

  return (
    <View style={{ gap: t.space.sm }}>
      {/* The box is the tap target; the label sits inside it, above the text. */}
      <Pressable
        onPress={() => inner.current?.focus()}
        disabled={!editable}
        accessible={false}
        style={[
          styles.box,
          {
            minHeight: t.size.control + t.space.xs,
            // the padding gives back what a thicker outline takes, so nothing moves
            paddingHorizontal: t.space.lg - border,
            paddingVertical: t.space.sm - border,
            borderRadius: t.radius.sm,
            borderWidth: border,
            borderColor,
            backgroundColor: t.colors.surface,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        <Text
          variant="caption"
          color="textMuted"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {label}
        </Text>
        <TextInput
          ref={setRef}
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
            {
              fontFamily: t.text.label.fontFamily,
              fontSize: t.text.body.fontSize,
              color: t.colors.text,
            },
            styles.input,
          ]}
        />
      </Pressable>
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
  box: { justifyContent: "center" },
  input: { padding: 0, margin: 0, textAlignVertical: "center" },
  row: { flexDirection: "row", alignItems: "flex-start" },
  grow: { flex: 1 },
});
