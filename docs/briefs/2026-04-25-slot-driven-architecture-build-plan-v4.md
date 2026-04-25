# Slot-Driven Architecture — Build Plan v4

**Date:** 26 April 2026 Sunday early morning AEST (composed end-of-Saturday-session)
**Status:** BUILD PLAN — supersedes v3 design (`6319b17`). v3 architecture stays as the design reference; v4 is the operational plan to build it.
**Authors:** PK + Claude. Round-3 reviewer findings folded in (Section 1 below).
**Purpose:** Stage-gated build sequence with CC briefs, verification queries, exit criteria. PK wakes up, can run Stage 1 within 30 minutes of opening their laptop.

---

## 0. What changed v3 → v4

V3 was build-ready architecture. V4 is the build PLAN.

V3 also got a third review round which flagged 3 final critical implementation issues. These are folded into v4 as locked decisions LD18-20. They are not architecture changes — they are precise enforcement points the build must respect.

### Three final critical fixes from round 3 reviewers (folded into v4)

| # | Issue | Reviewer source | Resolution in v4 |
|---|---|---|---|
| LD18 | **AI worker idempotency must be DB-enforced, not assumed.** Atomic `UPDATE ... WHERE status='fill_in_progress'` with row-count check; if 0 rows updated, abort the late draft write to avoid race-condition corruption. | All 3 round-3 reviewers | Stage 11 (ai-worker code) |
| LD19 | **Pool backfill function must be batch-bounded.** A 6-12 hour ingestion backlog could queue 200-500 canonicals; sequential trigger logic per row would stall the cron. Add `LIMIT 100` per run + `statement_timeout 60s`. | Reviewer C | Stage 4 (backfill function) |
| LD20 | **Breaking news collision check must be "replaceable", not just "absent".** A future scheduled slot in the next 6h that's already filled with low-fitness or evergreen content should NOT block a high-fitness breaking news insert. | Reviewer C | Stage 9 (urgent-breaking function) |

Total locked decisions across v1-v4: 20.

V3 reviewer D's "complexity creep" concern is acknowledged. Mitigation: every Stage exits in a stable state where R6-paused-with-old-pipeline-still-runnable is preserved. We can stop or roll back at any Stage boundary without breaking publishing.

---

## 1. Build philosophy

**Three roles:**

| Role | Who | What they do |
|---|---|---|
| Builder | **Claude Code** (CC) running in PK's local terminal | Writes migration SQL files, applies them, deploys EF code, commits to GitHub. One Stage at a time. |
| Verifier | **Claude in chat** (me) | Reads each Stage's CC report. Runs verification queries via Supabase MCP. Confirms exit criteria. Writes Stage N+1 brief. |
| Approver | **PK** | Reviews each Stage's verification result. Approves or asks for changes. |

**Stage gate:** Every Stage has a clear go/no-go. Either all exit criteria pass (proceed) or something fails (rollback or fix). No partial commits, no "we'll come back to that."

**Pause safety:** Every Stage exits leaving:
- R6 seed crons still paused (cron 11, 64, 65)
- Old pipeline able to resume if needed (until Phase D)
- 154-draft buffer untouched
- Production publishing unaffected (until Stage 13 cutover)

**Rollback:** Every Stage has a documented rollback. If Stage N fails verification, we either:
- Forward-fix in same Stage (preferred when fix is small)
- Roll back Stage N migrations (never roll back across stages — each Stage is atomic)
- Pause builds, re-plan

**No skipping ahead:** If Stage 4 verification fails, we don't start Stage 5 "while we figure out Stage 4." Building forward through a known-broken state is how 24-hour fixes become 4-day fixes.

---

## 2. Stage brief template (what every CC handoff looks like)

Every Stage I hand to CC follows this structure. Format kept consistent so CC has predictable instructions.

```
## Stage N: <name>

### Goal
<one sentence>

### Pre-flight checks (CC runs first, reports back)
- [ ] Working directory: C:\Users\parve\Invegent-content-engine
- [ ] On main branch, clean working tree
- [ ] git pull latest
- [ ] <any stage-specific verifications>

### Files to create
- supabase/migrations/<timestamp>_<name>.sql
  <full SQL content>
- supabase/migrations/<timestamp>_<name>.sql
  <full SQL content>
...

### Code changes (if any)
- <file path> — <change description with full new code>

### Commands to run
1. `git checkout -b <branch>` (if branch strategy = feature branch)
2. `supabase db push` or per-file `supabase migration up`
3. `git add . && git commit -m "<message>"`
4. `git push origin <branch>`

### Verification CC runs locally before reporting
- <SQL query or command, expected output>

### What CC reports back
- ✅ All pre-flight passed: yes/no
- ✅ Migrations applied: <list>
- ✅ Code changes deployed: <list>
- ✅ Local verification: <results>
- Commit SHAs: <list>
- Anything unexpected: <details or "none">

### Then PAUSE. Wait for Claude (chat) verification + PK approval before Stage N+1.
```

I check back via Supabase MCP queries after each Stage report. The verification gate decides next move.

---

## 3. Stage execution plan

### Phases at a glance

| Phase | Stages | Total est | Cumulative state |
|---|---|---|---|
| **A — Foundation** | 1-6 | 5-7h | Tables + triggers + crons in place. Pool populates. Slots materialise. R6 still paused. No new behaviour visible to clients. |
| **GATE A** | check | 30 min | Verify pool depth, slot materialisation, cron heartbeats |
| **B — Fill in shadow** | 7-11 | 5-7h | Fill function + recovery + breaking news + ai-worker idempotency. Shadow drafts comparable to old pipeline output. |
| **GATE B** | check | 5-7 days observation | Observe shadow drafts, tune thresholds, verify all defensive crons |
| **C — Cutover** | 12-15 | 3-4h spread | NY-FB live, then NY-IG, NY-LI, then PP across all platforms |
| **GATE C** | check | per-client | Each cutover gets one week observation before next |
| **D — Decommission** | 16 | 1-2h | Drop old R6, tidy up |
| **E — Evergreen seed** | 17 | 3-4h content work | Hand-curate 50-60 evergreen items across verticals (parallel to phases C/D) |

