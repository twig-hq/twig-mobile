-- Twig: initial schema
--
-- Rebuilt on 2026-11-15 from the Twig Google Doc (Architecture and Database
-- tabs) after the original tested sketch (schema_v2_sketch.sql) was lost with
-- the old laptop. From here on this file and the migrations after it are the
-- source of truth; the Database tab describes them.
--
-- Conventions
--   * Every function is SECURITY DEFINER with search_path = '' and fully
--     qualified names, and takes the caller from the session (app_uid()).
--   * Every table has row-level security. Policies call one access function
--     per kind of content.
--   * Anything that changes more than one row is a function called with rpc().
--   * Grant tables (shares, memberships, threads, saves) change only inside
--     functions: the app role has no insert/update/delete on them.
--   * Status columns are text + CHECK. Instants are timestamptz (UTC);
--     calendar days are date and say whose timezone they use.

-- ---------------------------------------------------------------------------
-- 0. Extensions and schemas
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- 1. Small pure helpers (used by CHECK constraints and functions)
-- ---------------------------------------------------------------------------

-- True when tz is an IANA zone name (America/Los_Angeles), never a fixed
-- offset or abbreviation such as UTC+5 or PST. Marked immutable so it can sit
-- in CHECK constraints; the zone list only changes with tzdata updates.
create function public.is_valid_timezone(tz text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select tz is not null and tz like '%/%' and exists (select 1 from pg_catalog.pg_timezone_names where name = tz)
      or tz = 'UTC';
$$;

-- Both member ids, lower first: one key per pair of people.
create function public.pair_key(a uuid, b uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when a::text < b::text then a::text || ':' || b::text
              else b::text || ':' || a::text end;
$$;

-- Discover categories, with how personal each one gets. A category deeper than
-- the pair's depth setting (the lower of the two) is skipped. With the default
-- depth of 2 every category is in play; depth 1 keeps to the lighter three.
create function public.discovery_category_depth(p_category text)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case p_category
    when 'then_vs_now'        then 1
    when 'person_never_knew'  then 1
    when 'through_your_eyes'  then 1
    when 'family_stories'     then 2
    when 'things_never_asked' then 2
  end::smallint;
$$;

-- Placeholder theme lines for library-built weeks. Product copy to replace.
create function public.discovery_category_theme(p_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_category
    when 'then_vs_now'        then 'How life has changed between your two generations.'
    when 'person_never_knew'  then 'Who you were before the other person knew you.'
    when 'through_your_eyes'  then 'How you see each other.'
    when 'family_stories'     then 'The stories that made your family.'
    when 'things_never_asked' then 'The questions you never got around to asking.'
  end;
$$;

create function public.discovery_category_title(p_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_category
    when 'then_vs_now'        then 'Then vs. Now'
    when 'person_never_knew'  then 'The Person I Never Knew'
    when 'through_your_eyes'  then 'Through Your Eyes'
    when 'family_stories'     then 'Our Family Stories'
    when 'things_never_asked' then 'The Things We Never Asked'
  end;
$$;

-- Moment data is a JSON object; a check-in mood, when present, is 1 to 5.
create function public.moment_data_valid(p_kind text, p_data jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_data) = 'object'
     and (p_kind <> 'checkin'
          or not (p_data ? 'mood')
          or (jsonb_typeof(p_data -> 'mood') = 'number'
              and (p_data ->> 'mood')::numeric between 1 and 5));
$$;

-- A date stored at a precision sits on the first day of its period.
create function public.date_matches_precision(p_date date, p_precision text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_precision
    when 'day'    then true
    when 'month'  then extract(day from p_date) = 1
    when 'year'   then extract(day from p_date) = 1 and extract(month from p_date) = 1
    when 'decade' then extract(day from p_date) = 1 and extract(month from p_date) = 1
                       and extract(year from p_date)::int % 10 = 0
    else false
  end;
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id               uuid primary key default gen_random_uuid(),
  auth_user_id     uuid unique references auth.users (id) on delete set null,
  display_name     text not null check (char_length(display_name) between 1 and 80),
  avatar_media_id  uuid,  -- FK added after media exists
  timezone         text not null default 'UTC' check (public.is_valid_timezone(timezone)),
  locale           text not null default 'en' check (char_length(locale) between 2 and 16),
  state            text not null default 'active'
                   check (state in ('active', 'deleting', 'deleted', 'memorialized')),
  state_changed_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint profiles_active_has_login
    check (state not in ('active', 'deleting') or auth_user_id is not null)
);
comment on table public.profiles is
  'A person. Separate from auth.users so shared memories can outlive a login.';

create table public.contact_labels (
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid not null references public.profiles (id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);
comment on table public.contact_labels is 'What one person calls another, such as Mom.';

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.user_preferences (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  life_stage     text check (char_length(life_stage) <= 80),
  interests      text[] not null default '{}',
  question_depth smallint not null default 2 check (question_depth between 1 and 3),
  avoid_topics   text[] not null default '{}',
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on column public.user_preferences.avoid_topics is
  'prompt_library tags this person never wants asked about. Always applied, with or without AI consent.';

-- ---------------------------------------------------------------------------
-- 3. Pairs
-- ---------------------------------------------------------------------------

create table public.relationships (
  id                     uuid primary key default gen_random_uuid(),
  pair_key               text not null,
  status                 text not null default 'active' check (status in ('active', 'paused', 'ended')),
  ended_mode             text check (ended_mode in ('kept_history', 'withdrawn')),
  timezone               text not null check (public.is_valid_timezone(timezone)),
  activated_at           timestamptz not null default now(),
  status_changed_at      timestamptz,
  status_changed_by      uuid references public.profiles (id) on delete set null,
  reconnect_requested_by uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint relationships_ended_mode_only_when_ended
    check ((status = 'ended') = (ended_mode is not null))
);
comment on column public.relationships.reconnect_requested_by is
  'A pending request to reconnect (paused), reopen (ended, history kept) or rejoin (ended, withdrawn).';

-- One open relationship per pair of people: crossed invites cannot make a second.
create unique index relationships_one_open_per_pair
  on public.relationships (pair_key) where status in ('active', 'paused');

create table public.relationship_members (
  relationship_id    uuid not null references public.relationships (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  role               text not null check (role in ('parent', 'child')),
  joined_at          timestamptz not null default now(),
  withdrawn_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (relationship_id, user_id),
  unique (relationship_id, role)  -- one parent and one child
);
create index relationship_members_user_idx on public.relationship_members (user_id, relationship_id);
comment on column public.relationship_members.withdrawn_at is
  'Set on the person who withdrew. They lose access to the other person''s content; the other keeps it. Cleared on rejoin.';

create table public.relationship_invites (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid not null references public.profiles (id) on delete cascade,
  inviter_role    text not null check (inviter_role in ('parent', 'child')),
  invitee_label   text not null check (char_length(invitee_label) between 1 and 40),
  token_hash      text not null unique,
  code_hash       text not null,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_by     uuid references public.profiles (id) on delete set null,
  accepted_at     timestamptz,
  revoked_at      timestamptz,
  relationship_id uuid references public.relationships (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((accepted_by is null) = (accepted_at is null))
);
create unique index relationship_invites_open_code
  on public.relationship_invites (code_hash) where accepted_at is null and revoked_at is null;
create index relationship_invites_created_by_idx on public.relationship_invites (created_by);

create table public.relationship_preferences (
  relationship_id     uuid not null,
  user_id             uuid not null,
  connection_goals    text[] not null default '{}' check (cardinality(connection_goals) <= 2),
  curiosity_topics    text[] not null default '{}',
  checkin_audience    text not null default 'shared' check (checkin_audience in ('only_me', 'shared')),
  notifications_muted boolean not null default false,
  account_delete_choice text not null default 'delete_shared'
                      check (account_delete_choice in ('delete_shared', 'leave_archive')),
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (relationship_id, user_id),
  foreign key (relationship_id, user_id)
    references public.relationship_members (relationship_id, user_id) on delete cascade
);
comment on table public.relationship_preferences is
  'Private per-pair answers. The other person never sees them.';
comment on column public.relationship_preferences.account_delete_choice is
  'Chosen when requesting account deletion: delete what I shared (default) or leave our Archive.';

create table public.consent_events (
  id              bigint generated always as identity primary key,
  user_id         uuid not null,
  relationship_id uuid not null,
  purpose         text not null check (purpose in ('ai_questions', 'ai_story_analysis')),
  granted         boolean not null,
  created_at      timestamptz not null default now(),
  foreign key (relationship_id, user_id)
    references public.relationship_members (relationship_id, user_id) on delete cascade
);
create index consent_events_lookup_idx
  on public.consent_events (user_id, relationship_id, purpose, created_at desc);
comment on table public.consent_events is 'Append-only AI consent history.';

create view public.current_consent
with (security_invoker = true) as
  select distinct on (user_id, relationship_id, purpose)
         user_id, relationship_id, purpose, granted, created_at
    from public.consent_events
   order by user_id, relationship_id, purpose, created_at desc, id desc;
comment on view public.current_consent is 'The latest consent answer per person, pair and purpose.';

-- ---------------------------------------------------------------------------
-- 4. Content and sharing
-- ---------------------------------------------------------------------------

create table public.media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('image', 'audio', 'video')),
  storage_path text not null unique,
  mime_type    text,
  bytes        bigint check (bytes >= 0),
  width        integer check (width > 0),
  height       integer check (height > 0),
  duration_ms  integer check (duration_ms >= 0),
  blurhash     text check (char_length(blurhash) <= 100),
  waveform     smallint[] check (cardinality(waveform) <= 512),
  status       text not null default 'pending' check (status in ('pending', 'ready')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint media_path_is_owner_slash_id
    check (storage_path = owner_id::text || '/' || id::text)
);
create index media_owner_idx on public.media (owner_id, created_at desc);
comment on table public.media is
  'One file in the private media bucket, stored at {owner_id}/{media_id}.';

alter table public.profiles
  add constraint profiles_avatar_media_fk
  foreign key (avatar_media_id) references public.media (id) on delete set null;

create table public.prompt_library (
  id            uuid primary key default gen_random_uuid(),
  surface       text not null check (surface in ('daily', 'discover')),
  category      text not null,
  depth         smallint not null default 1 check (depth between 1 and 3),
  audience_role text check (audience_role in ('parent', 'child')),
  topic_tags    text[] not null default '{}',
  locale        text not null default 'en',
  text          text not null check (char_length(text) between 1 and 500),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (surface <> 'discover' or public.discovery_category_depth(category) is not null)
);
create index prompt_library_pick_idx on public.prompt_library (surface, category, locale) where active;
comment on column public.prompt_library.category is
  'For discover: the category key. For daily: mood (the one mood question) or a rotating group name.';

-- user_integrations comes before moments because moments point at it.
create table public.user_integrations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  provider            text not null check (provider in ('spotify', 'apple_health')),
  status              text not null default 'connected'
                      check (status in ('connected', 'needs_reauth', 'disconnected')),
  provider_account_id text,
  granted_scopes      text[] not null default '{}',
  share_mode          text not null default 'off' check (share_mode in ('off', 'review', 'auto')),
  connection_version  integer not null default 1 check (connection_version >= 1),
  import_after        timestamptz not null default now(),
  last_synced_at      timestamptz,
  next_sync_at        timestamptz,
  last_error_code     text check (char_length(last_error_code) <= 64),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, provider)
);
create index user_integrations_sync_queue
  on public.user_integrations (next_sync_at) where status = 'connected' and share_mode <> 'off';

create table public.moments (
  id                    uuid primary key default gen_random_uuid(),
  author_id             uuid not null,  -- defaults to app_uid(), set below
  kind                  text not null default 'post' check (kind in ('post', 'checkin', 'music', 'activity')),
  body                  text check (char_length(body) <= 10000),
  data                  jsonb not null default '{}',
  prompt_id             uuid references public.prompt_library (id) on delete restrict,
  prompt_text           text,
  checkin_date          date,
  happened_on           date,
  happened_precision    text check (happened_precision in ('decade', 'year', 'month', 'day')),
  surface               text not null default 'feed' check (surface in ('feed', 'archive')),
  status                text not null default 'draft' check (status in ('draft', 'published', 'dismissed')),
  source                text not null default 'manual' check (source in ('manual', 'spotify', 'apple_health', 'sample')),
  integration_id        uuid references public.user_integrations (id) on delete set null,
  source_event_key      text,
  suggestion_expires_at timestamptz,
  occurred_at           timestamptz,
  published_at          timestamptz,
  edited_at             timestamptz,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (author_id) references public.profiles (id) on delete cascade,
  constraint moments_published_at_iff_published
    check ((status = 'published') = (published_at is not null)),
  constraint moments_checkin_fields
    check (case when kind = 'checkin'
                then prompt_id is not null and prompt_text is not null and checkin_date is not null
                else prompt_id is null and prompt_text is null and checkin_date is null end),
  constraint moments_happened_pair
    check ((happened_on is null) = (happened_precision is null)),
  constraint moments_happened_precision
    check (happened_on is null or public.date_matches_precision(happened_on, happened_precision)),
  constraint moments_data_valid check (public.moment_data_valid(kind, data)),
  constraint moments_manual_has_no_connector
    check (source <> 'manual' or (integration_id is null and source_event_key is null)),
  constraint moments_suggestion_only_for_connector_drafts
    check (suggestion_expires_at is null or (source <> 'manual' and status <> 'published')),
  unique (author_id, checkin_date, prompt_id),
  unique (integration_id, source_event_key)
);
create index moments_author_idx on public.moments (author_id, created_at desc);
create index moments_trash_idx on public.moments (deleted_at) where deleted_at is not null;
comment on column public.moments.surface is 'feed or archive. Archive memories never appear on Home.';
comment on column public.moments.deleted_at is 'Trash: restorable for 30 days, then purged.';

create table public.moment_media (
  moment_id  uuid not null references public.moments (id) on delete cascade,
  media_id   uuid not null references public.media (id) on delete restrict,
  position   smallint not null check (position between 0 and 9),
  created_at timestamptz not null default now(),
  primary key (moment_id, media_id),
  unique (moment_id, position)
);
create index moment_media_media_idx on public.moment_media (media_id);

create table public.moment_shares (
  moment_id       uuid not null references public.moments (id) on delete cascade,
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  first_shared_at timestamptz not null default now(),
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (moment_id, relationship_id)
);
create index moment_shares_feed_idx
  on public.moment_shares (relationship_id, first_shared_at desc) where revoked_at is null;
comment on table public.moment_shares is
  'The grant that lets a pair see a Moment. Unshare sets revoked_at; share again clears it.';

-- ---------------------------------------------------------------------------
-- 5. Discover
-- ---------------------------------------------------------------------------

create table public.discovery_activities (
  id                uuid primary key default gen_random_uuid(),
  relationship_id   uuid not null references public.relationships (id) on delete cascade,
  week_start        date not null check (extract(isodow from week_start) = 1),
  sequence_no       integer not null check (sequence_no >= 1),
  category          text not null check (public.discovery_category_depth(category) is not null),
  title             text not null check (char_length(title) between 1 and 120),
  theme             text not null check (char_length(theme) between 1 and 500),
  generation_source text not null check (generation_source in ('ai', 'library')),
  closes_at         timestamptz not null,
  revealed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (relationship_id, week_start),
  unique (relationship_id, sequence_no),
  unique (id, relationship_id),
  check (revealed_at is null or revealed_at <= closes_at)
);
comment on column public.discovery_activities.week_start is 'The Monday, in the relationship''s timezone.';
comment on column public.discovery_activities.closes_at is 'End of Sunday in the relationship''s timezone.';

create table public.discovery_prompts (
  activity_id       uuid not null,
  relationship_id   uuid not null,
  user_id           uuid not null,
  prompt_text       text not null check (char_length(prompt_text) between 1 and 500),
  library_prompt_id uuid references public.prompt_library (id) on delete set null,
  swap_count        smallint not null default 0 check (swap_count between 0 and 2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (activity_id, user_id),
  foreign key (activity_id, relationship_id)
    references public.discovery_activities (id, relationship_id) on delete cascade,
  foreign key (relationship_id, user_id)
    references public.relationship_members (relationship_id, user_id) on delete cascade
);

create table public.discovery_responses (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null,
  user_id      uuid not null,
  body         text check (char_length(body) <= 20000),
  media_id     uuid references public.media (id) on delete restrict,
  status       text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (activity_id, user_id),
  foreign key (activity_id, user_id)
    references public.discovery_prompts (activity_id, user_id) on delete cascade,
  check ((status = 'submitted') = (submitted_at is not null)),
  check (status = 'draft' or nullif(btrim(body), '') is not null or media_id is not null)
);
create index discovery_responses_trash_idx
  on public.discovery_responses (deleted_at) where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- 6. Conversations
-- ---------------------------------------------------------------------------

create table public.threads (
  id                    uuid primary key default gen_random_uuid(),
  relationship_id       uuid not null references public.relationships (id) on delete cascade,
  moment_id             uuid,
  discovery_activity_id uuid,
  created_at            timestamptz not null default now(),
  foreign key (moment_id, relationship_id)
    references public.moment_shares (moment_id, relationship_id) on delete cascade,
  foreign key (discovery_activity_id, relationship_id)
    references public.discovery_activities (id, relationship_id) on delete cascade,
  check (num_nonnulls(moment_id, discovery_activity_id) = 1),
  unique (relationship_id, moment_id),
  unique (relationship_id, discovery_activity_id),
  unique (id, relationship_id)
);
comment on table public.threads is
  'One conversation per item per pair. It points at the share, so Mom never sees the thread Dad has about the same Moment.';

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null,
  relationship_id uuid not null,
  author_id       uuid not null,
  body            text not null default '',
  media_id        uuid references public.media (id) on delete restrict,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (thread_id, relationship_id)
    references public.threads (id, relationship_id) on delete cascade,
  foreign key (relationship_id, author_id)
    references public.relationship_members (relationship_id, user_id) on delete cascade,
  check (deleted_at is not null or char_length(body) between 1 and 4000)
);
create index messages_thread_idx on public.messages (thread_id, created_at, id);

create table public.reactions (
  thread_id       uuid not null,
  relationship_id uuid not null,
  user_id         uuid not null,
  reaction        text not null check (reaction in ('heart', 'laugh', 'celebrate', 'hug')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (thread_id, user_id),
  foreign key (thread_id, relationship_id)
    references public.threads (id, relationship_id) on delete cascade,
  foreign key (relationship_id, user_id)
    references public.relationship_members (relationship_id, user_id) on delete cascade
);

create table public.thread_reads (
  thread_id       uuid not null,
  relationship_id uuid not null,
  user_id         uuid not null,
  last_read_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (thread_id, user_id),
  foreign key (thread_id, relationship_id)
    references public.threads (id, relationship_id) on delete cascade,
  foreign key (relationship_id, user_id)
    references public.relationship_members (relationship_id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 7. Archive and recaps
-- ---------------------------------------------------------------------------

create table public.saved_moments (
  moment_id       uuid not null,
  relationship_id uuid not null,
  saved_by        uuid not null,
  saved_at        timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  primary key (moment_id, relationship_id, saved_by),
  foreign key (moment_id, relationship_id)
    references public.moment_shares (moment_id, relationship_id) on delete cascade,
  foreign key (relationship_id, saved_by)
    references public.relationship_members (relationship_id, user_id) on delete cascade
);

create table public.monthly_recap_views (
  relationship_id uuid not null,
  user_id         uuid not null,
  recap_month     date not null check (extract(day from recap_month) = 1),
  viewed_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  primary key (relationship_id, user_id, recap_month),
  foreign key (relationship_id, user_id)
    references public.relationship_members (relationship_id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 8. Connectors and exports
-- ---------------------------------------------------------------------------

create table public.integration_auto_share (
  integration_id  uuid not null references public.user_integrations (id) on delete cascade,
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (integration_id, relationship_id)
);

create table private.integration_tokens (
  integration_id           uuid primary key references public.user_integrations (id) on delete cascade,
  access_token_ciphertext  bytea,
  refresh_token_ciphertext bytea,
  expires_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
comment on table private.integration_tokens is
  'OAuth tokens, encrypted by the Edge Function. The API does not expose this schema.';

create table public.export_jobs (
  id              uuid primary key default gen_random_uuid(),
  requested_by    uuid not null references public.profiles (id) on delete cascade,
  scope           text not null check (scope in ('my_content', 'relationship_archive')),
  relationship_id uuid references public.relationships (id) on delete cascade,
  status          text not null default 'queued'
                  check (status in ('queued', 'running', 'ready', 'failed', 'expired')),
  storage_path    text,
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((scope = 'relationship_archive') = (relationship_id is not null))
);
create index export_jobs_requested_by_idx on public.export_jobs (requested_by, created_at desc);

create table public.storage_deletions (
  storage_path text primary key,
  bucket_id    text not null default 'media',
  queued_at    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
comment on table public.storage_deletions is
  'Files to remove from Storage after a purge. Service role only: the storage-cleanup function deletes the file, then the row.';

-- ---------------------------------------------------------------------------
-- 9. Notifications
-- ---------------------------------------------------------------------------

create table public.push_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  expo_token   text not null unique check (char_length(expo_token) between 10 and 200),
  platform     text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  disabled_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index push_devices_user_idx on public.push_devices (user_id) where disabled_at is null;

create table public.notification_settings (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  posts_replies    boolean not null default true,
  discover         boolean not null default true,
  connections      boolean not null default true,
  reminder_enabled boolean not null default true,
  reminder_time    time not null default '19:00',
  quiet_enabled    boolean not null default true,
  quiet_start      time not null default '21:00',
  quiet_end        time not null default '08:00',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.notification_settings is 'One row per person. Times are in the person''s timezone.';

create table public.notification_outbox (
  id              bigint generated always as identity primary key,
  recipient_id    uuid not null references public.profiles (id) on delete cascade,
  actor_id        uuid references public.profiles (id) on delete cascade,
  relationship_id uuid references public.relationships (id) on delete cascade,
  category        text not null check (category in ('posts_replies', 'discover', 'connections', 'reminder')),
  event           text not null check (event in (
                    'moment_shared', 'message', 'reaction',
                    'discover_new', 'discover_your_turn', 'discover_revealed', 'discover_closing',
                    'invite_accepted', 'reconnect_requested', 'checkin_reminder')),
  subject_id      uuid,
  dedupe_key      text unique,
  is_follow_up    boolean not null default false,
  deliver_after   timestamptz not null default now(),
  status          text not null default 'queued' check (status in ('queued', 'sent', 'dropped')),
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  check ((status = 'sent') = (sent_at is not null))
);
create index notification_outbox_due_idx
  on public.notification_outbox (deliver_after) where status = 'queued';
create index notification_outbox_grouping_idx
  on public.notification_outbox (recipient_id, actor_id, category, sent_at desc) where status = 'sent';
create index notification_outbox_subject_idx
  on public.notification_outbox (subject_id) where status = 'queued';
comment on table public.notification_outbox is
  'Queued pushes, with the rules already applied. Service role only. A dropped row only records that a once-a-day push (reminder, closing nudge) was skipped, so it is not retried.';

-- updated_at triggers
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'contact_labels', 'user_preferences', 'relationships', 'relationship_members',
    'relationship_invites', 'relationship_preferences', 'media', 'prompt_library',
    'user_integrations', 'moments', 'moment_shares', 'discovery_activities', 'discovery_prompts',
    'discovery_responses', 'messages', 'reactions', 'thread_reads', 'export_jobs',
    'push_devices', 'notification_settings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

create trigger set_updated_at before update on private.integration_tokens
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Access functions
--     One function per kind of content. Policies, RPCs and Storage call these,
--     so each rule is written once and tested once.
-- ---------------------------------------------------------------------------

-- The caller's profile id, or null. Deleting accounts keep access during the
-- 14-day grace period so they can cancel.
create function public.app_uid()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
    from public.profiles p
   where p.auth_user_id = auth.uid()
     and p.state in ('active', 'deleting');
$$;

alter table public.moments            alter column author_id    set default public.app_uid();
alter table public.media              alter column owner_id     set default public.app_uid();
alter table public.contact_labels     alter column owner_id     set default public.app_uid();
alter table public.user_preferences   alter column user_id      set default public.app_uid();
alter table public.consent_events     alter column user_id      set default public.app_uid();
alter table public.messages           alter column author_id    set default public.app_uid();
alter table public.reactions          alter column user_id      set default public.app_uid();
alter table public.thread_reads       alter column user_id      set default public.app_uid();
alter table public.monthly_recap_views alter column user_id     set default public.app_uid();
alter table public.export_jobs        alter column requested_by set default public.app_uid();

-- In the pair at all, including after withdrawing.
create function public.in_relationship(p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.relationship_members m
     where m.relationship_id = p_relationship_id
       and m.user_id = public.app_uid());
$$;

-- Can read the pair's shared history: a member who has not withdrawn.
create function public.is_member(p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.relationship_members m
     where m.relationship_id = p_relationship_id
       and m.user_id = public.app_uid()
       and m.withdrawn_at is null);
$$;

-- Can add new activity: a member of an active relationship.
create function public.is_active_member(p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.relationship_members m
      join public.relationships r on r.id = m.relationship_id
     where m.relationship_id = p_relationship_id
       and m.user_id = public.app_uid()
       and m.withdrawn_at is null
       and r.status = 'active');
$$;

-- The caller, or someone they share (or shared) a relationship with.
create function public.is_connected_to(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.app_uid() as id)
  select p_profile_id = (select id from me)
      or exists (
        select 1
          from public.relationship_members mine
          join public.relationship_members theirs
            on theirs.relationship_id = mine.relationship_id
         where mine.user_id = (select id from me)
           and theirs.user_id = p_profile_id);
$$;

-- The other person in a pair.
create function public.other_member(p_relationship_id uuid, p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id from public.relationship_members m
   where m.relationship_id = p_relationship_id and m.user_id <> p_user_id;
$$;

-- Figure 10: the author reads it unless it is in their Trash; anyone else
-- needs an unrevoked share into a pair they have not withdrawn from, and the
-- Moment must be published and not in Trash.
create function public.can_read_moment(p_moment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.app_uid() as id)
  select exists (
    select 1 from public.moments m
     where m.id = p_moment_id
       and m.deleted_at is null
       and (m.author_id = (select id from me)
            or (m.status = 'published'
                and exists (
                  select 1
                    from public.moment_shares s
                    join public.relationship_members rm
                      on rm.relationship_id = s.relationship_id
                   where s.moment_id = m.id
                     and s.revoked_at is null
                     and rm.user_id = (select id from me)
                     and rm.withdrawn_at is null))));
$$;

-- One share, as seen from inside its pair: what threads and saves hang off.
create function public.can_read_share(p_moment_id uuid, p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.moment_shares s
      join public.moments m on m.id = s.moment_id
     where s.moment_id = p_moment_id
       and s.relationship_id = p_relationship_id
       and s.revoked_at is null
       and m.status = 'published'
       and m.deleted_at is null)
     and public.is_member(p_relationship_id);
$$;

create function public.can_read_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.threads t
     where t.id = p_thread_id
       and ((t.moment_id is not null
             and public.can_read_share(t.moment_id, t.relationship_id))
         or (t.discovery_activity_id is not null
             and public.is_member(t.relationship_id)
             and exists (select 1 from public.discovery_activities a
                          where a.id = t.discovery_activity_id
                            and a.revealed_at is not null))));
$$;

-- Before the reveal an answer is visible only to its author, in every query.
create function public.can_read_discovery_response(p_response_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.discovery_responses r
      join public.discovery_activities a on a.id = r.activity_id
     where r.id = p_response_id
       and r.deleted_at is null
       and (r.user_id = public.app_uid()
            or (a.revealed_at is not null
                and r.status = 'submitted'
                and public.is_member(a.relationship_id))));
$$;

-- A file is downloadable only by its owner or by someone who can read an item
-- that uses it.
create function public.can_read_media_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.media md
     where md.storage_path = p_path
       and (md.owner_id = public.app_uid()
            or exists (select 1 from public.moment_media mm
                        where mm.media_id = md.id and public.can_read_moment(mm.moment_id))
            or exists (select 1 from public.discovery_responses r
                        where r.media_id = md.id and public.can_read_discovery_response(r.id))
            or exists (select 1 from public.messages msg
                        where msg.media_id = md.id and msg.deleted_at is null
                          and public.can_read_thread(msg.thread_id))
            or exists (select 1 from public.profiles p
                        where p.avatar_media_id = md.id and public.is_connected_to(p.id))));
$$;

-- Is a media row still used by anything? Purges only remove unused files.
create function public.media_in_use(p_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moment_media where media_id = p_media_id)
      or exists (select 1 from public.discovery_responses where media_id = p_media_id)
      or exists (select 1 from public.messages where media_id = p_media_id)
      or exists (select 1 from public.profiles where avatar_media_id = p_media_id);
$$;

-- ---------------------------------------------------------------------------
-- 11. Triggers
-- ---------------------------------------------------------------------------

-- A new login gets a profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_tz   text;
begin
  v_name := left(btrim(coalesce(
              nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
              nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
              nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
              nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
              'Twig member')), 80);
  v_tz := new.raw_user_meta_data ->> 'timezone';
  if not public.is_valid_timezone(v_tz) then
    v_tz := 'UTC';
  end if;

  insert into public.profiles (auth_user_id, display_name, timezone)
  values (new.id, v_name, v_tz);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- notification_settings: one row per person, created with the profile.
create function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- A chosen avatar must be the person's own ready image.
create function public.profiles_check_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.avatar_media_id is not null
     and new.avatar_media_id is distinct from old.avatar_media_id
     and not exists (select 1 from public.media m
                      where m.id = new.avatar_media_id and m.owner_id = new.id
                        and m.kind = 'image' and m.status = 'ready') then
    raise exception 'avatar must be your own uploaded image' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_check_avatar
  before update of avatar_media_id on public.profiles
  for each row execute function public.profiles_check_avatar();

-- Exactly two members per relationship, checked at commit.
create function public.check_relationship_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel uuid;
begin
  if tg_table_name = 'relationships' then
    v_rel := new.id;
  else
    v_rel := coalesce(new.relationship_id, old.relationship_id);
  end if;

  if exists (select 1 from public.relationships where id = v_rel)
     and (select count(*) from public.relationship_members where relationship_id = v_rel) <> 2 then
    raise exception 'relationship % must have exactly two members', v_rel using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger relationships_have_two_members
  after insert on public.relationships
  deferrable initially deferred
  for each row execute function public.check_relationship_members();

create constraint trigger relationship_members_stay_two
  after insert or delete or update of relationship_id on public.relationship_members
  deferrable initially deferred
  for each row execute function public.check_relationship_members();

-- Media: the path is always {owner_id}/{media_id}; a file is ready only once
-- it is really in Storage.
create function public.media_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.storage_path is null then
      new.storage_path := new.owner_id::text || '/' || new.id::text;
    end if;
  end if;

  if new.status = 'ready' and (tg_op = 'INSERT' or old.status = 'pending') then
    if not exists (select 1 from storage.objects o
                    where o.bucket_id = 'media' and o.name = new.storage_path) then
      raise exception 'upload not found for media %', new.id using errcode = '22023';
    end if;
  end if;

  if new.mime_type is not null and split_part(new.mime_type, '/', 1) <> new.kind then
    raise exception 'mime type % does not match kind %', new.mime_type, new.kind using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger media_before_write
  before insert or update on public.media
  for each row execute function public.media_before_write();

-- Moments: editing a published Moment sets edited_at.
create function public.moments_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'published' and new.status = 'published'
     and (new.body is distinct from old.body
          or new.data is distinct from old.data
          or new.happened_on is distinct from old.happened_on
          or new.happened_precision is distinct from old.happened_precision) then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger moments_before_update
  before update on public.moments
  for each row execute function public.moments_before_update();

-- Messages: edits set edited_at; deleting clears the text and can't be undone.
create function public.messages_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is not null then
    raise exception 'a deleted message cannot be changed' using errcode = '22023';
  end if;
  if new.deleted_at is not null then
    new.body := '';
    new.media_id := null;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger messages_before_update
  before update on public.messages
  for each row execute function public.messages_before_update();

-- Files can be attached only while a Moment is a draft. Locks the Moment so
-- an attach racing a publish waits for it and then sees it is published.
create function public.moment_media_require_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.moments
   where id = new.moment_id and status = 'draft' and deleted_at is null
   for share;
  if not found then
    raise exception 'files can be added only to a draft' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger moment_media_require_draft
  before insert on public.moment_media
  for each row execute function public.moment_media_require_draft();

-- New shared activity needs an active pair. Locks the relationship row, so a
-- share, reply, reaction or save racing a pause or end waits for it and then
-- sees the pair is read-only. Revoking a share is always allowed.
create function public.require_active_relationship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'moment_shares' and tg_op = 'UPDATE' then
    if new.revoked_at is not null or old.revoked_at is null then
      return new;
    end if;
  end if;
  perform 1 from public.relationships
   where id = new.relationship_id and status = 'active'
   for share;
  if not found then
    raise exception 'this relationship is read-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger moment_shares_require_active
  before insert or update of revoked_at on public.moment_shares
  for each row execute function public.require_active_relationship();
create trigger messages_require_active
  before insert on public.messages
  for each row execute function public.require_active_relationship();
create trigger reactions_require_active
  before insert or update on public.reactions
  for each row execute function public.require_active_relationship();
create trigger saved_moments_require_active
  before insert on public.saved_moments
  for each row execute function public.require_active_relationship();

-- ---------------------------------------------------------------------------
-- 12. Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles                 enable row level security;
alter table public.contact_labels           enable row level security;
alter table public.blocks                   enable row level security;
alter table public.user_preferences         enable row level security;
alter table public.relationships            enable row level security;
alter table public.relationship_members     enable row level security;
alter table public.relationship_invites     enable row level security;
alter table public.relationship_preferences enable row level security;
alter table public.consent_events           enable row level security;
alter table public.media                    enable row level security;
alter table public.prompt_library           enable row level security;
alter table public.moments                  enable row level security;
alter table public.moment_media             enable row level security;
alter table public.moment_shares            enable row level security;
alter table public.discovery_activities     enable row level security;
alter table public.discovery_prompts        enable row level security;
alter table public.discovery_responses      enable row level security;
alter table public.threads                  enable row level security;
alter table public.messages                 enable row level security;
alter table public.reactions                enable row level security;
alter table public.thread_reads             enable row level security;
alter table public.saved_moments            enable row level security;
alter table public.monthly_recap_views      enable row level security;
alter table public.user_integrations        enable row level security;
alter table public.integration_auto_share   enable row level security;
alter table public.export_jobs              enable row level security;
alter table public.storage_deletions        enable row level security;  -- no policies: service only
alter table public.push_devices             enable row level security;
alter table public.notification_settings    enable row level security;
alter table public.notification_outbox      enable row level security;  -- no policies: service only
alter table private.integration_tokens      enable row level security;  -- no policies: service only

-- People
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_connected_to(id));
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select public.app_uid()))
  with check (id = (select public.app_uid()));

create policy contact_labels_own on public.contact_labels
  for all to authenticated
  using (owner_id = (select public.app_uid()))
  with check (owner_id = (select public.app_uid()) and public.is_connected_to(contact_id));

create policy blocks_select on public.blocks
  for select to authenticated using (blocker_id = (select public.app_uid()));
create policy blocks_delete on public.blocks
  for delete to authenticated using (blocker_id = (select public.app_uid()));

create policy user_preferences_own on public.user_preferences
  for all to authenticated
  using (user_id = (select public.app_uid()))
  with check (user_id = (select public.app_uid()));

-- Pairs
create policy relationships_select on public.relationships
  for select to authenticated using (public.in_relationship(id));

create policy relationship_members_select on public.relationship_members
  for select to authenticated using (public.in_relationship(relationship_id));

create policy relationship_invites_select on public.relationship_invites
  for select to authenticated using (created_by = (select public.app_uid()));

create policy relationship_preferences_own on public.relationship_preferences
  for all to authenticated
  using (user_id = (select public.app_uid()) and public.in_relationship(relationship_id))
  with check (user_id = (select public.app_uid()) and public.in_relationship(relationship_id));

create policy consent_events_select on public.consent_events
  for select to authenticated using (user_id = (select public.app_uid()));
create policy consent_events_insert on public.consent_events
  for insert to authenticated
  with check (user_id = (select public.app_uid()) and public.in_relationship(relationship_id));

-- Content
create policy media_select on public.media
  for select to authenticated
  using (owner_id = (select public.app_uid()) or public.can_read_media_path(storage_path));
create policy media_insert on public.media
  for insert to authenticated
  with check (owner_id = (select public.app_uid()) and status = 'pending');
create policy media_update on public.media
  for update to authenticated
  using (owner_id = (select public.app_uid()) and status = 'pending')
  with check (owner_id = (select public.app_uid()));

create policy prompt_library_select on public.prompt_library
  for select to authenticated using (active);

-- The author check comes first so a just-inserted row is readable in RETURNING.
create policy moments_select on public.moments
  for select to authenticated
  using ((author_id = (select public.app_uid()) and deleted_at is null)
         or public.can_read_moment(id));
create policy moments_insert on public.moments
  for insert to authenticated
  with check (author_id = (select public.app_uid())
              and kind = 'post' and status = 'draft' and source = 'manual');
create policy moments_update on public.moments
  for update to authenticated
  using (author_id = (select public.app_uid()) and deleted_at is null and status <> 'dismissed')
  with check (author_id = (select public.app_uid()));

create policy moment_media_select on public.moment_media
  for select to authenticated using (public.can_read_moment(moment_id));
create policy moment_media_insert on public.moment_media
  for insert to authenticated
  with check (
    exists (select 1 from public.moments m
             where m.id = moment_id and m.author_id = (select public.app_uid())
               and m.status = 'draft' and m.deleted_at is null)
    and exists (select 1 from public.media md
                 where md.id = media_id and md.owner_id = (select public.app_uid())));
create policy moment_media_delete on public.moment_media
  for delete to authenticated
  using (exists (select 1 from public.moments m
                  where m.id = moment_id and m.author_id = (select public.app_uid())
                    and m.status = 'draft'));

-- Authors see all their own grants (including revoked ones, for the share
-- screen); everyone else sees only live grants into their own pairs.
create policy moment_shares_select on public.moment_shares
  for select to authenticated
  using (public.can_read_share(moment_id, relationship_id)
         or (public.in_relationship(relationship_id)
             and exists (select 1 from public.moments m
                          where m.id = moment_id and m.author_id = (select public.app_uid()))));

-- Discover
create policy discovery_activities_select on public.discovery_activities
  for select to authenticated using (public.in_relationship(relationship_id));

create policy discovery_prompts_select on public.discovery_prompts
  for select to authenticated
  using (user_id = (select public.app_uid())
         or (public.is_member(relationship_id)
             and exists (select 1 from public.discovery_activities a
                          where a.id = activity_id and a.revealed_at is not null)));

create policy discovery_responses_select on public.discovery_responses
  for select to authenticated using (public.can_read_discovery_response(id));

-- Conversations
create policy threads_select on public.threads
  for select to authenticated using (public.can_read_thread(id));

create policy messages_select on public.messages
  for select to authenticated using (public.can_read_thread(thread_id));
create policy messages_insert on public.messages
  for insert to authenticated
  with check (author_id = (select public.app_uid())
              and public.is_active_member(relationship_id)
              and public.can_read_thread(thread_id));
create policy messages_update on public.messages
  for update to authenticated
  using (author_id = (select public.app_uid())
         and deleted_at is null
         and public.is_active_member(relationship_id))
  with check (author_id = (select public.app_uid()));

create policy reactions_select on public.reactions
  for select to authenticated using (public.can_read_thread(thread_id));
create policy reactions_own on public.reactions
  for all to authenticated
  using (user_id = (select public.app_uid()) and public.is_active_member(relationship_id))
  with check (user_id = (select public.app_uid())
              and public.is_active_member(relationship_id)
              and public.can_read_thread(thread_id));

create policy thread_reads_own on public.thread_reads
  for all to authenticated
  using (user_id = (select public.app_uid()))
  with check (user_id = (select public.app_uid()) and public.can_read_thread(thread_id));

-- Archive
create policy saved_moments_select on public.saved_moments
  for select to authenticated using (public.can_read_share(moment_id, relationship_id));

create policy monthly_recap_views_own on public.monthly_recap_views
  for all to authenticated
  using (user_id = (select public.app_uid()))
  with check (user_id = (select public.app_uid()) and public.in_relationship(relationship_id));

-- Connectors and exports
create policy user_integrations_select on public.user_integrations
  for select to authenticated using (user_id = (select public.app_uid()));

create policy integration_auto_share_select on public.integration_auto_share
  for select to authenticated
  using (exists (select 1 from public.user_integrations i
                  where i.id = integration_id and i.user_id = (select public.app_uid())));

create policy export_jobs_select on public.export_jobs
  for select to authenticated using (requested_by = (select public.app_uid()));
create policy export_jobs_insert on public.export_jobs
  for insert to authenticated
  with check (requested_by = (select public.app_uid())
              and (relationship_id is null or public.is_member(relationship_id)));

-- Notifications
create policy push_devices_select on public.push_devices
  for select to authenticated using (user_id = (select public.app_uid()));

create policy notification_settings_select on public.notification_settings
  for select to authenticated using (user_id = (select public.app_uid()));
create policy notification_settings_update on public.notification_settings
  for update to authenticated
  using (user_id = (select public.app_uid()))
  with check (user_id = (select public.app_uid()));

-- ---------------------------------------------------------------------------
-- 13. Table privileges
--     RLS decides which rows; these grants decide which columns the app may
--     write at all. Grant tables have no write grants.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all tables in schema private from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
revoke select on public.notification_outbox, public.storage_deletions from authenticated;

grant update (display_name, avatar_media_id, timezone, locale) on public.profiles to authenticated;
grant insert (owner_id, contact_id, label), update (label), delete
  on public.contact_labels to authenticated;
grant delete on public.blocks to authenticated;
grant insert (user_id, life_stage, interests, question_depth, avoid_topics, completed_at),
      update (life_stage, interests, question_depth, avoid_topics, completed_at)
  on public.user_preferences to authenticated;
grant update (connection_goals, curiosity_topics, checkin_audience, notifications_muted, completed_at)
  on public.relationship_preferences to authenticated;
grant insert (user_id, relationship_id, purpose, granted) on public.consent_events to authenticated;
grant insert (id, owner_id, kind, mime_type),
      update (mime_type, bytes, width, height, duration_ms, blurhash, waveform, status)
  on public.media to authenticated;
grant insert (id, author_id, kind, body, data, happened_on, happened_precision, surface),
      update (body, data, happened_on, happened_precision, surface)
  on public.moments to authenticated;
grant insert (moment_id, media_id, position), delete on public.moment_media to authenticated;
grant insert (id, thread_id, relationship_id, author_id, body), update (body, deleted_at)
  on public.messages to authenticated;
grant insert (thread_id, relationship_id, user_id, reaction), update (reaction), delete
  on public.reactions to authenticated;
grant insert (thread_id, relationship_id, user_id, last_read_at), update (last_read_at)
  on public.thread_reads to authenticated;
grant insert (relationship_id, user_id, recap_month) on public.monthly_recap_views to authenticated;
grant insert (requested_by, scope, relationship_id) on public.export_jobs to authenticated;
grant update (posts_replies, discover, connections, reminder_enabled, reminder_time,
              quiet_enabled, quiet_start, quiet_end)
  on public.notification_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 14. Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', false, 52428800,
   array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp',
         'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/wav',
         'video/mp4', 'video/quicktime']),
  ('exports', 'exports', false, null, array['application/zip'])
on conflict (id) do nothing;

-- Upload only to a path the caller registered in media first.
create policy twig_media_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media'
              and exists (select 1 from public.media m
                           where m.storage_path = objects.name
                             and m.owner_id = (select public.app_uid())
                             and m.status = 'pending'));

-- Download only what the caller can read.
create policy twig_media_read on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.can_read_media_path(objects.name));

-- ---------------------------------------------------------------------------
-- 15. Notifications
--     Rules are applied when an event is queued (Architecture section 13);
--     the push-dispatch Edge Function only claims, groups and sends.
-- ---------------------------------------------------------------------------

create function public.enqueue_notification(
  p_recipient_id    uuid,
  p_actor_id        uuid,
  p_relationship_id uuid,
  p_category        text,
  p_event           text,
  p_subject_id      uuid,
  p_dedupe_key      text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  s          public.notification_settings;
  v_state    text;
  v_tz       text;
  v_local    timestamp;
  v_t        time;
  v_deliver  timestamptz := now();
  v_follow   boolean := false;
  v_queued   timestamptz;
  v_sent     timestamptz;
  v_id       bigint;
begin
  if p_recipient_id is null or p_recipient_id = p_actor_id then
    return null;
  end if;

  select p.state, p.timezone into v_state, v_tz
    from public.profiles p where p.id = p_recipient_id;
  if v_state is null or v_state not in ('active', 'deleting') then
    return null;
  end if;

  select * into s from public.notification_settings where user_id = p_recipient_id;
  if not found then
    return null;
  end if;

  -- 1. The type is switched on, the pair is not muted, the recipient is still in it.
  if (p_category = 'posts_replies' and not s.posts_replies)
     or (p_category = 'discover' and not s.discover)
     or (p_category = 'connections' and not s.connections)
     or (p_category = 'reminder' and not s.reminder_enabled) then
    return null;
  end if;

  if p_relationship_id is not null then
    if not exists (
      select 1
        from public.relationship_members m
        join public.relationships r on r.id = m.relationship_id
       where m.relationship_id = p_relationship_id
         and m.user_id = p_recipient_id
         and m.withdrawn_at is null
         and (r.status = 'active' or p_category = 'connections')) then
      return null;
    end if;
    if exists (select 1 from public.relationship_preferences rp
                where rp.relationship_id = p_relationship_id
                  and rp.user_id = p_recipient_id
                  and rp.notifications_muted) then
      return null;
    end if;
  end if;

  -- 2. Quiet hours: hold until they end; reminders and closing nudges are dropped.
  if s.quiet_enabled and s.quiet_start <> s.quiet_end then
    v_local := now() at time zone v_tz;
    v_t := v_local::time;
    if (s.quiet_start < s.quiet_end and v_t >= s.quiet_start and v_t < s.quiet_end)
       or (s.quiet_start > s.quiet_end and (v_t >= s.quiet_start or v_t < s.quiet_end)) then
      if p_event in ('checkin_reminder', 'discover_closing') then
        -- Dropped, and remembered as dropped so the job doesn't retry it later.
        if p_dedupe_key is not null then
          insert into public.notification_outbox
            (recipient_id, actor_id, relationship_id, category, event, subject_id, dedupe_key, status)
          values
            (p_recipient_id, p_actor_id, p_relationship_id, p_category, p_event, p_subject_id,
             p_dedupe_key, 'dropped')
          on conflict (dedupe_key) do nothing;
        end if;
        return null;
      end if;
      v_deliver := ((case when v_t < s.quiet_end then v_local::date else v_local::date + 1 end)
                    + s.quiet_end) at time zone v_tz;
    end if;
  end if;

  -- 3. Grouping per recipient, sender and type. An event that joins a push not
  --    yet sent rides along with it; one within 10 minutes of a sent push is
  --    held and sent as one follow-up.
  if p_actor_id is not null then
    select max(o.deliver_after) into v_queued
      from public.notification_outbox o
     where o.recipient_id = p_recipient_id and o.actor_id = p_actor_id
       and o.category = p_category and o.status = 'queued';

    if v_queued is not null then
      v_deliver := greatest(v_deliver, v_queued);
      v_follow := exists (
        select 1 from public.notification_outbox o
         where o.recipient_id = p_recipient_id and o.actor_id = p_actor_id
           and o.category = p_category and o.status = 'queued' and o.is_follow_up);
    else
      select max(o.sent_at) into v_sent
        from public.notification_outbox o
       where o.recipient_id = p_recipient_id and o.actor_id = p_actor_id
         and o.category = p_category and o.status = 'sent'
         and o.sent_at > now() - interval '10 minutes';
      if v_sent is not null then
        v_follow := true;
        v_deliver := greatest(v_deliver, v_sent + interval '10 minutes');
      end if;
    end if;
  end if;

  insert into public.notification_outbox
    (recipient_id, actor_id, relationship_id, category, event, subject_id,
     dedupe_key, is_follow_up, deliver_after)
  values
    (p_recipient_id, p_actor_id, p_relationship_id, p_category, p_event, p_subject_id,
     p_dedupe_key, v_follow, v_deliver)
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

-- push-dispatch: claim due rows, merged per recipient, sender and type
-- (pushes with no sender, such as "this week's activity", per pair and event).
-- Returns what the recipient calls the sender and the phones to send to; the
-- function builds "Mom shared 2 more Moments" from event, count and label.
create function public.claim_notifications(p_limit integer default 500)
returns table (
  recipient_id    uuid,
  actor_id        uuid,
  relationship_id uuid,
  category        text,
  event           text,
  subject_id      uuid,
  item_count      integer,
  is_follow_up    boolean,
  sender_label    text,
  expo_tokens     text[]
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select o.id
      from public.notification_outbox o
     where o.status = 'queued' and o.deliver_after <= now()
     order by o.deliver_after, o.id
     limit p_limit
     for update skip locked
  ), claimed as (
    update public.notification_outbox o
       set status = 'sent', sent_at = now()
      from due
     where o.id = due.id
    returning o.*
  ), grouped as (
    select c.recipient_id, c.actor_id, c.category,
           (array_agg(c.relationship_id order by c.id desc))[1] as relationship_id,
           (array_agg(c.event order by c.id desc))[1] as event,
           (array_agg(c.subject_id order by c.id desc))[1] as subject_id,
           count(*)::integer as item_count,
           bool_and(c.is_follow_up) as is_follow_up
      from claimed c
     group by c.recipient_id, c.actor_id, c.category,
              case when c.actor_id is null then c.relationship_id end,
              case when c.actor_id is null then c.event end
  )
  select g.recipient_id, g.actor_id, g.relationship_id, g.category, g.event, g.subject_id,
         g.item_count, g.is_follow_up,
         coalesce(cl.label, ap.display_name),
         coalesce((select array_agg(d.expo_token order by d.last_seen_at desc)
                     from public.push_devices d
                    where d.user_id = g.recipient_id and d.disabled_at is null), '{}')
    from grouped g
    left join public.contact_labels cl
      on cl.owner_id = g.recipient_id and cl.contact_id = g.actor_id
    left join public.profiles ap on ap.id = g.actor_id;
end;
$$;

-- Tokens Expo reports as DeviceNotRegistered are switched off.
create function public.disable_push_tokens(p_tokens text[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (
    update public.push_devices set disabled_at = now()
     where expo_token = any (p_tokens) and disabled_at is null
    returning 1)
  select count(*)::integer from d;
$$;

-- A token moves to whoever signed in on that phone last.
create function public.register_push_device(p_expo_token text, p_platform text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.app_uid();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.push_devices (user_id, expo_token, platform, last_seen_at, disabled_at)
  values (v_me, p_expo_token, p_platform, now(), null)
  on conflict (expo_token) do update
     set user_id = excluded.user_id, platform = excluded.platform,
         last_seen_at = now(), disabled_at = null
  returning id into v_id;
  return v_id;
end;
$$;

create function public.unregister_push_device(p_expo_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_devices
   where expo_token = p_expo_token and user_id = public.app_uid();
$$;

-- Push on new messages and reactions (Posts & replies).
create function public.notify_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  if tg_table_name = 'messages' then
    v_actor := new.author_id;
  else
    v_actor := new.user_id;
  end if;
  perform public.enqueue_notification(
    public.other_member(new.relationship_id, v_actor), v_actor, new.relationship_id,
    'posts_replies', case tg_table_name when 'messages' then 'message' else 'reaction' end,
    new.thread_id);
  return null;
end;
$$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_thread_activity();

create trigger reactions_notify
  after insert or update of reaction on public.reactions
  for each row execute function public.notify_thread_activity();

-- ---------------------------------------------------------------------------
-- 16. Invites
-- ---------------------------------------------------------------------------

-- Wrong codes and links, per person, for the guess limit in accept_invite.
-- Private: only functions read or write it.
create table private.invite_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index invite_attempts_user_idx on private.invite_attempts (user_id, attempted_at desc);
alter table private.invite_attempts enable row level security;

-- HMAC of an invite secret with a key kept in Supabase Vault.
create function public.invite_hash(p_secret text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  select ds.decrypted_secret into v_key
    from vault.decrypted_secrets ds
   where ds.name = 'invite_hmac_key'
   limit 1;
  if v_key is null then
    raise exception 'invite_hmac_key is missing from Vault' using errcode = '55000';
  end if;
  return encode(extensions.hmac(p_secret, v_key, 'sha256'), 'hex');
end;
$$;

-- Make an invite. Returns the link token and the 8-character code once; only
-- their HMACs are stored.
create function public.create_invite(p_inviter_role text, p_invitee_label text)
returns table (invite_id uuid, token text, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_me       uuid := public.app_uid();
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes    bytea;
  v_token    text;
  v_code     text;
  v_id       uuid;
  v_expires  timestamptz;
  v_try      integer := 0;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_inviter_role not in ('parent', 'child') then
    raise exception 'inviter role must be parent or child' using errcode = '22023';
  end if;
  if (select count(*) from public.relationship_invites i
       where i.created_by = v_me and i.accepted_at is null
         and i.revoked_at is null and i.expires_at > now()) >= 10 then
    raise exception 'too many open invites' using errcode = '54000';
  end if;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  loop
    v_try := v_try + 1;
    v_bytes := extensions.gen_random_bytes(8);
    select string_agg(substr(v_alphabet, get_byte(v_bytes, i) % 32 + 1, 1), '' order by i)
      into v_code
      from generate_series(0, 7) as i;
    begin
      insert into public.relationship_invites
        (created_by, inviter_role, invitee_label, token_hash, code_hash)
      values
        (v_me, p_inviter_role, btrim(p_invitee_label),
         public.invite_hash(v_token), public.invite_hash(v_code))
      returning id, expires_at into v_id, v_expires;
      exit;
    exception when unique_violation then
      if v_try >= 5 then
        raise;
      end if;
    end;
  end loop;

  return query select v_id, v_token, v_code, v_expires;
end;
$$;

create function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.relationship_invites
     set revoked_at = now()
   where id = p_invite_id and created_by = public.app_uid()
     and accepted_at is null and revoked_at is null;
  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Accept by link token or code. Locks the invite row so it can't be accepted
-- twice; checks blocks and existing pairs; starts the first Discover week.
-- A wrong code or link returns null instead of raising, so the guess is
-- recorded; after 10 wrong guesses in an hour the person must wait. This
-- holds even when the app calls the function directly, not only through the
-- invite-accept Edge Function.
create function public.accept_invite(p_secret text, p_label text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me      uuid := public.app_uid();
  v_norm    text;
  v_inv     public.relationship_invites;
  v_inviter public.profiles;
  v_rel     uuid;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if (select count(*) from private.invite_attempts a
       where a.user_id = v_me and a.attempted_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many wrong codes; try again in an hour' using errcode = '54000';
  end if;

  v_norm := regexp_replace(coalesce(p_secret, ''), '[^A-Za-z0-9]', '', 'g');
  if length(v_norm) = 8 then
    -- Codes are unique among open invites; prefer the open one, else the latest.
    select * into v_inv from public.relationship_invites
     where code_hash = public.invite_hash(upper(v_norm))
     order by (accepted_at is null and revoked_at is null) desc, created_at desc
     limit 1
     for update;
  else
    select * into v_inv from public.relationship_invites
     where token_hash = public.invite_hash(lower(v_norm))
     for update;
  end if;

  if not found then
    insert into private.invite_attempts (user_id) values (v_me);
    return null;  -- no such invite
  end if;
  if v_inv.accepted_by = v_me then
    return v_inv.relationship_id;  -- already accepted by this person
  end if;
  if v_inv.created_by = v_me then
    raise exception 'you cannot accept your own invite' using errcode = '22023';
  end if;

  select * into v_inviter from public.profiles where id = v_inv.created_by;
  if v_inv.accepted_at is not null or v_inv.revoked_at is not null
     or v_inv.expires_at <= now() or v_inviter.state <> 'active'
     or exists (select 1 from public.blocks b
                 where (b.blocker_id = v_me and b.blocked_id = v_inv.created_by)
                    or (b.blocker_id = v_inv.created_by and b.blocked_id = v_me)) then
    raise exception 'this invite is no longer valid' using errcode = '22023';
  end if;

  if exists (select 1 from public.relationships r
              where r.pair_key = public.pair_key(v_me, v_inv.created_by)
                and r.status in ('active', 'paused')) then
    raise exception 'you are already connected; reconnect instead' using errcode = '23505';
  end if;

  begin
    insert into public.relationships
      (pair_key, status, timezone, activated_at, status_changed_at, status_changed_by)
    values
      (public.pair_key(v_me, v_inv.created_by), 'active', v_inviter.timezone, now(), now(), v_me)
    returning id into v_rel;
  exception when unique_violation then
    raise exception 'you are already connected; reconnect instead' using errcode = '23505';
  end;

  insert into public.relationship_members (relationship_id, user_id, role)
  values (v_rel, v_inv.created_by, v_inv.inviter_role),
         (v_rel, v_me, case v_inv.inviter_role when 'parent' then 'child' else 'parent' end);

  insert into public.relationship_preferences (relationship_id, user_id)
  values (v_rel, v_inv.created_by), (v_rel, v_me);

  insert into public.contact_labels (owner_id, contact_id, label)
  values (v_inv.created_by, v_me, v_inv.invitee_label)
  on conflict (owner_id, contact_id) do update set label = excluded.label;

  if nullif(btrim(p_label), '') is not null then
    insert into public.contact_labels (owner_id, contact_id, label)
    values (v_me, v_inv.created_by, btrim(p_label))
    on conflict (owner_id, contact_id) do update set label = excluded.label;
  end if;

  update public.relationship_invites
     set accepted_by = v_me, accepted_at = now(), relationship_id = v_rel
   where id = v_inv.id;

  perform public.start_discovery_week(v_rel);
  perform public.enqueue_notification(v_inv.created_by, v_me, v_rel,
                                      'connections', 'invite_accepted', v_rel);
  return v_rel;
end;
$$;

-- ---------------------------------------------------------------------------
-- 17. Relationship lifecycle (Architecture section 11, Figure 8)
-- ---------------------------------------------------------------------------

create function public.pause_relationship(p_relationship_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.app_uid();
begin
  perform 1 from public.relationships where id = p_relationship_id for update;
  if not public.is_active_member(p_relationship_id) then
    raise exception 'only an active relationship can be paused' using errcode = '22023';
  end if;
  update public.relationships
     set status = 'paused', status_changed_at = now(), status_changed_by = v_me,
         reconnect_requested_by = null
   where id = p_relationship_id;
  delete from public.notification_outbox
   where relationship_id = p_relationship_id and status = 'queued' and category <> 'connections';
end;
$$;

-- End with history kept, or end and withdraw, optionally blocking. Also takes
-- an ended pair from "history kept" to "withdrawn". Never pushes.
create function public.end_relationship(
  p_relationship_id uuid,
  p_withdraw        boolean default false,
  p_block           boolean default false
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me  uuid := public.app_uid();
  v_rel public.relationships;
begin
  select * into v_rel from public.relationships where id = p_relationship_id for update;
  if not found or not public.in_relationship(p_relationship_id) then
    raise exception 'relationship not found' using errcode = 'P0002';
  end if;

  if v_rel.status in ('active', 'paused') then
    update public.relationships
       set status = 'ended',
           ended_mode = case when p_withdraw then 'withdrawn' else 'kept_history' end,
           status_changed_at = now(), status_changed_by = v_me, reconnect_requested_by = null
     where id = p_relationship_id;
  elsif p_withdraw and v_rel.ended_mode = 'kept_history' then
    update public.relationships
       set ended_mode = 'withdrawn', status_changed_at = now(), status_changed_by = v_me,
           reconnect_requested_by = null
     where id = p_relationship_id;
  end if;

  if p_withdraw then
    update public.relationship_members
       set withdrawn_at = coalesce(withdrawn_at, now())
     where relationship_id = p_relationship_id and user_id = v_me;
  end if;

  if p_block then
    insert into public.blocks (blocker_id, blocked_id)
    values (v_me, public.other_member(p_relationship_id, v_me))
    on conflict do nothing;
  end if;

  delete from public.notification_outbox
   where relationship_id = p_relationship_id and status = 'queued';

  return 'ended';
end;
$$;

-- Reconnect (paused), reopen (ended, history kept) or rejoin (ended, one
-- person withdrew). The first call asks; the other person's call with
-- p_accept = true confirms, and false declines. The asker can cancel with
-- p_accept = false. Only the one who withdrew can ask to rejoin, and a block
-- in either direction stops all three.
create function public.reconnect_relationship(p_relationship_id uuid, p_accept boolean default true)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me     uuid := public.app_uid();
  v_rel    public.relationships;
  v_mine   public.relationship_members;
  v_other  uuid;
begin
  select * into v_rel from public.relationships where id = p_relationship_id for update;
  select * into v_mine from public.relationship_members
   where relationship_id = p_relationship_id and user_id = v_me;
  if v_rel.id is null or v_mine.user_id is null then
    raise exception 'relationship not found' using errcode = 'P0002';
  end if;
  v_other := public.other_member(p_relationship_id, v_me);

  if v_rel.status = 'active' then
    raise exception 'this relationship is already active' using errcode = '22023';
  end if;
  if exists (select 1 from public.blocks b
              where (b.blocker_id = v_me and b.blocked_id = v_other)
                 or (b.blocker_id = v_other and b.blocked_id = v_me)) then
    raise exception 'this relationship cannot be reopened' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles p
              where p.id = v_other and p.state <> 'active') then
    raise exception 'this relationship cannot be reopened' using errcode = '42501';
  end if;

  -- Asking (or cancelling one's own request).
  if v_rel.reconnect_requested_by is null or v_rel.reconnect_requested_by = v_me then
    if not p_accept then
      update public.relationships set reconnect_requested_by = null where id = p_relationship_id;
      return 'cancelled';
    end if;
    if v_rel.status = 'ended' and v_rel.ended_mode = 'withdrawn' and v_mine.withdrawn_at is null then
      raise exception 'only the person who left can ask to rejoin' using errcode = '42501';
    end if;
    if v_rel.status = 'ended' and exists (
         select 1 from public.relationships r
          where r.pair_key = v_rel.pair_key and r.status in ('active', 'paused')) then
      raise exception 'you are already connected in another relationship' using errcode = '23505';
    end if;
    if v_rel.reconnect_requested_by = v_me then
      return 'requested';
    end if;
    update public.relationships set reconnect_requested_by = v_me where id = p_relationship_id;
    perform public.enqueue_notification(v_other, v_me, p_relationship_id,
                                        'connections', 'reconnect_requested', p_relationship_id);
    return 'requested';
  end if;

  -- Answering the other person's request.
  if not p_accept then
    update public.relationships set reconnect_requested_by = null where id = p_relationship_id;
    return 'declined';
  end if;

  begin
    update public.relationships
       set status = 'active', ended_mode = null, activated_at = now(),
           status_changed_at = now(), status_changed_by = v_me, reconnect_requested_by = null
     where id = p_relationship_id;
  exception when unique_violation then
    raise exception 'you are already connected in another relationship' using errcode = '23505';
  end;
  update public.relationship_members set withdrawn_at = null
   where relationship_id = p_relationship_id;

  perform public.start_discovery_week(p_relationship_id);
  return 'active';
end;
$$;

-- The relationship's timezone starts as the inviter's; either member can change it.
create function public.set_relationship_timezone(p_relationship_id uuid, p_timezone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_member(p_relationship_id) then
    raise exception 'relationship not found' using errcode = 'P0002';
  end if;
  if not public.is_valid_timezone(p_timezone) then
    raise exception 'unknown timezone %', p_timezone using errcode = '22023';
  end if;
  update public.relationships set timezone = p_timezone where id = p_relationship_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 18. Moments and sharing (Architecture sections 3 and 6, Figure 3)
-- ---------------------------------------------------------------------------

-- Internal: grant one pair a Moment (or restore a revoked grant), open its
-- conversation and tell the other person. The caller holds the Moment lock.
create function public.add_share(p_moment_id uuid, p_author_id uuid, p_relationship_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revoked timestamptz;
begin
  select s.revoked_at into v_revoked
    from public.moment_shares s
   where s.moment_id = p_moment_id and s.relationship_id = p_relationship_id
   for update;

  if not found then
    insert into public.moment_shares (moment_id, relationship_id)
    values (p_moment_id, p_relationship_id);
    perform public.enqueue_notification(
      public.other_member(p_relationship_id, p_author_id), p_author_id, p_relationship_id,
      'posts_replies', 'moment_shared', p_moment_id);
  elsif v_revoked is not null then
    -- Sharing again restores the item and its conversation; no new push.
    update public.moment_shares set revoked_at = null
     where moment_id = p_moment_id and relationship_id = p_relationship_id;
  end if;

  insert into public.threads (relationship_id, moment_id)
  values (p_relationship_id, p_moment_id)
  on conflict (relationship_id, moment_id) do nothing;
end;
$$;

-- Publish a draft into the chosen pairs in one transaction: check the author,
-- that files are ready and each pair is active; mark it published; add one
-- grant and one conversation per pair. On a published Moment it adds pairs or
-- restores revoked grants. An empty list publishes privately (a private
-- check-in answer is a Moment with no shares).
create function public.publish_moment(p_moment_id uuid, p_relationship_ids uuid[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me       uuid := public.app_uid();
  v_m        public.moments;
  v_targets  uuid[] := array(select distinct x from unnest(coalesce(p_relationship_ids, '{}')) x);
  v_rel      uuid;
  v_images   integer;
  v_audio    integer;
  v_video    integer;
  v_was_draft boolean;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select * into v_m from public.moments where id = p_moment_id for update;
  if not found or v_m.author_id <> v_me or v_m.deleted_at is not null or v_m.status = 'dismissed' then
    raise exception 'moment not found' using errcode = 'P0002';
  end if;
  if v_m.status = 'draft' and v_m.suggestion_expires_at is not null
     and v_m.suggestion_expires_at <= now() then
    raise exception 'this suggestion has expired' using errcode = '22023';
  end if;

  foreach v_rel in array v_targets loop
    if not public.is_active_member(v_rel) then
      raise exception 'you can only share into an active relationship you are in' using errcode = '42501';
    end if;
  end loop;

  v_was_draft := v_m.status = 'draft';
  if v_was_draft then
    if exists (select 1 from public.moment_media mm
                 join public.media md on md.id = mm.media_id
                where mm.moment_id = v_m.id
                  and (md.status <> 'ready' or md.owner_id <> v_me)) then
      raise exception 'files are still uploading' using errcode = '22023';
    end if;

    select count(*) filter (where md.kind = 'image'),
           count(*) filter (where md.kind = 'audio'),
           count(*) filter (where md.kind = 'video')
      into v_images, v_audio, v_video
      from public.moment_media mm
      join public.media md on md.id = mm.media_id
     where mm.moment_id = v_m.id;

    if v_images > 5 or v_audio > 1 or v_video > 0 then
      raise exception 'a Moment holds up to 5 photos and one voice note' using errcode = '22023';
    end if;
    if nullif(btrim(v_m.body), '') is null and v_images + v_audio = 0 and v_m.data = '{}'::jsonb then
      raise exception 'a Moment needs a note, a photo or a voice note' using errcode = '22023';
    end if;

    update public.moments
       set status = 'published', published_at = now(), suggestion_expires_at = null
     where id = v_m.id;
  end if;

  foreach v_rel in array v_targets loop
    perform public.add_share(v_m.id, v_me, v_rel);
  end loop;

  -- Check-in audience: remember this choice per pair for next time.
  if v_was_draft and v_m.kind = 'checkin' then
    update public.relationship_preferences rp
       set checkin_audience = case when rp.relationship_id = any (v_targets) then 'shared' else 'only_me' end
     where rp.user_id = v_me
       and exists (select 1 from public.relationships r
                    where r.id = rp.relationship_id and r.status = 'active');
  end if;

  return v_m.id;
end;
$$;

-- Unsharing revokes one pair's grant. Its conversation is hidden, not deleted.
create function public.unshare_moment(p_moment_id uuid, p_relationship_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.moments
                  where id = p_moment_id and author_id = public.app_uid()) then
    raise exception 'moment not found' using errcode = 'P0002';
  end if;
  update public.moment_shares set revoked_at = now()
   where moment_id = p_moment_id and relationship_id = p_relationship_id and revoked_at is null;
  delete from public.notification_outbox
   where subject_id = p_moment_id and relationship_id = p_relationship_id and status = 'queued';
end;
$$;

create function public.trash_moment(p_moment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.moments set deleted_at = now()
   where id = p_moment_id and author_id = public.app_uid() and deleted_at is null;
  if not found then
    raise exception 'moment not found' using errcode = 'P0002';
  end if;
  delete from public.notification_outbox where subject_id = p_moment_id and status = 'queued';
end;
$$;

create function public.restore_moment(p_moment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.moments set deleted_at = null
   where id = p_moment_id and author_id = public.app_uid()
     and deleted_at > now() - interval '30 days';
  if not found then
    raise exception 'this item is no longer in Trash' using errcode = 'P0002';
  end if;
end;
$$;

-- Dismiss a connector suggestion (review mode) without sharing it.
create function public.dismiss_suggestion(p_moment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.moments set status = 'dismissed', suggestion_expires_at = null
   where id = p_moment_id and author_id = public.app_uid()
     and status = 'draft' and source <> 'manual';
  if not found then
    raise exception 'suggestion not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Saves are per person and point at the share.
create function public.save_moment(p_moment_id uuid, p_relationship_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_read_share(p_moment_id, p_relationship_id)
     or not public.is_active_member(p_relationship_id) then
    raise exception 'moment not found' using errcode = 'P0002';
  end if;
  insert into public.saved_moments (moment_id, relationship_id, saved_by)
  values (p_moment_id, p_relationship_id, public.app_uid())
  on conflict do nothing;
end;
$$;

create function public.unsave_moment(p_moment_id uuid, p_relationship_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.saved_moments
   where moment_id = p_moment_id and relationship_id = p_relationship_id
     and saved_by = public.app_uid();
$$;

-- ---------------------------------------------------------------------------
-- 19. Daily check-ins
-- ---------------------------------------------------------------------------

-- Today's questions: the mood question plus one or two rotating ones, picked
-- by person and date, so a refresh never changes them.
create function public.checkin_prompts(p_date date default null)
returns setof public.prompt_library
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me     uuid := public.app_uid();
  v_prof   public.profiles;
  v_date   date;
  v_depth  smallint;
  v_avoid  text[];
  v_roles  text[];
  v_locale text;
  v_seed   text;
  v_extra  integer;
begin
  select * into v_prof from public.profiles where id = v_me;
  if not found then
    return;
  end if;
  v_date := coalesce(p_date, (now() at time zone v_prof.timezone)::date);
  select coalesce(up.question_depth, 2), coalesce(up.avoid_topics, '{}')
    into v_depth, v_avoid
    from (select 1) one
    left join public.user_preferences up on up.user_id = v_me;
  v_roles := array(select distinct m.role from public.relationship_members m
                    where m.user_id = v_me and m.withdrawn_at is null);
  v_locale := case when exists (select 1 from public.prompt_library p
                                 where p.surface = 'daily' and p.active and p.locale = v_prof.locale)
                   then v_prof.locale else 'en' end;
  v_seed := v_me::text || v_date::text;
  v_extra := 1 + (get_byte(decode(md5(v_seed), 'hex'), 0) % 2);

  return query
    (select p.* from public.prompt_library p
      where p.surface = 'daily' and p.active and p.locale = v_locale and p.category = 'mood'
      order by md5(v_seed || p.id::text)
      limit 1)
    union all
    (select p.* from public.prompt_library p
      where p.surface = 'daily' and p.active and p.locale = v_locale and p.category <> 'mood'
        and p.depth <= v_depth
        and not (p.topic_tags && v_avoid)
        and (p.audience_role is null or p.audience_role = any (v_roles))
      order by md5(v_seed || p.id::text)
      limit v_extra);
end;
$$;

-- Answer a check-in question: creates the check-in Moment and publishes it to
-- the chosen pairs (none = only me). One answer per question per day.
create function public.answer_checkin(
  p_prompt_id        uuid,
  p_body             text default null,
  p_data             jsonb default '{}',
  p_relationship_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me     uuid := public.app_uid();
  v_tz     text;
  v_prompt public.prompt_library;
  v_id     uuid;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select timezone into v_tz from public.profiles where id = v_me;
  select * into v_prompt from public.prompt_library
   where id = p_prompt_id and surface = 'daily' and active;
  if not found then
    raise exception 'question not found' using errcode = 'P0002';
  end if;

  begin
    insert into public.moments (author_id, kind, body, data, prompt_id, prompt_text, checkin_date)
    values (v_me, 'checkin', nullif(btrim(p_body), ''), coalesce(p_data, '{}'),
            v_prompt.id, v_prompt.text, (now() at time zone v_tz)::date)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'you already answered this question today' using errcode = '23505';
  end;

  perform public.publish_moment(v_id, p_relationship_ids);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 20. Discover (Architecture section 7, Figure 5)
-- ---------------------------------------------------------------------------

-- The lower of the two depth settings wins (default 2).
create function public.pair_question_depth(p_relationship_id uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select min(coalesce(up.question_depth, 2))::smallint
    from public.relationship_members m
    left join public.user_preferences up on up.user_id = m.user_id
   where m.relationship_id = p_relationship_id;
$$;

-- Both people's avoided topics apply to both questions.
create function public.pair_avoid_topics(p_relationship_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct t), '{}')
    from public.relationship_members m
    join public.user_preferences up on up.user_id = m.user_id
    cross join lateral unnest(up.avoid_topics) t
   where m.relationship_id = p_relationship_id;
$$;

-- Rotation: one category a week in order, never the same twice running;
-- The Things We Never Asked joins after four revealed activities; categories
-- deeper than the pair's depth are skipped.
create function public.next_discovery_category(p_relationship_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_revealed integer;
  v_depth    smallint := public.pair_question_depth(p_relationship_id);
  v_last     text;
  v_list     text[];
  v_pos      integer;
begin
  select count(*) into v_revealed from public.discovery_activities
   where relationship_id = p_relationship_id and revealed_at is not null;
  select category into v_last from public.discovery_activities
   where relationship_id = p_relationship_id order by sequence_no desc limit 1;

  v_list := array['then_vs_now', 'person_never_knew', 'through_your_eyes', 'family_stories']
            || case when v_revealed >= 4 then array['things_never_asked'] else '{}'::text[] end;
  v_list := array(select c from unnest(v_list) with ordinality u(c, o)
                   where public.discovery_category_depth(c) <= v_depth order by o);
  if cardinality(v_list) = 0 then
    v_list := array['then_vs_now'];
  end if;
  v_pos := array_position(v_list, v_last);
  return v_list[case when v_pos is null then 1 else v_pos % cardinality(v_list) + 1 end];
end;
$$;

-- A library question for one member: their role, the pair's depth and avoided
-- topics, their language (falling back to English), unused ones first.
create function public.pick_discovery_prompt(
  p_relationship_id uuid,
  p_user_id         uuid,
  p_category        text,
  p_exclude_text    text default null
)
returns table (prompt_id uuid, prompt_text text)
language sql
volatile
security definer
set search_path = ''
as $$
  select p.id, p.text
    from public.prompt_library p
    join public.relationship_members m
      on m.relationship_id = p_relationship_id and m.user_id = p_user_id
    join public.profiles pr on pr.id = p_user_id
   where p.surface = 'discover' and p.active and p.category = p_category
     and p.depth <= public.pair_question_depth(p_relationship_id)
     and (p.audience_role is null or p.audience_role = m.role)
     and p.locale in (pr.locale, 'en')
     and not (p.topic_tags && public.pair_avoid_topics(p_relationship_id))
     and p.text is distinct from p_exclude_text
   order by exists (select 1 from public.discovery_prompts dp
                     where dp.relationship_id = p_relationship_id and dp.library_prompt_id = p.id),
            (p.locale = pr.locale) desc,
            random()
   limit 1;
$$;

-- Internal: open this week's activity for an active pair. p_prompts maps each
-- member's id to their question (the AI path); null picks from the library.
-- A week that starts Friday to Sunday runs through the next Sunday.
create function public.open_discovery_week(
  p_relationship_id uuid,
  p_category        text,
  p_source          text,
  p_title           text default null,
  p_theme           text default null,
  p_prompts         jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel    public.relationships;
  v_today  date;
  v_monday date;
  v_seq    integer;
  v_closes timestamptz;
  v_id     uuid;
  v_member record;
  v_lib    uuid;
  v_text   text;
begin
  -- Lock the pair: the hourly job and the AI path can't both open the week.
  select * into v_rel from public.relationships where id = p_relationship_id for update;
  if v_rel.status is distinct from 'active' then
    return null;
  end if;

  v_today := (now() at time zone v_rel.timezone)::date;
  v_monday := v_today - (extract(isodow from v_today)::integer - 1);
  if exists (select 1 from public.discovery_activities a
              where a.relationship_id = p_relationship_id
                and (a.week_start = v_monday or a.closes_at > now())) then
    return null;  -- one activity a week
  end if;

  select coalesce(max(sequence_no), 0) + 1 into v_seq
    from public.discovery_activities where relationship_id = p_relationship_id;
  v_closes := ((v_monday + case when extract(isodow from v_today) >= 5 then 14 else 7 end)::timestamp)
              at time zone v_rel.timezone;

  insert into public.discovery_activities
    (relationship_id, week_start, sequence_no, category, title, theme, generation_source, closes_at)
  values
    (p_relationship_id, v_monday, v_seq, p_category,
     coalesce(nullif(btrim(p_title), ''), public.discovery_category_title(p_category)),
     coalesce(nullif(btrim(p_theme), ''), public.discovery_category_theme(p_category)),
     p_source, v_closes)
  returning id into v_id;

  for v_member in
    select m.user_id from public.relationship_members m where m.relationship_id = p_relationship_id
  loop
    v_lib := null;
    v_text := null;
    if p_prompts is not null then
      v_text := nullif(btrim(p_prompts ->> v_member.user_id::text), '');
    else
      select pp.prompt_id, pp.prompt_text into v_lib, v_text
        from public.pick_discovery_prompt(p_relationship_id, v_member.user_id, p_category) pp;
    end if;
    if v_text is null then
      raise exception 'no % question for a member', p_category using errcode = 'P0002';
    end if;

    insert into public.discovery_prompts
      (activity_id, relationship_id, user_id, prompt_text, library_prompt_id)
    values
      (v_id, p_relationship_id, v_member.user_id, v_text, v_lib);

    perform public.enqueue_notification(
      v_member.user_id, null, p_relationship_id, 'discover', 'discover_new', v_id,
      'discover_new:' || v_id || ':' || v_member.user_id);
  end loop;

  return v_id;
end;
$$;

-- Library path: open this week's activity if there isn't one, trying the next
-- category first and the others if the library has nothing that fits.
create function public.start_discovery_week(p_relationship_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first text := public.next_discovery_category(p_relationship_id);
  v_cat   text;
  v_id    uuid;
begin
  foreach v_cat in array
    array[v_first] || array(select c from unnest(array['then_vs_now', 'person_never_knew',
                                                        'through_your_eyes', 'family_stories']) c
                             where c <> v_first
                               and public.discovery_category_depth(c)
                                   <= public.pair_question_depth(p_relationship_id))
  loop
    begin
      v_id := public.open_discovery_week(p_relationship_id, v_cat, 'library');
      return v_id;
    exception when sqlstate 'P0002' then
      null;  -- nothing in the library for this category; try the next one
    end;
  end loop;
  return null;
end;
$$;

-- Cron, hourly: every active pair gets its weekly activity once its Monday
-- has started in the pair's timezone. Pairs where someone consents to AI
-- questions are left to discover-generate until noon on Monday, then get
-- library questions. One pair's failure never stops the others.
create function public.start_discovery_weeks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel   record;
  v_count integer := 0;
begin
  for v_rel in
    select r.id, now() at time zone r.timezone as local_now
      from public.relationships r where r.status = 'active'
  loop
    if extract(isodow from v_rel.local_now) = 1 and extract(hour from v_rel.local_now) < 12
       and exists (select 1 from public.current_consent c
                    where c.relationship_id = v_rel.id and c.purpose = 'ai_questions' and c.granted) then
      continue;
    end if;
    begin
      if public.start_discovery_week(v_rel.id) is not null then
        v_count := v_count + 1;
      end if;
    exception when others then
      raise warning 'Discover week for relationship % failed: %', v_rel.id, sqlerrm;
    end;
  end loop;
  return v_count;
end;
$$;

-- AI path, for the discover-generate Edge Function only. Rechecks the pair is
-- active and that someone in it currently consents to AI questions.
create function public.save_discovery_activity(
  p_relationship_id uuid,
  p_category        text,
  p_title           text,
  p_theme           text,
  p_prompts         jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.current_consent c
                  where c.relationship_id = p_relationship_id
                    and c.purpose = 'ai_questions' and c.granted) then
    raise exception 'no one in this pair consents to AI questions' using errcode = '42501';
  end if;
  if public.discovery_category_depth(p_category) is null then
    raise exception 'unknown category %', p_category using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_each_text(p_prompts) e
              where char_length(e.value) not between 1 and 500) then
    raise exception 'each question must be 1 to 500 characters' using errcode = '22023';
  end if;
  v_id := public.open_discovery_week(p_relationship_id, p_category, 'ai', p_title, p_theme, p_prompts);
  if v_id is null then
    raise exception 'this pair is not active or already has this week''s activity' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

-- Swap, never skip: a different question up to twice a week, before submitting.
create function public.swap_discovery_prompt(p_activity_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me     uuid := public.app_uid();
  v_a      public.discovery_activities;
  v_p      public.discovery_prompts;
  v_lib    uuid;
  v_text   text;
begin
  select * into v_a from public.discovery_activities where id = p_activity_id for update;
  if not found or not public.in_relationship(v_a.relationship_id) then
    raise exception 'activity not found' using errcode = 'P0002';
  end if;
  if not public.is_active_member(v_a.relationship_id) then
    raise exception 'this relationship is read-only' using errcode = '42501';
  end if;
  if v_a.revealed_at is not null or now() >= v_a.closes_at then
    raise exception 'this activity is finished' using errcode = '22023';
  end if;

  select * into v_p from public.discovery_prompts
   where activity_id = p_activity_id and user_id = v_me for update;
  if v_p.swap_count >= 2 then
    raise exception 'you can swap your question twice a week' using errcode = '22023';
  end if;
  if exists (select 1 from public.discovery_responses
              where activity_id = p_activity_id and user_id = v_me and status = 'submitted') then
    raise exception 'you already answered; edit your answer instead' using errcode = '22023';
  end if;

  select pp.prompt_id, pp.prompt_text into v_lib, v_text
    from public.pick_discovery_prompt(v_a.relationship_id, v_me, v_a.category, v_p.prompt_text) pp;
  if v_text is null then
    raise exception 'no other question is available' using errcode = 'P0002';
  end if;

  delete from public.discovery_responses where activity_id = p_activity_id and user_id = v_me;
  update public.discovery_prompts
     set prompt_text = v_text, library_prompt_id = v_lib, swap_count = swap_count + 1
   where activity_id = p_activity_id and user_id = v_me;
  return v_text;
end;
$$;

-- Save a draft or submit an answer (text or voice). Editable until the
-- reveal. Locks the activity row, so two people submitting at the same moment
-- still reveal. One answer alone is never revealed.
create function public.submit_discovery_response(
  p_activity_id uuid,
  p_body        text default null,
  p_media_id    uuid default null,
  p_submit      boolean default true
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me    uuid := public.app_uid();
  v_a     public.discovery_activities;
  v_other uuid;
begin
  select * into v_a from public.discovery_activities where id = p_activity_id for update;
  if not found or not public.in_relationship(v_a.relationship_id) then
    raise exception 'activity not found' using errcode = 'P0002';
  end if;
  if not public.is_active_member(v_a.relationship_id) then
    raise exception 'this relationship is read-only' using errcode = '42501';
  end if;
  if v_a.revealed_at is not null then
    raise exception 'answers are revealed and can no longer change' using errcode = '22023';
  end if;
  if now() >= v_a.closes_at then
    raise exception 'this week''s activity has closed' using errcode = '22023';
  end if;
  if p_media_id is not null and not exists (
       select 1 from public.media m
        where m.id = p_media_id and m.owner_id = v_me and m.kind = 'audio' and m.status = 'ready') then
    raise exception 'a voice answer must be your own uploaded recording' using errcode = '22023';
  end if;
  if p_submit and nullif(btrim(p_body), '') is null and p_media_id is null then
    raise exception 'an answer needs text or a voice note' using errcode = '22023';
  end if;

  insert into public.discovery_responses (activity_id, user_id, body, media_id, status, submitted_at)
  values (p_activity_id, v_me, p_body, p_media_id,
          case when p_submit then 'submitted' else 'draft' end,
          case when p_submit then now() end)
  on conflict (activity_id, user_id) do update
     set body = excluded.body, media_id = excluded.media_id,
         status = excluded.status, submitted_at = excluded.submitted_at, deleted_at = null;

  if not p_submit then
    return 'draft';
  end if;

  v_other := public.other_member(v_a.relationship_id, v_me);
  if (select count(*) from public.discovery_responses r
       where r.activity_id = p_activity_id and r.status = 'submitted' and r.deleted_at is null) = 2 then
    update public.discovery_activities set revealed_at = now() where id = p_activity_id;
    insert into public.threads (relationship_id, discovery_activity_id)
    values (v_a.relationship_id, p_activity_id)
    on conflict (relationship_id, discovery_activity_id) do nothing;
    perform public.enqueue_notification(v_other, v_me, v_a.relationship_id, 'discover',
                                        'discover_revealed', p_activity_id,
                                        'discover_revealed:' || p_activity_id);
    return 'revealed';
  end if;

  perform public.enqueue_notification(v_other, v_me, v_a.relationship_id, 'discover',
                                      'discover_your_turn', p_activity_id,
                                      'discover_your_turn:' || p_activity_id);
  return 'submitted';
end;
$$;

-- The Discover screen shows whether the other person has answered, never
-- what they wrote.
create function public.discovery_partner_submitted(p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.discovery_activities a
      join public.discovery_responses r on r.activity_id = a.id
     where a.id = p_activity_id
       and public.is_member(a.relationship_id)
       and r.user_id <> public.app_uid()
       and r.status = 'submitted' and r.deleted_at is null);
$$;

-- After the reveal, or once the week has closed, an author can move their
-- answer to Trash, and restore it within 30 days.
create function public.trash_discovery_response(p_activity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.discovery_responses r set deleted_at = now()
    from public.discovery_activities a
   where a.id = r.activity_id and r.activity_id = p_activity_id
     and r.user_id = public.app_uid() and r.deleted_at is null
     and (a.revealed_at is not null or now() >= a.closes_at);
  if not found then
    raise exception 'answer not found, or the activity is still open' using errcode = 'P0002';
  end if;
end;
$$;

create function public.restore_discovery_response(p_activity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.discovery_responses set deleted_at = null
   where activity_id = p_activity_id and user_id = public.app_uid()
     and deleted_at > now() - interval '30 days';
  if not found then
    raise exception 'this item is no longer in Trash' using errcode = 'P0002';
  end if;
end;
$$;

-- Cron, hourly: "closes tonight" six hours before the close, to whoever
-- hasn't submitted yet. Dropped if it falls in their quiet hours.
create function public.enqueue_discover_closing()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   record;
  v_count integer := 0;
begin
  for v_row in
    select a.id as activity_id, a.relationship_id, p.user_id
      from public.discovery_activities a
      join public.relationships r on r.id = a.relationship_id and r.status = 'active'
      join public.discovery_prompts p on p.activity_id = a.id
     where a.revealed_at is null
       and a.closes_at > now() and a.closes_at <= now() + interval '6 hours'
       and not exists (select 1 from public.discovery_responses dr
                        where dr.activity_id = a.id and dr.user_id = p.user_id
                          and dr.status = 'submitted')
  loop
    if public.enqueue_notification(v_row.user_id, null, v_row.relationship_id, 'discover',
                                   'discover_closing', v_row.activity_id,
                                   'discover_closing:' || v_row.activity_id || ':' || v_row.user_id)
       is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 21. Trash (Figure 9)
-- ---------------------------------------------------------------------------

create function public.my_trash()
returns table (item_type text, item_id uuid, preview text, deleted_at timestamptz, purge_after timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select 'moment', m.id, left(coalesce(m.body, m.prompt_text, m.kind), 140),
         m.deleted_at, m.deleted_at + interval '30 days'
    from public.moments m
   where m.author_id = public.app_uid() and m.deleted_at is not null
  union all
  select 'discovery_response', r.activity_id, left(coalesce(r.body, a.title), 140),
         r.deleted_at, r.deleted_at + interval '30 days'
    from public.discovery_responses r
    join public.discovery_activities a on a.id = r.activity_id
   where r.user_id = public.app_uid() and r.deleted_at is not null
  order by 4 desc;
$$;

-- Cron, daily: delete what has been in Trash for 30 days (with its
-- conversations), unreviewed connector suggestions, abandoned uploads and
-- expired exports, and queue their files for removal from Storage.
create function public.purge_trash()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_media uuid[];
  v_count integer := 0;
  v_n     integer;
begin
  select coalesce(array_agg(mm.media_id), '{}') into v_media
    from public.moment_media mm
    join public.moments m on m.id = mm.moment_id
   where m.deleted_at < now() - interval '30 days'
      or (m.status = 'draft' and m.suggestion_expires_at < now())
      or m.status = 'dismissed';

  delete from public.moments
   where deleted_at < now() - interval '30 days'
      or (status = 'draft' and suggestion_expires_at < now())
      or status = 'dismissed';
  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  select v_media || coalesce(array_agg(r.media_id) filter (where r.media_id is not null), '{}')
    into v_media
    from public.discovery_responses r
   where r.deleted_at < now() - interval '30 days';

  delete from public.discovery_responses where deleted_at < now() - interval '30 days';
  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  v_media := v_media || array(select id from public.media
                               where status = 'pending' and created_at < now() - interval '2 days');

  with gone as (
    delete from public.media md
     where md.id = any (v_media) and not public.media_in_use(md.id)
    returning md.storage_path
  )
  insert into public.storage_deletions (storage_path, bucket_id)
  select storage_path, 'media' from gone
  on conflict (storage_path) do nothing;

  delete from private.invite_attempts where attempted_at < now() - interval '1 day';
  delete from public.notification_outbox
   where status in ('sent', 'dropped') and created_at < now() - interval '30 days';

  with expired as (
    update public.export_jobs set status = 'expired'
     where status = 'ready' and expires_at < now()
    returning storage_path
  )
  insert into public.storage_deletions (storage_path, bucket_id)
  select storage_path, 'exports' from expired where storage_path is not null
  on conflict (storage_path) do nothing;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 22. Connectors (Architecture section 10, Figure 7)
-- ---------------------------------------------------------------------------

-- Internal: connect or reconnect a provider. Reconnecting starts in Off,
-- bumps connection_version and imports nothing from before now.
create function public.connect_integration_for(
  p_user_id    uuid,
  p_provider   text,
  p_account_id text default null,
  p_scopes     text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_status  text;
  v_account text;
begin
  select id, status, provider_account_id into v_id, v_status, v_account
    from public.user_integrations
   where user_id = p_user_id and provider = p_provider for update;

  -- Switching to a different provider account counts as reconnecting.
  if v_status = 'connected' and p_account_id is not null and v_account is not null
     and p_account_id <> v_account then
    v_status := 'switching';
    delete from public.integration_auto_share where integration_id = v_id;
  end if;

  if v_id is null then
    insert into public.user_integrations (user_id, provider, provider_account_id, granted_scopes)
    values (p_user_id, p_provider, p_account_id, coalesce(p_scopes, '{}'))
    returning id into v_id;
  elsif v_status = 'connected' then
    update public.user_integrations
       set provider_account_id = coalesce(p_account_id, provider_account_id),
           granted_scopes = coalesce(p_scopes, granted_scopes), last_error_code = null
     where id = v_id;
  else
    update public.user_integrations
       set status = 'connected', share_mode = 'off', connection_version = connection_version + 1,
           import_after = now(), provider_account_id = p_account_id,
           granted_scopes = coalesce(p_scopes, '{}'), last_error_code = null, next_sync_at = null
     where id = v_id;
  end if;
  return v_id;
end;
$$;

-- Apple Health: permission lives on the phone; this records the connection.
create function public.connect_health_integration()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.app_uid();
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return public.connect_integration_for(v_me, 'apple_health');
end;
$$;

-- Spotify, for the spotify-oauth Edge Function: record the connection and
-- the tokens it encrypted.
create function public.service_connect_integration(
  p_user_id    uuid,
  p_provider   text,
  p_account_id text,
  p_scopes     text[],
  p_access     bytea,
  p_refresh    bytea,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := public.connect_integration_for(p_user_id, p_provider, p_account_id, p_scopes);
  perform public.store_integration_tokens(v_id, p_access, p_refresh, p_expires_at);
  return v_id;
end;
$$;

create function public.store_integration_tokens(
  p_integration_id uuid,
  p_access         bytea,
  p_refresh        bytea,
  p_expires_at     timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.integration_tokens
    (integration_id, access_token_ciphertext, refresh_token_ciphertext, expires_at)
  values (p_integration_id, p_access, p_refresh, p_expires_at)
  on conflict (integration_id) do update
     set access_token_ciphertext = excluded.access_token_ciphertext,
         refresh_token_ciphertext = coalesce(excluded.refresh_token_ciphertext,
                                             private.integration_tokens.refresh_token_ciphertext),
         expires_at = excluded.expires_at;
$$;

create function public.read_integration_tokens(p_integration_id uuid)
returns table (access_token_ciphertext bytea, refresh_token_ciphertext bytea,
               expires_at timestamptz, connection_version integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.access_token_ciphertext, t.refresh_token_ciphertext, t.expires_at, i.connection_version
    from private.integration_tokens t
    join public.user_integrations i on i.id = t.integration_id
   where t.integration_id = p_integration_id and i.status = 'connected';
$$;

-- The Spotify worker's queue.
create function public.due_integration_syncs(p_limit integer default 50)
returns table (integration_id uuid, user_id uuid, connection_version integer,
               import_after timestamptz, last_synced_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.user_id, i.connection_version, i.import_after, i.last_synced_at
    from public.user_integrations i
   where i.status = 'connected' and i.share_mode <> 'off' and i.provider = 'spotify'
     and coalesce(i.next_sync_at, '-infinity') <= now()
   order by i.next_sync_at nulls first
   limit p_limit;
$$;

-- The worker reports back. Ignored if the connection changed meanwhile.
create function public.record_integration_sync(
  p_integration_id     uuid,
  p_connection_version integer,
  p_next_sync_at       timestamptz,
  p_error_code         text default null,
  p_needs_reauth       boolean default false
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_integrations
     set last_synced_at = case when p_error_code is null then now() else last_synced_at end,
         next_sync_at = p_next_sync_at,
         last_error_code = left(p_error_code, 64),
         status = case when p_needs_reauth then 'needs_reauth' else status end
   where id = p_integration_id and connection_version = p_connection_version
     and status = 'connected';
$$;

create function public.disconnect_integration(p_provider text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.user_integrations
     set status = 'disconnected', share_mode = 'off',
         connection_version = connection_version + 1, next_sync_at = null
   where user_id = public.app_uid() and provider = p_provider and status <> 'disconnected'
  returning id into v_id;
  if v_id is not null then
    delete from private.integration_tokens where integration_id = v_id;
    delete from public.integration_auto_share where integration_id = v_id;
  end if;
end;
$$;

-- Off, review (private drafts for 24 hours) or auto (posted to chosen pairs).
create function public.set_integration_sharing(
  p_provider         text,
  p_mode             text,
  p_relationship_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_int     public.user_integrations;
  v_targets uuid[] := array(select distinct x from unnest(coalesce(p_relationship_ids, '{}')) x);
  v_rel     uuid;
begin
  select * into v_int from public.user_integrations
   where user_id = public.app_uid() and provider = p_provider for update;
  if not found or v_int.status <> 'connected' then
    raise exception '% is not connected', p_provider using errcode = 'P0002';
  end if;
  if p_mode not in ('off', 'review', 'auto') then
    raise exception 'sharing mode must be off, review or auto' using errcode = '22023';
  end if;
  foreach v_rel in array v_targets loop
    if not public.is_active_member(v_rel) then
      raise exception 'you can only auto-share into an active relationship you are in' using errcode = '42501';
    end if;
  end loop;

  update public.user_integrations
     set share_mode = p_mode,
         next_sync_at = case when p_mode <> 'off' and provider = 'spotify'
                             then coalesce(next_sync_at, now()) end
   where id = v_int.id;

  delete from public.integration_auto_share
   where integration_id = v_int.id and not (relationship_id = any (v_targets));
  insert into public.integration_auto_share (integration_id, relationship_id)
  select v_int.id, x from unnest(v_targets) x
  on conflict do nothing;
end;
$$;

-- Internal: the checks every connector event goes through, then the mode.
create function public.create_connector_moment(
  p_integration public.user_integrations,
  p_event_key   text,
  p_occurred_at timestamptz,
  p_body        text,
  p_data        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id  uuid;
  v_rel uuid;
begin
  if p_integration.share_mode = 'off' or p_occurred_at < p_integration.import_after then
    return null;
  end if;

  insert into public.moments
    (author_id, kind, body, data, status, source, integration_id, source_event_key,
     occurred_at, suggestion_expires_at, published_at)
  values
    (p_integration.user_id,
     case p_integration.provider when 'spotify' then 'music' else 'activity' end,
     left(p_body, 10000), coalesce(p_data, '{}'),
     case when p_integration.share_mode = 'auto' then 'published' else 'draft' end,
     p_integration.provider, p_integration.id, p_event_key, p_occurred_at,
     case when p_integration.share_mode = 'review' then now() + interval '24 hours' end,
     case when p_integration.share_mode = 'auto' then now() end)
  on conflict (integration_id, source_event_key) do nothing
  returning id into v_id;

  if v_id is null then
    return null;  -- already ingested
  end if;

  if p_integration.share_mode = 'auto' then
    for v_rel in
      select a.relationship_id
        from public.integration_auto_share a
        join public.relationships r on r.id = a.relationship_id and r.status = 'active'
        join public.relationship_members m
          on m.relationship_id = a.relationship_id and m.user_id = p_integration.user_id
         and m.withdrawn_at is null
       where a.integration_id = p_integration.id
    loop
      perform public.add_share(v_id, p_integration.user_id, v_rel);
    end loop;
  end if;
  return v_id;
end;
$$;

-- spotify-sync only. Ignored unless the connection version still matches, the
-- event is after import_after and its key is new.
create function public.ingest_connector_event(
  p_integration_id     uuid,
  p_connection_version integer,
  p_event_key          text,
  p_occurred_at        timestamptz,
  p_body               text default null,
  p_data               jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_int public.user_integrations;
begin
  select i.* into v_int
    from public.user_integrations i
    join public.profiles p on p.id = i.user_id and p.state = 'active'
   where i.id = p_integration_id
   for share of i;
  if not found or v_int.status <> 'connected' or v_int.provider <> 'spotify'
     or v_int.connection_version <> p_connection_version then
    return null;
  end if;
  return public.create_connector_moment(v_int, p_event_key, p_occurred_at, p_body, p_data);
end;
$$;

-- The phone sends only the day's Apple Health summary.
create function public.submit_health_summary(p_day date, p_body text default null, p_data jsonb default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me  uuid := public.app_uid();
  v_tz  text;
  v_int public.user_integrations;
begin
  select timezone into v_tz from public.profiles where id = v_me;
  select * into v_int from public.user_integrations
   where user_id = v_me and provider = 'apple_health' for share;
  if not found or v_int.status <> 'connected' then
    raise exception 'Apple Health is not connected' using errcode = 'P0002';
  end if;
  if p_day > (now() at time zone v_tz)::date then
    raise exception 'that day has not happened yet' using errcode = '22023';
  end if;
  return public.create_connector_moment(
    v_int, 'health:' || p_day::text,
    least(now(), ((p_day + 1)::timestamp at time zone v_tz) - interval '1 second'),
    p_body, p_data);
end;
$$;

-- ---------------------------------------------------------------------------
-- 23. Home, Archive and recaps (read queries)
-- ---------------------------------------------------------------------------

-- Items shared into the chosen pairs (null = all), newest share first. An
-- item shared with both parents appears once, with one conversation per pair.
-- Someone who withdrew sees only their own posts there, without conversations.
create function public.home_feed(
  p_relationship_ids uuid[] default null,
  p_before           timestamptz default null,
  p_limit            integer default 30
)
returns table (
  moment_id          uuid,
  author_id          uuid,
  kind               text,
  body               text,
  data               jsonb,
  source             text,
  happened_on        date,
  happened_precision text,
  published_at       timestamptz,
  edited_at          timestamptz,
  latest_shared_at   timestamptz,
  shares             jsonb,
  media              jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.app_uid() as id),
  visible as (
    select s.moment_id, s.relationship_id, s.first_shared_at,
           case when rm.withdrawn_at is null then t.id end as thread_id
      from public.moment_shares s
      join public.moments m on m.id = s.moment_id
      join public.relationship_members rm
        on rm.relationship_id = s.relationship_id and rm.user_id = (select id from me)
      left join public.threads t
        on t.relationship_id = s.relationship_id and t.moment_id = s.moment_id
     where s.revoked_at is null
       and m.status = 'published' and m.deleted_at is null and m.surface = 'feed'
       and (p_relationship_ids is null or s.relationship_id = any (p_relationship_ids))
       and (rm.withdrawn_at is null or m.author_id = (select id from me))
  ),
  items as (
    select v.moment_id, max(v.first_shared_at) as latest,
           jsonb_agg(jsonb_build_object('relationship_id', v.relationship_id,
                                        'thread_id', v.thread_id,
                                        'first_shared_at', v.first_shared_at)
                     order by v.first_shared_at) as shares
      from visible v
     group by v.moment_id
    having p_before is null or max(v.first_shared_at) < p_before
     order by latest desc
     limit least(greatest(coalesce(p_limit, 30), 1), 100)
  )
  select m.id, m.author_id, m.kind, m.body, m.data, m.source, m.happened_on, m.happened_precision,
         m.published_at, m.edited_at, i.latest, i.shares,
         coalesce((select jsonb_agg(jsonb_build_object(
                     'media_id', md.id, 'kind', md.kind, 'storage_path', md.storage_path,
                     'position', mm.position, 'width', md.width, 'height', md.height,
                     'duration_ms', md.duration_ms, 'blurhash', md.blurhash, 'waveform', md.waveform)
                     order by mm.position)
                     from public.moment_media mm join public.media md on md.id = mm.media_id
                    where mm.moment_id = m.id), '[]'::jsonb)
    from items i
    join public.moments m on m.id = i.moment_id
   order by i.latest desc;
$$;

-- The pair's Archive: revealed Discover activities, Moments either person
-- saved, and Archive-only memories. A memory sits at its own date (any
-- precision), otherwise at the day it was first shared, in the pair's timezone.
create function public.archive_items(
  p_relationship_id uuid,
  p_from            date default null,
  p_to              date default null,
  p_item_type       text default null,
  p_category        text default null
)
returns table (
  item_type          text,
  item_id            uuid,
  author_id          uuid,
  kind               text,
  category           text,
  title              text,
  body               text,
  sort_date          date,
  happened_on        date,
  happened_precision text,
  shared_at          timestamptz,
  saved_by           uuid[],
  thread_id          uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  with ctx as (
    select public.app_uid() as me, public.is_member(r.id) as member, r.timezone as tz
      from public.relationships r
     where r.id = p_relationship_id and public.in_relationship(r.id)
  ),
  moment_items as (
    select 'moment'::text as item_type, m.id as item_id, m.author_id, m.kind,
           null::text as category, null::text as title, m.body,
           coalesce(m.happened_on, (s.first_shared_at at time zone ctx.tz)::date) as sort_date,
           m.happened_on, m.happened_precision, s.first_shared_at as shared_at,
           array(select sm.saved_by from public.saved_moments sm
                  where sm.moment_id = m.id and sm.relationship_id = s.relationship_id) as saved_by,
           case when ctx.member then t.id end as thread_id
      from ctx
      join public.moment_shares s on s.relationship_id = p_relationship_id and s.revoked_at is null
      join public.moments m on m.id = s.moment_id
      left join public.threads t on t.relationship_id = s.relationship_id and t.moment_id = s.moment_id
     where m.status = 'published' and m.deleted_at is null
       and (m.surface = 'archive'
            or exists (select 1 from public.saved_moments sm
                        where sm.moment_id = m.id and sm.relationship_id = s.relationship_id))
       and (ctx.member or m.author_id = ctx.me)
  ),
  discovery_items as (
    select 'discovery'::text, a.id, null::uuid, null::text, a.category, a.title, a.theme,
           (a.revealed_at at time zone ctx.tz)::date, null::date, null::text, a.revealed_at,
           '{}'::uuid[], t.id
      from ctx
      join public.discovery_activities a
        on a.relationship_id = p_relationship_id and a.revealed_at is not null
      left join public.threads t
        on t.relationship_id = a.relationship_id and t.discovery_activity_id = a.id
     where ctx.member
  )
  select * from (
    select * from moment_items
    union all
    select * from discovery_items
  ) x
   where (p_item_type is null or x.item_type = p_item_type)
     and (p_category is null or x.category = p_category)
     and (p_from is null or x.sort_date >= p_from)
     and (p_to is null or x.sort_date <= p_to)
   order by x.sort_date desc, x.shared_at desc;
$$;

-- A monthly look back, computed when opened and never stored: what was shared
-- and revealed during the month in the pair's timezone. Deleted or unshared
-- items never come back.
create function public.monthly_recap(p_relationship_id uuid, p_month date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz     text;
  v_month  date := date_trunc('month', p_month)::date;
  v_start  timestamptz;
  v_end    timestamptz;
  v_result jsonb;
begin
  if not public.is_member(p_relationship_id) then
    raise exception 'relationship not found' using errcode = 'P0002';
  end if;
  select timezone into v_tz from public.relationships where id = p_relationship_id;
  v_start := v_month::timestamp at time zone v_tz;
  v_end := (v_month + interval '1 month')::date::timestamp at time zone v_tz;

  with shared as (
    select m.id, m.author_id, m.kind, s.first_shared_at
      from public.moment_shares s
      join public.moments m on m.id = s.moment_id
     where s.relationship_id = p_relationship_id and s.revoked_at is null
       and s.first_shared_at >= v_start and s.first_shared_at < v_end
       and m.status = 'published' and m.deleted_at is null
  ),
  files as (
    select md.kind from shared sh
      join public.moment_media mm on mm.moment_id = sh.id
      join public.media md on md.id = mm.media_id
  ),
  revealed as (
    select a.id, a.revealed_at from public.discovery_activities a
     where a.relationship_id = p_relationship_id
       and a.revealed_at >= v_start and a.revealed_at < v_end
  )
  select jsonb_build_object(
    'relationship_id', p_relationship_id,
    'month', v_month,
    'moments_shared', (select count(*) from shared),
    'checkins_shared', (select count(*) from shared where kind = 'checkin'),
    'by_author', coalesce((select jsonb_object_agg(author_id, n)
                             from (select author_id, count(*) as n from shared group by author_id) x),
                          '{}'::jsonb),
    'photos', (select count(*) from files where kind = 'image'),
    'voice_notes', (select count(*) from files where kind = 'audio'),
    'activities_revealed', (select count(*) from revealed),
    'moment_ids', coalesce((select jsonb_agg(id order by first_shared_at desc) from shared), '[]'::jsonb),
    'activity_ids', coalesce((select jsonb_agg(id order by revealed_at desc) from revealed), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- Cron, every 15 minutes: "How was today?" once, in the hour after the
-- person's reminder time, only if today's check-in is unanswered.
create function public.enqueue_checkin_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   record;
  v_count integer := 0;
begin
  for v_row in
    select p.id, (now() at time zone p.timezone)::date as local_day
      from public.profiles p
      join public.notification_settings ns on ns.user_id = p.id
     where p.state = 'active' and ns.reminder_enabled
       and (now() at time zone p.timezone)
           >= (now() at time zone p.timezone)::date + ns.reminder_time
       and (now() at time zone p.timezone)
           < (now() at time zone p.timezone)::date + ns.reminder_time + interval '1 hour'
       and exists (select 1 from public.relationship_members m
                     join public.relationships r on r.id = m.relationship_id
                    where m.user_id = p.id and m.withdrawn_at is null and r.status = 'active')
       and not exists (select 1 from public.moments mo
                        where mo.author_id = p.id and mo.kind = 'checkin' and mo.deleted_at is null
                          and mo.checkin_date = (now() at time zone p.timezone)::date)
  loop
    if public.enqueue_notification(v_row.id, null, null, 'reminder', 'checkin_reminder', null,
                                   'checkin_reminder:' || v_row.id || ':' || v_row.local_day)
       is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 24. Account deletion and memorial accounts (Architecture section 12)
-- ---------------------------------------------------------------------------

-- Starts the 14-day grace period. Per relationship: delete what I shared
-- (default), or leave our Archive for the relationships listed.
create function public.request_account_deletion(p_leave_archive uuid[] default '{}')
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.app_uid();
begin
  update public.profiles set state = 'deleting', state_changed_at = now()
   where id = v_me and state = 'active';
  if not found then
    raise exception 'account deletion is already requested' using errcode = '22023';
  end if;
  update public.relationship_preferences
     set account_delete_choice = case when relationship_id = any (coalesce(p_leave_archive, '{}'))
                                      then 'leave_archive' else 'delete_shared' end
   where user_id = v_me;
  return now() + interval '14 days';
end;
$$;

create function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.app_uid();
begin
  update public.profiles set state = 'active', state_changed_at = now()
   where id = v_me and state = 'deleting';
  if not found then
    raise exception 'no deletion to cancel' using errcode = 'P0002';
  end if;
  update public.relationship_preferences set account_delete_choice = 'delete_shared'
   where user_id = v_me;
end;
$$;

-- Cron, daily: finish deletions whose grace period is over. Private content
-- goes; shared items stay only in relationships where the person chose
-- "leave our Archive", under their name. Their pairs end as if they withdrew,
-- so the person who stays keeps everything that is left. Removes the login
-- when allowed and returns it, so an Edge Function can finish with the Admin
-- API if not.
create function public.finalize_account_deletions()
returns table (profile_id uuid, auth_user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p     public.profiles;
  v_keep  uuid[];
  v_media uuid[];
begin
  for v_p in
    select * from public.profiles
     where state = 'deleting' and state_changed_at <= now() - interval '14 days'
     for update skip locked
  loop
   begin
    v_keep := array(select rp.relationship_id from public.relationship_preferences rp
                     where rp.user_id = v_p.id and rp.account_delete_choice = 'leave_archive');
    v_media := array(select md.id from public.media md where md.owner_id = v_p.id);

    -- Moments: keep only those live-shared into a "leave our Archive" pair.
    delete from public.moments m
     where m.author_id = v_p.id
       and not (m.status = 'published' and m.deleted_at is null
                and exists (select 1 from public.moment_shares s
                             where s.moment_id = m.id and s.revoked_at is null
                               and s.relationship_id = any (v_keep)));
    delete from public.moment_shares s
     using public.moments m
     where s.moment_id = m.id and m.author_id = v_p.id
       and not (s.relationship_id = any (v_keep));

    -- Discover answers: keep revealed ones in kept pairs only.
    delete from public.discovery_responses r
     using public.discovery_activities a
     where a.id = r.activity_id and r.user_id = v_p.id
       and (not (a.relationship_id = any (v_keep)) or a.revealed_at is null or r.deleted_at is not null);

    delete from public.messages where author_id = v_p.id and not (relationship_id = any (v_keep));
    delete from public.reactions where user_id = v_p.id and not (relationship_id = any (v_keep));
    delete from public.saved_moments where saved_by = v_p.id and not (relationship_id = any (v_keep));
    delete from public.thread_reads where user_id = v_p.id;

    -- Private data.
    delete from public.user_preferences where user_id = v_p.id;
    delete from public.relationship_preferences where user_id = v_p.id;
    delete from public.consent_events where user_id = v_p.id;
    delete from public.monthly_recap_views where user_id = v_p.id;
    delete from public.push_devices where user_id = v_p.id;
    delete from public.user_integrations where user_id = v_p.id;
    delete from public.contact_labels where owner_id = v_p.id;
    delete from public.blocks where blocker_id = v_p.id;
    delete from public.relationship_invites where created_by = v_p.id and accepted_at is null;
    delete from public.notification_outbox where recipient_id = v_p.id or actor_id = v_p.id;
    delete from public.notification_settings where user_id = v_p.id;
    with jobs as (
      delete from public.export_jobs where requested_by = v_p.id returning storage_path
    )
    insert into public.storage_deletions (storage_path, bucket_id)
    select storage_path, 'exports' from jobs where storage_path is not null
    on conflict (storage_path) do nothing;

    -- Pairs end; the person deleting counts as having withdrawn.
    update public.relationships r
       set status = 'ended', ended_mode = 'withdrawn', status_changed_at = now(),
           status_changed_by = v_p.id, reconnect_requested_by = null
     where r.id in (select m.relationship_id from public.relationship_members m
                     where m.user_id = v_p.id)
       and r.ended_mode is distinct from 'withdrawn';
    update public.relationship_members set withdrawn_at = coalesce(withdrawn_at, now())
     where user_id = v_p.id;

    update public.profiles
       set state = 'deleted', state_changed_at = now(), auth_user_id = null, avatar_media_id = null
     where id = v_p.id;

    with gone as (
      delete from public.media md
       where md.id = any (v_media) and not public.media_in_use(md.id)
      returning md.storage_path
    )
    insert into public.storage_deletions (storage_path, bucket_id)
    select storage_path, 'media' from gone
    on conflict (storage_path) do nothing;

    if v_p.auth_user_id is not null then
      begin
        delete from auth.users where id = v_p.auth_user_id;
      exception when insufficient_privilege then
        null;  -- the calling Edge Function removes it through the Admin API
      end;
    end if;

    profile_id := v_p.id;
    auth_user_id := v_p.auth_user_id;
    return next;
   exception when others then
    -- One person's failure rolls back only their deletion; it is retried tomorrow.
    raise warning 'account deletion for profile % failed: %', v_p.id, sqlerrm;
   end;
  end loop;
end;
$$;

-- Support action, on a family member's request: login off, shared content
-- frozen (pairs end with history kept), profile shows In memory. Private
-- items are never passed on.
create function public.memorialize_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set state = 'memorialized', state_changed_at = now(), auth_user_id = null
   where id = p_profile_id and state in ('active', 'deleting');
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  update public.relationships r
     set status = 'ended', ended_mode = 'kept_history', status_changed_at = now(),
         status_changed_by = null, reconnect_requested_by = null
   where r.status in ('active', 'paused')
     and r.id in (select m.relationship_id from public.relationship_members m
                   where m.user_id = p_profile_id);
  delete from public.push_devices where user_id = p_profile_id;
  delete from public.user_integrations where user_id = p_profile_id;
  delete from public.notification_outbox
   where (recipient_id = p_profile_id or actor_id = p_profile_id) and status = 'queued';
end;
$$;

-- ---------------------------------------------------------------------------
-- 25. Function privileges
--     Nothing is callable by anon. The app role gets the access functions its
--     policies use and the RPCs below; workers, Cron and the notification
--     pipeline are service-role only; internal helpers are callable only from
--     other functions.
--
--     For later migrations: Supabase's per-schema defaults to anon and
--     authenticated are removed below, so a new function or table starts with
--     no grants for them; grant what the app needs explicitly. Postgres also
--     gives PUBLIC execute on every new function, and that can't be removed
--     per schema, so every new function needs
--     `revoke execute on function ... from public;`.
--     supabase/tests/01_schema_test.sql fails if anon can call any function.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated, service_role;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Pure helpers used in CHECK constraints and column defaults.
grant execute on function
  public.is_valid_timezone(text),
  public.pair_key(uuid, uuid),
  public.discovery_category_depth(text),
  public.discovery_category_title(text),
  public.discovery_category_theme(text),
  public.moment_data_valid(text, jsonb),
  public.date_matches_precision(date, text)
to authenticated, service_role;

-- Access functions (row-level security and Storage policies run them as the caller).
grant execute on function
  public.app_uid(),
  public.in_relationship(uuid),
  public.is_member(uuid),
  public.is_active_member(uuid),
  public.is_connected_to(uuid),
  public.can_read_moment(uuid),
  public.can_read_share(uuid, uuid),
  public.can_read_thread(uuid),
  public.can_read_discovery_response(uuid),
  public.can_read_media_path(text)
to authenticated, service_role;

-- App RPCs.
grant execute on function
  public.create_invite(text, text),
  public.revoke_invite(uuid),
  public.accept_invite(text, text),
  public.pause_relationship(uuid),
  public.end_relationship(uuid, boolean, boolean),
  public.reconnect_relationship(uuid, boolean),
  public.set_relationship_timezone(uuid, text),
  public.publish_moment(uuid, uuid[]),
  public.dismiss_suggestion(uuid),
  public.discovery_partner_submitted(uuid),
  public.unshare_moment(uuid, uuid),
  public.trash_moment(uuid),
  public.restore_moment(uuid),
  public.save_moment(uuid, uuid),
  public.unsave_moment(uuid, uuid),
  public.my_trash(),
  public.checkin_prompts(date),
  public.answer_checkin(uuid, text, jsonb, uuid[]),
  public.swap_discovery_prompt(uuid),
  public.submit_discovery_response(uuid, text, uuid, boolean),
  public.trash_discovery_response(uuid),
  public.restore_discovery_response(uuid),
  public.register_push_device(text, text),
  public.unregister_push_device(text),
  public.connect_health_integration(),
  public.submit_health_summary(date, text, jsonb),
  public.disconnect_integration(text),
  public.set_integration_sharing(text, text, uuid[]),
  public.home_feed(uuid[], timestamptz, integer),
  public.archive_items(uuid, date, date, text, text),
  public.monthly_recap(uuid, date),
  public.request_account_deletion(uuid[]),
  public.cancel_account_deletion()
to authenticated;

-- Workers, Cron and the notification pipeline.
grant execute on function
  public.enqueue_notification(uuid, uuid, uuid, text, text, uuid, text),
  public.claim_notifications(integer),
  public.disable_push_tokens(text[]),
  public.enqueue_checkin_reminders(),
  public.enqueue_discover_closing(),
  public.start_discovery_weeks(),
  public.save_discovery_activity(uuid, text, text, text, jsonb),
  public.purge_trash(),
  public.ingest_connector_event(uuid, integer, text, timestamptz, text, jsonb),
  public.service_connect_integration(uuid, text, text, text[], bytea, bytea, timestamptz),
  public.store_integration_tokens(uuid, bytea, bytea, timestamptz),
  public.read_integration_tokens(uuid),
  public.due_integration_syncs(integer),
  public.record_integration_sync(uuid, integer, timestamptz, text, boolean),
  public.finalize_account_deletions(),
  public.memorialize_profile(uuid)
to service_role;

grant select on public.current_consent to authenticated;
revoke all on public.current_consent from anon;

-- ---------------------------------------------------------------------------
-- 26. Secrets and scheduled jobs
-- ---------------------------------------------------------------------------

-- The invite HMAC key is generated here, per database, and kept in Vault.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'vault')
     and not exists (select 1 from vault.secrets where name = 'invite_hmac_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
                                'invite_hmac_key', 'HMAC key for invite links and codes');
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end;
$$;

-- Jobs that are plain SQL. Jobs that start Edge Functions (push-dispatch every
-- minute, storage-cleanup, spotify-sync, export-build, discover-generate) are
-- added with those functions, through pg_net and Vault-held keys.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('purge-trash',       '17 3 * * *',   'select public.purge_trash()');
    perform cron.schedule('account-deletions', '47 3 * * *',   'select public.finalize_account_deletions()');
    perform cron.schedule('discover-weekly',   '5 * * * *',    'select public.start_discovery_weeks()');
    perform cron.schedule('discover-closing',  '10 * * * *',   'select public.enqueue_discover_closing()');
    perform cron.schedule('checkin-reminders', '*/15 * * * *', 'select public.enqueue_checkin_reminders()');
  end if;
end;
$$;
