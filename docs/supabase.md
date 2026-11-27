# Supabase

Twig's backend is two Supabase projects in the Twig organization, both us-east-1, Postgres 17, Free plan. This repository is the source of truth for their schema: every change goes through a pull request and is deployed by CI, to both.

| Project | GitHub environment | Used for |
| --- | --- | --- |
| **Twig** | `production` | Real families. Store builds of the app. |
| **Twig Dev** | `dev` | Test data only. Development builds of the app, trying hosted settings (sign-in providers, email, deep links, push) before production, and a first run of every migration on a database that already has data in it. |

Never copy real people's data into Twig Dev, and never point a development build at Twig. A free project pauses after about a week without activity; resume it from the dashboard.

## How a database change reaches the project

1. Create a migration: `npx supabase migration new <what_it_does>`, then write the SQL in the new file under `supabase/migrations/`.
2. Add or update pgTAP tests in `supabase/tests/` for every rule it changes.
3. Regenerate the app's types: `npx supabase gen types typescript --remote --schema public > src/lib/database.types.ts`.
4. Open a pull request. The **Migrations and pgTAP tests** check applies every migration to a fresh Supabase stack and runs the tests. `main` only accepts pull requests that pass it.
5. Merge. On `main`, the tests run again, then **Deploy migrations to Twig Dev** applies the new migrations to Twig Dev and, only if that succeeds, **Deploy migrations to Twig (production)** applies them to Twig. If the dev deploy fails, fix forward with a new migration; production is untouched until dev passes.

Rules:

- GitHub Actions is the only thing that deploys to either project. Supabase's GitHub integration is connected to this repository for Twig only (production branch `main`), but its **Deploy to production** and automatic preview branches stay off (dashboard: Project Settings → Integrations → GitHub). With Deploy to production on, every merge would be applied twice, once without waiting for the tests. Its **Supabase Preview** check on pull requests is skipped for that reason.
- Never run `supabase db push` against either hosted project by hand; CI does it.
- Never edit a migration that is already deployed. Fix forward with a new one.
- Never put secret API keys, the database password or access tokens in the repository, an issue, a pull request or Discord. GitHub's push protection blocks known key formats, but don't rely on it.
- Check what a Supabase CLI command prints before running it anywhere the output is kept (CI logs, shared terminals, AI sessions). `supabase branches get` prints the project's API keys; use `supabase branches list` instead.

## Secrets and where they live

| What | Where |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | GitHub, one secret on each of the `dev` and `production` environments: a scoped Supabase access token for that environment's project (see "The deploy tokens" below). Only workflows on `main` can read them. |
| `SUPABASE_PROJECT_REF` | GitHub, a variable on each of the `dev` and `production` environments. Not secret. |
| Database passwords | A password manager, one per project. CI doesn't need them. |
| Secret API keys (`sb_secret_…`) | Each project's Edge Function secrets only (`npx supabase secrets set`), never in the app or the repository. |
| Publishable keys (`sb_publishable_…`) | The app's environment (`EXPO_PUBLIC_…`): Twig Dev's in development builds, Twig's in store builds. Safe to ship: row-level security protects the data. |
| Legacy `anon` and `service_role` keys | Disabled. Use the publishable and secret keys above. |

### The deploy tokens

Each environment has its own token, limited to its own project, so a leaked dev token can't touch production. Create each in the Supabase dashboard under Account → Access Tokens → Generate token, choosing only that environment's project if the page offers a choice. Give it only what `supabase db push` needs (`npx supabase db push --help` lists them under PERMISSIONS):

| Permission on the token page | Set to | CLI scope |
| --- | --- | --- |
| Database | Read-write | `database_write` |
| Connection Pooling | Read | `database_pooling_config_read` |
| Projects (account-wide) | Read | `projects_read` |
| Everything else | None | |

Check a token with a dry run before storing it. From the repository root, set `E` to the environment (`dev` or `production`) and run this. It asks for the token without echoing it or saving it to shell history, and stores it in GitHub only if the dry run succeeds:

```bash
E=dev; printf 'Paste the token: '; read -rs T; echo; SUPABASE_ACCESS_TOKEN="$T" npx --yes supabase@3.1.0 db push --remote="$(gh variable get SUPABASE_PROJECT_REF --env "$E" -R twig-hq/twig-mobile)" --dry-run && printf %s "$T" | gh secret set SUPABASE_ACCESS_TOKEN --env "$E" -R twig-hq/twig-mobile; unset T
```

If a token or key leaks: revoke it in the Supabase dashboard first, then create a new one and store it the same way.

## Project settings not yet managed from the repo

`supabase/config.toml` currently holds local-development values, so **don't run `supabase config push`** against either hosted project: it would overwrite hosted auth settings with local ones. Hosted settings are changed in the dashboard, on Twig Dev first, until the sign-in work is done, then moved into `config.toml` (with a `[remotes]` block for hosted values) and pushed deliberately. `npx supabase config diff` shows the differences without changing anything.

Twig (production):

