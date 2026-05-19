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

## 2. Lesson candidates from apply (v2.90)

Surfaced during v2.90 apply session (cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION). Per session per-session detail file `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` commit `77d09376d7cdc9e0dbc76c5ec0a937d0fd46adf2`.

### L-v2.90-a (HIGH-SIGNAL) — V-D fixture authoring must probe full CHECK + FK constraint surface on target tables

**Source:** Defects 1 + 2 surfaced at v2.90 apply (fixture-seed migration `cc_0017e_vcheck_fixture_seed` failed twice). First attempt: `severity='low'` violated `case_severity_check` CHECK constraint (enum: `{info, warn, critical}`). Second attempt: `category='cc-0017e/v-d/category'` violated `case_category_fkey` FK constraint (lookup table `friction.category` has 6 valid codes: client_commitment, content_quality, external_dependency, operator_friction, pipeline_integrity, unclassified).

**Lesson:** V-D fixture authoring must probe the full constraint surface on the target table at authoring time, NOT assume conventional value vocabularies. The brief used "low" by intuition (a common severity value across many systems) and an inline-pattern category name by stylistic convenience. Both were rejected at apply time, requiring two Path B-prime corrective fixture-seed migrations.

**Mitigation:** for any V-D fixture INSERT, the brief authoring MUST probe each constrained column with these targeted queries:
```sql
-- CHECK constraint enumeration
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = '<schema>' AND c.relname = '<table>' AND con.contype = 'c'
ORDER BY con.conname;

-- FK lookup tables — query the referenced lookup table for valid codes
SELECT code FROM <lookup_schema>.<lookup_table> ORDER BY code;
```
Use only values returned by these probes. Document the probe results inline in the V-D-setup section so future readers can verify the choice.

**Extends:** L-v2.84-d (schema-probe-before-DML) to value-enum probes for CHECK + FK constraints.

**Why HIGH-SIGNAL:** caught two distinct defects in one apply session; cost two rollback transactions + one corrective fixture-seed migration. Discipline shift is cheap at authoring; corrective work at apply is expensive.

### L-v2.90-b (HIGH-SIGNAL) — `CREATE OR REPLACE FUNCTION` arity changes require explicit `DROP FUNCTION` of prior signature

**Source:** Defect 3 surfaced at v2.90 apply (V-A1 strict signature byte-match returned 7 rows instead of expected 6 — both 10-arg legacy and 11-arg patched `fn_triage_case` co-existed). Path B-prime corrective migration `cc_0017e_drop_legacy_fn_triage_case_10arg` retired the legacy signature.

**Lesson:** PostgreSQL's `CREATE OR REPLACE FUNCTION` matches functions by `(schema, name, argument list)`. Adding an argument (even with `DEFAULT NULL` so all existing callers continue to work without code changes) creates a NEW function entry — it does NOT replace the legacy entry. Two distinct senses of "signature-compatible" must be distinguished:

1. **Call-resolution compatibility (preserved by DEFAULT NULL):** 10-arg callers (positional or named) resolve cleanly to the new 11-arg signature via the DEFAULT on the new arg. Caller code is unaffected.
2. **Schema-resolution compatibility (BROKEN by arity change):** the legacy 10-arg signature persists in `pg_proc` alongside the new 11-arg signature unless explicitly dropped. The legacy function retains its pre-patch body — meaning the patch is DEFEATED for any caller path that doesn't pass the new arg (such as historical positional-10-arg call sites).

**Mitigation:** for any function patch that changes argument arity, the explicit `DROP FUNCTION IF EXISTS friction.<name>(<old-arg-list>);` MUST precede the `CREATE OR REPLACE FUNCTION friction.<name>(<new-arg-list>) ...`. The DROP is the only mechanism PostgreSQL provides to retire the prior signature when the argument list is changing.

**Detection:** strict signature byte-match V-A1 (L-v2.85-a discipline) — if the expected matrix has N rows and the live count is N+1 (or more), suspect a dual-overload condition from an arity-change patch without explicit DROP.

