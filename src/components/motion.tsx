import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform } from 'react-native';

import { useMotion } from '@/theme';

// How Twig's controls move ("soft slide" on the design canvas): things sink a
// little when pressed and glide into place, with no bounce. The one exception
// is the tick on a chosen answer, which springs in. With Reduce Motion on,
// nothing here moves.

/** The web has no native animation driver. */
export const NATIVE_DRIVER = Platform.OS !== 'web';

/** Decelerates into place: the curve for anything arriving. */
export const SOFT = Easing.bezier(0.2, 0.8, 0.2, 1);

const PRESSED_SCALE = 0.97;

/** A control sinks a little while it is pressed. Spread `handlers` on the Pressable and put `style` on an Animated.View around it. */
export function usePressScale() {
  const { reduceMotion } = useMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const to = (toValue: number, ms: number) => () => {
    if (reduceMotion) return;
    Animated.timing(scale, { toValue, duration: ms, easing: SOFT, useNativeDriver: NATIVE_DRIVER }).start();
  };
  return {
    style: { transform: [{ scale }] },
    handlers: { onPressIn: to(PRESSED_SCALE, 120), onPressOut: to(1, 180) },
  };
}

/** Springs its child in with a small overshoot and turn, for the tick on a chosen answer. */
export function Pop({ animate, children }: { animate: boolean; children: ReactNode }) {
  const { reduceMotion } = useMotion();
  const move = animate && !reduceMotion;
  const [p] = useState(() => new Animated.Value(move ? 0 : 1));
  useEffect(() => {
    if (!move) return;
    Animated.spring(p, { toValue: 1, friction: 4.5, tension: 170, useNativeDriver: NATIVE_DRIVER }).start();
  }, [p, move]);
  return (
    <Animated.View
      style={{
        transform: [
          { scale: p },
          { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** True once `value` has changed since the component first appeared. */
export function useChanged(value: unknown): boolean {
  const [prev, setPrev] = useState(value);
  const [changed, setChanged] = useState(false);
  if (prev !== value) {
    setPrev(value);
    setChanged(true);
  }
  return changed;
}
