# Claude Code Brief — Stage 4: Pool maintenance functions + one-time backfill

**Stage:** 4 of 19
**Phase:** A — Foundation
**Pre-req:** Stage 3 complete (commit `80d7b4b`, all migrations 001–020 applied, trigger chain verified end-to-end)
**Goal:** Create three pool maintenance functions: `m.expire_signal_pool()` (deactivates stale entries), `m.reconcile_signal_pool()` (full recompute for class drift), and `m.backfill_missing_pool_entries()` (LD19 batch-bounded backfill). Then run the backfill against the existing 1,804 classified canonicals to populate the pool. **Visible behaviour change** — pool will go from 2 rows (Stage 3 V6 leftover) to ~1,800–4,000 rows over a few minutes. Old pipeline still untouched. R6 stays paused.
**Estimated duration:** 45–60 min (15 min create + 20–30 min backfill loop + verification).

---

## Context for CC

Stage 3 wired the trigger chain. Stage 4 is two things:

1. **Three pool maintenance functions** (`expire`, `reconcile`, `backfill`). These will be wired to crons in Stage 6. For now they just exist as callable functions.

2. **A one-time backfill run** of the existing 1,804 classified canonicals. The trigger chain only fires on NEW classifier writes (or the V6-style force-UPDATE). The 1,804 already-classified canonicals from before Stage 3 are not yet in the pool. Stage 4 calls `backfill_missing_pool_entries()` repeatedly until it returns 0, which loads everything. Pre-flight measured 1,804 canonicals; with batch=100 and the recent-7d filter pulling ~647, organic backfill takes ~7 batches. Without the recent filter, ~18 batches. Stage 4 keeps the LD19 7-day filter to avoid loading content that's already past its freshness window.

### LD19 batch-bounded backfill — exact pattern

```sql
SET LOCAL statement_timeout = '60s';
FOR row IN
  SELECT canonical_id FROM ...
  WHERE classified AND created_at > NOW() - interval '7 days'
    AND NOT in_pool_yet
  LIMIT 100
LOOP
  -- per-row: call resolve_canonical_verticals, insert canonical_vertical_map rows;
  -- Trigger 2 fires for each, populating signal_pool
END LOOP;
```

Returns count of canonicals processed. Caller calls again until 0 returned. Each call has a 60s ceiling so a slow vertical-resolution row can't stall the whole loop indefinitely.

The function uses `INSERT ... ON CONFLICT DO NOTHING` on `f.canonical_vertical_map` to be idempotent — re-running the backfill won't double-process. It also explicitly calls `refresh_signal_pool_for_pair` for canonicals where vertical_map rows already exist but signal_pool entries don't (covers the unlikely race where Trigger 1 fired but Trigger 2 transaction rolled back).

### Maintenance functions — usage

- `m.expire_signal_pool()`: marks `is_active=false` for entries past `pool_expires_at`. Runs hourly via cron in Stage 6. Returns count expired.
- `m.reconcile_signal_pool()`: full recompute when class drift detected — i.e. if `t.content_class.is_current` versions change, existing pool entries with old class need to drop or refresh. Runs daily via cron in Stage 6. Returns jsonb summary.
- `m.backfill_missing_pool_entries()`: LD19 batch-bounded async-race-miss backfill. Runs every 15 min via cron in Stage 6 (catches any canonicals where the trigger chain failed mid-transaction). Returns count.

### Behaviour change envelope

After Stage 4 backfill runs:
- `m.signal_pool` will have approximately 1,800–4,000 rows (1 canonical produces 2-3 rows, one per vertical it maps to)
- `f.canonical_vertical_map` will have approximately 1,800–4,000 rows
- Classifier cron 68 keeps adding rows organically (every 5 minutes)
- Nothing reads the pool yet — no pipeline visible change

---

## Pre-flight checks (CC runs first, reports back)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — fast-forward, latest is `80d7b4b`

If any pre-flight fails: STOP, report, do not proceed.

---

## Files to create

3 migration files. Stage 4's one-time backfill is run by Claude (chat) via MCP after CC pushes, NOT as a migration file (it's a runtime invocation, not a schema change).

### Migration 021 — `20260426_021_create_expire_signal_pool_function.sql`

```sql
-- Stage 4.021 — m.expire_signal_pool: mark entries past pool_expires_at as inactive
-- Runs hourly via cron (registered in Stage 6).

CREATE OR REPLACE FUNCTION m.expire_signal_pool()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count integer;
BEGIN
  UPDATE m.signal_pool
  SET is_active = FALSE,
      updated_at = now()
  WHERE is_active = TRUE
    AND pool_expires_at < now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_count', v_expired_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.expire_signal_pool() IS
  'Marks pool entries past pool_expires_at as is_active=false. Runs hourly. Returns jsonb {expired_count, ran_at}. Stage 4.021.';
```

