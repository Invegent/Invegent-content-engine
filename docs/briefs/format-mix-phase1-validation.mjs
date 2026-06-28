// format-mix-phase1-validation.mjs
// =====================================================================
// PGlite (offline, no prod) validation for Format Mix Enforcement Phase 1.
//
// Loads the REAL SQL of m.allocate_week_formats (the pure helper) and
// m.build_weekly_demand_grid v2 (against fixture tables) directly from the
// migration file 20260628000000_format_mix_enforcement_phase1.sql, then runs
// the assertions from the brief. PGlite runs WASM Postgres with plpgsql, so
// this is the ACTUAL SQL — not a mirror.
//
// Run:  node docs/briefs/format-mix-phase1-validation.mjs
//   (requires @electric-sql/pglite; installed dev-only in _pglite_test/,
//    NOT committed. NODE_PATH is set by the runner shell to find it.)
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// MIGRATION_SQL_PATH env override lets the test run from a dir where PGlite is
// installed (ESM ignores NODE_PATH); default = repo-relative location.
const MIGRATION = process.env.MIGRATION_SQL_PATH || join(
  __dirname, '..', '..',
  'supabase', 'migrations', '20260628000000_format_mix_enforcement_phase1.sql'
);

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(name); console.log(`  FAIL  ${name}  ${detail}`); }
}

// Extract a single CREATE OR REPLACE FUNCTION ... $$ ... $$; block by function name.
function extractFn(sql, qualifiedName) {
  const startRe = new RegExp(`CREATE OR REPLACE FUNCTION ${qualifiedName.replace('.', '\\.')}\\b`);
  const m = startRe.exec(sql);
  if (!m) throw new Error(`could not find ${qualifiedName}`);
  const from = m.index;
  // find the function-body terminator: the first "$$;" after the opening "$$".
  const openIdx = sql.indexOf('$$', from);
  const closeIdx = sql.indexOf('$$;', openIdx + 2);
  if (openIdx < 0 || closeIdx < 0) throw new Error(`could not bound body of ${qualifiedName}`);
  return sql.slice(from, closeIdx + 3);
}

const sql = readFileSync(MIGRATION, 'utf8');
const fnAllocate = extractFn(sql, 'm.allocate_week_formats');
const fnGrid     = extractFn(sql, 'm.build_weekly_demand_grid');
const fnEnrolled = extractFn(sql, 'm.format_mix_enrolled');

const db = new PGlite();

async function q(text, params) {
  const r = await db.query(text, params);
  return r.rows;
}

function countsOf(arr) {
  const c = {};
  for (const x of arr) c[x] = (c[x] || 0) + 1;
  return c;
}
function maxRun(arr) {
  let best = 0, cur = 0, prev = null;
  for (const x of arr) { if (x === prev) cur++; else cur = 1; prev = x; if (cur > best) best = cur; }
  return best;
}

