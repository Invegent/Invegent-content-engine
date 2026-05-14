# cc-0014 — Friction Register Capture Experiment

**Brief ID:** cc-0014
**Version:** v1.1
**Status:** Authored, awaiting re-fire of D-01 on Stage A after v1.1 patch
**Authored:** 2026-05-14 Sydney (v1.0); patched 2026-05-14 (v1.1)
**Author:** Chat-side Claude with PK approval
**Strategic anchor:** `docs/strategy/IOL_friction_register_v0.4.md` (v0.4 final-form, four review rounds)
**Depends on:** cc-0012 (op.* views, used as reference architecture only — no dependency on cc-0013 build state)
**Schema:** new `friction.*` schema in Supabase `mbkmaxqhsohbtwsqolns`

**v1.1 patch summary:** D-01 review on v1.0 returned `partial` with `escalate_explicit_flag` (review_id `903cfd8e-5c59-45d5-a310-1e2ff35ef93e`). Pushback point 3 (pre-experiment cleanup robustness) was reclassified as type-(b) genuine: convention-only enforcement of append-only is structurally weaker than the brief's own discipline argument requires. v1.1 adds two triggers to Stage A: `fn_prevent_delete_during_run` (blocks DELETE on `friction.event` and `friction.case` while any `experiment_run.status='running'`) and `fn_lock_criteria_snapshot` (prevents UPDATE on `friction.experiment_run.criteria_snapshot` while status=running). Two new V-checks added (V-A10, V-A11). Pre-experiment test-row cleanup still works because it executes BEFORE `experiment_run.status='running'`. Pushback points 1 (cc-0008 grants class) and 2 (CHECK constraint race conditions) classified as type-(c) generic consistency-bias — ChatGPT did not surface concrete new evidence beyond what was already in v1.0's Section 3 grants matrix and Section 6 CHECK constraints.

---

## 1. Strategic anchor

This brief implements the friction register capture experiment specified in v0.4. The experiment tests whether a consolidated friction register — one place where issues from reconciliation, the nightly health check, and PK's manual observations all live — produces operational signal worth the cost of maintaining it. The experiment runs for 14 days after build completion. Verdict at Day 19 is binary: pass (next-layer design unlocked), fail (table archived, postmortem authored), or invalid (instrument failure, redesign required).

This brief does not re-litigate v0.4's design. The v0.4 strategic doc is assumed read.

---

## 2. Scope summary

### In scope

- Schema for `friction.event`, `friction.case`, `friction.category`, `friction.emit_error`, `friction.experiment_run` tables
- Reconciliation emitter (SQL trigger on `r.cadence_drift_log`)
- Health check emitter (extension to Cowork brief `nightly-health-check-v1` v2.1 → v3.0, dual-write)
- Manual capture form in invegent-dashboard (floating action button reachable from any route)
- Read surface (`/operations` route) for case triage
- Daily verification of health check emission (ID-level, pg_cron-scheduled)
- Day-19 scoring queries (SQL) for compound success criterion

### Out of scope

- AI clustering of any kind
- Playbooks or action catalogue
- Brief runner or autonomous execution
- Dry-run engine
- Health check pg_cron migration (deferred per Option Z)
- CC failure emitter
- Customer-facing register surface
- Autonomy ladder design

### Rejected from v0.3 review with reasoning

- **External-dependency auto-emitter:** rejected. The experiment does not need to test every category; external dependencies can be captured manually if encountered during the window.
- **Formal action_list duplication audit at Day-19:** rejected. Replaced with a single lightweight question in the postmortem.
- **Move category off manual form:** rejected. Category required at capture with last-choice default to avoid under-load classification cost.
- **30-day archive expiry on failure:** rejected. Over-engineering for a 14-day experiment. Archive on failure, postmortem within 14 days, drop only if explicitly approved post-postmortem.

---

## 3. Cross-cutting: grants, RLS, and security V-checks

**This section is non-negotiable. The cc-0008 service_role grants defect demonstrates this class of error has materialized before. Every stage must verify role grants explicitly.**

### Role access matrix

| Role | `friction.event` | `friction.case` | `friction.category` | `friction.emit_error` | `friction.experiment_run` |
|---|---|---|---|---|---|
| `service_role` | SELECT, INSERT (via emitters and functions only) | SELECT, INSERT, UPDATE | SELECT | SELECT, INSERT | SELECT, INSERT, UPDATE |
| `authenticated` | SELECT (via RPC only) | SELECT (via RPC only), UPDATE (triage fields only, via RPC) | SELECT | none | SELECT |
| `anon` | none | none | none | none | none |
| `postgres` (DDL/admin) | full | full | full | full | full |

**Schema usage grants:** `service_role` and `authenticated` need `USAGE` on the `friction` schema. `anon` does not.

**Function execution:** All write paths go through `SECURITY DEFINER` functions owned by `postgres`. No direct INSERT/UPDATE from `authenticated` to any `friction.*` table. Manual form writes via `friction.fn_emit_manual_event` only.

**RLS:** Not enabled on `friction.*` tables for the experiment. Single-operator scope. RLS becomes required if a customer-facing surface is ever built; that is out of scope here.

### V-checks per stage on security

Each stage that touches a `friction.*` table includes a security V-check block that proves:
1. The expected role can do what it should do
2. Roles that should NOT have access fail with a permission error
3. `SECURITY DEFINER` functions execute correctly when called by `authenticated`
4. No grant exists that wasn't explicitly intended

Stage A creates the grants. Stages B/C/D test them in their specific code paths.

---

## 4. Cross-cutting: emitter error sink

All emitters write failures to `friction.emit_error`. No silent failure. The schema:

```sql
CREATE TABLE friction.emit_error (
  error_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source            text NOT NULL,
  source_event_id   text,
  error_at          timestamptz NOT NULL DEFAULT now(),
  error_message     text NOT NULL,
  error_code        text,
  raw_payload       jsonb,
  emitter_version   text
);

CREATE INDEX ON friction.emit_error (source, error_at DESC);
```

Each emitter wraps its `INSERT` to `friction.event` in an exception handler. On failure: the source workflow continues unaffected, the error gets logged to `friction.emit_error`, and the row is NOT retried automatically (preventing infinite-loop defects).

Day-19 invalidation criterion: total `friction.emit_error` rows during the experiment window exceeding 40% of total `friction.event` rows from the same source = emitter contract failure = experiment invalid.

---

## 5. Cross-cutting: experiment run boundary and test-data cleanup

### `friction.experiment_run` table

```sql
CREATE TABLE friction.experiment_run (
  run_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id            text NOT NULL,             -- 'cc-0014'
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','running','passed','failed','invalid','archived')),
  criteria_locked_at  timestamptz NOT NULL,
  criteria_snapshot   jsonb NOT NULL,            -- frozen criteria text + thresholds, immutable
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

One row created at the end of Stage E, marking experiment start. `criteria_snapshot` captures the verbatim success criterion text and all threshold values, so Day-19 evaluation cannot drift from what was locked.

### Test-data cleanup convention

**The append-only property of `friction.event` applies during the experiment window only.** Before the window starts, test rows may be deleted via an explicit pre-experiment cleanup step.

Convention: every V-check INSERT during Stages A through D uses `source_event_id LIKE 'cc-0014-test/%'`. This makes test rows visually distinct and individually cleanable.

End of Stage E, before creating the `experiment_run` row:
1. Run cleanup query: `DELETE FROM friction.event WHERE source_event_id LIKE 'cc-0014-test/%'` and `DELETE FROM friction.case WHERE case_title LIKE 'cc-0014-test/%'`
2. Verify zero test rows remain
3. Create `experiment_run` row with `status='running'` and `starts_at=now()`
4. From this moment, `friction.event` is append-only until experiment end

---

## 6. Stage A — Schema authoring

### Pre-flight verification

Before applying the migration, verify no naming conflicts:

```sql
-- Schema must not already exist
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'friction';

