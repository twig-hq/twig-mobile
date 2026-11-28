import type { Session } from '@supabase/supabase-js';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AvoidScreen from '@/app/(onboarding)/avoid';
import MeetScreen from '@/app/(onboarding)/bird';
import DepthScreen from '@/app/(onboarding)/depth';
import NameScreen from '@/app/(onboarding)/index';
import LifeScreen from '@/app/(onboarding)/life';
import PrintScreen from '@/app/(onboarding)/print';
import { printNumber } from '@/birds';
import { ToastProvider } from '@/components';
import { DraftProvider, startingName, type Draft } from '@/onboarding/draft';
import { addPhrase, MAX_PHRASES } from '@/onboarding/questions';
import { nearestStop, stopX, twigPath } from '@/onboarding/twig';
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
    finishOnboarding: jest.fn(async () => {}),
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
    // on to the questions; onboarding is not finished yet
    expect(push).toHaveBeenCalledWith('/life');
    expect(value.setOnboarded).not.toHaveBeenCalled();
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
    expect(push).not.toHaveBeenCalled();
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

describe('typed topics', () => {
  it('tidies a topic and refuses empty ones, repeats and too many', () => {
    expect(addPhrase([], '  my   job search ')).toEqual(['my job search']);
    expect(addPhrase(['my ex'], '   ')).toEqual(['my ex']);
    expect(addPhrase(['My ex'], 'my ex')).toEqual(['My ex']);
    const full = Array.from({ length: MAX_PHRASES }, (_, i) => `topic ${i}`);
    expect(addPhrase(full, 'one more')).toEqual(full);
    expect(addPhrase([], 'x'.repeat(60))[0]).toHaveLength(40);
  });
});

describe('the questions', () => {
  const answered: Partial<Draft> = { name: 'Sam', role: 'child', seed: 4821, color: 'sage', extra: 'none' };

  it('offers a son or daughter their own life stages, one at a time', async () => {
    await render(
      <Wrap value={session()} initial={answered}>
        <LifeScreen />
      </Wrap>,
    );
    expect(screen.getByRole('radio', { name: 'Just graduated' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Retired' })).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Working' }));
    expect(screen.getByRole('radio', { name: 'Working' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Student' }));
    expect(screen.getByRole('radio', { name: 'Working' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(push).toHaveBeenCalledWith('/depth');
  });

  it('offers parents theirs', async () => {
    await render(
      <Wrap value={session()} initial={{ ...answered, role: 'parent' }}>
        <LifeScreen />
      </Wrap>,
    );
    expect(screen.getByRole('radio', { name: 'Retired' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Caring for family' })).toBeTruthy();
  });

  it('is one slider for screen readers, Balanced to start, with an example for each depth', async () => {
    await render(
      <Wrap value={session()} initial={answered}>
        <DepthScreen />
      </Wrap>,
    );
    const slider = screen.getByRole('adjustable', { name: 'How personal' });
    expect(slider).toHaveAccessibilityValue({
      text: 'Balanced. For example: What did a Saturday look like when you were 24?',
    });
    expect(screen.getByText('“What did a Saturday look like when you were 24?”')).toBeTruthy();
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByText('“What do you wish you had asked your own parents?”')).toBeTruthy();
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    // already as deep as it goes
    expect(screen.getByRole('adjustable', { name: 'How personal' })).toHaveAccessibilityValue({
      text: 'Deep. For example: What do you wish you had asked your own parents?',
    });
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(screen.getByText('“What was the first job you ever had?”')).toBeTruthy();
  });

  it('moves to a depth when its label is tapped, and skips to the next question', async () => {
    await render(
      <Wrap value={session()} initial={answered}>
        <DepthScreen />
      </Wrap>,
    );
    await fireEvent.press(screen.getByText('Light', { includeHiddenElements: true }));
    expect(screen.getByText('“What was the first job you ever had?”')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(push).toHaveBeenCalledWith('/avoid');
  });

  it('saves every answer, picked and typed topics included, and finishes', async () => {
    const value = session();
    await render(
      <Wrap value={value} initial={{ ...answered, lifeStage: 'working', depth: 1 }}>
        <AvoidScreen />
      </Wrap>,
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Politics' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Money' }));
    await fireEvent.changeText(screen.getByLabelText('Or add your own'), 'My job search');
    await fireEvent.press(screen.getByRole('button', { name: 'Add topic' }));
    await fireEvent.changeText(screen.getByLabelText('Or add your own'), 'my ex');
    await fireEvent(screen.getByLabelText('Or add your own'), 'submitEditing');
    // and take one back
    await fireEvent.press(screen.getByRole('button', { name: 'my ex, added by you. Remove' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(value.finishOnboarding).toHaveBeenCalledWith({
      lifeStage: 'working',
      depth: 1,
      avoidTopics: ['politics', 'money'],
      avoidPhrases: ['My job search'],
    });
  });

  it('skipping the last question still finishes, without topics', async () => {
    const value = session();
    await render(
      <Wrap value={value} initial={{ ...answered, avoidTopics: ['health'] }}>
        <AvoidScreen />
      </Wrap>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(value.finishOnboarding).toHaveBeenCalledWith({
      lifeStage: null,
      depth: 2,
      avoidTopics: [],
      avoidPhrases: [],
    });
  });
});

describe('the twig', () => {
  it('finds the stop nearest a point', () => {
    expect(nearestStop(0, 300)).toBe(0);
    expect(nearestStop(140, 300)).toBe(1);
    expect(nearestStop(300, 300)).toBe(2);
    expect(stopX(1, 300)).toBe(150);
  });

  it('dips more under a bird that has landed than one that is lifted', () => {
    const depth = (d: string) => Number(d.split(' ')[9]);
    expect(depth(twigPath(300, 150, 3))).toBeGreaterThan(depth(twigPath(300, 150, 1)));
  });
});
