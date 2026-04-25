# Claude Code Brief — Stage 1: Extension + 7 tables (DDL only)

**Stage:** 1 of 19
**Phase:** A — Foundation
**Pre-req:** v4 build plan commit `26d88b8`, sync_state commit `556a412`
**Goal:** Create `pg_trgm` extension and 7 new tables for slot-driven foundation. **Zero behaviour change.** R6 stays paused. No triggers, no functions, no cron changes — just structural DDL.
**Estimated duration:** 30–45 min including verification.

---

## Context for CC

This is the first stage of a 19-stage build that inverts ICE's content pipeline from signal-pushed (R6 fans out across clients×platforms×formats and produces 477 drafts/day for 32 publish slots — 15× overproduction) to slot-pulled (each scheduled publish slot pulls from a vertical-scoped pool 24h before its publish time).

Stage 1 only adds structure. No data flows differently after this stage — it is purely additive DDL.

### Schema corrections vs v4 SQL (folded in below)

While verifying production schema against v4 §C.1.* SQL, three concrete and one structural mismatch were found:

| Mismatch | v4 assumed | Production reality | Resolution in this brief |
|---|---|---|---|
| Vertical PK type/name | `content_vertical_id uuid` | `vertical_id integer` | Use `vertical_id integer` everywhere |
| Canonical title column | `f.canonical_content_item.title` | `canonical_title` | Trigram index (Stage 2) targets `canonical_title` |
| ai_job PK | `m.ai_job.id` | `m.ai_job.ai_job_id` | FK in Migration 004 uses `ai_job_id` |
| **`f.canonical_vertical_map`** | **Assumed to exist (Stage 3 trigger fires on it)** | **Does not exist** | **Create as Migration 008 below** |

The fourth is a structural addition to v4. Rationale: the existing pipeline does NOT persist canonical→vertical mappings anywhere. R5 classifier writes `content_class` to `f.canonical_content_body.content_class`, and vertical scoping happens indirectly via `digest_item.client_id → c.client_content_scope.vertical_id`. v4's vertical-scoped pool requires a stable canonical→vertical mapping. Adding `f.canonical_vertical_map` as a new structural table (populated by Stage 3 trigger) preserves v4 architecture without compromise. The alternative — making the pool client-scoped — duplicates rows for clients sharing verticals (NY+CFW share vertical 11+12) and degrades v4's intent.

---

## Pre-flight checks (CC runs first, reports back)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `main` branch, clean working tree (`git status` clean)
- [ ] `git pull origin main` — latest
- [ ] `git checkout -b feature/slot-driven-v3-build` — feature branch for Phase A
- [ ] Verify R6 still paused via `supabase db query` or psql:
  ```sql
  SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
  -- Expected: all three active=false
  ```
- [ ] Verify all 14 publish profiles have destination_id:
  ```sql
  SELECT COUNT(*) FROM c.client_publish_profile 
  WHERE status='active' AND publish_enabled=true AND destination_id IS NULL;
  -- Expected: 0
  ```

If any pre-flight fails: STOP, report to PK, do not proceed.

---

## Files to create

All 8 migration files go under `supabase/migrations/`. Apply in numeric order via `supabase db push`. Filenames use the `YYYYMMDD_NNN_<snake_case>.sql` pattern.

### Migration 001 — `20260426_001_install_pg_trgm_extension.sql`

```sql
-- Stage 1.001 — Install pg_trgm for title-similarity dedup (used in Stage 2 helpers)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON EXTENSION pg_trgm IS
  'Trigram matching for fuzzy title-similarity dedup in slot-driven fill function. Added 2026-04-26 Stage 1.001.';
```

---

### Migration 002 — `20260426_002_create_signal_pool_table.sql`

