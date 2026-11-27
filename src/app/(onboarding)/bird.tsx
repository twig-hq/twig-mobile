import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Bird, birdColor, birdScale, colorKey, EXTRAS, printNumber, type Extra } from '@/birds';
import { Button, Text, useToast } from '@/components';
import { NATIVE_DRIVER } from '@/components/motion';
import { useDraft } from '@/onboarding/draft';
import { Step } from '@/onboarding/Step';
import { useSession } from '@/session';
import { birdColors, palette, useMotion, useTheme } from '@/theme';

const EXTRA_LABEL: Record<Extra, string> = {
  none: 'Nothing',
  headphones: 'Headphones',
  flower: 'A flower',
  hat: 'A hat',
  bun: 'A bun',
  glasses: 'Glasses',
};
const SWATCH = 36;
const CHIP = 48;
const LEAF = 'M 0 10 C 6 0 19 -1 28 10 C 19 21 6 20 0 10 Z';

// Step 3: the print has become a bird. Pick its colour and one little thing,
// then "That's me" saves it all.
export default function MeetScreen() {
  const t = useTheme();
  const toast = useToast();
  const motion = useMotion();
  const { draft, update } = useDraft();
  const { saveProfile, setOnboarded } = useSession();
  const [saving, setSaving] = useState(false);
  const [pop] = useState(() => new Animated.Value(motion.reduceMotion ? 1 : 0.6));

  useEffect(() => {
    if (motion.reduceMotion) return;
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: NATIVE_DRIVER }).start();
  }, [pop, motion.reduceMotion]);

  if (draft.seed === null) return <Redirect href="/print" />;
  const seed = draft.seed;
  // until a colour is picked, the one the print suggests
  const colorName = draft.color ?? colorKey(birdColors[seed % birdColors.length].name);
  const color = birdColor({ color: colorName, seed });
  const size = 170 * birdScale(draft.role);

  const done = async () => {
    if (!draft.role) return;
    setSaving(true);
    try {
      await saveProfile({
        displayName: draft.name,
        role: draft.role,
        bird: { seed, color: colorName, extra: draft.extra },
      });
      // moves the app on to Home
      await setOnboarded(true);
    } catch {
      setSaving(false);
      toast.show("That didn't save. Check your connection and try again.", { tone: 'error' });
    }
  };

  return (
    <Step
      step={3}
      title="Meet your bird"
      subtitle="One of a kind, like you."
      footer={
        <>
          <Button label="That's me" loading={saving} onPress={done} />
          <Button label="Press again" variant="plain" disabled={saving} onPress={() => router.back()} />
        </>
      }
    >
      <View style={[styles.center, { gap: t.space.sm }]}>
        <View style={{ width: 300, height: 190, justifyContent: 'flex-end', alignItems: 'center' }}>
          <Svg width={300} height={40} viewBox="0 0 300 40" style={styles.twig}>
            <Path
              d="M 6 18 C 70 28 180 28 294 12"
              stroke={t.colors.pen}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
            />
            <Path d={LEAF} fill={palette.green} opacity={0.8} transform="translate(20 22) rotate(-150)" />
            <Path d={LEAF} fill={palette.orange} opacity={0.8} transform="translate(250 14) rotate(-30)" />
            <Path d={LEAF} fill={palette.orange} opacity={0.7} transform="translate(56 30) rotate(160)" />
            <Path d={LEAF} fill={palette.sage} opacity={0.8} transform="translate(214 26) rotate(20)" />
          </Svg>
          <Animated.View style={{ marginBottom: 14, transformOrigin: 'bottom', transform: [{ scale: pop }] }}>
            <Bird
              color={color}
              seed={seed}
              extra={draft.extra}
              size={size}
              accessibilityLabel={`Your bird, ${colorName}${draft.extra === 'none' ? '' : `, with ${EXTRA_LABEL[draft.extra].toLowerCase()}`}`}
            />
          </Animated.View>
        </View>
        <View style={styles.center}>
          <Text variant="title">{draft.name.trim()}</Text>
          <Text variant="footnote" color="textMuted">
            Print no. {printNumber(seed)}
          </Text>
        </View>
      </View>

      <View style={{ gap: t.space.md }}>
        <Text variant="label">Your colour</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Your colour" style={styles.spread}>
          {birdColors.map((c) => {
            const on = colorKey(c.name) === colorName;
            return (
              <Pressable
                key={c.name}
                onPress={() => update({ color: colorKey(c.name) })}
                accessibilityRole="radio"
                accessibilityLabel={c.name}
                accessibilityState={{ checked: on }}
                hitSlop={4}
                style={[
                  styles.swatch,
                  {
                    width: SWATCH + 8,
                    height: SWATCH + 8,
                    borderRadius: SWATCH,
                    borderWidth: 2,
                    borderColor: on ? t.colors.focus : 'transparent',
                  },
                ]}
              >
                <View
                  style={{
                    width: SWATCH,
                    height: SWATCH,
                    borderRadius: SWATCH / 2,
                    backgroundColor: c.color,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: t.space.md }}>
        <Text variant="label">Add a little something</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Add a little something"
          style={styles.spread}
        >
          {EXTRAS.map((e) => {
            const on = e === draft.extra;
            return (
              <Pressable
                key={e}
                onPress={() => update({ extra: e })}
                accessibilityRole="radio"
                accessibilityLabel={EXTRA_LABEL[e]}
                accessibilityState={{ checked: on }}
                style={[
                  styles.swatch,
                  {
                    width: CHIP,
                    height: CHIP,
                    borderRadius: CHIP / 2,
                    backgroundColor: t.colors.surface,
                    borderWidth: on ? 2 : StyleSheet.hairlineWidth,
                    borderColor: on ? t.colors.focus : t.colors.border,
                  },
                ]}
              >
                <Bird color={color} seed={seed} extra={e} size={34} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </Step>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  twig: { position: 'absolute', bottom: 0 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  swatch: { alignItems: 'center', justifyContent: 'center' },
});
