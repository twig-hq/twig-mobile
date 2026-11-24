import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Animation timings. Twig's motion stays simple: short fades, small hops.

export const duration = {
  /** Presses, toggles, small fades. */
  quick: 150,
  /** Most transitions. */
  standard: 250,
  /** A bird hopping, a sheet settling. */
  gentle: 400,
  /** One-off moments, like an egg hatching. */
  slow: 700,
} as const;

export type DurationName = keyof typeof duration;

/** Cubic-bezier control points, for `Easing.bezier(...)`. */
export const easing = {
  standard: [0.2, 0.8, 0.2, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const;

/** Whether the person has turned on Reduce Motion (iOS) or Remove animations (Android). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (mounted) setReduce(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Timings that respect Reduce Motion: every duration becomes 0, so changes
 * happen at once. Decorative loops (a bird's idle tilt) should check
 * `reduceMotion` and not run at all.
 */
export function useMotion() {
  const reduceMotion = useReduceMotion();
  return {
    reduceMotion,
    duration: (name: DurationName) => (reduceMotion ? 0 : duration[name]),
  };
}
