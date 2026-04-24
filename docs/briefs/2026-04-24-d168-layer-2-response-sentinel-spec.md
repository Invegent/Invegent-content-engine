# D168 Layer 2 — Response-layer sentinel spec

**Draft date:** 24 Apr 2026 evening (Track B) — **v2 feedback integrated 25 Apr**
**Status:** 🟢 **SPEC v2 — READY FOR BUILD** (feedback from external model review integrated; implementation still deferred to ID004-class incident trigger per defence-in-depth posture)
**Decision ref:** D168 (response-layer sentinel — scope defined 23 Apr, implementation deferred)
**Composes with:** Layer 1 cron failure-rate monitoring (shipped 24 Apr afternoon)
**Incident origin:** ID004 (content-fetch 9-day silent outage, 14-23 Apr)

---

## Purpose in one paragraph

Layer 1 (shipped today) watches `cron.job_run_details` and alerts when crons fail, fail consecutively, or stop running. It catches **errors**. ID004 was a different class of bug: the cron ran successfully every single firing for 9 days, but produced zero downstream effect because the vault secret casing was wrong and the HTTP call returned 401 (which Postgres records as successful completion of the http_post call itself). Layer 2 answers a different question: **"did this cron actually do something useful?"** Rather than checking status, Layer 2 samples downstream metrics (canonical bodies fetched per day, ai_jobs succeeded per hour, posts published during active hours) and alerts when those metrics fall outside expected ranges. The two layers compose: Layer 1 catches loud failures, Layer 2 catches silent ones. Both feed into the same `m.cron_health_alert` surface for a unified operator view — now with severity and entity_scope columns added to make graduated alerts and multi-cron dedup work correctly.

---

## v2 feedback integration summary

Original spec shipped 24 Apr with 7 open questions. External model review (25 Apr) resolved 6 of 7 with substantive changes and kept 1 for runtime decision. Full resolution log in **Questions resolved** section below. Net additions from v2:
- `severity_default` column on `m.liveness_check` — warning | critical per-check severity
- `severity` column on `m.cron_health_alert` — cross-layer change, enables graduated alerting for both layers
- `entity_scope` column on `m.cron_health_alert` — cross-layer change, replaces `(jobid, alert_type)` dedup key with `(entity_scope, alert_type)` for multi-cron and system-wide checks
- `check_cadence_seconds` + `jitter_seconds` on `m.liveness_check` — finer cadence granularity + randomization to prevent synchronized cron spikes
- New table `m.liveness_aggregate_daily` — 90-day daily rollups for drift/seasonality detection without raw-sample bloat
- 12th v1 check — median_pipeline_stage_duration_24h (catches slow degradation)
- 2 feedback suggestions declined with rationale (covered elsewhere or duplicate signal)
- Staged notifier layer rollout defined: Resend daily digest first, Telegram critical-only second, skip Slack

---

## Why separate from Layer 1

Layer 1's source of truth: `cron.job_run_details.status + stderr/stdout`. It can't see past the exit code of the pg_cron command.

ID004 recap of what Layer 1 would have seen:
```
SELECT jobid, jobname, status, return_message, end_time
FROM cron.job_run_details
WHERE jobid = 4 AND start_time > now() - interval '24 hours';

-- Every row: status='succeeded', return_message='', end_time fills normally
```

Zero errors. Zero anomalies. Cron fired every 5 minutes for 9 days and produced nothing. Layer 1 had no basis to alert.

The actual evidence was downstream:
```
SELECT COUNT(*), MAX(updated_at) FROM f.canonical_content_body
WHERE updated_at > now() - interval '24 hours';
-- COUNT = 0, MAX = 14 Apr  (9 days ago)
```

Layer 2 watches THIS — the downstream effect. Different question, different source of truth, different detection capability.

---

## Cross-layer changes to `m.cron_health_alert`

