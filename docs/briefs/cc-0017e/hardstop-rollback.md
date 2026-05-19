# cc-0017e v1.0 — Hard Stops & Rollback

**Status:** AUTHORED-PENDING-APPLY.
**Parent brief:** `docs/briefs/cc-0017e-friction-case-history-and-compat.md`

---

## 1. Forward-only convention

ICE migrations are **forward-only**. There is no down-migration. Recovery from a bad apply is achieved via corrective forward migration (e.g., `cc_0017e_friction_case_history_and_compat_v2`), NOT by reversing the original migration.

This convention is inherited from cc-0017a/b/c/d precedent and is preserved here. Rollback in the traditional ALTER-TABLE-DROP-COLUMN sense is not pursued for several reasons:
- Supabase `apply_migration` is single-transaction-per-call — a partial-apply window does not exist at the SQL level; either the whole migration commits or the whole migration rolls back.
- Down-migrations for SECURITY DEFINER function patches are non-trivial (would require capturing pre-patch function bodies + dependencies).
- The 8-row backfill is a one-time data correction; a "reverse backfill" would mean re-NULLing triaged_at/by, which is an audit-trail destruction operation and is operationally undesirable.

---

## 2. Apply atomicity

`apply_migration` runs the entire SQL payload in a single transaction. Either:
- (a) the whole migration succeeds (all DDL + all function patches + all backfill rows + all COMMENTs commit), OR
- (b) the whole migration fails (everything rolls back; database state is byte-identical to pre-apply).

There is no intermediate partial-apply state to recover from in the SQL sense.

**Out-of-band failure modes** that bypass apply_migration transactional safety:
- Supabase platform-side migration registry update failing AFTER SQL commit (very rare; would leave migration name unregistered but SQL applied). Detection: `list_migrations` shows missing entry. Recovery: register-only corrective migration with no-op SQL.
- Network drop between SQL commit and tool response. Detection: poll database state post-call. Recovery: idempotent re-apply impossible (DDL is not idempotent without IF NOT EXISTS); verify state and decide per-case.

---

## 3. Section-level rollback considerations

If a hypothetical post-apply discovery requires reverting any section, the corrective forward migration would look like:

### 3.1 Reverting case_history DDL (rare — only if table proves harmful)

```sql
-- Corrective migration: cc_0017e_drop_case_history
DROP TABLE friction.case_history CASCADE;
```

**Constraint:** DROP CASCADE removes the FK from any future child tables. Verify no other table has been added that references case_history before applying.

**When this would be used:** never expected; only if the entire shadow-table design is rejected by PK post-apply.

### 3.2 Reverting function patches (most likely rollback target)

Each of the 6 patched functions can be reverted to its pre-cc-0017e body via a CREATE OR REPLACE FUNCTION with the pre-patch body.

**Pre-cc-0017e function bodies** are captured in the v2.88 probe output (P5a for fn_triage_case; P6 for the 5 cc-0017d mutation functions). The transcript file at `/mnt/transcripts/2026-05-19-05-56-30-cc-0017e-wave-0e-brief-authoring.txt` preserves the exact pre-patch bodies for restoration if needed.

**Corrective migration name:** `cc_0017e_revert_function_patches`.

**Side effect of revert:** any case_history rows already inserted by the patched functions during their post-apply operational period would orphan their parent function semantics. The FK on case_id remains valid; the rows themselves remain queryable. Reverting the functions does NOT delete history rows already written.

### 3.3 Reverting backfill (NOT recommended)

```sql
-- Hypothetical reverse-backfill (audit-trail destruction — do NOT run without PK approval)
UPDATE friction."case"
SET triaged_at = NULL, triaged_by = NULL
WHERE triage_state = 'acknowledged' AND triaged_by = 'legacy_backfill';

-- And the corresponding history rows
DELETE FROM friction.case_history
WHERE changed_by = 'cc-0017e-backfill';
```

**This is audit-trail destruction.** Only run under explicit PK directive with documented rationale. Default disposition: backfill stays.

---

## 4. Apply-time hard stops (ABORT conditions)

ABORT means: do NOT proceed to `apply_migration`. If `apply_migration` is already in flight when the condition is detected, the transactional rollback handles it; the next action is investigation, NOT re-apply.

### 4.1 Hard stop — P-set FAIL

