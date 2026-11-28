import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Chip, Icon, Text, TextField, useToast } from '@/components';
import { useDraft } from '@/onboarding/draft';
import { addPhrase, AVOID_TOPICS, MAX_PHRASE_LENGTH, MAX_PHRASES } from '@/onboarding/questions';
import { Step } from '@/onboarding/Step';
import { useSession } from '@/session';
import { useTheme } from '@/theme';

// Optional question 3: topics Twig should never ask about. Pick from the list
// or type your own. Continuing saves every answer and opens the app.
export default function AvoidScreen() {
  const t = useTheme();
  const toast = useToast();
  const { draft, update } = useDraft();
  const { finishOnboarding } = useSession();
  const [typed, setTyped] = useState('');
  // a fresh field after each add: some keyboards keep showing what was typed otherwise
  const [field, setField] = useState(0);
  const [saving, setSaving] = useState(false);

  const add = () => {
    update({ avoidPhrases: addPhrase(draft.avoidPhrases, typed) });
    setTyped('');
    setField((n) => n + 1);
  };
  const toggle = (tag: string) =>
    update({
      avoidTopics: draft.avoidTopics.includes(tag)
        ? draft.avoidTopics.filter((x) => x !== tag)
        : [...draft.avoidTopics, tag],
    });

  const finish = async (skipThis: boolean) => {
    setSaving(true);
    try {
      await finishOnboarding({
        lifeStage: draft.lifeStage,
        depth: draft.depth,
        avoidTopics: skipThis ? [] : draft.avoidTopics,
        avoidPhrases: skipThis ? [] : draft.avoidPhrases,
      });
      // the app moves on to Home by itself
    } catch {
      setSaving(false);
      toast.show("That didn't save. Check your connection and try again.", { tone: 'error' });
    }
  };

  const full = draft.avoidPhrases.length >= MAX_PHRASES;

  return (
    <Step
      eyebrow="About you · 3 of 3"
      title="Anything to leave out?"
      subtitle="Topics Twig should never ask about."
      onSkip={() => finish(true)}
      footer={<Button label="Continue" loading={saving} onPress={() => finish(false)} />}
    >
      <View style={[styles.wrap, { gap: t.space.sm + t.space.xxs }]}>
        {AVOID_TOPICS.map((topic) => (
          <Chip
            key={topic.tag}
            label={topic.label}
            selected={draft.avoidTopics.includes(topic.tag)}
            onPress={() => toggle(topic.tag)}
          />
        ))}
        {draft.avoidPhrases.map((phrase) => (
          <Pressable
            key={phrase}
            onPress={() => update({ avoidPhrases: draft.avoidPhrases.filter((p) => p !== phrase) })}
            accessibilityRole="button"
            accessibilityLabel={`${phrase}, added by you. Remove`}
            style={[
              styles.mine,
              {
                minHeight: t.size.minTapTarget + t.space.xs,
                paddingLeft: t.space.lg + t.space.xxs,
                paddingRight: t.space.md,
                gap: t.space.xs + t.space.xxs,
                borderRadius: t.radius.xl,
                backgroundColor: t.colors.primary,
              },
            ]}
          >
            <Text variant="label" color="onPrimary">
              {phrase}
            </Text>
            <Icon name="close" color="onPrimary" size={t.size.iconSmall - 2} strokeWidth={2.6} />
          </Pressable>
        ))}
      </View>

      <View style={[styles.row, { gap: t.space.sm }]}>
        <View style={styles.grow}>
          <TextField
            key={field}
            autoFocus={field > 0}
            label="Or add your own"
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={add}
            placeholder="My job search"
            maxLength={MAX_PHRASE_LENGTH}
            editable={!full}
            hint={full ? `That's the most you can add (${MAX_PHRASES}).` : undefined}
            returnKeyType="done"
            submitBehavior="submit"
          />
        </View>
        <Pressable
          onPress={add}
          disabled={!typed.trim() || full}
          accessibilityRole="button"
          accessibilityLabel="Add topic"
          accessibilityState={{ disabled: !typed.trim() || full }}
          style={[
            styles.add,
            {
              width: t.size.control,
              height: t.size.control + t.space.xs,
              borderRadius: t.radius.sm,
              backgroundColor: t.colors.primary,
              opacity: !typed.trim() || full ? 0.45 : 1,
            },
          ]}
        >
          <Icon name="plus" color="onPrimary" size={t.size.icon} strokeWidth={2.6} />
        </Pressable>
      </View>

      <Text variant="footnote" color="textMuted">
        Pick as many as you like, type your own, or skip. Twig leaves these out of the questions for both of
        you. The other person never sees your list.
      </Text>
    </Step>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  mine: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  grow: { flex: 1 },
  add: { alignItems: 'center', justifyContent: 'center' },
});
