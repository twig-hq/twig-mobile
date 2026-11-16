-- Notification rules: switches, mute, membership, quiet hours, grouping,
-- reminders, dispatch and push devices (Architecture section 13).
begin;
\ir _helpers.psql
select plan(26);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('rel', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom', 'Sammy'));

-- Phones.
select tests.login(tests.v('mom'));
select lives_ok($$select public.register_push_device('ExponentPushToken[mom-phone]', 'ios')$$, 'Mom registers her phone');
select tests.login(tests.v('sam'));
select is((select count(*)::int from public.push_devices), 0, 'people see only their own phones');

-- The first share pushes at once; more within the window ride along.
select tests.remember('m1', tests.post(tests.v('sam'), array[tests.v('rel')], 'one'));
select tests.remember('m2', tests.post(tests.v('sam'), array[tests.v('rel')], 'two'));
select tests.logout();
select results_eq(
  $$select is_follow_up, deliver_after <= now() from public.notification_outbox
     where recipient_id = tests.v('mom') and event = 'moment_shared' order by id$$,
  $$values (false, true), (false, true)$$,
  'two quick shares wait together for the next dispatch');
select tests.login(tests.v('mom'));
select throws_ok($$select * from public.claim_notifications()$$, '42501', null, 'the app can''t claim pushes');
select tests.as_service();
select results_eq(
  $$select item_count, sender_label, expo_tokens, is_follow_up from public.claim_notifications()
     where recipient_id = tests.v('mom') and category = 'posts_replies'$$,
  $$values (2, 'Sammy'::text, array['ExponentPushToken[mom-phone]'], false)$$,
  'dispatch merges them into one push, named the way Mom calls Sam');
select is((select count(*)::int from public.claim_notifications()), 0, 'claimed pushes are not sent twice');
select tests.logout();

-- Within 10 minutes of a push, the next is a held follow-up.
select tests.remember('m3', tests.post(tests.v('sam'), array[tests.v('rel')], 'three'));
select ok((select is_follow_up and deliver_after > now() + interval '9 minutes'
             from public.notification_outbox where subject_id = tests.v('m3')),
          'a share soon after a push waits 10 minutes as a follow-up');

-- Replies and reactions.
select tests.login(tests.v('mom'));
insert into public.messages (thread_id, relationship_id, body)
select id, relationship_id, 'Love it' from public.threads where moment_id = tests.v('m1');
insert into public.reactions (thread_id, relationship_id, reaction)
select id, relationship_id, 'heart' from public.threads where moment_id = tests.v('m1');
select tests.logout();
select is(tests.outbox(tests.v('sam'), 'message'), 1, 'a reply pushes');
select is(tests.outbox(tests.v('sam'), 'reaction'), 1, 'a reaction pushes');
select is((select count(*)::int from public.notification_outbox o
            where o.recipient_id = tests.v('sam') and o.event in ('message', 'reaction')
              and o.deliver_after = (select min(deliver_after) from public.notification_outbox
                                      where recipient_id = tests.v('sam') and event in ('message', 'reaction'))), 2,
          'and they are grouped as one push from Mom');

-- Switches and mute.
update public.notification_settings set posts_replies = false where user_id = tests.v('mom');
select tests.remember('m4', tests.post(tests.v('sam'), array[tests.v('rel')], 'four'));
select is((select count(*)::int from public.notification_outbox where subject_id = tests.v('m4')), 0,
          'Posts & replies switched off: no push');
update public.notification_settings set posts_replies = true where user_id = tests.v('mom');
update public.relationship_preferences set notifications_muted = true
 where relationship_id = tests.v('rel') and user_id = tests.v('mom');
select tests.remember('m5', tests.post(tests.v('sam'), array[tests.v('rel')], 'five'));
select is((select count(*)::int from public.notification_outbox where subject_id = tests.v('m5')), 0,
          'a muted pair doesn''t push');
update public.relationship_preferences set notifications_muted = false
 where relationship_id = tests.v('rel') and user_id = tests.v('mom');

-- Quiet hours hold pushes until they end.
update public.notification_settings
   set quiet_start = (now() at time zone tests.noon_tz())::time - interval '1 hour',
       quiet_end = (now() at time zone tests.noon_tz())::time + interval '2 hours'
 where user_id = tests.v('mom');
delete from public.notification_outbox;
select tests.remember('m6', tests.post(tests.v('sam'), array[tests.v('rel')], 'six'));
select is((select deliver_after from public.notification_outbox where subject_id = tests.v('m6')),
          ((now() at time zone tests.noon_tz())::date
             + (select quiet_end from public.notification_settings where user_id = tests.v('mom')))
            at time zone tests.noon_tz(),
          'during quiet hours a push waits until they end');

-- Daily reminders.
select tests.as_service();
update public.notification_settings set reminder_time = (now() at time zone tests.noon_tz())::time - interval '10 minutes';
select is(public.enqueue_checkin_reminders(), 1, 'in quiet hours the reminder is dropped; only Sam gets one');
select is(public.enqueue_checkin_reminders(), 0, 'reminders go out once a day');
select is((select status from public.notification_outbox
            where recipient_id = tests.v('mom') and event = 'checkin_reminder'), 'dropped',
          'Mom''s dropped reminder is remembered, so it isn''t sent after quiet hours');
select tests.logout();
update public.notification_settings set quiet_enabled = false where user_id = tests.v('mom');
select tests.login(tests.v('mom'));
select public.answer_checkin((select id from public.prompt_library where category = 'mood'), null, '{"mood": 4}');
select tests.as_service();
select is(public.enqueue_checkin_reminders(), 0, 'no reminder after today''s check-in');

-- Membership and pair state.
select tests.login(tests.v('mom'));
select public.pause_relationship(tests.v('rel'));
select tests.logout();
select is(public.enqueue_notification(tests.v('mom'), tests.v('sam'), tests.v('rel'), 'posts_replies', 'message', null),
          null::bigint, 'a paused pair gets no post or reply pushes');
select isnt(public.enqueue_notification(tests.v('mom'), tests.v('sam'), tests.v('rel'), 'connections',
                                        'reconnect_requested', tests.v('rel')),
            null::bigint, 'but a reconnect request still pushes');
select tests.login(tests.v('mom'));
select public.end_relationship(tests.v('rel'), true);
select tests.logout();
select is(public.enqueue_notification(tests.v('mom'), tests.v('sam'), tests.v('rel'), 'connections',
                                      'reconnect_requested', tests.v('rel')),
          null::bigint, 'someone who withdrew gets nothing about the pair');
select is(public.enqueue_notification(tests.v('sam'), tests.v('sam'), tests.v('rel'), 'connections',
                                      'invite_accepted', tests.v('rel')),
          null::bigint, 'nobody is notified about their own action');

-- Pushes without a sender stay separate per pair.
select tests.remember('kid2', tests.new_user('Kid2'));
select tests.remember('rel2', tests.pair(tests.v('kid2'), tests.v('sam'), 'child', 'Sam'));
delete from public.notification_outbox;
select public.enqueue_notification(tests.v('sam'), null, r, 'discover', 'discover_new', gen_random_uuid())
  from unnest(array[tests.v('rel2')]) r;
select tests.as_service();
select public.enqueue_notification(tests.v('sam'), null, tests.v('rel2'), 'discover', 'discover_closing', gen_random_uuid());
select is((select count(*)::int from public.claim_notifications() where recipient_id = tests.v('sam')), 2,
          'two different system pushes are not merged into one');
select tests.logout();

-- Dead tokens.
select tests.as_service();
select is(public.disable_push_tokens(array['ExponentPushToken[mom-phone]']), 1, 'Expo''s dead tokens are switched off');
select tests.login(tests.v('sam'));
select lives_ok($$select public.register_push_device('ExponentPushToken[mom-phone]', 'android')$$,
                'the phone signs in as Sam');
select tests.logout();
select results_eq($$select user_id, disabled_at is null from public.push_devices$$,
                  $$values (tests.v('sam'), true)$$, 'the token moves to whoever signed in last');
select tests.login(tests.v('sam'));
select public.unregister_push_device('ExponentPushToken[mom-phone]');
select is((select count(*)::int from public.push_devices), 0, 'signing out removes it');

select tests.logout();
select * from finish();
rollback;
