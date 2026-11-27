import { Stack } from 'expo-router';

// The first run after signing up: make your bird and a few optional
// questions (issue #29). Only people who have not finished it can reach it.
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
