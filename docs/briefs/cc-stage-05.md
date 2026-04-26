# Claude Code Brief — Stage 5: Slot materialiser + promoter + initial materialisation

**Stage:** 5 of 19
**Phase:** A — Foundation
**Pre-req:** Stage 4 complete (commit `a8b0c1f`, all migrations 001–023 applied, pool populated to 1,668 active rows)
**Goal:** Create the slot materialiser (`m.materialise_slots()`), the rule-change re-materialiser trigger, and the slot promoter (`m.promote_slots_to_pending()`). Then run the one-time initial materialisation to populate `m.slot` with 7 days of forward slots from active publish schedules. **Visible state change** — `m.slot` will go from 0 rows to ~70 rows. Nothing reads slots yet (Stage 8 fill function is the consumer; Stage 10 wires the cron). R6 stays paused.
**Estimated duration:** 30–45 min.

---

## Context for CC

Stage 4 populated the pool. Stage 5 creates the demand side: scheduled `m.slot` rows that will eventually pull from that pool.

### Pre-flight findings (folded into this brief)

Verified against production schema just now:

- All 4 active clients have `timezone = 'Australia/Sydney'`. Materialiser converts `(date + publish_time) AT TIME ZONE timezone` to timestamptz.
- 14 active (client, platform) pairs × 5 weekdays per week (`day_of_week IN [1..5]` Mon-Fri) × 1 publish_time per pair = 70 schedule rules, generating 70 slots per 7-day window.
- `c.client_publish_schedule` columns: `schedule_id` (uuid PK), `client_id`, `platform`, `day_of_week` (integer 1=Mon..7=Sun), `publish_time` (time without tz), `enabled` (boolean).
- `m.slot.schedule_id` already references `c.client_publish_schedule(schedule_id)` from Stage 1.

### Three functions in this stage

**1. `m.compute_rule_slot_times(schedule_id, days_forward)`** — helper that returns timestamptz values when a single schedule rule should fire over the next N days. Walks day_of_week + publish_time + client.timezone. Returns one timestamptz per matching weekday in the window.

**2. `m.materialise_slots(p_days_forward integer DEFAULT 7)`** — main materialiser. For each (active client, enabled schedule rule), computes future slot times via the helper, then INSERT INTO `m.slot ... ON CONFLICT DO NOTHING` keyed on (client_id, platform, scheduled_publish_at) (using a unique index added in this stage). Sets `format_preference` from `c.client_publish_profile.preferred_format_<platform>` if available, else empty array. Sets `fill_window_opens_at = scheduled_publish_at - 24h` per LD4. Returns jsonb summary.

**3. `m.handle_schedule_rule_change()` + trigger** — on UPDATE of `c.client_publish_schedule.enabled` or `publish_time` or `day_of_week`, deletes future `future`-status slots for that schedule_id and re-runs materialiser for that client. This handles the case where PK edits a publish schedule mid-week — old slots get cleared, new ones generated.

**4. `m.promote_slots_to_pending()`** — UPDATEs slots where `status='future' AND fill_window_opens_at <= NOW() + interval '10 minutes'` to `status='pending_fill'`. F8 buffer: the 10-minute lookahead means promotion happens slightly early so the fill cron can pick it up immediately. Returns count promoted. Stage 10 wires this to a 5-minute cron.

**5. One-time initial materialisation** — runs `SELECT m.materialise_slots(7)` after the functions are created. This populates `m.slot` with the next 7 days of forward slots. Approximately 70 rows.

### Format preference resolution

`c.client_publish_profile` has `preferred_format_facebook`, `preferred_format_instagram`, `preferred_format_linkedin` columns. Materialiser reads these per (client, platform) and packages into `format_preference text[]`. If the column is NULL, format_preference is empty (Stage 8 fill function falls back to "any format with viable fitness").

YouTube has no `preferred_format_youtube` column in production. For YouTube slots, format_preference defaults to `ARRAY['video_short_avatar']` based on memory note that NY/PP YouTube channels publish vertical short-form. This is a defensible default; can be tuned later.

