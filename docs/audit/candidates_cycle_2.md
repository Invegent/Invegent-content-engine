# Audit Cycle 2 — Candidate Inputs

> **Status:** Forward-looking inputs file
> **Created:** 2026-04-28 evening (4th shift)
> **Owner:** PK + chat (joint promotion to findings when cycle 2 runs)

This file collects audit-relevant observations and side-findings that are NOT yet formal findings. They are seeds for the next audit cycle — when cycle 2 runs (snapshot → ChatGPT pass → findings raised), these candidates should be reviewed and either:

- Promoted to formal findings in `docs/audit/runs/<cycle-2-date>-data.md` (or other role-specific run files)
- Closed as `redundant` if a separate finding already covers them
- Merged into a broader finding if related issues surface together
- Dismissed as non-issues if cycle 2 evidence shows they were misreads

Cycle 1 closed all 3 of its findings `action-taken` on 2026-04-28. Cycle 2 has no scheduled date yet; PK will trigger when next snapshot is warranted.

---

## C2-CAND-001 — Stage 12 migration filename audit-trail check

**Source:** CC's branch hygiene execution, 2026-04-28 evening (Task 3 side-finding)
**Trigger context:** When CC archived `feature/slot-driven-v3-build` to `archive/slot-driven-v3-build`, the diff vs main showed 26 commits and 4,881 insertions still ahead. The slot-driven Phase A migrations clearly ran in production (Phase B is autonomous on them per Gate B observation), but the migration files for those stages may not have been replicated into main's `supabase/migrations/` directory under their permanent filenames.

**Why this matters:**
- Lesson #36 says migration filenames are permanent audit artefacts
- F-2026-04-28-D-003 locked forward discipline that migration names are permanent identities
- If the Stage 12.050–053 migration files exist only on the archived branch, GitHub's `supabase/migrations/` directory is not a complete record of what's been applied to production
- Per memory's note (`Migrations via Supabase MCP apply_migration NOT supabase db push`), the DB is the source of truth and the file directory lags. Acceptable as ongoing operational reality, but the gap should be visible and bounded.

**Suggested action when promoted to a finding:**
1. Query `supabase_migrations.schema_migrations` for all Stage 12 versions applied (filter on `name LIKE 'stage_12_%'`)
2. List the same files in `supabase/migrations/` on `main`
3. Identify any version that exists in DB but not in main's directory
4. For each missing one, verify the SQL is preserved in `archive/slot-driven-v3-build` (the archive ref preserves SHA `6d66312`)
5. Decide: cherry-pick the missing migration files onto main as a documentation backfill, OR accept the gap as a known limitation and document it explicitly in `docs/00_decisions.md`

**Severity if confirmed:** LOW–MEDIUM. Doesn't break anything operationally; the DB has the SQL. But weakens future audits' ability to read GitHub as the system map without cross-checking the DB.

**Not urgent.** Per PK 2026-04-28 evening: "This is not urgent today, but it matters for migration discipline and F-003 audit continuity." Address in cycle 2 or earlier if time permits.

**References:**
- Archive ref: `archive/slot-driven-v3-build` at SHA `6d66312` (created 2026-04-28 evening, Task 3)
- F-003: `docs/audit/runs/2026-04-28-data.md` § F-2026-04-28-D-003
- Migration discipline rule: `docs/audit/decisions/migration_naming_discipline.md`
- F-003 detector function: `k.fn_check_migration_naming_discipline()` (currently returns 1 row — the historical violation; Stage 12 file gap would not surface here because the detector compares same-name-different-SQL within the DB, not DB-vs-filesystem)

---

## C2-CAND-002 — Lesson #40 candidate: tool errors are not semantically meaningful

**Source:** Chat-side phase-1 branch hygiene inventory, 2026-04-28 evening (corrected by CC's verification)
**Trigger context:** Chat used GitHub MCP `list_commits` with `sha=<branch>` parameter to check branch existence. 404 responses for `fix/m8`, `fix/m11`, `fix/q2`, etc. were treated as "branch doesn't exist". CC's `git ls-remote` against the actual remote showed all 9 of those branches still existed. The 404s were a tool failure mode (likely URL-encoding of the slash in branch names), not semantic absence.

**Why this matters:**
- Same failure pattern as Lessons #38 (count-delta, not time-window) and #39 (cross-row JSONB sampling): single-source verification when a more authoritative cross-source was available
- The chat-written brief encoded the error and instructed CC to skip 9 actually-existing branches
- CC followed the brief correctly; the brief was wrong

**Suggested forward discipline (if promoted to lesson):**
- MCP tool errors (404, empty result, connection error, schema mismatch) are not necessarily semantically meaningful
- Cross-check with a different tool, a second MCP server, or have CC verify with shell access before treating tool errors as ground truth
- For inventory-style work (branches, files, rows) where authoritative verification is available via shell or alternate tool, prefer that over chat-side MCP-only inference
- For closure work (migrations, registry updates) where chat is the apply layer, use count-delta verification (Lesson #38) and cross-row sampling (Lesson #39) as the standard

**Severity if confirmed:** Process-level. Not a data integrity issue but a workflow safety issue. Codifies what to do when chat's tools give surprising answers.

**Promotion path:** If cycle 2 surfaces another instance of tool-error-as-ground-truth, promote to Lesson #40 in the lessons register and update `docs/audit/roles/data_auditor.md`. Until then, sit here as a candidate.

---

## How to use this file

When cycle 2 runs:

1. Snapshot is taken (or operator decides cycle 2 is needed)
2. ChatGPT reviews the snapshot AND this file
3. For each candidate, ChatGPT decides: still relevant? Promote to formal finding? Discard?
4. Findings are added to the cycle 2 run file with proper `F-YYYY-MM-DD-X-NNN` IDs
5. Items addressed get marked here (or the file gets pruned to only un-promoted items)

Until cycle 2 runs, this file is append-only — new candidates can be added, but candidates aren't resolved here. The audit cycle is the resolution mechanism.

If a candidate becomes urgent before cycle 2 (e.g., production impact), it should be raised directly in the open findings register (`docs/audit/open_findings.md`) with a manual finding ID rather than waiting for the cycle.
