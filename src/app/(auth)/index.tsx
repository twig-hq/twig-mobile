import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components';
import { backendName } from '@/lib/env';
import { useSession } from '@/session';
import { useTheme } from '@/theme';

// Placeholder for the welcome and sign-in screens (issue #26).
export default function WelcomeScreen() {
  const t = useTheme();
  const { startPreview } = useSession();
  return (
    <View
      style={[styles.container, { backgroundColor: t.colors.background, gap: t.space.sm, padding: t.gutter }]}
    >
      <Text variant="display">Twig</Text>
      <Text color="textMuted">Connected to {backendName()}</Text>
      {__DEV__ && (
        <View style={[styles.dev, { marginTop: t.space.xl, gap: t.space.xs }]}>
          <Button
            label="Look around the app"
            onPress={startPreview}
            accessibilityHint="Development only. Opens the signed-in app without an account."
          />
          {(['/dev/tokens', '/dev/components'] as const).map((href) => (
            <Link key={href} href={href} asChild>
              <Button
                label={href === '/dev/tokens' ? 'Design tokens' : 'Components'}
                variant="plain"
                onPress={() => {}}
              />
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dev: { alignSelf: 'stretch' },
});
