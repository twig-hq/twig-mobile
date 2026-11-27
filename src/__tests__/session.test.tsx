import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OnboardingScreen from '@/app/(onboarding)/index';
import SettingsScreen from '@/app/settings';
import { ToastProvider } from '@/components';
import { createEncryptedStorage, type Cipher, type Keychain } from '@/lib/encryptedStorage';
import { utf8Decode, utf8Encode } from '@/lib/utf8';
import { SessionContext, type SessionValue } from '@/session';
import { timeZoneToSave } from '@/session/account';
import { birdColor, toExtra } from '@/birds';
import { ridges } from '@/birds/drawing';
import { birdColors } from '@/theme';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function session(change: Partial<SessionValue> = {}): SessionValue {
  return {
    status: 'signedIn',
    session: null,
    account: {
      profileId: 'p1',
      displayName: 'Sam',
      timeZone: 'America/Toronto',
      bird: { color: 'gold', seed: 7, extra: 'headphones' },
      role: 'child',
      onboarded: true,
    },
    preview: false,
    startPreview: jest.fn(),
    holdSignedOut: jest.fn(),
    setOnboarded: jest.fn(async () => {}),
    reloadAccount: jest.fn(),
    signOut: jest.fn(async () => ({ ok: true })),
    ...change,
  };
}

