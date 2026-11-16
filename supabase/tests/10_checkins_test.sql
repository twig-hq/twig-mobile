-- Daily check-ins: the day's questions, answering, and the audience default
-- (Architecture section 6).
begin;
\ir _helpers.psql
select plan(13);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('dad', tests.new_user('Dad'));
select tests.remember('rel_mom', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));
select tests.remember('rel_dad', tests.pair(tests.v('sam'), tests.v('dad'), 'child', 'Dad'));

select tests.login(tests.v('sam'));
select is((select count(*)::int from public.checkin_prompts() where category = 'mood'), 1, 'one mood question a day');
select ok((select count(*) from public.checkin_prompts() where category <> 'mood') between 1 and 2,
          'plus one or two rotating questions');
select results_eq('select id from public.checkin_prompts()', 'select id from public.checkin_prompts()',
                  'a refresh never changes them');
select is((select count(*)::int from public.checkin_prompts() where depth > 2), 0,
          'questions deeper than the person''s setting are left out');
insert into public.user_preferences (avoid_topics) values ('{health}');
select is((select count(*)::int from generate_series(0, 30) i, lateral public.checkin_prompts(current_date + i) p
            where 'health' = any (p.topic_tags)), 0, 'avoided topics never come up');

-- The first answer goes to everyone; after that, the last choice.
select is((select array_agg(checkin_audience) from public.relationship_preferences where user_id = tests.v('sam')),
          array['shared', 'shared'], 'the first answer goes to the pair by default');
select tests.remember('mood', (select id from public.prompt_library where category = 'mood'));
select tests.remember('c1', public.answer_checkin(tests.v('mood'), null, '{"mood": 4}', array[tests.v('rel_mom')]));
select results_eq($$select kind, status, checkin_date = (now() at time zone tests.noon_tz())::date
                     from public.moments where id = tests.v('c1')$$,
                  $$values ('checkin'::text, 'published'::text, true)$$,
                  'an answer is a published check-in Moment for the author''s day');
select results_eq($$select relationship_id, checkin_audience from public.relationship_preferences
                     where user_id = tests.v('sam') order by checkin_audience$$,
                  $$values (tests.v('rel_dad'), 'only_me'::text), (tests.v('rel_mom'), 'shared'::text)$$,
                  'the choice is remembered per pair');
select tests.login(tests.v('mom'));
select is((select (data ->> 'mood')::int from public.moments where id = tests.v('c1')), 4, 'Mom sees the mood');
select tests.login(tests.v('dad'));
select is((select count(*)::int from public.moments where id = tests.v('c1')), 0, 'Dad doesn''t');

-- Rules.
select tests.login(tests.v('sam'));
select throws_ok($$select public.answer_checkin(tests.v('mood'), null, '{"mood": 2}')$$, '23505',
                 'you already answered this question today', 'one answer per question per day');
select throws_ok($$select public.answer_checkin((select id from public.prompt_library where text = 'What made you smile today?'),
                                                 null, '{"mood": 7}')$$,
                 '23514', null, 'a mood is 1 to 5');
select throws_ok($$select public.answer_checkin(gen_random_uuid(), 'hi')$$, 'P0002', 'question not found',
                 'only real questions');

select tests.logout();
select * from finish();
rollback;
