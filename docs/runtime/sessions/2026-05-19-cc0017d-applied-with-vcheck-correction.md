# 2026-05-19 Sydney — v2.86: cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION

> Per-session detail file. Sync_state v2.86 + action_list v2.86 reference this.
> Prior session: `2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md`.

---

## Outcome

cc-0017d Wave 0d **APPLIED-WITH-VCHECK-CORRECTION**. Six SECURITY DEFINER mutation functions deployed in the `friction.*` schema as the post-lockdown mediation layer for case state changes (Section B of cc-0017c revoked service_role's INSERT/UPDATE on `friction.event` and `friction.case`, making mediated functions the only sanctioned write path).

Friction Register Consolidation Plan v1: **gate 12 CLOSED**. 1-week empirical observation window (gate 11) remains active through 2026-05-26.

---

## Production mutations this session

Limited to the approved Wave 0d migration plus V-check fixture seed, V-check audit cleanup, V-check audit corrective cleanup, and D-01 close-the-loop. No other production writes.

| # | Migration | Purpose |
|---|---|---|
| 1 | `cc_0017d_friction_case_mutation_functions` | Main migration. Deploys 6 SECDEF functions. Applied via Path B-prime (inline compile fixes; two correction rounds before structural success). |
| 2 | `cc_0017d_vcheck_fixture_seed` | 7 test fixture cases seeded direct to `friction.case` (bypassed `emit_event` due to emission_rule CHECK constraint on test-prefix observation_text). |
| 3 | `cc_0017d_vcheck_audit_cleanup` | Initial cleanup attempt using PK-specified pattern `raw_payload::text LIKE '%cc-0017d-test/%'` (trailing slash). Zero-effect: my fixture fingerprints used hyphen-naming `cc-0017d-test-fp-NNN`, not slash-naming. |
| 4 | `cc_0017d_vcheck_audit_cleanup_v2` | PK-approved adjusted pattern `raw_payload::text LIKE '%cc-0017d-test%'` (drop trailing slash). Removed exactly 1 leftover V-D4 mark_duplicate audit row. |
| 5 | `cc_0017d_chatgpt_review_close` | UPDATE on `m.chatgpt_review` id `206d2258-775e-4fe1-b6d7-cc8ec614e42f`. `resolved_by='cc-0017d-close-v2.86'`; full disposition appended to `action_taken`. |

Production mutations v2.86 by type: **4 apply_migration** (DDL/data) + **1 m.chatgpt_review UPDATE** (exempt per the standing pattern; routed through apply_migration). **State-capture exceptions v2.86: 0** (cumulative: 1 unchanged).

---

## Functions deployed

All `SECURITY DEFINER`, owner `postgres`, `search_path=friction,public`, returning `out_`-prefixed table columns per L-v2.85-a discipline:

```
friction.triage_case(uuid, text, text DEFAULT 'pk', text DEFAULT NULL, timestamptz DEFAULT NULL)
  RETURNS TABLE(out_case_id uuid, out_triaged_at timestamptz,
                out_action_decision text, out_triage_state text)

friction.resolve_case(uuid, text, text DEFAULT 'pk')
  RETURNS TABLE(out_case_id uuid, out_resolved_at timestamptz,
                out_resolution_kind text)

friction.reopen_case(uuid, text DEFAULT 'pk', boolean DEFAULT false)
  RETURNS TABLE(out_case_id uuid, out_reopen_count integer,
                out_prior_resolution_kind text)

friction.mark_duplicate(uuid, uuid, text DEFAULT 'pk')
  RETURNS TABLE(out_case_id uuid, out_predecessor_case_id uuid,
                out_resolved_at timestamptz)

friction.record_first_view(uuid, text DEFAULT 'pk')
  RETURNS TABLE(out_case_id uuid, out_first_viewed_at timestamptz,
                out_was_already_viewed boolean)

friction.purge_test_case(text)
  RETURNS TABLE(out_events_deleted integer, out_cases_deleted integer,
                out_errors_deleted integer)
  -- service_role-only EXECUTE; postgres+authenticated GRANTs deliberately omitted
```

Grant matrix per §4 (17 rows): five public-mutation functions granted to `authenticated`+`service_role`+`postgres`; `purge_test_case` restricted to `service_role`+`postgres` only.

---

## Compile-fix rounds (Path B-prime)

The v1.0 brief migration had two latent syntactic defects that surfaced only at deploy-time. Both were inline-corrected without structural change to the function bodies; PK directive: "Path B-prime — inline fix; do not rollback if structurally sound."

### Round 1 — RAISE format strings (`%%` → `%`)

24 substitutions across 17 `RAISE EXCEPTION` lines. Root cause: brief authored with PL/pgSQL `%%` (escaped percent, intended for printf-style format strings outside `format()`), but RAISE EXCEPTION uses single `%` as the placeholder token in its OWN format-string grammar. Per-function counts:

| Function | RAISE substitutions |
|---|---|
| `triage_case` | 6 |
| `resolve_case` | 9 |
| `reopen_case` | 2 |
| `mark_duplicate` | 5 |
| `record_first_view` | 1 |
| `purge_test_case` | 1 (one literal `%%` kept inside the example wildcard string `(e.g. cc-0017d-test/%%)` — intentional literal percent in error message) |
| **Total** | **24** |

### Round 2 — ROWTYPE keyword quoting

6 substitutions: `friction.case%ROWTYPE` → `friction."case"%ROWTYPE`. Root cause: `case` is a reserved SQL keyword. PL/pgSQL DML grammar (UPDATE/INSERT/SELECT) is permissive and accepts unquoted `friction.case`; the ROWTYPE type-name parser is strict and requires quoting. Substitution sites: `triage_case` DECLARE, `resolve_case` DECLARE, `reopen_case` DECLARE, `mark_duplicate` DECLARE ×2, `record_first_view` DECLARE.

Both fix classes were verified via transactional dry-run `BEGIN; <full SQL>; ROLLBACK;` returning marker `cc_0017d_dryrun_passed_rollback_clean` with zero leaked function objects post-rollback before the production `apply_migration` call.

---

## V-check matrix — final disposition

23 V-checks executed. 22 strict PASS + 1 PARTIAL (PK-approved disposition).

| Check | Result | Notes |
|---|---|---|
| V-A1 — Deployed signatures byte-match brief §3 | ✅ PASS | All 6 functions; matches `out_`-prefix discipline (L-v2.85-a applied) |
| V-B1 — Security attributes | ✅ PASS | All 6: SECDEF + postgres owner + search_path=friction,public |
| V-C1 — Grant rows | ✅ PASS | 17 grants exactly per §4 matrix |
| V-C2 — purge_test_case grants | ✅ PASS | Not granted to authenticated; service_role+postgres only |
| V-D1 — triage_case positive smoke | ✅ PASS | triage_state transition NULL→triaged, action_decision='act_now' applied |
| V-D2 — resolve_case positive smoke | ✅ PASS | resolution_kind='resolved_external', `m.case.resolved_at` set |
| V-D3 — reopen_case positive smoke | ✅ PASS | reopen_count=0→1; prior resolution_kind returned |
| V-D4 — mark_duplicate positive smoke | ✅ PASS | Cross-fingerprint audit row written to `friction.emit_error` (this is the row cleaned up later in V-F1) |
| V-D5 — record_first_view idempotency | ✅ PASS | First call sets timestamp; second call returns `was_already_viewed=true` with same timestamp unchanged |
| V-E1 — invalid action_decision | ✅ PASS | SQLSTATE 22000 raised |
| V-E2 — invalid triage_state | ✅ PASS | SQLSTATE 22000 raised |
| V-E3 — resolve already-resolved | ✅ PASS | SQLSTATE P0001 raised |
| V-E4 — resolve nonexistent | ✅ PASS | SQLSTATE P0002 raised |
| V-E5 — reopen never-resolved | ✅ PASS | SQLSTATE P0001 raised |
| V-E6 — mark_duplicate same case as predecessor | ✅ PASS | SQLSTATE 22000 raised |
| V-E7 — mark_duplicate nonexistent predecessor | ✅ PASS | SQLSTATE P0002 raised |
| V-E8 — record_first_view nonexistent | ✅ PASS | SQLSTATE P0002 raised |
| V-E9 — triage nonexistent | ✅ PASS | SQLSTATE P0002 raised |
| V-E10 — purge_test_case invalid prefix | ✅ PASS | SQLSTATE 22000 raised; prefix regex enforced |
| V-F1 — purge_test_case deletion counts | ⚠️ PARTIAL | cases_deleted=7 ✅ matches functional intent. events=0 vs brief-expected ≥7 (V-D-setup used direct INSERT not emit_event due to emission_rule CHECK). errors=0 vs brief-expected ≥1 (mark_duplicate audit uses internal prefix `cc-0017d/mark_duplicate/` not test prefix `cc-0017d-test/`). **PK-approved disposition: APPLIED-WITH-VCHECK-CORRECTION; brief v1.1 doc patch P1 next session.** |
| V-Z1 — Strict-prefix residue (brief literal) | ✅ PASS | 0/0/0 across event/case/emit_error |
| V-Z2 — Total case baseline | ✅ PASS | total_cases=29 (= pre-Wave-0d baseline) |

---

## V-F1 corrective cleanup sequence

**Step 1** — Initial cleanup (PK-specified pattern, slash variant):

```sql
DELETE FROM friction.emit_error
WHERE source_event_id LIKE 'cc-0017d/mark_duplicate/%'
  AND raw_payload::text LIKE '%cc-0017d-test/%';
```

Applied as `cc_0017d_vcheck_audit_cleanup`. Zero rows matched. Root cause: my V-D-setup fixture fingerprints used `cc-0017d-test-fp-NNN` (hyphen) instead of the strict-prefix-convention `cc-0017d-test/fp-NNN` (slash). The strict prefix regex `^cc-[0-9]{4}[a-z]?-test/` defines what `purge_test_case` matches; my fingerprint values fell outside that pattern. Halted and reported.

**Step 2** — PK-approved adjusted pattern (drop trailing slash):

```sql
DELETE FROM friction.emit_error
WHERE source_event_id LIKE 'cc-0017d/mark_duplicate/%'
  AND raw_payload::text LIKE '%cc-0017d-test%';
```

Applied as `cc_0017d_vcheck_audit_cleanup_v2`. Safety analysis: still double-guarded by `source_event_id` prefix (Wave 0d internal audit namespace) AND `raw_payload` test-data reference (cannot appear in production mark_duplicate calls since test prefix is reserved). Expected_deleted=1; observed_deleted=1 (verified via `broad_mark_dup_internal_prefix` and `broad_emit_error_raw_payload_test_ref` both transitioning 1→0, same row, double-confirmed).

---

## Final residue verification

8 cross-checks, all zero/baseline post-cleanup:

| Check | Value |
|---|---|
| vz1_events_test_prefix | 0 |
| vz1_cases_test_prefix | 0 |
| vz1_errors_test_prefix | 0 |
| vz2_total_cases | **29** (= baseline) |
| broad_mark_dup_internal_prefix | 0 |
| broad_emit_error_raw_payload_test_ref | 0 |
| broad_event_test_ref | 0 |
| broad_case_test_ref | 0 |

---

## D-01 cycle

**review_id**: `206d2258-775e-4fe1-b6d7-cc8ec614e42f` (column: `m.chatgpt_review.id`)

Fresh fire pre-apply. Verdict `agree`. Bridge-set fields: `status='completed'`, `verdict='agree'`, `action_taken='proceed'`. PK granted apply approval same turn.

Close-the-loop UPDATE (via apply_migration `cc_0017d_chatgpt_review_close`): `action_taken` appended with full disposition narrative (V-check outcomes + two cleanup-migration cycles + brief v1.1 doc patch carry-forward); `resolved_by='cc-0017d-close-v2.86'`.

Schema note: column probe confirmed `m.chatgpt_review` PK is `id` (not `review_id`); no `terminal_status` column (use `status`); no `resolved_at` (use `escalation_resolved_at`). My initial UPDATE attempt used the prior-memory column names and failed with SQLSTATE 42703; corrected on probe. **L-v2.84-d candidate (schema-probe-before-DML) re-exercised** — but partially auto-resolved by L40 which I had been carrying. Net occurrence count for L-v2.84-d: 2.

---

## Items closed v2.86

- **cc-0017d apply** (was P1 rank 1 NEW-BLOCKING v2.85) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION** ✅
- **Fresh D-01 fire** (`206d2258-...`) → **resolved** ✅
- **V-F1 corrective cleanup** (cc_0017d_vcheck_audit_cleanup_v2) → **applied; 1 row deleted as expected** ✅
- **Friction Register Consolidation Plan gate 12** (Wave 0d) → **CLOSED** ✅

---

## Items newly active v2.86

- **cc-0017d v1.1 doc patch / cleanup-pattern correction** → P1 (NEW; per PK action-list directive). Scope: (a) RAISE %%→% + ROWTYPE quoting captured in migration-sql.md v1.0.1; (b) V-F1 expected counts reconciled to reflect mark_duplicate audit-prefix-namespace `cc-0017d/mark_duplicate/` not matching strict test-prefix regex; (c) V-D-setup fixture fingerprint naming convention documented (strict prefix requires `/` separator, not `-`).
- **Wave 0e — case history / audit authoring** → P2 (NEW per PK action-list directive). **Do NOT start in current session** per PK explicit instruction. Authoring deferred to future session.

---

## Items unblocked v2.86

- **cc-0015 friction-pool-view** (Wave 7, commit `9a5dc155`): Wave 0d gate cleared. Still gated on 1-week observation window closing 2026-05-26.
- **cc-0016 friction-capture-evidence** (Wave 8, commit `f35f8ea4`): Wave 0d gate cleared. Still gated on Wave 7 sequencing.

---

## Lessons exercised / candidates v2.86

**Exercised:**
- **L40** — column-name discipline. Initial close-the-loop UPDATE used prior-memory column names; corrected after probe. Discipline maintained on second attempt.
- **L41** — apply_migration for DDL; execute_sql for read probes only. Cumulative v2.80-v2.86: 6.
- **L46 Evidence Gate** — fresh D-01 with verbatim P-set + known_weak_evidence items.
- **L58** — atomic multi-file close via push_files (3 files; mitigation per L-v2.85-e applied: compact per-file payloads, no cross-file content duplication).
- **L62** — fresh D-01 cycle clean (agree verdict, procedural-only escalate).
- **L-v2.83-a** re-exercised (+1; cumulative 7+). STRONG PROMOTION CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL** — first proactive application. `out_`-prefix discipline pre-baked into brief signatures; V-A1 byte-match confirmed at deploy.
- **L-v2.85-b** — Path B-prime is inline-correction-during-apply variant of Path 1 (which is inline-rewrite-during-V-checks). Both preserve correct migration; rollback reserved for structural defects.
- **L-v2.85-d** — `friction.purge_test_case(text)` deployed as the postgres-owner cleanup helper recommended after cc-0017c smoke cleanup pattern.
- **L-v2.85-e** — multi-file push_files length budget. Mitigation applied: compact payloads, per-session-detail-in-detail-file-only.

**New candidates:**
- **L-v2.86-a candidate (NEW, HIGH-SIGNAL)** — Pre-apply syntactic validation via transactional dry-run (`BEGIN; <full SQL>; ROLLBACK;` with marker SELECT). Caught RAISE `%%` and ROWTYPE quoting defects before production apply. Recommendation: add to brief pre-flight P-set for any migration containing PL/pgSQL function bodies.
- **L-v2.86-b candidate (NEW)** — `RETURNS TABLE` columns should use `out_` prefix discipline to prevent accidental column-name collision with table columns in SELECT FROM functions. Already proactive in cc-0017d; documents the discipline.
- **L-v2.86-c candidate (NEW)** — Reserved SQL keywords (`case`, `user`, `order`, etc.) require quoting in ROWTYPE type-names even when permissive in DML grammar. Specific to PL/pgSQL DECLARE blocks.
- **L-v2.86-d candidate (NEW)** — Cross-column CHECK constraint pre-validation should run inline in PL/pgSQL before issuing the UPDATE to surface predictable validation errors as PL/pgSQL exceptions rather than raw constraint-violation SQLSTATEs.
- **L-v2.86-e candidate (NEW)** — Brief-vs-impl drift from fixture-path divergence: V-check fixture-data conventions (e.g., fingerprint naming) must align with the prefix regex that production purge helpers will match. Mismatch causes V-F1-type semantic-expectation drift even when functions work correctly.

---

## v2.86 honest limitations

- **Brief v1.0 had two syntactic defects** (RAISE %%, ROWTYPE quoting). Pre-flight syntactic validation would have caught both — L-v2.86-a addresses going forward.
- **V-F1 PARTIAL is brief-expectation drift, not migration failure.** The migration works correctly; the brief's expected event/error counts were authored without modeling that V-D-setup would bypass `emit_event` (constraint forced direct INSERT) and that mark_duplicate audits use internal-prefix namespace.
- **V-D-setup fixture naming used hyphen separator** (`cc-0017d-test-fp-NNN`) instead of strict-prefix slash (`cc-0017d-test/fp-NNN`). Caused PK's initial cleanup pattern to find 0 matches and required adjusted-pattern second cycle. L-v2.86-e candidate addresses.
- **3 migration entries for one logical apply cycle** (main + cleanup-v1-zero-effect + cleanup-v2-effective). Cleanup-v1 adds to migration history with zero functional effect. Trade-off accepted for auditability of PK's exact original pattern.
- **22 outstanding close-the-loop UPDATEs** unchanged (v2.86's 1 new closed in-session).
- **Memory cap 19/30** unchanged.
- **Dashboard PHASES 39th consecutive deferral** carried (PK directive: include only if part of standard close pattern; recent practice has been carry, so carry).
- **T-MCP-02 cum ~85** (rough; +execute_sql probes during compile-fix rounds and V-checks).
- **State-capture exceptions v2.86: 0; cumulative: 1 unchanged.**
- **1-week empirical observation window** continues 2026-05-19 → 2026-05-26. cron 85 first post-Wave-0d fire pending.
- **No decisions.md change.** Wave 0d apply is execution of v2.79-signed Friction Register Consolidation Plan.

---

*Per-session detail file written 2026-05-19 Sydney evening. Sync_state.md v2.86 + action_list.md v2.86 reference this. Dashboard roadmap untouched (39th consecutive carry). 3-file atomic push_files close.*
