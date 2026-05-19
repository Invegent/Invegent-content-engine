# cc-0017d — §5.4 Hard-stop matrix + §5.5 Rollback

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** [`vchecks.md`](vchecks.md) **Next:** [`d01-postapply-deferred.md`](d01-postapply-deferred.md)

---

## §5.4 Hard-stop matrix

Hard-stop = HALT the apply / V-check sequence. Do not proceed to subsequent steps. Decide rollback vs. brief refresh vs. investigation per the action column.

### §5.4-A — Pre-apply (P-set drift)

| Trigger | P-set query | Action |
|---|---|---|
| A1 | P-2 returns ≥ 1 row | One of the 6+1 proposed names is already in use → naming collision; **refresh brief** with new names or investigate orphan function |
| A2 | P-3 returns ≠ 7 rows OR any constraint definition differs from §1.1 of main file | CHECK domain drift between authoring and apply → **refresh brief** with new constraints |
| A3 | P-4 returns `is_security_definer = false` OR `owner ≠ postgres` OR signature drift | Legacy `fn_triage_case` shape regressed → **investigate** and refresh brief if needed |
| A4 | P-5 returns ≠ canonical 12-param `emit_event` signature byte-for-byte | emit_event signature drifted (L-v2.85-a discipline) → **investigate**; fix emit_event before Wave 0d |
| A5 | P-6: `first_viewed_count > 0` OR `resolved_count > 0` OR `dupe_linked_count > 0` | Concurrent work modified case lifecycle between authoring and apply → **investigate** the source before Wave 0d |
| A6 | P-7 returns ≠ 3 rows | postgres role missing DELETE on one of event/case/emit_error → **investigate**; purge_test_case will fail at runtime |
| A7 | P-8 returns < 4 roles, including service_role + authenticated | Required grant target missing → **investigate**; cannot complete GRANTs |
| A8 | P-9 returns > 0 rows | UUID-namespace collision (someone else used `00000000-0000-0000-0000-cc0017d0%`) → **refresh brief** with new namespace |
| A9 | P-10 returns 0 rows | `friction.category` lookup row `operator_friction` missing/inactive → required for emit_event fixture seeds in V-D; **investigate** |

**Action on A1/A2/A8 = refresh brief:** stop here. Author cc-0017d v1.1 addressing the drift. Re-fire D-01.

**Action on A3-A7/A9 = investigate:** stop here. Diagnose root cause. Re-author may not be needed if root cause is upstream (e.g., a separate Wave 0c-style migration regression). Do NOT proceed to apply until root cause resolved.

### §5.4-B — Post-apply (V-check failure)

| Trigger | V-check | Action |
|---|---|---|
| B1 | V-A1: any signature mismatch | DDL didn't deploy as authored → **rollback** via §5.5; investigate apply_migration result |
| B2 | V-B1: any function not SECDEF, or owner ≠ postgres, or search_path missing | Security mode failed → **rollback**; investigate |
| B3 | V-C1: any row count mismatch from §4 matrix | GRANT/REVOKE didn't apply correctly → **fix-forward**: re-issue GRANT/REVOKE block from §5.2 Step 7 via `apply_migration`. If fix-forward fails after 1 retry, **rollback** |
| B4 | V-C2: `bad_grants > 0` | purge_test_case granted to authenticated → **fix-forward**: `REVOKE EXECUTE ON FUNCTION friction.purge_test_case(text) FROM authenticated;` |
| B5 | V-D1-D5: any positive smoke fails (function returns 0 rows or wrong values) | Function logic defect → **rollback**; re-author v1.1 with patch; re-fire D-01 |
| B6 | V-E1-E10: any negative test SUCCEEDS (when it should raise) | Validation gap in function → **rollback**; re-author v1.1 with stricter validation; re-fire D-01 |
| B7 | V-F1: `out_events_deleted = 0` OR `out_cases_deleted = 0` despite fixtures being seeded | Purge regex defect OR fixtures didn't seed → **investigate** before rollback decision |
| B8 | V-Z1: any residue > 0 | Purge incomplete → **manual cleanup** via apply_migration; do NOT mark close until V-Z1 passes |
| B9 | V-Z2: `total_cases` drift > +5 from P-6 baseline | Unexpected case creation → **investigate**; may be benign (cron 85/86 fires) |

