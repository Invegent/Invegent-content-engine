# Claude Code Brief — Stage 3: Two-trigger chain — classifier output → vertical_map → signal_pool

**Stage:** 3 of 19
**Phase:** A — Foundation
**Pre-req:** Stage 2 complete (commit `130a559`, all migrations 001–017 applied)
**Goal:** Wire two PostgreSQL trigger chains. Trigger 1 fires when classifier sets `content_class` on `f.canonical_content_body` and resolves the canonical's verticals via the `canonical → content_item → source → client_source → client_content_scope` chain, inserting into `f.canonical_vertical_map`. Trigger 2 fires on `f.canonical_vertical_map` insert and populates/refreshes the `m.signal_pool` entry for that (canonical, vertical) pair. **Limited live behaviour change** — triggers fire on existing classifier cron (jobid 68, every 5 min) and start populating the new tables. R6 stays paused; the populated pool is not yet read by anything.
**Estimated duration:** 45–60 min including verification.

---

## Context for CC

Stage 2 created the structural tables and config. Stage 3 wires the data flow that fills them.

### Architectural revision vs v4 §A.5

v4 §A.5 originally proposed a single trigger on `f.canonical_vertical_map`. Pre-flight discovered that table didn't exist (Stage 1 created it) and that the actual classifier output lands in `f.canonical_content_body.content_class`, not in any mapping table.

Stage 3 splits the work into two triggers, each small and independently testable:

**Trigger 1 — `f.canonical_content_body` AFTER UPDATE/INSERT OF content_class**
Fires when classifier writes a non-null `content_class`. Computes the canonical's vertical set by joining canonical → content_item_canonical_map → content_item → c.client_source → c.client_content_scope, filtered to active+enabled subscriptions. Inserts one row per resolved vertical into `f.canonical_vertical_map` with `mapping_source='classifier_auto'`. ON CONFLICT DO NOTHING keeps the trigger idempotent on classifier reclassifications.

**Trigger 2 — `f.canonical_vertical_map` AFTER INSERT**
Fires for each row Trigger 1 inserts (one per vertical). Calls a helper function `m.refresh_signal_pool_for_pair(canonical_id, vertical_id)` that:
- Looks up the canonical's content_class from `f.canonical_content_body`
- Looks up the freshness window from `t.class_freshness_rule.freshness_window_hours`
- Looks up `fitness_per_format` jsonb from `t.class_format_fitness` (the global per-class-per-format scores, NOT the per-client effective view)
- Extracts source_domain from canonical_url via regex
- Counts source_count via `f.content_item_canonical_map`
- UPSERT into `m.signal_pool` keyed on (canonical_id, vertical_id) UNIQUE
- Per LD2/F9: if entry exists with matching content_class AND is_active=true, only update fitness/source fields — do NOT reset pool_expires_at. Reset expiry only on class change OR previously-inactive entry.

The helper function (`refresh_signal_pool_for_pair`) is also called directly by Stage 4's backfill function and the manual reconciliation function. Splitting the work this way means Trigger 2 is just one line wrapping the helper.

### Why two triggers, not one

- **Separation of concerns**: vertical resolution and pool population are independently fixable. If client_source assignments change in the future and we want to re-resolve verticals for existing canonicals, we can re-run Trigger 1's logic (via Stage 4 backfill) without touching pool refresh logic.
- **Backfill simplicity**: Stage 4's backfill iterates classified canonicals and calls Trigger 1's logic directly via a SECURITY DEFINER function. Trigger 2 fires automatically as Stage 4 inserts canonical_vertical_map rows. One backfill call drives both layers.
- **Audit trail**: `f.canonical_vertical_map` becomes a queryable record of which canonicals were ever considered for which verticals — useful for debugging "why isn't X in the pool".

### Behaviour change envelope

R6 is paused and will stay paused. After Stage 3 deploys:
- Classifier cron 68 fires every 5 minutes as before
- For each classification it does, Trigger 1 fires, resolving 0–3 verticals
- For each resolved vertical, Trigger 2 fires, creating/refreshing one `m.signal_pool` row
- `m.signal_pool` accumulates rows over time
- Nothing reads `m.signal_pool` yet — Stage 8's fill function does that, and only in shadow mode (Stage 10)

Old pipeline (digest_run, ai_job, post_seed, post_publish_queue) is entirely untouched. Stage 3 is observable via direct DB queries on the new tables.

