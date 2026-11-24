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
      {__DEV__ &&
        (['/dev/tokens', '/dev/components'] as const).map((href, i) => (
          <Link
            key={href}
            href={href}
            style={[
              t.text.label,
              styles.devLink,
              // 20 pt of text plus 12 pt above and below: a 44 pt tap target
              { color: t.colors.text, marginTop: i === 0 ? t.space.lg : 0, paddingVertical: t.space.md },
            ]}
          >
            {href === '/dev/tokens' ? 'Design tokens' : 'Components'}
          </Link>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  devLink: { textDecorationLine: 'underline' },
});
