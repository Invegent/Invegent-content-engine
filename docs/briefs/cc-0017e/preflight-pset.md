# cc-0017e v1.0 — Preflight P-Set

**Status:** AUTHORED-PENDING-APPLY.
**Parent brief:** `docs/briefs/cc-0017e-friction-case-history-and-compat.md`

Lesson 61 (Q1-Q5 / P1-P5) pre-apply discipline. Run ALL checks immediately before `apply_migration` in the apply session. Any P-check FAIL aborts.

---

## P1 — Empirical precondition re-verification

The authoring probes (P1-P6 in v2.88) MUST be re-run at apply time to confirm state has not drifted between authoring and apply.

### P1.1 — friction.* table inventory unchanged

```sql
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'friction';
```

Expected: 9 (matches v2.87/v2.88 sync_state baseline). If 10+, a new table has been added between authoring and apply — investigate before proceeding.

**FAIL action:** ABORT, investigate added table, re-author if necessary.

### P1.2 — case_history does not yet exist

```sql
SELECT count(*) AS already_exists
FROM information_schema.tables
WHERE table_schema = 'friction' AND table_name = 'case_history';
```

Expected: 0.

**FAIL action:** ABORT. Apply is non-idempotent for DDL; case_history already existing means either a parallel-session race OR a partial prior apply OR brief misalignment. PK escalation.

### P1.3 — Backfill target count is exactly 8

```sql
SELECT count(*) AS target_count
FROM friction."case"
WHERE triage_state = 'acknowledged'
  AND triaged_at IS NULL
  AND triaged_by IS NULL;
```

Expected: 8 (matches authoring probe P4 v2.88).

**FAIL action:**
- If target_count = 0: backfill already happened OR all acknowledged cases have been re-triaged elsewhere. Skip backfill section of apply. Document.
- If target_count > 8 OR target_count between 1 and 7: state drift. PK escalation.

### P1.4 — friction.case + friction.event baseline preserved

```sql
SELECT
  (SELECT count(*) FROM friction."case") AS total_cases,
  (SELECT count(*) FROM friction.event) AS total_events;
```

Expected:
- total_cases = 29
- total_events = 29

**FAIL action:** ABORT. Baseline drift between authoring and apply. PK escalation.

### P1.5 — 6 functions exist and have authoring-time signatures

Run V-A1 query from vchecks.md as a pre-apply check. Expected matrix:

| function | identity_args | sec_def |
|---|---|---|
| fn_triage_case | 10-arg legacy | true |
| triage_case | 5-arg cc-0017d | true |
| resolve_case | 3-arg cc-0017d | true |
| reopen_case | 3-arg cc-0017d | true |
| mark_duplicate | 3-arg cc-0017d | true |
| record_first_view | 2-arg cc-0017d | true |

**FAIL action:** ABORT. Function signature drift between authoring and apply.

---

## P2 — Pre-apply syntactic validation (L-v2.86-a HIGH-SIGNAL)

Run the transactional EXEC harness from migration-sql.md against the full migration payload. ANY parse-time error inside the harness = brief-level fix required.

Harness pattern is in migration-sql.md "L-v2.86-a pre-apply discipline" section.

**Expected:** harness produces `NOTICE: cc-0017e harness: parse OK, rolled back as expected`. No other errors.

**FAIL action:** ABORT. Identify which substitution class (RAISE format, ROWTYPE quoting, reserved keyword, or other) caused failure. Patch brief in-place per Path B-prime convention. Re-run harness until pass.

---

## P3 — D-01 fire readiness

### P3.1 — D-01 proposal text drafted and includes all required fields

Proposal must include:
- `decision_under_review`: "Apply cc-0017e v1.0 migration: DDL + 6 function patches + 8-row backfill"
- `production_action_if_approved`: "Run apply_migration with name cc_0017e_friction_case_history_and_compat"
- `consequence_if_delayed`: "Wave 0e remains blocked; cc-0017e brief stays authored-pending-apply; gate 13 stays open"
- `cost_of_waiting`: "Each day delays case_history audit-trail coverage by 1 day; no operational impact since current friction.* surface is functional"
- `current_evidence`: enumerate authoring commits + probe findings
- `known_weak_evidence`: enumerate the 3 weak-evidence items listed in risks-and-grants.md R7
- `default_action`: "Proceed if D-01 returns AGREE; PATH A correction if PARTIAL; PK escalation if DISAGREE or REFUSE"