### Schema corrections vs v4 §A.5

v4 §A.5's trigger function pseudocode assumed:
- A column `f.canonical_vertical_map.canonical_id` reference (correct, Stage 1 created it)
- That `t.class_format_fitness` per-class-per-format scores apply globally (correct — per-client overrides come into play later in fill function via `vw_effective_class_format_fitness`)
- A simple jsonb construction for `fitness_per_format` from class_format_fitness rows (correct)

The trigger uses the **global** `t.class_format_fitness` (not the per-client effective view) because pool entries are vertical-scoped, not client-scoped. Per-client fitness overrides apply at fill time, when the fill function reads the pool with the requesting client's effective view.

---

## Pre-flight checks (CC runs first, reports back)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — fast-forward, latest is `130a559`

If any pre-flight fails: STOP, report, do not proceed.

---

## Files to create

3 migration files. CC commits source-of-truth files; Claude (chat) applies via Supabase MCP.

### Migration 018 — `20260426_018_create_resolve_canonical_verticals_function.sql`

```sql
-- Stage 3.018 — m.resolve_canonical_verticals: returns the set of vertical_ids
-- a canonical maps to via active client subscriptions
--
-- Used by:
--   - Trigger 1 (Migration 020) when classifier sets content_class
--   - Stage 4 backfill (next stage) for already-classified canonicals
--   - Manual reconciliation if client_source assignments change
--
-- Logic: canonical → content_item_canonical_map → content_item → client_source (enabled) →
--        client (active) → client_content_scope → vertical_id
-- Filtered to active+enabled subscriptions only. Inactive sources don't generate pool entries.

CREATE OR REPLACE FUNCTION m.resolve_canonical_verticals(p_canonical_id uuid)
RETURNS TABLE(vertical_id integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ccs.vertical_id
  FROM f.content_item_canonical_map ccm
  JOIN f.content_item ci ON ci.content_item_id = ccm.content_item_id
  JOIN c.client_source cs ON cs.source_id = ci.source_id AND cs.is_enabled = TRUE
  JOIN c.client cl ON cl.client_id = cs.client_id AND cl.status = 'active'
  JOIN c.client_content_scope ccs ON ccs.client_id = cs.client_id
  WHERE ccm.canonical_id = p_canonical_id
  ORDER BY ccs.vertical_id;
$$;

COMMENT ON FUNCTION m.resolve_canonical_verticals(uuid) IS
  'Returns vertical_ids a canonical maps to via active client subscriptions. Reads canonical → content_item → source → client_source (enabled) → client (active) → client_content_scope. Stage 3.018.';
```

---

### Migration 019 — `20260426_019_create_refresh_signal_pool_for_pair_function.sql`

