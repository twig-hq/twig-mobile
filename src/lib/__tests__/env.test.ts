import { backendName, readSupabaseEnv } from '../env';

const DEV_URL = 'https://hqyizuivrmuaqcddbbqa.supabase.co';
const KEY = 'sb_publishable_example';

describe('readSupabaseEnv', () => {
  it('accepts a project URL and a publishable key', () => {
    expect(readSupabaseEnv(DEV_URL, KEY)).toEqual({ url: DEV_URL, publishableKey: KEY });
  });

  it('explains what to do when the variables are missing', () => {
    expect(() => readSupabaseEnv('', '')).toThrow(/Copy \.env\.example/);
  });

  it('rejects anything but a Supabase project URL', () => {
    expect(() => readSupabaseEnv('http://localhost:54321', KEY)).toThrow(/not a Supabase project URL/);
  });

  it('rejects legacy anon keys and secret keys', () => {
    expect(() => readSupabaseEnv(DEV_URL, 'eyJhbGciOiJIUzI1NiJ9.e30.x')).toThrow(/publishable key/);
    expect(() => readSupabaseEnv(DEV_URL, 'sb_secret_example')).toThrow(/publishable key/);
  });
});

describe('backendName', () => {
  it('names the two Twig projects', () => {
    expect(backendName(DEV_URL)).toBe('Twig Dev');
    expect(backendName('https://rwnhbqulkdbjhgcwxvxz.supabase.co')).toBe('Twig');
  });
});