**Rollback decision tree:** if B1/B2/B5/B6 fires, the deployed code is unsafe → execute §5.5 rollback before any further attempt. If B3/B4 fires, fix-forward first; rollback only if fix-forward fails. If B7/B8 fires, manual cleanup; do not mark close until V-Z1 clean.

### §5.4-C — D-01 verdict gates

| Trigger | Action |
|---|---|
| C1 | D-01 returns `escalate=true` with `verdict=REJECT` or `confidence=LOW` and weak evidence strong | Apply BLOCKED; PK must explicitly override OR brief refresh |
| C2 | D-01 returns `escalate=true` with `verdict=PARTIAL` and a Type-B objection (genuine new evidence) | Satisfy the objection (Path A per memory protocol); update brief v1.1; re-fire D-01 |
| C3 | D-01 returns `escalate=true` with `verdict=PARTIAL` and a Type-C objection (generic echo of self-disclosed weak evidence) | Path A: satisfy the corrected action; re-fire D-01. Do NOT use state-capture override without PK explicit approval (counter cum 1) |
| C4 | D-01 timeout / refusal | Treat as escalate=true; require PK explicit approval to proceed |

---

## §5.5 Rollback SQL

If §5.4-B1/B2/B5/B6 fires (or PK directs rollback for any reason), apply this single migration to fully revert Wave 0d:

```sql
-- cc_0017d_rollback — drop all 6 functions added in cc_0017d_friction_case_mutation_functions

DROP FUNCTION IF EXISTS friction.triage_case(uuid, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS friction.resolve_case(uuid, text, text);
DROP FUNCTION IF EXISTS friction.reopen_case(uuid, text, boolean);
DROP FUNCTION IF EXISTS friction.mark_duplicate(uuid, uuid, text);
DROP FUNCTION IF EXISTS friction.record_first_view(uuid, text);
DROP FUNCTION IF EXISTS friction.purge_test_case(text);
```

**Migration name for rollback:** `cc_0017d_rollback`.

**Note on grants:** `DROP FUNCTION` cascades grants automatically. No separate REVOKE needed; the grants live attached to the function and are dropped with it.

**Note on table state:** Wave 0d migration is purely additive at the function layer. No table DDL was executed. No grants on `friction.case`/`event`/`emit_error` were modified. Rollback is therefore a clean function-only DROP — no compensating state restoration required.

**Important — if any V-D test partially succeeded before V-F1 ran:** test fixtures (cases + events) may exist in `friction.case`/`event`/`emit_error` with the `cc-0017d-test/` prefix. Clean these up manually before rollback:

```sql
-- Manual cleanup if rollback fires after partial V-D execution
DELETE FROM friction.event       WHERE observation_text LIKE 'cc-0017d-test/%' OR source_event_id LIKE 'cc-0017d-test/%';
DELETE FROM friction.case        WHERE case_title LIKE 'cc-0017d-test/%';
DELETE FROM friction.emit_error  WHERE source_event_id LIKE 'cc-0017d-test/%';
```

**Post-rollback verification:**

```sql
-- Confirm all 6 functions removed
SELECT count(*) AS remaining
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND proname IN ('triage_case','resolve_case','reopen_case',
                  'mark_duplicate','record_first_view','purge_test_case');
-- Expected: remaining = 0

-- Confirm friction.case/event/emit_error grants unchanged from P-1 snapshot
-- (re-run P-1 query and diff against the recorded JSON snapshot)
```

**Time-to-rollback:** target < 60 seconds from V-check failure detection to rollback applied. apply_migration call is single statement, atomic.
