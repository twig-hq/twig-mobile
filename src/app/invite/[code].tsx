import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button, cleanCode, CodeEntry, ErrorView, INVITE_ALPHABET, ScreenHeader, Text } from '@/components';
import { useTheme } from '@/theme';

const LENGTH = 8;

// Where an invite link lands: twig://invite/K7QM2XRT. It reads the code from
// the link; joining with it arrives with issue #31.
export default function InviteLinkScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = cleanCode(params.code ?? '', INVITE_ALPHABET, LENGTH);
  const home = () => router.replace('/');

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ScreenHeader onBack={home} title="Invite" />
      {code.length === LENGTH ? (
        <View style={{ padding: t.gutter, gap: t.space.xl }}>
          <View style={{ gap: t.space.sm }}>
            <Text variant="display" align="center" accessibilityRole="header">
              You have an invite
            </Text>
            <Text color="textMuted" align="center">
              Joining with a code comes in a later update. Keep this code for then.
            </Text>
          </View>
          <CodeEntry label="Invite code" value={code} onChangeText={() => {}} editable={false} />
          <Button label="Continue" onPress={home} />
        </View>
      ) : (
        <ErrorView
          title="That invite link doesn't look right"
          message="Ask the person who sent it for the 8-character code."
          onRetry={undefined}
        />
      )}
    </View>
  );
}
