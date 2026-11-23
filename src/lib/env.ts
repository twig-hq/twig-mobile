// The app's public configuration, from EXPO_PUBLIC_* variables that Expo
// inlines at build time. Development builds point at Twig Dev, store builds
// at Twig (see docs/supabase.md and .env.example). Both values are safe to
// ship: row-level security protects the data.

export type SupabaseEnv = { url: string; publishableKey: string };

export function readSupabaseEnv(
  url: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
): SupabaseEnv {
  if (!url || !publishableKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set. ' +
        'Copy .env.example to .env for a development build.',
    );
  }
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)) {
    throw new Error(`EXPO_PUBLIC_SUPABASE_URL is not a Supabase project URL: ${url}`);
  }
  if (!publishableKey.startsWith('sb_publishable_')) {
    // Legacy anon keys are disabled on both projects, and a secret key must
    // never be shipped in the app.
    throw new Error('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_…).');
  }
  return { url, publishableKey };
}

const PROJECTS: Record<string, string> = {
  hqyizuivrmuaqcddbbqa: 'Twig Dev',
  rwnhbqulkdbjhgcwxvxz: 'Twig',
};

// Which project this build talks to, for display in development builds.
export function backendName(url: string = readSupabaseEnv().url): string {
  const ref = new URL(url).hostname.split('.')[0];
  return PROJECTS[ref] ?? ref;
}
