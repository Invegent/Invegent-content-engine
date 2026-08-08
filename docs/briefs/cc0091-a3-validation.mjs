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

  // ══ C1 — RUNTIME-GRID PATH, END TO END ══════════════════════════════════════
  // Both internal audit and external review independently landed on this: the runtime
  // detector and writer had ZERO execution coverage — verified structurally and by hand,
  // never run. They would first have executed against production at Gate B.
  //
  // Closing it needs a fixture the previous one could not provide: the grid stub returned
  // `WHERE false`, so survivors was always empty and there was nothing to LEFT JOIN
  // against. Here facebook carries a two-format enabled_set, the grid returns ONE of them,
  // and the detector must therefore report exactly the other as dropped. That also
  // exercises the enabled_set mirror the artifact names as its own residual.
  console.log('GROUP 7 — C1: runtime-grid detector + writer, executed');
  const CID_OK = '88888888-8888-8888-8888-888888888888';
  const CID_NOSLUG = '99999999-9999-9999-9999-999999999999';
  const CID_V2 = '12121212-1212-1212-1212-121212121212';

  await db.exec(`
    INSERT INTO c.client (client_id, client_slug) VALUES ('${CID_OK}','test-brand');
    -- facebook only: leaves the instagram mix generations (and every mix_rewrite
    -- assertion above) untouched.
    INSERT INTO t.platform_format_mix_default
      (platform, ice_format_key, default_share_pct, effective_from, is_current) VALUES
      ('facebook','img_static', 60, DATE '2026-07-25', true),
      ('facebook','vid_denied', 40, DATE '2026-07-25', true);
    INSERT INTO c.client_format_config (client_id, platform, ice_format_key, is_enabled) VALUES
      ('${CID_OK}','facebook','img_static', true),
      ('${CID_OK}','facebook','vid_denied', true),
      ('${CID_NOSLUG}','facebook','img_static', true),
      ('${CID_NOSLUG}','facebook','vid_denied', true);
  `);
  // The detector is plpgsql, so it resolves the grid at RUNTIME — replacing the stub now
  // is enough. Returning img_static makes it a survivor; vid_denied must drop.
  await db.exec(`
    CREATE OR REPLACE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
    RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
    LANGUAGE sql STABLE AS $s$
      SELECT p_client_id, 'facebook'::text, 'img_static'::text, 60::numeric, 3::integer
    $s$;`);

  const det = await db.query(`SELECT requested_format, capability_status, reason_code
    FROM m.detect_format_capability_drops('${CID_OK}', DATE '2026-08-05')`);
  ok('C1 — the runtime detector EXECUTES and returns exactly the dropped format',
     det.rows.length === 1 && det.rows[0].requested_format === 'vid_denied',
     JSON.stringify(det.rows));
  ok('C1 — the grid SURVIVOR is correctly excluded (enabled_set mirror behaves)',
     !det.rows.some(r => r.requested_format === 'img_static'));

  const w1 = (await db.query(`SELECT m.record_format_capability_drops('${CID_OK}', DATE '2026-08-05') n`)).rows[0].n;
  const rows1 = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop WHERE detection_source='runtime_grid'`)).rows[0].n;
  ok('C1 — the runtime WRITER executes and persists the drop', Number(w1) === 1 && rows1 >= 1,
     `returned=${w1} rows=${rows1}`);

  const stampA = (await db.query(`SELECT max(last_observed_at) t FROM m.format_capability_drop WHERE detection_source='runtime_grid'`)).rows[0].t;
  await new Promise(r => setTimeout(r, 20));
  const w2 = (await db.query(`SELECT m.record_format_capability_drops('${CID_OK}', DATE '2026-08-05') n`)).rows[0].n;
  const rows2 = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop WHERE detection_source='runtime_grid'`)).rows[0].n;
  const stampB = (await db.query(`SELECT max(last_observed_at) t FROM m.format_capability_drop WHERE detection_source='runtime_grid'`)).rows[0].t;

  ok('C1/N3 — the SECOND call returns rows DETECTED (1), not 0 — the repaired contract',
     Number(w2) === 1, `returned=${w2}`);
  ok('C1/S4 — the second call creates NO duplicate row', rows2 === rows1, `${rows1} -> ${rows2}`);
  ok('C1/N2 — last_observed_at ADVANCES on the runtime path too',
     new Date(stampB).getTime() > new Date(stampA).getTime());

  // ── classifier_version — the external review's corrected_action ─────────────
  // The point is not that a column exists; it is that the stamp TRACKS the classifier,
  // so two rows classified by different logic are distinguishable rather than silently
  // comparable. Prove it changes when the classifier changes.
  const cv1 = (await db.query(`SELECT classifier_version FROM m.format_capability_drop
    WHERE client_id='${CID_OK}'`)).rows[0]?.classifier_version;
  const live = (await db.query(`SELECT md5(pg_get_functiondef(p.oid)) v FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='classify_format_capability'`)).rows[0].v;
  ok('classifier_version — stamped, and equals the LIVE classifier definition hash',
     !!cv1 && cv1 === live, `stamped=${cv1} live=${live}`);

  // Change the classifier, write a NEW row, and assert the stamp moved with it.
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.classify_format_capability(p_slug text, p_platform text, p_format text)
    RETURNS jsonb LANGUAGE sql STABLE AS $s$
      SELECT jsonb_build_object('status','unknown','reason_code','stub_v2','routed_lane',NULL,'evidence','{}'::jsonb) $s$;
    INSERT INTO c.client (client_id, client_slug) VALUES ('${CID_V2}','brand-v2');
    INSERT INTO c.client_format_config (client_id, platform, ice_format_key, is_enabled) VALUES
      ('${CID_V2}','facebook','img_static', true),
      ('${CID_V2}','facebook','vid_denied', true);
  `);
  await db.query(`SELECT m.record_format_capability_drops('${CID_V2}', DATE '2026-08-05')`);
  const cv2 = (await db.query(`SELECT classifier_version FROM m.format_capability_drop
    WHERE client_id='${CID_V2}'`)).rows[0]?.classifier_version;
  ok('classifier_version — a CHANGED classifier yields a DIFFERENT stamp (silent reinterpretation is detectable)',
     !!cv2 && cv2 !== cv1, `before=${cv1} after=${cv2}`);
  ok('classifier_version — the ORIGINAL row keeps its first-seen stamp (point-in-time, not rewritten)',
     (await db.query(`SELECT classifier_version FROM m.format_capability_drop
       WHERE client_id='${CID_OK}'`)).rows[0].classifier_version === cv1);

  const mixCv = await db.query(`SELECT count(*)::int n FROM m.format_capability_drop
    WHERE detection_source='mix_rewrite' AND classifier_version IS NOT NULL`);
  ok('classifier_version — NULL on mix_rewrite rows (classifier is client-scoped, never consulted)',
     mixCv.rows[0].n === 0);

  // ── R1 END-TO-END: a client absent from c.client makes the detector emit a NULL
  //    reason_code via its own documented classifier-failure path. Previously provable
  //    only by poking the index directly, because the stub could never produce NULL.
  const wn1 = (await db.query(`SELECT m.record_format_capability_drops('${CID_NOSLUG}', DATE '2026-08-05') n`)).rows[0].n;
  const nullRow = await db.query(`SELECT reason_code, classifier_error, client_slug
    FROM m.format_capability_drop WHERE client_id='${CID_NOSLUG}'`);
  ok('R1 e2e — an unresolvable client yields a NULL reason_code via the real detector',
     Number(wn1) === 1 && nullRow.rows.length === 1 && nullRow.rows[0].reason_code === null,
     JSON.stringify(nullRow.rows));
  ok('R1 e2e — and it is recorded as client_slug_unresolved, not silently blank',
     nullRow.rows[0]?.classifier_error === 'client_slug_unresolved');

  const nrows1 = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop WHERE client_id='${CID_NOSLUG}'`)).rows[0].n;
  const wn2 = (await db.query(`SELECT m.record_format_capability_drops('${CID_NOSLUG}', DATE '2026-08-05') n`)).rows[0].n;
  const nrows2 = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop WHERE client_id='${CID_NOSLUG}'`)).rows[0].n;
  ok('R1 e2e — NULLS NOT DISTINCT dedupes the NULL-reason_code row THROUGH THE WRITER',
     nrows2 === nrows1 && Number(wn2) === 1, `${nrows1} -> ${nrows2}, returned=${wn2}`);

  // ── F1 — the stamp must be OVERLOAD-PROOF ───────────────────────────────────
  // This assertion FAILED before the F1 fix. The lookup matched on name alone with a bare
  // LIMIT 1 and no ORDER BY, so adding an overload made the stamp non-deterministic: it
  // could hash a function that was never called, and because the documented reading rule
  // is "a different stamp means different logic", an unstable stamp MANUFACTURES false
  // reinterpretation warnings. Pinning the exact signature makes it deterministic.
  const CID_OVL = '14141414-1414-1414-1414-141414141414';
  const hash3 = (await db.query(`SELECT md5(pg_get_functiondef(
    'public.classify_format_capability(text,text,text)'::regprocedure)) v`)).rows[0].v;
  await db.exec(`
    CREATE FUNCTION public.classify_format_capability(a text, b text, c text, d jsonb)
    RETURNS jsonb LANGUAGE sql STABLE AS $s$ SELECT '{"status":"overload"}'::jsonb $s$;
    INSERT INTO c.client (client_id, client_slug) VALUES ('${CID_OVL}','brand-ovl');
    INSERT INTO c.client_format_config (client_id, platform, ice_format_key, is_enabled) VALUES
      ('${CID_OVL}','facebook','img_static', true),
      ('${CID_OVL}','facebook','vid_denied', true);
  `);
  await db.query(`SELECT m.record_format_capability_drops('${CID_OVL}', DATE '2026-08-05')`);
  const ovlStamp = (await db.query(`SELECT classifier_version FROM m.format_capability_drop
    WHERE client_id='${CID_OVL}'`)).rows[0]?.classifier_version;
  ok('F1 — an OVERLOAD does not corrupt the stamp; it still hashes the 3-arg function called',
     ovlStamp === hash3, `stamped=${ovlStamp} expected3arg=${hash3}`);
  await db.exec(`DROP FUNCTION public.classify_format_capability(text,text,text,jsonb);`);

  // F2 — the invariant is now a TABLE guarantee, not a writer convention
  let f2 = null;
  try {
    await db.exec(`INSERT INTO m.format_capability_drop (detection_source, client_id, platform,
      requested_format, evidence_iso_week, classifier_version, platform_support_key_present)
      VALUES ('runtime_grid','${CID_OVL}','facebook','x', DATE '2026-08-03', NULL, false)`);
  } catch (e) { f2 = e?.code; try { await db.exec('ROLLBACK'); } catch {} }
  ok('F2 — a runtime_grid row with NULL classifier_version is REJECTED by the table (23514)',
     f2 === '23514', `sqlstate=${f2}`);

  // ── fail-soft NULL fix: the ambiguous path is REACHABLE, so prove it raises ──
  // Reachable because a client absent from c.client makes the detector take its documented
  // v_slug IS NULL branch and NEVER call the classifier — so a missing classifier would go
  // unnoticed and unattributable rows would land with a NULL stamp indistinguishable from
  // the legitimate "not applicable" NULL. That is the ambiguity this lane exists to kill.
  const CID_ORPHAN = '13131313-1313-1313-1313-131313131313';
  await db.exec(`
    INSERT INTO c.client_format_config (client_id, platform, ice_format_key, is_enabled) VALUES
      ('${CID_ORPHAN}','facebook','img_static', true),
      ('${CID_ORPHAN}','facebook','vid_denied', true);
    DROP FUNCTION public.classify_format_capability(text, text, text);
  `);
  const beforeOrphan = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop`)).rows[0].n;
  let raised = null;
  try { await db.query(`SELECT m.record_format_capability_drops('${CID_ORPHAN}', DATE '2026-08-05')`); }
  catch (e) { raised = String(e.message || e); try { await db.exec('ROLLBACK'); } catch {} }
  const afterOrphan = (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop`)).rows[0].n;

  // The FIRST cut of this assertion demanded the WRITER's guard fire. It does not, and
  // that is correct: plpgsql resolves the detector's classifier reference at PLAN time, so
  // a missing classifier raises 42883 in the DETECTOR before any row exists. The property
  // that actually matters is not WHICH layer refuses — it is that SOME layer does, and
  // that nothing unattributable is ever persisted. Assert that.
  ok('fail-soft fix — a missing classifier RAISES somewhere (detector plan-time or writer guard), never writes',
     raised !== null && (/unattributable/i.test(raised) || /does not exist/i.test(raised)),
     (raised || 'NO EXCEPTION — an unattributable row would have been written').slice(0, 130));
  ok('fail-soft fix — and NOTHING was persisted (the RAISE rolled the INSERT back)',
     afterOrphan === beforeOrphan, `${beforeOrphan} -> ${afterOrphan}`);

  // restore the classifier for any later assertion
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.classify_format_capability(p_slug text, p_platform text, p_format text)
    RETURNS jsonb LANGUAGE sql STABLE AS $s$
      SELECT jsonb_build_object('status','unknown','reason_code','stub_v2','routed_lane',NULL,'evidence','{}'::jsonb) $s$;`);
  // A DROP+CREATE gives the classifier a NEW OID while plpgsql still holds the OLD one in
  // its cached plan (the ::regprocedure literal is folded at plan time). pg_get_functiondef
  // on that dead OID yields NULL — so the stamp guard IS reachable, contrary to the
  // reasoning that briefly deleted it. Assert the writer refuses rather than writing an
  // unattributable row.
  let staleErr = null;
  try { await db.query(`SELECT m.record_format_capability_drops('${CID_ORPHAN}', DATE '2026-08-05')`); }
  catch (e) { staleErr = String(e.message || e); try { await db.exec('ROLLBACK'); } catch {} }
  ok('stamp guard — a STALE CACHED OID (DROP+CREATE) makes the writer REFUSE, not write NULL',
     staleErr !== null && /unattributable/i.test(staleErr), (staleErr || 'no exception').slice(0, 110));
  ok('stamp guard — and nothing unattributable was persisted',
     (await db.query(`SELECT count(*)::int n FROM m.format_capability_drop
        WHERE detection_source='runtime_grid' AND classifier_version IS NULL`)).rows[0].n === 0);

  // ── N8 — ck_fcd_class_scope, the silent-merge guard ─────────────────────────
  // R1's NULLS NOT DISTINCT flipped a NULL evidence_iso_week from "duplicate rows"
  // (lossless) to "rows collapse into one" (evidence LOSS). These assertions prove the
  // constraint closes that, and that it does not over-reach onto valid rows.
  // D3: assert the SQLSTATE, not merely that SOMETHING threw. An expected-failure test
  // that accepts any exception can pass on a typo or a type error and still look green.
  // 23514 = check_violation, 23505 = unique_violation.
  const N8 = async (label, stmt, shouldReject, code = '23514') => {
    let state = null;
    try { await db.exec(stmt); }
    catch (e) { state = e?.cause?.code ?? e?.code ?? String(e.message || e); try { await db.exec('ROLLBACK'); } catch {} }
    const rejected = state !== null;
    const rightReason = !shouldReject || String(state).includes(code);
    ok(label, rejected === shouldReject && rightReason, `state=${state} expected_reject=${shouldReject} code=${code}`);
  };
  const CID = "'66666666-6666-6666-6666-666666666666'";

  await N8('N8 — runtime_grid with NULL evidence_iso_week is REJECTED (the silent-merge hole)',
    `INSERT INTO m.format_capability_drop (detection_source, client_id, platform,
       requested_format, evidence_iso_week, classifier_version, platform_support_key_present)
     VALUES ('runtime_grid', ${CID}, 'instagram', 'f1', NULL, 'fixture-stamp', false)`, true);

  await N8('N8 — mix_rewrite with NULL prior_effective_from is REJECTED (dedupe key would break)',
    `INSERT INTO m.format_capability_drop (detection_source, platform, requested_format,
       prior_effective_from, platform_support_key_present)
     VALUES ('mix_rewrite', 'instagram', 'f2', NULL, false)`, true);

  await N8('N8 — runtime_grid carrying mix-rewrite-only class facts is REJECTED',
    `INSERT INTO m.format_capability_drop (detection_source, client_id, platform,
       requested_format, evidence_iso_week, classifier_version, class_eliminated,
       platform_support_key_present)
     VALUES ('runtime_grid', ${CID}, 'instagram', 'f3', DATE '2026-08-03', 'fixture-stamp',
             true, false)`, true);

  await N8('N8 — a VALID runtime_grid row is ACCEPTED (constraint does not over-reach)',
    `INSERT INTO m.format_capability_drop (detection_source, client_id, platform,
       requested_format, evidence_iso_week, reason_code, classifier_version,
       platform_support_key_present)
     VALUES ('runtime_grid', ${CID}, 'instagram', 'f4', DATE '2026-08-03', 'ok',
             'fixture-stamp', false)`, false);

  await N8('N8 — a VALID mix_rewrite row is ACCEPTED',
    `INSERT INTO m.format_capability_drop (detection_source, platform, requested_format,
       prior_effective_from, output_mime_type, class_eliminated, platform_support_key_present)
     VALUES ('mix_rewrite', 'instagram', 'f5', DATE '2026-04-22', 'video/mp4', true, false)`, false);

  // ── C2 — the dependency assertion must name every column A3-3 writes ─────────
  const a33src = readFileSync(A3_3, 'utf8');
  const depBlock = a33src.split('BEGIN;')[1].split('CREATE OR REPLACE FUNCTION')[0];
  ok('C2 — A3-3 dependency assertion names evidence_iso_week (the renamed column)',
     /evidence_iso_week/.test(depBlock));
  // D1(b): label this for what it ACTUALLY does. It checks a fixed list of the 8
  // skew-capable columns, so it catches a REMOVAL but cannot catch a forgotten 9th —
  // which is precisely what C2 was. Making it genuinely drift-proof would mean parsing
  // A3-3's INSERT list against A3-1's CREATE TABLE; more machinery than the risk warrants.
  ok('C2 — the dependency assertion still names all 8 skew-capable columns (catches removal, NOT a forgotten 9th)',
     ['detection_source','prior_effective_from','output_mime_type','class_share_before',
      'class_share_after','class_eliminated','last_observed_at','evidence_iso_week']
       .every(c => depBlock.includes(`'${c}'`)));

  // ── R1 — NULLS NOT DISTINCT on the runtime key ──────────────────────────────
  // The auditor flagged that this harness structurally CANNOT reach the NULL-reason_code
  // path through the writer, because the classifier stub hardcodes reason_code='stub'.
  // So exercise the index directly: m.detect_format_capability_drops emits a NULL
  // reason_code on its own documented v_slug IS NULL classifier-failure path, and before
  // the fix those rows could never conflict and would duplicate nightly, unbounded.
  // NOTE: classifier_version is REQUIRED on runtime_grid rows since the F2 conjuncts
  // joined ck_fcd_class_scope. A direct-insert fixture must supply it, exactly as the
  // writer does — the constraint binds every path, which is the point of F2.
  const R1ROW = `INSERT INTO m.format_capability_drop
    (detection_source, client_id, platform, requested_format, evidence_iso_week,
     reason_code, classifier_version, platform_support_key_present)
    VALUES ('runtime_grid','55555555-5555-5555-5555-555555555555','instagram','vid_x',
            DATE '2026-08-03', NULL, 'fixture-stamp', false)`;
  await db.exec(R1ROW);
  let r1state = null;
  try { await db.exec(R1ROW); }
  catch (e) { r1state = e?.code ?? String(e.message || e); try { await db.exec('ROLLBACK'); } catch {} }
  // D3: 23505 = unique_violation specifically. A bare "something threw" would pass on a
  // typo or a CHECK violation and still look green — the exact defect class this suite exists for.
  ok('R1 — a SECOND row with NULL reason_code is REJECTED with 23505 (NULLS NOT DISTINCT is active)',
     String(r1state) === '23505', `sqlstate=${r1state}`);

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
