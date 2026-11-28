// The answers onboarding's optional questions offer, and what each one stores.

export type Stage = { key: string; label: string };

/** "Where are you in life?" Parents and their grown-up kids see different lists. */
export const LIFE_STAGES: Record<'parent' | 'child', Stage[]> = {
  child: [
    { key: 'student', label: 'Student' },
    { key: 'graduated', label: 'Just graduated' },
    { key: 'working', label: 'Working' },
    { key: 'between', label: 'Between things' },
    { key: 'other', label: 'Something else' },
  ],
  parent: [
    { key: 'working', label: 'Working' },
    { key: 'retired', label: 'Retired' },
    { key: 'caring', label: 'Caring for family' },
    { key: 'between', label: 'Between things' },
    { key: 'other', label: 'Something else' },
  ],
};

/** "How personal should questions get?" Stored as question_depth, 1 to 3. */
export const DEPTHS = [
  { depth: 1, label: 'Light', category: 'Then vs. now', example: 'What was the first job you ever had?' },
  {
    depth: 2,
    label: 'Balanced',
    category: 'Family stories',
    example: 'What did a Saturday look like when you were 24?',
  },
  {
    depth: 3,
    label: 'Deep',
    category: 'Things never asked',
    example: 'What do you wish you had asked your own parents?',
  },
] as const;
export const DEFAULT_DEPTH = 2;

/**
 * "Anything to leave out?" Each is a prompt_library topic tag: questions
 * tagged with it are never asked of the pair. Questions must be tagged with
 * these exact words.
 */
export const AVOID_TOPICS = [
  { tag: 'money', label: 'Money' },
  { tag: 'health', label: 'Health' },
  { tag: 'politics', label: 'Politics' },
  { tag: 'religion', label: 'Religion' },
  { tag: 'past_relationships', label: 'Past relationships' },
] as const;

/** Typed topics: how many, and how long each may be. */
export const MAX_PHRASES = 10;
export const MAX_PHRASE_LENGTH = 40;

/** Adds a typed topic, tidied, unless it is empty, already there, or there are too many. */
export function addPhrase(list: readonly string[], typed: string): string[] {
  const phrase = typed.trim().replace(/\s+/g, ' ').slice(0, MAX_PHRASE_LENGTH);
  if (!phrase || list.length >= MAX_PHRASES) return [...list];
  if (list.some((p) => p.toLowerCase() === phrase.toLowerCase())) return [...list];
  return [...list, phrase];
}

export type Answers = {
  lifeStage: string | null;
  depth: number;
  avoidTopics: string[];
  avoidPhrases: string[];
};