-- No conflicting tables in other schemas (sanity check)
SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN ('event', 'case', 'category', 'emit_error', 'experiment_run') AND table_schema NOT IN ('pg_catalog', 'information_schema');
```

Both queries should return zero rows. If not, hard-stop and investigate before proceeding.

### Migration

Migration name: `cc_0014_a_friction_schema`. Applied via `apply_migration` MCP.

```sql
CREATE SCHEMA friction;
GRANT USAGE ON SCHEMA friction TO service_role, authenticated;

-- Category reference table
CREATE TABLE friction.category (
  category_code        text PRIMARY KEY,
  display_label        text NOT NULL,
  default_sla_hours    integer,
  description          text NOT NULL,
  counts_for_success   boolean NOT NULL DEFAULT true,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

INSERT INTO friction.category (category_code, display_label, default_sla_hours, description, counts_for_success) VALUES
  ('client_commitment',    'Client commitment',    24,  'A promise to a client (cadence, platform, content type) is at risk or broken', true),
  ('pipeline_integrity',   'Pipeline integrity',   48,  'The engine itself is misbehaving — stuck items, EF failures, cron drift, security findings', true),
  ('operator_friction',    'Operator friction',    NULL, 'Something makes ICE harder to operate — UI bug, missing affordance, navigation pain', true),
  ('external_dependency',  'External dependency',  72,  'Something outside ICE is blocked or stale — API approvals, OAuth expirations, vendor responses', true),
  ('content_quality',      'Content quality',      24,  'Output quality issue — wrong tone, factual error, compliance miss', true),
  ('unclassified',         'Unclassified',         NULL, 'Triage placeholder — must be reclassified before quality_flag can be set', false);

-- Events table
CREATE TABLE friction.event (
  event_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source              text NOT NULL CHECK (source IN ('reconciliation', 'health_check', 'manual')),
  source_event_id     text NOT NULL,
  observed_at         timestamptz NOT NULL,
  severity            text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  category            text NOT NULL REFERENCES friction.category(category_code),
  category_source     text NOT NULL DEFAULT 'emitter_default' CHECK (category_source IN ('emitter_default', 'manual_at_capture', 'triage_override')),
  reported_by         text NOT NULL CHECK (reported_by IN ('system', 'pk', 'client', 'vendor', 'unknown')),
  problem_key         text NOT NULL,
  observation_text    text NOT NULL,
  related_object      jsonb,
  raw_payload         jsonb,
  dedupe_fingerprint  text NOT NULL,
  emitted_at          timestamptz NOT NULL DEFAULT now(),
  case_id             uuid,
  UNIQUE (source, source_event_id)
);

CREATE INDEX ON friction.event (observed_at DESC);
CREATE INDEX ON friction.event (dedupe_fingerprint);
CREATE INDEX ON friction.event (category, severity);
CREATE INDEX ON friction.event (case_id) WHERE case_id IS NOT NULL;
CREATE INDEX ON friction.event (problem_key);

-- Cases table
CREATE TABLE friction.case (
  case_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_title           text NOT NULL,
  first_seen_at        timestamptz NOT NULL,
  last_seen_at         timestamptz NOT NULL,
  event_count          integer NOT NULL DEFAULT 1,
  severity             text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  category             text NOT NULL REFERENCES friction.category(category_code),
  problem_key          text NOT NULL,
  triage_state         text NOT NULL DEFAULT 'new' CHECK (triage_state IN ('new', 'acknowledged', 'duplicate', 'ignored')),
  quality_flag         boolean,
  capture_reason       text CHECK (capture_reason IN ('missed_without_register', 'would_have_deferred', 'would_have_rediscovered', 'centralized_context', 'routine_log', 'other')),
  capture_reason_note  text,
  action_decision      text CHECK (action_decision IN ('act_now', 'track', 'defer_intentionally', 'suppress', 'ignore', 'duplicate')),
  next_review_at       timestamptz,
  suppression_reason   text,
  notes                text,
  reviewed_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  -- Row-validity rules (NOT success criterion enforcement; that is in Day-19 queries)
  CONSTRAINT quality_flag_requires_real_category CHECK (
    quality_flag IS NULL OR category != 'unclassified'
  ),
  CONSTRAINT track_or_defer_requires_next_review CHECK (
    (action_decision NOT IN ('track', 'defer_intentionally')) OR (next_review_at IS NOT NULL)
  ),
  CONSTRAINT suppress_requires_reason CHECK (
    (action_decision != 'suppress') OR (suppression_reason IS NOT NULL)
  ),
  CONSTRAINT capture_reason_note_required_for_incrementality CHECK (
    (capture_reason NOT IN ('missed_without_register', 'would_have_deferred', 'would_have_rediscovered')) OR (capture_reason_note IS NOT NULL)
  )
);

CREATE INDEX ON friction.case (triage_state, severity);
CREATE INDEX ON friction.case (category);
CREATE INDEX ON friction.case (next_review_at) WHERE next_review_at IS NOT NULL;
CREATE INDEX ON friction.case (problem_key);

-- Foreign key from event to case (deferred so events can exist before being grouped)
ALTER TABLE friction.event ADD CONSTRAINT event_case_fk FOREIGN KEY (case_id) REFERENCES friction.case(case_id) DEFERRABLE INITIALLY DEFERRED;

-- Emitter error sink (per Section 4)
CREATE TABLE friction.emit_error (
  error_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source            text NOT NULL,
  source_event_id   text,
  error_at          timestamptz NOT NULL DEFAULT now(),
  error_message     text NOT NULL,
  error_code        text,
  raw_payload       jsonb,
  emitter_version   text
);
CREATE INDEX ON friction.emit_error (source, error_at DESC);

-- Experiment run boundary (per Section 5)
CREATE TABLE friction.experiment_run (
  run_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id            text NOT NULL,
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','running','passed','failed','invalid','archived')),
  criteria_locked_at  timestamptz NOT NULL,
  criteria_snapshot   jsonb NOT NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- DELETE-protection trigger (D-01 review pushback 3 — patch v1.1)
-- Enforces append-only on friction.event and friction.case when any experiment_run is running.
-- Pre-experiment cleanup of 'cc-0014-test/%' rows happens BEFORE experiment_run.status='running',
-- so test-row cleanup is unaffected. After status='running', DELETE is blocked.
-- Also prevents UPDATE on criteria_snapshot to keep the verdict basis immutable.
CREATE OR REPLACE FUNCTION friction.fn_prevent_delete_during_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM friction.experiment_run WHERE status = 'running') THEN
    RAISE EXCEPTION 'DELETE on friction.% is blocked while an experiment_run is active (status=running). Wait until status transitions to passed/failed/invalid/archived.', TG_TABLE_NAME
      USING ERRCODE = 'P0001', HINT = 'Use UPDATE to mark cases as ignored/duplicate instead of DELETE during the experiment window.';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER friction_event_no_delete_during_run
BEFORE DELETE ON friction.event
FOR EACH ROW
EXECUTE FUNCTION friction.fn_prevent_delete_during_run();

CREATE TRIGGER friction_case_no_delete_during_run
BEFORE DELETE ON friction.case
FOR EACH ROW
EXECUTE FUNCTION friction.fn_prevent_delete_during_run();

-- Criteria snapshot immutability trigger (D-01 review pushback 3 — same patch)
-- Prevents UPDATE on criteria_snapshot once the run is active. Other columns (status, notes, updated_at) remain mutable.
CREATE OR REPLACE FUNCTION friction.fn_lock_criteria_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
BEGIN
  IF OLD.status = 'running' AND OLD.criteria_snapshot IS DISTINCT FROM NEW.criteria_snapshot THEN
    RAISE EXCEPTION 'UPDATE on friction.experiment_run.criteria_snapshot is blocked while status=running.'
      USING ERRCODE = 'P0001', HINT = 'criteria_snapshot is the verdict basis and must not change mid-experiment.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER friction_experiment_run_criteria_immutable
BEFORE UPDATE ON friction.experiment_run
FOR EACH ROW
EXECUTE FUNCTION friction.fn_lock_criteria_snapshot();

-- Grants per Section 3
GRANT SELECT, INSERT ON friction.event TO service_role;
GRANT SELECT, INSERT, UPDATE ON friction.case TO service_role;
GRANT SELECT ON friction.category TO service_role, authenticated;
GRANT SELECT, INSERT ON friction.emit_error TO service_role;
GRANT SELECT, INSERT, UPDATE ON friction.experiment_run TO service_role;
GRANT SELECT ON friction.experiment_run TO authenticated;
-- 'authenticated' write access is via SECURITY DEFINER functions only, created in later stages
```

### V-checks for Stage A

V-A1 — schema exists:
```sql
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'friction';
-- Must return 1 row
```

V-A2 — all five tables exist:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'friction' ORDER BY table_name;
-- Must return: case, category, emit_error, event, experiment_run (5 rows)
```

V-A3 — category seed data:
```sql
SELECT category_code, counts_for_success FROM friction.category ORDER BY category_code;
-- Must return 6 rows, with unclassified.counts_for_success = false, all others = true
```

V-A4 — CHECK constraint on quality_flag (should FAIL):
```sql
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, quality_flag) 
VALUES ('00000000-0000-0000-0000-000000000001', 'cc-0014-test/v-a4', now(), now(), 'info', 'unclassified', 'cc-0014-test', true);
-- MUST raise error: quality_flag_requires_real_category
```

V-A5 — CHECK constraint on next_review_at (should FAIL):
```sql
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, action_decision) 
VALUES ('00000000-0000-0000-0000-000000000002', 'cc-0014-test/v-a5', now(), now(), 'info', 'operator_friction', 'cc-0014-test', 'track');
-- MUST raise error: track_or_defer_requires_next_review
```

V-A6 — CHECK constraint on suppression_reason (should FAIL):
```sql
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, action_decision) 
VALUES ('00000000-0000-0000-0000-000000000003', 'cc-0014-test/v-a6', now(), now(), 'info', 'operator_friction', 'cc-0014-test', 'suppress');
-- MUST raise error: suppress_requires_reason
```

V-A7 — grants verification (service_role can INSERT):
```sql
SET ROLE service_role;
INSERT INTO friction.event (source, source_event_id, observed_at, severity, category, reported_by, problem_key, observation_text, dedupe_fingerprint) 
VALUES ('manual', 'cc-0014-test/v-a7', now(), 'info', 'operator_friction', 'pk', 'cc-0014-test', 'V-A7 grant test', 'cc-0014-test-fingerprint');
-- MUST succeed
RESET ROLE;
```

V-A8 — grants verification (anon CANNOT SELECT):
```sql
SET ROLE anon;
SELECT * FROM friction.event LIMIT 1;
-- MUST fail with permission denied
RESET ROLE;
```

V-A9 — test row cleanup:
```sql
DELETE FROM friction.event WHERE source_event_id LIKE 'cc-0014-test/%';
SELECT count(*) FROM friction.event WHERE source_event_id LIKE 'cc-0014-test/%';
-- Must return 0
```

V-A10 — DELETE-protection trigger fires only when experiment_run is active (patch v1.1):
```sql
-- Seed a test event (no active run, so DELETE should succeed)
INSERT INTO friction.event (source, source_event_id, observed_at, severity, category, reported_by, problem_key, observation_text, dedupe_fingerprint)
VALUES ('manual', 'cc-0014-test/v-a10', now(), 'info', 'operator_friction', 'pk', 'cc-0014-test', 'V-A10 trigger test', 'cc-0014-test-v-a10');

-- Before any experiment_run exists with status='running', DELETE must succeed
DELETE FROM friction.event WHERE source_event_id = 'cc-0014-test/v-a10';
-- Must succeed (returns 1 deleted row)

-- Now seed an active experiment_run
INSERT INTO friction.experiment_run (run_id, brief_id, starts_at, ends_at, status, criteria_locked_at, criteria_snapshot)
VALUES ('00000000-0000-0000-0000-cc0014va10', 'cc-0014-test', now(), now() + INTERVAL '14 days', 'running', now(), '{"test": true}'::jsonb);

-- Reinsert the test event
INSERT INTO friction.event (source, source_event_id, observed_at, severity, category, reported_by, problem_key, observation_text, dedupe_fingerprint)
VALUES ('manual', 'cc-0014-test/v-a10-2', now(), 'info', 'operator_friction', 'pk', 'cc-0014-test', 'V-A10 trigger test 2', 'cc-0014-test-v-a10-2');

-- DELETE must now FAIL with the trigger's exception
DELETE FROM friction.event WHERE source_event_id = 'cc-0014-test/v-a10-2';
-- MUST raise error: DELETE on friction.event is blocked while an experiment_run is active

-- Cleanup: archive the test run, then delete the test event and the run
UPDATE friction.experiment_run SET status = 'archived' WHERE run_id = '00000000-0000-0000-0000-cc0014va10';
DELETE FROM friction.event WHERE source_event_id = 'cc-0014-test/v-a10-2';
-- Must succeed now that status != 'running'
DELETE FROM friction.experiment_run WHERE run_id = '00000000-0000-0000-0000-cc0014va10';
```

V-A11 — criteria_snapshot immutability while running (patch v1.1):
```sql
-- Seed an active run
INSERT INTO friction.experiment_run (run_id, brief_id, starts_at, ends_at, status, criteria_locked_at, criteria_snapshot)
VALUES ('00000000-0000-0000-0000-cc0014va11', 'cc-0014-test', now(), now() + INTERVAL '14 days', 'running', now(), '{"original": true}'::jsonb);

-- Attempt to mutate criteria_snapshot while status=running
UPDATE friction.experiment_run 
SET criteria_snapshot = '{"tampered": true}'::jsonb 
WHERE run_id = '00000000-0000-0000-0000-cc0014va11';
-- MUST raise error: UPDATE on friction.experiment_run.criteria_snapshot is blocked while status=running

-- UPDATE on other columns must still succeed
UPDATE friction.experiment_run 
SET notes = 'V-A11 test note' 
WHERE run_id = '00000000-0000-0000-0000-cc0014va11';
-- Must succeed

-- Cleanup: archive then delete
UPDATE friction.experiment_run SET status = 'archived' WHERE run_id = '00000000-0000-0000-0000-cc0014va11';
DELETE FROM friction.experiment_run WHERE run_id = '00000000-0000-0000-0000-cc0014va11';
```

### Hard-stop conditions

- Migration apply fails for any reason
- Any of V-A1, V-A2, V-A3 returns wrong shape
- V-A4, V-A5, V-A6 do NOT raise their expected errors (constraint not enforced)
- V-A7 fails (service_role write blocked)
- V-A8 succeeds (anon can read — overpermission)
- V-A9 leaves test rows behind
- V-A10 fails (DELETE-protection trigger broken — either always blocks or never blocks)
- V-A11 fails (criteria_snapshot mutable during run — verdict basis compromised)

### Rollback path

`DROP SCHEMA friction CASCADE;`

No external dependencies at this stage. Rollback is clean.

---

## 7. Stage B — Reconciliation emitter

### Pre-flight verification

```sql
-- Source table unchanged
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'r' AND table_name = 'cadence_drift_log' ORDER BY ordinal_position;
-- Expect: cadence_drift_log_id, drift_check_run_id, client_id, platform, drift_type, drift_severity, observation_window_start, observation_window_end, expected_publication_id, observed_count, expected_count, drift_details, created_at, created_by_run_id, updated_at, updated_by_run_id

-- No existing trigger on the source
SELECT trigger_name FROM information_schema.triggers WHERE event_object_schema = 'r' AND event_object_table = 'cadence_drift_log';
-- Must return zero or only previously-known triggers (not 'friction_emit_reconciliation')
```

### Migration

Migration name: `cc_0014_b_reconciliation_emitter`.

```sql
-- Translation function: r.cadence_drift_log row -> friction.event row
CREATE OR REPLACE FUNCTION friction.fn_emit_reconciliation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, r, c, public
AS $$
DECLARE
  v_client_name text;
  v_observation_text text;
  v_problem_key text;
  v_severity text;
  v_dedupe_fingerprint text;
  v_related_object jsonb;
BEGIN
  -- Severity mapping (drift_severity to event severity)
  v_severity := COALESCE(NEW.drift_severity, 'info');
  IF v_severity NOT IN ('info', 'warn', 'critical') THEN
    v_severity := 'info';
  END IF;

  -- Problem key from drift_type
  v_problem_key := COALESCE(NEW.drift_type, 'unknown_drift');

  -- Client name lookup
  SELECT client_name INTO v_client_name FROM c.client WHERE client_id = NEW.client_id;
  v_client_name := COALESCE(v_client_name, 'unknown_client');

  -- Observation text
  v_observation_text := format(
    '%s for %s on %s. Window: %s to %s. Observed: %s, Expected: %s.',
    NEW.drift_type, v_client_name, NEW.platform,
    NEW.observation_window_start, NEW.observation_window_end,
    COALESCE(NEW.observed_count::text, 'n/a'), COALESCE(NEW.expected_count::text, 'n/a')
  );

  -- Related object
  v_related_object := jsonb_build_object(
    'type', 'client_platform',
    'client_id', NEW.client_id,
    'client_name', v_client_name,
    'platform', NEW.platform
  );

  -- Dedupe fingerprint (no day component; recurrence via 7-day case lookup)
  v_dedupe_fingerprint := md5('reconciliation' || '|' || v_problem_key || '|' || NEW.client_id::text || '|' || NEW.platform || '|' || 'client_commitment');

  -- Emit, with defensive error handling
  BEGIN
    INSERT INTO friction.event (
      source, source_event_id, observed_at, severity, category, category_source,
      reported_by, problem_key, observation_text, related_object, raw_payload, dedupe_fingerprint
    ) VALUES (
      'reconciliation',
      'r.cadence_drift_log/' || NEW.cadence_drift_log_id::text,
      NEW.created_at,
      v_severity,
      'client_commitment',
      'emitter_default',
      'system',
      v_problem_key,
      v_observation_text,
      v_related_object,
      jsonb_build_object(
        'drift_type', NEW.drift_type,
        'drift_severity', NEW.drift_severity,
        'drift_details', NEW.drift_details,
        'observed_count', NEW.observed_count,
        'expected_count', NEW.expected_count,
        'observation_window_start', NEW.observation_window_start,
        'observation_window_end', NEW.observation_window_end
      ),
      v_dedupe_fingerprint
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log to emit_error, never raise
    INSERT INTO friction.emit_error (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
    VALUES (
      'reconciliation',
      'r.cadence_drift_log/' || NEW.cadence_drift_log_id::text,
      SQLERRM, SQLSTATE,
      row_to_json(NEW)::jsonb,
      'cc-0014-v1.0'
    );
  END;

  RETURN NEW;
END $$;

-- Trigger
CREATE TRIGGER friction_emit_reconciliation
AFTER INSERT ON r.cadence_drift_log
FOR EACH ROW
EXECUTE FUNCTION friction.fn_emit_reconciliation_event();

-- Grants
REVOKE EXECUTE ON FUNCTION friction.fn_emit_reconciliation_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_emit_reconciliation_event() TO postgres;
-- service_role does not need EXECUTE; the trigger runs as the function's owner (postgres) under SECURITY DEFINER
```

### V-checks for Stage B

V-B1 — manual test INSERT to source produces event:
```sql
INSERT INTO r.cadence_drift_log (cadence_drift_log_id, drift_check_run_id, client_id, platform, drift_type, drift_severity, observation_window_start, observation_window_end, observed_count, expected_count, drift_details, created_at, created_by_run_id)
VALUES (
  '00000000-0000-0000-0000-cc0014test01'::uuid,
  '00000000-0000-0000-0000-cc0014test01'::uuid,
  (SELECT client_id FROM c.client WHERE client_name = 'NDIS-Yarns' LIMIT 1),
  'instagram',
  'observer_stale',
  'info',
  '2026-05-01', '2026-05-14',
  0, 0,
  '{"reason": "cc-0014-test/v-b1"}'::jsonb,
  now(),
  '00000000-0000-0000-0000-cc0014test01'::uuid
);

SELECT count(*) FROM friction.event 
WHERE source = 'reconciliation' 
  AND source_event_id = 'r.cadence_drift_log/00000000-0000-0000-0000-cc0014test01';
-- Must return 1
```

V-B2 — translation fields correct:
```sql
SELECT problem_key, category, reported_by, category_source, severity 
FROM friction.event 
WHERE source_event_id = 'r.cadence_drift_log/00000000-0000-0000-0000-cc0014test01';
-- Must return: observer_stale, client_commitment, system, emitter_default, info
```

V-B3 — defensive failure: malformed source data does NOT break source INSERT.

Simulated by temporarily making `friction.event` reject one specific source_event_id via a temporary CHECK, then INSERTing a row that would trigger emission. Source INSERT should succeed; `friction.emit_error` should have a new row.

V-B4 — security: anon cannot trigger this function (function is SECURITY DEFINER, but trigger fires only on `r.cadence_drift_log` INSERTs which anon cannot perform).
```sql
SET ROLE anon;
INSERT INTO r.cadence_drift_log (...) VALUES (...);
-- Must fail with permission denied on r.cadence_drift_log
RESET ROLE;
```

V-B5 — test row cleanup:
```sql
DELETE FROM friction.event WHERE source_event_id LIKE 'cc-0014-test/%' OR source_event_id LIKE 'r.cadence_drift_log/00000000-0000-0000-0000-cc0014test%';
DELETE FROM friction.emit_error WHERE source_event_id LIKE 'cc-0014-test/%' OR source_event_id LIKE 'r.cadence_drift_log/00000000-0000-0000-0000-cc0014test%';
DELETE FROM r.cadence_drift_log WHERE cadence_drift_log_id = '00000000-0000-0000-0000-cc0014test01';
```

### Hard-stop conditions

- Trigger creation fails
- V-B1, V-B2 fail or return wrong shape
- V-B3: source INSERT raises an error (defensive handling broken)
- V-B4 succeeds (anon can write to `r.cadence_drift_log`)

### Rollback path

```sql
DROP TRIGGER IF EXISTS friction_emit_reconciliation ON r.cadence_drift_log;
DROP FUNCTION IF EXISTS friction.fn_emit_reconciliation_event();
```

Source table `r.cadence_drift_log` unaffected.

---

## 8. Stage C — Health check emitter

**HARD-STOP: If Stage C fails to deliver a working dual-write before experiment start, the experiment is cancelled. Health check is the dominant signal source. Without it, criterion 3 (source mix) becomes manual + reconciliation only, which is a meaningfully different test.**

### Scope of Stage C

Two modifications, atomically delivered:

1. **Cowork brief `nightly-health-check-v1` v2.1 → v3.0:** add stable `finding_id` to each priority finding in Section 10. Each finding becomes one `friction.event` row at run completion.
2. **Daily verification cron** (`friction-verification-daily`) running in pg_cron, comparing `friction.event` rows from the previous night to the source markdown file's findings.

### Brief modification (Cowork side)

The brief becomes `nightly-health-check-v1` v3.0 with these additions:

- Each priority finding in Section 10 gets a stable anchor of form `priority-N/short-key` (e.g. `priority-1/linkedin-ndis-yarns-stuck`, `priority-2/s17-escalation-rate`)
- After writing the markdown file, the brief calls `friction.fn_emit_health_check_findings(run_id, findings)` where `findings` is a JSONB array of priority findings
- On any emission failure, the brief logs to `friction.emit_error` and continues to next finding (no abort)
- The brief publishes a run summary including emission success count and emission failure count

### Migration (Supabase side)

Migration name: `cc_0014_c_health_check_emitter`.

```sql
-- Emission function
CREATE OR REPLACE FUNCTION friction.fn_emit_health_check_findings(
  p_run_id text,
  p_markdown_path text,
  p_findings jsonb  -- array of {finding_id, priority, severity, title, observation_text, related_object, raw_payload}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_finding jsonb;
  v_success_count integer := 0;
  v_failure_count integer := 0;
  v_severity text;
  v_problem_key text;
  v_dedupe_fingerprint text;
BEGIN
  FOR v_finding IN SELECT jsonb_array_elements(p_findings) LOOP
    BEGIN
      -- Severity mapping (priority 1/2/3 -> critical/warn/info)
      v_severity := CASE COALESCE(v_finding->>'priority', '3')
        WHEN '1' THEN 'critical'
        WHEN '2' THEN 'warn'
        ELSE 'info'
      END;

      -- Problem key from finding_id (after the priority prefix)
      v_problem_key := COALESCE(
        regexp_replace(v_finding->>'finding_id', '^priority-[0-9]+/', ''),
        'unknown_finding'
      );

      -- Dedupe fingerprint (no day; recurrence via case lookup)
      v_dedupe_fingerprint := md5(
        'health_check' || '|' || v_problem_key || '|' ||
        COALESCE((v_finding->'related_object')::text, '') || '|' ||
        'pipeline_integrity'
      );

      INSERT INTO friction.event (
        source, source_event_id, observed_at, severity, category, category_source,
        reported_by, problem_key, observation_text, related_object, raw_payload, dedupe_fingerprint
      ) VALUES (
        'health_check',
        p_run_id || '/' || (v_finding->>'finding_id'),
        now(),
        v_severity,
        'pipeline_integrity',
        'emitter_default',
        'system',
        v_problem_key,
        COALESCE(v_finding->>'observation_text', v_finding->>'title', 'no text'),
        v_finding->'related_object',
        jsonb_build_object(
          'health_check_run_id', p_run_id,
          'finding_id', v_finding->>'finding_id',
          'markdown_path', p_markdown_path,
          'priority', v_finding->>'priority',
          'raw_finding', v_finding
        ),
        v_dedupe_fingerprint
      );
      v_success_count := v_success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO friction.emit_error (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
      VALUES (
        'health_check',
        p_run_id || '/' || (v_finding->>'finding_id'),
        SQLERRM, SQLSTATE, v_finding, 'cc-0014-v1.0'
      );
      v_failure_count := v_failure_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', v_success_count,
    'failure_count', v_failure_count,
    'run_id', p_run_id
  );
END $$;

REVOKE EXECUTE ON FUNCTION friction.fn_emit_health_check_findings(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_emit_health_check_findings(text, text, jsonb) TO service_role;

-- Daily verification function
CREATE OR REPLACE FUNCTION friction.fn_verify_health_check_daily(p_for_date date DEFAULT (current_date - INTERVAL '1 day')::date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_event_count integer;
  v_error_count integer;
  v_result jsonb;
BEGIN
  SELECT count(*) INTO v_event_count
  FROM friction.event
  WHERE source = 'health_check'
    AND DATE(observed_at) = p_for_date;

  SELECT count(*) INTO v_error_count
  FROM friction.emit_error
  WHERE source = 'health_check'
    AND DATE(error_at) = p_for_date;

  v_result := jsonb_build_object(
    'verification_date', p_for_date,
    'event_count', v_event_count,
    'error_count', v_error_count,
    'verified_at', now()
  );

  -- Persist verification record (in raw_payload of a special event? or new table? simpler: use emit_error with a special marker)
  IF v_event_count = 0 AND v_error_count = 0 THEN
    INSERT INTO friction.emit_error (source, source_event_id, error_message, raw_payload, emitter_version)
    VALUES ('health_check_verification', 'verify/' || p_for_date::text, 'NO_EVENTS_NO_ERRORS', v_result, 'cc-0014-v1.0');
  END IF;

  RETURN v_result;
END $$;

REVOKE EXECUTE ON FUNCTION friction.fn_verify_health_check_daily(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_verify_health_check_daily(date) TO service_role;

-- pg_cron job for daily verification
SELECT cron.schedule(
  'friction-verification-daily',
  '15 1 * * *',  -- 01:15 UTC daily, after Cowork nightly health check completes
  $$SELECT friction.fn_verify_health_check_daily();$$
);
```

### V-checks for Stage C

V-C1 — emission function works on synthetic input:
```sql
SELECT friction.fn_emit_health_check_findings(
  'nightly-health-check-v1-cc-0014-test-run',
  'docs/audit/health/cc-0014-test.md',
  '[{"finding_id": "priority-1/cc-0014-test", "priority": "1", "title": "Test finding", "observation_text": "V-C1 synthetic test", "related_object": {"type": "test"}}]'::jsonb
);
-- Must return success_count: 1, failure_count: 0

SELECT severity, category, problem_key, raw_payload->>'health_check_run_id'
FROM friction.event 
WHERE source = 'health_check' 
  AND source_event_id = 'nightly-health-check-v1-cc-0014-test-run/priority-1/cc-0014-test';
-- Must return: critical, pipeline_integrity, cc-0014-test, nightly-health-check-v1-cc-0014-test-run
```

V-C2 — defensive failure within batch: a malformed finding does not break the others:
```sql
SELECT friction.fn_emit_health_check_findings(
  'nightly-health-check-v1-cc-0014-test-run-2',
  'docs/audit/health/cc-0014-test-2.md',
  '[
    {"finding_id": "priority-1/cc-0014-test-good", "priority": "1", "observation_text": "Good"},
    {"missing_finding_id": true, "priority": "2"},
    {"finding_id": "priority-3/cc-0014-test-good-2", "priority": "3", "observation_text": "Also good"}
  ]'::jsonb
);
-- Some success, some failure, but function returns; both good findings inserted
```

V-C3 — Cowork brief integration: the next actual nightly run produces matched markdown + events.
- Run `nightly-health-check-v1` v3.0 manually
- Verify markdown file exists at expected path
- Verify `friction.event` rows count matches priority findings count in the markdown's Section 10
- Verify each event has the corresponding `finding_id` in `raw_payload`

V-C4 — pg_cron verification job scheduled:
```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'friction-verification-daily';
-- Must return 1 row, active = true
```

V-C5 — security: authenticated cannot execute emission function directly:
```sql
SET ROLE authenticated;
SELECT friction.fn_emit_health_check_findings('test', 'test', '[]'::jsonb);
-- Must fail with permission denied
RESET ROLE;
```

V-C6 — test row cleanup:
```sql
DELETE FROM friction.event WHERE source_event_id LIKE 'nightly-health-check-v1-cc-0014-test%' OR source_event_id LIKE 'cc-0014-test/%';
DELETE FROM friction.emit_error WHERE source_event_id LIKE 'verify/%' AND error_at < now();  -- clean verification probes
```

### Hard-stop conditions

- Emission function does not deploy
- V-C1, V-C2 fail
- V-C3 fails: dual-write doesn't work on actual brief run
- V-C5 succeeds (security overpermission)
- Cowork brief modification cannot land before experiment start

**If any of these trigger before experiment start, the experiment is hard-stopped.** Stages D and E do not begin until Stage C verifies clean.

### Rollback path

```sql
SELECT cron.unschedule('friction-verification-daily');
DROP FUNCTION IF EXISTS friction.fn_verify_health_check_daily(date);
DROP FUNCTION IF EXISTS friction.fn_emit_health_check_findings(text, text, jsonb);
```

Cowork brief reverts to v2.1 (no emission step). Markdown writing continues as before.

---

## 9. Stage D — Manual capture form

### Scope

A floating action button (FAB) in invegent-dashboard reachable from every route. Click opens a modal form. Submit calls `friction.fn_emit_manual_event` via Supabase RPC. ≤15 second submission target.

### Backend migration

Migration name: `cc_0014_d_manual_emit_function`.

```sql
CREATE OR REPLACE FUNCTION friction.fn_emit_manual_event(
  p_observation_text  text,
  p_severity          text,
  p_category          text,
  p_current_route     text DEFAULT NULL,
  p_related_object    jsonb DEFAULT NULL,
  p_notes             text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_event_id uuid;
  v_severity text;
  v_category text;
  v_problem_key text;
  v_dedupe_fingerprint text;
  v_related_object jsonb;
BEGIN
  -- Validate inputs
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'observation_text required and must be >= 5 characters';
  END IF;

  v_severity := COALESCE(p_severity, 'info');
  IF v_severity NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'severity must be info, warn, or critical';
  END IF;

  v_category := COALESCE(p_category, 'unclassified');
  IF NOT EXISTS (SELECT 1 FROM friction.category WHERE category_code = v_category AND is_active = true) THEN
    RAISE EXCEPTION 'category % is not active', v_category;
  END IF;

  -- Problem key from first 50 chars of observation_text, normalized
  v_problem_key := lower(regexp_replace(substring(p_observation_text from 1 for 50), '[^a-z0-9]+', '_', 'g'));

  -- Related object includes route if provided
  v_related_object := COALESCE(p_related_object, '{}'::jsonb);
  IF p_current_route IS NOT NULL THEN
    v_related_object := v_related_object || jsonb_build_object('dashboard_route', p_current_route);
  END IF;

  -- Dedupe fingerprint
  v_dedupe_fingerprint := md5('manual' || '|' || v_problem_key || '|' || v_related_object::text || '|' || v_category);

  -- Insert
  v_event_id := gen_random_uuid();
  INSERT INTO friction.event (
    event_id, source, source_event_id, observed_at, severity, category, category_source,
    reported_by, problem_key, observation_text, related_object, raw_payload, dedupe_fingerprint
  ) VALUES (
    v_event_id,
    'manual',
    'manual/' || v_event_id::text,
    now(),
    v_severity,
    v_category,
    CASE WHEN p_category IS NOT NULL THEN 'manual_at_capture' ELSE 'emitter_default' END,
    'pk',
    v_problem_key,
    p_observation_text,
    v_related_object,
    jsonb_build_object('form_version', 'v1', 'notes', p_notes),
    v_dedupe_fingerprint
  );

  RETURN v_event_id;
END $$;

REVOKE EXECUTE ON FUNCTION friction.fn_emit_manual_event(text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_emit_manual_event(text, text, text, text, jsonb, text) TO authenticated, service_role;
```

### Frontend (invegent-dashboard)

Next.js component additions:

- `app/components/FrictionFAB.tsx` — floating action button, fixed position bottom-right, present on every dashboard route (added to root layout)
- `app/components/FrictionForm.tsx` — modal form with: observation_text (textarea, required), severity (radio with last-choice in localStorage, required), category (dropdown excluding 'unclassified' from default visibility, required, last-choice remembered), notes (optional textarea), current_route (auto-filled from `window.location.pathname`)
- Submit calls `supabase.rpc('fn_emit_manual_event', {...})` and shows success toast or error

### V-checks for Stage D

V-D1 — function exists and is callable:
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0014-test/v-d1: manual emission smoke test',
  'info',
  'operator_friction',
  '/clients',
  NULL,
  'V-D1 test'
);
-- Must return a uuid