**Caveat for grants:** when DROP-then-CREATE replaces an arity-changed function, GRANT statements that applied to the prior signature do NOT carry over (the new function is a different entry). Re-issue any required GRANTs explicitly after the new CREATE.

**Why HIGH-SIGNAL:** the defect is invisible to call-sites (which continue to work) but defeats the entire patch intent for any caller using the legacy positional shape. Without V-A1 strict byte-match, the dual-overload condition is silent.

### L-v2.90-c — V-D fixture naming must conform to `purge_test_case` regex; slash-prefix alone is insufficient

**Source:** Defect 4 surfaced at v2.90 apply (V-D fixture titles `cc-0017e/v-d/...` did not match `friction.purge_test_case` helper regex `^cc-[0-9]{4}[a-z]?-test/`). Helper would error with `P0001 must match...`. cc-0017e v2.90 apply bypassed the helper with inline DELETEs.

**Lesson:** the cc-0017d v1.1 Drift 3 reaffirmation of slash-prefix convention (`cc-0017e/...`) was conceptually right but missed the helper's required `-test/` suffix segment. The canonical fixture naming format for any V-D test fixture is `cc-<brief-number-with-optional-suffix-letter>-test/<rest>`. Example: `cc-0017e-test/fixture-001`, `cc-0017a-test/probe-1`. The helper's regex enforces this format.

**Mitigation:** at brief authoring time, when designing V-D fixtures, check the actual `purge_test_case` helper body (or its v1.1 successor) for the regex it enforces, and conform the fixture naming to that regex. Inline the regex into the brief for future readers.

### L-v2.90-d — Shadow tables with FK ON DELETE RESTRICT require audit of existing cleanup helpers for coverage gaps

**Source:** Defect 5 surfaced at v2.90 apply (`purge_test_case` helper realised v2.86 deletes from `friction.event` + `friction.case` + `friction.emit_error` only; cc-0017e introduced `friction.case_history` with FK `ON DELETE RESTRICT` on `case_id`; helper would FK-fail at the `friction.case` DELETE step for any case with case_history rows). cc-0017e v2.90 apply bypassed the helper with explicit dependency-ordered DELETEs.

**Lesson:** when a brief introduces a new shadow / audit table with `FK ... ON DELETE RESTRICT` on a parent table, the brief MUST audit all existing cleanup helpers and migration patterns that delete from the parent table. Helpers authored before the new shadow table are coverage-gap candidates. Disposition options:

1. **Extend the helper** as part of the same brief (preferred when the helper is widely used).
2. **Document the coverage gap** explicitly in the brief's cleanup section and provide an inline dependency-ordered DELETE pattern as the apply-time workaround (cc-0017e v1.1 vchecks.md V-Z1 note pattern).
3. **Future Wave brief** to extend the helper, if scope discipline requires deferring the helper change.

**Mitigation:** brief authoring discipline:
```
For each new table or shadow with FK ON DELETE RESTRICT:
  1. Identify the parent table (the one whose case_id / target_id is FK-referenced).
  2. grep / search for existing helper functions that DELETE from the parent.
  3. For each helper found, either:
     a. Extend the helper in this brief, OR
     b. Document the coverage gap + workaround in this brief.
```

### L-v2.90-e — Close-the-loop SQL templates must be validated against actual `m.chatgpt_review` schema

**Source:** Defects 6 + 7 surfaced at v2.90 apply close (close-the-loop UPDATE migration failed on phantom `resolved_at` column; subsequent retry without `result_summary` column succeeded). Both `resolved_at` and `result_summary` are referenced in the v1.0 d01-postapply-deferred.md §4 templates but DO NOT EXIST in the production `m.chatgpt_review` schema.

