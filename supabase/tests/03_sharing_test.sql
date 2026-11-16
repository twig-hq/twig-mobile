-- Store once, share by grant: feed visibility, one conversation per share,
-- unshare and re-share, media ownership and limits, Storage downloads.
begin;
\ir _helpers.psql
select plan(40);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('dad', tests.new_user('Dad'));
select tests.remember('eve', tests.new_user('Eve'));
select tests.remember('rel_mom', tests.pair(tests.v('sam'), tests.v('mom'), 'child', 'Mom'));
select tests.remember('rel_dad', tests.pair(tests.v('sam'), tests.v('dad'), 'child', 'Dad'));
select tests.remember('rel_eve', tests.pair(tests.v('eve'), tests.v('mom'), 'child', 'Mom'));

-- A draft is private.
select tests.login(tests.v('sam'));
insert into public.moments (body) values ('first day at the new job');
select tests.remember('m1', (select id from public.moments where body = 'first day at the new job'));
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments where id = tests.v('m1')), 0, 'Mom can''t see Sam''s draft');

-- Publish to both parents.
select tests.login(tests.v('sam'));
select lives_ok($$select public.publish_moment(tests.v('m1'), array[tests.v('rel_mom'), tests.v('rel_dad')])$$,
                'Sam publishes to Mom and Dad');
select is((select status from public.moments where id = tests.v('m1')), 'published', 'it is published');
select is((select count(*)::int from public.moment_shares where moment_id = tests.v('m1')), 2,
          'the author sees both grants');
select tests.logout();
select is(tests.outbox(tests.v('dad'), 'moment_shared'), 1, 'Dad gets one push for the new Moment');
select tests.login(tests.v('sam'));
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments where id = tests.v('m1')), 1, 'Mom sees it');
select is((select count(*)::int from public.moment_shares where moment_id = tests.v('m1')), 1,
          'Mom sees only her own grant');
select is((select count(*)::int from public.threads where moment_id = tests.v('m1')), 1,
          'Mom sees only her conversation');
select tests.remember('t_mom', (select id from public.threads where moment_id = tests.v('m1')));
insert into public.messages (thread_id, relationship_id, body)
values (tests.v('t_mom'), tests.v('rel_mom'), 'So proud of you!');
select tests.login(tests.v('dad'));
select is((select count(*)::int from public.moments where id = tests.v('m1')), 1, 'Dad sees it');
select tests.remember('t_dad', (select id from public.threads where moment_id = tests.v('m1')));
select isnt(tests.v('t_dad'), tests.v('t_mom'), 'Dad has a separate conversation');
select is((select count(*)::int from public.messages where thread_id = tests.v('t_mom')), 0,
          'Dad never sees Mom''s replies');
select tests.login(tests.v('eve'));
select is((select count(*)::int from public.moments where id = tests.v('m1')), 0,
          'Eve, who shares a pair with Mom but not Sam, sees nothing');
select tests.login(tests.v('sam'));
select is((select count(*)::int from public.messages where thread_id = tests.v('t_mom')), 1,
          'Sam sees Mom''s reply');

-- The feed shows it once, with a conversation per pair.
select is((select jsonb_array_length(shares) from public.home_feed() where moment_id = tests.v('m1')), 2,
          'Sam''s feed shows it once with two conversations');
select is((select count(*)::int from public.home_feed(array[tests.v('rel_dad')])), 1,
          'filtering Home by Dad still finds it');
select tests.login(tests.v('mom'));
select is((select jsonb_array_length(shares) from public.home_feed() where moment_id = tests.v('m1')), 1,
          'Mom''s feed shows one conversation');

-- Unshare from Dad, then share again.
select tests.login(tests.v('sam'));
select lives_ok($$select public.unshare_moment(tests.v('m1'), tests.v('rel_dad'))$$, 'Sam unshares from Dad');
select tests.login(tests.v('dad'));
select is((select count(*)::int from public.moments where id = tests.v('m1')), 0, 'Dad no longer sees it');
select is((select count(*)::int from public.threads where id = tests.v('t_dad')), 0, 'nor its conversation');
select tests.login(tests.v('mom'));
select is((select count(*)::int from public.moments where id = tests.v('m1')), 1, 'Mom still sees it');
select tests.login(tests.v('sam'));
select lives_ok($$select public.publish_moment(tests.v('m1'), array[tests.v('rel_dad')])$$, 'Sam shares again');
select tests.login(tests.v('dad'));
select is((select id from public.threads where moment_id = tests.v('m1')), tests.v('t_dad'),
          'sharing again restores the same conversation');