Any P-check FAIL in preflight-pset.md aborts apply. Specific bind:
- P1.1 FAIL: schema changed since authoring. Re-author needed.
- P1.2 FAIL: case_history already exists. Investigate; PK escalation.
- P1.3 FAIL: backfill target count ≠ 8. Investigate state drift; PK escalation.
- P1.4 FAIL: baseline count drift. PK escalation.
- P1.5 FAIL: function signature drift. Re-author needed.
- P2 FAIL: pre-apply harness syntax error. Fix brief; re-run P2.
- P3.1 FAIL: D-01 proposal incomplete. Complete proposal; re-run P3.
- P3.2 FAIL: duplicate D-01 fire same UTC day. PK escalation.

### 4.2 Hard stop — D-01 returns escalate=true with type-b objection

Per L62 disposition matrix:
- AGREE: proceed.
- PARTIAL with type-b objection (genuine new evidence): Path A correction; satisfy the corrected action, re-fire D-01.
- PARTIAL with type-c objection (echo of self-disclosed weak evidence): Path A correction; satisfy corrected action, re-fire D-01.
- DISAGREE: STOP. PK escalation. Do NOT state-capture override without explicit PK approval.
- REFUSE: STOP. Investigate refusal cause (likely a brief-level scope question).
- TIMEOUT: re-fire once. Persistent TIMEOUT = PK escalation.

### 4.3 Hard stop — V-A1 FAIL post-apply

If V-A1 byte-match on any of the 6 patched functions returns FAIL after apply:
- The function patch did NOT apply byte-stably (substitution-class drift slipped past P2 harness, OR an unexpected pg_get_function_identity_arguments format quirk).
- ABORT V-check matrix execution. Investigate root cause. May require corrective migration.

### 4.4 Hard stop — V-Z3 mismatched count

If V-Z3 returns mismatched operation ↔ history-row count after V-D positive smoke:
- One or more function patches has a silent INSERT failure into case_history.
- ABORT close. PK escalation. Do NOT mark migration closed-clean.
- Investigation path: query case_history filtered by change_kind for each operation type, identify which operation produced zero rows, inspect that function body, identify silent-failure cause.

### 4.5 Hard stop — Wave 0f scope creep detected

If during apply session a temptation arises to add scope (items B, E, F, or G from the OUT/DEFER list):
- STOP. Defer to a separate brief.
- Document the temptation in lessons-metadata-changelog.md as a discipline data point.

---

## 5. Recovery paths

### 5.1 Recovery: clean post-apply, all V-checks pass

Standard path. Proceed to close:
1. V-D fixture cleanup migration (`cc_0017e_vcheck_cleanup`).
2. Post-cleanup V-Z1/V-Z2/V-Z3 confirmation.
3. m.chatgpt_review close-the-loop UPDATE (`cc_0017e_chatgpt_review_close`).
4. 4-way sync close: per-session detail file + sync_state pointer update + action_list move + dashboard PHASES (likely deferral N+1).

### 5.2 Recovery: V-check FAIL classifiable as Path B-prime

For V-C1 (grant matrix drift), V-F1–F4 (backfill anomaly), V-Z1 (residue), V-Z2 (baseline drift up by V-D fixture count):
- Apply a Path B-prime corrective migration inline within the same apply session.
- Document drift in main brief as v1.1 addendum + lessons-metadata-changelog.md.
- Re-run affected V-checks until clean.

### 5.3 Recovery: V-check FAIL not classifiable

For V-A1 (signature byte-match), V-A2 (body recognition), V-B1/B2 (security attributes), V-D1–D6 (positive smoke fails), V-E1–E8 (negative tests fail), V-Z3 (operation alignment mismatch):
- PK escalation. Brief-level remediation likely required.
- Apply session is paused (not closed) until disposition.
- m.chatgpt_review row remains in `applied` status pending close.

### 5.4 Recovery: full rollback request

Under explicit PK directive only:
- Author corrective forward migration per Section 3.
- Author v1.1 addendum to main brief documenting rollback decision + rationale.
- Author session detail file documenting the rollback session.
- Update sync_state + action_list accordingly.

---

## 6. Apply session preflight checklist

Before typing the first `apply_migration` call:

- [ ] Read parent brief in full
- [ ] Read migration-sql.md in full
- [ ] Read vchecks.md in full
- [ ] Read risks-and-grants.md in full
- [ ] Read preflight-pset.md in full
- [ ] Read this file (hardstop-rollback.md) in full
- [ ] Confirm PK directive to apply (explicit phrase: "apply cc-0017e v1.0")
- [ ] Run P-set, document each P-check pass
- [ ] Run P2 harness, capture NOTICE output
- [ ] Fire D-01 with full proposal text
- [ ] Capture D-01 verdict before proceeding
- [ ] Only then: `apply_migration` with name `cc_0017e_friction_case_history_and_compat`

If any of the above is unchecked, STOP. Brief-level decisions must precede tool calls.
