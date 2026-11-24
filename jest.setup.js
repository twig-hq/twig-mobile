// Tests run without a .env file (CI has none), so they get Twig Dev's public
// values here. Nothing in the tests talks to the network.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://hqyizuivrmuaqcddbbqa.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

// The device's storage does not exist in tests; this is the library's own in-memory stand-in.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
