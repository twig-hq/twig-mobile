import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, EmptyView, Text } from '@/components';
import { birdColors, useTheme } from '@/theme';

type Props = {
  title: string;
  children: ReactNode;
};

/** A tab's frame: a large title, the way into Settings at the top right, then the content. */
export function TabScreen({ title, children }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + t.space.md,
            paddingHorizontal: t.gutter,
            paddingBottom: t.space.sm,
            gap: t.space.md,
          },
        ]}
      >
        <Text variant="display" accessibilityRole="header" style={styles.fill}>
          {title}
        </Text>
        {/* The person's bird goes here once birds are drawn in the app. */}
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={t.space.xs}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Avatar name="You" color={birdColors[0].color} size={t.size.minTapTarget + t.space.xs} decorative />
        </Pressable>
      </View>
      <View style={styles.fill}>{children}</View>
    </View>
  );
}

/** What a tab shows before its feature is built: what will be here, and that it is coming. */
export function ComingSoon({ title, message }: { title: string; message: string }) {
  const t = useTheme();
  return (
    <View style={[styles.center, { gap: t.space.sm, paddingBottom: t.space.xxxl }]}>
      <EmptyView title={title} message={message} />
      <View
        style={{
          paddingVertical: t.space.xs + t.space.xxs,
          paddingHorizontal: t.space.lg - t.space.xxs,
          borderRadius: t.radius.pill,
          backgroundColor: t.colors.surface,
          borderWidth: 1,
          borderColor: t.colors.border,
        }}
      >
        <Text variant="footnote" style={{ fontFamily: t.text.label.fontFamily }}>
          Hatching soon
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
