-- Twig: topics a person types in to leave out, beside the ones they pick
--
-- Onboarding's "Anything to leave out?" offers topics to pick (stored as
-- prompt_library tags in avoid_topics: money, health, politics, religion,
-- past_relationships) and a field to type your own, like "my job search".
-- Typed topics are not tags, so they go in their own column.
--
-- They are stored now so nothing a person asks for is lost. The question
-- pickers (daily prompts and Discover) do not read them yet: when those are
-- built, they must skip any question whose text mentions one of them, for
-- both people in the pair. Like avoid_topics, only the person can see them.

alter table public.user_preferences
  add column avoid_phrases text[] not null default '{}'
    check (cardinality(avoid_phrases) <= 20 and char_length(array_to_string(avoid_phrases, '')) <= 800);

comment on column public.user_preferences.avoid_phrases is
  'Topics the person typed to leave out (not tags). Question pickers must skip prompts that mention them.';

grant insert (avoid_phrases), update (avoid_phrases) on public.user_preferences to authenticated;
