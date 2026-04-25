# Slot-Driven Architecture — Detailed Design v3 (BUILD-READY)

**Date:** 26 April 2026 Sunday early morning AEST (composed during late Saturday session)
**Status:** Architectural design brief v3 — supersedes v2 (`2026-04-25-slot-driven-architecture-detailed-design-v2.md`, commit `a49f0b6`) and v1 (commit `1c433083`)
**Authors:** PK + Claude, post 7-LLM cumulative external review (4 first round + 3 second round on v2)
**Purpose:** Build-ready architectural specification. This document, plus the migration sequence in §K, is sufficient to begin Phase A implementation.

---

## 0. Changelog v2 → v3

V2 was "design-complete." V3 is "build-ready." Three more external reviewers walked the v2 SQL/scenarios and surfaced 10 must-fix integrity gaps + 6 should-add hardening items. V3 incorporates all of them, restructures the slot state machine, adds two new defensive crons, and includes a concrete migration sequence in §K.

### Must-fix consensus from reviewers (all 10 incorporated in v3)

| # | Fix | Reviewer source | v3 §reference |
|---|---|---|---|
| F1 | Pool completeness backfill cron — closes async-trigger race window | All 3 | §A.6 |
| F2 | Slot state machine with `fill_in_progress` intermediate state | All 3 | §B.8 |
| F3 | Dedup config table (`t.dedup_policy`) — no magic numbers | 2 of 3 | §B.6 |
| F4 | Same-canonical-same-day platform hard block | 1 of 3 (high impact) | §B.4 |
| F5 | Evergreen ratio guardrail (7-day rolling) | 2 of 3 | §D.7 |
| F6 | Breaking news auto-insert path (architectural) | All 3 | §B.12 |
| F7 | Pool reconciliation recomputes `fitness_per_format` + `pool_expires_at` | 2 of 3 | §A.7 |
| F8 | Slot promotion buffer for cron lag tolerance | 1 of 3 | §B.3 |
| F9 | Pool entry refresh logic — don't reset expiry on stale repeats | 1 of 3 (subtle bug) | §A.5 |
| F10 | Stuck slot recovery cron (explicit, not implicit) | All 3 | §B.10 |

### Should-add hardening (all 6 incorporated)

| # | Item | v3 §reference |
|---|---|---|
| H1 | Pool health gate (global pool quality assessment) | §D.8 |
| H2 | Critical window alert (<3h to publish, no draft) | §B.11 |
| H3 | Hot breaking news view (dashboard surface) | §B.12 |
| H4 | Evergreen staleness columns (`last_reviewed_at`, `staleness_score`) | §C.1.4 |
| H5 | Diversity gate concrete SQL (denorm `source_domain`) | §B.5 |
| H6 | Cron heartbeat health table | §D.9 |

### Restructures vs v2

- Slot status enum extended with `fill_in_progress` (state machine §B.8)
- Diversity gate moved from "sketch" to concrete SQL using denormalised `source_domain`
- Evergreen library gains staleness tracking columns
- Reconciliation function fully recomputes (not just class)
- Phase A migration sequence written in §K as exact apply-in-order list

---

## 1. Locked decisions — extended (v3)

| # | Decision | Locked value | Source |
|---|---|---|---|
| LD1 | Pool scope | Vertical-scoped with client filter at fill-time | 4 reviewers + PK |
| LD2 | Pool storage | Materialised (`m.signal_pool` table) | 3 reviewers + PK |
| LD3 | Empty pool fallback | Evergreen library (never skip default) | 4 reviewers + PK |
| LD4 | Lead time | 24 hours | PK |
| LD5 | Format synthesis | Format-aware: single-item for image_quote/video/timely_breaking; bundle 2 for text; bundle 3 for carousel | Reviewer 4 + PK |
| LD6 | Throttle migration | AEST-day basis | All + PK |
| LD7 | Prompt caching | Day 1, ephemeral cache_control on stable prefix | All |
| LD8 | Lightweight title-similarity dedup in v1 | YES (pg_trgm + keyword overlap) | Reviewer 4 + PK |
| LD9 | Reuse penalty curve | Table-driven, soft penalty | Reviewer 4 |
| LD10 | Slot confidence score | YES, composite metric | Reviewer 4 |
| LD11 | Phased rollout | Foundation → shadow → cutover | All |
| LD12 | Evergreen as ratio not just emergency | Track 7-day ratio with guardrail (NEW v3) | v3 round reviewers |
| **LD13** | **Slot state machine** | **`future → pending_fill → fill_in_progress → filled → approved → published`** + skipped/failed terminals (NEW v3) | v3 round reviewers |
| **LD14** | **Pool completeness backfill** | **Required, not optional** (NEW v3) | v3 round reviewers |
| **LD15** | **Same-canonical platform-day hard block** | **YES, separate from reuse penalty** (NEW v3) | v3 round reviewers |
| **LD16** | **Dedup thresholds in config table** | **`t.dedup_policy`, no hardcoded values** (NEW v3) | v3 round reviewers |
| **LD17** | **Breaking news auto-insert** | **Architecture-level, not manual-only** (NEW v3) | v3 round reviewers |

### Decisions still open after v3

| # | Question | v3 default if no input | §reference |
|---|---|---|---|
| OAQ1 | Slot horizon: 7d default | 7d locked unless objected | §B.2 |
| OAQ2 | Evergreen 20-30% baseline mix | NO for v1, emergency only; ratio guardrail catches drift | §D.7 |
| OAQ3 | DST cron drift acceptable | YES for sweeps, materialiser unaffected | §C.4 |
| OAQ4 | Critical window alert mechanism | Dashboard view + email per occurrence | §B.11 |
| OAQ5 | Per-client format preferences | Inherit `t.platform_format_mix_default` for v1 | §B.2 |
| OAQ6 | Breaking news max-per-client-per-day cap | 2 urgent slots/client/day | §B.12 |

---

## 2. Framing (compact)

The current architecture treats signal cardinality as work cardinality (1 canonical → many drafts). Publish capacity is bounded; supply isn't. ~93% of generated drafts never publish. Cost ($190/mo) is the alarm; architectural mismatch is the disease.

V3 inverts this. Slots are first-class scheduled events. The pool is materialised, vertical-scoped, time-windowed. A fill function picks one signal bundle per slot, exactly when needed, never speculatively. Cost scales with slots, not signals.

V3 hardens v2 against the silent failure modes three reviewers independently identified: false-filled zombie slots, async pool-entry races, evergreen creep, breaking-news structural blindness, magic-number thresholds, and stuck-state recovery gaps.

---

## 3. Pipeline at a glance — v3 with new states

```
┌─ UPSTREAM (UNCHANGED) ────────────────────────────────────────────────────┐
│   RSS → ingest → canonicalise → body fetch → R4 classify → vertical map  │
└───────────────────┬──────────────────────────────────────────┬───────────┘
                    │ trigger (canonical_vertical_map)         │ ALSO via
                    ↓                                          │ backfill cron
┌─ MIDDLE LAYER ────┴──────────────────────────────────────────┴───────────┐
│                                                                          │
│   m.signal_pool                          m.slot                          │
│   - vertical-scoped                      - 24h fill_window               │
│   - class-aware expiry                   - state machine                 │
│   - source_domain denorm                 - confidence score              │
│   - reuse_count                          - is_evergreen flag             │
│   - is_active                            - source_kind: recurring|       │
│                                            one_off|breaking_news_insert  │
│                                                                          │
│           ┌────────────────────────────────────┐                         │
│           │  Pre-fill quality gates:            │                         │
│           │  - title similarity + kw overlap    │                         │
│           │  - reuse penalty (soft)             │                         │
│           │  - same-canonical-day hard block    │                         │
│           │  - min_fitness, min_pool_size       │                         │
│           │  - diversity (multi-item only)      │                         │
│           │  - pool_health adjustments          │                         │
│           └────────────────┬───────────────────┘                         │
│                            ↓                                              │
│           gate-pass: bundle of N canonicals                              │
│           gate-fail: try evergreen library (LRU + staleness)             │
│           both fail: skip with reason                                    │
│                            ↓                                              │
│           m.slot_fill_attempt (audit row, full pool snapshot)            │
│                            ↓                                              │
│           STATE: pending_fill → fill_in_progress                         │
│                            ↓                                              │
│           m.ai_job (synthesis payload, prompt-cached prefix)             │
│                                                                          │
└────────────────────────────┬─────────────────────────────────────────────┘
                             ↓
┌─ DOWNSTREAM (UNCHANGED + AEST throttle) ─────────────────────────────────┐
│   ai-worker → m.post_draft (slot_id) → STATE: fill_in_progress → filled  │
│           ↓                                                              │
│   auto-approver → approved or needs_review                               │
│           ↓ (approved)                                                   │
│   M11 trigger → m.post_publish_queue (AEST-day throttle)                 │
│           ↓                                                              │
│   Publishers (FB/IG/LI/YT) → m.post_publish → STATE: published           │
└──────────────────────────────────────────────────────────────────────────┘

┌─ DEFENSIVE CRONS (NEW IN v3) ────────────────────────────────────────────┐
│   • backfill-missing-pool-entries (every 15m) — closes trigger race      │
│   • recover-stuck-fill-in-progress (every 15m) — fixes zombie slots       │
│   • try-urgent-breaking-fills (every 15m) — auto-inserts breaking slots  │
│   • critical-window-monitor (every 30m) — alerts <3h-to-publish gaps     │
│   • pool-health-check (every hour) — global gate adjustment              │
│   • cron-heartbeat-check (every hour) — meta-monitoring                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION A — How signals flow IN (v3)

This section traces a single RSS item from feed reader to pool-ready state. **Section A.6 is new in v3 — pool completeness backfill — and §A.7 is rewritten to fully recompute fitness on drift.**

## A.1-A.4 Upstream (unchanged from v2)

Feeds → ingest → canonicalise → body fetch → R4 classify → vertical mapping. See v2 §A.1-A.4. No changes.

## A.5 — Pool entry trigger (REVISED in v3)

V2 trigger had a subtle bug: ON CONFLICT DO UPDATE always reset `pool_expires_at`, which meant a repeat-feed of an old item could re-freshen it indefinitely.

**v3 trigger function:**

```sql
CREATE OR REPLACE FUNCTION m.refresh_signal_pool()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_class           text;
  v_freshness_hours int;
  v_fit_per_format  jsonb;
  v_max_fit         numeric;
  v_body_status     text;
  v_source_domain   text;
  v_existing_class  text;
  v_existing_active boolean;
