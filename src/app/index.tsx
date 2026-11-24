import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { backendName } from '@/lib/env';
import { useTheme } from '@/theme';

// Placeholder until the app shell (issue #22) exists.
export default function HomeScreen() {
  const t = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: t.colors.background, gap: t.space.sm }]}>
      <Text style={[t.text.display, { color: t.colors.text }]}>Twig</Text>
      <Text style={[t.text.body, { color: t.colors.textMuted }]}>Connected to {backendName()}</Text>
      {__DEV__ && (
        <Link
          href="/dev/tokens"
          style={[
            t.text.label,
            styles.devLink,
            // 20 pt of text plus 12 pt above and below: a 44 pt tap target
            { color: t.colors.text, marginTop: t.space.lg, paddingVertical: t.space.md },
          ]}
        >
          Design tokens
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  devLink: { textDecorationLine: 'underline' },
});
