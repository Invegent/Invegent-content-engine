-- cc-0044 Checkpoint B — resolve_slot_assets v1.2: pool-policy-governed shared-pool fallback
-- =============================================================================================
-- WHAT: The static_background slot may now fall back to / merge with c.shared_creative_asset,
--       governed by c.client_asset_pool_policy. Logo and every other slot are UNCHANGED.
--
-- DARK / BEHAVIOR-PRESERVING: No client has a pool-policy row (default = client_only) and the
--       shared pool is empty, so EVERY client resolves via the unchanged client_only path today.
--       The client_only output is byte-identical to v1.1 (validated by a live OLD-vs-NEW diff).
--
-- POLICY CONTRACTS (static_background only):
--   * client_only      — unchanged existing client candidate path; byte-identical output.
--   * client_preferred — if ANY eligible client background exists, use only the client set;
--                        otherwise evaluate the eligible shared set.
--   * best_fit         — combine eligible client + shared backgrounds into ONE normalized set and
--                        rank across BOTH by comparable signals that already exist:
--                          (1) text-safety priority: 'true' before 'needs_scrim' (resolver's
--                              existing background priority — preserved),
--                          (2) deterministic common ordering: created_at ASC, then asset_id ASC,
--                          (3) ORIGIN only as a FINAL tie-breaker (client < shared) — origin does
--                              NOT automatically make every client asset outrank every shared one.
--
-- RESERVED / UNIMPLEMENTED in v1.2 (DO NOT ACTIVATE best_fit until these get an architecture
--   ruling): c.client_asset_pool_policy.client_asset_score_bias and .minimum_fit_score are NOT
--   consulted. No best_fit policy row may be activated before a separate scoring-semantics ruling.
--
-- SHARED ELIGIBILITY: mirrors the canonical fence chain in public.resolve_shared_pool_assets
--   (is_active → production_use_allowed → purpose_bound → licence_allows_multi_entity_use →
--    excluded_clients → allowed_clients → vertical_shared vertical match → platform_scope) so the
--   resolver and analyze_asset_gap AGREE on "eligible shared background", THEN applies the
--   resolver's own background text-safety classification (sfto false/null/unknown → reject).
--   Pool→scope mapping mirrors analyze_asset_gap EXACTLY (allow_vertical_shared→'vertical_shared',
--   allow_global_shared→'global_generic'; only for client_preferred/best_fit).
--
-- KNOWN, DEFERRED (activation-blocking carry — see docs/briefs/carries): the analyzer
--   (resolve_shared_pool_assets, used by analyze_asset_gap) does NOT apply text-safety, but this
--   resolver does. Direction is fail-safe (no bad render; at worst a missed gap-detection). Broad
--   shared-pool activation is BLOCKED until analyzer↔resolver text-safety eligibility are aligned;
--   Proof #1 may proceed ONLY if the selected shared asset already carries a resolver-accepted
--   text-safety value AND evidence shows analyzer diagnosis and render resolution agree for it.
--
-- PRESERVED: SECURITY DEFINER, SET search_path='', STABLE, grants ({postgres=X, service_role=X};
--   CREATE OR REPLACE keeps them), the no_governed_background / missing_required_logo fail-closed
--   behavior, seed rotation, scrim/scrim-override logic, and the client_only ranking.
--
-- Rollback: _harness/cc0044_cpB_resolve_shared_fallback/ROLLBACK_resolve_slot_assets_live_captured.sql
--   (byte-exact live v1.1 body; prosrc md5 2008b8ed9b6050eb74cd6a359ffe2c82, len 12668).
-- NOTE: applied via execute_sql (apply_migration deny-listed); the ledger version is minted at
--   apply — backfill this filename's identity into the ledger post-apply.
-- =============================================================================================
CREATE OR REPLACE FUNCTION public.resolve_slot_assets(p_client_slug text, p_platform text, p_format text, p_template_id uuid, p_seed text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- v1.2: pool-policy-governed shared-pool fallback plumbing (DARK until a policy row + shared pool exist)
  v_pool_policy text := 'client_only';
  v_policy      record;
  v_permitted   text[] := '{}';   -- permitted shared governance_scopes derived from the policy
  v_vertical    text;             -- template vertical (only derived when 'vertical_shared' is permitted)
  v_family_id   uuid;             -- template family (for vertical-tag fallback), captured at §1
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
  -- v1.2: capture family_id (used only by the shared-pool vertical fallback); FOUND semantics
  -- and the template_not_found fail-closed are unchanged from the PERFORM form.
  SELECT t.family_id INTO v_family_id
  FROM c.creative_provider_template t
  WHERE t.id = p_template_id;
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

  -- ── 3b. v1.2 pool policy (no row ⇒ client_only). Mirrors analyze_asset_gap's scope mapping
  -- EXACTLY so the resolver and the analyzer agree on which shared scopes are permitted.
  SELECT * INTO v_policy FROM c.client_asset_pool_policy WHERE client_id = v_client_id;
  IF FOUND THEN
    v_pool_policy := v_policy.pool_policy;
    IF v_pool_policy IN ('client_preferred', 'best_fit') THEN
      -- NB: explicit ::text so `text[] || unknown-literal` resolves as element-append, not
      -- array-concat (bare-literal form raises 22P02 malformed array literal — caught by the
      -- v1.2 fixture proof; the live analyze_asset_gap carries the same latent form → carry filed).
      IF v_policy.allow_vertical_shared THEN v_permitted := v_permitted || 'vertical_shared'::text; END IF;
      IF v_policy.allow_global_shared   THEN v_permitted := v_permitted || 'global_generic'::text;  END IF;
    END IF;
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
      -- v1.2: carry _ord (created_at) + _origin='client' for the best_fit cross-origin rank.
      --       These are internal ranking keys ONLY — selection/output read named keys, so
      --       client_only output is unchanged by their presence.
      v_entry := jsonb_build_object(
        'asset_id', r.asset_id, 'asset_key', r.asset_key,
        'asset_url', r.asset_url, 'sfto', r.sfto,
        'scrim_override', r.scrim_override,
        '_ord', r.created_at, '_origin', 'client');
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

  -- ── 4b. v1.2 shared-pool background fallback (DARK for client_only; skipped entirely there).
  -- Runs only for client_preferred/best_fit with at least one permitted shared scope. Applies the
  -- canonical shared fence chain (mirror of resolve_shared_pool_assets) THEN the resolver's own
  -- background text-safety classification, appending survivors into the SAME v_bg_true/v_bg_needs
  -- class lists (so scrim + text-safety guarantees are identical to client backgrounds).
  IF v_has_background
     AND v_pool_policy <> 'client_only'
     AND array_length(v_permitted, 1) IS NOT NULL
     AND (
       v_pool_policy = 'best_fit'
       OR (v_pool_policy = 'client_preferred'
           AND jsonb_array_length(v_bg_true)  = 0
           AND jsonb_array_length(v_bg_needs) = 0)
     ) THEN

    -- Derive the template vertical ONLY when a vertical_shared scope is in play (template tag →
    -- family tag fallback, first alphabetical) — mirrors derive_asset_appetite's vertical rule.
    IF 'vertical_shared' = ANY (v_permitted) THEN
      SELECT COALESCE(
        (SELECT (array_agg(DISTINCT tt.value ORDER BY tt.value))[1]
           FROM c.creative_provider_template_tag tt
           WHERE tt.template_id = p_template_id AND tt.namespace = 'vertical'),
        (SELECT (array_agg(DISTINCT ft.value ORDER BY ft.value))[1]
           FROM c.creative_template_family_tag ft
           WHERE ft.family_id = v_family_id AND ft.namespace = 'vertical')
      ) INTO v_vertical;
    END IF;

    FOR r IN
      SELECT
        sa.id                                              AS asset_id,
        sa.asset_url,
        sa.created_at,
        COALESCE(sa.asset_meta->>'asset_key', sa.id::text) AS asset_key,
        sa.asset_meta->>'safe_for_text_overlay'            AS sfto,
        sa.asset_meta->>'scrim_opacity_override'           AS scrim_override,
        sa.governance_scope,
        sa.vertical_key,
        sa.platform_scope,
        sa.is_active,
        sa.production_use_allowed,
        sa.purpose_bound,
        sa.licence_allows_multi_entity_use,
        sa.allowed_clients,
        sa.excluded_clients
      FROM c.shared_creative_asset sa
      WHERE sa.asset_kind = 'static_background'
        AND sa.governance_scope = ANY (v_permitted)
      ORDER BY sa.created_at ASC, sa.id ASC
    LOOP
      v_reason := NULL;
      -- canonical shared fence chain (mirror of resolve_shared_pool_assets)
      IF r.is_active IS NOT TRUE THEN
        v_reason := 'inactive';
      ELSIF r.production_use_allowed IS NOT TRUE THEN
        v_reason := 'production_use_not_allowed';
      ELSIF r.purpose_bound IS TRUE THEN
        v_reason := 'purpose_bound';
      ELSIF r.licence_allows_multi_entity_use IS NOT TRUE THEN
        v_reason := 'licence_not_multi_entity';
      ELSIF v_client_id = ANY (r.excluded_clients) THEN
        v_reason := 'client_excluded';
      ELSIF array_length(r.allowed_clients, 1) IS NOT NULL
        AND v_client_id <> ALL (r.allowed_clients) THEN
        v_reason := 'not_in_allowlist';
      ELSIF r.governance_scope = 'vertical_shared'
        AND r.vertical_key IS DISTINCT FROM v_vertical THEN
        v_reason := 'vertical_mismatch';
      ELSIF r.platform_scope IS NOT NULL AND p_platform IS NOT NULL
        AND p_platform <> ALL (r.platform_scope) THEN
        v_reason := 'platform_excluded';
      -- then the resolver's own background text-safety classification (identical to §4)
      ELSIF r.sfto = 'false' THEN
        v_reason := 'not_text_safe';
      ELSIF r.sfto IS NULL THEN
        v_reason := 'text_safety_unknown';
      ELSIF r.sfto NOT IN ('true', 'needs_scrim') THEN
        v_reason := 'text_safety_unknown';
      END IF;

      IF v_reason IS NOT NULL THEN
        v_rejected := v_rejected || jsonb_build_object(
          'slot', 'Background', 'asset_key', r.asset_key, 'reason_code', v_reason);
      ELSE
        v_entry := jsonb_build_object(
          'asset_id', r.asset_id, 'asset_key', r.asset_key,
          'asset_url', r.asset_url, 'sfto', r.sfto,
          'scrim_override', r.scrim_override,
          '_ord', r.created_at, '_origin', 'shared');
        IF r.sfto = 'true' THEN
          v_bg_true := v_bg_true || v_entry;
        ELSE
          v_bg_needs := v_bg_needs || v_entry;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ── 5.–6. Background rank + selection ─────────────────────────────────────────────────
  -- client_only / client_preferred: 'true' class first then 'needs_scrim', each already in
  --   (created_at, asset_id) insertion order (client-only path is byte-identical to v1.1).
  -- best_fit: ONE normalized set ranked by text-safety class, then (created_at, asset_id),
  --   with ORIGIN as the FINAL tie-breaker only (client < shared).
  IF v_pool_policy = 'best_fit' THEN
    SELECT COALESCE(
      jsonb_agg(e ORDER BY
        ((e->>'sfto') IS DISTINCT FROM 'true'),   -- false(0)='true' class first, true(1)='needs_scrim'
        (e->>'_ord')::timestamptz ASC,
        (e->>'asset_id')::uuid ASC,
        (e->>'_origin') ASC                        -- 'client' < 'shared' — final tie-break only
      ), '[]'::jsonb)
    INTO v_ranked_bg
    FROM jsonb_array_elements(v_bg_true || v_bg_needs) AS e;
  ELSE
    v_ranked_bg := v_bg_true || v_bg_needs;   -- 'true' class outranks 'needs_scrim'; each in (created_at, asset_id) order
  END IF;
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
$function$;