**Lesson:** close-the-loop SQL templates that UPDATE `m.chatgpt_review` rows must be validated against the actual production schema at brief authoring (or as v1.1 doc-patch). Phantom column references in templates cause apply-session close failures even when the underlying migration applied cleanly. Rich close-the-loop narrative belongs in the apply-session per-session detail file at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`, NOT in the m.chatgpt_review row — the row's terminal state is captured by status + action_taken + resolved_by (3 columns), and the session-detail file is where the full narrative lives.

**Mitigation:** brief authoring discipline for any close-the-loop UPDATE template:
```sql
-- Validate column existence before authoring the template
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='m' AND table_name='chatgpt_review'
ORDER BY ordinal_position;
```
Use only columns returned by this query in the template. Reference rich narrative location (per-session detail file) explicitly so future apply sessions don't try to inline narrative into nonexistent columns.

### L-v2.90-f — Risk/grants verification clauses must match actual lockdown scope, not broad-`*` assertions

**Source:** Defect 8 surfaced at v2.90 apply preflight (S7-broad sanity probe "FAILED" on 6 SELECT grants to `authenticated` on friction reference/config tables: `category`, `emission_rule`, `emission_rule_history`, `experiment_run`, `notification_policy`, `source`). These grants are intentional, pre-existing, and predate cc-0017c. The cc-0017c lockdown scope was always `friction.case + friction.event + friction.emit_error`; cc-0017e adds `friction.case_history`. The brief's §3 query #2 (`authenticated + anon have zero grants on friction.*`) overclaims by asserting a property of the whole schema.

**Lesson:** verification clauses in risks/grants documentation that assert lockdown properties must name the actual lockdown surface explicitly (the specific tables), NOT use broad-`*` patterns that include reference/config tables outside the lockdown scope. Broad-`*` assertions cause false-FAIL findings at apply-time S-probes and erode trust in the verification matrix.

**Mitigation:** narrow all lockdown verification SQL to `WHERE table_name IN (<explicit list of lockdown tables>)`. Document the lockdown surface scope explicitly in the §1 grant matrix narrative so the §3 verification is consistent with §1.

---

## 3. Authoring metadata

### 3.1 Commit map

| Commit | SHA | Files | Purpose |
|---|---|---|---|
| 1 | `8502fc49a0d981e95f8fed6bd7c3ece438fc669c` | 1 | Main brief (`docs/briefs/cc-0017e-friction-case-history-and-compat.md`) |
| 2 | `1659b293da007ced41a6d0b08def1061dd38a414` | 4 | Substantive sub-files: migration-sql, vchecks, risks-and-grants, preflight-pset |
| 3 | `<this-commit-SHA>` | 3 | Process sub-files: hardstop-rollback, d01-postapply-deferred, lessons-metadata-changelog |
| 4 (v1.1) | `587ee4ac894a50708611cf9a053253083ae39e2b` | 2 | v1.1 column-name correction: preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4 (review_id→id; proposal_text→proposal) |
| 5 (v1.1) | `<this-commit-SHA>` | 5 | v1.1 8-item backlog patch: vchecks.md (severity + category + naming + cleanup note), migration-sql.md §2 (explicit DROP + arity-change discipline), risks-and-grants.md (R4 reframe + §3 narrowed lockdown scope), d01-postapply-deferred.md §4 (phantom column removal), lessons-metadata-changelog.md (L-v2.90-a through L-v2.90-f) |

Total: 11 files across 5 commits (3 v1.0 author commits + 2 v1.1 doc-patch commits) per L-v2.85-e split-commit pattern.

### 3.2 File inventory

| File | Content SHA (v1.0) | Size v1.0 (bytes) | Section role |
|---|---|---|---|
| `cc-0017e-friction-case-history-and-compat.md` | `a50e26e663dd6725044df0aaebd9e9672797ab88` | 21,698 | Main brief |
| `cc-0017e/migration-sql.md` | `d1946d7afb64f0a656f3469d2aee5530fceb58dd` | 27,203 | Apply SQL (v1.1 patched in this commit) |
| `cc-0017e/vchecks.md` | `eef59ec5b2c38b3a7fac3c2aa565ecfc9f5a1ef9` | 19,661 | V-check matrix + V-Z3 codification (v1.1 patched in this commit) |
| `cc-0017e/risks-and-grants.md` | `b52f1d8b8cf9d4aff5d2afdce0002c7e86fe2f91` | 9,346 | Grant matrix + risk register (v1.1 patched in this commit) |
| `cc-0017e/preflight-pset.md` | `22d555282245499b4b5cc69a63110a4888cce416` | 7,984 | Pre-apply P-set (v2.89 v1.1 column-name patch applied) |
| `cc-0017e/hardstop-rollback.md` | `<sha-from-commit-3>` | (commit-3 size) | Hard stops + rollback |
| `cc-0017e/d01-postapply-deferred.md` | `43ee19716119925f56f4585b415a549e9ab05f1d` | 9,073 | D-01 fire template (v2.89 v1.1 column-name patch + v1.1 phantom column removal in this commit) |
| `cc-0017e/lessons-metadata-changelog.md` | `e5ffac0fbff076da68fa9a948dc065a30b2c7fa5` | (commit-3 size) | Lessons + metadata + changelog (v1.1 L-v2.90 family added in this commit) |

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

- **Session ID context (authoring):** v2.88 (2026-05-19 Sydney evening)
- **Predecessor session:** v2.87 (cc-0017d v1.1 doc patch closed at commit `f0367405`)
- **Authoring agent:** Claude (chat)
- **Authoring scope:** brief files only
- **Transcript file:** `/mnt/transcripts/2026-05-19-05-56-30-cc-0017e-wave-0e-brief-authoring.txt` (full pre-compaction record)
- **Session compaction event:** 1 (mid-authoring; commits 1 + 2 preserved in compaction summary; commit 3 completed post-compaction)
- **v1.1 patch sessions:** v2.89 (column-name correction at `587ee4ac`) + v2.91 (8-item backlog patch — this commit)
- **Apply session:** v2.90 (APPLIED-WITH-VCHECK-CORRECTION; per-session detail at `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` commit `77d09376d7cdc9e0dbc76c5ec0a937d0fd46adf2`)

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
2. fn_triage_case patch adds optional `p_actor text DEFAULT NULL` (v1.0 framed as signature-compatible; v1.1 corrected — see L-v2.90-b)
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

### v1.1 (2026-05-19 Sydney evening v2.89) — column-name correction

**Doc-only patch.** Commit `587ee4ac894a50708611cf9a053253083ae39e2b`.

Corrected `m.chatgpt_review` column-name anomaly in `preflight-pset.md` §P3.2 and `d01-postapply-deferred.md` §3-4:
- 6× `review_id` → `id`
- 2× `proposal_text` → `proposal`

Apply path unblocked.

### v1.1 (2026-05-19 Sydney evening v2.91) — 8-item backlog patch from v2.90 apply discovery

**Doc-only patch.** This commit. 5 files updated.

Resolves the 8-item v1.1 doc patch backlog surfaced during v2.90 apply session. Each item is anchored to a specific defect discovered at apply time and is documented in the new L-v2.90 lesson family above (L-v2.90-a through L-v2.90-f).

**Files patched:**

1. **vchecks.md**
   - V-D-setup: `severity` value `'low'` → `'info'` (Defect 1, L-v2.90-a)
   - V-D-setup: `category` value `'cc-0017e/v-d/category'` → `'unclassified'` (Defect 2, L-v2.90-a)
   - V-D-setup + V-Z1 + V-check execution order step 10: fixture naming convention `cc-0017e/v-d/...` → `cc-0017e-test/...` to match `purge_test_case` regex `^cc-[0-9]{4}[a-z]?-test/` (Defect 4, L-v2.90-c)
   - V-Z1 cleanup note: added v1.1 dependency-ordered DELETE pattern documenting `purge_test_case` helper case_history coverage gap (Defect 5, L-v2.90-d)
   - V-A1 expected-matrix note: added Defect-3-class dual-overload discussion + Path B-prime reference
   - V-check disposition matrix: updated V-A1 row to allow Path B-prime for dual-overload condition

2. **migration-sql.md**
   - §2 introduction: rewrote rationale to distinguish call-resolution compatibility (preserved by DEFAULT NULL) from schema-resolution compatibility (broken by arity change) (Defect 3, L-v2.90-b)
   - §2: added explicit `DROP FUNCTION IF EXISTS friction.fn_triage_case(uuid, text, text, boolean, text, text, text, timestamptz, text, text);` statement before the CREATE OR REPLACE FUNCTION of the new 11-arg signature
   - §3 preamble: added clarification that the 5 cc-0017d functions need no DROP because their signatures are byte-stable
   - Apply ordering: updated step 2 to mention the DROP
   - COMMENT on fn_triage_case: updated to reflect explicit DROP-then-CREATE pattern
   - L-v2.86-a section: added scope clarification note (harness catches substitution-class drift only)

3. **risks-and-grants.md**
   - §1.1: added note that the cc-0017c + cc-0017e lockdown surface is exactly 4 tables (case + event + emit_error + case_history) and that other friction.* tables retain pre-existing SELECT grants intentionally
   - §1.2: added caveat about CREATE OR REPLACE FUNCTION grant preservation only applying when arity is unchanged
   - §1.3: revised to require re-issued grants on the new 11-arg signature
   - R4: fully reframed (severity LOW→MEDIUM, likelihood LOW→CERTAIN absent explicit DROP, description distinguishes call-resolution vs schema-resolution compatibility, mitigation references the explicit DROP requirement, residual risk discusses V-A1 detection + Path B-prime) (Defect 3, L-v2.90-b)
   - R2: added v1.1 doc-patch note clarifying harness scope (substitution-class drift only; other defect classes outside scope)
   - §3: narrowed lockdown verification scope from `friction.*` to the explicit 4-table lockdown surface (`case + event + emit_error + case_history`); added explanatory comment about pre-existing intentional SELECT grants on reference/config tables (Defect 8, L-v2.90-f)

4. **d01-postapply-deferred.md**
   - §4: removed all references to phantom column `resolved_at` (4 templates) (Defect 6, L-v2.90-e)
   - §4: removed all references to phantom column `result_summary` (4 templates) (Defect 7, L-v2.90-e)
   - §4: schema-corrected the 4 close-the-loop UPDATE templates to use only existing columns (`status`, `action_taken`, `resolved_by`)
   - §4: added introductory note documenting the phantom-column defects and where rich close-the-loop narrative belongs (per-session detail file, not the m.chatgpt_review row)
   - §4: added apply-time discipline note (L-v2.90-e — validate templates against actual schema)

5. **lessons-metadata-changelog.md** (this file)
   - Added §2 "Lesson candidates from apply (v2.90)" — L-v2.90-a (HIGH-SIGNAL) through L-v2.90-f, with each lesson anchored to a specific apply-time defect
   - Added v1.1 patch sessions to §3.4 session metadata
   - Updated §3.1 commit map to show 5 commits across v1.0 + v1.1
   - Updated §3.2 file inventory to reflect v1.1 patches
   - Added this v1.1 v2.91 changelog entry to §4

**Net production mutations from v1.1 v2.91 patch session:** 0
**Net D-01 fires from v1.1 v2.91 patch session:** 0
**Net memory edits from v1.1 v2.91 patch session:** 0
**Net Supabase calls from v1.1 v2.91 patch session:** 0

Apply state unaffected. cc-0017e Wave 0e remains APPLIED-WITH-VCHECK-CORRECTION (per v2.90 close).

---

## 5. Sign-off

**Authored by:** Claude (chat) v2.88
**v1.1 column-name patch:** Claude (chat) v2.89 at commit `587ee4ac`
**v1.1 8-item backlog patch:** Claude (chat) v2.91 at this commit
**Authored for:** PK / Invegent Content Engine
**Authoring date:** 2026-05-19 Sydney evening
**Apply date:** 2026-05-19 Sydney evening v2.90 (APPLIED-WITH-VCHECK-CORRECTION)

End of cc-0017e v1.0 + v1.1 brief.
