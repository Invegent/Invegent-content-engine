# cc-0017d — §9 Lessons + §10 Metadata + §11 Changelog

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** [`d01-postapply-deferred.md`](d01-postapply-deferred.md) **End of brief.**
**Section version:** v1.1 (lesson numbering reconciled to authoritative v2.86 a–e set; metadata bumped to v1.1; v1.1 changelog entry appended)

---

## §9 Lessons referenced

### Applied at authoring (v1.0 — unchanged in v1.1)

- **L-v2.85-a (HIGH-SIGNAL candidate)** — V-check function signature validation at brief authoring time. Use `pg_get_function_identity_arguments` to read deployed signature back and assert exact byte-match against brief expectations. **Realised here in V-A1** which checks all 6 deployed function signatures in a single batch query against the documented expected values in vchecks.md. **v1.1 status:** V-A1 byte-matched all 6 deployed signatures at v2.86 apply. Lesson confirmed; promote to STRONG at next lesson cycle.

- **L-v2.85-d (candidate)** — Need for a `purge_test_case` helper to clean V-check fixtures via SECDEF rather than apply_migration. **Realised here in Function 6** with strict regex prefix and service_role-only EXECUTE. **v1.1 status:** REALISED at v2.86 apply. Live as `friction.purge_test_case(text)` postgres-owner cleanup helper.

- **L-v2.85-e (candidate)** — Compact payloads / multi-file commits to avoid push_files response truncation. **Applied here** by splitting brief into 8 files committed across 5 commits rather than a single monolithic push_files. **v1.1 status:** mitigation re-applied at v2.86 close (1+2 split commit pattern).

- **L46 (Evidence Gate)** — Empirical state must be verified before authoring. **Applied here** via probes P-α through P-ζ executed pre-authoring; results recorded in main file §1.1 with exact CHECK definitions, grant counts, lifecycle buckets. No assumption-based content.

- **L58 (atomic close-the-loop)** — All G4 sync writes commit atomically. **Documented in §7** as the required post-apply discipline. v1.1 close used 1+2 split per L-v2.85-e mitigation.

- **L62 (D-01 cycle)** — Every production mutation requires D-01 fire; on escalate=true, classify objections and follow Path A (satisfy corrected action) preferentially over state-capture override. **Documented in §6** and §5.4-C with the type-b vs type-c distinction. v1.1 cycle exercised cleanly at v2.86 (review_id `206d2258-...`, AGREE verdict).

- **L33** — Event trigger pre-flight survey. **Not applicable here** (function-only migration, no DDL on tables registered with friction schema). Noted for completeness.

- **L35** — Defensive ON CONFLICT for k.* registry rows. **Not applicable here** (no `k.*` writes). Noted for completeness.

- **L40** — TypeScript .select projections cannot be validated against live DB. **Not applicable to apply path here** (SQL-only migration; no TypeScript callsites in scope). Wave 7 will pick this up when wiring Supabase JS client. **v1.1 note:** L40 was exercised at v2.86 close-the-loop UPDATE on `m.chatgpt_review` (column-name probe required after initial UPDATE failed on prior-memory column names).

- **L41** — Chat-side commits drift from local deploy machine. **Applied via PK protocol:** chat-side migration applied via Supabase MCP `apply_migration` (no local deploy machine involvement for SQL-only path).

- **L-v2.81-a (drift detection)** — P-set re-run before apply to detect changes between authoring and apply. **Applied in §5.1** as the 10-query P-set with hard-stop matrix in §5.4-A.

### Candidate lessons emerging from cc-0017d apply (v1.1 reconciled to authoritative v2.86 a–e set per sync_state)

The v1.0 brief's lesson candidate numbering (L-v2.86-a through -d) was authored before the production apply and used a draft scheme. The authoritative v2.86 lesson numbering captured in `docs/00_sync_state.md` and `docs/00_action_list.md` after the apply uses a different a–e scheme. **v1.1 reconciles to the authoritative set.**

