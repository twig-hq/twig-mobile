-- Connectors: off, review and auto; connection versions; the import boundary;
-- duplicates; paused pairs; private tokens (Architecture section 10).
begin;
\ir _helpers.psql
select plan(31);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('dad', tests.new_user('Dad'));
select tests.remember('rel_mom', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));
select tests.remember('rel_dad', tests.pair(tests.v('sam'), tests.v('dad'), 'child', 'Dad'));

-- Apple Health starts Off.
select tests.login(tests.v('sam'));
select lives_ok($$select public.connect_health_integration()$$, 'Sam connects Apple Health');
select results_eq($$select status, share_mode, connection_version from public.user_integrations$$,
                  $$values ('connected'::text, 'off'::text, 1)$$, 'connected, Off, version 1');
select is(public.submit_health_summary(current_date), null::uuid, 'Off: nothing is created');

-- Review: a private draft for 24 hours.
select public.set_integration_sharing('apple_health', 'review');
select tests.remember('h1', public.submit_health_summary((now() at time zone tests.noon_tz())::date, '8,000 steps'));
select isnt(tests.v('h1'), null, 'Review: a draft is created');
select ok((select status = 'draft' and suggestion_expires_at between now() + interval '23 hours' and now() + interval '25 hours'
             from public.moments where id = tests.v('h1')), 'it is a draft that expires in 24 hours');
select is(public.submit_health_summary((now() at time zone tests.noon_tz())::date, 'again'), null::uuid,
          'the same day is never ingested twice');
select throws_ok($$select public.submit_health_summary((now() at time zone tests.noon_tz())::date + 2)$$, '22023',
                 null, 'no summaries for days that haven''t happened');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments where id = tests.v('h1')), 0, 'Mom can''t see the draft');
select tests.login(tests.v('sam'));
select lives_ok($$select public.publish_moment(tests.v('h1'), array[tests.v('rel_mom')])$$, 'Sam shares the suggestion');
select tests.login(tests.v('mom'));
select is((select kind from public.moments where id = tests.v('h1')), 'activity', 'Mom sees the activity Moment');

-- An expired suggestion can't be published.
select tests.logout();
insert into public.moments (author_id, kind, status, source, integration_id, source_event_key, suggestion_expires_at, data)
select tests.v('sam'), 'activity', 'draft', 'apple_health', id, 'health:old', now() - interval '1 hour', '{"steps": 1}'
  from public.user_integrations where user_id = tests.v('sam');
select tests.login(tests.v('sam'));
select throws_ok($$select public.publish_moment((select id from public.moments where source_event_key = 'health:old'))$$,
                 '22023', 'this suggestion has expired', 'expired suggestions can''t be shared');

-- Auto: posted to the chosen pairs only, and only active ones.
select throws_ok($$select public.set_integration_sharing('apple_health', 'auto', array[gen_random_uuid()])$$,
                 '42501', null, 'auto-share only into your own pairs');
select public.set_integration_sharing('apple_health', 'auto', array[tests.v('rel_mom')]);
select tests.remember('h2', public.submit_health_summary((now() at time zone tests.noon_tz())::date - 1, 'yesterday')) ;
select is(tests.v('h2'), null::uuid, 'a day that ended before connecting is not imported');
select tests.logout();
update public.user_integrations set import_after = now() - interval '3 days' where user_id = tests.v('sam');
select tests.login(tests.v('sam'));
select tests.remember('h2', public.submit_health_summary((now() at time zone tests.noon_tz())::date - 1, 'yesterday'));
select is((select status from public.moments where id = tests.v('h2')), 'published', 'Auto: published at once');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments where id = tests.v('h2')), 1, 'Mom, who was chosen, sees it');
select tests.login(tests.v('dad'));
select is((select count(*)::int from public.moments where id = tests.v('h2')), 0, 'Dad, who wasn''t, doesn''t');
select tests.login(tests.v('mom'));
select public.pause_relationship(tests.v('rel_mom'));
select tests.login(tests.v('sam'));
select tests.remember('h3', public.submit_health_summary((now() at time zone tests.noon_tz())::date - 2, 'two days ago'));
select is((select count(*)::int from public.moment_shares where moment_id = tests.v('h3')), 0,
          'paused pairs are skipped');

-- Spotify, through the worker.
select tests.as_service();
select tests.remember('sp', public.service_connect_integration(tests.v('sam'), 'spotify', 'spotify-user', '{user-read-recently-played}',
                                                               '\x01'::bytea, '\x02'::bytea, now() + interval '1 hour'));
select is((select access_token_ciphertext from public.read_integration_tokens(tests.v('sp'))), '\x01'::bytea,
          'the worker reads the encrypted tokens');
select is(public.ingest_connector_event(tests.v('sp'), 1, 'recap:1', now(), 'listened'), null::uuid,
          'Spotify starts Off');
select tests.login(tests.v('sam'));
select public.set_integration_sharing('spotify', 'review');
select throws_ok($$select * from private.integration_tokens$$, '42501', null, 'the app can''t read tokens');
select throws_ok($$select public.ingest_connector_event(tests.v('sp'), 1, 'recap:1', now())$$, '42501', null,
                 'the app can''t call the worker''s function');
select tests.as_service();
select is(public.ingest_connector_event(tests.v('sp'), 2, 'recap:1', now(), 'listened'), null::uuid,
          'a worker holding an old connection version writes nothing');
select isnt(public.ingest_connector_event(tests.v('sp'), 1, 'recap:1', now(), 'listened'), null::uuid,
            'the current version creates a suggestion');
select is(public.ingest_connector_event(tests.v('sp'), 1, 'recap:2', now() - interval '1 day', 'old'), null::uuid,
          'nothing from before connecting is imported');

-- Switching to another Spotify account counts as reconnecting.
select tests.login(tests.v('sam'));
select public.set_integration_sharing('spotify', 'auto', array[tests.v('rel_dad')]);
select tests.as_service();
select public.service_connect_integration(tests.v('sam'), 'spotify', 'another-account', '{}', '\x03', '\x04', now());
select results_eq($$select share_mode, connection_version, import_after > now() - interval '1 minute'
                     from public.user_integrations where id = tests.v('sp')$$,
                  $$values ('off'::text, 2, true)$$, 'a different account starts again: Off, new version, nothing older');
select is((select count(*)::int from public.integration_auto_share where integration_id = tests.v('sp')), 0,
          'and forgets the old auto-share pairs');
select tests.login(tests.v('sam'));
select public.set_integration_sharing('spotify', 'review');
select tests.as_service();
select tests.remember('sugg', public.ingest_connector_event(tests.v('sp'), 2, 'recap:9', now(), 'new account'));
select tests.login(tests.v('sam'));
select lives_ok($$select public.dismiss_suggestion(tests.v('sugg'))$$, 'a suggestion can be dismissed');
select is((select status from public.moments where id = tests.v('sugg')), 'dismissed',
          'it is marked dismissed, and the daily purge deletes it');

-- Disconnect and reconnect.
select tests.login(tests.v('sam'));
select public.disconnect_integration('spotify');
select tests.as_service();
select results_eq($$select status, share_mode, connection_version from public.user_integrations where id = tests.v('sp')$$,
                  $$values ('disconnected'::text, 'off'::text, 3)$$, 'disconnecting bumps the version and turns sharing off');
select is((select count(*)::int from public.read_integration_tokens(tests.v('sp'))), 0, 'tokens are deleted');
select is(public.ingest_connector_event(tests.v('sp'), 2, 'recap:3', now(), 'late'), null::uuid,
          'a worker that started before the disconnect can''t write after it');

select tests.logout();
select * from finish();
rollback;
