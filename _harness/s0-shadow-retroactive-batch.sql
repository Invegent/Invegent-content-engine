-- =============================================================================
-- S0 SHADOW-MODE RETROACTIVE BATCH — TMR Shadow-Mode Stamping, Phase S0
-- _harness/s0-shadow-retroactive-batch.sql
--
-- Design:  docs/briefs/tmr-shadow-mode-stamping-design-packet.md
--          (§3b Phase S0 · §3c divergence taxonomy · §3d hard boundaries;
--           ratified Gate-1 decisions 1–6, registers v4.80)
-- Table:   supabase/migrations/20260703160000_create_tmr_shadow_decision_v1.sql
--          (MUST be applied first)
-- Probes:  _harness/s0-isolation-probes.sql — run PRE and POST this apply; every
--          value must be byte-identical (production-isolation invariant, design
--          packet §5, external-review requirement 2026-07-03).
--
-- WHAT IT DOES (when PK applies it — one transaction, all-or-nothing):
--   Walks the 17-render / 14-draft historical pool
--   (m.post_render_log where render_spec->>'label' = 'creative_library_b1_production',
--    status = 'succeeded', post_draft_id not null), calls
--   public.select_template('property-pulse', d.platform, 'image_quote', NULL,
--   seed = post_draft_id::text) per render event (ratified decision 6), and INSERTs
--   exactly 17 rows into c.tmr_shadow_decision — nothing else.
--
--   READS:  m.post_render_log, m.post_draft, c.client + the TMR registry tables
--           (via the STABLE read-only RPCs select_template / resolve_slot_assets)
--   WRITES: c.tmr_shadow_decision ONLY. No production table is written, no status
--           granted, no runtime consumer exists (design packet §3d).
--
-- DIVERGENCE TAXONOMY (ratified — first matching class wins):
--   selector_fail_closed            selector_output.status <> 'ok' where production rendered
--   expected_structural_divergence  production provider_template_id not in c.creative_provider_template
--                                   (the B1 template fb9820f8… is off-registry — dominant class;
--                                    rows whose render_spec lacks a provider_template_id also land
--                                    here, honestly noted)
--   selector_disagreement           both in registry, selector picked a different template
--   background_divergence           template agrees, background differs (B1 rotation order
--                                   [perth,brisbane,sydney] vs resolver rank order — same FNV-1a
--                                   hash, different index mapping; design packet §3c)
--   agreement                       template AND background agree
--
-- STALE-AT-COMPUTE SEMANTICS (design packet R2): the selector answers with TODAY's
--   registry state, not the state at render time. registry_context (computed ONCE,
--   stamped on every row) + computed_at record this honestly.
--
-- FAIL-LOUD ASSERTIONS (any failure aborts the whole transaction, zero rows kept):
--   · pre-assert: zero existing rows for batch_label 's0-retroactive-2026-07'
--   · pre-assert: zero existing shadow rows claiming any pool render_log_id
--   · pool-shape assert: exactly 17 renders, 14 distinct drafts, 0 null-draft rows
--     (verified live 2026-07-03 — drift means the world changed; STOP and re-verify)
--   · post-assert: GET DIAGNOSTICS row count = exactly 17
--   ON CONFLICT DO NOTHING is deliberately NOT used: the partial unique index on
--   render_log_id + the pre-asserts + the NOT EXISTS guard make any re-run abort
--   cleanly instead of silently skipping.
--
-- ROLLBACK: DELETE FROM c.tmr_shadow_decision WHERE batch_label = 's0-retroactive-2026-07';
--           (or DROP TABLE c.tmr_shadow_decision — see the table migration header)
--
-- ⛔ APPLY IS PK-GATED. PREPARED, NOT APPLIED. Do not run without explicit PK approval.
-- =============================================================================

BEGIN;

DO $s0$
DECLARE
  c_batch_label      CONSTANT text := 's0-retroactive-2026-07';
  c_selector_version CONSTANT text := 'select_template_v1@20260703035154';
  c_client_slug      CONSTANT text := 'property-pulse';
  c_format           CONSTANT text := 'image_quote';
  c_label            CONSTANT text := 'creative_library_b1_production';
  c_expected_renders CONSTANT int  := 17;
  c_expected_drafts  CONSTANT int  := 14;

  v_client_id        uuid;
  v_n                int;
  v_drafts           int;
  v_inserted         int;
  v_registry_context jsonb;
