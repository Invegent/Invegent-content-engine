-- Migration: ws4_d4_pp_yt_kinetic_registration_v1
-- WS-4/WS-5 D4 — Governed PP YouTube kinetic (video_short_kinetic) template-mode graduation.
--
-- Brief:   task instructions for this lane (ef-builder, 2026-08-01), grounded in
--          docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md (§4-§9, §5e) and
--          docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md (WS-5 capture +
--          PK rung-6 visual approval, proof event 2ccdb697-0553-46e6-bc97-e4ef9d79fb49).
-- Precedent pattern: supabase/migrations/20260719010800_video_d6_lane2_register_pp_video_short_stat_
--          mapping.sql (the sibling governed video format's own registration migration — read in full
--          before drafting this one).
--
-- WHAT THIS DOES (exactly the 3 items named in the ef-builder brief — nothing more):
--   1. c.creative_template_variant_candidate — maps template 9ad024cc… (the WS-5-captured registry
--      row; provider_template_id 0bd871ae… is the Creatomate object UUID) → format_key
--      'video_short_kinetic'. ON CONFLICT (template_id, variant_key) DO NOTHING.
--   2. c.creative_template_client_assignment — the PP (Property Pulse) client assignment for that
--      template. No unique key on this table (per the stat precedent) → NOT EXISTS guard.
--      assignment_status = 'visually_approved', reflecting PK's actual rung-6 verdict (WS-5 result
--      doc "PK VISUAL VERDICT" section) — see the OPEN GAP note below for what this does NOT yet wire.
--   3. c.client_creative_governance — the (PP, video_short_kinetic) governance row did NOT exist
--      (confirmed live via ice_ro.asset_governance_status, 2026-08-01 — PP has rows for image_quote
--      and video_short_stat only). Inserted here with enabled=FALSE (DARK) — see the deliberate
--      DEVIATION note below (the brief asked for enabled=true; this migration does NOT do that).
--
-- c.creative_template_platform_suitability — CHECKED, NOT TOUCHED. The WS-5 result doc records the
--   capture already wrote 1 suitability row for this template (platform='youtube', placement=
--   'default', suitability_status='candidate') as part of the same capture pass that wrote the 26
--   field-constraint rows. Per the D6 Lane 2 precedent (creative-registry-integrity-graduation-
--   contract-v1.md, house note), 'candidate' is SUFFICIENT for select_template eligibility — it
--   yields the advisory 'platform_suitability_unproven' warning, not a reject. This migration does
--   NOT insert a duplicate row and does NOT elevate the status. DISPOSITION: leave as-is.
--   (NOTE: this migration's own author could not independently re-query this row through the
--   confined ice_ro read-only path used to verify the other two facts above — c.* tables are not
--   exposed through it. This disposition is taken on the WS-5 result doc's own written record, not a
--   fresh live read; db-rls-auditor should re-verify directly against c.creative_template_platform_
--   suitability before this migration is approved for apply.)
--
-- ⚠ OPEN GAP — NAMED, NOT SILENTLY RESOLVED (found while drafting this migration, 2026-08-01) ⚠
--   The 3 inserts above alone do NOT make video_short_kinetic selectable by public.select_template.
--   Live-read confirmation (ice_ro.template_registry_status, 2026-08-01):
--     c.creative_provider_template.status for id 9ad024cc… is currently 'inventory_captured'.
--   select_template's live function body (pg_get_functiondef, read 2026-08-01) hard-rejects any
--   candidate whose status is NOT IN ('smoke_rendered','visually_approved','platform_safe',
--   'client_enabled','production_proven') — reason_code 'status_below_smoke'. The sibling stat
--   migration (20260719010800) INCLUDED exactly this promotion as its own step 2a
--   (UPDATE ... SET status='visually_approved' WHERE status='governance_reviewed'), which this
--   migration's brief did NOT ask for and therefore does NOT include.
--   SECOND gap: select_template ALSO requires a c.creative_template_proof_event row with
--   proof_type='visual_approval', proof_status='passed', tied to THIS assignment's assignment_id
--   (not just the template). WS-5's existing rung-6 approval (proof event 2ccdb697…) is recorded at
--   the TEMPLATE level, explicitly BEFORE any client_assignment row existed ("template-level approval
--   anchors the verdict + evidence" — WS-5 result doc) — it is NOT yet linked to the assignment row
--   this migration creates. The stat precedent's own step 2e inserted exactly this linking row; this
--   migration's brief did not ask for it either.
--   NET EFFECT IF THIS ROW WERE enabled=true (as the brief literally asked): the video-worker
--   governance gate would fire for EVERY PP video_short_kinetic draft, routing it into the new
--   governed branch with NO legacy fallback (by design). That branch would immediately hit
--   `tmr_video_selector_fail_closed` (reason 'status_below_smoke', or 'not_visually_proven' if status
--   is separately promoted without the proof-event linkage) — video_status='failed'. Today, WITHOUT
--   this migration, PP video_short_kinetic drafts render successfully via the proven LEGACY isKinetic
--   path. Setting enabled=true here would therefore turn a WORKING format into a FAILING one the
--   moment this migration + the code change both ship — a real regression, not a neutral dark-ship.
--
--   ⚠ DELIBERATE DEVIATION FROM THE LITERAL BRIEF, NAMED HERE ⚠ — the brief's Task 2 instructions
--   said to insert this row with enabled=true if absent ("your code's gate is fail-closed without it,
--   so the migration and the code change must agree"). This migration instead inserts it
--   enabled=FALSE (DARK), mirroring the exact DARK-first phasing this repo already uses for this
--   reason (c.client_creative_governance's OWN original seed migration,
--   20260709010032_seed_client_creative_governance_video_short_stat_v1.sql, shipped
--   video_short_stat enabled=false and was flipped true only AFTER the template was fully registered
--   and the first governed render was proven). Code and migration still AGREE under this deviation —
--   they agree the gate stays CLOSED (safe fallback to the proven legacy path) until the status
--   promotion + proof-event linkage above are separately completed and a real governed kinetic render
--   is proven, at which point flipping this ONE row's `enabled` to true (a tiny, reviewable, separately
--   PK-gated DML) activates the branch. This is flagged prominently for db-rls-auditor / orchestrator /
--   PK to override explicitly if enabled=true is actually wanted despite the gap.
--
-- SECURITY POSTURE — unchanged by this migration. All three tables already exist (WS-5 Phase 1/
--   spine-generalisation lanes) with their established RLS/grant posture; this migration performs
--   INSERT only, no DDL, no GRANT/REVOKE.
--
-- ⛔ APPLY IS PK-GATED. PREPARED, NOT APPLIED — a local draft for db-rls-auditor / apply-harness-
--    auditor / external review / PK approval. No deploy, no push, no apply in this lane.
--
-- ROLLBACK (reference only — NOT executed by this migration). PROVENANCE-QUALIFIED (Fix 2,
-- 2026-08-02, apply-harness-auditor shadow finding — advisory, no issue found with the DARK-safety
-- assertion itself). The ORIGINAL draft's variant_candidate/client_assignment DELETEs were
-- identity-only (template_id/client_id/variant_key) — unlike the governance-row DELETE, which already
-- cites an explicit prior live-read absence confirmation (ice_ro.asset_governance_status, 2026-08-01,
-- see item 3 above), this build step's confined read-only path (db-read.py / ice_ro views) CANNOT
-- independently confirm c.creative_template_variant_candidate / c.creative_template_client_assignment's
-- pre-apply absence the same way — those two tables are not exposed through any R0 view (same
-- limitation already named for platform_suitability above). An identity-only DELETE run in good faith
-- after some future, unrelated process happened to insert a same-identity row would silently delete
-- a row this migration never created. FIX: every DELETE below is additionally qualified on the EXACT
-- literal text this migration's own INSERT writes (fit_reason / style_guide_reference — content only
-- this migration would produce) plus its reviewed_by/approved_by = 'PK', so the rollback can never
-- touch a row it did not create, regardless of pre-apply state. The governance-row DELETE adds the
-- same render_label match purely for pattern-consistency across all three (belt-and-braces — its
-- absence WAS independently live-confirmed, so this qualifier is not load-bearing for that one).
--   DELETE FROM c.client_creative_governance
--     WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND format = 'video_short_kinetic'
--       AND render_label = 'creative_library_video_kinetic_production';
--   DELETE FROM c.creative_template_client_assignment
--     WHERE template_id = '9ad024cc-3eda-488e-b346-bc661ec70a6a'
--       AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
--       AND approved_by = 'PK'
--       AND style_guide_reference = 'docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md (video_short_kinetic)';
--   DELETE FROM c.creative_template_variant_candidate
--     WHERE template_id = '9ad024cc-3eda-488e-b346-bc661ec70a6a'
--       AND variant_key = 'kinetic-typography-9x16-video-v1'
--       AND reviewed_by = 'PK'
--       AND fit_reason = 'WS-4/WS-5 D4 — 3-point/26-element hook-point-cta kinetic template, PK ruling ff5cacb (3-slot design STANDS), rung-6 visual approval on proof event 2ccdb697';
--
-- Low-severity item (apply-harness-auditor, optional, noted not fixed): the in-txn regression guard
-- (item iv below) compares PP video_short_stat's winner against an external hardcoded literal UUID
-- rather than an in-txn BEFORE/AFTER snapshot — it still fail-closes correctly on any drift, it just
-- cannot distinguish "this migration broke it" from "it already drifted before this transaction
-- started." DECISION: left as-is — a before-snapshot would need an extra SELECT INTO at the top of
-- the DO block purely to diff against itself 20 lines later, for a distinction (this-migration-caused
-- vs. pre-existing drift) that doesn't change the correct action either way (RAISE EXCEPTION, abort).
-- Not worth the added complexity for this migration's narrow blast radius (INSERT-only, 3 tables).

