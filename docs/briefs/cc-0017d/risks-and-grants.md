# cc-0017d — §3 Risks + §4 Grants

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** main brief **Next:** [`preflight-pset.md`](preflight-pset.md)

---

## §3 Risks

### §3.1 Parallel triage functions (`fn_triage_case` + `friction.triage_case`)

**Risk:** Two functions modify case rows with different field sets and stricter/looser validation. Operator UI must select one or risk inconsistent state semantics.

**Mitigation:**
- `friction.triage_case` is documented as the focused operator-intent path (action_decision + triage_state transition + triaged_at provenance).
- `fn_triage_case` remains as the richer multi-field partial-update path (category change, quality_flag, capture_reason, suppression_reason, notes).
- Both are SECDEF + postgres-owned; both safe under cc-0017c lockdown.
- Function comment on `friction.triage_case` explicitly cross-references `fn_triage_case` for unsupported field updates.
- Wave 0e tracks consolidation/deprecation decision.

**Residual:** Until Wave 7 UI wires exclusively to one, dashboard FAB and pool view may use either. Acceptable v1 cost.

### §3.2 Cross-column CHECK constraint enforcement

**Risk:** `track_or_defer_requires_next_review` and `suppress_requires_reason` are row-level CHECKs. A Wave 0d function leaving the row in an invalid combination fails atomically, exposing the operator to constraint-violation errors instead of clean validation feedback.

**Mitigation:**
- `friction.triage_case` rejects closure-class action_decisions (`suppress`/`ignore`/`duplicate`) up-front with a clear error directing operator to `resolve_case`/`mark_duplicate`.
- `friction.triage_case` validates `p_next_review_at` presence pre-UPDATE when `action_decision ∈ {track, defer_intentionally}`. If both the param AND the current column value are NULL, raises before issuing UPDATE.
- `friction.resolve_case` strict mapping (§2 Function 2 table) prevents resolving a `suppress`-decision case with `tracked_done` resolution.
- `friction.mark_duplicate` sets `action_decision='duplicate'`, which is exempt from both cross-column CHECKs.
- `friction.reopen_case` does not touch action_decision unless `p_clear_action_decision=true`, in which case it sets to NULL (also exempt).

**Residual:** Function callers must surface validation errors. SQLSTATE pattern: all validation raises use `ERRCODE 'P0001'` (raise_exception) with descriptive HINT.

### §3.3 Race condition: concurrent reopen + emit_event reopen

**Risk:** emit_event's automatic 14-day reopen path and operator-initiated `friction.reopen_case` could fire concurrently on the same case. Both attempt to clear `resolved_at`.

**Mitigation:**
- All Wave 0d functions acquire `FOR UPDATE` row lock on `friction.case` before issuing UPDATE.
- emit_event's `fn_attach_or_create_inner_v1` already uses `FOR UPDATE` (cc-0017b Step 4 body).
- Postgres serialises concurrent updates: one wins, the other sees the post-update state and either no-ops (case already reopen) or processes as expected.
- `reopen_count` increment is correct under serialisation (each successful UPDATE adds 1).

**Residual:** Last-writer-wins on `resolution_kind` (both set to `'reopened'`). Identical value, so practically a non-issue.

### §3.4 Test-purge regex strictness

**Risk:** `purge_test_case` accepts an operator-supplied pattern. Insufficient regex constraint could permit accidental production data deletion.

**Mitigation:**
- Regex hard-coded as `'^cc-[0-9]{4}[a-z]?-test/'`. Function raises with explicit error if pattern doesn't match.
- No bypass parameter.
- EXECUTE granted to `service_role` ONLY (NOT authenticated). Operator UIs cannot call this function from authenticated context.
- Pattern documented in §8 deferred items as the canonical test-data prefix convention for all future briefs.

**Residual:** A future brief author could create test data outside the `cc-NNNN[letter]-test/` prefix and would need to clean up via apply_migration manually (the cc_0017c_v_b4_smoke_cleanup pattern). Cost: small; the L-v2.85-d benefit is captured for prefix-conforming cleanup.

### §3.5 `mark_duplicate` cross-fingerprint warning

**Risk:** Operator marks a case as duplicate of a predecessor whose `dedupe_fingerprint` doesn't match. Legitimate when fingerprints diverge for the same logical issue (e.g., source migrated, or related_object shape changed).

