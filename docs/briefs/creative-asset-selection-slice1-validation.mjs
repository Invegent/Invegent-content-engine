// creative-asset-selection-slice1-validation.mjs
// =====================================================================
// PGlite (offline, no prod) validation for Creative Asset Selection
// Slice-1: public.resolve_slot_assets (read-only slot-resolver RPC).
//
// Loads the ENTIRE migration file
//   supabase/migrations/20260704090000_update_resolve_slot_assets_v1_1_scrim48.sql
// (v1.1 scrim recalibration: needs_scrim default 48 PK-calibrated +
// governed per-asset asset_meta scrim_opacity_override; function +
// REVOKE/GRANT posture — roles are created in the fixture so the real
// artifact loads verbatim) into PGlite (WASM Postgres with plpgsql),
// builds a minimal `c` schema fixture mirroring live PP, and runs the
// brief's required cases. This is the ACTUAL SQL — not a mirror.
//
// Run:  node docs/briefs/creative-asset-selection-slice1-validation.mjs
//   (requires @electric-sql/pglite; installed dev-only OUTSIDE the repo,
//    NOT committed. MIGRATION_SQL_PATH env override lets the test run
//    from a dir where PGlite is installed (ESM ignores NODE_PATH);
//    default = repo-relative location.)
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION = process.env.MIGRATION_SQL_PATH || join(
  __dirname, '..', '..',
  'supabase', 'migrations', '20260704090000_update_resolve_slot_assets_v1_1_scrim48.sql'
);

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(name); console.log(`  FAIL  ${name}  ${detail}`); }
}

// FNV-1a 32-bit over UTF-8 bytes — MUST match the plpgsql implementation
// (hash=2166136261; per byte: xor, then *16777619 mod 2^32).
function fnv1a32(s) {
  const bytes = Buffer.from(s, 'utf8');
  let h = 0x811c9dc5; // 2166136261
  for (const b of bytes) {
    h = (h ^ b) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0; // 16777619
  }
  return h >>> 0;
}

const db = new PGlite();
async function q(text, params) { return (await db.query(text, params)).rows; }

const PP = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'; // live PP client_id
const NG = '22222222-2222-2222-2222-222222222202'; // no-governed-assets client
const NL = '33333333-3333-3333-3333-333333333303'; // backgrounds-but-no-logo client
// v1.1 scrim_opacity_override clients (single eligible background each => deterministic winner)
const OVA = '44444444-4444-4444-4444-444444444401'; // bg needs_scrim override 70 (number) + logo w/ override (ignored)
const OVB = '44444444-4444-4444-4444-444444444402'; // bg needs_scrim override "150" (string) => clamped 100
const OVC = '44444444-4444-4444-4444-444444444403'; // bg needs_scrim override "abc" => invalid, class constant 48
const OVD = '44444444-4444-4444-4444-444444444404'; // bg 'true'-class no override => 40; logo w/ override (ignored)
const T1 = '11111111-1111-1111-1111-111111111101'; // Background + Logo + Scrim (+text)
const T2 = '11111111-1111-1111-1111-111111111102'; // Logo only (no Background, no Scrim)
const T3 = '11111111-1111-1111-1111-111111111103'; // Background + Logo + FaceObject (no Scrim)
const T_UNKNOWN = '99999999-9999-9999-9999-999999999999';

async function resolve(slug, platform, format, templateId, seed = null) {
  const rows = await q(
    'SELECT public.resolve_slot_assets($1,$2,$3,$4,$5) AS r',
    [slug, platform, format, templateId, seed]);
  return rows[0].r;
}