v2 adds two columns to the existing Layer 1 table. Migration in D168 Step 1 back-fills Layer 1 alerts so the unified surface works from day one.

```sql
ALTER TABLE m.cron_health_alert
  ADD COLUMN severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('warning', 'critical')),
  ADD COLUMN entity_scope TEXT;

-- Back-fill Layer 1 alerts to use entity_scope structure:
UPDATE m.cron_health_alert
SET entity_scope = 'job:' || COALESCE(jobid::text, 'unknown')
WHERE entity_scope IS NULL;

-- New partial unique index for cross-layer dedup:
CREATE UNIQUE INDEX uq_cron_health_alert_open_by_scope
  ON m.cron_health_alert (entity_scope, alert_type)
  WHERE resolved_at IS NULL;

-- Keep old (jobid, alert_type) index as non-unique for backwards-compat queries:
DROP INDEX IF EXISTS uq_cron_health_alert_open;
CREATE INDEX idx_cron_health_alert_jobid_type
  ON m.cron_health_alert (jobid, alert_type)
  WHERE resolved_at IS NULL;
```

**entity_scope values by convention:**
- `'job:<jobid>'` — single-cron alerts (Layer 1 default + most Layer 2 checks)
- `'pipeline:<stage>'` — multi-cron pipeline checks (e.g. `'pipeline:ingestion'`, `'pipeline:transformation'`)
- `'system:<component>'` — system-wide checks (e.g. `'system:publishing'`, `'system:vault'`)
- `'platform:<name>'` — platform-specific checks (e.g. `'platform:facebook'`, `'platform:instagram'`)

Layer 1's sweep function (`m.refresh_cron_health`) gets a 2-line patch to populate entity_scope as `'job:' || jobid::text` on each alert insert/update.

---

## Architecture

### Two new tables (plus one aggregate)

```sql
-- Definitions: which metrics to sample, how often, expected ranges
CREATE TABLE m.liveness_check (
  check_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name            TEXT NOT NULL UNIQUE,
  description           TEXT,
  entity_scope          TEXT NOT NULL,
  attributed_cron_jobid INT,
  attributed_ef_name    TEXT,
  metric_query          TEXT NOT NULL,
  expected_min          NUMERIC,
  expected_max          NUMERIC,
  measurement_window    INTERVAL NOT NULL DEFAULT interval '24 hours',
  check_cadence_seconds INT NOT NULL DEFAULT 900,
  jitter_seconds        INT NOT NULL DEFAULT 60 CHECK (jitter_seconds >= 0 AND jitter_seconds <= 300),
  consecutive_breach_threshold INT NOT NULL DEFAULT 2,
  severity_default      TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity_default IN ('warning', 'critical')),
  last_sampled_at       TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT liveness_check_bounds CHECK (
    expected_min IS NOT NULL OR expected_max IS NOT NULL
  )
);

CREATE INDEX idx_liveness_check_active
  ON m.liveness_check (is_active, check_cadence_seconds);

-- Raw samples: every sample gets a row, retained 30 days
CREATE TABLE m.liveness_sample (
  sample_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id               UUID NOT NULL REFERENCES m.liveness_check(check_id) ON DELETE CASCADE,
  sampled_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sample_value           NUMERIC NOT NULL,
  within_expected_range  BOOLEAN NOT NULL,
  expected_min_at_sample NUMERIC,
  expected_max_at_sample NUMERIC,
  breach_direction       TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liveness_sample_check_time
  ON m.liveness_sample (check_id, sampled_at DESC);

-- Daily aggregates: 90-day retention for drift/seasonality detection
CREATE TABLE m.liveness_aggregate_daily (
  aggregate_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id       UUID NOT NULL REFERENCES m.liveness_check(check_id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  sample_count   INT NOT NULL,
  min_value      NUMERIC NOT NULL,
  max_value      NUMERIC NOT NULL,
  avg_value      NUMERIC NOT NULL,
  p50_value      NUMERIC,
  p95_value      NUMERIC,
  breach_count   INT NOT NULL DEFAULT 0,
  alert_count    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT liveness_aggregate_daily_uniq UNIQUE (check_id, date)
);

CREATE INDEX idx_liveness_agg_daily_check_date
  ON m.liveness_aggregate_daily (check_id, date DESC);
```

