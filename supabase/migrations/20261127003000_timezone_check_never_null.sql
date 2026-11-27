-- Twig: a new account without a time zone gets UTC, as intended
--
-- is_valid_timezone(NULL) returned NULL, not false. handle_new_user only
-- falls back to UTC when the check says false, so a sign-up that sent no
-- time zone (the app's email sign-in, until now) tried to store NULL and
-- failed with "null value in column timezone of relation profiles". The
-- sign-up was rolled back and the person saw an error.
--
-- The check now answers false for NULL. Its answer for every other value is
-- unchanged, so the CHECK constraints that use it accept and reject the same
-- rows as before. set_relationship_timezone(…, NULL) now raises its own
-- "unknown timezone" error instead of failing on the NOT NULL column.

create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    tz = 'UTC'
    or (tz like '%/%' and exists (select 1 from pg_catalog.pg_timezone_names where name = tz)),
    false);
$$;
