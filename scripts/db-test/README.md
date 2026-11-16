# Database tests without Docker

The normal way to test the database is the Supabase CLI, which needs Docker:

```bash
supabase start
supabase test db
```

GitHub Actions does exactly that on every pull request that touches `supabase/` (see `.github/workflows/database.yml`), and also checks that `src/lib/database.types.ts` matches the schema.

This folder runs the same migrations and pgTAP tests on a plain local Postgres (15 or newer, with pgTAP installed), with `supabase_stub.sql` standing in for Supabase's `auth`, `storage`, `vault` and `cron` schemas. It is for machines without Docker and for quick runs. It is not a substitute for testing against real Supabase before release.

```bash
cd scripts/db-test
npm install
node run.cjs              # fresh database, apply migrations, run every supabase/tests/*.sql
node run.cjs test ../../supabase/tests/03_sharing_test.sql   # one file, current database
node concurrency.cjs      # race checks with two connections (Discover reveal, invites)
```

Connection settings come from `PGHOST`, `PGPORT` (default 54331), `PGUSER` (a superuser, default postgres) and `PGDATABASE` (default twig_test). `reset` and `concurrency.cjs` drop and recreate their database, so both refuse to run against anything but this machine.

## Getting a local Postgres with pgTAP on macOS, without Homebrew

```bash
mkdir -p ~/.twig-pg && cd ~/.twig-pg
npm pack @embedded-postgres/darwin-arm64@15.19.0-beta.19 && tar xzf embedded-postgres-*.tgz
curl -sSL https://github.com/theory/pgtap/archive/refs/tags/v1.3.3.tar.gz | tar xz
sed -e 's,MODULE_PATHNAME,$libdir/pgtap,g' -e 's,__OS__,darwin,g' -e 's,__VERSION__,1.3,g' \
  pgtap-1.3.3/sql/pgtap.sql.in > package/native/share/postgresql/extension/pgtap--1.3.3.sql
cp pgtap-1.3.3/pgtap.control package/native/share/postgresql/extension/
LC_ALL=en_US.UTF-8 package/native/bin/initdb -D data -U postgres -A trust
package/native/bin/pg_ctl -D data -o "-p 54331 -k '' -c listen_addresses=127.0.0.1" -l pg.log start
```

With Homebrew, `brew install postgresql@15 pgtap` works too.

## Writing tests

Each test file starts with `begin;` and `\ir _helpers.psql`, and ends with `select * from finish(); rollback;`. The helpers create people (`tests.new_user`), pairs (`tests.pair`), posts (`tests.post`) and uploads (`tests.upload`), and switch who is acting (`tests.login`, `tests.as_service`, `tests.as_anon`, `tests.logout`). `tests.remember` and `tests.v` keep ids across role switches. Test users live in a timezone where it is about noon, so quiet hours never make a test flaky.