### Stage 1: Extensions + 6 new tables (DDL only)

**Goal:** Create 6 new tables and 1 extension. Zero behaviour change.

**Migrations (in order):**
1. `20260426_001_install_pg_trgm_extension.sql` → `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
2. `20260426_002_create_signal_pool_table.sql` → `m.signal_pool` with 4 indexes (incl. `source_domain`)
3. `20260426_003_create_slot_table.sql` → `m.slot` with extended status enum incl. `fill_in_progress`
4. `20260426_004_create_slot_fill_attempt_table.sql` → audit table
5. `20260426_005_create_evergreen_library_table.sql` → with H4 staleness columns + `is_core`
6. `20260426_006_create_slot_alerts_table.sql` → monitoring table
7. `20260426_007_create_cron_health_check_table.sql` → heartbeat table + seed rows

**SQL content:** see v3 §C.1.1 through §C.1.6. CC takes the SQL verbatim from v3 §C and §B.8 (status check constraint).

**Verification (Claude via Supabase MCP):**
```sql
-- All 6 tables exist in correct schemas
SELECT table_schema, table_name FROM information_schema.tables 
WHERE (table_schema, table_name) IN (
  ('m','signal_pool'), ('m','slot'), ('m','slot_fill_attempt'),
  ('t','evergreen_library'), ('m','slot_alerts'), ('m','cron_health_check')
)
ORDER BY table_schema, table_name;
-- Expected: 6 rows

-- Slot status check constraint includes fill_in_progress
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'm_slot_status_check';
-- Expected: contains 'fill_in_progress'

-- pg_trgm extension installed
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
-- Expected: 1 row

-- cron_health_check seeded with 10 jobnames
SELECT COUNT(*) FROM m.cron_health_check;
-- Expected: 10
```

**Exit criteria:** All 4 verification queries return expected results. No errors during migration apply. R6 crons still paused.

**Rollback:** Drop the 6 tables in reverse order. `pg_trgm` extension can stay (used by future stages anyway; harmless if no triggers reference it yet).

**Estimated duration:** 30-45 minutes including CC execution + my verification.

---

### Stage 2: Config tables + helper functions

**Goal:** Seed config tables (freshness, synthesis, quality, reuse, dedup). Create helper functions (title_similarity, keyword_overlap). `m.post_draft` gets `slot_id` and `is_shadow` columns.

**Migrations:**
1. `20260426_008_create_class_freshness_rule_table.sql` → `t.class_freshness_rule` + 6 seed rows (v3 §C.1.5)
2. `20260426_009_create_format_synthesis_policy_table.sql` → `t.format_synthesis_policy` + 6 seed rows
3. `20260426_010_create_format_quality_policy_table.sql` → `t.format_quality_policy` + 6 seed rows
4. `20260426_011_create_reuse_penalty_curve_table.sql` → `t.reuse_penalty_curve` + 4 seed rows
5. `20260426_012_create_dedup_policy_table.sql` → `t.dedup_policy` + 3 seed rows (default/strict/lenient)
6. `20260426_013_alter_post_draft_add_slot_id_is_shadow.sql` → ADD COLUMN slot_id, is_shadow + 2 indexes
7. `20260426_014_create_title_similarity_function.sql` → `m.title_similarity()` IMMUTABLE
8. `20260426_015_create_keyword_overlap_function.sql` → `m.keyword_overlap()` IMMUTABLE
9. `20260426_016_create_canonical_title_trgm_index.sql` → GiST index on `f.canonical_content_item.title`

**Verification:**
```sql
-- Config tables seeded
SELECT 'class_freshness_rule' AS t, COUNT(*) FROM t.class_freshness_rule
UNION ALL SELECT 'format_synthesis_policy', COUNT(*) FROM t.format_synthesis_policy
UNION ALL SELECT 'format_quality_policy', COUNT(*) FROM t.format_quality_policy
UNION ALL SELECT 'reuse_penalty_curve', COUNT(*) FROM t.reuse_penalty_curve
UNION ALL SELECT 'dedup_policy', COUNT(*) FROM t.dedup_policy;
-- Expected: 6,6,6,4,3

-- Helper functions exist and work
SELECT m.title_similarity('NDIS reform announced', 'NDIS reform announcement');
-- Expected: numeric > 0.7

SELECT m.keyword_overlap('NDIS reform announced today', 'NDIS reform announcement');
-- Expected: numeric > 0.5

-- post_draft has new columns
SELECT column_name FROM information_schema.columns
WHERE table_schema='m' AND table_name='post_draft' 
  AND column_name IN ('slot_id','is_shadow');
-- Expected: 2 rows

-- Trigram index exists
SELECT indexname FROM pg_indexes 
WHERE schemaname='f' AND indexname='idx_canonical_title_trgm';
-- Expected: 1 row
```

**Exit criteria:** All seeds present, both helpers callable with sensible output, `m.post_draft` columns added.

**Rollback:** ALTER TABLE DROP COLUMN, DROP TABLE for the 5 config tables, DROP FUNCTION for the 2 helpers, DROP INDEX.

**Estimated duration:** 30-45 minutes.

---

### Stage 3: Pool trigger + helper

**Goal:** Pool entries automatically created when canonicals reach (body+class+vertical) state.

**Migrations:**
1. `20260426_017_create_refresh_signal_pool_function.sql` → trigger function from v3 §A.5 (revised conditional expiry logic for F9)
2. `20260426_018_create_refresh_signal_pool_for_pair_function.sql` → callable version for backfill
3. `20260426_019_create_refresh_signal_pool_trigger.sql` → trigger on `f.canonical_vertical_map`

**Critical implementation note for CC:**

The trigger function MUST honor F9 — only reset `pool_expires_at` if class actually changed OR existing entry was inactive. Re-reading the same canonical from a repeat-feed should NOT re-freshen its expiry. Pseudocode in v3 §A.5; CC implements verbatim.

**Verification:**
```sql
-- Function and trigger exist
SELECT proname FROM pg_proc 
WHERE pronamespace='m'::regnamespace 
  AND proname IN ('refresh_signal_pool','refresh_signal_pool_for_pair');
