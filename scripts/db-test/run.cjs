#!/usr/bin/env node
// Run Twig's migrations and pgTAP tests against a plain local Postgres 15
// (with pgTAP installed), using supabase_stub.sql in place of Supabase.
//
//   node scripts/db-test/run.cjs            reset the database, migrate, run every test
//   node scripts/db-test/run.cjs reset      reset and migrate only
//   node scripts/db-test/run.cjs test FILE  run one test file against the current database
//
// Connection: PGHOST, PGPORT, PGUSER (a superuser), PGDATABASE (default twig_test).
// Against real Supabase use `supabase db reset` and `supabase test db` instead.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..', '..');
const DB = process.env.PGDATABASE || 'twig_test';
const conn = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 54331),
  user: process.env.PGUSER || 'postgres',
};

// Inline psql \ir / \i includes so files stay runnable by pg_prove.
function load(file) {
  const dir = path.dirname(file);
  return fs.readFileSync(file, 'utf8').split('\n').map((line) => {
    const m = line.match(/^\\(ir|i)\s+(\S+)/);
    if (m) return load(m[1] === 'ir' ? path.resolve(dir, m[2]) : path.resolve(m[2]));
    if (line.startsWith('\\')) return '-- ' + line;
    return line;
  }).join('\n');
}

function where(sql, position) {
  if (!position) return '';
  const before = sql.slice(0, Number(position));
  const line = before.split('\n').length;
  const lines = sql.split('\n');
  return `\n  at line ${line}: ${(lines[line - 1] || '').trim()}`;
}

async function runFile(client, file, { quiet = false } = {}) {
  const sql = load(file);
  const notices = [];
  const onNotice = (n) => notices.push(n.message);
  client.on('notice', onNotice);
  try {
    const res = await client.query(sql);
    const results = Array.isArray(res) ? res : [res];
    const out = [];
    for (const r of results) {
      for (const row of r.rows || []) {
        const v = Object.values(row)[0];
        if (v !== null && v !== undefined) out.push(String(v));
      }
    }
    return { ok: true, out, notices };
  } catch (e) {
    return { ok: false, error: `${e.message}${e.detail ? ' — ' + e.detail : ''}${where(sql, e.position)}`, notices };
  } finally {
    client.removeListener('notice', onNotice);
  }
}

async function reset() {
  // reset drops and recreates the database: never against anything but this machine.
  if (!['127.0.0.1', 'localhost', '::1'].includes(conn.host) || DB === 'postgres') {
    console.error(`Refusing to reset ${conn.host}/${DB}: reset only runs against a local test database.`);
    process.exit(1);
  }
  const admin = new Client({ ...conn, database: 'postgres' });
  await admin.connect();
  await admin.query(`drop database if exists ${DB} with (force)`);
  await admin.query(`create database ${DB}`);
  await admin.query(`alter database ${DB} set search_path = "$user", public, extensions`);
  await admin.end();

  const client = new Client({ ...conn, database: DB });
  await client.connect();
  const steps = [path.join(__dirname, 'supabase_stub.sql')];
  const migDir = path.join(ROOT, 'supabase', 'migrations');
  for (const f of fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
    steps.push(path.join(migDir, f));
  }
  for (const f of steps) {
    const r = await runFile(client, f);
    if (!r.ok) {
      console.error(`FAILED ${path.relative(ROOT, f)}: ${r.error}`);
      await client.end();
      process.exit(1);
    }
    console.log(`applied ${path.relative(ROOT, f)}`);
  }
  await client.end();
}

async function test(files) {
  let failed = 0;
  let passed = 0;
  for (const f of files) {
    const client = new Client({ ...conn, database: DB });
    await client.connect();
    const r = await runFile(client, f);
    await client.end();
    const rel = path.relative(ROOT, f);
    if (!r.ok) {
      failed++;
      console.log(`\n✗ ${rel}: ERROR ${r.error}`);
      continue;
    }
    const tap = r.out.join('\n').split('\n');
    const bad = tap.filter((l) => l.startsWith('not ok'));
    const good = tap.filter((l) => l.startsWith('ok'));
    const plan = tap.find((l) => /^1\.\.\d+/.test(l));
    const planned = plan ? Number(plan.split('..')[1]) : NaN;
    const ran = bad.length + good.length;
    passed += good.length;
    if (bad.length || ran !== planned) {
      failed++;
      console.log(`\n✗ ${rel}: ${good.length}/${planned} passed`);
      for (const l of tap.filter((l) => l.startsWith('not ok') || l.startsWith('#'))) console.log('  ' + l);
    } else {
      console.log(`✓ ${rel}: ${good.length} tests`);
    }
  }
  console.log(`\n${passed} assertions passed, ${failed} file(s) failed`);
  return failed;
}

(async () => {
  const [cmd, ...args] = process.argv.slice(2);
  const testDir = path.join(ROOT, 'supabase', 'tests');
  const all = () => fs.readdirSync(testDir).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => path.join(testDir, f));
  if (cmd === 'reset') return reset();
  if (cmd === 'test') return process.exit(await test(args.length ? args.map((a) => path.resolve(a)) : all()) ? 1 : 0);
  await reset();
  process.exit((await test(all())) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
