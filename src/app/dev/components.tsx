import { Redirect, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  ChoiceRow,
  CodeEntry,
  DIGITS,
  EmptyView,
  ErrorView,
  Icon,
  ListRow,
  LoadingView,
  ScreenHeader,
  Sheet,
  Text,
  TextField,
  useToast,
} from '@/components';
import { SchemeSwitch } from '@/dev/SchemeSwitch';
import { birdColors, ThemeScheme, useTheme, type Scheme } from '@/theme';

// Development only: every core component in each of its states, in light or
// dark mode. Release builds send this route home.
export default function ComponentsScreen() {
  const system = useTheme().scheme;
  const [scheme, setScheme] = useState<Scheme>(system);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <ThemeScheme scheme={scheme}>
      <Gallery scheme={scheme} onScheme={setScheme} />
    </ThemeScheme>
  );
}

function Gallery({ scheme, onScheme }: { scheme: Scheme; onScheme: (s: Scheme) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('Sam');
  const [email, setEmail] = useState('sam@example');
  const [invite, setInvite] = useState('K7QM');
  const [otp, setOtp] = useState('');
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pressed, setPressed] = useState('nothing yet');
  const [life, setLife] = useState('Working');
  const [topics, setTopics] = useState(['Politics']);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState(true);
  const toast = useToast();

  const press = (what: string) => () => setPressed(what);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ScreenHeader
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        title="Components"
        action={{ label: 'Skip', onPress: press('Skip') }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: t.space.sm,
          paddingBottom: insets.bottom + t.space.xxl,
          paddingHorizontal: t.gutter,
          gap: t.space.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: t.space.md }}>
          <SchemeSwitch scheme={scheme} onScheme={onScheme} />
          <Text variant="footnote" color="textMuted">
            Last pressed: {pressed}
          </Text>
        </View>

        <Section title="Buttons">
          <Button label="Continue" onPress={press('Continue')} />
          <Button
            label="Continue with email"
            variant="secondary"
            icon={<Icon name="plus" />}
            onPress={press('Continue with email')}
          />
          <Button label="End" variant="destructive" onPress={press('End')} />
          <Button label="Press again" variant="plain" onPress={press('Press again')} />
          <Button
            label="Send code"
            loading={busy}
            onPress={() => {
              setBusy(true);
              setTimeout(() => setBusy(false), 1500);
            }}
          />
          <Button label="Not yet" disabled onPress={press('Not yet')} />
        </Section>

        <Section title="Text fields">
          <TextField
            label="Your name"
            value={name}
            onChangeText={setName}
            hint="This is what new people see."
            autoCapitalize="words"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={email.includes('.') ? undefined : 'That email address is missing its ending, like .com'}
          />
          <TextField label="What you call them" value="" placeholder="Mom" onChangeText={() => {}} />
          <TextField label="Locked" value="Can't change this" editable={false} />
        </Section>

        <Section title="Code entry">
          <Text variant="label">Invite code (8)</Text>
          <CodeEntry
            label="Invite code"
            value={invite}
            onChangeText={setInvite}
            onComplete={press(`code ${invite}`)}
          />
          <Text variant="label">Email code (digits)</Text>
          <CodeEntry label="Email code" value={otp} onChangeText={setOtp} length={6} alphabet={DIGITS} />
          <Text variant="label">Wrong code</Text>
          <CodeEntry label="Invite code, wrong" value="K7QM2XRA" onChangeText={() => {}} status="error" />
          <Text variant="label">Correct code</Text>
          <CodeEntry label="Invite code, correct" value="K7QM2XRT" onChangeText={() => {}} status="success" />
        </Section>

        <Section title="Choices">
          <View accessibilityRole="radiogroup" style={{ gap: t.space.sm + t.space.xxs }}>
            {['Student', 'Working', 'Something else'].map((o) => (
              <ChoiceRow key={o} label={o} selected={life === o} onPress={() => setLife(o)} />
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: t.space.sm + t.space.xxs,
            }}
          >
            {['Money', 'Health', 'Politics', 'Religion'].map((o) => (
              <Chip
                key={o}
                label={o}
                selected={topics.includes(o)}
                onPress={() =>
                  setTopics((now) => (now.includes(o) ? now.filter((x) => x !== o) : [...now, o]))
                }
              />
            ))}
          </View>
        </Section>

        <Section title="Avatars (a stand-in for the birds)">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md }}>
            {birdColors.map((c, i) => (
              <Avatar
                key={c.name}
                name={['Sam', 'Mom', 'Jo', 'Dad', 'Ana', 'Lee', 'Kit'][i]}
                color={c.color}
                size={i === 0 ? 72 : undefined}
              />
            ))}
          </View>
        </Section>

        <Section title="Banners and toasts">
          <Banner message="Mom hasn't joined yet. Her invite is good for 6 more days." />
          <Banner tone="success" message="Invite sent." />
          {note && (
            <Banner
              tone="error"
              message="You're offline. Changes will send when you're back."
              action={{ label: 'Retry', onPress: press('Retry') }}
              onDismiss={() => setNote(false)}
            />
          )}
          <Button
            label="Show a toast"
            variant="secondary"
            onPress={() => toast.show('Code copied', { tone: 'success' })}
          />
          <Button
            label="Show an error toast"
            variant="secondary"
            onPress={() => toast.show("That didn't send. Try again.", { tone: 'error' })}
          />
        </Section>

        <Section title="Sheet">
          <Button label="Open a sheet" variant="secondary" onPress={() => setSheet(true)} />
          <Sheet visible={sheet} onClose={() => setSheet(false)} title="Sign out of Twig?">
            <Text color="textMuted" align="center">
              Your people and everything you shared stay safe.
            </Text>
            <View style={{ gap: t.space.md }}>
              <Button label="Sign out" onPress={() => setSheet(false)} />
              <Button label="Cancel" variant="secondary" onPress={() => setSheet(false)} />
            </View>
          </Sheet>
        </Section>

        <Section title="Empty, loading and error">
          <Card>
            <EmptyView
              title="No one here yet"
              message="Invite a parent or a child to start."
              action={{
                label: 'Invite someone',
                onPress: press('Invite someone'),
              }}
            />
          </Card>
          <Card>
            <LoadingView label="Finding your people" />
          </Card>
          <Card>
            <ErrorView onRetry={press('Try again')} />
          </Card>
        </Section>

        <Section title="Cards">
          <Card>
            <Text variant="headline">A card</Text>
            <Text variant="footnote" color="textMuted">
              Flat, with a hairline edge.
            </Text>
          </Card>
          <Card raised onPress={press('Card')} accessibilityLabel="A raised card you can press">
            <Text variant="headline">A raised card you can press</Text>
          </Card>
        </Section>

        <Section title="List rows">
          <ListRow title="Mom" subtitle="Your mother · since 14 October" onPress={press('Mom')} />
          <ListRow
            title="Mute notifications"
            subtitle="For Mom only. Everything still shows in the app."
            toggle={{ value: muted, onValueChange: setMuted }}
          />
          <ListRow title="Time zone" subtitle="Europe/London" />
          <ListRow title="Block Mom" destructive onPress={press('Block')} />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      <Text variant="eyebrow" color="textMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
