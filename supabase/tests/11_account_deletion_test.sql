-- Account deletion with its grace period and per-pair choice, and memorial
-- accounts (Architecture section 12, Figure 10).
begin;
\ir _helpers.psql
select plan(21);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('dad', tests.new_user('Dad'));
select tests.remember('rel_mom', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));
select tests.remember('rel_dad', tests.pair(tests.v('sam'), tests.v('dad'), 'child', 'Dad'));
select tests.remember('auth_sam', tests.auth_id(tests.v('sam')));

select tests.remember('both', tests.post(tests.v('sam'), array[tests.v('rel_mom'), tests.v('rel_dad')], 'to both'));
select tests.remember('dad_only', tests.post(tests.v('sam'), array[tests.v('rel_dad')], 'to Dad'));
select tests.remember('mom_post', tests.post(tests.v('mom'), array[tests.v('rel_mom')], 'from Mom'));
select tests.logout();
select tests.remember('img', tests.upload(tests.v('sam')));
select tests.login(tests.v('sam'));
insert into public.moments (body) values ('private draft');
insert into public.moment_media (moment_id, media_id, position)
select id, tests.v('img'), 0 from public.moments where body = 'private draft';
insert into public.messages (thread_id, relationship_id, body)
select id, relationship_id, 'reply to Mom' from public.threads where moment_id = tests.v('mom_post');
select tests.login(tests.v('dad'));
insert into public.messages (thread_id, relationship_id, body)
select id, relationship_id, 'Dad''s reply' from public.threads where moment_id = tests.v('dad_only');

-- Request, cancel, request again.
select tests.login(tests.v('sam'));
select ok(public.request_account_deletion(array[tests.v('rel_mom')]) > now() + interval '13 days',
          'deletion waits 14 days');
select is((select state from public.profiles where id = tests.v('sam')), 'deleting', 'the account is marked');
select is(public.app_uid(), tests.v('sam'), 'the person can still sign in to cancel');
select lives_ok($$select public.cancel_account_deletion()$$, 'and can cancel');
select is((select state from public.profiles where id = tests.v('sam')), 'active', 'back to active');
select public.request_account_deletion(array[tests.v('rel_mom')]);
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.relationship_preferences where user_id = tests.v('sam')), 0,
          'Mom can''t see what Sam chose for their Archive');
select tests.login(tests.v('sam'));
select throws_ok($$select public.finalize_account_deletions()$$, '42501', null, 'the app can''t finalize deletions');

select tests.as_service();
select is((select count(*)::int from public.finalize_account_deletions()), 0, 'nothing happens during the grace period');
select tests.logout();
update public.profiles set state_changed_at = now() - interval '15 days' where id = tests.v('sam');
select tests.as_service();
select results_eq($$select profile_id, auth_user_id from public.finalize_account_deletions()$$,
                  $$values (tests.v('sam'), tests.v('auth_sam'))$$, 'after 14 days the deletion runs');
select tests.logout();

select results_eq($$select state, auth_user_id is null, display_name from public.profiles where id = tests.v('sam')$$,
                  $$values ('deleted'::text, true, 'Sam'::text)$$, 'the login is removed; only the name stays');
select is((select count(*)::int from auth.users where id = tests.v('auth_sam')), 0, 'the auth user is gone');
select is((select count(*)::int from public.moments where body = 'private draft'), 0, 'private content is deleted');
select is((select count(*)::int from public.moments where id = tests.v('dad_only')), 0,
          '"delete what I shared": items shared only with Dad are deleted');
select is((select count(*)::int from public.messages where body = 'Dad''s reply'), 0, 'with their conversations');
select results_eq($$select relationship_id from public.moment_shares where moment_id = tests.v('both')$$,
                  $$values (tests.v('rel_mom'))$$, '"leave our Archive": the item stays for Mom, not for Dad');
select is((select count(*)::int from public.messages where body = 'reply to Mom'), 1, 'Sam''s reply to Mom stays');
select is((select count(*)::int from public.storage_deletions
            where storage_path = tests.v('sam')::text || '/' || tests.v('img')::text), 1,
          'deleted files are queued for removal from Storage');
select is((select array_agg(distinct status || '/' || ended_mode) from public.relationships
            where id in (tests.v('rel_mom'), tests.v('rel_dad'))), array['ended/withdrawn'],
          'both pairs end as if Sam withdrew');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments where id in (tests.v('both'), tests.v('mom_post'))), 2,
          'Mom keeps the shared Archive');

-- Memorial accounts.
select tests.logout();
select tests.remember('kid', tests.new_user('Kid'));
select tests.remember('rel_kid', tests.pair(tests.v('kid'), tests.v('dad'), 'child', 'Dad'));
select tests.as_service();
select public.memorialize_profile(tests.v('dad'));
select tests.logout();
select results_eq($$select state, auth_user_id is null from public.profiles where id = tests.v('dad')$$,
                  $$values ('memorialized'::text, true)$$, 'a memorialized account has no login');
select results_eq($$select status, ended_mode from public.relationships where id = tests.v('rel_kid')$$,
                  $$values ('ended'::text, 'kept_history'::text)$$, 'its pairs are frozen with history kept');

select * from finish();
rollback;
