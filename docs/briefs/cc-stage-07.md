# Claude Code Brief — Stage 7: Confidence + pool health + evergreen ratio

**Stage:** 7 of 19 (FIRST Phase B stage)
**Phase:** B — Fill in shadow
**Pre-req:** Phase A complete (commit `2799253`, Gate A passed at ~16:11 AEST 26 Apr, all migrations 001–031 applied, 6 Phase A crons firing autonomously, pool=1,694, slots=70, alerts=0)
**Goal:** Lay down 4 read-only scoring helpers that Stage 8's fill function will call. No new behaviour visible end-to-end yet — these are pure scaffolding for the fill logic that lands next stage. Slots stay in pending_fill, R6 stays paused, publishing untouched.
**Estimated duration:** 30 min create + 10 min verification.

---

## Context for CC

Stage 8's fill function is the heart of v3 — ~150 lines integrating pool query, dedup, evergreen fallback, audit, and confidence scoring. To keep Stage 8 focused on the orchestration logic, Stage 7 lands the four scoring/health helpers it depends on as separate, individually-verifiable migrations:

| Migration | Object | Purpose |
|---|---|---|
| 032 | `m.compute_slot_confidence(numeric, integer, numeric, integer)` | LD10 composite metric. Fill function calls this after picking a bundle to populate `m.slot.slot_confidence`. |
| 033 | `m.check_pool_health(integer)` | D.8/H1. Per-vertical jsonb summary. Fill function calls this when pool depth is borderline to decide whether to relax fitness threshold. |
| 034 | `m.evergreen_ratio_7d` view | D.7. 7-day rolling ratio of evergreen-filled slots per client. Splits live vs shadow so we can monitor both during Phase B. |
| 035 | `m.check_evergreen_threshold(uuid)` | D.7/LD12. Reads the view, returns jsonb with `alert` + `recommendation` vs the 30% threshold. Fill function calls this to decide whether to FORCE non-evergreen even if pool is thin. |

All four are read-only. None write, none touch the slot/pool/draft state. Stage 7 is pure scaffolding — Stage 8 wires them together.

### Pre-flight findings folded in (chat-side schema verification)

| Question | Answer |
|---|---|
| Where is `evergreen_library`? | `t.evergreen_library` (NOT `m.evergreen_library` — v4/sync_state were loose; v3 §C.1.5 had it correct). Stage 7 doesn't touch this table directly but Stage 8 will. |
| Does `m.slot.is_evergreen` exist? | YES — added in Stage 1 Migration 003. Same with `evergreen_id`, `slot_confidence`. No ALTER needed. |
| Does `m.post_draft.is_shadow` exist? | YES — added in Stage 2 Migration 014. Needed for the ratio view's live/shadow split. |
| `t.content_vertical` PK column? | `vertical_id` (integer, NOT `content_vertical_id` as some v4 phrasing suggested). |
| `c.client` columns we need? | `client_id` uuid (PK), `client_name` text. |
| `m.signal_pool` columns for health? | `vertical_id` (int), `content_class` (text), `fitness_score_max` (numeric), `source_domain` (text), `pool_entered_at` (tstz), `is_active` (bool) — all present. |
| `t.class_freshness_rule` shape? | `class_code`, `freshness_window_hours` (int), `is_current` (bool). Stage 7 doesn't query this directly — kept simple with a hardcoded 48h fresh window in `check_pool_health`. |

### Migration numbering

Stage 6 closed at migration 031. Stage 7 = 032 → 035 (four migrations). v4 originally said 033-036 but production count diverged at Stage 1 (8 tables, not 7). Use 032-035.

### Behaviour change envelope

After Stage 7:
- Three callable functions + one queryable view added
- Zero rows changed in any state table
- Zero crons added
- Pool, slots, drafts, queue all unchanged
- Phase A crons keep firing as before

This is intentionally a no-impact stage. Verification is "callable + returns expected shape", nothing more.

---

## Pre-flight checks (CC runs first)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — fast-forward, latest is `2799253`

---

## Files to create

4 migration files. All SQL. Claude (chat) will apply via Supabase MCP after CC pushes.

### Migration 032 — `20260426_032_create_compute_slot_confidence_function.sql`

