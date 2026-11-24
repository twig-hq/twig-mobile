import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from '@/app/(auth)/index';
import InviteLinkScreen from '@/app/invite/[code]';
import { TabBar } from '@/navigation/TabBar';
import { greeting, TABS } from '@/navigation/tabs';
import { SessionContext, statusFor, type SessionValue } from '@/session';

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
  it('shows which backend the build talks to and offers the development preview', async () => {
    await render(
      <Wrap>
        <WelcomeScreen />
      </Wrap>,
    );
    expect(screen.getByText('Connected to Twig Dev')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Look around the app' }));
    expect(signedOut.startPreview).toHaveBeenCalled();
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
