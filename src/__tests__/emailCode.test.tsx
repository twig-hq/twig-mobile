import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CodeScreen, { ENTER_AFTER_MS } from '@/app/(auth)/code';
import EmailScreen from '@/app/(auth)/email';
import {
  checkCode,
  checkMessages,
  countdown,
  deviceTimeZone,
  EXPIRES_AFTER_S,
  isEmail,
  lastSentAt,
  RESEND_AFTER_S,
  resetSendClock,
  secondsLeft,
  sendCode,
  sendMessages,
} from '@/auth/emailCode';
import { ToastProvider } from '@/components';
import { supabase } from '@/lib/supabase';
import { SessionContext, type SessionValue } from '@/session';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } },
}));
const mockParams = jest.fn(() => ({ email: 'sam@example.com' }) as { email?: string });
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => mockParams(),
}));

const signInWithOtp = supabase.auth.signInWithOtp as jest.Mock;
const verifyOtp = supabase.auth.verifyOtp as jest.Mock;
const ok = { data: {}, error: null };
const fail = (message: string, status: number, code: string) => ({
  data: {},
  error: new AuthApiError(message, status, code),
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const session: SessionValue = {
  status: 'signedOut',
  session: null,
  preview: false,
  startPreview: jest.fn(),
  holdSignedOut: jest.fn(),
  account: null,
  setOnboarded: jest.fn(async () => {}),
  saveProfile: jest.fn(async () => {}),
  reloadAccount: jest.fn(),
  signOut: jest.fn(async () => ({ ok: true })),
};
const holdSignedOut = session.holdSignedOut as jest.Mock;

function Wrap({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <SessionContext.Provider value={session}>
        <ToastProvider>{children}</ToastProvider>
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetSendClock();
});

describe('small rules', () => {
  it('accepts ordinary addresses and catches the usual slips', () => {
    expect(isEmail('sam@example.com')).toBe(true);
    expect(isEmail('  Sam.Lee+twig@mail.example.co.uk ')).toBe(true);
    for (const bad of ['', 'sam', 'sam@', 'sam@example', '@example.com', 'sam @example.com']) {
      expect(isEmail(bad)).toBe(false);
    }
  });

  it('counts down in minutes and seconds', () => {
    expect(countdown(60)).toBe('1:00');
    expect(countdown(23.2)).toBe('0:24');
    expect(countdown(-3)).toBe('0:00');
  });

  it('knows how long is left of a wait', () => {
    expect(secondsLeft(1_000, 31_000, RESEND_AFTER_S)).toBe(30);
    expect(secondsLeft(0, EXPIRES_AFTER_S * 1000, EXPIRES_AFTER_S)).toBe(0);
  });
});

describe('sendCode', () => {
  it('sends to the tidied address and remembers when', async () => {
    signInWithOtp.mockResolvedValue(ok);
    expect(await sendCode(' Sam@Example.com ', 5_000)).toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'sam@example.com',
      options: { shouldCreateUser: true, data: { timezone: deviceTimeZone() } },
    });
    expect(lastSentAt('sam@example.com')).toBe(5_000);
  });

  it('does not ask the server about something that is not an address', async () => {
    expect(await sendCode('sam@')).toEqual({ ok: false, problem: 'invalid' });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it.each([
    [
      'For security purposes, you can only request this after 37 seconds.',
      429,
      'over_email_send_rate_limit',
      'tooSoon',
    ],
    ['email rate limit exceeded', 429, 'over_email_send_rate_limit', 'tooMany'],
    ['Request rate limit reached', 429, 'over_request_rate_limit', 'tooMany'],
    ['Email address not authorized', 400, 'email_address_not_authorized', 'notAllowed'],
    ['Email address is invalid', 400, 'email_address_invalid', 'invalid'],
    ['Signups not allowed', 422, 'signup_disabled', 'other'],
  ])('reads "%s" as %s', async (message, status, code, problem) => {
    signInWithOtp.mockResolvedValue(fail(message, status, code));
    expect(await sendCode('sam@example.com')).toEqual({ ok: false, problem });
    expect(lastSentAt('sam@example.com')).toBeUndefined();
  });

  it("starts a new account in the phone's time zone", () => {
    expect(deviceTimeZone()).toMatch(/^(UTC|[A-Za-z_]+\/[A-Za-z_\/+-]+)$/);
  });

  it('calls a server error a problem on our side, not a lost connection', async () => {
    signInWithOtp.mockResolvedValue({
      data: {},
      error: new AuthRetryableFetchError('Internal Server Error', 500),
    });
    expect(await sendCode('sam@example.com')).toEqual({ ok: false, problem: 'other' });
    verifyOtp.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError('Bad Gateway', 502) });
    expect(await checkCode('sam@example.com', '123456')).toEqual({ ok: false, problem: 'other' });
  });

  it('says so when the phone is offline, whether the library returns or throws the error', async () => {
    signInWithOtp.mockResolvedValue({
      data: {},
      error: new AuthRetryableFetchError('Network request failed', 0),
    });
    expect(await sendCode('sam@example.com')).toEqual({ ok: false, problem: 'offline' });
    signInWithOtp.mockRejectedValue(new AuthRetryableFetchError('Network request failed', 0));
    expect(await sendCode('sam@example.com')).toEqual({ ok: false, problem: 'offline' });
  });
});