---

### Migration 022 — `20260426_022_create_reconcile_signal_pool_function.sql`

```sql
-- Stage 4.022 — m.reconcile_signal_pool: full recompute on class drift (F7)
-- Runs daily via cron. Detects three drift conditions and corrects each:
--
-- A. ORPHANED: pool entry references a canonical that no longer has a body row,
--    or a vertical_map row was deleted. Mark is_active=false.
-- B. CLASS DRIFT: pool entry's stored content_class doesn't match
--    f.canonical_content_body.content_class anymore (classifier reclassified
--    via version bump or rule change). Re-run refresh_signal_pool_for_pair to
--    update class + recompute fitness + reset expiry.
-- C. FITNESS DRIFT: pool entry's fitness_per_format doesn't match what
--    t.class_format_fitness currently produces (e.g. someone updated fitness scores).
--    Same fix: re-run refresh_signal_pool_for_pair.
--
-- Returns jsonb summary of work done.

CREATE OR REPLACE FUNCTION m.reconcile_signal_pool()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_orphans_deactivated integer := 0;
  v_class_drift_corrected integer := 0;
  v_fitness_drift_corrected integer := 0;
  v_row record;
BEGIN
  -- A. ORPHANED: deactivate pool entries whose canonical_vertical_map mapping is gone
  UPDATE m.signal_pool sp
  SET is_active = FALSE, updated_at = now()
  WHERE sp.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM f.canonical_vertical_map cvm
      WHERE cvm.canonical_id = sp.canonical_id
        AND cvm.vertical_id = sp.vertical_id
    );
  GET DIAGNOSTICS v_orphans_deactivated = ROW_COUNT;

  -- B + C. Class or fitness drift: walk active pool entries, compare to source-of-truth
  FOR v_row IN
    SELECT sp.canonical_id, sp.vertical_id, sp.content_class AS pool_class,
           ccb.content_class AS body_class,
           sp.fitness_score_max AS pool_fmax,
           (SELECT MAX(fitness_score) FROM t.class_format_fitness
            WHERE class_code = ccb.content_class AND is_current = TRUE) AS expected_fmax
    FROM m.signal_pool sp
    JOIN f.canonical_content_body ccb ON ccb.canonical_id = sp.canonical_id
    WHERE sp.is_active = TRUE
      AND ccb.content_class IS NOT NULL
  LOOP
    IF v_row.pool_class IS DISTINCT FROM v_row.body_class THEN
      PERFORM m.refresh_signal_pool_for_pair(v_row.canonical_id, v_row.vertical_id);
      v_class_drift_corrected := v_class_drift_corrected + 1;
    ELSIF v_row.pool_fmax IS DISTINCT FROM v_row.expected_fmax
          AND v_row.expected_fmax IS NOT NULL THEN
      PERFORM m.refresh_signal_pool_for_pair(v_row.canonical_id, v_row.vertical_id);
      v_fitness_drift_corrected := v_fitness_drift_corrected + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'orphans_deactivated', v_orphans_deactivated,
    'class_drift_corrected', v_class_drift_corrected,
    'fitness_drift_corrected', v_fitness_drift_corrected,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.reconcile_signal_pool() IS
  'Full pool reconciliation: deactivates orphans, fixes class drift, fixes fitness drift. Runs daily. Returns jsonb summary. Stage 4.022.';
```

---

### Migration 023 — `20260426_023_create_backfill_missing_pool_entries_function.sql`