### One sweep function + one rollup function + two crons

Sweep function `m.evaluate_liveness()` logic:
- Advisory lock prevents overlapping sweeps (`pg_try_advisory_xact_lock(hashtext('m.evaluate_liveness'))`)
- Per-row BEGIN/EXCEPTION wrap so one bad query doesn't halt batch
- Eligibility check applies jittered cadence: `last_sampled_at < NOW() - (check_cadence_seconds * interval '1 second') + ((floor(random() * jitter_seconds * 2) - jitter_seconds) * interval '1 second')`
- On each sample: INSERT into `m.liveness_sample`, UPDATE `last_sampled_at`
- Consecutive breach check: `COUNT(*) WHERE NOT within_expected_range` over last N samples (N = consecutive_breach_threshold)
- If breach threshold hit: UPSERT into `m.cron_health_alert` with severity + entity_scope from check definition
- Auto-resolve: if sample is back in range, UPDATE open alert WHERE entity_scope + alert_type match

Rollup function `m.rollup_liveness_daily(p_date DATE DEFAULT (CURRENT_DATE - 1))`:
- One row per (check_id, date) summarising the day's samples
- Runs daily at 03:00 UTC
- After rollup, deletes samples older than 30 days

### Two crons

```sql
SELECT cron.schedule(
  'liveness-check-every-5m',
  '*/5 * * * *',
  $$SELECT m.evaluate_liveness();$$
);

SELECT cron.schedule(
  'liveness-aggregate-daily',
  '0 3 * * *',
  $$SELECT m.rollup_liveness_daily();
    DELETE FROM m.liveness_sample WHERE sampled_at < NOW() - interval '30 days';$$
);
```

---

## Cadence strategy — tiered with jitter (v2)

Original draft had a 15-minute sweep cadence floor with per-check `check_cadence_minutes`. v2 changes this to:
- Finer granularity via `check_cadence_seconds` — 60s minimum, tiers at 300s / 900s / 3600s / 86400s
- Sweep cron itself runs every 5 minutes (not 15) — enables the 5-min tier for queue checks
- `jitter_seconds` (0-300, default 60) randomizes eligibility within each tier to prevent synchronized cron spikes

**Why jitter matters:** multiple crons firing on :00 boundaries create contention spikes and wasted CPU. Jittered eligibility spreads load naturally.

**Tier defaults for v1 checks:**
| Tier | `check_cadence_seconds` | Which checks |
|---|---|---|
| Queue / stuck jobs | 300 (5 min) | checks 6, 7 — queue_depth_total, ai_jobs_stuck_running |
| Liveness / ingest | 900 (15 min) | checks 1, 2, 3, 9, 10, 12 — main pipeline health |
| Ratio / auth | 3600 (60 min) | checks 4, 5, 8 — publisher_active_hours, publish_queue_drain_rate, expired_tokens |
| Daily / trend | 86400 (24 hr) | check 11 — fb_to_ig_publish_ratio_7d |

---

## v1 liveness check seed — what to monitor

### Critical path checks (catch ID004-class bugs)

**1. content-fetch liveness**
- `entity_scope`: `'job:4'`
- `metric_query`: `SELECT COUNT(*)::numeric FROM f.canonical_content_body WHERE fetch_status IS NOT NULL AND updated_at > now() - interval '24 hours'`
- `expected_min`: 20
- `check_cadence_seconds`: 900
- `severity_default`: `'critical'`
- rationale: ID004 original catch. Critical because 9-day recurrence would re-cause original incident.

