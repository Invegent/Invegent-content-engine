# cc-0017c — §6 D-01 evidence + §7 Post-apply close-the-loop + §8 Deferred items

## §6 D-01 evidence package

**D-01 fire is GATED on explicit PK authorisation per v2.83 session directive. Brief commit (this commit) does NOT fire D-01.**

When fired, `ask_chatgpt_review` payload structure (per L62 protocol):

### `decision_under_review`
> Apply cc-0017c — three-section friction.* foundational hardening: (A) FK swap on `friction.event.source` replacing `event_source_check` CHECK with FK→`friction.source(source_code)`; (B) REVOKE INSERT/UPDATE on `friction.event` + `friction.case` from service_role/PUBLIC/authenticated/anon; (C) backfill `resolved_at` + `resolution_kind` for cases in closed-class `action_decision`. Per PK 4-item directive (verbatim). Migration name: `cc_0017c_friction_register_lockdown_and_backfill`. Atomic single apply_migration. 9 V-checks. Brief at `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` + sub-files at `docs/briefs/cc-0017c/`.

### `production_action_if_approved`
> Single `apply_migration` call with body per `migration-sql.md §5.2 Combined migration body`. Atomic — all three sections succeed or all roll back. Followed by 9 V-checks via `execute_sql` (sequential). On 9/9 PASS (or 8/9 PASS with V-A3 PARTIAL acceptable): close-the-loop UPDATE on `m.chatgpt_review`. Expected duration < 200ms apply + ~30s V-checks + close-the-loop UPDATE.

### `consequence_if_delayed`
> None immediate. friction.* baseline operational since v2.82 (cc-0017b applied 2026-05-18). Direct-write surface exists (service_role INSERT on event + INSERT/UPDATE on case) but no known abuse path. Backfill is forward-looking — affects 0 rows at apply time. cc-0017c is preventive hardening that gates Wave 0d (triage/resolution SECURITY DEFINER functions) — until Wave 0c lands, Wave 0d cannot safely proceed because the lockdown surface determines which functions must exist.

### `cost_of_waiting`
> Low. Hardening is preventive. Each new closed-class case post-cc-0017c apply without resolved_at/resolution_kind set perpetuates the invariant violation — but at current rate (0 closed-class cases in 22 total since cc-0017a apply 2026-05-18), drift accumulation is negligible. Wave 0d gate: until cc-0017c lands, triage/resolution flows cannot be designed against a known-locked friction.case state.

### `current_evidence`
Verbatim P-set output captured immediately before D-01 fire (per `preflight-pset.md` §P-set summary):
```json
{
  "preflight_grants_snapshot": "<P-1 result>",
  "fk_validity_probe": "<P-2 result>",
  "backfill_candidate_count": "<P-3 result>",
  "production_baseline": "<P-4 result>",
  "check_constraint_capture": "<P-5 result>",
  "captured_at": "<ISO timestamp>",
  "drift_from_brief_authoring": "<none | listed deltas>"
}
```

### `known_weak_evidence`
1. **`'done'` in PK directive's backfill set is NOT in legal `case_action_decision_check` domain.** Legal domain at apply: `('act_now','track','defer_intentionally','suppress','ignore','duplicate')`. Brief Option C used: include `'done'` in WHERE for forward-completeness; `'done'` branch maps to `'acted_on'` (most semantically aligned of legal `case_resolution_kind_check` values); `'done'` clause matches 0 rows at apply time by domain restriction. PK redirection possible during D-01.
2. **Amendment F's PUBLIC/authenticated/anon REVOKE framing is defensive — those roles have no grants on friction.event or friction.case** per Query 2 at v2.83 fact-finding. service_role is the only role with effective INSERT/UPDATE grants being revoked. Brief notes this divergence explicitly at `risks-and-grants.md §3.5`.
3. **Backfill UPDATE affects 0 rows at apply time** (per P-3). UPDATE is pattern-hardening / invariant assertion, not data correction. Forward enforcement (CHECK or trigger preventing closed-class action_decision with NULL resolved_at) is deferred — not in this brief's scope.
4. **L-v2.81-a re-exercise risk:** parallel session could land schema changes between brief authoring (v2.84) and apply session. Pre-flight P-set rerun is the drift-detection gate. L-v2.81-a currently at 2 occurrences (promotion-eligible).
5. **Wave 0d gate:** cc-0017c lockdown removes service_role UPDATE on friction.case. Existing triage/resolution flows (if any execute UPDATE on action_decision via service_role) will break post-apply. Audit at v2.83 fact-finding: no such flows identified in current codebase, but external/Cowork tasks may exist. Risk surfaced for D-01 reviewer consideration.
6. **V-A3 enforcement test caveat:** When run via execute_sql (service_role context), insufficient_privilege error will fire before foreign_key_violation. V-A3 marked PARTIAL acceptable. To test FK enforcement in isolation, must run as postgres owner (e.g., embed test in apply_migration body before final commit).