```sql
-- Stage 4.023 — m.backfill_missing_pool_entries: LD19 batch-bounded backfill
--
-- Picks classified canonicals from the last 7 days that don't yet have
-- canonical_vertical_map rows, and runs them through the resolution chain.
-- Trigger 2 fires automatically on each canonical_vertical_map insert,
-- populating m.signal_pool.
--
-- LD19: hard LIMIT 100 + 60s statement_timeout per call.
-- Caller invokes repeatedly until function returns 0.
--
-- Idempotent: ON CONFLICT DO NOTHING on canonical_vertical_map insert.
-- Also catches the rare case where vertical_map rows exist but signal_pool
-- doesn't (Trigger 2 transaction rollback) — explicitly refreshes pool for
-- those.

CREATE OR REPLACE FUNCTION m.backfill_missing_pool_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_processed_count integer := 0;
  v_pool_refreshed_count integer := 0;
  v_canonical record;
BEGIN
  -- LD19: per-call timeout
  SET LOCAL statement_timeout = '60s';

  -- Phase 1: canonicals with no vertical_map rows yet
  FOR v_canonical IN
    SELECT cci.canonical_id
    FROM f.canonical_content_item cci
    JOIN f.canonical_content_body ccb ON ccb.canonical_id = cci.canonical_id
    WHERE ccb.content_class IS NOT NULL
      AND cci.first_seen_at > now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM f.canonical_vertical_map cvm
        WHERE cvm.canonical_id = cci.canonical_id
      )
    ORDER BY cci.first_seen_at DESC
    LIMIT 100  -- LD19 batch cap
  LOOP
    -- Insert one canonical_vertical_map row per resolved vertical.
    -- Trigger 2 fires automatically and populates signal_pool.
    INSERT INTO f.canonical_vertical_map (canonical_id, vertical_id, mapping_source)
    SELECT v_canonical.canonical_id, vertical_id, 'backfill'
    FROM m.resolve_canonical_verticals(v_canonical.canonical_id)
    ON CONFLICT (canonical_id, vertical_id) DO NOTHING;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- Phase 2: defensive — canonicals that have vertical_map rows but missing
  -- signal_pool entries (Trigger 2 transaction rolled back somehow).
  -- Limited to a small batch so this can't dominate the call.
  FOR v_canonical IN
    SELECT cvm.canonical_id, cvm.vertical_id
    FROM f.canonical_vertical_map cvm
    JOIN f.canonical_content_body ccb ON ccb.canonical_id = cvm.canonical_id
    JOIN f.canonical_content_item cci ON cci.canonical_id = cvm.canonical_id
    WHERE ccb.content_class IS NOT NULL
      AND cci.first_seen_at > now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM m.signal_pool sp
        WHERE sp.canonical_id = cvm.canonical_id
          AND sp.vertical_id = cvm.vertical_id
      )
    LIMIT 100
  LOOP
    PERFORM m.refresh_signal_pool_for_pair(v_canonical.canonical_id, v_canonical.vertical_id);
    v_pool_refreshed_count := v_pool_refreshed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'processed_canonicals', v_processed_count,
    'pool_refreshed', v_pool_refreshed_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.backfill_missing_pool_entries() IS
  'LD19 batch-bounded backfill. Phase 1: insert canonical_vertical_map for unmapped canonicals (last 7d). Phase 2: refresh signal_pool for any vertical_map rows missing pool entries. LIMIT 100 + 60s timeout per call. Stage 4.023.';
```

---

## Code changes

None. Stage 4 is functions only.

---

## Commands to run

From `C:\Users\parve\Invegent-content-engine` on `feature/slot-driven-v3-build`:

```bash
git status
git branch --show-current
git pull origin feature/slot-driven-v3-build

# Files now created on disk. DO NOT run `supabase db push`.
# Claude (chat) applies via Supabase MCP after CC pushes.

git add supabase/migrations/20260426_021_create_expire_signal_pool_function.sql
git add supabase/migrations/20260426_022_create_reconcile_signal_pool_function.sql
git add supabase/migrations/20260426_023_create_backfill_missing_pool_entries_function.sql

git commit -m "feat(slot-driven): Stage 4 — pool maintenance functions (expire, reconcile, backfill)

Phase A foundation continued. R6 stays paused. Functions are
callable but not yet wired to crons (Stage 6).

- m.expire_signal_pool(): UPDATE is_active=false where pool_expires_at < now().
  Returns jsonb {expired_count, ran_at}. Hourly cron in Stage 6.

- m.reconcile_signal_pool(): three-pass recompute on class/fitness/orphan drift.
  Returns jsonb {orphans_deactivated, class_drift_corrected,
  fitness_drift_corrected, ran_at}. Daily cron in Stage 6.

- m.backfill_missing_pool_entries(): LD19 batch-bounded.
  SET LOCAL statement_timeout = 60s.
  LIMIT 100 per call.
  Phase 1: canonicals with no vertical_map (last 7d) → INSERT vertical_map →
    Trigger 2 fires → signal_pool populated.
  Phase 2: defensive refresh for any vertical_map rows missing pool entries.
  Returns jsonb {processed_canonicals, pool_refreshed, ran_at}.
  Caller invokes repeatedly until 0 returned.
  Cron every 15 min in Stage 6.

After CC pushes, Claude (chat) will:
1. Apply migrations 021–023 via Supabase MCP
2. Run backfill loop until processed=0 (~7 batches expected for last 7d)
3. Verify pool populated to ~1,800–4,000 rows
4. Verify R6 still paused, publishing pipeline unaffected

Refs: 26d88b8 (v4), 80d7b4b (Stage 3)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

```
## Stage 4 CC report (git side only)

- ✅ Pre-flight passed: yes/no
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 3/3
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No supabase db push.
Awaiting Claude (chat) to apply migrations via MCP, run the backfill loop,
and verify pool populated.
```

---

## Verification queries Claude (chat) will run

```sql
-- V1: All 3 functions exist
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'm'
  AND proname IN ('expire_signal_pool','reconcile_signal_pool','backfill_missing_pool_entries')