- **L-v2.86-a (HIGH-SIGNAL, NEW from apply)** — Pre-apply syntactic validation should include actual transactional EXEC of function bodies, not just PARSE of CREATE FUNCTION. The plain `BEGIN; <CREATE FUNCTION>; ROLLBACK;` form parses the function source and creates the function within the transaction, but does NOT exercise runtime semantics that depend on RAISE EXCEPTION format-string interpretation or reserved-keyword `%ROWTYPE` resolution. **Detection at v2.86 apply:** two production `apply_migration` attempts failed before a third succeeded, because the v1.0 brief used `%%` in RAISE format strings (24 sites — see Substitution Class 1 in `migration-sql.md` v1.1 Addendum) and unquoted `friction.case%ROWTYPE` (6 sites — see Substitution Class 2). Both were fixed inline at apply (Path B-prime). **Recommendation:** brief P-set should include a transactional dry-run with a marker `PERFORM friction.fn_name(...)` block inside a `DO $$ ... EXCEPTION WHEN OTHERS THEN NULL; ... $$` wrapper to force runtime RAISE PARSE. See `migration-sql.md` v1.1 Addendum for the recommended pattern. **Promotion-eligible after one further exercise.**

- **L-v2.86-b (NEW from authoring)** — `RETURNS TABLE` columns should use a prefix (e.g., `out_`) to disambiguate from underlying table column names referenced in the function body. Avoids the cc-0017b ambiguity class. **REALISED throughout Wave 0d functions** (all 6 functions use `out_` prefix on all RETURNS TABLE columns). v1.1 status confirmed by V-A1 byte-match at v2.86 apply.

- **L-v2.86-c (NEW from apply)** — Reserved SQL keywords require quoting in `%ROWTYPE` type-names in PL/pgSQL DECLARE blocks, even when permissive in DML grammar. `case` is a reserved SQL:2016 keyword and PL/pgSQL applies strict reserved-keyword parsing to `%ROWTYPE` identifier resolution. **Detection at v2.86 apply:** `friction.case%ROWTYPE` (6 sites) raised `syntax error at or near "case"`; corrected to `friction."case"%ROWTYPE` inline. **Recommendation:** when authoring functions against tables whose names are reserved SQL keywords, quote the identifier in every `%ROWTYPE` reference. See `migration-sql.md` v1.1 Addendum Substitution Class 2.

- **L-v2.86-d (NEW from authoring)** — When designing operator-facing mutation functions with cross-column CHECK constraints, pre-validate the post-state combination in PL/pgSQL before issuing UPDATE. The CHECK still catches violations but a function-level RAISE produces a cleaner error with HINT than the raw constraint violation (SQLSTATE 23514 with cryptic message). **REALISED in `friction.triage_case`** which pre-validates `track_or_defer_requires_next_review` before the UPDATE, raising `P0001` with HINT instead of letting `23514` fire on UPDATE. v1.1 status confirmed by V-E2 exercising the pre-validation path cleanly at v2.86.

- **L-v2.86-e (NEW from apply)** — V-check fixture-data conventions must align with the prefix regex enforced by production purge helpers AND with the corrective-cleanup pattern coverage. **Detection at v2.86 apply:** V-F1 PARTIAL — the chat-side V-D-setup direct-INSERT block used hyphen-prefix fingerprints (`cc-0017d-test-fp-001`) instead of the documented slash-prefix convention; the V-D4 `mark_duplicate` audit row landed under internal prefix `cc-0017d/mark_duplicate/...` (intentionally outside the test-prefix regex); the PK-specified cleanup pattern v1 (`'%cc-0017d-test/%'`) hit zero rows due to the hyphen drift; cleanup v2 (`'%cc-0017d-test%'`, trailing `/` dropped) removed exactly one row. **Recommendation:** future briefs SHOULD use the slash-prefix convention consistently across all fixture columns including `dedupe_fingerprint`; corrective-cleanup patterns SHOULD drop the trailing separator to remain robust against either convention; future V-check sets that introduce a `mark_duplicate`-class function SHOULD include a V-Z3 cross-check against the internal `mark_duplicate` audit namespace. See `vchecks.md` v1.1 Addendum Drift 3 + corrected V-F1 expected matrix.

