# D168 Layer 2 — Response-layer sentinel spec

**Draft date:** 24 Apr 2026 evening (Track B)
**Status:** 🔲 SPEC COMPLETE — awaiting PK review before implementation
**Decision ref:** D168 (response-layer sentinel — scope defined 23 Apr, implementation deferred)
**Composes with:** Layer 1 cron failure-rate monitoring (shipped 24 Apr afternoon)
**Incident origin:** ID004 (content-fetch 9-day silent outage, 14-23 Apr)

---

## Purpose in one paragraph

Layer 1 (shipped today) watches `cron.job_run_details` and alerts when crons fail, fail consecutively, or stop running. It catches **errors**. ID004 was a different class of bug: the cron ran successfully every single firing for 9 days, but produced zero downstream effect because the vault secret casing was wrong and the HTTP call returned 401 (which Postgres records as successful completion of the http_post call itself). Layer 2 answers a different question: **"did this cron actually do something useful?"** Rather than checking status, Layer 2 samples downstream metrics (canonical bodies fetched per day, ai_jobs succeeded per hour, posts published during active hours) and alerts when those metrics fall outside expected ranges. The two layers compose: Layer 1 catches loud failures, Layer 2 catches silent ones. Both feed into the same `m.cron_health_alert` surface for a unified operator view.

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

## Architecture

### Two new tables

```sql
-- Definitions: which metrics to sample, how often, expected ranges
CREATE TABLE m.liveness_check (
  check_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name            TEXT NOT NULL UNIQUE,
  description           TEXT,
  attributed_cron_jobid INT,              -- optional link to specific cron for alert attribution
  attributed_ef_name    TEXT,             -- optional link to Edge Function
  metric_query          TEXT NOT NULL,    -- SQL returning a single NUMERIC value
  expected_min          NUMERIC NOT NULL, -- alert if sample < this
  expected_max          NUMERIC,          -- optional (null = no upper bound)
  measurement_window    INTERVAL NOT NULL DEFAULT interval '24 hours',
  check_cadence_minutes INT NOT NULL DEFAULT 60,
  consecutive_breach_threshold INT NOT NULL DEFAULT 2,  -- how many samples below min before alert
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liveness_check_active
  ON m.liveness_check (is_active, check_cadence_minutes);

-- Samples: every sample gets a row, retained for trend analysis
CREATE TABLE m.liveness_sample (
  sample_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id              UUID NOT NULL REFERENCES m.liveness_check(check_id) ON DELETE CASCADE,
  sampled_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sample_value          NUMERIC NOT NULL,
  within_expected_range BOOLEAN NOT NULL,
  expected_min_at_sample NUMERIC,
  expected_max_at_sample NUMERIC,
  breach_direction      TEXT,  -- 'below_min' | 'above_max' | NULL
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liveness_sample_check_time
  ON m.liveness_sample (check_id, sampled_at DESC);

-- Retain 30 days of samples, older are deleted by retention job
```

### One sweep function

