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
| Medium | 0 | 4 |
| Low | 0 | 2 |
| Info | 0 | 0 |

**Last audit run:** 2026-04-30 Data Auditor (4 findings, all closed same day)  
**Next scheduled run:** TBD — Data Auditor's default rotation slot is Tuesday

---

## Open findings

_No open findings. All 4 from 2026-04-30 Data Auditor cycle 2 pass were closed in the same session._

---

## Recently closed (last 30 days)

### Cycle 2 — 2026-04-30 Data Auditor

#### F-2026-04-30-D-001  ·  MEDIUM  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** `m.ai_job` had two UNIQUE indexes over identical column tuple `(post_draft_id, job_type)` — `ux_ai_job_post_draft_job_type` and `ux_ai_job_unique`. Both bare unique indexes (no constraint backing). Cleanup explicitly deferred in the 27 Apr migration `stage_12_053_fill_pending_slots_ai_job_upsert`.  
**Action taken:** Migration `audit_drop_redundant_ai_job_unique_index` applied via Supabase MCP per D170. Dropped `ux_ai_job_post_draft_job_type` (verbose duplicate); kept `ux_ai_job_unique` as canonical. UPSERT path preserved end-to-end (resolves on column tuple, not index name). Pre/post verification: 6 → 5 indexes on `m.ai_job`.  
**Severity-honest note:** Could have been HIGH given the explicit deferral; auditor's MEDIUM rating was conservative but still actionable.  
**Run file:** `runs/2026-04-30-data.md`

#### F-2026-04-30-D-002  ·  MEDIUM  ·  closed-action-pending
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** `m.slot` missing index on `filled_draft_id`. Auditor expected the index per role definition; Phase B / Phase C will lookup slots via this column.  
**Action pending:** B19 backlog item created in `docs/00_action_list.md`. Trigger to promote: `m.slot.n_live_tup > 5000` OR EXPLAIN-evidenced seq scan with measurable cost (whichever fires first). At current 159 live tuples, Postgres correctly chooses seq scans (idx_scan_pct on the table is already 97.1% via existing indexes for queries that benefit). Adding the index now would yield no measurable improvement.  
**Forward note:** Audit role expectations could be refined to be row-count-aware ("index expected OR table is below threshold size"). Captured for next role iteration.  
**Run file:** `runs/2026-04-30-data.md`

#### F-2026-04-30-D-003  ·  LOW  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** Snapshot Section 15 omitted `f.canonical_content_body` despite Data Auditor role naming it as a hot table; Phase B body-health gate makes its indexes auditor-relevant.  
**Action taken:** Verified `f.canonical_content_body` has all expected indexes (PK on `canonical_id`, `idx_ccb_status` on `fetch_status`, `idx_ccb_active_pick` partial composite supporting the body-health gate filter pattern, plus two more for classifier and retention paths). No DDL change needed. Snapshot brief refreshed at this commit — Section 15 now includes `f.canonical_content_body` as the 5th hot table.  
**Run file:** `runs/2026-04-30-data.md`

#### F-2026-04-30-D-004  ·  LOW  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** Snapshot Section 13 reported a count of 162 public functions but did not itemise them; auditor cannot verify intentional RPC exposures vs misplaced/legacy functions from a count alone.  
**Action taken:** Snapshot brief refreshed at this commit — Section 13 now emits a JSON array of `{name, args, return_type}` objects. Tomorrow's run will produce the full inventory. Classification (`rpc_exposed | compatibility | legacy | unknown`) deferred to a future iteration: requires either grep-of-EF-source evidence (out of Tier 0 scope) or human judgment. Mechanical inventory is sufficient for cycle 3.  
**Run file:** `runs/2026-04-30-data.md`

---

### Cycle 1 — 2026-04-28 Data Auditor

### F-2026-04-28-D-001  ·  HIGH  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-28 · **Scope expanded mid-closure**
**Issue:** Phase B / slot-driven tables created 22-27 Apr 2026 had no purpose registered in `k.table_registry` (31 tables across c, f, m, t schemas).
**Action taken:** Backfilled ALL 56 ICE tables that were missing purpose — original scope was 31 Phase B tables, operator extended to also close the 25 older entries (pre-22 Apr) in the same session.
- Migration 1: `20260428040000_audit_f001_phase_b_table_purposes_backfill` (commit `491e157`) — 31 Phase B tables.
- Migration 2: `20260428043000_audit_f001_followup_older_table_purposes_backfill` (commit `8b2d669`) — 25 older tables.
- **Coverage: 72.0% → 100.0% across all 7 ICE schemas (200/200 ICE tables documented).**
- Schema verification performed on uncertain entries (`c.brand_stakeholder` / `c.brand_avatar` / `c.client_avatar_profile` chain, `c.platform_channel`).
**Forward discipline:** New tables ship with purpose registered at creation, not retroactively (Lesson #35).
**Run file:** `runs/2026-04-28-data.md`

### F-2026-04-28-D-002  ·  MEDIUM  ·  closed-action-pending
**Role:** Data Auditor · **Closed:** 2026-04-28
**Issue:** `c` and `f` schemas at 0% column-purpose coverage in `k.column_registry` (479 + 195 = 674 columns).
**Action pending:** Verified during closure that `k.column_registry` refresh works — rows exist with full type metadata, just empty `column_purpose` fields. The 0% is genuine documentation backlog, not a broken pipeline. Three-phase overnight-assisted plan designed at `docs/audit/decisions/f002_column_backfill_plan.md` (commit `78b7eeda`): snapshot column metadata → ChatGPT proposes purposes (read-only) → operator approves batches in chat → Claude applies migrations. Build estimate ~2 hr, deferred until next docs sprint slot.
**30 Apr update:** Phase D ARRAY mop-up (29 Apr, first D182 brief) advanced c+f from 0% to 22.1% (149/674). 30 Apr's slot-core / post-publish / pipeline-health-pair / operator-alerting-trio briefs each advanced m schema from 9.2% → 39.94% (274/686). F04 (post_render_log, in flight) takes m to ~42.3%. Cycle 2 observation O-001 carries this forward; not re-raised as a new finding.  
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
| 2026-04-30 | Data Auditor (cycle 2) | 4 (2M, 2L) | 0 | `runs/2026-04-30-data.md` |

---

## Forward-discipline lessons captured (for next audit cycles)

Lessons added during this cycle that subsequent audit runs should respect:

- **Lesson #35** — New tables ship with both table and column purposes at creation time, not retroactively. Source: F-2026-04-28-D-001 closure.
- **Lesson #36** — A migration name is a permanent identity once applied. Fix iterations get a new sequential number AND a distinguishing suffix. Source: F-2026-04-28-D-003 closure.
- **Lesson #41 (candidate)** — Audit role expectations should be row-count-aware where applicable. "Index expected on column X" should be qualified "OR table is below threshold size where seq scan is correct". Source: F-2026-04-30-D-002 closure. Promote to canonical Lesson when a second finding hits the same pattern.
- **Lesson #42 (candidate)** — When a brief specifies a hot-table list against a role definition, the brief should mirror the role's full hot-table set. Source: F-2026-04-30-D-003 closure.

If a future audit run re-raises a finding that overlaps with one of these locked lessons, the auditor should reference the lesson and downgrade severity (or close as `closed-redundant` referencing the prior finding).
