import { Stack } from 'expo-router';

import { DraftProvider } from '@/onboarding/draft';

// The first run after signing up: your name, then making your bird (and,
// next, a few optional questions). Only people who have not finished it can
// reach it. The answers are kept together until the last step saves them.
export default function OnboardingLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DraftProvider>
  );
}