### P3.2 — D-01 idempotency check

Verify no prior D-01 fire exists for cc-0017e v1.0 apply (same UTC day):

```sql
SELECT id, status, verdict, created_at
FROM m.chatgpt_review
WHERE proposal ILIKE '%cc-0017e v1.0%'
  AND created_at::date = current_date
ORDER BY created_at DESC;
```

Expected: 0 rows (first fire of the day) OR matching prior row from earlier same-day fire.

**FAIL action:** If duplicate fire would result, escalate to PK to decide whether re-fire is warranted.

---

## P4 — Rollback readiness

### P4.1 — Hardstop/rollback document loaded

Verify `hardstop-rollback.md` is read and the rollback steps are operationally clear before apply.

### P4.2 — Rollback rehearsal

Not mandatory (forward-only migrations are the rule per ICE convention) but recommended: mentally rehearse the rollback path for each section. Document rehearsal note in apply session per-session file.

### P4.3 — Recovery dry-run for partial apply

In the (unlikely) case of partial apply (e.g., DDL succeeded but function patches failed mid-stream), the recovery path is:
1. Re-run apply_migration with same name — Supabase apply_migration is idempotent on the migration name level (will fail if already registered).
2. If re-run fails on name uniqueness: corrective migration named `cc_0017e_friction_case_history_and_compat_v2` with idempotent CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE FUNCTION + backfill triple-pin predicate (auto no-op on re-run).

---

## P5 — V-check execution readiness

### P5.1 — vchecks.md loaded and V-check matrix understood

Confirm the V-A through V-Z matrix in vchecks.md is understood. Particularly:
- V-Z3 is the NEW convention check — silent-INSERT-failure catcher.
- V-D-setup requires 4 fixture cases inserted as postgres owner via apply_migration (NOT via service_role).
- V-D fixture cleanup uses `friction.purge_test_case('cc-0017e/v-d/%')`.

### P5.2 — V-D fixture seed migration prepared as separate apply_migration call

The V-D fixture seed must be applied AFTER the main migration but BEFORE V-D positive tests run. Convention: separate migration name `cc_0017e_vcheck_fixture_seed`.

### P5.3 — Cleanup migration prepared

Post-V-checks, run `cc_0017e_vcheck_cleanup` migration that calls `friction.purge_test_case('cc-0017e/v-d/%')` to remove all V-D fixtures. Per cc-0017d v1.1 Addendum Drift 3 lesson: use the canonical slash-prefix pattern; verify zero residue via V-Z1 post-cleanup.

### P5.4 — Close migration prepared

Final migration: `cc_0017e_chatgpt_review_close` containing the UPDATE statement to set m.chatgpt_review row status=completed, action_taken='applied', resolved_by='cc-0017e-close-v2.XX' on the D-01 review row.

---

## P-set summary table

| P-check | Purpose | Pass condition | Fail action |
|---|---|---|---|
| P1.1 | Schema unchanged | 9 friction tables | ABORT |
| P1.2 | case_history does not exist | 0 | ABORT |
| P1.3 | 8 backfill targets | count=8 | ABORT or skip backfill |
| P1.4 | Baseline counts preserved | 29/29 | ABORT |
| P1.5 | Function signatures unchanged | byte-match | ABORT |
| P2 | Transactional EXEC harness passes | NOTICE harness OK | ABORT, fix brief |
| P3.1 | D-01 proposal complete | all 7 fields present | ABORT |
| P3.2 | D-01 idempotency | no duplicate fire | PK escalation if conflict |
| P4.1 | Rollback doc loaded | confirmed | proceed |
| P4.2 | Rollback rehearsal | done | document |
| P4.3 | Recovery dry-run | understood | proceed |
| P5.1 | V-check matrix understood | confirmed | proceed |
| P5.2 | V-D fixture seed prepared | separate migration ready | proceed |
| P5.3 | Cleanup migration prepared | purge_test_case call ready | proceed |
| P5.4 | Close migration prepared | UPDATE statement ready | proceed |

**ALL P-checks must PASS before D-01 fires.** PASS means: green-light at each gate.
