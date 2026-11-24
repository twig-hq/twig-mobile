import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { NATIVE_DRIVER, SOFT } from '@/components/motion';
import { useMotion } from '@/theme';

import {
  BIRD_IMAGE,
  BUBBLES,
  BUTTONS_AT,
  DESIGN,
  EGG,
  FEET,
  FLY,
  FLYERS,
  HEARTS,
  LOOP,
  LOOP_AT,
  PRINT_CENTRE,
  SCENE_LABEL,
  STAMPED,
  TAGLINE,
  TWIG,
  WORD,
} from './scene';

const img = {
  mom: {
    bird: require('../../assets/images/welcome/bird-mom.png'),
    print: require('../../assets/images/welcome/print-mom.png'),
  },
  sam: {
    bird: require('../../assets/images/welcome/bird-sam.png'),
    print: require('../../assets/images/welcome/print-sam.png'),
  },
  dad: require('../../assets/images/welcome/bird-dad.png'),
  nana: require('../../assets/images/welcome/bird-nana.png'),
  egg: require('../../assets/images/welcome/egg.png'),
  twig: require('../../assets/images/welcome/twig.png'),
  word: require('../../assets/images/welcome/word.png'),
  heart: require('../../assets/images/welcome/heart.png'),
  bubbles: [
    require('../../assets/images/welcome/bubble-1.png'),
    require('../../assets/images/welcome/bubble-2.png'),
    require('../../assets/images/welcome/bubble-3.png'),
    require('../../assets/images/welcome/bubble-4.png'),
    require('../../assets/images/welcome/bubble-5.png'),
    require('../../assets/images/welcome/bubble-6.png'),
    require('../../assets/images/welcome/bubble-7.png'),
    require('../../assets/images/welcome/bubble-8.png'),
  ] as ImageSourcePropType[],
};

// The intro is a handful of values that each run once from 0 to 1, then one
// value that loops for the pop-ups. Every picture reads its place from them.
const ONCE = [
  'word',
  'twig',
  'flyMom',
  'jumpMom',
  'turnMom',
  'landMom',
  'flySam',
  'jumpSam',
  'landSam',
  'dad',
  'nana',
  'egg',
  'tagline',
  'buttons',
] as const;
type Once = (typeof ONCE)[number];

