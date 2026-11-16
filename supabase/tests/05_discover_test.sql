-- Discover: privacy before the reveal, swaps, the reveal, closing, the
-- weekly rotation and the AI path's consent check (Architecture section 7).
begin;
\ir _helpers.psql
select plan(42);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('rel', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));
select tests.remember('a1', (select id from public.discovery_activities where relationship_id = tests.v('rel')));

-- The first week.
select is((select week_start from public.discovery_activities where id = tests.v('a1')),
          (select d - (extract(isodow from d)::int - 1)
             from (select (now() at time zone r.timezone)::date as d
                     from public.relationships r where r.id = tests.v('rel')) x),
          'the week starts on Monday in the pair''s timezone');
select is((select closes_at from public.discovery_activities where id = tests.v('a1')),
          (select ((week_start + case when extract(isodow from (now() at time zone r.timezone)::date) >= 5
                                      then 14 else 7 end)::timestamp at time zone r.timezone)
             from public.discovery_activities a join public.relationships r on r.id = a.relationship_id
            where a.id = tests.v('a1')),
          'it closes at the end of Sunday; a week started Friday to Sunday runs to the next Sunday');
select is((select category from public.discovery_activities where id = tests.v('a1')), 'then_vs_now',
          'the first category is Then vs. Now');
select ok((select coalesce(l.audience_role, 'parent') = 'parent'
             from public.discovery_prompts p join public.prompt_library l on l.id = p.library_prompt_id
            where p.activity_id = tests.v('a1') and p.user_id = tests.v('mom')),
          'Mom''s question is one meant for a parent');
select is(tests.outbox(tests.v('mom'), 'discover_new'), 1, 'both are told about the new activity');

-- Before the reveal, everything is private.
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.discovery_prompts where activity_id = tests.v('a1')), 1,
          'Mom sees only her own question');
select tests.login(tests.v('sam'));
select is(public.submit_discovery_response(tests.v('a1'), 'a draft', null, false), 'draft', 'Sam saves a draft');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.discovery_responses where activity_id = tests.v('a1')), 0,
          'Mom can''t see Sam''s draft');

-- Swap, never skip.
select tests.remember_text('q0', (select prompt_text from public.discovery_prompts where user_id = tests.v('mom')));
select isnt(public.swap_discovery_prompt(tests.v('a1')), tests.t('q0'), 'a swap gives a different question');
select lives_ok($$select public.swap_discovery_prompt(tests.v('a1'))$$, 'a second swap is allowed');
select throws_ok($$select public.swap_discovery_prompt(tests.v('a1'))$$, '22023',
                 'you can swap your question twice a week', 'a third swap is refused');

-- Sam submits; Mom's turn.
select tests.login(tests.v('sam'));
select throws_ok($$select public.submit_discovery_response(tests.v('a1'), '  ')$$, '22023',
                 'an answer needs text or a voice note', 'an empty answer can''t be submitted');
select is(public.submit_discovery_response(tests.v('a1'), 'Sam''s answer'), 'submitted', 'Sam submits');
select throws_ok($$select public.swap_discovery_prompt(tests.v('a1'))$$, '22023', null,
                 'no swapping after submitting');
select is(public.discovery_partner_submitted(tests.v('a1')), false, 'Sam sees Mom hasn''t answered yet');
select tests.login(tests.v('mom'));
select is(public.discovery_partner_submitted(tests.v('a1')), true, 'Mom sees that Sam has answered');
select tests.logout();
select is(tests.outbox(tests.v('mom'), 'discover_your_turn'), 1, 'Mom is told it''s her turn');
select tests.remember('r_sam', (select id from public.discovery_responses where user_id = tests.v('sam')));
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.discovery_responses where id = tests.v('r_sam')), 0,
          'a submitted answer stays hidden until both have answered');
select is((select count(*)::int from public.threads where discovery_activity_id = tests.v('a1')), 0,
          'no conversation before the reveal');

-- The reveal.
select is(public.submit_discovery_response(tests.v('a1'), 'Mom''s answer'), 'revealed', 'Mom''s answer reveals both');
select isnt((select revealed_at from public.discovery_activities where id = tests.v('a1')), null, 'revealed_at is set');
select is((select body from public.discovery_responses where id = tests.v('r_sam')), 'Sam''s answer',
          'Mom now sees Sam''s answer');
select is((select count(*)::int from public.discovery_prompts where activity_id = tests.v('a1')), 2,
          'and his question');
select is((select count(*)::int from public.threads where discovery_activity_id = tests.v('a1')), 1,
          'a conversation opens');
select throws_ok($$select public.submit_discovery_response(tests.v('a1'), 'changed')$$, '22023',
                 'answers are revealed and can no longer change', 'answers are final after the reveal');
select tests.logout();
select is(tests.outbox(tests.v('sam'), 'discover_revealed'), 1, 'Sam is told about the reveal');

