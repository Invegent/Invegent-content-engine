// option-d-validation.mjs
// =====================================================================
// PGlite (offline, no prod) SHAPE-PROOF for the Option D TMR-live B1
// slice (image-worker v3.22.0): proves that the REAL public.select_template
// SQL produces a response carrying EVERY field consumed by
// buildTmrRenderPlan (supabase/functions/image-worker/b1_production.ts)
// with the expected type/shape:
//   status 'ok' · selected.provider_template_name (winner) ·
//   selected.provider_template_id · selected.template_id ·
//   selected.assignment_id · selected.variant_key ·
//   slot_resolution.status 'ok' ·
//   slot_resolution.modifications['Background.source'/'Logo.source'] strings ·
//   slot_resolution.modifications['Scrim.opacity'] NUMERIC 48 (resolver v1.1) ·
//   slot_resolution.selected[] {slot, asset_key, reasons[]} ·
//   slot_resolution.warnings[] · context.seed echo.
//
// Modeled on docs/briefs/template-selection-v0-lane-c-validation.mjs
// (same scaffolding: real migration files loaded verbatim into PGlite —
// WASM Postgres with plpgsql — against a minimal `c` fixture).
// Loads BOTH real migration files:
//   1. supabase/migrations/20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql
//      (resolve_slot_assets v1.1 — scrim 48; CREATE OR REPLACE, self-contained)
//   2. supabase/migrations/20260703035154_create_select_template_v1.sql
//
// Fixture mirrors the LIVE winner truth for ('property-pulse','facebook',
// 'image_quote'): winner generic_market_insight_card_1x1_v1 (provider
// 48cba556-0a53-4001-90f0-05420d10efc0), plus a later quote_card survivor
// to prove ranking/registry-order, plus a needs_scrim background so
// Scrim.opacity=48 is exercised.
//
// Run:  node docs/briefs/option-d-validation.mjs
//   (requires @electric-sql/pglite; installed dev-only OUTSIDE the repo,
//    NOT committed. RESOLVE_SQL_PATH / SELECT_SQL_PATH env overrides let
//    the test run from a dir where PGlite is installed; defaults =
//    repo-relative locations.)
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOLVE_SQL = process.env.RESOLVE_SQL_PATH || join(
  __dirname, '..', '..',
  'supabase', 'migrations', '20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql');
const SELECT_SQL = process.env.SELECT_SQL_PATH || join(
  __dirname, '..', '..',
  'supabase', 'migrations', '20260703035154_create_select_template_v1.sql');

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(name); console.log(`  FAIL  ${name}  ${detail}`); }
}

const db = new PGlite();
async function q(text, params) { return (await db.query(text, params)).rows; }

// ── fixture ids ────────────────────────────────────────────────────────
const PP = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'; // live PP client_id
const T_MI = '11111111-1111-1111-1111-111111111101'; // market_insight — EXPECTED WINNER (earliest strong)
const T_QC = '11111111-1111-1111-1111-111111111102'; // quote_card — later strong survivor (alternative)
const A_MI = 'aaaaaaaa-1111-1111-1111-111111111101';
const A_QC = 'aaaaaaaa-1111-1111-1111-111111111102';
const WINNER_PROVIDER_ID = '48cba556-0a53-4001-90f0-05420d10efc0'; // live provider_template_id

