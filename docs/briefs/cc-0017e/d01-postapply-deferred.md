# cc-0017e v1.0 — D-01 Fire Template (Deferred to Apply Session)

**Status:** AUTHORED-PENDING-APPLY. D-01 NOT fired at v2.88 per PK directive.
**Parent brief:** `docs/briefs/cc-0017e-friction-case-history-and-compat.md`
**Apply session:** TBD
**Fire trigger:** PK directive to apply.

---

## 1. Why deferred at authoring

PK directive at v2.88: "No D-01 fire." The authoring session is brief-only; D-01 cross-review fires at the start of the apply session, when the migration is about to be applied. This separates documentation discipline (authoring) from production-action discipline (apply).

Deferral rationale:
- D-01 budget (T-MCP-02) is preserved for the actual production decision, not the documentation milestone.
- A re-author cycle between authoring and apply (e.g., if PK directs scope changes) would invalidate an early D-01 fire and burn budget.
- L62 protocol requires D-01 fire to immediately precede the production action with no significant state drift in between.

---

## 2. D-01 fire template (for apply session)

Fire via `ask_chatgpt_review` MCP tool. Below is the exact payload to construct.

**Action type:** `sql_destructive`

**Proposal text (drop into `proposal` field, edit `<...>` placeholders):**

```
Apply cc-0017e v1.0 friction case_history + mutation-function patches + 8-row acknowledged backfill.

Brief commit: 8502fc49a0d981e95f8fed6bd7c3ece438fc669c (main file)
              1659b293da007ced41a6d0b08def1061dd38a414 (4 substantive sub-files)
              <commit-3-SHA> (3 process sub-files)

Production action: Run apply_migration with name 'cc_0017e_friction_case_history_and_compat' against project mbkmaxqhsohbtwsqolns (ap-southeast-2).

Migration content (7 atomic operations in one transaction):
  1. DDL: CREATE TABLE friction.case_history (mirrors emission_rule_history shape) + REVOKE/GRANT + index
  2. CREATE OR REPLACE FUNCTION friction.fn_triage_case (refactored body, +p_actor 11th arg)
  3. CREATE OR REPLACE FUNCTION friction.triage_case (added case_history INSERT, signature stable)
  4. CREATE OR REPLACE FUNCTION friction.resolve_case (added case_history INSERT, signature stable)
  5. CREATE OR REPLACE FUNCTION friction.reopen_case (added case_history INSERT, signature stable)
  6. CREATE OR REPLACE FUNCTION friction.mark_duplicate (added case_history INSERT, signature stable, emitter_version bumped)
  7. CREATE OR REPLACE FUNCTION friction.record_first_view (added case_history INSERT on non-idempotent path, signature stable)
  + Backfill CTE: 8 rows updated in friction.case, 8 rows inserted into friction.case_history
  + COMMENT statements on table, columns, all 6 functions

Consequence if delayed: Wave 0e blocked. Gate 13 remains open. cc-0017e brief stays AUTHORED-PENDING-APPLY. No operational impact — friction.* surface is functional without case_history; audit-trail coverage is incomplete but non-blocking.

Cost of waiting: each day delays case_history audit-trail coverage by 1 day. No active failure being suppressed.
```

**Context (drop into `context` field as a JSON object):**

```json
{
  "probes_executed_authoring": [
    "P1: friction.* table inventory — 9 tables",
    "P1b: friction.case + emission_rule_history column structures",
    "P2: friction.* function inventory — 19 functions including 2 triage-writers",
    "P3: fn_triage_case caller inventory — 0 confirmed in-DB callers (P6-corrected)",
    "P4: triage_state distribution — 21 new + 8 acknowledged, backfill target = 8",
    "P5a: fn_triage_case body inspection — confirms triaged_at/by not written",
    "P5b: trigger landscape on friction.case — only DELETE-prevention trigger",
    "P6: cc-0017d mutation function bodies — all 5 ROWTYPE-quoted, single-% RAISE"
  ],
  "current_evidence": {
    "baseline_rows_friction_case": 29,
    "baseline_rows_friction_event": 29,
    "backfill_target_count": 8,
    "acknowledged_with_null_triage": 8,
    "emission_rule_history_precedent": "7-column shadow shape proven in-schema",
    "cc_0017d_function_signatures_byte_stable": true,
    "lockdown_pattern": "service_role SELECT-only, mutations via SECURITY DEFINER functions",
    "transactional_exec_harness": "L-v2.86-a, applied pre-apply"
  },
  "known_weak_evidence": [
    "fn_triage_case external callers (Edge Functions, app code, PostgREST RPC consumers) not enumerable via SQL probes — compat patch is defensive prospective protection, not historically validated against known external call sites",
    "Backfill predicate is sensitive to between-authoring-and-apply state drift; pre-apply P1.3 re-probe is the mitigation but cannot detect a same-instant race",
    "V-Z3 is a NEW convention introduced in this brief; no prior empirical validation — the operation-alignment-equals-shadow-row-count invariant is correct by construction but has not been previously stress-tested"
  ],
  "default_action_on_response": {
    "AGREE": "Proceed with apply_migration",
    "PARTIAL_type_b": "Path A correction — satisfy corrected action, re-fire D-01",
    "PARTIAL_type_c": "Path A correction (type-c is echo of self-disclosed weak evidence) — satisfy corrected action, re-fire D-01",
    "DISAGREE": "STOP. PK escalation. Do NOT state-capture override without explicit PK approval phrase.",
    "REFUSE": "STOP. Investigate refusal cause; brief-level scope question likely.",
    "TIMEOUT": "Re-fire once. Persistent TIMEOUT → PK escalation."
  }
}
```

