-- What the app does as soon as someone signs in (src/session/account.ts):
-- read their own profile and onboarding state, bring the time zone up to
-- date, and mark onboarding finished, all as the signed-in person.
begin;
\ir _helpers.psql
select plan(9);

select tests.remember('sam', tests.new_user('Sam', 'UTC'));
select tests.remember('eve', tests.new_user('Eve'));
select tests.login(tests.v('sam'));

select is((select id from public.profiles where auth_user_id = auth.uid()), tests.v('sam'),
          'a signed-in person can read their own profile by their login');
select is((select count(*)::int from public.user_preferences where user_id = tests.v('sam')), 0,
          'a new person has no preferences yet, which the app reads as "not onboarded"');

update public.profiles set timezone = 'America/Toronto' where id = tests.v('sam');
select is((select timezone from public.profiles where id = tests.v('sam')), 'America/Toronto',
          'they can bring their time zone up to date');
select throws_ok($$update public.profiles set timezone = 'PST' where id = tests.v('sam')$$, '23514', null,
                 'an unknown time zone is refused');

-- setOnboarded: an update that finds no row, then an insert
update public.user_preferences set completed_at = now() where user_id = tests.v('sam');
insert into public.user_preferences (completed_at) values (now());
select ok((select completed_at is not null from public.user_preferences where user_id = tests.v('sam')),
          'finishing onboarding creates their preferences, owned by them');
update public.user_preferences set completed_at = null where user_id = tests.v('sam');
select ok((select completed_at is null from public.user_preferences where user_id = tests.v('sam')),
          'and can be undone (the development "show onboarding again")');

select is((select count(*)::int from public.profiles where id = tests.v('eve')), 0,
          'they cannot read a stranger''s profile');
update public.profiles set timezone = 'Europe/Paris' where id = tests.v('eve');
select tests.logout();
select isnt((select timezone from public.profiles where id = tests.v('eve')), 'Europe/Paris',
            'nor change a stranger''s time zone');
select tests.login(tests.v('sam'));
select throws_ok($$insert into public.user_preferences (user_id, completed_at) values (tests.v('eve'), now())$$,
                 '42501', null, 'nor mark a stranger as onboarded');

select * from finish();
rollback;
