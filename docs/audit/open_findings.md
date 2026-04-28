# ICE Audit — Open Findings Register

> **Active findings only.** Closed findings stay visible (status changes from `open` to `closed-{type}`) but their resolution is filled in. Closed findings older than 90 days may be archived to `runs/` and removed from this file — but never deleted.

> **Scope:** This register is the audit working file. See `docs/audit/00_audit_loop_design.md` for the architecture, `docs/audit/roles/` for role definitions, and `docs/audit/snapshots/` for evidence.

> **Closure types:** `closed-explanatory` · `closed-action-taken` · `closed-action-pending` · `closed-redundant` · `closed-noted` (for Info-tier observations that auto-close after 30 days).

---

## Summary

| Severity | Open | Closed (last 30d) |
|---|---|---|
| Critical | 0 | 0 |
| High | 0 | 1 |
| Medium | 0 | 2 |
| Low | 0 | 0 |
| Info | 0 | 0 |

**Last audit run:** 2026-04-28 Data Auditor (3 findings, all closed same day)
**Next scheduled run:** TBD — Data Auditor's default rotation slot is Tuesday

---

## Open findings

_No open findings. All 3 from 2026-04-28 Data Auditor pass were closed in the same session._

---

## Recently closed (last 30 days)

### F-2026-04-28-D-001  ·  HIGH  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-28
**Issue:** Phase B / slot-driven tables created 22-27 Apr 2026 had no purpose registered in `k.table_registry` (31 tables across c, f, m, t schemas).
**Action taken:** Backfilled all 31 table purposes via migration `20260428040000_audit_f001_phase_b_table_purposes_backfill` (commit `491e157`). Coverage: 72.0% → 87.5% overall; t schema now 100%, m schema 88.7%.
**Forward discipline:** New tables ship with purpose registered at creation, not retroactively (Lesson #35).
**Run file:** `runs/2026-04-28-data.md`

### F-2026-04-28-D-002  ·  MEDIUM  ·  closed-action-pending
**Role:** Data Auditor · **Closed:** 2026-04-28
**Issue:** `c` and `f` schemas at 0% column-purpose coverage in `k.column_registry` (479 + 195 = 674 columns).
**Action pending:** Verified during closure that `k.column_registry` refresh works — rows exist with full type metadata, just empty `column_purpose` fields. The 0% is genuine documentation backlog, not a broken pipeline. Three-phase overnight-assisted plan designed at `docs/audit/decisions/f002_column_backfill_plan.md` (commit `78b7eeda`): snapshot column metadata → ChatGPT proposes purposes (read-only) → operator approves batches in chat → Claude applies migrations. Build estimate ~2 hr, deferred until next docs sprint slot.
**Run file:** `runs/2026-04-28-data.md`

### F-2026-04-28-D-003  ·  MEDIUM  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-28
**Issue:** Two `stage_12_053_fill_pending_slots_ai_job_upsert` migrations applied 1 hour apart on 27 April with different SQL (20360 vs 18707 chars, different hashes). The 052 pair has different names so is fine; the 053 pair is a real discipline gap.
**Action taken:** Forward rule locked at `docs/audit/decisions/migration_naming_discipline.md` (commit `1157671d`): a migration name is a permanent identity; fix iterations get a new sequential number AND a distinguishing suffix.
**Forward discipline:** Migration names are permanent (Lesson #36).
**Run file:** `runs/2026-04-28-data.md`

---

## Audit run history

| Run date | Role | Findings raised | Findings still open | Run file |
|---|---|---|---|---|
| 2026-04-28 | Data Auditor | 3 (1H, 2M) | 0 | `runs/2026-04-28-data.md` |

---

## Forward-discipline lessons captured (for next audit cycles)

Lessons added during this cycle that subsequent audit runs should respect:

- **Lesson #35** — New tables ship with both table and column purposes at creation time, not retroactively. Source: F-2026-04-28-D-001 closure.
- **Lesson #36** — A migration name is a permanent identity once applied. Fix iterations get a new sequential number AND a distinguishing suffix. Source: F-2026-04-28-D-003 closure.

If a future audit run re-raises a finding that overlaps with one of these locked lessons, the auditor should reference the lesson and downgrade severity (or close as `closed-redundant` referencing the prior finding).
