import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme";

import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "plain";

type Props = {
  label: string;
  onPress: () => void;
  /**
   * primary: filled, the one main action on a screen.
   * secondary: a soft fill, a second choice.
   * destructive: filled in the danger colour, for End, Block, Delete.
   * plain: bold coloured text, for small actions like "Send the code again".
   */
  variant?: ButtonVariant;
  /** Shows a spinner, keeps the button's size and ignores presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Something drawn before the label, like an `<Icon />`. */
  icon?: ReactNode;
  /** Read by screen readers after the label, when the result is not obvious. */
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  accessibilityHint,
  style,
}: Props) {
  const t = useTheme();
  const inactive = disabled || loading;
  const look = {
    primary: { bg: t.colors.primary, fg: "onPrimary" },
    secondary: { bg: t.colors.surfaceSunken, fg: "text" },
    destructive: { bg: t.colors.danger, fg: "onDanger" },
    plain: { bg: "transparent", fg: "link" },
  } as const;
  const { bg, fg } = look[variant];
  const plain = variant === "plain";

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          // minHeight, not height: the button grows with large text sizes
          minHeight: plain ? t.size.minTapTarget : t.size.control,
          paddingHorizontal: plain ? t.space.sm : t.space.xl,
          paddingVertical: t.space.sm,
          borderRadius: t.radius.pill,
          backgroundColor: bg,
          boxShadow:
            variant === "primary" && !inactive ? t.elevation.button : undefined,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View
        style={[styles.content, { gap: t.space.sm, opacity: loading ? 0 : 1 }]}
      >
        {icon}
        <Text variant={plain ? "label" : "button"} color={fg} align="center">
          {label}
        </Text>
      </View>
      {loading && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={t.colors[fg]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
});
