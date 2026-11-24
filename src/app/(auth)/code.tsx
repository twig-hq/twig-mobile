import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { CRACKS, Egg } from '@/auth/Egg';
import {
  checkCode,
  checkMessages,
  CODE_LENGTH,
  countdown,
  EXPIRES_AFTER_S,
  lastSentAt,
  RESEND_AFTER_S,
  secondsLeft,
  sendCode,
  sendMessages,
} from '@/auth/emailCode';
import { Button, CodeEntry, DIGITS, Icon, ScreenHeader, Text, useToast } from '@/components';
import { useSession } from '@/session';
import { useTheme } from '@/theme';

const EGG = 60;
const EGG_HEIGHT = (EGG * 140) / 120;
/** The widest the six boxes get, so the egg can stand on the last one. */
const BOXES_MAX = 324;
/** How long "You are in" and the hatched egg show before the app opens. */
export const ENTER_AFTER_MS = 1400;

type Phase = 'typing' | 'checking' | 'wrong' | 'done';

// Step two of signing in: the code from the email. The egg cracks once for
// each digit and hatches when the code is right.
export default function CodeScreen() {
  const t = useTheme();
  const toast = useToast();
  const { holdSignedOut } = useSession();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';

  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');
  const [problem, setProblem] = useState<string>();
  const [resending, setResending] = useState(false);
  const [sentAt, setSentAt] = useState(() => lastSentAt(email) ?? Date.now());
  const [now, setNow] = useState(() => Date.now());
  const entering = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  // leaving this screen for any reason lets a waiting sign-in through
  useEffect(
    () => () => {
      clearTimeout(entering.current);
      holdSignedOut(false);
    },
    [holdSignedOut],
  );

  const busy = phase === 'checking' || phase === 'done';
  const expired = !busy && secondsLeft(sentAt, now, EXPIRES_AFTER_S) <= 0;
  const wait = secondsLeft(sentAt, now, RESEND_AFTER_S);

  const check = async (full: string) => {
    setPhase('checking');
    setProblem(undefined);
    // the session arrives the moment the code is accepted; hold the app on
    // this screen until the egg has hatched
    holdSignedOut(true);
    const result = await checkCode(email, full);
    if (result.ok) {
      setPhase('done');
      AccessibilityInfo.announceForAccessibility('You are in');
      entering.current = setTimeout(() => holdSignedOut(false), ENTER_AFTER_MS);
      return;
    }
    holdSignedOut(false);
    // empty the boxes so the next digit starts a fresh try
    setCode('');
    setPhase(result.problem === 'wrong' ? 'wrong' : 'typing');
    setProblem(checkMessages[result.problem]);
  };

  const type = (next: string) => {
    setCode(next);
    if (phase === 'wrong') setPhase('typing');
    if (problem) setProblem(undefined);
  };

  const resend = async () => {
    if (resending) return;
    setResending(true);
    const result = await sendCode(email);
    setResending(false);
    if (!result.ok) {
      setProblem(sendMessages[result.problem]);
      return;
    }
    const at = Date.now();
    setSentAt(at);
    setNow(at);
    setCode('');
    setPhase('typing');
    setProblem(undefined);
    toast.show('A new code is on its way.', { tone: 'success' });
  };

  // opened without an address (a stray link): start from the email step
  if (!email) return <Redirect href="/email" />;

  return (
    <View style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <ScreenHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: t.gutter, paddingBottom: t.space.xl, gap: t.space.lg }}
        >
          <View style={{ gap: t.space.sm }}>
            <Text variant="display" align="center" accessibilityRole="header">
              Check your email
            </Text>
            <Text color="textMuted" align="center">
              Enter the {CODE_LENGTH}-digit code we sent to{'\n'}
              <Text variant="label">{email}</Text>
            </Text>
          </View>

          {/* the egg stands on the last box */}
          <View style={[styles.boxes, { marginTop: EGG_HEIGHT - t.space.lg }]}>
            <CodeEntry
              label="Code from the email"
              value={code}
              onChangeText={type}
              onComplete={check}
              length={CODE_LENGTH}
              alphabet={DIGITS}
              status={phase === 'wrong' ? 'error' : phase === 'done' ? 'success' : 'normal'}
              editable={!busy && !expired}
              autoFocus
            />
            <View style={[styles.egg, { top: -(EGG_HEIGHT - 5) }]}>
              <Egg
                size={EGG}
                cracks={Math.round((code.length / CODE_LENGTH) * CRACKS)}
                mood={phase === 'done' ? 'hatched' : phase === 'wrong' ? 'unsure' : 'waiting'}
              />
            </View>
          </View>

          {phase === 'done' ? (
            <View
              accessible
              accessibilityLabel="You are in"
              style={[
                styles.pill,
                {
                  gap: t.space.sm,
                  paddingVertical: t.space.sm,
                  paddingLeft: t.space.md,
                  paddingRight: t.space.lg,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.colors.primary,
                },
              ]}
            >
              <Icon name="check" color="onPrimary" size={t.size.iconSmall} strokeWidth={2.6} />
              <Text variant="label" color="onPrimary">
                You are in
              </Text>
            </View>
          ) : expired ? (
            <View style={{ gap: t.space.md }}>
              <Text align="center" accessibilityRole="alert">
                That code has expired.
              </Text>
              <Button label="Send a new code" variant="secondary" loading={resending} onPress={resend} />
            </View>
          ) : (
            <View style={{ gap: t.space.xs }}>
              {problem ? (
                <Text
                  color="danger"
                  align="center"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
                  {problem}
                </Text>
              ) : null}
              {phase === 'checking' ? (
                <Text color="textMuted" align="center">
                  Checking…
                </Text>
              ) : wait > 0 ? (
                <Text color="textMuted" align="center">
                  Resend code in {countdown(wait)}
                </Text>
              ) : (
                <>
                  <Button label="Resend code" variant="plain" loading={resending} onPress={resend} />
                  <Text variant="footnote" color="textMuted" align="center">
                    It can take a minute. Check spam too.
                  </Text>
                </>
              )}
            </View>
          )}

          {phase !== 'done' && (
            <View style={[styles.actions, { columnGap: t.space.lg }]}>
              <Button
                label="Change email"
                variant="plain"
                disabled={phase === 'checking'}
                onPress={() => router.back()}
              />
              {/* only iOS has one address that opens the mail app */}
              {Platform.OS === 'ios' && (
                <Button
                  label="Open email app"
                  variant="plain"
                  onPress={() => {
                    Linking.openURL('message://').catch(() => toast.show("Couldn't open your email app."));
                  }}
                />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  boxes: { alignSelf: 'center', width: '100%', maxWidth: BOXES_MAX },
  egg: { position: 'absolute', right: 0 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
