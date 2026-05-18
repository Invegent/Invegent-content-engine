# cc-0017b § 9–11 — Lessons Reference, Brief Authoring Metadata, Changelog

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`d01-postapply-deferred.md`](d01-postapply-deferred.md) **Next:** (end of brief)

---

## 9. Lessons reference

This brief follows the established lesson baseline. Cross-references to the lessons that shaped specific design decisions:

- **L33 — Event trigger pre-flight survey mandatory.** §5.1 P3 inventories existing triggers; migration adds no new triggers (only replaces function bodies via `CREATE OR REPLACE FUNCTION`).
- **L34 — Trigger filter audit.** The new `fn_promote_event_to_case` body checks GUC + has `IF NEW.case_id IS NOT NULL THEN RETURN NEW` idempotency. V-B5 verifies the body contains both.
- **L35 — `INSERT ... ON CONFLICT DO UPDATE` for k.* registry rows.** emit_event uses `EXCEPTION WHEN unique_violation` instead (cleaner control flow for the `idempotent_replay` return path on `friction.event (source, source_event_id)`). Pattern variation, not deviation.
- **L40 — TypeScript compile checks cannot validate Supabase `.select(...)` string projections.** Not applicable (no TS this brief).
- **L41 — Chat-side MCP commits can drift local deploy machine.** Not applicable (no local deploy in 0b; pure DB migration via Supabase MCP `apply_migration`). **v1.1 update:** L41 surfaced 3 brief-SQL defects in-session at apply time (P16 NULL handling; V-B22 FK columns; V-B27 cleanup orphan patterns) — patched in v1.1 doc patch. Cumulative L41 occurrences across v2.80–v2.82 = 6. Baseline tightening recommendation reinforced.
- **L46 — Evidence Gate.** D-01 fields in §6 separate strong vs weak evidence per Lesson 46; 8 known-weak items listed for ChatGPT review to score against.
- **L58 — Atomic push_files for documentation closes.** Brief authoring uses sequential single-file commits (different from 4-way sync close which uses atomic push). **v1.1 patch update:** the 6 v1.1 patch files are committed sequentially (one per file) due to combined payload size; the 4-way sync close at session end uses atomic push_files as baseline.
- **L61 — Pre-flight verification before mutation (Q1–Q5 / P1–P5).** §5.1 P-set has 16 checks (P1–P16) covering schema state, function signatures, trigger inventory, seed slate, CHECK constraints, row counts, indexes, function volatility, drift universe, category code presence, and GUC clean state. Hard-stop summary explicit.
- **L62 — D-01 review protocol.** §6 supplies the 7 mandatory fields. Path A (satisfy corrected action) is the preferred response to partial verdicts. **v1.1 update:** L62 exercised at apply time (corrective D-01 `a6415afa-...` partial verdict resolved via Path A satisfy-corrected-action). Baseline application correct.
- **L-v2.81-a (candidate) — parallel-session apply coordination.** Carried from v2.81. **v1.1 update:** not exercised at v2.82 apply — single apply session.

No new lessons proposed in this brief. Any new lessons surfacing during apply or D-01 review should be added to `docs/07_lessons.md` as part of the close-the-loop sync.

---

## 10. Brief authoring metadata

| Field | Value |
|---|---|
| Brief ID | cc-0017b |
| Version | **v1.1** (doc-only patch — 6 defects + 2 rollback bodies inlined) |
| Wave | 0b of 10 (Friction Register Consolidation Plan) |
| Authored | 2026-05-18 Sydney evening (v1.0); v1.1 patched 2026-05-18 Sydney late evening |
| Authoring sessions | 1 (v1.0 post-cc-0017a v2.81 close) + 1 (v1.1 post-apply doc patch) |
| Author | Chat-side Claude on PK directive |
| Pre-brief introspection | 3 read-only `execute_sql` queries against `mbkmaxqhsohbtwsqolns` |
| Migration name | `cc_0017b_friction_unified_emit_event` (main) + `cc_0017b_emit_event_ambiguity_fix` (corrective) — both applied 2026-05-18 (v2.82) |
| Atomicity | single transaction; all-or-nothing per PostgreSQL DDL semantics |
| Files in brief | 8 (1 index + 7 sub-files under `docs/briefs/cc-0017b/`) |
| Total V-checks | 27 (V-B1 through V-B27) |
| Total pre-flight queries | 16 (P1 through P16) |
| Hard-stop conditions | 28 (27 V-check failures + apply_migration raise + Step 1 backfill failure) |
| New objects created | 1 column (dynamic_context), 1 CHECK extension, 3 functions (emit_event, fn_severity_rank, fn_attach_or_create_inner_v1), 4 function-body rewrites, 3 emission_rule seed rows, 3 GRANTs |
| Behavioural change | SUBSTANTIAL — all 3 production emitters migrate to thin wrappers; trigger logic rewrites |
| Backward compatibility | Wrapper signatures preserved exactly; existing callers (cron 85, Cowork v3.0, FAB) require zero changes |
| Apply timing window | outside 03:30 AEST ± 30min (cron 85) and 02:00 AEST ± 30min (cron 86) |
| Rollback complexity | 5 sub-steps; v1.1 inlines all 4 verbatim cc-0014 function bodies (no apply-session capture required) |
| Dependencies | cc-0017a v1.1 CLOSED-APPLIED at migration version `20260518065610` |
| Unblocks | Wave 0c (cc-0017c) authoring — direct-write lockdown + FK hardening + backfill |
| External dependencies updated | none |
| Cowork brief amendment required | NONE |
| FAB dashboard amendment required | NONE |
| Cron 85 trigger amendment required | NONE |
| Status | CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION 2026-05-18 (v2.82); doc-only v1.1 patch 2026-05-18 |