**2. ingest-worker liveness**
- `entity_scope`: `'pipeline:ingestion'`
- `metric_query`: `SELECT COUNT(*)::numeric FROM f.raw_content_item WHERE created_at > now() - interval '24 hours'`
- `expected_min`: 50
- `check_cadence_seconds`: 900
- `severity_default`: `'critical'`
- rationale: Upstream of content-fetch; if zero, ingest itself is broken.

**3. ai-worker liveness**
- `entity_scope`: `'pipeline:transformation'`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.ai_job WHERE status = 'succeeded' AND updated_at > now() - interval '24 hours'`
- `expected_min`: 10
- `check_cadence_seconds`: 900
- `severity_default`: `'critical'`

**4. publisher liveness (active hours)**
- `entity_scope`: `'system:publishing'`
- `metric_query`:
  ```sql
  SELECT COUNT(*)::numeric FROM m.post_publish
  WHERE created_at > now() - interval '12 hours'
    AND EXTRACT(hour FROM created_at AT TIME ZONE 'Australia/Sydney') BETWEEN 6 AND 20
  ```
- `expected_min`: 1
- `check_cadence_seconds`: 3600
- `severity_default`: `'critical'`

**5. publisher-enqueue-to-execute ratio**
- `entity_scope`: `'system:publishing'`
- `metric_query`:
  ```sql
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM m.ai_job WHERE status='succeeded' AND updated_at > now() - interval '6 hours') > 0
    THEN (SELECT COUNT(*) FROM m.post_publish WHERE created_at > now() - interval '6 hours')::numeric
         / (SELECT COUNT(*) FROM m.ai_job WHERE status='succeeded' AND updated_at > now() - interval '6 hours')
    ELSE 1.0
  END
  ```
- `expected_min`: 0.3
- `expected_max`: 1.5
- `check_cadence_seconds`: 3600
- `severity_default`: `'warning'`
- rationale: Detects M11 (AI works, publisher stuck) AND ID003 (infinite retry) patterns. Warning because transient breach expected during load spikes.

### Queue state checks

**6. post_publish_queue bounded**
- `entity_scope`: `'system:publishing'`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.post_publish_queue WHERE status IN ('queued', 'running')`
- `expected_min`: 0, `expected_max`: 100
- `check_cadence_seconds`: 300
- `severity_default`: `'warning'`
- rationale: If queue grows >100, publisher stuck or enqueue duplicating. Fast tier because runaway compounds.

**7. ai_job stuck in running**
- `entity_scope`: `'pipeline:transformation'`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.ai_job WHERE status = 'running' AND updated_at < now() - interval '30 minutes'`
- `expected_min`: 0, `expected_max`: 2
- `check_cadence_seconds`: 300
- `severity_default`: `'warning'`
- rationale: ID003 class. Stuck running >30min = timeout that didn't write final status.

### Token & auth

**8. no expired tokens actively scheduled**
- `entity_scope`: `'system:vault'`
- `metric_query`:
  ```sql
  SELECT COUNT(*)::numeric FROM m.post_publish_queue q
  JOIN c.client_publish_profile cpp
    ON cpp.client_id = q.client_id AND cpp.platform = q.platform
  WHERE q.status = 'queued'
    AND cpp.token_expires_at IS NOT NULL
    AND cpp.token_expires_at < now()
  ```
- `expected_min`: 0, `expected_max`: 0
- `check_cadence_seconds`: 3600
- `severity_default`: `'critical'`

### Signal quality

**9. digest_item population rate**
- `entity_scope`: `'pipeline:bundling'`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.digest_item WHERE created_at > now() - interval '24 hours'`
- `expected_min`: 20
- `check_cadence_seconds`: 900
- `severity_default`: `'critical'`

**10. canonical ageing**
- `entity_scope`: `'pipeline:classification'`
- `metric_query`:
  ```sql
  SELECT (EXTRACT(EPOCH FROM (now() - MIN(updated_at)))/3600)::numeric
  FROM f.canonical_content_body
  WHERE content_class IS NULL AND fetch_status IS NOT NULL
  ```
