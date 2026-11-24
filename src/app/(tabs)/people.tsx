import { StyleSheet, View } from 'react-native';

import { EmptyView } from '@/components';
import { TabScreen } from '@/navigation/TabScreen';
import { useTheme } from '@/theme';

// The list of people and invites arrives with the Relationships screen (issue #32).
export default function PeopleTab() {
  const t = useTheme();
  return (
    <TabScreen title="Your people">
      <View style={[styles.center, { paddingBottom: t.space.xxxl }]}>
        <EmptyView title="No one here yet" message="Invite a parent or a child to start. Invites come in a later update." />
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
});
