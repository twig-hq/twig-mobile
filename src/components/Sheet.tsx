import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion, useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  visible: boolean;
  /** Called by a tap outside the sheet, the Android back button and the screen-reader escape gesture. */
  onClose: () => void;
  /** Read first by screen readers, as a heading. */
  title?: string;
  children: ReactNode;
};

/**
 * A panel that comes up from the bottom over a dimmed screen, for a short
 * choice or a confirmation. While it is open, screen readers stay inside it.
 */
export function Sheet({ visible, onClose, title, children }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotion();

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.fill, { backgroundColor: t.colors.scrim }]}
        />
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={{
            paddingTop: t.space.md,
            paddingHorizontal: t.gutter,
            paddingBottom: Math.max(insets.bottom, t.space.lg) + t.space.sm,
            gap: t.space.lg,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            backgroundColor: t.colors.background,
            boxShadow: t.elevation.sheet,
          }}
        >
          <View
            style={[
              styles.grabber,
              {
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.borderInput,
              },
            ]}
          />
          {title ? (
            <Text variant="title" align="center" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grabber: { alignSelf: 'center', width: 40, height: 4, opacity: 0.6 },
});
