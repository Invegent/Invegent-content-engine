// cc0091-a3-lifecycle-validation.mjs
// =====================================================================
// PGlite (offline, no prod) LIFECYCLE validation for the cc-0091 Gate A packet.
//
// The sibling harness (cc0091-a3-validation.mjs) proves each artifact in
// isolation. It structurally CANNOT prove that the packet, as a lifecycle,
// applies and reverses safely — which is precisely the gap that let the N1
// regression through (a cross-file Gate-A procedure interaction) and left
// three rollbacks stale against amended forwards.
//
// PK requirement (2026-08-08):
//   forward -> assertions -> rollback -> baseline assertions -> forward again
//   -> assertions
//
// This runs ALL EIGHT artifact files — four forwards AND four rollbacks —
// loading the REAL SQL, not a mirror, and additionally proves:
//   * A1's ASYMMETRIC rollback restores platform_support BYTE-IDENTICALLY,
//     including the absent-key rows (the defect class the whole lane exists for)
//   * A1's forward is single-shot: a second run reports ALREADY APPLIED, and is
//     re-appliable only AFTER its rollback has restored the baseline
//   * A3-1's rollback data-loss guard FIRES when evidence rows exist
//   * Rolling back A3-1 before A3-3 hard-errors 2BP01 (tracked dependency)
//   * A second forward pass reaches an identical end state
//
// Run:  node docs/briefs/cc0091-a3-lifecycle-validation.mjs
//   (requires @electric-sql/pglite, dev-only, NOT committed — house pattern)
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = process.env.CC0091_ARTIFACT_DIR || join(__dirname, 'artifacts');
const F = (n) => join(ART, n);

const A1_F  = F('NOT_APPLIED_cc0091_a1_instagram_platform_support_correction_v1.sql');
const A1_R  = F('NOT_APPLIED_cc0091_a1_instagram_platform_support_correction_ROLLBACK_v1.sql');
const A31_F = F('NOT_APPLIED_cc0091_a3_1_format_capability_drop_surface_v1.sql');
const A31_R = F('NOT_APPLIED_cc0091_a3_1_format_capability_drop_surface_ROLLBACK_v1.sql');
const A32_F = F('NOT_APPLIED_cc0091_a3_2_format_default_annotation_v1.sql');
const A32_R = F('NOT_APPLIED_cc0091_a3_2_format_default_annotation_ROLLBACK_v1.sql');
const A33_F = F('NOT_APPLIED_cc0091_a3_3_mix_rewrite_removal_detector_v1.sql');
const A33_R = F('NOT_APPLIED_cc0091_a3_3_mix_rewrite_removal_detector_ROLLBACK_v1.sql');

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(`${name}${detail ? ' :: ' + detail : ''}`); console.log(`  FAIL  ${name} ${detail}`); }
}
const sql = (p) => readFileSync(p, 'utf8');

const db = new PGlite();
async function run(file) { await db.exec(sql(file)); }
async function tryRun(file) {
  try { await db.exec(sql(file)); return { okRun: true, err: null }; }
  catch (e) {
    // An artifact that RAISEs inside its own BEGIN/COMMIT leaves the session in an
    // aborted transaction: the driver stops at the error and never reaches the trailing
    // COMMIT (which real Postgres would treat as ROLLBACK). Clear it explicitly so a
    // DELIBERATE, EXPECTED abort in one phase cannot cascade into false failures later.
    try { await db.exec('ROLLBACK'); } catch { /* no open txn — fine */ }
    return { okRun: false, err: String(e.message || e) };
  }
}
const q = async (text) => (await db.query(text)).rows;

// Canonical snapshot of the exact rows A1 mutates — the baseline that a correct
// asymmetric rollback must restore CHARACTER FOR CHARACTER, absent keys included.
async function platformSupportSnapshot() {
  const rows = await q(`SELECT ice_format_key, platform_support::text AS ps
                          FROM t."5.3_content_format"
                         WHERE ice_format_key LIKE 'video_short%'
                         ORDER BY ice_format_key`);
  return JSON.stringify(rows);
}