### Lesson candidate retired in v1.1

The v1.0 brief included a candidate lesson on **legacy/new function coexistence** (`fn_triage_case` vs `friction.triage_case`) under a draft v1.0 numbering of L-v2.86-a. This lesson did not propagate to the authoritative v2.86 a–e set in sync_state. v1.1 records it here for completeness but does not assign it a canonical lesson number:

- **(draft, not promoted)** — When a probe reveals an existing legacy function already survives a lockdown change, evaluate whether new functions duplicate the surviving legacy or supersede it. Default: keep both; defer consolidation. Document boundary in function comments. **Realised here for `fn_triage_case` vs `friction.triage_case`** (boundary documented in main file §2 "Rejected from scope" and in the COMMENT on `friction.triage_case`). If this pattern recurs in Wave 0e or later, may be promoted then with a fresh lesson number.

---

## §10 Brief authoring metadata

| Field | Value |
|---|---|
| Brief ID | cc-0017d |
| Version | **v1.1** (was v1.0 at authoring; v1.1 doc patch applied 2026-05-19 Sydney evening) |
| Status | **CLOSED-APPLIED-WITH-VCHECK-CORRECTION** (v2.86) |
| Authored | 2026-05-19 Sydney morning (v1.0) |
| Applied | 2026-05-19 Sydney evening (v2.86) via Path B-prime |
| v1.1 patched | 2026-05-19 Sydney evening (v2.86 close; doc-only) |
| Session | v2.85 → v2.86 (authoring + apply + v1.1 patch all within v2.86) |
| Author | Chat-side Claude on PK directive |
| Probes executed | P-α through P-ζ, 2026-05-19 |
| Brief files (8) | main + 7 sub-files in `docs/briefs/cc-0017d/` |
| v1.0 authoring commits (8) | `25797f7c` (main), `e89fb69c` (risks + preflight), `0aeb413b` (migration-sql), `dec32cdd` (vchecks), `108380b1` (hardstop-rollback), `eb18d332` (d01-postapply-deferred), plus 2 final-pass commits up to `8a5c6b6b` |
| v1.0 apply migrations (5) | `cc_0017d_friction_case_mutation_functions` (main, Path B-prime); `cc_0017d_vcheck_fixture_seed` (direct-INSERT setup); `cc_0017d_vcheck_audit_cleanup` (cleanup v1, zero-effect); `cc_0017d_vcheck_audit_cleanup_v2` (cleanup v2, 1 row removed); `cc_0017d_chatgpt_review_close` (close-the-loop) |
| v1.1 patch commits | this single atomic push_files commit covering 4 files: main brief, migration-sql.md, vchecks.md, lessons-metadata-changelog.md |
| Status timeline | AUTHORED_PENDING_D01 (v1.0) → APPLIED-WITH-VCHECK-CORRECTION (v2.86) → CLOSED-APPLIED-WITH-VCHECK-CORRECTION (v2.86 + v1.1 doc patch) |
| Lines of SQL (migration) | ~310 lines across 6 functions + GRANTs + REVOKEs (post-substitutions) |
| V-checks | 23 (V-A1, V-B1, V-C1-2, V-D setup + V-D1-5, V-E1-10, V-F1, V-Z1-2); v1.1 documents corrected V-F1 expected matrix |
| V-check final outcome | 22/23 strict PASS + V-F1 PARTIAL (PK-approved disposition; brief-expectation drift not migration failure) |
| D-01 review_id (v1.0 apply) | `206d2258-...` — AGREE verdict; resolved; resolved_by `cc-0017d-close-v2.86` |
| Rollback complexity | Single migration: DROP FUNCTION x6 (+ optional manual fixture cleanup); not exercised at v2.86 |
| Repo | `Invegent/Invegent-content-engine` (main branch) |
| Target environment | Supabase `mbkmaxqhsohbtwsqolns` (ap-southeast-2) |
| Schema | `friction` |
| Migration name | `cc_0017d_friction_case_mutation_functions` |
| Rollback migration name | `cc_0017d_rollback` (not used) |
| Dependencies | Wave 0a + 0b + 0c (all CLOSED-APPLIED) |
| Unblocks | Wave 7 (cc-0015), Wave 8 (cc-0016) — gated also on 1-week observation window closing 2026-05-26 |
| Production mutations during v1.0 authoring | **0** |
| Production mutations during v2.86 apply | 4 `apply_migration` calls + 1 `m.chatgpt_review` UPDATE (close-the-loop) |
| Production mutations during v1.1 doc patch | **0** (doc-only) |