```sql
-- Stage 7.032 — Slot confidence composite (LD10)
--
-- Inputs (per LD10):
--   p_best_fitness       — chosen format's fitness for the bundle (0..1)
--   p_pool_size          — count of pool entries that were viable for this slot
--   p_top_recency_score  — recency of selected content (0..1; 1.0 = just published)
--   p_source_diversity   — distinct source_domain count in the bundle (1+ for single-item)
--
-- Composite weights (sum to 1.00):
--   0.50 fitness    (quality of match — most important)
--   0.20 pool       (log-scaled, saturates at ~10 viable items)
--   0.20 recency    (linear)
--   0.10 diversity  (log-scaled, saturates at ~3 sources)
--
-- IMMUTABLE: same inputs always produce same output. No table reads.
-- Stage 8's fill function calls this after pool selection to populate
-- m.slot.slot_confidence.

CREATE OR REPLACE FUNCTION m.compute_slot_confidence(
  p_best_fitness        numeric,
  p_pool_size           integer,
  p_top_recency_score   numeric,
  p_source_diversity    integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_fitness   numeric;
  v_pool      numeric;
  v_recency   numeric;
  v_diversity numeric;
  v_score     numeric;
BEGIN
  -- Defensive clamp + null-safety on the two 0..1 inputs
  v_fitness := GREATEST(0.0, LEAST(1.0, COALESCE(p_best_fitness, 0.0)));
  v_recency := GREATEST(0.0, LEAST(1.0, COALESCE(p_top_recency_score, 0.0)));

  -- Pool size: log-scaled, saturates at 10 viable items.
  -- ln(11)/ln(11) = 1.0; ln(2)/ln(11) ≈ 0.289 (1 item); ln(6)/ln(11) ≈ 0.747 (5 items)
  v_pool := LEAST(1.0,
    ln(GREATEST(1, COALESCE(p_pool_size, 0)) + 1)::numeric / ln(11)::numeric
  );

  -- Source diversity: log-scaled, saturates at 3 distinct domains.
  -- ln(4)/ln(4) = 1.0; ln(2)/ln(4) = 0.5 (1 source); ln(3)/ln(4) ≈ 0.792 (2 sources)
  v_diversity := LEAST(1.0,
    ln(GREATEST(1, COALESCE(p_source_diversity, 0)) + 1)::numeric / ln(4)::numeric
  );

  v_score :=
      0.50 * v_fitness
    + 0.20 * v_pool
    + 0.20 * v_recency
    + 0.10 * v_diversity;

  RETURN ROUND(v_score, 4);
END;
$$;

COMMENT ON FUNCTION m.compute_slot_confidence(numeric, integer, numeric, integer) IS
  'LD10 composite slot confidence in 0..1. Weights: 0.50 fitness, 0.20 pool (log-saturated at 10), 0.20 recency, 0.10 diversity (log-saturated at 3). IMMUTABLE. Stage 7.032.';
```

---

### Migration 033 — `20260426_033_create_check_pool_health_function.sql`

