# cc-0017d — §9 Lessons + §10 Metadata + §11 Changelog

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** [`d01-postapply-deferred.md`](d01-postapply-deferred.md) **End of brief.**

---

## §9 Lessons referenced

### Applied at authoring

- **L-v2.85-a (HIGH-SIGNAL candidate)** — V-check function signature validation at brief authoring time. Use `pg_get_function_identity_arguments` to read deployed signature back and assert exact byte-match against brief expectations. **Realised here in V-A1** which checks all 6 deployed function signatures in a single batch query against the documented expected values in vchecks.md. Promote to STRONG if V-A1 catches drift at apply.

- **L-v2.85-d (candidate)** — Need for a `purge_test_case` helper to clean V-check fixtures via SECDEF rather than apply_migration. **Realised here in Function 6** with strict regex prefix and service_role-only EXECUTE. Promote to L-v2.85-d-CONFIRMED at G4 close.

- **L-v2.85-e (candidate)** — Compact payloads / multi-file commits to avoid push_files response truncation. **Applied here** by splitting brief into 8 files committed across 5 commits rather than a single monolithic push_files. Second realisation; stays candidate.

- **L46 (Evidence Gate)** — Empirical state must be verified before authoring. **Applied here** via probes P-α through P-ζ executed pre-authoring; results recorded in main file §1.1 with exact CHECK definitions, grant counts, lifecycle buckets. No assumption-based content.

- **L58 (atomic close-the-loop)** — All G4 sync writes commit atomically. **Documented in §7** as the required post-apply discipline.

- **L62 (D-01 cycle)** — Every production mutation requires D-01 fire; on escalate=true, classify objections and follow Path A (satisfy corrected action) preferentially over state-capture override. **Documented in §6** and §5.4-C with the type-b vs type-c distinction.

- **L33 (Event trigger pre-flight survey)** — Mandatory for DDL in `k.schema_registry`-registered schemas. **Not applicable here** (function-only migration, no DDL on tables registered with friction schema). Noted for completeness.

- **L35 (defensive ON CONFLICT for k.* registry rows)** — **Not applicable here** (no `k.*` writes). Noted for completeness.

- **L40 (TypeScript .select projections cannot be validated against live DB)** — **Not applicable here** (SQL-only migration; no TypeScript callsites in scope). Wave 7 will pick this up when wiring Supabase JS client.

- **L41 (Chat-side commits drift from local deploy machine)** — **Applied via PK protocol:** PK will pull this brief commit chain to local before any deploy action.

- **L-v2.81-a (drift detection)** — P-set re-run before apply to detect changes between authoring and apply. **Applied in §5.1** as the 10-query P-set with hard-stop matrix in §5.4-A.

### Candidate lessons emerging from this brief

- **L-v2.86-a (candidate)** — When a probe reveals an existing legacy function already survives a lockdown change, evaluate whether new functions duplicate the surviving legacy or supersede it. Default: keep both; defer consolidation. Document boundary in function comments. (Realised here for `fn_triage_case` vs `friction.triage_case`.)

- **L-v2.86-b (candidate)** — RETURNS TABLE column names should use a prefix (e.g., `out_`) to disambiguate from underlying table column names referenced in the function body. Avoids the cc-0017b ambiguity class. (Applied throughout Wave 0d functions.)

- **L-v2.86-c (candidate)** — When designing operator-facing mutation functions with cross-column CHECK constraints, pre-validate the post-state combination in PL/pgSQL before issuing UPDATE. The CHECK still catches violations but a function-level RAISE produces a cleaner error with HINT than the raw constraint violation. (Applied in `friction.triage_case` for `track_or_defer_requires_next_review`.)

- **L-v2.86-d (candidate)** — Test-data prefix conventions (`cc-NNNN[a-z]?-test/`) plus a purge helper function unify cleanup across briefs. (Realised via Wave 0d test data convention + `purge_test_case`.)

---

## §10 Brief authoring metadata