### Brief structure (8 files)

| File | Sections | Size (approx, v1.1) |
|---|---|---|
| `cc-0017b-friction-register-unified-emit-event.md` (index) | Header + 1 + 2 | ~13.7 KB |
| `cc-0017b/risks-and-grants.md` | 3 + 4 | ~10.3 KB |
| `cc-0017b/preflight-pset.md` | 5.1 | ~10.6 KB (v1.1: +0.6 KB for P16 fix) |
| `cc-0017b/migration-sql-part-a.md` | 5.2 Steps 1–6 | ~21.7 KB (v1.1: +0.5 KB for Step 9 comment) |
| `cc-0017b/migration-sql-part-b.md` | 5.2 Steps 7–11 | ~15.1 KB |
| `cc-0017b/vchecks.md` | 5.3 | ~35.0 KB (v1.1: +6.6 KB for V-B12/13/14/22/27 + V-B15 fix) |
| `cc-0017b/hardstop-rollback.md` | 5.4 + 5.5 | ~17.5 KB (v1.1: +1.0 KB for inlined rollback bodies) |
| `cc-0017b/d01-postapply-deferred.md` | 6 + 7 + 8 | ~10 KB |
| `cc-0017b/lessons-metadata-changelog.md` | 9 + 10 + 11 | ~12 KB (v1.1: +2.3 KB for changelog) |
| **Total brief size (v1.1)** | | **~146 KB** (was ~131 KB at v1.0) |

---

## 11. Changelog

### v1.1 — 2026-05-18 Sydney late evening (this version)

Doc-only patch addressing 6 brief defects surfaced during apply (v2.82) and inlining 2 rollback body placeholders. **No production mutations this version.** Brief content advances; migration history unchanged (corrective migration `cc_0017b_emit_event_ambiguity_fix` was applied at v2.82, not in this patch).

**Defects addressed (6):**

1. **`migration-sql-part-a.md` — emit_event Step 9 unqualified WHERE clause.** The Step 9 `UPDATE friction.event SET case_id = v_case_id WHERE event_id = v_event_id` raised SQLSTATE 42702 (ambiguous column reference) because `RETURNS TABLE (event_id uuid, ...)` creates an implicit OUT parameter `event_id` that shadows the column. v1.1 schema-qualifies: `WHERE friction.event.event_id = v_event_id`. Brief now matches the corrective migration `cc_0017b_emit_event_ambiguity_fix` applied at v2.82.

2. **`preflight-pset.md` — P16 NULL-or-empty GUC handling.** `current_setting(name, missing_ok := true)` returns NULL (not empty string) when the GUC has never been set in the session. v1.0's literal `= ''` check therefore FAILED on a clean session (NULL = '' yields NULL, not true). v1.1 uses `COALESCE(current_setting(...), '') = ''` to accept either NULL or empty string as "unset". P-set hard-stop summary updated. V-B20 + V-B21 in `vchecks.md` updated to match.

3. **`vchecks.md` — V-B12, V-B13, V-B14, V-B22 data-modifying CTE chains.** PostgreSQL evaluates all CTEs in a single statement against the same snapshot — the second `friction.emit_event(...)` call inside a `WITH first_emit AS (...), second_emit AS (...)` chain does NOT observe the case created by the first call. Attach/reopen paths were therefore under-tested in v1.0. v1.1 converts these 4 V-checks to sequential per-statement pattern via temp tables. Each emit now runs in its own snapshot.

4. **`vchecks.md` — V-B15 expected `category_source` typo.** v1.0 expected `category_source_actual='manual_at_capture'`. Correct value is `'emitter_default'`: emit_event Step 5 evaluates the CASE to `'manual_at_capture'` ONLY when `p_reported_by='pk' AND p_category_override IS NOT NULL`. V-B15 passes `p_reported_by='pk'` but does NOT pass `p_category_override` → falls through to `'emitter_default'`. v1.1 corrects expected value + inline comment.

5. **`vchecks.md` — V-B22 missing NOT NULL FK columns.** v1.0 INSERT into `r.cadence_drift_log` omitted 3 NOT NULL FK columns: `drift_check_run_id`, `created_by_run_id`, `updated_by_run_id` — all FK to `r.reconciliation_run(reconciliation_run_id)`. The INSERT would fail before reaching the trigger. v1.1 adds the 3 columns with subquery satisfiers selecting the most recent succeeded `r.reconciliation_run` row.