```sql
-- Stage 1.002 — m.signal_pool: vertical-scoped materialised pool of canonicals
-- Each (canonical_id, vertical_id) is a pool entry. Filled by Stage 3 trigger on
-- f.canonical_vertical_map insert. Read by Stage 8 fill function.

CREATE TABLE m.signal_pool (
  pool_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id         uuid NOT NULL REFERENCES f.canonical_content_item(canonical_id) ON DELETE CASCADE,
  vertical_id          integer NOT NULL REFERENCES t.content_vertical(vertical_id) ON DELETE CASCADE,
  content_class        text NOT NULL,
    -- denormalised from f.canonical_content_body.content_class for fast filtering;
    -- refreshed by Stage 3 trigger when class changes
  pool_entered_at      timestamptz NOT NULL DEFAULT now(),
  pool_expires_at      timestamptz NOT NULL,
    -- computed from t.class_freshness_rule (created in Stage 2);
    -- per F9 in v3, only reset when class changes or entry was inactive
  is_active            boolean NOT NULL DEFAULT true,
  fitness_per_format   jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- {"image_quote": 0.82, "carousel": 0.65, ...}
    -- computed from t.class_format_fitness × c.client_class_fitness_override at insert/refresh
  fitness_score_max    numeric NOT NULL DEFAULT 0,
    -- max value across fitness_per_format, used for cheap top-N pool sort
  reuse_count          integer NOT NULL DEFAULT 0,
    -- incremented when pool entry is selected by fill function
  last_used_at         timestamptz,
    -- set when pool entry is selected; drives reuse penalty curve (LD9, Stage 2)
  source_domain        text,
    -- extracted host of canonical_url; used for source-diversity gate in fill function
  source_count         integer NOT NULL DEFAULT 1,
    -- number of f.feed_source rows that produced this canonical
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT m_signal_pool_canonical_vertical_uniq UNIQUE (canonical_id, vertical_id)
);

-- Pool lookup hot path: filter by vertical + active, sorted by fitness desc
CREATE INDEX idx_signal_pool_vertical_active_fitness
  ON m.signal_pool (vertical_id, fitness_score_max DESC)
  WHERE is_active = true;

-- Expiry sweep
CREATE INDEX idx_signal_pool_expires
  ON m.signal_pool (pool_expires_at)
  WHERE is_active = true;

-- Diversity gate (source_domain count per pool selection)
CREATE INDEX idx_signal_pool_source_domain
  ON m.signal_pool (source_domain)
  WHERE is_active = true;

-- Canonical-side joins (e.g. when refreshing by canonical)
CREATE INDEX idx_signal_pool_canonical
  ON m.signal_pool (canonical_id);

COMMENT ON TABLE m.signal_pool IS
  'Materialised vertical-scoped pool of canonicals available for slot fill. Populated by Stage 3 trigger when canonical_vertical_map gets a new row. Read by Stage 8 fill function. Stage 1.002.';
```

---

### Migration 003 — `20260426_003_create_slot_table.sql`