async function sel(slug, platform, format, intent = null, seed = null) {
  const rows = await q(
    'SELECT public.select_template($1,$2,$3,$4,$5) AS r',
    [slug, platform, format, intent, seed]);
  return rows[0].r;
}

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

  console.log('Loading REAL migration SQL #1 (resolve_slot_assets v1.1 scrim48 — dependency) into PGlite...');
  await db.exec(readFileSync(RESOLVE_SQL, 'utf8'));
  console.log('Loading REAL migration SQL #2 (select_template — composed selector) into PGlite...');
  await db.exec(readFileSync(SELECT_SQL, 'utf8'));

  // ── client + governed assets: 1 needs_scrim background (Scrim.opacity=48 path) + 1 logo
  await db.exec(`
    INSERT INTO c.client(client_id, client_slug, status) VALUES
      ('${PP}', 'property-pulse', 'active');

    INSERT INTO c.client_brand_asset(asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, created_at) VALUES
      ('aaaaaaaa-0000-0000-0000-000000000001', '${PP}', 'other', 'Perth CBD bg',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg',
       '{"asset_key":"bg_perth_cbd","usage":"background","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"licence_free","safe_for_text_overlay":"needs_scrim"}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('aaaaaaaa-0000-0000-0000-000000000004', '${PP}', 'logo_primary', 'PP primary logo',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png',
       '{"asset_key":"pp_logo_primary","usage":"logo","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"brand_owned_or_pk_authorised"}',
       NULL, true, '2026-06-04T00:00:00Z');
  `);

  // ── registry: winner (market_insight, earliest strong) + later quote_card survivor ──
  await db.exec(`
    INSERT INTO c.creative_provider_template(id, provider, provider_template_id, provider_template_name, scope, aspect_ratio, status, created_at) VALUES
      ('${T_MI}', 'creatomate', '${WINNER_PROVIDER_ID}',                    'generic_market_insight_card_1x1_v1', 'generic', '1:1', 'visually_approved', '2026-06-02T00:00:00Z'),
      ('${T_QC}', 'creatomate', '99999999-9999-4999-8999-999999999999',     'generic_quote_card_1x1_v1',          'generic', '1:1', 'visually_approved', '2026-06-03T00:00:00Z');

    INSERT INTO c.creative_template_variant_candidate(template_id, format_key, variant_key, fit_status) VALUES
      ('${T_MI}', 'image_quote', 'market_insight.v1', 'strong_candidate'),
      ('${T_QC}', 'image_quote', 'quote_card.v1',     'strong_candidate');

    INSERT INTO c.creative_template_platform_suitability(template_id, platform, suitability_status) VALUES
      ('${T_MI}', 'facebook', 'candidate'),
      ('${T_QC}', 'facebook', 'candidate');

    -- winner field schema: Background + Logo + static Scrim (accepts opacity) + text fields
    INSERT INTO c.creative_provider_template_field(template_id, element_name, element_type, dynamic, field_kind, required_for_render) VALUES
      ('${T_MI}', 'Background',    'image', true,  'background', true),
      ('${T_MI}', 'Logo',          'image', true,  'logo',       false),
      ('${T_MI}', 'Scrim',         'shape', false, 'shape',      false),
      ('${T_MI}', 'CategoryBadge', 'text',  true,  'text',       false),
      ('${T_MI}', 'Headline',      'text',  true,  'text',       true),
      ('${T_MI}', 'Subtitle',      'text',  true,  'text',       false),
      ('${T_MI}', 'Location',      'text',  true,  'text',       false),
      ('${T_MI}', 'Date',          'text',  true,  'text',       false),
      ('${T_MI}', 'Footer',        'text',  true,  'text',       false),
      ('${T_QC}', 'Background',    'image', true,  'background', true),
      ('${T_QC}', 'Logo',          'image', true,  'logo',       false),
      ('${T_QC}', 'Scrim',         'shape', false, 'shape',      false);

    INSERT INTO c.creative_template_client_assignment(id, template_id, client_id, assignment_scope, assignment_status, approved_by, approved_at) VALUES
      ('${A_MI}', '${T_MI}', '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z'),
      ('${A_QC}', '${T_QC}', '${PP}', 'generic_allowed', 'visually_approved', 'PK', '2026-06-20T00:00:00Z');

    INSERT INTO c.creative_template_proof_event(template_id, assignment_id, proof_type, proof_status, evidence_reference, occurred_at) VALUES
      ('${T_MI}', '${A_MI}', 'visual_approval', 'passed', 'render:smoke:mi', '2026-06-21T00:00:00Z'),
      ('${T_QC}', '${A_QC}', 'visual_approval', 'passed', 'render:smoke:qc', '2026-06-21T01:00:00Z');
  `);

  // =====================================================================
  const SEED = 'edf01c52-0000-4000-8000-000000000000'; // post_draft_id-shaped seed
  console.log('\nTest 1: winner + every field buildTmrRenderPlan consumes exists with the expected type/shape');
  const r = await sel('property-pulse', 'facebook', 'image_quote', null, SEED);
  {
    check("top-level keys exact {status,context,rejected,selected,warnings,fail_reason,alternatives,slot_resolution}",
      JSON.stringify(Object.keys(r).sort()) === JSON.stringify(
        ['alternatives','context','fail_reason','rejected','selected','slot_resolution','status','warnings']),
      JSON.stringify(Object.keys(r)));
    check("status === 'ok' (string)", r.status === 'ok', JSON.stringify(r.status));
    const s = r.selected;
    check('selected.provider_template_name === generic_market_insight_card_1x1_v1 (D1 map key)',
      s && s.provider_template_name === 'generic_market_insight_card_1x1_v1', JSON.stringify(s));
    check(`selected.provider_template_id === ${WINNER_PROVIDER_ID} (string)`,
      typeof s.provider_template_id === 'string' && s.provider_template_id === WINNER_PROVIDER_ID, JSON.stringify(s.provider_template_id));
    check('selected.template_id is a uuid string (registry identity for tmrEvidence)',
      typeof s.template_id === 'string' && /^[0-9a-f-]{36}$/.test(s.template_id), JSON.stringify(s.template_id));
    check('selected.assignment_id is a uuid string', typeof s.assignment_id === 'string' && /^[0-9a-f-]{36}$/.test(s.assignment_id), JSON.stringify(s.assignment_id));
    check('selected.variant_key === market_insight.v1 (string)', s.variant_key === 'market_insight.v1', JSON.stringify(s.variant_key));
    check('selected.format_key / aspect_ratio / assignment_status present (render_spec.template fields)',
      s.format_key === 'image_quote' && s.aspect_ratio === '1:1' && s.assignment_status === 'visually_approved', JSON.stringify(s));
    check('selected.reasons is a non-empty array', Array.isArray(s.reasons) && s.reasons.length >= 6, JSON.stringify(s.reasons));
    check('selected.proof.visual_approval === passed', s.proof && s.proof.visual_approval === 'passed', JSON.stringify(s.proof));
  }

  console.log('\nTest 2: slot_resolution — the fields the render plan + governed reachability guard consume');
  {
    const sr = r.slot_resolution;
    check("slot_resolution.status === 'ok'", sr && sr.status === 'ok', JSON.stringify(sr && sr.status));
    const m = sr.modifications;
    check('modifications key set exact {Background.source, Logo.source, Scrim.opacity}',
      JSON.stringify(Object.keys(m).sort()) === JSON.stringify(['Background.source', 'Logo.source', 'Scrim.opacity']),
      JSON.stringify(Object.keys(m)));
    check('Background.source is a non-empty https string', typeof m['Background.source'] === 'string' && m['Background.source'].startsWith('https://'), JSON.stringify(m['Background.source']));
    check('Logo.source is a non-empty https string', typeof m['Logo.source'] === 'string' && m['Logo.source'].startsWith('https://'), JSON.stringify(m['Logo.source']));
    check('Scrim.opacity is NUMERIC 48 (resolver v1.1 needs_scrim class, jsonb number)',
      typeof m['Scrim.opacity'] === 'number' && m['Scrim.opacity'] === 48,
      `${typeof m['Scrim.opacity']} ${JSON.stringify(m['Scrim.opacity'])}`);
    check('slot_resolution.selected[] carries {slot, asset_key, asset_id, asset_url, reasons[]} per slot',
      Array.isArray(sr.selected) && sr.selected.length === 2
      && sr.selected.every(e => typeof e.slot === 'string' && typeof e.asset_key === 'string'
        && typeof e.asset_id === 'string' && typeof e.asset_url === 'string' && Array.isArray(e.reasons)),
      JSON.stringify(sr.selected));
    check('slot order Background then Logo; asset_keys [bg_perth_cbd, pp_logo_primary]',
      sr.selected[0].slot === 'Background' && sr.selected[0].asset_key === 'bg_perth_cbd'
      && sr.selected[1].slot === 'Logo' && sr.selected[1].asset_key === 'pp_logo_primary',
      JSON.stringify(sr.selected.map(e => [e.slot, e.asset_key])));
    check('slot_resolution.warnings is an array', Array.isArray(sr.warnings), JSON.stringify(sr.warnings));
    check('top-level warnings is an array (platform_suitability_unproven expected — candidate rows)',
      Array.isArray(r.warnings) && r.warnings.includes('platform_suitability_unproven'), JSON.stringify(r.warnings));
    check('context.seed echoes p_seed (tmrEvidence.seed source)', r.context && r.context.seed === SEED, JSON.stringify(r.context && r.context.seed));
    check('fail_reason null on ok', r.fail_reason === null, JSON.stringify(r.fail_reason));
  }

  console.log('\nTest 3: winner does NOT depend on the seed (template stable across seeds)');
  {
    const r2 = await sel('property-pulse', 'facebook', 'image_quote', null, 'a-completely-different-seed');
    const r3 = await sel('property-pulse', 'facebook', 'image_quote', null, null);
    check('same winner across two other seeds (incl. null)',
      r2.selected.provider_template_name === 'generic_market_insight_card_1x1_v1'
      && r3.selected.provider_template_name === 'generic_market_insight_card_1x1_v1',
      JSON.stringify([r2.selected.provider_template_name, r3.selected.provider_template_name]));
    check('quote_card is the ranked alternative (registry-order tiebreak)',
      r.alternatives.length === 1 && r.alternatives[0].provider_template_name === 'generic_quote_card_1x1_v1',
      JSON.stringify(r.alternatives));
  }

  console.log('\nTest 4: fail-closed shape the worker must throw on (no selectable template)');
  {
    // a client with assignments-only truth doesn't exist here; drop the proofs' client instead:
    const rf = await sel('property-pulse', 'facebook', 'no_such_format');
    check("format_unmapped fail_closed: status/fail_reason strings, selected+slot_resolution null",
      rf.status === 'fail_closed' && rf.fail_reason === 'format_unmapped'
      && rf.selected === null && rf.slot_resolution === null,
      JSON.stringify({ s: rf.status, f: rf.fail_reason }));
  }

  console.log('\n=== CAPTURED SELECTOR RESPONSE (trimmed fixture for the deno tests / report) ===');
  const trimmed = {
    status: r.status,
    selected: {
      assignment_id: r.selected.assignment_id, template_id: r.selected.template_id,
      provider_template_id: r.selected.provider_template_id,
      provider_template_name: r.selected.provider_template_name,
      variant_key: r.selected.variant_key, format_key: r.selected.format_key,
      aspect_ratio: r.selected.aspect_ratio, assignment_status: r.selected.assignment_status,
      reasons: r.selected.reasons,
    },
    slot_resolution: {
      status: r.slot_resolution.status,
      modifications: r.slot_resolution.modifications,
      selected: r.slot_resolution.selected.map(e => ({ slot: e.slot, asset_key: e.asset_key, reasons: e.reasons })),
      warnings: r.slot_resolution.warnings,
    },
    warnings: r.warnings,
    fail_reason: r.fail_reason,
    context: { seed: r.context.seed, platform: r.context.platform, format: r.context.format },
  };
  console.log(JSON.stringify(trimmed, null, 2));

  console.log('\n======================================================');
  console.log(`RESULT: ${pass} passed, ${fail} failed.`);
  if (fail) { console.log('FAILED:', fails.join(', ')); process.exitCode = 1; }
  console.log('Path used: PGlite (BOTH real migration files — resolve_slot_assets v1.1 + select_template — executed in WASM Postgres with plpgsql).');
  await db.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exitCode = 2; });
