import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion, useTheme } from '@/theme';

import { NATIVE_DRIVER, SOFT } from './motion';
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
 * A panel that glides up from the bottom over a dimmed screen, for a short
 * choice or a confirmation. While it is open, screen readers stay inside it.
 */
export function Sheet({ visible, onClose, title, children }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const { height } = useWindowDimensions();
  const [p] = useState(() => new Animated.Value(0));
  // stays mounted while it glides away
  const [shown, setShown] = useState(visible);
  if (visible && !shown) setShown(true);

  const enter = motion.duration('gentle');
  const exit = motion.duration('standard');
  useEffect(() => {
    Animated.timing(p, {
      toValue: visible ? 1 : 0,
      duration: visible ? enter : exit,
      easing: SOFT,
      useNativeDriver: NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished && !visible) setShown(false);
    });
  }, [visible, p, enter, exit]);

  return (
    <Modal visible={shown} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom}>
        {/* the dimming covers the whole screen, behind the panel too, while it moves */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: p }]}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.fill, { backgroundColor: t.colors.scrim }]}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={{
            transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
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
            style={[styles.grabber, { borderRadius: t.radius.pill, backgroundColor: t.colors.borderInput }]}
          />
          {title ? (
            <Text variant="title" align="center" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  grabber: { alignSelf: 'center', width: 40, height: 4, opacity: 0.6 },
});