```sql
-- Stage 1.003 — m.slot: scheduled publish slots that pull from the pool
-- Materialised from c.client_publish_schedule by Stage 5 functions.
-- State machine per LD13: future → pending_fill → fill_in_progress → filled → approved → published

CREATE TABLE m.slot (
  slot_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform                  text NOT NULL,
    -- 'facebook' | 'instagram' | 'linkedin' | 'youtube' (matches c.client_publish_schedule.platform)
  scheduled_publish_at      timestamptz NOT NULL,
  format_preference         text[] NOT NULL DEFAULT ARRAY[]::text[],
    -- ordered preference, e.g. ['image_quote','text_post']; first viable wins in fill
  format_chosen             text,
    -- set by fill function once a format is locked in
  fill_window_opens_at      timestamptz NOT NULL,
    -- = scheduled_publish_at - fill_lead_time_minutes; LD4 sets default 1440
  fill_lead_time_minutes    integer NOT NULL DEFAULT 1440,
    -- LD4: 24-hour lead time for image/carousel/video production
  status                    text NOT NULL DEFAULT 'future',
  skip_reason               text,
    -- set when status transitions to 'skipped' or 'failed'
  filled_at                 timestamptz,
  filled_draft_id           uuid REFERENCES m.post_draft(post_draft_id) ON DELETE SET NULL,
  canonical_ids             uuid[] DEFAULT ARRAY[]::uuid[],
    -- selected canonicals for this slot; no FK enforcement (PG limitation on array element FKs);
    -- referential integrity preserved by fill function logic + audit trail in slot_fill_attempt
  is_evergreen              boolean NOT NULL DEFAULT false,
  evergreen_id              uuid,
    -- FK to t.evergreen_library set after that table is created (Migration 005)
  slot_confidence           numeric,
    -- composite metric per LD10, computed in Stage 7
  source_kind               text NOT NULL DEFAULT 'scheduled',
    -- 'scheduled' (from publish_schedule) | 'one_off' (manual/test) | 'urgent_breaking' (Stage 9)
  schedule_id               uuid REFERENCES c.client_publish_schedule(schedule_id) ON DELETE SET NULL,
    -- which schedule rule materialised this slot
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT m_slot_status_check CHECK (
    status IN ('future','pending_fill','fill_in_progress','filled','approved','published','skipped','failed')
  ),
  CONSTRAINT m_slot_evergreen_consistency CHECK (
    (is_evergreen = false AND evergreen_id IS NULL)
    OR (is_evergreen = true AND evergreen_id IS NOT NULL)
  ),
  CONSTRAINT m_slot_fill_window_consistency CHECK (
    fill_window_opens_at <= scheduled_publish_at
  )
);

-- Promotion query (Stage 5): future slots whose window opens within next 10 minutes
CREATE INDEX idx_slot_status_window
  ON m.slot (status, fill_window_opens_at);

-- Materialiser scheduling lookups
CREATE INDEX idx_slot_client_platform_scheduled
  ON m.slot (client_id, platform, scheduled_publish_at);

-- Recovery cron (Stage 9): find stuck fill_in_progress slots
CREATE INDEX idx_slot_fill_in_progress
  ON m.slot (status, filled_at)
  WHERE status = 'fill_in_progress';

-- Pending-fill queue (Stage 8 fill function pickup)
CREATE INDEX idx_slot_pending_fill
  ON m.slot (fill_window_opens_at, scheduled_publish_at)
  WHERE status = 'pending_fill';

COMMENT ON TABLE m.slot IS
  'Scheduled publish slots in the slot-driven architecture. State machine: future → pending_fill → fill_in_progress → filled → approved → published (or skipped/failed). LD13. Stage 1.003.';
```

---

### Migration 004 — `20260426_004_create_slot_fill_attempt_table.sql`