### Behaviour change envelope

After Stage 5:
- `m.slot` populated with ~70 rows of `status='future'` for the next 7 days
- Trigger `trg_handle_schedule_rule_change` is active — any schedule edit reflows future slots
- `m.promote_slots_to_pending()` is callable but not wired to a cron (Stage 10 wires it)
- Without the cron, no slot will ever transition to `pending_fill`, so the fill function (Stage 8) won't pick up anything yet
- Old pipeline still untouched, R6 paused

---

## Pre-flight checks (CC runs first)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — fast-forward, latest is `a8b0c1f`

If any pre-flight fails: STOP, report, do not proceed.

---

## Files to create

5 migration files. The one-time initial materialisation is run by Claude (chat) via MCP after CC pushes — same pattern as Stage 4's backfill.

### Migration 024 — `20260426_024_create_compute_rule_slot_times_function.sql`

```sql
-- Stage 5.024 — m.compute_rule_slot_times: generate future timestamps for one schedule rule
-- Returns one row per matching weekday in the next N days, at the rule's publish_time
-- in the client's timezone, expressed as UTC timestamptz.

CREATE OR REPLACE FUNCTION m.compute_rule_slot_times(
  p_schedule_id   uuid,
  p_days_forward  integer DEFAULT 7
)
RETURNS TABLE(scheduled_publish_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_tz    text;
  v_day_of_week  integer;
  v_publish_time time;
BEGIN
  -- Read schedule rule + client timezone
  SELECT cps.day_of_week, cps.publish_time, c.timezone
    INTO v_day_of_week, v_publish_time, v_client_tz
  FROM c.client_publish_schedule cps
  JOIN c.client c ON c.client_id = cps.client_id
  WHERE cps.schedule_id = p_schedule_id;

  IF v_client_tz IS NULL THEN
    RETURN;
  END IF;

  -- Walk every day in the next p_days_forward; emit those whose ISO weekday matches
  -- the rule's day_of_week. Convention: ISO Monday=1, Sunday=7 — matches PG extract(isodow).
  RETURN QUERY
  SELECT (d::date + v_publish_time)::timestamp AT TIME ZONE v_client_tz AS scheduled_publish_at
  FROM generate_series(
    (now() AT TIME ZONE v_client_tz)::date,
    (now() AT TIME ZONE v_client_tz)::date + (p_days_forward - 1),
    interval '1 day'
  ) d
  WHERE EXTRACT(isodow FROM d)::integer = v_day_of_week
    AND ((d::date + v_publish_time)::timestamp AT TIME ZONE v_client_tz) > now();
END;
$$;

COMMENT ON FUNCTION m.compute_rule_slot_times(uuid, integer) IS
  'Returns future timestamptz values when a schedule rule should fire over next N days. ISO weekday convention. Stage 5.024.';
```

---

### Migration 025 — `20260426_025_create_slot_unique_constraint.sql`

```sql
-- Stage 5.025 — Add a unique partial index on (client_id, platform, scheduled_publish_at)
-- where status NOT IN terminal states. This lets the materialiser ON CONFLICT DO NOTHING
-- without colliding with old skipped/published slots that might overlap historically.

CREATE UNIQUE INDEX idx_slot_unique_active
  ON m.slot (client_id, platform, scheduled_publish_at)
  WHERE status NOT IN ('skipped','failed','published');

COMMENT ON INDEX m.idx_slot_unique_active IS
  'Unique partial index: prevents materialiser from creating duplicate active slots. Allows historical published/skipped/failed slots to remain alongside re-materialised future slots if days_forward overlaps. Stage 5.025.';
```

---

### Migration 026 — `20260426_026_create_materialise_slots_function.sql`

