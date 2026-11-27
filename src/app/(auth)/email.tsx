import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Egg } from '@/auth/Egg';
import {
  CODE_LENGTH,
  isEmail,
  lastSentAt,
  RESEND_AFTER_S,
  secondsLeft,
  sendCode,
  sendMessages,
  tidyEmail,
} from '@/auth/emailCode';
import { Button, ScreenHeader, Text, TextField } from '@/components';
import { useTheme } from '@/theme';

const EGG = 60;
const EGG_HEIGHT = (EGG * 140) / 120;

// Step one of signing in: where to send the code. New and returning people
// both come through here.
export default function EmailScreen() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState<string>();
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (sending) return;
    const address = tidyEmail(email);
    if (!isEmail(address)) {
      setProblem(sendMessages.invalid);
      return;
    }
    const toCode = () => router.push({ pathname: '/code', params: { email: address } });
    // a code went to this address moments ago: that one still works
    const last = lastSentAt(address);
    if (last !== undefined && secondsLeft(last, Date.now(), RESEND_AFTER_S) > 0) {
      toCode();
      return;
    }
    setSending(true);
    const result = await sendCode(address);
    setSending(false);
    // "too soon" also means a code is already in their inbox
    if (result.ok || result.problem === 'tooSoon') toCode();
    else setProblem(sendMessages[result.problem]);
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <ScreenHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: t.gutter, paddingBottom: t.space.xl, gap: t.space.xl }}
        >
          <View style={{ gap: t.space.sm }}>
            <Text variant="display" align="center" accessibilityRole="header">
              What&apos;s your email?
            </Text>
            <Text color="textMuted" align="center">
              We&apos;ll email you a {CODE_LENGTH}-digit code. No password to remember.
            </Text>
          </View>

          {/* the egg stands on the field's top edge: someone who is not in yet */}
          <View style={{ marginTop: EGG_HEIGHT - t.space.lg }}>
            <TextField
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (problem) setProblem(undefined);
              }}
              hint="New here or coming back, it's the same step."
              error={problem}
              autoFocus
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <View style={[styles.egg, { right: t.space.lg, top: -(EGG_HEIGHT - 5) }]}>
              <Egg wobble size={EGG} />
            </View>
          </View>

          <Button label="Send code" loading={sending} onPress={send} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  egg: { position: 'absolute' },
});