---

## §11 Changelog

### v1.0 — 2026-05-19 Sydney morning (authoring)

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
- Multi-file structure (8 files across 5+ commits) per L-v2.85-e mitigation
- Hard-stop matrix covers pre-apply, post-apply, and D-01 verdict gates
- Rollback documented as clean DROP FUNCTION x6 + optional fixture cleanup

**Open at v1.0 (PK approval gates v1.1 vs apply):**
- Strictness of `resolve_case` mapping — current strict; flag for relax if Wave 7 UI shows friction
- Whether to fold `fn_triage_case` patch (set triaged_at/triaged_by) into Wave 0d — currently deferred to Wave 0e; PK can override to bundle
- Whether `friction.triage_case` should accept `p_suppression_reason` for suppress-class action_decisions — currently rejected; alternative is to route via `fn_triage_case` then `resolve_case`

### v1.1 — 2026-05-19 Sydney evening (post-apply doc patch)

**Doc-only patch. No production mutations. No D-01.** Captures the actual v2.86 production-apply outcomes against v1.0 brief expectations.

**Patch scope (single atomic commit covering 4 files):**

1. **Main brief (`cc-0017d-friction-case-mutation-functions.md`)** — header bumped v1.0 → v1.1; status updated to CLOSED-APPLIED-WITH-VCHECK-CORRECTION; v1.1 patch summary block added below header; brief structure table v1.1 status column added; `purge_test_case` constraints updated to note the cross-fingerprint internal-prefix exception; "Rejected from scope — Loose resolve_case" annotated with v1.1 status.

2. **`migration-sql.md`** — new "v1.1 Addendum — Compile-fix substitutions applied at production apply" block at the top, documenting:
   - **Substitution class 1** — 24 sites of RAISE EXCEPTION `%%` → `%` (positional placeholder, not literal-percent escape)
   - **Substitution class 2** — 6 sites of `friction.case%ROWTYPE` → `friction."case"%ROWTYPE` (reserved SQL keyword quoting in `%ROWTYPE`)
   - Production apply sequence (Path B-prime, 3 attempts, 2 inline fix rounds)
   - Pre-apply discipline recommendation (transactional EXEC with marker SELECT)
   - The v1.0 SQL bodies are preserved as authored (NOT updated to reflect the substitutions inline) so the historical-record + applied-form distinction is auditable. End-of-section pointer to the v1.1 Addendum prepended.
   - Function 6 `purge_test_case` COMMENT updated to note the cross-fingerprint internal-prefix exception.
   - Function 4 `mark_duplicate` body annotated with a v1.1 inline note about the internal-prefix audit namespace.
   - Function 4 COMMENT updated to include `cc-0017d/mark_duplicate/<case_id>` namespace reference.