```sql
-- Stage 5.026 — m.materialise_slots: main materialiser
-- Walks every active client × enabled schedule rule, generates future slot times,
-- and INSERTs them with ON CONFLICT DO NOTHING (uses idx_slot_unique_active).

CREATE OR REPLACE FUNCTION m.materialise_slots(p_days_forward integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count  integer := 0;
  v_rule           record;
  v_slot_time      timestamptz;
  v_format_pref    text[];
  v_preferred_fmt  text;
BEGIN
  FOR v_rule IN
    SELECT
      cps.schedule_id, cps.client_id, cps.platform, cps.day_of_week, cps.publish_time
    FROM c.client_publish_schedule cps
    JOIN c.client c ON c.client_id = cps.client_id AND c.status = 'active'
    WHERE cps.enabled = TRUE
  LOOP
    -- Resolve format_preference for this (client, platform)
    v_format_pref := ARRAY[]::text[];

    IF v_rule.platform = 'facebook' THEN
      SELECT preferred_format_facebook INTO v_preferred_fmt
      FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'facebook'
        AND status = 'active' AND publish_enabled = TRUE
      LIMIT 1;
    ELSIF v_rule.platform = 'instagram' THEN
      SELECT preferred_format_instagram INTO v_preferred_fmt
      FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'instagram'
        AND status = 'active' AND publish_enabled = TRUE
      LIMIT 1;
    ELSIF v_rule.platform = 'linkedin' THEN
      SELECT preferred_format_linkedin INTO v_preferred_fmt
      FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'linkedin'
        AND status = 'active' AND publish_enabled = TRUE
      LIMIT 1;
    ELSIF v_rule.platform = 'youtube' THEN
      -- No preferred_format_youtube column; default per memory note
      v_preferred_fmt := 'video_short_avatar';
    END IF;

    IF v_preferred_fmt IS NOT NULL THEN
      v_format_pref := ARRAY[v_preferred_fmt];
    END IF;

    -- Generate slot times for this rule and INSERT
    FOR v_slot_time IN
      SELECT scheduled_publish_at FROM m.compute_rule_slot_times(v_rule.schedule_id, p_days_forward)
    LOOP
      INSERT INTO m.slot (
        client_id, platform, scheduled_publish_at,
        format_preference, fill_window_opens_at, fill_lead_time_minutes,
        status, source_kind, schedule_id
      ) VALUES (
        v_rule.client_id, v_rule.platform, v_slot_time,
        v_format_pref, v_slot_time - interval '1440 minutes', 1440,
        'future', 'scheduled', v_rule.schedule_id
      )
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        v_inserted_count := v_inserted_count + 1;
      ELSE
        v_skipped_count := v_skipped_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted_count,
    'skipped_already_exist', v_skipped_count,
    'days_forward', p_days_forward,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.materialise_slots(integer) IS
  'Materialises forward slots from c.client_publish_schedule. ON CONFLICT DO NOTHING via idx_slot_unique_active. Sets fill_window_opens_at = scheduled_publish_at - 24h (LD4). Stage 5.026.';
```

---

### Migration 027 — `20260426_027_create_handle_schedule_rule_change_trigger.sql`

```sql
-- Stage 5.027 — Re-materialise affected client's slots on schedule rule change
-- Fires on UPDATE of c.client_publish_schedule.enabled, publish_time, day_of_week.
-- Deletes future-status slots for the affected schedule_id and re-runs materialiser
-- for that client (covering all the client's other schedules too — simpler than
-- per-rule re-materialisation).

CREATE OR REPLACE FUNCTION c.handle_schedule_rule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only re-materialise on meaningful changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.enabled IS NOT DISTINCT FROM NEW.enabled
       AND OLD.publish_time IS NOT DISTINCT FROM NEW.publish_time
       AND OLD.day_of_week IS NOT DISTINCT FROM NEW.day_of_week THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Delete future-status slots tied to the changed schedule
  DELETE FROM m.slot
  WHERE schedule_id = NEW.schedule_id
    AND status = 'future';

  -- Re-materialise (covers all this client's schedules; ON CONFLICT handles duplicates)
  PERFORM m.materialise_slots(7);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION c.handle_schedule_rule_change() IS
  'Trigger function: on c.client_publish_schedule UPDATE of enabled/publish_time/day_of_week, delete affected future slots and re-materialise. Stage 5.027.';

DROP TRIGGER IF EXISTS trg_handle_schedule_rule_change ON c.client_publish_schedule;

CREATE TRIGGER trg_handle_schedule_rule_change
AFTER UPDATE ON c.client_publish_schedule
FOR EACH ROW
EXECUTE FUNCTION c.handle_schedule_rule_change();
```

