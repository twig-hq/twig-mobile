import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearLocalData } from '@/lib/encryptedStorage';
import { supabase } from '@/lib/supabase';

import { loadAccount, refreshTimeZone, setOnboarded, type Account } from './account';

/**
 * Where the app is allowed to be.
 * loading: still reading the stored session (the splash screen stays up).
 * signedOut: the welcome and sign-in screens.
 * onboarding: signed in, but has not finished onboarding.
 * signedIn: the tabs and Settings.
 * error: signed in, but the account could not be loaded.
 */
export type SessionStatus = 'loading' | 'signedOut' | 'onboarding' | 'signedIn' | 'error';

/** How far loading the signed-in person's account has got. */
export type AccountState = 'none' | 'loading' | 'onboarding' | 'ready' | 'failed';

export type StatusInput = {
  /** The stored session has been read. */
  loaded: boolean;
  hasSession: boolean;
  /** Development only: look around the signed-in app without an account. */
  preview: boolean;
  /** The code screen is holding a brand-new session back for a moment. */
  held: boolean;
  account: AccountState;
  /** What the app showed last, kept while an account is still loading. */
  previous: SessionStatus;
};

/**
 * The rule the whole app's routing follows. Nothing is decided until the
 * stored session has been read, and a signed-in person stays where they were
 * until their account has loaded, so the screen never flashes somewhere else.
 */
export function statusFor(s: StatusInput): SessionStatus {
  if (!s.loaded) return 'loading';
  if (s.preview) return 'signedIn';
  if (!s.hasSession || s.held) return 'signedOut';
  switch (s.account) {
    case 'onboarding':
      return 'onboarding';
    case 'ready':
      return 'signedIn';
    case 'failed':
      return 'error';
    default:
      return s.previous;
  }
}

export type SessionValue = {
  status: SessionStatus;
  /** The Supabase session, or null when signed out or in the development preview. */
  session: Session | null;
  /** The signed-in person's profile, once loaded. */
  account: Account | null;
  /** Development builds only: look around the signed-in app without an account. */
  preview: boolean;
  startPreview: () => void;
  /**
   * While held, a new session does not yet count as signed in. The code screen
   * holds while it checks a code, so the egg can hatch before the app moves on.
   */
  holdSignedOut: (held: boolean) => void;
  /** Saves that onboarding is finished (or, in development, not finished), then moves on. */
  setOnboarded: (done: boolean) => Promise<void>;
  /** Tries loading the account again, after an error. */
  reloadAccount: () => void;
  /**
   * Signs out on this phone and removes everything the app stored on it.
   * Fails without signing out if Twig cannot be reached.
   */
  signOut: () => Promise<{ ok: boolean }>;
};

export const SessionContext = createContext<SessionValue | null>(null);

type Loaded = { userId: string; attempt: number; account: Account | null };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [preview, setPreview] = useState(false);
  const [held, setHeld] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);
  const [shown, setShown] = useState<SessionStatus>('loading');

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

  // Load the account once per sign-in (a token refresh keeps the same user),
  // and bring its time zone up to date while at it.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadAccount(userId)
      .then(async (account) => {
        if (!live) return;
        setResult({ userId, attempt, account });
        const zone = await refreshTimeZone(account);
        if (live && zone) setResult({ userId, attempt, account: { ...account, timeZone: zone } });
      })
      .catch(() => {
        if (live) setResult({ userId, attempt, account: null });
      });
    return () => {
      live = false;
    };
  }, [userId, attempt]);

  const current = result && result.userId === userId && result.attempt === attempt ? result : null;
  const account = current?.account ?? null;
  const accountState: AccountState = !userId
    ? 'none'
    : !current
      ? 'loading'
      : !account
        ? 'failed'
        : account.onboarded
          ? 'ready'
          : 'onboarding';

  const status = statusFor({
    loaded,
    hasSession: session !== null,
    preview,
    held,
    account: accountState,
    previous: shown,
  });
  // remember what was shown, for while the next account loads
  if (status !== shown) setShown(status);

  const startPreview = useCallback(() => {
    if (__DEV__) setPreview(true);
  }, []);

  const markOnboarded = useCallback(
    async (done: boolean) => {
      if (!account) return;
      await setOnboarded(account.profileId, done);
      setResult((r) => (r && r.account ? { ...r, account: { ...r.account, onboarded: done } } : r));
    },
    [account],
  );

  const reloadAccount = useCallback(() => setAttempt((n) => n + 1), []);

  const signOut = useCallback(async () => {
    if (preview && !session) {
      setPreview(false);
      return { ok: true };
    }
    // this phone only: the person stays signed in on their other devices
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) return { ok: false };
    setPreview(false);
    await clearLocalData();
    return { ok: true };
  }, [preview, session]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      session,
      account,
      preview,
      startPreview,
      holdSignedOut: setHeld,
      setOnboarded: markOnboarded,
      reloadAccount,
      signOut,
    }),
    [status, session, account, preview, startPreview, markOnboarded, reloadAccount, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession needs a <SessionProvider> above it');
  return value;
}