```sql
-- Stage 3.019 — m.refresh_signal_pool_for_pair: upsert one (canonical, vertical) pool entry
-- Per LD2/F9: only reset pool_expires_at when content_class actually changes OR
-- when re-activating an inactive entry. Existing active entries with same class get
-- fitness/source refresh but keep their original expiry.

CREATE OR REPLACE FUNCTION m.refresh_signal_pool_for_pair(
  p_canonical_id uuid,
  p_vertical_id  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_class           text;
  v_freshness_hours integer;
  v_fitness_jsonb   jsonb;
  v_fitness_max     numeric;
  v_url             text;
  v_source_domain   text;
  v_source_count    integer;
  v_existing_class  text;
  v_existing_active boolean;
  v_should_reset_expiry boolean;
BEGIN
  -- 1. Read class and url from canonical body + item
  SELECT ccb.content_class, cci.canonical_url
    INTO v_class, v_url
  FROM f.canonical_content_body ccb
  JOIN f.canonical_content_item cci ON cci.canonical_id = ccb.canonical_id
  WHERE ccb.canonical_id = p_canonical_id;

  -- Defensive: if no body or no class, do nothing (trigger shouldn't have fired,
  -- but a manual call could land here)
  IF v_class IS NULL THEN
    RETURN;
  END IF;

  -- 2. Freshness window for this class
  SELECT freshness_window_hours INTO v_freshness_hours
  FROM t.class_freshness_rule
  WHERE class_code = v_class;

  -- Defensive default: if no rule for this class (e.g. a new class added without
  -- a freshness rule), use 168h (7 days).
  IF v_freshness_hours IS NULL THEN
    v_freshness_hours := 168;
  END IF;

  -- 3. Build fitness_per_format jsonb from t.class_format_fitness (global, current)
  SELECT
    jsonb_object_agg(ice_format_key, fitness_score),
    MAX(fitness_score)
    INTO v_fitness_jsonb, v_fitness_max
  FROM t.class_format_fitness
  WHERE class_code = v_class AND is_current = TRUE;

  -- Defensive: if no fitness rows for this class, fall back to empty + 0 max
  IF v_fitness_jsonb IS NULL THEN
    v_fitness_jsonb := '{}'::jsonb;
    v_fitness_max := 0;
  END IF;

  -- 4. Extract source_domain from canonical_url (lowercased host before path/port)
  v_source_domain := lower(substring(coalesce(v_url, '') FROM '(?:https?://)?([^/:]+)'));
  IF v_source_domain = '' THEN
    v_source_domain := NULL;
  END IF;

  -- 5. Source count: how many distinct content_item rows produced this canonical
  SELECT COUNT(DISTINCT ci.source_id) INTO v_source_count
  FROM f.content_item_canonical_map ccm
  JOIN f.content_item ci ON ci.content_item_id = ccm.content_item_id
  WHERE ccm.canonical_id = p_canonical_id;
  IF v_source_count IS NULL OR v_source_count < 1 THEN
    v_source_count := 1;
  END IF;

  -- 6. Look up existing entry to apply F9 logic
  SELECT content_class, is_active
    INTO v_existing_class, v_existing_active
  FROM m.signal_pool
  WHERE canonical_id = p_canonical_id AND vertical_id = p_vertical_id;

  -- F9: reset expiry on (a) new entry, (b) class changed, (c) re-activating inactive entry
  v_should_reset_expiry := (
    v_existing_class IS NULL
    OR v_existing_class IS DISTINCT FROM v_class
    OR v_existing_active = FALSE
  );

  -- 7. UPSERT
  INSERT INTO m.signal_pool (
    canonical_id, vertical_id, content_class,
    pool_entered_at, pool_expires_at, is_active,
    fitness_per_format, fitness_score_max,
    source_domain, source_count
  ) VALUES (
    p_canonical_id, p_vertical_id, v_class,
    now(), now() + make_interval(hours => v_freshness_hours), TRUE,
    v_fitness_jsonb, v_fitness_max,
    v_source_domain, v_source_count
  )
  ON CONFLICT (canonical_id, vertical_id) DO UPDATE SET
    content_class      = EXCLUDED.content_class,
    fitness_per_format = EXCLUDED.fitness_per_format,
    fitness_score_max  = EXCLUDED.fitness_score_max,
    source_domain      = EXCLUDED.source_domain,
    source_count       = EXCLUDED.source_count,
    is_active          = TRUE,
    -- F9: only reset entered_at + expires_at when reset condition met
    pool_entered_at    = CASE WHEN v_should_reset_expiry
                              THEN EXCLUDED.pool_entered_at
                              ELSE m.signal_pool.pool_entered_at END,
    pool_expires_at    = CASE WHEN v_should_reset_expiry
                              THEN EXCLUDED.pool_expires_at
                              ELSE m.signal_pool.pool_expires_at END,
    updated_at         = now();
END;
$$;

COMMENT ON FUNCTION m.refresh_signal_pool_for_pair(uuid, integer) IS
  'Upsert one (canonical, vertical) entry in m.signal_pool. F9: pool_expires_at only resets on class change or inactive→active. Stage 3.019.';
```

---

### Migration 020 — `20260426_020_create_pool_population_triggers.sql`

