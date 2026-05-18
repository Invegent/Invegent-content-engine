# cc-0017b § 3–4 — Cross-cutting Grants, RLS, Security + Risks/Mitigations

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** (index) **Next:** [`preflight-pset.md`](preflight-pset.md)

---

## 3. Cross-cutting: grants, RLS, and security

### 3.1 Role access matrix (delta from cc-0017a)

| Role | `friction.event` | `friction.case` | `friction.emission_rule` | `friction.emit_event` (function) |
|---|---|---|---|---|
| `service_role` | SELECT, INSERT, UPDATE (carry) | SELECT, INSERT, UPDATE (carry) | SELECT, INSERT, UPDATE (carry) | EXECUTE (NEW Wave 0b) |
| `authenticated` | SELECT, INSERT, UPDATE (carry until Wave 0c REVOKE) | SELECT, INSERT, UPDATE (carry until Wave 0c REVOKE) | SELECT (carry) | EXECUTE (NEW Wave 0b) |
| `anon` | none | none | none | none |

**Schema usage** carries from cc-0014/cc-0017a — `GRANT USAGE ON SCHEMA friction TO service_role, authenticated`.

**RLS:** not enabled on `friction.*` tables, consistent with prior waves' single-operator scope.

### 3.2 GUC `friction.emit_event_active`

- **Name:** `friction.emit_event_active` — custom-namespace transaction-local setting.
- **Type:** text. Value: `'true'` when emit_event is active; unset (returns `''`) otherwise.
- **Scope:** transaction-local via `set_config(name, value, is_local := true)`. Auto-cleared on COMMIT or ROLLBACK.
- **Set by:** `friction.emit_event` Step 2.
- **Read by:** `friction.fn_promote_event_to_case` trigger function.
- **Security:** setting a GUC requires no special privilege; reading via `current_setting(..., missing_ok)` is unprivileged. The GUC's value is opaque text, never used in security decisions, never written to durable storage. Custom dotted-namespace GUCs are permitted by PostgreSQL.

### 3.3 SECURITY DEFINER on emit_event

The function runs with the privileges of its owner (postgres). This is required because Wave 0c will REVOKE direct INSERT from `authenticated` — `emit_event` becomes the only path for `authenticated` callers to write friction.event. Until Wave 0c, the SECURITY DEFINER is belt-and-braces.

The function explicitly `SET search_path = friction, public` to defend against search_path attacks. All function-internal references to friction objects are schema-qualified.

### 3.4 Function execution grants (added this migration)

```sql
REVOKE EXECUTE ON FUNCTION friction.emit_event(text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.emit_event(text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb) TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION friction.fn_severity_rank(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.fn_severity_rank(text) TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION friction.fn_attach_or_create_inner_v1(text, timestamptz, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.fn_attach_or_create_inner_v1(text, timestamptz, text, text, text, text) TO service_role, authenticated;
```

The 3 wrappers (`fn_emit_reconciliation_event`, `fn_emit_health_check_findings`, `fn_emit_manual_event`) retain their existing cc-0014 grants — `CREATE OR REPLACE FUNCTION` preserves existing grants. The trigger functions need no explicit EXECUTE grant; triggers run as the table owner regardless of caller.

### 3.5 Security V-checks (in vchecks.md)

Each new function gets at least one positive grant verification (service_role can EXECUTE) and one negative grant verification (anon cannot). The GUC is verified to (a) be settable by emit_event, (b) be readable by the trigger, (c) auto-clear on transaction COMMIT/ROLLBACK.

---