SELECT severity, category, category_source, reported_by, problem_key, related_object->>'dashboard_route'
FROM friction.event
WHERE source = 'manual' AND observation_text LIKE 'cc-0014-test/v-d1%';
-- Must return: info, operator_friction, manual_at_capture, pk, cc_0014_test_v_d1_manual_emission_smoke_test, /clients
```

V-D2 — input validation works:
```sql
SELECT friction.fn_emit_manual_event('a', 'info', 'operator_friction', NULL, NULL, NULL);
-- Must fail: observation_text < 5 chars

SELECT friction.fn_emit_manual_event('cc-0014-test/v-d2', 'panic', 'operator_friction', NULL, NULL, NULL);
-- Must fail: invalid severity

SELECT friction.fn_emit_manual_event('cc-0014-test/v-d2', 'info', 'made_up_category', NULL, NULL, NULL);
-- Must fail: category not active
```

V-D3 — security: anon cannot execute:
```sql
SET ROLE anon;
SELECT friction.fn_emit_manual_event('cc-0014-test/v-d3', 'info', 'operator_friction', NULL, NULL, NULL);
-- Must fail with permission denied
RESET ROLE;
```

V-D4 — frontend integration: open dashboard, click FAB on three different routes, submit form, verify rows appear in `friction.event` with correct `dashboard_route`.

V-D5 — submission speed: PK times five submissions during V-D4. Each must complete in ≤15 seconds (typing + clicks + RPC roundtrip). If average exceeds 15s, Stage D V-check fails (instrument failure mode per v0.4 invalidation conditions).

V-D6 — test row cleanup:
```sql
DELETE FROM friction.event WHERE observation_text LIKE 'cc-0014-test/%';
```

### Hard-stop conditions

- Function does not deploy
- V-D1, V-D2 fail
- V-D3 succeeds (overpermission)
- V-D4 fails on any route
- V-D5 average submission time > 15 seconds → invalidation

### Rollback path

```sql
DROP FUNCTION IF EXISTS friction.fn_emit_manual_event(text, text, text, text, jsonb, text);
```

Frontend: remove FAB and form components, revert root layout.

---

## 10. Stage E — Read surface and experiment start

### Scope

A `/operations` route in invegent-dashboard. Read-only list of recent cases sorted by severity (critical first) then triage_state (new first) then `last_seen_at` (most recent first). Inline edit fields for triage decisions (set `triage_state`, `quality_flag`, `capture_reason`, `action_decision`, etc.).

### Frontend

- `app/operations/page.tsx` — server component, fetches recent cases via Supabase RPC `friction.fn_recent_cases(p_limit int)`
- `app/operations/CaseRow.tsx` — client component, inline edit controls per case
- RPC `friction.fn_recent_cases` returns case rows joined with event count

### Backend additions

Migration name: `cc_0014_e_read_surface_and_triage`.

```sql
-- Read function
CREATE OR REPLACE FUNCTION friction.fn_recent_cases(p_limit int DEFAULT 50)
RETURNS TABLE (
  case_id uuid, case_title text, first_seen_at timestamptz, last_seen_at timestamptz,
  event_count int, severity text, category text, triage_state text,
  quality_flag boolean, action_decision text, next_review_at timestamptz, notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = friction, public
STABLE
AS $$
  SELECT case_id, case_title, first_seen_at, last_seen_at, event_count,
         severity, category, triage_state, quality_flag, action_decision, next_review_at, notes
  FROM friction.case
  ORDER BY 
    CASE severity WHEN 'critical' THEN 1 WHEN 'warn' THEN 2 ELSE 3 END,
    CASE triage_state WHEN 'new' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END,
    last_seen_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION friction.fn_recent_cases(int) TO authenticated;

-- Triage update function (validates fields per CHECK constraints)
CREATE OR REPLACE FUNCTION friction.fn_triage_case(
  p_case_id uuid,
  p_triage_state text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_quality_flag boolean DEFAULT NULL,
  p_capture_reason text DEFAULT NULL,
  p_capture_reason_note text DEFAULT NULL,
  p_action_decision text DEFAULT NULL,
  p_next_review_at timestamptz DEFAULT NULL,
  p_suppression_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
BEGIN
  UPDATE friction.case
  SET
    triage_state = COALESCE(p_triage_state, triage_state),
    category = COALESCE(p_category, category),
    quality_flag = COALESCE(p_quality_flag, quality_flag),
    capture_reason = COALESCE(p_capture_reason, capture_reason),
    capture_reason_note = COALESCE(p_capture_reason_note, capture_reason_note),
    action_decision = COALESCE(p_action_decision, action_decision),
    next_review_at = COALESCE(p_next_review_at, next_review_at),
    suppression_reason = COALESCE(p_suppression_reason, suppression_reason),
    notes = COALESCE(p_notes, notes),
    reviewed_at = now(),
    updated_at = now()
  WHERE case_id = p_case_id;

  RETURN p_case_id;
END $$;

GRANT EXECUTE ON FUNCTION friction.fn_triage_case TO authenticated;
```

### Pre-experiment cleanup and run start

This is the final step of Stage E, executed AFTER all V-checks pass:

```sql
-- Step 1: Clean all test rows
DELETE FROM friction.event WHERE source_event_id LIKE 'cc-0014-test/%' OR observation_text LIKE 'cc-0014-test/%';
DELETE FROM friction.case WHERE case_title LIKE 'cc-0014-test/%';
DELETE FROM friction.emit_error WHERE source_event_id LIKE 'cc-0014-test/%' OR source_event_id LIKE 'verify/%';

-- Step 2: Verify zero test rows
SELECT 
  (SELECT count(*) FROM friction.event WHERE source_event_id LIKE 'cc-0014-test/%') AS event_test_rows,
  (SELECT count(*) FROM friction.case WHERE case_title LIKE 'cc-0014-test/%') AS case_test_rows,
  (SELECT count(*) FROM friction.emit_error WHERE source_event_id LIKE 'cc-0014-test/%') AS error_test_rows;
-- All three must be 0

-- Step 3: Create experiment_run row
INSERT INTO friction.experiment_run (brief_id, starts_at, ends_at, status, criteria_locked_at, criteria_snapshot)
VALUES (
  'cc-0014',
  now(),
  now() + INTERVAL '14 days',
  'running',
  now(),
  '{
    "criterion_1": {"text": "At least 6 non-duplicate quality cases (quality_flag = true)", "threshold": 6},
    "criterion_2": {"text": "At least 2 distinct real categories excluding unclassified", "threshold": 2},
    "criterion_3": {"text": "At least 2 sources produced quality cases, excluding sources with < 3 total events", "threshold": 2, "min_events_per_source": 3},
    "criterion_4": {"text": "At least 3 action decisions, including at least 1 act_now OR defer_intentionally with next_review_at", "threshold": 3, "high_intent_threshold": 1},
    "criterion_5": {"text": "At least 1 capture_reason in (missed_without_register, would_have_deferred, would_have_rediscovered) with non-null capture_reason_note", "threshold": 1},
    "invalidation": {
      "emit_error_ratio_threshold": 0.40,
      "min_total_events": 5,
      "triage_within_hours": 72,
      "triage_fail_ratio_threshold": 0.50,
      "manual_submission_max_seconds": 30,
      "health_check_verification_max_fail_days": 3
    }
  }'::jsonb
);
```

### V-checks for Stage E

V-E1 — read function works:
```sql
SET ROLE authenticated;
SELECT * FROM friction.fn_recent_cases(10);
-- Should return zero or few rows (everything else cleaned)
RESET ROLE;
```

V-E2 — triage function works:
```sql
-- Seed a test case
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key)
VALUES ('cc-0014-e-test-001', 'cc-0014-test/v-e2 triage test', now(), now(), 'info', 'operator_friction', 'cc_0014_test');