---

### Migration 028 — `20260426_028_create_promote_slots_to_pending_function.sql`

```sql
-- Stage 5.028 — m.promote_slots_to_pending: future → pending_fill at fill_window_opens_at
-- F8: 10-minute lookahead lets promotion happen slightly early so the fill cron picks
-- up the slot on its next tick.
-- Stage 10 wires this to a 5-minute cron.

CREATE OR REPLACE FUNCTION m.promote_slots_to_pending()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_promoted_count integer;
BEGIN
  UPDATE m.slot
  SET status = 'pending_fill',
      updated_at = now()
  WHERE status = 'future'
    AND fill_window_opens_at <= now() + interval '10 minutes';

  GET DIAGNOSTICS v_promoted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'promoted_count', v_promoted_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.promote_slots_to_pending() IS
  'Promotes future slots to pending_fill when fill_window_opens_at <= now + 10min (F8 buffer). Stage 5.028.';
```

---

## Code changes

None.

---

## Commands to run

```bash
git status
git branch --show-current
git pull origin feature/slot-driven-v3-build

git add supabase/migrations/20260426_024_create_compute_rule_slot_times_function.sql
git add supabase/migrations/20260426_025_create_slot_unique_constraint.sql
git add supabase/migrations/20260426_026_create_materialise_slots_function.sql
git add supabase/migrations/20260426_027_create_handle_schedule_rule_change_trigger.sql
git add supabase/migrations/20260426_028_create_promote_slots_to_pending_function.sql

git commit -m "feat(slot-driven): Stage 5 — slot materialiser + promoter + rule-change trigger

Phase A foundation continued. R6 stays paused.

- m.compute_rule_slot_times(uuid, int): per-rule future timestamp generator,
  honours c.client.timezone, ISO weekday convention.
- idx_slot_unique_active: partial unique index on (client_id, platform,
  scheduled_publish_at) WHERE status NOT IN terminal states.
- m.materialise_slots(p_days_forward int DEFAULT 7): main materialiser.
  Walks active clients × enabled schedule rules, INSERTs with ON CONFLICT.
  Sets format_preference from c.client_publish_profile.preferred_format_<platform>
  (default video_short_avatar for youtube). LD4 fill_lead_time_minutes=1440.
- c.handle_schedule_rule_change() trigger on c.client_publish_schedule UPDATE
  of enabled/publish_time/day_of_week. Deletes future slots + re-materialises.
- m.promote_slots_to_pending(): future → pending_fill where
  fill_window_opens_at <= now + 10min (F8 buffer).

After CC pushes, Claude (chat) applies migrations + runs initial
m.materialise_slots(7) to populate ~70 forward slots.

Promote function is callable but not yet wired to a cron (Stage 6/10
registers crons). Without the cron, no slot transitions to pending_fill
yet; fill function (Stage 8) won't pick anything up.

Refs: 26d88b8 (v4), a8b0c1f (Stage 4)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

```
## Stage 5 CC report (git side only)

- ✅ Pre-flight passed: yes/no
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 5/5
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No materialise_slots call.
Awaiting Claude (chat) to apply migrations 024–028 via MCP and run initial materialisation.
```

---

## Verification queries Claude (chat) will run

```sql
-- V1: 4 functions + 1 trigger + 1 unique index exist
SELECT 'function' AS kind, proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE proname IN (
  'compute_rule_slot_times','materialise_slots',
  'promote_slots_to_pending','handle_schedule_rule_change'
)
UNION ALL
SELECT 'trigger', tgname FROM pg_trigger WHERE tgname = 'trg_handle_schedule_rule_change'
UNION ALL
SELECT 'index', indexname FROM pg_indexes
WHERE schemaname='m' AND indexname='idx_slot_unique_active'
ORDER BY kind, proname;
-- EXPECTED: 4 functions, 1 trigger, 1 index = 6 rows total

