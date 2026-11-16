#!/usr/bin/env node
// Race checks that a single-session pgTAP file can't do: two connections act
// at the same moment and the row locks must make the outcome right.
//
//   node scripts/db-test/concurrency.cjs
//
// Uses its own database (twig_concurrency) on the same server as run.cjs.

const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..', '..');
const DB = 'twig_concurrency';
const conn = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 54331),
  user: process.env.PGUSER || 'postgres',
};

async function connect() {
  const c = new Client({ ...conn, database: DB });
  await c.connect();
  return c;
}
const one = async (c, sql, params) => (await c.query(sql, params)).rows[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setup() {
  // setup drops and recreates its database: never against anything but this machine.
  if (!['127.0.0.1', 'localhost', '::1'].includes(conn.host)) {
    console.error(`Refusing to run against ${conn.host}: race checks only run against a local test database.`);
    process.exit(1);
  }
  const admin = new Client({ ...conn, database: 'postgres' });
  await admin.connect();
  await admin.query(`drop database if exists ${DB} with (force)`);
  await admin.query(`create database ${DB}`);
  await admin.query(`alter database ${DB} set search_path = "$user", public, extensions`);
  await admin.end();
  const c = await connect();
  const files = [path.join(__dirname, 'supabase_stub.sql')];
  const mig = path.join(ROOT, 'supabase', 'migrations');
  for (const f of fs.readdirSync(mig).filter((f) => f.endsWith('.sql')).sort()) files.push(path.join(mig, f));
  files.push(path.join(ROOT, 'supabase', 'tests', '_helpers.psql'));
  for (const f of files) await c.query(fs.readFileSync(f, 'utf8'));
  return c;
}

// Start `first` and hold its transaction open, start `second` (which should
// block on the lock), then commit `first` and let `second` finish.
async function race(first, second) {
  const a = await connect();
  const b = await connect();
  await a.query('begin');
  const ra = await first(a).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e: e.message }));
  await b.query('begin');
  const pb = second(b).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e: e.message }));
  await sleep(300);
  const monitor = await connect();
  const blocked = (await one(monitor, `select count(*)::int as n from pg_locks l
                                         join pg_stat_activity s on s.pid = l.pid
                                        where not l.granted and s.datname = $1`, [DB])).n > 0;
  await monitor.end();
  await a.query('commit');
  const rb = await pb;
  await b.query(rb.ok ? 'commit' : 'rollback');
  await a.end();
  await b.end();
  return { ra, rb, blocked };
}

