import { Tabs } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { Button, Icon, ListRow, Sheet, Text } from '@/components';
import { usePressScale } from '@/components/motion';
import { useTheme } from '@/theme';

import { TABS, type TabRoute } from './tabs';

const tabPrint = require('../../assets/images/tab-print.png');

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

// Pen-drawn tab icons from the designs, on a 48 x 48 grid.
function TabIcon({ route, color, strokeWidth }: { route: TabRoute; color: string; strokeWidth: number }) {
  const pen = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  } as const;
  return (
    <Svg width={28} height={28} viewBox="0 0 48 48">
      {route === 'index' && (
        <Path
          {...pen}
          d="M 8 23 L 24 9.5 L 40 23 M 12.5 19.5 V 39.5 H 35.5 V 19.5 M 20.5 39.5 V 29.5 H 27.5 V 39.5"
        />
      )}
      {route === 'discover' && (
        <Path
          {...pen}
          d="M 24 7.5 C 15.5 7.5 10.5 14 10.5 20.5 C 10.5 26.5 14.5 29.5 17.5 33 V 36 H 30.5 V 33 C 33.5 29.5 37.5 26.5 37.5 20.5 C 37.5 14 32.5 7.5 24 7.5 Z M 18.5 41 H 29.5"
        />
      )}
      {route === 'archive' && (
        <>
          <Path {...pen} d="M 6.5 24 C 10 37 38 37 41.5 24 Z M 9.5 29.5 C 17 34.5 31 34.5 38.5 29.5" />
          <Ellipse {...pen} cx={19.5} cy={18} rx={4.6} ry={5.8} />
          <Ellipse {...pen} cx={29} cy={17.5} rx={4.6} ry={5.8} />
        </>
      )}
      {route === 'people' && (
        <>
          <Ellipse {...pen} cx={18} cy={24} rx={9} ry={12} />
          <Ellipse {...pen} cx={31} cy={26.5} rx={7.6} ry={10} />
        </>
      )}
    </Svg>
  );
}

/** The bar at the bottom: two tabs, the Share button, two tabs. */
export function TabBar({ state, emitter, navigateToTab }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [sharing, setSharing] = useState(false);
  const press = usePressScale();
  const active = state.routes[state.index]?.name;

  const tab = ({ route, label }: (typeof TABS)[number]) => {
    const target = state.routes.find((r) => r.name === route);
    if (!target) return null;
    const on = active === route;
    return (
      <Pressable
        key={route}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={() => {
          const event = emitter.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
          if (!on && !event.defaultPrevented) navigateToTab(target.key);
        }}
        style={[styles.tab, { minHeight: t.size.minTapTarget, gap: t.space.xxs }]}
      >
        <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {/* A thumbprint under the open tab. It is gold for everyone until people have their own colour. */}
          {on && <Image source={tabPrint} style={styles.print} />}
          <TabIcon
            route={route}
            color={on ? t.colors.text : t.colors.textSubtle}
            strokeWidth={on ? 3.6 : 3}
          />
        </View>
        {/* The label grows with the text-size setting, up to what the bar has room for. */}
        <Text
          variant="caption"
          color={on ? 'text' : 'textSubtle'}
          align="center"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={on ? { fontFamily: t.text.eyebrow.fontFamily } : undefined}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          paddingTop: t.space.sm + t.space.xxs,
          paddingBottom: Math.max(insets.bottom, t.space.sm),
          paddingHorizontal: t.space.xs,
          backgroundColor: t.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.colors.border,
        },
      ]}
    >
      {TABS.slice(0, 2).map(tab)}
      <Animated.View style={[press.style, styles.share]}>
        <Pressable
          {...press.handlers}
          onPress={() => setSharing(true)}
          accessibilityRole="button"
          accessibilityLabel="Share something"
          style={[
            styles.shareButton,
            {
              width: t.size.control,
              height: t.size.control,
              borderRadius: t.size.control / 2,
              backgroundColor: t.colors.primary,
              boxShadow: t.elevation.floating,
            },
          ]}
        >
          <Icon name="plus" color="onPrimary" size={t.size.icon + t.space.xxs} strokeWidth={2.8} />
        </Pressable>
      </Animated.View>
      {TABS.slice(2).map(tab)}

      {/* Sharing arrives in a later milestone; until then the button says so. */}
      <Sheet visible={sharing} onClose={() => setSharing(false)} title="Sharing is almost here">
        <Text color="textMuted" align="center">
          These hatch in the next update. For now, invite your people so they are ready.
        </Text>
        <View style={{ gap: t.space.sm }}>
          <ListRow title="Check-in" subtitle="A few words about your day" />
          <ListRow title="Photo" subtitle="A moment from today" />
          <ListRow title="Voice note" subtitle="Say it out loud" />
        </View>
        <Button label="Got it" onPress={() => setSharing(false)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' },
  tab: { flex: 1, alignItems: 'center' },
  icon: { alignItems: 'center', justifyContent: 'center' },
  print: { position: 'absolute', width: 36, height: 36, opacity: 0.85 },
  share: { marginTop: -24 },
  shareButton: { alignItems: 'center', justifyContent: 'center' },
});