BEGIN
  -- Pre-conditions: body + class present
  SELECT cci.content_class_code, ccb.fetch_status,
         split_part(replace(cci.url, 'https://', ''), '/', 1)
    INTO v_class, v_body_status, v_source_domain
  FROM f.canonical_content_item cci
  LEFT JOIN f.canonical_content_body ccb 
    ON ccb.canonical_content_item_id = cci.canonical_content_item_id
  WHERE cci.canonical_content_item_id = NEW.canonical_content_item_id;

  IF v_class IS NULL OR v_body_status != 'success' THEN
    RETURN NEW;  -- not yet ready; backfill cron (§A.6) will catch later
  END IF;

  SELECT pool_window_hours INTO v_freshness_hours
  FROM t.class_freshness_rule WHERE content_class_code = v_class;
  IF v_freshness_hours IS NULL THEN v_freshness_hours := 48; END IF;

  SELECT 
    jsonb_object_agg(format_key, fitness_score),
    MAX(fitness_score)
  INTO v_fit_per_format, v_max_fit
  FROM t.class_format_fitness
  WHERE content_class_code = v_class AND is_current = true;

  -- Check existing entry (for refresh logic)
  SELECT content_class, is_active 
    INTO v_existing_class, v_existing_active
  FROM m.signal_pool
  WHERE vertical_id = NEW.content_vertical_id
    AND canonical_id = NEW.canonical_content_item_id;

  -- v3 FIX (F9): only refresh expiry if class changed OR existing entry is inactive
  IF v_existing_class IS NULL THEN
    -- New entry
    INSERT INTO m.signal_pool (
      vertical_id, canonical_id, content_class, source_domain,
      fitness_score_max, fitness_per_format,
      pool_entered_at, pool_expires_at, is_active
    ) VALUES (
      NEW.content_vertical_id, NEW.canonical_content_item_id, v_class, v_source_domain,
      v_max_fit, v_fit_per_format,
      NOW(), NOW() + (v_freshness_hours || ' hours')::interval, true
    );
  ELSIF v_existing_class != v_class OR v_existing_active = false THEN
    -- Class changed OR was inactive — full refresh including expiry
    UPDATE m.signal_pool
    SET content_class = v_class,
        source_domain = v_source_domain,
        fitness_score_max = v_max_fit,
        fitness_per_format = v_fit_per_format,
        pool_expires_at = NOW() + (v_freshness_hours || ' hours')::interval,
        is_active = true,
        updated_at = NOW()
    WHERE vertical_id = NEW.content_vertical_id
      AND canonical_id = NEW.canonical_content_item_id;
  ELSE
    -- Same class, still active — only update fitness if matrix changed (rare)
    UPDATE m.signal_pool
    SET fitness_score_max = v_max_fit,
        fitness_per_format = v_fit_per_format,
        updated_at = NOW()
    WHERE vertical_id = NEW.content_vertical_id
      AND canonical_id = NEW.canonical_content_item_id
      AND fitness_score_max != v_max_fit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_signal_pool
AFTER INSERT OR UPDATE ON f.canonical_vertical_map
FOR EACH ROW
EXECUTE FUNCTION m.refresh_signal_pool();
```

**Behavioural difference from v2:**
- v2: every trigger fire reset `pool_expires_at` → repeat feeds re-freshened stale news
- v3: expiry only resets when class actually changed OR entry was inactive (genuine refresh)

## A.6 — NEW: Pool completeness backfill cron (F1)

**The problem v3 solves:** R4 classification, body fetch, and vertical mapping are 3 async processes. The trigger fires on `f.canonical_vertical_map` insert, but if vertical mapping happens BEFORE classification completes, the trigger silently skips. When classification later completes, no trigger refires. The canonical never enters the pool. **Permanent silent signal loss.**

**v3 fix:**

```sql
CREATE OR REPLACE FUNCTION m.backfill_missing_pool_entries()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted int := 0;
  v_row RECORD;
BEGIN
  -- Find canonicals that are READY but NOT in pool
  FOR v_row IN
    SELECT cci.canonical_content_item_id, cvm.content_vertical_id
    FROM f.canonical_content_item cci
    JOIN f.canonical_content_body ccb 
      ON ccb.canonical_content_item_id = cci.canonical_content_item_id
    JOIN f.canonical_vertical_map cvm 
      ON cvm.canonical_content_item_id = cci.canonical_content_item_id
    WHERE ccb.fetch_status = 'success'
      AND cci.content_class_code IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM m.signal_pool sp
        WHERE sp.canonical_id = cci.canonical_content_item_id
          AND sp.vertical_id = cvm.content_vertical_id
      )
      -- Don't re-attempt very old canonicals (they'd be expired anyway)
      AND cci.created_at > NOW() - interval '7 days'
  LOOP
    -- Synthetically fire the trigger logic
    PERFORM m.refresh_signal_pool_for_pair(
      v_row.canonical_content_item_id, 
      v_row.content_vertical_id
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'backfilled', v_inserted,
    'ran_at', NOW()
  );
END;
$$;

