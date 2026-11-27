import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Extra } from '@/birds';
import { useSession } from '@/session';

/** What onboarding has gathered so far. Nothing is saved until "That's me". */
export type Draft = {
  name: string;
  role: 'parent' | 'child' | null;
  /** The print made by pressing and holding; null until then. */
  seed: number | null;
  /** A bird colour by its database name ('gold'); null until chosen. */
  color: string | null;
  extra: Extra;
};

type DraftValue = { draft: Draft; update: (changes: Partial<Draft>) => void };

const DraftContext = createContext<DraftValue | null>(null);

/**
 * The name a new profile starts with is the first part of the email address
 * (the database has nothing better). It is not offered back as "your name".
 */
export function startingName(displayName: string | undefined, email: string | undefined): string {
  if (!displayName) return '';
  const local = email?.split('@')[0];
  return displayName === local ? '' : displayName;
}

export function DraftProvider({ children, initial }: { children: ReactNode; initial?: Partial<Draft> }) {
  const { account, session } = useSession();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: startingName(account?.displayName, session?.user.email),
    role: account?.role ?? null,
    seed: null,
    color: account?.bird.color ?? null,
    extra: account?.bird.extra ?? 'none',
    ...initial,
  }));
  const update = useCallback((changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes })), []);
  const value = useMemo(() => ({ draft, update }), [draft, update]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useDraft needs a <DraftProvider> above it');
  return value;
}
