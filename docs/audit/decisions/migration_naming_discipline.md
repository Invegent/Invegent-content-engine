# Migration Naming Discipline

**Status:** ✅ LOCKED
**Date:** 28 April 2026
**Source:** Audit closure F-2026-04-28-D-003

---

## Why this doc exists

During Phase B Stage 12 work on 27 April 2026, two migrations were applied with the **same name** but **different SQL** — `stage_12_053_fill_pending_slots_ai_job_upsert` was applied at 04:36 UTC (20,360 chars, hash `ed8145a0...`) and again at 05:42 UTC (18,707 chars, hash `3af78ee9...`). The second was a fix iteration of the first, addressing a destructure error pattern (Lesson #33 in standing memory).

The Data Auditor flagged this in the first ICE audit run. The verification query confirmed: same name, different SQL, applied 1 hour apart. That's a discipline gap — no operator can tell from migration history alone which version is canonical.

This doc locks the forward rule.

---

## The rule

**A migration name is a permanent identity. Once a migration name has been applied to the database, that name is retired.**

If the migration logic needs to be revised, the revision gets a **new sequential number and a name that distinguishes it from the original.**

### What's allowed

- `stage_12_052_drop_shadow_filter_for_phase_b_reactivation` (applied)
- `stage_12_052_drop_shadow_filter` (applied later, distinct name) ✅ — these are different migrations sharing the same numeric prefix because they're related work, but the names are distinct.

### What's NOT allowed

- `stage_12_053_fill_pending_slots_ai_job_upsert` (applied)
- `stage_12_053_fill_pending_slots_ai_job_upsert` (applied later with different SQL) ❌ — same name, different SQL, ambiguous canonical.

### What the second one should have been

If `stage_12_053_fill_pending_slots_ai_job_upsert` was discovered to have a bug, the fix should have been:

- `stage_12_054_fill_pending_slots_ai_job_upsert_fix` ✅
- `stage_12_054_fill_pending_slots_destructure_error` ✅

Either name works — what matters is that the **name is new** so the migration history reads unambiguously.

---

## Why this matters

Without this discipline:
- **Auditors can't reason about canonical state.** "Which `stage_12_053` is the actual current behaviour?" is unanswerable from history alone.
- **Rollback gets harder.** Reverting `stage_12_053` becomes ambiguous.
- **Re-running on a clean DB diverges silently.** A fresh `db reset` would apply migrations in version order, and same-named migrations create undefined behaviour.

With this discipline:
- Every applied migration has a unique name.
- Migration history is a reliable timeline.
- Audit trail is preserved.

---

## Idempotent re-applies — the one exception

A migration that is genuinely idempotent (e.g. `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) can be re-applied with the same name **only if** its SQL is byte-identical. The use case is a clean DB reset where the migration is replayed.

**Even in this case, the recommended practice is to never re-apply.** If the system is healthy, the migration is already there. If a reset is needed, the migration system handles it automatically by version order.

If a same-name re-apply happens, the discipline rule still requires:
- The SQL must be byte-identical (verified by hash)
- The reason must be documented (e.g. "DB reset 2026-XX-XX")

If those conditions aren't met, treat the second application as a discipline violation and rename it.

---

## Going forward

1. **Every migration name is permanent once applied.** Treat the name as a primary key in the audit ledger.
2. **Fix iterations get a new sequential number AND a distinguishing suffix.** `_fix`, `_v2`, `_destructure_error`, etc.
3. **CC briefs and chat-driven SQL must check applied migration history before naming a new migration.** If the name conflicts with anything previously applied, rename.
4. **Capture as Lesson #36 in standing memory:** "fix iterations get new migration numbers, not same name."

---

## Related

- **F-2026-04-28-D-003** — the audit finding that surfaced this gap
- **D170** — MCP-applied migrations are the default applied path
- **Lessons #32, #33, #34** — Phase B standing memory lessons covering pre-flight queries, destructure errors, and recovery state ownership
