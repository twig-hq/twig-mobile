import { Link, router } from 'expo-router';
import { Animated, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text, useToast } from '@/components';
import { useSession } from '@/session';
import { ThemeScheme, useTheme } from '@/theme';
import { AppleButton } from '@/welcome/AppleButton';
import { DESIGN, TAGLINE } from '@/welcome/scene';
import { useWelcomeTimeline, WelcomeScene, wordmark } from '@/welcome/WelcomeScene';

// The first screen: the logo from the splash screen becomes the birds, then
// the ways to sign in rise into place. Sign in with Apple arrives with issue
// #27; until then that button says so.
export default function WelcomeScreen() {
  // The picture is drawn in ink on cream, so this screen stays light in dark mode too.
  return (
    <ThemeScheme scheme="light">
      <Welcome />
    </ThemeScheme>
  );
}

function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { startPreview } = useSession();
  const toast = useToast();
  const timeline = useWelcomeTimeline();
  const { tagline, buttons } = timeline.once;

  const k = Math.min(width, 430) / DESIGN.width;
  const sceneTop = (height - DESIGN.height * k) / 2;
  const rise = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });
  const soon = () => toast.show('Sign in with Apple is coming soon.');

  return (
    <View style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <WelcomeScene width={width} height={height} timeline={timeline} />

      <Animated.View
        accessible
        accessibilityRole="header"
        accessibilityLabel="Closer, twig by twig"
        style={[
          styles.tagline,
          { top: sceneTop + TAGLINE.top * k, gap: t.space.xs + t.space.xxs },
          rise(tagline),
        ]}
      >
        <Text variant="title" style={{ fontFamily: t.text.caption.fontFamily }}>
          Closer, twig by
        </Text>
        <Image source={wordmark} style={styles.word} />
      </Animated.View>

      <Animated.View
        style={[
          styles.buttons,
          {
            paddingHorizontal: t.gutter,
            paddingBottom: Math.max(insets.bottom, t.space.xl),
            gap: t.space.md,
          },
          rise(buttons),
        ]}
      >
        <AppleButton onPress={soon} />
        <Button
          label="Continue with email"
          variant="secondary"
          icon={<Icon name="mail" size={t.size.iconSmall + t.space.xxs} strokeWidth={2} />}
          onPress={() => router.push('/email')}
        />
        <Text variant="footnote" color="textMuted" align="center">
          You agree to our Terms and Privacy Policy.
        </Text>
        {__DEV__ && (
          <View style={styles.dev}>
            <Button
              label="Look around"
              variant="plain"
              onPress={startPreview}
              accessibilityHint="Development only. Opens the signed-in app without an account."
            />
            <Link href="/dev/components" asChild>
              <Button label="Components" variant="plain" onPress={() => {}} />
            </Link>
            <Link href="/dev/tokens" asChild>
              <Button label="Tokens" variant="plain" onPress={() => {}} />
            </Link>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tagline: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: { width: 62, height: 31, marginTop: 6 },
  buttons: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dev: { flexDirection: 'row', justifyContent: 'center' },
});
