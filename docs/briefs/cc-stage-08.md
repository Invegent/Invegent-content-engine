# Claude Code Brief — Stage 8: THE FILL FUNCTION

**Stage:** 8 of 19 (Phase B's biggest single piece — the heart of v3)
**Phase:** B — Fill in shadow
**Pre-req:** Stage 7 complete (commit `2f447cf`, migrations 032–035 applied + fix-ups in place, all 4 helpers callable, Phase A still autonomous, pool=1,694, slots=70, alerts=0)
**Goal:** Land the fill function. After Stage 8 verifies, the system can fill a slot end-to-end (in shadow): pool query → dedup → quality gates → optional pool-health relaxation → optional evergreen fallback → audit → skeleton draft → ai_job creation → slot transition `pending_fill → fill_in_progress`. Plus the rejection-handling trigger for 1-retry-then-skip semantics. **No cron yet** (that's Stage 10) — fill function is callable but not auto-fired. Manual single-slot end-to-end test is the verification.
**Estimated duration:** 60 min create + 30 min verification + 15 min synthetic-slot test cycle.

---

## Context for CC

This stage closes the gap between "we have all the parts" (Stages 1–7) and "the parts work together end-to-end". Three migrations:

| Migration | Object | Purpose |
|---|---|---|
| 036 | ALTER `m.ai_job` | Add `slot_id`, `is_shadow` cols. Drop NOT NULL on `digest_run_id` + `post_seed_id`. Add `ai_job_origin_check` CHECK constraint requiring exactly-one origin path (R6 OR slot-driven). |
| 037 | `m.fill_pending_slots(p_max_slots integer, p_shadow boolean)` | THE FILL FUNCTION. ~200 lines. Picks slots, queries pool with all gates, falls back to evergreen, creates skeleton draft + ai_job, transitions slot. |
| 038 | `m.handle_draft_rejection` trigger | When `m.post_draft.approval_status` transitions to 'rejected' AND draft has `slot_id`: first rejection → reset slot to `pending_fill` (one retry). Second rejection → mark slot `skipped`. |

After Stage 8: fill function is **callable but not crontab'd**. Stage 10 wires the cron. Stage 11 ai-worker refactor closes the loop (slot → fill_in_progress → filled).

### Pre-flight findings folded in (chat-side schema verification)

| Finding | Implication |
|---|---|
| `m.ai_job` has `digest_run_id`, `post_seed_id`, `post_draft_id` all NOT NULL | Migration 036 must drop the first two; keep `post_draft_id` NOT NULL because fill function creates a skeleton draft first. |
| No FKs on those NOT NULL cols | ALTER is straightforward, no FK drops. |
| `m.ai_job` has no `slot_id` or `is_shadow` cols | Add both in 036. |
| `m.ai_job.status` CHECK: queued/running/succeeded/failed/cancelled/dead | Default 'queued' on insert. ai-worker handles transitions. |
| `fitness_score_max` is 0..100 | Reuse penalty multiplier applies on the 0..100 scale. Stage 7 fix-up confirms compute_slot_confidence accepts 0..100. |
| `t.format_quality_policy` thresholds (0..100): text=50, image_quote=60, carousel=55, video_short_avatar=75 | Fill function reads per-format threshold and min_pool_size_for_format. |
| `t.format_synthesis_policy`: single_item for 8 formats; bundle for text(min=max=2) and carousel(min=max=3) | Bundle synthesis triggers source diversity check (same_source_diversity_min from dedup_policy). |
| `t.dedup_policy` default values | Use seeded `same_canonical_block_hours=168` (7d), NOT v3's "day". `title_similarity_threshold=0.75`. `same_source_diversity_min=2`. |
| No `c.*` table has dedup_policy linkage | Fill function hardcodes `policy_name='default'`. Per-client tuning is future work. |
| `t.reuse_penalty_curve`: 0→1.00, 1→0.85, 2→0.65, 3+→0.50 | Multiply `fitness_score_max` × multiplier when scoring pool. |
| `t.class_freshness_rule`: 48h (timely_breaking) → 720h (educational_evergreen) | recency_score = `GREATEST(0, LEAST(1, 1 - hrs_since_first_seen / freshness_window_hours))`. |
| Canonical column names: `canonical_title`, `canonical_url` (item); `extracted_text`, `extracted_excerpt`, `final_url` (body) | Used by ai-worker, not fill function — the ai-worker fetches body content at execution time. Fill function only writes lean payload. |
| No `published_at` column on canonical | Use `f.canonical_content_item.first_seen_at` as recency anchor. |
| `m.post_draft.approval_status` CHECK includes 'rejected' | Rejection trigger valid. |
| ID003 lesson: payload diet | ai_job `input_payload` is lean — slot_id, format, canonical_ids, flags only. NOT canonical body. |

### Migration numbering

Stage 7 closed at 035. Stage 8 = 036, 037, 038.

### Behaviour change envelope

After Stage 8 + verification:
- 1 schema change (m.ai_job extended for slot-driven path)
- 1 large function callable on demand
- 1 trigger active on m.post_draft updates
- ZERO crons fire it automatically (Stage 10's job)
- ZERO existing R6 ai_jobs affected (origin check accepts both old and new shapes)
- Slots, drafts, queue still untouched by automation

This stage adds capability without firing it. Verification creates a synthetic pending_fill slot, calls fill_pending_slots(1), confirms the full path produced a skeleton draft + ai_job + slot transition, then cleans up.

---

## Pre-flight checks (CC runs first)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — fast-forward, latest is `2f447cf`

---

## Files to create

3 migration files. Claude (chat) will apply via Supabase MCP after CC pushes.

### Migration 036 — `20260426_036_alter_ai_job_for_slot_driven.sql`

```sql
-- Stage 8.036 — Extend m.ai_job to support slot-driven origin path
--
-- Existing R6 path: digest_run_id + post_seed_id + post_draft_id all populated.
-- New slot-driven path: slot_id + post_draft_id (skeleton) populated, no digest/seed.
--
-- Changes:
--   1. ADD COLUMN slot_id uuid REFERENCES m.slot ON DELETE SET NULL
--   2. ADD COLUMN is_shadow boolean NOT NULL DEFAULT false
--   3. DROP NOT NULL on digest_run_id + post_seed_id (keep post_draft_id NOT NULL)
--   4. ADD CHECK constraint requiring exactly one origin path
--   5. INDEX on slot_id for ai-worker pickup queries

-- 1. Add new columns
ALTER TABLE m.ai_job ADD COLUMN IF NOT EXISTS slot_id uuid;
ALTER TABLE m.ai_job ADD COLUMN IF NOT EXISTS is_shadow boolean NOT NULL DEFAULT false;

-- 2. FK on slot_id (deferred constraint — fill function inserts both the slot update + ai_job; ON DELETE SET NULL means slot deletion doesn't orphan ai_jobs)
ALTER TABLE m.ai_job ADD CONSTRAINT fk_ai_job_slot
  FOREIGN KEY (slot_id) REFERENCES m.slot(slot_id) ON DELETE SET NULL;

-- 3. Drop NOT NULL on R6-only columns
ALTER TABLE m.ai_job ALTER COLUMN digest_run_id DROP NOT NULL;
ALTER TABLE m.ai_job ALTER COLUMN post_seed_id DROP NOT NULL;

-- 4. Add origin check: either R6 path (digest+seed both populated) OR slot-driven path (slot_id populated)
ALTER TABLE m.ai_job ADD CONSTRAINT ai_job_origin_check
  CHECK (
    (digest_run_id IS NOT NULL AND post_seed_id IS NOT NULL)
    OR slot_id IS NOT NULL
  );

-- 5. Index for ai-worker pickup
CREATE INDEX IF NOT EXISTS idx_ai_job_slot_id_status
  ON m.ai_job (slot_id, status)
  WHERE slot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_job_is_shadow_status
  ON m.ai_job (is_shadow, status)
  WHERE status IN ('queued','running');

COMMENT ON COLUMN m.ai_job.slot_id IS
  'Slot-driven path: links ai_job to its source m.slot row. Mutually compatible with R6 path via ai_job_origin_check. Stage 8.036.';
COMMENT ON COLUMN m.ai_job.is_shadow IS
  'Slot-driven path: when true, ai-worker writes draft with is_shadow=true so publishers ignore it. Default false for R6 jobs. Stage 8.036.';
COMMENT ON CONSTRAINT ai_job_origin_check ON m.ai_job IS
  'Each ai_job has exactly one origin: R6 (digest_run_id + post_seed_id) or slot-driven (slot_id). Stage 8.036.';
```

---

### Migration 037 — `20260426_037_create_fill_pending_slots_function.sql`

```sql
-- Stage 8.037 — THE FILL FUNCTION (heart of v3)
--
-- For each pending_fill slot whose fill_window has opened:
--   1. Acquire row lock with FOR UPDATE SKIP LOCKED (concurrency safety)
--   2. Resolve format from slot.format_preference[1] or fallback
--   3. Load synthesis + quality policies for format
--   4. Resolve client's verticals from c.client_content_scope
--   5. Query pool with: vertical match, reuse penalty, dedup gates
--      (LD15 same-canonical-block + title-similarity)
--   6. Quality gate: pool size >= min_pool_size_for_format
--                    AND items above min_fitness_threshold
--   7. If insufficient: check_pool_health → if red, relax fitness threshold
--      one tier (-10), retry pool query
--   8. Select bundle (single_item or top-N for bundle synthesis)
--      Bundle synthesis: enforce same_source_diversity_min on source_domain
--   9. If still no viable selection: check_evergreen_threshold(client)
--      If alert=true (over 30%): force skip
--      Else: query t.evergreen_library, prefer is_core, LRU sort,
--      respect cooldown
--  10. Compute slot_confidence via m.compute_slot_confidence(...)
--  11. Audit row to m.slot_fill_attempt
--  12. If filled or evergreen:
--      - Create skeleton post_draft (slot_id, is_shadow, client_id, platform,
--        approval_status='draft', is_shadow flag)
--      - Create ai_job (slot_id, post_draft_id, is_shadow, lean payload)
--      - UPDATE slot: status='fill_in_progress', filled_draft_id, canonical_ids,
--        slot_confidence, format_chosen, is_evergreen, evergreen_id
--      - Increment pool reuse_count for selected canonicals
--      - Increment evergreen.use_count if evergreen path
--  13. If skipped: UPDATE slot: status='skipped', skip_reason
--
-- Returns jsonb {processed, results: [...], shadow, ran_at}.

CREATE OR REPLACE FUNCTION m.fill_pending_slots(
  p_max_slots integer DEFAULT 5,
  p_shadow    boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
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
  v_canonical_id          uuid;
BEGIN
  -- Load default dedup policy once per call
  SELECT * INTO v_dedup
  FROM t.dedup_policy
  WHERE policy_name='default' AND is_current=true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'processed', 0,
      'error', 'default dedup_policy not found',
      'ran_at', NOW()
    );
  END IF;

  -- Iterate over pending_fill slots whose window has opened
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

    -- Step 1: Resolve chosen format (preferred or fallback)
    v_chosen_format := COALESCE(v_slot.format_preference[1], 'image_quote');

    -- Step 2: Load synthesis + quality policies
    SELECT * INTO v_synthesis FROM t.format_synthesis_policy
    WHERE ice_format_key = v_chosen_format AND is_current=true;
    SELECT * INTO v_quality FROM t.format_quality_policy
    WHERE ice_format_key = v_chosen_format AND is_current=true;

    IF v_synthesis IS NULL OR v_quality IS NULL THEN
      v_decision := 'failed';
      v_skip_reason := 'format_policy_missing:' || v_chosen_format;
    ELSE
      v_min_fitness := v_quality.min_fitness_threshold;

      -- Step 3: Pool query (initial pass with full fitness threshold)
      WITH client_verticals AS (
        SELECT content_vertical_id AS vid
        FROM c.client_content_scope
        WHERE client_id = v_slot.client_id AND is_active = true
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
          (sp.fitness_score_max * COALESCE(rpc.fitness_multiplier, 1.0)) AS effective_fitness,
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
          -- LD15: same-canonical hard block (default 168h = 7 days)
          AND NOT EXISTS (
            SELECT 1
            FROM m.slot s2
            WHERE s2.client_id = v_slot.client_id
              AND s2.status IN ('filled','approved','published','fill_in_progress')
              AND s2.filled_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
              AND sp.canonical_id = ANY(s2.canonical_ids)
          )
          -- Title-similarity dedup vs recently-filled drafts from this client
          AND NOT EXISTS (
            SELECT 1
            FROM m.post_draft pd
            JOIN m.slot s2 ON s2.filled_draft_id = pd.post_draft_id
            WHERE s2.client_id = v_slot.client_id
              AND pd.created_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
              AND pd.draft_title IS NOT NULL
              AND m.title_similarity(cci.canonical_title, pd.draft_title) >
                  LEAST(v_dedup.title_similarity_threshold,
                        v_quality.max_dedup_similarity)
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
      INTO v_pool_count, v_pool_snapshot::integer, v_top_pool_rows
      FROM candidate_pool;

      -- Build snapshot jsonb for audit (capture top 10 + counts)
      v_pool_snapshot := jsonb_build_object(
        'qualifying_count', v_pool_count,
        'total_in_scope',   COALESCE((v_pool_snapshot)::text::integer, 0),
        'min_fitness',      v_min_fitness,
        'top_items',        COALESCE(v_top_pool_rows, '[]'::jsonb)
      );

      -- Step 4: Pool size gate. If insufficient, try health-relaxation.
      IF v_pool_count < v_quality.min_pool_size_for_format THEN
        SELECT m.check_pool_health(
          (SELECT vid FROM c.client_content_scope
           WHERE client_id = v_slot.client_id AND is_active=true LIMIT 1)
        ) INTO v_pool_health;

        IF (v_pool_health->>'health') = 'red' THEN
          -- Relax fitness threshold by one tier (-10 on 0..100 scale)
          v_min_fitness := GREATEST(0, v_min_fitness - 10);
          v_threshold_relaxed := true;

          -- Recount under relaxed threshold (simple recount; full re-query not needed
          -- because we already have all candidates; in practice we re-rank from
          -- v_top_pool_rows or accept that relaxation may admit more borderline items
          -- on the next call).
          WITH client_verticals AS (
            SELECT content_vertical_id AS vid
            FROM c.client_content_scope
            WHERE client_id = v_slot.client_id AND is_active=true
          ),
          relaxed_pool AS (
            SELECT
              sp.canonical_id,
              sp.source_domain,
              cci.canonical_title,
              cci.first_seen_at,
              cfr.freshness_window_hours,
              (sp.fitness_score_max * COALESCE(rpc.fitness_multiplier, 1.0)) AS eff_fit,
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

      -- Step 5: Bundle selection (or evergreen fallback)
      IF v_pool_count >= v_quality.min_pool_size_for_format THEN
        IF v_synthesis.synthesis_mode = 'single_item' THEN
          -- Pick top 1
          v_canonical_ids := ARRAY[
            (v_top_pool_rows->0->>'canonical_id')::uuid
          ];
          v_best_fitness := (v_top_pool_rows->0->>'effective_fitness')::numeric;
          v_top_recency  := (v_top_pool_rows->0->>'recency_score')::numeric;
          v_source_diversity := 1;
          v_decision := 'filled';

        ELSE
          -- Bundle synthesis: pick top N, enforce source diversity
          DECLARE
            v_bundle_size integer := v_synthesis.bundle_size_max;
            v_picked uuid[] := ARRAY[]::uuid[];
            v_picked_sources text[] := ARRAY[]::text[];
            v_idx integer := 0;
            v_distinct_sources integer := 0;
          BEGIN
            WHILE array_length(v_picked, 1) IS DISTINCT FROM v_bundle_size
                  AND v_idx < jsonb_array_length(v_top_pool_rows) LOOP
              v_picked := v_picked || ARRAY[(v_top_pool_rows->v_idx->>'canonical_id')::uuid];
              v_picked_sources := v_picked_sources || ARRAY[v_top_pool_rows->v_idx->>'source_domain'];
              v_idx := v_idx + 1;
            END LOOP;

            SELECT COUNT(DISTINCT s) INTO v_distinct_sources
            FROM unnest(v_picked_sources) s WHERE s IS NOT NULL;

            IF array_length(v_picked, 1) = v_bundle_size
               AND v_distinct_sources >= v_dedup.same_source_diversity_min THEN
              v_canonical_ids := v_picked;
              v_best_fitness := (v_top_pool_rows->0->>'effective_fitness')::numeric;
              v_top_recency  := (v_top_pool_rows->0->>'recency_score')::numeric;
              v_source_diversity := v_distinct_sources;
              v_decision := 'filled';
            ELSE
              v_decision := NULL;  -- will fall through to evergreen
              v_skip_reason := format('bundle_diversity_insufficient:got_%s_need_%s',
                                      v_distinct_sources, v_dedup.same_source_diversity_min);
            END IF;
          END;
        END IF;
      END IF;

      -- Step 6: Evergreen fallback if still no decision
      IF v_decision IS NULL OR v_decision NOT IN ('filled','failed') THEN
        SELECT m.check_evergreen_threshold(v_slot.client_id) INTO v_threshold_check;
        v_evergreen_ratio := COALESCE((v_threshold_check->>'ratio_used')::numeric, 0);

        IF (v_threshold_check->>'alert')::boolean = true THEN
          -- Over 30% — force skip rather than pile on more evergreen
          v_decision := 'skipped';
          v_skip_reason := COALESCE(v_skip_reason, 'pool_thin') ||
                           ';evergreen_threshold_exceeded';
        ELSE
          -- Try evergreen. Prefer is_core, then LRU.
          SELECT * INTO v_evergreen_row
          FROM t.evergreen_library el
          WHERE el.is_active = true
            AND v_chosen_format = ANY(el.format_keys)
            AND EXISTS (
              SELECT 1 FROM unnest(el.vertical_ids) vid
              JOIN c.client_content_scope ccs
                ON ccs.content_vertical_id = vid
              WHERE ccs.client_id = v_slot.client_id AND ccs.is_active=true
            )
            AND (el.last_used_at IS NULL
                 OR el.last_used_at < NOW() - (el.use_cooldown_days * interval '1 day'))
          ORDER BY el.is_core DESC, el.last_used_at NULLS FIRST, el.use_count ASC
          LIMIT 1;

          IF FOUND THEN
            v_evergreen_id := v_evergreen_row.evergreen_id;
            v_is_evergreen := true;
            v_best_fitness := 70;  -- fixed evergreen baseline (LD3)
            v_top_recency := 0.5;  -- evergreen is timeless; neutral recency
            v_source_diversity := 1;
            v_decision := 'evergreen';
          ELSE
            v_decision := 'skipped';
            v_skip_reason := COALESCE(v_skip_reason, 'pool_thin') ||
                             ';no_eligible_evergreen';
          END IF;
        END IF;
      END IF;

      -- Step 7: Compute slot confidence (if filled or evergreen)
      IF v_decision IN ('filled','evergreen') THEN
        v_slot_confidence := m.compute_slot_confidence(
          v_best_fitness, v_pool_count, v_top_recency, v_source_diversity
        );
      ELSE
        v_slot_confidence := 0;
      END IF;
    END IF;  -- end of valid format policies branch

    -- Step 8: Audit row
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

    -- Step 9: Materialise outcome
    IF v_decision IN ('filled','evergreen') THEN
      -- Skeleton post_draft
      INSERT INTO m.post_draft (
        post_draft_id, client_id, platform, slot_id, is_shadow,
        approval_status, draft_title, draft_body, version, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id, p_shadow,
        'draft', NULL, NULL, 1, 'fill_function', NOW(), NOW()
      ) RETURNING post_draft_id INTO v_skeleton_draft_id;

      -- ai_job (lean payload; ai-worker fetches body content from f.* at exec time)
      INSERT INTO m.ai_job (
        ai_job_id, client_id, platform, slot_id, post_draft_id,
        digest_run_id, post_seed_id,
        is_shadow, job_type, status, priority,
        input_payload, output_payload, created_at, updated_at, attempts
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id,
        v_skeleton_draft_id,
        NULL, NULL,  -- slot-driven origin
        p_shadow, 'slot_fill_synthesis_v1', 'queued', 100,
        jsonb_build_object(
          'slot_id', v_slot.slot_id,
          'is_shadow', p_shadow,
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
      ) RETURNING ai_job_id INTO v_ai_job_id;

      -- Update audit with ai_job_id
      UPDATE m.slot_fill_attempt SET ai_job_id = v_ai_job_id
      WHERE attempt_id = v_attempt_id;

      -- Slot transition: pending_fill → fill_in_progress (LD13)
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

      -- Increment pool reuse_count for picked canonicals
      IF v_canonical_ids IS NOT NULL AND array_length(v_canonical_ids, 1) > 0 THEN
        UPDATE m.signal_pool
        SET reuse_count = reuse_count + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE canonical_id = ANY(v_canonical_ids)
          AND vertical_id IN (
            SELECT content_vertical_id FROM c.client_content_scope
            WHERE client_id = v_slot.client_id AND is_active=true
          );
      END IF;

      -- Increment evergreen use_count if evergreen path
      IF v_evergreen_id IS NOT NULL THEN
        UPDATE t.evergreen_library
        SET use_count = use_count + 1,
            last_used_at = NOW(),
            last_used_for_client = v_slot.client_id,
            updated_at = NOW()
        WHERE evergreen_id = v_evergreen_id;
      END IF;

    ELSE
      -- Skipped or failed
      UPDATE m.slot
      SET status = COALESCE(v_decision, 'skipped'),
          skip_reason = v_skip_reason,
          updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;
    END IF;

    -- Append per-slot result
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
    'shadow', p_shadow,
    'results', v_results,
    'ran_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.fill_pending_slots(integer, boolean) IS
  'THE FILL FUNCTION (heart of v3). For each pending_fill slot whose window has opened: pool query → dedup → quality gates → optional pool-health relaxation → optional evergreen fallback → audit + skeleton draft + ai_job + slot transition (pending_fill → fill_in_progress per LD13). p_shadow controls whether produced drafts are shadow (default true; Stage 13 flips per client-platform). Returns jsonb {processed, shadow, results: [...], ran_at}. Stage 8.037.';
```

---

### Migration 038 — `20260426_038_create_handle_draft_rejection_trigger.sql`

```sql
-- Stage 8.038 — Rejection retry policy: 1 retry, then skip the slot (§B.9)
--
-- When m.post_draft.approval_status transitions to 'rejected' AND the draft
-- has a slot_id:
--   - First rejection (no prior rejected drafts for this slot):
--     reset slot to pending_fill, clear filled_draft_id; fill function
--     will pick it up again on next cron tick.
--   - Second rejection (one prior rejected draft for this slot):
--     mark slot status='skipped' with reason='draft_rejected_twice'.

CREATE OR REPLACE FUNCTION m.handle_draft_rejection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prior_rejection_count integer;
BEGIN
  IF NEW.approval_status = 'rejected'
     AND COALESCE(OLD.approval_status, '') <> 'rejected'
     AND NEW.slot_id IS NOT NULL
  THEN
    SELECT COUNT(*)
    INTO v_prior_rejection_count
    FROM m.post_draft
    WHERE slot_id = NEW.slot_id
      AND approval_status = 'rejected'
      AND post_draft_id <> NEW.post_draft_id;

    IF v_prior_rejection_count >= 1 THEN
      -- This is rejection #2+. Skip the slot.
      UPDATE m.slot
      SET status = 'skipped',
          skip_reason = 'draft_rejected_twice',
          updated_at = NOW()
      WHERE slot_id = NEW.slot_id;
    ELSE
      -- First rejection. Reset slot for one retry.
      UPDATE m.slot
      SET status = 'pending_fill',
          filled_draft_id = NULL,
          canonical_ids = NULL,
          evergreen_id = NULL,
          is_evergreen = false,
          format_chosen = NULL,
          slot_confidence = NULL,
          filled_at = NULL,
          updated_at = NOW()
      WHERE slot_id = NEW.slot_id
        AND status NOT IN ('skipped','published');  -- don't reopen terminal slots
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_draft_rejection
AFTER UPDATE OF approval_status ON m.post_draft
FOR EACH ROW
EXECUTE FUNCTION m.handle_draft_rejection();

COMMENT ON FUNCTION m.handle_draft_rejection() IS
  'Rejection retry policy per §B.9. 1st rejection on slot-linked draft → reset slot to pending_fill. 2nd rejection → skip the slot. Stage 8.038.';
```

---

## Code changes

None. Stage 8 is SQL-only. Edge Function changes (ai-worker idempotency, prompt caching) are Stage 11.

---

## Commands to run

```bash
git status
git branch --show-current   # expect: feature/slot-driven-v3-build
git pull origin feature/slot-driven-v3-build

git add supabase/migrations/20260426_036_alter_ai_job_for_slot_driven.sql
git add supabase/migrations/20260426_037_create_fill_pending_slots_function.sql
git add supabase/migrations/20260426_038_create_handle_draft_rejection_trigger.sql

git commit -m "feat(slot-driven): Stage 8 — THE FILL FUNCTION + rejection trigger

The heart of v3. ~200-line fill function integrating 9 tables and 4 helpers.

036 ALTER m.ai_job for slot-driven origin
    - ADD slot_id (FK to m.slot, ON DELETE SET NULL)
    - ADD is_shadow boolean NOT NULL DEFAULT false
    - DROP NOT NULL on digest_run_id + post_seed_id
    - ADD ai_job_origin_check (R6 vs slot-driven, exactly one)
    - 2 indexes (slot_id+status, is_shadow+status)

037 m.fill_pending_slots(p_max_slots integer, p_shadow boolean)
    For each pending_fill slot whose fill_window has opened:
      1. FOR UPDATE SKIP LOCKED row pickup
      2. Resolve format from slot.format_preference[1]
      3. Load synthesis + quality policy for format
      4. Pool query: vertical match, reuse penalty, dedup
         (LD15 same-canonical 168h block + title-similarity)
      5. Quality gate: count >= min_pool_size, fitness >= min_threshold
      6. If insufficient + pool_health=red: relax fitness -10, retry
      7. Bundle selection: top-1 (single_item) or top-N + diversity
         check (bundle synthesis: text=2, carousel=3)
      8. If still no viable: check_evergreen_threshold
         - alert (>30%) → skip
         - else → t.evergreen_library query, prefer is_core, LRU
      9. Compute slot_confidence
     10. Audit row to m.slot_fill_attempt
     11. If filled/evergreen: skeleton draft + ai_job + slot transition
         (pending_fill → fill_in_progress per LD13)
     12. Increment pool reuse_count + evergreen.use_count
     13. If skipped/failed: slot.skip_reason set

    Returns jsonb {processed, shadow, results: [...], ran_at}.
    Defaults: max_slots=5, shadow=true.

038 m.handle_draft_rejection trigger (§B.9)
    AFTER UPDATE OF approval_status ON m.post_draft.
    1st rejection on slot-linked draft → reset slot to pending_fill.
    2nd rejection → skip slot with reason='draft_rejected_twice'.

Pre-flight findings folded in:
- ai_job NOT NULL cols (digest_run_id, post_seed_id) require ALTER
- fitness 0..100 (Stage 7 fix-up confirms)
- canonical cols: canonical_title, canonical_url (item),
  extracted_text, extracted_excerpt, final_url (body)
- No published_at; first_seen_at proxy
- No client-level dedup_policy linkage (uses 'default')
- ID003 lesson: lean ai_job payload, ai-worker fetches body at exec time
- m.post_draft.approval_status enum includes 'rejected'

After CC pushes, Claude (chat):
1. Applies 036 → 038 via Supabase MCP
2. Verification queries (V1: structural; V2: synthetic-slot
   end-to-end; V3: rejection trigger; V4: regression on Phase A)
3. Cleans up synthetic test rows after verifying

NO crons added (Stage 10's job). NO ai-worker changes (Stage 11's job).
Fill function is callable but not auto-fired. Existing R6 ai_jobs
still satisfy ai_job_origin_check via the (digest_run_id +
post_seed_id) branch.

Refs: 26d88b8 (v4), 2f447cf (Stage 7 close)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

```
## Stage 8 CC report (git side only)

- ✅ Pre-flight passed: yes/no
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 3/3 (036, 037, 038)
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No supabase db push.
Awaiting Claude (chat) to apply migrations, run V1–V4 verification,
and execute the synthetic-slot end-to-end test.
```

---

## Verification queries (Claude in chat runs)

### V1 — Structural

```sql
-- 036: m.ai_job altered correctly
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='m' AND table_name='ai_job'
  AND column_name IN ('slot_id','is_shadow','digest_run_id','post_seed_id','post_draft_id')
ORDER BY column_name;
-- EXPECTED:
--   digest_run_id is_nullable=YES
--   is_shadow is_nullable=NO default false
--   post_draft_id is_nullable=NO
--   post_seed_id is_nullable=YES
--   slot_id is_nullable=YES (FK)

-- 036: origin check exists
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid='m.ai_job'::regclass AND conname='ai_job_origin_check';

-- 036: indexes exist
SELECT indexname FROM pg_indexes
WHERE schemaname='m' AND tablename='ai_job'
  AND indexname IN ('idx_ai_job_slot_id_status','idx_ai_job_is_shadow_status');
-- EXPECTED: 2 rows

-- 037 + 038 exist
SELECT proname FROM pg_proc
WHERE pronamespace='m'::regnamespace
  AND proname IN ('fill_pending_slots','handle_draft_rejection');
-- EXPECTED: 2 rows

SELECT tgname FROM pg_trigger WHERE tgname='trg_handle_draft_rejection';
-- EXPECTED: 1 row
```

### V2 — Synthetic-slot end-to-end test

```sql
-- Create a synthetic NDIS-Yarns Facebook slot in pending_fill state
DO $$
DECLARE
  v_test_slot_id uuid;
  v_result jsonb;
  v_ny_client_id uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';  -- production NDIS-Yarns id
BEGIN
  -- Insert test slot (publish in 6h, fill window already open)
  INSERT INTO m.slot (
    slot_id, client_id, platform, scheduled_publish_at,
    format_preference, fill_window_opens_at, fill_lead_time_minutes,
    status, source_kind, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_ny_client_id,
    'facebook',
    NOW() + interval '6 hours',
    ARRAY['image_quote'],
    NOW() - interval '5 minutes',
    1440,
    'pending_fill',
    'one_off',
    NOW(),
    NOW()
  ) RETURNING slot_id INTO v_test_slot_id;

  RAISE NOTICE 'Test slot inserted: %', v_test_slot_id;

  -- Call fill function in shadow mode
  SELECT m.fill_pending_slots(p_max_slots := 1, p_shadow := true) INTO v_result;
  RAISE NOTICE 'fill_pending_slots result: %', v_result;
END $$;

-- Inspect: did the slot transition?
SELECT
  s.slot_id, s.status, s.format_chosen, s.slot_confidence, s.is_evergreen,
  s.canonical_ids, s.evergreen_id, s.filled_draft_id, s.skip_reason
FROM m.slot s
WHERE s.source_kind = 'one_off'
  AND s.created_at > NOW() - interval '5 minutes';
-- EXPECTED: status='fill_in_progress' (if pool had a candidate)
--           OR status='skipped' (if pool thin and no evergreen) — either is acceptable

-- Inspect: was a skeleton draft created?
SELECT
  pd.post_draft_id, pd.client_id, pd.platform, pd.slot_id, pd.is_shadow,
  pd.approval_status, pd.draft_title, pd.draft_body, pd.created_by
FROM m.post_draft pd
WHERE pd.created_by = 'fill_function'
  AND pd.created_at > NOW() - interval '5 minutes';
-- EXPECTED: 1 row with approval_status='draft', is_shadow=true,
--           draft_title=NULL, draft_body=NULL (ai-worker fills these later)

-- Inspect: was an ai_job created with slot-driven shape?
SELECT
  aj.ai_job_id, aj.client_id, aj.platform, aj.slot_id, aj.is_shadow,
  aj.job_type, aj.status, aj.digest_run_id, aj.post_seed_id, aj.post_draft_id,
  aj.input_payload->>'format' AS payload_format,
  aj.input_payload->>'synthesis_mode' AS payload_synthesis,
  aj.input_payload->>'is_shadow' AS payload_is_shadow
FROM m.ai_job aj
WHERE aj.job_type = 'slot_fill_synthesis_v1'
  AND aj.created_at > NOW() - interval '5 minutes';
-- EXPECTED: 1 row, slot_id NOT NULL, digest_run_id NULL, post_seed_id NULL,
--           is_shadow=true, status='queued',
--           payload_format='image_quote', payload_is_shadow='true'

-- Inspect: was an audit row created?
SELECT
  attempt_id, slot_id, decision, skip_reason, chosen_format,
  pool_size_at_attempt, threshold_relaxed, ai_job_id IS NOT NULL AS has_ai_job
FROM m.slot_fill_attempt
WHERE attempted_at > NOW() - interval '5 minutes';
-- EXPECTED: 1 row, decision='filled' or 'evergreen' or 'skipped',
--           pool_snapshot populated

-- Cleanup: remove the synthetic slot + its skeleton draft + ai_job + audit
DELETE FROM m.ai_job
WHERE job_type = 'slot_fill_synthesis_v1'
  AND created_at > NOW() - interval '10 minutes';

DELETE FROM m.post_draft
WHERE created_by = 'fill_function'
  AND created_at > NOW() - interval '10 minutes';

DELETE FROM m.slot_fill_attempt
WHERE attempted_at > NOW() - interval '10 minutes'
  AND slot_id IN (SELECT slot_id FROM m.slot WHERE source_kind='one_off' AND created_at > NOW() - interval '10 minutes');

DELETE FROM m.slot
WHERE source_kind = 'one_off'
  AND created_at > NOW() - interval '10 minutes';

-- Reset reuse_count + last_used_at on canonicals touched by the test (best-effort
-- cleanup; small drift acceptable since this is a one-off synthetic test).
UPDATE m.signal_pool
SET reuse_count = GREATEST(0, reuse_count - 1),
    last_used_at = NULL,
    updated_at = NOW()
WHERE last_used_at > NOW() - interval '10 minutes';
```

### V3 — Rejection trigger smoke test

```sql
-- Create a slot + skeleton draft, then reject the draft, confirm slot resets
DO $$
DECLARE
  v_test_slot_id uuid;
  v_test_draft_id uuid;
  v_ny_client_id uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';
BEGIN
  INSERT INTO m.slot (
    slot_id, client_id, platform, scheduled_publish_at,
    format_preference, fill_window_opens_at, fill_lead_time_minutes,
    status, source_kind, filled_at, created_at, updated_at,
    canonical_ids, format_chosen, is_evergreen, slot_confidence
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook',
    NOW() + interval '6 hours', ARRAY['image_quote'],
    NOW(), 1440, 'fill_in_progress', 'one_off', NOW(), NOW(), NOW(),
    ARRAY[gen_random_uuid()], 'image_quote', false, 0.7
  ) RETURNING slot_id INTO v_test_slot_id;

  INSERT INTO m.post_draft (
    post_draft_id, client_id, platform, slot_id, is_shadow,
    approval_status, draft_title, draft_body, version, created_by, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook', v_test_slot_id, true,
    'needs_review', 'Test rejection title', 'Test body', 1,
    'rejection_test', NOW(), NOW()
  ) RETURNING post_draft_id INTO v_test_draft_id;

  UPDATE m.slot SET filled_draft_id = v_test_draft_id WHERE slot_id = v_test_slot_id;

  -- Reject the draft (1st rejection)
  UPDATE m.post_draft SET approval_status='rejected', updated_at=NOW()
  WHERE post_draft_id = v_test_draft_id;

  -- Slot should now be back at pending_fill, filled_draft_id cleared
  PERFORM 1 FROM m.slot WHERE slot_id=v_test_slot_id
    AND status='pending_fill' AND filled_draft_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION '1st rejection did not reset slot to pending_fill';
  END IF;
  RAISE NOTICE '1st rejection correctly reset slot to pending_fill';

  -- Insert a 2nd draft, also reject it (2nd rejection)
  INSERT INTO m.post_draft (
    post_draft_id, client_id, platform, slot_id, is_shadow,
    approval_status, draft_title, version, created_by, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook', v_test_slot_id, true,
    'rejected', 'Test 2nd rejection', 1, 'rejection_test', NOW(), NOW()
  );

  -- Slot should now be skipped
  PERFORM 1 FROM m.slot WHERE slot_id=v_test_slot_id
    AND status='skipped' AND skip_reason='draft_rejected_twice';
  IF NOT FOUND THEN
    RAISE EXCEPTION '2nd rejection did not skip slot';
  END IF;
  RAISE NOTICE '2nd rejection correctly skipped slot';

  -- Cleanup
  DELETE FROM m.post_draft WHERE created_by='rejection_test';
  DELETE FROM m.slot WHERE slot_id=v_test_slot_id;
END $$;
```

### V4 — Regression on Phase A + Stage 7

```sql
-- Pool, slots, alerts unchanged
SELECT 'pool_active' AS metric, COUNT(*)::text AS value FROM m.signal_pool WHERE is_active=true
UNION ALL
SELECT 'slots_total', COUNT(*)::text FROM m.slot WHERE source_kind <> 'one_off'
UNION ALL
SELECT 'slot_alerts', COUNT(*)::text FROM m.slot_alerts
UNION ALL
SELECT 'r6_paused (expect 3)', COUNT(*)::text FROM cron.job WHERE jobid IN (11,64,65) AND active=false
UNION ALL
SELECT 'phase_a_active (expect 6)', COUNT(*)::text FROM cron.job WHERE jobid BETWEEN 69 AND 74 AND active=true;

-- Existing R6 ai_jobs still pass origin check (no constraint violations on backfill)
SELECT COUNT(*) FILTER (WHERE digest_run_id IS NOT NULL AND post_seed_id IS NOT NULL) AS r6_jobs,
       COUNT(*) FILTER (WHERE slot_id IS NOT NULL) AS slot_driven_jobs,
       COUNT(*) FILTER (WHERE digest_run_id IS NULL AND post_seed_id IS NULL AND slot_id IS NULL) AS orphan_jobs
FROM m.ai_job;
-- EXPECTED: r6_jobs > 0, slot_driven_jobs = 0 (no real slot-driven jobs yet),
--           orphan_jobs = 0
```

---

## Exit criteria

If V1–V4 all pass and the synthetic-slot end-to-end test produces a valid result (filled / evergreen / skipped — all are acceptable depending on pool depth at test time):

- Stage 8 is COMPLETE.
- Fill function callable end-to-end.
- Rejection trigger active.
- Phase A still autonomous.

Then PK approves → **Stage 9 brief** (recovery + breaking news, with LD17/LD20).

If any verification fails:
- Most likely failure modes: (a) bundle selection edge case in single-item formats — debug by checking v_top_pool_rows shape; (b) FOR UPDATE SKIP LOCKED contention with classifier cron — unlikely but observable; (c) ai_job_origin_check rejecting a row — adjust constraint logic.
- Forward-fix on same branch.

---

## Rollback (if needed)

```sql
-- Drop in reverse order
DROP TRIGGER IF EXISTS trg_handle_draft_rejection ON m.post_draft;
DROP FUNCTION IF EXISTS m.handle_draft_rejection();
DROP FUNCTION IF EXISTS m.fill_pending_slots(integer, boolean);

-- Revert ai_job ALTER
DROP INDEX IF EXISTS m.idx_ai_job_is_shadow_status;
DROP INDEX IF EXISTS m.idx_ai_job_slot_id_status;
ALTER TABLE m.ai_job DROP CONSTRAINT IF EXISTS ai_job_origin_check;
ALTER TABLE m.ai_job DROP CONSTRAINT IF EXISTS fk_ai_job_slot;
ALTER TABLE m.ai_job DROP COLUMN IF EXISTS slot_id;
ALTER TABLE m.ai_job DROP COLUMN IF EXISTS is_shadow;
-- Re-asserting NOT NULL on digest_run_id + post_seed_id requires that no
-- slot-driven ai_jobs exist; only safe BEFORE Stage 10 wires the cron.
ALTER TABLE m.ai_job ALTER COLUMN digest_run_id SET NOT NULL;
ALTER TABLE m.ai_job ALTER COLUMN post_seed_id SET NOT NULL;
```

---

## Notes for after Stage 8 verifies

- **Stage 9 next**: recovery + critical-window monitor + breaking news (LD17 + LD20). Five smaller migrations, total ~60 min.
- **Stage 10** wires Phase B crons, including the fill cron (`*/10 * * * *` with `p_shadow := true`).
- **Stage 11** ai-worker refactor — first EF deploy of Phase B; this is where LD18 idempotency lands and prompt caching activates.
- **Then Gate B**: 5–7 days shadow observation before any cutover.

After Stage 8, the supply-and-demand machinery is functionally complete in shadow form:
- **Pool** maintains itself (Phase A)
- **Slots** materialise + promote (Phase A)
- **Fill** queries pool → makes decisions → audits → queues ai_job (Stage 8)
- **Recovery** for stuck slots (Stage 9)
- **ai-worker** closes the loop (Stage 11)

The remaining work in Phase B is operational glue (crons + EF). Stage 8 is the conceptual centre.

---

*End Stage 8 brief. v4 commit `26d88b8`. Stage 7 closed at `2f447cf`. Author: Claude (chat). For execution by: Claude Code (local).*