describe('checkCode', () => {
  it('checks an emailed code', async () => {
    verifyOtp.mockResolvedValue(ok);
    expect(await checkCode('Sam@example.com', '482916')).toEqual({ ok: true });
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'sam@example.com', token: '482916', type: 'email' });
  });

  it.each([
    ['Token has expired or is invalid', 403, 'otp_expired', 'wrong'],
    ['Request rate limit reached', 429, 'over_request_rate_limit', 'tooMany'],
    ['Database error', 500, 'unexpected_failure', 'other'],
  ])('reads "%s" as %s', async (message, status, code, problem) => {
    verifyOtp.mockResolvedValue(fail(message, status, code));
    expect(await checkCode('sam@example.com', '000000')).toEqual({ ok: false, problem });
  });
});

describe('EmailScreen', () => {
  it('explains a mistyped address without sending anything', async () => {
    await render(<EmailScreen />, { wrapper: Wrap });
    await fireEvent.changeText(screen.getByLabelText('Email'), 'sam@example');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByRole('alert')).toHaveTextContent(sendMessages.invalid);
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends a code and moves on to the code screen', async () => {
    const push = jest.spyOn(router, 'push').mockImplementation(() => {});
    signInWithOtp.mockResolvedValue(ok);
    await render(<EmailScreen />, { wrapper: Wrap });
    await fireEvent.changeText(screen.getByLabelText('Email'), 'Sam@Example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(push).toHaveBeenCalledWith({ pathname: '/code', params: { email: 'sam@example.com' } });

    // asking again straight away uses the code already sent
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(2);
    push.mockRestore();
  });

  it('shows what went wrong when the email cannot be sent', async () => {
    signInWithOtp.mockResolvedValue(fail('email rate limit exceeded', 429, 'over_email_send_rate_limit'));
    await render(<EmailScreen />, { wrapper: Wrap });
    await fireEvent.changeText(screen.getByLabelText('Email'), 'sam@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByRole('alert')).toHaveTextContent(sendMessages.tooMany);
  });
});

describe('CodeScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const field = () => screen.getByLabelText('Code from the email');

  it('names the address and makes the person wait before resending', async () => {
    await render(<CodeScreen />, { wrapper: Wrap });
    expect(screen.getByText('sam@example.com')).toBeTruthy();
    expect(screen.getByText('Resend code in 1:00')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Resend code' })).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(RESEND_AFTER_S * 1000 + 1000);
    });
    signInWithOtp.mockResolvedValue(ok);
    await fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Resend code in 1:00')).toBeTruthy();
  });

  it('checks a full code, shows "You are in", then lets the app open', async () => {
    verifyOtp.mockResolvedValue(ok);
    await render(<CodeScreen />, { wrapper: Wrap });
    await fireEvent.changeText(field(), '482916');
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'sam@example.com', token: '482916', type: 'email' });
    expect(screen.getByLabelText('You are in')).toBeTruthy();
    // held on this screen while the egg hatches…
    expect(holdSignedOut).toHaveBeenLastCalledWith(true);
    await act(async () => {
      jest.advanceTimersByTime(ENTER_AFTER_MS);
    });
    // …then let through
    expect(holdSignedOut).toHaveBeenLastCalledWith(false);
  });

  it('says a wrong code did not match and empties the boxes for another try', async () => {
    verifyOtp.mockResolvedValue(fail('Token has expired or is invalid', 403, 'otp_expired'));
    await render(<CodeScreen />, { wrapper: Wrap });
    await fireEvent.changeText(field(), '111111');
    expect(screen.getByRole('alert')).toHaveTextContent(checkMessages.wrong);
    expect(field()).toHaveAccessibilityValue({ text: 'empty' });
    expect(holdSignedOut).toHaveBeenLastCalledWith(false);
    // typing again clears the message
    await fireEvent.changeText(field(), '4');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stops taking a code once it has expired and offers a new one', async () => {
    await render(<CodeScreen />, { wrapper: Wrap });
    await act(async () => {
      jest.advanceTimersByTime(EXPIRES_AFTER_S * 1000 + 1000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('That code has expired.');
    expect(field()).toBeDisabled();
    signInWithOtp.mockResolvedValue(ok);
    await fireEvent.press(screen.getByRole('button', { name: 'Send a new code' }));
    expect(screen.queryByText('That code has expired.')).toBeNull();
    expect(field()).toBeEnabled();
  });

  it('goes back to change the address', async () => {
    const back = jest.spyOn(router, 'back').mockImplementation(() => {});
    await render(<CodeScreen />, { wrapper: Wrap });
    await fireEvent.press(screen.getByRole('button', { name: 'Change email' }));
    expect(back).toHaveBeenCalled();
    back.mockRestore();
  });
});