-- Expected: 2 rows

SELECT tgname FROM pg_trigger 
WHERE tgname='trg_refresh_signal_pool';
-- Expected: 1 row

-- Pool population check: any newly classified canonical from now should appear in pool
-- (Wait 10-15 min after a fresh ingest cycle, then check)
SELECT COUNT(*) FROM m.signal_pool WHERE pool_entered_at > NOW() - interval '30 minutes';
-- Expected: > 0 if ingest happened in this window

-- Source domain populated correctly (not NULL after trigger fires)
SELECT 
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE source_domain IS NOT NULL) AS with_domain
FROM m.signal_pool;
-- Expected: with_domain = total (or close to)
```

**Exit criteria:** Trigger fires on subsequent vertical_map activity. Pool entries get correct fitness_per_format jsonb. source_domain populated.

**Rollback:** DROP TRIGGER, DROP FUNCTION x2.

**Estimated duration:** 30 minutes (function+trigger creation 5 min, observation window 20-25 min for next ingest tick).

---

### Stage 4: Pool maintenance functions

**Goal:** Pool stays consistent: expires stale entries, reconciles drift, backfills async race misses.

**Migrations:**
1. `20260426_020_create_expire_signal_pool_function.sql` → expires entries past `pool_expires_at`
2. `20260426_021_create_reconcile_signal_pool_function.sql` → full recompute on class drift (F7)
3. `20260426_022_create_backfill_missing_pool_entries_function.sql` → **WITH LD19 BATCH LIMIT 100**
4. `20260426_023_one_time_backfill_existing_canonicals.sql` → SELECT m.backfill_missing_pool_entries() repeatedly until 0 returned

**Critical implementation note for CC (LD19):**

```sql
-- Inside m.backfill_missing_pool_entries():
SET LOCAL statement_timeout = '60s';
FOR v_row IN
  SELECT cci.canonical_content_item_id, cvm.content_vertical_id
  FROM ...
  WHERE ...
    AND cci.created_at > NOW() - interval '7 days'
  LIMIT 100  -- LD19 batch cap
LOOP
  PERFORM m.refresh_signal_pool_for_pair(...);
  v_count := v_count + 1;
END LOOP;
```

This prevents stalls when a 6-12 hour backlog accumulates.

**Verification:**
```sql
-- Backfill of existing canonicals — keep running until no more rows backfilled
SELECT m.backfill_missing_pool_entries();
-- Expected: { backfilled: N, ran_at: ... } where N decreases on subsequent calls

-- Pool now has entries for existing classified canonicals
SELECT 
  COUNT(*) AS pool_entries,
  COUNT(DISTINCT canonical_id) AS distinct_canonicals,
  COUNT(DISTINCT vertical_id) AS distinct_verticals,
  AVG(fitness_score_max) AS avg_max_fitness
FROM m.signal_pool 
WHERE is_active = true;
-- Expected: pool_entries > 0; distinct_verticals matches active client verticals (likely 2-3)

-- Reconcile function runs cleanly
SELECT m.reconcile_signal_pool();
-- Expected: { orphaned_deactivated: N, class_drift_corrected: M, fitness_recomputed: K, reconciled_at: ... }
```

**Exit criteria:** Pool populated for existing canonicals. Three maintenance functions callable. Backfill batch cap enforced.

**Rollback:** DROP FUNCTION x3 + (data) DELETE FROM m.signal_pool (re-runnable from trigger on new ingests).

**Estimated duration:** 45-60 minutes (function creation 15 min, backfill loop 20-30 min depending on existing canonical volume).

---

### Stage 5: Slot materialiser + promotion

**Goal:** Schedule rules → concrete slot rows. Slots transition future → pending_fill on time.

**Migrations:**
1. `20260426_024_create_compute_rule_slot_times_function.sql` → helper for cadence computation
2. `20260426_025_create_materialise_slots_function.sql` → main materialiser (24h lead time hardcoded per LD4)
3. `20260426_026_create_handle_schedule_rule_change_function.sql` → trigger function for rule changes
4. `20260426_027_create_rematerialise_trigger.sql` → trigger on `c.client_publish_schedule`
5. `20260426_028_create_promote_slots_to_pending_function.sql` → with F8 buffer (`<= NOW() + 10 minutes`)
6. `20260426_029_one_time_initial_slot_materialisation.sql` → SELECT m.materialise_slots(7)

**Verification:**
```sql
-- Slots materialised for next 7 days from active schedules
SELECT 
  c.client_name,
  s.platform,
  COUNT(*) AS slots_count,
  MIN(s.scheduled_publish_at) AS earliest,
  MAX(s.scheduled_publish_at) AS latest
FROM m.slot s
JOIN c.client c ON c.client_id = s.client_id
WHERE s.status = 'future'
GROUP BY c.client_name, s.platform
ORDER BY c.client_name, s.platform;
-- Expected: rows for NY/PP across active platforms

-- Lead time exactly 24h (1440 minutes)
SELECT DISTINCT fill_lead_time_minutes FROM m.slot;
-- Expected: 1440

