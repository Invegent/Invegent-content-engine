# cc-0017e v1.0 — Lessons, Metadata & Changelog

**Status:** AUTHORED-PENDING-APPLY.
**Parent brief:** `docs/briefs/cc-0017e-friction-case-history-and-compat.md`

---

## 1. Lesson candidates from authoring (v2.88)

Proposed for promotion to L-v2.88 family at session close. PK to confirm.

### L-v2.88-a — Substring-match probes on function bodies require body inspection to disambiguate code-path vs hint-string

**Source:** P3 / P6 finding correction (v2.88). The probe `prosrc ILIKE '%fn_triage_case%'` returned `friction.resolve_case` as a caller. Body inspection (P6) revealed the reference was inside a `HINT` string in a `RAISE EXCEPTION`, not an actual code path.

**Lesson:** any substring-match probe on `pg_proc.prosrc` is subject to false-positive matches against:
- HINT strings in RAISE EXCEPTION clauses
- Error message format strings
- Comments within function bodies (PL/pgSQL comments are part of prosrc)
- Documentation strings or test markers

**Mitigation:** when probing for callers, follow up with body inspection of any positive matches. Look for actual call syntax (`schema.function_name(...)`) or `PERFORM schema.function_name(...)`, not just textual occurrence.

**Why it matters:** in cc-0017e authoring, the false-positive shifted the rationale for item C from "in-suite call protection" to "defensive prospective protection for external callers". Same scope decision, different framing. Had the false positive been state-captured as ground truth, the brief would have over-claimed certainty about who calls fn_triage_case.

### L-v2.88-b — Shadow-table operation alignment cross-check (V-Z3 convention)

**Source:** Convention codification in this brief (item H per PK directive).

**Lesson:** for any brief introducing or writing to a shadow table, the post-apply V-check matrix MUST include an operation ↔ shadow-row alignment check: the count of operations exercised in V-D positive smoke MUST equal the count of shadow-table rows added by those operations, grouped by operation type.

