import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorView, useToast } from '@/components';
import { useTheme } from '@/theme';

import { useSession } from '.';

/** Shown instead of the app when someone is signed in but their account would not load. */
export function AccountError() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { reloadAccount, signOut } = useSession();
  return (
    <View
      style={[
        styles.fill,
        {
          backgroundColor: t.colors.background,
          paddingBottom: insets.bottom + t.space.xl,
          padding: t.gutter,
        },
      ]}
    >
      <View style={styles.fill}>
        <ErrorView
          title="We couldn't open your account"
          message="Check your connection and try again."
          onRetry={reloadAccount}
        />
      </View>
      <Button
        label="Sign out"
        variant="plain"
        onPress={async () => {
          const { ok } = await signOut();
          if (!ok) toast.show("Couldn't sign out. Check your connection and try again.", { tone: 'error' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
