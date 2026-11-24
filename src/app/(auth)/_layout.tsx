import { Stack } from 'expo-router';

// Screens for people who are not signed in: welcome, then sign-in (issue #26).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