ORDER BY proname;
-- EXPECTED: 3 rows

-- V2: Pre-backfill state
SELECT COUNT(*) AS pool_before FROM m.signal_pool;
-- EXPECTED: 2 (Stage 3 V6 leftover) or near it

-- V3: Backfill loop — call until processed=0
DO $$
DECLARE
  v_result jsonb;
  v_iteration integer := 0;
  v_total_processed integer := 0;
BEGIN
  LOOP
    v_iteration := v_iteration + 1;
    SELECT m.backfill_missing_pool_entries() INTO v_result;
    v_total_processed := v_total_processed + (v_result->>'processed_canonicals')::int;
    RAISE NOTICE 'Iteration %: %', v_iteration, v_result;
    EXIT WHEN (v_result->>'processed_canonicals')::int = 0
           OR v_iteration >= 30;  -- ceiling so a bug can't infinite-loop
  END LOOP;
  RAISE NOTICE 'Backfill complete: % iterations, % canonicals processed total',
    v_iteration, v_total_processed;
END $$;

-- V4: Post-backfill pool state
SELECT
  COUNT(*) AS pool_total,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS pool_active,
  COUNT(DISTINCT canonical_id) AS distinct_canonicals,
  COUNT(DISTINCT vertical_id) AS distinct_verticals
FROM m.signal_pool;
-- EXPECTED:
--   pool_total > 1000 (1804 total canonicals × ~2 verticals each, scoped to last 7d ≈ 647 × 2 = 1300+)
--   pool_active = pool_total
--   distinct_verticals: should match active client verticals (NY+CFW use 11+12, PP uses 7+9+10)
--   distinct_canonicals close to 647 (recent 7d count)

-- V5: Per-vertical pool depth
SELECT
  sp.vertical_id,
  cv.vertical_name,
  COUNT(*) AS pool_size
FROM m.signal_pool sp
JOIN t.content_vertical cv ON cv.vertical_id = sp.vertical_id
WHERE sp.is_active = TRUE
GROUP BY sp.vertical_id, cv.vertical_name
ORDER BY pool_size DESC;
-- EXPECTED: rows for active verticals, varying depths

-- V6: expire_signal_pool callable, returns jsonb
SELECT m.expire_signal_pool();
-- EXPECTED: jsonb {expired_count, ran_at}
-- expired_count likely 0 (everything backfilled in last 7d, expiry windows ≥48h)

-- V7: reconcile_signal_pool callable, returns jsonb
SELECT m.reconcile_signal_pool();
-- EXPECTED: jsonb {orphans_deactivated:0, class_drift_corrected:0,
--          fitness_drift_corrected:0, ran_at}
-- All zero: backfill just finished, no drift possible yet.

-- V8: R6 still paused, publishing pipeline unaffected
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
SELECT status, COUNT(*) FROM m.post_publish_queue GROUP BY status;

-- V9: Spot-check a few pool entries for correct shape
SELECT
  canonical_id, vertical_id, content_class,
  fitness_score_max,
  source_domain,
  source_count,
  pool_expires_at - pool_entered_at AS freshness_window,
  is_active
FROM m.signal_pool
WHERE is_active = TRUE
ORDER BY fitness_score_max DESC
LIMIT 10;
-- EXPECTED: top-fitness entries; freshness_window matches t.class_freshness_rule
--   (e.g. educational_evergreen=720h, analytical=240h, timely_breaking=48h)
```

---

## Rollback (if any verification fails)

```sql
DROP FUNCTION IF EXISTS m.backfill_missing_pool_entries();
DROP FUNCTION IF EXISTS m.reconcile_signal_pool();
DROP FUNCTION IF EXISTS m.expire_signal_pool();
-- Optionally clear the populated pool rows (keep canonical_vertical_map as audit):
-- UPDATE m.signal_pool SET is_active = FALSE;  -- or
-- DELETE FROM m.signal_pool WHERE created_at > <backfill_start_time>;
```

Old pipeline unaffected. R6 still paused.

---

## Notes for after Stage 4 verifies

- **Stage 5** materialises `m.slot` rows from `c.client_publish_schedule` (the slot table will go from 0 rows to ~7 days of forward slots × N clients × N platforms).
- **Stage 6** registers all Phase A crons + heartbeat infrastructure → **GATE A**.

After Stage 4, the pool is populated with real production canonicals. Stage 5 starts producing the slot rows that will eventually pull from this pool.

---

*End Stage 4 brief. v4 commit `26d88b8`. Stage 3 closed at `80d7b4b`. Author: Claude (chat). For execution by: Claude Code (local).*
