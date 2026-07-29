-- ================================================================================================
-- GIT-HISTORY RECONCILIATION RECORD — NOT executable greenfield DDL.
-- ================================================================================================
-- This migration was ALREADY APPLIED to the live database (project mbkmaxqhsohbtwsqolns) before
-- this file existed in git. It is added here so the git-tracked migration history matches reality
-- (per the standing rule in CLAUDE.md / memory note migration-ledger-git-drift). Writing this file
-- performs NO database mutation.
--
-- WHAT THIS RECORDS: "B-roll Platform Suitability (facebook + instagram) v1" — 2 rows INSERTed
-- into c.creative_template_platform_suitability for template dd5fd75e (provider 46c5c4ac):
-- facebook/feed/candidate and instagram/feed/candidate. This repoints selector eligibility so fb/ig
-- callers (none exist in production today) would resolve the governed B-roll template instead of
-- the incumbent. NO DDL.
--
-- VERSION CHOSEN (20260729071004): the live `created_at`/`updated_at` timestamp on both inserted
-- rows — `2026-07-29 07:10:04.120513+00`, confirmed by db-rls-auditor read against live state
-- during this reconciliation lane (2026-07-29). No `supabase_migrations.schema_migrations` ledger
-- row exists for this apply (executed via a direct `execute_sql` call, not `apply_migration`).
--
-- SOURCE (byte-exact copy, zero changes below the "BEGIN;" line):
--   docs/briefs/artifacts/broll-suitability-fb-ig-v1-forward.sql
--   (git-tracked since commit c8e4fad / packet docs/briefs/broll-suitability-fb-ig-v1-apply-packet.md)
--
-- GROUNDING EVIDENCE (re-verified live 2026-07-29 by db-rls-auditor during this reconciliation):
--   * c.creative_template_platform_suitability WHERE template_id = 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2'
--     shows EXACTLY 2 rows: (facebook, feed, candidate) and (instagram, feed, candidate), both
--     created_at = updated_at = 2026-07-29 07:10:04.120513+00 — exact match to this file's post-state.
--   * Production result record: docs/briefs/results/broll-suitability-fb-ig-v1-result.md
--     (register v6.60) — all eight guards (G0-G7) recorded PASSED; production p_platform=NULL winner
--     verified unchanged; explicitly ZERO live production effect today (no caller passes an explicit
--     platform for video_short_stat — see §5 of that result doc).
--   * Production register: docs/00_sync_state.md v6.60 entry.
--
-- ⚠ REPLAY WARNING: this file is SELF-GUARDING, not inert. Its G1 pre-state check ("expected 0
-- existing suitability rows for this template") will RAISE EXCEPTION and abort cleanly if run
-- against the CURRENT live state, because the 2 rows it inserts already exist. This is the CORRECT
-- and EXPECTED behavior for a reconciliation record: it cannot be silently re-applied (nor would it
-- silently duplicate rows even without the guard, since PK access to this template's suitability set
-- is read as an exact 2-row set downstream). Do not "fix" the guard to make this file re-runnable;
-- do not use this file as a template for a NEW change.
-- ================================================================================================

-- ============================================================================
-- B-roll platform suitability (facebook + instagram) v1 — FORWARD
-- Lane: broll-suitability-fb-ig-v1 · T3 · PRODUCT_PROOF
-- PK instruction 2026-07-29: "Add the suitability row for 46c5c4ac"
--
-- WHAT: INSERT 2 rows into c.creative_template_platform_suitability for
--       template dd5fd75e (provider 46c5c4ac), platforms facebook + instagram,
--       placement 'feed', suitability_status 'candidate'.
--
-- EFFECT: this is a REPOINT at facebook/instagram — those platforms move from the
--         incumbent (video_stat_reveal_9x16_v2) to the B-roll template. TPR-1 +
--         Addendum v1 three-surface effective-spec diff: specs_match = TRUE
--         (both render 1080x1920/12s; incoming via the render-time parity overlay).
--         Production (p_platform=NULL) is UNAFFECTED — the selector's suitability
--         gate only runs when p_platform IS NOT NULL.
--
-- DELIBERATELY NOT ADDED (each its own decision, see packet):
--   * linkedin — the asset platform_scope excludes it, so a suitability row would
--     declare li-suitable while assets block it: a misleading declared control.
--   * youtube  — NO template currently has a youtube suitability row. Adding one
--     would newly enable youtube video selection, and youtube-publisher is
--     schedule-blind auto-publish. Requires an explicit separate PK decision.
--
-- NO DDL. NO GRANT. No template/resolver/asset/fence/fit_status/code/deploy change.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  c_tid       CONSTANT uuid := 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  c_incumbent CONSTANT text := 'video_stat_reveal_9x16_v2';
  c_broll     CONSTANT text := 'AU_generic_national_Suburb_9:16_V1';

  v_n            int;
  v_pre_rows     int;
  v_post_rows    int;
  v_bad          int;
  v_before_null  jsonb;
  v_after_null   jsonb;
  v_li           text;
  v_yt           text;
  v_fb           text;
  v_ig           text;
BEGIN
  -- G0 — arm atomicity BEFORE any write.
  PERFORM set_config('ice.apply_txid', txid_current()::text, TRUE);
  IF current_setting('ice.apply_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED: atomicity guard could not be armed — refusing to write';
  END IF;

  -- G1 — pre-state: this template must have ZERO suitability rows (refuses a state
  -- this packet did not freeze; also makes the apply non-idempotent-by-accident).
  SELECT count(*) INTO v_pre_rows
    FROM c.creative_template_platform_suitability WHERE template_id = c_tid;
  IF v_pre_rows <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: expected 0 existing suitability rows for %, found % — state drifted, refusing to write',
      c_tid, v_pre_rows;
  END IF;

  -- Baseline production-signature selection BEFORE the write (for G4).
  v_before_null := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'apply-invariance-probe');

  -- ---- THE CHANGE -------------------------------------------------------
  INSERT INTO c.creative_template_platform_suitability
    (template_id, platform, placement, suitability_status, reason)
  VALUES
    (c_tid, 'facebook',  'feed', 'candidate',
     'B-roll footage 9x16 governed video_short_stat. Output parity with the incumbent via the render-time parity overlay (video-worker v3.15.0); TPR-1 Addendum v1 effective-spec diff specs_match=true. Platform-unproven.'),
    (c_tid, 'instagram', 'feed', 'candidate',
     'B-roll footage 9x16 governed video_short_stat. Output parity with the incumbent via the render-time parity overlay (video-worker v3.15.0); TPR-1 Addendum v1 effective-spec diff specs_match=true. Platform-unproven.');
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- G2 — exactly 2 rows inserted.
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'G2 FAILED: expected exactly 2 rows inserted, got % — refusing to commit', v_n;
  END IF;

  -- G3 — post-state is exactly the 2 intended rows and nothing else.
  SELECT count(*) INTO v_post_rows
    FROM c.creative_template_platform_suitability WHERE template_id = c_tid;
  IF v_post_rows <> 2 THEN
    RAISE EXCEPTION 'G3 FAILED: expected exactly 2 suitability rows for this template, found % — refusing to commit', v_post_rows;
  END IF;

  SELECT count(*) INTO v_bad
    FROM c.creative_template_platform_suitability
   WHERE template_id = c_tid
     AND (platform NOT IN ('facebook','instagram')
          OR placement <> 'feed'
          OR suitability_status <> 'candidate');
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'G3 FAILED: % row(s) deviate from (facebook|instagram, feed, candidate) — refusing to commit', v_bad;
  END IF;

  -- G4 — PRODUCTION-SIGNATURE INVARIANCE. video-worker calls with p_platform=NULL;
  -- the suitability gate must remain skipped there, so selection must be unchanged.
  v_after_null := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'apply-invariance-probe');
  IF (v_before_null->'selected'->>'provider_template_name')
     IS DISTINCT FROM (v_after_null->'selected'->>'provider_template_name') THEN
    RAISE EXCEPTION 'G4 FAILED: production-signature winner CHANGED from % to % — refusing to commit',
      COALESCE(v_before_null->'selected'->>'provider_template_name','(none)'),
      COALESCE(v_after_null->'selected'->>'provider_template_name','(none)');
  END IF;
  IF (v_after_null->'selected'->>'provider_template_name') IS DISTINCT FROM c_broll THEN
    RAISE EXCEPTION 'G4 FAILED: production winner is "%" but must remain "%" — refusing to commit',
      COALESCE(v_after_null->'selected'->>'provider_template_name','(none)'), c_broll;
  END IF;

  -- G5 — the INTENDED repoint actually took at facebook + instagram.
  v_fb := public.select_template('property-pulse','facebook','video_short_stat',NULL,'apply-invariance-probe')->'selected'->>'provider_template_name';
  v_ig := public.select_template('property-pulse','instagram','video_short_stat',NULL,'apply-invariance-probe')->'selected'->>'provider_template_name';
  IF v_fb IS DISTINCT FROM c_broll OR v_ig IS DISTINCT FROM c_broll THEN
    RAISE EXCEPTION 'G5 FAILED: expected % at facebook and instagram, got fb=% ig=% — refusing to commit',
      c_broll, COALESCE(v_fb,'(none)'), COALESCE(v_ig,'(none)');
  END IF;

  -- G6 — NO LEAKAGE to linkedin: must still resolve the incumbent.
  v_li := public.select_template('property-pulse','linkedin','video_short_stat',NULL,'apply-invariance-probe')->'selected'->>'provider_template_name';
  IF v_li IS DISTINCT FROM c_incumbent THEN
    RAISE EXCEPTION 'G6 FAILED: linkedin resolved "%" but must remain the incumbent "%" — refusing to commit',
      COALESCE(v_li,'(none)'), c_incumbent;
  END IF;

  -- G7 — NO youtube ENABLEMENT: must still select nothing (youtube-publisher is
  -- schedule-blind auto-publish; silently opening it would be a publish-surface change).
  v_yt := public.select_template('property-pulse','youtube','video_short_stat',NULL,'apply-invariance-probe')->'selected'->>'provider_template_name';
  IF v_yt IS NOT NULL THEN
    RAISE EXCEPTION 'G7 FAILED: youtube newly selected "%" but must remain unselectable — refusing to commit', v_yt;
  END IF;

  -- G0 re-assert.
  IF current_setting('ice.apply_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED (post): transaction identity changed mid-apply — refusing to commit';
  END IF;

  RAISE NOTICE 'APPLY OK: 2 suitability rows (fb,ig); production winner unchanged; fb+ig repointed to B-roll; linkedin incumbent; youtube still unselectable';
END $$;

COMMIT;