-- Triage it
SET ROLE authenticated;
SELECT friction.fn_triage_case(
  'cc-0014-e-test-001',
  p_triage_state := 'acknowledged',
  p_quality_flag := true
);
RESET ROLE;

-- Verify
SELECT triage_state, quality_flag, reviewed_at FROM friction.case WHERE case_id = 'cc-0014-e-test-001';
-- Must return: acknowledged, true, now()

-- Cleanup
DELETE FROM friction.case WHERE case_id = 'cc-0014-e-test-001';
```

V-E3 — `/operations` route renders:
- Navigate to invegent-dashboard /operations
- Page loads, shows empty case list (no cases yet)
- No console errors

V-E4 — pre-experiment cleanup successful (run the cleanup queries above, verify zero test rows in all three tables)

V-E5 — `experiment_run` row created with correct status:
```sql
SELECT brief_id, status, starts_at, ends_at, criteria_snapshot
FROM friction.experiment_run
WHERE brief_id = 'cc-0014';
-- Must return 1 row, status='running', ends_at - starts_at = 14 days
```

### Hard-stop conditions

- V-E1, V-E2, V-E3 fail
- V-E4 finds test rows remaining
- V-E5 fails

### Rollback path

```sql
UPDATE friction.experiment_run SET status = 'archived' WHERE brief_id = 'cc-0014' AND status = 'running';
DROP FUNCTION IF EXISTS friction.fn_triage_case(...);
DROP FUNCTION IF EXISTS friction.fn_recent_cases(int);
```

Frontend: remove /operations route.

---

## 11. Day-19 scoring queries (locked, immutable)

These queries are run at Day 19 to derive the verdict. They are part of the brief and cannot be modified after experiment start.

```sql
-- Query 1: total events in window
SELECT count(*) AS total_events
FROM friction.event e
JOIN friction.experiment_run r ON r.brief_id = 'cc-0014'
WHERE e.observed_at BETWEEN r.starts_at AND r.ends_at;