- `expected_max`: 4
- `check_cadence_seconds`: 900
- `severity_default`: `'warning'`
- rationale: If R4 classifier stops, metric grows linearly. Catches "classifier cron paused" that Layer 1 only catches as `no_recent_runs`.

### Publisher disparity (M11 class)

**11. per-platform publish ratio**
- `entity_scope`: `'platform:instagram'`
- `metric_query`:
  ```sql
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM m.post_publish WHERE platform='instagram' AND created_at > now() - interval '7 days') > 0
    THEN (SELECT COUNT(*) FROM m.post_publish WHERE platform='facebook' AND created_at > now() - interval '7 days')::numeric
         / (SELECT COUNT(*) FROM m.post_publish WHERE platform='instagram' AND created_at > now() - interval '7 days')
    ELSE 99
  END
  ```
- `expected_min`: 0.3, `expected_max`: 5
- `check_cadence_seconds`: 86400
- `severity_default`: `'warning'`

### Pipeline-continuity (v2 feedback accept)

**12. median pipeline stage duration (v2 new)**
- `entity_scope`: `'pipeline:transformation'`
- `metric_query`:
  ```sql
  SELECT (EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (
    ORDER BY (aj.updated_at - ps.created_at)
  )) / 60)::numeric
  FROM m.post_seed ps
  JOIN m.ai_job aj ON aj.seed_id = ps.seed_id
  WHERE aj.status = 'succeeded'
    AND aj.updated_at > now() - interval '24 hours'
  ```
- `expected_max`: 60 (median under 60 min seed → succeeded ai_job)
- `check_cadence_seconds`: 900
- `severity_default`: `'warning'`
- rationale: Catches slow degradation that failure-count checks miss. If P50 seed→succeeded time doubles from 10min to 20min to 40min, publisher or AI worker is silently slowing long before failures surface.

### Declined suggestions (v2 feedback)

**"New sources discovered in last 24h" — declined as Layer 2 check.**
Belongs to feed-intelligence agent (Phase 2.2), not pipeline-health monitoring. Dead-feed detection is covered by ingest-worker liveness (check 2) + feed-intelligence's planned recommendation layer. Layer 2 is about "the pipeline ran or didn't", not "the business is discovering new content".

**"% items transformed → published" — declined as duplicate signal.**
Already covered by check 5 (publish_queue_drain_rate) and check 10 (oldest_unclassified_canonical_hours). Adding as separate check duplicates without adding detection capability.

---

## Alert surface — unified with Layer 1

Both Layer 1 and Layer 2 alerts land in `m.cron_health_alert`. Same table, different `alert_type` + different `entity_scope` patterns.

Operator query now includes severity:
```sql
SELECT entity_scope, jobname, alert_type, severity, threshold_crossed, latest_error,
       EXTRACT(EPOCH FROM (NOW() - first_seen_at))/3600 AS age_hours
FROM m.cron_health_alert
WHERE resolved_at IS NULL
ORDER BY
  CASE severity WHEN 'critical' THEN 0 ELSE 1 END,
  first_seen_at DESC;
```

Returns both layers' active alerts in one list, criticals first. Dashboard tile at `/monitoring/cron-health` (CC-TASK-08 candidate) shows both.

---

## Notifier layer — staged rollout (v2 feedback)

Alerts sitting in a DB are not alerts. v2 commits to a staged rollout sequence instead of deferring indefinitely.

**Stage 1 — Resend daily digest (when first real Layer 2 alert fires in anger)**
One email per day to `pk@invegent.com` listing all `resolved_at IS NULL` alerts ordered by severity. Delivered via Resend (already configured, `feeds@invegent.com` sender). New Edge Function + once-daily cron. Zero surprise.

