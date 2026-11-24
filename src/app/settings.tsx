import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, ListRow, ScreenHeader, Text } from '@/components';
import { backendName } from '@/lib/env';
import { useSession } from '@/session';
import { useTheme } from '@/theme';

// The shell of Settings: profile and the rest arrive with issue #36.
export default function SettingsScreen() {
  const t = useTheme();
  const { preview, signOut } = useSession();
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
        {__DEV__ && <ListRow title="Components" onPress={() => router.push('/dev/components')} />}
        {__DEV__ && <ListRow title="Design tokens" onPress={() => router.push('/dev/tokens')} />}
        <Button label={preview ? 'Stop looking around' : 'Sign out'} variant="secondary" onPress={signOut} />
      </View>
    </View>
  );
}
