import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Bird, birdColor } from '@/birds';
import { Button, Card, Text } from '@/components';
import { NATIVE_DRIVER } from '@/components/motion';
import { useDraft } from '@/onboarding/draft';
import { DEFAULT_DEPTH, DEPTHS } from '@/onboarding/questions';
import { Step } from '@/onboarding/Step';
import { clamp, nearestStop, stopX, twigPath } from '@/onboarding/twig';
import { useMotion, useTheme } from '@/theme';

const BIRD = 74;
/** The touch strip: the bird, the twig and the labels. */
const STRIP = 150;
const TWIG_TOP = BIRD * 1.12 + 8;

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

// Optional question 2: how personal should questions get? Drag your bird
// along the twig, or tap a spot, to Light, Balanced or Deep.
export default function DepthScreen() {
  const t = useTheme();
  const { reduceMotion } = useMotion();
  const { width } = useWindowDimensions();
  const { draft, update } = useDraft();
  const span = Math.min(width, 430) - t.gutter * 2;
  const index = Math.max(
    0,
    DEPTHS.findIndex((d) => d.depth === draft.depth),
  );

  // where the bird is (its middle), how high it is off the twig (0 to 1),
  // its lean and its landing squash
  const [x] = useState(() => new Animated.Value(stopX(index, span)));
  const [lift] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  const [lean] = useState(() => new Animated.Value(0));
  const [squash] = useState(() => new Animated.Value(0));
  const [birdX, setBirdX] = useState(stopX(index, span));
  const [lifted, setLifted] = useState(false);
  const [facingRight, setFacingRight] = useState(false);
  const [card] = useState(() => new Animated.Value(1));

  // the twig redraws as the bird moves, in steps of a few points
  useEffect(() => {
    const id = x.addListener(({ value }) => setBirdX((b) => (Math.abs(b - value) >= 2 ? value : b)));
    return () => x.removeListener(id);
  }, [x]);

  // the example slides in fresh each time the choice changes
  useEffect(() => {
    if (reduceMotion) return;
    card.setValue(0);
    Animated.timing(card, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [index, card, reduceMotion]);

  const land = () => {
    if (reduceMotion) return;
    squash.setValue(0);
    Animated.sequence([
      Animated.timing(squash, { toValue: 1, duration: 90, useNativeDriver: NATIVE_DRIVER }),
      Animated.spring(squash, { toValue: 0, friction: 4, tension: 160, useNativeDriver: NATIVE_DRIVER }),
    ]).start();
  };

  /** Sends the bird to a stop: a hop when tapped, a settle when dropped after a drag. */
  const goTo = (i: number, how: 'hop' | 'settle') => {
    const to = stopX(i, span);
    if (DEPTHS[i].depth !== draft.depth) {
      update({ depth: DEPTHS[i].depth });
      tick();
    }
    if (reduceMotion) {
      x.setValue(to);
      return;
    }
    if (how === 'hop') {
      setFacingRight(to > birdX);
      hop.setValue(0);
      Animated.parallel([
        Animated.timing(x, {
          toValue: to,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(hop, {
          toValue: 1,
          duration: 420,
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]).start(({ finished }) => {
        if (finished) land();
      });
    } else {
      Animated.parallel([
        Animated.spring(x, { toValue: to, friction: 7, tension: 90, useNativeDriver: NATIVE_DRIVER }),
        Animated.spring(lift, { toValue: 0, friction: 6, tension: 120, useNativeDriver: NATIVE_DRIVER }),
        Animated.spring(lean, { toValue: 0, friction: 5, tension: 120, useNativeDriver: NATIVE_DRIVER }),
      ]).start();
      setTimeout(land, 160);
    }
  };

  // Dragging: the handlers are made once, so they read the latest values through a ref.
  // passing a stop mid-drag changes the choice (and the example) at once
  const choose = (i: number) => {
    if (DEPTHS[i].depth === draft.depth) return;
    update({ depth: DEPTHS[i].depth });
    tick();
  };
  const latest = useRef({ goTo, choose, span, index, birdX, reduceMotion });
  useEffect(() => {
    latest.current = { goTo, choose, span, index, birdX, reduceMotion };
  });
  const start = useRef(0);
  // The refs are only read inside the gesture's callbacks, as a finger moves, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
      // a sideways drag keeps going even if the page would like to scroll
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { birdX: b, reduceMotion: still } = latest.current;
        const touch = e.nativeEvent.locationX;
        // a touch on the bird picks it up; anywhere else on the twig is a tap
        start.current = Math.abs(touch - b) < BIRD * 0.7 ? b : touch;
        setLifted(true);
        if (!still) {
          Animated.spring(lift, {
            toValue: 1,
            friction: 6,
            tension: 160,
            useNativeDriver: NATIVE_DRIVER,
          }).start();
        }
      },
      onPanResponderMove: (_e, g) => {
        const { span: s, index: i, reduceMotion: still } = latest.current;
        if (Math.abs(g.dx) < 4) return;
        const nx = clamp(start.current + g.dx, stopX(0, s) - 14, stopX(2, s) + 14);
        x.setValue(nx);
        if (!still) lean.setValue(clamp(g.vx * 14, -14, 14));
        if (g.vx > 0.05) setFacingRight(true);
        else if (g.vx < -0.05) setFacingRight(false);
        const near = nearestStop(nx, s);
        if (near !== i) {
          latest.current.index = near;
          latest.current.choose(near);
        }
      },
      onPanResponderRelease: (_e, g) => {
        const { span: s, goTo: go } = latest.current;
        setLifted(false);
        if (Math.abs(g.dx) < 4) {
          // a tap: hop to the stop nearest the touch
          go(nearestStop(start.current, s), 'hop');
          Animated.spring(lift, {
            toValue: 0,
            friction: 6,
            tension: 120,
            useNativeDriver: NATIVE_DRIVER,
          }).start();
          return;
        }
        go(nearestStop(start.current + g.dx, s), 'settle');
      },
      onPanResponderTerminate: () => {
        setLifted(false);
        latest.current.goTo(nearestStop(latest.current.birdX, latest.current.span), 'settle');
      },
    }),
  );

  const chosen = DEPTHS[index];
  const seed = draft.seed ?? 7;
  const next = () => router.push('/avoid');
  const arc = hop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -30, 0] });
  const raise = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Step
      eyebrow="About you · 2 of 3"
      title="How personal should questions get?"
      subtitle="Slide your bird along the twig, or tap a spot."
      onSkip={() => {
        update({ depth: DEFAULT_DEPTH });
        next();
      }}
      footer={<Button label="Continue" onPress={next} />}
    >
      <View
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="How personal"
        accessibilityValue={{ text: `${chosen.label}. For example: ${chosen.example}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          const i = clamp(index + step, 0, DEPTHS.length - 1);
          if (i !== index) goTo(i, 'hop');
        }}
        style={{ width: span, height: STRIP }}
      >
        <Svg width={span} height={34} style={[styles.abs, { top: TWIG_TOP }]} pointerEvents="none">
          <Path
            d={twigPath(span, birdX, reduceMotion ? 0 : lifted ? 1 : 3)}
            stroke={t.colors.pen}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
          />
          {DEPTHS.map((d, i) => (
            <Circle
              key={d.depth}
              cx={stopX(i, span)}
              cy={i === index ? 17 : 16}
              r={i === index ? 7 : 5}
              fill={i === index ? t.colors.accent : t.colors.borderInput}
            />
          ))}
        </Svg>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            {
              top: 0,
              transform: [
                { translateX: Animated.subtract(x, BIRD / 2) },
                { translateY: Animated.add(arc, raise) },
              ],
            },
          ]}
        >
          <Animated.View
            style={{
              transformOrigin: '50% 92%',
              transform: [
                { rotate: lean.interpolate({ inputRange: [-14, 14], outputRange: ['-14deg', '14deg'] }) },
                { scaleX: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
                { scaleY: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] }) },
              ],
            }}
          >
            <Bird
              color={birdColor({ color: draft.color, seed })}
              seed={seed}
              extra={draft.extra}
              size={BIRD}
              flipped={facingRight}
            />
          </Animated.View>
        </Animated.View>

        <View style={[styles.abs, styles.labels, { top: TWIG_TOP + 34 }]} pointerEvents="box-none">
          {DEPTHS.map((d, i) => (
            <Pressable
              key={d.depth}
              onPress={() => goTo(i, 'hop')}
              accessibilityRole="radio"
              accessibilityLabel={`${d.label}. For example: ${d.example}`}
              accessibilityState={{ checked: i === index }}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={[styles.label, { left: stopX(i, span) - 50, minHeight: t.size.minTapTarget }]}
            >
              <Text
                variant="label"
                color={i === index ? 'text' : 'textMuted'}
                align="center"
                selectable={false}
              >
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Animated.View
        style={{
          opacity: card,
          transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }}
      >
        <Card>
          <View style={{ gap: t.space.xs }}>
            <Text variant="eyebrow" color="textMuted">
              {chosen.category}
            </Text>
            <Text variant="headline">“{chosen.example}”</Text>
          </View>
        </Card>
      </Animated.View>
      <Text variant="footnote" color="textMuted">
        Twig uses the lighter of your two settings, so nobody gets asked more than they want. You can change
        it any time.
      </Text>
    </Step>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0 },
  labels: { right: 0, height: 44 },
  label: { position: 'absolute', width: 100, alignItems: 'center', justifyContent: 'center' },
});
