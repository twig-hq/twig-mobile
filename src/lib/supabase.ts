import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';
import { sessionStorage } from './encryptedStorage';
import { readSupabaseEnv } from './env';

const { url, publishableKey } = readSupabaseEnv();

// One client for the whole app, typed from the generated database types.
// The session is kept encrypted on the phone (see encryptedStorage.ts).
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
