-- Trash and restore, the 30-day purge, its permissions, and Storage cleanup
-- (Architecture section 12, Figure 9).
begin;
\ir _helpers.psql
select plan(21);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('rel', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));

-- A photo Moment with a reply.
select tests.remember('img', tests.upload(tests.v('sam')));
select tests.login(tests.v('sam'));
insert into public.moments (body) values ('beach day');
select tests.remember('m1', (select id from public.moments where body = 'beach day'));
insert into public.moment_media (moment_id, media_id, position) values (tests.v('m1'), tests.v('img'), 0);
select public.publish_moment(tests.v('m1'), array[tests.v('rel')]);
select tests.login(tests.v('mom'));
insert into public.messages (thread_id, relationship_id, body)
select id, relationship_id, 'Looks fun!' from public.threads where moment_id = tests.v('m1');

-- Trash and restore.
select throws_ok($$select public.trash_moment(tests.v('m1'))$$, 'P0002', 'moment not found',
                 'only the author can trash a Moment');
select tests.login(tests.v('sam'));
select lives_ok($$select public.trash_moment(tests.v('m1'))$$, 'Sam moves it to Trash');
select is((select count(*)::int from public.moments where id = tests.v('m1')), 0,
          'a trashed Moment disappears from normal reads, even for its author');
select is((select item_id from public.my_trash()), tests.v('m1'), 'it is listed in Trash');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments where id = tests.v('m1')), 0, 'Mom no longer sees it');
select tests.login(tests.v('sam'));
select lives_ok($$select public.restore_moment(tests.v('m1'))$$, 'Sam restores it');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.messages m join public.threads t on t.id = m.thread_id
            where t.moment_id = tests.v('m1')), 1, 'restored with its conversation');

-- After 30 days it can't be restored, and the purge removes it everywhere.
select tests.login(tests.v('sam'));
select public.trash_moment(tests.v('m1'));
select tests.logout();
update public.moments set deleted_at = now() - interval '31 days' where id = tests.v('m1');
select tests.login(tests.v('sam'));
select throws_ok($$select public.restore_moment(tests.v('m1'))$$, 'P0002',
                 'this item is no longer in Trash', 'no restoring after 30 days');
select throws_ok($$select public.purge_trash()$$, '42501', null, 'the app can''t run the purge');

-- Things the purge must leave alone or catch.
select tests.logout();
insert into public.moments (author_id, body) values (tests.v('sam'), 'keep me');
select tests.remember('m_keep', (select id from public.moments where body = 'keep me'));
insert into public.moment_media (moment_id, media_id, position)
select tests.v('m_keep'), tests.upload(tests.v('sam')), 0;
select tests.login(tests.v('sam'));
select public.publish_moment(tests.v('m_keep'), array[tests.v('rel')]);
select tests.logout();
select tests.remember('shared_img', (select media_id from public.moment_media where moment_id = tests.v('m_keep')));
insert into public.moments (author_id, body, deleted_at) values (tests.v('sam'), 'recent trash', now() - interval '29 days');
insert into public.media (owner_id, kind, created_at) values (tests.v('sam'), 'image', now() - interval '3 days');
select tests.remember('stale', (select id from public.media where owner_id = tests.v('sam') and status = 'pending'));
insert into public.export_jobs (requested_by, scope, status, storage_path, expires_at)
values (tests.v('sam'), 'my_content', 'ready', tests.v('sam')::text || '/export.zip', now() - interval '1 day');

select tests.as_service();
select is(public.purge_trash(), 1, 'the purge removes the one Moment past 30 days');
select tests.logout();
select is((select count(*)::int from public.moments where id = tests.v('m1')), 0, 'the Moment is gone');
select is((select count(*)::int from public.threads where moment_id = tests.v('m1')), 0, 'its conversation is gone');
select is((select count(*)::int from public.media where id = tests.v('img')), 0, 'its photo record is gone');
select is((select count(*)::int from public.storage_deletions
            where storage_path = tests.v('sam')::text || '/' || tests.v('img')::text and bucket_id = 'media'), 1,
          'its file is queued for removal from Storage');
select is((select count(*)::int from public.moments where body = 'recent trash'), 1,
          'something trashed 29 days ago stays');
select is((select count(*)::int from public.media where id = tests.v('shared_img')), 1,
          'a file still in use stays');
select is((select count(*)::int from public.media where id = tests.v('stale')), 0,
          'an upload abandoned for days is cleaned up');
select is((select status from public.export_jobs where requested_by = tests.v('sam')), 'expired',
          'an expired export is marked expired');
select is((select count(*)::int from public.storage_deletions where bucket_id = 'exports'), 1,
          'and its zip is queued for removal');

-- Discover answers in Trash for 30 days go too.
insert into public.discovery_responses (activity_id, user_id, body, status, submitted_at, deleted_at)
select a.id, tests.v('sam'), 'old answer', 'submitted', now(), now() - interval '31 days'
  from public.discovery_activities a where a.relationship_id = tests.v('rel');
select tests.as_service();
select is(public.purge_trash(), 1, 'a Discover answer trashed 30 days ago is purged');
select tests.logout();
select is((select count(*)::int from public.discovery_responses where body = 'old answer'), 0, 'it is gone');

select * from finish();
rollback;