| Setting | Hosted now (November 16, 2026) | Planned |
| --- | --- | --- |
| Site URL, redirect URLs | `http://localhost:3000`, none | The app's URL scheme once the Expo app exists |
| Email sign-in | Supabase's built-in sender: 2 emails an hour, team members only | Custom SMTP on a domain we own |
| Email code length | 8 | 6, decided November 24, 2026 (see "Sign-in settings" below) |
| Sign in with Apple, Google | Off | On, after the Apple Developer account and Google client exist |
| Database SSL enforcement | Off | On |
| Network restrictions | Open | Stay open: CI deploys from GitHub's runners |
| Legacy API keys (`anon`, `service_role`) | Disabled | Stay disabled |
| GitHub integration | Connected, production branch `main`; Deploy to production off; preview branches off | Stay off: GitHub Actions deploys. Preview branches are billed per branch |
| Backups | None on Free | Decide before the first beta invite: Pro, or our own scheduled backup |

Twig Dev differs from the table above only where it says so here (November 23, 2026):

| Setting | Twig Dev | Why |
| --- | --- | --- |
| GitHub integration | Not connected | GitHub Actions deploys |
| Legacy API keys (`anon`, `service_role`) | Enabled; to be disabled, as on Twig | New projects start with them on; nothing uses them |
| Backups | None, and none planned | Test data only |

## Sign-in settings

The app signs people in with a code sent by email (`src/auth/emailCode.ts`). Three numbers in that file must match the project, and the email must show the code. Set these in the dashboard, on Twig Dev first and on Twig once sign-in is proven there.

| Where in the dashboard | Setting | Value | In the app |
| --- | --- | --- | --- |
| Authentication → Sign In / Providers → Email | Email OTP length | 6 | `CODE_LENGTH` |
| Authentication → Sign In / Providers → Email | Email OTP expiration | 600 seconds | `EXPIRES_AFTER_S` |
| Authentication → Rate Limits | Wait between codes to one address | 60 seconds (the default) | `RESEND_AFTER_S` |
| Authentication → Emails → Templates → Magic Link | Subject and message body | The `sign-in` email (below) | |
| Authentication → Emails → Templates → Confirm signup | Subject and message body | The `welcome` email (below). A new person's first email uses this template | |

Until the length is 6, the emailed code has 8 digits and does not fit the app's six boxes.

### The emails

The two emails are designed in `emails/` (see the README's table). `welcome` is for a new person and goes in the **Confirm signup** template; `sign-in` is for someone coming back and goes in **Magic Link**. Each file starts with the subject line to paste into the dashboard.

- Keep **Confirm email** switched on (Authentication → Sign In / Providers → Email). With it off, new people get the Magic Link email and never see the welcome.
- Email apps only show pictures that are on the public web, so each project has a public storage bucket called `email` (created by a migration). The pictures in `emails/images/` go in a version folder inside it, `v1` for now. Uploading needs the dashboard (Storage → email) or a secret key; the app's own key cannot write there.
- Build the ready-to-paste emails with the bucket's address, then paste each file from `emails/out/` into its template:

  ```bash
  node emails/build.mjs https://<project ref>.supabase.co/storage/v1/object/public/email/v1
  ```

- Pictures are cached for a year. If one changes, upload the set to a new folder (`v2`) and rebuild with that address.
- Twig Dev has the bucket and the `v1` pictures (November 26, 2026). Twig gets the empty bucket when the migration deploys; its pictures still need uploading.
- `node emails/build.mjs` with no address builds a preview with a sample code, to open in a browser.

If the pictures are ever unavailable, this plain body works for both templates:

```html
<h2>Your Twig code</h2>
<p>Enter this code in the app to sign in:</p>
<p style="font-size: 28px; letter-spacing: 4px;"><strong>{{ .Token }}</strong></p>
<p>It works for 10 minutes. If you did not ask for it, you can ignore this email.</p>
```

**The emails need our own sender first.** On the Free plan the dashboard locks the templates ("Set up custom SMTP to edit templates") and Supabase's built-in sender sends its default email, which has a sign-in link and no code. So code sign-in cannot work, even for development, until custom SMTP is set up (Authentication → Emails → SMTP Settings, issue #37) or the project is on Pro. The built-in sender is also limited to 2 emails an hour, to members of the Supabase organization.

State of Twig Dev on November 26, 2026: code length 6 and expiry 600 seconds; custom SMTP on, through Resend; both templates pasted from `emails/` with the `v1` pictures. Twig (production) has none of this yet.

### The sender

| Where | Setting |
| --- | --- |
| Resend (account adelpazoki85) | Domain `hellotwig.app`, US East, verified November 26, 2026. Click and open tracking off |
| DNS for `hellotwig.app` (Wix) | `TXT resend._domainkey` (DKIM), `CNAME rsend` and `CNAME send` to Resend, `TXT _dmarc` = `v=DMARC1; p=none;` |
| Supabase → Authentication → Emails → SMTP Settings | Sender `admin@hellotwig.app`, name `Twig`, host `smtp.resend.com`, port 465, username `resend`, password = a Resend API key with sending access to `hellotwig.app` only |

The API key lives only in Resend and in Supabase's SMTP settings, never in this repo. If it leaks, delete it in Resend (API Keys), create a new one and paste it into Supabase. With custom SMTP on, Supabase allows 30 auth emails an hour (Authentication → Rate Limits). Twig gets its own key when its sign-in is set up.

The server gives the same answer for a wrong code and an expired one, so the app decides which to say from how long ago it sent the code.
