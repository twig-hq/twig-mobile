import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Bird, birdColor } from '@/birds';
import { Button, Card, Text } from '@/components';
import { NATIVE_DRIVER } from '@/components/motion';
import { useDraft } from '@/onboarding/draft';
import { DEFAULT_DEPTH, DEPTHS } from '@/onboarding/questions';
import { Step } from '@/onboarding/Step';
import { useMotion, useTheme } from '@/theme';

const BIRD = 70;

// Optional question 2: how personal should questions get? Your bird hops
// along a twig to Light, Balanced or Deep, with an example of each.
export default function DepthScreen() {
  const t = useTheme();
  const motion = useMotion();
  const { width } = useWindowDimensions();
  const { draft, update } = useDraft();
  const span = Math.min(width, 430) - t.gutter * 2;
  // the three stops, as fractions of the twig
  const stopX = (i: number) => span * (0.16 + i * 0.34);
  const index = Math.max(
    0,
    DEPTHS.findIndex((d) => d.depth === draft.depth),
  );
  const [x] = useState(() => new Animated.Value(stopX(index)));

  useEffect(() => {
    const to = stopX(index);
    if (motion.reduceMotion) {
      x.setValue(to);
      return;
    }
    Animated.spring(x, { toValue: to, friction: 6, tension: 90, useNativeDriver: NATIVE_DRIVER }).start();
    // stopX only depends on the width, which is fixed while this screen is up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, motion.reduceMotion, x]);

  const chosen = DEPTHS[index];
  const seed = draft.seed ?? 7;
  const next = () => router.push('/avoid');

  return (
    <Step
      eyebrow="About you · 2 of 3"
      title="How personal should questions get?"
      subtitle="Tap a spot on the twig to see an example."
      onSkip={() => {
        update({ depth: DEFAULT_DEPTH });
        next();
      }}
      footer={<Button label="Continue" onPress={next} />}
    >
      <View style={{ height: BIRD * 1.2 + 70 }}>
        <Animated.View
          style={[styles.bird, { top: 0, transform: [{ translateX: Animated.subtract(x, BIRD / 2) }] }]}
        >
          <Bird color={birdColor({ color: draft.color, seed })} seed={seed} extra={draft.extra} size={BIRD} />
        </Animated.View>
        <Svg width={span} height={30} style={[styles.twig, { top: BIRD * 1.12 }]}>
          <Path
            d={`M 4 14 C ${span * 0.3} 20 ${span * 0.7} 20 ${span - 4} 10`}
            stroke={t.colors.pen}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
          />
          {DEPTHS.map((d, i) => (
            <Circle
              key={d.depth}
              cx={stopX(i)}
              cy={16}
              r={5}
              fill={i === index ? t.colors.accent : t.colors.borderInput}
            />
          ))}
        </Svg>
        <View accessibilityRole="radiogroup" style={[styles.stops, { top: BIRD * 1.12 + 30 }]}>
          {DEPTHS.map((d, i) => (
            <Pressable
              key={d.depth}
              onPress={() => update({ depth: d.depth })}
              accessibilityRole="radio"
              accessibilityLabel={`${d.label}. For example: ${d.example}`}
              accessibilityState={{ checked: i === index }}
              hitSlop={{ top: 60, bottom: 8, left: 8, right: 8 }}
              style={[styles.stop, { left: stopX(i) - 50, minHeight: t.size.minTapTarget }]}
            >
              <Text variant="label" color={i === index ? 'text' : 'textMuted'} align="center">
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Card>
        <View style={{ gap: t.space.xs }}>
          <Text variant="eyebrow" color="textMuted">
            {chosen.category}
          </Text>
          <Text variant="headline">“{chosen.example}”</Text>
        </View>
      </Card>
      <Text variant="footnote" color="textMuted">
        Twig uses the lighter of your two settings, so nobody gets asked more than they want. You can change
        it any time.
      </Text>
    </Step>
  );
}

const styles = StyleSheet.create({
  bird: { position: 'absolute', left: 0 },
  twig: { position: 'absolute', left: 0 },
  stops: { position: 'absolute', left: 0, right: 0, height: 44 },
  stop: { position: 'absolute', width: 100, alignItems: 'center', justifyContent: 'center' },
});