---

## 3. Idempotency check before fire

Per P3.2 of preflight-pset.md, before firing the actual D-01:

```sql
SELECT id, status, verdict, action_taken, resolved_by, created_at
FROM m.chatgpt_review
WHERE proposal ILIKE '%cc-0017e v1.0%'
  AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC;
```

**Expected:** 0 rows (first fire) OR rows from a prior same-day fire whose status is `applied`/`resolved`.

If a prior-day fire shows `status=applied` and `verdict=AGREE` but apply did not actually happen (e.g., session interrupted): re-fire is warranted; document rationale in apply session per-session file.

If a prior same-day fire shows `status=fired` or `status=responded` but is not yet `applied`/`resolved`: the prior decision cycle is still live — do NOT re-fire; complete the prior cycle first.

---

## 4. Post-fire close-the-loop UPDATE template

After D-01 returns AGREE and apply_migration succeeds AND V-checks pass:

```sql
UPDATE m.chatgpt_review
SET status         = 'resolved',
    action_taken   = 'applied',
    resolved_by    = 'cc-0017e-close-v<apply-session-version>',
    resolved_at    = now(),
    result_summary = format(
      'cc-0017e v1.0 applied. Migration cc_0017e_friction_case_history_and_compat at %s. V-check matrix PASS. 8-row backfill executed. case_history table created with %s rows (8 backfill + V-D fixtures awaiting cleanup).',
      now()::text,
      (SELECT count(*) FROM friction.case_history)::text
    )
WHERE id = <d01-review-id-from-fire-response>;
```

If apply succeeds but a V-check fails (Path B-prime in flight):
```sql
UPDATE m.chatgpt_review
SET status         = 'applied',
    action_taken   = 'applied_with_correction_pending',
    resolved_by    = NULL,
    result_summary = 'cc-0017e v1.0 applied; V-check <ID> drift surfaced; Path B-prime corrective migration in progress.'
WHERE id = <d01-review-id-from-fire-response>;
```

Later, after corrective migration applies and V-checks clean:
```sql
UPDATE m.chatgpt_review
SET status         = 'resolved',
    action_taken   = 'applied_with_correction',
    resolved_by    = 'cc-0017e-close-v<corrected-session-version>',
    resolved_at    = now(),
    result_summary = 'cc-0017e v1.0 applied with Path B-prime correction. Final V-check matrix PASS.'
WHERE id = <d01-review-id-from-fire-response>;
```

If D-01 returns DISAGREE/REFUSE and PK approves state-capture override:
```sql
UPDATE m.chatgpt_review
SET status         = 'resolved',
    action_taken   = 'state_capture_override',
    resolved_by    = 'pk-override-v<apply-session-version>',
    resolved_at    = now(),
    result_summary = 'D-01 returned <verdict>. PK state-capture override granted with rationale: <PK-rationale>. Applied at <timestamp>.'
WHERE id = <d01-review-id-from-fire-response>;
```

---

## 5. Disposition matrix summary

| D-01 verdict | Apply action | Close-the-loop status | Resolved-by source |
|---|---|---|---|
| AGREE | Proceed | resolved | cc-0017e-close-v<N> |
| PARTIAL (type-b) | Path A correct, re-fire | resolved (post re-fire AGREE) | cc-0017e-close-v<N> |
| PARTIAL (type-c) | Path A correct, re-fire | resolved (post re-fire AGREE) | cc-0017e-close-v<N> |
| DISAGREE | STOP, PK escalation | unresolved until PK directive | pk-override-v<N> or new author cycle |
| REFUSE | STOP, investigate | unresolved | new author cycle |
| TIMEOUT (1st) | Re-fire | (pending) | (pending) |
| TIMEOUT (persistent) | STOP, PK escalation | unresolved | (pending) |

State-capture exception counter increments only on `pk-override-v<N>` outcomes. Current cumulative state-capture exceptions: 1 (per v2.88 sync_state).
