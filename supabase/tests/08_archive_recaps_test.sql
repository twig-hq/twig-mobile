-- The Archive (saves, Archive-only memories, revealed activities, dates at
-- any precision) and monthly recaps in the pair's timezone (section 8).
begin;
\ir _helpers.psql
select plan(18);

select tests.remember('sam', tests.new_user('Sam', 'America/Los_Angeles'));
select tests.remember('mom', tests.new_user('Mom', 'America/Los_Angeles'));
select tests.remember('rel', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));

-- An Archive-only memory from 1998.
select tests.login(tests.v('sam'));
insert into public.moments (body, surface, happened_on, happened_precision)
values ('our first apartment', 'archive', '1998-01-01', 'year');
select tests.remember('mem', (select id from public.moments where body = 'our first apartment'));
select public.publish_moment(tests.v('mem'), array[tests.v('rel')]);
select throws_ok($$insert into public.moments (body, happened_on, happened_precision) values ('x', '1998-03-04', 'year')$$,
                 '23514', null, 'a year-precision date must be 1 January');
select lives_ok($$insert into public.moments (body, happened_on, happened_precision) values ('x', '1990-01-01', 'decade')$$,
                'a decade is fine');

select tests.remember('feed', tests.post(tests.v('sam'), array[tests.v('rel')], 'lunch'));
select tests.login(tests.v('mom'));
select results_eq($$select item_id, sort_date from public.archive_items(tests.v('rel'))$$,
                  $$values (tests.v('mem'), date '1998-01-01')$$,
                  'the Archive holds the memory at its own date, not the feed post');
select is((select count(*)::int from public.home_feed() where moment_id = tests.v('mem')), 0,
          'Archive-only memories never appear on Home');

-- Saves are per person.
select public.save_moment(tests.v('feed'), tests.v('rel'));
select tests.login(tests.v('sam'));
select public.save_moment(tests.v('feed'), tests.v('rel'));
select is((select cardinality(saved_by) from public.archive_items(tests.v('rel')) where item_id = tests.v('feed')), 2,
          'both saved the post');
select tests.login(tests.v('mom'));
select public.unsave_moment(tests.v('feed'), tests.v('rel'));
select is((select saved_by from public.archive_items(tests.v('rel')) where item_id = tests.v('feed')),
          array[tests.v('sam')], 'unsaving mine leaves yours');
select is((select sort_date from public.archive_items(tests.v('rel')) where item_id = tests.v('feed')),
          (now() at time zone 'America/Los_Angeles')::date,
          'without its own date, an item sits at the day it was first shared');

-- Revealed activities join the Archive.
select tests.login(tests.v('sam'));
select public.submit_discovery_response(id, 'a') from public.discovery_activities where relationship_id = tests.v('rel');
select tests.login(tests.v('mom'));
select public.submit_discovery_response(id, 'b') from public.discovery_activities where relationship_id = tests.v('rel');
select is((select count(*)::int from public.archive_items(tests.v('rel'), p_item_type => 'discovery')), 1,
          'a revealed activity is in the Archive');
select is((select count(*)::int from public.archive_items(tests.v('rel'), p_category => 'then_vs_now')), 1,
          'filter by category');
select is((select count(*)::int from public.archive_items(tests.v('rel'), p_from => '2000-01-01')), 2,
          'filter by date');

-- Unsharing removes it from the pair's Archive.
select tests.login(tests.v('sam'));
select public.unshare_moment(tests.v('feed'), tests.v('rel'));
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.archive_items(tests.v('rel'), p_item_type => 'moment')), 1,
          'an unshared save leaves the Archive');

-- Recaps.
select tests.logout();
select tests.remember('photo', tests.upload(tests.v('sam')));
select tests.login(tests.v('sam'));
insert into public.moments (body) values ('october photo');
select tests.remember('oct', (select id from public.moments where body = 'october photo'));
insert into public.moment_media (moment_id, media_id, position) values (tests.v('oct'), tests.v('photo'), 0);
select public.publish_moment(tests.v('oct'), array[tests.v('rel')]);
select tests.remember('trashed', tests.post(tests.v('sam'), array[tests.v('rel')], 'trashed later'));
select tests.login(tests.v('sam'));
select public.trash_moment(tests.v('trashed'));
select tests.logout();
-- 06:30 UTC on 1 November is 23:30 on 31 October in Los Angeles.
update public.moment_shares set first_shared_at = '2026-11-01 06:30+00' where moment_id = tests.v('oct');
update public.moment_shares set first_shared_at = '2026-11-01 06:30+00' where moment_id = tests.v('trashed');

select tests.login(tests.v('mom'));
select is((public.monthly_recap(tests.v('rel'), '2026-10-01') ->> 'moments_shared')::int, 1,
          'a share at 23:30 on 31 October local time counts in October');
select is((public.monthly_recap(tests.v('rel'), '2026-10-01') ->> 'photos')::int, 1, 'with its photo');
select is((public.monthly_recap(tests.v('rel'), '2026-11-01') -> 'moment_ids') ? tests.v('oct')::text, false,
          'and not in November');
select is((public.monthly_recap(tests.v('rel'), '2026-10-01') -> 'moment_ids') ? tests.v('trashed')::text, false,
          'deleted items never come back in a recap');
select tests.login(tests.v('mom'));
select lives_ok($$insert into public.monthly_recap_views (relationship_id, recap_month) values (tests.v('rel'), '2026-10-01')$$,
                'opening a recap hides its Home card');
select tests.remember('stranger', tests.new_user('Stranger'));
select tests.login(tests.v('stranger'));
select throws_ok($$select public.monthly_recap(tests.v('rel'), '2026-10-01')$$, 'P0002', null,
                 'outsiders can''t read a recap');

-- The person who withdrew sees only their own items.
select tests.login(tests.v('mom'));
select public.end_relationship(tests.v('rel'), true);
select is((select count(*)::int from public.archive_items(tests.v('rel'))), 0,
          'Mom withdrew: none of Sam''s memories or the activities stay with her');

select tests.logout();
select * from finish();
rollback;
