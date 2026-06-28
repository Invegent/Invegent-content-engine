// control-tower-p1-validation.mjs
// =====================================================================
// PGlite (offline, no prod) validation for Control Tower P1 —
// behaviour-preserving enrollment cutover.
//
// Loads the REAL migration SQL of
//   supabase/migrations/20260628120000_control_tower_p1_enrollment_format_mix.sql
// into an in-memory PGlite (WASM Postgres + plpgsql, PG15+/16 — supports
// NULLS NOT DISTINCT), applies a minimal c.client stub (so the FK + seed work),
// applies the migration verbatim, then runs the brief's truth-table + constraint
// assertions. This is the ACTUAL migration SQL, not a mirror.
//
// Run:  node docs/briefs/control-tower-p1-validation.mjs
//   (requires @electric-sql/pglite; installed dev-only, NOT committed.
//    NODE_PATH / a sibling node_modules is used to resolve it.)
//
// The migration's only environment dependency is c.client(client_id) for the FK
// and the PP seed; everything else (schemas c + m, both new tables, the seed,
// the function) is created by the migration itself.
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION = process.env.MIGRATION_SQL_PATH || join(
  __dirname, '..', '..',
  'supabase', 'migrations',
  '20260628120000_control_tower_p1_enrollment_format_mix.sql'
);

const PP   = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const NONPP = '00000000-0000-0000-0000-000000000000';

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(name); console.log(`  FAIL  ${name}  ${detail}`); }
}

const db = new PGlite();
async function q(text, params) { return (await db.query(text, params)).rows; }
async function enrolled(uuid) {
  return (await q(`SELECT m.format_mix_enrolled($1) AS r`, [uuid]))[0].r;
}
// run a body inside a BEGIN ... ROLLBACK so each disqualifier/constraint test
// mutates a temp copy then ALWAYS reverts. Returns whatever the body returns.
// (PGlite auto-commits each exec, so an explicit transaction is needed for the
//  rollback-isolation pattern; SAVEPOINTs require an already-open tx.)
async function inRollback(fn) {
  await db.exec('BEGIN;');
  try { return await fn(); }
  finally { await db.exec('ROLLBACK;'); }
}
// did `fn` throw (constraint/CHECK violation)? rolls back either way.
async function rejects(fn) {
  return inRollback(async () => {
    try { await fn(); return false; } catch { return true; }
  });
}