```sql
-- Stage 7.033 — Per-vertical pool health assessment (D.8/H1)
--
-- Returns jsonb with raw counts + a green/yellow/red health classification.
-- Stage 8's fill function calls this when a slot's pool query returns
-- borderline counts; if health=red, the fill function may relax the
-- min_fitness_threshold one tier (per t.format_quality_policy) before
-- falling back to evergreen.
--
-- STABLE: reads tables; same inputs same outputs within a transaction.
-- Single-row scan over m.signal_pool filtered by vertical_id.

CREATE OR REPLACE FUNCTION m.check_pool_health(p_vertical_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total            integer;
  v_active           integer;
  v_high_fitness     integer;
  v_distinct_sources integer;
  v_distinct_classes integer;
  v_fresh_48h        integer;
  v_max_fitness      numeric;
  v_avg_fitness      numeric;
  v_health           text;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND fitness_score_max >= 0.65),
    COUNT(DISTINCT source_domain) FILTER (WHERE is_active AND source_domain IS NOT NULL),
    COUNT(DISTINCT content_class) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND pool_entered_at > NOW() - interval '48 hours'),
    MAX(fitness_score_max) FILTER (WHERE is_active),
    AVG(fitness_score_max) FILTER (WHERE is_active)
  INTO
    v_total,
    v_active,
    v_high_fitness,
    v_distinct_sources,
    v_distinct_classes,
    v_fresh_48h,
    v_max_fitness,
    v_avg_fitness
  FROM m.signal_pool
  WHERE vertical_id = p_vertical_id;

  -- Three-tier health classification:
  --   green  — comfortable headroom: 50+ active, 10+ high-fitness, 3+ sources
  --   yellow — borderline: 20+ active, 5+ high-fitness, 2+ sources
  --   red    — thin: anything below
  v_health := CASE
    WHEN v_active >= 50 AND v_high_fitness >= 10 AND v_distinct_sources >= 3 THEN 'green'
    WHEN v_active >= 20 AND v_high_fitness >= 5  AND v_distinct_sources >= 2 THEN 'yellow'
    ELSE 'red'
  END;

  RETURN jsonb_build_object(
    'vertical_id',       p_vertical_id,
    'total',             v_total,
    'active',            v_active,
    'high_fitness',      v_high_fitness,
    'distinct_sources',  v_distinct_sources,
    'distinct_classes',  v_distinct_classes,
    'fresh_48h',         v_fresh_48h,
    'max_fitness',       v_max_fitness,
    'avg_fitness',       ROUND(COALESCE(v_avg_fitness, 0)::numeric, 4),
    'health',            v_health,
    'checked_at',        NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.check_pool_health(integer) IS
  'D.8/H1 per-vertical pool health. Returns jsonb {total, active, high_fitness, distinct_sources, distinct_classes, fresh_48h, max_fitness, avg_fitness, health, checked_at}. health = green | yellow | red. STABLE. Stage 7.033.';
```

---

### Migration 034 — `20260426_034_create_evergreen_ratio_7d_view.sql`

```sql
-- Stage 7.034 — 7-day rolling evergreen ratio per client (D.7)
--
-- Counts slots filled in last 7 days (status IN filled/approved/published)
-- and splits the ratio by shadow vs live drafts via m.post_draft.is_shadow.
--
-- During Phase B (shadow only): live_* columns will be 0/NULL; shadow_*
-- shows the developing pattern.
-- During Phase C cutover: both live_* and shadow_* populated.
-- Post-Phase D: only live_* meaningful.
--
-- The check_evergreen_threshold function (035) picks the relevant ratio
-- (live preferred when sample exists) for alert decisions.

CREATE OR REPLACE VIEW m.evergreen_ratio_7d AS
WITH filled_with_shadow AS (
  SELECT
    s.client_id,
    s.is_evergreen,
    COALESCE(pd.is_shadow, false) AS is_shadow
  FROM m.slot s
  LEFT JOIN m.post_draft pd ON pd.post_draft_id = s.filled_draft_id
  WHERE s.filled_at IS NOT NULL
    AND s.filled_at > NOW() - interval '7 days'
    AND s.status IN ('filled', 'approved', 'published')
)
SELECT
  c.client_id,
  c.client_name,

  -- Live (production) drafts
  COUNT(*) FILTER (WHERE NOT fws.is_shadow) AS live_filled_total,
  COUNT(*) FILTER (WHERE NOT fws.is_shadow AND fws.is_evergreen) AS live_evergreen_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE NOT fws.is_shadow) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE NOT fws.is_shadow AND fws.is_evergreen)::numeric
        / COUNT(*) FILTER (WHERE NOT fws.is_shadow)::numeric,
        4
      )
    ELSE NULL
  END AS live_evergreen_ratio,

  -- Shadow drafts (Phase B observation)
  COUNT(*) FILTER (WHERE fws.is_shadow) AS shadow_filled_total,
  COUNT(*) FILTER (WHERE fws.is_shadow AND fws.is_evergreen) AS shadow_evergreen_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE fws.is_shadow) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE fws.is_shadow AND fws.is_evergreen)::numeric
        / COUNT(*) FILTER (WHERE fws.is_shadow)::numeric,
        4
      )
    ELSE NULL
  END AS shadow_evergreen_ratio,

  NOW() AS computed_at

FROM c.client c
LEFT JOIN filled_with_shadow fws ON fws.client_id = c.client_id
WHERE c.status = 'active'
GROUP BY c.client_id, c.client_name
ORDER BY c.client_name;

COMMENT ON VIEW m.evergreen_ratio_7d IS
  'D.7 per-client 7d rolling evergreen ratio. Splits live (post_draft.is_shadow=false) vs shadow (true). Window = NOW() - 7d. Counts filled/approved/published slots only. NULL ratio when sample size is 0. Stage 7.034.';
```