## 4. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | GUC leaks across transactions, causing trigger to no-op for unrelated direct INSERTs in a later session. | `set_config(..., is_local := true)` makes the setting transaction-scoped. COMMIT/ROLLBACK clears automatically. **V-B21** explicitly verifies cross-transaction isolation. |
| R2 | Trigger mis-handles missing/empty GUC (NULL coercion bug), causing incorrect bypass. | `current_setting('friction.emit_event_active', true)` returns `''` (empty string) when unset (`true` second arg = `missing_ok`). Trigger compares against literal `'true'` — empty ≠ 'true' → defence-in-depth runs. **V-B5** verifies the body contains the exact comparison. |
| R3 | Concurrent emit_event wins case-insert race; loser raises `unique_violation` on `case_open_dedupe_uniq`. | `fn_attach_or_create_inner_v1` wraps create-path in labelled block with retry counter (max 1). On `unique_violation`, retry SELECT-then-attach. On second failure, re-raise (pathological). **V-B25** verifies sequential 10-call invariant produces 1 case with event_count=10. |
| R4 | Reopen path's `severity = v_severity` "replace" loses operator-acknowledged historical severity. Case closed at critical, recurrence at info → reopens at info; historical criticality buried. | Per PK directive (replace, not max). `reopen_count > 0` is the recurrence signal; `resolution_kind='reopened'` is the state marker; historical severity preserved in prior `friction.event` rows attached to same `case_id`. UI in Wave 7 should surface "previous severity was: critical". |
| R5 | `dynamic_context` jsonb accepts arbitrary input — vector for very large payloads exceeding row size budgets. | Document expected size (< 4 KB per emission). No column-level CHECK enforces this in v1. **V-B16** inserts representative-size payload and verifies row width acceptable. Hardening (CHECK `pg_column_size(dynamic_context) < 16384`) can be added later if misused. |
| R6 | Partial-apply failure mid-transaction. | PostgreSQL DDL is transactional. Either all 4 function bodies replace + new column + CHECK extend + emission_rule seeds + GRANTs land, or none do. If `apply_migration` raises, the §5.5 rollback is unused (transaction never committed). If V-checks fail post-apply, §5.5 rollback reverts function bodies to cc-0014 forms. |
| R7 | `fn_emit_health_check_findings` wrapper's 3-tier `condition_key` resolution emits_error too aggressively if nightly brief's JSON contract changes between authoring and apply. | Wrapper is BACKWARD-COMPATIBLE: explicit `condition_key` field preferred; absence falls back to `true-stuck-*` parse; final absence logs to `emit_error` and skips. The current Cowork brief v3.0 output (per memory + introspection Q6) produces `finding_id` values that all parse correctly via tier 2 fallback. No Cowork brief amendment required. **V-B23** tests all 3 tiers. |
| R8 | `category_source` enum extension (`'category_override'`) adds value no current caller produces. Dead code if no future caller ever sets `p_category_override` from non-manual path. | Acceptable. Future Waves 1–6 (compliance reviewer, doctor escalation, sentinel) may emit with explicit categories. Adding the enum value now means no future schema churn. Cost: one enum value; benefit: no future migration needed for category overrides. |
| R9 | Transition-window NULL backfill races with concurrent `cron 85` fire creating a new NULL-fingerprint case mid-migration. | Migration runs in transaction; PG takes appropriate locks. `cron 85` INSERT to `r.cadence_drift_log` + trigger fire of `fn_emit_reconciliation_event` acquires AccessShareLock on friction tables. Migration's `CREATE OR REPLACE FUNCTION fn_emit_reconciliation_event` requires AccessExclusiveLock on the function's pg_proc row — conflicts with any in-flight call. PG serialises correctly. **Recommended apply timing:** outside 03:30 AEST (cron 85) and 02:00 AEST (cron 86) windows. |
| R10 | Replacing `fn_emit_reconciliation_event` body while AFTER INSERT trigger is bound. Concurrent transaction writing to `r.cadence_drift_log` could see the new function body before migration commits. | Replacement is atomic at function-body granularity within migration transaction. Concurrent writer either sees old body (committed before migration COMMIT) or new body (after COMMIT) — never a torn read. PG MVCC + DDL locking handles. Reconciliation trigger's `EXCEPTION WHEN OTHERS` catches structural failure and logs to emit_error. |
| R11 | `event_source_check` CHECK constraint still in force restricts `emit_event` to 3 hardcoded source values. V-B test attempting emit with fourth source would fail at CHECK, not at emission_rule lookup (the test's intent). | All V-B tests use one of the 3 valid sources. "Missing rule" V-check (V-B18) uses unregistered `condition_key` for a valid source. **event_source_check stays in 0b; Wave 0c drops it.** Documented in §11 honest limitations. |
| R12 | Wrapper migrations preserve `emit_error` audit pattern; new internal path adds emit_event's own validation errors → double-log risk (wrapper exception block + emit_event audit). | emit_event uses `RAISE EXCEPTION` with explicit ERRCODE; wrappers' `EXCEPTION WHEN OTHERS` catches and logs to emit_error. Correct discipline: wrapper's emit_error log is canonical (has source_event_id context); emit_event does NOT separately write to emit_error for caller-visible failures — only for `case_policy='suppress'` events (which would not also raise to caller). **V-B19** verifies suppress path; **V-B18** verifies missing rule. |
| R13 | The legacy md5 event fingerprints on existing 22 events remain forensic-only. Cross-format dedupe between historical events and future sha256 events does not work. | Documented in cc-0017a v1.1 risks. Acceptable: events are immutable facts; case dedupe_fingerprint (sha256) is the canonical key for future emit_event attach decisions. |
| R14 | apply session forgets to capture cc-0014 function bodies in pre-flight P2 → rollback paths 5c/5d (verbatim cc-0014 wrappers) are missing if rollback needed. | **Hard procedural requirement:** before running `apply_migration`, the apply session must capture the output of P2 to its session log. Without this, rollback for `fn_emit_health_check_findings` + `fn_emit_manual_event` requires manually re-deriving from git history (cc-0014 commit). Document in `docs/runtime/sessions/YYYY-MM-DD-cc-0017b-applied.md`. |

---

**Next:** [`preflight-pset.md`](preflight-pset.md) — pre-flight P1–P16 queries (run before D-01 fire).