**Detection target:** silent INSERT failures inside mutation function patches caused by:
- CHECK constraint mismatches (typo'd change_kind values)
- Permissions gaps (rare for SECURITY DEFINER but worth verifying)
- EXCEPTION-swallowed code paths (`EXCEPTION WHEN OTHERS THEN NULL;` wrapping the INSERT)
- Conditional logic that unexpectedly skips the INSERT (e.g., the record_first_view idempotent-path skip if applied to wrong functions)

**Without V-Z3:** positive smoke tests pass (the function does its primary job), but the audit trail is silently incomplete.

### L-v2.88-c — Probe re-verification gate at apply time

**Source:** preflight-pset.md P1 design (v2.88).

**Lesson:** authoring-time probes capture a snapshot. Between authoring and apply, the database state may drift. Pre-apply P-set MUST re-run the critical probes to confirm no drift (target counts, baseline counts, function signatures, schema topology) before D-01 fires.

**Existing precedent:** Lesson 61 P1-P5 discipline. cc-0017e extends by adding specific re-verification of the exact probe results that gated the brief design (e.g., "the 8 backfill targets are still exactly 8").

### L-v2.88-d — In-function INSERT pattern for shadow tables (alternative to trigger-based)

**Source:** P5b finding (v2.88). friction.emission_rule has no triggers; emission_rule_history is populated by explicit INSERTs from rule-management code paths. cc-0017e follows the same pattern for case_history.

**Lesson:** for shadow tables in friction.* (and similar locked-down schemas), the in-function INSERT pattern is preferred over trigger-based history population because:
- Captures semantic change_kind (the trigger would see only an UPDATE; the function knows it was a 'triage' or 'resolve')
- Aligns with the SECURITY DEFINER mutation function pattern — history INSERT inherits the same privilege bypass
- Avoids trigger ordering complexity if other triggers exist on the parent table

**Trade-off:** direct UPDATEs from postgres-owner role bypass the in-function pattern and leave no history row. cc-0017c lockdown closes direct service_role DML, so the residual risk is only postgres-owner DML (rare, typically during migrations). Acceptable given the lockdown context.

---

## 2. Lesson candidates expected at apply

Placeholders to be filled in at apply close. PK and the apply-session Claude will add discovered lessons.

- L-v2.XX-a (apply): observed substitution-class drift, if any
- L-v2.XX-b (apply): V-check drift dispositions
- L-v2.XX-c (apply): D-01 escalation handling, if escalate=true
- L-v2.XX-d (apply): fixture cleanup outcomes
- L-v2.XX-e (apply): m.chatgpt_review close-the-loop status
- L-v2.XX-f (apply): any external-caller surface that surfaces during V-D6 or post-apply integration testing

---

## 3. Authoring metadata

### 3.1 Commit map

| Commit | SHA | Files | Purpose |
|---|---|---|---|
| 1 | `8502fc49a0d981e95f8fed6bd7c3ece438fc669c` | 1 | Main brief (`docs/briefs/cc-0017e-friction-case-history-and-compat.md`) |
| 2 | `1659b293da007ced41a6d0b08def1061dd38a414` | 4 | Substantive sub-files: migration-sql, vchecks, risks-and-grants, preflight-pset |
| 3 | `<this-commit-SHA>` | 3 | Process sub-files: hardstop-rollback, d01-postapply-deferred, lessons-metadata-changelog |

Total: 8 files across 3 commits per L-v2.85-e split-commit pattern.

### 3.2 File inventory

| File | Content SHA | Size (bytes) | Section role |
|---|---|---|---|
| `cc-0017e-friction-case-history-and-compat.md` | `a50e26e663dd6725044df0aaebd9e9672797ab88` | 21,698 | Main brief |
| `cc-0017e/migration-sql.md` | `d1946d7afb64f0a656f3469d2aee5530fceb58dd` | 27,203 | Apply SQL |
| `cc-0017e/vchecks.md` | `eef59ec5b2c38b3a7fac3c2aa565ecfc9f5a1ef9` | 19,661 | V-check matrix + V-Z3 codification |
| `cc-0017e/risks-and-grants.md` | `b52f1d8b8cf9d4aff5d2afdce0002c7e86fe2f91` | 9,346 | Grant matrix + risk register |
| `cc-0017e/preflight-pset.md` | `268f973b416ee87ff73201e2c7b9b096cccf0e2d` | 7,996 | Pre-apply P-set |
| `cc-0017e/hardstop-rollback.md` | `<sha-from-commit-3>` | (this file) | Hard stops + rollback |
| `cc-0017e/d01-postapply-deferred.md` | `<sha-from-commit-3>` | (this file) | D-01 fire template |
| `cc-0017e/lessons-metadata-changelog.md` | `<sha-from-commit-3>` | (this file) | Lessons + metadata + changelog |

### 3.3 Probe inventory (v2.88 authoring)

| Probe | Target | Result |
|---|---|---|
| P1 | friction.* table inventory | 9 tables |
| P1b | friction.case + emission_rule_history + emission_rule columns | 28 / 7 / 12 columns |
| P2 | friction.* function inventory + triage-write flag | 19 functions; 2 triage-writers (triage_case, mark_duplicate); fn_triage_case does NOT write triaged_at/by |
| P3 | fn_triage_case caller substring match | 1 hit (resolve_case) — false positive corrected by P6 |
| P4 | triage_state distribution + NULL-triage breakdown | 21 new + 8 acknowledged; 8 backfill targets confirmed |
| P5a | fn_triage_case body | Confirms triaged_at/by absent; sets reviewed_at = now() on every call |
| P5b | trigger landscape on case + event + emission_rule | Only DELETE-prevention triggers on case + event; emission_rule has zero triggers |
| P6 | cc-0017d mutation function bodies (5 functions) | All ROWTYPE-quoted; resolve_case fn_triage_case reference is HINT-string not code path |

**Net production mutations from authoring session:** 0
**Net T-MCP-02 consumption from authoring session:** 0
**Net D-01 fires from authoring session:** 0
**Net memory edits from authoring session:** 0
**Memory cap status:** 19/30 unchanged
**State-capture exceptions cumulative:** 1 (unchanged)

### 3.4 Session metadata

- **Session ID context:** v2.88 (2026-05-19 Sydney evening)
- **Predecessor session:** v2.87 (cc-0017d v1.1 doc patch closed at commit `f0367405`)
- **Authoring agent:** Claude (chat)
- **Authoring scope:** brief files only
- **Transcript file:** `/mnt/transcripts/2026-05-19-05-56-30-cc-0017e-wave-0e-brief-authoring.txt` (full pre-compaction record)
- **Session compaction event:** 1 (mid-authoring; commits 1 + 2 preserved in compaction summary; commit 3 completed post-compaction)

---

## 4. Changelog

### v1.0 (2026-05-19 Sydney evening v2.88)

**Authored** — PENDING APPLY.

**Scope confirmed by PK directive:**
- IN: items A (case_history shadow table), C (fn_triage_case compat patch), D (8-row backfill), H (V-Z3 convention), and A-extended (5-function patch surface)
- OUT/DEFER: items B (operator-action audit via emit_event), E (fn_triage_case rename), F (open/resolved write-side CHECK), G (emit_event rule relaxation)

**Authoring artefacts:** 8 files across 3 commits per L-v2.85-e split-commit mitigation.

**Empirical foundation:** 8 read-only probes (P1–P6) executed against project mbkmaxqhsohbtwsqolns. Zero production mutations. Zero D-01 fires.

**Key design decisions locked at authoring (PK may override at D-01 / v1.1):**
1. case_history change_kind enum: `{triage, resolve, reopen, mark_duplicate, first_view, compat_legacy_triage, backfill}` (no `'create'` in v1.0)
2. fn_triage_case patch adds optional `p_actor text DEFAULT NULL` (signature-compatible)
3. Triage transition gating: triaged_at/by set only on first 'new'→non-'new' AND when current value IS NULL (idempotent)
4. Backfill triaged_by sentinel: `'legacy_backfill'`
5. Backfill triaged_at source: `COALESCE(reviewed_at, updated_at)` — resolves to reviewed_at for all 8 targets
6. All 5 cc-0017d mutation functions get case_history INSERT patches; record_first_view skips INSERT on idempotent path
7. V-Z3 convention codified inline in `cc-0017e/vchecks.md` Section X; no new process doc created

**Key correction during authoring:** fn_triage_case caller probe returned a false-positive (HINT-string substring match in resolve_case). Item C rationale shifted from "in-suite call protection" to "defensive prospective protection for external callers". Scope decision unchanged. Documented in L-v2.88-a candidate.

**Apply prerequisites confirmed (per v2.87 sync_state):**
- cc-0017d Wave 0d CLOSED-APPLIED-WITH-VCHECK-CORRECTION ✅
- cc-0017c lockdown applied ✅
- friction schema event_source_fk in place ✅
- service_role REVOKE on event+case for direct DML in place ✅

**Open at close of authoring:**
- D-01 fire deferred to apply session
- apply_migration deferred to apply session
- V-check execution deferred to apply session
- 4-way sync close pending for authoring session (per-session file + sync_state v2.88 update + action_list v2.88 update + dashboard PHASES deferral)

---

## 5. Sign-off

**Authored by:** Claude (chat) v2.88
**Authored for:** PK / Invegent Content Engine
**Authoring date:** 2026-05-19 Sydney evening
**Next action:** 4-way sync close for v2.88 authoring session (per-session file + sync_state + action_list + dashboard PHASES)
**Subsequent action (TBD timing):** Apply session under PK directive with full P-set + D-01 + V-check matrix execution.

End of cc-0017e v1.0 brief.
