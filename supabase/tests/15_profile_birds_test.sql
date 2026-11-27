-- Each person's bird (20261127120000_profile_birds.sql).
begin;
\ir _helpers.psql
select plan(8);

select tests.remember('sam', tests.new_user('Sam'));
select tests.remember('eve', tests.new_user('Eve'));

select isnt((select bird_seed from public.profiles where id = tests.v('sam')), null,
            'a new profile gets a print pattern straight away');
select isnt((select bird_seed from public.profiles where id = tests.v('sam')),
            (select bird_seed from public.profiles where id = tests.v('eve')),
            'two people get different prints');
select is((select bird_extra from public.profiles where id = tests.v('sam')), 'none',
          'and no extra until they choose one');

select tests.login(tests.v('sam'));
update public.profiles
   set bird_seed = 42, bird_color = 'gold', bird_extra = 'headphones', family_role = 'child'
 where id = tests.v('sam');
select is((select row(bird_seed, bird_color, bird_extra, family_role)::text from public.profiles where id = tests.v('sam')),
          '(42,gold,headphones,child)', 'a person can make their own bird');

select throws_ok($$update public.profiles set bird_color = 'purple' where id = tests.v('sam')$$, '23514', null,
                 'only the seven bird colours are allowed');
select throws_ok($$update public.profiles set bird_extra = 'crown' where id = tests.v('sam')$$, '23514', null,
                 'only the six extras are allowed');
select throws_ok($$update public.profiles set family_role = 'aunt' where id = tests.v('sam')$$, '23514', null,
                 'a family role is parent or child');

update public.profiles set bird_color = 'rust' where id = tests.v('eve');
select tests.logout();
select isnt((select bird_color from public.profiles where id = tests.v('eve')), 'rust',
            'nobody can change someone else''s bird');

select * from finish();
rollback;