-- Promotion function (no slots due yet, should return 0)
SELECT m.promote_slots_to_pending();
-- Expected: 0 (unless any slot has window_opens within 10 min)
```

**Exit criteria:** Slots exist for 7 days ahead. Lead time correct. Promotion function callable.

**Rollback:** DROP TRIGGER, DROP FUNCTIONS x4, DELETE FROM m.slot.

**Estimated duration:** 45-60 minutes.

---

### Stage 6: Phase A crons registered + heartbeat wiring

**Goal:** All Phase A defensive crons running. Heartbeat health check operational.

**Migrations:**
1. `20260426_030_register_phase_a_crons.sql` → registers 5 crons:
   - `expire-signal-pool-hourly` (`5 * * * *`)
   - `reconcile-signal-pool-daily` (`30 16 * * *`)
   - `backfill-missing-pool-entries-every-15m` (`*/15 * * * *`)
   - `materialise-slots-nightly` (`0 15 * * *`)
   - `promote-slots-to-pending-every-5m` (`*/5 * * * *`)

2. `20260426_031_create_heartbeat_helper_and_health_check.sql` → 
   - `m.heartbeat()` function (each cron calls this at start)
   - `m.cron_health_status` view
   - `m.check_cron_heartbeats()` function

3. `20260426_032_register_cron_heartbeat_check.sql` → registers `cron-heartbeat-check-hourly` (`45 * * * *`)

**CC note:** Wrap each cron's actual command to call heartbeat first. Pattern:
```sql
SELECT cron.schedule(
  'expire-signal-pool-hourly',
  '5 * * * *',
  $$SELECT m.heartbeat('expire-signal-pool-hourly'), m.expire_signal_pool();$$
);
```

**Verification:**
```sql
-- 6 new crons registered (5 Phase A + 1 heartbeat check)
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname IN (
  'expire-signal-pool-hourly',
  'reconcile-signal-pool-daily',
  'backfill-missing-pool-entries-every-15m',
  'materialise-slots-nightly',
  'promote-slots-to-pending-every-5m',
  'cron-heartbeat-check-hourly'
)
ORDER BY jobname;
-- Expected: 6 rows, all active=true

-- Wait 15-20 min, then check heartbeats writing
SELECT * FROM m.cron_health_status WHERE jobname IN (...) ORDER BY jobname;
-- Expected: At minimum, the 5-min and 15-min crons should have heartbeats < 30 min old

-- R6 crons still paused
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
-- Expected: all active=false
```

**Exit criteria (GATE A):** 
- All Phase A crons firing on schedule
- Heartbeats written within 1.5× expected interval
- R6 still paused
- Pool populating, slots materialising, no errors in cron logs

**Rollback:** UNSCHEDULE all 6 new crons.

**Estimated duration:** 30 min creation + 30-45 min observation for heartbeat verification.

---

### 🚦 GATE A — Phase A complete

Before proceeding to Phase B, verify:
- [ ] All 6 Phase A migrations applied
- [ ] All 5 Phase A crons + 1 heartbeat cron firing on schedule
- [ ] `m.signal_pool` has rows for existing canonicals
- [ ] `m.slot` has rows for next 7 days from active schedules
- [ ] `m.cron_health_status` view shows all green/ok
- [ ] R6 still paused (jobid 11, 64, 65 active=false)
- [ ] No errors in `cron.job_run_details` for Phase A jobs

If all pass: **PK approves, Stage 7 begins.** If anything fails: forward-fix or roll back the failing stage.

---

### Stage 7: Confidence + health + ratio functions

**Goal:** Pre-fill scoring infrastructure ready before fill function lands.

**Migrations:**
1. `20260426_033_create_compute_slot_confidence_function.sql` → composite metric (LD10)
2. `20260426_034_create_check_pool_health_function.sql` → global pool quality assessment (D.8/H1)
3. `20260426_035_create_evergreen_ratio_view.sql` → 7d rolling ratio per client (D.7)
4. `20260426_036_create_check_evergreen_threshold_function.sql` → returns adjustment recommendation (D.7)

**Verification:**
```sql
-- All callable, return expected shapes
SELECT m.compute_slot_confidence(0.8, 5, 0.6, 12);
-- Expected: numeric 0..1

SELECT m.check_pool_health((SELECT content_vertical_id FROM t.content_vertical LIMIT 1));
-- Expected: jsonb with health, total, etc.

SELECT * FROM m.evergreen_ratio_7d LIMIT 5;
-- Expected: empty for now (no slots filled yet) but query runs

SELECT m.check_evergreen_threshold((SELECT client_id FROM c.client LIMIT 1));
-- Expected: jsonb with ratio, alert, recommendation
```

**Exit criteria:** All 4 functions callable and return correct types.

**Estimated duration:** 30 min.

---

### Stage 8: THE FILL FUNCTION (its own stage)

**Goal:** The largest single piece of v3. Builds slot pickup, gates, dedup, evergreen fallback, audit, ai_job insert, state transition to fill_in_progress.

This is intentionally its own stage — the function is ~150 lines and integrates 6 other tables and 4 other functions. It deserves dedicated verification.

**Migrations:**
1. `20260426_037_create_fill_pending_slots_function.sql` → the heart of v3 (§B.4-B.8)
2. `20260426_038_create_handle_draft_rejection_trigger.sql` → 1-retry then skip (§B.9)

**The fill function MUST include all of:**
- `FOR UPDATE SKIP LOCKED` on slot lock (concurrency)
- Pool query with reuse penalty, title-similarity dedup, keyword overlap dedup, **same-canonical-day hard block (F4/LD15)**
- Quality gates: pool size, fitness threshold, diversity (multi-item only via source_domain count)
- Pool health check call → optional threshold relaxation
- Evergreen threshold check → optional further relaxation
- Evergreen fallback path with LRU + cooldown
- `m.slot_fill_attempt` audit row insertion
- ai_job insertion with payload incl. canonical_ids, format, synthesis_mode, slot_id, is_evergreen
- Slot status transition: `pending_fill` → `fill_in_progress` (LD13 — NOT directly to filled)
- Pool reuse_count increment for selected canonicals
- Slot confidence computation
- `is_evergreen` boolean set on slot

CC implements from v3 §B.4-B.8 verbatim, plus the LD15 hard block CTE and §D.7/D.8 health checks.

**Verification:**
```sql
-- Function exists with reasonable size
SELECT proname, pg_get_function_arguments(oid) AS args, length(prosrc) AS body_size
FROM pg_proc 
WHERE pronamespace='m'::regnamespace 
  AND proname='fill_pending_slots';
-- Expected: 1 row, body_size > 5000 chars

-- Dry-run call (no slots are pending_fill yet, should return [])
SELECT m.fill_pending_slots(5);
-- Expected: [] (empty jsonb array) — no slots due yet

-- Insert a synthetic future slot for test, advance fill window manually
INSERT INTO m.slot (client_id, platform, scheduled_publish_at, format_preference, 
                    fill_window_opens_at, fill_lead_time_minutes, status, source_kind)
VALUES ((SELECT client_id FROM c.client WHERE client_name='NDIS Yarns'),
        'facebook', NOW() + interval '24 hours', ARRAY['image_quote'],
        NOW() - interval '5 minutes',  -- already opened
        1440, 'pending_fill', 'one_off');