(async () => {
  const sql = readFileSync(MIGRATION, 'utf8');
  console.log('Applying real migration SQL into PGlite (WASM Postgres + plpgsql)...');

  // Minimal environment: schema c + a c.client stub with a PK on client_id so
  // the migration's FK + PP seed resolve. The migration creates schema m
  // implicitly via the function? No — it does CREATE OR REPLACE FUNCTION m.* but
  // does NOT create schema m or c. In prod both already exist; here we stub them.
  // Supabase ships predefined roles anon/authenticated (the migration REVOKEs
  // from them). PGlite has no Supabase bootstrap, so create them here as empty
  // NOLOGIN roles purely so the REVOKE statements resolve — HARNESS STUB ONLY,
  // it does not affect what the REVOKEs mean in production.
  await db.exec(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
    END $$;
    CREATE SCHEMA IF NOT EXISTS c;
    CREATE SCHEMA IF NOT EXISTS m;
    CREATE TABLE c.client (
      client_id uuid PRIMARY KEY,
      status text,
      timezone text
    );
    INSERT INTO c.client (client_id, status, timezone)
      VALUES ('${PP}', 'active', 'Australia/Sydney');
  `);

  // Apply the migration verbatim.
  await db.exec(sql);
  console.log('Migration applied.\n');

  // ---- Sanity: exactly one seeded enrollment + one audit row ----
  console.log('Test 0: seed shape');
  {
    const er = await q(`SELECT * FROM c.client_control_tower_enrollment`);
    check('exactly one enrollment row seeded', er.length === 1, `got ${er.length}`);
    const row = er[0];
    check('seed is PP', row.client_id === PP, row.client_id);
    check('seed platform NULL (client-scoped)', row.platform === null, String(row.platform));
    check('seed control_type=format_mix', row.control_type === 'format_mix');
    check('seed enabled=true', row.enabled === true);
    check('seed rollout_stage=enforce', row.rollout_stage === 'enforce');
    check('seed approval_status=approved', row.approval_status === 'approved');
    check('seed status=active', row.status === 'active');
    check('seed is_current=true', row.is_current === true);
    check('seed version=1', Number(row.version) === 1);
    check('seed effective_until NULL', row.effective_until === null);

    const ar = await q(`SELECT * FROM c.client_format_mix_audit`);
    check('exactly one audit row seeded', ar.length === 1, `got ${ar.length}`);
    check('audit action=seed_enrollment_p1', ar[0]?.action === 'seed_enrollment_p1');
    check('audit before_data NULL', ar[0]?.before_data === null);
    check('audit after_data captured', ar[0]?.after_data && ar[0].after_data.client_id === PP,
      JSON.stringify(ar[0]?.after_data));
    check('audit version_to=1', Number(ar[0]?.version_to) === 1);
  }

  // ---- Truth table 1 & 2: PP true, non-PP false ----
  console.log('\nTest 1+2: function truth table (seeded enforce row)');
  {
    check('format_mix_enrolled(PP) = true', (await enrolled(PP)) === true);
    check('format_mix_enrolled(non-PP) = false', (await enrolled(NONPP)) === false);
    check('format_mix_enrolled(random uuid) = false',
      (await enrolled('99999999-9999-9999-9999-999999999999')) === false);
  }

  // ---- Truth table 3: each disqualifier in isolation -> false ----
  // Each runs on a SAVEPOINT copy and is rolled back, so disqualifiers are
  // tested in isolation against the otherwise-qualifying seeded PP row.
  console.log('\nTest 3: each disqualifier in isolation -> false');
  {
    // enabled=false. The enabled-only-when-enforced CHECK allows enabled=false
    // with any other state, so this UPDATE is legal.
    check('enabled=false -> false', await inRollback(async () => {
      await q(`UPDATE c.client_control_tower_enrollment SET enabled=false WHERE client_id=$1`, [PP]);
      return (await enrolled(PP)) === false;
    }));

    // status!='active'. enabled=true requires active+approved+enforce, so to set
    // status='superseded' we must also drop enabled to false (CHECK). The gate
    // must then be false because status<>active.
    check('status!=active -> false', await inRollback(async () => {
      await q(`UPDATE c.client_control_tower_enrollment
               SET status='superseded', enabled=false WHERE client_id=$1`, [PP]);
      return (await enrolled(PP)) === false;
    }));

    // approval_status!='approved' (must drop enabled too, per CHECK).
    check('approval_status!=approved -> false', await inRollback(async () => {
      await q(`UPDATE c.client_control_tower_enrollment
               SET approval_status='pending', enabled=false WHERE client_id=$1`, [PP]);
      return (await enrolled(PP)) === false;
    }));

    // rollout_stage!='enforce' (must drop enabled too, per CHECK).
    check('rollout_stage!=enforce -> false', await inRollback(async () => {
      await q(`UPDATE c.client_control_tower_enrollment
               SET rollout_stage='shadow', enabled=false WHERE client_id=$1`, [PP]);
      return (await enrolled(PP)) === false;
    }));

    // is_current=false (still enabled=true is allowed: CHECK doesn't reference
    // is_current). Gate must be false because the query filters is_current=true.
    check('is_current=false -> false', await inRollback(async () => {
      await q(`UPDATE c.client_control_tower_enrollment SET is_current=false WHERE client_id=$1`, [PP]);
      return (await enrolled(PP)) === false;
    }));

    // effective_from in the future -> not yet effective -> false.
    check('effective_from in future -> false', await inRollback(async () => {
      await q(`UPDATE c.client_control_tower_enrollment
               SET effective_from = CURRENT_DATE + 30 WHERE client_id=$1`, [PP]);
      return (await enrolled(PP)) === false;
    }));

    // effective_until in the past -> expired -> false. Must move effective_from
    // back far enough that effective_until >= effective_from (window CHECK).
    check('effective_until in past -> false', await inRollback(async () => {
      await q(`UPDATE c.client_control_tower_enrollment
               SET effective_from = CURRENT_DATE - 60,
                   effective_until = CURRENT_DATE - 1 WHERE client_id=$1`, [PP]);
      return (await enrolled(PP)) === false;
    }));

    // sanity: after all rollbacks PP is still enrolled.
    check('PP still enrolled after rollbacks (isolation holds)', (await enrolled(PP)) === true);
  }

  // ---- Partial-unique constraint: 2nd current active row rejected ----
  console.log('\nTest 4: partial UNIQUE rejects a 2nd current active (client,platform,control_type)');
  {
    // identical (client_id=PP, platform=NULL, control_type=format_mix), current+active.
    // NULLS NOT DISTINCT must treat the NULL platform as colliding with the seed.
    const rejected = await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                status, effective_from, is_current)
               VALUES ($1, NULL, 'format_mix', true, 'enforce', 'approved', 'active',
                       '2026-06-01', true)`, [PP]);
    });
    check('2nd current-active NULL-platform row rejected (NULLS NOT DISTINCT)', rejected);

    // a non-current (is_current=false) duplicate is allowed (partial predicate).
    const allowedNonCurrent = await inRollback(async () => {
      try {
        await q(`INSERT INTO c.client_control_tower_enrollment
                 (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                  status, effective_from, version, is_current)
                 VALUES ($1, NULL, 'format_mix', false, 'shadow', 'pending', 'superseded',
                         '2026-05-01', 0 + 2, false)`, [PP]);
        return true;
      } catch (e) { console.log('   (non-current insert err:', e.message, ')'); return false; }
    });
    check('non-current duplicate IS allowed (partial index predicate)', allowedNonCurrent);

    // a draft (status='draft') current row is allowed (predicate requires active).
    const allowedDraft = await inRollback(async () => {
      try {
        await q(`INSERT INTO c.client_control_tower_enrollment
                 (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                  status, effective_from, version, is_current)
                 VALUES ($1, NULL, 'format_mix', false, 'off', 'pending', 'draft',
                         '2026-06-01', 2, true)`, [PP]);
        return true;
      } catch (e) { console.log('   (draft insert err:', e.message, ')'); return false; }
    });
    check('current DRAFT duplicate IS allowed (predicate requires active)', allowedDraft);

    // distinct platform value coexists with the NULL-platform current-active row.
    const allowedDistinctPlatform = await inRollback(async () => {
      try {
        await q(`INSERT INTO c.client_control_tower_enrollment
                 (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                  status, effective_from, is_current)
                 VALUES ($1, 'facebook', 'format_mix', true, 'enforce', 'approved', 'active',
                         '2026-06-01', true)`, [PP]);
        return true;
      } catch (e) { console.log('   (distinct-platform insert err:', e.message, ')'); return false; }
    });
    check('distinct platform value coexists (NULL vs facebook)', allowedDistinctPlatform);
  }

  // ---- CHECK: enabled=true requires active+approved+enforce ----
  console.log('\nTest 5: CHECK rejects enabled=true with non-(active/approved/enforce)');
  {
    check('enabled=true + status!=active rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                status, effective_from, version, is_current)
               VALUES ($1, 'x1', 'format_mix', true, 'enforce', 'approved', 'draft',
                       '2026-06-01', 1, true)`, [PP]);
    }));
    check('enabled=true + approval!=approved rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                status, effective_from, version, is_current)
               VALUES ($1, 'x2', 'format_mix', true, 'enforce', 'pending', 'active',
                       '2026-06-01', 1, true)`, [PP]);
    }));
    check('enabled=true + rollout!=enforce rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                status, effective_from, version, is_current)
               VALUES ($1, 'x3', 'format_mix', true, 'shadow', 'approved', 'active',
                       '2026-06-01', 1, true)`, [PP]);
    }));
    // enabled=false with a non-promoted state IS allowed.
    check('enabled=false + draft/pending/off IS allowed', !(await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, platform, control_type, enabled, rollout_stage, approval_status,
                status, effective_from, version, is_current)
               VALUES ($1, 'x4', 'format_mix', false, 'off', 'pending', 'draft',
                       '2026-06-01', 1, true)`, [PP]);
    })));
  }

  // ---- Other CHECKs: enum domains, version, effective window, FK ----
  console.log('\nTest 6: enum / range / window / FK CHECKs');
  {
    check('control_type not in (format_mix) rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, control_type, rollout_stage, approval_status, status, effective_from, version, is_current)
               VALUES ($1, 'bogus', 'off', 'pending', 'draft', '2026-06-01', 1, false)`, [PP]);
    }));
    check('rollout_stage bogus rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, control_type, rollout_stage, approval_status, status, effective_from, version, is_current)
               VALUES ($1, 'format_mix', 'bogus', 'pending', 'draft', '2026-06-01', 1, false)`, [PP]);
    }));
    check('approval_status bogus rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, control_type, rollout_stage, approval_status, status, effective_from, version, is_current)
               VALUES ($1, 'format_mix', 'off', 'bogus', 'draft', '2026-06-01', 1, false)`, [PP]);
    }));
    check('status bogus rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, control_type, rollout_stage, approval_status, status, effective_from, version, is_current)
               VALUES ($1, 'format_mix', 'off', 'pending', 'bogus', '2026-06-01', 1, false)`, [PP]);
    }));
    check('version < 1 rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, control_type, rollout_stage, approval_status, status, effective_from, version, is_current)
               VALUES ($1, 'format_mix', 'off', 'pending', 'draft', '2026-06-01', 0, false)`, [PP]);
    }));
    check('effective_until < effective_from rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, control_type, rollout_stage, approval_status, status, effective_from, effective_until, version, is_current)
               VALUES ($1, 'format_mix', 'off', 'pending', 'draft', '2026-06-10', '2026-06-01', 1, false)`, [PP]);
    }));
    check('FK: unknown client_id rejected', await rejects(async () => {
      await q(`INSERT INTO c.client_control_tower_enrollment
               (client_id, control_type, rollout_stage, approval_status, status, effective_from, version, is_current)
               VALUES ('deadbeef-dead-dead-dead-deaddeaddead', 'format_mix', 'off', 'pending', 'draft', '2026-06-01', 1, false)`);
    }));
  }

  // ---- Function metadata: STABLE, search_path, schema-qualified read ----
  console.log('\nTest 7: function metadata');
  {
    const meta = await q(`
      SELECT p.provolatile, p.proconfig
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='m' AND p.proname='format_mix_enrolled'`);
    check('format_mix_enrolled is STABLE (provolatile=s)', meta[0]?.provolatile === 's',
      JSON.stringify(meta[0]));
    const cfg = (meta[0]?.proconfig || []).join(',');
    check('search_path set to public,pg_temp', /search_path=public,pg_temp/.test(cfg) || /search_path=.*public.*pg_temp/.test(cfg), cfg);
  }

  console.log('\n======================================================');
  console.log(`RESULT: ${pass} passed, ${fail} failed.`);
  if (fail) { console.log('FAILED:', fails.join(', ')); process.exitCode = 1; }
  console.log('Path used: PGlite (real migration SQL executed in WASM Postgres + plpgsql; NULLS NOT DISTINCT supported).');
  await db.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exitCode = 2; });