-- An author can move a revealed answer to Trash and back.
select tests.login(tests.v('sam'));
select lives_ok($$select public.trash_discovery_response(tests.v('a1'))$$, 'Sam trashes his answer');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.discovery_responses where id = tests.v('r_sam')), 0,
          'Mom no longer sees it');
select tests.login(tests.v('sam'));
select lives_ok($$select public.restore_discovery_response(tests.v('a1'))$$, 'Sam restores it');

-- One activity a week; the next week brings the next category.
select tests.as_service();
select is(public.start_discovery_weeks(), 0, 'no second activity in the same week');
select tests.logout();
update public.discovery_activities
   set week_start = week_start - 14, closes_at = now() - interval '1 day', revealed_at = now() - interval '2 days'
 where id = tests.v('a1');
select tests.as_service();
select is(public.start_discovery_weeks(), 1, 'a new week starts a new activity');
select tests.logout();
select tests.remember('a2', (select id from public.discovery_activities
                              where relationship_id = tests.v('rel') and id <> tests.v('a1')));
select results_eq($$select sequence_no, category from public.discovery_activities where id = tests.v('a2')$$,
                  $$values (2, 'person_never_knew'::text)$$, 'the next category in order');

-- Closing: one answer alone is never revealed.
select tests.login(tests.v('sam'));
select public.submit_discovery_response(tests.v('a2'), 'only Sam answered');
select tests.logout();
update public.discovery_activities set closes_at = now() + interval '3 hours' where id = tests.v('a2');
select tests.as_service();
select is(public.enqueue_discover_closing(), 1, '"closes tonight" goes only to the person who hasn''t answered');
select is(public.enqueue_discover_closing(), 0, 'and only once');
select tests.logout();
update public.discovery_activities set closes_at = now() - interval '1 minute' where id = tests.v('a2');
select tests.login(tests.v('mom'));
select throws_ok($$select public.submit_discovery_response(tests.v('a2'), 'too late')$$, '22023',
                 'this week''s activity has closed', 'no answers after the close');
select is((select count(*)::int from public.discovery_responses where activity_id = tests.v('a2')), 0,
          'after closing, a lone answer stays visible only to its author');
select tests.login(tests.v('sam'));
select lives_ok($$select public.trash_discovery_response(tests.v('a2'))$$,
                'its author can still delete it after the close');

-- The Things We Never Asked joins after four reveals; depth can skip it.
select tests.logout();
insert into public.discovery_activities
  (relationship_id, week_start, sequence_no, category, title, theme, generation_source, closes_at, revealed_at)
select tests.v('rel'), date '2026-01-05' + 7 * i::int, 10 + i::int, c, 't', 't', 'library',
       timestamptz '2026-01-05' + interval '7 days' * (i + 1), timestamptz '2026-01-05' + interval '7 days' * i + interval '1 day'
  from unnest(array['then_vs_now', 'person_never_knew', 'through_your_eyes', 'family_stories']) with ordinality u(c, i);
select is(public.next_discovery_category(tests.v('rel')), 'things_never_asked',
          'after four reveals, The Things We Never Asked comes next');
insert into public.user_preferences (user_id, question_depth) values (tests.v('mom'), 1);
select is(public.next_discovery_category(tests.v('rel')), 'then_vs_now',
          'the lower depth setting skips the deeper categories');

-- When the library lacks the next category, the fallback still respects depth.
update public.prompt_library set active = false where category = 'then_vs_now';
select tests.logout();
delete from public.discovery_activities where id = tests.v('a2');
update public.discovery_activities set closes_at = now() - interval '1 day' where relationship_id = tests.v('rel');
select tests.as_service();
select public.start_discovery_weeks();
select tests.logout();
select ok((select public.discovery_category_depth(category) = 1 from public.discovery_activities
            where relationship_id = tests.v('rel') and closes_at > now()),
          'a depth-1 pair never falls back to a deeper category');
update public.prompt_library set active = true where category = 'then_vs_now';

-- Avoided topics apply to both people.
update public.user_preferences set avoid_topics = '{death}' where user_id = tests.v('mom');
select is((select count(*)::int from generate_series(1, 40) i,
                  lateral public.pick_discovery_prompt(tests.v('rel'), tests.v('sam'), 'then_vs_now', i::text) p
             join public.prompt_library l on l.id = p.prompt_id
            where 'death' = any (l.topic_tags)), 0,
          'Mom''s avoided topics are never asked of Sam either');

-- AI questions need someone's consent.
select tests.as_service();
select throws_ok($$select public.save_discovery_activity(tests.v('rel'), 'then_vs_now', 'AI week', 'theme',
                     jsonb_build_object(tests.v('sam'), 'q1', tests.v('mom'), 'q2'))$$,
                 '42501', null, 'no AI week without consent');

select tests.logout();
select * from finish();
rollback;
