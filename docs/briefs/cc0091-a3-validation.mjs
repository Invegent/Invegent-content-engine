// cc0091-a3-validation.mjs
// =====================================================================
// PGlite (offline, no prod) hermetic validation for cc-0091 A3.
//
// Loads the REAL SQL from the A3-1 / A3-2 / A3-3 artifact files — not a
// mirror — and runs the assertions demanded by the issued brief:
//
//   * UNPROVEN is distinguishable from UNSUPPORTED_WITH_CAUSE and from
//     SUPPORTED, and an ABSENT platform_support key is NEVER coerced to false.
//   * A capability-driven removal SURFACES as a durable gap record rather
//     than silently degrading to a static post.
//   * NEGATIVE TEST — fails if the silent path is reachable, i.e. if a
//     removal can occur without producing a record.
//   * Zero behaviour change — the fill still happens, decision/chosen_format
//     are untouched, and the annotation is fail-open.
//
// Run:  node docs/briefs/cc0091-a3-validation.mjs
//   (requires @electric-sql/pglite, dev-only, NOT committed — see the house
//    pattern in docs/briefs/format-mix-phase1-validation.mjs)
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = process.env.CC0091_ARTIFACT_DIR || join(__dirname, 'artifacts');

const A3_1 = join(ART, 'NOT_APPLIED_cc0091_a3_1_format_capability_drop_surface_v1.sql');
const A3_2 = join(ART, 'NOT_APPLIED_cc0091_a3_2_format_default_annotation_v1.sql');
const A3_3 = join(ART, 'NOT_APPLIED_cc0091_a3_3_mix_rewrite_removal_detector_v1.sql');

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(`${name}${detail ? ' :: ' + detail : ''}`); console.log(`  FAIL  ${name} ${detail}`); }
}

// Strip the leading comment banner and any dependency-assertion DO block, which
// exists to guard a real apply and cannot run against a bare fixture DB.
function loadArtifact(path, { dropDependencyAssert = false } = {}) {
  let sql = readFileSync(path, 'utf8');
  // remove trailing verification comments (everything is comments there anyway)
  if (dropDependencyAssert) {
    // remove the single DO $$ ... END $$; block that precedes the first CREATE
    const firstCreate = sql.search(/CREATE (OR REPLACE )?(FUNCTION|TABLE|VIEW|TRIGGER)/i);
    const head = sql.slice(0, firstCreate);
    const body = sql.slice(firstCreate);
    sql = head.replace(/DO \$\$[\s\S]*?END \$\$;/g, '') + body;
  }
  return sql;
}

const db = new PGlite();