---

### Migration 035 — `20260426_035_create_check_evergreen_threshold_function.sql`

```sql
-- Stage 7.035 — Evergreen threshold check + recommendation (D.7/LD12)
--
-- Reads m.evergreen_ratio_7d for one client; picks the live ratio when
-- live sample exists, else falls back to shadow (Phase B observation
-- case where no live drafts have been written yet).
--
-- Returns jsonb with the ratio used, sample size, threshold, alert flag,
-- and a recommendation string the fill function (or operator) can act on.
--
-- LD12 default threshold = 0.30 (30%). Per Stage 13 exit criteria:
-- evergreen ratio < 30% over the week is acceptable.
--
-- STABLE: reads view + table.

CREATE OR REPLACE FUNCTION m.check_evergreen_threshold(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_row              record;
  v_threshold        numeric := 0.30;  -- LD12 default
  v_ratio_for_check  numeric;
  v_sample_size      integer;
  v_source           text;
  v_alert            boolean := false;
  v_recommendation   text;
BEGIN
  SELECT * INTO v_row
  FROM m.evergreen_ratio_7d
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'client_id',       p_client_id,
      'ratio',           NULL,
      'sample_size',     0,
      'source',          'none',
      'threshold',       v_threshold,
      'alert',           false,
      'recommendation',  'no_data',
      'reason',          'Client not active or no slots filled in last 7 days',
      'checked_at',      NOW()
    );
  END IF;

  -- Prefer live when there's a live sample; else shadow
  IF COALESCE(v_row.live_filled_total, 0) > 0 THEN
    v_ratio_for_check := v_row.live_evergreen_ratio;
    v_sample_size     := v_row.live_filled_total;
    v_source          := 'live';
  ELSIF COALESCE(v_row.shadow_filled_total, 0) > 0 THEN
    v_ratio_for_check := v_row.shadow_evergreen_ratio;
    v_sample_size     := v_row.shadow_filled_total;
    v_source          := 'shadow';
  ELSE
    v_ratio_for_check := NULL;
    v_sample_size     := 0;
    v_source          := 'none';
  END IF;

  IF v_ratio_for_check IS NULL THEN
    v_recommendation := 'no_data';
  ELSIF v_ratio_for_check >= v_threshold THEN
    v_alert          := true;
    v_recommendation := 'over_threshold_seed_evergreen_or_widen_pool';
  ELSIF v_ratio_for_check >= v_threshold * 0.7 THEN
    v_recommendation := 'approaching_threshold_monitor';
  ELSE
    v_recommendation := 'healthy';
  END IF;

  RETURN jsonb_build_object(
    'client_id',                 p_client_id,
    'client_name',               v_row.client_name,
    'live_filled_total',         v_row.live_filled_total,
    'live_evergreen_ratio',      v_row.live_evergreen_ratio,
    'shadow_filled_total',       v_row.shadow_filled_total,
    'shadow_evergreen_ratio',    v_row.shadow_evergreen_ratio,
    'ratio_used',                v_ratio_for_check,
    'sample_size',               v_sample_size,
    'source',                    v_source,
    'threshold',                 v_threshold,
    'alert',                     v_alert,
    'recommendation',            v_recommendation,
    'checked_at',                NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.check_evergreen_threshold(uuid) IS
  'D.7/LD12 evergreen threshold check. Prefers live ratio if sample > 0, else shadow. Threshold default 0.30. Returns jsonb with alert + recommendation: healthy | approaching_threshold_monitor | over_threshold_seed_evergreen_or_widen_pool | no_data. STABLE. Stage 7.035.';
```

---

## Code changes

None.

---

## Commands to run

