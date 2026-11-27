import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from '@/app/(auth)/index';
import InviteLinkScreen from '@/app/invite/[code]';
import { ToastProvider } from '@/components';
import { TabBar } from '@/navigation/TabBar';
import { greeting, TABS } from '@/navigation/tabs';
import { SessionContext, statusFor, type SessionValue } from '@/session';
import { BUBBLES, BUTTONS_AT, FLY, FLYERS, LOOP_AT, SCENE_LABEL, STAMPED } from '@/welcome/scene';

const mockParams = jest.fn(() => ({}) as { code?: string });
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => mockParams(),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const signedOut: SessionValue = {
  status: 'signedOut',
  session: null,
  preview: false,
  startPreview: jest.fn(),
  holdSignedOut: jest.fn(),
  signOut: jest.fn(async () => {}),
};

function Wrap({ children, session = signedOut }: { children: ReactNode; session?: SessionValue }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
    </SafeAreaProvider>
  );
}

describe('who sees what', () => {
  it('decides nothing until the stored session has been read', () => {
    expect(statusFor(false, false, false)).toBe('loading');
  });

  it('sends people without a session to the signed-out screens', () => {
    expect(statusFor(true, false, false)).toBe('signedOut');
  });

  it('keeps a brand-new session waiting while the sign-in screen holds it', () => {
    expect(statusFor(true, true, false, true)).toBe('signedOut');
    expect(statusFor(true, true, false, false)).toBe('signedIn');
  });

  it('treats a session, or the development preview, as signed in', () => {
    expect(statusFor(true, true, false)).toBe('signedIn');
    expect(statusFor(false, true, false)).toBe('signedIn');
    expect(statusFor(true, false, true)).toBe('signedIn');
  });
});

describe('greeting', () => {
  it('follows the time of day', () => {
    expect(greeting(7)).toBe('Good morning');
    expect(greeting(13)).toBe('Good afternoon');
    expect(greeting(21)).toBe('Good evening');
    expect(greeting(2)).toBe('Good evening');
  });
});

describe('WelcomeScreen', () => {
  const welcome = (
    <Wrap>
      <ToastProvider>
        <WelcomeScreen />
      </ToastProvider>
    </Wrap>
  );

  it('describes the picture in one sentence and offers both ways to sign in', async () => {
    await render(welcome);
    expect(screen.getByRole('image', { name: SCENE_LABEL })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Closer, twig by twig' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
    expect(
      screen.getByText('Sign in with Apple is coming soon.', { includeHiddenElements: true }),
    ).toBeTruthy();
    const push = jest.spyOn(router, 'push').mockImplementation(() => {});
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    expect(push).toHaveBeenCalledWith('/email');
    push.mockRestore();
  });

  it('offers the development preview', async () => {
    await render(welcome);
    await fireEvent.press(screen.getByRole('button', { name: 'Look around' }));
    expect(signedOut.startPreview).toHaveBeenCalled();
  });
});

describe('the welcome animation plan', () => {
  it('shows and hides every pop-up inside one loop, in order', () => {
    for (const b of BUBBLES) {
      expect(b.show).toBeGreaterThan(0);
      expect(b.hide).toBeGreaterThan(b.show + 0.03);
      expect(b.hide + 0.03).toBeLessThan(1);
    }
  });

  it('lands both prints before the rest of the family is pressed on', () => {
    const landed = Math.max(...FLYERS.map((f) => f.go + FLY));
    expect(Math.min(...STAMPED.map((s) => s.at))).toBeGreaterThan(landed);
    expect(LOOP_AT).toBeGreaterThan(BUTTONS_AT);
  });
});

describe('TabBar', () => {
  type Props = ComponentProps<typeof TabBar>;
  const routes = TABS.map((t) => ({ key: `${t.route}-key`, name: t.route }));

  function bar(index: number, navigateToTab = jest.fn()) {
    const props = {
      state: { index, routes },
      emitter: { emit: () => ({ defaultPrevented: false }) },
      navigateToTab,
    } as unknown as Props;
    return (
      <Wrap>
        <TabBar {...props} />
      </Wrap>
    );
  }

  it('has the four tabs, marks the open one and moves to another', async () => {
    const navigateToTab = jest.fn();
    await render(bar(0, navigateToTab));
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual([
      'Home',
      'Discover',
      'Archive',
      'Your people',
    ]);
    expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Archive' }));
    expect(navigateToTab).toHaveBeenCalledWith('archive-key');
  });

  it('does not reopen the tab that is already open', async () => {
    const navigateToTab = jest.fn();
    await render(bar(1, navigateToTab));
    await fireEvent.press(screen.getByRole('tab', { name: 'Discover' }));
    expect(navigateToTab).not.toHaveBeenCalled();
  });

  it('says sharing is coming when the Share button is pressed', async () => {
    await render(bar(0));
    expect(screen.queryByText('Sharing is almost here')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Share something' }));
    expect(screen.getByRole('header', { name: 'Sharing is almost here' })).toBeTruthy();
  });
});

describe('invite link', () => {
  it('reads the code out of the link', async () => {
    mockParams.mockReturnValue({ code: 'k7qm-2xrt' });
    await render(
      <Wrap>
        <InviteLinkScreen />
      </Wrap>,
    );
    expect(screen.getByLabelText('Invite code')).toHaveAccessibilityValue({ text: 'K 7 Q M 2 X R T' });
  });

  it('says so when the link has no usable code', async () => {
    mockParams.mockReturnValue({ code: 'nope' });
    await render(
      <Wrap>
        <InviteLinkScreen />
      </Wrap>,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