async function main() {
  // ── Fixture: schemas, roles, and the two source tables the A3 SQL reads ──
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS m;
    CREATE SCHEMA IF NOT EXISTS t;
    CREATE SCHEMA IF NOT EXISTS c;
    CREATE SCHEMA IF NOT EXISTS ice_ro;
    CREATE ROLE ice_readonly;
    CREATE ROLE inspector_ro;
    CREATE ROLE anon;
    CREATE ROLE authenticated;

    CREATE TABLE t."5.3_content_format" (
      ice_format_key text PRIMARY KEY,
      is_active boolean NOT NULL DEFAULT true,
      format_category text,
      output_mime_type text,
      render_engine text,
      platform_support jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE t.platform_format_mix_default (
      mix_default_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      platform text NOT NULL,
      ice_format_key text NOT NULL,
      default_share_pct numeric,
      effective_from date NOT NULL,
      is_current boolean NOT NULL
    );

    CREATE TABLE m.slot (
      slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      format_preference text[]
    );

    CREATE TABLE m.slot_fill_attempt (
      attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slot_id uuid NOT NULL,
      attempted_at timestamptz NOT NULL DEFAULT now(),
      pool_snapshot jsonb,
      decision text NOT NULL,
      skip_reason text,
      chosen_format text
    );
  `);

  // ── Fixture data: the three capability states the brief demands be distinct ──
  await db.exec(`
    INSERT INTO t."5.3_content_format"
      (ice_format_key, output_mime_type, render_engine, format_category, platform_support) VALUES
      -- SUPPORTED: key present, true
      ('vid_supported',   'video/mp4', 'creatomate', NULL, '{"instagram": true}'::jsonb),
      -- UNSUPPORTED_WITH_CAUSE: key present, explicit false
      ('vid_denied',      'video/mp4', 'creatomate', NULL, '{"instagram": false}'::jsonb),
      -- UNPROVEN: key ABSENT entirely (the case that must never collapse to false)
      ('vid_unproven',    'video/mp4', 'creatomate', NULL, '{"youtube": true}'::jsonb),
      -- a surviving static format so class-swap can be distinguished from class-elimination
      ('img_static',      'image/png', 'creatomate', 'image', '{"instagram": true}'::jsonb);

    -- Prior generation (superseded) then current generation, mirroring a real rewrite.
    INSERT INTO t.platform_format_mix_default (platform, ice_format_key, default_share_pct, effective_from, is_current) VALUES
      ('instagram','vid_supported', 20, DATE '2026-04-22', false),
      ('instagram','vid_denied',    15, DATE '2026-04-22', false),
      ('instagram','vid_unproven',  10, DATE '2026-04-22', false),
      ('instagram','img_static',    55, DATE '2026-04-22', false),
      ('instagram','img_static',   100, DATE '2026-07-25', true);
  `);

  // ── Load the REAL A3-1 SQL (table + constraint + functions + view) ──
  // The detector/writer reference m.build_weekly_demand_grid and
  // public.classify_format_capability; stub both so the artifact loads verbatim.
  await db.exec(`
    CREATE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
    RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
    LANGUAGE sql STABLE AS $s$ SELECT NULL::uuid, NULL::text, NULL::text, NULL::numeric, NULL::integer WHERE false $s$;

    CREATE SCHEMA IF NOT EXISTS public;
    CREATE FUNCTION public.classify_format_capability(p_slug text, p_platform text, p_format text)
    RETURNS jsonb LANGUAGE sql STABLE AS $s$ SELECT jsonb_build_object('status','unknown','reason_code','stub','routed_lane',NULL,'evidence','{}'::jsonb) $s$;

    CREATE TABLE c.client (client_id uuid PRIMARY KEY, client_slug text);
    CREATE TABLE c.client_format_mix_override (client_id uuid, platform text, ice_format_key text, override_share_pct numeric, is_current boolean);
    CREATE TABLE c.client_format_config (client_id uuid, platform text, ice_format_key text, is_enabled boolean);
  `);

  await db.exec(loadArtifact(A3_1));
  console.log('\n[loaded] A3-1 artifact');

  await db.exec(loadArtifact(A3_3, { dropDependencyAssert: true }));
  console.log('[loaded] A3-3 artifact');

  await db.exec(loadArtifact(A3_2));
  console.log('[loaded] A3-2 artifact\n');

  // ══ TEST GROUP 1 — three capability states stay distinct ══════════════════
  console.log('GROUP 1 — capability states must not collapse');
  const st = await db.query(`
    SELECT requested_format, platform_support_raw_now AS raw, platform_support_key_present AS present
      FROM m.detect_mix_rewrite_removals('instagram') ORDER BY requested_format`);
  const byFmt = Object.fromEntries(st.rows.map(r => [r.requested_format, r]));

  ok('SUPPORTED  -> raw=true,  key_present=true',
     byFmt.vid_supported?.raw === 'true' && byFmt.vid_supported?.present === true,
     JSON.stringify(byFmt.vid_supported));
  ok('UNSUPPORTED_WITH_CAUSE -> raw=false, key_present=true',
     byFmt.vid_denied?.raw === 'false' && byFmt.vid_denied?.present === true,
     JSON.stringify(byFmt.vid_denied));
  ok('UNPROVEN -> raw IS NULL, key_present=FALSE (absent key NEVER coerced to false)',
     byFmt.vid_unproven?.raw === null && byFmt.vid_unproven?.present === false,
     JSON.stringify(byFmt.vid_unproven));
  ok('UNPROVEN is distinguishable from UNSUPPORTED_WITH_CAUSE',
     byFmt.vid_unproven?.present !== byFmt.vid_denied?.present);

  // ══ TEST GROUP 2 — NEGATIVE: silent removal must be unreachable ═══════════
  console.log('\nGROUP 2 — NEGATIVE TEST: a removal must never be silent');
  const removed = await db.query(`SELECT count(*)::int AS n FROM m.detect_mix_rewrite_removals('instagram')`);
  ok('3 removed formats are DETECTED (fails if the silent path is reachable)',
     removed.rows[0].n === 3, `detected=${removed.rows[0].n}, expected 3`);

  const wrote = await db.query(`SELECT m.record_mix_rewrite_removals('instagram') AS n`);
  ok('all 3 removals are DURABLY RECORDED, not merely observable',
     wrote.rows[0].n === 3, `recorded=${wrote.rows[0].n}`);

  const persisted = await db.query(`
    SELECT count(*)::int AS n FROM m.format_capability_drop WHERE detection_source='mix_rewrite'`);
  ok('records persist with detection_source=mix_rewrite', persisted.rows[0].n === 3);

  // ══ TEST GROUP 3 — class-elimination guard must not cry wolf ══════════════
  console.log('\nGROUP 3 — class-elimination guard precision');
  const cls = await db.query(`SELECT output_mime_type, class_share_before, class_share_after
                                FROM ice_ro.mix_rewrite_class_elimination ORDER BY output_mime_type`);
  ok('video/mp4 elimination IS flagged (35 -> 0)',
     cls.rows.length === 1 && cls.rows[0].output_mime_type === 'video/mp4',
     JSON.stringify(cls.rows));
  ok('image/png swap (55 -> 100) is NOT flagged — a swap is not an elimination',
     !cls.rows.some(r => r.output_mime_type === 'image/png'));

  // ══ TEST GROUP 4 — discriminator invariant ════════════════════════════════
  console.log('\nGROUP 4 — evidence-surface invariants');
  let threw = false;
  try {
    await db.exec(`INSERT INTO m.format_capability_drop
      (detection_source, client_id, platform, requested_format, platform_support_key_present)
      VALUES ('runtime_grid', NULL, 'instagram', 'x', false)`);
  } catch { threw = true; }
  ok('ck_fcd_client_scope REJECTS an unattributable runtime_grid row', threw);

  threw = false;
  try {
    await db.exec(`INSERT INTO m.format_capability_drop
      (detection_source, client_id, platform, requested_format, platform_support_key_present)
      VALUES ('mix_rewrite', gen_random_uuid(), 'instagram', 'x', false)`);
  } catch { threw = true; }
  ok('ck_fcd_client_scope REJECTS a client-scoped mix_rewrite row', threw);

  // ══ TEST GROUP 5 — A3-2 annotation, and zero behaviour change ═════════════
  console.log('\nGROUP 5 — A3-2 annotation is additive and fail-open');
  await db.exec(`
    INSERT INTO m.slot (slot_id, format_preference) VALUES
      ('11111111-1111-1111-1111-111111111111', NULL),                 -- no preference -> default
      ('22222222-2222-2222-2222-222222222222', ARRAY['image_quote']); -- explicit request
    INSERT INTO m.slot_fill_attempt (slot_id, decision, chosen_format, pool_snapshot) VALUES
      ('11111111-1111-1111-1111-111111111111','filled','image_quote','{"pool":7}'::jsonb),
      ('22222222-2222-2222-2222-222222222222','filled','image_quote','{"pool":7}'::jsonb);
  `);

  const ann = await db.query(`
    SELECT slot_id::text, decision, chosen_format,
           pool_snapshot -> 'cc0091_a3_2' ->> 'format_defaulted' AS defaulted,
           pool_snapshot ->> 'pool' AS pool_preserved
      FROM m.slot_fill_attempt ORDER BY slot_id`);
  const dflt = ann.rows[0], expl = ann.rows[1];

  ok('a DEFAULTED fill is annotated format_defaulted=true', dflt.defaulted === 'true', JSON.stringify(dflt));
  ok('S3 — an EXPLICIT request is annotated format_defaulted=FALSE (not left absent)',
     expl.defaulted === 'false', JSON.stringify(expl));
  ok('pre-existing pool_snapshot keys are PRESERVED (merge, not overwrite)',
     dflt.pool_preserved === '7' && expl.pool_preserved === '7');
  ok('decision is UNCHANGED by the annotation', dflt.decision === 'filled' && expl.decision === 'filled');
  ok('chosen_format is UNCHANGED by the annotation',
     dflt.chosen_format === 'image_quote' && expl.chosen_format === 'image_quote');

  // fail-open: a missing slot row must not break the insert
  let inserted = true;
  try {
    await db.exec(`INSERT INTO m.slot_fill_attempt (slot_id, decision, chosen_format)
                   VALUES ('33333333-3333-3333-3333-333333333333','filled','image_quote')`);
  } catch { inserted = false; }
  ok('annotation is FAIL-OPEN — an unresolvable slot never blocks the fill record', inserted);


  // ── S2: non-'filled' decisions must NOT be annotated ────────────────────────
  await db.exec(`
    INSERT INTO m.slot (slot_id, format_preference)
      VALUES ('44444444-4444-4444-4444-444444444444', NULL);
    INSERT INTO m.slot_fill_attempt (slot_id, decision, skip_reason, chosen_format)
      VALUES ('44444444-4444-4444-4444-444444444444','skipped','capability_blocked:x','image_quote');
  `);
  // COALESCE: an un-annotated row leaves pool_snapshot NULL, and NULL ? 'k' is NULL,
  // not false — assert on the coalesced fact, not on the three-valued operator result.
  const skipped = await db.query(`SELECT COALESCE(pool_snapshot ? 'cc0091_a3_2', false) AS annotated
    FROM m.slot_fill_attempt WHERE slot_id='44444444-4444-4444-4444-444444444444'`);
  ok("S2 — a 'skipped' row carrying chosen_format is NOT annotated as a fill",
     skipped.rows[0].annotated === false, JSON.stringify(skipped.rows[0]));

  let reapplied = true;
  try {
    await db.exec(`CREATE OR REPLACE TRIGGER tg_slot_fill_attempt_annotate_format_default
      BEFORE INSERT ON m.slot_fill_attempt FOR EACH ROW
      EXECUTE FUNCTION m.tg_annotate_format_default();`);
  } catch { reapplied = false; }
  ok('M3 — re-applying the trigger DDL succeeds (idempotent)', reapplied);

  console.log('GROUP 6 — S4 dedupe and M1 view shape');
  const before = await db.query(`SELECT count(*)::int AS n FROM m.format_capability_drop`);
  const stamp0 = await db.query(`SELECT max(last_observed_at) AS t FROM m.format_capability_drop`);
  await new Promise(r => setTimeout(r, 20));
  const again  = await db.query(`SELECT m.record_mix_rewrite_removals('instagram') AS n`);
  const after  = await db.query(`SELECT count(*)::int AS n FROM m.format_capability_drop`);
  const stamp1 = await db.query(`SELECT max(last_observed_at) AS t FROM m.format_capability_drop`);

  ok('S4 — re-running the writer creates NO duplicate rows',
     after.rows[0].n === before.rows[0].n,
     `before=${before.rows[0].n}, after=${after.rows[0].n}`);
  ok('N3 — return value is rows DETECTED, not rows inserted (0 would be ambiguous)',
     again.rows[0].n === 3, `returned=${again.rows[0].n}, expected 3`);
  ok('N2 — last-seen: last_observed_at ADVANCES on re-detection',
     new Date(stamp1.rows[0].t).getTime() > new Date(stamp0.rows[0].t).getTime(),
     `${stamp0.rows[0].t} -> ${stamp1.rows[0].t}`);

  const firstSeen = await db.query(`SELECT count(*)::int AS n FROM m.format_capability_drop
    WHERE observed_at > last_observed_at`);
  ok('N2 — observed_at (FIRST seen) is never rewritten by a re-detection',
     firstSeen.rows[0].n === 0);

  // N2 — reason_code is part of the runtime natural key
  const idx = await db.query(`SELECT pg_get_indexdef(i.indexrelid) AS d FROM pg_index i
     JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='uq_fcd_runtime_grid'`);
  ok('N2 — uq_fcd_runtime_grid includes reason_code (a changed reason records a NEW row)',
     /reason_code/.test(idx.rows[0].d), idx.rows[0].d);

  // N5 — A3-3 dependency guard names every column it needs
  const a33 = readFileSync(A3_3, 'utf8');
  ok('N5 — A3-3 dependency assertion covers class_eliminated and last_observed_at',
     /class_eliminated/.test(a33.split('BEGIN;')[1].split('CREATE OR REPLACE FUNCTION')[0]) &&
     /last_observed_at/.test(a33.split('BEGIN;')[1].split('CREATE OR REPLACE FUNCTION')[0]));

  // N1 — Gate-A verification must not INSTRUCT a production write.
  // Match an instructional comment line only (`--   SELECT m.record_...`), not the
  // artifact's own quotation of the retired instruction inside its warning text.
  const liveWriteInstruction = /^--\s+SELECT m\.record_mix_rewrite_removals/m.test(a33);
  ok('N1 — A3-3 no longer INSTRUCTS running the writer as Gate-A verification',
     !liveWriteInstruction);
  ok('N1 — A3-3 carries the explicit DO-NOT-WRITE warning and a read-only proof',
     /DO NOT prove it by running the writer in Gate A/.test(a33) &&
     /PROVE IT READ-ONLY/.test(a33));

  // ── N8 — ck_fcd_class_scope, the silent-merge guard ─────────────────────────
  // R1's NULLS NOT DISTINCT flipped a NULL evidence_iso_week from "duplicate rows"
  // (lossless) to "rows collapse into one" (evidence LOSS). These assertions prove the
  // constraint closes that, and that it does not over-reach onto valid rows.
  const N8 = async (label, stmt, shouldReject) => {
    let threw = false;
    try { await db.exec(stmt); } catch { threw = true; try { await db.exec('ROLLBACK'); } catch {} }
    ok(label, threw === shouldReject, `threw=${threw} expected=${shouldReject}`);
  };
  const CID = "'66666666-6666-6666-6666-666666666666'";

  await N8('N8 — runtime_grid with NULL evidence_iso_week is REJECTED (the silent-merge hole)',
    `INSERT INTO m.format_capability_drop (detection_source, client_id, platform,
       requested_format, evidence_iso_week, platform_support_key_present)
     VALUES ('runtime_grid', ${CID}, 'instagram', 'f1', NULL, false)`, true);

  await N8('N8 — mix_rewrite with NULL prior_effective_from is REJECTED (dedupe key would break)',
    `INSERT INTO m.format_capability_drop (detection_source, platform, requested_format,
       prior_effective_from, platform_support_key_present)
     VALUES ('mix_rewrite', 'instagram', 'f2', NULL, false)`, true);

  await N8('N8 — runtime_grid carrying mix-rewrite-only class facts is REJECTED',
    `INSERT INTO m.format_capability_drop (detection_source, client_id, platform,
       requested_format, evidence_iso_week, class_eliminated, platform_support_key_present)
     VALUES ('runtime_grid', ${CID}, 'instagram', 'f3', DATE '2026-08-03', true, false)`, true);

  await N8('N8 — a VALID runtime_grid row is ACCEPTED (constraint does not over-reach)',
    `INSERT INTO m.format_capability_drop (detection_source, client_id, platform,
       requested_format, evidence_iso_week, reason_code, platform_support_key_present)
     VALUES ('runtime_grid', ${CID}, 'instagram', 'f4', DATE '2026-08-03', 'ok', false)`, false);

  await N8('N8 — a VALID mix_rewrite row is ACCEPTED',
    `INSERT INTO m.format_capability_drop (detection_source, platform, requested_format,
       prior_effective_from, output_mime_type, class_eliminated, platform_support_key_present)
     VALUES ('mix_rewrite', 'instagram', 'f5', DATE '2026-04-22', 'video/mp4', true, false)`, false);

  // ── C2 — the dependency assertion must name every column A3-3 writes ─────────
  const a33src = readFileSync(A3_3, 'utf8');
  const depBlock = a33src.split('BEGIN;')[1].split('CREATE OR REPLACE FUNCTION')[0];
  ok('C2 — A3-3 dependency assertion names evidence_iso_week (the renamed column)',
     /evidence_iso_week/.test(depBlock));
  const written = [...a33src.matchAll(/^\s*(detection_source|evidence_iso_week|prior_effective_from|output_mime_type|class_share_before|class_share_after|class_eliminated|last_observed_at)/gm)].length;
  ok('C2 — every column A3-3 depends on appears in its dependency assertion',
     ['detection_source','prior_effective_from','output_mime_type','class_share_before',
      'class_share_after','class_eliminated','last_observed_at','evidence_iso_week']
       .every(c => depBlock.includes(`'${c}'`)));

  // ── R1 — NULLS NOT DISTINCT on the runtime key ──────────────────────────────
  // The auditor flagged that this harness structurally CANNOT reach the NULL-reason_code
  // path through the writer, because the classifier stub hardcodes reason_code='stub'.
  // So exercise the index directly: m.detect_format_capability_drops emits a NULL
  // reason_code on its own documented v_slug IS NULL classifier-failure path, and before
  // the fix those rows could never conflict and would duplicate nightly, unbounded.
  const R1ROW = `INSERT INTO m.format_capability_drop
    (detection_source, client_id, platform, requested_format, evidence_iso_week,
     reason_code, platform_support_key_present)
    VALUES ('runtime_grid','55555555-5555-5555-5555-555555555555','instagram','vid_x',
            DATE '2026-08-03', NULL, false)`;
  await db.exec(R1ROW);
  let rejected = false;
  try { await db.exec(R1ROW); } catch { rejected = true; try { await db.exec('ROLLBACK'); } catch {} }
  ok('R1 — a SECOND row with NULL reason_code is REJECTED (NULLS NOT DISTINCT is active)',
     rejected);

  const beforeR1 = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop
    WHERE detection_source='runtime_grid'`)).rows[0].n;
  await db.exec(R1ROW + ` ON CONFLICT (client_id, platform, requested_format, evidence_iso_week, reason_code)
    WHERE detection_source = 'runtime_grid' DO UPDATE SET last_observed_at = now()`);
  const afterR1 = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop
    WHERE detection_source='runtime_grid'`)).rows[0].n;
  ok('R1 — the ON CONFLICT path DEDUPES a NULL-reason_code row instead of duplicating',
     afterR1 === beforeR1, `before=${beforeR1} after=${afterR1}`);

  const vdef = await db.query(`SELECT pg_get_viewdef('ice_ro.mix_rewrite_class_elimination'::regclass, true) AS d`);
  ok('M1 — alarm view no longer calls detect_mix_rewrite_removals (table-backed)',
     !/detect_mix_rewrite_removals/i.test(vdef.rows[0].d), vdef.rows[0].d.slice(0,120));
  ok('M1 — alarm view reads m.format_capability_drop',
     /format_capability_drop/i.test(vdef.rows[0].d));

  console.log(`\n${'='.repeat(60)}\ncc-0091 A3 validation: ${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log('ALL ASSERTIONS PASSED');
}

main().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
