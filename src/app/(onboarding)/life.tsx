import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Text } from '@/components';
import { useDraft } from '@/onboarding/draft';
import { LIFE_STAGES } from '@/onboarding/questions';
import { Step } from '@/onboarding/Step';
import { useTheme } from '@/theme';

// Optional question 1: where are you in life? Parents and their grown-up kids
// each see their own list.
export default function LifeScreen() {
  const t = useTheme();
  const { draft, update } = useDraft();
  const stages = LIFE_STAGES[draft.role ?? 'child'];
  const next = () => router.push('/depth');

  return (
    <Step
      eyebrow="About you · 1 of 3"
      title="Where are you in life?"
      subtitle="Pick the one that fits best."
      onSkip={() => {
        update({ lifeStage: null });
        next();
      }}
      footer={<Button label="Continue" onPress={next} />}
    >
      <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: t.space.sm + t.space.xxs }]}>
        {stages.map((s) => (
          <Chip
            key={s.key}
            kind="radio"
            label={s.label}
            selected={draft.lifeStage === s.key}
            onPress={() => update({ lifeStage: draft.lifeStage === s.key ? null : s.key })}
          />
        ))}
      </View>
      <Text variant="footnote" color="textMuted">
        It helps Twig pick questions that fit where you are.
      </Text>
    </Step>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