-- Now fill should pick it up (in shadow mode — Stage 10)
-- For now, just verify the function runs without error
SELECT m.fill_pending_slots(1);
-- Expected: jsonb array with 1 result row (filled or skipped)

-- Check the audit
SELECT * FROM m.slot_fill_attempt ORDER BY attempted_at DESC LIMIT 1;
-- Expected: 1 row with pool_snapshot

-- Clean up the test slot
DELETE FROM m.slot WHERE source_kind='one_off' AND status IN ('fill_in_progress','filled');
```

**Exit criteria:** Function callable. Test slot can be filled (in fill_in_progress state). Audit row created with snapshot. No exceptions.

**Rollback:** DROP FUNCTION + DROP TRIGGER.

**Estimated duration:** 90 minutes (creation 30 min, end-to-end test 30 min, debug if needed 30 min).

---

### Stage 9: Recovery + critical window + breaking news

**Goal:** Defensive crons that protect the fill function from race conditions and structural blind spots.

**Migrations:**
1. `20260426_039_create_recover_stuck_slots_function.sql` → §B.10 (F10/LD13)
2. `20260426_040_create_slots_in_critical_window_view.sql` → §B.11
3. `20260426_041_create_scan_critical_windows_function.sql` → §B.11
4. `20260426_042_create_hot_breaking_pool_view.sql` → §B.12 (H3)
5. `20260426_043_create_try_urgent_breaking_fills_function.sql` → §B.12 (F6/LD17) **WITH LD20 REPLACEABLE-SLOT CHECK**

**Critical implementation note for CC (LD20):**

The breaking news collision check (in `try_urgent_breaking_fills`) currently reads (v3 draft):
```sql
AND NOT EXISTS (
  SELECT 1 FROM m.slot s
  WHERE s.client_id = v_client.client_id
    AND s.platform = v_client.platform
    AND s.scheduled_publish_at BETWEEN NOW() AND NOW() + interval '6 hours'
    AND s.status NOT IN ('skipped','failed','published')
)
```

**LD20 fix — use replaceable check instead:**
```sql
AND NOT EXISTS (
  SELECT 1 FROM m.slot s
  WHERE s.client_id = v_client.client_id
    AND s.platform = v_client.platform
    AND s.scheduled_publish_at BETWEEN NOW() AND NOW() + interval '6 hours'
    AND s.status IN ('approved','published')  -- already locked in
    -- OR filled with high-fitness non-evergreen content
    OR (s.status = 'filled' AND s.is_evergreen = false 
        AND s.slot_confidence > 0.65)
)
```

A future slot that's only at `pending_fill`, `fill_in_progress`, or `filled` with low-confidence/evergreen content is replaceable. The breaking insert proceeds.

**Verification:**
```sql
-- All functions/views exist
SELECT proname FROM pg_proc WHERE pronamespace='m'::regnamespace 
  AND proname IN ('recover_stuck_slots','scan_critical_windows','try_urgent_breaking_fills');
-- Expected: 3 rows

SELECT viewname FROM pg_views 
WHERE schemaname='m' AND viewname IN ('slots_in_critical_window','hot_breaking_pool');
-- Expected: 2 rows

-- Recovery function runs cleanly (no stuck slots yet)
SELECT m.recover_stuck_slots();
-- Expected: { recovered_to_pending: 0, marked_failed: 0, ran_at: ... }

-- Breaking fills function runs cleanly
SELECT m.try_urgent_breaking_fills();
-- Expected: { urgent_slots_inserted: 0, skipped_caps: 0, ran_at: ... }
```

**Exit criteria:** All 3 functions and 2 views exist. Each runs without error returning expected JSONB shape.

**Estimated duration:** 60 minutes.

---

### Stage 10: Phase B crons + shadow mode activation

**Goal:** All defensive crons live. Fill function runs in shadow mode (no real publishing yet).

**Migrations:**
1. `20260426_044_register_phase_b_crons.sql` → registers:
   - `fill-pending-slots-every-10m` (`*/10 * * * *`) **with shadow flag** in payload
   - `recover-stuck-fill-in-progress-every-15m` (`*/15 * * * *`)
   - `try-urgent-breaking-fills-every-15m` (`*/15 * * * *`)
   - `critical-window-monitor-every-30m` (`*/30 * * * *`)
   - `pool-health-check-hourly` (`15 * * * *`)

**Shadow mode mechanism:** The fill cron passes `is_shadow=true` to ai_job, which propagates to `m.post_draft.is_shadow=true`. Existing publishers filter `is_shadow=false`. Shadow drafts never publish.

**CC note:** The fill function reads a config value to determine shadow mode:
```sql
-- Add to t.dedup_policy or similar:
-- Use system_config style table OR add column to slot
-- Simplest: a single bool stored in c.system_config or hardcoded into the cron command:
SELECT cron.schedule(
  'fill-pending-slots-every-10m',
  '*/10 * * * *',
  $$SELECT m.heartbeat('fill-pending-slots-every-10m'), m.fill_pending_slots(5, p_shadow := true);$$
);
```

So the fill function gets a `p_shadow boolean DEFAULT false` parameter. ai_job's input_payload includes `"is_shadow": true`. ai-worker writes draft with `is_shadow=true` flag.

**Verification:**
```sql
-- 5 new crons registered
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname IN (
  'fill-pending-slots-every-10m',
  'recover-stuck-fill-in-progress-every-15m',
  'try-urgent-breaking-fills-every-15m',
  'critical-window-monitor-every-30m',
  'pool-health-check-hourly'
);
-- Expected: 5 rows active=true

-- Wait 30 min after slots reach pending_fill (i.e. 30 min after a publish_at - 24h boundary)
-- Then check shadow drafts created
SELECT COUNT(*) FROM m.post_draft WHERE is_shadow = true AND created_at > NOW() - interval '1 hour';
-- Expected: > 0 if any slots due