**Stage 2 — Telegram critical-only alerts (when Stage 1 operationally comfortable)**
Route `severity='critical'` alerts through `@InvegentICEbot` via OpenClaw bridge. Per-alert message with entity_scope + latest_error + suggested action. New on critical, silent on resolution.

**Stage 3 — skipped (Slack)**
Not in operational flow for PK. Skipping saves complexity.

**Cadence gate:** no notifier ships until Layer 2 has produced at least one real alert Layer 1 didn't catch. Self-justifying trigger — pain creates signal, signal creates alert, alert creates the case for notification infra.

---

## Migration plan

### Step 1 — Schema + Layer 1 back-fill

One atomic migration:
- ALTER `m.cron_health_alert` to add `severity` + `entity_scope`
- Back-fill existing Layer 1 alerts with `entity_scope = 'job:' || jobid::text`
- Drop old `uq_cron_health_alert_open` index, replace with `uq_cron_health_alert_open_by_scope`
- Patch `m.refresh_cron_health()` to populate entity_scope on insert/update
- Create `m.liveness_check` + `m.liveness_sample` + `m.liveness_aggregate_daily`

### Step 2 — Seed the 12 v1 checks

INSERT 12 rows into `m.liveness_check`. One atomic migration.

### Step 3 — Function + cron

Ship `m.evaluate_liveness()` + `m.rollup_liveness_daily()` + both crons.

### Step 4 — Tune after first 48 hours

Review `m.liveness_sample` baselines, tune thresholds via UPDATE. No schema/function change.

### Step 5 — First notifier (Resend digest)

Triggered by first real Layer 2 alert. Not part of initial build.

---

## Questions resolved (25 Apr feedback)

External review resolved 6 of 7 open questions.

### 1. Check shape — RESOLVED ✅
**Decision:** 12 v1 checks (11 originals + 1 new median processing time per stage). 2 suggestions declined with rationale.

### 2. Thresholds — RESOLVED ✅
**Decision:** Start conservative with `severity_default` column on `m.liveness_check` (warning | critical). Tune based on 48h baseline.
**Rationale:** Graduated severity prevents alert fatigue. Some checks (content-fetch liveness) critical; others (median duration) warning.

### 3. Cadence — RESOLVED ✅
**Decision:** Finer granularity via `check_cadence_seconds` (tiers 300/900/3600/86400) + 0-300s `jitter_seconds` (default 60). Sweep cron runs every 5 minutes.
**Rationale:** 5-min floor enables fast-tier queue checks. Jitter prevents synchronized spikes.

### 4. Alert dedup — RESOLVED ✅
**Decision:** Entity-scope based, not jobid-based. Structured `'job:<id>'`, `'pipeline:<stage>'`, `'system:<component>'`, `'platform:<name>'`. Cross-layer migration — Layer 1 back-fills in same migration.
**Rationale:** jobid was too narrow for multi-cron and system-wide checks. entity_scope extensibility is cheap now.

### 5. Retention — RESOLVED ✅
**Decision:** 30d raw samples + 90d daily aggregates via `m.liveness_aggregate_daily` + daily rollup cron.
**Rationale:** Aggregate daily rollup table is free storage for trend detection. 30d raw for incident response + 90d aggregate for drift/seasonality.

### 6. Dashboard — DEFERRED BUT TRACKED ✅
**Decision:** Not MVP but not speculative either. Tracked as CC-TASK-08 (minimal page: current alerts + last-24h failures + 7d sparkline per key metric). Build when paired UI time available.
**Rationale:** UI becomes necessary at 20+ crons / alerts per week, not before.

### 7. Notification layer — STAGED ROLLOUT ✅
**Decision:** Resend daily digest → Telegram critical-only via `@InvegentICEbot`. Skip Slack. Trigger: first real Layer 2 alert fires.
**Rationale:** Alerts sitting in DB aren't alerts. But notifier infra ahead of pain is also wrong.

### Still open

**None structurally.** One runtime question: **which specific check fires the first real alert?** Answer reveals itself when it happens.