6. **`vchecks.md` — V-B27 cleanup pattern misses.** v1.0 cleanup used `source_event_id LIKE 'cc-0017b-test/%'` exclusively, which missed: (a) V-B17 + V-B24 manual-wrapper rows where `source_event_id='manual/<uuid>'` AND `problem_key` is normalised with underscores (`cc_0017b_test_v_b17_manual_at_capture_preservation`); (b) V-B23 health_check rows where problem_keys are stripped of `priority-N/` prefix (`test-explicit`, `true-stuck-instagram-test-client`). v1.1 adds `LIKE 'cc_0017b_test_%'` + explicit `IN (...)` patterns to catch all 3 cohorts. Residual SELECT extended to match.

**Rollback body placeholders inlined (2):**

7. **`hardstop-rollback.md` §5.5.5c — `fn_emit_health_check_findings`.** v1.0 carried "Reference shape only — DO NOT execute" schematic body. v1.1 inlines the verbatim cc-0014 body retrieved from `supabase_migrations.schema_migrations` row `cc_0014_c_health_check_emitter` (version `20260514233321`), including REVOKE/GRANT statements.

8. **`hardstop-rollback.md` §5.5.5d — `fn_emit_manual_event`.** Same pattern. Verbatim body retrieved from `supabase_migrations.schema_migrations` row `cc_0014_d_manual_emit_function` (version `20260515005315`), including REVOKE/GRANT statements.

**Files changed in v1.1:**

| File | Defect(s) addressed |
|---|---|
| `cc-0017b-friction-register-unified-emit-event.md` (index) | Version + status header bump |
| `preflight-pset.md` | Defect 2 (P16) + summary line |
| `migration-sql-part-a.md` | Defect 1 (Step 9 WHERE) |
| `vchecks.md` | Defects 3, 4, 5, 6 (V-B12/13/14 + V-B15 + V-B22 + V-B27) + V-B20/V-B21 GUC-check parity |
| `hardstop-rollback.md` | Placeholders 7, 8 (§5.5.5c + §5.5.5d verbatim bodies) + V-B21 hard-stop summary parity |
| `lessons-metadata-changelog.md` | This changelog entry + metadata version bump + L41/L58/L62 v1.1 updates |

**Commit pattern:** 6 sequential single-file commits (one per file) due to combined v1.1 patch payload size exceeding bridge per-call comfort zone. L58 baseline (atomic push_files) is preserved for the 4-way sync close at session end. Brief consistency is acceptable to temporarily break across the 6 commits because cc-0017b is already in `CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION` status and the patch is doc-only.

**No D-01 fired this version.** Doc-only patch; no production mutations.

### v1.0 — 2026-05-18 Sydney evening

Initial brief authored after read-only introspection captured 3 evidence snapshots from `mbkmaxqhsohbtwsqolns`:

- **Q1** Function signatures for the 3 production emitters + helpers.
- **Q2–Q3** CHECK constraints + trigger inventory + idempotency schema state.
- **Q4–Q8** Empirical drift_type universe + health_check problem_key universe + transition-window calibration + fingerprint format split.

**Locks incorporated from PK directives 2026-05-18:**

1. **GUC bypass** for trigger no-op when emit_event in control. Transaction-local via `set_config(..., is_local := true)`. GUC name: `friction.emit_event_active`.
2. **source_event_id idempotency** leveraging existing `UNIQUE (source, source_event_id)` constraint. emit_event catches `unique_violation` → returns `idempotent_replay` disposition.
3. **p_category_override parameter** added to emit_event signature (Amendment E.1 extension to Amendment E's p_severity_override).
4. **reported_by enum-safe** validation — emit_event raises P0001 if `p_reported_by` not in the 5-value enum.
5. **Reopen marker semantics locked** — `resolved_at = NULL` + `resolution_kind = 'reopened'` + `reopen_count++`. Severity REPLACES (not max) on reopen per PK directive.
6. **DO NOT add `'severity_override'`** to category_source enum. Store severity override provenance in `dynamic_context` jsonb column instead.
7. **Add `'category_override'`** to category_source enum only for non-manual paths.
8. **Health_check 3-tier `condition_key` resolution** — (1) explicit `condition_key` field → (2) parse `'true-stuck-*'` problem_key → `'true_stuck'` → (3) `emit_error` code `'CONDITION-KEY-UNRESOLVED'` + skip.

**No D-01 fired this version.** No production mutations this version.

---

### Future patch slots

| Slot | Purpose | Trigger |
|---|---|---|
| v1.2 | Defects surfaced in any post-v1.1 review or further apply-time learnings | Any V-check fails on re-apply; or PK requests additional clarity |
| v2.0 | Per-source tunable reopen window + cross-source dedupe | Empirical data after ~30 days of cc-0017b production |

---

**END OF BRIEF.** Return to [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md) (index).
