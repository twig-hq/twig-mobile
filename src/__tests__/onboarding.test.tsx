import type { Session } from '@supabase/supabase-js';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MeetScreen from '@/app/(onboarding)/bird';
import NameScreen from '@/app/(onboarding)/index';
import PrintScreen from '@/app/(onboarding)/print';
import { printNumber } from '@/birds';
import { ToastProvider } from '@/components';
import { DraftProvider, startingName, type Draft } from '@/onboarding/draft';
import { SessionContext, type SessionValue } from '@/session';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function session(change: Partial<SessionValue> = {}): SessionValue {
  return {
    status: 'onboarding',
    // only what onboarding reads: the address the starting name came from
    session: { user: { email: 'adelpazoki85@gmail.com' } } as unknown as Session,
    account: {
      profileId: 'p1',
      displayName: 'adelpazoki85',
      timeZone: 'UTC',
      bird: { color: null, seed: 5, extra: 'none' },
      role: null,
      onboarded: false,
    },
    preview: false,
    startPreview: jest.fn(),
    holdSignedOut: jest.fn(),
    setOnboarded: jest.fn(async () => {}),
    saveProfile: jest.fn(async () => {}),
    reloadAccount: jest.fn(),
    signOut: jest.fn(async () => ({ ok: true })),
    ...change,
  };
}

function Wrap({
  value,
  initial,
  children,
}: {
  value: SessionValue;
  initial?: Partial<Draft>;
  children: ReactNode;
}) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <SessionContext.Provider value={value}>
        <ToastProvider>
          <DraftProvider initial={initial}>{children}</DraftProvider>
        </ToastProvider>
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}

let push: jest.SpyInstance;
beforeEach(() => {
  push = jest.spyOn(router, 'push').mockImplementation(() => {});
});
afterEach(() => push.mockRestore());

describe('startingName', () => {
  it('does not offer the email address back as a name', () => {
    expect(startingName('adelpazoki85', 'adelpazoki85@gmail.com')).toBe('');
    expect(startingName('Sam', 'sam.lee@example.com')).toBe('Sam');
    expect(startingName(undefined, undefined)).toBe('');
  });
});

describe('step 1: name and role', () => {
  it('needs a name and a role before going on', async () => {
    await render(
      <Wrap value={session()}>
        <NameScreen />
      </Wrap>,
    );
    const next = () => screen.getByRole('button', { name: 'Continue' });
    expect(screen.getByLabelText('Your name')).toHaveProp('value', '');
    expect(next()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sam');
    expect(next()).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: /A son or daughter/ }));
    expect(screen.getByRole('radio', { name: /A son or daughter/ })).toBeChecked();
    expect(next()).toBeEnabled();

    await fireEvent.press(next());
    expect(push).toHaveBeenCalledWith('/print');
  });

  it('asks for a name if the field is left empty', async () => {
    await render(
      <Wrap value={session()}>
        <NameScreen />
      </Wrap>,
    );
    await fireEvent(screen.getByLabelText('Your name'), 'blur');
    expect(screen.getByRole('alert')).toHaveTextContent('Add the name your family calls you.');
  });
});

describe('step 2: press and hold', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('makes a print when held, then moves on', async () => {
    await render(
      <Wrap value={session()}>
        <PrintScreen />
      </Wrap>,
    );
    expect(screen.getByText('Press and hold here')).toBeTruthy();
    const pad = screen.getByRole('button', { name: 'Make your print' });
    await fireEvent(pad, 'pressIn');
    expect(screen.getByText('Keep holding…')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });
    expect(screen.getByText('Got it!')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(push).toHaveBeenCalledWith('/bird');
  });

  it('starts over if let go too soon', async () => {
    await render(
      <Wrap value={session()}>
        <PrintScreen />
      </Wrap>,
    );
    const pad = screen.getByRole('button', { name: 'Make your print' });
    await fireEvent(pad, 'pressIn');
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    await fireEvent(pad, 'pressOut');
    expect(screen.getByText('Press and hold here')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('lets a screen reader make the print with a double tap', async () => {
    await render(
      <Wrap value={session()}>
        <PrintScreen />
      </Wrap>,
    );
    await fireEvent(screen.getByRole('button', { name: 'Make your print' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(screen.getByText('Got it!')).toBeTruthy();
  });
});

describe('step 3: meet your bird', () => {
  const ready: Partial<Draft> = { name: ' Sam ', role: 'child', seed: 4821, color: null, extra: 'none' };

  it('shows the name and print number, and saves the bird the person made', async () => {
    const value = session();
    await render(
      <Wrap value={value} initial={ready}>
        <MeetScreen />
      </Wrap>,
    );
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText(`Print no. ${printNumber(4821)}`)).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Sage' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Headphones' }));
    expect(screen.getByRole('radio', { name: 'Sage' })).toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: "That's me" }));

    expect(value.saveProfile).toHaveBeenCalledWith({
      displayName: ' Sam ',
      role: 'child',
      bird: { seed: 4821, color: 'sage', extra: 'headphones' },
    });
    expect(value.setOnboarded).toHaveBeenCalledWith(true);
  });

  it('keeps the person here, and says so, if saving fails', async () => {
    jest.useFakeTimers();
    const value = session({ saveProfile: jest.fn(async () => Promise.reject(new Error('offline'))) });
    await render(
      <Wrap value={value} initial={ready}>
        <MeetScreen />
      </Wrap>,
    );
    await fireEvent.press(screen.getByRole('button', { name: "That's me" }));
    expect(value.setOnboarded).not.toHaveBeenCalled();
    expect(
      screen.getByText("That didn't save. Check your connection and try again.", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });
});