```sql
-- Stage 1.004 — m.slot_fill_attempt: audit trail for every fill function call
-- One row per fill attempt per slot. Captures pool snapshot, decision, and reason.
-- Used for debugging, threshold tuning, and post-mortem analysis.

CREATE TABLE m.slot_fill_attempt (
  attempt_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                   uuid NOT NULL REFERENCES m.slot(slot_id) ON DELETE CASCADE,
  attempted_at              timestamptz NOT NULL DEFAULT now(),
  pool_size_at_attempt      integer,
    -- count of active pool entries for the slot's vertical at attempt time
  pool_snapshot             jsonb,
    -- top N pool candidates considered with fitness scores; truncated to ~20 entries
  decision                  text NOT NULL,
    -- 'filled' | 'evergreen' | 'skipped' | 'error'
  skip_reason               text,
    -- 'thin_pool' | 'no_format_fit' | 'all_dedup' | 'breaker_closed' | other
  selected_canonical_ids    uuid[] DEFAULT ARRAY[]::uuid[],
  selected_evergreen_id     uuid,
    -- FK added after t.evergreen_library exists (Migration 005)
  chosen_format             text,
  threshold_relaxed         boolean NOT NULL DEFAULT false,
    -- set true if pool health check or evergreen ratio check loosened thresholds
  pool_health_at_attempt    jsonb,
    -- snapshot from Stage 7 m.check_pool_health()
  evergreen_ratio_at_attempt numeric,
    -- 7d rolling evergreen ratio for this client at attempt time
  ai_job_id                 uuid REFERENCES m.ai_job(ai_job_id) ON DELETE SET NULL,
    -- v4 §11 references m.ai_job.id — actual PK is ai_job_id; corrected here
  error_message             text,
  created_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT m_slot_fill_attempt_decision_check CHECK (
    decision IN ('filled','evergreen','skipped','error')
  )
);

-- Per-slot history lookup (most recent first)
CREATE INDEX idx_slot_fill_attempt_slot
  ON m.slot_fill_attempt (slot_id, attempted_at DESC);

-- Decision-type aggregation (skip-reason analysis, evergreen ratio tracking)
CREATE INDEX idx_slot_fill_attempt_decision
  ON m.slot_fill_attempt (decision, attempted_at);

COMMENT ON TABLE m.slot_fill_attempt IS
  'Audit trail of fill function attempts per slot. One row per attempt. Includes pool snapshot for debugging. Stage 1.004.';
```

---

### Migration 005 — `20260426_005_create_evergreen_library_table.sql`

```sql
-- Stage 1.005 — t.evergreen_library: fallback content for thin-pool moments (LD3)
-- Hand-curated by PK in Phase E (parallel content work, ~50 items across verticals).
-- Used by fill function when pool yields no viable candidates.

CREATE TABLE t.evergreen_library (
  evergreen_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                     text NOT NULL,
  content_summary           text NOT NULL,
    -- 1-3 paragraph summary that ai-worker uses as synthesis input
  format_keys               text[] NOT NULL,
    -- which formats this evergreen can be rendered as
  vertical_ids              integer[] NOT NULL,
    -- which verticals this evergreen is relevant to (allows shared use)
  use_cooldown_days         integer NOT NULL DEFAULT 30,
    -- min days between re-use of this evergreen for the same client
  last_used_at              timestamptz,
  last_used_for_client      uuid REFERENCES c.client(client_id) ON DELETE SET NULL,
  use_count                 integer NOT NULL DEFAULT 0,
  is_core                   boolean NOT NULL DEFAULT false,
    -- LD3 / H4: core items get prioritised in deep-thin-pool moments
  is_active                 boolean NOT NULL DEFAULT true,
  staleness_check_at        timestamptz,
    -- H4 staleness columns: last time staleness was assessed
  staleness_score           numeric,
    -- 0..1; 1 = fresh, 0 = stale
  staleness_review_required boolean NOT NULL DEFAULT false,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_evergreen_library_format_keys_nonempty CHECK (
    array_length(format_keys, 1) >= 1
  ),
  CONSTRAINT t_evergreen_library_vertical_ids_nonempty CHECK (
    array_length(vertical_ids, 1) >= 1
  )
);

-- Fallback lookup: active items, by format compatibility, oldest-used first (LRU)
CREATE INDEX idx_evergreen_library_active_lru
  ON t.evergreen_library (is_active, last_used_at NULLS FIRST);

-- Vertical filtering (GIN for array containment queries)
CREATE INDEX idx_evergreen_library_verticals
  ON t.evergreen_library USING GIN (vertical_ids);

-- Format filtering
CREATE INDEX idx_evergreen_library_formats
  ON t.evergreen_library USING GIN (format_keys);

-- Now wire the deferred FKs from Migration 003 and 004
ALTER TABLE m.slot
  ADD CONSTRAINT m_slot_evergreen_id_fkey
  FOREIGN KEY (evergreen_id) REFERENCES t.evergreen_library(evergreen_id) ON DELETE SET NULL;

ALTER TABLE m.slot_fill_attempt
  ADD CONSTRAINT m_slot_fill_attempt_evergreen_id_fkey
  FOREIGN KEY (selected_evergreen_id) REFERENCES t.evergreen_library(evergreen_id) ON DELETE SET NULL;

COMMENT ON TABLE t.evergreen_library IS
  'Hand-curated fallback content for thin-pool moments. ~50 items target across active verticals (Phase E). LD3. Stage 1.005.';
```