-- Verify ai_job created with shadow flag
SELECT id, status, input_payload->>'is_shadow' FROM m.ai_job 
WHERE created_at > NOW() - interval '1 hour' 
  AND input_payload->>'is_shadow' = 'true'
LIMIT 5;
-- Expected: rows present
```

**Exit criteria:** All 5 Phase B crons registered. Fill function fires on schedule. Shadow drafts being created (assuming any slots are in pending_fill state). Recovery cron runs without error.

**Estimated duration:** 30 min creation + 60-90 min observation.

---

### Stage 11: ai-worker code changes

**Goal:** ai-worker enforces idempotency at DB level (LD18) + uses prompt caching (LD7).

**This is NOT a SQL migration — it's an Edge Function code change.**

**Changes to `supabase/functions/ai-worker/index.ts`:**

1. **Idempotent slot status update (LD18 — critical):**
```typescript
// After successful Claude call + draft INSERT:
const { count } = await supabase
  .from('post_draft')
  .insert({ /* draft fields */ })
  .select('*', { count: 'exact' });

if (count === 1) {
  // Now atomically transition slot — LD18 enforcement
  const { count: slotUpdateCount } = await supabase
    .schema('m')
    .from('slot')
    .update({ 
      status: 'filled', 
      filled_draft_id: newDraftId,
      updated_at: new Date().toISOString()
    })
    .eq('slot_id', slotId)
    .eq('status', 'fill_in_progress')  // critical predicate
    .select('*', { count: 'exact' });
  
  if (slotUpdateCount === 0) {
    // Slot was reset by recovery cron OR another worker — abort
    console.warn(`[ai-worker] Late draft for slot ${slotId} — slot no longer in fill_in_progress, aborting`);
    // Roll back the draft we just inserted
    await supabase.from('post_draft').delete().eq('post_draft_id', newDraftId);
    return { aborted: true, reason: 'slot_reassigned' };
  }
}
```

2. **Prompt caching with cache_control:**
```typescript
const messages = [
  {
    role: 'user',
    content: [
      // STABLE PREFIX — gets cached
      {
        type: 'text',
        text: `${systemInstructions}\n\n${brandVoice}\n\n${formatRules}\n\n${complianceRules}`,
        cache_control: { type: 'ephemeral' }
      },
      // DYNAMIC SUFFIX — never cached
      {
        type: 'text',
        text: `Slot context: ${slotMeta}\n\nCanonicals:\n${canonicalBundle}`
      }
    ]
  }
];
```

3. **Read slot_id and is_shadow from ai_job payload, write through to post_draft.**

**Verification (no SQL — manual / functional):**
- Deploy ai-worker EF: `supabase functions deploy ai-worker --no-verify-jwt` (if it's currently deployed that way)
- Trigger one shadow ai_job manually:
```sql
INSERT INTO m.ai_job (job_type, input_payload, status) VALUES (
  'slot_fill_synthesis',
  jsonb_build_object(
    'slot_id', '<test_slot_id>',
    'is_shadow', true,
    'format', 'image_quote',
    'canonical_ids', ARRAY['<canonical_id>'],
    'synthesis_mode', 'single_item'
  ),
  'pending'
);
```
- Worker picks up, generates draft, slot transitions fill_in_progress → filled
- Verify: `SELECT status, filled_draft_id FROM m.slot WHERE slot_id = '<test_slot_id>'`
- Verify cache hit: `SELECT cache_creation_input_tokens, cache_read_input_tokens FROM m.ai_usage_log ORDER BY created_at DESC LIMIT 1`
  - First call: cache_creation_input_tokens > 0
  - Second call same prefix: cache_read_input_tokens > 0

**Test the LD18 race condition explicitly:**
- Create slot in fill_in_progress
- Manually UPDATE status back to pending_fill (simulate recovery cron)
- Have ai-worker complete the draft for that slot
- Expected: ai-worker's slot UPDATE returns 0 rows, draft is rolled back
- Verify: slot still in pending_fill, no draft attached

**Exit criteria:** 
- ai-worker idempotency check fires correctly when status mismatch detected
- Prompt caching shows >0 cache_read_input_tokens on second-or-later call
- Test ai_job processed end-to-end successfully

**Rollback:** Revert ai-worker EF to previous version.

**Estimated duration:** 90 minutes (code changes 30 min, deploy 5 min, end-to-end test 30 min, race condition test 25 min).

---

### 🚦 GATE B — Phase B complete + shadow observation

**Immediate verification:**
- [ ] All Phase B migrations applied
- [ ] All Phase B crons firing on schedule
- [ ] Shadow drafts being generated (`SELECT COUNT(*) FROM m.post_draft WHERE is_shadow=true`)
- [ ] No publishing happening from shadow drafts (check `m.post_publish_queue` doesn't have `is_shadow` items)
- [ ] ai-worker idempotency tested with manual race condition
- [ ] Prompt caching active (cache_read tokens > 0 after warm-up)

**Then 5-7 days observation:**
- [ ] Daily check: `m.cron_health_status` shows all green
- [ ] Daily check: shadow draft count growing as expected (~3 per active client per day after first 24h pass through fill window)
- [ ] Mid-week check: pool depth per vertical reasonable (`SELECT vertical_id, COUNT(*) FROM m.signal_pool WHERE is_active=true GROUP BY 1`)
- [ ] Mid-week check: no stuck slots (`SELECT COUNT(*) FROM m.slot WHERE status='fill_in_progress' AND filled_at < NOW() - interval '1 hour'`) → recovery cron should keep this at 0
- [ ] Spot check 5-10 shadow drafts: are they reasonable quality vs old pipeline output?
- [ ] Tune: based on skip reasons, evergreen ratio, fitness scores observed

**Tunables to adjust during shadow:**
- `t.format_quality_policy.min_fitness_threshold` per format
- `t.dedup_policy.title_similarity_threshold`
- `t.format_synthesis_policy.bundle_size_max` 
- Reuse penalty curve values

**Decision after 5-7 days:** Quality acceptable AND defensive crons all working → proceed to Stage 12. Quality issues OR cron issues → fix before cutover.

---

### Stage 12: AEST throttle migration

**Goal:** Move publisher lock RPC throttle from UTC-day to AEST-day basis (LD6).

**This is one SQL migration touching the lock RPC source:**

`20260426_045_migrate_publisher_lock_aest_throttle.sql`

The change is one CTE in `m.publisher_lock_queue_v1` (or `_v2`). Replace:
```sql
WHERE p.created_at >= date_trunc('day', NOW())
```
with:
```sql
WHERE p.created_at AT TIME ZONE 'Australia/Sydney' >= 
      date_trunc('day', NOW() AT TIME ZONE 'Australia/Sydney')
