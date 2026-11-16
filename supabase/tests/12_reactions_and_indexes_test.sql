-- Reactions have one policy per action and keep the rules they had with
-- reactions_own (migration 20261116180302). Also holds the whole schema to
-- two of Supabase's advisor rules: every foreign key has an index, and no
-- table has two permissive policies for the same role and action.
begin;
\ir _helpers.psql
select plan(15);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('mom', tests.new_user('Mom'));
select tests.remember('ana', tests.new_user('Ana'));
select tests.remember('rel', tests.pair(tests.v('sam'), tests.v('mom')));
select tests.remember('m1', tests.post(tests.v('sam'), array[tests.v('rel')]));
select tests.remember('t1', (select id from public.threads where moment_id = tests.v('m1')));

select policies_are('public', 'reactions',
  array['reactions_select', 'reactions_insert', 'reactions_update', 'reactions_delete'],
  'reactions has one policy per action');

-- Adding and changing.
select tests.login(tests.v('mom'));
select lives_ok($$insert into public.reactions (thread_id, relationship_id, reaction)
                  values (tests.v('t1'), tests.v('rel'), 'heart') returning *$$,
                'a member reacts to a post and gets the row back');
select throws_ok($$insert into public.reactions (thread_id, relationship_id, user_id, reaction)
                   values (tests.v('t1'), tests.v('rel'), tests.v('sam'), 'heart')$$,
                 '42501', null, 'nobody reacts as someone else');
select lives_ok($$insert into public.reactions (thread_id, relationship_id, reaction)
                  values (tests.v('t1'), tests.v('rel'), 'laugh')
                  on conflict (thread_id, user_id) do update set reaction = excluded.reaction$$,
                'reacting again replaces the reaction');

-- The other member sees it and can't touch it.
select tests.login(tests.v('sam'));
select results_eq($$select user_id, reaction from public.reactions where thread_id = tests.v('t1')$$,
                  $$values (tests.v('mom'), 'laugh'::text)$$,
                  'the other member sees the reaction');
update public.reactions set reaction = 'hug' where thread_id = tests.v('t1');
delete from public.reactions where thread_id = tests.v('t1');
select tests.logout();
select results_eq($$select user_id, reaction from public.reactions where thread_id = tests.v('t1')$$,
                  $$values (tests.v('mom'), 'laugh'::text)$$,
                  'nobody changes or removes someone else''s reaction');

-- Someone outside the pair.
select tests.login(tests.v('ana'));
select is_empty($$select 1 from public.reactions$$, 'someone outside the pair sees no reactions');
select throws_ok($$insert into public.reactions (thread_id, relationship_id, reaction)
                   values (tests.v('t1'), tests.v('rel'), 'heart')$$,
                 '42501', null, 'and can''t react');

-- The author changes their own.
select tests.login(tests.v('mom'));
update public.reactions set reaction = 'celebrate' where thread_id = tests.v('t1');
select is((select reaction from public.reactions where thread_id = tests.v('t1')), 'celebrate',
          'the author changes their reaction');

-- After the post is unshared from the pair, the thread can't be read, but
-- the reaction's author still sees it and can remove it (as before).
select tests.login(tests.v('sam'));
select public.unshare_moment(tests.v('m1'), tests.v('rel'));
select tests.login(tests.v('mom'));
select is((select reaction from public.reactions where thread_id = tests.v('t1')), 'celebrate',
          'after an unshare the author still sees their reaction');
select throws_ok($$update public.reactions set reaction = 'hug' where thread_id = tests.v('t1')$$,
                 '42501', null, 'but can''t change it');
select lives_ok($$delete from public.reactions where thread_id = tests.v('t1')$$,
                'and can remove it');
select tests.logout();
select is_empty($$select 1 from public.reactions where thread_id = tests.v('t1')$$, 'the reaction is gone');

-- Supabase advisor rules, for every table in public and private.
select is_empty($$
  select cl.relnamespace::regnamespace::text || '.' || cl.relname as table_name, ct.conname
    from pg_constraint ct
    join pg_class cl on cl.oid = ct.conrelid
   where ct.contype = 'f'
     and cl.relnamespace::regnamespace::text in ('public', 'private')
     and not exists (
       select 1 from pg_index i
        where i.indrelid = ct.conrelid and i.indisvalid
          and (string_to_array(i.indkey::text, ' ')::smallint[])[1:array_length(ct.conkey, 1)] = ct.conkey)
  $$,
  'every foreign key has an index led by its columns, in order (advisor: unindexed foreign keys)');

select is_empty($$
  select p.schemaname || '.' || p.tablename as table_name, r.role, c.action,
         array_agg(p.policyname order by p.policyname) as policies
    from pg_policies p
   cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) c(action)
   cross join unnest(array['anon', 'authenticated', 'authenticator', 'dashboard_user']) r(role)
   where p.schemaname in ('public', 'private')
     and p.permissive = 'PERMISSIVE'
     and p.cmd in (c.action, 'ALL')
     and (r.role = any (p.roles) or 'public' = any (p.roles))
   group by 1, 2, 3
  having count(*) > 1
  $$,
  'no table has two permissive policies for the same role and action (advisor: multiple permissive policies)');

select * from finish();
rollback;