function Wrap({ value, children }: { value: SessionValue; children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <SessionContext.Provider value={value}>
        <ToastProvider>{children}</ToastProvider>
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}

describe('utf8', () => {
  it('round-trips any text, accents and emoji included', () => {
    for (const text of ['', 'plain', 'Zoë · café', '{"name":"Mom 🐣"}', '日本語', '𝄞']) {
      expect(utf8Decode(utf8Encode(text))).toBe(text);
    }
  });

  it('encodes as standard UTF-8', () => {
    expect(Array.from(utf8Encode('é🐣'))).toEqual([0xc3, 0xa9, 0xf0, 0x9f, 0x90, 0xa3]);
  });

  it('refuses bytes that are not UTF-8', () => {
    expect(() => utf8Decode(Uint8Array.from([0xc3]))).toThrow();
    expect(() => utf8Decode(Uint8Array.from([0x80]))).toThrow();
  });
});

describe('encrypted session storage', () => {
  // A stand-in cipher: reversible, keyed, and visibly not the plain text.
  const cipher: Cipher = {
    newKey: jest.fn(async () => `key${Math.random()}`),
    encrypt: async (plain, key) => `${key}|${Array.from(plain).join('.')}`,
    decrypt: async (sealed, key) => {
      const [k, body] = sealed.split('|');
      if (k !== key) throw new Error('wrong key');
      return Uint8Array.from(body ? body.split('.').map(Number) : []);
    },
  };
  function setup() {
    const data = new Map<string, string>();
    const store = {
      getItem: async (n: string) => data.get(n) ?? null,
      setItem: async (n: string, v: string) => void data.set(n, v),
      removeItem: async (n: string) => void data.delete(n),
    };
    let saved: string | null = null;
    const keychain: Keychain = {
      get: async () => saved,
      set: async (k) => void (saved = k),
      remove: async () => void (saved = null),
    };
    return { data, store, keychain, storage: createEncryptedStorage(store, keychain, cipher) };
  }
  const session = '{"access_token":"a.b.c","user":{"email":"zoë@example.com"}}';

  it('keeps only ciphertext in storage, and reads it back', async () => {
    const { data, storage } = setup();
    await storage.setItem('sb-auth', session);
    expect(data.get('sb-auth')).not.toContain('access_token');
    expect(await storage.getItem('sb-auth')).toBe(session);
  });

  it('makes one key, even when two writes arrive together', async () => {
    const { storage } = setup();
    (cipher.newKey as jest.Mock).mockClear();
    await Promise.all([storage.setItem('a', '1'), storage.setItem('b', '2')]);
    expect(cipher.newKey).toHaveBeenCalledTimes(1);
    expect(await storage.getItem('a')).toBe('1');
    expect(await storage.getItem('b')).toBe('2');
  });

  it('signs the person out, rather than failing, when the key is gone', async () => {
    const { data, store, keychain, storage } = setup();
    await storage.setItem('sb-auth', session);
    await keychain.remove();
    // a new start of the app, as after restoring a backup on another phone
    const restarted = createEncryptedStorage(store, keychain, cipher);
    expect(await restarted.getItem('sb-auth')).toBeNull();
    expect(data.has('sb-auth')).toBe(false);
  });

  it('encrypts a session that an older build saved in the clear', async () => {
    const { data, storage } = setup();
    data.set('sb-auth', session);
    expect(await storage.getItem('sb-auth')).toBe(session);
    expect(data.get('sb-auth')).not.toContain('access_token');
  });

  it('cannot read anything once the key is forgotten', async () => {
    const { storage } = setup();
    await storage.setItem('sb-auth', session);
    await storage.forgetKey();
    expect(await storage.getItem('sb-auth')).toBeNull();
  });
});

describe('time zone', () => {
  it('saves the phone’s zone only when it has changed', () => {
    expect(timeZoneToSave('UTC', 'America/Toronto')).toBe('America/Toronto');
    expect(timeZoneToSave('America/Toronto', 'America/Toronto')).toBeNull();
    expect(timeZoneToSave('UTC', '')).toBeNull();
  });
});

describe('OnboardingScreen', () => {
  it('lets a new person into the app', async () => {
    const value = session({ status: 'onboarding' });
    await render(
      <Wrap value={value}>
        <OnboardingScreen />
      </Wrap>,
    );
    expect(screen.getByRole('header', { name: 'Welcome to Twig' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(value.setOnboarded).toHaveBeenCalledWith(true);
  });
});

describe('Settings', () => {
  it('asks before signing out', async () => {
    const value = session();
    await render(
      <Wrap value={value}>
        <SettingsScreen />
      </Wrap>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(value.signOut).not.toHaveBeenCalled();
    expect(screen.getByRole('header', { name: 'Sign out of Twig?' })).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: 'Sign out' });
    await fireEvent.press(buttons[buttons.length - 1]);
    expect(value.signOut).toHaveBeenCalled();
  });

  it('says so when signing out fails, and stays signed in', async () => {
    jest.useFakeTimers();
    const value = session({ signOut: jest.fn(async () => ({ ok: false })) });
    await render(
      <Wrap value={value}>
        <SettingsScreen />
      </Wrap>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    const buttons = screen.getAllByRole('button', { name: 'Sign out' });
    await fireEvent.press(buttons[buttons.length - 1]);
    expect(
      screen.getByText("Couldn't sign out. Check your connection and try again.", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows the time zone the account is in', async () => {
    await render(
      <Wrap value={session()}>
        <SettingsScreen />
      </Wrap>,
    );
    expect(screen.getByText('America/Toronto')).toBeTruthy();
  });
});

describe('birds', () => {
  it('draws the chosen colour, or one picked from the print until a colour is chosen', () => {
    expect(birdColor({ color: 'gold', seed: 1 })).toBe('#D9A033');
    expect(birdColor({ color: null, seed: 0 })).toBe(birdColors[0].color);
    expect(birdColor({ color: null, seed: 15 })).toBe(birdColors[1].color);
    expect(birdColor({ color: 'purple', seed: 2 })).toBe(birdColors[2].color);
  });

  it('only accepts the extras it knows how to draw', () => {
    expect(toExtra('hat')).toBe('hat');
    expect(toExtra('crown')).toBe('none');
    expect(toExtra(null)).toBe('none');
  });

  it('draws the same print for the same seed, and a different one for another', () => {
    expect(ridges(42)).toEqual(ridges(42));
    expect(ridges(42)).not.toEqual(ridges(43));
    expect(ridges(42)).toHaveLength(15);
  });
});
