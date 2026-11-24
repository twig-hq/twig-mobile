import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SchemeSwitch } from '@/dev/SchemeSwitch';
import {
  birdColors,
  contrastRatio,
  ThemeScheme,
  useMotion,
  useTheme,
  type ColorTokens,
  type DurationName,
  type Scheme,
  type TextVariant,
} from '@/theme';

// Development only: every design token, in light or dark mode, so changes to
// src/theme can be checked by eye. Release builds send this route home.
export default function TokensScreen() {
  const system = useTheme().scheme;
  const [scheme, setScheme] = useState<Scheme>(system);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <ThemeScheme scheme={scheme}>
      <Sheet scheme={scheme} onScheme={setScheme} />
    </ThemeScheme>
  );
}

function Sheet({ scheme, onScheme }: { scheme: Scheme; onScheme: (s: Scheme) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + t.space.lg,
        paddingBottom: insets.bottom + t.space.xxl,
        paddingHorizontal: t.gutter,
        gap: t.space.xxl,
      }}
    >
      <View style={{ gap: t.space.md }}>
        <Text accessibilityRole="header" style={[t.text.display, { color: t.colors.text }]}>
          Design tokens
        </Text>
        <SchemeSwitch scheme={scheme} onScheme={onScheme} />
      </View>

      <Section title="Colours">
        {(Object.keys(t.colors) as (keyof ColorTokens)[]).map((role) => (
          <ColorRow key={role} role={role} />
        ))}
      </Section>

      <Section title="Bird colours">
        <View style={[styles.row, styles.wrap, { gap: t.space.md }]}>
          {birdColors.map((c) => (
            <View key={c.name} style={{ alignItems: 'center', gap: t.space.xs }}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Text style={[t.text.caption, { color: t.colors.textMuted }]}>{c.name}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Type">
        {(Object.keys(t.text) as TextVariant[]).map((v) => (
          <View key={v} style={{ gap: t.space.xxs }}>
            <Text style={[t.text[v], { color: t.colors.text }]}>
              {v === 'code' ? 'K7QM 2XRT' : 'Closer, twig by twig'}
            </Text>
            <Text style={[t.text.caption, { color: t.colors.textMuted }]}>
              {v} · {t.text[v].fontSize} / {t.text[v].lineHeight} · {t.text[v].fontFamily}
            </Text>
          </View>
        ))}
      </Section>

      <Section title="Spacing">
        {Object.entries(t.space).map(([name, value]) => (
          <View key={name} style={[styles.row, { gap: t.space.md }]}>
            <Text style={[t.text.caption, styles.key, { color: t.colors.textMuted }]}>
              {name} · {value}
            </Text>
            <View style={{ width: value, height: t.space.lg, backgroundColor: t.colors.accent }} />
          </View>
        ))}
        <Text style={[t.text.footnote, { color: t.colors.textMuted }]}>
          Screen gutter: {t.gutter}
        </Text>
      </Section>

      <Section title="Corner radii">
        <View style={[styles.row, styles.wrap, { gap: t.space.md }]}>
          {Object.entries(t.radius).map(([name, value]) => (
            <View key={name} style={{ alignItems: 'center', gap: t.space.xs }}>
              <View
                style={[
                  styles.box,
                  { borderRadius: value, backgroundColor: t.colors.surface, borderColor: t.colors.borderInput },
                ]}
              />
              <Text style={[t.text.caption, { color: t.colors.textMuted }]}>
                {name} · {value}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Sizes">
        {Object.entries(t.size).map(([name, value]) => (
          <View key={name} style={[styles.row, { gap: t.space.md }]}>
            <Text style={[t.text.caption, styles.key, { color: t.colors.textMuted }]}>
              {name} · {value}
            </Text>
            <View
              style={{ width: value, height: value, borderRadius: t.radius.xs, borderWidth: 1.5, borderColor: t.colors.borderInput }}
            />
          </View>
        ))}
      </Section>

      <Section title="Elevation">
        <View style={[styles.row, { gap: t.space.lg }]}>
          {Object.entries(t.elevation).map(([name, shadow]) => (
            <View
              key={name}
              style={[
                styles.card,
                { boxShadow: shadow, backgroundColor: t.colors.surface, borderRadius: t.radius.md },
              ]}
            >
              <Text style={[t.text.label, { color: t.colors.text }]}>{name}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Motion">
        <MotionDemo />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      <Text accessibilityRole="header" style={[t.text.eyebrow, { color: t.colors.textMuted }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ColorRow({ role }: { role: keyof ColorTokens }) {
  const t = useTheme();
  const value = t.colors[role];
  const opaque = /^#[0-9a-f]{6}$/i.test(value);
  const ratio = opaque ? contrastRatio(value, t.colors.background).toFixed(2) : null;
  return (
    <View style={[styles.row, { gap: t.space.md }]}>
      <View style={[styles.swatch, { backgroundColor: value, borderColor: t.colors.border, borderRadius: t.radius.sm }]} />
      <View style={styles.grow}>
        <Text style={[t.text.label, { color: t.colors.text }]}>{role}</Text>
        <Text style={[t.text.caption, { color: t.colors.textMuted }]}>
          {value}
          {ratio ? ` · ${ratio}:1 on background` : ''}
        </Text>
      </View>
    </View>
  );
}

function MotionDemo() {
  const t = useTheme();
  const motion = useMotion();
  const [x] = useState(() => new Animated.Value(0));
  const [at, setAt] = useState(0);
  const play = (name: DurationName) => {
    const to = at === 0 ? 1 : 0;
    setAt(to);
    Animated.timing(x, {
      toValue: to,
      duration: motion.duration(name),
      easing: Easing.bezier(...t.easing.standard),
      useNativeDriver: true,
    }).start();
  };
  return (
    <View style={{ gap: t.space.md }}>
      <Text style={[t.text.footnote, { color: t.colors.textMuted }]}>
        Reduce Motion is {motion.reduceMotion ? 'on: every duration is 0' : 'off'}. Tap a duration to move the dot.
      </Text>
      <View style={{ height: t.space.xl, justifyContent: 'center' }}>
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: t.colors.accent,
              transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }],
            },
          ]}
        />
      </View>
      <View style={[styles.row, styles.wrap, { gap: t.space.sm }]}>
        {(Object.keys(t.duration) as DurationName[]).map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            onPress={() => play(name)}
            style={{
              minHeight: t.size.minTapTarget,
              paddingHorizontal: t.space.md,
              justifyContent: 'center',
              borderRadius: t.radius.pill,
              backgroundColor: t.colors.surface,
              borderWidth: 1.5,
              borderColor: t.colors.borderInput,
            }}
          >
            <Text style={[t.text.caption, { color: t.colors.text }]}>
              {name} · {t.duration[name]} ms
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  grow: { flex: 1 },
  key: { width: 110 },
  swatch: { width: 44, height: 44, borderWidth: 1 },
  dot: { width: 24, height: 24, borderRadius: 12 },
  box: { width: 56, height: 56, borderWidth: 1.5 },
  card: { flex: 1, height: 72, alignItems: 'center', justifyContent: 'center' },
});