async function main() {
  // ── Fixture mirroring live shape ────────────────────────────────────────────
  await db.exec(`
    CREATE SCHEMA m; CREATE SCHEMA t; CREATE SCHEMA c; CREATE SCHEMA ice_ro;
    CREATE ROLE ice_readonly; CREATE ROLE inspector_ro; CREATE ROLE anon; CREATE ROLE authenticated;

    CREATE TABLE t."5.3_content_format" (
      ice_format_key text PRIMARY KEY, is_active boolean NOT NULL DEFAULT true,
      format_category text, output_mime_type text, render_engine text,
      platform_support jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now());

    CREATE TABLE t.platform_format_mix_default (
      mix_default_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), platform text NOT NULL,
      ice_format_key text NOT NULL, default_share_pct numeric,
      effective_from date NOT NULL, is_current boolean NOT NULL);

    CREATE TABLE m.slot (slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), format_preference text[]);
    CREATE TABLE m.slot_fill_attempt (
      attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid NOT NULL,
      attempted_at timestamptz NOT NULL DEFAULT now(), pool_snapshot jsonb,
      decision text NOT NULL, skip_reason text, chosen_format text);

    CREATE TABLE c.client (client_id uuid PRIMARY KEY, client_slug text);
    CREATE TABLE c.client_format_mix_override (client_id uuid, platform text, ice_format_key text, override_share_pct numeric, is_current boolean);
    CREATE TABLE c.client_format_config (client_id uuid, platform text, ice_format_key text, is_enabled boolean);

    CREATE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
    RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
    LANGUAGE sql STABLE AS $s$ SELECT NULL::uuid,NULL::text,NULL::text,NULL::numeric,NULL::integer WHERE false $s$;
    CREATE FUNCTION public.classify_format_capability(a text, b text, cc text) RETURNS jsonb
    LANGUAGE sql STABLE AS $s$ SELECT jsonb_build_object('status','unknown','reason_code','stub','routed_lane',NULL,'evidence','{}'::jsonb) $s$;

    -- These two exist ONLY so the rollbacks' COLLATERAL GUARDS can find them.
    -- Their absence in the first lifecycle run made BOTH the A3-1 and A3-2 rollbacks
    -- abort — which was the guards working exactly as designed ("this rollback must
    -- never touch the fill path"), not an artifact defect. Keeping them stubbed proves
    -- the guards pass when the protected functions ARE present; the earlier run already
    -- proved they fire when absent.
    CREATE FUNCTION m.fill_pending_slots(p_max_slots integer DEFAULT 5) RETURNS integer
    LANGUAGE sql AS $s$ SELECT 0 $s$;
    CREATE FUNCTION m.materialise_slots(p_days integer DEFAULT 7) RETURNS integer
    LANGUAGE sql AS $s$ SELECT 0 $s$;

    -- EXACT live baseline for the four rows A1 touches, absent keys and all.
    INSERT INTO t."5.3_content_format" (ice_format_key, output_mime_type, render_engine, platform_support) VALUES
      ('video_short_stat',         'video/mp4','creatomate','{"youtube":true,"facebook":false,"linkedin":false,"instagram":false}'::jsonb),
      ('video_short_stat_voice',   'video/mp4','creatomate+elevenlabs','{"youtube":true,"facebook":false}'::jsonb),
      ('video_short_kinetic_voice','video/mp4','creatomate+elevenlabs','{"youtube":true,"facebook":false}'::jsonb),
      ('video_short_kinetic',      'video/mp4','creatomate','{"youtube":true,"facebook":false,"linkedin":false,"instagram":false}'::jsonb),
      ('img_static',               'image/png','creatomate','{"instagram":true}'::jsonb);

    INSERT INTO t.platform_format_mix_default (platform, ice_format_key, default_share_pct, effective_from, is_current) VALUES
      ('instagram','video_short_kinetic',20, DATE '2026-04-22', false),
      ('instagram','video_short_stat_voice',15, DATE '2026-04-22', false),
      ('instagram','img_static',55, DATE '2026-04-22', false),
      ('instagram','img_static',100, DATE '2026-07-25', true);
  `);

  const BASELINE = await platformSupportSnapshot();

  // ══ PHASE 1 — FORWARD PASS #1 ═════════════════════════════════════════════
  console.log('PHASE 1 — forward pass #1 (all four forwards)');
  const p1 = [];
  for (const [n, f] of [['A1', A1_F], ['A3-1', A31_F], ['A3-3', A33_F], ['A3-2', A32_F]]) {
    const r = await tryRun(f); p1.push([n, r]);
    ok(`${n} forward applies cleanly`, r.okRun, r.err || '');
  }
  const afterFwd1 = await platformSupportSnapshot();
  ok('A1 forward actually changed platform_support', afterFwd1 !== BASELINE);
  ok('A1 set exactly 3 rows to instagram=true',
     (await q(`SELECT count(*)::int n FROM t."5.3_content_format"
                WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice','video_short_kinetic_voice')
                  AND platform_support->>'instagram'='true'`))[0].n === 3);
  ok('A1 left video_short_kinetic at instagram=false',
     (await q(`SELECT platform_support->>'instagram' v FROM t."5.3_content_format" WHERE ice_format_key='video_short_kinetic'`))[0].v === 'false');
  ok('all A3 objects exist after forward #1',
     (await q(`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace nn ON nn.oid=p.pronamespace
                WHERE nn.nspname='m' AND p.proname IN ('detect_format_capability_drops','record_format_capability_drops',
                'prune_format_capability_drop','detect_mix_rewrite_removals','record_mix_rewrite_removals','tg_annotate_format_default')`))[0].n === 6);

  // ══ PHASE 2 — A1 IS SINGLE-SHOT ═══════════════════════════════════════════
  console.log('\nPHASE 2 — A1 re-run must be recognised, not misreported');
  const a1again = await tryRun(A1_F);
  ok('A1 forward re-run ABORTS (single-shot, not a silent no-op)', !a1again.okRun);
  ok('A1 re-run says ALREADY APPLIED, not "baseline moved" (N4)',
     /ALREADY APPLIED/i.test(a1again.err || '') && !/baseline moved/i.test(a1again.err || ''),
     (a1again.err || '').slice(0, 160));

  // ══ PHASE 3 — WRITE EVIDENCE, THEN PROVE THE GUARDS ═══════════════════════
  console.log('\nPHASE 3 — evidence written, guards proven');
  const wrote = (await q(`SELECT m.record_mix_rewrite_removals('instagram') n`))[0].n;
  ok('writer records the mix-rewrite removals', Number(wrote) === 2, `returned ${wrote}`);

  const badOrder = await tryRun(A31_R);
  ok('A3-1 rollback BEFORE A3-3 fails (guard or tracked dependency), never silently succeeds',
     !badOrder.okRun, (badOrder.err || '').slice(0, 120));

  // ══ PHASE 4 — ORDERED ROLLBACK ════════════════════════════════════════════
  console.log('\nPHASE 4 — ordered rollback (A3-3 -> A3-2 -> A3-1)');
  ok('A3-3 rollback applies cleanly', (await tryRun(A33_R)).okRun);
  ok('A3-2 rollback applies cleanly', (await tryRun(A32_R)).okRun);

  const guarded = await tryRun(A31_R);
  ok('A3-1 rollback data-loss guard FIRES while evidence rows remain',
     !guarded.okRun && /ROLLBACK ABORT/i.test(guarded.err || ''), (guarded.err || '').slice(0, 120));

  // Deliberate, documented act — the guard requires a conscious decision.
  await db.exec(`DELETE FROM m.format_capability_drop`);
  ok('A3-1 rollback succeeds once evidence is consciously cleared', (await tryRun(A31_R)).okRun);
  ok('A1 rollback applies cleanly', (await tryRun(A1_R)).okRun);

  // ══ PHASE 5 — BASELINE ASSERTIONS ═════════════════════════════════════════
  console.log('\nPHASE 5 — baseline restored');
  const afterRollback = await platformSupportSnapshot();
  ok('A1 ASYMMETRIC rollback restores platform_support BYTE-IDENTICALLY (absent keys included)',
     afterRollback === BASELINE, `expected ${BASELINE.slice(0,90)} got ${afterRollback.slice(0,90)}`);
  ok('both _voice rows have the instagram key ABSENT again, not set to false',
     (await q(`SELECT count(*)::int n FROM t."5.3_content_format"
                WHERE ice_format_key IN ('video_short_stat_voice','video_short_kinetic_voice')
                  AND NOT (platform_support ? 'instagram')`))[0].n === 2);
  ok('every A3 object is gone',
     (await q(`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace nn ON nn.oid=p.pronamespace
                WHERE nn.nspname='m' AND p.proname IN ('detect_format_capability_drops','record_format_capability_drops',
                'prune_format_capability_drop','detect_mix_rewrite_removals','record_mix_rewrite_removals','tg_annotate_format_default')`))[0].n === 0);
  ok('the evidence table is gone', (await q(`SELECT to_regclass('m.format_capability_drop') r`))[0].r === null);
  ok('all three ice_ro views are gone',
     (await q(`SELECT count(*)::int n FROM pg_class cl JOIN pg_namespace nn ON nn.oid=cl.relnamespace
                WHERE nn.nspname='ice_ro'`))[0].n === 0);
  ok('the tables this lane only READS are untouched',
     (await q(`SELECT count(*)::int n FROM t.platform_format_mix_default`))[0].n === 4 &&
     (await q(`SELECT count(*)::int n FROM t."5.3_content_format"`))[0].n === 5);

  // ══ PHASE 6 — FORWARD PASS #2 ═════════════════════════════════════════════
  console.log('\nPHASE 6 — forward pass #2 on the restored baseline');
  for (const [n, f] of [['A1', A1_F], ['A3-1', A31_F], ['A3-3', A33_F], ['A3-2', A32_F]]) {
    const r = await tryRun(f);
    ok(`${n} forward re-applies cleanly after rollback`, r.okRun, (r.err || '').slice(0, 140));
  }

  // ══ PHASE 7 — END STATE IDENTICAL TO PASS #1 ══════════════════════════════
  console.log('\nPHASE 7 — end state matches forward pass #1');
  ok('platform_support end state is identical to forward pass #1',
     (await platformSupportSnapshot()) === afterFwd1);
  ok('all six functions/triggers exist again',
     (await q(`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace nn ON nn.oid=p.pronamespace
                WHERE nn.nspname='m' AND p.proname IN ('detect_format_capability_drops','record_format_capability_drops',
                'prune_format_capability_drop','detect_mix_rewrite_removals','record_mix_rewrite_removals','tg_annotate_format_default')`))[0].n === 6);
  ok('the evidence table is EMPTY on a fresh apply (Gate A is behaviour-inert)',
     Number((await q(`SELECT count(*)::int n FROM m.format_capability_drop`))[0].n) === 0);
  ok('the writer still works after the full round trip',
     Number((await q(`SELECT m.record_mix_rewrite_removals('instagram') n`))[0].n) === 2);

  console.log(`\n${'='.repeat(64)}\ncc-0091 A3 LIFECYCLE validation: ${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log('FULL APPLY -> ROLLBACK -> RE-APPLY LIFECYCLE PROVEN');
}

main().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
