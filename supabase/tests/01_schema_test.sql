-- Structure and privileges: every table has RLS, every function is pinned,
-- anon can call nothing, and grant tables can't be written directly.
begin;
\ir _helpers.psql
select plan(20);

select tables_are('public', array[
  'profiles', 'contact_labels', 'blocks', 'user_preferences',
  'relationships', 'relationship_members', 'relationship_invites', 'relationship_preferences',
  'consent_events', 'media', 'prompt_library', 'moments', 'moment_media', 'moment_shares',
  'discovery_activities', 'discovery_prompts', 'discovery_responses',
  'threads', 'messages', 'reactions', 'thread_reads', 'saved_moments', 'monthly_recap_views',
  'user_integrations', 'integration_auto_share', 'export_jobs', 'storage_deletions',
  'push_devices', 'notification_settings', 'notification_outbox'
], '30 public tables');

select tables_are('private', array['integration_tokens', 'invite_attempts'],
                  'private: OAuth tokens and wrong invite guesses');

select is(
  (select count(*)::int from pg_tables where schemaname in ('public', 'private') and not rowsecurity),
  0, 'every table has row-level security');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  0, 'every function pins its search_path');

select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not p.prosecdef),
  array['date_matches_precision', 'discovery_category_depth', 'discovery_category_theme',
        'discovery_category_title', 'is_valid_timezone', 'moment_data_valid', 'pair_key',
        'set_updated_at'],
  'only pure helpers are not SECURITY DEFINER');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  0, 'anon can execute no function');

select is(
  (select array_agg(f order by f) from unnest(array[
     'public.purge_trash()', 'public.claim_notifications(integer)',
     'public.enqueue_notification(uuid,uuid,uuid,text,text,uuid,text)',
     'public.ingest_connector_event(uuid,integer,text,timestamp with time zone,text,jsonb)',
     'public.finalize_account_deletions()', 'public.invite_hash(text)',
     'public.add_share(uuid,uuid,uuid)', 'public.open_discovery_week(uuid,text,text,text,text,jsonb)',
     'public.start_discovery_weeks()', 'public.save_discovery_activity(uuid,text,text,text,jsonb)',
     'public.enqueue_checkin_reminders()', 'public.memorialize_profile(uuid)',
     'public.read_integration_tokens(uuid)', 'public.disable_push_tokens(text[])'
   ]) f where has_function_privilege('authenticated', f, 'execute')),
  null, 'workers, Cron and internal functions are not callable by the app');

select ok(has_function_privilege('service_role', 'public.claim_notifications(integer)', 'execute'),
          'push-dispatch can claim notifications');

select is(
  (select count(*)::int from pg_tables t
    where t.schemaname = 'public'
      and has_table_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'select')),
  0, 'anon can read no table');

select is(
  (select array_agg(t || ':' || p order by t, p)
     from unnest(array['relationships', 'relationship_members', 'relationship_invites', 'moment_shares',
                       'threads', 'saved_moments', 'discovery_activities', 'discovery_prompts',
                       'discovery_responses', 'user_integrations', 'integration_auto_share',
                       'push_devices', 'notification_outbox', 'storage_deletions', 'blocks']) t,
          unnest(array['insert', 'update']) p
    where has_table_privilege('authenticated', 'public.' || t, p)),
  null, 'grant tables and worker tables have no insert or update grants for the app');

select ok(not has_table_privilege('authenticated', 'public.notification_outbox', 'select')
          and not has_table_privilege('authenticated', 'public.storage_deletions', 'select'),
          'the app cannot read the push queue or the Storage deletion queue');

select ok(not has_schema_privilege('authenticated', 'private', 'usage'),
          'the app cannot reach the private schema');

select ok(not has_column_privilege('authenticated', 'public.moments', 'status', 'update')
          and not has_column_privilege('authenticated', 'public.moments', 'author_id', 'update')
          and has_column_privilege('authenticated', 'public.moments', 'body', 'update'),
          'the app may edit a Moment''s body but not its status or author');

select ok(not has_column_privilege('authenticated', 'public.profiles', 'state', 'update')
          and not has_column_privilege('authenticated', 'public.profiles', 'auth_user_id', 'update'),
          'the app cannot change a profile''s state or login');

select results_eq(
  'select jobname::text from cron.job order by jobname',
  array['account-deletions', 'checkin-reminders', 'discover-closing', 'discover-weekly', 'purge-trash'],
  'scheduled jobs');

select is((select count(*)::int from vault.secrets where name = 'invite_hmac_key'), 1,
          'the invite HMAC key is in Vault');

select results_eq(
  'select id, public from storage.buckets where id in (''media'', ''exports'') order by id',
  $$values ('exports'::text, false), ('media'::text, false)$$,
  'both buckets are private');

select ok(exists (select 1 from pg_indexes where indexname = 'relationships_one_open_per_pair'
                   and indexdef like '%WHERE (status = ANY%'),
          'one open relationship per pair is a partial unique index');

-- What a later migration gets by default.
create table public.later_table (id int);
create function public.later_function() returns int language sql as 'select 1';
select ok(not has_table_privilege('anon', 'public.later_table', 'select')
          and not has_table_privilege('anon', 'public.later_table', 'insert'),
          'a table added later starts with no grants for anon');
select ok(not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                       where p.oid = 'public.later_function()'::regprocedure
                         and a.grantee in ('anon'::regrole, 'authenticated'::regrole)),
          'a function added later gets no direct grant to anon or the app (only PUBLIC''s, which each migration revokes)');

select * from finish();
rollback;