select tests.logout();
select is(tests.outbox(tests.v('dad'), 'moment_shared'), 0,
          'unsharing dropped the unsent push, and sharing again doesn''t push again');

-- Grants change only through functions.
select tests.login(tests.v('sam'));
select throws_ok(
  $$insert into public.moment_shares (moment_id, relationship_id) values (tests.v('m1'), tests.v('rel_eve'))$$,
  '42501', null, 'the app can''t write grants directly');
select throws_ok($$select public.publish_moment(tests.v('m1'), array[tests.v('rel_eve')])$$, '42501',
                 'you can only share into an active relationship you are in',
                 'no sharing into someone else''s pair');
select throws_ok($$insert into public.moments (author_id, body) values (tests.v('mom'), 'forged')$$,
                 '42501', null, 'no posting as someone else');
select throws_ok($$update public.moments set status = 'draft' where id = tests.v('m1')$$,
                 '42501', null, 'status changes only through functions');

-- Editing a published Moment marks it edited.
update public.moments set body = 'first week at the new job' where id = tests.v('m1');
select isnt((select edited_at from public.moments where id = tests.v('m1')), null, 'edits set edited_at');

-- An empty Moment can't be published.
insert into public.moments (body) values (null);
select tests.remember('empty', (select id from public.moments where author_id = tests.v('sam') and body is null));
select throws_ok($$select public.publish_moment(tests.v('empty'))$$, '22023',
                 'a Moment needs a note, a photo or a voice note', 'an empty Moment is refused');

-- Media: own files only, ready before publishing, 5 photos and 1 voice note.
select tests.logout();
select tests.remember('img_mom', tests.upload(tests.v('mom')));
select tests.login(tests.v('sam'));
insert into public.moments (body) values ('photos');
select tests.remember('m2', (select id from public.moments where body = 'photos'));
select throws_ok($$insert into public.moment_media (moment_id, media_id, position) values (tests.v('m2'), tests.v('img_mom'), 0)$$,
                 '42501', null, 'no attaching someone else''s file');
insert into public.media (kind, mime_type) values ('image', 'image/jpeg');
select tests.remember('pending', (select id from public.media where owner_id = tests.v('sam') and status = 'pending'));
insert into public.moment_media (moment_id, media_id, position) values (tests.v('m2'), tests.v('pending'), 0);
select throws_ok($$select public.publish_moment(tests.v('m2'), array[tests.v('rel_mom')])$$, '22023',
                 'files are still uploading', 'pending files block publishing');
select throws_ok($$update public.media set status = 'ready' where id = tests.v('pending')$$, '22023',
                 null, 'a file is ready only once it is in Storage');
delete from public.moment_media where moment_id = tests.v('m2');
select tests.logout();
insert into public.moment_media (moment_id, media_id, position)
select tests.v('m2'), tests.upload(tests.v('sam')), i from generate_series(0, 5) i;
select tests.login(tests.v('sam'));
select throws_ok($$select public.publish_moment(tests.v('m2'), array[tests.v('rel_mom')])$$, '22023',
                 'a Moment holds up to 5 photos and one voice note', 'six photos are refused');
delete from public.moment_media where moment_id = tests.v('m2') and position = 5;
select lives_ok($$select public.publish_moment(tests.v('m2'), array[tests.v('rel_mom')])$$, 'five photos are fine');
select tests.remember_text('photo_path', (select md.storage_path from public.moment_media mm
  join public.media md on md.id = mm.media_id where mm.moment_id = tests.v('m2') and mm.position = 0));

-- Storage: downloads follow the content.
select tests.login(tests.v('mom'));
select is((select count(*)::int from storage.objects where name = tests.t('photo_path')), 1,
          'Mom can download a photo shared with her');
select tests.login(tests.v('dad'));
select is((select count(*)::int from storage.objects where name = tests.t('photo_path')), 0,
          'Dad can''t download a photo not shared with him');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('media', tests.v('sam')::text || '/' || gen_random_uuid())$$,
                 '42501', null, 'no uploading into someone else''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('media', tests.v('dad')::text || '/' || gen_random_uuid())$$,
                 '42501', null, 'no uploading to a path that wasn''t registered');

-- Saves point at the share.
select tests.login(tests.v('mom'));
select lives_ok($$select public.save_moment(tests.v('m1'), tests.v('rel_mom'))$$, 'Mom saves the Moment');
select tests.login(tests.v('dad'));
select throws_ok($$select public.save_moment(tests.v('m1'), tests.v('rel_mom'))$$, 'P0002',
                 'moment not found', 'Dad can''t save into Mom''s pair');

select tests.logout();
select * from finish();
rollback;