BEGIN
  -- ── 0. Resolve the client (c.client PK column is client_id) ──────────────────
  SELECT cl.client_id INTO v_client_id
  FROM c.client cl WHERE cl.client_slug = c_client_slug;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'S0 abort: client slug % not found in c.client', c_client_slug;
  END IF;

  -- ── 1. Pre-assert: the batch has never run (rollback key must be virgin) ─────
  SELECT count(*) INTO v_n
  FROM c.tmr_shadow_decision sd WHERE sd.batch_label = c_batch_label;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'S0 abort: % row(s) already carry batch_label % — re-run refused (rollback first: DELETE ... WHERE batch_label = %)',
      v_n, c_batch_label, c_batch_label;
  END IF;

  -- ── 2. Pool-shape assertions (verified live 2026-07-03: 17 / 14 / 0) ─────────
  SELECT count(*) INTO v_n
  FROM m.post_render_log rl
  WHERE rl.render_spec->>'label' = c_label
    AND rl.status = 'succeeded'
    AND rl.post_draft_id IS NULL;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'S0 abort: % null-draft rows in the pool (expected 0) — pool drifted since verification, STOP and re-verify', v_n;
  END IF;

  SELECT count(*), count(DISTINCT rl.post_draft_id) INTO v_n, v_drafts
  FROM m.post_render_log rl
  WHERE rl.render_spec->>'label' = c_label
    AND rl.status = 'succeeded'
    AND rl.post_draft_id IS NOT NULL;
  IF v_n <> c_expected_renders OR v_drafts <> c_expected_drafts THEN
    RAISE EXCEPTION 'S0 abort: pool is % renders / % distinct drafts (expected % / %) — pool drifted since verification, STOP and re-verify',
      v_n, v_drafts, c_expected_renders, c_expected_drafts;
  END IF;

  -- ── 3. Pre-assert: no shadow row already claims any pool render_log_id ───────
  SELECT count(*) INTO v_n
  FROM c.tmr_shadow_decision sd
  WHERE sd.render_log_id IN (
    SELECT rl.render_log_id
    FROM m.post_render_log rl
    WHERE rl.render_spec->>'label' = c_label
      AND rl.status = 'succeeded'
      AND rl.post_draft_id IS NOT NULL);
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'S0 abort: % shadow row(s) already reference pool render_log_ids (under a different batch_label?) — re-run refused', v_n;
  END IF;

  -- ── 4. registry_context: computed ONCE, stamped on every row (design packet R2)
  --      selectable = PP assignment at visually_approved+ AND carrying a passed
  --      visual_approval proof event (the select_template selectable definition).
  SELECT jsonb_build_object(
    'selectable_count', (
      SELECT count(*)
      FROM c.creative_template_client_assignment a
      WHERE a.client_id = v_client_id
        AND a.assignment_status IN ('visually_approved', 'client_enabled', 'production_proven')
        AND EXISTS (
          SELECT 1 FROM c.creative_template_proof_event p
          WHERE p.assignment_id = a.id
            AND p.proof_type   = 'visual_approval'
            AND p.proof_status = 'passed')),
    'proposed_count', (
      SELECT count(*)
      FROM c.creative_template_client_assignment a
      WHERE a.client_id = v_client_id
        AND a.assignment_status = 'proposed'),
    'visual_proofs', (
      SELECT count(*)
      FROM c.creative_template_proof_event p
      JOIN c.creative_template_client_assignment a ON a.id = p.assignment_id
      WHERE a.client_id = v_client_id
        AND p.proof_type   = 'visual_approval'
        AND p.proof_status = 'passed'),
    'computed_for_client_id', v_client_id,
    'semantics', 'registry state at compute time, NOT at render time (design packet R2)')
  INTO v_registry_context;

  -- ── 5. The batch: one INSERT..SELECT over the pool, divergence computed in SQL
  WITH pool AS (
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
  ),
  computed AS (
    SELECT
      p.*,
      -- ratified decision 6: seed = post_draft_id (mirrors B1's rotation input)
      public.select_template(c_client_slug, p.platform, c_format, NULL, p.post_draft_id::text) AS sel,
      -- production_actual: null-safe ->> extraction (older rows may lack contract fields)
      jsonb_build_object(
        'provider_template_id', p.render_spec->'template'->>'provider_template_id',
        'implementation_id',    p.render_spec->'template'->>'implementation_id',
        'template_family',      p.render_spec->'template'->>'template_family',
        'background_key',       p.render_spec->>'background_key',
        'asset_keys',           p.render_spec->'template'->'asset_keys',
        'variant_key',          p.render_spec->>'variant_key',
        'contract_ref',         p.render_spec->>'contract_ref',
        'rendered_at',          p.rendered_at) AS production_actual
    FROM pool p
  ),
  classified AS (
    SELECT
      c2.*,
      (c2.production_actual->>'provider_template_id') AS prod_ptid,
      (c2.sel->'selected'->>'provider_template_id')   AS sel_ptid,
      (SELECT e->>'asset_key'
         FROM jsonb_array_elements(COALESCE(c2.sel->'slot_resolution'->'selected', '[]'::jsonb)) e
        WHERE e->>'slot' = 'Background' LIMIT 1)      AS sel_bg_key,
      (SELECT e->>'asset_key'
         FROM jsonb_array_elements(COALESCE(c2.sel->'slot_resolution'->'selected', '[]'::jsonb)) e
        WHERE e->>'slot' = 'Logo' LIMIT 1)            AS sel_logo_key,
      (SELECT COALESCE(jsonb_agg(e->>'asset_key'), '[]'::jsonb)
         FROM jsonb_array_elements(COALESCE(c2.sel->'slot_resolution'->'selected', '[]'::jsonb)) e)
                                                      AS sel_asset_keys,
      EXISTS (SELECT 1 FROM c.creative_provider_template t
              WHERE t.provider_template_id = c2.production_actual->>'provider_template_id')
                                                      AS prod_in_registry
    FROM computed c2
  ),
  final AS (
    SELECT
      k.*,
      COALESCE(k.sel->>'status' = 'ok' AND k.sel_ptid = k.prod_ptid, false)              AS template_match,
      COALESCE(k.production_actual->>'background_key' = k.sel_bg_key, false)             AS background_match
    FROM classified k
  )
  INSERT INTO c.tmr_shadow_decision
    (post_draft_id, render_log_id, client_id, platform, format, seed_used,
     selector_version, selector_output, production_actual, divergence,
     registry_context, batch_label)
  SELECT
    f.post_draft_id,
    f.render_log_id,
    f.client_id,
    f.platform,
    c_format,
    f.post_draft_id::text,
    c_selector_version,
    f.sel,
    f.production_actual,
    jsonb_build_object(
      'primary_class', CASE
        WHEN f.sel->>'status' IS DISTINCT FROM 'ok' THEN 'selector_fail_closed'
        WHEN NOT f.prod_in_registry                 THEN 'expected_structural_divergence'
        WHEN NOT f.template_match                   THEN 'selector_disagreement'
        WHEN NOT f.background_match                 THEN 'background_divergence'
        ELSE 'agreement' END,
      'template_match',   f.template_match,
      'background_match', f.background_match,
      'asset_matches', jsonb_build_object(
        'production_asset_keys', f.production_actual->'asset_keys',
        'selector_asset_keys',   f.sel_asset_keys,
        'background_match',      f.background_match,
        'logo_match',            (f.sel_logo_key IS NOT NULL
                                  AND COALESCE(f.production_actual->'asset_keys', '[]'::jsonb) ? f.sel_logo_key)),
      'notes', CASE
        WHEN f.sel->>'status' IS DISTINCT FROM 'ok'
          THEN 'selector failed closed where production rendered: ' || COALESCE(f.sel->>'fail_reason', 'unknown')
        WHEN NOT f.prod_in_registry AND f.prod_ptid IS NULL
          THEN 'production render_spec carries no provider_template_id (older row) — classed structural'
        WHEN NOT f.prod_in_registry
          THEN 'production B1 template not in TMR registry'
        WHEN NOT f.template_match
          THEN 'production template is in the TMR registry but the selector picked a different template'
        WHEN NOT f.background_match
          THEN 'template agrees; background differs (B1 canonical rotation order vs resolver rank order — same FNV-1a hash, different index mapping)'
        ELSE 'selector and production agree on template and background' END),
    v_registry_context,
    c_batch_label
  FROM final f
  WHERE NOT EXISTS (
    SELECT 1 FROM c.tmr_shadow_decision sd WHERE sd.render_log_id = f.render_log_id);

  -- ── 6. Post-assert: exactly 17 rows inserted, or the whole transaction dies ──
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted <> c_expected_renders THEN
    RAISE EXCEPTION 'S0 abort: inserted % row(s), expected exactly % — transaction rolled back, zero rows kept',
      v_inserted, c_expected_renders;
  END IF;

  RAISE NOTICE 'S0 batch %: inserted % shadow rows (selector_version %)',
    c_batch_label, v_inserted, c_selector_version;
END
$s0$;

COMMIT;
