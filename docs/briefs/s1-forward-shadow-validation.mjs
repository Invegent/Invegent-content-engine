// s1-forward-shadow-validation.mjs
// =====================================================================
// PGlite (offline, no prod) validation for S1 Forward Shadow Stamping:
// public.stamp_tmr_shadow_forward (new migration under test).
//
// Loads FOUR real SQL migration files verbatim (roles created in the
// fixture so the actual files load unmodified):
//   1. supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql
//   2. supabase/migrations/20260703035154_create_select_template_v1.sql
//   3. supabase/migrations/20260703064651_create_tmr_shadow_decision_v1.sql
//   4. supabase/migrations/20260703200000_create_stamp_tmr_shadow_forward_v1.sql  (under test)
// into PGlite (WASM Postgres with plpgsql), builds a minimal `c` + `m`
// fixture mirroring live (post_draft PK = post_draft_id; post_render_log
// PK = render_log_id), and runs the brief's required cases 1–8.
// This is the ACTUAL SQL — not a mirror.
//
// Fixture = POST-LANE-0 registry state: generic selectable templates
// (tpl-q1 winner / tpl-q2 / tpl-q0; tpl-q3 proposed) PLUS the B1
// production template registered CLIENT-scoped (provider_template_id =
// fb9820f8… matches the fixture render_specs) — so B1 rows classify
// selector_disagreement, not blanket structural. Pool: 6 fresh
// unshadowed B1-label renders (2 selector_disagreement fb+ig · 1
// agreement · 1 background_divergence · 1 structural off-registry
// contract-less · 1 linkedin selector_fail_closed-as-DATA) + 4 rows the
// pool query must EXCLUDE (already-shadowed pre-seed · status=failed ·
// non-B1 label · null post_draft_id).
//
// Run:  node docs/briefs/s1-forward-shadow-validation.mjs
//   (requires @electric-sql/pglite; installed dev-only OUTSIDE the repo,
//    NOT committed. Env overrides for ALL sql files let the test run from
//    a dir where PGlite is installed (ESM ignores NODE_PATH):
//    RESOLVE_SQL_PATH · SELECT_SQL_PATH · SHADOW_SQL_PATH ·
//    STAMPER_SQL_PATH; defaults = repo-relative locations.)
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');
const RESOLVE_SQL = process.env.RESOLVE_SQL_PATH ||
  join(REPO, 'supabase', 'migrations', '20260703002813_create_resolve_slot_assets_v1.sql');
const SELECT_SQL = process.env.SELECT_SQL_PATH ||
  join(REPO, 'supabase', 'migrations', '20260703035154_create_select_template_v1.sql');
const SHADOW_SQL = process.env.SHADOW_SQL_PATH ||
  join(REPO, 'supabase', 'migrations', '20260703064651_create_tmr_shadow_decision_v1.sql');
const STAMPER_SQL = process.env.STAMPER_SQL_PATH ||
  join(REPO, 'supabase', 'migrations', '20260703200000_create_stamp_tmr_shadow_forward_v1.sql');

const BATCH_LABEL = 's1-forward-v1';
const SELECTOR_VERSION = 'select_template_v1@20260703035154';
const B1_PTID = 'fb9820f8-3fee-4448-b324-3d500fa74b40'; // live B1 template — post-Lane-0 it IS in the registry (client-scoped)

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(name); console.log(`  FAIL  ${name}  ${detail}`); }
}