(async () => {
  console.log('Fixture: roles + minimal c schema (client, client_brand_asset, creative_provider_template[_field])...');
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
      asset_type text,
      asset_name text,
      asset_url text,
      asset_meta jsonb,
      platform_scope text[],
      is_active boolean DEFAULT true,
      notes text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE c.creative_provider_template(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text, provider_template_id text, provider_template_name text, status text
    );
    CREATE TABLE c.creative_provider_template_field(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid,
      element_id text, element_name text, element_type text,
      dynamic boolean, field_kind text, required_for_render boolean
    );
  `);

  console.log('Loading REAL migration SQL (function + grants) into PGlite...');
  await db.exec(readFileSync(MIGRATION, 'utf8'));

  // ── templates ────────────────────────────────────────────────────────
  await db.exec(`
    INSERT INTO c.creative_provider_template(id, provider, provider_template_id, provider_template_name, status) VALUES
      ('${T1}', 'creatomate', 'tpl-1x1-card',   'generic 1:1 card',        'smoke_rendered'),
      ('${T2}', 'creatomate', 'tpl-logo-only',  'generic logo-only',       'smoke_rendered'),
      ('${T3}', 'creatomate', 'tpl-face-thumb', 'generic 16:9 thumbnail',  'smoke_rendered');

    INSERT INTO c.creative_provider_template_field(template_id, element_name, element_type, dynamic, field_kind, required_for_render) VALUES
      ('${T1}', 'Background', 'image', true,  'background', true),
      ('${T1}', 'Logo',       'image', true,  'logo',       false),
      ('${T1}', 'Scrim',      'shape', false, 'shape',      false),
      ('${T1}', 'Headline',   'text',  true,  'text',       true),
      ('${T2}', 'Logo',       'image', true,  'logo',       false),
      ('${T2}', 'Headline',   'text',  true,  'text',       true),
      ('${T3}', 'Background', 'image', true,  'background', true),
      ('${T3}', 'Logo',       'image', true,  'logo',       false),
      ('${T3}', 'FaceObject', 'image', true,  'image',      false);
  `);

  // ── clients ──────────────────────────────────────────────────────────
  await db.exec(`
    INSERT INTO c.client(client_id, client_slug, status) VALUES
      ('${PP}', 'property-pulse',     'active'),
      ('${NG}', 'no-governed-client', 'active'),
      ('${NL}', 'no-logo-client',     'active'),
      ('${OVA}', 'ov-a-client',       'active'),
      ('${OVB}', 'ov-b-client',       'active'),
      ('${OVC}', 'ov-c-client',       'active'),
      ('${OVD}', 'ov-d-client',       'active');
  `);

  // ── PP assets — mirrors live v4.75 governed shape (asset_meta jsonb keys) ──
  // 3 governed backgrounds (2 needs_scrim + 1 true), 1 governed logo, plus
  // one specimen per rejection code (each also tests FIRST-failing-filter order).
  await db.exec(`
    INSERT INTO c.client_brand_asset(asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, created_at) VALUES
      -- eligible backgrounds (ranked: kirribilli 'true' first, then sydney, brisbane by created_at)
      ('aaaaaaaa-0000-0000-0000-000000000001', '${PP}', 'other', 'Sydney CBD bg',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Backgrounds/Sydney.jpg',
       '{"asset_key":"bg_sydney_cbd","usage":"background","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"licence_free","safe_for_text_overlay":"needs_scrim"}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('aaaaaaaa-0000-0000-0000-000000000002', '${PP}', 'other', 'Brisbane CBD bg',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Backgrounds/Brisbane.jpg',
       '{"asset_key":"bg_brisbane_cbd","usage":"background","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"licence_free","safe_for_text_overlay":"needs_scrim"}',
       NULL, true, '2026-06-02T00:00:00Z'),
      ('aaaaaaaa-0000-0000-0000-000000000003', '${PP}', 'other', 'Kirribilli bg (text-safe)',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Backgrounds/Kirribilli.jpg',
       '{"asset_key":"bg_kirribilli","usage":"background","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"licence_free","safe_for_text_overlay":"true"}',
       NULL, true, '2026-06-03T00:00:00Z'),
      -- governed logo
      ('aaaaaaaa-0000-0000-0000-000000000004', '${PP}', 'logo_primary', 'PP primary logo',
       'https://x.supabase.co/storage/v1/object/public/brand-assets/PP/Logos/PP_logo_2.png',
       '{"asset_key":"pp_logo_primary","usage":"logo","bucket":"brand-assets","approved":true,"approval_status":"governed","license_type":"brand_owned_or_pk_authorised"}',
       NULL, true, '2026-06-04T00:00:00Z'),
      -- rejection specimens (one per reason_code; order-of-filters checks noted)
      ('aaaaaaaa-0000-0000-0000-000000000005', '${PP}', 'other', 'no-license bg',
       'https://x.supabase.co/storage/bg5.jpg',
       '{"asset_key":"bg_nolicense","usage":"background","bucket":"brand-assets","approved":true,"safe_for_text_overlay":"false"}',
       NULL, true, '2026-06-05T00:00:00Z'),                                -- license before text-safety => license_missing
      ('aaaaaaaa-0000-0000-0000-000000000006', '${PP}', 'other', 'render-output bg',
       'https://x.supabase.co/storage/render-outputs/out.jpg',
       '{"asset_key":"bg_renderoutput","usage":"background","bucket":"render-outputs","approved":true,"license_type":"licence_free","safe_for_text_overlay":"true"}',
       NULL, true, '2026-06-06T00:00:00Z'),                                -- output_as_input_risk
      ('aaaaaaaa-0000-0000-0000-000000000007', '${PP}', 'other', 'text-unsafe bg',
       'https://x.supabase.co/storage/bg7.jpg',
       '{"asset_key":"bg_textunsafe","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","safe_for_text_overlay":"false"}',
       NULL, true, '2026-06-07T00:00:00Z'),                                -- not_text_safe
      ('aaaaaaaa-0000-0000-0000-000000000008', '${PP}', 'other', 'sfto-missing bg',
       'https://x.supabase.co/storage/bg8.jpg',
       '{"asset_key":"bg_sfto_missing","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free"}',
       NULL, true, '2026-06-08T00:00:00Z'),                                -- text_safety_unknown
      ('aaaaaaaa-0000-0000-0000-000000000009', '${PP}', 'other', 'expired-license bg',
       'https://x.supabase.co/storage/bg9.jpg',
       '{"asset_key":"bg_expired","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","license_expires_at":"2025-01-01T00:00:00Z","safe_for_text_overlay":"true"}',
       NULL, true, '2026-06-09T00:00:00Z'),                                -- license_expired
      ('aaaaaaaa-0000-0000-0000-000000000010', '${PP}', 'other', 'instagram-only bg',
       'https://x.supabase.co/storage/bg10.jpg',
       '{"asset_key":"bg_instagram_only","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","safe_for_text_overlay":"true"}',
       '{instagram}', true, '2026-06-10T00:00:00Z'),                       -- platform_excluded (for facebook)
      ('aaaaaaaa-0000-0000-0000-000000000011', '${PP}', 'other', 'inactive bg',
       'https://x.supabase.co/storage/bg11.jpg',
       '{"asset_key":"bg_inactive","usage":"background","bucket":"brand-assets","approved":false,"license_type":"licence_free","safe_for_text_overlay":"true"}',
       NULL, false, '2026-06-11T00:00:00Z'),                               -- inactive wins over not_approved (order)
      ('aaaaaaaa-0000-0000-0000-000000000012', '${PP}', 'other', 'not-approved bg',
       'https://x.supabase.co/storage/bg12.jpg',
       '{"asset_key":"bg_notapproved","usage":"background","bucket":"brand-assets","approved":false,"safe_for_text_overlay":"true"}',
       NULL, true, '2026-06-12T00:00:00Z');                                -- not_approved wins over license_missing (order)

    -- ungoverned client: 2 backgrounds, both rejectable, no logo
    INSERT INTO c.client_brand_asset(asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, created_at) VALUES
      ('bbbbbbbb-0000-0000-0000-000000000001', '${NG}', 'other', 'ng bg 1',
       'https://x.supabase.co/storage/ng1.jpg',
       '{"asset_key":"ng_bg_notapproved","usage":"background","bucket":"brand-assets","approved":false,"license_type":"licence_free","safe_for_text_overlay":"true"}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('bbbbbbbb-0000-0000-0000-000000000002', '${NG}', 'other', 'ng bg 2',
       'https://x.supabase.co/storage/ng2.jpg',
       '{"asset_key":"ng_bg_nolicense","usage":"background","bucket":"brand-assets","approved":true,"safe_for_text_overlay":"true"}',
       NULL, true, '2026-06-02T00:00:00Z');

    -- backgrounds-but-no-logo client
    INSERT INTO c.client_brand_asset(asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, created_at) VALUES
      ('cccccccc-0000-0000-0000-000000000001', '${NL}', 'other', 'nl bg',
       'https://x.supabase.co/storage/nl1.jpg',
       '{"asset_key":"nl_bg","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","safe_for_text_overlay":"needs_scrim"}',
       NULL, true, '2026-06-01T00:00:00Z');

    -- v1.1 scrim_opacity_override clients (each: exactly ONE eligible background => deterministic pick)
    INSERT INTO c.client_brand_asset(asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, created_at) VALUES
      -- OVA: busy background, PK-set override 70 (JSON NUMBER); logo also carries an override (must be ignored)
      ('dddddddd-0000-0000-0000-000000000001', '${OVA}', 'other', 'ova busy bg',
       'https://x.supabase.co/storage/ova-bg.jpg',
       '{"asset_key":"ova_bg_busy","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","safe_for_text_overlay":"needs_scrim","scrim_opacity_override":70}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('dddddddd-0000-0000-0000-000000000002', '${OVA}', 'logo_primary', 'ova logo (override must be ignored)',
       'https://x.supabase.co/storage/ova-logo.png',
       '{"asset_key":"ova_logo","usage":"logo","bucket":"brand-assets","approved":true,"license_type":"brand_owned_or_pk_authorised","scrim_opacity_override":5}',
       NULL, true, '2026-06-02T00:00:00Z'),
      -- OVB: override "150" (STRING) — must clamp to 100
      ('dddddddd-0000-0000-0000-000000000003', '${OVB}', 'other', 'ovb bg override 150',
       'https://x.supabase.co/storage/ovb-bg.jpg',
       '{"asset_key":"ovb_bg","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","safe_for_text_overlay":"needs_scrim","scrim_opacity_override":"150"}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('dddddddd-0000-0000-0000-000000000004', '${OVB}', 'logo_primary', 'ovb logo',
       'https://x.supabase.co/storage/ovb-logo.png',
       '{"asset_key":"ovb_logo","usage":"logo","bucket":"brand-assets","approved":true,"license_type":"brand_owned_or_pk_authorised"}',
       NULL, true, '2026-06-02T00:00:00Z'),
      -- OVC: override "abc" (NON-NUMERIC) — ignored, warning scrim_override_invalid, class constant 48
      ('dddddddd-0000-0000-0000-000000000005', '${OVC}', 'other', 'ovc bg override abc',
       'https://x.supabase.co/storage/ovc-bg.jpg',
       '{"asset_key":"ovc_bg","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","safe_for_text_overlay":"needs_scrim","scrim_opacity_override":"abc"}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('dddddddd-0000-0000-0000-000000000006', '${OVC}', 'logo_primary', 'ovc logo',
       'https://x.supabase.co/storage/ovc-logo.png',
       '{"asset_key":"ovc_logo","usage":"logo","bucket":"brand-assets","approved":true,"license_type":"brand_owned_or_pk_authorised"}',
       NULL, true, '2026-06-02T00:00:00Z'),
      -- OVD: 'true'-class background, NO override => 40; logo carries an override (must be ignored)
      ('dddddddd-0000-0000-0000-000000000007', '${OVD}', 'other', 'ovd text-safe bg',
       'https://x.supabase.co/storage/ovd-bg.jpg',
       '{"asset_key":"ovd_bg","usage":"background","bucket":"brand-assets","approved":true,"license_type":"licence_free","safe_for_text_overlay":"true"}',
       NULL, true, '2026-06-01T00:00:00Z'),
      ('dddddddd-0000-0000-0000-000000000008', '${OVD}', 'logo_primary', 'ovd logo (override must be ignored)',
       'https://x.supabase.co/storage/ovd-logo.png',
       '{"asset_key":"ovd_logo","usage":"logo","bucket":"brand-assets","approved":true,"license_type":"brand_owned_or_pk_authorised","scrim_opacity_override":90}',
       NULL, true, '2026-06-02T00:00:00Z');
  `);

  // Ranked eligible PP backgrounds (must match the RPC's rank rule):
  // text-safe 'true' first, then 'needs_scrim'; tiebreak created_at ASC, asset_id ASC.
  const RANKED = ['bg_kirribilli', 'bg_sydney_cbd', 'bg_brisbane_cbd'];
  const bgKeyOf = (res) => (res.selected.find(s => s.slot === 'Background') || {}).asset_key;

  // =====================================================================
  console.log('\nTest 1: PP happy path (Background+Logo+Scrim) — needs_scrim pick => Scrim.opacity 48 (v1.1 PK-calibrated)');
  {
    // probe seeds until FNV-1a picks a needs_scrim background (index 1 or 2)
    let seed = null;
    for (let i = 0; i < 64; i++) {
      if (fnv1a32(`seed-${i}`) % 3 !== 0) { seed = `seed-${i}`; break; }
    }
    check('found a probe seed mapping to a needs_scrim background', seed !== null);
    const res = await resolve('property-pulse', 'facebook', 'image_quote', T1, seed);
    check('status ok', res.status === 'ok', JSON.stringify(res));
    check('Background.source present', typeof res.modifications['Background.source'] === 'string', JSON.stringify(res.modifications));
    check('Logo.source present', typeof res.modifications['Logo.source'] === 'string', JSON.stringify(res.modifications));
    check('Scrim.opacity == 48 for needs_scrim pick (v1.1)', Number(res.modifications['Scrim.opacity']) === 48, JSON.stringify(res.modifications));
    check('picked background matches JS FNV-1a expectation',
      bgKeyOf(res) === RANKED[fnv1a32(seed) % 3], `${bgKeyOf(res)} vs ${RANKED[fnv1a32(seed) % 3]}`);
    const bgSel = res.selected.find(s => s.slot === 'Background');
    const logoSel = res.selected.find(s => s.slot === 'Logo');
    check('Background reasons = governed/license_ok/text_safe_needs_scrim/client_match',
      JSON.stringify(bgSel.reasons) === JSON.stringify(['governed','license_ok','text_safe_needs_scrim','client_match']),
      JSON.stringify(bgSel.reasons));
    check('Logo selected with reasons incl governed+license_ok+client_match',
      logoSel && logoSel.asset_key === 'pp_logo_primary'
      && ['governed','license_ok','client_match'].every(x => logoSel.reasons.includes(x)),
      JSON.stringify(logoSel));
    check('selected entries carry asset_id + asset_url',
      res.selected.every(s => s.asset_id && s.asset_url), JSON.stringify(res.selected));
    check('fail_reason null', res.fail_reason === null, JSON.stringify(res.fail_reason));
    check('context echoes format with format_used=false',
      res.context.format === 'image_quote' && res.context.format_used === false, JSON.stringify(res.context));
  }

  console.log('\nTest 2: Ranking — no seed picks the text-safe TRUE background, Scrim.opacity 40');
  let resNoSeed;
  {
    resNoSeed = await resolve('property-pulse', 'facebook', 'image_quote', T1, null);
    check('status ok', resNoSeed.status === 'ok');
    check("top pick is the 'true' background (bg_kirribilli)", bgKeyOf(resNoSeed) === 'bg_kirribilli', bgKeyOf(resNoSeed));
    check("Scrim.opacity == 40 for 'true' pick", Number(resNoSeed.modifications['Scrim.opacity']) === 40, JSON.stringify(resNoSeed.modifications));
    const bgSel = resNoSeed.selected.find(s => s.slot === 'Background');
    check('reasons say text_safe_true', bgSel.reasons.includes('text_safe_true'), JSON.stringify(bgSel.reasons));
  }

  console.log('\nTest 3: Seed determinism + rotation (SQL FNV-1a == JS FNV-1a)');
  {
    const picks = new Set();
    let allMatch = true, allStable = true;
    for (let i = 0; i < 10; i++) {
      const seed = `post-draft-${i}`;
      const a = await resolve('property-pulse', 'facebook', 'image_quote', T1, seed);
      const b = await resolve('property-pulse', 'facebook', 'image_quote', T1, seed);
      if (bgKeyOf(a) !== bgKeyOf(b)) allStable = false;
      if (bgKeyOf(a) !== RANKED[fnv1a32(seed) % 3]) allMatch = false;
      picks.add(bgKeyOf(a));
    }
    check('same seed twice -> same pick (10 seeds)', allStable);
    check('every pick equals ranked[fnv1a32(seed) % 3] (exact SQL<->JS hash parity)', allMatch);
    check('>=2 distinct picks across probed seeds', picks.size >= 2, [...picks].join(','));
    check('all picks drawn from the 3 eligible backgrounds', [...picks].every(k => RANKED.includes(k)), [...picks].join(','));
  }

  console.log('\nTest 4: Ungoverned client -> fail_closed no_governed_background with per-asset reason codes');
  {
    const res = await resolve('no-governed-client', 'facebook', 'image_quote', T1, null);
    check('fail_closed', res.status === 'fail_closed', JSON.stringify(res));
    check("fail_reason no_governed_background", res.fail_reason === 'no_governed_background', res.fail_reason);
    const rc = Object.fromEntries(res.rejected.map(x => [x.asset_key, x.reason_code]));
    check('ng_bg_notapproved -> not_approved', rc.ng_bg_notapproved === 'not_approved', JSON.stringify(rc));
    check('ng_bg_nolicense -> license_missing', rc.ng_bg_nolicense === 'license_missing', JSON.stringify(rc));
    check('modifications empty on fail_closed', JSON.stringify(res.modifications) === '{}', JSON.stringify(res.modifications));
    check('every rejected entry carries slot+asset_key+reason_code',
      res.rejected.every(x => x.slot && x.asset_key && x.reason_code), JSON.stringify(res.rejected));
  }

  console.log('\nTest 5: Backgrounds but no logo -> fail_closed missing_required_logo (no placeholder)');
  {
    const res = await resolve('no-logo-client', 'facebook', 'image_quote', T1, null);
    check('fail_closed', res.status === 'fail_closed', JSON.stringify(res));
    check('fail_reason missing_required_logo', res.fail_reason === 'missing_required_logo', res.fail_reason);
    check('modifications empty (no partial render payload)', JSON.stringify(res.modifications) === '{}', JSON.stringify(res.modifications));
  }

  console.log('\nTest 6: Rejection reason codes each observed (PP call) + first-failing-filter order');
  {
    const rc = Object.fromEntries(resNoSeed.rejected.map(x => [x.asset_key, x.reason_code]));
    check('license_missing observed (beats not_text_safe in order)', rc.bg_nolicense === 'license_missing', JSON.stringify(rc));
    check('output_as_input_risk observed', rc.bg_renderoutput === 'output_as_input_risk', JSON.stringify(rc));
    check('not_text_safe observed', rc.bg_textunsafe === 'not_text_safe', JSON.stringify(rc));
    check('text_safety_unknown observed', rc.bg_sfto_missing === 'text_safety_unknown', JSON.stringify(rc));
    check('license_expired observed', rc.bg_expired === 'license_expired', JSON.stringify(rc));
    check('inactive observed (beats not_approved in order)', rc.bg_inactive === 'inactive', JSON.stringify(rc));
    check('not_approved observed (beats license_missing in order)', rc.bg_notapproved === 'not_approved', JSON.stringify(rc));
    check('exactly the 3 eligible backgrounds survive (8 rejects)', resNoSeed.rejected.length === 8, String(resNoSeed.rejected.length));
  }

  console.log('\nTest 7: platform_scope — NULL passes with warning; excluding scope rejects');
  {
    check("warning platform_scope_unbacked present", resNoSeed.warnings.includes('platform_scope_unbacked'), JSON.stringify(resNoSeed.warnings));
    check('warning added ONCE only',
      resNoSeed.warnings.filter(w => w === 'platform_scope_unbacked').length === 1, JSON.stringify(resNoSeed.warnings));
    const rc = Object.fromEntries(resNoSeed.rejected.map(x => [x.asset_key, x.reason_code]));
    check("platform_scope {instagram} vs facebook -> platform_excluded", rc.bg_instagram_only === 'platform_excluded', JSON.stringify(rc));
  }

  console.log('\nTest 8: Logo-only template -> ok without Background.source and without Scrim key');
  {
    const res = await resolve('property-pulse', 'facebook', 'image_quote', T2, null);
    check('status ok', res.status === 'ok', JSON.stringify(res));
    check('Logo.source present', typeof res.modifications['Logo.source'] === 'string', JSON.stringify(res.modifications));
    check('no Background.source key', !('Background.source' in res.modifications), JSON.stringify(res.modifications));
    check('no Scrim.opacity key', !('Scrim.opacity' in res.modifications), JSON.stringify(res.modifications));
    check('selected slots == [Logo]',
      res.selected.length === 1 && res.selected[0].slot === 'Logo', JSON.stringify(res.selected.map(s => s.slot)));
  }

  console.log('\nTest 9: Unknown template / unknown client -> fail_closed');
  {
    const rt = await resolve('property-pulse', 'facebook', 'image_quote', T_UNKNOWN, null);
    check('unknown template -> template_not_found', rt.status === 'fail_closed' && rt.fail_reason === 'template_not_found', JSON.stringify(rt));
    const rcl = await resolve('ghost-client', 'facebook', 'image_quote', T1, null);
    check('unknown client -> client_not_found', rcl.status === 'fail_closed' && rcl.fail_reason === 'client_not_found', JSON.stringify(rcl));
  }

  console.log('\nTest 10: p_seed NULL -> deterministic top pick (repeatable)');
  {
    const a = await resolve('property-pulse', 'facebook', 'image_quote', T1, null);
    const b = await resolve('property-pulse', 'facebook', 'image_quote', T1, null);
    check('two null-seed calls byte-identical', JSON.stringify(a) === JSON.stringify(b));
    check('null-seed pick == rank #1 (bg_kirribilli)', bgKeyOf(a) === 'bg_kirribilli', bgKeyOf(a));
  }

  console.log('\nTest 11 (extra): FaceObject template -> optional_slot_unfilled warning, never fails; no Scrim key without Scrim element');
  {
    const res = await resolve('property-pulse', 'facebook', 'image_quote', T3, null);
    check('status ok (optional image slot never fails)', res.status === 'ok', JSON.stringify(res));
    check("warning optional_slot_unfilled:FaceObject present",
      res.warnings.includes('optional_slot_unfilled:FaceObject'), JSON.stringify(res.warnings));
    check('Background.source present', typeof res.modifications['Background.source'] === 'string', JSON.stringify(res.modifications));
    check('no Scrim.opacity key (template has no Scrim element)', !('Scrim.opacity' in res.modifications), JSON.stringify(res.modifications));
  }

  console.log('\nTest 12 (extra): grant posture loaded from the real file');
  {
    const sig = 'public.resolve_slot_assets(text,text,text,uuid,text)';
    const sr = (await q(`SELECT has_function_privilege('service_role', '${sig}', 'EXECUTE') AS p`))[0].p;
    const an = (await q(`SELECT has_function_privilege('anon', '${sig}', 'EXECUTE') AS p`))[0].p;
    const au = (await q(`SELECT has_function_privilege('authenticated', '${sig}', 'EXECUTE') AS p`))[0].p;
    check('service_role CAN execute', sr === true, String(sr));
    check('anon CANNOT execute', an === false, String(an));
    check('authenticated CANNOT execute', au === false, String(au));
    const vol = (await q(`SELECT provolatile, prosecdef FROM pg_proc WHERE proname='resolve_slot_assets'`))[0];
    check('STABLE + SECURITY DEFINER', vol.provolatile === 's' && vol.prosecdef === true, JSON.stringify(vol));
  }

  console.log('\nTest 13: NULL p_platform — fence bypass is PERMISSIVE but VISIBLE (db-rls-auditor find)');
  {
    // (a)+(b) NULL p_platform on the PP happy path: scoped asset (platform_scope={instagram})
    // now PASSES the platform filter; call still ok; visible 'platform_input_missing' warning.
    const res = await resolve('property-pulse', null, 'image_quote', T1, null);
    check('status ok with NULL p_platform', res.status === 'ok', JSON.stringify(res));
    check("warning platform_input_missing present", res.warnings.includes('platform_input_missing'), JSON.stringify(res.warnings));
    check('platform_input_missing emitted ONCE only',
      res.warnings.filter(w => w === 'platform_input_missing').length === 1, JSON.stringify(res.warnings));
    check('scoped asset bg_instagram_only PASSES (not in rejected)',
      !res.rejected.some(x => x.asset_key === 'bg_instagram_only'), JSON.stringify(res.rejected));
    check("no 'platform_excluded' rejection anywhere with NULL p_platform",
      !res.rejected.some(x => x.reason_code === 'platform_excluded'), JSON.stringify(res.rejected));
    check('rejected count drops 8 -> 7 (only the scoped asset moved to eligible)',
      res.rejected.length === 7, String(res.rejected.length));
    check('platform_scope_unbacked warning still present (NULL-scope assets still pass visibly)',
      res.warnings.includes('platform_scope_unbacked'), JSON.stringify(res.warnings));
    check('no-seed top pick unchanged (bg_kirribilli still rank #1)', bgKeyOf(res) === 'bg_kirribilli', bgKeyOf(res));
    check('modifications complete (Background+Logo+Scrim)',
      typeof res.modifications['Background.source'] === 'string'
      && typeof res.modifications['Logo.source'] === 'string'
      && Number(res.modifications['Scrim.opacity']) === 40, JSON.stringify(res.modifications));
    // (c) non-NULL platform behaviour unchanged: facebook call still excludes the scoped
    // asset and does NOT emit platform_input_missing.
    const fb = await resolve('property-pulse', 'facebook', 'image_quote', T1, null);
    const rcFb = Object.fromEntries(fb.rejected.map(x => [x.asset_key, x.reason_code]));
    check('non-NULL platform: bg_instagram_only still platform_excluded',
      rcFb.bg_instagram_only === 'platform_excluded', JSON.stringify(rcFb));
    check('non-NULL platform: no platform_input_missing warning',
      !fb.warnings.includes('platform_input_missing'), JSON.stringify(fb.warnings));
  }

  console.log('\nTest 14 (v1.1): governed per-asset scrim_opacity_override (backgrounds only, fail-safe)');
  {
    // (a) numeric override 70 on the selected background => Scrim.opacity 70 + provenance reason
    const ra = await resolve('ov-a-client', 'facebook', 'image_quote', T1, null);
    check('OVA status ok', ra.status === 'ok', JSON.stringify(ra));
    check('OVA Scrim.opacity == 70 (override used, not class constant 48)',
      Number(ra.modifications['Scrim.opacity']) === 70, JSON.stringify(ra.modifications));
    const raBg = ra.selected.find(s => s.slot === 'Background');
    check("OVA Background reasons include 'scrim_override_applied' (appended after v1 reasons)",
      JSON.stringify(raBg.reasons) === JSON.stringify(
        ['governed','license_ok','text_safe_needs_scrim','client_match','scrim_override_applied']),
      JSON.stringify(raBg.reasons));
    check('OVA no scrim_override_invalid warning (override was valid)',
      !ra.warnings.includes('scrim_override_invalid'), JSON.stringify(ra.warnings));
    // (e) override on the LOGO row is ignored: no provenance reason on Logo, opacity from the bg
    const raLogo = ra.selected.find(s => s.slot === 'Logo');
    check("OVA Logo reasons do NOT include 'scrim_override_applied' (logo override ignored)",
      !raLogo.reasons.includes('scrim_override_applied'), JSON.stringify(raLogo.reasons));
    check('OVA Scrim.opacity is NOT the logo override value 5', Number(ra.modifications['Scrim.opacity']) !== 5,
      JSON.stringify(ra.modifications));

    // (b) override '150' (string) => clamped to 100 via LEAST(GREATEST(x,0),100)
    const rb = await resolve('ov-b-client', 'facebook', 'image_quote', T1, null);
    check('OVB status ok', rb.status === 'ok', JSON.stringify(rb));
    check("OVB Scrim.opacity == 100 (override '150' clamped)",
      Number(rb.modifications['Scrim.opacity']) === 100, JSON.stringify(rb.modifications));
    check('OVB Background reasons include scrim_override_applied (clamped override still applied)',
      rb.selected.find(s => s.slot === 'Background').reasons.includes('scrim_override_applied'),
      JSON.stringify(rb.selected));

    // (c) non-numeric override 'abc' => IGNORED with warning, class constant 48, never fails
    const rc = await resolve('ov-c-client', 'facebook', 'image_quote', T1, null);
    check('OVC status ok (invalid override never fails the resolution)', rc.status === 'ok', JSON.stringify(rc));
    check('OVC Scrim.opacity == 48 (class constant fallback)',
      Number(rc.modifications['Scrim.opacity']) === 48, JSON.stringify(rc.modifications));
    check("OVC warning 'scrim_override_invalid' present ONCE",
      rc.warnings.filter(w => w === 'scrim_override_invalid').length === 1, JSON.stringify(rc.warnings));
    check('OVC Background reasons do NOT include scrim_override_applied',
      !rc.selected.find(s => s.slot === 'Background').reasons.includes('scrim_override_applied'),
      JSON.stringify(rc.selected));

    // (d) 'true'-class background (no bg override) => 40 unchanged; logo override 90 ignored
    const rd = await resolve('ov-d-client', 'facebook', 'image_quote', T1, null);
    check('OVD status ok', rd.status === 'ok', JSON.stringify(rd));
    check("OVD Scrim.opacity == 40 ('true'-class constant unchanged; logo override 90 ignored)",
      Number(rd.modifications['Scrim.opacity']) === 40, JSON.stringify(rd.modifications));
    check('OVD no scrim_override_applied reason anywhere (only backgrounds consult the key)',
      rd.selected.every(s => !s.reasons.includes('scrim_override_applied')), JSON.stringify(rd.selected));
    check('OVD no scrim_override_invalid warning', !rd.warnings.includes('scrim_override_invalid'),
      JSON.stringify(rd.warnings));
  }

  console.log('\n======================================================');
  console.log(`RESULT: ${pass} passed, ${fail} failed.`);
  if (fail) { console.log('FAILED:', fails.join(', ')); process.exitCode = 1; }
  console.log('Path used: PGlite (REAL migration SQL — public.resolve_slot_assets executed in WASM Postgres with plpgsql; grants loaded verbatim against fixture roles).');
  await db.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exitCode = 2; });