-- Query 2: emit_error ratio (invalidation if > 0.40)
WITH window AS (SELECT starts_at, ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014')
SELECT 
  (SELECT count(*) FROM friction.emit_error err, window w WHERE err.error_at BETWEEN w.starts_at AND w.ends_at) AS error_count,
  (SELECT count(*) FROM friction.event e, window w WHERE e.observed_at BETWEEN w.starts_at AND w.ends_at) AS event_count,
  ((SELECT count(*) FROM friction.emit_error err, window w WHERE err.error_at BETWEEN w.starts_at AND w.ends_at)::numeric / 
   NULLIF((SELECT count(*) FROM friction.event e, window w WHERE e.observed_at BETWEEN w.starts_at AND w.ends_at), 0)) AS error_ratio;

-- Query 3: criterion 1 — non-duplicate quality cases
SELECT count(*) AS quality_case_count
FROM friction.case c
WHERE c.quality_flag = true
  AND c.triage_state != 'duplicate'
  AND c.first_seen_at BETWEEN (SELECT starts_at FROM friction.experiment_run WHERE brief_id = 'cc-0014') 
                          AND (SELECT ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014');
-- Pass if >= 6

-- Query 4: criterion 2 — distinct real categories on quality cases
SELECT count(DISTINCT category) AS distinct_real_categories
FROM friction.case c
JOIN friction.category cat ON cat.category_code = c.category
WHERE c.quality_flag = true
  AND cat.counts_for_success = true
  AND c.first_seen_at BETWEEN (SELECT starts_at FROM friction.experiment_run WHERE brief_id = 'cc-0014') 
                          AND (SELECT ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014');
-- Pass if >= 2

-- Query 5: criterion 3 — sources with quality cases (excluding sources with < 3 total events)
WITH source_volume AS (
  SELECT e.source, count(*) AS total_events
  FROM friction.event e
  WHERE e.observed_at BETWEEN (SELECT starts_at FROM friction.experiment_run WHERE brief_id = 'cc-0014') 
                          AND (SELECT ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014')
  GROUP BY e.source
),
qualifying_sources AS (
  SELECT source FROM source_volume WHERE total_events >= 3
),
sources_with_quality AS (
  SELECT DISTINCT e.source
  FROM friction.event e
  JOIN friction.case c ON c.case_id = e.case_id
  WHERE c.quality_flag = true
    AND e.source IN (SELECT source FROM qualifying_sources)
)
SELECT count(*) AS sources_with_quality_cases FROM sources_with_quality;
-- Pass if >= 2

-- Query 6: criterion 4 — action decisions, with high-intent check
SELECT 
  count(*) FILTER (WHERE action_decision IS NOT NULL AND action_decision NOT IN ('ignore', 'duplicate')) AS total_actions,
  count(*) FILTER (WHERE action_decision = 'act_now' OR (action_decision = 'defer_intentionally' AND next_review_at IS NOT NULL)) AS high_intent_actions
FROM friction.case c
WHERE c.first_seen_at BETWEEN (SELECT starts_at FROM friction.experiment_run WHERE brief_id = 'cc-0014') 
                          AND (SELECT ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014');
-- Pass if total_actions >= 3 AND high_intent_actions >= 1

-- Query 7: criterion 5 — incrementality with note
SELECT count(*) AS incremental_cases_with_note
FROM friction.case c
WHERE c.capture_reason IN ('missed_without_register', 'would_have_deferred', 'would_have_rediscovered')
  AND c.capture_reason_note IS NOT NULL
  AND length(trim(c.capture_reason_note)) > 0
  AND c.first_seen_at BETWEEN (SELECT starts_at FROM friction.experiment_run WHERE brief_id = 'cc-0014') 
                          AND (SELECT ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014');
-- Pass if >= 1

-- Query 8: invalidation — triage discipline
WITH window AS (SELECT starts_at, ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014')
SELECT
  count(*) AS total_cases,
  count(*) FILTER (WHERE c.reviewed_at IS NULL OR c.reviewed_at - c.created_at > INTERVAL '72 hours') AS untriaged_or_late,
  (count(*) FILTER (WHERE c.reviewed_at IS NULL OR c.reviewed_at - c.created_at > INTERVAL '72 hours')::numeric / 
   NULLIF(count(*), 0)) AS late_triage_ratio
FROM friction.case c, window w
WHERE c.first_seen_at BETWEEN w.starts_at AND w.ends_at;
-- Invalid if late_triage_ratio > 0.50

-- Query 9: invalidation — total events
SELECT count(*) AS total_events_in_window
FROM friction.event e, friction.experiment_run r
WHERE r.brief_id = 'cc-0014'
  AND e.observed_at BETWEEN r.starts_at AND r.ends_at;
-- Invalid if < 5

-- Query 10: health check verification failure days
SELECT count(*) AS verification_no_event_days
FROM friction.emit_error
WHERE source = 'health_check_verification'
  AND error_at BETWEEN (SELECT starts_at FROM friction.experiment_run WHERE brief_id = 'cc-0014') 
                   AND (SELECT ends_at FROM friction.experiment_run WHERE brief_id = 'cc-0014');
-- Invalid if >= 3
```

### Verdict logic

- **PASS:** all 5 success criteria queries (3-7) meet thresholds AND no invalidation triggered
- **FAIL:** any of the 5 success criteria not met AND no invalidation triggered  
- **INVALID:** any invalidation query triggers; rerun the experiment after fixing the instrument cause

---

## 12. Stage sequencing rollback matrix

| Failed stage | Keep prior stages? | Roll back what? | Experiment can run? |
|---|---|---|---|
| Stage A fails | n/a | `DROP SCHEMA friction CASCADE` | No — no schema |
| Stage B fails | Yes, keep A | Drop reconciliation trigger and function only | Hard-stop — reconciliation emitter missing |
| Stage C fails | Yes, keep A, B | Drop health check emission function, verification function, unschedule cron job, revert Cowork brief to v2.1 | **HARD-STOP. Experiment cancelled.** |
| Stage D fails | Yes, keep A, B, C | Drop manual emit function, remove frontend FAB and form | Could technically run with reconciliation + health check only — but manual is needed for criterion 3 source mix. Decision: hard-stop |
| Stage E fails | Yes, keep A, B, C, D | Drop read functions, remove /operations route, do NOT create experiment_run | Cannot start without read surface and run boundary |

**Stage C and Stage D failure both cause hard-stop.** Stage C because health check is the dominant signal source; Stage D because manual capture is required for source-mix criterion.

---

## 13. D-01 framing

Before Stage A execution, fire D-01 with these specific questions:

1. Does this brief preserve v0.4 scope boundaries? (No clustering, no playbooks, no runner, no dry-run.)
2. Can any V-check/test row contaminate Day-19 scoring? (Cleanup rules in Section 5 sufficient?)
3. Can any emitter failure break an upstream production workflow? (Defensive exception handling proven by V-B3, V-C2.)
4. Are grants/RLS sufficient and not overbroad? (Section 3 role matrix correct? Anon truly denied?)
5. Is Stage C dual-write verifiable at ID level? (finding_id stability, daily verification pg_cron job.)
6. Are rollback paths safe after partial stage completion? (Section 12 matrix complete?)
7. Are Day-19 success/invalidation queries deterministic? (Section 11 SQL produces same verdict on same data?)

D-01 fires once before Stage A. Subsequent stages do not require new D-01 unless the stage diverges from this brief.

---

## 14. Post-experiment commitments

### Pass path

The pass unlocks:
- **Next-layer design session:** scope = triage/resolution architecture (the action catalogue + per-category resolution paths)
- **Health check pg_cron migration scope** (Option Z resolved: move health check from Cowork to pg_cron-native)

Pass does NOT unlock:
- Autonomy ladder
- Brief runner
- Dry-run engine
- Customer-facing register

These become discussable only after at least one full case lifecycle (capture → triage → action → verification of action's effect) has been observed in production. This gate is real.

### Fail path

1. Emitters removed (drop trigger, unschedule cron, drop functions, remove frontend FAB and form)
2. `friction.event`, `friction.case`, `friction.category`, `friction.emit_error`, `friction.experiment_run` tables archived (status = 'archived' on experiment_run; tables remain read-only for postmortem)
3. Postmortem document authored within 14 days of fail verdict
4. After postmortem, tables may be dropped on explicit approval

### Invalid path

1. Document the specific invalidation condition triggered
2. Tables remain
3. Address the instrument cause (fix the emitter, fix the form speed, fix the verification job)
4. Re-run the experiment with the same criteria_snapshot OR re-author cc-NNNN-vNext with adjustments

---

## 15. Open decisions for Stage authoring

Three items deferred for resolution during stage execution, do not block D-01:

1. **FAB position confirmation.** Bottom-right of dashboard at fixed offset. Confirm during Stage D build.
2. **Whether `unclassified` appears in manual form's category dropdown.** Recommendation: yes, as bottom option with grey styling — discourages but allows.
3. **Triage UI: list with inline edit vs detail page per case.** Recommendation: list view with inline edit for triage_state, quality_flag, action_decision; detail page only for notes editing.

---

*Brief cc-0014 v1.0. Authored 2026-05-14. Awaiting D-01 on Stage A.*
