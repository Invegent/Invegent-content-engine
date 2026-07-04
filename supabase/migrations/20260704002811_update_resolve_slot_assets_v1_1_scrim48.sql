-- Migration: update_resolve_slot_assets_v1_1_scrim48
-- Creative Asset Selection — public.resolve_slot_assets v1.1 (scrim recalibration)
--
-- SUPERSEDES: 20260703002813_create_resolve_slot_assets_v1.sql via CREATE OR REPLACE.
--   SAME signature (text, text, text, uuid, text) · SAME posture (STABLE, SECURITY
--   DEFINER, SET search_path = '', all references schema-qualified, no dynamic SQL).
--   Postgres preserves the existing ACL through OR REPLACE — the defensive
--   REVOKE/GRANT block is included anyway (idempotent, house style).
--
-- v1.1 (2026-07-04) — BEHAVIOUR DELTA vs v1 (everything else byte-identical: filter
-- chain, warnings doctrine, FNV-1a rotation, fail reasons, return shape):
--   1. c_scrim_opacity_needs_scrim: 64 → 48. PK-CALIBRATED 2026-07-03 via the Lane B
--      proof-wall A/B (registers v4.78): 48 preferred default · 64 acceptable ONLY
--      for busy backgrounds / dense text · 80 EXPLICITLY EXCLUDED (never). The
--      constants are no longer to_be_calibrated.
--   2. c_scrim_opacity_text_safe stays 40 — unchanged (no governed 'true'-class
--      assets exist yet).
--   3. Governed per-asset scrim override — the "busy background" exception,
--      mechanized as DATA, not heuristic. The override is set per-asset by PK at
--      intake/promotion (asset_meta key 'scrim_opacity_override', numeric 0-100);
--      "busy" is a PK visual judgment recorded as governed data. Semantics:
--        · Only BACKGROUNDS consult the key (an override on a logo row is ignored).
--        · When the SELECTED background carries a NUMERIC override, it is clamped
--          LEAST(GREATEST(x, 0), 100) and used as Scrim.opacity; the selected
--          Background entry's reasons[] gains 'scrim_override_applied' (provenance —
--          an applied override is NOT a warning).
--        · A NON-NUMERIC override value is IGNORED with warning
--          'scrim_override_invalid' (once) and the class constant applies — never
--          raises, never fails the resolution (fail-safe fallback).
--        · Consulted only when the template has a Scrim element (same fence as v1).
--
-- CONSUMERS (recorded at cut time):
--   · select_template (20260703035154) and stamp_tmr_shadow_forward (20260703130939)
--     EMBED slot_resolution by composition — from apply time their outputs carry the
--     new scrim values automatically (no copies to update).
--   · The stamper's selector_version constant tracks select_template, which is
--     UNCHANGED by this migration — NO stamper migration needed (recorded here).
--
-- EXPLICIT NON-CHANGE (Lane-0 informational carry): the Scrim element-name detection
--   intentionally keeps NO dynamic filter — the generic templates' Scrim rows are
--   registered dynamic = false and DO accept opacity modifications; adding a
--   dynamic = true filter would break them.
--
-- ── Retained v1 design header (still accurate unless superseded above) ─────────────
--
-- Design:  docs/briefs/results/creative-asset-selection-v0-result.md
--          (filter order §5 · fail-closed policy §6 · Slice-1 proposal §7 · PK decisions §8)
-- Brief:   docs/briefs/creative-asset-selection-slice1-rpc-brief.md
-- Unblocked by the v4.75 asset-intake governance backfill (PP assets governed).
--
-- WHAT IT DOES
--   Given (client_slug, platform, format, TMR registry template id, optional seed) it answers:
--   which governed background, logo, and scrim setting should fill this template's dynamic
--   slots — or FAILS CLOSED with structured, machine-readable reasons. Every selection AND
--   every rejection carries a reason code (day-one explainability contract — this is what the
--   future Layer-3 dashboard "why picked / why not" views will consume).
--
-- SECURITY POSTURE (copied from public.resolve_brand_assets)
--   SECURITY DEFINER · STABLE (read-only, no writes) · SET search_path = '' with ALL table
--   references schema-qualified · EXECUTE revoked from PUBLIC, anon, authenticated and granted
--   to service_role only. Policy failures NEVER raise — they are fail_closed returns; only
--   genuine errors (e.g. malformed asset_meta timestamps) may raise.
--
-- CONTRACT NOTES / RECORDED GAPS
--   · p_format is accepted but UNUSED — format→template mapping belongs to Template
--     Selection v0, not this RPC. Echoed as context.format_used = false.
--   · Logo is BRAND-REQUIRED regardless of the registry's required_for_render = false flag
--     (v0 PK decision 3): zero eligible logos ⇒ fail_closed 'missing_required_logo'.
--     NO placeholder substitution, ever (smoke callers handle placeholders themselves).
--   · logo_light / logo_dark variants remain missing from Asset Intake (v0 PK decision 2) —
--     recorded here, deferred to intake; the single existing governed logo is used.
--   · platform_scope is permissive-until-backfilled (v0 PK decision 4): a NULL platform_scope
--     passes WITH the visible warning 'platform_scope_unbacked' (no silent pass).
--   · A NULL p_platform never silently defeats the platform fence: scoped assets still PASS
--     (permissive), but the call carries the visible warning 'platform_input_missing' once per
--     call — permissive is fine, silent is not (db-rls-auditor find, 2026-07-03).
--   · Aspect filtering is intentionally LOOSE (Creatomate crops) — no aspect rejection.
--   · Scrim opacity: 48 (needs_scrim, PK-calibrated) / 40 ('true'), plus the governed
--     per-asset 'scrim_opacity_override' described in the v1.1 delta above.
--   · Rank: text-safe class ('true' > 'needs_scrim'), then created_at ASC, then asset_id ASC —
--     totally deterministic. p_seed (e.g. post_draft_id) rotates among ranked eligible
--     backgrounds via FNV-1a 32-bit (B1-v2 selectB1BackgroundKey precedent); NULL seed = rank #1.
--
-- ⛔ APPLY IS PK-GATED. This file is a local artifact until PK explicitly approves the
--    apply (hash-pinned). Ships dark on apply: no production consumer change — the two
--    composing RPCs pick up the new values automatically, both themselves dark.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   re-apply the v1 body from 20260703002813_create_resolve_slot_assets_v1.sql via a NEW
--   migration number (never reuse a migration name), or
--   DROP FUNCTION IF EXISTS public.resolve_slot_assets(text, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.resolve_slot_assets(
  p_client_slug text,
  p_platform    text,
  p_format      text,
  p_template_id uuid,
  p_seed        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Scrim opacity constants — PK-CALIBRATED 2026-07-03 (proof-wall A/B, registers v4.78):
  -- 48 preferred default; 64 acceptable ONLY for busy backgrounds/dense text (mechanized as
  -- the per-asset governed override below, NOT as a constant); 80 explicitly excluded.
  -- No longer to_be_calibrated (v1 provisional values superseded).
  c_scrim_opacity_needs_scrim CONSTANT numeric := 48;  -- selected background safe_for_text_overlay = 'needs_scrim'
  c_scrim_opacity_text_safe   CONSTANT numeric := 40;  -- selected background safe_for_text_overlay = 'true' (unchanged)

  v_context   jsonb;
  v_client_id uuid;

  v_has_background boolean := false;
  v_has_logo       boolean := false;
  v_has_scrim      boolean := false;
  v_image_slots    text[]  := '{}';   -- dynamic field_kind='image' slots (e.g. FaceObject) — optional, never fail

  v_selected  jsonb := '[]'::jsonb;
  v_rejected  jsonb := '[]'::jsonb;
  v_warnings  jsonb := '[]'::jsonb;
  v_mods      jsonb := '{}'::jsonb;
  v_platform_scope_warned boolean := false;

  -- Eligible backgrounds, split by text-safe class. The candidate loop scans in
  -- (created_at ASC, asset_id ASC) order, so each class list is ALREADY in tiebreak order;
  -- ranked list = 'true' class first, then 'needs_scrim' class (v0 §5 rank step).
  v_bg_true   jsonb := '[]'::jsonb;
  v_bg_needs  jsonb := '[]'::jsonb;
  v_ranked_bg jsonb;
  v_elig_logo jsonb := '[]'::jsonb;

  r           record;
  v_slot      text;
  v_reason    text;
  v_entry     jsonb;
  v_bg_count  int;
  v_idx       int;
  v_pick      jsonb;
  v_hash      bigint;
  v_bytes     bytea;
  v_slot_name text;

  -- v1.1: governed per-asset scrim override plumbing
  v_bg_reasons         jsonb;
  v_scrim_override_txt text;
  v_scrim_opacity      numeric;
BEGIN
  v_context := jsonb_build_object(
    'client_slug', p_client_slug,
    'platform',    p_platform,
    -- p_format accepted but UNUSED in v1: format→template mapping belongs to Template Selection v0.
    'format',      p_format,
    'template_id', p_template_id,
    'seed',        p_seed,
    'format_used', false
  );

  -- ── 1. Template lookup ────────────────────────────────────────────────────────────────
  PERFORM 1 FROM c.creative_provider_template t WHERE t.id = p_template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', '[]'::jsonb,
      'rejected', '[]'::jsonb, 'warnings', '[]'::jsonb,
      'fail_reason', 'template_not_found', 'context', v_context);
  END IF;

  -- ── 2. Dynamic slot inventory (Background / Logo / image slots) + Scrim element ───────
  SELECT
    COALESCE(bool_or(f.field_kind = 'background'), false),
    COALESCE(bool_or(f.field_kind = 'logo'), false),
    COALESCE(array_agg(f.element_name ORDER BY f.element_name)
               FILTER (WHERE f.field_kind = 'image'), '{}')
  INTO v_has_background, v_has_logo, v_image_slots
  FROM c.creative_provider_template_field f
  WHERE f.template_id = p_template_id
    AND f.dynamic = true
    AND f.field_kind IN ('background', 'logo', 'image');
  -- (required_for_render is deliberately NOT consulted for Logo: brand-required per PK decision 3.)

  -- v1.1 EXPLICIT NON-CHANGE: no dynamic filter here — the generic templates' Scrim rows
  -- are registered dynamic=false yet DO accept opacity modifications (Lane-0 carry).
  SELECT EXISTS (
    SELECT 1 FROM c.creative_provider_template_field f
    WHERE f.template_id = p_template_id AND f.element_name = 'Scrim'
  ) INTO v_has_scrim;

  -- ── 3. Client lookup (c.client PK column is client_id) ────────────────────────────────
  SELECT cl.client_id INTO v_client_id
  FROM c.client cl
  WHERE cl.client_slug = p_client_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', '[]'::jsonb,
      'rejected', '[]'::jsonb, 'warnings', '[]'::jsonb,
      'fail_reason', 'client_not_found', 'context', v_context);
  END IF;

  -- NULL p_platform: the platform fence cannot be evaluated. Assets still PASS the platform
  -- filter (permissive), but NEVER silently — visible warning once per call (db-rls-auditor
  -- find 2026-07-03; PK decision 4 spirit: permissive is fine, silent is not).
  IF p_platform IS NULL THEN
    v_warnings := v_warnings || to_jsonb('platform_input_missing'::text);
  END IF;

  -- ── 4. Candidate filter chain (v0 §5 order; FIRST failing filter = the reason_code) ───
  FOR r IN
    SELECT
      cba.asset_id,
      cba.asset_url,
      cba.is_active,
      cba.platform_scope,
      cba.created_at,
      COALESCE(cba.asset_meta->>'asset_key', cba.asset_id::text) AS asset_key,
      cba.asset_meta->>'usage'                                   AS asset_usage,
      cba.asset_meta->>'approved'                                AS approved_txt,
      cba.asset_meta->>'license_type'                            AS license_type,
      cba.asset_meta->>'license'                                 AS license,
      cba.asset_meta->>'license_expires_at'                      AS license_expires_at,
      COALESCE(cba.asset_meta->>'bucket', '')                    AS bucket,
      cba.asset_meta->>'safe_for_text_overlay'                   AS sfto,
      -- v1.1: governed per-asset scrim override (PK-set at intake/promotion; backgrounds only)
      cba.asset_meta->>'scrim_opacity_override'                  AS scrim_override
    FROM c.client_brand_asset cba
    WHERE cba.client_id = v_client_id
      AND cba.asset_meta->>'usage' IN ('background', 'logo')
    ORDER BY cba.created_at ASC, cba.asset_id ASC
  LOOP
    v_slot   := CASE r.asset_usage WHEN 'background' THEN 'Background' ELSE 'Logo' END;
    v_reason := NULL;

    IF r.is_active IS NOT TRUE THEN
      v_reason := 'inactive';
    ELSIF (r.approved_txt)::boolean IS NOT TRUE THEN
      v_reason := 'not_approved';
    ELSIF r.license_type IS NULL AND r.license IS NULL THEN
      v_reason := 'license_missing';
    ELSIF r.license_expires_at IS NOT NULL
      AND (r.license_expires_at)::timestamptz < now() THEN
      v_reason := 'license_expired';
    ELSIF r.bucket <> 'brand-assets' THEN
      -- output-as-input guard: only the brand-assets bucket is an acceptable SOURCE;
      -- never feed a rendered/published output back in as a source (v0 §6).
      v_reason := 'output_as_input_risk';
    ELSIF r.platform_scope IS NOT NULL AND p_platform IS NOT NULL
      AND p_platform <> ALL (r.platform_scope) THEN
      -- exclusion requires a KNOWN caller platform; a NULL p_platform passes permissively
      -- but visibly ('platform_input_missing' warning emitted once, after client lookup).
      v_reason := 'platform_excluded';
    ELSE
      -- platform_scope NULL = permissive-until-backfilled (PK decision 4): pass + visible warning ONCE.
      IF r.platform_scope IS NULL AND NOT v_platform_scope_warned THEN
        v_warnings := v_warnings || to_jsonb('platform_scope_unbacked'::text);
        v_platform_scope_warned := true;
      END IF;
      IF r.asset_usage = 'background' THEN
        IF r.sfto = 'false' THEN
          v_reason := 'not_text_safe';
        ELSIF r.sfto IS NULL THEN
          v_reason := 'text_safety_unknown';
        ELSIF r.sfto NOT IN ('true', 'needs_scrim') THEN
          -- unrecognised safety tag = unknown safety (fail-closed-safe interpretation).
          v_reason := 'text_safety_unknown';
        END IF;
      END IF;
    END IF;

    IF v_reason IS NOT NULL THEN
      v_rejected := v_rejected || jsonb_build_object(
        'slot', v_slot, 'asset_key', r.asset_key, 'reason_code', v_reason);
    ELSIF r.asset_usage = 'background' THEN
      -- v1.1: carry scrim_override through the eligible-background entry (JSON null when absent)
      v_entry := jsonb_build_object(
        'asset_id', r.asset_id, 'asset_key', r.asset_key,
        'asset_url', r.asset_url, 'sfto', r.sfto,
        'scrim_override', r.scrim_override);
      IF r.sfto = 'true' THEN
        v_bg_true := v_bg_true || v_entry;
      ELSE
        v_bg_needs := v_bg_needs || v_entry;
      END IF;
    ELSE
      -- (logos deliberately do NOT carry scrim_override — only backgrounds consult it)
      v_elig_logo := v_elig_logo || jsonb_build_object(
        'asset_id', r.asset_id, 'asset_key', r.asset_key, 'asset_url', r.asset_url);
    END IF;
  END LOOP;

  -- ── 5.–6. Background rank + selection ─────────────────────────────────────────────────
  v_ranked_bg := v_bg_true || v_bg_needs;   -- 'true' class outranks 'needs_scrim'; each in (created_at, asset_id) order
  v_bg_count  := jsonb_array_length(v_ranked_bg);

  IF v_has_background THEN
    IF v_bg_count = 0 THEN
      RETURN jsonb_build_object(
        'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', v_selected,
        'rejected', v_rejected, 'warnings', v_warnings,
        'fail_reason', 'no_governed_background', 'context', v_context);
    END IF;

    IF p_seed IS NOT NULL THEN
      -- FNV-1a 32-bit over the UTF-8 bytes of p_seed (B1-v2 precedent): deterministic rotation.
      v_hash  := 2166136261;
      v_bytes := convert_to(p_seed, 'UTF8');
      FOR i IN 0 .. octet_length(v_bytes) - 1 LOOP
        v_hash := v_hash # get_byte(v_bytes, i)::bigint;          -- xor
        v_hash := (v_hash * 16777619) % 4294967296;               -- * FNV prime, mod 2^32
      END LOOP;
      v_idx := (v_hash % v_bg_count)::int;
    ELSE
      v_idx := 0;   -- no seed → top-ranked
    END IF;

    v_pick := v_ranked_bg -> v_idx;
    v_mods := v_mods || jsonb_build_object('Background.source', v_pick->>'asset_url');

    -- reasons for the selected background (v1 shape; v1.1 may append 'scrim_override_applied')
    v_bg_reasons := jsonb_build_array(
      'governed', 'license_ok',
      CASE WHEN v_pick->>'sfto' = 'true' THEN 'text_safe_true' ELSE 'text_safe_needs_scrim' END,
      'client_match');

    -- Scrim.opacity ONLY when the template actually has a Scrim element.
    IF v_has_scrim THEN
      -- class constant default (48 needs_scrim / 40 'true')
      v_scrim_opacity := CASE WHEN v_pick->>'sfto' = 'needs_scrim'
                              THEN c_scrim_opacity_needs_scrim
                              ELSE c_scrim_opacity_text_safe END;
      -- v1.1: governed per-asset override on the SELECTED background (fail-safe, never raises)
      v_scrim_override_txt := v_pick->>'scrim_override';
      IF v_scrim_override_txt IS NOT NULL THEN
        IF v_scrim_override_txt ~ '^\s*[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)\s*$' THEN
          v_scrim_opacity := LEAST(GREATEST((v_scrim_override_txt)::numeric, 0), 100);
          -- provenance, not a warning: record on the selected Background entry's reasons[]
          v_bg_reasons := v_bg_reasons || to_jsonb('scrim_override_applied'::text);
        ELSE
          -- non-numeric override: IGNORED with a visible warning; class constant stands
          v_warnings := v_warnings || to_jsonb('scrim_override_invalid'::text);
        END IF;
      END IF;
      v_mods := v_mods || jsonb_build_object('Scrim.opacity', v_scrim_opacity);
    END IF;

    v_selected := v_selected || jsonb_build_object(
      'slot', 'Background',
      'asset_key', v_pick->>'asset_key',
      'asset_id',  v_pick->>'asset_id',
      'asset_url', v_pick->>'asset_url',
      'reasons', v_bg_reasons);
  END IF;

  -- ── 7. Logo selection — brand-required regardless of required_for_render (PK decision 3)
  IF v_has_logo THEN
    IF jsonb_array_length(v_elig_logo) = 0 THEN
      RETURN jsonb_build_object(
        'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', v_selected,
        'rejected', v_rejected, 'warnings', v_warnings,
        'fail_reason', 'missing_required_logo', 'context', v_context);
    END IF;
    v_pick := v_elig_logo -> 0;   -- deterministic: first by (created_at ASC, asset_id ASC)
    v_mods := v_mods || jsonb_build_object('Logo.source', v_pick->>'asset_url');
    v_selected := v_selected || jsonb_build_object(
      'slot', 'Logo',
      'asset_key', v_pick->>'asset_key',
      'asset_id',  v_pick->>'asset_id',
      'asset_url', v_pick->>'asset_url',
      'reasons', jsonb_build_array('governed', 'license_ok', 'client_match'));
  END IF;

  -- ── 8. Optional image slots (e.g. FaceObject, required_for_render=false): never fail ──
  FOREACH v_slot_name IN ARRAY v_image_slots LOOP
    v_warnings := v_warnings || to_jsonb('optional_slot_unfilled:' || v_slot_name);
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'ok',
    'modifications', v_mods,
    'selected', v_selected,
    'rejected', v_rejected,
    'warnings', v_warnings,
    'fail_reason', NULL,
    'context', v_context);
END;
$$;

COMMENT ON FUNCTION public.resolve_slot_assets(text, text, text, uuid, text) IS
'Creative Asset Selection: read-only governed slot resolver (background/logo/scrim) for a TMR registry template. Fail-closed with per-asset reason codes; p_format accepted but unused. v1.1: scrim default 48 (PK-calibrated 2026-07-03; 80 excluded) + governed per-asset asset_meta scrim_opacity_override (numeric 0-100, clamped; non-numeric ignored with scrim_override_invalid warning). Service-role-only. Ships dark (no production consumer).';

-- ── Grants: service-role-only (revoking PUBLIC alone is insufficient — name anon, authenticated) ──
-- (OR REPLACE preserves the v1 ACL; this block is defensive + idempotent, house style.)
REVOKE ALL ON FUNCTION public.resolve_slot_assets(text, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_slot_assets(text, text, text, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_slot_assets(text, text, text, uuid, text) TO service_role;
