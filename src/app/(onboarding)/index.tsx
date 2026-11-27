import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bird, birdScale } from '@/birds';
import { Button, Icon, Text, TextField } from '@/components';
import { usePressScale } from '@/components/motion';
import { useDraft } from '@/onboarding/draft';
import { Step } from '@/onboarding/Step';
import { palette, useTheme } from '@/theme';

// Step 1: what your family calls you, and whether you are a parent or a son
// or daughter (parents get the slightly bigger print, as in the logo).
export default function NameScreen() {
  const t = useTheme();
  const { draft, update } = useDraft();
  const [left, setLeft] = useState(false);
  const name = draft.name.trim();
  const ready = name.length > 0 && draft.role !== null;

  return (
    <Step
      step={1}
      back={false}
      title="What should your family call you?"
      subtitle="This is the name they will see."
      footer={<Button label="Continue" disabled={!ready} onPress={() => router.push('/print')} />}
    >
      <TextField
        label="Your name"
        value={draft.name}
        onChangeText={(text) => update({ name: text })}
        onBlur={() => setLeft(true)}
        error={left && !name ? 'Add the name your family calls you.' : undefined}
        maxLength={80}
        autoCapitalize="words"
        autoComplete="name-given"
        textContentType="givenName"
        returnKeyType="done"
      />
      <View style={{ gap: t.space.md }}>
        <Text variant="label">In your family, you are</Text>
        <View accessibilityRole="radiogroup" style={[styles.row, { gap: t.space.md }]}>
          <RoleCard
            title="A parent"
            note="Mom, Dad, or whoever raised you"
            selected={draft.role === 'parent'}
            onPress={() => update({ role: 'parent' })}
            print={{ color: palette.green, seed: 3, scale: birdScale('parent') }}
          />
          <RoleCard
            title="A son or daughter"
            note="Grown up, still their kid"
            selected={draft.role === 'child'}
            onPress={() => update({ role: 'child' })}
            print={{ color: palette.orange, seed: 8, scale: birdScale('child') }}
          />
        </View>
        <Text variant="footnote" color="textMuted">
          Parents get the slightly bigger print, like in our logo. That is all it changes.
        </Text>
      </View>
    </Step>
  );
}

type Card = {
  title: string;
  note: string;
  selected: boolean;
  onPress: () => void;
  print: { color: string; seed: number; scale: number };
};

function RoleCard({ title, note, selected, onPress, print }: Card) {
  const t = useTheme();
  const press = usePressScale();
  return (
    <View style={styles.grow}>
      <Pressable
        {...press.handlers}
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityLabel={`${title}. ${note}`}
        accessibilityState={{ checked: selected }}
        style={({ pressed }) => [
          styles.card,
          {
            minHeight: 172,
            padding: t.space.md,
            paddingTop: t.space.lg,
            gap: t.space.xs,
            borderRadius: t.radius.lg,
            borderWidth: selected ? 2 : 1.5,
            borderColor: selected ? t.colors.focus : t.colors.border,
            backgroundColor: t.colors.surface,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.tick,
              {
                top: t.space.sm,
                right: t.space.sm,
                width: t.size.iconSmall + t.space.xs,
                height: t.size.iconSmall + t.space.xs,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.primary,
              },
            ]}
          >
            <Icon name="check" color="onPrimary" size={t.size.iconSmall - 4} strokeWidth={3.2} />
          </View>
        )}
        <View style={[styles.printBox, { height: 84 }]}>
          <Bird color={print.color} seed={print.seed} size={80 * print.scale} bare />
        </View>
        <Text variant="headline" align="center">
          {title}
        </Text>
        <Text variant="caption" color="textMuted" align="center">
          {note}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  grow: { flex: 1 },
  card: { alignItems: 'center', justifyContent: 'flex-end' },
  tick: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  printBox: { justifyContent: 'flex-end', alignItems: 'center' },
});
