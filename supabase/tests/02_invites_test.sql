-- Invites and codes, roles and labels, crossed invites, blocks, first
-- Discover week, and who can see a pair.
begin;
\ir _helpers.psql
select plan(34);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('dad', tests.new_user('Dad'));
select tests.remember('eve', tests.new_user('Eve'));

-- Sam (child) invites Mom.
select tests.login(tests.v('sam'));
select tests.remember_text('code', code) from public.create_invite('child', 'Mom');
select tests.remember_text('token', token) from public.create_invite('child', 'Mom');
select tests.logout();

select is(length(tests.t('code')), 8, 'a code has 8 characters');
select ok(tests.t('code') ~ '^[A-HJ-NP-Z2-9]{8}$', 'codes avoid look-alike characters');
select is(length(tests.t('token')), 32, 'a link token has 32 hex characters');
select is((select count(*)::int from public.relationship_invites
            where code_hash = tests.t('code') or token_hash = tests.t('token')), 0,
          'only hashes are stored');

select tests.login(tests.v('sam'));
select throws_ok($$select public.accept_invite(tests.t('code'))$$, '22023',
                 'you cannot accept your own invite', 'no accepting your own invite');

-- Mom types the code in lower case with a dash.
select tests.login(tests.v('mom'));
select lives_ok(
  $$select tests.remember('rel', public.accept_invite(lower(left(tests.t('code'), 4)) || '-' || lower(right(tests.t('code'), 4)), 'Sammy'))$$,
  'Mom accepts with the code, in any case and with a dash');
select tests.logout();

select results_eq(
  $$select user_id, role from public.relationship_members where relationship_id = tests.v('rel') order by role$$,
  $$values (tests.v('sam'), 'child'::text), (tests.v('mom'), 'parent'::text)$$,
  'Sam is the child and Mom the parent');
select is((select status from public.relationships where id = tests.v('rel')), 'active', 'the pair is active');
select is((select label from public.contact_labels where owner_id = tests.v('sam') and contact_id = tests.v('mom')),
          'Mom', 'the inviter''s name for the invitee is saved');
select is((select label from public.contact_labels where owner_id = tests.v('mom') and contact_id = tests.v('sam')),
          'Sammy', 'the invitee''s name for the inviter is saved');
select is((select count(*)::int from public.relationship_preferences
            where relationship_id = tests.v('rel') and checkin_audience = 'shared'), 2,
          'both get per-pair preferences, check-ins shared by default');
select is((select count(*)::int from public.discovery_activities where relationship_id = tests.v('rel')), 1,
          'the first Discover week starts when the pair does');
select is((select count(*)::int from public.discovery_prompts p
             join public.discovery_activities a on a.id = p.activity_id
            where a.relationship_id = tests.v('rel')), 2, 'each person gets a question');
select is(tests.outbox(tests.v('sam'), 'invite_accepted'), 1, 'Sam is told Mom joined');

-- An invite works once.
select tests.login(tests.v('dad'));
select throws_ok($$select public.accept_invite(tests.t('code'))$$, '22023',
                 'this invite is no longer valid', 'a used code can''t be used by someone else');
select tests.login(tests.v('mom'));
select is(public.accept_invite(tests.t('code')), tests.v('rel'),
          'entering the code again returns the same pair');

-- Crossed invites can't make a second pair.
select tests.login(tests.v('mom'));
select tests.remember_text('code2', code) from public.create_invite('parent', 'Sam');
select tests.login(tests.v('sam'));
select throws_ok($$select public.accept_invite(tests.t('code2'))$$, '23505',
                 'you are already connected; reconnect instead', 'crossed invites are refused');

-- The link token path, used twice by the same person, returns the same pair.
select tests.login(tests.v('mom'));
select tests.remember_text('token2', token) from public.create_invite('parent', 'Sammy');
select tests.login(tests.v('dad'));
select lives_ok($$select tests.remember('rel_dad_mom', public.accept_invite(tests.t('token2')))$$,
                'Dad accepts by link');