---

### Migration 006 — `20260426_006_create_slot_alerts_table.sql`

```sql
-- Stage 1.006 — m.slot_alerts: monitoring alerts surfaced to dashboard
-- Written by various Phase B+ functions (pool health check, critical window scan, recovery, etc.)
-- Read by dashboard and reviewed by PK during sprint mode.

CREATE TABLE m.slot_alerts (
  alert_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_kind                text NOT NULL,
    -- 'pool_thin' | 'evergreen_overuse' | 'critical_window_unfilled'
    -- | 'fill_in_progress_stuck' | 'cron_heartbeat_missing' | 'class_drift'
  severity                  text NOT NULL,
    -- 'info' | 'warning' | 'critical'
  client_id                 uuid REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform                  text,
  vertical_id               integer REFERENCES t.content_vertical(vertical_id) ON DELETE SET NULL,
  slot_id                   uuid REFERENCES m.slot(slot_id) ON DELETE CASCADE,
  payload                   jsonb,
    -- alert-kind-specific data; e.g. {pool_size: 2, threshold: 5} for pool_thin
  message                   text,
    -- human-readable one-line summary
  created_at                timestamptz NOT NULL DEFAULT now(),
  acknowledged_at           timestamptz,
  acknowledged_by           text,

  CONSTRAINT m_slot_alerts_severity_check CHECK (
    severity IN ('info','warning','critical')
  )
);

-- Active alert lookup (unacknowledged, severity-ordered)
CREATE INDEX idx_slot_alerts_active
  ON m.slot_alerts (severity, created_at DESC)
  WHERE acknowledged_at IS NULL;

-- Per-client alert filtering
CREATE INDEX idx_slot_alerts_client
  ON m.slot_alerts (client_id, created_at DESC)
  WHERE acknowledged_at IS NULL;

-- Alert-kind aggregation (e.g. how many pool_thin alerts in last 24h)
CREATE INDEX idx_slot_alerts_kind
  ON m.slot_alerts (alert_kind, created_at DESC);

COMMENT ON TABLE m.slot_alerts IS
  'Operational alerts from slot-driven pipeline functions. Surfaced to dashboard. Stage 1.006.';
```

---

### Migration 007 — `20260426_007_create_cron_health_check_table.sql`