**Mitigation:**
- Function compares fingerprints internally. If they differ, INSERTs an audit row into `friction.emit_error` with `error_code='CROSS-FINGERPRINT-DUPLICATE'`, but proceeds with the operation.
- Operator judgment trusted; audit trail preserved for future review.

**Residual:** Audit row consumption requires a future dashboard surface. Acceptable v1.

### §3.6 `friction.triage_case` strictness vs `fn_triage_case` permissiveness

**Risk:** Operator habituated to `fn_triage_case` (accepts any action_decision if other fields present) may be surprised by `friction.triage_case` rejecting closure-class action_decisions.

**Mitigation:**
- Error message specifically names the alternative function: `'For closure action_decisions (suppress/ignore/duplicate), use friction.resolve_case or friction.mark_duplicate instead.'`
- Function comment documents the boundary.
- Wave 7 pool view UI mockups will use the appropriate function per button (triage button → triage_case; resolve button → resolve_case; mark-as-duplicate button → mark_duplicate).

**Residual:** One-time training cost on UI button mapping. Cleaner separation of concerns wins.

### §3.7 SECURITY DEFINER + missing search_path = privilege escalation

**Risk:** SECURITY DEFINER functions without explicit `SET search_path` are vulnerable to search_path injection attacks where a malicious user creates objects in their schema that override `friction.*` resolution.

**Mitigation:** All 6 functions set `SET search_path = friction, public` (matches cc-0017b/c precedent + emit_event prototype).

**Residual:** None. Defensive default.

### §3.8 First-triage timestamp semantics — confirming operator intent

**Risk:** Amendment C says `triaged_at = First non-NULL action_decision time`. `friction.triage_case` sets `triaged_at = now()` only when currently NULL. But what about the 8 existing cases that have `action_decision` set (via `fn_triage_case`) with `triaged_at` still NULL?

**Mitigation:**
- v1 behaviour: `friction.triage_case` re-call on an already-acknowledged case sets `triaged_at = now()` ONLY if currently NULL. So the 8 existing cases would get `triaged_at` set on the next triage_case call (not their actual first triage).
- This is a known data quality gap. Out of scope for Wave 0d (backfill in Wave 0e or never).
- V-D2 smoke confirms the "only-if-NULL" behaviour on a fresh test case.

**Residual:** 8 cases have stale `reviewed_at` but NULL `triaged_at`. Amendment C metric "triage time" calculations should exclude these or treat as `reviewed_at` proxy.

---

## §4 Function-level grant matrix

All 6 functions: `SECURITY DEFINER`, owner=`postgres`, `SET search_path = friction, public`, `LANGUAGE plpgsql`.

| Function | postgres (owner) | service_role | authenticated | PUBLIC |
|---|---|---|---|---|
| `friction.triage_case` | EXECUTE | EXECUTE | EXECUTE | none |
| `friction.resolve_case` | EXECUTE | EXECUTE | EXECUTE | none |
| `friction.reopen_case` | EXECUTE | EXECUTE | EXECUTE | none |
| `friction.mark_duplicate` | EXECUTE | EXECUTE | EXECUTE | none |
| `friction.record_first_view` | EXECUTE | EXECUTE | EXECUTE | none |
| `friction.purge_test_case` | EXECUTE | EXECUTE | none | none |

**Pattern matches `friction.emit_event` (P-ζ probe):** postgres + service_role + authenticated. `purge_test_case` deliberately tighter (service_role only) per blast-radius mitigation.

**Idempotent grant strategy:** all 6 GRANT statements followed by explicit `REVOKE EXECUTE ... FROM PUBLIC` to defend against Postgres default-grant behaviour on functions.

### §4.1 Authorisation gates

- **G1 — Brief commit:** v1.0 main + sub-files (this commit + the surrounding push_files calls)
- **G2 — D-01 fire:** PENDING (next step after this commit)
- **G3 — Apply:** GATED on D-01 verdict + PK explicit approval; pre-flight P-set rerun must match brief-authoring reference values (drift detection per L-v2.81-a)
- **G4 — Post-apply close-the-loop:** Automatic on V-check pass; UPDATE on m.chatgpt_review with action_taken summary; 4-way atomic sync close (sync_state v2.86 + action_list v2.86 + per-session + dashboard PHASES carry-or-update)
- **G5 — Hard-stop:** Triggered by V-check failure or D-01 reject — see `hardstop-rollback.md §5.4`
