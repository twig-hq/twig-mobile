-- Twig: a public bucket for the pictures in the sign-in emails
--
-- Email apps only show pictures that are on the public web, so the stamp, the
-- signature birds and the logo in the two sign-in emails (emails/ in this
-- repo) are served from here.
--
-- Public means anyone with a picture's address can fetch it. There is no
-- policy on storage.objects for this bucket, so nobody can list it, and only
-- the dashboard or a secret key can add, replace or remove pictures. It takes
-- PNGs up to 1 MB and nothing else.
--
-- Pictures live under a version folder (email/v1/…) and are cached for a
-- year. Changed pictures go in a new folder, and the emails are rebuilt with
-- that address (docs/supabase.md, "Sign-in settings").

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('email', 'email', true, 1048576, array['image/png'])
on conflict (id) do nothing;
