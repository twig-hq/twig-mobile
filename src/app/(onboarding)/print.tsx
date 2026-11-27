import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

import { Bird, birdColor, newSeed } from '@/birds';
import { Icon, Text } from '@/components';
import { useDraft } from '@/onboarding/draft';
import { Step } from '@/onboarding/Step';
import { useTheme } from '@/theme';

/** How long to hold before the print is done. */
export const HOLD_MS = 2000;
/** The print's ridges, drawn from the middle out as the hold goes on. */
const RINGS = 15;
const PAD = 280;
const RING_R = 136;
const RING_LENGTH = 2 * Math.PI * RING_R;

type Phase = 'idle' | 'holding' | 'done';

// Step 2: press and hold, and a thumbprint grows ring by ring. It is a
// pattern Twig makes up, not a reading of the person's finger.
export default function PrintScreen() {
  const t = useTheme();
  const { draft, update } = useDraft();
  const [seed, setSeed] = useState(() => newSeed());
  const [phase, setPhase] = useState<Phase>('idle');
  const [rings, setRings] = useState(0);
  // the ring's fill, in steps of 1/60: smooth enough, without redrawing every frame
  const [fill, setFill] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const leaving = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setRings(Math.ceil(value * RINGS));
      setFill(Math.round(value * 60) / 60);
    });
    return () => {
      progress.removeListener(id);
      clearTimeout(leaving.current);
    };
  }, [progress]);

  const finish = useCallback(
    (made: number) => {
      setPhase('done');
      update({ seed: made });
      AccessibilityInfo.announceForAccessibility('Got it! Your print is ready.');
      leaving.current = setTimeout(() => router.push('/bird'), 700);
    },
    [update],
  );

  const start = () => {
    if (phase !== 'idle') return;
    // every new press makes a new print
    const made = newSeed();
    setSeed(made);
    setPhase('holding');
    progress.setValue(0);
    running.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    running.current.start(({ finished }) => {
      if (finished) finish(made);
    });
  };

  const release = () => {
    if (phase !== 'holding') return;
    running.current?.stop();
    setPhase('idle');
    Animated.timing(progress, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };

  // screen readers: a double tap makes the print at once
  const makeNow = () => {
    if (phase === 'done') return;
    running.current?.stop();
    const made = newSeed();
    setSeed(made);
    progress.setValue(1);
    finish(made);
  };

  const color = birdColor({ color: draft.color, seed });
  const status = phase === 'done' ? 'Got it!' : phase === 'holding' ? 'Keep holding…' : 'Press and hold here';

  return (
    <Step
      step={2}
      title="Make your bird"
      subtitle="Press and hold your thumb on the circle."
      footer={
        <View style={[styles.note, { gap: t.space.sm }]}>
          <Icon name="lock" color="textMuted" size={t.size.iconSmall} strokeWidth={2.2} />
          <Text variant="footnote" color="textMuted" style={styles.grow}>
            Twig draws a pattern of its own. It does not read your fingerprint, and nothing about your finger
            is saved.
          </Text>
        </View>
      }
    >
      <View style={[styles.center, { gap: t.space.lg }]}>
        <Pressable
          onPressIn={start}
          onPressOut={release}
          accessibilityRole="button"
          accessibilityLabel="Make your print"
          accessibilityHint="Press and hold for two seconds."
          accessibilityState={{ busy: phase === 'holding' }}
          accessibilityActions={[{ name: 'activate', label: 'Make your print' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'activate') makeNow();
          }}
          style={{ width: PAD, height: PAD }}
        >
          <Svg width={PAD} height={PAD} viewBox={`${-PAD / 2} ${-PAD / 2} ${PAD} ${PAD}`}>
            <Circle r={126} fill={t.colors.surface} />
            <Circle
              r={RING_R}
              fill="none"
              stroke={color}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
              strokeDashoffset={RING_LENGTH * (1 - fill)}
              transform="rotate(-90)"
            />
            {rings === 0 && (
              <Ellipse
                rx={62}
                ry={80}
                transform="rotate(-14)"
                fill="none"
                stroke={t.colors.borderInput}
                strokeWidth={2}
                strokeDasharray="3 7"
                strokeLinecap="round"
              />
            )}
          </Svg>
          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
            {rings > 0 && <Bird color={color} seed={seed} size={170} rings={rings} bare />}
          </View>
        </Pressable>
        <Text variant="headline" align="center" accessibilityLiveRegion="polite">
          {status}
        </Text>
      </View>
    </Step>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start' },
  grow: { flex: 1 },
});