```sql
-- Stage 1.007 — m.cron_health_check: heartbeat tracking for slot-driven crons
-- Distinct from existing m.cron_health_alert / m.cron_health_snapshot.
-- Each cron writes its jobname here on every tick (via m.heartbeat() helper, Stage 6).
-- m.check_cron_heartbeats() (Stage 6) compares last_heartbeat_at vs expected_interval
-- and raises slot_alerts when a cron stops heartbeating.

CREATE TABLE m.cron_health_check (
  jobname                   text PRIMARY KEY,
  last_heartbeat_at         timestamptz,
  expected_interval_minutes integer NOT NULL,
    -- expected gap between heartbeats; alerts fire at 1.5x this interval
  consecutive_misses        integer NOT NULL DEFAULT 0,
  last_alert_at             timestamptz,
    -- last time a missing-heartbeat alert was raised (rate-limit alerting)
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.cron_health_check IS
  'Heartbeat tracking for slot-driven Phase A/B crons. Read by m.check_cron_heartbeats() (Stage 6). Stage 1.007.';

-- Seed the 10 expected jobnames (per v4 expected count). Stage 6 registers the
-- corresponding cron entries; this seed pre-populates the rows so the heartbeat
-- helper can UPDATE in place from tick 1.
INSERT INTO m.cron_health_check (jobname, expected_interval_minutes, notes) VALUES
  ('expire-signal-pool-hourly',                60,   'Stage 6. Expires pool entries past pool_expires_at.'),
  ('reconcile-signal-pool-daily',              1440, 'Stage 6. Full pool recompute on class drift.'),
  ('backfill-missing-pool-entries-every-15m',  15,   'Stage 6. Async race miss backfill (LD19 batch limited).'),
  ('materialise-slots-nightly',                1440, 'Stage 6. Materialises next 7 days of slots.'),
  ('promote-slots-to-pending-every-5m',        5,    'Stage 6. future → pending_fill at fill_window_opens_at.'),
  ('fill-pending-slots-every-10m',             10,   'Stage 10. The fill function tick.'),
  ('recover-stuck-fill-in-progress-every-15m', 15,   'Stage 10. fill_in_progress > 1h → pending_fill (LD13/F10).'),
  ('try-urgent-breaking-fills-every-15m',      15,   'Stage 10. Breaking news auto-insert (LD17/LD20).'),
  ('critical-window-monitor-every-30m',        30,   'Stage 10. Alerts on slots <2h to publish unfilled.'),
  ('pool-health-check-hourly',                 60,   'Stage 10. Per-vertical pool depth assessment.');

-- Sanity: 10 rows seeded
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM m.cron_health_check;
  IF v_count <> 10 THEN
    RAISE EXCEPTION 'cron_health_check seed count expected 10, got %', v_count;
  END IF;
END $$;
```

---

### Migration 008 — `20260426_008_create_canonical_vertical_map_table.sql`

```sql
-- Stage 1.008 — f.canonical_vertical_map: canonical → vertical mapping (NEW)
--
-- v4 assumed this table exists; it does not. The existing pipeline scopes
-- vertical at digest_item.client_id level, indirectly via c.client_content_scope.
-- This table closes that structural gap and preserves v4's vertical-scoped
-- pool design.
--
-- Population (Stage 3 trigger, NOT Stage 1):
--   When f.canonical_content_body.content_class transitions NULL → set
--   (i.e. when m.classify_canonicals_unclassified runs), insert one row per
--   distinct vertical that any subscribing client cares about, sourced via:
--     canonical → content_item_canonical_map → content_item → c.client_source
--     → c.client_content_scope.vertical_id
--
-- This table is empty after Stage 1. Population is Stage 3's job. Backfill of
-- existing classified canonicals is Stage 4 (m.backfill_missing_pool_entries).
--
-- Stage 3's m.refresh_signal_pool trigger fires on INSERT to THIS table,
-- replacing v4's (incorrect) plan to fire on f.canonical_vertical_map directly
-- as if it pre-existed.

CREATE TABLE f.canonical_vertical_map (
  canonical_id    uuid NOT NULL REFERENCES f.canonical_content_item(canonical_id) ON DELETE CASCADE,
  vertical_id     integer NOT NULL REFERENCES t.content_vertical(vertical_id) ON DELETE CASCADE,
  mapped_at       timestamptz NOT NULL DEFAULT now(),
  mapping_source  text NOT NULL DEFAULT 'classifier_auto',
    -- 'classifier_auto' | 'manual' | 'backfill'
  notes           text,

  CONSTRAINT f_canonical_vertical_map_pk PRIMARY KEY (canonical_id, vertical_id),
  CONSTRAINT f_canonical_vertical_map_source_check CHECK (
    mapping_source IN ('classifier_auto','manual','backfill')
  )
);

-- Vertical-side lookup (Stage 3 pool refresh fires per vertical row inserted)
CREATE INDEX idx_canonical_vertical_map_vertical
  ON f.canonical_vertical_map (vertical_id, canonical_id);

-- Recency lookup (e.g. "all canonicals mapped to vertical X in last 24h")
CREATE INDEX idx_canonical_vertical_map_mapped_at
  ON f.canonical_vertical_map (mapped_at DESC);

COMMENT ON TABLE f.canonical_vertical_map IS
  'Canonical → vertical mapping. New structural piece for slot-driven architecture. Empty after Stage 1; populated by Stage 3 trigger on classifier output. Stage 1.008.';
```