```
FUNCTION m.evaluate_liveness()
  RETURNS TABLE (check_name TEXT, sample_value NUMERIC, within_range BOOLEAN, alert_raised BOOLEAN)
  LANGUAGE plpgsql

  FOR v_check IN SELECT * FROM m.liveness_check WHERE is_active = TRUE
                 AND (last_sampled_at IS NULL OR last_sampled_at < NOW() - (check_cadence_minutes * interval '1 minute'))
  LOOP
    -- Dynamically execute metric_query, expect single NUMERIC result
    EXECUTE v_check.metric_query INTO v_sample_value;

    v_within := (v_sample_value >= v_check.expected_min)
                AND (v_check.expected_max IS NULL OR v_sample_value <= v_check.expected_max);
    v_direction := CASE
      WHEN v_sample_value < v_check.expected_min THEN 'below_min'
      WHEN v_check.expected_max IS NOT NULL AND v_sample_value > v_check.expected_max THEN 'above_max'
      ELSE NULL END;

    INSERT INTO m.liveness_sample (check_id, sample_value, within_expected_range, breach_direction, ...)
    VALUES (v_check.check_id, v_sample_value, v_within, v_direction, ...);

    UPDATE m.liveness_check SET last_sampled_at = NOW() WHERE check_id = v_check.check_id;

    -- Check consecutive breaches:
    SELECT COUNT(*) INTO v_breach_count
    FROM (
      SELECT within_expected_range FROM m.liveness_sample
      WHERE check_id = v_check.check_id
      ORDER BY sampled_at DESC
      LIMIT v_check.consecutive_breach_threshold
    ) s WHERE s.within_expected_range = FALSE;

    IF v_breach_count >= v_check.consecutive_breach_threshold THEN
      -- Raise alert via existing m.cron_health_alert (reuse Layer 1 surface)
      INSERT INTO m.cron_health_alert (
        jobid, jobname, alert_type,
        threshold_crossed, latest_error, first_seen_at
      ) VALUES (
        v_check.attributed_cron_jobid,
        COALESCE(v_check.attributed_ef_name, v_check.check_name),
        'liveness_anomaly',
        v_sample_value,
        format('Check %s: sampled %s, expected [%s, %s]',
               v_check.check_name, v_sample_value,
               v_check.expected_min, COALESCE(v_check.expected_max::text, 'no_max')),
        NOW()
      )
      ON CONFLICT (jobid, alert_type) WHERE resolved_at IS NULL DO UPDATE
      SET threshold_crossed = EXCLUDED.threshold_crossed,
          latest_error = EXCLUDED.latest_error,
          last_seen_at = NOW();
    END IF;

    -- Auto-resolve when back in range:
    IF v_within THEN
      UPDATE m.cron_health_alert
      SET resolved_at = NOW()
      WHERE COALESCE(jobid, 0) = COALESCE(v_check.attributed_cron_jobid, 0)
        AND alert_type = 'liveness_anomaly'
        AND resolved_at IS NULL;
    END IF;

    RETURN NEXT (v_check.check_name, v_sample_value, v_within, v_breach_count >= v_check.consecutive_breach_threshold);
  END LOOP;
```

### One cron

```sql
SELECT cron.schedule(
  'liveness-check-every-15m',
  '*/15 * * * *',
  $$SELECT m.evaluate_liveness();$$
);
```

15-minute cadence is the floor — individual checks set their own `check_cadence_minutes` and the sweep respects that via the `last_sampled_at` filter. Fast checks can run every 15 min; expensive ones can run hourly or daily.

---

## v1 liveness check seed — what to monitor

### Critical path checks (catch ID004-class bugs)

**1. content-fetch liveness**
- `check_name`: `canonical_bodies_fetched_24h`
- `metric_query`: `SELECT COUNT(*)::numeric FROM f.canonical_content_body WHERE fetch_status IS NOT NULL AND updated_at > now() - interval '24 hours'`
- `expected_min`: 20 (baseline post-ID004 recovery rate)
- `expected_max`: NULL
- `cadence`: 60 min
- `rationale`: ID004 original catch. At active ingest rate of 40/day, 20 is half the baseline — anomaly threshold.

**2. ingest-worker liveness**
- `check_name`: `raw_items_ingested_24h`
- `metric_query`: `SELECT COUNT(*)::numeric FROM f.raw_content_item WHERE created_at > now() - interval '24 hours'`
- `expected_min`: 50
- `cadence`: 60 min
- `rationale`: Upstream of content-fetch; if this hits zero, ingest itself is broken.

**3. ai-worker liveness**
- `check_name`: `ai_jobs_succeeded_24h`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.ai_job WHERE status = 'succeeded' AND updated_at > now() - interval '24 hours'`
- `expected_min`: 10
- `cadence`: 30 min
- `rationale`: At current 4-client × ~5-post/day rate, should see 20+ succeeded jobs per day. 10 = half. Catches AI outages, token exhaustion, rate limit accidents.

**4. publisher liveness (active hours)**
- `check_name`: `posts_published_business_hours`
- `metric_query`:
  ```sql
  SELECT COUNT(*)::numeric FROM m.post_publish
  WHERE created_at > now() - interval '12 hours'
    AND EXTRACT(hour FROM created_at AT TIME ZONE 'Australia/Sydney') BETWEEN 6 AND 20
  ```
- `expected_min`: 1
- `cadence`: 60 min
- `rationale`: During 6am-8pm Sydney hours, at least one post should publish across all 4 clients over any 12-hour window. Zero = publisher broken silently.

**5. publisher-enqueue-to-execute ratio**
- `check_name`: `publish_queue_drain_rate`
- `metric_query`:
  ```sql
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM m.ai_job WHERE status='succeeded' AND updated_at > now() - interval '6 hours') > 0
    THEN (SELECT COUNT(*) FROM m.post_publish WHERE created_at > now() - interval '6 hours')::numeric
         / (SELECT COUNT(*) FROM m.ai_job WHERE status='succeeded' AND updated_at > now() - interval '6 hours')
    ELSE 1.0
  END
  ```
- `expected_min`: 0.3  (if succeeded jobs exist, at least 30% should reach publish within 6h)
- `expected_max`: 1.5  (publish count shouldn't massively exceed AI job success — suggests retry loop)
- `cadence`: 30 min
- `rationale`: Detects "AI works, publisher stuck" pattern (the M11 bug class) AND "infinite retry" pattern (the ID003 bug class).

### Queue state checks (catch stuck pipelines)

**6. post_publish_queue not growing without bound**
- `check_name`: `queue_depth_total`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.post_publish_queue WHERE status IN ('queued', 'running')`
- `expected_min`: 0
- `expected_max`: 100  (all 4 clients × ~25 each = 100 is absolute ceiling)
- `cadence`: 15 min
- `rationale`: If queue grows >100, publisher is stuck or enqueue logic is duplicating. M11 class.