```sql
-- Stage 3.020 — Two-trigger chain: classifier output → vertical_map → signal_pool
--
-- Trigger 1: f.canonical_content_body AFTER UPDATE OF content_class (and AFTER INSERT)
--            Resolves verticals and inserts canonical_vertical_map rows.
-- Trigger 2: f.canonical_vertical_map AFTER INSERT
--            Calls m.refresh_signal_pool_for_pair() per row.

-- =========================================================================
-- Trigger 1: classifier output handler
-- =========================================================================

CREATE OR REPLACE FUNCTION f.handle_classifier_output()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_class text;
  v_new_class text;
BEGIN
  v_new_class := NEW.content_class;

  -- Only act when content_class is now non-null
  IF v_new_class IS NULL THEN
    RETURN NEW;
  END IF;

  -- For UPDATE, compare old vs new class. For INSERT, OLD is unset.
  IF TG_OP = 'UPDATE' THEN
    v_old_class := OLD.content_class;
    -- No-op if the class hasn't actually changed
    IF v_old_class IS NOT DISTINCT FROM v_new_class THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Insert one canonical_vertical_map row per resolved vertical.
  -- ON CONFLICT DO NOTHING handles the case where this canonical already has
  -- a mapping for some vertical (e.g. classifier reclassified to same class
  -- but trigger fired twice, or a manual mapping pre-existed).
  INSERT INTO f.canonical_vertical_map (canonical_id, vertical_id, mapping_source)
  SELECT NEW.canonical_id, vertical_id, 'classifier_auto'
  FROM m.resolve_canonical_verticals(NEW.canonical_id)
  ON CONFLICT (canonical_id, vertical_id) DO NOTHING;

  -- Note: if the class CHANGED on an existing canonical with already-mapped verticals,
  -- the canonical_vertical_map rows stay (they only encode "this canonical is relevant
  -- to vertical X" — which doesn't depend on class). But Trigger 2 won't fire on the
  -- ON CONFLICT no-ops, so the pool entries won't refresh from this path.
  -- Solution: explicitly call refresh_signal_pool_for_pair for existing mappings too.
  -- This handles the reclassification case correctly.
  IF TG_OP = 'UPDATE' AND v_old_class IS DISTINCT FROM v_new_class THEN
    PERFORM m.refresh_signal_pool_for_pair(NEW.canonical_id, vertical_id)
    FROM f.canonical_vertical_map
    WHERE canonical_id = NEW.canonical_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION f.handle_classifier_output() IS
  'Trigger function: when content_class is set/changed on f.canonical_content_body, resolve verticals and populate f.canonical_vertical_map. On reclassification, also refresh existing pool entries. Stage 3.020.';

-- AFTER UPDATE OF content_class — fires when classifier UPDATEs an existing body row.
-- AFTER INSERT — fires for the rare case a body row is inserted with content_class
-- already set (defensive; current pipeline does INSERT NULL + UPDATE).
DROP TRIGGER IF EXISTS trg_handle_classifier_output ON f.canonical_content_body;

CREATE TRIGGER trg_handle_classifier_output
AFTER UPDATE OF content_class OR INSERT ON f.canonical_content_body
FOR EACH ROW
EXECUTE FUNCTION f.handle_classifier_output();

-- =========================================================================
-- Trigger 2: vertical_map → signal_pool refresh
-- =========================================================================

CREATE OR REPLACE FUNCTION f.handle_canonical_vertical_map_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM m.refresh_signal_pool_for_pair(NEW.canonical_id, NEW.vertical_id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION f.handle_canonical_vertical_map_insert() IS
  'Trigger function: on f.canonical_vertical_map INSERT, refresh the corresponding m.signal_pool entry. Stage 3.020.';

DROP TRIGGER IF EXISTS trg_canonical_vertical_map_pool_refresh ON f.canonical_vertical_map;

CREATE TRIGGER trg_canonical_vertical_map_pool_refresh
AFTER INSERT ON f.canonical_vertical_map
FOR EACH ROW
EXECUTE FUNCTION f.handle_canonical_vertical_map_insert();
```

---

## Code changes

None. Stage 3 is functions + triggers only.

---

## Commands to run

From `C:\Users\parve\Invegent-content-engine` on `feature/slot-driven-v3-build`:

```bash
git status                       # clean apart from .claude/
git branch --show-current        # feature/slot-driven-v3-build
git pull origin feature/slot-driven-v3-build

# Files now created on disk. DO NOT run `supabase db push`.
# Claude (chat) applies via Supabase MCP after CC pushes.

git add supabase/migrations/20260426_018_create_resolve_canonical_verticals_function.sql
git add supabase/migrations/20260426_019_create_refresh_signal_pool_for_pair_function.sql
git add supabase/migrations/20260426_020_create_pool_population_triggers.sql

git commit -m "feat(slot-driven): Stage 3 — pool population trigger chain (DDL + functions)

Phase A foundation continued. Limited live behaviour change:
classifier cron 68 will start populating canonical_vertical_map and
signal_pool through two new triggers. Pool not yet read by anything.
R6 stays paused.

- m.resolve_canonical_verticals(uuid): SQL function returning vertical_ids
  via canonical → content_item → client_source → client_content_scope chain
  (enabled sources + active clients only)

- m.refresh_signal_pool_for_pair(uuid, integer): UPSERT helper.
  F9 logic: pool_expires_at only resets on class change or inactive→active.
  Reads class freshness from t.class_freshness_rule.
  Reads global fitness from t.class_format_fitness.
  Extracts source_domain via regex on canonical_url.
  Computes source_count from content_item_canonical_map.

- f.handle_classifier_output(): trigger function on canonical_content_body
  AFTER UPDATE OF content_class OR INSERT.
  Inserts one canonical_vertical_map row per resolved vertical.
  Handles reclassification by re-refreshing existing pool entries.

- f.handle_canonical_vertical_map_insert(): trigger function on
  canonical_vertical_map AFTER INSERT.
  Calls refresh_signal_pool_for_pair per row.

Architectural revision vs v4 §A.5:
v4 assumed a single trigger on f.canonical_vertical_map. Pre-flight
showed classifier output lands in f.canonical_content_body.content_class,
not in a mapping table. Stage 3 splits the work into two triggers
(classifier→vertical_map, vertical_map→pool) for testability.

Migrations applied via Supabase MCP per repo standing pattern.

Refs: 26d88b8 (v4), 130a559 (Stage 2)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

```
## Stage 3 CC report (git side only)

- ✅ Pre-flight passed: yes/no
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 3/3
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No supabase db push.
Awaiting Claude (chat) to apply migrations via MCP and run V1–V8 verification.
```

---

## Verification queries Claude (chat) will run after MCP apply

```sql
-- V1: All 4 new functions exist
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE proname IN (
  'resolve_canonical_verticals',
  'refresh_signal_pool_for_pair',
  'handle_classifier_output',
  'handle_canonical_vertical_map_insert'
)
AND n.nspname IN ('m','f')
ORDER BY proname;
-- EXPECTED: 4 rows

-- V2: Both triggers exist and are enabled
SELECT tgname, tgrelid::regclass::text AS on_table, tgenabled
FROM pg_trigger
WHERE tgname IN (
  'trg_handle_classifier_output',
  'trg_canonical_vertical_map_pool_refresh'
)
ORDER BY tgname;
-- EXPECTED: 2 rows, tgenabled = 'O' (origin/enabled)

-- V3: resolve_canonical_verticals returns sensible output for a real canonical
SELECT vertical_id FROM m.resolve_canonical_verticals(
  (SELECT cci.canonical_id
   FROM f.canonical_content_item cci
   JOIN f.canonical_content_body ccb ON ccb.canonical_id = cci.canonical_id
   JOIN f.content_item_canonical_map ccm ON ccm.canonical_id = cci.canonical_id
   JOIN f.content_item ci ON ci.content_item_id = ccm.content_item_id
   JOIN c.client_source cs ON cs.source_id = ci.source_id AND cs.is_enabled = TRUE
   WHERE ccb.content_class IS NOT NULL
   LIMIT 1)
);
-- EXPECTED: ≥1 row of vertical_ids (integers from {7,9,10,11,12,15,16,17})

-- V4: signal_pool starts empty
SELECT COUNT(*) AS rows FROM m.signal_pool;
-- EXPECTED: 0

-- V5: canonical_vertical_map starts empty
SELECT COUNT(*) AS rows FROM f.canonical_vertical_map;
-- EXPECTED: 0

-- V6: Functional test — synthetic UPDATE on existing classified canonical
-- Picks one classified canonical, "touches" content_class (set to itself),
-- verifies trigger chain populates both tables.
DO $$
DECLARE
  v_test_canonical_id uuid;
  v_test_class text;
  v_map_count integer;
  v_pool_count integer;
