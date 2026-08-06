-- NOT_APPLIED_m16_pool_health_option_c_and_b_v1.sql
-- =====================================================================
-- M16 — POOL-HEALTH DECAY VISIBILITY (Option C) + FORMAT-SPECIFIC FITNESS
--   GATE (Option B)  —  author-only, ISOLATED WORKTREE — NOT APPLIED
-- =====================================================================
-- STATUS: NOT YET APPLIED. This file is authored on an isolated build branch
--   (lane/m16-pool-health-fix-build) per the PK build-acceleration ruling
--   (docs/briefs/cgu-final-build-acceleration-ruling-v1.md). It is prefixed
--   NOT_APPLIED_ deliberately so no migration runner / apply tool ever sweeps
--   it up. Apply requires: db-rls-auditor review, ChatGPT external review
--   pinned to this file's hash, and an explicit PK deploy/apply gate per
--   CLAUDE.md. NOTHING in this file has been run against any database.
--
-- Governing diagnosis: docs/briefs/results/s1-m16-cfw-pool-starvation-diagnosis-v1.md
-- Live baselines (ground truth this file modifies, read 2026-08-06):
--   docs/briefs/artifacts/m16-live-baseline-check_pool_health-v1.sql
--   docs/briefs/artifacts/m16-live-baseline-fill_pending_slots-v1.sql
-- Fleet-relevance (W-1/NDIS) analysis — separate doc, read-only, nothing
--   applied: docs/briefs/artifacts/m16-w1-fleet-relevance-analysis-v1.md
--
-- SCOPE DISCIPLINE (per S1 §"Fix the health-check blind spot" / brief):
--   SECTION 1 (Option C) touches ONLY m.check_pool_health(integer).
--   SECTION 2 (Option B) touches ONLY m.fill_pending_slots(integer), and only
--     its two effective_fitness/eff_fit expressions. No other line of either
--     806-line/73-line function body is altered. Both are CREATE OR REPLACE,
--     which preserves existing grants/ACLs (standing repo gotcha) — no
--     REVOKE/GRANT statement is included or needed; there is no positive
--     evidence current grants need to change.
--   Both fixes are CLIENT-AGNOSTIC / GENERAL: neither adds a client_id
--     parameter nor any CFW-specific (or NDIS-specific) literal. Both operate
--     purely on p_vertical_id / the existing per-slot v_chosen_format exactly
--     as today's functions do.
--   No schema change, no new column, no migration beyond these two function
--     bodies. Nothing here writes; check_pool_health remains STABLE/read-only.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — OPTION C: m.check_pool_health(integer)
-- =====================================================================
-- WHAT CHANGED vs the live baseline
-- (docs/briefs/artifacts/m16-live-baseline-check_pool_health-v1.sql):
--
--   The old function measured ONLY raw active-row count + source diversity.
--   It had zero visibility into (a) body-fetch health (fetch_status/length/
--   word_count on f.canonical_content_body) or (b) reuse-decay (the
--   t.reuse_penalty_curve multiplier applied at selection time in
--   m.fill_pending_slots). A pool can be raw-active-healthy (many rows,
--   many sources) while being entirely UNUSABLE by fill_pending_slots
--   because every fresh row fails the body-health gate and every reused row
--   has decayed below any sane fitness floor — CFW's exact live shape.
--
--   New signal added, computed over the SAME m.signal_pool rows for
--   p_vertical_id (no new join outside what fill_pending_slots' own
--   candidate_pool CTE already does):
--     body_health_pass  — EXISTS a f.canonical_content_body row for this
--       canonical_id with fetch_status='success' AND
--       LENGTH(TRIM(extracted_text))>=200 AND COALESCE(word_count,0)>=300.
--       This predicate is copied VERBATIM from fill_pending_slots'
--       candidate_pool CTE (baseline file lines ~496-502) so the two
--       functions agree on what "usable" means — no independent redefinition.
--     reuse_multiplier  — COALESCE(t.reuse_penalty_curve.fitness_multiplier,
--       1.0), joined the SAME way fill_pending_slots joins it (reuse_count
--       BETWEEN reuse_count_min AND reuse_count_max, is_current=true).
--
--   New derived counters:
--     v_body_health_pass  — COUNT(active AND body_health_pass)
--     v_active_usable      — COUNT(active AND body_health_pass AND
--                             reuse_multiplier >= 0.75)
--       The 0.75 floor is a DATA-DRIVEN cut against the live
--       t.reuse_penalty_curve steps (0->1.00, 1->0.85, 2->0.65, 3+->0.50):
--       it keeps reuse_count 0-1 rows ("lost <25% of original fitness") as
--       "decay_healthy" and excludes reuse_count>=2 rows ("lost >=35%").
--       This is a generic engineering judgment call, not a per-format
--       threshold (no t.format_quality_policy lookup, so this function stays
--       independent of which format/client is asking) — flagged explicitly
--       as a design decision, not a proven-optimal constant.
--
--   THE GATE ITSELF (must-fix per the brief): green/yellow/red now decides
--   on v_active_usable, NOT raw v_active:
--     v_active_usable >= 50 AND distinct_sources >= 3   -> green
--     v_active_usable >= 20 AND distinct_sources >= 2   -> yellow
--     else                                              -> red
--   distinct_sources is left computed over the RAW active set (unchanged
--   dimension; source-diversity was never the defect S1 identified).
--
--   OUTPUT CONTRACT — additive only, every existing key preserved
--   byte-for-byte in name and meaning (vertical_id, total, active,
--   high_fitness, distinct_sources, distinct_classes, fresh_48h,
--   max_fitness, avg_fitness, health, checked_at). Four NEW keys appended:
--     active_usable            — the new usable-active count (drives the gate)
--     body_health_pass_count   — active rows passing the body-health predicate
--     body_health_pass_rate    — body_health_pass_count / active, rounded 4dp
--     decay_healthy_floor      — the 0.75 reuse-multiplier cutoff used above
--                                 (documented in the output for auditability,
--                                 not a magic number hidden in code only)
--   STABLE / read-only preserved — no writes added.
--
-- WHAT IS STRICTLY OUT OF SCOPE for this section:
--   - fill_pending_slots is NOT touched here (Section 2, separate change,
--     independent of this one — see baseline file's own note: Option C's
--     relax call site and its `= 'red'` string comparison are UNCHANGED).
--   - No format-specific (t.format_quality_policy) lookup added — this stays
--     a vertical-level, format-agnostic health signal by design.
--   - No new column/table/migration; no GRANT/REVOKE.
--   - No client_id parameter, no per-client carve-out (CFW or NDIS or any
--     other tenant) — the function signature is unchanged: p_vertical_id only.
--
-- ── BEFORE/AFTER ARITHMETIC FOR CFW's LIVE-DOCUMENTED STATE (worked, not
--    hand-waved) — verticals 11/12, per S1 diagnosis + the live baseline read:
--
--   BEFORE (live today, 2026-08-06T03:55:21Z, both verticals byte-identical
--   except the vertical_id label): active=70, distinct_sources=49 ->
--   health = 'green' (masks the starvation; the relax valve in
--   fill_pending_slots, which requires health='red' exactly, never fires).
--
--   AFTER, computed from the S1 diagnosis's own body-fetch table (reuse_count
--   0: 28 paywalled + 2 blocked + 1 dead + 2 timeout + 2 success-but-short =
--   35 rows, ALL fail body_health_pass; reuse_count 2: 34 rows, fetch_status
--   success + passes length/word floors, ALL pass body_health_pass):
--     v_body_health_pass = 34   (35 + 34 = 69, ~matches active=70 within the
--                                 diagnosis's own client-scoped 68 vs this
--                                 function's unscoped 70 — same shape, S1
--                                 itself notes this drift is normal pool churn)
--     body_health_pass_rate = 34/70 = 0.4857
--     Of those 34, ALL are at reuse_count=2 -> t.reuse_penalty_curve
--     fitness_multiplier = 0.65 (the 2 bucket) which is < 0.75 -> NONE clear
--     the decay_healthy_floor.
--     v_active_usable = COUNT(active AND body_health_pass AND
--                              reuse_multiplier>=0.75) = 0
--   Gate: v_active_usable=0 is neither >=50 nor >=20 -> health = 'red'.
--
--   RESULT: before this fix, health='green' (masks the starvation). After
--   this fix, given CFW's documented live shape, health computes to 'red' —
--   not merely "non-green" but the EXACT string
--   (fill_pending_slots' relax branch compares `= 'red'` exactly, baseline
--   file line ~532) the auto-relax valve requires to fire. The relaxed
--   threshold (min_fitness - 10 = 50) is then compared against the 34
--   reused items' decayed effective_fitness of 57.2 (analytical class,
--   88*0.65) / 59.8 (educational_evergreen, 92*0.65) — both clear 50, so
--   the relax path would in fact surface candidates once it fires. This
--   verifies the valve is load-bearing, per S1's own note.
-- =====================================================================

