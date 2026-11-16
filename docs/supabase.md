# Supabase

Twig's backend is one Supabase project, "Twig" (us-east-1, Postgres 17, Free plan). This repository is the source of truth for its schema: every change goes through a pull request and is deployed by CI.

## How a database change reaches the project

1. Create a migration: `npx supabase migration new <what_it_does>`, then write the SQL in the new file under `supabase/migrations/`.
2. Add or update pgTAP tests in `supabase/tests/` for every rule it changes.
3. Regenerate the app's types: `npx supabase gen types typescript --remote --schema public > src/lib/database.types.ts`.
4. Open a pull request. The **Migrations and pgTAP tests** check applies every migration to a fresh Supabase stack and runs the tests. `main` only accepts pull requests that pass it.
5. Merge. On `main`, the **Deploy migrations to Supabase** job runs the tests again, then applies the new migrations to the project.

Rules:

- Never run `supabase db push` against the hosted project by hand; CI does it.
- Never edit a migration that is already deployed. Fix forward with a new one.
- Never put the service role key, secret API keys, the database password or access tokens in the repository, an issue, a pull request or Discord. GitHub's push protection blocks known key formats, but don't rely on it.

## Secrets and where they live

| What | Where |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | GitHub, `production` environment secret. A scoped Supabase access token (see "The deploy token" below). Only workflows on `main` can read it. |
| `SUPABASE_PROJECT_REF` | GitHub, `production` environment variable. Not secret. |
| Database password | A password manager. CI doesn't need it. |
| Service role / secret API key | Edge Function secrets only (`npx supabase secrets set`), never in the app or the repository. |
| Publishable (anon) key | The app's environment (`EXPO_PUBLIC_…`). Safe to ship: row-level security protects the data. |

### The deploy token

Create it in the Supabase dashboard under Account → Access Tokens → Generate token, for the Twig project only if the page offers a choice. Give it only what `supabase db push` needs (`npx supabase db push --help` lists them under PERMISSIONS):

| Permission on the token page | Set to | CLI scope |
| --- | --- | --- |
| Database | Read-write | `database_write` |
| Connection Pooling | Read | `database_pooling_config_read` |
| Projects (account-wide) | Read | `projects_read` |
| Everything else | None | |

Check the token with a dry run before storing it. From the repository root, this asks for the token without echoing it or saving it to shell history, and stores it in GitHub only if the dry run succeeds:

```bash
printf 'Paste the token: '; read -rs T; echo; SUPABASE_ACCESS_TOKEN="$T" npx --yes supabase@3.1.0 db push --remote="$(gh variable get SUPABASE_PROJECT_REF --env production -R twig-hq/twig-mobile)" --dry-run && printf %s "$T" | gh secret set SUPABASE_ACCESS_TOKEN --env production -R twig-hq/twig-mobile; unset T
```

If a token or key leaks: revoke it in the Supabase dashboard first, then create a new one and store it the same way.

## Project settings not yet managed from the repo

`supabase/config.toml` currently holds local-development values, so **don't run `supabase config push`** against the hosted project: it would overwrite hosted auth settings with local ones. Hosted settings are changed in the dashboard until the sign-in work is done, then moved into `config.toml` (with a `[remotes]` block for hosted values) and pushed deliberately. `npx supabase config diff` shows the differences without changing anything.

| Setting | Hosted now (November 16, 2026) | Planned |
| --- | --- | --- |
| Site URL, redirect URLs | `http://localhost:3000`, none | The app's URL scheme once the Expo app exists |
| Email sign-in | Supabase's built-in sender: 2 emails an hour, team members only | Custom SMTP on a domain we own |
| Email code length | 8 | Decide: 6 is easier for parents to type |
| Sign in with Apple, Google | Off | On, after the Apple Developer account and Google client exist |
| Database SSL enforcement | Off | On |
| Network restrictions | Open | Stay open: CI deploys from GitHub's runners |
| Backups | None on Free | Decide before the first beta invite: Pro, or our own scheduled backup |
