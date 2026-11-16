-- Pause and reconnect, end and reopen, withdraw and rejoin, blocks, and the
-- two-member rule (Architecture section 11).
begin;
\ir _helpers.psql
select plan(40);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('rel', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));
select tests.remember('m_sam', tests.post(tests.v('sam'), array[tests.v('rel')], 'from Sam'));
select tests.remember('m_mom', tests.post(tests.v('mom'), array[tests.v('rel')], 'from Mom'));

-- Timezones are IANA names, never fixed offsets.
select tests.login(tests.v('mom'));
select throws_ok($$select public.set_relationship_timezone(tests.v('rel'), 'UTC+5')$$, '22023', null,
                 'a fixed offset is refused');
select throws_ok($$select public.set_relationship_timezone(tests.v('rel'), 'PST')$$, '22023', null,
                 'an abbreviation is refused');
select lives_ok($$select public.set_relationship_timezone(tests.v('rel'), 'Europe/Paris')$$,
                'an IANA zone is accepted');

-- Pause: read-only for both, and unsent pushes about posts are dropped.
select tests.logout();
select is(tests.outbox(tests.v('sam'), 'moment_shared'), 1, 'Sam has an unsent push about Mom''s post');
select tests.login(tests.v('mom'));
select lives_ok($$select public.pause_relationship(tests.v('rel'))$$, 'Mom pauses');
select tests.logout();
select is(tests.outbox(tests.v('sam'), 'moment_shared'), 0, 'pausing drops it');
select tests.login(tests.v('mom'));
select is((select status from public.relationships where id = tests.v('rel')), 'paused', 'the pair is paused');
select throws_ok($$select public.pause_relationship(tests.v('rel'))$$, '22023', null, 'pausing twice is refused');
select is((select count(*)::int from public.moments), 2, 'paused: Mom still reads the history');
select tests.login(tests.v('sam'));
select is((select count(*)::int from public.moments), 2, 'paused: Sam still reads the history');
insert into public.moments (body) values ('while paused');
select throws_ok(
  $$select public.publish_moment((select id from public.moments where body = 'while paused'), array[tests.v('rel')])$$,
  '42501', null, 'paused: no new posts');
select throws_ok(
  $$insert into public.messages (thread_id, relationship_id, body)
    select id, relationship_id, 'hi' from public.threads where moment_id = tests.v('m_mom')$$,
  '42501', null, 'paused: no new replies');

-- Reconnect takes both.
select is(public.reconnect_relationship(tests.v('rel')), 'requested', 'Sam asks to reconnect');
select is(public.reconnect_relationship(tests.v('rel')), 'requested', 'asking twice is harmless');
select tests.logout();
select is(tests.outbox(tests.v('mom'), 'reconnect_requested'), 1, 'Mom is asked once');
select tests.login(tests.v('mom'));
select is(public.reconnect_relationship(tests.v('rel')), 'active', 'Mom confirms');
select is((select status from public.relationships where id = tests.v('rel')), 'active', 'active again');

-- End with history kept, then reopen.
select tests.login(tests.v('sam'));
select is(public.end_relationship(tests.v('rel')), 'ended', 'Sam ends the pair');
select is((select ended_mode from public.relationships where id = tests.v('rel')), 'kept_history',
          'history is kept');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments), 2, 'ended: Mom still reads everything');
select is(public.reconnect_relationship(tests.v('rel')), 'requested', 'Mom asks to reopen');
select tests.login(tests.v('sam'));
select is(public.reconnect_relationship(tests.v('rel'), false), 'declined', 'Sam can decline');
select tests.login(tests.v('mom'));
select is(public.reconnect_relationship(tests.v('rel')), 'requested', 'Mom asks again');
select tests.login(tests.v('sam'));
select is(public.reconnect_relationship(tests.v('rel')), 'active', 'Sam accepts: reopened with its history');

-- End and withdraw.
select is(public.end_relationship(tests.v('rel'), true), 'ended', 'Sam ends and withdraws');
select is((select ended_mode from public.relationships where id = tests.v('rel')), 'withdrawn', 'withdrawn');
select results_eq($$select id from public.moments where status = 'published'$$, $$values (tests.v('m_sam'))$$,
                  'the one who withdrew sees only their own posts');
select is((select count(*)::int from public.threads), 0, 'and no conversations');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments), 2, 'the one who stays keeps everything');
select throws_ok($$select public.reconnect_relationship(tests.v('rel'))$$, '42501',
                 'only the person who left can ask to rejoin', 'only the one who left can ask to rejoin');
select tests.login(tests.v('sam'));
select lives_ok($$select public.trash_moment(tests.v('m_sam'))$$, 'the one who left can still trash their own items');
select lives_ok($$select public.restore_moment(tests.v('m_sam'))$$, 'and restore them');

-- Rejoin.
select is(public.reconnect_relationship(tests.v('rel')), 'requested', 'Sam asks to rejoin');
select tests.login(tests.v('mom'));
select is(public.reconnect_relationship(tests.v('rel')), 'active', 'Mom accepts');
select tests.login(tests.v('sam'));
select is((select count(*)::int from public.moments where status = 'published'), 2, 'after rejoining Sam sees Mom''s posts again');

-- Kept, then withdraw later; a block stops rejoining.
select tests.login(tests.v('mom'));
select public.end_relationship(tests.v('rel'));
select tests.login(tests.v('sam'));
select public.end_relationship(tests.v('rel'), true, true);
select is((select ended_mode from public.relationships where id = tests.v('rel')), 'withdrawn',
          'a pair ended with history kept can be withdrawn from later');
select is((select count(*)::int from public.blocks where blocker_id = tests.v('sam')), 1, 'Sam blocked Mom');
select throws_ok($$select public.reconnect_relationship(tests.v('rel'))$$, '42501',
                 'this relationship cannot be reopened', 'a block stops rejoining');
select tests.logout();
select is((select count(*)::int from public.notification_outbox
            where relationship_id = tests.v('rel') and status = 'queued'), 0,
          'ending drops any pushes not yet sent');

-- Exactly two members.
set constraints public.relationship_members_stay_two immediate;
select throws_ok($$delete from public.relationship_members where relationship_id = tests.v('rel') and role = 'parent'$$,
                 '23514', null, 'a pair can''t lose a member');

select * from finish();
rollback;