// FNV-1a 32-bit over UTF-8 bytes — MUST match resolve_slot_assets' plpgsql implementation.
function fnv1a32(s) {
  const bytes = Buffer.from(s, 'utf8');
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h = (h ^ b) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const db = new PGlite();
async function q(text, params) { return (await db.query(text, params)).rows; }
async function stamp(arg) {
  const call = arg === undefined
    ? 'SELECT public.stamp_tmr_shadow_forward() AS j'
    : `SELECT public.stamp_tmr_shadow_forward(${arg}) AS j`;
  return (await q(call))[0].j;
}
const shadowCount = async (label = BATCH_LABEL) =>
  Number((await q(`SELECT count(*)::int AS n FROM c.tmr_shadow_decision WHERE batch_label = $1`, [label]))[0].n);

// ── fixture ids ────────────────────────────────────────────────────────
const PP = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'; // live PP client_id
// TMR registry generic templates (image_quote):
const TQ1 = '11111111-1111-1111-1111-111111111101'; // strong, oldest strong — EXPECTED WINNER (ptid tpl-q1)
const TQ2 = '11111111-1111-1111-1111-111111111102'; // strong — alternative (ptid tpl-q2)
const TQ0 = '11111111-1111-1111-1111-111111111100'; // candidate fit (ptid tpl-q0)
const TQ3 = '11111111-1111-1111-1111-111111111103'; // assignment 'proposed' (ptid tpl-q3) — proposed_count
const TB1 = '11111111-1111-1111-1111-1111111111b1'; // Lane-0 B1 capture: CLIENT-scoped, ptid = B1_PTID
const A = (n) => `aaaaaaaa-1111-1111-1111-1111111111${n}`;
const D = (n) => `dddddddd-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;
const R = (n) => `eeeeeeee-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;

// Ranked eligible PP backgrounds inside resolve_slot_assets (all needs_scrim
// class ⇒ created_at ASC order). Selector bg pick for seed s = RANKED[fnv%3].
const RANKED_BG = ['bg_sydney_cbd', 'bg_brisbane_cbd', 'bg_kirribilli'];
const selBgFor = (seed) => RANKED_BG[fnv1a32(seed) % 3];

// render_spec builders (shape = verified live B1 sample)
const specB1 = (bg) => JSON.stringify({
  label: 'creative_library_b1_production',
  template: {
    provider_template_id: B1_PTID,
    implementation_id: 'news_static_centered_scrim_1x1_v1',
    template_family: 'creative_library_b1',
    asset_keys: ['pp_logo_primary', bg],
  },
  background_key: bg,
  variant_key: 'image_quote.b1.v1',
  contract_ref: 'aci-contract-v1',
});
// OLDER row: lacks contract fields AND cites an off-registry ptid — must
// extract as JSON nulls and classify expected_structural_divergence.
const specOldOffReg = (bg) => JSON.stringify({
  label: 'creative_library_b1_production',
  template: { provider_template_id: 'off-registry-legacy-tpl', asset_keys: ['pp_logo_primary', bg] },
  background_key: bg,
});
// In-registry GENERIC production spec (exercises agreement / background_divergence)
const specReg = (ptid, bg) => JSON.stringify({
  label: 'creative_library_b1_production',
  template: {
    provider_template_id: ptid,
    implementation_id: 'tmr_registry_impl_v1',
    template_family: 'generic.real_estate.market_insight_card',
    asset_keys: ['pp_logo_primary', bg],
  },
  background_key: bg,
  variant_key: 'market_update.v1',
  contract_ref: 'aci-contract-v1',
});

(async () => {
  console.log('Fixture: roles + minimal c schema + minimal m schema (live PK column names)...');
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE inspector_ro;
    CREATE ROLE service_role BYPASSRLS;   -- mirrors live: service_role bypasses RLS
    CREATE SCHEMA c;
    CREATE SCHEMA m;
    GRANT USAGE ON SCHEMA c TO service_role, inspector_ro;
    GRANT USAGE ON SCHEMA m TO service_role;
    CREATE TABLE c.client(
      client_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_slug text UNIQUE,
      status text
    );
    CREATE TABLE c.client_brand_asset(
      asset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid,
      asset_type text, asset_name text, asset_url text,
      asset_meta jsonb, platform_scope text[],
      is_active boolean DEFAULT true, notes text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE c.creative_provider_template(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text, provider_template_id text, provider_template_name text,
      scope text NOT NULL CHECK (scope IN ('generic','brand','client')),
      client_id uuid, aspect_ratio text,
      status text NOT NULL DEFAULT 'discovered'
        CHECK (status IN ('discovered','inventory_requested','inventory_captured','inventory_verified',
                          'classified','field_mapped','governance_reviewed','smoke_rendered',
                          'visually_approved','platform_safe','client_enabled','production_proven',
                          'deprecated','blocked')),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE c.creative_provider_template_field(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid,
      element_id text, element_name text, element_type text,
      dynamic boolean, field_kind text, required_for_render boolean
    );
    CREATE TABLE c.creative_template_platform_suitability(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL,
      platform text NOT NULL,
      placement text NOT NULL DEFAULT 'default',
      suitability_status text NOT NULL DEFAULT 'unknown'
        CHECK (suitability_status IN ('unknown','candidate','not_suitable','needs_review',
                                      'platform_safe','production_proven','blocked')),
      UNIQUE (template_id, platform, placement)
    );
    CREATE TABLE c.creative_template_variant_candidate(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL,
      format_key text,
      variant_key text NOT NULL,
      fit_status text NOT NULL DEFAULT 'unknown'
        CHECK (fit_status IN ('unknown','candidate','strong_candidate','weak_candidate',
                              'needs_template_edit','unsuitable','blocked')),
      UNIQUE (template_id, variant_key)
    );
    CREATE TABLE c.creative_template_client_assignment(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL,
      client_id uuid,
      assignment_scope text NOT NULL DEFAULT 'generic_allowed',
      assignment_status text NOT NULL DEFAULT 'proposed'
        CHECK (assignment_status IN ('proposed','approved','visually_approved','client_enabled',
                                     'production_proven','deprecated','blocked')),
      approved_by text, approved_at timestamptz
    );
    CREATE TABLE c.creative_template_proof_event(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL,
      assignment_id uuid,
      platform text, placement text,
      proof_type text NOT NULL
        CHECK (proof_type IN ('smoke_render','visual_approval','platform_render','platform_publish')),
      proof_status text CHECK (proof_status IN ('passed','failed','pending','superseded')),
      evidence_reference text, occurred_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    -- m schema: live PK column names (post_draft_id / render_log_id — NOT id)
    CREATE TABLE m.post_draft(
      post_draft_id uuid PRIMARY KEY,
      client_id uuid NOT NULL,
      platform text,
      approval_status text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE m.post_render_log(
      render_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_draft_id uuid,
      client_id uuid,
      status text,
      render_spec jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  console.log('Loading REAL SQL #1 (resolve_slot_assets), #2 (select_template), #3 (tmr_shadow_decision), #4 (stamper — UNDER TEST)...');
  await db.exec(readFileSync(RESOLVE_SQL, 'utf8'));
  await db.exec(readFileSync(SELECT_SQL, 'utf8'));
  await db.exec(readFileSync(SHADOW_SQL, 'utf8'));
  await db.exec(readFileSync(STAMPER_SQL, 'utf8'));

  // ── client + governed assets (3 backgrounds all needs_scrim + 1 logo) ─
  await db.exec(`
    INSERT INTO c.client(client_id, client_slug, status) VALUES
      ('${PP}', 'property-pulse', 'active');
    INSERT INTO c.client_brand_asset(asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, created_at) VALUES
      ('aaaaaaaa-0000-0000-0000-000000000001', '${PP}', 'other', 'Sydney CBD bg',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Backgrounds/Sydney.jpg',
       '{"asset_key":"bg_sydney_cbd","usage":"background","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"licence_free","safe_for_text_overlay":"needs_scrim"}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('aaaaaaaa-0000-0000-0000-000000000002', '${PP}', 'other', 'Brisbane CBD bg',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Backgrounds/Brisbane.jpg',
       '{"asset_key":"bg_brisbane_cbd","usage":"background","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"licence_free","safe_for_text_overlay":"needs_scrim"}',
       NULL, true, '2026-06-02T00:00:00Z'),
      ('aaaaaaaa-0000-0000-0000-000000000003', '${PP}', 'other', 'Kirribilli bg',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Backgrounds/Kirribilli.jpg',
       '{"asset_key":"bg_kirribilli","usage":"background","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"licence_free","safe_for_text_overlay":"needs_scrim"}',
       NULL, true, '2026-06-03T00:00:00Z'),
      ('aaaaaaaa-0000-0000-0000-000000000004', '${PP}', 'logo_primary', 'PP primary logo',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Logos/PP_logo_2.png',
       '{"asset_key":"pp_logo_primary","usage":"logo","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"brand_owned_or_pk_authorised"}',
       NULL, true, '2026-06-04T00:00:00Z');
  `);

  // ── TMR registry POST-LANE-0: 4 generic templates (TQ1 winner) + the B1
  //    production template registered CLIENT-scoped (ptid = fb9820f8… — so
  //    B1 render_specs are IN-registry and classify selector_disagreement).
  //    Suitability rows for facebook + instagram ONLY (linkedin ⇒ fail-closed).
  await db.exec(`
    INSERT INTO c.creative_provider_template(id, provider, provider_template_id, provider_template_name, scope, client_id, aspect_ratio, status, created_at) VALUES
      ('${TQ1}', 'creatomate', 'tpl-q1', 'generic market update 1:1', 'generic', NULL, '1:1', 'smoke_rendered', '2026-06-01T00:00:00Z'),
      ('${TQ2}', 'creatomate', 'tpl-q2', 'generic announcement 1:1',  'generic', NULL, '1:1', 'smoke_rendered', '2026-06-02T00:00:00Z'),
      ('${TQ0}', 'creatomate', 'tpl-q0', 'generic stat card 1:1',     'generic', NULL, '1:1', 'smoke_rendered', '2026-06-03T00:00:00Z'),
      ('${TQ3}', 'creatomate', 'tpl-q3', 'generic educational 1:1',   'generic', NULL, '1:1', 'smoke_rendered', '2026-06-04T00:00:00Z'),
      ('${TB1}', 'creatomate', '${B1_PTID}', 'PP B1 news static 1:1 (Lane 0 capture)', 'client', '${PP}', '1:1', 'production_proven', '2026-06-05T00:00:00Z');
    INSERT INTO c.creative_template_variant_candidate(template_id, format_key, variant_key, fit_status) VALUES
      ('${TQ1}', 'image_quote', 'market_update.v1', 'strong_candidate'),
      ('${TQ2}', 'image_quote', 'announcement.v1',  'strong_candidate'),
      ('${TQ0}', 'image_quote', 'stat_card.v1',     'candidate'),
      ('${TQ3}', 'image_quote', 'educational.v1',   'strong_candidate'),
      ('${TB1}', 'image_quote', 'image_quote.b1.v1', 'strong_candidate');
    INSERT INTO c.creative_template_platform_suitability(template_id, platform, suitability_status) VALUES
      ('${TQ1}', 'facebook', 'candidate'), ('${TQ1}', 'instagram', 'candidate'),
      ('${TQ2}', 'facebook', 'candidate'), ('${TQ2}', 'instagram', 'candidate'),
      ('${TQ0}', 'facebook', 'candidate'), ('${TQ0}', 'instagram', 'candidate'),
      ('${TQ3}', 'facebook', 'candidate'), ('${TQ3}', 'instagram', 'candidate'),
      ('${TB1}', 'facebook', 'production_proven'), ('${TB1}', 'instagram', 'production_proven');
    INSERT INTO c.creative_provider_template_field(template_id, element_name, element_type, dynamic, field_kind, required_for_render) VALUES
      ('${TQ1}', 'Background', 'image', true,  'background', true),
      ('${TQ1}', 'Logo',       'image', true,  'logo',       false),
      ('${TQ1}', 'Scrim',      'shape', false, 'shape',      false),
      ('${TQ2}', 'Background', 'image', true,  'background', true),
      ('${TQ2}', 'Logo',       'image', true,  'logo',       false),
      ('${TQ2}', 'Scrim',      'shape', false, 'shape',      false),
      ('${TQ0}', 'Background', 'image', true,  'background', true),
      ('${TQ0}', 'Logo',       'image', true,  'logo',       false),
      ('${TQ0}', 'Scrim',      'shape', false, 'shape',      false);
    INSERT INTO c.creative_template_client_assignment(id, template_id, client_id, assignment_scope, assignment_status, approved_by, approved_at) VALUES
      ('${A('01')}', '${TQ1}', '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('02')}', '${TQ2}', '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('00')}', '${TQ0}', '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('03')}', '${TQ3}', '${PP}', 'generic_allowed', 'proposed',          NULL, NULL);
    INSERT INTO c.creative_template_proof_event(template_id, assignment_id, proof_type, proof_status, evidence_reference, occurred_at) VALUES
      ('${TQ1}', '${A('01')}', 'visual_approval', 'passed', 'render:proof:tq1', '2026-06-21T00:00:00Z'),
      ('${TQ2}', '${A('02')}', 'visual_approval', 'passed', 'render:proof:tq2', '2026-06-21T01:00:00Z'),
      ('${TQ0}', '${A('00')}', 'visual_approval', 'passed', 'render:proof:tq0', '2026-06-21T02:00:00Z');
  `);

  // ── drafts + renders ──────────────────────────────────────────────────
  // Fresh unshadowed pool (oldest-first order = F1..F6 by created_at):
  //   F1 R01/D01 fb  specB1 bg_perth_cbd     2026-06-20  selector_disagreement (OLDEST — cap test target)
  //   F2 R02/D02 ig  specB1 bg_brisbane_cbd  2026-06-21  selector_disagreement
  //   F3 R03/D03 fb  specOldOffReg           2026-06-22  expected_structural_divergence (contract-less)
  //   F4 R04/D04 fb  specReg(tpl-q1, agree)  2026-06-23  agreement
  //   F5 R05/D05 ig  specReg(tpl-q1, diff)   2026-06-24  background_divergence
  //   F6 R06/D06 li  specB1 bg_perth_cbd     2026-06-25  selector_fail_closed (DATA)
  // Excluded rows (must never be stamped):
  //   S1 R07/D07 fb  specB1, succeeded, ALREADY SHADOWED (pre-seed)  2026-06-10
  //   X1 R08/D08 fb  specB1, status='failed'                         2026-06-11
  //   X2 R09/D09 fb  non-B1 label, succeeded                         2026-06-12
  //   X3 R10/—   fb  specB1, succeeded, post_draft_id IS NULL        2026-06-13
  const drafts = [
    [D(1), 'facebook'], [D(2), 'instagram'], [D(3), 'facebook'],
    [D(4), 'facebook'], [D(5), 'instagram'], [D(6), 'linkedin'],
    [D(7), 'facebook'], [D(8), 'facebook'], [D(9), 'facebook'],
  ];
  const draftValues = drafts
    .map(([id, pf]) => `('${id}', '${PP}', '${pf}', 'approved')`).join(',\n      ');
  await db.exec(`
    INSERT INTO m.post_draft(post_draft_id, client_id, platform, approval_status) VALUES
      ${draftValues};
  `);

  const agreeBg = selBgFor(D(4));                                   // selector pick for D04
  const divergeSelBg = selBgFor(D(5));
  const divergeProdBg = RANKED_BG[(fnv1a32(D(5)) % 3 + 1) % 3];     // deliberately different
  // [render_log_id, post_draft_id, status, render_spec, created_at]
  const renders = [
    [R(1),  D(1), 'succeeded', specB1('bg_perth_cbd'),             '2026-06-20T00:00:00Z'],
    [R(2),  D(2), 'succeeded', specB1('bg_brisbane_cbd'),          '2026-06-21T00:00:00Z'],
    [R(3),  D(3), 'succeeded', specOldOffReg('bg_perth_cbd'),      '2026-06-22T00:00:00Z'],
    [R(4),  D(4), 'succeeded', specReg('tpl-q1', agreeBg),         '2026-06-23T00:00:00Z'],
    [R(5),  D(5), 'succeeded', specReg('tpl-q1', divergeProdBg),   '2026-06-24T00:00:00Z'],
    [R(6),  D(6), 'succeeded', specB1('bg_perth_cbd'),             '2026-06-25T00:00:00Z'],
    [R(7),  D(7), 'succeeded', specB1('bg_sydney_cbd'),            '2026-06-10T00:00:00Z'], // pre-shadowed
    [R(8),  D(8), 'failed',    specB1('bg_perth_cbd'),             '2026-06-11T00:00:00Z'],
    [R(9),  D(9), 'succeeded', '{"label":"tmr_smoke","template":{"provider_template_id":"x"}}', '2026-06-12T00:00:00Z'],
    [R(10), null, 'succeeded', specB1('bg_perth_cbd'),             '2026-06-13T00:00:00Z'],
  ];
  const renderValues = renders
    .map(([rid, did, st, spec, ts]) =>
      `('${rid}', ${did ? `'${did}'` : 'NULL'}, '${PP}', '${st}', '${spec}', '${ts}')`)
    .join(',\n      ');
  await db.exec(`
    INSERT INTO m.post_render_log(render_log_id, post_draft_id, client_id, status, render_spec, created_at) VALUES
      ${renderValues};
    -- pre-seed: R07 already carries a shadow row (idempotency-key fence)
    INSERT INTO c.tmr_shadow_decision
      (post_draft_id, render_log_id, client_id, platform, format, seed_used,
       selector_version, selector_output, production_actual, divergence, registry_context, batch_label)
    VALUES ('${D(7)}', '${R(7)}', '${PP}', 'facebook', 'image_quote', '${D(7)}',
            'pre-seed', '{"status":"ok"}', '{}', '{"primary_class":"agreement"}', '{}', 'pre-seed-test');
  `);

  // write-surface probe (case 7): counts + max timestamps on the production fixture tables
  const PROBE_SQL = `
    SELECT 'm.post_draft' AS probe_table, count(*)::text AS row_count,
           max(created_at)::text AS max_created, max(updated_at)::text AS max_updated
    FROM m.post_draft
    UNION ALL
    SELECT 'm.post_render_log', count(*)::text, max(created_at)::text, NULL
    FROM m.post_render_log
    UNION ALL
    SELECT 'c.client', count(*)::text, NULL, NULL FROM c.client
    ORDER BY 1`;

  // =====================================================================
  console.log('\nTest 1: first run stamps exactly the 6 fresh rows (fail-closed included as DATA); skips excluded rows');
  const preProbe = await q(PROBE_SQL);
  {
    const res = await stamp('NULL::integer');   // also exercises clamp: NULL -> 20
    check('return jsonb: limit=20 (NULL clamped to default)', res.limit === 20, JSON.stringify(res));
    check('return jsonb: scanned=6, stamped=6, skipped_no_slug=0, remaining_unshadowed=0',
      res.scanned === 6 && res.stamped === 6 && res.skipped_no_slug === 0 && res.remaining_unshadowed === 0,
      JSON.stringify(res));
    check('return jsonb: run_at present', typeof res.run_at === 'string' && res.run_at.length > 0);
    check('exactly 6 rows with batch_label s1-forward-v1', await shadowCount() === 6, String(await shadowCount()));

    const stamped = await q(`SELECT render_log_id FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    const ids = new Set(stamped.map(r => r.render_log_id));
    check('stamped set = {R01..R06} exactly', [1, 2, 3, 4, 5, 6].every(n => ids.has(R(n))) && ids.size === 6);
    check('pre-shadowed R07 NOT re-stamped (still 1 row, pre-seed label intact)',
      await shadowCount('pre-seed-test') === 1
      && !(await q(`SELECT 1 FROM c.tmr_shadow_decision WHERE render_log_id = $1 AND batch_label = $2`, [R(7), BATCH_LABEL])).length);
    check('failed R08 / non-label R09 / null-draft R10 never stamped',
      !(await q(`SELECT 1 FROM c.tmr_shadow_decision WHERE render_log_id IN ($1,$2,$3)`, [R(8), R(9), R(10)])).length);
  }

  console.log('\nTest 2: second run stamps 0 (idempotent via NOT EXISTS + partial unique index)');
  {
    const res = await stamp();   // default arg call — also proves DEFAULT 20 signature
    check('second run: scanned=0, stamped=0, remaining_unshadowed=0',
      res.scanned === 0 && res.stamped === 0 && res.remaining_unshadowed === 0, JSON.stringify(res));
    check('still exactly 6 stamped rows', await shadowCount() === 6, String(await shadowCount()));
  }

  console.log('\nTest 5: classification — post-Lane-0 taxonomy branches');
  {
    const rows = await q(`SELECT * FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    const byRender = Object.fromEntries(rows.map(r => [r.render_log_id, r]));

    const classCounts = {};
    for (const r of rows) classCounts[r.divergence.primary_class] = (classCounts[r.divergence.primary_class] || 0) + 1;
    check('class counts: 2 selector_disagreement / 1 agreement / 1 background_divergence / 1 structural / 1 selector_fail_closed',
      classCounts.selector_disagreement === 2 && classCounts.agreement === 1
      && classCounts.background_divergence === 1 && classCounts.expected_structural_divergence === 1
      && classCounts.selector_fail_closed === 1, JSON.stringify(classCounts));

    // B1 rows (R01 fb, R02 ig): B1 template IS in registry post-Lane-0 -> selector_disagreement
    const b1fb = byRender[R(1)], b1ig = byRender[R(2)];
    check('B1 rows classify selector_disagreement with template_match=false + S0 note wording',
      [b1fb, b1ig].every(r =>
        r.divergence.primary_class === 'selector_disagreement'
        && r.divergence.template_match === false
        && r.production_actual.provider_template_id === B1_PTID
        && r.divergence.notes === 'production template is in the TMR registry but the selector picked a different template'),
      JSON.stringify(b1fb.divergence));
    check('B1 rows: selector winner is the generic tpl-q1 (registry-present fixture)',
      [b1fb, b1ig].every(r => r.selector_output.selected.provider_template_id === 'tpl-q1'));
    check('platform copied from the draft (R01=facebook, R02=instagram)',
      b1fb.platform === 'facebook' && b1ig.platform === 'instagram');

    // structural (R03): off-registry ptid, contract-less older shape
    const st = byRender[R(3)];
    check('structural row: class + template_match=false + S0 note wording',
      st.divergence.primary_class === 'expected_structural_divergence'
      && st.divergence.template_match === false
      && st.divergence.notes === 'production B1 template not in TMR registry', JSON.stringify(st.divergence));
    check('structural row: contract fields extracted as nulls (older row, null-safe ->>)',
      st.production_actual.variant_key === null && st.production_actual.contract_ref === null
      && st.production_actual.implementation_id === null && st.production_actual.template_family === null,
      JSON.stringify(st.production_actual));

    // agreement (R04): generic tpl-q1 production spec + selector's own bg pick
    const ag = byRender[R(4)];
    check('agreement row: class=agreement, template_match+background_match true, S0 note',
      ag.divergence.primary_class === 'agreement'
      && ag.divergence.template_match === true && ag.divergence.background_match === true
      && ag.divergence.notes === 'selector and production agree on template and background',
      JSON.stringify(ag.divergence));
    check('agreement row: selector bg = production bg (FNV-1a parity, seed=post_draft_id)',
      ag.production_actual.background_key === agreeBg
      && ag.selector_output.selected.provider_template_id === 'tpl-q1',
      `prod=${ag.production_actual.background_key} expected=${agreeBg}`);

    // background_divergence (R05): template agrees, background differs
    const bd = byRender[R(5)];
    check('background_divergence row: template_match=true, background_match=false, S0 note',
      bd.divergence.primary_class === 'background_divergence'
      && bd.divergence.template_match === true && bd.divergence.background_match === false
      && bd.divergence.notes.includes('background differs'), JSON.stringify(bd.divergence));
    check('background_divergence row: selector picked a DIFFERENT bg than production',
      divergeSelBg !== divergeProdBg && bd.production_actual.background_key === divergeProdBg,
      `sel=${divergeSelBg} prod=${divergeProdBg}`);

    // selector_fail_closed (R06): linkedin draft — DATA, not an error
    const fc = byRender[R(6)];
    check('fail-closed row: class + selector_output.status=fail_closed + fail_reason echoed in notes',
      fc.divergence.primary_class === 'selector_fail_closed'
      && fc.selector_output.status === 'fail_closed'
      && fc.divergence.notes.includes(fc.selector_output.fail_reason),
      JSON.stringify({ n: fc.divergence.notes, fr: fc.selector_output.fail_reason }));
    check('fail-closed row: template_match=false, background_match=false',
      fc.divergence.template_match === false && fc.divergence.background_match === false);

    // asset_matches sub-shape (spot: B1 fb row)
    check('asset_matches: production+selector keys recorded, logo_match=true (B1 fb row)',
      JSON.stringify(b1fb.divergence.asset_matches.production_asset_keys) === JSON.stringify(['pp_logo_primary', 'bg_perth_cbd'])
      && b1fb.divergence.asset_matches.selector_asset_keys.includes('pp_logo_primary')
      && b1fb.divergence.asset_matches.logo_match === true, JSON.stringify(b1fb.divergence.asset_matches));
  }

  console.log('\nTest 6: row shape — full selector payload + production_actual + registry_context + labels + seed');
  {
    const rows = await q(`SELECT * FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    const KEYS = ['status', 'selected', 'slot_resolution', 'alternatives', 'rejected', 'warnings', 'fail_reason', 'context'];
    check('every stamped row: selector_output carries ALL full-payload keys',
      rows.every(r => KEYS.every(k => Object.prototype.hasOwnProperty.call(r.selector_output, k))),
      JSON.stringify(Object.keys(rows[0].selector_output)));
    const PA_KEYS = ['provider_template_id', 'implementation_id', 'template_family', 'background_key',
                     'asset_keys', 'variant_key', 'contract_ref', 'rendered_at'];
    check('every stamped row: production_actual carries all 8 extraction keys',
      rows.every(r => PA_KEYS.every(k => Object.prototype.hasOwnProperty.call(r.production_actual, k))));
    check("every stamped row: batch_label='s1-forward-v1', format='image_quote', client_id=PP",
      rows.every(r => r.batch_label === BATCH_LABEL && r.format === 'image_quote' && r.client_id === PP));
    check(`every stamped row: selector_version='${SELECTOR_VERSION}'`,
      rows.every(r => r.selector_version === SELECTOR_VERSION));
    check('every stamped row: seed_used = post_draft_id::text = selector_output.context.seed',
      rows.every(r => r.seed_used === r.post_draft_id && r.selector_output.context.seed === r.post_draft_id));
    const distinctCtx = await q(`SELECT count(DISTINCT registry_context::text)::int AS n FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    check('registry_context identical on all stamped rows (computed once per client, cached)',
      Number(distinctCtx[0].n) === 1, String(distinctCtx[0].n));
    const ctx = rows[0].registry_context;
    check('registry_context counts: selectable=3, proposed=1, visual_proofs=3, computed_for_client_id=PP',
      ctx.selectable_count === 3 && ctx.proposed_count === 1 && ctx.visual_proofs === 3
      && ctx.computed_for_client_id === PP, JSON.stringify(ctx));
    check('computed_at + created_at present', rows.every(r => r.computed_at && r.created_at));
  }

  console.log('\nTest 7: write-surface — production fixture tables byte-identical pre vs post');
  {
    const postProbe = await q(PROBE_SQL);
    check('m.post_draft / m.post_render_log / c.client counts + max timestamps byte-identical',
      JSON.stringify(preProbe) === JSON.stringify(postProbe),
      JSON.stringify({ pre: preProbe, post: postProbe }));
  }

  console.log('\nTests 3+4: cap + clamp (reset stamped rows, replay under limits)');
  {
    const del = await db.query(`DELETE FROM c.tmr_shadow_decision WHERE batch_label = '${BATCH_LABEL}'`);
    check('reset: DELETE by batch_label removes exactly 6 (rollback key works)', del.affectedRows === 6, String(del.affectedRows));

    // clamp low: p_limit=0 -> treated as 1; stamps exactly the OLDEST unshadowed row (R01)
    const r0 = await stamp(0);
    check('p_limit=0: limit clamped to 1, scanned=1, stamped=1, remaining_unshadowed=5',
      r0.limit === 1 && r0.scanned === 1 && r0.stamped === 1 && r0.remaining_unshadowed === 5, JSON.stringify(r0));
    const first = await q(`SELECT render_log_id FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    check('cap stamps oldest-first: the single stamped row is R01 (2026-06-20, oldest unshadowed)',
      first.length === 1 && first[0].render_log_id === R(1), JSON.stringify(first));

    // explicit p_limit=1 (the brief's cap case): next oldest (R02)
    const r1 = await stamp(1);
    check('p_limit=1: stamped=1, remaining_unshadowed=4', r1.limit === 1 && r1.stamped === 1 && r1.remaining_unshadowed === 4, JSON.stringify(r1));
    const two = await q(`SELECT render_log_id FROM c.tmr_shadow_decision WHERE batch_label = $1 ORDER BY computed_at, created_at`, [BATCH_LABEL]);
    check('second capped run stamped R02 (next oldest)', two.some(r => r.render_log_id === R(2)) && two.length === 2);

    // clamp high: p_limit=500 -> 100; drains the remaining 4
    const r500 = await stamp(500);
    check('p_limit=500: limit clamped to 100, stamped=4, remaining_unshadowed=0',
      r500.limit === 100 && r500.stamped === 4 && r500.remaining_unshadowed === 0, JSON.stringify(r500));
    check('drained: all 6 rows re-stamped', await shadowCount() === 6, String(await shadowCount()));

    // NULL clamp (explicit NULL literal, distinct from the default-arg call in Test 2)
    const rn = await stamp('NULL::integer');
    check('explicit NULL: limit=20, stamped=0 (nothing left)', rn.limit === 20 && rn.stamped === 0, JSON.stringify(rn));
  }

  console.log('\nTest 8: posture — VOLATILE + SECDEF + pinned search_path; service_role-only EXECUTE');
  {
    const fn = (await q(`
      SELECT p.provolatile, p.prosecdef, p.proconfig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'stamp_tmr_shadow_forward'`))[0];
    check('VOLATILE (provolatile=v — it writes, unlike the STABLE read RPCs)', fn.provolatile === 'v', JSON.stringify(fn));
    check('SECURITY DEFINER', fn.prosecdef === true, JSON.stringify(fn));
    check("search_path pinned to '' in proconfig",
      Array.isArray(fn.proconfig) && fn.proconfig.some(s => /^search_path=/.test(s) && s.replace(/^search_path=/, '').replace(/"/g, '').trim() === ''),
      JSON.stringify(fn.proconfig));

    const canExec = async (role) =>
      (await q(`SELECT has_function_privilege('${role}', 'public.stamp_tmr_shadow_forward(integer)', 'EXECUTE') AS b`))[0].b;
    check('grants: service_role CAN execute', await canExec('service_role') === true);
    check('grants: anon CANNOT execute', await canExec('anon') === false);
    check('grants: authenticated CANNOT execute', await canExec('authenticated') === false);

    // behavioral: anon call raises permission denied
    let anonErr = null;
    await db.exec('SET ROLE anon;');
    try { await db.query('SELECT public.stamp_tmr_shadow_forward(1)'); } catch (e) { anonErr = e; }
    await db.exec('RESET ROLE;');
    check('behavioral: anon call raises permission denied',
      anonErr !== null && /permission denied/i.test(String(anonErr.message)), String(anonErr && anonErr.message));

    // behavioral: service_role call succeeds (returns jsonb; nothing left to stamp)
    await db.exec('SET ROLE service_role;');
    const srRes = (await q('SELECT public.stamp_tmr_shadow_forward(5) AS j'))[0].j;
    await db.exec('RESET ROLE;');
    check('behavioral: service_role call succeeds (stamped=0, pool drained)',
      srRes.stamped === 0 && srRes.remaining_unshadowed === 0, JSON.stringify(srRes));
  }

  console.log('\n======================================================');
  console.log(`RESULT: ${pass} passed, ${fail} failed.`);
  if (fail) { console.log('FAILED:', fails.join(', ')); process.exitCode = 1; }
  console.log('Path used: PGlite (ALL FOUR real SQL migrations — resolve_slot_assets + select_template + tmr_shadow_decision + stamp_tmr_shadow_forward — executed in WASM Postgres with plpgsql; grants loaded verbatim against fixture roles).');
  await db.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exitCode = 2; });