-- Helper: extract trigger logic into callable function
CREATE OR REPLACE FUNCTION m.refresh_signal_pool_for_pair(
  p_canonical_id uuid, 
  p_vertical_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
-- (Same body as trigger function but operating on parameters instead of NEW)
-- Implementation omitted here for brevity; same logic as A.5 trigger
$$;

-- Cron registration
SELECT cron.schedule(
  'backfill-missing-pool-entries-every-15m',
  '*/15 * * * *',
  $$SELECT m.backfill_missing_pool_entries();$$
);
```

**Effect:** Pool completeness is GUARANTEED within 15 minutes regardless of upstream async ordering. Trigger handles the happy path; cron handles the race-window misses.

## A.7 — Pool reconciliation (REVISED in v3 — F7)

V2 reconciliation only updated `content_class` and `is_active`. V3 fully recomputes fitness when class changes or `t.class_format_fitness` is updated.

```sql
CREATE OR REPLACE FUNCTION m.reconcile_signal_pool()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_orphaned         int;
  v_class_drifted    int;
  v_fitness_updated  int;
  v_expiry_updated   int;
BEGIN
  -- 1. Orphaned: canonical no longer in vertical_map
  WITH orphaned AS (
    UPDATE m.signal_pool sp
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM f.canonical_vertical_map cvm
        WHERE cvm.canonical_content_item_id = sp.canonical_id
          AND cvm.content_vertical_id = sp.vertical_id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_orphaned FROM orphaned;

  -- 2. Class drift + full fitness recompute (v3 F7)
  WITH drifted AS (
    UPDATE m.signal_pool sp
    SET content_class = cci.content_class_code,
        fitness_per_format = (
          SELECT jsonb_object_agg(format_key, fitness_score)
          FROM t.class_format_fitness
          WHERE content_class_code = cci.content_class_code 
            AND is_current = true
        ),
        fitness_score_max = (
          SELECT MAX(fitness_score)
          FROM t.class_format_fitness
          WHERE content_class_code = cci.content_class_code 
            AND is_current = true
        ),
        pool_expires_at = sp.pool_entered_at + (
          (SELECT pool_window_hours FROM t.class_freshness_rule 
           WHERE content_class_code = cci.content_class_code) || ' hours'
        )::interval,
        updated_at = NOW()
    FROM f.canonical_content_item cci
    WHERE sp.canonical_id = cci.canonical_content_item_id
      AND sp.is_active = true
      AND sp.content_class != cci.content_class_code
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_class_drifted FROM drifted;

  -- 3. Fitness-matrix drift (when t.class_format_fitness was updated)
  WITH fitness_updated AS (
    UPDATE m.signal_pool sp
    SET fitness_per_format = (
          SELECT jsonb_object_agg(format_key, fitness_score)
          FROM t.class_format_fitness
          WHERE content_class_code = sp.content_class 
            AND is_current = true
        ),
        fitness_score_max = (
          SELECT MAX(fitness_score)
          FROM t.class_format_fitness
          WHERE content_class_code = sp.content_class 
            AND is_current = true
        ),
        updated_at = NOW()
    WHERE sp.is_active = true
      AND sp.fitness_score_max != (
        SELECT MAX(fitness_score)
        FROM t.class_format_fitness
        WHERE content_class_code = sp.content_class 
          AND is_current = true
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_fitness_updated FROM fitness_updated;

  RETURN jsonb_build_object(
    'orphaned_deactivated', v_orphaned,
    'class_drift_corrected', v_class_drifted,
    'fitness_recomputed', v_fitness_updated,
    'reconciled_at', NOW()
  );
END;
$$;
```

---

# SECTION B — How signals flow OUT (v3)

This section traces a slot from materialisation through publish, with v3 hardening.

## B.1 — Schedule rule (unchanged)

`c.client_publish_schedule` defines recurring rules. No schema change.

## B.2 — Slot materialisation (essentially unchanged from v2)

Function `m.materialise_slots(7)` runs nightly. See v2 §B.2 for the function. V3 unchanged.

## B.3 — Slot promotion (REVISED in v3 — F8)

V2 used `fill_window_opens_at <= NOW()`. If cron lags 10-15 minutes, promotion happens late, fill window effectively shrinks, more thin-pool outcomes.

**v3 fix — buffer:**

```sql
CREATE OR REPLACE FUNCTION m.promote_slots_to_pending()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE v_count int;
BEGIN
  UPDATE m.slot
  SET status = 'pending_fill', updated_at = NOW()
  WHERE status = 'future'
    AND fill_window_opens_at <= NOW() + interval '10 minutes';  -- v3: buffer
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT cron.schedule(
  'promote-slots-to-pending-every-5m',
  '*/5 * * * *',
  $$SELECT m.promote_slots_to_pending();$$
);
```

**Effect:** Promotion is tolerant of cron lag up to 10 min. No effective fill-window shrinkage.

## B.4 — Pool query at fill time (REVISED in v3 — F4 + F15)

V3 adds the same-canonical-platform-day hard block (F4) and uses dedup config table values (F3/F15).

```sql
-- Pool query (used inside m.fill_pending_slots)
WITH pool_with_penalty AS (
  SELECT 
    sp.pool_entry_id,
    sp.canonical_id,
    sp.source_domain,
    sp.content_class,
    sp.fitness_score_max,
    (sp.fitness_per_format->>p_format)::numeric AS format_fitness,
    sp.reuse_count,
    COALESCE(rpc.penalty_applied, 0) AS reuse_penalty,
    (sp.fitness_per_format->>p_format)::numeric 
      - COALESCE(rpc.penalty_applied, 0) AS adj_score
  FROM m.signal_pool sp
  LEFT JOIN t.reuse_penalty_curve rpc 
    ON sp.reuse_count BETWEEN rpc.reuse_count_min AND rpc.reuse_count_max
  WHERE sp.vertical_id = p_vertical_id
    AND sp.is_active = true
    AND sp.fitness_per_format ? p_format
),
title_blocked AS (
  -- v3: dedup thresholds from t.dedup_policy (F3/F15)
  SELECT pwp.canonical_id
  FROM pool_with_penalty pwp
  JOIN f.canonical_content_item cci 
    ON cci.canonical_content_item_id = pwp.canonical_id
  WHERE EXISTS (
    SELECT 1
    FROM m.post_publish pp
    JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
    JOIN t.dedup_policy dp ON dp.policy_key = 'default'
    WHERE pp.client_id = p_client_id
      AND pp.published_at > NOW() - (dp.dedup_window_days || ' days')::interval
      AND (
        m.title_similarity(cci.title, pd.draft_title) > dp.title_similarity_threshold
        OR m.keyword_overlap(cci.title, pd.draft_title) > dp.keyword_overlap_threshold
      )
  )
),
canonical_used_today AS (
  -- v3 NEW (F4): same canonical hard-blocked from being used 
  -- on multiple platforms for SAME client SAME AEST day
  SELECT DISTINCT unnest(filled_canonical_ids) AS canonical_id
  FROM m.slot
  WHERE client_id = p_client_id
    AND DATE(scheduled_publish_at AT TIME ZONE 'Australia/Sydney') = 
        DATE((SELECT scheduled_publish_at FROM m.slot WHERE slot_id = p_slot_id) 
             AT TIME ZONE 'Australia/Sydney')
    AND status IN ('filled','approved','published','fill_in_progress')
    AND slot_id != p_slot_id
)
SELECT canonical_id, source_domain, content_class, format_fitness, 
       reuse_count, adj_score
FROM pool_with_penalty
WHERE adj_score >= p_min_fitness
  AND canonical_id NOT IN (SELECT canonical_id FROM title_blocked)
  AND canonical_id NOT IN (SELECT canonical_id FROM canonical_used_today)  -- v3 F4
ORDER BY adj_score DESC
LIMIT p_bundle_max * 2;  -- pre-fetch larger; gates trim
```

**Effect:** 
- F4 prevents the silent-fail case where reuse penalty was insufficient — same-day cross-platform use of identical canonical is now structurally impossible
- F3 thresholds tunable without migration (just UPDATE `t.dedup_policy`)

## B.5 — Quality gates with concrete diversity (REVISED in v3 — H5)

V2 sketched the diversity gate. V3 implements it concretely using denormalised `source_domain`.

```sql
-- After pool query returns candidate bundle, before AI call
WITH bundle AS (
  -- p_candidates from pool query above
  SELECT * FROM unnest(p_candidates) WITH ORDINALITY AS t(c, ord)
)
SELECT
  COUNT(*) AS bundle_size,
  COUNT(DISTINCT source_domain) AS distinct_sources,
  COUNT(DISTINCT content_class) AS distinct_classes,
  COUNT(*) FILTER (WHERE format_fitness >= 0.7) AS high_fitness_count,
  CASE
    WHEN COUNT(*) < p_min_bundle_size THEN 'fail_size'
    WHEN p_diversity_required AND 
         COUNT(DISTINCT source_domain) < 2 AND 
         COUNT(DISTINCT content_class) < 2 THEN 'fail_diversity'
    ELSE 'pass'
  END AS gate_outcome
FROM bundle;
```

**Diversity logic:** Multi-item formats require ≥2 distinct sources OR ≥2 distinct classes. Either dimension satisfies. Source domain catches "all from ABC News" pattern; class diversity catches "all timely_breaking" pattern.

## B.6 — Dedup config table (NEW in v3 — F3/F15/LD16)

Eliminates magic numbers from the fill function.

```sql
CREATE TABLE t.dedup_policy (
  policy_key                   text         PRIMARY KEY,
  title_similarity_threshold   numeric(3,2) NOT NULL DEFAULT 0.7,
  keyword_overlap_threshold    numeric(3,2) NOT NULL DEFAULT 0.6,
  dedup_window_days            int          NOT NULL DEFAULT 5,
  notes                        text,
  is_current                   boolean      NOT NULL DEFAULT true,
  version                      int          NOT NULL DEFAULT 1,
  created_at                   timestamptz  NOT NULL DEFAULT NOW(),
  updated_at                   timestamptz  NOT NULL DEFAULT NOW()
);

INSERT INTO t.dedup_policy (policy_key, title_similarity_threshold, 
                            keyword_overlap_threshold, dedup_window_days, notes)
VALUES 
  ('default', 0.70, 0.60, 5, 'Default policy — tune in shadow phase'),
  ('strict',  0.65, 0.50, 7, 'Stricter policy for sensitive verticals'),
  ('lenient', 0.80, 0.70, 3, 'Lenient policy for high-volume verticals');
```

Tune values with `UPDATE t.dedup_policy ...` — no migration needed for threshold changes.

## B.7 — Synthesis prompt (unchanged from v2)

See v2 §B.7 for prompt caching structure with `cache_control: ephemeral`. v3 unchanged.

## B.8 — Slot state machine (REVISED in v3 — F2/LD13)

V2 used `pending_fill → filled` directly. V3 introduces `fill_in_progress` to eliminate "false filled" states.

**v3 state machine:**

```
   future
     │ (fill_window_opens_at <= NOW + 10min, F8 buffer)
     ↓
   pending_fill
     │ (fill function locks slot, applies gates)
     │
     ├─[gates_pass]──> fill_in_progress (F2 NEW)
     │                       │ (ai-worker generates draft)
     │                       │
     │                       ├─[draft_created]──> filled
     │                       │                       │
     │                       │                       │ (auto-approver)
     │                       │                       ↓
     │                       │              ┌─[approved]───────> approved
     │                       │              ├─[needs_review]──── (manual)
     │                       │              └─[rejected]
     │                       │                       │ 
     │                       │                       ↓ (1 retry)
     │                       │                  pending_fill
     │                       │                       │ (or skipped:rejected_repeatedly)
     │                       │
     │                       ├─[ai_failed]──> pending_fill (with retry cap)
     │                       │
     │                       └─[stuck >30m]──> pending_fill (recovery cron F10)
     │
     ├─[gates_fail+evergreen_available]──> fill_in_progress (evergreen)
     │
     └─[no_evergreen]──> skipped (skip_reason)

   approved → published (after publisher fires)
   skipped (terminal)
   failed (terminal — 3 attempts exhausted)
```

**Slot status enum updated:**
```sql
ALTER TABLE m.slot
  DROP CONSTRAINT IF EXISTS m_slot_status_check;
ALTER TABLE m.slot
  ADD CONSTRAINT m_slot_status_check
  CHECK (status IN ('future','pending_fill','fill_in_progress',
                    'filled','approved','published','skipped','failed'));
```

**Fill function changes:** Where v2 set `status='filled'` after gate pass + ai_job insert, v3 sets `status='fill_in_progress'`. Status transitions to `'filled'` ONLY when ai-worker writes the draft successfully.

```sql
-- Inside m.fill_pending_slots after ai_job insert:
UPDATE m.slot
SET status = 'fill_in_progress',  -- v3 F2
    filled_at = NOW(),  -- timestamp of fill attempt start
    filled_canonical_ids = v_selected_canonicals,
    filled_format_used = v_format_used,
    is_evergreen = v_outcome = 'fallback_evergreen',  -- v3 H1
    slot_confidence = m.compute_slot_confidence(...),
    fill_attempt_count = fill_attempt_count + 1,
    updated_at = NOW()
WHERE slot_id = v_slot.slot_id;

-- ai-worker, after successful draft creation:
UPDATE m.slot
SET status = 'filled',
    filled_draft_id = v_draft_id,
    updated_at = NOW()
WHERE slot_id = v_slot_id 
  AND status = 'fill_in_progress';
```

## B.9 — Approval-rejection retry (unchanged from v2)

See v2 §B.9. The trigger fires on `m.post_draft.approval_status` UPDATE. Rejected drafts: 1 retry max, then `skipped:rejected_repeatedly`.

## B.10 — Stuck slot recovery cron (NEW in v3 — F10/LD13)

```sql
CREATE OR REPLACE FUNCTION m.recover_stuck_slots()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_recovered int;
  v_failed    int;
BEGIN
  -- Stuck in fill_in_progress > 30 min with no draft created
  WITH stuck AS (
    UPDATE m.slot
    SET status = CASE 
                   WHEN fill_attempt_count >= 3 THEN 'failed'
                   ELSE 'pending_fill'
                 END,
        skip_reason = CASE
                        WHEN fill_attempt_count >= 3 THEN 'recovery_max_attempts'
                        ELSE NULL
                      END,
        filled_at = NULL,
        filled_canonical_ids = NULL,
        is_evergreen = false,
        updated_at = NOW()
    WHERE status = 'fill_in_progress'
      AND filled_at < NOW() - interval '30 minutes'
      AND filled_draft_id IS NULL
    RETURNING fill_attempt_count
  )
  SELECT 
    COUNT(*) FILTER (WHERE fill_attempt_count < 3),
    COUNT(*) FILTER (WHERE fill_attempt_count >= 3)
  INTO v_recovered, v_failed
  FROM stuck;

  -- Also free pool entries that were optimistically marked used
  UPDATE m.signal_pool sp
  SET reuse_count = GREATEST(0, reuse_count - 1),
      used_in_slots = array_remove(used_in_slots, s.slot_id),
      updated_at = NOW()
  FROM m.slot s
  WHERE s.slot_id = ANY(sp.used_in_slots)
    AND s.status IN ('pending_fill','failed')
    AND s.filled_canonical_ids IS NULL;

  RETURN jsonb_build_object(
    'recovered_to_pending', v_recovered,
    'marked_failed', v_failed,
    'ran_at', NOW()
  );
END;
$$;

SELECT cron.schedule(
  'recover-stuck-fill-in-progress-every-15m',
  '*/15 * * * *',
  $$SELECT m.recover_stuck_slots();$$
);
```

## B.11 — Critical window monitor (NEW in v3 — H2)

Slots <3h from publish without a draft are emergencies. Surface for alert.

```sql
CREATE VIEW m.slots_in_critical_window AS
SELECT 
  s.slot_id,
  s.client_id,
  c.client_name,
  s.platform,
  s.scheduled_publish_at,
  s.status,
  s.fill_attempt_count,
  s.skip_reason,
  EXTRACT(EPOCH FROM (s.scheduled_publish_at - NOW())) / 60 AS minutes_to_publish
FROM m.slot s
JOIN c.client c ON c.client_id = s.client_id
WHERE s.scheduled_publish_at BETWEEN NOW() AND NOW() + interval '3 hours'
  AND s.status NOT IN ('approved','published','skipped','failed')
ORDER BY s.scheduled_publish_at ASC;

-- Optional alert function (writes to monitoring table for dashboard pickup)
CREATE TABLE m.slot_alerts (
  alert_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id      uuid NOT NULL REFERENCES m.slot(slot_id),
  alert_kind   text NOT NULL,
  severity     text NOT NULL,
  message      text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION m.scan_critical_windows()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE v_count int;
BEGIN
  INSERT INTO m.slot_alerts (slot_id, alert_kind, severity, message)
  SELECT 
    slot_id, 
    'critical_window_no_draft',
    'priority_1',
    format('Slot for %s on %s publishes in %s min without draft (status: %s)',
           client_name, platform, ROUND(minutes_to_publish), status)
  FROM m.slots_in_critical_window
  WHERE status IN ('pending_fill','fill_in_progress','future')
    AND NOT EXISTS (
      SELECT 1 FROM m.slot_alerts sa 
      WHERE sa.slot_id = m.slots_in_critical_window.slot_id
        AND sa.alert_kind = 'critical_window_no_draft'
        AND sa.created_at > NOW() - interval '1 hour'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT cron.schedule(
  'critical-window-monitor-every-30m',
  '*/30 * * * *',
  $$SELECT m.scan_critical_windows();$$
);
```

## B.12 — Breaking news auto-insert (NEW in v3 — F6/LD17/H3)

The 24h lead time creates a structural blind spot for breaking news. V3 architecturally addresses this.

```sql
-- Dashboard view: hot timely_breaking items in pool
CREATE VIEW m.hot_breaking_pool AS
SELECT 
  sp.pool_entry_id,
  sp.vertical_id,
  cv.vertical_name,
  sp.canonical_id,
  cci.title,
  cci.url,
  sp.fitness_score_max,
  sp.pool_entered_at,
  sp.pool_expires_at,
  EXTRACT(EPOCH FROM (sp.pool_expires_at - NOW())) / 3600 AS hours_until_expiry
FROM m.signal_pool sp
JOIN f.canonical_content_item cci 
  ON cci.canonical_content_item_id = sp.canonical_id
JOIN t.content_vertical cv 
  ON cv.content_vertical_id = sp.vertical_id
WHERE sp.content_class = 'timely_breaking'
  AND sp.is_active = true
  AND sp.fitness_score_max >= 0.75
  AND sp.pool_expires_at > NOW() + interval '2 hours'
ORDER BY sp.fitness_score_max DESC, sp.pool_entered_at DESC;

-- Auto-insert function
CREATE OR REPLACE FUNCTION m.try_urgent_breaking_fills(
  p_min_fitness numeric DEFAULT 0.80,
  p_max_per_client_per_day int DEFAULT 2,
  p_urgent_lead_minutes int DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_canonical RECORD;
  v_client    RECORD;
  v_inserted  int := 0;
  v_skipped   int := 0;
BEGIN
  -- Find unused high-fitness timely_breaking canonicals
  FOR v_canonical IN
    SELECT sp.canonical_id, sp.vertical_id, sp.fitness_score_max,
           sp.pool_expires_at
    FROM m.signal_pool sp
    WHERE sp.content_class = 'timely_breaking'
      AND sp.is_active = true
      AND sp.fitness_score_max >= p_min_fitness
      AND sp.pool_expires_at > NOW() + (p_urgent_lead_minutes || ' minutes')::interval
      AND sp.reuse_count = 0  -- not yet used
      AND NOT EXISTS (
        SELECT 1 FROM m.slot s
        WHERE sp.canonical_id = ANY(s.filled_canonical_ids)
          AND s.status NOT IN ('skipped','failed')
      )
  LOOP
    -- For each client mapped to this vertical, check if they have a 
    -- breaking-insert slot already today (cap)
    FOR v_client IN
      SELECT cs.client_id, cpp.platform
      FROM c.client_content_scope cs
      JOIN c.client_publish_profile cpp 
        ON cpp.client_id = cs.client_id
      WHERE cs.content_vertical_id = v_canonical.vertical_id
        AND cpp.is_enabled = true 
        AND cpp.status = 'active'
        AND (
          SELECT COUNT(*) FROM m.slot s
          WHERE s.client_id = cs.client_id
            AND s.source_kind = 'breaking_news_insert'
            AND DATE(s.scheduled_publish_at AT TIME ZONE 'Australia/Sydney') = 
                DATE(NOW() AT TIME ZONE 'Australia/Sydney')
        ) < p_max_per_client_per_day
    LOOP
      -- Check no scheduled slot in next 6h for this client+platform 
      -- (otherwise wait for that one to fill)
      IF NOT EXISTS (
        SELECT 1 FROM m.slot s
        WHERE s.client_id = v_client.client_id
          AND s.platform = v_client.platform
          AND s.scheduled_publish_at BETWEEN NOW() AND NOW() + interval '6 hours'
          AND s.status NOT IN ('skipped','failed','published')
      ) THEN
        -- Insert urgent breaking slot
        INSERT INTO m.slot (
          client_id, platform, scheduled_publish_at,
          format_preference, fill_window_opens_at,
          fill_lead_time_minutes, status, source_kind,
          source_rule_id
        ) VALUES (
          v_client.client_id, v_client.platform, 
          NOW() + (p_urgent_lead_minutes || ' minutes')::interval,
          ARRAY['image_quote','text']::text[],  -- formats with shortest production time
          NOW(),
          p_urgent_lead_minutes,
          'pending_fill',
          'breaking_news_insert',
          NULL
        )
        ON CONFLICT DO NOTHING;
        
        IF FOUND THEN v_inserted := v_inserted + 1;
                 ELSE v_skipped := v_skipped + 1; END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'urgent_slots_inserted', v_inserted,
    'skipped_caps', v_skipped,
    'ran_at', NOW()
  );
END;
$$;

SELECT cron.schedule(
  'try-urgent-breaking-fills-every-15m',
  '*/15 * * * *',
  $$SELECT m.try_urgent_breaking_fills();$$
);
```

**Effect:** When a high-fitness timely_breaking canonical enters the pool and there's no scheduled slot in the next 6h, the system auto-inserts a 2-hour-lead urgent slot (capped 2/client/day). The next fill cron picks it up. Architecture preserves slot-driven discipline while restoring breaking-news reactivity.

---

# SECTION C — Full data model (v3 additions)

## C.1 — New tables (additions vs v2)

### C.1.1 `m.signal_pool` — REVISED with `source_domain`

```sql
ALTER TABLE m.signal_pool 
  ADD COLUMN source_domain text;

CREATE INDEX idx_signal_pool_source_domain 
  ON m.signal_pool (vertical_id, source_domain) 
  WHERE is_active = true;
```

`source_domain` denormalised from canonical URL. Used in diversity gate. Populated by trigger in §A.5.

### C.1.2 `m.slot` — REVISED with v3 columns

```sql
ALTER TABLE m.slot
  -- v3 F2: status enum extended
  DROP CONSTRAINT IF EXISTS m_slot_status_check;
ALTER TABLE m.slot
  ADD CONSTRAINT m_slot_status_check
  CHECK (status IN ('future','pending_fill','fill_in_progress',
                    'filled','approved','published','skipped','failed'));

-- v3 H1: evergreen tracking  
ALTER TABLE m.slot
  ADD COLUMN is_evergreen boolean NOT NULL DEFAULT false;
```

### C.1.3 `t.dedup_policy` — NEW in v3

```sql
CREATE TABLE t.dedup_policy (
  policy_key                   text         PRIMARY KEY,
  title_similarity_threshold   numeric(3,2) NOT NULL DEFAULT 0.7,
  keyword_overlap_threshold    numeric(3,2) NOT NULL DEFAULT 0.6,
  dedup_window_days            int          NOT NULL DEFAULT 5,
  notes                        text,
  is_current                   boolean      NOT NULL DEFAULT true,
  version                      int          NOT NULL DEFAULT 1,
  created_at                   timestamptz  NOT NULL DEFAULT NOW(),
  updated_at                   timestamptz  NOT NULL DEFAULT NOW()
);
-- Seed values in §B.6
```

### C.1.4 `t.evergreen_library` — REVISED with staleness tracking (H4)

```sql
ALTER TABLE t.evergreen_library
  ADD COLUMN last_reviewed_at  timestamptz,
  ADD COLUMN staleness_score   numeric(3,2) DEFAULT 1.0 
                                CHECK (staleness_score BETWEEN 0 AND 1),
  ADD COLUMN is_core            boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN t.evergreen_library.staleness_score IS 
  '1.0 = fresh; below 0.7 = needs review; below 0.5 = should be retired';
COMMENT ON COLUMN t.evergreen_library.is_core IS 
  'Core evergreen items — foundational content that rarely needs review (e.g. "What is an NDIS plan?")';

-- Monthly review query (manual trigger)
CREATE VIEW t.evergreen_review_needed AS
SELECT 
  evergreen_id, vertical_id, title, content_summary,
  use_count, last_used_at, last_reviewed_at, staleness_score
FROM t.evergreen_library
WHERE is_active = true
  AND (
    last_reviewed_at IS NULL 
    OR last_reviewed_at < NOW() - interval '90 days'
    OR staleness_score < 0.7
    OR (use_count > 10 AND last_reviewed_at < NOW() - interval '30 days')
  )
ORDER BY staleness_score ASC, use_count DESC;
```

### C.1.5 `m.slot_alerts` — NEW in v3 (H2)

(See §B.11)

### C.1.6 `m.cron_health_check` — NEW in v3 (H6)

```sql
CREATE TABLE m.cron_health_check (
  jobname           text         PRIMARY KEY,
  expected_interval interval     NOT NULL,
  last_heartbeat    timestamptz,
  last_status       text         DEFAULT 'unknown',
  last_error        text,
  consecutive_failures int       NOT NULL DEFAULT 0,
  updated_at        timestamptz  NOT NULL DEFAULT NOW()
);

INSERT INTO m.cron_health_check (jobname, expected_interval) VALUES
  ('expire-signal-pool-hourly',                 '1 hour'),
  ('reconcile-signal-pool-daily',               '1 day'),
  ('backfill-missing-pool-entries-every-15m',  '15 minutes'),
  ('materialise-slots-nightly',                 '1 day'),
  ('promote-slots-to-pending-every-5m',        '5 minutes'),
  ('fill-pending-slots-every-10m',             '10 minutes'),
  ('recover-stuck-fill-in-progress-every-15m', '15 minutes'),
  ('try-urgent-breaking-fills-every-15m',      '15 minutes'),
  ('critical-window-monitor-every-30m',         '30 minutes'),
  ('pool-health-check-hourly',                  '1 hour');

-- Each cron job's first action: heartbeat write
-- Wrap pattern:
-- CREATE FUNCTION m.heartbeat_and_run(p_jobname text, p_payload regprocedure)
--   ...calls p_payload, captures result, updates cron_health_check
-- Used in cron registration for monitored jobs

-- Health check view
CREATE VIEW m.cron_health_status AS
SELECT 
  jobname,
  last_heartbeat,
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) / 60 AS minutes_since_heartbeat,
  expected_interval,
  CASE
    WHEN last_heartbeat IS NULL THEN 'never_ran'
    WHEN NOW() - last_heartbeat > 3 * expected_interval THEN 'critical'
    WHEN NOW() - last_heartbeat > 1.5 * expected_interval THEN 'warning'
    ELSE 'ok'
  END AS health_status,
  consecutive_failures,
  last_error
FROM m.cron_health_check;
```

## C.2 — All new/modified tables summary

| Table | Status in v3 | New columns |
|---|---|---|
| `m.signal_pool` | NEW (v2) | `source_domain` (v3) |
| `m.slot` | NEW (v2) | `is_evergreen` (v3); status enum extended |
| `m.slot_fill_attempt` | NEW (v2) | unchanged in v3 |
| `t.evergreen_library` | NEW (v2) | `last_reviewed_at`, `staleness_score`, `is_core` (v3) |
| `t.class_freshness_rule` | NEW (v2) | unchanged in v3 |
| `t.format_synthesis_policy` | NEW (v2) | unchanged in v3 |
| `t.format_quality_policy` | NEW (v2) | unchanged in v3 |
| `t.reuse_penalty_curve` | NEW (v2) | unchanged in v3 |
| `t.dedup_policy` | NEW (v3) | full table |
| `m.slot_alerts` | NEW (v3) | full table |
| `m.cron_health_check` | NEW (v3) | full table |
| `m.post_draft` | MODIFIED (v2) | `slot_id`, `is_shadow` |

## C.4 — Full cron schedule (v3)

| Jobname | Schedule | UTC | AEST | Function | New in v3? |
|---|---|---|---|---|---|
| `expire-signal-pool-hourly` | `5 * * * *` | hourly :05 | hourly :05 | `m.expire_signal_pool()` | — |
| `reconcile-signal-pool-daily` | `30 16 * * *` | 16:30 UTC | ~02:30 | `m.reconcile_signal_pool()` | revised |
| `backfill-missing-pool-entries-every-15m` | `*/15 * * * *` | 15-min | 15-min | `m.backfill_missing_pool_entries()` | **NEW v3** |
| `materialise-slots-nightly` | `0 15 * * *` | 15:00 UTC | ~01:00 | `m.materialise_slots(7)` | — |
| `promote-slots-to-pending-every-5m` | `*/5 * * * *` | 5-min | 5-min | `m.promote_slots_to_pending()` | revised buffer |
| `fill-pending-slots-every-10m` | `*/10 * * * *` | 10-min | 10-min | `m.fill_pending_slots(5)` | revised |
| `recover-stuck-fill-in-progress-every-15m` | `*/15 * * * *` | 15-min | 15-min | `m.recover_stuck_slots()` | **NEW v3** |
| `try-urgent-breaking-fills-every-15m` | `*/15 * * * *` | 15-min | 15-min | `m.try_urgent_breaking_fills()` | **NEW v3** |
| `critical-window-monitor-every-30m` | `*/30 * * * *` | 30-min | 30-min | `m.scan_critical_windows()` | **NEW v3** |
| `pool-health-check-hourly` | `15 * * * *` | hourly :15 | hourly :15 | `m.check_pool_health()` | **NEW v3** |
| `cron-heartbeat-check-hourly` | `45 * * * *` | hourly :45 | hourly :45 | `m.check_cron_heartbeats()` | **NEW v3** |

10 cron jobs total in v3 (vs 5 in v2).

---

# SECTION D — Cross-cutting concerns (v3)

## D.1 — Empty pool fallback (unchanged from v2)

## D.2 — Dedup (REVISED v3)

Three layers + config-driven (LD16):

| Layer | Rule | Config source |
|---|---|---|
| 1. Slot uniqueness | UNIQUE(client_id, platform, scheduled_publish_at) | hardcoded |
| 2. Reuse penalty (soft) | grows with reuse_count | `t.reuse_penalty_curve` |
| 3. Title-similarity (hard) | sim > threshold OR kw_overlap > threshold within window | `t.dedup_policy` |
| 4. Same-canonical-day (hard, v3) | canonical can't fill ≥2 slots same client same AEST day | hardcoded |

Layer 4 is the v3 addition (F4/LD15) — a structural guarantee, not a tuneable.

## D.3-D.6 (unchanged from v2 framing; updated SQL embedded above)

## D.7 — Evergreen ratio guardrail (NEW in v3 — LD12/F5)

```sql
-- Ratio query
CREATE VIEW m.evergreen_ratio_7d AS
SELECT 
  client_id,
  COUNT(*) FILTER (WHERE is_evergreen) * 1.0 / NULLIF(COUNT(*), 0) AS evergreen_ratio,
  COUNT(*) AS total_filled,
  COUNT(*) FILTER (WHERE is_evergreen) AS evergreen_count
FROM m.slot
WHERE filled_at > NOW() - interval '7 days'
  AND status IN ('filled','approved','published')
GROUP BY client_id;

-- Guardrail check (called inside fill function)
CREATE OR REPLACE FUNCTION m.check_evergreen_threshold(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_ratio numeric;
  v_alert text;
BEGIN
  SELECT evergreen_ratio INTO v_ratio
  FROM m.evergreen_ratio_7d
  WHERE client_id = p_client_id;
  
  IF v_ratio IS NULL THEN
    RETURN jsonb_build_object('ratio', 0, 'alert', 'no_data');
  END IF;
  
  IF v_ratio > 0.50 THEN
    v_alert := 'critical_evergreen_dominant';
  ELSIF v_ratio > 0.35 THEN
    v_alert := 'warning_evergreen_drift';
  ELSE
    v_alert := 'ok';
  END IF;
  
  RETURN jsonb_build_object(
    'ratio', v_ratio,
    'alert', v_alert,
    'recommendation', CASE
      WHEN v_alert = 'critical_evergreen_dominant' THEN 
        'lower_min_fitness_by_0.10_OR_extend_pool_lookback'
      WHEN v_alert = 'warning_evergreen_drift' THEN 
        'lower_min_fitness_by_0.05'
      ELSE 'no_action'
    END
  );
END;
$$;
```

The fill function checks this before AI call. If `warning_evergreen_drift`, it relaxes `min_fitness_threshold` by 0.05 for that client's slots in this batch. If `critical`, by 0.10.

## D.8 — Pool health gate (NEW in v3 — H1)

Global pool quality assessment, run before each fill batch.

```sql
CREATE OR REPLACE FUNCTION m.check_pool_health(p_vertical_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_total           int;
  v_high_quality    int;
  v_medium_quality  int;
  v_breaking        int;
  v_oldest_age_h    numeric;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE fitness_score_max >= 0.70),
    COUNT(*) FILTER (WHERE fitness_score_max BETWEEN 0.50 AND 0.70),
    COUNT(*) FILTER (WHERE content_class = 'timely_breaking'),
    EXTRACT(EPOCH FROM (NOW() - MIN(pool_entered_at))) / 3600
  INTO v_total, v_high_quality, v_medium_quality, v_breaking, v_oldest_age_h
  FROM m.signal_pool
  WHERE vertical_id = p_vertical_id 
    AND is_active = true;

  RETURN jsonb_build_object(
    'total', v_total,
    'high_quality_count', v_high_quality,
    'medium_quality_count', v_medium_quality,
    'breaking_count', v_breaking,
    'oldest_age_hours', v_oldest_age_h,
    'health', CASE
      WHEN v_high_quality >= 5 THEN 'healthy'
      WHEN v_high_quality >= 2 THEN 'lean'
      WHEN v_total >= 3 THEN 'stressed_relax_thresholds'
      ELSE 'thin_force_evergreen'
    END
  );
END;
$$;

-- Called by fill function once per (vertical, batch)
-- Adjusts thresholds OR forces evergreen path based on health
```

## D.9 — Cron heartbeat health (NEW in v3 — H6)

Each monitored cron writes a heartbeat at function entry. Health-check cron flags missing heartbeats. See §C.1.6.

---

# SECTION E — Imaginary test scenarios (v3 — 11 scenarios)

V2 had 8. V3 adds 3 to test the new fixes.

## E.1-E.8 (unchanged from v2)

See v2 §E.1-E.8.

## E.9 — NEW v3: Async pool entry race (tests F1)

**Setup:** Vertical mapping fires for canonical X at 10:00. R4 classifier was queued and fires at 10:08. The mapping trigger fired but `content_class_code` was NULL at that moment, so trigger returned without inserting pool entry. R4 completes at 10:08, writes class. **No trigger refires for vertical mapping.**

**v3 behaviour:**
- 10:15: `backfill-missing-pool-entries-every-15m` runs
- Function finds canonical X has body + class + vertical_map BUT not in pool
- Inserts pool entry via `m.refresh_signal_pool_for_pair()`
- Pool now contains canonical X with correct expiry from class freshness rule

**Pressure-test points:**
- Maximum delay from canonical-ready to pool-present: 15 min (the cron interval)
- If backfill misses (e.g. cron itself failed), heartbeat health check (D.9) detects in next hour
- What if 100 canonicals queue up during a downtime? Function processes sequentially; no concurrency issue at our scale (~50/day max)

## E.10 — NEW v3: Zombie slot recovery (tests F2 + F10)

**Setup:** Tuesday 10:00 AEST. NY-FB-Wed-10:00 slot is `pending_fill`. Fill function locks it at 10:05, applies gates, gates pass, inserts ai_job, sets status='fill_in_progress'. ai-worker picks up at 10:06, calls Claude. Claude returns HTTP 500 at 10:09. ai-worker marks ai_job failed but doesn't update slot.

**v3 behaviour:**
- Slot stays in `fill_in_progress` with `filled_at = 10:05`, no `filled_draft_id`
- 10:35: `recover-stuck-fill-in-progress-every-15m` runs
- Finds slot stuck >30 min (10:35 - 10:05 = 30 min)
- `fill_attempt_count = 1` (incremented on the original fill)
- Reverts status to `pending_fill`, frees the optimistically-marked pool entries (decrements reuse_count)
- 10:40: fill cron runs again, retries with fresh gate evaluation
- This time AI succeeds, slot moves through fill_in_progress → filled

**Pressure-test points:**
- Max attempts: 3 (after which status='failed')
- Recovery delay: ~30-45 min worst case
- For slots <3 hours from publish, critical_window_monitor surfaces alert at 10:35 (30 min after stuck started)
- If the original Claude call eventually succeeds late, ai-worker SHOULD detect status != fill_in_progress and abort the late draft write to prevent duplicates. **Implementation note in §K.2 for ai-worker change.**

## E.11 — NEW v3: Breaking news during the day (tests F6/LD17)

**Setup:** Monday 14:00 AEST. All Tue slots already in 'fill_in_progress' or 'filled' (filled at Sun-Mon morning). Major NDIS reform announcement hits 14:30 Mon. Ingest worker (every 6h) catches it at 17:00 Mon. R4 classifies as `timely_breaking` 17:05. Vertical-mapped to NDIS 17:06. Pool entry created 17:06 with fitness_score_max=0.92, expires 23:06 (6h).

**v3 behaviour:**
- 17:15: `try-urgent-breaking-fills-every-15m` runs
- Finds canonical with class=timely_breaking, fitness 0.92, no slot using it
- For NDIS-mapped clients (NY, CFW): checks if any slot in next 6h
- NY has nothing scheduled 17:15-23:15 (their next is Tue 10:00) → eligible for breaking insert
- CFW r6_enabled=false (excluded from auto-flow)
- Inserts urgent slot for NY: scheduled 19:15, fill_window_opens 17:15, lead 120 min
- Slot status='pending_fill' immediately (window already open)
- 17:20: fill cron picks up the urgent slot, finds top canonical = the breaking story
- Insert ai_job, status=fill_in_progress
- ai-worker processes at 17:21, draft created at 17:23
- Auto-approver runs at 17:25, auto-approves (or PK manual review)
- Approved at 17:30 (worst case), enters publish queue
- Publisher fires at 19:15 → live

**Result:** Breaking news from 14:30 Mon publishes at 19:15 Mon, ~5h delay. Without the auto-insert, it would have expired in pool at 23:06 Mon never published.

**Pressure-test points:**
- 2/client/day cap prevents flood (set in `try_urgent_breaking_fills` parameter)
- 6h "no scheduled slot in next" check prevents conflict with planned content
- What if PK is asleep when auto-approver flags for manual review? The 2h lead time between insert (17:15) and publish (19:15) gives PK time to wake up and review. If miss → critical-window-monitor alerts at 16:15 (3h before publish if no draft).

---

# SECTION F — Risk register (v3)

| # | Risk | v3 mitigation status |
|---|---|---|
| R1 | Pool starvation across slots | Reuse penalty (LD9) + same-day platform block (F4) |
| R2 | Stale content drift | Class-aware freshness + reconciliation (A.7 v3 fully recomputes) |
| R3 | "Slot filled" with bad content | Quality gates pre-AI; pool health gate (D.8) |
| R4 | Retry cost creep | 3-attempt cap with status='failed' terminal |
| R5 | AI hallucination on multi-item | LD5 small bundles; format-aware policies |
| R6 | Race conditions: pool refresh during fill | FOR UPDATE SKIP LOCKED + audit snapshot |
| R7 | Schedule rule drift | Trigger-based re-mat; in-flight protected |
| R8 | Time zone bugs | LD6 AEST migration; pg_cron UTC documented |
| R9 | Title similarity false positive/negative | F3 config table + keyword overlap OR-combined |
| R10 | Cost from prompt growth | LD7 caching; ai_usage_log monitoring |
| R11 | Pool contamination from upstream | F7 reconcile fully recomputes |
| R12 | DST transition bugs | Cron drift acceptable; documented |
| R13 | Recitation/copyright filter from Claude | Pre-flight test; paraphrase fallback (handled in ai-worker, not architecture) |
| R14 | Approval deadlock | 1-retry cap + critical-window monitor |
| R15 | Migration cutover dual-running | Phase B shadow with `is_shadow` flag |
| R16 | Vertical-shared pool cross-client surprise | F4 same-day platform block + brand voice prompt |
| R17 | Evergreen library staleness | H4 staleness columns + monthly review query |
| R18 | Underfilled from over-strict gates | Pool health gate (D.8) auto-relaxes thresholds |
| R19 | **Async trigger race losing signal** | **F1 backfill cron (NEW v3)** |
| R20 | **False-filled zombie slot** | **F2 fill_in_progress + F10 recovery (NEW v3)** |
| R21 | **Same-canonical cross-platform repetition** | **F4 same-day hard block (NEW v3)** |
| R22 | **Evergreen creep silent** | **F5 ratio guardrail with auto-adjust (NEW v3)** |
| R23 | **Breaking news structural blindness** | **F6 auto-insert path (NEW v3)** |
| R24 | **Stale-news re-freshening on repeat feed** | **F9 conditional expiry update (NEW v3)** |
| R25 | **Cron lag → fill window shrinkage** | **F8 promotion buffer (NEW v3)** |
| R26 | **Cron job silently fails** | **H6 heartbeat monitoring (NEW v3)** |

26 risks named, all with explicit mitigations.

---

# SECTION G — Implementation phasing (v3)

## Phase A — Foundation (estimated 5-7 hours, +1-2h vs v2)

V3 phase A is broken into ordered sub-phases per §K migration sequence:

| A.1 | Tables — DDL only, no logic | 1h |
| A.2 | Seed config tables (freshness, synthesis, quality, reuse, dedup) | 0.5h |
| A.3 | Triggers — refresh_signal_pool, rematerialise on rule change | 1h |
| A.4 | Functions — materialise_slots, expire, reconcile, backfill | 1.5h |
| A.5 | Slot promotion + buffer | 0.5h |
| A.6 | Backfill existing canonicals (one-time SQL) | 0.5h |
| A.7 | Cron registration + heartbeat wiring | 1h |
| A.8 | Verification — pool populating, slots materialising, no R6 disturbance | 0.5h |

## Phase B — Shadow + parallel diff (estimated 5-7 hours, +2h vs v2)

| B.1 | Fill function with all v3 gates + state machine | 2h |
| B.2 | Stuck recovery cron + ai-worker idempotency check | 1h |
| B.3 | Breaking news auto-insert function + cron | 1h |
| B.4 | Pool health gate function | 0.5h |
| B.5 | Critical window monitor + alert table | 0.5h |
| B.6 | Shadow mode activation (`is_shadow=true`) | 0.5h |
| B.7 | Parallel diff dashboard query/view | 1h |
| B.8 | Observation period (5-7 days elapsed, ~1h hands-on review) | 1h |

## Phase C — Cutover (estimated 3-4 hours, +1h vs v2)

| C.1 | AEST throttle migration (lock RPC update) | 1h |
| C.2 | Cutover NY-FB only | 0.5h |
| C.3 | Watch one week (background) | 0.5h hands-on |
| C.4 | Extend to NY-IG, NY-LI | 1h |
| C.5 | Extend to PP-FB, PP-IG, PP-LI | 1h |

## Phase D — Decommission (1-2 hours, unchanged)

## Phase E — Evergreen seeding (3-4 hours, unchanged)

## Total v3

15-24 hours engineering + 3-4 hours content. **+2-3 hours vs v2 estimate** to absorb the additional defensive crons and state machine.

---

# SECTION H — How this design serves the project (objective)

V3 inherits v2's objectivity statement (§H of v2) and adds these v3-specific clarifications.

**Why v3 is more buildable than v2:**

The v2 design was structurally sound but had operational gaps that would have surfaced in production as silent quality erosion (false-filled zombie slots, async pool race losing signal, evergreen creep going unnoticed, breaking news structurally blind). V3 closes these gaps before code is written. The build risk has shifted from "novel architecture, unproven defences" to "established architecture with explicit defensive crons."

**Honest cost of v3 vs v2:**

V3 has 10 cron jobs vs v2's 5. Each cron is small but the operational complexity is real. Three of the new crons (`backfill`, `recovery`, `urgent_breaking`) are not optional — they fix correctness gaps. Three (`pool_health_check`, `critical_window`, `heartbeat`) are observability — they catch problems early, not fix them. The latter could be deferred to a post-launch hardening sprint, which would shave ~1.5 hours off Phase B and reduce cron count to 7.

**What's still NOT in v3:**

- Engagement-loop tuning (Phase 2.1 of broader roadmap)
- Embedding-based semantic dedup (deferred to v4 if needed)
- Per-client custom synthesis policies (`t.format_synthesis_policy` is per-format, not per-(client, format))
- Pool partition by format (Option C from v1 §3.3 — not needed at current scale)
- Content production beyond text — image/video render workflows are separate concerns

**Net assessment:**

The architecture serves cost discipline, observability, scalability, and production-time alignment with v2's core decisions, plus v3's correctness hardening. The trade-off vs minimal-patch remains: 15-24 hours engineering + tuning period, vs ~4 hours for a generation cap on existing R6. PK's business decision still applies — v3 doesn't recommend either path. It just makes the slot-driven path build-safe.

---

# SECTION I — Open architectural questions (still)

| # | Question | v3 default | When to revisit |
|---|---|---|---|
| OAQ1 | Slot horizon: 7d default | 7d | When dashboard demands further visibility |
| OAQ2 | Evergreen 20-30% baseline mix | NO for v1 | After 4-8 weeks of production data |
| OAQ3 | DST cron drift acceptable | YES for sweeps | Only if user-reported issues |
| OAQ4 | Critical alert delivery mechanism | Dashboard view + email per occurrence | First production incident |
| OAQ5 | Per-client format preferences | Inherit defaults | When client demands it |
| OAQ6 | Breaking news cap per client per day | 2 | Tune in shadow |
| OAQ7 | Heartbeat alert delivery | Dashboard only for v1 | When email volume justifies SMS/push |
| OAQ8 | Embedding-based semantic dedup | Defer to v4 | If title-overlap false negatives become problematic |

---

# SECTION J — Reading order

If 90 minutes for full read isn't realistic:

1. §0 Changelog v2→v3 — see what changed (5 min)
2. §1 Locked decisions table — see what's locked (5 min)
3. §3 Bird's-eye diagram — visual orientation (2 min)
4. §A.6 Pool completeness backfill (most critical fix) (5 min)
5. §B.8 Slot state machine + §B.10 Stuck recovery (5 min)
6. §B.12 Breaking news auto-insert (5 min)
7. §E.9-E.11 New v3 scenarios (10 min)
8. §K Migration sequence (10 min)
9. §H Objective view (10 min)

That's ~60 min for the v3 deltas + load-bearing material.

---

# SECTION K — Migration sequence (BUILD-READY)

This is the exact apply-in-order list for Phase A. Each step is a single migration. Run in order; don't skip.

**Pre-flight checks:**
- [ ] R6 seed crons confirmed paused (jobid 11, 64, 65)
- [ ] Existing 154-draft queue acknowledged as safety buffer
- [ ] pg_trgm + pg_cron extensions installed (verify with `\dx`)
- [ ] Backup taken (Supabase Pro daily backup confirmed for previous night)

## K.1 — Migrations to apply (Phase A)

| # | Migration name | Purpose | Reversible? |
|---|---|---|---|
| 1 | `20260426_001_install_pg_trgm_extension.sql` | CREATE EXTENSION pg_trgm | Yes |
| 2 | `20260426_002_create_signal_pool_table.sql` | New table m.signal_pool with indexes | Yes (DROP TABLE) |
| 3 | `20260426_003_create_slot_table.sql` | New table m.slot with indexes + status enum | Yes |
| 4 | `20260426_004_create_slot_fill_attempt_table.sql` | New audit table | Yes |
| 5 | `20260426_005_create_evergreen_library_table.sql` | New table with H4 staleness columns | Yes |
| 6 | `20260426_006_create_class_freshness_rule_table.sql` | Config table + seed data | Yes |
| 7 | `20260426_007_create_format_synthesis_policy_table.sql` | Config table + seed data | Yes |
| 8 | `20260426_008_create_format_quality_policy_table.sql` | Config table + seed data | Yes |
| 9 | `20260426_009_create_reuse_penalty_curve_table.sql` | Config table + seed data | Yes |
| 10 | `20260426_010_create_dedup_policy_table.sql` | NEW v3 config table + seed data | Yes |
| 11 | `20260426_011_create_slot_alerts_table.sql` | NEW v3 monitoring table | Yes |
| 12 | `20260426_012_create_cron_health_check_table.sql` | NEW v3 heartbeat table + seed | Yes |
| 13 | `20260426_013_alter_post_draft_add_slot_id_is_shadow.sql` | ADD COLUMNs nullable | Yes (DROP COLUMN) |
| 14 | `20260426_014_create_title_similarity_function.sql` | m.title_similarity helper | Yes |
| 15 | `20260426_015_create_keyword_overlap_function.sql` | m.keyword_overlap helper | Yes |
| 16 | `20260426_016_create_refresh_signal_pool_function.sql` | A.5 trigger function (revised v3) | Yes |
| 17 | `20260426_017_create_refresh_signal_pool_for_pair_function.sql` | A.6 helper for backfill | Yes |
| 18 | `20260426_018_create_refresh_signal_pool_trigger.sql` | A.5 trigger | Yes |
| 19 | `20260426_019_create_expire_signal_pool_function.sql` | Pool expiration | Yes |
| 20 | `20260426_020_create_reconcile_signal_pool_function.sql` | A.7 reconcile (full recompute v3) | Yes |
| 21 | `20260426_021_create_backfill_missing_pool_entries_function.sql` | NEW v3 F1 | Yes |
| 22 | `20260426_022_create_compute_rule_slot_times_function.sql` | Helper for materialiser | Yes |
| 23 | `20260426_023_create_materialise_slots_function.sql` | B.2 materialiser | Yes |
| 24 | `20260426_024_create_handle_schedule_rule_change_function.sql` | Re-mat trigger function | Yes |
| 25 | `20260426_025_create_rematerialise_trigger.sql` | Schedule rule change trigger | Yes |
| 26 | `20260426_026_create_promote_slots_to_pending_function.sql` | B.3 with v3 buffer | Yes |
| 27 | `20260426_027_register_phase_a_crons.sql` | Register A-phase crons | Yes |
| 28 | `20260426_028_backfill_existing_canonicals_into_pool.sql` | One-time pool population | N/A (data) |

**After Phase A migrations:**
- [ ] Verify `m.signal_pool` has rows for existing classified canonicals
- [ ] Verify `m.slot` has 7-days-ahead future slots for active schedules
- [ ] Verify all 5 Phase A crons registered (`SELECT * FROM cron.job ORDER BY jobid`)
- [ ] Verify `expire-signal-pool-hourly` runs on next hour boundary
- [ ] Verify `reconcile-signal-pool-daily` shows in cron.job
- [ ] Verify `backfill-missing-pool-entries-every-15m` runs and reports backfilled=0 (no race window since trigger covers it now, but cron is the safety net)
- [ ] R6 still paused — no behaviour change to current pipeline

## K.2 — Migrations to apply (Phase B — fill function + shadow)

| # | Migration name | Purpose |
|---|---|---|
| 29 | `20260426_029_create_compute_slot_confidence_function.sql` | LD10 |
| 30 | `20260426_030_create_check_pool_health_function.sql` | D.8 |
| 31 | `20260426_031_create_check_evergreen_threshold_function.sql` | D.7 |
| 32 | `20260426_032_create_evergreen_ratio_view.sql` | D.7 view |
| 33 | `20260426_033_create_fill_pending_slots_function.sql` | B.4-B.8 — the heart of v3 |
| 34 | `20260426_034_create_handle_draft_rejection_trigger.sql` | B.9 |
| 35 | `20260426_035_create_recover_stuck_slots_function.sql` | B.10 |
| 36 | `20260426_036_create_slots_in_critical_window_view.sql` | B.11 |
| 37 | `20260426_037_create_scan_critical_windows_function.sql` | B.11 |
| 38 | `20260426_038_create_hot_breaking_pool_view.sql` | B.12 |
| 39 | `20260426_039_create_try_urgent_breaking_fills_function.sql` | B.12 |
| 40 | `20260426_040_register_phase_b_crons.sql` | Register Phase B crons |
| 41 | `20260426_041_create_cron_health_status_view.sql` | D.9 |
| 42 | `20260426_042_create_check_cron_heartbeats_function.sql` | D.9 |
| 43 | `20260426_043_register_cron_heartbeat_check.sql` | D.9 cron |

**ai-worker code changes (separate Edge Function deploy):**
- Read ai_job.input_payload.slot_id
- After successful Claude call + draft insert, UPDATE slot to `status='filled'` (only if current status='fill_in_progress' — idempotency check)
- If slot status != 'fill_in_progress' (e.g., recovery cron already reset it), abort the late draft write, log the race
- Add prompt caching: structure messages array with cache_control on stable prefix

## K.3 — Migrations to apply (Phase C — cutover)

| # | Migration | Purpose |
|---|---|---|
| 44 | `20260426_044_migrate_publisher_lock_aest_throttle.sql` | LD6 — update lock RPC CTE |
| 45 | `20260426_045_activate_fill_for_ny_facebook.sql` | Cutover NY-FB |

Subsequent client-platform cutovers via similar one-line activation migrations.

## K.4 — Migrations to apply (Phase D — decommission)

After full cutover validated:

| # | Migration | Purpose |
|---|---|---|
| 46 | `20260426_046_unregister_r6_seed_crons.sql` | Remove paused crons |
| 47 | `20260426_047_drop_seed_and_enqueue_function.sql` | Drop old function |
| 48 | `20260426_048_rename_post_seed_to_legacy.sql` | Archive old table |

---

*End of brief v3. This is the canonical, build-ready specification. Phase A migrations 1-28 can begin when PK gives the go-ahead.*