DO $$
DECLARE
  v_template uuid := '9ad024cc-3eda-488e-b346-bc661ec70a6a';  -- WS-5-captured registry row (provider_template_id 0bd871ae…)
  v_client   uuid := '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';  -- Property Pulse (PP)
  v_assign   uuid;
BEGIN
  -- 1. variant candidate: maps video_short_kinetic -> this template (UNIQUE template_id, variant_key)
  INSERT INTO c.creative_template_variant_candidate
    (template_id, format_key, variant_key, fit_status, fit_reason, reviewed_by, reviewed_at)
  VALUES (v_template, 'video_short_kinetic', 'kinetic-typography-9x16-video-v1', 'strong_candidate',
          'WS-4/WS-5 D4 — 3-point/26-element hook-point-cta kinetic template, PK ruling ff5cacb (3-slot design STANDS), rung-6 visual approval on proof event 2ccdb697', 'PK', now())
  ON CONFLICT (template_id, variant_key) DO NOTHING;

  -- 2. client assignment (no unique key on this table -> guard NOT EXISTS, matches the stat precedent)
  IF NOT EXISTS (SELECT 1 FROM c.creative_template_client_assignment
                 WHERE template_id = v_template AND client_id = v_client) THEN
    INSERT INTO c.creative_template_client_assignment
      (template_id, client_id, assignment_scope, assignment_status, style_guide_reference, approved_by, approved_at)
    VALUES (v_template, v_client, 'client_allowed', 'visually_approved',
            'docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md (video_short_kinetic)', 'PK', now());
  END IF;
  SELECT id INTO v_assign FROM c.creative_template_client_assignment
   WHERE template_id = v_template AND client_id = v_client;

  -- 3. governance row (PP, video_short_kinetic) -- confirmed NOT present (ice_ro.asset_governance_
  --    status live read, 2026-08-01: PP has image_quote + video_short_stat only). enabled=FALSE
  --    (DARK) -- see the DELIBERATE DEVIATION note in this file's header: the brief asked for
  --    enabled=true, but the template is not yet selector-reachable (status_below_smoke / no
  --    assignment-scoped proof event), so enabled=true would break currently-working PP kinetic
  --    drafts by routing them into a fail-loud governed branch with no fallback. UNIQUE(client_id,
  --    format) makes ON CONFLICT DO NOTHING the correct guard (a real unique constraint exists here,
  --    unlike the client_assignment table above).
  INSERT INTO c.client_creative_governance
    (client_id, format, contract_ref, declarative_registry_ref, render_label, enabled)
  VALUES
    (v_client,
     'video_short_kinetic',
     NULL,  -- no vendored capability_contracts[] entry for kinetic yet (D6-7 pattern: video governance
            -- has moved away from contract_ref -- b1_video_stat.ts's own evidence carries none either)
     'property-pulse.json',
     'creative_library_video_kinetic_production',
     false)
  ON CONFLICT (client_id, format) DO NOTHING;

  -- ── IN-TXN ASSERTIONS (ROLLBACK on any breach) ─────────────────────────────────────
  -- (i) structural: both new rows exist after insert.
  IF v_assign IS NULL THEN
    RAISE EXCEPTION 'WS4D4 REGISTRATION FAILED: no client_assignment row for template=% client=%', v_template, v_client;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM c.creative_template_variant_candidate
                 WHERE template_id = v_template AND format_key = 'video_short_kinetic') THEN
    RAISE EXCEPTION 'WS4D4 REGISTRATION FAILED: no variant_candidate row for template=% format=video_short_kinetic', v_template;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM c.client_creative_governance
                 WHERE client_id = v_client AND format = 'video_short_kinetic') THEN
    RAISE EXCEPTION 'WS4D4 REGISTRATION FAILED: governance row for PP/video_short_kinetic missing';
  END IF;
  -- DARK-by-design assertion (see the DELIBERATE DEVIATION note above): this migration must NOT ship
  -- the gate open. If a future edit of this file ever flips this INSERT's `enabled` literal without
  -- also removing/updating this assertion, this catches the mismatch rather than silently shipping a
  -- live-breaking activation.
  IF EXISTS (SELECT 1 FROM c.client_creative_governance
             WHERE client_id = v_client AND format = 'video_short_kinetic' AND enabled = true) THEN
    RAISE EXCEPTION 'WS4D4 SAFETY ASSERTION FAILED: governance row for PP/video_short_kinetic is enabled=true -- this migration is designed to ship DARK (enabled=false) until the status/proof-event gap above is separately closed and proven';
  END IF;

  -- (ii) KNOWN-GAP DOCUMENTING ASSERTION (not a failure condition): confirm select_template still
  -- correctly fail-closes PP/video_short_kinetic today, on one of the two NAMED reasons this
  -- migration's header documents (status_below_smoke on the template row, OR not_visually_proven once
  -- status is separately promoted). If select_template ever returns 'ok' here, OR fails for any OTHER
  -- reason, something has changed outside this migration's understanding -- RAISE rather than silently
  -- assume the gap is unaffected.
  DECLARE
    v_sel jsonb;
    v_reason text;
  BEGIN
    v_sel := public.select_template('property-pulse', 'youtube', 'video_short_kinetic', NULL, 'ws4d4-migration-gate');
    v_reason := v_sel #>> '{rejected,0,reason_code}';
    IF (v_sel ->> 'status') = 'ok' THEN
      RAISE EXCEPTION 'WS4D4 UNEXPECTED: video_short_kinetic now resolves ok -- the named status/proof-event gap in this migration''s header is STALE, re-verify before treating this migration as complete: %', v_sel;
    ELSIF (v_sel ->> 'status') IS DISTINCT FROM 'fail_closed' OR v_reason IS NULL OR v_reason NOT IN ('status_below_smoke', 'not_visually_proven') THEN
      RAISE EXCEPTION 'WS4D4 UNEXPECTED REJECTION REASON (expected status_below_smoke or not_visually_proven): %', v_sel;
    END IF;
  END;

  -- (iii) pool-neutrality / cross-brand: NDIS must NOT resolve this PP-owned client template.
  IF (public.select_template('ndis-yarns', 'youtube', 'video_short_kinetic', NULL, 'ws4d4-neutral')->>'status') <> 'fail_closed' THEN
    RAISE EXCEPTION 'WS4D4 CROSS-BRAND BLEED: ndis-yarns resolved video_short_kinetic';
  END IF;

  -- (iv) regression: PP video_short_stat winner unchanged (this migration must not touch the sibling
  -- governed video format's selector output at all).
  -- CORRECTED 2026-08-02 (first apply attempt tripped this on a STALE literal): the value
  -- 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab' captured at authoring time (2026-08-01) was already stale
  -- — PP's live winner had been 46c5c4ac-4d35-488c-b57c-44e05d790fb9 since 2026-07-28 (the
  -- independently-landed, already-proven B-roll PARITY activation; c11bb8ab is now a fallback
  -- alternative, registry row a3d8472d…, created 2026-07-09). Live-reconfirmed 2026-08-02 via
  -- public.select_template('property-pulse', NULL, 'video_short_stat', ...) and
  -- c.creative_provider_template (both rows), independently, before this correction — PK-authorized
  -- fix, unrelated to and not caused by this migration. Known limitation (apply-harness-auditor,
  -- 2026-08-02, low severity): this assertion compares against an external literal rather than an
  -- in-txn BEFORE snapshot, so it cannot distinguish "this migration caused it" from "already
  -- drifted" — it correctly fail-closed on the stale value; the fix is only the literal, not the
  -- assertion's logic or the migration's actual INSERTs (byte-unchanged).
  IF (public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'ws4d4-regress')
        #>> '{selected,provider_template_id}') IS DISTINCT FROM '46c5c4ac-4d35-488c-b57c-44e05d790fb9' THEN
    RAISE EXCEPTION 'WS4D4 REGRESSION: PP video_short_stat provider_template_id changed';
  END IF;
END $$;
