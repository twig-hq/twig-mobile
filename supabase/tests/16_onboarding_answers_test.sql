-- What onboarding's questions save (src/session/account.ts, savePreferences).
begin;
\ir _helpers.psql
select plan(6);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('eve', tests.new_user('Eve'));
select tests.login(tests.v('sam'));

insert into public.user_preferences (life_stage, question_depth, avoid_topics, avoid_phrases, completed_at)
values ('working', 1, array['politics', 'money'], array['my job search', 'my ex'], now());
select is((select row(life_stage, question_depth, avoid_topics, avoid_phrases)::text
             from public.user_preferences where user_id = tests.v('sam')),
          '(working,1,"{politics,money}","{""my job search"",""my ex""}")',
          'a person saves their answers, typed topics included');

update public.user_preferences set avoid_phrases = array['my new job'] where user_id = tests.v('sam');
select is((select avoid_phrases from public.user_preferences where user_id = tests.v('sam')), array['my new job'],
          'and can change their typed topics');

select throws_ok($$update public.user_preferences set question_depth = 4 where user_id = tests.v('sam')$$, '23514',
                 null, 'how personal is 1, 2 or 3');
select throws_ok(
  $$update public.user_preferences set avoid_phrases = array_fill('x'::text, array[21]) where user_id = tests.v('sam')$$,
  '23514', null, 'at most 20 typed topics');

select tests.login(tests.v('eve'));
select is((select count(*)::int from public.user_preferences where user_id = tests.v('sam')), 0,
          'nobody else can read them, not even the other person in a pair');
select tests.logout();
select is((select count(*)::int from public.user_preferences), 1, 'only Sam has preferences');

select * from finish();
rollback;