### `default_action`
> Do not apply. Ask PK.

### Expected D-01 verdict paths

- **escalate=false + default_action=apply:** PK approval still required (per session directive — D-01 is necessary but not sufficient).
- **escalate=true (type-c, generic echo of self-disclosed weak evidence):** Path forward per L62 — satisfy-corrected-action (Path A): either restate brief Option A or B explicitly with PK redirect, or accept Option C with documented rationale. State-capture override requires PK explicit approval per ICE-PROC-001.
- **escalate=true (type-b, genuine new evidence):** Address evidence; potentially revise brief; re-fire D-01 with revised plan.

## §7 Post-apply close-the-loop

On V-check pass (all 9 V-checks PASS, or 8/9 PASS with V-A3 PARTIAL acceptable), perform close-the-loop UPDATE per L62 + ICE-PROC-001:

```sql
UPDATE m.chatgpt_review
SET
  status = 'resolved',
  resolved_at = now(),
  resolved_by = 'cc-0017c-apply-v-checks-passed',
  action_taken = 'Applied migration cc_0017c_friction_register_lockdown_and_backfill (version <YYYYMMDDHHMMSS>). 9/9 V-checks PASS (or 8/9 with V-A3 PARTIAL). FK swap successful (event_source_check dropped, event_source_fk added). REVOKE lockdown active (service_role lost INSERT on event + INSERT/UPDATE on case; SELECT preserved). Backfill UPDATE affected 0 rows (matches P-3 capture).'
WHERE review_id = '<D-01 review_id from this fire>';
```

If any V-check fails (excluding V-A3 PARTIAL): status remains in current state (likely `pending` or `escalated`); action_taken records the failure path; rollback initiated per `hardstop-rollback.md §5.5`.

**Close-the-loop UPDATE does NOT increment T-MCP-02 quota.** Only the D-01 fire itself increments (cum 73 → 74 expected on cc-0017c D-01 fire).

## §8 Deferred items

These are explicitly out of scope for cc-0017c per PK 4-item directive. Carried for future briefs.

1. **`case.dedupe_fingerprint NOT NULL` constraint addition** — carried from cc-0017b out-of-scope (Wave 0b deferred).
2. **`emission_rule_history` audit trigger** — carried from cc-0017b out-of-scope.
3. **Expanding `case_action_decision_check` to include `'done'`** — would require Amendment G nomenclature alignment + new brief; PK scope-expansion not authorised at v2.84.
4. **CHECK or trigger enforcing closure invariant** — backfill UPDATE encodes the pattern only; future enforcement would catch violations at write-time rather than relying on backfill. Candidate: Wave 0e.
5. **Wave 0d — Triage/resolution SECURITY DEFINER functions** — post-cc-0017c, friction.case UPDATEs (e.g., setting action_decision) cannot be performed by service_role directly. Equivalent functions to emit_event are required for triage/resolution flows. Wave 0d new brief required before any triage/resolution UI work.
6. **PRV chain audit post-lockdown** — confirm op_reader and other PRV roles can still SELECT friction.event + friction.case post-lockdown via SECURITY DEFINER paths. Likely no impact (REVOKE was on INSERT/UPDATE, SELECT preserved), but worth a dedicated probe. P3 task.
7. **friction.case_history shadow table** — capture state changes for audit. Future wave (0e or later).
8. **case_id UNIQUE constraint on friction.event** — if multiple events should never share a case_id without explicit attach logic, this could be enforced. Currently 22 events / 22 cases (1:1 by construction), but no constraint preventing future 1:many drift. Out of scope; flagged.
9. **emit_event return type formalisation** — currently SETOF / record return; could be RETURNS TABLE for cleaner caller integration. Cosmetic; out of scope.
10. **postgres-grant audit** — postgres role has full ALL privileges. Should superuser-level operations route through dedicated DEFINER functions? Architectural question; out of scope for this wave.
