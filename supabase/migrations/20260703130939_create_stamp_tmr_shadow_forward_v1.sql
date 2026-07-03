-- Migration: create_stamp_tmr_shadow_forward_v1
-- S1 Forward Shadow Stamping — public.stamp_tmr_shadow_forward (DB-native shadow stamper)
--
-- Design:  docs/briefs/s1-forward-shadow-stamping-gate1.md — PK-ratified Gate 1:
--          Option A (DB-native SECURITY DEFINER stamper) ratified. Ratified context:
--          hourly cadence · supervised first run (manual PK-gated invocation with
--          pre/post isolation probes) · per-run cap 20 · scope v1 = PP B1
--          'creative_library_b1_production' renders only (the label filter IS the
--          scope fence — the only governed production render path today).
-- Logic:   productionizes _harness/s0-shadow-retroactive-batch.sql (S0 retroactive
--          batch) into a reusable, idempotent, capped function. The divergence CASE
--          and notes wording are BYTE-EQUIVALENT IN BEHAVIOUR to S0 (ratified
--          taxonomy, tmr-shadow-mode-stamping-design-packet.md §3c).
-- Mirror:  supabase/migrations/20260703035154_create_select_template_v1.sql
--          (posture precedent: SECDEF / search_path='' / service-role-only / no
--          dynamic SQL — but VOLATILE here, NOT STABLE: this function WRITES
--          c.tmr_shadow_decision, unlike the read-only selector RPCs).
-- Table:   supabase/migrations/20260703064651_create_tmr_shadow_decision_v1.sql —
--          the partial unique index on render_log_id (WHERE NOT NULL) is the
--          idempotency key; the NOT EXISTS scan makes re-runs stamp nothing twice.
--
-- WHAT IT DOES (per invocation)
--   Scans m.post_render_log for succeeded 'creative_library_b1_production' renders
--   with a post_draft_id and NO shadow row yet, oldest-first, capped at
--   LEAST(GREATEST(coalesce(p_limit,20),1),100). Per row it derives the client_slug
--   from the draft's client_id (NOT hardcoded — the label already scopes to the
--   governed PP path, but deriving keeps the function correct if the label ever
--   covers more clients), calls public.select_template(client_slug, d.platform,
--   'image_quote', NULL, seed = post_draft_id::text) — ratified S0 decision 6 —
--   and INSERTs one c.tmr_shadow_decision row (batch_label 's1-forward-v1') with
--   the full selector payload, the production_actual render_spec extract, the S0
--   divergence classification, and the registry_context at compute time (computed
--   once per distinct client_id per invocation, cached — stale-at-compute semantics
--   per design packet R2, recorded honestly, never hidden).
--   Returns jsonb: {run_at, limit, scanned, stamped, skipped_no_slug,
--   remaining_unshadowed}.
--
-- DIVERGENCE TAXONOMY (S0-equivalent — first matching class wins)
--   selector_fail_closed            selector_output.status <> 'ok' where production rendered
--                                   (FAIL-CLOSED IS DATA, not an error — stamped, never raised)
--   expected_structural_divergence  production provider_template_id not in c.creative_provider_template
--                                   (rows whose render_spec lacks a provider_template_id also land here)
--   selector_disagreement           both in registry, selector picked a different template
--                                   (post-Lane-0 the B1 template IS registered, so live B1 rows
--                                    classify here — the CASE itself stays general)
--   background_divergence           template agrees, background differs
--   agreement                       template AND background agree
--
-- NON-CLAIMS (hard boundaries, design packet §3d — unchanged from S0)
--   · Writes ONLY c.tmr_shadow_decision. No production table is written; m.post_draft /
--     render_spec / queue / publisher surfaces are never touched (reads only).
--   · Shadow rows grant NO status: nothing is approved, proven, enabled, or promoted
--     by a row existing here.
--   · Consumed by NOTHING at runtime: no worker, EF, trigger, view, publisher,
--     dashboard, Format Mix, or enablement path reads the shadow table.
--   · A stamper failure can never fail a render — this function runs nowhere near
--     the render path (invoked only manually or by a separately-gated cron job);
--     any genuine error aborts THIS invocation's inserts atomically and nothing else.
--
-- ⏰ SCHEDULING IS A SEPARATE PK GATE. This migration schedules NOTHING — no
--    cron.schedule, no pg_cron reference. The hourly cadence is ratified CONTEXT;
--    the cron.schedule itself goes through its own later gate (Gate-1 decision 3:
--    apply → supervised first manual run with isolation probes → then the schedule gate).
--
-- SELECTOR VERSION CONSTANT
--   selector_version is stamped as 'select_template_v1@20260703035154'. If
--   public.select_template is ever revised under a new migration, this constant
--   MUST be updated in a successor migration (new version of this function).
--
-- OPERATIONAL NOTES
--   · Idempotent by construction: partial unique index + NOT EXISTS. Concurrent
--     double-invocation can race to the unique index — the loser errors and rolls
--     back its own inserts cleanly (acceptable; the cron cadence never overlaps).
--   · Rows whose client has no client_slug are skipped-and-counted (defensive;
--     expect 0 — every c.client row carries a slug). Such a row would stay in the
--     unshadowed pool permanently and occupy a slot in the oldest-first window;
--     skipped_no_slug > 0 in the return jsonb is the visible signal to investigate.
--   · No RAISE for policy outcomes: selector fail-closed is DATA (class
--     selector_fail_closed). Only genuine errors raise, aborting the invocation.
--
-- SECURITY POSTURE
--   SECURITY DEFINER · VOLATILE (writes the shadow table) · SET search_path = ''
--   with ALL references schema-qualified · no dynamic SQL · EXECUTE revoked from
--   PUBLIC, anon, authenticated and granted to service_role only.
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED. Do not run it without
--    explicit PK apply approval. First run is supervised (manual, with the S0
--    pre/post isolation-probe pattern) per ratified Gate-1 decision 3.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   Function:       DROP FUNCTION IF EXISTS public.stamp_tmr_shadow_forward(integer);
--   S1 rows only:   DELETE FROM c.tmr_shadow_decision WHERE batch_label = 's1-forward-v1';

