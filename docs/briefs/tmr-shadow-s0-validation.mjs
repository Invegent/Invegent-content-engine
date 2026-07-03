// tmr-shadow-s0-validation.mjs
// =====================================================================
// PGlite (offline, no prod) validation for TMR Shadow-Mode Stamping S0:
// c.tmr_shadow_decision (new table migration) + the S0 retroactive batch
// harness + the production-isolation probes.
//
// Loads FOUR real SQL artifacts verbatim (roles created in the fixture so
// the actual files load unmodified):
//   1. supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql
//   2. supabase/migrations/20260703035154_create_select_template_v1.sql
//   3. supabase/migrations/20260703160000_create_tmr_shadow_decision_v1.sql
//   4. _harness/s0-shadow-retroactive-batch.sql        (artifact under test)
// plus the read-only companion:
//   5. _harness/s0-isolation-probes.sql                (pre/post invariant)
// into PGlite (WASM Postgres with plpgsql), builds a minimal `c` + `m`
// fixture mirroring live (post_draft PK = post_draft_id; post_render_log
// PK = render_log_id; render_spec rows shaped like the verified live B1
// sample, incl. one OLDER row lacking contract fields), and runs the
// brief's required cases. This is the ACTUAL SQL — not a mirror.
//
// Fixture pool mirrors the live-verified shape EXACTLY (the batch harness
// fail-loud asserts on it): 17 succeeded creative_library_b1_production
// renders across 14 distinct drafts, 0 null-draft rows. Divergence classes
// exercised: expected_structural_divergence (13: off-registry fb9820f8…
// template, incl. the older contract-less row), agreement (1),
// background_divergence (1), selector_disagreement (1: production template
// IS in the registry — proves the non-structural branches),
// selector_fail_closed (1: linkedin draft; no suitability rows for
// linkedin ⇒ selector fails closed).
//
// Run:  node docs/briefs/tmr-shadow-s0-validation.mjs
//   (requires @electric-sql/pglite; installed dev-only OUTSIDE the repo,
//    NOT committed. Env overrides for ALL sql files let the test run from
//    a dir where PGlite is installed (ESM ignores NODE_PATH):
//    RESOLVE_SQL_PATH · SELECT_SQL_PATH · SHADOW_SQL_PATH · BATCH_SQL_PATH
//    · PROBES_SQL_PATH; defaults = repo-relative locations.)
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
  join(REPO, 'supabase', 'migrations', '20260703160000_create_tmr_shadow_decision_v1.sql');
const BATCH_SQL = process.env.BATCH_SQL_PATH ||
  join(REPO, '_harness', 's0-shadow-retroactive-batch.sql');
const PROBES_SQL = process.env.PROBES_SQL_PATH ||
  join(REPO, '_harness', 's0-isolation-probes.sql');

const BATCH_LABEL = 's0-retroactive-2026-07';
const SELECTOR_VERSION = 'select_template_v1@20260703035154';
const B1_PTID = 'fb9820f8-3fee-4448-b324-3d500fa74b40'; // live B1 template — off the TMR registry

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