```bash
git status
git branch --show-current   # expect: feature/slot-driven-v3-build
git pull origin feature/slot-driven-v3-build

git add supabase/migrations/20260426_032_create_compute_slot_confidence_function.sql
git add supabase/migrations/20260426_033_create_check_pool_health_function.sql
git add supabase/migrations/20260426_034_create_evergreen_ratio_7d_view.sql
git add supabase/migrations/20260426_035_create_check_evergreen_threshold_function.sql

git commit -m "feat(slot-driven): Stage 7 — confidence + pool health + evergreen ratio

FIRST Phase B stage. Pure scaffolding for Stage 8's fill function.
No behaviour change end-to-end; no crons, no state writes.

032 m.compute_slot_confidence(numeric, integer, numeric, integer)
    LD10 composite. IMMUTABLE.
    Weights: 0.50 fitness / 0.20 pool (log-sat 10) / 0.20 recency
             / 0.10 diversity (log-sat 3).

033 m.check_pool_health(integer)
    D.8/H1 per-vertical jsonb. STABLE.
    Tiers: green (50/10/3), yellow (20/5/2), red below.

034 m.evergreen_ratio_7d view
    D.7 per-client 7d rolling. Joins post_draft.is_shadow via
    filled_draft_id, splits live vs shadow ratios.
    Counts filled/approved/published slots over last 7 days.
    Active clients only.

035 m.check_evergreen_threshold(uuid)
    D.7/LD12. STABLE.
    Threshold 0.30. Prefers live sample over shadow.
    Returns jsonb with alert + recommendation.

Pre-flight folded in:
- t.evergreen_library (NOT m.evergreen_library; v3 §C.1.5 correct)
- m.slot.is_evergreen + slot_confidence already exist (Stage 1)
- m.post_draft.is_shadow already exists (Stage 2)
- t.content_vertical PK is vertical_id (integer)
- Migration numbering 032-035 (S6 closed at 031)

After CC pushes, Claude (chat):
1. Applies migrations 032–035 via Supabase MCP
2. Runs verification queries (callable + return shape)
3. No observation window needed — pure read-only scaffolding

Stage 8 next: THE FILL FUNCTION (heart of v3, ~150 lines).

Refs: 26d88b8 (v4), 2799253 (Stage 6 / Gate A passed)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

```
## Stage 7 CC report (git side only)

- ✅ Pre-flight passed: yes/no
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 4/4
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No supabase db push.
Awaiting Claude (chat) to apply migrations and run verification.
```

---

## Verification queries (Claude in chat runs)

### V1 — Objects exist with expected signatures

```sql
-- All 4 objects exist
SELECT 'function: compute_slot_confidence' AS object, 1 AS expected
WHERE EXISTS (SELECT 1 FROM pg_proc
              WHERE pronamespace='m'::regnamespace
                AND proname='compute_slot_confidence')
UNION ALL
SELECT 'function: check_pool_health', 1
WHERE EXISTS (SELECT 1 FROM pg_proc
              WHERE pronamespace='m'::regnamespace
                AND proname='check_pool_health')
UNION ALL
SELECT 'view: evergreen_ratio_7d', 1
WHERE EXISTS (SELECT 1 FROM pg_views
              WHERE schemaname='m' AND viewname='evergreen_ratio_7d')
UNION ALL
SELECT 'function: check_evergreen_threshold', 1
WHERE EXISTS (SELECT 1 FROM pg_proc
              WHERE pronamespace='m'::regnamespace
                AND proname='check_evergreen_threshold');
-- EXPECTED: 4 rows
```

### V2 — Function arities and volatility

```sql
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS args,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatility
FROM pg_proc p
WHERE p.pronamespace = 'm'::regnamespace
  AND p.proname IN ('compute_slot_confidence', 'check_pool_health', 'check_evergreen_threshold')
ORDER BY p.proname;
-- EXPECTED:
--   check_evergreen_threshold(p_client_id uuid)               STABLE
--   check_pool_health(p_vertical_id integer)                  STABLE
--   compute_slot_confidence(p_best_fitness numeric, ...)      IMMUTABLE
```

### V3 — compute_slot_confidence reference value

```sql
-- Reference test from v4: should return ~0.769
SELECT m.compute_slot_confidence(0.8, 5, 0.6, 12) AS confidence;
-- EXPECTED: numeric, ~0.769 (between 0.75 and 0.80)

-- Edge cases
SELECT
  m.compute_slot_confidence(0.0, 0, 0.0, 0)   AS all_zero,    -- expect ~0.0
  m.compute_slot_confidence(1.0, 100, 1.0, 50) AS all_max,    -- expect ~1.0
  m.compute_slot_confidence(NULL, NULL, NULL, NULL) AS all_null;  -- expect ~0.0 (clamped)
```

### V4 — check_pool_health on real verticals

```sql
-- Each of the 8 active verticals — confirm health classification matches pool depth
SELECT
  cv.vertical_id,
  cv.vertical_name,
  m.check_pool_health(cv.vertical_id) AS health
