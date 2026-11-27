-- Twig: each person's thumbprint bird, and whether they are a parent or a son or daughter
--
-- The app draws everyone as a thumbprint bird (src/birds). What makes a bird:
--   bird_seed    the print's pattern. Random for every profile, including the
--                ones that exist already, and replaced when the person presses
--                and holds in onboarding to make a new print.
--   bird_color   one of the seven bird colours, by name, so the app can adjust
--                a shade without touching the data. Null until chosen; the app
--                then picks one from the seed.
--   bird_extra   the one thing that makes it theirs: none, headphones, flower,
--                hat, bun or glasses.
--   family_role  what they told onboarding: a parent, or a son or daughter
--                ('child'). Parents' birds are drawn a little bigger, and it
--                picks the life-stage choices. Each pair still records who is
--                the parent in relationship_members.role.
-- People who can see a profile (themselves and their pairs) can see its bird.
-- Each person can change only their own.

alter table public.profiles
  add column bird_seed   integer not null default (floor(random() * 2147483647))::integer,
  add column bird_color  text check (bird_color in ('gold', 'orange', 'rose', 'rust', 'green', 'sage', 'forest')),
  add column bird_extra  text not null default 'none'
                         check (bird_extra in ('none', 'headphones', 'flower', 'hat', 'bun', 'glasses')),
  add column family_role text check (family_role in ('parent', 'child'));

comment on column public.profiles.bird_seed is 'The thumbprint''s pattern. Same seed, same print.';
comment on column public.profiles.bird_color is 'One of the seven bird colours by name; null until chosen.';
comment on column public.profiles.family_role is 'Parent or child (a son or daughter), from onboarding. Pairs keep their own roles.';

grant update (bird_seed, bird_color, bird_extra, family_role) on public.profiles to authenticated;