```

**Verification:**
```sql
-- Lock RPC source updated
SELECT prosrc FROM pg_proc 
WHERE pronamespace='m'::regnamespace 
  AND proname='publisher_lock_queue_v1';
-- Expected: contains 'Australia/Sydney'

-- Dry-run lock for known platform/client
SELECT * FROM m.publisher_lock_queue_v1(p_platform := 'facebook') LIMIT 0;
-- Expected: returns 0 rows (no items to lock right now), no exception
```

**Exit criteria:** Lock RPC updated, throttle counts now AEST-day-aware.

**Risk note:** This affects ALL publishers immediately. Test in shadow window if possible by creating a test queue item and verifying lock behavior across an AEST midnight boundary.

**Rollback:** Revert the function to UTC-based CTE. One-line change either direction.

**Estimated duration:** 30 minutes.

---

### Stage 13: First cutover — NY Facebook

**Goal:** NY-FB starts using slot-driven generation in production (no longer shadow).

**This is a config flip, not a migration:**

The fill function has a `p_shadow` parameter. The cron passes `true` for shadow. To cut over NY-FB specifically:

Option A (recommended): per-client config table
```sql
CREATE TABLE c.client_pipeline_mode (
  client_id     uuid PRIMARY KEY REFERENCES c.client,
  platform      text,
  pipeline_mode text NOT NULL CHECK (pipeline_mode IN ('shadow','live')),
  cut_over_at   timestamptz,
  PRIMARY KEY (client_id, platform)
);
INSERT INTO c.client_pipeline_mode VALUES (
  '<NY uuid>', 'facebook', 'live', NOW()
);
-- Other clients/platforms remain in shadow until added here
```

The fill function checks this table per-slot to decide `is_shadow` output.

**Verification:**
```sql
-- Wait 30+ min after cutover, when NY-FB slot fill window opens
SELECT slot_id, status, is_evergreen, filled_at, filled_draft_id, slot_confidence
FROM m.slot
WHERE client_id = '<NY uuid>' AND platform = 'facebook'
  AND scheduled_publish_at > NOW()
ORDER BY scheduled_publish_at LIMIT 5;
-- Expected: at least 1 in 'filled' status, filled_draft_id NOT NULL

-- Confirm draft is NOT shadow
SELECT pd.is_shadow, pd.approval_status, pd.created_at
FROM m.post_draft pd
JOIN m.slot s ON s.filled_draft_id = pd.post_draft_id
WHERE s.client_id = '<NY uuid>' AND s.platform = 'facebook'
ORDER BY pd.created_at DESC LIMIT 5;
-- Expected: is_shadow=false

-- Verify it makes it to publish queue + publishes successfully (over the next 24h)
```

**Exit criteria (over 1 week observation):**
- [ ] NY-FB publishing 1 post/day from slot-driven path (or 0 if pool justifies skip)
- [ ] Quality acceptable (PK manual review of first 5-10 published)
- [ ] Cost matches projection (~$0.05/week for NY-FB alone)
- [ ] No throttle conflicts
- [ ] Evergreen ratio < 30% over the week
- [ ] Skip reasons (if any) make sense (not all "thin_pool")

**Rollback:** UPDATE `c.client_pipeline_mode` SET `pipeline_mode='shadow'` WHERE client='NY' AND platform='facebook'. Old R6 cron still paused; if needed for emergency, can be unpaused (with full understanding of cost).

**Estimated duration:** 30 min cutover + 7 days observation.

---

### Stages 14-19: Subsequent cutovers (per-client-platform)

Same pattern as Stage 13, one per client-platform. Each gets a week observation before next.

| Stage | Cutover | Notes |
|---|---|---|
| 14 | NY Instagram | After 1 week of NY-FB success |
| 15 | NY LinkedIn | After NY-IG success |
| 16 | PP Facebook | NY full success first |
| 17 | PP Instagram | |
| 18 | PP LinkedIn | |

CFW + Invegent stay in r6_enabled=false mode until separately enabled.

**Total cutover phase: ~6 weeks calendar (1 week per cutover)**, ~3 hours hands-on per cutover.

---

### Stage 19/Final: Phase D decommission

**Once all 6 client-platform combos cut over and stable:**

1. `20260426_046_unregister_r6_seed_crons.sql` → drop cron 11, 64, 65 entries
2. `20260426_047_drop_seed_and_enqueue_function.sql` → DROP FUNCTION `m.seed_and_enqueue_ai_jobs_v1`
3. `20260426_048_archive_post_seed_table.sql` → rename `m.post_seed` to `m.post_seed_legacy_pre_v3`

Update `docs/06_decisions.md` with the slot-driven architecture decision (D170+). Update sync_state.

---

### Stage E: Evergreen seeding (parallel content work)

This runs alongside Stages 12-18 (cutover phase). PK content work, not engineering.

For each active vertical:
- 25 NDIS evergreen items (NY + CFW share)
- 15 Property evergreen items (PP)
- 10 Invegent evergreen items

Each item: title + content_summary + format_keys[] + use_cooldown_days. Mark some as `is_core=true`.

Pair-write with me: PK gives the topic, I draft, PK refines. ~10 min per item × 50 items = 8 hours total, spread across cutover weeks.

---

## 4. Tomorrow morning — how we start

When PK opens the laptop tomorrow:

**Step 1 — Context refresh (5 min, automated)**
- I read `docs/00_sync_state.md` per session-start protocol
- I read v4 (this brief) commit
- I confirm R6 still paused
- I confirm the 154-draft buffer still acceptable

**Step 2 — Pre-flight schema verification (10 min, Claude via Supabase MCP)**

I run these queries to verify v4 assumptions match production reality:

```sql
-- 1. Confirm vertical IDs for active clients
SELECT c.client_name, ccs.content_vertical_id, cv.vertical_name
FROM c.client c
JOIN c.client_content_scope ccs ON ccs.client_id = c.client_id
JOIN t.content_vertical cv ON cv.content_vertical_id = ccs.content_vertical_id
WHERE c.status = 'active'
ORDER BY c.client_name;