CREATE OR REPLACE FUNCTION m.check_pool_health(p_vertical_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_total               integer;
  v_active               integer;
  v_high_fitness         integer;  -- informational only (>= 90 on 0..100 scale)
  v_distinct_sources     integer;
  v_distinct_classes     integer;
  v_fresh_48h            integer;
  v_max_fitness          numeric;
  v_avg_fitness          numeric;
  v_health               text;
  -- Option C additions (M16) — body-health + reuse-decay visibility.
  v_body_health_pass     integer;
  v_active_usable        integer;
  v_body_health_pass_rate numeric;
  v_decay_healthy_floor  CONSTANT numeric := 0.75;
BEGIN
  WITH pool_rows AS (
    SELECT
      sp.pool_id,
      sp.is_active,
      sp.source_domain,
      sp.content_class,
      sp.pool_entered_at,
      sp.fitness_score_max,
      sp.reuse_count,
      COALESCE(rpc.fitness_multiplier, 1.0) AS reuse_multiplier,
      -- Body-health predicate copied VERBATIM from m.fill_pending_slots'
      -- candidate_pool CTE (live baseline lines ~496-502) so both functions
      -- agree on what "usable" means.
      EXISTS (
        SELECT 1
        FROM f.canonical_content_body ccb
        WHERE ccb.canonical_id = sp.canonical_id
          AND ccb.fetch_status = 'success'
          AND ccb.extracted_text IS NOT NULL
          AND LENGTH(TRIM(ccb.extracted_text)) >= 200
          AND COALESCE(ccb.word_count, 0) >= 300
      ) AS body_health_pass
    FROM m.signal_pool sp
    LEFT JOIN t.reuse_penalty_curve rpc
      ON sp.reuse_count >= rpc.reuse_count_min
      AND (sp.reuse_count <= rpc.reuse_count_max OR rpc.reuse_count_max IS NULL)
      AND rpc.is_current = true
    WHERE sp.vertical_id = p_vertical_id
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND fitness_score_max >= 90),
    COUNT(DISTINCT source_domain) FILTER (WHERE is_active AND source_domain IS NOT NULL),
    COUNT(DISTINCT content_class) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND pool_entered_at > NOW() - interval '48 hours'),
    MAX(fitness_score_max) FILTER (WHERE is_active),
    AVG(fitness_score_max) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND body_health_pass),
    COUNT(*) FILTER (WHERE is_active AND body_health_pass AND reuse_multiplier >= v_decay_healthy_floor)
  INTO
    v_total,
    v_active,
    v_high_fitness,
    v_distinct_sources,
    v_distinct_classes,
    v_fresh_48h,
    v_max_fitness,
    v_avg_fitness,
    v_body_health_pass,
    v_active_usable
  FROM pool_rows;

  v_body_health_pass_rate := ROUND(
    COALESCE(v_body_health_pass, 0)::numeric / NULLIF(v_active, 0), 4
  );

  -- Health gates on USABLE depth (body-health-passing AND not decay-starved)
  -- + source diversity. Raw active-row count alone is preserved in the
  -- output for observability/backward-compat but no longer drives the gate
  -- decision (that was the exact blind spot S1 identified: a pool can be
  -- raw-active-healthy while being entirely unusable by fill_pending_slots).
  v_health := CASE
    WHEN v_active_usable >= 50 AND v_distinct_sources >= 3 THEN 'green'
    WHEN v_active_usable >= 20 AND v_distinct_sources >= 2 THEN 'yellow'
    ELSE 'red'
  END;

  RETURN jsonb_build_object(
    'vertical_id',            p_vertical_id,
    'total',                  v_total,
    'active',                 v_active,
    'high_fitness',           v_high_fitness,
    'distinct_sources',       v_distinct_sources,
    'distinct_classes',       v_distinct_classes,
    'fresh_48h',               v_fresh_48h,
    'max_fitness',             v_max_fitness,
    'avg_fitness',              ROUND(COALESCE(v_avg_fitness, 0)::numeric, 2),
    'health',                   v_health,
    'checked_at',                NOW(),
    -- Option C additions (M16) — additive, all prior keys unchanged above.
    'active_usable',             v_active_usable,
    'body_health_pass_count',    v_body_health_pass,
    'body_health_pass_rate',     COALESCE(v_body_health_pass_rate, 0),
    'decay_healthy_floor',       v_decay_healthy_floor
  );
