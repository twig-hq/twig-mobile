import { deviceTimeZone } from '@/auth/emailCode';
import { toExtra, type BirdLook } from '@/birds';
import type { Answers } from '@/onboarding/questions';
import { supabase } from '@/lib/supabase';

// What the app needs to know about the signed-in person before it can show
// the right screen: their profile, and whether they have finished onboarding.

export type Account = {
  profileId: string;
  displayName: string;
  timeZone: string;
  bird: BirdLook;
  /** A parent, or a son or daughter ('child'); null until onboarding asks. */
  role: 'parent' | 'child' | null;
  /** Onboarding is finished, or was skipped, once user_preferences.completed_at is set. */
  onboarded: boolean;
};

export async function loadAccount(authUserId: string): Promise<Account> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, timezone, bird_seed, bird_color, bird_extra, family_role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error('This login has no active profile');
  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('completed_at')
    .eq('user_id', profile.id)
    .maybeSingle();
  if (prefsError) throw prefsError;
  return {
    profileId: profile.id,
    displayName: profile.display_name,
    timeZone: profile.timezone,
    bird: { color: profile.bird_color, seed: profile.bird_seed, extra: toExtra(profile.bird_extra) },
    role: profile.family_role === 'parent' || profile.family_role === 'child' ? profile.family_role : null,
    onboarded: Boolean(prefs?.completed_at),
  };
}

/** The time zone to save, if the phone has moved to a different one. */
export function timeZoneToSave(stored: string, device: string): string | null {
  return device && device !== stored ? device : null;
}

/**
 * Keeps the profile in the phone's time zone, checked each time the app
 * starts. Returns the zone it saved, or null. A zone the database does not
 * recognise is left alone.
 */
export async function refreshTimeZone(account: Account, device = deviceTimeZone()): Promise<string | null> {
  const next = timeZoneToSave(account.timeZone, device);
  if (!next) return null;
  const { error } = await supabase.from('profiles').update({ timezone: next }).eq('id', account.profileId);
  return error ? null : next;
}

/** Marks onboarding finished (or, in development, not finished, to see it again). */
export async function setOnboarded(profileId: string, done: boolean): Promise<void> {
  const completed_at = done ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from('user_preferences')
    .update({ completed_at })
    .eq('user_id', profileId)
    .select('user_id');
  if (error) throw error;
  if (data.length > 0) return;
  // no preferences yet: the row starts here (user_id defaults to the caller)
  const { error: insertError } = await supabase.from('user_preferences').insert({ completed_at });
  if (insertError) throw insertError;
}

export type ProfileChanges = {
  displayName: string;
  role: 'parent' | 'child';
  bird: BirdLook;
};

/** Saves what onboarding asked: the name, the role and the bird. */
export async function saveProfile(profileId: string, c: ProfileChanges): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: c.displayName.trim(),
      family_role: c.role,
      bird_seed: c.bird.seed,
      bird_color: c.bird.color,
      bird_extra: c.bird.extra,
    })
    .eq('id', profileId);
  if (error) throw error;
}

/** Saves onboarding's answers and marks onboarding finished, in one write. */
export async function saveAnswers(profileId: string, a: Answers): Promise<void> {
  const row = {
    life_stage: a.lifeStage,
    question_depth: a.depth,
    avoid_topics: a.avoidTopics,
    avoid_phrases: a.avoidPhrases,
    completed_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('user_preferences')
    .update(row)
    .eq('user_id', profileId)
    .select('user_id');
  if (error) throw error;
  if (data.length > 0) return;
  const { error: insertError } = await supabase.from('user_preferences').insert(row);
  if (insertError) throw insertError;
}
