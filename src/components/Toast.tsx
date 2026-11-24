import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion, useTheme } from '@/theme';

import type { Tone } from './Banner';
import { Icon } from './Icon';
import { Text } from './Text';

type ToastApi = {
  /** Shows a short message over the screen for a few seconds and reads it to screen readers. */
  show: (message: string, options?: { tone?: Tone }) => void;
};

const Ctx = createContext<ToastApi | null>(null);

// the web has no native animation driver
const NATIVE = Platform.OS !== 'web';

/** How long a toast stays: long enough to read twice. */
export const TOAST_MS = 4000;

/** Wraps the app once, in the root layout. Screens call `useToast().show(...)`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: Tone;
  } | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const nextId = useRef(0);
  const fade = motion.duration('standard');

  const show = useCallback<ToastApi['show']>((message, options) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone: options?.tone ?? 'info' });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: fade,
      useNativeDriver: NATIVE,
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: fade,
        useNativeDriver: NATIVE,
      }).start(() => setToast((now) => (now?.id === toast.id ? null : now)));
    }, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, opacity, fade]);

  const api = useMemo(() => ({ show }), [show]);
  const error = toast?.tone === 'error';

  return (
    <Ctx.Provider value={api}>
      {children}
      {toast && (
        // already announced above, so screen readers skip the visible copy
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.layer, { bottom: insets.bottom + t.space.xl, paddingHorizontal: t.gutter }]}
        >
          <Animated.View
            style={[
              styles.pill,
              {
                opacity,
                paddingVertical: t.space.md,
                paddingHorizontal: t.space.lg + t.space.xs,
                gap: t.space.sm,
                borderRadius: t.radius.lg,
                backgroundColor: error ? t.colors.danger : t.colors.primary,
                boxShadow: t.elevation.floating,
              },
            ]}
          >
            {toast.tone !== 'info' && (
              <Icon
                name={error ? 'alert' : 'check'}
                color={error ? 'onDanger' : 'onPrimary'}
                size={t.size.iconSmall}
              />
            )}
            <Text variant="label" color={error ? 'onDanger' : 'onPrimary'} style={styles.shrink}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useToast needs a <ToastProvider> above it');
  return api;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', maxWidth: 420 },
  shrink: { flexShrink: 1 },
});
