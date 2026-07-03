// template-selection-v0-lane-c-validation.mjs
// =====================================================================
// PGlite (offline, no prod) validation for Template Selection v0 Lane C:
// public.select_template (read-only TMR template selector RPC).
//
// Loads BOTH real migration files verbatim (roles are created in the
// fixture so the actual artifacts load unmodified):
//   1. supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql
//      (the composed dependency — Slice-1 slot resolver)
//   2. supabase/migrations/20260703120000_create_select_template_v1.sql
//      (Lane C — the artifact under test)
// into PGlite (WASM Postgres with plpgsql), builds a minimal `c` schema
// fixture mirroring live (16-generic-template registry shape, PP governed
// assets, assignment lifecycle states, assignment-scoped visual proofs),
// and runs the brief's required cases. This is the ACTUAL SQL — not a mirror.
//
// Run:  node docs/briefs/template-selection-v0-lane-c-validation.mjs
//   (requires @electric-sql/pglite; installed dev-only OUTSIDE the repo,
//    NOT committed. RESOLVE_SQL_PATH / SELECT_SQL_PATH env overrides let
//    the test run from a dir where PGlite is installed (ESM ignores
//    NODE_PATH); defaults = repo-relative locations.)
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOLVE_SQL = process.env.RESOLVE_SQL_PATH || join(
  __dirname, '..', '..',
  'supabase', 'migrations', '20260703002813_create_resolve_slot_assets_v1.sql');
const SELECT_SQL = process.env.SELECT_SQL_PATH || join(
  __dirname, '..', '..',
  'supabase', 'migrations', '20260703120000_create_select_template_v1.sql');

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
const NA = '22222222-2222-2222-2222-222222222202'; // assignments+proofs but ZERO governed assets

// image_quote candidates (created_at staggered 06-01..06-12 in suffix order):
const TQ0  = '11111111-1111-1111-1111-111111111100'; // survivor, fit=candidate, OLDEST (rank rule ii test)
const TQ1  = '11111111-1111-1111-1111-111111111101'; // survivor, strong — EXPECTED WINNER
const TQ2  = '11111111-1111-1111-1111-111111111102'; // survivor, strong — alternative #1
const TQ3  = '11111111-1111-1111-1111-111111111103'; // assignment 'proposed'      -> assignment_not_approved
const TQ4  = '11111111-1111-1111-1111-111111111104'; // assignment 'proposed'      -> assignment_not_approved
const TQ5  = '11111111-1111-1111-1111-111111111105'; // assignment 'approved'      -> not_visually_proven (pre-visual rung)
const TQ6  = '11111111-1111-1111-1111-111111111106'; // assignment 'blocked'       -> assignment_blocked
const TQ7  = '11111111-1111-1111-1111-111111111107'; // no assignment              -> no_assignment
const TQ8  = '11111111-1111-1111-1111-111111111108'; // scope='client' AND low status -> wrong_scope (order a beats b)
const TQ9  = '11111111-1111-1111-1111-111111111109'; // status='field_mapped'      -> status_below_smoke
const TQ10 = '11111111-1111-1111-1111-111111111110'; // facebook row 'not_suitable' -> platform_unsuitable (negative row)
const TQ11 = '11111111-1111-1111-1111-111111111111'; // visually_approved but NO passed proof -> not_visually_proven
const TC1  = '11111111-1111-1111-1111-111111111121'; // carousel template (format isolation)
const TT1  = '11111111-1111-1111-1111-111111111131'; // youtube thumbnail; suitability website+youtube ONLY

// assignment ids (PP unless suffixed -na)
const A = (n) => `aaaaaaaa-1111-1111-1111-1111111111${n}`;

async function sel(slug, platform, format, intent = null, seed = null) {
  const rows = await q(
    'SELECT public.select_template($1,$2,$3,$4,$5) AS r',
    [slug, platform, format, intent, seed]);
  return rows[0].r;
}
const rcMap = (res) => Object.fromEntries(res.rejected.map(x => [x.template_id, x.reason_code]));