-- V2: Pre-materialisation slot count
SELECT COUNT(*) AS slots_before FROM m.slot;
-- EXPECTED: 0

-- V3: compute_rule_slot_times works for one rule
SELECT scheduled_publish_at
FROM m.compute_rule_slot_times(
  (SELECT schedule_id FROM c.client_publish_schedule WHERE enabled = TRUE LIMIT 1),
  7
)
ORDER BY scheduled_publish_at
LIMIT 10;
-- EXPECTED: rows with future timestamptz values (ascending)

-- V4: Run initial materialisation
SELECT m.materialise_slots(7);
-- EXPECTED: jsonb {inserted: ~50–70, skipped_already_exist: 0, days_forward: 7, ran_at: ...}
-- (Range depends on what weekday today is — fewer slots if we're partway through the week.)

-- V5: Post-materialisation state
SELECT
  c.client_name,
  s.platform,
  COUNT(*) AS slots,
  array_agg(s.format_preference[1] ORDER BY s.scheduled_publish_at) FILTER (
    WHERE s.format_preference[1] IS NOT NULL
  ) AS first_formats,
  MIN(s.scheduled_publish_at) AS earliest,
  MAX(s.scheduled_publish_at) AS latest
FROM m.slot s
JOIN c.client c ON c.client_id = s.client_id
WHERE s.status = 'future'
GROUP BY c.client_name, s.platform
ORDER BY c.client_name, s.platform;
-- EXPECTED: rows for active client+platform pairs;
--   slot counts vary by remaining weekdays in 7-day window (3-5 typically)
--   format_preference matches client's preferred_format_<platform> setting

-- V6: All slots have correct fill_window_opens_at offset
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE fill_window_opens_at = scheduled_publish_at - interval '1440 minutes') AS correct_offset,
  COUNT(*) FILTER (WHERE fill_lead_time_minutes = 1440) AS correct_lead_time
FROM m.slot
WHERE status = 'future';
-- EXPECTED: total = correct_offset = correct_lead_time

-- V7: promote_slots_to_pending callable with 0 result
SELECT m.promote_slots_to_pending();
-- EXPECTED: jsonb {promoted_count: 0, ran_at: ...}
-- 0 because no slot is yet within 10 minutes of its 24h-prior fill window opening.

-- V8: R6 still paused, publishing pipeline untouched
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
SELECT status, COUNT(*) FROM m.post_publish_queue GROUP BY status;
```

---

## Rollback (if any verification fails)

```sql
-- DELETE all materialised slots first (FKs from m.post_draft.slot_id are nullable, no cascade issue)
DELETE FROM m.slot;

DROP TRIGGER IF EXISTS trg_handle_schedule_rule_change ON c.client_publish_schedule;
DROP FUNCTION IF EXISTS c.handle_schedule_rule_change();
DROP FUNCTION IF EXISTS m.promote_slots_to_pending();
DROP FUNCTION IF EXISTS m.materialise_slots(integer);
DROP FUNCTION IF EXISTS m.compute_rule_slot_times(uuid, integer);
DROP INDEX IF EXISTS m.idx_slot_unique_active;
```

Old pipeline unaffected. R6 still paused.

---

## Notes for after Stage 5 verifies

- **Stage 6** is the LAST Phase A stage: register all Phase A crons (expire hourly, reconcile daily, backfill every 15min, materialise nightly, promote every 5min) + heartbeat infrastructure → **GATE A**.
- After Stage 6 + Gate A passes, Phase B begins: confidence functions, the fill function (Stage 8 — the heart of v3), recovery, breaking news, ai-worker idempotency, shadow mode.

After Stage 5, the system has both supply (1,668 pool entries) and demand (~70 future slots). What's missing: the function that connects them (Stage 8 fill) and the cron that fires it (Stage 10).

---

*End Stage 5 brief. v4 commit `26d88b8`. Stage 4 closed at `a8b0c1f`. Author: Claude (chat). For execution by: Claude Code (local).*