---

## What's out of scope for v1

- Anomaly detection (ML-style) — thresholds static, not adaptive
- Per-client liveness checks (explodes check count)
- Cross-check correlation — manual analysis only
- Dashboard — CC-TASK-08 candidate
- Per-sample severity grades (upgrade path documented in Q2)
- Notifier infrastructure — staged by trigger

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `metric_query` SQL error halts sweep | Medium | Layer 2 stops | **v2: per-row BEGIN/EXCEPTION wrap** — failures logged but don't block next check |
| Metric queries too expensive | Low | Alerts delayed | Monitor sweep duration; split if > 30s |
| False positives from tight thresholds | Medium | Alert fatigue | **v2: warning/critical split** + Step 4 tuning |
| Missed bugs outside 12 checks | High | Silent bug classes unknown | Every novel incident becomes a new check |
| Concurrent sweep runs | Low | Duplicate samples/alerts | **v2: advisory lock** |
| Sample growth | Low | Disk negligible | **v2: daily rollup + retention** |
| Cross-layer back-fill breaks Layer 1 | Low | Brief silence | Step 1 atomic — back-fill + ALTER + function patch same migration |
| entity_scope convention drift | Medium (12mo) | Messier queries | Document convention; revisit enum at 20+ checks |

---

## When to implement

**Not HIGH priority.** Layer 1 is live. ID004 was caught and fixed.

Layer 2 is **defence in depth** — guards against the NEXT class of silent bug.

Recommended trigger: another ID004-class incident occurs (cron runs clean, produces no effect). OR: cron count past ~60 (currently ~46). OR: onboarding external clients where silent-failure SLA breach is contractual risk.

**Effort:** 3-4 hours full v2 build:
- Step 1 schema + cross-layer migration: 60 min
- Step 2 seed 12 checks: 30 min
- Step 3 function + rollup + 2 crons: 90 min
- Step 4 tuning (48h passive): included in ops
- Step 5 notifier: deferred to trigger

---

## Related

- **Incident:** `docs/incidents/2026-04-23-content-fetch-casing-drift.md` (ID004)
- **Decision:** D168
- **Layer 1:** `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md`
- **Sibling audits:** A21 ON CONFLICT (DB), CC-TASK-02 EF `.upsert()` (app)
- **Backlog item:** "D168 — ID004-class response-layer sentinel" in `docs/00_sync_state.md`
- **Related spec:** R5 v2 spec also integrates same-day feedback, shares revision pattern

---

## Changelog

**v2 — 25 Apr 2026** — feedback integration from external model review
- Cross-layer change: added `severity` + `entity_scope` columns to `m.cron_health_alert` with Layer 1 back-fill
- Changed alert dedup key from `(jobid, alert_type)` to `(entity_scope, alert_type)` partial unique
- Renamed `check_cadence_minutes` → `check_cadence_seconds` for finer granularity; tiered defaults (300/900/3600/86400)
- Added `jitter_seconds` to `m.liveness_check`
- Added `severity_default` column to `m.liveness_check` (warning | critical)
- Added `m.liveness_aggregate_daily` table + `m.rollup_liveness_daily()` + daily cron for 90-day drift view
- Added per-row BEGIN/EXCEPTION wrap in evaluate_liveness sweep function
- Added 12th check: median_pipeline_stage_duration_24h
- Declined 2 feedback suggestions with rationale
- Staged notifier rollout spec: Resend digest → Telegram critical → skip Slack
- Resolved 6 of 7 open questions; 1 remains as runtime observation
- Sweep cron cadence moved from 15m to 5m floor (enables fast-tier queue checks)
- Added advisory lock to evaluate_liveness (prevents concurrent sweep overlap)
- Updated effort estimate to 3-4h for full build

**v1 — 24 Apr 2026 evening** — initial spec (Track B)
- Original 2 tables, 11 v1 checks, 7 open questions