CREATE OR REPLACE FUNCTION public.stamp_tmr_shadow_forward(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_batch_label      CONSTANT text := 's1-forward-v1';
  c_selector_version CONSTANT text := 'select_template_v1@20260703035154';  -- update on selector version change (see header)
  c_format           CONSTANT text := 'image_quote';
  c_label            CONSTANT text := 'creative_library_b1_production';

  v_limit           int;
  v_scanned         int := 0;
  v_stamped         int := 0;
  v_skipped_no_slug int := 0;
  v_remaining       int;

  -- per-invocation caches, keyed by client_id::text (registry_context is computed
  -- once per distinct client encountered — design packet R2 stale-at-compute semantics)
  v_slug_cache jsonb := '{}'::jsonb;
  v_ctx_cache  jsonb := '{}'::jsonb;

  r record;

  v_client_slug       text;
  v_registry_context  jsonb;
  v_sel               jsonb;
  v_production_actual jsonb;
  v_prod_ptid         text;
  v_sel_ptid          text;
  v_sel_bg_key        text;
  v_sel_logo_key      text;
  v_sel_asset_keys    jsonb;
  v_prod_in_registry  boolean;
  v_template_match    boolean;
  v_background_match  boolean;
  v_divergence        jsonb;
BEGIN
  -- ── clamp: NULL→20, floor 1, ceiling 100 ─────────────────────────────────────
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);

  -- ── candidate pool: unshadowed succeeded B1 renders, oldest-first, capped ─────
  --    (render_log_id ASC tiebreak keeps the order deterministic on equal timestamps)
  FOR r IN
    SELECT
      rl.render_log_id,
      rl.post_draft_id,
      rl.created_at AS rendered_at,
      rl.render_spec,
      d.client_id,
      d.platform
    FROM m.post_render_log rl
    JOIN m.post_draft d ON d.post_draft_id = rl.post_draft_id   -- post_draft PK column is post_draft_id, NOT id
    WHERE rl.render_spec->>'label' = c_label
      AND rl.status = 'succeeded'
      AND rl.post_draft_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM c.tmr_shadow_decision sd
        WHERE sd.render_log_id = rl.render_log_id)
    ORDER BY rl.created_at ASC, rl.render_log_id ASC
    LIMIT v_limit
  LOOP
    v_scanned := v_scanned + 1;

    -- ── client_slug: derived from the draft's client (cached; NOT hardcoded) ────
    v_client_slug := v_slug_cache->>(r.client_id::text);
    IF v_client_slug IS NULL AND NOT (v_slug_cache ? r.client_id::text) THEN
      SELECT cl.client_slug INTO v_client_slug
      FROM c.client cl WHERE cl.client_id = r.client_id;
      v_slug_cache := v_slug_cache || jsonb_build_object(r.client_id::text, v_client_slug);
    END IF;
    IF v_client_slug IS NULL THEN
      -- defensive (expect 0): a client without a slug cannot be shadowed — skip + count
      v_skipped_no_slug := v_skipped_no_slug + 1;
      CONTINUE;
    END IF;

    -- ── registry_context: computed once per distinct client per invocation ──────
    --    (same jsonb shape as S0; selectable = assignment at visually_approved+
    --     AND carrying a passed visual_approval proof — the select_template
    --     selectable definition; design packet R2)
    v_registry_context := v_ctx_cache->(r.client_id::text);
    IF v_registry_context IS NULL THEN
      SELECT jsonb_build_object(
        'selectable_count', (
          SELECT count(*)
          FROM c.creative_template_client_assignment a
          WHERE a.client_id = r.client_id
            AND a.assignment_status IN ('visually_approved', 'client_enabled', 'production_proven')
            AND EXISTS (
              SELECT 1 FROM c.creative_template_proof_event p
              WHERE p.assignment_id = a.id
                AND p.proof_type   = 'visual_approval'
                AND p.proof_status = 'passed')),
        'proposed_count', (
          SELECT count(*)
          FROM c.creative_template_client_assignment a
          WHERE a.client_id = r.client_id
            AND a.assignment_status = 'proposed'),
        'visual_proofs', (
          SELECT count(*)
          FROM c.creative_template_proof_event p
          JOIN c.creative_template_client_assignment a ON a.id = p.assignment_id
          WHERE a.client_id = r.client_id
            AND p.proof_type   = 'visual_approval'
            AND p.proof_status = 'passed'),
        'computed_for_client_id', r.client_id,
        'semantics', 'registry state at compute time, NOT at render time (design packet R2)')
      INTO v_registry_context;
      v_ctx_cache := v_ctx_cache || jsonb_build_object(r.client_id::text, v_registry_context);
    END IF;

    -- ── the shadow question (ratified decision 6: seed = post_draft_id::text) ───
    v_sel := public.select_template(v_client_slug, r.platform, c_format, NULL, r.post_draft_id::text);

    -- ── production_actual: null-safe ->> extraction (S0-identical; older rows
    --    may lack contract fields — they extract as JSON nulls) ──────────────────
    v_production_actual := jsonb_build_object(
      'provider_template_id', r.render_spec->'template'->>'provider_template_id',
      'implementation_id',    r.render_spec->'template'->>'implementation_id',
      'template_family',      r.render_spec->'template'->>'template_family',
      'background_key',       r.render_spec->>'background_key',
      'asset_keys',           r.render_spec->'template'->'asset_keys',
      'variant_key',          r.render_spec->>'variant_key',
      'contract_ref',         r.render_spec->>'contract_ref',
      'rendered_at',          r.rendered_at);

    -- ── classification inputs (S0-identical extraction) ─────────────────────────
    v_prod_ptid := v_production_actual->>'provider_template_id';
    v_sel_ptid  := v_sel->'selected'->>'provider_template_id';

    SELECT e->>'asset_key' INTO v_sel_bg_key
    FROM jsonb_array_elements(COALESCE(v_sel->'slot_resolution'->'selected', '[]'::jsonb)) e
    WHERE e->>'slot' = 'Background' LIMIT 1;

    SELECT e->>'asset_key' INTO v_sel_logo_key
    FROM jsonb_array_elements(COALESCE(v_sel->'slot_resolution'->'selected', '[]'::jsonb)) e
    WHERE e->>'slot' = 'Logo' LIMIT 1;

    SELECT COALESCE(jsonb_agg(e->>'asset_key'), '[]'::jsonb) INTO v_sel_asset_keys
    FROM jsonb_array_elements(COALESCE(v_sel->'slot_resolution'->'selected', '[]'::jsonb)) e;

    v_prod_in_registry := EXISTS (
      SELECT 1 FROM c.creative_provider_template t
      WHERE t.provider_template_id = v_production_actual->>'provider_template_id');

    v_template_match   := COALESCE(v_sel->>'status' = 'ok' AND v_sel_ptid = v_prod_ptid, false);
    v_background_match := COALESCE(v_production_actual->>'background_key' = v_sel_bg_key, false);

    -- ── divergence: BYTE-EQUIVALENT IN BEHAVIOUR to the S0 CASE (incl. notes) ───
    v_divergence := jsonb_build_object(
      'primary_class', CASE
        WHEN v_sel->>'status' IS DISTINCT FROM 'ok' THEN 'selector_fail_closed'
        WHEN NOT v_prod_in_registry                 THEN 'expected_structural_divergence'
        WHEN NOT v_template_match                   THEN 'selector_disagreement'
        WHEN NOT v_background_match                 THEN 'background_divergence'
        ELSE 'agreement' END,
      'template_match',   v_template_match,
      'background_match', v_background_match,
      'asset_matches', jsonb_build_object(
        'production_asset_keys', v_production_actual->'asset_keys',
        'selector_asset_keys',   v_sel_asset_keys,
        'background_match',      v_background_match,
        'logo_match',            (v_sel_logo_key IS NOT NULL
                                  AND COALESCE(v_production_actual->'asset_keys', '[]'::jsonb) ? v_sel_logo_key)),
      'notes', CASE
        WHEN v_sel->>'status' IS DISTINCT FROM 'ok'
          THEN 'selector failed closed where production rendered: ' || COALESCE(v_sel->>'fail_reason', 'unknown')
        WHEN NOT v_prod_in_registry AND v_prod_ptid IS NULL
          THEN 'production render_spec carries no provider_template_id (older row) — classed structural'
        WHEN NOT v_prod_in_registry
          THEN 'production B1 template not in TMR registry'
        WHEN NOT v_template_match
          THEN 'production template is in the TMR registry but the selector picked a different template'
        WHEN NOT v_background_match
          THEN 'template agrees; background differs (B1 canonical rotation order vs resolver rank order — same FNV-1a hash, different index mapping)'
        ELSE 'selector and production agree on template and background' END);

    -- ── the ONLY write this function performs ────────────────────────────────────
    INSERT INTO c.tmr_shadow_decision
      (post_draft_id, render_log_id, client_id, platform, format, seed_used,
       selector_version, selector_output, production_actual, divergence,
       registry_context, batch_label)
    VALUES
      (r.post_draft_id, r.render_log_id, r.client_id, r.platform, c_format,
       r.post_draft_id::text, c_selector_version, v_sel, v_production_actual,
       v_divergence, v_registry_context, c_batch_label);

    v_stamped := v_stamped + 1;
  END LOOP;

  -- ── still-unshadowed pool rows AFTER this run (full pool, not the capped fetch) ─
  SELECT count(*) INTO v_remaining
  FROM m.post_render_log rl
  JOIN m.post_draft d ON d.post_draft_id = rl.post_draft_id
  WHERE rl.render_spec->>'label' = c_label
    AND rl.status = 'succeeded'
    AND rl.post_draft_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM c.tmr_shadow_decision sd
      WHERE sd.render_log_id = rl.render_log_id);

  RETURN jsonb_build_object(
    'run_at',               now(),
    'limit',                v_limit,
    'scanned',              v_scanned,
    'stamped',              v_stamped,
    'skipped_no_slug',      v_skipped_no_slug,
    'remaining_unshadowed', v_remaining);
END;
$$;

COMMENT ON FUNCTION public.stamp_tmr_shadow_forward(integer) IS
'S1 forward shadow stamper (Option A DB-native, PK-ratified Gate 1): scans m.post_render_log for succeeded creative_library_b1_production renders with no c.tmr_shadow_decision row yet (partial unique index on render_log_id = idempotency key), oldest-first, capped (default 20, clamp 1..100); per row calls public.select_template(seed=post_draft_id) and inserts one shadow row (batch_label s1-forward-v1, S0-equivalent divergence taxonomy). Writes ONLY the shadow table; shadow rows grant no status; consumed by nothing at runtime; runs nowhere near the render path. Selector fail-closed is DATA, not an error. Scheduling (pg_cron) is a SEPARATE PK gate — this function schedules nothing. Service-role-only.';

-- ── Grants: service-role-only (revoking PUBLIC alone is insufficient — name anon, authenticated) ──
REVOKE ALL ON FUNCTION public.stamp_tmr_shadow_forward(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stamp_tmr_shadow_forward(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stamp_tmr_shadow_forward(integer) TO service_role;