END;
$function$;


-- =====================================================================
-- SECTION 2 — OPTION B: m.fill_pending_slots(integer) — format-specific
--   fitness gate, two call sites
-- =====================================================================
-- WHAT CHANGED vs the live baseline
-- (docs/briefs/artifacts/m16-live-baseline-fill_pending_slots-v1.sql):
--
--   BOTH effective-fitness expressions changed from the class-wide MAX
--   fitness (sp.fitness_score_max, which is the max across ALL formats for
--   that content_class, not the format actually being filled) to the
--   format-specific score in sp.fitness_per_format (jsonb keyed by
--   ice_format_key, confirmed live on m.signal_pool), falling back to
--   sp.fitness_score_max when the per-format key is absent for a row
--   (fail-open — never silently drops a candidate that simply lacks a
--   per-format breakdown yet). This matches check_pool_health()'s own
--   documented design-intent comment (live baseline: "The fill function
--   uses fitness_per_format jsonb at per-slot resolution where the variance
--   lives") which the shipped code did not actually do (S1 contributing
--   defect A).
--
--   Site 1 — main candidate_pool CTE (live baseline line ~461):
--     OLD: (sp.fitness_score_max * COALESCE(rpc.fitness_multiplier, 1.0))
--            AS effective_fitness
--     NEW: (COALESCE((sp.fitness_per_format->>v_chosen_format)::numeric,
--            sp.fitness_score_max) * COALESCE(rpc.fitness_multiplier, 1.0))
--            AS effective_fitness
--
--   Site 2 — relaxed_pool CTE, the post-relax retry path (live baseline
--   line ~548):
--     OLD: (sp.fitness_score_max * COALESCE(rpc.fitness_multiplier, 1.0))
--            AS eff_fit
--     NEW: (COALESCE((sp.fitness_per_format->>v_chosen_format)::numeric,
--            sp.fitness_score_max) * COALESCE(rpc.fitness_multiplier, 1.0))
--            AS eff_fit
--
--   Both sites changed TOGETHER (per the baseline file's own instruction —
--   fixing only one would make the relax retry compute a different
--   effective_fitness basis than the initial pass, which is incoherent).
--   v_chosen_format is already in scope at both CTE sites (set once at
--   live baseline line ~430/391, unchanged before either query) — no new
--   variable, no new parameter.
--
--   NO OTHER LINE of this 806-line function is touched: not the S9 Layer-1
--   capability gate, not the T0 manual branch, not the evergreen fallback,
--   not the check_pool_health() call site or its 'red' string comparison
--   (Option C changes check_pool_health()'s OWN body only — see Section 1;
--   this function's call to it and comparison against it are byte-unchanged
--   here), not any INSERT/UPDATE statement, not any other CTE predicate.
--
-- WHAT IS STRICTLY OUT OF SCOPE for this section:
--   - No change to dedup, body-health, bundle-diversity, evergreen, or S9
--     capability-gate logic.
--   - No schema change; fitness_per_format already exists live on
--     m.signal_pool (confirmed in the check_pool_health baseline file).
--   - No REVOKE/GRANT (CREATE OR REPLACE preserves existing ACLs).
--
-- VERIFIED CLAIM (matching S1's own finding — do not overclaim beyond it):
--   this fix does NOT change CFW's current zero-qualifying outcome for
--   image_quote at either vertical 11 or 12. S1's link 1 (body-health gate
--   starving fresh supply) and link 2 (reuse-decay with no replenishment)
--   dominate either way — the only candidates in-scope after the body-health
--   EXISTS filter are the 34 reuse_count=2 rows, and per-format fitness for
--   analytical/image_quote and educational_evergreen/image_quote is NOT
--   independently re-derived in this fix (that would require a live read of
--   sp.fitness_per_format's actual per-row contents, which was not part of
--   this build's scope; S1's own text notes the class-max/per-format
--   divergence example is analytical/text=88 vs analytical/image_quote=55,
--   i.e. the per-format number for image_quote is typically LOWER than the
--   class-max, which if anything makes CFW's outcome WORSE, not better,
--   reinforcing "does not change today's zero-qualifying outcome" rather
--   than accidentally fixing it as a side effect). This is correctness
--   hygiene for every OTHER class/format pair where the per-format score
--   diverges from the class-max in either direction — it is NOT a CFW fix,
--   and is not claimed as one.
-- =====================================================================