const results = [];
function check(name, cond, detail) {
  results.push(cond);
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : '  ' + JSON.stringify(detail)}`);
}

(async () => {
  const c = await setup();
  const user = async (name) => (await one(c, 'select tests.new_user($1) as id', [name])).id;
  const sam = await user('Sam');
  const mom = await user('Mom');
  const dad = await user('Dad');
  const eve = await user('Eve');
  const login = (x, id) => x.query('select tests.login($1)', [id]);
  // One statement as a user, in its own transaction (logins are transaction-local).
  const as = async (id, sql, params) => {
    await c.query('begin');
    await login(c, id);
    const row = await one(c, sql, params);
    await c.query('commit');
    return row;
  };

  // 1. Two people submit their Discover answers at the same moment.
  const rel = (await one(c, `select tests.pair($1, $2, 'child', 'Mom') as id`, [sam, mom])).id;
  const act = (await one(c, 'select id from public.discovery_activities where relationship_id = $1', [rel])).id;
  const r1 = await race(
    async (a) => { await login(a, sam); return (await one(a, 'select public.submit_discovery_response($1, $2) as s', [act, 'Sam'])).s; },
    async (b) => { await login(b, mom); return (await one(b, 'select public.submit_discovery_response($1, $2) as s', [act, 'Mom'])).s; },
  );
  const revealed = (await one(c, 'select revealed_at is not null as r from public.discovery_activities where id = $1', [act])).r;
  check('simultaneous Discover answers: the second waits for the first', r1.blocked, r1);
  check('simultaneous Discover answers still reveal', revealed && r1.ra.v === 'submitted' && r1.rb.v === 'revealed', r1);

  // 2. Two people accept the same invite at the same moment.
  const code = (await as(dad, `select code from public.create_invite('parent', 'Kid')`)).code;
  const r2 = await race(
    async (a) => { await login(a, sam); return (await one(a, 'select public.accept_invite($1) as id', [code])).id; },
    async (b) => { await login(b, eve); return (await one(b, 'select public.accept_invite($1) as id', [code])).id; },
  );
  const pairs = (await one(c, `select count(*)::int as n from public.relationship_invites where accepted_at is not null and code_hash = public.invite_hash($1)`, [code])).n;
  check('one invite, two people at once: only the first gets in', r2.ra.ok && !r2.rb.ok && pairs === 1, r2);

  // 3. Crossed invites accepted at the same moment.
  const c1 = (await as(dad, `select code from public.create_invite('parent', 'Eve')`)).code;
  const c2 = (await as(eve, `select code from public.create_invite('child', 'Dad')`)).code;
  const r3 = await race(
    async (a) => { await login(a, eve); return (await one(a, 'select public.accept_invite($1) as id', [c1])).id; },
    async (b) => { await login(b, dad); return (await one(b, 'select public.accept_invite($1) as id', [c2])).id; },
  );
  const open = (await one(c, `select count(*)::int as n from public.relationships
                               where pair_key = public.pair_key($1, $2) and status in ('active', 'paused')`, [dad, eve])).n;
  check('crossed invites accepted at once make one pair', r3.ra.ok && !r3.rb.ok && open === 1, r3);

  // 4. A reply racing a pause: the pause wins and the reply is refused.
  const relB = (await one(c, `select tests.pair($1, $2, 'child', 'Dad') as id`, [eve, mom])).id;
  const mB = (await one(c, 'select tests.post($1, array[$2]::uuid[], $3) as id', [eve, relB, 'hi'])).id;
  const thB = (await one(c, 'select id from public.threads where moment_id = $1', [mB])).id;
  const r4 = await race(
    async (a) => { await login(a, eve); await a.query('select public.pause_relationship($1)', [relB]); },
    async (b) => {
      await login(b, mom);
      await b.query('insert into public.messages (thread_id, relationship_id, body) values ($1, $2, $3)', [thB, relB, 'late']);
    },
  );
  check('a reply sent while the pair is being paused waits, then is refused', r4.blocked && r4.ra.ok && !r4.rb.ok, r4);

  // 5. Attaching a photo while the Moment is being published.
  const draft = (await as(sam, `insert into public.moments (body) values ('race') returning id`)).id;
  const extra = (await one(c, 'select tests.upload($1) as id', [sam])).id;
  const r5 = await race(
    async (a) => { await login(a, sam); await a.query('select public.publish_moment($1, array[$2]::uuid[])', [draft, rel]); },
    async (b) => {
      await login(b, sam);
      await b.query('insert into public.moment_media (moment_id, media_id, position) values ($1, $2, 0)', [draft, extra]);
    },
  );
  check('a file attached while the Moment is being published waits, then is refused', r5.blocked && r5.ra.ok && !r5.rb.ok, r5);

  // 6. The AI path and the hourly job open the same week at once.
  const gran = await user('Gran');
  const kid = await user('Kid');
  const aunt = await user('Aunt');
  const relC = (await one(c, `select tests.pair($1, $2, 'parent', 'Kid') as id`, [gran, kid])).id;
  const relD = (await one(c, `select tests.pair($1, $2, 'parent', 'Kid') as id`, [aunt, kid])).id;
  await c.query('delete from public.discovery_activities where relationship_id = any($1::uuid[])', [[relC, relD]]);
  await c.query(`insert into public.consent_events (user_id, relationship_id, purpose, granted) values ($1, $2, 'ai_questions', true)`, [gran, relC]);
  const service = (x) => x.query('select tests.as_service()');
  const r6 = await race(
    async (a) => {
      await service(a);
      return (await one(a, `select public.save_discovery_activity($1, 'then_vs_now', 'AI week', 'theme',
                               jsonb_build_object($2::text, 'q1', $3::text, 'q2')) as id`, [relC, gran, kid])).id;
    },
    async (b) => { await service(b); return (await one(b, 'select public.start_discovery_weeks() as n')).n; },
  );
  const weeks = (await one(c, `select count(*) filter (where relationship_id = $1)::int as c,
                                      count(*) filter (where relationship_id = $2)::int as d,
                                      bool_and(generation_source = 'ai') filter (where relationship_id = $1) as ai
                                 from public.discovery_activities`, [relC, relD]));
  check('AI path and hourly job at once: one AI week, and the job still serves other pairs',
        r6.ra.ok && r6.rb.ok && weeks.c === 1 && weeks.ai && weeks.d === 1, { r6, weeks });

  await c.end();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} race checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