---

## Code changes

None. Stage 1 is DDL only.

---

## Commands to run

From `C:\Users\parve\Invegent-content-engine` on `feature/slot-driven-v3-build` branch:

```bash
# 1. Apply migrations (Supabase CLI handles ordering by filename)
supabase db push

# 2. Verify migrations applied
supabase migration list

# 3. Stage commit
git add supabase/migrations/20260426_001_install_pg_trgm_extension.sql
git add supabase/migrations/20260426_002_create_signal_pool_table.sql
git add supabase/migrations/20260426_003_create_slot_table.sql
git add supabase/migrations/20260426_004_create_slot_fill_attempt_table.sql
git add supabase/migrations/20260426_005_create_evergreen_library_table.sql
git add supabase/migrations/20260426_006_create_slot_alerts_table.sql
git add supabase/migrations/20260426_007_create_cron_health_check_table.sql
git add supabase/migrations/20260426_008_create_canonical_vertical_map_table.sql

git commit -m "feat(slot-driven): Stage 1 — extension + 7 tables (DDL only)

Phase A foundation. Zero behaviour change. R6 stays paused.

- pg_trgm extension for title-similarity dedup (Stage 2 helpers)
- m.signal_pool: vertical-scoped materialised pool
- m.slot: scheduled publish slots with full state machine
- m.slot_fill_attempt: audit trail per fill attempt
- t.evergreen_library: fallback content (Phase E populates)
- m.slot_alerts: operational alerts surfaced to dashboard
- m.cron_health_check: heartbeat tracking (10 jobnames seeded)
- f.canonical_vertical_map: NEW canonical→vertical mapping
  (closes v4 structural gap; populated by Stage 3 trigger)

Schema corrections vs v4 SQL:
- vertical_id is integer (not content_vertical_id uuid)
- ai_job PK is ai_job_id (not id)

v4 build plan: docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md
Stage 1 brief: docs/briefs/cc-stage-01.md

Refs: 26d88b8 (v4)"

# 4. Push branch
git push -u origin feature/slot-driven-v3-build
```

---

## Verification CC runs locally before reporting

Run via `psql` or `supabase db query`:

```sql
-- V1: All 7 tables exist in correct schemas
SELECT table_schema, table_name
FROM information_schema.tables
WHERE (table_schema, table_name) IN (
  ('m','signal_pool'),
  ('m','slot'),
  ('m','slot_fill_attempt'),
  ('t','evergreen_library'),
  ('m','slot_alerts'),
  ('m','cron_health_check'),
  ('f','canonical_vertical_map')
)
ORDER BY table_schema, table_name;
-- EXPECTED: 7 rows
```

```sql
-- V2: Slot status check constraint includes fill_in_progress
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'm_slot_status_check';
-- EXPECTED: 1 row, definition contains 'fill_in_progress'
```

```sql
-- V3: pg_trgm extension installed
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
-- EXPECTED: 1 row
```

```sql
-- V4: cron_health_check seeded with 10 jobnames
SELECT COUNT(*) AS seeded FROM m.cron_health_check;
-- EXPECTED: 10
```

```sql
-- V5: Deferred FKs wired (m.slot.evergreen_id and m.slot_fill_attempt.selected_evergreen_id)
SELECT
  conrelid::regclass::text AS source_table,
  conname,
  confrelid::regclass::text AS references_table
FROM pg_constraint
WHERE conname IN (
  'm_slot_evergreen_id_fkey',
  'm_slot_fill_attempt_evergreen_id_fkey'
);
-- EXPECTED: 2 rows, both referencing t.evergreen_library
```