(async () => {
  console.log('Fixture: roles + minimal c schema (client, brand assets, TMR registry tables w/ real CHECK vocabularies)...');
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA c;
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
  `);

  console.log('Loading REAL migration SQL #1 (resolve_slot_assets — dependency) into PGlite...');
  await db.exec(readFileSync(RESOLVE_SQL, 'utf8'));
  console.log('Loading REAL migration SQL #2 (select_template — under test) into PGlite...');
  await db.exec(readFileSync(SELECT_SQL, 'utf8'));

  // ── clients ──────────────────────────────────────────────────────────
  await db.exec(`
    INSERT INTO c.client(client_id, client_slug, status) VALUES
      ('${PP}', 'property-pulse',     'active'),
      ('${NA}', 'assigned-no-assets', 'active');
  `);

  // ── PP governed assets: 3 backgrounds (all needs_scrim) + 1 logo ─────
  await db.exec(`
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
  // (client 'assigned-no-assets' deliberately gets ZERO c.client_brand_asset rows.)

  // ── templates + variant candidates + suitability + fields ────────────
  await db.exec(`
    INSERT INTO c.creative_provider_template(id, provider, provider_template_id, provider_template_name, scope, aspect_ratio, status, created_at) VALUES
      ('${TQ0}',  'creatomate', 'tpl-q0',  'generic stat card 1:1',       'generic', '1:1',  'smoke_rendered', '2026-06-01T00:00:00Z'),
      ('${TQ1}',  'creatomate', 'tpl-q1',  'generic market update 1:1',   'generic', '1:1',  'smoke_rendered', '2026-06-02T00:00:00Z'),
      ('${TQ2}',  'creatomate', 'tpl-q2',  'generic announcement 1:1',    'generic', '1:1',  'smoke_rendered', '2026-06-03T00:00:00Z'),
      ('${TQ3}',  'creatomate', 'tpl-q3',  'generic educational 1:1',     'generic', '1:1',  'smoke_rendered', '2026-06-04T00:00:00Z'),
      ('${TQ4}',  'creatomate', 'tpl-q4',  'generic comparison 1:1',      'generic', '1:1',  'smoke_rendered', '2026-06-05T00:00:00Z'),
      ('${TQ5}',  'creatomate', 'tpl-q5',  'generic testimonial 1:1',     'generic', '1:1',  'smoke_rendered', '2026-06-06T00:00:00Z'),
      ('${TQ6}',  'creatomate', 'tpl-q6',  'generic news summary 1:1',    'generic', '1:1',  'smoke_rendered', '2026-06-07T00:00:00Z'),
      ('${TQ7}',  'creatomate', 'tpl-q7',  'generic quote card 1:1',      'generic', '1:1',  'smoke_rendered', '2026-06-08T00:00:00Z'),
      ('${TQ8}',  'creatomate', 'tpl-q8',  'client-scoped card 1:1',      'client',  '1:1',  'field_mapped',   '2026-06-09T00:00:00Z'),
      ('${TQ9}',  'creatomate', 'tpl-q9',  'generic unsmoke card 1:1',    'generic', '1:1',  'field_mapped',   '2026-06-10T00:00:00Z'),
      ('${TQ10}', 'creatomate', 'tpl-q10', 'generic fb-unsuitable 1:1',   'generic', '1:1',  'smoke_rendered', '2026-06-11T00:00:00Z'),
      ('${TQ11}', 'creatomate', 'tpl-q11', 'generic unproven card 1:1',   'generic', '1:1',  'smoke_rendered', '2026-06-12T00:00:00Z'),
      ('${TC1}',  'creatomate', 'tpl-c1',  'generic carousel cover 1:1',  'generic', '1:1',  'smoke_rendered', '2026-06-13T00:00:00Z'),
      ('${TT1}',  'creatomate', 'tpl-t1',  'generic yt thumbnail 16:9',   'generic', '16:9', 'smoke_rendered', '2026-06-14T00:00:00Z');

    INSERT INTO c.creative_template_variant_candidate(template_id, format_key, variant_key, fit_status) VALUES
      ('${TQ0}',  'image_quote',       'stat_card.v1',       'candidate'),
      ('${TQ1}',  'image_quote',       'market_update.v1',   'strong_candidate'),
      ('${TQ2}',  'image_quote',       'announcement.v1',    'strong_candidate'),
      ('${TQ3}',  'image_quote',       'educational.v1',     'strong_candidate'),
      ('${TQ4}',  'image_quote',       'comparison.v1',      'strong_candidate'),
      ('${TQ5}',  'image_quote',       'testimonial.v1',     'strong_candidate'),
      ('${TQ6}',  'image_quote',       'news_summary.v1',    'strong_candidate'),
      ('${TQ7}',  'image_quote',       'quote_card.v1',      'strong_candidate'),
      ('${TQ8}',  'image_quote',       'market_update.v1',   'strong_candidate'),
      ('${TQ9}',  'image_quote',       'announcement.v1',    'strong_candidate'),
      ('${TQ10}', 'image_quote',       'educational.v1',     'strong_candidate'),
      ('${TQ11}', 'image_quote',       'comparison.v1',      'strong_candidate'),
      ('${TC1}',  'carousel',          'carousel_cover.v1',  'strong_candidate'),
      ('${TT1}',  'youtube_thumbnail', 'thumbnail.v1',       'strong_candidate');

    -- facebook suitability (all 'candidate' — mirrors live); TQ10 = 'not_suitable';
    -- TQ8/TQ9 get no row (they reject at scope/status, before the platform step);
    -- TT1 has rows ONLY for website + youtube (mirrors live thumbnail).
    INSERT INTO c.creative_template_platform_suitability(template_id, platform, suitability_status) VALUES
      ('${TQ0}',  'facebook', 'candidate'),
      ('${TQ1}',  'facebook', 'candidate'),
      ('${TQ2}',  'facebook', 'candidate'),
      ('${TQ3}',  'facebook', 'candidate'),
      ('${TQ4}',  'facebook', 'candidate'),
      ('${TQ5}',  'facebook', 'candidate'),
      ('${TQ6}',  'facebook', 'candidate'),
      ('${TQ7}',  'facebook', 'candidate'),
      ('${TQ10}', 'facebook', 'not_suitable'),
      ('${TQ11}', 'facebook', 'candidate'),
      ('${TC1}',  'facebook', 'candidate'),
      ('${TT1}',  'website',  'candidate'),
      ('${TT1}',  'youtube',  'candidate');

    -- fields only where resolve_slot_assets is actually reached (survivors of a-e)
    INSERT INTO c.creative_provider_template_field(template_id, element_name, element_type, dynamic, field_kind, required_for_render) VALUES
      ('${TQ0}',  'Background', 'image', true,  'background', true),
      ('${TQ0}',  'Logo',       'image', true,  'logo',       false),
      ('${TQ0}',  'Scrim',      'shape', false, 'shape',      false),
      ('${TQ1}',  'Background', 'image', true,  'background', true),
      ('${TQ1}',  'Logo',       'image', true,  'logo',       false),
      ('${TQ1}',  'Scrim',      'shape', false, 'shape',      false),
      ('${TQ1}',  'Headline',   'text',  true,  'text',       true),
      ('${TQ2}',  'Background', 'image', true,  'background', true),
      ('${TQ2}',  'Logo',       'image', true,  'logo',       false),
      ('${TQ10}', 'Background', 'image', true,  'background', true),
      ('${TQ10}', 'Logo',       'image', true,  'logo',       false),
      ('${TQ10}', 'Scrim',      'shape', false, 'shape',      false),
      ('${TT1}',  'Background', 'image', true,  'background', true),
      ('${TT1}',  'Logo',       'image', true,  'logo',       false),
      ('${TT1}',  'FaceObject', 'image', true,  'image',      false);
  `);

  // ── assignments + proofs ──────────────────────────────────────────────
  await db.exec(`
    INSERT INTO c.creative_template_client_assignment(id, template_id, client_id, assignment_scope, assignment_status, approved_by, approved_at) VALUES
      ('${A('00')}', '${TQ0}',  '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('01')}', '${TQ1}',  '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('02')}', '${TQ2}',  '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('03')}', '${TQ3}',  '${PP}', 'generic_allowed', 'proposed',          NULL, NULL),
      ('${A('04')}', '${TQ4}',  '${PP}', 'generic_allowed', 'proposed',          NULL, NULL),
      ('${A('05')}', '${TQ5}',  '${PP}', 'generic_allowed', 'approved',          'PK', '2026-06-20T00:00:00Z'),
      ('${A('06')}', '${TQ6}',  '${PP}', 'generic_allowed', 'blocked',           NULL, NULL),
      ('${A('10')}', '${TQ10}', '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('11')}', '${TQ11}', '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('31')}', '${TT1}',  '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      -- assigned-no-assets client: fully approved+proven pairs, but ZERO governed assets
      ('${A('a1')}', '${TQ1}',  '${NA}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A('a2')}', '${TQ2}',  '${NA}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z');

    -- visual_approval passed proofs on the visually_approved assignments ONLY
    -- (TQ11's assignment gets a FAILED proof: proves only proof_status='passed' counts)
    INSERT INTO c.creative_template_proof_event(template_id, assignment_id, proof_type, proof_status, evidence_reference, occurred_at) VALUES
      ('${TQ0}',  '${A('00')}', 'visual_approval', 'passed', 'render:smoke:tq0', '2026-06-21T00:00:00Z'),
      ('${TQ1}',  '${A('01')}', 'visual_approval', 'passed', 'render:smoke:tq1', '2026-06-21T01:00:00Z'),
      ('${TQ2}',  '${A('02')}', 'visual_approval', 'passed', 'render:smoke:tq2', '2026-06-21T02:00:00Z'),
      ('${TQ10}', '${A('10')}', 'visual_approval', 'passed', 'render:smoke:tq10','2026-06-21T03:00:00Z'),
      ('${TQ11}', '${A('11')}', 'visual_approval', 'failed', 'render:smoke:tq11','2026-06-21T04:00:00Z'),
      ('${TT1}',  '${A('31')}', 'visual_approval', 'passed', 'render:smoke:tt1', '2026-06-21T05:00:00Z'),
      ('${TQ1}',  '${A('a1')}', 'visual_approval', 'passed', 'render:smoke:na1', '2026-06-21T06:00:00Z'),
      ('${TQ2}',  '${A('a2')}', 'visual_approval', 'passed', 'render:smoke:na2', '2026-06-21T07:00:00Z');
  `);

  // Ranked eligible PP backgrounds inside resolve_slot_assets (all needs_scrim class,
  // so created_at ASC order) — used for the seed-passthrough parity check.
  const RANKED_BG = ['bg_sydney_cbd', 'bg_brisbane_cbd', 'bg_kirribilli'];
  const bgKeyOf = (slotRes) => ((slotRes.selected || []).find(s => s.slot === 'Background') || {}).asset_key;

  // =====================================================================
  console.log('\nTest 1: Happy path (property-pulse, facebook, image_quote) — deterministic winner + complete payload');
  let happy;
  {
    happy = await sel('property-pulse', 'facebook', 'image_quote');
    check('status ok', happy.status === 'ok', JSON.stringify(happy));
    check('winner is TQ1 (strong_candidate, earliest among strong)', happy.selected.template_id === TQ1, happy.selected.template_id);
    const s = happy.selected;
    check('selected payload complete (assignment_id/provider ids/variant/format/aspect/status/approved_by)',
      s.assignment_id === A('01') && s.provider_template_id === 'tpl-q1'
      && s.provider_template_name === 'generic market update 1:1'
      && s.variant_key === 'market_update.v1' && s.format_key === 'image_quote'
      && s.aspect_ratio === '1:1' && s.assignment_status === 'visually_approved'
      && s.approved_by === 'PK', JSON.stringify(s));
    check('proof block: visual_approval=passed + evidence + occurred_at',
      s.proof && s.proof.visual_approval === 'passed'
      && s.proof.evidence_reference === 'render:smoke:tq1'
      && typeof s.proof.occurred_at === 'string', JSON.stringify(s.proof));
    check('selected.reasons exact',
      JSON.stringify(s.reasons) === JSON.stringify(
        ['format_match','generic_scope','platform_declared','assignment_visually_approved','visual_proof_passed','assets_resolved']),
      JSON.stringify(s.reasons));
    check('slot_resolution embedded and ok', happy.slot_resolution && happy.slot_resolution.status === 'ok', JSON.stringify(happy.slot_resolution));
    check('slot_resolution carries modifications (Background+Logo+Scrim.opacity=64)',
      typeof happy.slot_resolution.modifications['Background.source'] === 'string'
      && typeof happy.slot_resolution.modifications['Logo.source'] === 'string'
      && Number(happy.slot_resolution.modifications['Scrim.opacity']) === 64,
      JSON.stringify(happy.slot_resolution.modifications));
    const rc = rcMap(happy);
    check('proposed assignments rejected as assignment_not_approved (TQ3+TQ4)',
      rc[TQ3] === 'assignment_not_approved' && rc[TQ4] === 'assignment_not_approved', JSON.stringify(rc));
    check('rejected count = 9 (12 candidates, 3 survivors)', happy.rejected.length === 9, String(happy.rejected.length));
    check('every rejected entry carries template_id+provider_template_name+variant_key+reason_code',
      happy.rejected.every(x => x.template_id && x.provider_template_name && x.variant_key && x.reason_code),
      JSON.stringify(happy.rejected));
    check('alternatives ranked [TQ2, TQ0] (strong before candidate-fit, despite TQ0 being oldest)',
      happy.alternatives.length === 2
      && happy.alternatives[0].template_id === TQ2 && happy.alternatives[1].template_id === TQ0,
      JSON.stringify(happy.alternatives.map(a => a.template_id)));
    check('alternatives carry rank_reasons (TQ0 says fit_candidate)',
      happy.alternatives[1].rank_reasons.includes('fit_candidate'), JSON.stringify(happy.alternatives));
    check('fail_reason null', happy.fail_reason === null, JSON.stringify(happy.fail_reason));
    check('context echoes all 5 inputs + selectable_definition',
      happy.context.client_slug === 'property-pulse' && happy.context.platform === 'facebook'
      && happy.context.format === 'image_quote' && happy.context.variant_intent === null
      && happy.context.seed === null
      && happy.context.selectable_definition === 'visually_approved+ AND passed visual_approval proof',
      JSON.stringify(happy.context));
  }

  console.log('\nTest 2: variant_intent is a RANKER, never a filter');
  {
    const survivorsOf = (r) => 1 + r.alternatives.length;
    const base = survivorsOf(happy);
    const r1 = await sel('property-pulse', 'facebook', 'image_quote', 'announcement.v1');
    check('intent=announcement.v1 -> TQ2 wins', r1.status === 'ok' && r1.selected.template_id === TQ2, JSON.stringify(r1.selected));
    check('winner reasons include variant_intent_match', r1.selected.reasons.includes('variant_intent_match'), JSON.stringify(r1.selected.reasons));
    check('survivor count unchanged (never a filter)', survivorsOf(r1) === base, `${survivorsOf(r1)} vs ${base}`);
    check('no variant_intent_unmatched warning on a matched intent', !r1.warnings.includes('variant_intent_unmatched'), JSON.stringify(r1.warnings));

    const r2 = await sel('property-pulse', 'facebook', 'image_quote', 'stat_card.v1');
    check('intent=stat_card.v1 -> TQ0 wins (intent outranks strong fit)', r2.status === 'ok' && r2.selected.template_id === TQ0, JSON.stringify(r2.selected));
    check('survivor count unchanged', survivorsOf(r2) === base, String(survivorsOf(r2)));

    const r3 = await sel('property-pulse', 'facebook', 'image_quote', 'no_such_variant.v9');
    check('unmatched intent -> same winner as no-intent (TQ1)', r3.status === 'ok' && r3.selected.template_id === TQ1, JSON.stringify(r3.selected));
    check('warning variant_intent_unmatched present ONCE',
      r3.warnings.filter(w => w === 'variant_intent_unmatched').length === 1, JSON.stringify(r3.warnings));
    check('survivor count unchanged (unmatched intent filtered nothing)', survivorsOf(r3) === base, String(survivorsOf(r3)));
  }

  console.log('\nTest 3: every rejection code observed');
  {
    const r1 = await sel('ghost-client', 'facebook', 'image_quote');
    check('client_not_found', r1.status === 'fail_closed' && r1.fail_reason === 'client_not_found', JSON.stringify(r1));
    const r2 = await sel('property-pulse', 'facebook', 'no_such_format');
    check('format_unmapped', r2.status === 'fail_closed' && r2.fail_reason === 'format_unmapped', JSON.stringify(r2));

    const rc = rcMap(happy);
    check('wrong_scope (TQ8: scope=client — order rule a beats b, status also low)', rc[TQ8] === 'wrong_scope', JSON.stringify(rc));
    check('status_below_smoke (TQ9: field_mapped)', rc[TQ9] === 'status_below_smoke', JSON.stringify(rc));
    check('platform_unsuitable (TQ10: facebook row not_suitable — normalized negative CHECK value)', rc[TQ10] === 'platform_unsuitable', JSON.stringify(rc));
    check('no_assignment (TQ7)', rc[TQ7] === 'no_assignment', JSON.stringify(rc));
    check('assignment_blocked (TQ6)', rc[TQ6] === 'assignment_blocked', JSON.stringify(rc));
    check("not_visually_proven — 'approved' pre-visual rung (TQ5)", rc[TQ5] === 'not_visually_proven', JSON.stringify(rc));
    check('not_visually_proven — visually_approved status but NO passed proof event (TQ11, failed proof only)',
      rc[TQ11] === 'not_visually_proven', JSON.stringify(rc));

    const r3 = await sel('property-pulse', 'facebook', 'youtube_thumbnail');
    check('thumbnail+facebook -> platform_unsuitable (no suitability row)',
      r3.status === 'fail_closed' && r3.fail_reason === 'no_selectable_template'
      && r3.rejected.length === 1 && r3.rejected[0].template_id === TT1
      && r3.rejected[0].reason_code === 'platform_unsuitable'
      && r3.rejected[0].detail === 'no_suitability_row_for_platform', JSON.stringify(r3.rejected));
    const r3b = await sel('property-pulse', 'youtube', 'youtube_thumbnail');
    check('thumbnail+youtube -> ok (declared platform passes)', r3b.status === 'ok' && r3b.selected.template_id === TT1, JSON.stringify(r3b.fail_reason));

    const r4 = await sel('assigned-no-assets', 'facebook', 'image_quote');
    const rc4 = rcMap(r4);
    check('assets_fail_closed:* — Slice-1 fail_reason echoed verbatim (TQ1+TQ2, client w/ assignments but no governed assets)',
      rc4[TQ1] === 'assets_fail_closed:no_governed_background'
      && rc4[TQ2] === 'assets_fail_closed:no_governed_background', JSON.stringify(rc4));
  }

  console.log('\nTest 4: no_selectable_template — candidates exist, all reject, rejected[] fully populated');
  {
    const r = await sel('assigned-no-assets', 'facebook', 'image_quote');
    check('fail_closed no_selectable_template', r.status === 'fail_closed' && r.fail_reason === 'no_selectable_template', JSON.stringify(r.fail_reason));
    check('rejected[] fully populated (all 12 candidates present)', r.rejected.length === 12, String(r.rejected.length));
    check('every rejected entry carries a reason_code', r.rejected.every(x => x.reason_code), JSON.stringify(r.rejected));
    check('selected null + slot_resolution null + alternatives empty on fail_closed',
      r.selected === null && r.slot_resolution === null && Array.isArray(r.alternatives) && r.alternatives.length === 0,
      JSON.stringify({ s: r.selected, sr: r.slot_resolution, a: r.alternatives }));
  }

  console.log('\nTest 5: NULL p_platform — permissive but VISIBLE; unproven-suitability warning on happy path');
  {
    check('happy path carries platform_suitability_unproven ONCE (all live rows are candidate)',
      happy.warnings.filter(w => w === 'platform_suitability_unproven').length === 1, JSON.stringify(happy.warnings));
    check('happy path has NO platform_input_missing (platform was given)',
      !happy.warnings.includes('platform_input_missing'), JSON.stringify(happy.warnings));

    const r = await sel('property-pulse', null, 'image_quote');
    check('status ok with NULL p_platform', r.status === 'ok', JSON.stringify(r));
    check('warning platform_input_missing present ONCE',
      r.warnings.filter(w => w === 'platform_input_missing').length === 1, JSON.stringify(r.warnings));
    check('no platform_unsuitable rejection anywhere with NULL p_platform',
      !r.rejected.some(x => x.reason_code === 'platform_unsuitable'), JSON.stringify(r.rejected));
    check('TQ10 (fb-not_suitable) becomes a SURVIVOR with NULL platform (3 -> 4 survivors)',
      1 + r.alternatives.length === 4
      && (r.selected.template_id === TQ10 || r.alternatives.some(a => a.template_id === TQ10)),
      JSON.stringify(r.alternatives.map(a => a.template_id)));
    check('winner unchanged (TQ1)', r.selected.template_id === TQ1, r.selected.template_id);
    check("winner reasons say platform_skipped_null_input, NOT platform_declared (no false claim)",
      r.selected.reasons.includes('platform_skipped_null_input') && !r.selected.reasons.includes('platform_declared'),
      JSON.stringify(r.selected.reasons));
  }

  console.log('\nTest 6: determinism + seed passthrough (template NEVER rotates; background does)');
  {
    const a = await sel('property-pulse', 'facebook', 'image_quote', null, 'post-draft-7');
    const b = await sel('property-pulse', 'facebook', 'image_quote', null, 'post-draft-7');
    check('two identical calls -> byte-identical output (no now() in payload)',
      JSON.stringify(a) === JSON.stringify(b));

    // find two seeds mapping to DIFFERENT background indices (fnv1a32 % 3)
    let s1 = null, s2 = null;
    for (let i = 0; i < 64 && !s2; i++) {
      const s = `seed-${i}`;
      if (s1 === null) { s1 = s; continue; }
      if (fnv1a32(s) % 3 !== fnv1a32(s1) % 3) s2 = s;
    }
    check('found two seeds with different fnv%3 indices', s2 !== null);
    const ra = await sel('property-pulse', 'facebook', 'image_quote', null, s1);
    const rb = await sel('property-pulse', 'facebook', 'image_quote', null, s2);
    check('p_seed does NOT change the selected template', ra.selected.template_id === rb.selected.template_id
      && ra.selected.template_id === TQ1, `${ra.selected.template_id} vs ${rb.selected.template_id}`);
    check('p_seed DOES rotate slot_resolution background',
      ra.slot_resolution.modifications['Background.source'] !== rb.slot_resolution.modifications['Background.source'],
      JSON.stringify([ra.slot_resolution.modifications['Background.source'], rb.slot_resolution.modifications['Background.source']]));
    check('background picks match JS FNV-1a parity (rank[fnv%3])',
      bgKeyOf(ra.slot_resolution) === RANKED_BG[fnv1a32(s1) % 3]
      && bgKeyOf(rb.slot_resolution) === RANKED_BG[fnv1a32(s2) % 3],
      `${bgKeyOf(ra.slot_resolution)},${bgKeyOf(rb.slot_resolution)}`);
    check('null-seed pick = rank #1 background (bg_sydney_cbd)', bgKeyOf(happy.slot_resolution) === 'bg_sydney_cbd',
      bgKeyOf(happy.slot_resolution));
  }

  console.log('\nTest 7: posture — grants + STABLE + SECURITY DEFINER loaded from the real file');
  {
    const sig = 'public.select_template(text,text,text,text,text)';
    const sr = (await q(`SELECT has_function_privilege('service_role', '${sig}', 'EXECUTE') AS p`))[0].p;
    const an = (await q(`SELECT has_function_privilege('anon', '${sig}', 'EXECUTE') AS p`))[0].p;
    const au = (await q(`SELECT has_function_privilege('authenticated', '${sig}', 'EXECUTE') AS p`))[0].p;
    check('service_role CAN execute', sr === true, String(sr));
    check('anon CANNOT execute', an === false, String(an));
    check('authenticated CANNOT execute', au === false, String(au));
    const vol = (await q(`SELECT provolatile, prosecdef FROM pg_proc WHERE proname='select_template'`))[0];
    check('STABLE + SECURITY DEFINER', vol.provolatile === 's' && vol.prosecdef === true, JSON.stringify(vol));
    const cfg = (await q(`SELECT proconfig FROM pg_proc WHERE proname='select_template'`))[0].proconfig;
    // proconfig stores the empty path quoted: search_path=""
    check("SET search_path = '' pinned", Array.isArray(cfg)
      && cfg.some(x => ['search_path=', 'search_path=""'].includes(x.replace(/\s/g, ''))), JSON.stringify(cfg));
  }

  console.log('\n======================================================');
  console.log(`RESULT: ${pass} passed, ${fail} failed.`);
  if (fail) { console.log('FAILED:', fails.join(', ')); process.exitCode = 1; }
  console.log('Path used: PGlite (BOTH real migration files — resolve_slot_assets + select_template — executed in WASM Postgres with plpgsql; grants loaded verbatim against fixture roles).');
  await db.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exitCode = 2; });