select is(public.accept_invite(tests.t('token2')), tests.v('rel_dad_mom'),
          'accepting the same link again returns the same pair');
select tests.login(tests.v('eve'));
select throws_ok($$select public.accept_invite(tests.t('token2'))$$, '22023',
                 'this invite is no longer valid', 'someone else can''t use an accepted link');

-- Expired and revoked invites.
select tests.login(tests.v('sam'));
select tests.remember_text('code3', code) from public.create_invite('child', 'Eve');
select tests.remember('inv4', invite_id) from public.create_invite('child', 'Eve');
select tests.logout();
update public.relationship_invites set expires_at = now() - interval '1 minute'
 where created_by = tests.v('sam') and invitee_label = 'Eve' and id <> tests.v('inv4');
select tests.login(tests.v('eve'));
select throws_ok($$select public.accept_invite(tests.t('code3'))$$, '22023',
                 'this invite is no longer valid', 'an expired invite is refused');
select tests.login(tests.v('sam'));
select lives_ok($$select public.revoke_invite(tests.v('inv4'))$$, 'the inviter can revoke');
select tests.login(tests.v('eve'));
select throws_ok($$select public.revoke_invite(tests.v('inv4'))$$, 'P0002', 'invite not found',
                 'nobody else can revoke it');

-- Blocks stop invites in both directions.
select tests.logout();
insert into public.blocks (blocker_id, blocked_id) values (tests.v('eve'), tests.v('sam'));
select tests.login(tests.v('sam'));
select tests.remember_text('code5', code) from public.create_invite('child', 'Eve');
select tests.login(tests.v('eve'));
select throws_ok($$select public.accept_invite(tests.t('code5'))$$, '22023',
                 'this invite is no longer valid', 'a blocker can''t accept the blocked person''s invite');
select tests.remember_text('code6', code) from public.create_invite('parent', 'Sam');
select tests.login(tests.v('sam'));
select throws_ok($$select public.accept_invite(tests.t('code6'))$$, '22023',
                 'this invite is no longer valid', 'the blocked person can''t accept the blocker''s invite');

-- At most 10 open invites at a time.
select tests.login(tests.v('dad'));
select count(*) from generate_series(1, 10) i, lateral public.create_invite('parent', 'Kid ' || i) x;
select throws_ok($$select * from public.create_invite('parent', 'Kid')$$, '54000',
                 'too many open invites', 'open invites are capped at 10');

-- Wrong codes are guesses: 10 an hour, then a wait.
select tests.remember('guesser', tests.new_user('Guesser'));
select tests.login(tests.v('guesser'));
select is(public.accept_invite('ZZZZZZZZ'), null::uuid, 'a wrong code finds nothing');
select count(public.accept_invite('ZZZZZZZ' || i)) from generate_series(2, 9) i;
select is(public.accept_invite('not-a-real-link'), null::uuid, 'a wrong link counts too');
select throws_ok($$select public.accept_invite(tests.t('code6'))$$, '54000',
                 'too many wrong codes; try again in an hour', 'after 10 wrong guesses even a real code waits');

-- Who can see what.
select tests.login(tests.v('eve'));
select is((select count(*)::int from public.relationships where id = tests.v('rel')), 0,
          'an outsider can''t see the pair');
select is((select count(*)::int from public.profiles where id = tests.v('sam')), 0,
          'an outsider can''t see a profile');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.relationship_invites where created_by = tests.v('sam')), 0,
          'invites are visible only to their creator');
select throws_ok(
  $$insert into public.contact_labels (contact_id, label) values (tests.v('eve'), 'Stranger')$$,
  '42501', null, 'labels only for people you are connected with');
select tests.as_anon();
select throws_ok($$select * from public.create_invite('child', 'Mom')$$, '42501', null,
                 'anon can''t create invites');

select tests.logout();
select * from finish();
rollback;