const FLIGHT = Easing.bezier(0.45, 0, 0.3, 1);
const STAMP = Easing.bezier(0.2, 0.9, 0.3, 1.25);
// a hop up and back down, as the height at each tenth of the flight
const ARC_IN = [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
const ARC_OUT = [0, -24, -41, -52, -58, -50, -34, -13, 0];
const SQUASH_IN = [0, 0.35, 0.7, 1];

function useWelcomeTimeline() {
  const { reduceMotion } = useMotion();
  const [once] = useState(
    () => Object.fromEntries(ONCE.map((k) => [k, new Animated.Value(0)])) as Record<Once, Animated.Value>,
  );
  const [loop] = useState(() => new Animated.Value(0));
  const [tilt] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      // no movement: the finished picture, with the first four pop-ups showing
      ONCE.forEach((k) => once[k].setValue(1));
      loop.setValue(0.3);
      return;
    }
    const run = (k: Once, at: number, seconds: number, easing = SOFT) =>
      Animated.sequence([
        Animated.delay(at * 1000),
        Animated.timing(once[k], {
          toValue: 1,
          duration: seconds * 1000,
          easing,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]);
    const [mom, sam] = FLYERS;
    const intro = Animated.parallel([
      run('word', 0.7, 1, Easing.in(Easing.quad)),
      run('twig', TWIG.at, 0.7),
      run('flyMom', mom.go, FLY, FLIGHT),
      run('jumpMom', mom.go, FLY, Easing.linear),
      run('turnMom', mom.go + 0.2, 0.36, Easing.inOut(Easing.quad)),
      run('landMom', mom.go + FLY, 0.34, Easing.linear),
      run('flySam', sam.go, FLY, FLIGHT),
      run('jumpSam', sam.go, FLY, Easing.linear),
      run('landSam', sam.go + FLY, 0.34, Easing.linear),
      run('dad', STAMPED[0].at, 0.32, STAMP),
      run('nana', STAMPED[1].at, 0.32, STAMP),
      run('egg', EGG.at, 0.3, STAMP),
      run('tagline', TAGLINE.at, 0.7),
      run('buttons', BUTTONS_AT, 0.7),
    ]);
    const popups = Animated.sequence([
      Animated.delay(LOOP_AT * 1000),
      Animated.loop(
        Animated.timing(loop, {
          toValue: 1,
          duration: LOOP * 1000,
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ),
    ]);
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(tilt, {
          toValue: 0,
          duration: 3400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    );
    intro.start();
    popups.start();
    sway.start();
    return () => {
      intro.stop();
      popups.stop();
      sway.stop();
    };
  }, [reduceMotion, once, loop, tilt]);

  return { once, loop, tilt };
}

export type WelcomeTimeline = ReturnType<typeof useWelcomeTimeline>;

/** A small hop as a bird's pop-up appears: twice per loop, once for each of its pop-ups. */
function hop(loop: Animated.Value, bird: number) {
  const starts = BUBBLES.filter((b) => b.hops === bird).map((b) => b.show);
  const input = [0];
  const output = [0];
  for (const s of starts) {
    input.push(s, s + 0.012, s + 0.024, s + 0.033, s + 0.042);
    output.push(0, -10, 0, -4, 0);
  }
  input.push(1);
  output.push(0);
  return loop.interpolate({ inputRange: input, outputRange: output });
}

type Props = {
  /** The screen's width and height. */
  width: number;
  height: number;
  timeline: WelcomeTimeline;
};

/**
 * The welcome picture: the logo's two prints hop onto a twig and become
 * birds, the rest of the family joins, and what they share pops up above
 * them. It is decoration; screen readers hear one sentence for all of it.
 */
export function WelcomeScene({ width, height, timeline }: Props) {
  const { once, loop, tilt } = timeline;
  const k = Math.min(width, 430) / DESIGN.width;
  // centred like the splash screen, so the logo does not move when the app takes over
  const top = (height - DESIGN.height * k) / 2;
  const left = (width - DESIGN.width * k) / 2;
  const box = (b: { left: number; top: number; width: number; height: number }) => ({
    position: 'absolute' as const,
    left: b.left * k,
    top: b.top * k,
    width: b.width * k,
    height: b.height * k,
  });
  const bird = { width: BIRD_IMAGE.width * k, height: BIRD_IMAGE.height * k };
  const sway = (i: number) => ({
    rotate: tilt.interpolate({
      inputRange: [0, 1],
      outputRange: i % 2 ? ['2.5deg', '-2.5deg'] : ['-2.5deg', '2.5deg'],
    }),
  });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={SCENE_LABEL}
      pointerEvents="none"
      style={{ position: 'absolute', left, top, width: DESIGN.width * k, height: DESIGN.height * k }}
    >
      <Animated.Image source={img.twig} style={[box(TWIG), { opacity: once.twig }]} />

      {FLYERS.map((f, i) => {
        const fly = i === 0 ? once.flyMom : once.flySam;
        const jump = i === 0 ? once.jumpMom : once.jumpSam;
        const land = i === 0 ? once.landMom : once.landSam;
        const centre = { x: f.left + PRINT_CENTRE.x, y: f.top + PRINT_CENTRE.y };
        const lerp = (from: number, to: number) =>
          fly.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
        return (
          <Animated.View
            key={f.key}
            style={[
              box({ ...f, ...BIRD_IMAGE }),
              // Sam's print overlaps Mom's in the logo, the way two inked prints would
              i === 1 && { mixBlendMode: 'multiply' },
              {
                transformOrigin: [PRINT_CENTRE.x * k, PRINT_CENTRE.y * k, 0],
                transform: [
                  { translateX: lerp((f.from.x - centre.x) * k, 0) },
                  {
                    translateY: Animated.add(
                      lerp((f.from.y - centre.y) * k, 0),
                      jump.interpolate({ inputRange: ARC_IN, outputRange: ARC_OUT.map((y) => y * k) }),
                    ),
                  },
                  { scale: lerp(f.from.scale, 1) },
                  {
                    rotate: fly.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${f.from.rotate}deg`, '0deg'],
                    }),
                  },
                  // Mom faces Sam in the logo and turns round in the air
                  {
                    scaleX: f.turns
                      ? once.turnMom.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] })
                      : 1,
                  },
                ],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ translateY: hop(loop, i) }] }}>
              <Animated.View
                style={{
                  transformOrigin: `${FEET.x} ${FEET.y}`,
                  transform: [
                    { scaleX: land.interpolate({ inputRange: SQUASH_IN, outputRange: [1, 1.12, 0.96, 1] }) },
                    { scaleY: land.interpolate({ inputRange: SQUASH_IN, outputRange: [1, 0.84, 1.05, 1] }) },
                    sway(i),
                  ],
                }}
              >
                {/* the bare print flies; the pen-drawn bird appears over it on landing, then the print steps aside */}
                <Animated.Image
                  source={img[f.key].print}
                  style={[
                    bird,
                    { opacity: land.interpolate({ inputRange: [0, 0.99, 1], outputRange: [1, 1, 0] }) },
                  ]}
                />
                <Animated.Image
                  source={img[f.key].bird}
                  style={[
                    bird,
                    styles.over,
                    { opacity: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 1] }) },
                  ]}
                />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        );
      })}

      {STAMPED.map((s, i) => {
        const v = i === 0 ? once.dad : once.nana;
        return (
          <Animated.View
            key={s.key}
            style={[box({ ...s, ...BIRD_IMAGE }), { transform: [{ translateY: hop(loop, i + 2) }] }]}
          >
            <Animated.Image
              source={img[s.key]}
              style={[
                bird,
                {
                  opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                  transformOrigin: `${FEET.x} ${FEET.y}`,
                  transform: [
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) },
                    sway(i + 2),
                  ],
                },
              ]}
            />
          </Animated.View>
        );
      })}
      <Animated.Image
        source={img.egg}
        style={[
          box(EGG),
          {
            opacity: once.egg.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: once.egg.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }],
          },
        ]}
      />

      {BUBBLES.map((b, i) => (
        <Animated.Image
          key={b.n}
          source={img.bubbles[i]}
          style={[
            box(b),
            {
              opacity: loop.interpolate({
                inputRange: [0, b.show, b.show + 0.03, b.hide, b.hide + 0.03, 1],
                outputRange: [0, 0, 1, 1, 0, 0],
              }),
              transform: [
                {
                  translateY: loop.interpolate({
                    inputRange: [0, b.show, b.show + 0.03, 1],
                    outputRange: [8 * k, 8 * k, 0, 0],
                  }),
                },
                {
                  scale: loop.interpolate({
                    inputRange: [0, b.show, b.show + 0.03, 1],
                    outputRange: [0.9, 0.9, 1, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      {HEARTS.map((h, i) => {
        const a = 0.58 + h.delay;
        return (
          <Animated.Image
            key={i}
            source={img.heart}
            style={[
              box({ left: h.left, top: h.top, width: h.size, height: h.size }),
              {
                opacity: loop.interpolate({
                  inputRange: [0, a, a + 0.03, a + 0.15, 1],
                  outputRange: [0, 0, 1, 0, 0],
                }),
                transform: [
                  {
                    translateY: loop.interpolate({
                      inputRange: [0, a, a + 0.15, 1],
                      outputRange: [0, 0, -62 * k, -62 * k],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}

      {/* the wordmark is on the splash screen under the two prints, and lifts away as they leave */}
      <Animated.Image
        source={img.word}
        style={[
          box(WORD),
          {
            opacity: once.word.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              { translateY: once.word.interpolate({ inputRange: [0, 1], outputRange: [0, -4 * k] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

export { useWelcomeTimeline };
export const wordmark = img.word as ImageSourcePropType;

const styles = StyleSheet.create({
  over: { position: 'absolute', left: 0, top: 0 },
});