(async () => {
  console.log('Loading real SQL helpers into PGlite (WASM Postgres + plpgsql)...');
  await db.exec('CREATE SCHEMA IF NOT EXISTS m;');
  await db.exec(fnEnrolled);
  await db.exec(fnAllocate);
  console.log('Helpers loaded.\n');

  // ---- helper to call allocate_week_formats with a JS shares array ----
  async function alloc(shares, n) {
    const json = JSON.stringify(shares.map(s => ({ key: s.key, share: s.share })));
    const rows = await q('SELECT m.allocate_week_formats($1::jsonb, $2::int) AS r', [json, n]);
    return rows[0].r; // PGlite returns text[] as a JS array
  }

  console.log('Test 0: PP gate (format_mix_enrolled) fail-closed');
  {
    const pp = (await q(`SELECT m.format_mix_enrolled('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd') AS r`))[0].r;
    const other = (await q(`SELECT m.format_mix_enrolled('00000000-0000-0000-0000-000000000000') AS r`))[0].r;
    check('PP enrolled = true', pp === true);
    check('non-PP enrolled = false (fail-closed)', other === false);
  }

  console.log('\nTest 1: Sum — counts sum exactly to N');
  {
    const cases = [
      { shares: [{ key: 'a', share: 33 }, { key: 'b', share: 33 }, { key: 'c', share: 34 }], n: 3 },
      { shares: [{ key: 'a', share: 40 }, { key: 'b', share: 30 }, { key: 'c', share: 30 }], n: 5 },
      // PP-style 6-way mix over 5 weekly slots
      { shares: [
        { key: 'image_quote', share: 30 }, { key: 'image_tip', share: 20 },
        { key: 'carousel_listicle', share: 20 }, { key: 'video_short_avatar', share: 15 },
        { key: 'image_stat', share: 10 }, { key: 'image_announcement', share: 5 },
      ], n: 7 },
    ];
    for (const c of cases) {
      const out = await alloc(c.shares, c.n);
      check(`len==N for n=${c.n}`, out.length === c.n, `got ${out.length}`);
      const total = Object.values(countsOf(out)).reduce((a, b) => a + b, 0);
      check(`sum counts==N for n=${c.n}`, total === c.n, `got ${total}`);
    }
  }

  console.log('\nTest 1b: Hamilton counts match expectation (33/33/34, n=3)');
  {
    const out = await alloc([{ key: 'a', share: 33 }, { key: 'b', share: 33 }, { key: 'c', share: 34 }], 3);
    const cc = countsOf(out);
    check('each gets exactly 1', cc.a === 1 && cc.b === 1 && cc.c === 1, JSON.stringify(cc));
  }
  console.log('Test 1c: Hamilton counts (40/30/30, n=5)');
  {
    const out = await alloc([{ key: 'a', share: 40 }, { key: 'b', share: 30 }, { key: 'c', share: 30 }], 5);
    const cc = countsOf(out);
    // raw a=2.0 b=1.5 c=1.5 -> floor 2,1,1 base=4 leftover=1 -> highest rem: b,c tie -> share DESC equal -> key ASC -> b
    check('a=2', cc.a === 2, JSON.stringify(cc));
    check('b=2 (largest-remainder, key ASC tie-break)', cc.b === 2, JSON.stringify(cc));
    check('c=1', cc.c === 1, JSON.stringify(cc));
  }

  console.log('\nTest 2: Rolling convergence / position stability');
  {
    // The full-week allocation == querying ordinal-by-ordinal, because the
    // function is pure of context: allocate(shares,N)[k] is fixed by (shares,N).
    const shares = [{ key: 'a', share: 50 }, { key: 'b', share: 30 }, { key: 'c', share: 20 }];
    const N = 10;
    const whole = await alloc(shares, N);
    // "incremental insertion": each night the materialiser recomputes the SAME
    // full-week assignment and reads index ordinal_of_S. Simulate by calling
    // alloc again per ordinal and confirming the k-th element is identical.
    let stable = true;
    for (let k = 1; k <= N; k++) {
      const again = await alloc(shares, N);
      if (again[k - 1] !== whole[k - 1]) { stable = false; break; }
    }
    check('per-ordinal recompute reconstructs identical full-week distribution', stable);
    // reconstructed distribution equals whole-week distribution
    const recon = [];
    for (let k = 1; k <= N; k++) { const a = await alloc(shares, N); recon.push(a[k - 1]); }
    check('reconstructed sequence == whole-week sequence',
      JSON.stringify(recon) === JSON.stringify(whole), `${recon} vs ${whole}`);
  }

  console.log('\nTest 3: Determinism (no random/now)');
  {
    const shares = [{ key: 'x', share: 25 }, { key: 'y', share: 25 }, { key: 'z', share: 50 }];
    const a = await alloc(shares, 8);
    const b = await alloc(shares, 8);
    const cc = await alloc(shares, 8);
    check('three identical calls -> identical output',
      JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(b) === JSON.stringify(cc),
      `${a} / ${b} / ${cc}`);
  }

  console.log('\nTest 4: Spread — no over-clustering for a balanced mix');
  {
    // balanced 3-way over 9 -> 3/3/3, smooth WRR must interleave (no run of 3).
    const out = await alloc([{ key: 'a', share: 34 }, { key: 'b', share: 33 }, { key: 'c', share: 33 }], 9);
    check('balanced 3x3: max run-length <= 1 (perfect interleave)', maxRun(out) <= 1, `out=${out} maxRun=${maxRun(out)}`);
    // 50/30/20 over 10: dominant format must NOT be fully clustered.
    const out2 = await alloc([{ key: 'a', share: 50 }, { key: 'b', share: 30 }, { key: 'c', share: 20 }], 10);
    check('50/30/20: max run-length bounded (<=2)', maxRun(out2) <= 2, `out=${out2} maxRun=${maxRun(out2)}`);
  }

  console.log('\nTest 6: Empty -> fallback (caller goes legacy)');
  {
    const e1 = await alloc([], 5);
    const e2 = await alloc([{ key: 'a', share: 100 }], 0);
    check('empty formats -> empty array', Array.isArray(e1) && e1.length === 0, JSON.stringify(e1));
    check('n=0 -> empty array', Array.isArray(e2) && e2.length === 0, JSON.stringify(e2));
  }

  console.log('\nTest 1d: all-zero shares -> even split by key ASC');
  {
    const out = await alloc([{ key: 'b', share: 0 }, { key: 'a', share: 0 }, { key: 'c', share: 0 }], 4);
    const cc = countsOf(out);
    check('all-zero n=4/3: counts sum to 4', out.length === 4, JSON.stringify(cc));
    // 4/3 -> a=2 (key ASC gets the +1), b=1, c=1
    check('all-zero even split: a=2,b=1,c=1 (key ASC +1)',
      cc.a === 2 && cc.b === 1 && cc.c === 1, JSON.stringify(cc));
  }

  // -------------------------------------------------------------------
  // Test 5 (grid-level): disabled / policy-missing -> 0 slots.
  // Fixture the tables build_weekly_demand_grid v2 reads, then load grid v2.
  // -------------------------------------------------------------------
  console.log('\nTest 5: grid v2 — disabled & policy-missing formats yield 0 slots');
  {
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS c;
      CREATE SCHEMA IF NOT EXISTS t;
      CREATE TABLE c.client_publish_schedule(
        schedule_id uuid DEFAULT gen_random_uuid(), client_id uuid, platform text,
        day_of_week int, publish_time time, enabled bool);
      CREATE TABLE c.client_format_config(
        config_id uuid DEFAULT gen_random_uuid(), client_id uuid, ice_format_key text,
        platform text, is_enabled bool, max_per_week int);
      CREATE TABLE c.client_format_mix_override(
        client_id uuid, platform text, ice_format_key text, override_share_pct numeric,
        is_current bool, effective_from date);
      CREATE TABLE t.platform_format_mix_default(
        platform text, ice_format_key text, default_share_pct numeric, is_current bool);
      CREATE TABLE t.format_synthesis_policy(ice_format_key text, is_current bool);
      CREATE TABLE t.format_quality_policy(ice_format_key text, is_current bool);
    `);
    await db.exec(fnGrid);

    const CID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
    // 5 enabled facebook schedule rules (PP-style)
    for (let i = 1; i <= 5; i++) {
      await q(`INSERT INTO c.client_publish_schedule(client_id,platform,day_of_week,publish_time,enabled)
               VALUES ($1,'facebook',$2,'09:00',true)`, [CID, i]);
    }
    // default mix: 3 formats summing 100
    await q(`INSERT INTO t.platform_format_mix_default(platform,ice_format_key,default_share_pct,is_current) VALUES
             ('facebook','image_quote',50,true),
             ('facebook','image_tip',30,true),
             ('facebook','video_short_avatar',20,true)`);
    // config: image_quote enabled (NULL platform), image_tip DISABLED, video enabled
    await q(`INSERT INTO c.client_format_config(client_id,ice_format_key,platform,is_enabled) VALUES
             ($1,'image_quote',NULL,true),
             ($1,'image_tip',NULL,false),
             ($1,'video_short_avatar',NULL,true)`, [CID]);
    // policies: image_quote has BOTH; video has synth only (MISSING quality -> excluded)
    await q(`INSERT INTO t.format_synthesis_policy(ice_format_key,is_current) VALUES
             ('image_quote',true),('image_tip',true),('video_short_avatar',true)`);
    await q(`INSERT INTO t.format_quality_policy(ice_format_key,is_current) VALUES
             ('image_quote',true),('image_tip',true)`); // video has no quality policy

    const rows = await q(`SELECT platform, ice_format_key, share_pct, weekly_slot_count
                          FROM m.build_weekly_demand_grid($1) ORDER BY ice_format_key`, [CID]);
    const keys = rows.map(r => r.ice_format_key);
    check('disabled image_tip excluded from grid', !keys.includes('image_tip'), JSON.stringify(keys));
    check('policy-missing (quality) video_short_avatar excluded', !keys.includes('video_short_avatar'), JSON.stringify(keys));
    check('only image_quote survives', keys.length === 1 && keys[0] === 'image_quote', JSON.stringify(keys));
    // surviving share renormalised to 100
    check('surviving share renormalised to 100', Number(rows[0].share_pct) === 100, JSON.stringify(rows[0]));
    // weekly_slot_count over 5 facebook slots -> 5 (all to the one survivor)
    check('weekly_slot_count == 5 (all 5 slots to survivor)', Number(rows[0].weekly_slot_count) === 5, JSON.stringify(rows[0]));
  }

  console.log('\nTest 5b: grid v2 — override-only row NOT dropped; platform-specific config wins over NULL');
  {
    const CID2 = '11111111-1111-1111-1111-111111111111';
    for (let i = 1; i <= 4; i++) {
      await q(`INSERT INTO c.client_publish_schedule(client_id,platform,day_of_week,publish_time,enabled)
               VALUES ($1,'instagram',$2,'10:00',true)`, [CID2, i]);
    }
    // default has only format_a; override introduces format_b (override-only)
    await q(`INSERT INTO t.platform_format_mix_default(platform,ice_format_key,default_share_pct,is_current) VALUES
             ('instagram','format_a',100,true)`);
    await q(`INSERT INTO c.client_format_mix_override(client_id,platform,ice_format_key,override_share_pct,is_current) VALUES
             ($1,'instagram','format_a',60,true),
             ($1,'instagram','format_b',40,true)`, [CID2]);
    // config: format_a NULL-platform enabled; format_b has a platform-specific DISABLED row
    //         AND a NULL-platform ENABLED row -> platform-specific wins -> excluded.
    await q(`INSERT INTO c.client_format_config(client_id,ice_format_key,platform,is_enabled) VALUES
             ($1,'format_a',NULL,true),
             ($1,'format_b',NULL,true),
             ($1,'format_b','instagram',false)`, [CID2]);
    await q(`INSERT INTO t.format_synthesis_policy(ice_format_key,is_current) VALUES
             ('format_a',true),('format_b',true)`);
    await q(`INSERT INTO t.format_quality_policy(ice_format_key,is_current) VALUES
             ('format_a',true),('format_b',true)`);

    const rows = await q(`SELECT ice_format_key, share_pct FROM m.build_weekly_demand_grid($1)
                          WHERE platform='instagram' ORDER BY ice_format_key`, [CID2]);
    const keys = rows.map(r => r.ice_format_key);
    check('platform-specific DISABLED row excludes format_b (precedence over NULL)',
      !keys.includes('format_b'), JSON.stringify(keys));
    check('format_a survives (override share used)', keys.includes('format_a'), JSON.stringify(keys));
    check('format_a renormalised to 100 after format_b dropped',
      Number(rows.find(r => r.ice_format_key === 'format_a').share_pct) === 100, JSON.stringify(rows));
  }

  console.log('\nTest 5c: grid v2 — platform-specific ENABLED wins over NULL DISABLED');
  {
    const CID3 = '22222222-2222-2222-2222-222222222222';
    await q(`INSERT INTO c.client_publish_schedule(client_id,platform,day_of_week,publish_time,enabled)
             VALUES ($1,'linkedin',1,'08:00',true),($1,'linkedin',3,'08:00',true)`, [CID3]);
    await q(`INSERT INTO t.platform_format_mix_default(platform,ice_format_key,default_share_pct,is_current) VALUES
             ('linkedin','fmt_x',100,true)`);
    // NULL-platform DISABLED, but linkedin-specific ENABLED -> specific wins -> included.
    await q(`INSERT INTO c.client_format_config(client_id,ice_format_key,platform,is_enabled) VALUES
             ($1,'fmt_x',NULL,false),
             ($1,'fmt_x','linkedin',true)`, [CID3]);
    await q(`INSERT INTO t.format_synthesis_policy(ice_format_key,is_current) VALUES ('fmt_x',true)`);
    await q(`INSERT INTO t.format_quality_policy(ice_format_key,is_current) VALUES ('fmt_x',true)`);
    const rows = await q(`SELECT ice_format_key FROM m.build_weekly_demand_grid($1) WHERE platform='linkedin'`, [CID3]);
    check('platform-specific ENABLED overrides NULL DISABLED -> fmt_x included',
      rows.length === 1 && rows[0].ice_format_key === 'fmt_x', JSON.stringify(rows.map(r => r.ice_format_key)));
  }

  console.log('\nTest 5d: grid v2 — no config row at all -> fail-closed (excluded)');
  {
    const CID4 = '33333333-3333-3333-3333-333333333333';
    await q(`INSERT INTO c.client_publish_schedule(client_id,platform,day_of_week,publish_time,enabled)
             VALUES ($1,'facebook',2,'07:00',true)`, [CID4]);
    await q(`INSERT INTO t.platform_format_mix_default(platform,ice_format_key,default_share_pct,is_current) VALUES
             ('facebook','orphan_fmt',100,true)`);
    await q(`INSERT INTO t.format_synthesis_policy(ice_format_key,is_current) VALUES ('orphan_fmt',true)`);
    await q(`INSERT INTO t.format_quality_policy(ice_format_key,is_current) VALUES ('orphan_fmt',true)`);
    // intentionally NO client_format_config row for CID4.
    const rows = await q(`SELECT ice_format_key FROM m.build_weekly_demand_grid($1) WHERE platform='facebook' AND ice_format_key='orphan_fmt'`, [CID4]);
    check('no config row -> format NOT allocatable (fail-closed)', rows.length === 0, JSON.stringify(rows));
  }

  console.log('\n======================================================');
  console.log(`RESULT: ${pass} passed, ${fail} failed.`);
  if (fail) { console.log('FAILED:', fails.join(', ')); process.exitCode = 1; }
  console.log('Path used: PGlite (real SQL — m.allocate_week_formats + m.build_weekly_demand_grid v2 executed in WASM Postgres with plpgsql).');
  await db.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exitCode = 2; });
