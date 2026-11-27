import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bird } from '@/birds/Bird';
import { EXTRAS } from '@/birds/drawing';
import { Button, ScreenHeader, Text } from '@/components';
import { birdColors, useTheme } from '@/theme';

// Development only: every bird colour and extra, to compare with the canvas.
export default function BirdsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(23);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ScreenHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} title="Birds" />
      <ScrollView
        contentContainerStyle={{
          padding: t.gutter,
          paddingBottom: insets.bottom + t.space.xxl,
          gap: t.space.xl,
        }}
      >
        <View style={{ alignItems: 'center', gap: t.space.sm }}>
          <Bird color={birdColors[1].color} seed={seed} extra="headphones" size={200} />
          <Text variant="footnote" color="textMuted">
            Seed {seed}
          </Text>
          <Button
            label="New print"
            variant="secondary"
            onPress={() => setSeed(Math.floor(Math.random() * 1e9))}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md }}>
          {birdColors.map((c, i) => (
            <View key={c.name} style={{ alignItems: 'center' }}>
              <Bird
                color={c.color}
                seed={100 + i}
                extra={EXTRAS[i % EXTRAS.length]}
                size={88}
                flipped={i % 2 === 1}
              />
              <Text variant="caption" color="textMuted">
                {c.name} · {EXTRAS[i % EXTRAS.length]}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'flex-end' }}>
          <Bird color={birdColors[4].color} seed={7} size={100} bare />
          <Bird color={birdColors[4].color} seed={7} size={100} />
          <Bird color={birdColors[4].color} seed={7} size={48} />
          <Bird color={birdColors[4].color} seed={7} size={28} />
        </View>
      </ScrollView>
    </View>
  );
}
