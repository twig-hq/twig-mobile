import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, ListRow, ScreenHeader, Sheet, Text, useToast } from '@/components';
import { backendName } from '@/lib/env';
import { useSession } from '@/session';
import { useTheme } from '@/theme';

// The shell of Settings: profile and the rest arrive with issue #36.
export default function SettingsScreen() {
  const t = useTheme();
  const toast = useToast();
  const { preview, account, signOut, setOnboarded } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const leave = async () => {
    setLeaving(true);
    const { ok } = await signOut();
    // on success the app moves to the welcome screen by itself
    if (!ok) {
      setLeaving(false);
      setConfirming(false);
      toast.show("Couldn't sign out. Check your connection and try again.", { tone: 'error' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ScreenHeader
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        title="Settings"
      />
      <View style={{ padding: t.gutter, gap: t.space.md }}>
        {preview && (
          <Text color="textMuted">You are looking around without an account (development only).</Text>
        )}
        <ListRow title="Connected to" subtitle={backendName()} />
        {account && <ListRow title="Time zone" subtitle={account.timeZone} />}
        {__DEV__ && <ListRow title="Components" onPress={() => router.push('/dev/components')} />}
        {__DEV__ && <ListRow title="Design tokens" onPress={() => router.push('/dev/tokens')} />}
        {__DEV__ && <ListRow title="Birds" onPress={() => router.push('/dev/birds')} />}
        {__DEV__ && account && (
          <ListRow
            title="Show onboarding again"
            subtitle="Development only"
            onPress={() =>
              setOnboarded(false).catch(() => toast.show("That didn't save. Try again.", { tone: 'error' }))
            }
          />
        )}
        {preview && !account ? (
          <Button label="Stop looking around" variant="secondary" onPress={signOut} />
        ) : (
          <Button label="Sign out" variant="secondary" onPress={() => setConfirming(true)} />
        )}
      </View>

      <Sheet visible={confirming} onClose={() => !leaving && setConfirming(false)} title="Sign out of Twig?">
        <Text color="textMuted" align="center">
          Your people and everything you shared stay safe. Sign back in with the same email to pick up where
          you left off.
        </Text>
        <View style={{ gap: t.space.md }}>
          <Button label="Sign out" loading={leaving} onPress={leave} />
          <Button
            label="Cancel"
            variant="secondary"
            disabled={leaving}
            onPress={() => setConfirming(false)}
          />
        </View>
      </Sheet>
    </View>
  );
}
