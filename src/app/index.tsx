import { StyleSheet, Text, View } from 'react-native';

import { backendName } from '@/lib/env';

// Placeholder until the design system and app shell (issue #2) exist.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Twig</Text>
      <Text style={styles.subtitle}>Connected to {backendName()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 32, fontWeight: '600' },
  subtitle: { fontSize: 15, opacity: 0.6 },
});
