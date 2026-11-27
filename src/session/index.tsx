import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export type SessionValue = {
  status: SessionStatus;
  /** The Supabase session, or null when signed out or in the development preview. */
  session: Session | null;
  /** Development builds only: look around the signed-in app without an account. */
  preview: boolean;
  startPreview: () => void;
  /**
   * While held, a new session does not yet count as signed in. The code screen
   * holds while it checks a code, so the egg can hatch before the app moves on.
   */
  holdSignedOut: (held: boolean) => void;
  signOut: () => Promise<void>;
};

/**
 * The rule the whole app's routing follows. A stored session and the
 * development preview both count as signed in, unless the sign-in screen is
 * holding for a moment; nothing is decided until the stored session has been read.
 */
export function statusFor(
  loaded: boolean,
  hasSession: boolean,
  preview: boolean,
  held = false,
): SessionStatus {
  if ((hasSession || preview) && !held) return 'signedIn';
  return loaded ? 'signedOut' : 'loading';
}

export const SessionContext = createContext<SessionValue | null>(null);

// Who is signed in. Encrypted storage, onboarding routing and clearing local
// data on sign-out arrive with issue #28.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [preview, setPreview] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const startPreview = useCallback(() => {
    if (__DEV__) setPreview(true);
  }, []);
  const signOut = useCallback(async () => {
    setPreview(false);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status: statusFor(loaded, session !== null, preview, held),
      session,
      preview,
      startPreview,
      holdSignedOut: setHeld,
      signOut,
    }),
    [loaded, session, preview, held, startPreview, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession needs a <SessionProvider> above it');
  return value;
}
