import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// Signing in with a code sent by email. No passwords: new and returning
// people take the same two steps. The three numbers below must match the
// project's sign-in settings (docs/supabase.md, "Sign-in settings").

/** Digits in the emailed code. */
export const CODE_LENGTH = 6;
/** Seconds before another code can be sent to the same address. The server enforces this too. */
export const RESEND_AFTER_S = 60;
/** Seconds a code stays valid. */
export const EXPIRES_AFTER_S = 600;

/** A loose check that catches typos like a missing "@" or ending. The server has the final say. */
export function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text.trim());
}

/** The same address however it was typed. */
export function tidyEmail(text: string): string {
  return text.trim().toLowerCase();
}

/** "0:24", for the wait before a code can be sent again. */
export function countdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export type SendProblem = 'tooSoon' | 'tooMany' | 'notAllowed' | 'invalid' | 'offline' | 'other';
export type CheckProblem = 'wrong' | 'tooMany' | 'offline' | 'other';
type Result<P> = { ok: true } | { ok: false; problem: P };

/** What to tell the person, in words that say what happened and what to do next. */
export const sendMessages: Record<SendProblem, string> = {
  tooSoon: 'You just asked for a code. Give it a minute, then try again.',
  tooMany: 'Too many emails have been sent for now. Try again in a little while.',
  notAllowed: "We can't email that address yet. While Twig is being tested, only the team's addresses work.",
  invalid: "That doesn't look like an email address. Check it and try again.",
  offline: "Can't reach Twig. Check your connection and try again.",
  other: 'Something went wrong on our side. Try again.',
};
export const checkMessages: Record<CheckProblem, string> = {
  wrong: 'That code did not match. Check the email and try again.',
  tooMany: 'Too many tries. Wait a few minutes, then ask for a new code.',
  offline: "Can't reach Twig. Check your connection and try again.",
  other: 'Something went wrong on our side. Try again.',
};

// When the last code went to each address, so going back and forth between
// the two screens does not send (or try to send) a second one too soon.
const sentAt = new Map<string, number>();

/** When a code was last sent to this address in this run of the app, in milliseconds, or undefined. */
export function lastSentAt(email: string): number | undefined {
  return sentAt.get(tidyEmail(email));
}

/** Seconds until `span` seconds have passed since `since`. Zero or less means the wait is over. */
export function secondsLeft(since: number, now: number, span: number): number {
  return span - (now - since) / 1000;
}

/** Emails a code to this address, creating the account if it is new. */
export async function sendCode(email: string, now: number = Date.now()): Promise<Result<SendProblem>> {
  const address = tidyEmail(email);
  if (!isEmail(address)) return { ok: false, problem: 'invalid' };
  let error: unknown;
  try {
    ({ error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } }));
  } catch (thrown) {
    error = thrown;
  }
  if (!error) {
    sentAt.set(address, now);
    return { ok: true };
  }
  return { ok: false, problem: sendProblem(error) };
}

/** Checks the code. On success the app is signed in: the session provider hears about it by itself. */
export async function checkCode(email: string, code: string): Promise<Result<CheckProblem>> {
  let error: unknown;
  try {
    ({ error } = await supabase.auth.verifyOtp({ email: tidyEmail(email), token: code, type: 'email' }));
  } catch (thrown) {
    error = thrown;
  }
  if (!error) return { ok: true };
  return { ok: false, problem: checkProblem(error) };
}

function sendProblem(error: unknown): SendProblem {
  if (isAuthRetryableFetchError(error)) return 'offline';
  if (!isAuthApiError(error)) return 'other';
  switch (error.code) {
    case 'over_email_send_rate_limit':
      // one code for two limits: "you can only request this after 37 seconds" is
      // the wait between codes; anything else is the project's hourly email limit
      return /after \d+ seconds/i.test(error.message) ? 'tooSoon' : 'tooMany';
    case 'over_request_rate_limit':
      return 'tooMany';
    case 'email_address_not_authorized':
      return 'notAllowed';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'invalid';
    default:
      return error.status === 429 ? 'tooMany' : 'other';
  }
}

function checkProblem(error: unknown): CheckProblem {
  if (isAuthRetryableFetchError(error)) return 'offline';
  if (!isAuthApiError(error)) return 'other';
  // The server gives one answer for a wrong code and an expired one. The code
  // screen knows how long ago the code was sent, and words it from that.
  if (error.code === 'otp_expired' || /expired|invalid/i.test(error.message)) return 'wrong';
  if (error.code === 'over_request_rate_limit' || error.status === 429) return 'tooMany';
  return 'other';
}

/** For tests: forget every address. */
export function resetSendClock(): void {
  sentAt.clear();
}