FROM t.content_vertical cv
WHERE cv.vertical_id IN (7, 9, 10, 11, 12, 15, 16, 17)
ORDER BY cv.vertical_id;
-- EXPECTED:
--   AU clients (7, 9, 10, 11, 12) — health='green' (271-279 active each)
--   Invegent globals (15, 16, 17) — likely health='green' (99 each, > 50 threshold)
--     unless distinct_sources for those is < 3, in which case 'yellow'
-- The point is: function returns the right shape; no errors; values plausible.
```

### V5 — evergreen_ratio_7d view

```sql
-- View queryable for all active clients
SELECT * FROM m.evergreen_ratio_7d ORDER BY client_name;
-- EXPECTED: 4 rows (NDIS Yarns, Property Pulse, Care For Welfare, Invegent)
-- All ratio columns NULL — no slots have been filled yet (filled_at IS NULL on all)
-- live_filled_total = 0 for all
-- shadow_filled_total = 0 for all
```

### V6 — check_evergreen_threshold returns no_data shape

```sql
-- Each active client — should return 'no_data' recommendation since no slots filled
SELECT
  c.client_name,
  m.check_evergreen_threshold(c.client_id) AS threshold_check
FROM c.client c
WHERE c.status = 'active'
ORDER BY c.client_name;
-- EXPECTED: 4 rows
-- threshold_check->>'recommendation' = 'no_data' for all
-- threshold_check->>'sample_size' = '0' for all
-- threshold_check->>'alert' = 'false' for all
-- threshold_check->>'threshold' = '0.30' for all
```

### V7 — Phase A still healthy (regression check)

```sql
-- Pool unchanged
SELECT COUNT(*) AS pool_active FROM m.signal_pool WHERE is_active=true;
-- EXPECTED: 1,694 ± modest organic growth from classifier cron 68

-- Slots unchanged
SELECT status, COUNT(*) FROM m.slot GROUP BY status ORDER BY status;
-- EXPECTED: future + pending_fill summing to 70

-- No new alerts
SELECT alert_kind, COUNT(*) FROM m.slot_alerts GROUP BY alert_kind;
-- EXPECTED: empty result set OR no rows (zero alerts)

-- R6 still paused
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
-- EXPECTED: all three active=false
```

---

## Exit criteria

If V1–V7 all pass:
- Stage 7 is COMPLETE
- 4 new objects callable, return correct shapes
- compute_slot_confidence reference value ~0.769
- All active clients show 'no_data' threshold check (no slots filled yet)
- Phase A pipeline still autonomous and healthy

Then PK approves → **Stage 8 brief** (THE FILL FUNCTION — biggest single migration).

If any verification fails:
- Most likely: typo in function body, sign error in calculation, or column name drift
- Forward-fix on the same branch (don't roll back unless structural)
- The objects are isolated; fixing one doesn't affect the others

---

## Rollback (if needed)

```sql
DROP FUNCTION IF EXISTS m.check_evergreen_threshold(uuid);
DROP VIEW IF EXISTS m.evergreen_ratio_7d;
DROP FUNCTION IF EXISTS m.check_pool_health(integer);
DROP FUNCTION IF EXISTS m.compute_slot_confidence(numeric, integer, numeric, integer);
-- Phase A unaffected; no state change to recover.
```

---

## Notes for after Stage 7 verifies

- **Stage 8 is the longest single migration in the build** — fill function ~150 lines, integrating m.signal_pool, m.evergreen_library, m.slot, m.slot_fill_attempt, m.ai_job, plus all four Stage 7 helpers.
- The 12 (now 14) pending_fill slots remain the first input Stage 8's fill function will see when wired in Stage 10.
- After Stage 11 + Gate B (5–7 days shadow observation), Phase C cutover begins.

After Stage 7, the pre-fill toolkit is complete:
- **Confidence scoring** ready (LD10)
- **Pool health diagnostics** ready (D.8/H1)
- **Evergreen ratio observability** ready (D.7)
- **Threshold alerting** ready (LD12)

Stage 8 wires these into the slot lifecycle.

---

*End Stage 7 brief. v4 commit `26d88b8`. Stage 6 closed at `2799253` / Gate A. Author: Claude (chat). For execution by: Claude Code (local).*