| Field | Value |
|---|---|
| Brief ID | cc-0017d |
| Version | v1.0 |
| Authored | 2026-05-19 Sydney morning |
| Session | v2.85 → v2.86 transition |
| Author | Chat-side Claude on PK directive |
| Probes executed | P-α through P-ζ, 2026-05-19 |
| Brief files (8) | main + 7 sub-files in `docs/briefs/cc-0017d/` |
| Commits (5) | `25797f7c` (main), `e89fb69c` (risks + preflight), `0aeb413b` (migration-sql), `dec32cdd` (vchecks), `108380b1` (hardstop-rollback), then `eb18d332` (d01-postapply-deferred), then this final commit |
| Status | AUTHORED_PENDING_D01 |
| Lines of SQL (migration) | ~310 lines across 6 functions + GRANTs |
| V-checks | 23 (V-A1, V-B1, V-C1-2, V-D setup + V-D1-5, V-E1-10, V-F1, V-Z1-2) |
| Rollback complexity | Single migration: DROP FUNCTION x6 (+ optional manual fixture cleanup) |
| Repo | `Invegent/Invegent-content-engine` (main branch) |
| Target environment | Supabase `mbkmaxqhsohbtwsqolns` (ap-southeast-2) |
| Schema | `friction` |
| Migration name | `cc_0017d_friction_case_mutation_functions` |
| Rollback migration name | `cc_0017d_rollback` |
| Dependencies | Wave 0a + 0b + 0c (all CLOSED-APPLIED) |
| Unblocks | Wave 7 (cc-0015), Wave 8 (cc-0016) — gated also on 1-week observation window closing 2026-05-26 |
| Production mutations during authoring | **0** (probes were read-only; brief files committed to repo do not touch production schema) |

---

## §11 Changelog

### v1.0 — 2026-05-19 (this version)

Initial authoring. Empirically-grounded from P-α through P-ζ probe results.

**Scope locked at v1.0:**
- 6 SECURITY DEFINER plpgsql functions in `friction.*` schema
- Inert at apply; callers wire in Wave 7/8
- Strict mapping in `resolve_case` (relaxable to loose in v1.1 if friction discovered)
- `fn_triage_case` untouched (parallel-coexistence; deprecation deferred to Wave 0e)
- Test data prefix convention established (`cc-NNNN[a-z]?-test/`) with `purge_test_case` helper

**Empirical decisions reflected:**
- `friction.triage_case` rejects closure-class action_decisions (P-β CHECK domains revealed cross-column constraints best handled by separate resolve/mark_duplicate functions)
- `triage_state='acknowledged'` post-triage (P-β confirmed `triage_state` legal domain — no 'triaged' value)
- `resolution_kind='reopened'` exclusive to `friction.reopen_case` (rejected as terminal resolution by resolve_case)
- Functions use `out_`-prefixed RETURNS TABLE columns (defensive against cc-0017b-style ambiguity)
- Grant pattern mirrors `friction.emit_event` for functions 1-5 (P-ζ baseline); purge_test_case tighter (service_role only)

**Authoring discipline notes:**
- All 23 V-checks include explicit expected values (per L46 Evidence Gate)
- V-A1 uses `pg_get_function_identity_arguments` (per L-v2.85-a HIGH-SIGNAL)
- Multi-file structure (8 files across 5 commits) per L-v2.85-e mitigation
- Hard-stop matrix covers pre-apply, post-apply, and D-01 verdict gates
- Rollback documented as clean DROP FUNCTION x6 + optional fixture cleanup

**Open at v1.0 (PK approval gates v1.1 vs apply):**
- Strictness of `resolve_case` mapping — current strict; flag for relax if Wave 7 UI shows friction
- Whether to fold `fn_triage_case` patch (set triaged_at/triaged_by) into Wave 0d — currently deferred to Wave 0e; PK can override to bundle
- Whether `friction.triage_case` should accept `p_suppression_reason` for suppress-class action_decisions — currently rejected; alternative is to route via `fn_triage_case` then `resolve_case`

### v1.1+ — placeholder

Reserved for post-apply patches if V-checks reveal defects or if PK directs scope amendments before re-fire.