-- 2. Confirm c.client_publish_schedule shape (column names)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema='c' AND table_name='client_publish_schedule'
ORDER BY ordinal_position;

-- 3. Confirm t.class_format_fitness shape
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='t' AND table_name='class_format_fitness'
ORDER BY ordinal_position;

-- 4. Confirm f.canonical_vertical_map exists
SELECT column_name FROM information_schema.columns 
WHERE table_schema='f' AND table_name='canonical_vertical_map';

-- 5. Confirm c.client_publish_profile column for status
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema='c' AND table_name='client_publish_profile'
ORDER BY ordinal_position;
```

If any column names or table names diverge from v4 SQL, I update the Stage 1 brief before handing to CC.

**Step 3 — PK answers questions (Section 5 below)**

PK reads my questions, answers any blockers. Anything not answered, I assume defaults from v4 and flag explicitly.

**Step 4 — I write Stage 1 brief for CC**

Concrete brief in the template format from §2 of this document. Includes the verified SQL with any schema corrections from Step 2.

**Step 5 — PK runs CC with Stage 1 brief**

Either:
- (a) PK pastes brief into CC manually (PK option)
- (b) I write the brief to `docs/briefs/cc-stage-01.md` and PK runs `claude code execute docs/briefs/cc-stage-01.md` (if that's how PK runs CC) 

**Step 6 — CC reports back**

CC writes report. PK pastes into chat.

**Step 7 — I verify via Supabase MCP**

Run Stage 1 verification queries. Report results.

**Step 8 — PK approves Stage 2 OR asks for fix**

If approved: I write Stage 2 brief, repeat from Step 5.

**Cadence:** ~30-60 min per Stage cycle. Phase A (Stages 1-6) achievable in one focused day if PK can stay at the laptop. Or split across 2-3 days at PK's pace.

---

## 5. Questions for PK (please answer when you can)

These shape Stage 1. Some can be deferred (I'll use defaults if you don't answer); some I genuinely need before starting.

### Critical (need answer before Stage 1)

1. **Branch strategy — direct push to `main` or feature branch?**
   - Memory standing rule: direct to `main` is default for Claude Code work
   - Counter-consideration: 28 migrations is more coordinated than usual. A feature branch (`feature/slot-driven-v3-build`) lets you review the full diff in one PR before merge, OR keeps main clean if we hit a blocker mid-build.
   - **My recommendation**: feature branch for Phase A migrations (1-28). Direct merge after Gate A passes. Direct push for Phase B+ since each Stage is self-contained.
   - **Default if not answered**: feature branch (per the recommendation above).

2. **First cutover target confirmation**
   - **My assumption**: NY Facebook (lowest stakes, already at cap of 2/day, minimal blast radius)
   - **Alternative**: PP LinkedIn (less audience-sensitive, but PP-LI just had today's throttle bypass incident)
   - **Default if not answered**: NY Facebook.

3. **CC execution mechanism**
   - How do you actually run CC? Some options:
     - (a) `claude code` CLI in a PowerShell window, you paste the Stage brief manually
     - (b) `claude rc` (remote control) if that's set up — I'd need to know the protocol
     - (c) Some other workflow
   - **Default if not answered**: I write Stage briefs as markdown files in `docs/briefs/cc-stage-NN.md`, you handle CC invocation however works for your setup.

### Important but not blocking

4. **Pace expectations — Phase A in one day, or spread?**
   - 5-7 hours engineering. Feasible in one day with focused work.
   - But you said yesterday "i don't mind 10-20+ hours and additional funds". So pace isn't the constraint.
   - **Default if not answered**: I'll pace each Stage 30-60 min hands-on, you can do as many or as few as fit your day.

5. **Cutover sequence preference (for Stages 14-18)**
   - My v4 default: NY-FB → NY-IG → NY-LI → PP-FB → PP-IG → PP-LI
   - Alternative: NY-FB → PP-FB (test 2 clients on FB before adding platforms)
   - **Default if not answered**: NY first across all platforms, then PP.

### Defer-friendly (can answer during build)

6. **Evergreen seeding pace** — pair-write with me during cutover, or set aside dedicated session?

7. **Dashboard updates** — at what point do we add the new views (`hot_breaking_pool`, `cron_health_status`, `slots_in_critical_window`, `evergreen_ratio_7d`) to the dashboard? After Gate B? Stage 13?

8. **Reviewer layer** — reactivate any reviewers during build for code reviews of CC commits, or stay paused?

---

## 6. What I will do tonight (overnight, automatically)

Nothing. R6 is paused, cost is zero, system is stable. Sleep is the right move.

When you open your laptop tomorrow, Step 1 begins and we go from there.

---

## 7. Honest expectation setting

**What v4 commits to:** stage-gated build with verification at each step, reversible at each Stage boundary, no half-states.

**What v4 does not promise:** that the architecture will be perfect on first cutover. The reviewers were unanimous: there will be a tuning period of 2-4 weeks post-cutover where thresholds, penalties, and bundle sizes need adjustment based on real production behaviour. v4 is not a magic build that ships and runs untouched. v4 is a build that ships defensibly, with audit trails to debug what happens, and with the foundation to tune what needs tuning.

**What 7 LLMs across 3 review rounds collectively concluded:** v3 is sound; v4's build plan is sequential and verifiable; remaining risks are operational tuning rather than architectural blockers. We're at the boundary where additional review has diminishing returns.

**The remaining risk is execution discipline.** If we skip Gate verification, build ahead of pause-safe states, or don't tune in shadow before cutover — that's how 2-week tuning becomes 2-month firefighting. The Stage gates exist specifically to prevent this. Honor them.

---

*End of v4 build plan. Ready for Stage 1 when PK is ready.*