**7. ai_job stuck in running**
- `check_name`: `ai_jobs_stuck_running_gt_30min`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.ai_job WHERE status = 'running' AND updated_at < now() - interval '30 minutes'`
- `expected_min`: 0
- `expected_max`: 2
- `cadence`: 15 min
- `rationale`: ID003 class. A job stuck running >30min is almost certainly a timeout that didn't write final status.

### Token & auth health checks

**8. no expired tokens actively in use**
- `check_name`: `expired_tokens_actively_scheduled`
- `metric_query`:
  ```sql
  SELECT COUNT(*)::numeric FROM m.post_publish_queue q
  JOIN c.client_publish_profile cpp
    ON cpp.client_id = q.client_id AND cpp.platform = q.platform
  WHERE q.status = 'queued'
    AND cpp.token_expires_at IS NOT NULL
    AND cpp.token_expires_at < now()
  ```
- `expected_min`: 0
- `expected_max`: 0
- `cadence`: 60 min
- `rationale`: If token already expired and queue still has items targeting it, they'll all fail. Catch before publisher tick.

### Signal quality checks

**9. digest_item population rate**
- `check_name`: `digest_items_created_24h`
- `metric_query`: `SELECT COUNT(*)::numeric FROM m.digest_item WHERE created_at > now() - interval '24 hours'`
- `expected_min`: 20
- `cadence`: 120 min
- `rationale`: If digest_item drops to zero, bundler is broken. Downstream starvation.

**10. canonical ageing**
- `check_name`: `oldest_unclassified_canonical_hours`
- `metric_query`:
  ```sql
  SELECT EXTRACT(EPOCH FROM (now() - MIN(updated_at)))/3600::numeric
  FROM f.canonical_content_body
  WHERE content_class IS NULL
  ```
- `expected_max`: 4 (R4 classifier should keep backlog under 4 hours)
- `expected_min`: NULL (zero is fine)
- `cadence`: 60 min
- `rationale`: If R4 classifier stops running, this metric grows linearly. Catches the "classifier cron paused" case that Layer 1 only catches as `no_recent_runs`. Layer 2 catches it as "backlog building up" which is more actionable.

### Publisher disparity checks (multi-platform M11 class)

**11. per-platform publish ratio**
- `check_name`: `fb_to_ig_publish_ratio_7d`
- `metric_query`:
  ```sql
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM m.post_publish WHERE platform='instagram' AND created_at > now() - interval '7 days') > 0
    THEN (SELECT COUNT(*) FROM m.post_publish WHERE platform='facebook' AND created_at > now() - interval '7 days')::numeric
         / (SELECT COUNT(*) FROM m.post_publish WHERE platform='instagram' AND created_at > now() - interval '7 days')
    ELSE 99  -- poison value if IG is at zero
  END
  ```
- `expected_min`: 0.3
- `expected_max`: 5
- `cadence`: daily (1440 min)
- `rationale`: FB posts should be 3-5× IG posts given current cadence. Ratio >5 or poison value = IG publisher broken; ratio <0.3 = FB publisher broken. Catches M11 cleanly.

---

## Alert surface — unified with Layer 1

Both Layer 1 and Layer 2 alerts land in `m.cron_health_alert`. Same table, different `alert_type`:
- Layer 1: `failure_rate_high`, `consecutive_failures`, `no_recent_runs`
- Layer 2: `liveness_anomaly` (may split into per-check_name later)

Operator query stays simple:
```sql
SELECT jobid, jobname, alert_type, threshold_crossed, latest_error,
       EXTRACT(EPOCH FROM (NOW() - first_seen_at))/3600 AS age_hours
