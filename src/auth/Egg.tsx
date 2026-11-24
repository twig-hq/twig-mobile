import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { NATIVE_DRIVER } from '@/components/motion';
import { palette, useMotion, useTheme } from '@/theme';

// The thumbprint parts are images exported from the design canvas (the app
// cannot draw the print texture). The pen lines are drawn here, so they take
// the theme's pen colour and stay visible in dark mode.
const img = {
  whole: require('../../assets/images/egg/egg-whole.png'),
  top: require('../../assets/images/egg/egg-top.png'),
  bottom: require('../../assets/images/egg/egg-bottom.png'),
  chick: require('../../assets/images/egg/egg-chick.png'),
};

// Everything below is in the drawing's own units: a 120 x 140 box.
const BOX = { width: 120, height: 140 };
/** The crack runs across the shell in six strokes, one for each digit of the code. */
const ZIG = [
  [26, 70],
  [38, 62],
  [47, 72],
  [58, 61],
  [68, 72],
  [80, 62],
  [94, 70],
] as const;
export const CRACKS = ZIG.length - 1;
const LEGS = 'M 50 118 L 48 127 M 68 118 L 70 127 M 41 129 L 48 127 L 53 130 M 63 129 L 70 127 L 75 130';
const QUESTION = 'M 100 30 C 100 22 112 22 112 30 C 112 36 106 36 106 42 M 106 49 L 106 50';
const TUFT = 'M 57 47 L 55 38 M 61 46 L 62 36 M 65 47 L 70 39';
const BEAK = 'M 55.5 72 L 64.5 72 L 60 79 Z';

const HATCH_MS = 650;
const POP = Easing.bezier(0.2, 0.9, 0.3, 1.2);
// a wobble now and then, as the angle at each point of a five-second loop
const WOBBLE_IN = [0, 0.58, 0.64, 0.7, 0.76, 0.82, 0.88, 1];
const WOBBLE_OUT = ['0deg', '0deg', '-9deg', '8deg', '-6deg', '4deg', '-2deg', '0deg'];

type Props = {
  /** How many of the six cracks show. On the code screen: how many digits are typed. */
  cracks?: number;
  /** waiting: the whole egg. unsure: tilted, with a question mark, for a wrong code. hatched: the chick is out. */
  mood?: 'waiting' | 'unsure' | 'hatched';
  /** Wobbles every few seconds while it waits. */
  wobble?: boolean;
  /** Width in points. The height follows. */
  size?: number;
};

/**
 * The egg on the sign-in screens: someone who is not in yet. It cracks as the
 * code is typed and hatches when the code is right. Decoration only: the
 * screen's words say the same things, so screen readers skip it.
 */
export function Egg({ cracks = 0, mood = 'waiting', wobble = false, size = 60 }: Props) {
  const t = useTheme();
  const { reduceMotion } = useMotion();
  const hatched = mood === 'hatched';
  const [out] = useState(() => new Animated.Value(hatched ? 1 : 0));
  const [sway] = useState(() => new Animated.Value(0));
  const u = size / BOX.width;
  const box = { width: size, height: BOX.height * u };
  const pen = {
    stroke: t.colors.pen,
    strokeWidth: 2.3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  } as const;

  useEffect(() => {
    if (!hatched) {
      out.setValue(0);
      return;
    }
    if (reduceMotion) {
      out.setValue(1);
      return;
    }
    const hatch = Animated.timing(out, {
      toValue: 1,
      duration: HATCH_MS,
      easing: POP,
      useNativeDriver: NATIVE_DRIVER,
    });
    hatch.start();
    return () => hatch.stop();
  }, [hatched, reduceMotion, out]);

  const wobbling = wobble && mood === 'waiting' && !reduceMotion;
  useEffect(() => {
    if (!wobbling) {
      sway.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(sway, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [wobbling, sway]);

  const lerp = (to: number) => out.interpolate({ inputRange: [0, 1], outputRange: [0, to * u] });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        box,
        {
          // tilts and wobbles around its feet
          transformOrigin: '50% 90%',
          transform: [
            {
              rotate:
                mood === 'unsure'
                  ? '10deg'
                  : sway.interpolate({ inputRange: WOBBLE_IN, outputRange: WOBBLE_OUT }),
            },
          ],
        },
      ]}
    >
      {hatched ? (
        <>
          {/* the chick rises out of the bottom half as the top half tips off */}
          <Animated.View
            style={[
              styles.layer,
              box,
              {
                opacity: out.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
                transformOrigin: [60 * u, 97 * u, 0],
                transform: [
                  { translateY: out.interpolate({ inputRange: [0, 1], outputRange: [12 * u, -6 * u] }) },
                  { scale: out.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              },
            ]}
          >
            <Animated.Image source={img.chick} style={[styles.layer, box]} />
            <Svg {...box} viewBox="0 0 120 140" style={styles.layer}>
              <Path d={TUFT} {...pen} />
              <Circle cx={52} cy={66} r={3} fill={t.colors.pen} />
              <Circle cx={68} cy={66} r={3} fill={t.colors.pen} />
              <Path
                d={BEAK}
                fill={palette.orange}
                stroke={t.colors.pen}
                strokeWidth={1.8}
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
          <Animated.Image source={img.bottom} style={[styles.layer, box]} />
          <Animated.Image
            source={img.top}
            style={[
              styles.layer,
              box,
              {
                transformOrigin: [40 * u, 60 * u, 0],
                transform: [
                  { translateX: lerp(-16) },
                  { translateY: lerp(-30) },
                  { rotate: out.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-26deg'] }) },
                ],
              },
            ]}
          />
        </>
      ) : (
        <Animated.Image source={img.whole} style={[styles.layer, box]} />
      )}
      <View style={styles.layer}>
        <Svg {...box} viewBox="0 0 120 140">
          {!hatched &&
            mood !== 'unsure' &&
            ZIG.slice(0, Math.max(0, Math.min(cracks, CRACKS))).map(([x, y], i) => (
              <Path key={i} d={`M ${x} ${y} L ${ZIG[i + 1][0]} ${ZIG[i + 1][1]}`} {...pen} />
            ))}
          <Path d={LEGS} {...pen} />
          {mood === 'unsure' && <Path d={QUESTION} {...pen} />}
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
});