CREATE OR REPLACE FUNCTION m.fill_pending_slots(p_max_slots integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_slot                  record;
  v_dedup                 record;
  v_synthesis             record;
  v_quality               record;
  v_pool_health           jsonb;
  v_threshold_check       jsonb;
  v_chosen_format         text;
  v_min_fitness           numeric;
  v_threshold_relaxed     boolean;
  v_pool_count            integer;
  v_pool_total_in_scope   integer;
  v_pool_snapshot         jsonb;
  v_top_pool_rows         jsonb;
  v_canonical_ids         uuid[];
  v_evergreen_id          uuid;
  v_is_evergreen          boolean;
  v_best_fitness          numeric;
  v_top_recency           numeric;
  v_source_diversity      integer;
  v_slot_confidence       numeric;
  v_decision              text;
  v_skip_reason           text;
  v_skeleton_draft_id     uuid;
  v_ai_job_id             uuid;
  v_attempt_id            uuid;
  v_evergreen_ratio       numeric;
  v_processed_count       integer := 0;
  v_results               jsonb := '[]'::jsonb;
  v_per_slot_result       jsonb;
  v_evergreen_row         record;
  -- S9 Layer 1 capability gate (fail-closed) — added by 20260729143000
  v_cap_slug              text;
  v_cap_format            text;
  v_cap_status            text;
  v_cap_evidence          jsonb;
  v_cap_error             text;
  v_cap_skip              text;
  v_cap_exempt            boolean;
BEGIN
  SELECT * INTO v_dedup
  FROM t.dedup_policy
  WHERE policy_name='default' AND is_current=true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('processed', 0, 'error', 'default dedup_policy not found', 'ran_at', NOW());
  END IF;

  FOR v_slot IN
    SELECT *
    FROM m.slot
    WHERE status = 'pending_fill'
      AND fill_window_opens_at <= NOW()
    ORDER BY scheduled_publish_at ASC
    LIMIT p_max_slots
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed_count := v_processed_count + 1;
    v_threshold_relaxed := false;
    v_decision := NULL;
    v_skip_reason := NULL;
    v_canonical_ids := NULL;
    v_evergreen_id := NULL;
    v_is_evergreen := false;
    v_pool_snapshot := '{}'::jsonb;
    v_skeleton_draft_id := NULL;
    v_ai_job_id := NULL;
    v_best_fitness := 0;
    v_top_recency := 0;
    v_source_diversity := 0;
    v_pool_health := NULL;
    v_evergreen_ratio := NULL;

    -- cc-0019 GATE (the ONLY addition to this function)
    -- Cost gate: if this (client, platform) has no live publish path, do not
    -- spend AI tokens. Preserve visibility (slot_fill_attempt + results), mark
    -- the slot skipped, and CONTINUE before any pool query / draft / ai_job.
    IF NOT m.is_publish_eligible(v_slot.client_id, v_slot.platform) THEN
      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
        decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
        chosen_format, threshold_relaxed, pool_health_at_attempt,
        evergreen_ratio_at_attempt, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0, '{}'::jsonb,
        'skipped', 'publish_path_disabled', NULL, NULL,
        COALESCE(v_slot.format_preference[1],'image_quote'), false, NULL,
        NULL, NULL, NOW()
      );

      UPDATE m.slot
      SET status = 'skipped', skip_reason = 'publish_path_disabled', updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'slot_id', v_slot.slot_id, 'client_id', v_slot.client_id,
        'platform', v_slot.platform, 'decision', 'skipped',
        'skip_reason', 'publish_path_disabled'));

      CONTINUE;  -- no skeleton draft, no ai_job, no token spend
    END IF;
    -- end cc-0019 GATE

    -- == S9 LAYER 1 CAPABILITY GATE (fail-closed) ==============================
    -- Brief:        docs/briefs/s9-resolver-enforcement-build-brief-v1.md
    -- Architecture: docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md
    --               section 2.1, "Layer 1 (schedule-fill, m.fill_pending_slots)".
    -- Classify the candidate format for THIS (client, platform) cell BEFORE any
    -- pool query, skeleton draft, ai_job or token spend. Anything other than
    -- 'ready' is a SKIP WITH EVIDENCE, never a substitution to another legacy
    -- format (PK ruling 3: no silent degrade; the schedule's desired format is
    -- preserved as unmet demand). Deliberately positioned ABOVE the T0 manual
    -- branch so operator-authored slots are gated identically to automated ones
    -- (PK ruling 2026-07-29: apply uniformly, no carve-out by slot origin).
    -- The ready test is GENERIC, never an enumeration of blocked statuses, so any
    -- status the classifier gains later (e.g. publisher_path_missing) is covered
    -- by construction.
    v_cap_format   := COALESCE(v_slot.format_preference[1], 'image_quote');
    v_cap_status   := NULL;
    v_cap_evidence := NULL;
    v_cap_error    := NULL;
    v_cap_skip     := NULL;
    v_cap_slug     := NULL;
    v_cap_exempt   := false;

    -- classify_format_capability takes p_client_slug; this function otherwise
    -- works purely in client_id (uuid), so resolve the slug explicitly.
    SELECT cl.client_slug INTO v_cap_slug
    FROM c.client cl
    WHERE cl.client_id = v_slot.client_id;

    IF v_cap_slug IS NULL THEN
      -- Cannot address the cell, so cannot prove capability: fail closed.
      v_cap_status := 'unknown';
      v_cap_error  := 'client_slug_unresolved';
    ELSE
      -- EXCEPTION SCOPE IS DELIBERATELY MINIMAL: this block wraps ONLY the
      -- classifier call, never the surrounding slot logic, so an unrelated
      -- defect elsewhere in this loop can never be silently swallowed here.
      BEGIN
        v_cap_evidence := public.classify_format_capability(
                            v_cap_slug, v_slot.platform, v_cap_format);
        v_cap_status   := COALESCE(v_cap_evidence->>'status', 'unknown');
      EXCEPTION WHEN OTHERS THEN
        -- Fail closed at the SINGLE-SLOT level only, and never re-raise: an
        -- exception escaping here would abort the whole batch transaction and
        -- roll back other clients' already-filled slots in the same cron tick.
        -- SQLSTATE/SQLERRM are CAPTURED (attempt.error_message plus a WARNING),
        -- never swallowed, so a real recurring classifier defect stays
        -- distinguishable from an expected non-ready classification.
        v_cap_status := 'capability_check_error';
        v_cap_error  := 'sqlstate=' || SQLSTATE || '; sqlerrm=' || left(SQLERRM, 400);
        RAISE WARNING '[s9-layer1] classify_format_capability failed: slot=% client=% platform=% format=% sqlstate=% sqlerrm=%',
          v_slot.slot_id, v_slot.client_id, v_slot.platform, v_cap_format, SQLSTATE, SQLERRM;
      END;
    END IF;

    IF v_cap_status IS DISTINCT FROM 'ready' THEN
      -- ---- TEMPLATE-LESS CARVE-OUT (PK ruling 2026-07-29, Option A) ----------
      -- A format with render_engine='none' needs no visual template, so
      -- select_template legitimately fail-closes 'format_unmapped' for it and
      -- the classifier's silent-degrade overlay then reports
      -- unsupported_silent_degrade. That is a classifier-coverage artefact, NOT
      -- a capability gap: today this is true of 'text' and nothing else. Without
      -- this carve-out the gate would stop ALL plain-text posting.
      -- The exemption is evaluated ONLY on the non-ready path, so the ready path
      -- is byte-unchanged and pays no extra call; and it is evaluated on exactly
      -- the format string that was classified, so the two cannot diverge.
      -- FAIL-CLOSED: a lookup error means NOT exempt (stay gated) — an exemption
      -- lookup that cannot prove exemption must never grant it.
      -- SCOPED TO THE STATUS CLASS THE RULING ADDRESSES (db-rls-auditor SF-1).
      -- The carve-out exists because a template-less format makes select_template
      -- fail-closed spuriously -- that artefact surfaces ONLY as template_missing
      -- or unsupported_silent_degrade. A template-less format can still have a
      -- GENUINE capability gap (publisher_path_missing, governance_unproven,
      -- asset_shortage, pipeline_missing), and those must still block.
      -- The enumeration is deliberately on the EXEMPTION (narrowing) side, never
      -- on the block side: any status not listed here -- including a future 8th --
      -- is NOT exempt and therefore still blocks. Fail-closed by construction.
      IF v_cap_status IN ('template_missing', 'unsupported_silent_degrade') THEN
        BEGIN
          v_cap_exempt := COALESCE(public.is_capability_exempt_format(v_cap_format), false);
        EXCEPTION WHEN OTHERS THEN
          v_cap_exempt := false;
          RAISE WARNING '[s9-layer1] is_capability_exempt_format failed (treated as NOT exempt): slot=% format=% sqlstate=% sqlerrm=%',
            v_slot.slot_id, v_cap_format, SQLSTATE, SQLERRM;
        END;
      END IF;
    END IF;

    IF v_cap_status IS DISTINCT FROM 'ready' AND NOT v_cap_exempt THEN
      v_cap_skip := 'capability_blocked:' || v_cap_status || ':' || v_cap_format;

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
        decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
        chosen_format, threshold_relaxed, pool_health_at_attempt,
        evergreen_ratio_at_attempt, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0,
        jsonb_build_object(
          'gate',        's9_layer1',
          'client_slug', v_cap_slug,
          'capability',  COALESCE(v_cap_evidence, '{}'::jsonb)),
        'skipped', v_cap_skip, NULL, NULL,
        v_cap_format, false, NULL,
        NULL, v_cap_error, NOW()
      );

      UPDATE m.slot
      SET status = 'skipped', skip_reason = v_cap_skip, updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'slot_id',                v_slot.slot_id,
        'client_id',              v_slot.client_id,
        'platform',                v_slot.platform,
        'format',                  v_cap_format,
        'decision',                'skipped',
        'skip_reason',             v_cap_skip,
        'capability_status',       v_cap_status,
        'capability_reason_code',  v_cap_evidence->>'reason_code',
        'capability_error',        v_cap_error));

      CONTINUE;  -- no pool query, no skeleton draft, no ai_job, no token spend
    END IF;
    -- end S9 LAYER 1 CAPABILITY GATE

    -- T0 MANUAL BRANCH (source_kind='manual')
    -- Operator-brief slots synthesise from slot-carried source_material ONLY.
    -- The global canonical pool, dedup windows, pool health and the evergreen
    -- library are never consulted for operator briefs (T0 rule 7). The branch
    -- enqueues the same slot_fill_synthesis_v1 ai_job (synthesis_mode='manual')
    -- so the draft passes the identical Advisor + compliance + approval chain.
    -- Format preference is carried as preference only — the Advisor retains
    -- format authority (format_preference_explicit marks a real operator pick).
    IF v_slot.source_kind = 'manual' THEN
      v_chosen_format := COALESCE(v_slot.format_preference[1], 'image_quote');

      IF v_slot.source_material IS NULL OR length(trim(v_slot.source_material)) < 20 THEN
        INSERT INTO m.slot_fill_attempt (
          attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
          decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
          chosen_format, threshold_relaxed, pool_health_at_attempt,
          evergreen_ratio_at_attempt, error_message, created_at
        ) VALUES (
          gen_random_uuid(), v_slot.slot_id, NOW(), 0,
          jsonb_build_object('manual', true),
          'failed', 'manual_source_material_missing', NULL, NULL,
          v_chosen_format, false, NULL, NULL, NULL, NOW()
        );

        UPDATE m.slot
        SET status = 'failed', skip_reason = 'manual_source_material_missing', updated_at = NOW()
        WHERE slot_id = v_slot.slot_id;

        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'slot_id', v_slot.slot_id, 'client_id', v_slot.client_id,
          'platform', v_slot.platform, 'decision', 'failed',
          'skip_reason', 'manual_source_material_missing', 'manual', true));

        CONTINUE;
      END IF;

      v_decision := 'filled';
      v_pool_snapshot := jsonb_build_object(
        'manual', true,
        'source', 'slot.source_material',
        'created_by', v_slot.created_by,
        'format_preference_explicit', COALESCE(array_length(v_slot.format_preference, 1), 0) > 0
      );

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
        decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
        chosen_format, threshold_relaxed, pool_health_at_attempt,
        evergreen_ratio_at_attempt, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0, v_pool_snapshot,
        'filled', NULL, NULL, NULL,
        v_chosen_format, false, NULL, NULL, NULL, NOW()
      ) RETURNING attempt_id INTO v_attempt_id;

      INSERT INTO m.post_draft (
        post_draft_id, client_id, platform, slot_id, intent_id,
        approval_status, draft_title, draft_body, scheduled_for,
        version, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id, v_slot.intent_id,
        'draft', NULL, '', v_slot.scheduled_publish_at,
        1, 'fill_function', NOW(), NOW()
      )
      ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE SET
        intent_id            = EXCLUDED.intent_id,
        approval_status      = 'draft',
        draft_title          = NULL,
        draft_body           = '',
        draft_format         = NULL,
        recommended_format   = NULL,
        recommended_reason   = NULL,
        image_headline       = NULL,
        image_url            = NULL,
        image_status         = 'pending',
        video_url            = NULL,
        video_status         = NULL,
        auto_approval_scores = NULL,
        compliance_flags     = '[]'::jsonb,
        dead_reason          = NULL,
        approved_by          = NULL,
        approved_at          = NULL,
        scheduled_for        = EXCLUDED.scheduled_for,
        notification_sent_at = NULL,
        version              = m.post_draft.version + 1,
        updated_at           = NOW()
      RETURNING post_draft_id INTO v_skeleton_draft_id;

      INSERT INTO m.ai_job (
        ai_job_id, client_id, platform, slot_id, post_draft_id,
        digest_run_id, post_seed_id,
        job_type, status, priority,
        input_payload, output_payload, created_at, updated_at, attempts
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id,
        v_skeleton_draft_id,
        NULL, NULL,
        'slot_fill_synthesis_v1', 'queued', 100,
        jsonb_build_object(
          'slot_id', v_slot.slot_id,
          'format', v_chosen_format,
          'format_preference_explicit', COALESCE(array_length(v_slot.format_preference, 1), 0) > 0,
          'synthesis_mode', 'manual',
          'source_material', v_slot.source_material,
          'created_by', v_slot.created_by,
          'canonical_ids', '[]'::jsonb,
          'evergreen_id', NULL,
          'is_evergreen', false,
          'fitness_score', NULL,
          'recency_score', NULL,
          'slot_confidence', NULL,
          'attempt_id', v_attempt_id,
          'enqueued_at', NOW()
        ),
        '{}'::jsonb, NOW(), NOW(), 0
      )
      ON CONFLICT (post_draft_id, job_type) DO UPDATE SET
        slot_id        = EXCLUDED.slot_id,
        status         = 'queued',
        priority       = 100,
        input_payload  = EXCLUDED.input_payload,
        output_payload = '{}'::jsonb,
        error          = NULL,
        dead_reason    = NULL,
        locked_at      = NULL,
        locked_by      = NULL,
        attempts       = 0,
        updated_at     = NOW()
      RETURNING ai_job_id INTO v_ai_job_id;

      UPDATE m.slot_fill_attempt SET ai_job_id = v_ai_job_id
      WHERE attempt_id = v_attempt_id;

      UPDATE m.slot
      SET status = 'fill_in_progress',
          filled_draft_id = v_skeleton_draft_id,
          format_chosen = v_chosen_format,
          slot_confidence = v_slot.slot_confidence,  -- T1: preserve high confidence set at creation (T0 single posts created NULL -> stays NULL)
          filled_at = NOW(),
          updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'slot_id', v_slot.slot_id,
        'client_id', v_slot.client_id,
        'platform', v_slot.platform,
        'scheduled_publish_at', v_slot.scheduled_publish_at,
        'format', v_chosen_format,
        'decision', 'filled',
        'manual', true,
        'ai_job_id', v_ai_job_id,
        'skeleton_draft_id', v_skeleton_draft_id));

      CONTINUE;
    END IF;
    -- end T0 MANUAL BRANCH

    v_chosen_format := COALESCE(v_slot.format_preference[1], 'image_quote');

    SELECT * INTO v_synthesis FROM t.format_synthesis_policy
    WHERE ice_format_key = v_chosen_format AND is_current=true;
    SELECT * INTO v_quality FROM t.format_quality_policy
    WHERE ice_format_key = v_chosen_format AND is_current=true;

    IF v_synthesis IS NULL OR v_quality IS NULL THEN
      v_decision := 'failed';
      v_skip_reason := 'format_policy_missing:' || v_chosen_format;
    ELSE
      v_min_fitness := v_quality.min_fitness_threshold;

      WITH client_verticals AS (
        SELECT vertical_id AS vid
        FROM c.client_content_scope
        WHERE client_id = v_slot.client_id
      ),
      candidate_pool AS (
        SELECT
          sp.canonical_id,
          sp.vertical_id,
          sp.content_class,
          sp.fitness_score_max,
          sp.source_domain,
          sp.reuse_count,
          cci.canonical_title,
          cci.first_seen_at,
          cci.canonical_url,
          cfr.freshness_window_hours,
          rpc.fitness_multiplier,
          -- OPTION B (M16): format-specific fitness, falling back to the
          -- class-wide max when the per-format key is absent (fail-open).
          (COALESCE((sp.fitness_per_format->>v_chosen_format)::numeric, sp.fitness_score_max)
            * COALESCE(rpc.fitness_multiplier, 1.0)) AS effective_fitness,
          GREATEST(0.0, LEAST(1.0,
            1.0 - (EXTRACT(epoch FROM (NOW() - cci.first_seen_at)) / 3600.0)
                   / NULLIF(cfr.freshness_window_hours, 0)
          )) AS recency_score
        FROM m.signal_pool sp
        JOIN client_verticals cv ON cv.vid = sp.vertical_id
        JOIN f.canonical_content_item cci ON cci.canonical_id = sp.canonical_id
        LEFT JOIN t.class_freshness_rule cfr
          ON cfr.class_code = sp.content_class AND cfr.is_current=true
        LEFT JOIN t.reuse_penalty_curve rpc
          ON sp.reuse_count >= rpc.reuse_count_min
          AND (sp.reuse_count <= rpc.reuse_count_max OR rpc.reuse_count_max IS NULL)
          AND rpc.is_current=true
        WHERE sp.is_active = true
          AND NOT EXISTS (
            SELECT 1
            FROM m.slot s2
            WHERE s2.client_id = v_slot.client_id
              AND s2.status IN ('filled','approved','published','fill_in_progress')
              AND s2.filled_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
              AND sp.canonical_id = ANY(s2.canonical_ids)
          )
          AND NOT EXISTS (
            SELECT 1
            FROM m.post_draft pd
            JOIN m.slot s2 ON s2.filled_draft_id = pd.post_draft_id
            WHERE s2.client_id = v_slot.client_id
              AND pd.created_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
              AND pd.draft_title IS NOT NULL
              AND m.title_similarity(cci.canonical_title, pd.draft_title) >
                  LEAST(v_dedup.title_similarity_threshold, v_quality.max_dedup_similarity)
          )
          AND EXISTS (
            SELECT 1
            FROM f.canonical_content_body ccb
            WHERE ccb.canonical_id = sp.canonical_id
              AND ccb.fetch_status = 'success'
              AND ccb.extracted_text IS NOT NULL
              AND LENGTH(TRIM(ccb.extracted_text)) >= 200
              AND COALESCE(ccb.word_count, 0) >= 300
          )
      )
      SELECT
        COUNT(*) FILTER (WHERE effective_fitness >= v_min_fitness),
        COUNT(*),
        jsonb_agg(jsonb_build_object(
          'canonical_id', canonical_id,
          'effective_fitness', effective_fitness,
          'recency_score', recency_score,
          'source_domain', source_domain,
          'reuse_count', reuse_count,
          'canonical_title', canonical_title
        ) ORDER BY effective_fitness DESC, recency_score DESC)
          FILTER (WHERE effective_fitness >= v_min_fitness)
      INTO v_pool_count, v_pool_total_in_scope, v_top_pool_rows
      FROM candidate_pool;

      v_pool_snapshot := jsonb_build_object(
        'qualifying_count', v_pool_count,
        'total_in_scope',   v_pool_total_in_scope,
        'min_fitness',      v_min_fitness,
        'top_items',        COALESCE(v_top_pool_rows, '[]'::jsonb)
      );

      IF v_pool_count < v_quality.min_pool_size_for_format THEN
        SELECT m.check_pool_health(
          (SELECT vertical_id FROM c.client_content_scope
           WHERE client_id = v_slot.client_id LIMIT 1)
        ) INTO v_pool_health;

        IF (v_pool_health->>'health') = 'red' THEN
          v_min_fitness := GREATEST(0, v_min_fitness - 10);
          v_threshold_relaxed := true;

          WITH client_verticals AS (
            SELECT vertical_id AS vid
            FROM c.client_content_scope
            WHERE client_id = v_slot.client_id
          ),
          relaxed_pool AS (
            SELECT
              sp.canonical_id,
              sp.source_domain,
              cci.canonical_title,
              cci.first_seen_at,
              cfr.freshness_window_hours,
              -- OPTION B (M16): same format-specific fitness swap as Site 1,
              -- applied identically here so the relax retry uses the SAME
              -- effective_fitness basis as the initial pass (fixing only one
              -- site would be incoherent — see header).
              (COALESCE((sp.fitness_per_format->>v_chosen_format)::numeric, sp.fitness_score_max)
                * COALESCE(rpc.fitness_multiplier, 1.0)) AS eff_fit,
              GREATEST(0.0, LEAST(1.0,
                1.0 - (EXTRACT(epoch FROM (NOW() - cci.first_seen_at)) / 3600.0)
                       / NULLIF(cfr.freshness_window_hours, 0)
              )) AS rec
            FROM m.signal_pool sp
            JOIN client_verticals cv ON cv.vid = sp.vertical_id
            JOIN f.canonical_content_item cci ON cci.canonical_id = sp.canonical_id
            LEFT JOIN t.class_freshness_rule cfr
              ON cfr.class_code = sp.content_class AND cfr.is_current=true
            LEFT JOIN t.reuse_penalty_curve rpc
              ON sp.reuse_count >= rpc.reuse_count_min
              AND (sp.reuse_count <= rpc.reuse_count_max OR rpc.reuse_count_max IS NULL)
              AND rpc.is_current=true
            WHERE sp.is_active = true
              AND NOT EXISTS (
                SELECT 1 FROM m.slot s2
                WHERE s2.client_id = v_slot.client_id
                  AND s2.status IN ('filled','approved','published','fill_in_progress')
                  AND s2.filled_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
                  AND sp.canonical_id = ANY(s2.canonical_ids)
              )
              AND EXISTS (
                SELECT 1
                FROM f.canonical_content_body ccb
                WHERE ccb.canonical_id = sp.canonical_id
                  AND ccb.fetch_status = 'success'
                  AND ccb.extracted_text IS NOT NULL
                  AND LENGTH(TRIM(ccb.extracted_text)) >= 200
                  AND COALESCE(ccb.word_count, 0) >= 300
              )
          )
          SELECT
            COUNT(*) FILTER (WHERE eff_fit >= v_min_fitness),
            jsonb_agg(jsonb_build_object(
              'canonical_id', canonical_id,
              'effective_fitness', eff_fit,
              'recency_score', rec,
              'source_domain', source_domain,
              'canonical_title', canonical_title
            ) ORDER BY eff_fit DESC, rec DESC)
              FILTER (WHERE eff_fit >= v_min_fitness)
          INTO v_pool_count, v_top_pool_rows
          FROM relaxed_pool;

          v_pool_snapshot := v_pool_snapshot
            || jsonb_build_object('relaxed_min_fitness', v_min_fitness,
                                  'relaxed_top_items', COALESCE(v_top_pool_rows,'[]'::jsonb));
        END IF;
      END IF;

      IF v_pool_count >= v_quality.min_pool_size_for_format THEN
        IF v_synthesis.synthesis_mode = 'single_item' THEN
          v_canonical_ids := ARRAY[(v_top_pool_rows->0->>'canonical_id')::uuid];
          v_best_fitness := (v_top_pool_rows->0->>'effective_fitness')::numeric;
          v_top_recency  := (v_top_pool_rows->0->>'recency_score')::numeric;
          v_source_diversity := 1;
          v_decision := 'filled';
        ELSE
          DECLARE
            v_bundle_size integer := v_synthesis.bundle_size_max;
            v_picked uuid[] := ARRAY[]::uuid[];
            v_picked_sources text[] := ARRAY[]::text[];
            v_idx integer := 0;
            v_distinct_sources integer := 0;
          BEGIN
            WHILE COALESCE(array_length(v_picked, 1), 0) < v_bundle_size
                  AND v_idx < jsonb_array_length(v_top_pool_rows) LOOP
              v_picked := v_picked || ARRAY[(v_top_pool_rows->v_idx->>'canonical_id')::uuid];
              v_picked_sources := v_picked_sources || ARRAY[v_top_pool_rows->v_idx->>'source_domain'];
              v_idx := v_idx + 1;
            END LOOP;

            SELECT COUNT(DISTINCT s) INTO v_distinct_sources
            FROM unnest(v_picked_sources) s WHERE s IS NOT NULL;

            IF COALESCE(array_length(v_picked, 1), 0) = v_bundle_size
               AND v_distinct_sources >= v_dedup.same_source_diversity_min THEN
              v_canonical_ids := v_picked;
              v_best_fitness := (v_top_pool_rows->0->>'effective_fitness')::numeric;
              v_top_recency  := (v_top_pool_rows->0->>'recency_score')::numeric;
              v_source_diversity := v_distinct_sources;
              v_decision := 'filled';
            ELSE
              v_decision := NULL;
              v_skip_reason := format('bundle_diversity_insufficient:got_%s_need_%s',
                                      v_distinct_sources, v_dedup.same_source_diversity_min);
            END IF;
          END;
        END IF;
      END IF;

      IF v_decision IS NULL OR v_decision NOT IN ('filled','failed') THEN
        SELECT m.check_evergreen_threshold(v_slot.client_id) INTO v_threshold_check;
        v_evergreen_ratio := COALESCE((v_threshold_check->>'ratio_used')::numeric, 0);

        IF (v_threshold_check->>'alert')::boolean = true THEN
          v_decision := 'skipped';
          v_skip_reason := COALESCE(v_skip_reason, 'pool_thin') || ';evergreen_threshold_exceeded';
        ELSE
          SELECT * INTO v_evergreen_row
          FROM t.evergreen_library el
          WHERE el.is_active = true
            AND v_chosen_format = ANY(el.format_keys)
            AND EXISTS (
              SELECT 1 FROM unnest(el.vertical_ids) vid
              JOIN c.client_content_scope ccs ON ccs.vertical_id = vid
              WHERE ccs.client_id = v_slot.client_id
            )
            AND (el.last_used_at IS NULL
                 OR el.last_used_at < NOW() - (el.use_cooldown_days * interval '1 day'))
          ORDER BY el.is_core DESC, el.last_used_at NULLS FIRST, el.use_count ASC
          LIMIT 1;

          IF FOUND THEN
            v_evergreen_id := v_evergreen_row.evergreen_id;
            v_is_evergreen := true;
            v_best_fitness := 70;
            v_top_recency := 0.5;
            v_source_diversity := 1;
            v_decision := 'evergreen';
          ELSE
            v_decision := 'skipped';
            v_skip_reason := COALESCE(v_skip_reason, 'pool_thin') || ';no_eligible_evergreen';
          END IF;
        END IF;
      END IF;

      IF v_decision IN ('filled','evergreen') THEN
        v_slot_confidence := m.compute_slot_confidence(
          v_best_fitness, v_pool_count, v_top_recency, v_source_diversity
        );
      ELSE
        v_slot_confidence := 0;
      END IF;
    END IF;

    INSERT INTO m.slot_fill_attempt (
      attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
      decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
      chosen_format, threshold_relaxed, pool_health_at_attempt,
      evergreen_ratio_at_attempt, error_message, created_at
    ) VALUES (
      gen_random_uuid(), v_slot.slot_id, NOW(),
      v_pool_count, v_pool_snapshot,
      v_decision, v_skip_reason, v_canonical_ids, v_evergreen_id,
      v_chosen_format, v_threshold_relaxed, v_pool_health,
      v_evergreen_ratio, NULL, NOW()
    ) RETURNING attempt_id INTO v_attempt_id;

    IF v_decision IN ('filled','evergreen') THEN
      -- F-PUB-009 — write slot intent to post_draft.scheduled_for at fill time.
      INSERT INTO m.post_draft (
        post_draft_id, client_id, platform, slot_id,
        approval_status, draft_title, draft_body, scheduled_for,
        version, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id,
        'draft', NULL, '', v_slot.scheduled_publish_at,
        1, 'fill_function', NOW(), NOW()
      )
      ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE SET
        approval_status      = 'draft',
        draft_title          = NULL,
        draft_body           = '',
        draft_format         = NULL,
        recommended_format   = NULL,
        recommended_reason   = NULL,
        image_headline       = NULL,
        image_url            = NULL,
        image_status         = 'pending',
        video_url            = NULL,
        video_status         = NULL,
        auto_approval_scores = NULL,
        compliance_flags     = '[]'::jsonb,
        dead_reason          = NULL,
        approved_by          = NULL,
        approved_at          = NULL,
        scheduled_for        = EXCLUDED.scheduled_for,
        notification_sent_at = NULL,
        version              = m.post_draft.version + 1,
        updated_at           = NOW()
      RETURNING post_draft_id INTO v_skeleton_draft_id;

      INSERT INTO m.ai_job (
        ai_job_id, client_id, platform, slot_id, post_draft_id,
        digest_run_id, post_seed_id,
        job_type, status, priority,
        input_payload, output_payload, created_at, updated_at, attempts
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id,
        v_skeleton_draft_id,
        NULL, NULL,
        'slot_fill_synthesis_v1', 'queued', 100,
        jsonb_build_object(
          'slot_id', v_slot.slot_id,
          'format', v_chosen_format,
          'synthesis_mode', CASE WHEN v_is_evergreen THEN 'evergreen'
                                 ELSE v_synthesis.synthesis_mode END,
          'canonical_ids', COALESCE(to_jsonb(v_canonical_ids), '[]'::jsonb),
          'evergreen_id', v_evergreen_id,
          'is_evergreen', v_is_evergreen,
          'fitness_score', v_best_fitness,
          'recency_score', v_top_recency,
          'slot_confidence', v_slot_confidence,
          'attempt_id', v_attempt_id,
          'enqueued_at', NOW()
        ),
        '{}'::jsonb, NOW(), NOW(), 0
      )
      ON CONFLICT (post_draft_id, job_type) DO UPDATE SET
        slot_id        = EXCLUDED.slot_id,
        status         = 'queued',
        priority       = 100,
        input_payload  = EXCLUDED.input_payload,
        output_payload = '{}'::jsonb,
        error          = NULL,
        dead_reason    = NULL,
        locked_at      = NULL,
        locked_by      = NULL,
        attempts       = 0,
        updated_at     = NOW()
      RETURNING ai_job_id INTO v_ai_job_id;

      UPDATE m.slot_fill_attempt SET ai_job_id = v_ai_job_id
      WHERE attempt_id = v_attempt_id;

      UPDATE m.slot
      SET status = 'fill_in_progress',
          filled_draft_id = v_skeleton_draft_id,
          canonical_ids = v_canonical_ids,
          evergreen_id = v_evergreen_id,
          is_evergreen = v_is_evergreen,
          format_chosen = v_chosen_format,
          slot_confidence = v_slot_confidence,
          filled_at = NOW(),
          updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      IF v_canonical_ids IS NOT NULL AND array_length(v_canonical_ids, 1) > 0 THEN
        UPDATE m.signal_pool
        SET reuse_count = reuse_count + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE canonical_id = ANY(v_canonical_ids)
          AND vertical_id IN (
            SELECT vertical_id FROM c.client_content_scope
            WHERE client_id = v_slot.client_id
          );
      END IF;

      IF v_evergreen_id IS NOT NULL THEN
        UPDATE t.evergreen_library
        SET use_count = use_count + 1,
            last_used_at = NOW(),
            last_used_for_client = v_slot.client_id,
            updated_at = NOW()
        WHERE evergreen_id = v_evergreen_id;
      END IF;

    ELSE
      UPDATE m.slot
      SET status = COALESCE(v_decision, 'skipped'),
          skip_reason = v_skip_reason,
          updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;
    END IF;

    v_per_slot_result := jsonb_build_object(
      'slot_id', v_slot.slot_id,
      'client_id', v_slot.client_id,
      'platform', v_slot.platform,
      'scheduled_publish_at', v_slot.scheduled_publish_at,
      'format', v_chosen_format,
      'decision', v_decision,
      'skip_reason', v_skip_reason,
      'canonical_ids', COALESCE(to_jsonb(v_canonical_ids), 'null'::jsonb),
      'evergreen_id', v_evergreen_id,
      'is_evergreen', v_is_evergreen,
      'pool_size', v_pool_count,
      'threshold_relaxed', v_threshold_relaxed,
      'slot_confidence', v_slot_confidence,
      'ai_job_id', v_ai_job_id,
      'skeleton_draft_id', v_skeleton_draft_id
    );
    v_results := v_results || jsonb_build_array(v_per_slot_result);

  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed_count,
    'results', v_results,
    'ran_at', NOW()
  );
END;
$function$;