// ── fixture ids ────────────────────────────────────────────────────────
const PP = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'; // live PP client_id
// TMR registry templates (image_quote):
const TQ1 = '11111111-1111-1111-1111-111111111101'; // strong, oldest strong — EXPECTED WINNER (ptid tpl-q1)
const TQ2 = '11111111-1111-1111-1111-111111111102'; // strong — alternative (ptid tpl-q2)
const TQ0 = '11111111-1111-1111-1111-111111111100'; // candidate fit (ptid tpl-q0)
const TQ3 = '11111111-1111-1111-1111-111111111103'; // assignment 'proposed' (ptid tpl-q3) — proposed_count
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
// OLDER row: lacks contract fields (no variant_key / contract_ref /
// implementation_id / template_family) — must extract as JSON nulls.
const specB1Old = (bg) => JSON.stringify({
  label: 'creative_library_b1_production',
  template: { provider_template_id: B1_PTID, asset_keys: ['pp_logo_primary', bg] },
  background_key: bg,
});
// In-registry production spec (proves the non-structural branches)
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
    -- live mirror: schema USAGE pre-exists on schema c for the fenced roles
    -- (Lane A audit: service_role CRUD + inspector_ro SELECT on schema-c siblings
    --  implies USAGE; anon/authenticated deliberately get NO usage — schema fenced)
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
    CREATE TABLE m.post_publish_queue(
      queue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_draft_id uuid, platform text, status text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE m.post_publish(
      post_publish_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      queue_id uuid, post_draft_id uuid, client_id uuid, platform text, status text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  console.log('Loading REAL SQL #1 (resolve_slot_assets), #2 (select_template), #3 (tmr_shadow_decision table)...');
  await db.exec(readFileSync(RESOLVE_SQL, 'utf8'));
  await db.exec(readFileSync(SELECT_SQL, 'utf8'));
  await db.exec(readFileSync(SHADOW_SQL, 'utf8'));
  const batchSqlText = readFileSync(BATCH_SQL, 'utf8');
  const probesSqlText = readFileSync(PROBES_SQL, 'utf8');

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

  // ── TMR registry: 4 templates; selectable = TQ1 (winner), TQ2, TQ0; TQ3 proposed
  //    Suitability rows for facebook + instagram ONLY (linkedin ⇒ selector fails closed)
  await db.exec(`
    INSERT INTO c.creative_provider_template(id, provider, provider_template_id, provider_template_name, scope, aspect_ratio, status, created_at) VALUES
      ('${TQ1}', 'creatomate', 'tpl-q1', 'generic market update 1:1', 'generic', '1:1', 'smoke_rendered', '2026-06-01T00:00:00Z'),
      ('${TQ2}', 'creatomate', 'tpl-q2', 'generic announcement 1:1',  'generic', '1:1', 'smoke_rendered', '2026-06-02T00:00:00Z'),
      ('${TQ0}', 'creatomate', 'tpl-q0', 'generic stat card 1:1',     'generic', '1:1', 'smoke_rendered', '2026-06-03T00:00:00Z'),
      ('${TQ3}', 'creatomate', 'tpl-q3', 'generic educational 1:1',   'generic', '1:1', 'smoke_rendered', '2026-06-04T00:00:00Z');
    INSERT INTO c.creative_template_variant_candidate(template_id, format_key, variant_key, fit_status) VALUES
      ('${TQ1}', 'image_quote', 'market_update.v1', 'strong_candidate'),
      ('${TQ2}', 'image_quote', 'announcement.v1',  'strong_candidate'),
      ('${TQ0}', 'image_quote', 'stat_card.v1',     'candidate'),
      ('${TQ3}', 'image_quote', 'educational.v1',   'strong_candidate');
    INSERT INTO c.creative_template_platform_suitability(template_id, platform, suitability_status) VALUES
      ('${TQ1}', 'facebook', 'candidate'), ('${TQ1}', 'instagram', 'candidate'),
      ('${TQ2}', 'facebook', 'candidate'), ('${TQ2}', 'instagram', 'candidate'),
      ('${TQ0}', 'facebook', 'candidate'), ('${TQ0}', 'instagram', 'candidate'),
      ('${TQ3}', 'facebook', 'candidate'), ('${TQ3}', 'instagram', 'candidate');
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

  // ── historical pool: 14 drafts / 17 renders (mirrors live-verified shape) ──
  // D01..D03 carry 2 renders each; D04..D14 one each. D14 = linkedin (fail-closed).
  const drafts = [
    [D(1), 'facebook'], [D(2), 'instagram'], [D(3), 'facebook'],
    [D(4), 'facebook'], [D(5), 'instagram'], [D(6), 'facebook'],
    [D(7), 'instagram'], [D(8), 'facebook'], [D(9), 'instagram'],
    [D(10), 'facebook'],   // agreement
    [D(11), 'instagram'],  // background_divergence
    [D(12), 'facebook'],   // selector_disagreement
    [D(13), 'instagram'],  // structural, OLDER row lacking contract fields
    [D(14), 'linkedin'],   // selector_fail_closed
  ];
  const draftValues = drafts
    .map(([id, pf]) => `('${id}', '${PP}', '${pf}', 'approved')`).join(',\n      ');
  await db.exec(`
    INSERT INTO m.post_draft(post_draft_id, client_id, platform, approval_status) VALUES
      ${draftValues};
  `);

  const agreeBg = selBgFor(D(10));                                    // selector pick for D10
  const divergeSelBg = selBgFor(D(11));
  const divergeProdBg = RANKED_BG[(fnv1a32(D(11)) % 3 + 1) % 3];      // deliberately different
  // [render_log_id, post_draft_id, render_spec, created_at]
  const renders = [
    [R(1),  D(1),  specB1('bg_perth_cbd'),           '2026-06-10T00:00:00Z'],
    [R(2),  D(1),  specB1('bg_brisbane_cbd'),        '2026-06-11T00:00:00Z'],
    [R(3),  D(2),  specB1('bg_sydney_cbd'),          '2026-06-12T00:00:00Z'],
    [R(4),  D(2),  specB1('bg_perth_cbd'),           '2026-06-13T00:00:00Z'],
    [R(5),  D(3),  specB1('bg_brisbane_cbd'),        '2026-06-14T00:00:00Z'],
    [R(6),  D(3),  specB1('bg_sydney_cbd'),          '2026-06-15T00:00:00Z'],
    [R(7),  D(4),  specB1('bg_perth_cbd'),           '2026-06-16T00:00:00Z'],
    [R(8),  D(5),  specB1('bg_brisbane_cbd'),        '2026-06-17T00:00:00Z'],
    [R(9),  D(6),  specB1('bg_sydney_cbd'),          '2026-06-18T00:00:00Z'],
    [R(10), D(7),  specB1('bg_perth_cbd'),           '2026-06-19T00:00:00Z'],
    [R(11), D(8),  specB1('bg_brisbane_cbd'),        '2026-06-20T00:00:00Z'],
    [R(12), D(9),  specB1('bg_sydney_cbd'),          '2026-06-21T00:00:00Z'],
    [R(13), D(10), specReg('tpl-q1', agreeBg),       '2026-06-22T00:00:00Z'], // agreement
    [R(14), D(11), specReg('tpl-q1', divergeProdBg), '2026-06-23T00:00:00Z'], // background_divergence
    [R(15), D(12), specReg('tpl-q2', 'bg_sydney_cbd'), '2026-06-24T00:00:00Z'], // selector_disagreement
    [R(16), D(13), specB1Old('bg_perth_cbd'),        '2026-05-01T00:00:00Z'], // OLDER, contract-less
    [R(17), D(14), specB1('bg_perth_cbd'),           '2026-06-25T00:00:00Z'], // linkedin -> fail_closed
  ];
  const renderValues = renders
    .map(([rid, did, spec, ts]) => `('${rid}', '${did}', '${PP}', 'succeeded', '${spec}', '${ts}')`)
    .join(',\n      ');
  await db.exec(`
    INSERT INTO m.post_render_log(render_log_id, post_draft_id, client_id, status, render_spec, created_at) VALUES
      ${renderValues};
    -- noise rows the pool query must EXCLUDE (wrong label / wrong status):
    INSERT INTO m.post_render_log(post_draft_id, client_id, status, render_spec) VALUES
      ('${D(1)}', '${PP}', 'succeeded', '{"label":"tmr_smoke","template":{"provider_template_id":"x"}}'),
      ('${D(2)}', '${PP}', 'failed',    '${specB1('bg_perth_cbd')}');
    -- publish-side tables get one row each so the isolation probes are meaningful:
    INSERT INTO m.post_publish_queue(post_draft_id, platform, status) VALUES ('${D(1)}', 'facebook', 'published');
    INSERT INTO m.post_publish(post_draft_id, client_id, platform, status) VALUES ('${D(1)}', '${PP}', 'facebook', 'published');
  `);

  const shadowCount = async () =>
    Number((await q(`SELECT count(*)::int AS n FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]))[0].n);

  // =====================================================================
  console.log('\nIsolation probes: PRE snapshot (real probe SQL)...');
  const preProbe = (await db.query(probesSqlText)).rows;

  console.log('Applying the REAL S0 batch harness SQL (#4, artifact under test)...');
  await db.exec(batchSqlText);

  // =====================================================================
  console.log('\nTest 1: batch inserts exactly 17 rows with correct extraction + divergence classes');
  {
    check('exactly 17 rows inserted for the batch label', await shadowCount() === 17, String(await shadowCount()));
    const rows = await q(`SELECT * FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    const byRender = Object.fromEntries(rows.map(r => [r.render_log_id, r]));

    check('14 distinct post_draft_ids', new Set(rows.map(r => r.post_draft_id)).size === 14);
    check('render_log_id present on every row and unique',
      rows.every(r => r.render_log_id) && new Set(rows.map(r => r.render_log_id)).size === 17);
    check('client_id = PP on every row', rows.every(r => r.client_id === PP));
    check("format = 'image_quote' on every row", rows.every(r => r.format === 'image_quote'));
    check(`selector_version = '${SELECTOR_VERSION}' on every row`, rows.every(r => r.selector_version === SELECTOR_VERSION));
    check('platform copied from the draft (spot: R01=facebook, R03=instagram, R17=linkedin)',
      byRender[R(1)].platform === 'facebook' && byRender[R(3)].platform === 'instagram'
      && byRender[R(17)].platform === 'linkedin');

    const classCounts = {};
    for (const r of rows) classCounts[r.divergence.primary_class] = (classCounts[r.divergence.primary_class] || 0) + 1;
    check('class counts: 13 structural / 1 agreement / 1 background_divergence / 1 selector_disagreement / 1 selector_fail_closed',
      classCounts.expected_structural_divergence === 13 && classCounts.agreement === 1
      && classCounts.background_divergence === 1 && classCounts.selector_disagreement === 1
      && classCounts.selector_fail_closed === 1, JSON.stringify(classCounts));

    // structural row (R01): full extraction
    const s = byRender[R(1)];
    check('structural row production_actual extraction (ptid/impl/family/bg/asset_keys/variant/contract/rendered_at)',
      s.production_actual.provider_template_id === B1_PTID
      && s.production_actual.implementation_id === 'news_static_centered_scrim_1x1_v1'
      && s.production_actual.template_family === 'creative_library_b1'
      && s.production_actual.background_key === 'bg_perth_cbd'
      && JSON.stringify(s.production_actual.asset_keys) === JSON.stringify(['pp_logo_primary', 'bg_perth_cbd'])
      && s.production_actual.variant_key === 'image_quote.b1.v1'
      && s.production_actual.contract_ref === 'aci-contract-v1'
      && typeof s.production_actual.rendered_at === 'string', JSON.stringify(s.production_actual));
    check('structural row: primary_class + template_match=false + note',
      s.divergence.primary_class === 'expected_structural_divergence'
      && s.divergence.template_match === false
      && s.divergence.notes === 'production B1 template not in TMR registry', JSON.stringify(s.divergence));
    check('structural row asset_matches: production+selector keys recorded, logo_match=true',
      JSON.stringify(s.divergence.asset_matches.production_asset_keys) === JSON.stringify(['pp_logo_primary', 'bg_perth_cbd'])
      && s.divergence.asset_matches.selector_asset_keys.includes('pp_logo_primary')
      && s.divergence.asset_matches.logo_match === true, JSON.stringify(s.divergence.asset_matches));
    check('seed_used = post_draft_id::text (structural row)', s.seed_used === D(1), s.seed_used);

    // OLDER contract-less row (R16): null-safe extraction
    const o = byRender[R(16)];
    check('older row: contract fields extracted as nulls (variant_key/contract_ref/implementation_id/template_family)',
      o.production_actual.variant_key === null && o.production_actual.contract_ref === null
      && o.production_actual.implementation_id === null && o.production_actual.template_family === null,
      JSON.stringify(o.production_actual));
    check('older row still classes structural with the standard note',
      o.divergence.primary_class === 'expected_structural_divergence'
      && o.divergence.notes === 'production B1 template not in TMR registry', JSON.stringify(o.divergence));

    // agreement (R13): production template IS in registry, matches winner + background
    const ag = byRender[R(13)];
    check('agreement row: primary_class=agreement, template_match+background_match true',
      ag.divergence.primary_class === 'agreement'
      && ag.divergence.template_match === true && ag.divergence.background_match === true,
      JSON.stringify(ag.divergence));
    check('agreement row: selector winner = tpl-q1 and selector bg = production bg',
      ag.selector_output.selected.provider_template_id === 'tpl-q1'
      && ag.production_actual.background_key === agreeBg, JSON.stringify({ sel: ag.selector_output.selected, bg: agreeBg }));

    // background_divergence (R14): template agrees, background differs
    const bd = byRender[R(14)];
    check('background_divergence row: template_match=true, background_match=false, correct class + note',
      bd.divergence.primary_class === 'background_divergence'
      && bd.divergence.template_match === true && bd.divergence.background_match === false
      && bd.divergence.notes.includes('background differs'), JSON.stringify(bd.divergence));
    check('background_divergence row: selector picked a DIFFERENT bg than production',
      divergeSelBg !== divergeProdBg && bd.production_actual.background_key === divergeProdBg,
      `sel=${divergeSelBg} prod=${divergeProdBg}`);

    // selector_disagreement (R15): production tpl-q2 in registry, selector picked tpl-q1
    const sd = byRender[R(15)];
    check('selector_disagreement row: class + template_match=false + in-registry production template',
      sd.divergence.primary_class === 'selector_disagreement'
      && sd.divergence.template_match === false
      && sd.production_actual.provider_template_id === 'tpl-q2'
      && sd.selector_output.selected.provider_template_id === 'tpl-q1', JSON.stringify(sd.divergence));

    // selector_fail_closed (R17): linkedin draft, selector fails closed
    const fc = byRender[R(17)];
    check('selector_fail_closed row: class + selector_output.status=fail_closed + fail_reason in notes',
      fc.divergence.primary_class === 'selector_fail_closed'
      && fc.selector_output.status === 'fail_closed'
      && fc.divergence.notes.includes(fc.selector_output.fail_reason), JSON.stringify({ n: fc.divergence.notes, fr: fc.selector_output.fail_reason }));
    check('selector_fail_closed row: template_match=false, background_match=false',
      fc.divergence.template_match === false && fc.divergence.background_match === false);

    // registry_context: computed ONCE, correct counts, stamped on every row
    const distinctCtx = await q(`SELECT count(DISTINCT registry_context::text)::int AS n FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    check('registry_context identical on all 17 rows (computed once, reused)', Number(distinctCtx[0].n) === 1);
    const ctx = rows[0].registry_context;
    check('registry_context counts: selectable=3, proposed=1, visual_proofs=3',
      ctx.selectable_count === 3 && ctx.proposed_count === 1 && ctx.visual_proofs === 3, JSON.stringify(ctx));
    check('batch_label stamped as rollback key on every row', rows.every(r => r.batch_label === BATCH_LABEL));
    check('computed_at + created_at present', rows.every(r => r.computed_at && r.created_at));
  }

  console.log('\nIsolation probes: POST snapshot must be byte-identical on production tables');
  {
    const postProbe = (await db.query(probesSqlText)).rows;
    const prodOnly = (rows) => rows.filter(r => !String(r.probe_table).startsWith('zz_expected_delta'));
    check('all 4 production-table probe rows byte-identical pre vs post',
      JSON.stringify(prodOnly(preProbe)) === JSON.stringify(prodOnly(postProbe)),
      JSON.stringify({ pre: prodOnly(preProbe), post: prodOnly(postProbe) }));
    const preDelta = preProbe.find(r => String(r.probe_table).startsWith('zz_expected_delta'));
    const postDelta = postProbe.find(r => String(r.probe_table).startsWith('zz_expected_delta'));
    check('expected-delta probe row: shadow batch count 0 pre -> 17 post',
      preDelta.row_count === '0' && postDelta.row_count === '17',
      JSON.stringify({ pre: preDelta, post: postDelta }));
  }

  console.log('\nTest 2: idempotency — re-run aborts cleanly, zero new rows');
  {
    let threw = null;
    try { await db.exec(batchSqlText); } catch (e) { threw = e; }
    try { await db.exec('ROLLBACK;'); } catch { /* clears the aborted tx */ }
    check('re-run raises (does not silently skip)', threw !== null);
    check("re-run abort message names the batch_label pre-assert ('re-run refused')",
      threw && /re-run refused/.test(String(threw.message || threw)), String(threw && threw.message));
    check('still exactly 17 rows after refused re-run', await shadowCount() === 17, String(await shadowCount()));
  }

  console.log('\nTest 4: posture — RLS on / zero policies / service_role CRUD / anon+authenticated denied');
  {
    const rls = (await q(`
      SELECT c2.relrowsecurity AS on
      FROM pg_class c2 JOIN pg_namespace n ON n.oid = c2.relnamespace
      WHERE n.nspname = 'c' AND c2.relname = 'tmr_shadow_decision'`))[0];
    check('RLS enabled on c.tmr_shadow_decision', rls.on === true, JSON.stringify(rls));
    const pol = (await q(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'c' AND tablename = 'tmr_shadow_decision'`))[0];
    check('ZERO policies (deny-by-default)', Number(pol.n) === 0, String(pol.n));

    const priv = async (role, p) =>
      (await q(`SELECT has_table_privilege('${role}', 'c.tmr_shadow_decision', '${p}') AS b`))[0].b;
    check('grants: service_role SELECT+INSERT+UPDATE+DELETE',
      await priv('service_role', 'SELECT') && await priv('service_role', 'INSERT')
      && await priv('service_role', 'UPDATE') && await priv('service_role', 'DELETE'));
    check('grants: inspector_ro SELECT only',
      await priv('inspector_ro', 'SELECT') && !(await priv('inspector_ro', 'INSERT'))
      && !(await priv('inspector_ro', 'UPDATE')) && !(await priv('inspector_ro', 'DELETE')));
    check('grants: anon has NOTHING',
      !(await priv('anon', 'SELECT')) && !(await priv('anon', 'INSERT')));
    check('grants: authenticated has NOTHING',
      !(await priv('authenticated', 'SELECT')) && !(await priv('authenticated', 'INSERT')));

    // behavioral: anon denied outright
    let anonErr = null;
    await db.exec('SET ROLE anon;');
    try { await db.query('SELECT count(*) FROM c.tmr_shadow_decision'); } catch (e) { anonErr = e; }
    await db.exec('RESET ROLE;');
    check('behavioral: anon SELECT raises permission denied', anonErr !== null && /permission denied/i.test(String(anonErr.message)), String(anonErr && anonErr.message));

    // behavioral: inspector_ro has the grant but RLS (zero policies) yields zero rows
    await db.exec('SET ROLE inspector_ro;');
    const iro = (await q('SELECT count(*)::int AS n FROM c.tmr_shadow_decision'))[0];
    await db.exec('RESET ROLE;');
    check('behavioral: inspector_ro sees 0 rows despite 17 existing (RLS deny-by-default)', Number(iro.n) === 0, String(iro.n));

    // behavioral: service_role full CRUD (BYPASSRLS mirrors live)
    await db.exec('SET ROLE service_role;');
    const src = (await q('SELECT count(*)::int AS n FROM c.tmr_shadow_decision'))[0];
    await db.exec(`
      INSERT INTO c.tmr_shadow_decision
        (post_draft_id, client_id, format, selector_version, selector_output, production_actual, divergence, registry_context, batch_label)
      VALUES ('${D(1)}', '${PP}', 'image_quote', 'posture-test', '{}', '{}',
              '{"primary_class":"agreement"}', '{}', 'posture-test');
      UPDATE c.tmr_shadow_decision SET platform = 'facebook' WHERE batch_label = 'posture-test';
      DELETE FROM c.tmr_shadow_decision WHERE batch_label = 'posture-test';
    `);
    await db.exec('RESET ROLE;');
    check('behavioral: service_role sees all rows + INSERT/UPDATE/DELETE succeed', Number(src.n) === 17, String(src.n));
    check('posture-test row cleaned up', await shadowCount() === 17);

    // CHECK constraint: taxonomy vocabulary is closed
    let ckErr = null;
    try {
      await db.query(`
        INSERT INTO c.tmr_shadow_decision
          (post_draft_id, client_id, format, selector_version, selector_output, production_actual, divergence, registry_context, batch_label)
        VALUES ('${D(1)}', '${PP}', 'image_quote', 'x', '{}', '{}', '{"primary_class":"bogus_class"}', '{}', 'check-test')`);
    } catch (e) { ckErr = e; }
    check('CHECK rejects a primary_class outside the ratified taxonomy', ckErr !== null && /check/i.test(String(ckErr.message)), String(ckErr && ckErr.message));
  }

  console.log('\nTest 5: selector_output stored is the FULL select_template payload');
  {
    const rows = await q(`SELECT selector_output FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    const KEYS = ['status', 'selected', 'slot_resolution', 'alternatives', 'rejected', 'warnings', 'fail_reason', 'context'];
    check('every row has ALL full-payload keys (status/selected/slot_resolution/alternatives/rejected/warnings/fail_reason/context)',
      rows.every(r => KEYS.every(k => Object.prototype.hasOwnProperty.call(r.selector_output, k))),
      JSON.stringify(Object.keys(rows[0].selector_output)));
    const ok = rows.filter(r => r.selector_output.status === 'ok');
    check('ok rows carry winner + slot_resolution + rejected[] (explainability preserved)',
      ok.length === 16 && ok.every(r =>
        r.selector_output.selected.provider_template_id
        && r.selector_output.slot_resolution.status === 'ok'
        && Array.isArray(r.selector_output.rejected)), String(ok.length));
  }

  console.log('\nTest 6: seed determinism — stored selector_output.context.seed == post_draft_id text');
  {
    const rows = await q(`SELECT post_draft_id, seed_used, selector_output FROM c.tmr_shadow_decision WHERE batch_label = $1`, [BATCH_LABEL]);
    check('all 17 rows: selector_output.context.seed === post_draft_id::text === seed_used',
      rows.every(r => r.selector_output.context.seed === r.post_draft_id && r.seed_used === r.post_draft_id));
    // and the seed actually drove the bg rotation (JS FNV-1a parity on an ok row)
    const one = rows.find(r => r.post_draft_id === D(4));
    const bg = (one.selector_output.slot_resolution.selected || []).find(s => s.slot === 'Background');
    check('background pick matches JS FNV-1a parity for seed=post_draft_id (D04)',
      bg.asset_key === selBgFor(D(4)), `${bg.asset_key} vs ${selBgFor(D(4))}`);
  }

  console.log('\nTest 3 (run last): rollback by batch_label removes exactly 17; table empty');
  {
    const del = await db.query(`DELETE FROM c.tmr_shadow_decision WHERE batch_label = '${BATCH_LABEL}'`);
    check('DELETE by batch_label removes exactly 17 rows', del.affectedRows === 17, String(del.affectedRows));
    const total = (await q('SELECT count(*)::int AS n FROM c.tmr_shadow_decision'))[0];
    check('table empty after rollback', Number(total.n) === 0, String(total.n));
  }

  console.log('\n======================================================');
  console.log(`RESULT: ${pass} passed, ${fail} failed.`);
  if (fail) { console.log('FAILED:', fails.join(', ')); process.exitCode = 1; }
  console.log('Path used: PGlite (ALL FOUR real SQL artifacts — resolve_slot_assets + select_template + tmr_shadow_decision migration + S0 batch harness — executed in WASM Postgres with plpgsql; isolation probes run pre/post from the real probe file; grants loaded verbatim against fixture roles).');
  await db.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exitCode = 2; });