FROM m.cron_health_alert
WHERE resolved_at IS NULL
ORDER BY first_seen_at DESC;
```

Returns both Layer 1 and Layer 2 active alerts in one list. Dashboard tile at `/monitoring/cron-health` (future CC-TASK-07) shows both.

---

## Why `metric_query` as free-form SQL, not a structured check type

The naive design would have a fixed set of check_types (`row_count`, `time_since`, `ratio`) each with their own config. But ICE's liveness patterns are varied (11 examples above use 4-5 different SQL shapes; the 20th check will use another shape).

Storing raw SQL in `metric_query` means:
- Any check imaginable
- No function rewrite to add a new type
- Same "data-not-code" principle as R4 rules + R5 fitness

Cost: operators editing `metric_query` can insert bad SQL. Mitigation:
- Never expose `metric_query` to non-admin UI (start + stay CLI/SQL-only for edits)
- `expected_min` / `expected_max` NUMERIC constraints catch query shape errors fast (if query returns non-numeric, evaluate_liveness catches TypeError on INTO)
- A bad check only fails ITS OWN sample — doesn't propagate to other checks

Trade accepted: power over safety, matches ICE's overall operator-trust posture.

---

## Migration plan

### Step 1 — Schema

Create `m.liveness_check` + `m.liveness_sample`. One atomic migration.

### Step 2 — Seed the 11 v1 checks

INSERT 11 rows into `m.liveness_check` with the definitions above. One atomic migration.

### Step 3 — Function + cron

Ship `m.evaluate_liveness()` + `liveness-check-every-15m` cron. Function immediately starts sampling.

### Step 4 — Tune after first 48 hours

After 2 days of baseline samples, review `m.liveness_sample` for any check where:
- 90th percentile value < expected_min → threshold too high, tune down
- 10th percentile value > expected_max → threshold too low, tune up
- Consistent oscillation around threshold → adjust `consecutive_breach_threshold`

Done via UPDATE. No schema or function change.

### Step 5 — Retention job

Add pg_cron job to delete old samples:
```sql
SELECT cron.schedule('liveness-sample-retention-daily', '0 3 * * *', $$
  DELETE FROM m.liveness_sample WHERE sampled_at < NOW() - interval '30 days';
$$);
```

30 days retention. Adjustable per-check later if needed.

---

## Integration with existing infrastructure

| Existing | How Layer 2 uses it |
|---|---|
| `m.cron_health_alert` (Layer 1) | Layer 2 INSERTs `liveness_anomaly` rows. Same table, same lifecycle. Operator sees unified view. |
| `m.refresh_cron_health()` (Layer 1 sweep) | Not directly used, but mental model: Layer 1 + Layer 2 = two independent sweepers both writing to one alert table. |
| `cron.job_run_details` | Not used by Layer 2 — that's Layer 1's domain. Layer 2 sources evidence from app tables (f.*, m.*, c.*). |
| `m.cron_health_snapshot` | Parallel to `m.liveness_sample` conceptually; both are time-series sample stores. |

---

## Open questions for PK review

1. **11 v1 checks — right shape?** Hand-picked based on incident history (ID003, ID004, M11). If PK has other concerns (e.g. feed-discovery working, visual pipeline healthy), add checks for those.

2. **Thresholds — calibrated tight or loose?** Current draft is conservative (e.g. `expected_min=20` for canonical_bodies_fetched_24h; could be 30 for tighter detection). Conservative risk: false positives frustrating. Tight risk: misses borderline slowdowns. Default conservative; tune in Step 4.

3. **Check cadence — is 15m floor right?** Some checks (queue_depth_total) warrant 5m. Some (fb_to_ig_publish_ratio_7d) only need daily. Per-check cadence already supported; 15m floor is sweep granularity, not minimum check interval.

4. **Alert dedup — ok to reuse Layer 1's `(jobid, alert_type)` unique?** Multiple liveness checks could attribute to the same `jobid` (e.g. content-fetch livenss + content-fetch consecutive-failures both target jobid 4). Current design uses `attributed_cron_jobid` which may be NULL for checks that span multiple crons (e.g. ratio checks). Alert table's unique on `(jobid, alert_type)` where jobid can be NULL will need careful treatment — partial unique where `resolved_at IS NULL` already handles this.

5. **Retention period — 30 days enough?** Longer retention helps identify slow drift over months. 30 days is MVP; extend to 90 if disk usage allows.

6. **Dashboard integration — CC-TASK-07?** A `/monitoring/cron-health` page could show Layer 1 + Layer 2 side-by-side, with the 30-day sample chart per check. Nice-to-have, not MVP.

7. **Notification layer — push alerts out of the DB?** Currently alerts sit in `m.cron_health_alert`. Operator has to query. Future: Telegram push via OpenClaw bot, email digest via Resend, or Slack webhook. Not MVP; backlog item.

---

## What's out of scope for v1

- Anomaly detection (ML-style) — thresholds are static, not adaptive
- Per-client liveness checks (11 checks above are system-wide; per-client is possible but explodes check count)
- Cross-check correlation (e.g. "content-fetch liveness drops AND ingest liveness drops → upstream outage") — manual analysis only
- Dashboard — backlog
- Notifications out of DB — backlog

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A `metric_query` has a SQL error — evaluate_liveness throws, blocks all other checks | Medium | Layer 2 stops sampling until fix | Wrap each check in BEGIN...EXCEPTION in the sweep function; failures logged but don't block next check |
| Metric queries collectively too expensive (slow Layer 2 sweep) | Low (queries are simple COUNT) | Sweep runs over 15m cadence, alerts delayed | Monitor sweep duration; if > 30s, stagger check cadence or split into two sweeps |
| False positive alerts from over-tight thresholds | Medium | Alert fatigue; operator ignores real alerts | Step 4 tuning based on 48h baseline; start conservative |
| Missed bugs outside the 11 checks | High | Silent bug classes not yet seen | Philosophy: every novel incident becomes a new check. Incident → check → permanent coverage. |
| Concurrent sweep runs (if check takes >15m) | Low | Duplicate samples, duplicate alerts | Add advisory lock (`pg_try_advisory_lock(hashtext('evaluate_liveness'))`) in function |
| `m.liveness_sample` growth (30 days × 11 checks × 4 samples/hour = ~100k rows) | Low | Disk usage at current scale negligible | Retention job + index strategy |

---

## When to implement

**Not HIGH priority.** Layer 1 is live and monitors the existing fleet. ID004 was caught and fixed; the cron 4 casing drift is unlikely to recur (same bug caught by ID004 repair won't occur again).

Layer 2 is **defence in depth** — guards against the NEXT class of silent bug we haven't identified yet.

Recommended trigger: another ID004-class incident occurs (cron runs clean but produces no effect). That's the evidence Layer 2 pays for itself.

OR: when cron count grows past ~60 (currently 46) and human ability to spot-check downstream effects erodes.

OR: when onboarding external clients and a silent-failure SLA breach becomes a contractual risk.

**Effort:** 2-3 hours for the full build:
- Schema: 30 min
- Seed 11 checks: 30 min
- Function + cron: 1 hour
- Tuning (Step 4): 30 min spread over 48h

---

## Related

- **Incident:** `docs/incidents/2026-04-23-content-fetch-casing-drift.md` (ID004)
- **Decision:** D168 — scope definition
- **Layer 1:** `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md`
- **Sibling audits:** A21 ON CONFLICT (DB layer), CC-TASK-02 EF `.upsert()` (app layer) — both catch different drift classes
- **Backlog item:** "D168 — ID004-class response-layer sentinel" in `docs/00_sync_state.md`

---

## Summary — the two-layer model

```
┌──────────────────────────────────────┐
│ Layer 1 — Status monitoring          │  Already shipped (24 Apr PM)
│ Source: cron.job_run_details         │
│ Catches: errors, consecutive fails   │
│ Limitation: can't see past exit code │
└──────────────────────────────────────┘
         │
         │ Compose into one alert table
         ▼
┌──────────────────────────────────────┐
│ m.cron_health_alert (unified)        │
│ Operator queries once. One list.     │
└──────────────────────────────────────┘
         ▲
         │ Compose into one alert table
         │
┌──────────────────────────────────────┐
│ Layer 2 — Response monitoring        │  This spec
│ Source: app tables (f.*, m.*, c.*)   │
│ Catches: silent no-ops               │
│ Complement: sees the downstream      │
│             effect, not the status   │
└──────────────────────────────────────┘
```

Between them, every ID003/ID004/M11-class bug has a detection surface. New incidents get new checks. The monitoring fleet grows as the system learns.