3. **`vchecks.md`** — new "v1.1 Addendum — V-F1 reconciliation and fixture-naming convention" block at the end, documenting:
   - **Drift 1** — V-D-setup fell back to direct `INSERT INTO friction.case` (emit_event emission_rule CHECK rejection); fallback SQL pattern preserved; consequences for V-F1 events_deleted count
   - **Drift 2** — `mark_duplicate` writes audit under internal prefix `cc-0017d/mark_duplicate/...` (intentionally outside test-prefix regex); orphaned audit row implication; detection pattern
   - **Drift 3** — Corrective cleanup v1 (PK-specified, zero-effect, due to fixture-naming hyphen drift) and cleanup v2 (PK-approved adjusted pattern, removed exactly 1 row)
   - **Fixture-naming convention** — slash-prefix vs hyphen-prefix; recommendation to use slash-prefix consistently across all fixture columns including `dedupe_fingerprint`
   - **Corrected V-F1 expected matrix** — table comparing v1.0 expected vs v1.1 corrected expected per assertion
   - **Recommended V-Z3** (not retroactively added) — cross-fingerprint audit residue cross-check for future briefs introducing `mark_duplicate`-class functions
   - Inline v1.1 notes at V-D-setup (fallback observation), V-D4 (internal-prefix audit), V-F1 (load-bearing assertion), V-Z1 (internal-prefix invisibility)

4. **`lessons-metadata-changelog.md`** (this file) —
   - Lesson numbering reconciled to authoritative v2.86 a–e set per `docs/00_sync_state.md`:
     - L-v2.86-a (HIGH-SIGNAL, NEW from apply) — pre-apply syntactic validation via transactional EXEC
     - L-v2.86-b (NEW from authoring) — `out_`-prefix on RETURNS TABLE columns (REALISED)
     - L-v2.86-c (NEW from apply) — reserved SQL keyword ROWTYPE quoting
     - L-v2.86-d (NEW from authoring) — cross-column CHECK pre-validation (REALISED)
     - L-v2.86-e (NEW from apply) — V-check fixture-data convention alignment
   - v1.0 draft "legacy/new coexistence" candidate recorded as retired/not-promoted (not in v2.86 authoritative set)
   - Metadata table bumped: Version v1.1; Status CLOSED-APPLIED-WITH-VCHECK-CORRECTION; applied + v1.1 patched dates added; v1.0 apply migrations list (5); V-check final outcome; D-01 review_id; status timeline
   - This v1.1 changelog entry appended

**Out of scope for v1.1:**
- All other sub-files (`risks-and-grants.md`, `preflight-pset.md`, `hardstop-rollback.md`, `d01-postapply-deferred.md`) unchanged. The v1.0 d01-postapply-deferred.md is now historical record (D-01 fired and resolved at v2.86; status=resolved; resolved_by=cc-0017d-close-v2.86).
- No production mutations.
- No D-01 fire (doc-only patch; PK explicit scope).
- No action_list / sync_state close in this commit (separate close commit per L-v2.85-e split-commit mitigation; expected post-verification).
- Wave 0e (case history / audit) brief authoring deferred per PK explicit instruction until v1.1 doc patch verified closed.

**Honest limitations carried into v1.1:**
- The v1.0 SQL in `migration-sql.md` Step 1-6 is preserved as authored (with `%%` and unquoted ROWTYPE) so the historical-record audit trail is visible. Readers using this brief as a template MUST apply both substitution classes before any production apply attempt. The deployed migration `cc_0017d_friction_case_mutation_functions` contains the corrected form, not the v1.0 SQL as written below the addendum.
- V-D-setup block in `vchecks.md` still shows the `emit_event` path as the documented setup, with an inline v1.1 note about the fallback direct-INSERT path. Future-author convention: when emit_event emission_rule rejects test-prefix payloads, fall back to direct INSERT and document at the V-D-setup block.
- Lesson numbering reconciliation means the brief's `lessons-metadata-changelog.md` no longer aligns 1:1 with its v1.0 internal numbering. The authoritative source for v2.86 lessons is `docs/00_sync_state.md` + `docs/00_action_list.md`.

### v1.2+ — placeholder

Reserved for post-v1.1 patches if (a) PK directs scope amendments, (b) Wave 7 UI surfaces operator friction on strict `resolve_case` mapping, (c) emission_rule CHECK gate relaxation in `emit_event` enables emit_event-based V-D-setup again (requiring reversal of vchecks.md v1.1 Addendum Drift 1 fallback path).