BEGIN
  -- Pick a real classified canonical with active subscriptions
  SELECT cci.canonical_id, ccb.content_class
    INTO v_test_canonical_id, v_test_class
  FROM f.canonical_content_item cci
  JOIN f.canonical_content_body ccb ON ccb.canonical_id = cci.canonical_id
  JOIN f.content_item_canonical_map ccm ON ccm.canonical_id = cci.canonical_id
  JOIN f.content_item ci ON ci.content_item_id = ccm.content_item_id
  JOIN c.client_source cs ON cs.source_id = ci.source_id AND cs.is_enabled = TRUE
  JOIN c.client cl ON cl.client_id = cs.client_id AND cl.status = 'active'
  WHERE ccb.content_class IS NOT NULL
  LIMIT 1;

  IF v_test_canonical_id IS NULL THEN
    RAISE NOTICE 'V6: no test canonical available; skipping';
    RETURN;
  END IF;

  -- Touch the row so AFTER UPDATE OF content_class fires.
  -- We set it to a different value first, then back to itself, to force trigger fire.
  UPDATE f.canonical_content_body
  SET content_class = '__test_temp__'
  WHERE canonical_id = v_test_canonical_id;

  UPDATE f.canonical_content_body
  SET content_class = v_test_class
  WHERE canonical_id = v_test_canonical_id;

  -- Verify trigger output
  SELECT COUNT(*) INTO v_map_count
  FROM f.canonical_vertical_map
  WHERE canonical_id = v_test_canonical_id;

  SELECT COUNT(*) INTO v_pool_count
  FROM m.signal_pool
  WHERE canonical_id = v_test_canonical_id AND is_active = TRUE;

  RAISE NOTICE 'V6 results: canonical_id=%, class=%, vertical_map_rows=%, signal_pool_rows=%',
    v_test_canonical_id, v_test_class, v_map_count, v_pool_count;

  IF v_map_count = 0 THEN
    RAISE EXCEPTION 'V6 FAIL: trigger 1 did not produce canonical_vertical_map rows';
  END IF;

  IF v_pool_count = 0 THEN
    RAISE EXCEPTION 'V6 FAIL: trigger 2 did not produce signal_pool rows';
  END IF;
END $$;

-- V7: Pool entry has expected shape
SELECT
  canonical_id,
  vertical_id,
  content_class,
  pool_expires_at > pool_entered_at AS expiry_in_future,
  jsonb_typeof(fitness_per_format) AS fitness_type,
  fitness_score_max > 0 AS fitness_max_positive,
  source_domain IS NOT NULL AS has_source_domain,
  source_count >= 1 AS source_count_valid
FROM m.signal_pool
LIMIT 5;
-- EXPECTED: rows with all booleans = true

-- V8: R6 still paused
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
-- EXPECTED: all three active=false

-- V9 (observation, not gating): wait 6 minutes (longer than the 5-min classifier cron),
-- then check organic pool growth
-- (Claude in chat will run after a short wait if needed)
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - interval '10 minutes') AS pool_rows_last_10m,
  COUNT(*) AS pool_rows_total
FROM m.signal_pool;
```

V6 is the critical functional test — it forces the trigger chain to fire on a real canonical and verifies both tables get populated. If V6 fails, Stage 3 fails.

---

## Rollback (if any verification fails)

```sql
DROP TRIGGER IF EXISTS trg_canonical_vertical_map_pool_refresh ON f.canonical_vertical_map;
DROP TRIGGER IF EXISTS trg_handle_classifier_output ON f.canonical_content_body;
DROP FUNCTION IF EXISTS f.handle_canonical_vertical_map_insert();
DROP FUNCTION IF EXISTS f.handle_classifier_output();
DROP FUNCTION IF EXISTS m.refresh_signal_pool_for_pair(uuid, integer);
DROP FUNCTION IF EXISTS m.resolve_canonical_verticals(uuid);
-- Optionally clear any rows V6 inserted:
-- DELETE FROM m.signal_pool;
-- DELETE FROM f.canonical_vertical_map;
```

Old pipeline unaffected by Stage 3 rollback. R6 still paused.

---

## Notes for after Stage 3 verifies

- **Stage 4** is the backfill: `m.backfill_missing_pool_entries()` with LD19 LIMIT 100 + 60s timeout, running through the existing 1,804 classified canonicals to populate the new tables for everything in production. Stage 4 also creates `m.expire_signal_pool()` and `m.reconcile_signal_pool()`, the maintenance functions.
- **Stage 5** materialises `m.slot` rows from `c.client_publish_schedule`.
- **Stage 6** registers Phase A crons + heartbeat infrastructure → **GATE A**.

After Stage 3 verifies, the pool will populate organically as the 5-min classifier cron runs. Stage 4's backfill is what loads the pool with already-classified canonicals.

---

*End Stage 3 brief. v4 commit `26d88b8`. Stage 2 closed at `130a559`. Author: Claude (chat). For execution by: Claude Code (local).*
