-- A new login always gets a profile with a valid time zone, whatever the
-- sign-up sent (20261127003000_timezone_check_never_null.sql).
begin;
\ir _helpers.psql
select plan(7);

select is(public.is_valid_timezone(null), false, 'no time zone is not a valid time zone');
select is(public.is_valid_timezone('UTC'), true, 'UTC is valid');
select is(public.is_valid_timezone('Europe/Paris'), true, 'a named zone is valid');
select is(public.is_valid_timezone('PST'), false, 'an abbreviation is not');

create function tests.signup_timezone(p_meta jsonb) returns text language plpgsql as $$
declare
  v_auth uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_auth, left(v_auth::text, 8) || '@example.test', p_meta);
  return (select timezone from public.profiles where auth_user_id = v_auth);
end;
$$;

select is(tests.signup_timezone('{}'::jsonb), 'UTC',
          'a sign-up with no time zone (as email sign-in used to send) gets UTC');
select is(tests.signup_timezone('{"timezone": "PST"}'::jsonb), 'UTC',
          'a sign-up with an unknown time zone gets UTC');
select is(tests.signup_timezone('{"timezone": "America/Los_Angeles"}'::jsonb), 'America/Los_Angeles',
          'a sign-up with a real time zone keeps it');

select * from finish();
rollback;
