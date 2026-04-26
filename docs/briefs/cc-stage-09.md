# Claude Code Brief — Stage 9: Recovery + critical window + breaking news

**Stage:** 9 of 19
**Phase:** B — Fill in shadow
**Pre-req:** Stage 8 complete (commit `8cf4978`, migrations 036–038 applied + fix-up in place, fill function works end-to-end, rejection trigger active, Phase A still autonomous, pool=1,694, slots=70, alerts=0)
**Goal:** Defensive layer around the fill function. Recovery for stuck `fill_in_progress` slots (LD13/F10), critical-window monitoring with alerting, and urgent breaking-news slot insertion (LD17/F6 with LD20 replaceable check). Plus the pre-decided FK fix-up: `m.ai_job.slot_id` ON DELETE → `CASCADE` (decision logged as D178). **No crons yet** — all functions are callable but not auto-fired (Stage 10's job).
**Estimated duration:** 45 min create + 30 min verification.

---

## Context for CC

This stage makes the fill function safe to operate. Six migrations:

| Migration | Object | Purpose |
|---|---|---|
| 039 | ALTER `m.ai_job.slot_id` FK to ON DELETE CASCADE | Resolves the design flaw caught during Stage 8 cleanup: SET NULL leaves all three origin cols NULL → ai_job_origin_check violation. CASCADE is the honest semantic — historical ai_jobs for a deleted slot have no useful state. |
| 040 | `m.recover_stuck_slots(p_stale_threshold_minutes, p_max_recovery_attempts)` | Find slots stuck in `fill_in_progress` for too long. <3 attempts → reset to `pending_fill`. >=3 attempts → mark `failed` + alert. |
| 041 | `m.slots_in_critical_window` view | Slots with `scheduled_publish_at` ≤ NOW + 4h that are NOT yet filled/approved/published. Tagged urgency = critical/warning/info. |
| 042 | `m.scan_critical_windows()` | Iterate critical slots, raise `slot_critical_window` alerts (rate-limited to once per slot per 30 min). |
| 043 | `m.hot_breaking_pool` view | High-fitness, fresh, never-used `timely_breaking` items in pool joined to client scope. |
| 044 | `m.try_urgent_breaking_fills(p_horizon_hours, p_replaceable_confidence_threshold)` | For each active (client, platform): if hot breaking exists AND no non-replaceable slot in horizon (LD20 check) → INSERT urgent slot with `source_kind='breaking'` for fill function to pick up. |

After Stage 9: defensive layer is callable end-to-end. Stage 10 wires the cron schedule (with the small ai-worker shadow filter from Decision Option B). Stage 11 does the full ai-worker refactor. Then Gate B observation.

### Pre-flight findings folded in (chat-side schema verification)

| Finding | Implication |
|---|---|
| `m.slot.status` CHECK enum includes `'failed'` | Recovery uses `status='failed'` for exhausted slots, not an extended enum. |
| `m.slot` has `m_slot_evergreen_consistency` CHECK: `(is_evergreen=false AND evergreen_id IS NULL) OR (is_evergreen=true AND evergreen_id IS NOT NULL)` | Recovery's reset must clear BOTH (set `is_evergreen=false`, `evergreen_id=NULL`). |
| `m.slot` has `m_slot_fill_window_consistency` CHECK: `fill_window_opens_at <= scheduled_publish_at` | Urgent breaking slot insert must respect this ordering. |
| `fk_ai_job_slot` currently `ON DELETE SET NULL` | Drop + recreate as `ON DELETE CASCADE` (D178). |
| `m.slot_alerts` has full alert schema (alert_kind, severity, client_id, platform, slot_id, payload, message, acknowledged_at, created_at) | All recovery + critical-window alerts use this shape. |
| 14 active (client, platform) profiles in `c.client_publish_profile` (publish_enabled=true, none paused) | Breaking news scan iterates these. Active set: NY 4 platforms (FB+IG+LI+YT), PP 4 platforms, CFW 3, Invegent 3. |
| `m.signal_pool.content_class` field stores values from `t.class_freshness_rule` (timely_breaking has 48h window) | Hot-breaking view filters `content_class='timely_breaking'`. |
| `m.slot_fill_attempt.decision` is text (no CHECK) — values used so far: filled, evergreen, skipped, failed | Recovery audits with new decision values: `'recovered_to_pending'`, `'marked_failed'`. |
| `c.client_publish_profile` does NOT have `is_active`; uses `publish_enabled` + `paused_until` | Breaking news filter uses these. |

### Migration numbering

Stage 8 closed at 038. Stage 9 = 039 → 044.

### Behaviour change envelope

After Stage 9 + verification:
- 1 schema change (FK CASCADE)
- 4 functions + 2 views callable on demand
- ZERO crons fire automatically (Stage 10's job)
- ZERO existing R6 ai_jobs affected
- ZERO new state writes from Stage 9 alone (recovery only fires when called; breaking news only fires when called)

Verification creates synthetic stuck slots, critical-window slots, and a synthetic breaking scenario, then calls each function and confirms expected behaviour. Cleans up after each test.

---

## Pre-flight checks (CC runs first)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — fast-forward, latest is `8cf4978`

---

## Files to create

6 migration files. Claude (chat) will apply via Supabase MCP after CC pushes.

### Migration 039 — `20260426_039_alter_ai_job_slot_fk_cascade.sql`

```sql
-- Stage 9.039 — Change m.ai_job.slot_id FK from ON DELETE SET NULL to CASCADE
--
-- Caught during Stage 8 cleanup: ON DELETE SET NULL leaves all three origin
-- columns (digest_run_id, post_seed_id, slot_id) NULL when a slot is deleted,
-- which violates ai_job_origin_check. CASCADE is the honest semantic —
-- historical ai_jobs for a deleted slot have no useful state to preserve.
--
-- Decision logged as D178.

ALTER TABLE m.ai_job DROP CONSTRAINT fk_ai_job_slot;

ALTER TABLE m.ai_job ADD CONSTRAINT fk_ai_job_slot
  FOREIGN KEY (slot_id) REFERENCES m.slot(slot_id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_ai_job_slot ON m.ai_job IS
  'Slot-driven path FK. ON DELETE CASCADE: deleting a slot removes its ai_jobs (D178). Stage 9.039.';
```

---

### Migration 040 — `20260426_040_create_recover_stuck_slots_function.sql`

```sql
-- Stage 9.040 — Recovery for stuck fill_in_progress slots (LD13/F10)
--
-- A slot transitions fill_in_progress when fill_pending_slots picks it up.
-- ai-worker should transition it forward (to filled) shortly after.
-- If ai-worker times out or errors, the slot can sit stuck.
-- This function detects and recovers them.
--
-- Behaviour:
--   - Find slots with status='fill_in_progress' AND filled_at older than threshold
--   - Count prior successful fill attempts for this slot via m.slot_fill_attempt
--     (decisions 'filled' or 'evergreen' represent successful pickups)
--   - If attempts < max: reset slot to pending_fill, audit row with decision='recovered_to_pending'
--   - If attempts >= max: mark slot failed, audit row + raise slot_recovery_exhausted alert
--
-- Defaults: stale=30 min, max_attempts=3 (matches D157 pattern from R6 ai-worker).
--
-- Returns jsonb {recovered_to_pending, marked_failed, alerts_raised, stale_threshold_minutes, max_attempts, ran_at}.

CREATE OR REPLACE FUNCTION m.recover_stuck_slots(
  p_stale_threshold_minutes integer DEFAULT 30,
  p_max_recovery_attempts   integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_recovered_to_pending integer := 0;
  v_marked_failed        integer := 0;
  v_alerts_raised        integer := 0;
  v_slot                 record;
  v_attempt_count        integer;
BEGIN
  FOR v_slot IN
    SELECT s.*
    FROM m.slot s
    WHERE s.status = 'fill_in_progress'
      AND s.filled_at < NOW() - (p_stale_threshold_minutes * interval '1 minute')
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COUNT(*)
    INTO v_attempt_count
    FROM m.slot_fill_attempt
    WHERE slot_id = v_slot.slot_id
      AND decision IN ('filled', 'evergreen');

    IF v_attempt_count < p_max_recovery_attempts THEN
      -- Reset to pending_fill (clear all fill-state cols; honour evergreen_consistency CHECK)
      UPDATE m.slot
      SET status            = 'pending_fill',
          filled_draft_id   = NULL,
          canonical_ids     = NULL,
          evergreen_id      = NULL,
          is_evergreen      = false,
          format_chosen     = NULL,
          slot_confidence   = NULL,
          filled_at         = NULL,
          updated_at        = NOW()
      WHERE slot_id = v_slot.slot_id;

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt,
        decision, skip_reason, threshold_relaxed, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0,
        'recovered_to_pending',
        format('stuck_in_fill_in_progress_for_%s_minutes_or_more', p_stale_threshold_minutes),
        false, NULL, NOW()
      );

      v_recovered_to_pending := v_recovered_to_pending + 1;
    ELSE
      -- Mark failed; raise alert
      UPDATE m.slot
      SET status        = 'failed',
          skip_reason   = 'exceeded_recovery_attempts',
          updated_at    = NOW()
      WHERE slot_id = v_slot.slot_id;

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt,
        decision, skip_reason, threshold_relaxed, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0,
        'marked_failed', 'exceeded_recovery_attempts', false, NULL, NOW()
      );

      INSERT INTO m.slot_alerts (
        alert_id, alert_kind, severity, client_id, platform, slot_id,
        payload, message, created_at
      ) VALUES (
        gen_random_uuid(), 'slot_recovery_exhausted', 'warning',
        v_slot.client_id, v_slot.platform, v_slot.slot_id,
        jsonb_build_object(
          'attempts', v_attempt_count,
          'max_attempts', p_max_recovery_attempts,
          'scheduled_publish_at', v_slot.scheduled_publish_at,
          'stale_threshold_minutes', p_stale_threshold_minutes
        ),
        format('Slot %s exhausted recovery attempts (%s/%s). scheduled_publish_at=%s',
               v_slot.slot_id, v_attempt_count, p_max_recovery_attempts,
               v_slot.scheduled_publish_at),
        NOW()
      );

      v_marked_failed := v_marked_failed + 1;
      v_alerts_raised := v_alerts_raised + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'recovered_to_pending',     v_recovered_to_pending,
    'marked_failed',            v_marked_failed,
    'alerts_raised',            v_alerts_raised,
    'stale_threshold_minutes',  p_stale_threshold_minutes,
    'max_attempts',             p_max_recovery_attempts,
    'ran_at',                   NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.recover_stuck_slots(integer, integer) IS
  'LD13/F10 recovery for stuck fill_in_progress slots. Reset <max attempts back to pending_fill, mark >=max as failed + alert. Defaults: stale=30 min, max_attempts=3. Audit rows with decision=recovered_to_pending|marked_failed. Stage 9.040.';
```

---

### Migration 041 — `20260426_041_create_slots_in_critical_window_view.sql`

```sql
-- Stage 9.041 — slots_in_critical_window view (§B.11)
--
-- Slots scheduled to publish within the next 4 hours that are not yet
-- filled/approved/published. Tagged with urgency:
--   critical = publish in <= 1h
--   warning  = publish in 1-2h
--   info     = publish in 2-4h
--
-- Used by scan_critical_windows function for alerting; also surfaceable
-- in the dashboard.

CREATE OR REPLACE VIEW m.slots_in_critical_window AS
SELECT
  s.slot_id,
  s.client_id,
  c.client_name,
  s.platform,
  s.scheduled_publish_at,
  s.fill_window_opens_at,
  s.status,
  s.fill_lead_time_minutes,
  s.skip_reason,
  ROUND((EXTRACT(epoch FROM (s.scheduled_publish_at - NOW())) / 60.0)::numeric, 1)
    AS minutes_until_publish,
  CASE
    WHEN s.scheduled_publish_at <= NOW() + interval '1 hour'  THEN 'critical'
    WHEN s.scheduled_publish_at <= NOW() + interval '2 hours' THEN 'warning'
    WHEN s.scheduled_publish_at <= NOW() + interval '4 hours' THEN 'info'
  END AS urgency
FROM m.slot s
JOIN c.client c ON c.client_id = s.client_id
WHERE s.scheduled_publish_at >  NOW()
  AND s.scheduled_publish_at <= NOW() + interval '4 hours'
  AND s.status IN ('future', 'pending_fill', 'fill_in_progress')
ORDER BY s.scheduled_publish_at ASC;

COMMENT ON VIEW m.slots_in_critical_window IS
  'Slots in next 4h not yet filled/approved/published. Urgency: critical (<1h) | warning (1-2h) | info (2-4h). Stage 9.041.';
```

---

### Migration 042 — `20260426_042_create_scan_critical_windows_function.sql`

```sql
-- Stage 9.042 — scan_critical_windows function (§B.11)
--
-- Iterate critical-urgency slots from m.slots_in_critical_window.
-- For each, raise a slot_critical_window alert (severity=critical) if no
-- such alert exists for that slot in the last 30 min (rate-limit).
--
-- Returns jsonb with counts per urgency tier.

CREATE OR REPLACE FUNCTION m.scan_critical_windows()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_alerts_raised integer := 0;
  v_critical_count integer;
  v_warning_count  integer;
  v_info_count     integer;
  v_slot record;
BEGIN
  FOR v_slot IN
    SELECT * FROM m.slots_in_critical_window WHERE urgency = 'critical'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM m.slot_alerts
      WHERE slot_id = v_slot.slot_id
        AND alert_kind = 'slot_critical_window'
        AND created_at > NOW() - interval '30 minutes'
    ) THEN
      INSERT INTO m.slot_alerts (
        alert_id, alert_kind, severity, client_id, platform, slot_id,
        payload, message, created_at
      ) VALUES (
        gen_random_uuid(), 'slot_critical_window', 'critical',
        v_slot.client_id, v_slot.platform, v_slot.slot_id,
        jsonb_build_object(
          'minutes_until_publish', v_slot.minutes_until_publish,
          'status',                v_slot.status,
          'scheduled_publish_at',  v_slot.scheduled_publish_at,
          'urgency',               v_slot.urgency
        ),
        format('Slot %s for %s/%s in critical window: %.1f minutes to publish, status=%s',
               v_slot.slot_id, v_slot.client_name, v_slot.platform,
               v_slot.minutes_until_publish, v_slot.status),
        NOW()
      );
      v_alerts_raised := v_alerts_raised + 1;
    END IF;
  END LOOP;

  SELECT COUNT(*) FILTER (WHERE urgency='critical'),
         COUNT(*) FILTER (WHERE urgency='warning'),
         COUNT(*) FILTER (WHERE urgency='info')
  INTO v_critical_count, v_warning_count, v_info_count
  FROM m.slots_in_critical_window;

  RETURN jsonb_build_object(
    'alerts_raised',  v_alerts_raised,
    'critical_count', v_critical_count,
    'warning_count',  v_warning_count,
    'info_count',     v_info_count,
    'ran_at',         NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.scan_critical_windows() IS
  'Raise slot_critical_window alerts for slots in critical urgency tier. Rate-limited to one per slot per 30 min. Stage 9.042.';
```

---

### Migration 043 — `20260426_043_create_hot_breaking_pool_view.sql`

```sql
-- Stage 9.043 — hot_breaking_pool view (§B.12, H3)
--
-- High-fitness, fresh, never-used timely_breaking items in pool, joined
-- to client_content_scope to surface per-client availability.
--
-- Filters:
--   - is_active = true (in pool, not expired)
--   - content_class = 'timely_breaking' (48h freshness window per t.class_freshness_rule)
--   - fitness_score_max >= 80 (high quality on 0..100 scale)
--   - first_seen_at within last 24h (genuinely recent)
--   - reuse_count = 0 (not yet used by any client)
--
-- Used by try_urgent_breaking_fills to decide whether to insert urgent slots.

CREATE OR REPLACE VIEW m.hot_breaking_pool AS
SELECT
  sp.canonical_id,
  sp.vertical_id,
  ccs.client_id,
  c.client_name,
  sp.fitness_score_max,
  sp.content_class,
  sp.source_domain,
  cci.canonical_title,
  cci.canonical_url,
  cci.first_seen_at,
  ROUND((EXTRACT(epoch FROM (NOW() - cci.first_seen_at)) / 3600.0)::numeric, 2)
    AS hours_since_first_seen,
  sp.pool_entered_at,
  sp.reuse_count
FROM m.signal_pool sp
JOIN c.client_content_scope ccs ON ccs.vertical_id = sp.vertical_id
JOIN c.client c ON c.client_id = ccs.client_id AND c.status = 'active'
JOIN f.canonical_content_item cci ON cci.canonical_id = sp.canonical_id
WHERE sp.is_active = true
  AND sp.content_class = 'timely_breaking'
  AND sp.fitness_score_max >= 80
  AND cci.first_seen_at > NOW() - interval '24 hours'
  AND sp.reuse_count = 0
ORDER BY cci.first_seen_at DESC, sp.fitness_score_max DESC;

COMMENT ON VIEW m.hot_breaking_pool IS
  'High-fitness fresh timely_breaking items in pool, never-used, joined to client scope. fitness>=80, first_seen<24h, reuse_count=0. Stage 9.043.';
```

---

### Migration 044 — `20260426_044_create_try_urgent_breaking_fills_function.sql`

```sql
-- Stage 9.044 — try_urgent_breaking_fills function (§B.12, F6/LD17)
-- WITH LD20 REPLACEABLE-SLOT CHECK
--
-- For each active (client, platform):
--   1. LD20 collision check — is there a NON-replaceable slot in next horizon hours?
--      Non-replaceable = status IN ('approved','published')
--                        OR (status='filled' AND is_evergreen=false AND slot_confidence > threshold)
--      Replaceable = pending_fill, fill_in_progress, filled-low-confidence, filled-evergreen.
--      A replaceable slot can be displaced by breaking news.
--      An non-replaceable slot blocks breaking news (don't disrupt approved/locked-in content).
--   2. If non-replaceable slot exists → skip this combo.
--   3. Else: query m.hot_breaking_pool for this client.
--      If found → INSERT urgent slot with source_kind='breaking', publish in 30 min.
--      The next fill_pending_slots cron tick picks it up via the normal flow.
--
-- This function does NOT fill slots itself — it inserts urgent slots that
-- the regular fill function processes. Single source of synthesis logic.
--
-- Defaults: horizon=6h, replaceable_confidence_threshold=0.65.

CREATE OR REPLACE FUNCTION m.try_urgent_breaking_fills(
  p_horizon_hours                       integer DEFAULT 6,
  p_replaceable_confidence_threshold    numeric DEFAULT 0.65
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count  integer := 0;
  v_combo          record;
  v_breaking       record;
  v_publish_at     timestamptz;
  v_results        jsonb := '[]'::jsonb;
BEGIN
  FOR v_combo IN
    SELECT DISTINCT cp.client_id, cp.platform
    FROM c.client_publish_profile cp
    WHERE cp.publish_enabled = true
      AND (cp.paused_until IS NULL OR cp.paused_until < NOW())
  LOOP
    -- LD20 replaceable check
    IF EXISTS (
      SELECT 1
      FROM m.slot s
      WHERE s.client_id = v_combo.client_id
        AND s.platform  = v_combo.platform
        AND s.scheduled_publish_at BETWEEN NOW()
                                       AND NOW() + (p_horizon_hours * interval '1 hour')
        AND (
              s.status IN ('approved', 'published')
           OR (s.status = 'filled'
               AND s.is_evergreen = false
               AND COALESCE(s.slot_confidence, 0) > p_replaceable_confidence_threshold)
        )
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'client_id', v_combo.client_id,
        'platform',  v_combo.platform,
        'action',    'skipped',
        'reason',    'non_replaceable_slot_in_horizon'
      ));
      CONTINUE;
    END IF;

    -- Find a hot breaking item for this client
    SELECT * INTO v_breaking
    FROM m.hot_breaking_pool
    WHERE client_id = v_combo.client_id
    LIMIT 1;

    IF NOT FOUND THEN
      v_skipped_count := v_skipped_count + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'client_id', v_combo.client_id,
        'platform',  v_combo.platform,
        'action',    'skipped',
        'reason',    'no_breaking_in_pool'
      ));
      CONTINUE;
    END IF;

    -- Insert urgent slot — publish in 30 minutes; fill window already open.
    -- Format preference 'image_quote' as safe fallback (cheap, fast); fill function
    -- evaluates against quality policy and may upgrade or skip.
    v_publish_at := NOW() + interval '30 minutes';

    INSERT INTO m.slot (
      slot_id, client_id, platform, scheduled_publish_at,
      format_preference, fill_window_opens_at, fill_lead_time_minutes,
      status, source_kind, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_combo.client_id, v_combo.platform, v_publish_at,
      ARRAY['image_quote'],
      NOW(),  -- fill window opens immediately
      30,     -- 30 min lead time (override of normal 1440)
      'pending_fill', 'breaking', NOW(), NOW()
    );

    v_inserted_count := v_inserted_count + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'client_id',            v_combo.client_id,
      'platform',             v_combo.platform,
      'action',               'inserted_urgent_slot',
      'canonical_id',         v_breaking.canonical_id,
      'canonical_title',      v_breaking.canonical_title,
      'fitness_score_max',    v_breaking.fitness_score_max,
      'hours_since_first_seen', v_breaking.hours_since_first_seen,
      'scheduled_publish_at', v_publish_at
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'inserted',                          v_inserted_count,
    'skipped',                           v_skipped_count,
    'horizon_hours',                     p_horizon_hours,
    'replaceable_confidence_threshold',  p_replaceable_confidence_threshold,
    'results',                           v_results,
    'ran_at',                            NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.try_urgent_breaking_fills(integer, numeric) IS
  'F6/LD17 + LD20 replaceable check. For each active (client, platform): if hot breaking exists AND no non-replaceable slot in horizon → INSERT urgent slot for fill function to process. Replaceable = pending_fill, fill_in_progress, filled-low-confidence (<threshold), filled-evergreen. Defaults: horizon=6h, threshold=0.65. Stage 9.044.';
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

git add supabase/migrations/20260426_039_alter_ai_job_slot_fk_cascade.sql
git add supabase/migrations/20260426_040_create_recover_stuck_slots_function.sql
git add supabase/migrations/20260426_041_create_slots_in_critical_window_view.sql
git add supabase/migrations/20260426_042_create_scan_critical_windows_function.sql
git add supabase/migrations/20260426_043_create_hot_breaking_pool_view.sql
git add supabase/migrations/20260426_044_create_try_urgent_breaking_fills_function.sql

git commit -m "feat(slot-driven): Stage 9 — recovery + critical window + breaking news (LD17 + LD20)

Defensive layer around fill function. 6 migrations.

039 ALTER fk_ai_job_slot to ON DELETE CASCADE (D178)
    SET NULL caused ai_job_origin_check violation when slot deleted.
    CASCADE is honest semantic — no useful state once slot is gone.

040 m.recover_stuck_slots(stale_minutes=30, max_attempts=3)
    Find fill_in_progress slots stuck > stale_minutes.
    <max attempts: reset to pending_fill (clears all fill state per
                   evergreen_consistency CHECK).
    >=max attempts: mark failed + raise slot_recovery_exhausted alert.
    Audit rows with decision=recovered_to_pending|marked_failed.
    Defaults match D157 R6 ai-worker pattern.

041 m.slots_in_critical_window view
    Slots in next 4h, status NOT in (filled, approved, published).
    Tagged urgency: critical (<1h), warning (1-2h), info (2-4h).

042 m.scan_critical_windows()
    Iterate critical-urgency slots, raise slot_critical_window alerts
    (rate-limited 30 min/slot). Returns counts per urgency tier.

043 m.hot_breaking_pool view
    timely_breaking items in pool, fitness>=80, first_seen<24h,
    reuse_count=0. Joined to client_content_scope.

044 m.try_urgent_breaking_fills(horizon_hours=6, threshold=0.65)
    For each active (client, platform):
    LD20 replaceable check:
      non-replaceable = approved/published OR
                        filled-non-evergreen-high-confidence (>threshold)
      replaceable = pending_fill, fill_in_progress, filled-low-conf,
                    filled-evergreen
    If non-replaceable in horizon → skip.
    Else if hot breaking available → INSERT urgent slot
    (source_kind='breaking', publish+30 min, lead=30 min).
    Function does NOT fill — fill_pending_slots picks it up.

Pre-flight findings folded in:
- m.slot.status enum includes 'failed'
- m.slot has evergreen_consistency CHECK (recovery clears both cols)
- m.slot has fill_window_opens_at <= scheduled_publish_at CHECK
- fk_ai_job_slot was ON DELETE SET NULL — drop+recreate as CASCADE
- m.slot_alerts schema confirmed
- 14 active (client, platform) combos
- m.signal_pool.content_class includes 'timely_breaking'
- m.slot_fill_attempt.decision is text (no CHECK) — new values
  recovered_to_pending and marked_failed accepted
- c.client_publish_profile uses publish_enabled+paused_until (no is_active)
- Migrations 039-044 (Stage 8 closed at 038)

NO crons added (Stage 10's job).
NO ai-worker changes (Stage 10/11's job per D178/Option B).
All functions callable but not auto-fired.

Verification (V1-V6) covers structural, FK CASCADE behaviour test,
recovery synthetic-stuck-slot test, critical-window scan test,
breaking news synthetic test, and Phase A regression.

Refs: 26d88b8 (v4), 8cf4978 (Stage 8 closed)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

```
## Stage 9 CC report (git side only)

- ✅ Pre-flight passed: yes/no
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 6/6 (039-044)
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No supabase db push.
Awaiting Claude (chat) to apply migrations + run V1–V6 verification.
```

---

## Verification queries (Claude in chat runs)

### V1 — Structural

```sql
-- 039: FK is now CASCADE
SELECT pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid='m.ai_job'::regclass AND conname='fk_ai_job_slot';
-- EXPECTED: contains 'ON DELETE CASCADE'

-- 040, 042, 044: functions exist
SELECT proname FROM pg_proc
WHERE pronamespace='m'::regnamespace
  AND proname IN ('recover_stuck_slots','scan_critical_windows','try_urgent_breaking_fills')
ORDER BY proname;
-- EXPECTED: 3 rows

-- 041, 043: views exist
SELECT viewname FROM pg_views
WHERE schemaname='m'
  AND viewname IN ('slots_in_critical_window','hot_breaking_pool')
ORDER BY viewname;
-- EXPECTED: 2 rows
```

### V2 — FK CASCADE behaviour test

```sql
-- Create a synthetic slot + linked ai_job, delete slot, confirm ai_job auto-deleted
DO $$
DECLARE
  v_test_slot_id uuid;
  v_test_draft_id uuid;
  v_test_ai_job_id uuid;
  v_ny_client_id uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';
  v_ai_job_remaining integer;
BEGIN
  -- Slot
  INSERT INTO m.slot (
    slot_id, client_id, platform, scheduled_publish_at,
    format_preference, fill_window_opens_at, fill_lead_time_minutes,
    status, source_kind, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook',
    NOW() + interval '6 hours', ARRAY['image_quote'],
    NOW(), 1440, 'pending_fill', 'one_off', NOW(), NOW()
  ) RETURNING slot_id INTO v_test_slot_id;

  -- Skeleton draft
  INSERT INTO m.post_draft (
    post_draft_id, client_id, platform, slot_id, is_shadow,
    approval_status, draft_title, draft_body, version, created_by, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook', v_test_slot_id, true,
    'draft', NULL, '', 1, 'cascade_test', NOW(), NOW()
  ) RETURNING post_draft_id INTO v_test_draft_id;

  -- ai_job (slot-driven)
  INSERT INTO m.ai_job (
    ai_job_id, client_id, platform, slot_id, post_draft_id,
    digest_run_id, post_seed_id, is_shadow, job_type, status, priority,
    input_payload, output_payload, created_at, updated_at, attempts
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook', v_test_slot_id, v_test_draft_id,
    NULL, NULL, true, 'slot_fill_synthesis_v1', 'queued', 100,
    '{}'::jsonb, '{}'::jsonb, NOW(), NOW(), 0
  ) RETURNING ai_job_id INTO v_test_ai_job_id;

  -- Cleanup chain: post_visual_spec auto-created on draft INSERT, then post_draft, then slot
  DELETE FROM m.post_visual_spec WHERE post_draft_id = v_test_draft_id;
  -- Deleting the draft requires the slot's filled_draft_id ref cleared first
  UPDATE m.slot SET filled_draft_id = NULL WHERE slot_id = v_test_slot_id;
  DELETE FROM m.post_draft WHERE post_draft_id = v_test_draft_id;

  -- Now delete the slot — CASCADE should remove the ai_job
  DELETE FROM m.slot WHERE slot_id = v_test_slot_id;

  -- ai_job should be gone
  SELECT COUNT(*) INTO v_ai_job_remaining
  FROM m.ai_job WHERE ai_job_id = v_test_ai_job_id;
  IF v_ai_job_remaining <> 0 THEN
    RAISE EXCEPTION 'CASCADE FAILED: ai_job % still exists after slot delete', v_test_ai_job_id;
  END IF;
  RAISE NOTICE '✅ V2 FK CASCADE: slot delete removed linked ai_job';
END $$;
```

### V3 — Recovery synthetic-stuck-slot test

```sql
DO $$
DECLARE
  v_test_slot_id uuid;
  v_test_draft_id uuid;
  v_test_ai_job_id uuid;
  v_recovery_result jsonb;
  v_status_after text;
  v_ny_client_id uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';
BEGIN
  -- Setup: slot stuck in fill_in_progress, filled_at 60 min ago (> 30 min threshold)
  INSERT INTO m.slot (
    slot_id, client_id, platform, scheduled_publish_at,
    format_preference, fill_window_opens_at, fill_lead_time_minutes,
    status, source_kind, filled_at, created_at, updated_at,
    canonical_ids, format_chosen, is_evergreen, slot_confidence
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook',
    NOW() + interval '6 hours', ARRAY['image_quote'],
    NOW(), 1440, 'fill_in_progress', 'one_off',
    NOW() - interval '60 minutes', NOW(), NOW(),
    ARRAY[gen_random_uuid()], 'image_quote', false, 0.7
  ) RETURNING slot_id INTO v_test_slot_id;

  -- Run recovery
  SELECT m.recover_stuck_slots() INTO v_recovery_result;
  RAISE NOTICE 'Recovery result: %', v_recovery_result;

  -- Slot should be back at pending_fill, all fill state cleared
  SELECT status INTO v_status_after FROM m.slot WHERE slot_id = v_test_slot_id;
  IF v_status_after <> 'pending_fill' THEN
    RAISE EXCEPTION 'Recovery failed: status=% (expected pending_fill)', v_status_after;
  END IF;

  -- Audit row with decision='recovered_to_pending'
  IF NOT EXISTS (
    SELECT 1 FROM m.slot_fill_attempt
    WHERE slot_id = v_test_slot_id AND decision = 'recovered_to_pending'
  ) THEN
    RAISE EXCEPTION 'Recovery audit row missing';
  END IF;

  RAISE NOTICE '✅ V3 recovery: stuck slot reset to pending_fill, audit row written';

  -- Cleanup
  DELETE FROM m.slot_fill_attempt WHERE slot_id = v_test_slot_id;
  DELETE FROM m.slot WHERE slot_id = v_test_slot_id;
END $$;
```

### V4 — Critical-window scan test

```sql
DO $$
DECLARE
  v_test_slot_id uuid;
  v_scan_result jsonb;
  v_alert_count integer;
  v_ny_client_id uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';
BEGIN
  -- Insert slot scheduled in 30 minutes, status=pending_fill (critical urgency)
  INSERT INTO m.slot (
    slot_id, client_id, platform, scheduled_publish_at,
    format_preference, fill_window_opens_at, fill_lead_time_minutes,
    status, source_kind, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_ny_client_id, 'facebook',
    NOW() + interval '30 minutes', ARRAY['image_quote'],
    NOW() - interval '5 minutes', 1440,
    'pending_fill', 'one_off', NOW(), NOW()
  ) RETURNING slot_id INTO v_test_slot_id;

  -- Confirm slot appears in critical window view
  IF NOT EXISTS (SELECT 1 FROM m.slots_in_critical_window
                 WHERE slot_id = v_test_slot_id AND urgency = 'critical') THEN
    RAISE EXCEPTION 'Test slot did not appear in slots_in_critical_window with urgency=critical';
  END IF;

  -- Run scan
  SELECT m.scan_critical_windows() INTO v_scan_result;
  RAISE NOTICE 'Scan result: %', v_scan_result;

  -- Should have raised one alert for our test slot
  SELECT COUNT(*) INTO v_alert_count
  FROM m.slot_alerts
  WHERE slot_id = v_test_slot_id
    AND alert_kind = 'slot_critical_window'
    AND severity = 'critical';
  IF v_alert_count <> 1 THEN
    RAISE EXCEPTION 'Expected 1 critical alert for test slot, got %', v_alert_count;
  END IF;

  RAISE NOTICE '✅ V4 critical-window scan: slot in 30 min triggered critical alert';

  -- Cleanup
  DELETE FROM m.slot_alerts WHERE slot_id = v_test_slot_id;
  DELETE FROM m.slot WHERE slot_id = v_test_slot_id;
END $$;
```

### V5 — Breaking news function test

```sql
-- Note: try_urgent_breaking_fills will iterate active (client, platform) profiles.
-- We don't synthesise a fake breaking item (would require pool manipulation).
-- Instead, run the function as-is and verify it returns a sensible shape.
-- In production, hot_breaking_pool may be empty (no current timely_breaking
-- items meeting the criteria); function should return inserted=0 with
-- per-combo skip reasons of 'no_breaking_in_pool'.

SELECT m.try_urgent_breaking_fills();
-- EXPECTED: jsonb {inserted, skipped, horizon_hours: 6, ..., results: [...]}
-- inserted = 0 (no synthetic breaking; production pool may have some)
-- Most combos: skipped with reason='no_breaking_in_pool' OR 'non_replaceable_slot_in_horizon'

-- Also verify hot_breaking_pool view is queryable
SELECT COUNT(*) AS hot_breaking_count FROM m.hot_breaking_pool;
-- EXPECTED: integer >= 0 (no error)

-- LD20 replaceable logic spot-check: query slots in next 6h grouped by replaceable status
SELECT
  CASE
    WHEN status IN ('approved','published') THEN 'non_replaceable'
    WHEN status = 'filled' AND is_evergreen = false AND COALESCE(slot_confidence, 0) > 0.65 THEN 'non_replaceable'
    ELSE 'replaceable'
  END AS replaceability,
  COUNT(*) AS count
FROM m.slot
WHERE scheduled_publish_at BETWEEN NOW() AND NOW() + interval '6 hours'
GROUP BY 1;
-- EXPECTED: rows showing the breakdown; mostly replaceable since Phase B
-- hasn't filled anything live yet
```

### V6 — Phase A regression

```sql
SELECT 'pool_active' AS metric, COUNT(*)::text AS value FROM m.signal_pool WHERE is_active=true
UNION ALL
SELECT 'slots_total_excl_test', COUNT(*)::text FROM m.slot WHERE source_kind <> 'one_off'
UNION ALL
SELECT 'slot_alerts_residual', COUNT(*)::text FROM m.slot_alerts
UNION ALL
SELECT 'r6_paused (3)', COUNT(*)::text FROM cron.job WHERE jobid IN (11,64,65) AND active=false
UNION ALL
SELECT 'phase_a_active (6)', COUNT(*)::text FROM cron.job WHERE jobid BETWEEN 69 AND 74 AND active=true;
```

---

## Exit criteria

If V1–V6 pass:
- Stage 9 is COMPLETE.
- FK CASCADE works (slot delete removes ai_job).
- Recovery resets stuck slots correctly.
- Critical-window scan raises alerts.
- Breaking news function callable, replaceable check sound.
- Phase A still autonomous.

Then PK approves → **Stage 10 brief** (Phase B crons + small ai-worker shadow filter, per Option B).

Edge cases worth checking during shadow observation (Gate B):
- Recovery's stale_threshold_minutes — 30 min may be too aggressive once Stage 11 ai-worker has prompt caching (cold start could exceed 30 min on first call). Tune up post-Gate B if seen.
- Breaking news LD20 threshold (0.65) — might filter too many filled slots as replaceable. Observable via `m.slot_fill_attempt.slot_confidence` distribution.

---

## Rollback (if needed)

```sql
-- Drop in reverse order
DROP FUNCTION IF EXISTS m.try_urgent_breaking_fills(integer, numeric);
DROP VIEW IF EXISTS m.hot_breaking_pool;
DROP FUNCTION IF EXISTS m.scan_critical_windows();
DROP VIEW IF EXISTS m.slots_in_critical_window;
DROP FUNCTION IF EXISTS m.recover_stuck_slots(integer, integer);

-- Revert FK to SET NULL (Stage 8 state)
ALTER TABLE m.ai_job DROP CONSTRAINT fk_ai_job_slot;
ALTER TABLE m.ai_job ADD CONSTRAINT fk_ai_job_slot
  FOREIGN KEY (slot_id) REFERENCES m.slot(slot_id) ON DELETE SET NULL;
```

---

## Notes for after Stage 9 verifies

- **Stage 10**: register Phase B crons (fill, recovery, breaking, critical-scan) + the small ai-worker patch to skip `is_shadow=true` rows. Per D178 Option B.
- **Stage 11**: full ai-worker refactor (LD18 idempotency + LD7 prompt caching + slot-driven shape).
- **Then Gate B**: 5–7 days shadow observation.

After Stage 9, defensive layer is complete:
- **Recovery** (LD13/F10) — stuck slots auto-heal
- **Critical-window monitoring** — operator alerts before deadline misses
- **Breaking news** (LD17/LD20) — urgent content can override planned-but-replaceable slots
- **FK semantics** (D178) — no orphan-by-NULL risk

Stage 9 is the smallest of the Phase B build stages. Stage 10 follows, then Stage 11 (the ai-worker refactor — first EF deploy of Phase B).

---

*End Stage 9 brief. v4 commit `26d88b8`. Stage 8 closed at `8cf4978`. Author: Claude (chat). For execution by: Claude Code (local).*