```sql
-- V6: All new tables have zero rows (no behaviour change)
SELECT 'm.signal_pool' AS t, COUNT(*) FROM m.signal_pool
UNION ALL SELECT 'm.slot', COUNT(*) FROM m.slot
UNION ALL SELECT 'm.slot_fill_attempt', COUNT(*) FROM m.slot_fill_attempt
UNION ALL SELECT 't.evergreen_library', COUNT(*) FROM t.evergreen_library
UNION ALL SELECT 'm.slot_alerts', COUNT(*) FROM m.slot_alerts
UNION ALL SELECT 'f.canonical_vertical_map', COUNT(*) FROM f.canonical_vertical_map;
-- EXPECTED: all 0 (m.cron_health_check is the exception — seeded with 10)
```

```sql
-- V7: R6 still paused (sanity — should not have changed during DDL)
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
-- EXPECTED: all three active=false
```

---

## What CC reports back

Paste this template into chat with values filled in:

```
## Stage 1 CC report

- ✅ Pre-flight passed: yes/no (if no, what failed)
- ✅ Branch: feature/slot-driven-v3-build (or other)
- ✅ Migrations applied: 8/8 (or list which failed)
- V1 (7 tables exist):       PASS / FAIL — actual count: __
- V2 (status check has fill_in_progress): PASS / FAIL
- V3 (pg_trgm installed):    PASS / FAIL
- V4 (cron_health_check has 10 seed rows): PASS / FAIL — actual: __
- V5 (deferred FKs wired):   PASS / FAIL
- V6 (new tables empty):     PASS / FAIL — counts: __
- V7 (R6 still paused):      PASS / FAIL
- Commit SHA: ____________
- Branch pushed: yes/no
- Anything unexpected: ____________ or "none"
```

---

## Then PAUSE

Wait for Claude (chat) verification + PK approval before Stage 2.

Claude will run V1–V7 independently via Supabase MCP after CC reports. If all pass and PK approves, Stage 2 brief follows (config tables + helper functions + post_draft slot_id/is_shadow columns + trigram index on canonical_title).

---

## Rollback (if any verification fails)

```sql
-- Drop in reverse dependency order
DROP TABLE IF EXISTS f.canonical_vertical_map CASCADE;
DROP TABLE IF EXISTS m.cron_health_check CASCADE;
DROP TABLE IF EXISTS m.slot_alerts CASCADE;

-- Drop deferred FKs first
ALTER TABLE m.slot_fill_attempt DROP CONSTRAINT IF EXISTS m_slot_fill_attempt_evergreen_id_fkey;
ALTER TABLE m.slot DROP CONSTRAINT IF EXISTS m_slot_evergreen_id_fkey;

DROP TABLE IF EXISTS t.evergreen_library CASCADE;
DROP TABLE IF EXISTS m.slot_fill_attempt CASCADE;
DROP TABLE IF EXISTS m.slot CASCADE;
DROP TABLE IF EXISTS m.signal_pool CASCADE;
-- pg_trgm extension is harmless to leave; leave installed.

-- Then:
git checkout main
git branch -D feature/slot-driven-v3-build
```

---

## Defaults applied (PK can veto before running CC)

1. **Branch strategy:** feature branch `feature/slot-driven-v3-build` (per v4 default and rationale).
2. **First cutover target:** N/A for Stage 1 (this is foundation, no cutover).
3. **CC execution mechanism:** brief committed to `docs/briefs/cc-stage-01.md`, PK runs CC against the file with whatever local invocation works. No assumptions about RC/CLI mechanism baked into the brief.
4. **Architectural addition:** `f.canonical_vertical_map` as 7th table. Resolves the `f.canonical_vertical_map does not exist` blocker discovered in pre-flight. Alternative (client-scoped pool) was rejected as it degrades v4 vertical-scoping.

---

*End Stage 1 brief. v4 commit `26d88b8`. Author: Claude (chat). For execution by: Claude Code (local).*
