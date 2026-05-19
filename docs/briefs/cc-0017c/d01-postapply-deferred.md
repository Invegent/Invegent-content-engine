# cc-0017c — §6 D-01 evidence + §7 Post-apply close-the-loop + §8 Deferred items

**Brief version:** v1.1 (doc-only patch — known_weak_evidence #1 updated to reflect v1.1 Path A resolution; v1.0 D-01 review_id `a37eff28-...` close-the-loop documented)

## §6 D-01 evidence package (v1.1)

**v1.0 D-01 fire status:** review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`. Verdict: partial. Corrected_action: Option A (drop `'done'` from WHERE + CASE). **PK accepted Path A. Close-the-loop UPDATE to `status=resolved` executed after v1.1 patch commit.**

**v1.1 D-01 re-fire:** PENDING (next step this session per PK directive). New review_id will be assigned by bridge on fire.

`ask_chatgpt_review` payload structure (per L62 protocol):

### `decision_under_review` (v1.1)
> REVIEW-ONLY: Apply cc-0017c v1.1 — three-section friction.* foundational hardening: (A) FK swap on `friction.event.source` replacing `event_source_check` CHECK with FK→`friction.source(source_code)`; (B) REVOKE INSERT/UPDATE on `friction.event` + `friction.case` from service_role/PUBLIC/authenticated/anon; (C) backfill `resolved_at` + `resolution_kind` for cases in closed-class `action_decision` **using legal-domain-only WHERE/CASE** `('suppress','ignore','duplicate')`. v1.1 patch satisfies v1.0 D-01 corrected_action (Option A) per PK Path A directive. Migration name: `cc_0017c_friction_register_lockdown_and_backfill`. Atomic single apply_migration. 9 V-checks.

### `production_action_if_approved`
> None this turn — v1.1 re-fire is REVIEW-ONLY per PK directive. Apply is gated on v1.1 D-01 verdict PLUS separate PK explicit approval. On both gates passing: pre-flight P-set rerun → drift detection → single apply_migration call (Section A + B + C atomic) → 9 V-checks via execute_sql → close-the-loop UPDATE on m.chatgpt_review for v1.1 review row. Expected apply duration < 200ms + ~30s V-checks.

### `consequence_if_delayed`
> None immediate. friction.* baseline operational since v2.82 (cc-0017b applied 2026-05-18 Sydney evening). Direct-write surface exists but no known abuse path. Backfill is forward-looking — affects 0 rows at apply time. cc-0017c is preventive hardening + Wave 0d gate.

### `cost_of_waiting`
> Low. Current rate is 0 closed-class cases in 22 total since cc-0017a apply (same day). Wave 0d cannot proceed until cc-0017c lands. Drift accumulation negligible.

### `current_evidence`
Verbatim P-set output captured immediately before D-01 fire (per `preflight-pset.md` §P-set summary):
```json
{
  "preflight_grants_snapshot": "<P-1 result>",
  "fk_validity_probe": "<P-2 result>",
  "backfill_candidate_count": "<P-3 result (including done_count_audit)>",
  "production_baseline": "<P-4 result>",
  "check_constraint_capture": "<P-5 result>",
  "captured_at": "<ISO timestamp>",
  "drift_from_brief_authoring": "<none | listed deltas>"
}
```

### `known_weak_evidence` (v1.1)
1. **`'done'` divergence — RESOLVED v1.1.** v1.0 brief used Option C (include `'done'` for forward-completeness; map to `'acted_on'`; rely on domain restriction). v1.0 D-01 review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79` returned verdict=partial with corrected_action=Option A. PK accepted Path A. v1.1 patch drops `'done'` from WHERE + CASE. Migration body now exactly matches current legal `case_action_decision_check` domain. `'done'` is recorded as out-of-scope: only introduced via future lifecycle-domain expansion (Amendment G nomenclature work + new brief), if deemed needed.
2. **Amendment F divergence (carried from v1.0):** PUBLIC/authenticated/anon already lack grants on friction.event + friction.case (per v2.83 Query 2). service_role is the effective direct-write surface being revoked. Migration issues all 4 REVOKE statements defensively-idempotent; only service_role REVOKE is effective. PUBLIC/authenticated/anon REVOKEs are no-ops by PostgreSQL semantics.
3. **Backfill UPDATE affects 0 rows at apply time** (per P-3). UPDATE is pattern-hardening / invariant assertion, not data correction. Forward enforcement (CHECK or trigger preventing closed-class action_decision with NULL resolved_at) is deferred — not in this brief's scope.
4. **L-v2.81-a parallel-session coordination risk:** parent SHA observation at v1.0 commit (`92f9e868` parent `586d30cd` vs compaction-summary v2.83 close HEAD `06a8421e`). Observed and recorded; not treated as blocker. Pre-flight P-set rerun is the drift-detection gate. L-v2.81-a currently at 2 occurrences (promotion-eligible).
5. **Wave 0d gate:** cc-0017c lockdown removes service_role UPDATE on friction.case. Existing triage/resolution flows (if any execute UPDATE on action_decision via service_role) will break post-apply. Audit at v2.83 fact-finding: no such flows identified in current codebase, but external/Cowork tasks may exist.
6. **V-A3 enforcement test caveat:** when run via execute_sql (service_role context), insufficient_privilege error fires before foreign_key_violation. V-A3 marked PARTIAL acceptable. To test FK enforcement in isolation, must run as postgres owner.
7. **New v1.1 audit signal:** P-3 + V-C1 now include `done_count_audit`. If any row appears with `action_decision='done'` between brief authoring and apply, that constitutes hard-stop §5.4-A3b (external CHECK domain expansion landed without coordination through this brief).

### `default_action`
> Do not apply. PK explicit approval required regardless of D-01 verdict. This fire is REVIEW-ONLY.

### Expected D-01 verdict paths (v1.1)

- **escalate=false + default_action=apply:** PK approval still required (per session directive — D-01 is necessary but not sufficient).
- **escalate=true (type-c, generic echo of self-disclosed weak evidence):** Path forward per L62 — satisfy-corrected-action (Path A): revise brief per reviewer's specific correction. State-capture override requires PK explicit approval per ICE-PROC-001.
- **escalate=true (type-b, genuine new evidence):** Address evidence; potentially revise brief; re-fire D-01 with revised plan.

## §7 Post-apply close-the-loop

On V-check pass (all 9 V-checks PASS, or 8/9 PASS with V-A3 PARTIAL acceptable), perform close-the-loop UPDATE on the v1.1 D-01 review row per L62 + ICE-PROC-001:

```sql
UPDATE m.chatgpt_review
SET
  status = 'resolved',
  resolved_at = now(),
  resolved_by = 'cc-0017c-v1.1-apply-v-checks-passed',
  action_taken = 'Applied migration cc_0017c_friction_register_lockdown_and_backfill v1.1 (version <YYYYMMDDHHMMSS>). 9/9 V-checks PASS (or 8/9 with V-A3 PARTIAL). FK swap successful (event_source_check dropped, event_source_fk added). REVOKE lockdown active (service_role lost INSERT on event + INSERT/UPDATE on case; SELECT preserved). Backfill UPDATE affected 0 rows (matches P-3 capture). v1.1 WHERE/CASE restricted to legal domain values per Path A.'
WHERE review_id = '<v1.1 D-01 review_id from re-fire>';
```

If any V-check fails (excluding V-A3 PARTIAL): status remains in current state; action_taken records the failure path; rollback initiated per `hardstop-rollback.md §5.5`.

**Close-the-loop UPDATE does NOT increment T-MCP-02 quota.** Only the D-01 fire itself increments. v1.0 D-01 fire: cum 73 → 74. v1.1 D-01 re-fire: cum 74 → 75 expected.

### v1.0 D-01 close-the-loop (executed in v1.1 patch session)

```sql
UPDATE m.chatgpt_review
SET
  status = 'resolved',
  resolved_at = now(),
  resolved_by = 'cc-0017c-v1.0-path-A-corrected-action-accepted',
  action_taken = 'D-01 verdict partial with corrected_action=Option A (drop done from WHERE+CASE). PK directive: Proceed with Path A. v1.1 doc-only patch authored to satisfy corrected action: dropped action_decision=done from backfill WHERE clause; dropped done branch from CASE; updated risks-and-grants.md §3.4 so Option A is final selected path; recorded that done is not currently legal under case_action_decision_check and only introduced via future lifecycle-domain expansion. v1.1 patch committed at <SHA>. Re-fire of D-01 on v1.1 pending in same session.'
WHERE review_id = 'a37eff28-2ba1-4a7a-8fbd-3e9aba738c79';
```

## §8 Deferred items

These are explicitly out of scope for cc-0017c per PK 4-item directive. Carried for future briefs.

1. **`case.dedupe_fingerprint NOT NULL` constraint addition** — carried from cc-0017b out-of-scope (Wave 0b deferred).
2. **`emission_rule_history` audit trigger** — carried from cc-0017b out-of-scope.
3. **Expanding `case_action_decision_check` to include `'done'`** — Amendment G nomenclature work; **explicitly carried per v1.1 Path A rationale** (`'done'` is not currently legal; introduce via future lifecycle-domain expansion if deemed needed; not authorised at v2.84).
4. **CHECK or trigger enforcing closure invariant** — backfill UPDATE encodes pattern only; future enforcement would catch violations at write-time rather than relying on backfill. Candidate: Wave 0e.
5. **Wave 0d — Triage/resolution SECURITY DEFINER functions** — post-cc-0017c, friction.case UPDATEs (e.g., setting action_decision) cannot be performed by service_role directly. Equivalent functions to emit_event are required for triage/resolution flows. Wave 0d new brief required before any triage/resolution UI work.
6. **PRV chain audit post-lockdown** — confirm op_reader and other PRV roles can still SELECT friction.event + friction.case post-lockdown via SECURITY DEFINER paths. Likely no impact (REVOKE was on INSERT/UPDATE, SELECT preserved), but worth a dedicated probe. P3 task.
7. **friction.case_history shadow table** — capture state changes for audit. Future wave (0e or later).
8. **case_id UNIQUE constraint on friction.event** — if multiple events should never share a case_id without explicit attach logic, this could be enforced. Currently 22 events / 22 cases (1:1 by construction), but no constraint preventing future 1:many drift. Out of scope; flagged.
9. **emit_event return type formalisation** — currently SETOF / record return; could be RETURNS TABLE for cleaner caller integration. Cosmetic; out of scope.
10. **postgres-grant audit** — postgres role has full ALL privileges. Should superuser-level operations route through dedicated DEFINER functions? Architectural question; out of scope for this wave.
