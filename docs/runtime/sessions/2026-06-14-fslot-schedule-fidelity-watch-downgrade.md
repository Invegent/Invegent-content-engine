# 2026-06-14 — F-SLOT-SCHEDULE-FIDELITY: backlog/rule-slot latency discovery → P4 / WATCH downgrade

**Status:** F-SLOT-SCHEDULE-FIDELITY **DOWNGRADED to P4 / WATCH** (post-Fix-1 verification window). **NOT fully closed.**
**Register:** docs-only reconciliation at **v3.48** (`docs/00_action_list.md` + `docs/00_sync_state.md`). Builds on Fix 1 (v3.47).
**Lane footprint:** read-only discovery + docs-only reconciliation — 0 code / 0 DB / 0 migration / 0 deploy / 0 dashboard / 0 source / 0 production mutation. **Authority impact: none.**

---

## 1. Discovery findings (read-only)
- **Rule-slot early `~23.5h` bucket** was caused by the OLD `release_queue_on_asset_ready` collapsing `queue.scheduled_for` to `NOW()` — **already fixed by Fix 1 (v3.47)**. The rule-slot semantics question is therefore **explained / resolved by Fix 1** unless the watch disproves it.
- **Multi-day late tail** was the **historical Apr/May YouTube OAuth outage + backlog drain**, not a current scheduler defect. **No June-origin late recurrence found.**
- **No current capacity issue:** 12 queued / 0 needs_review / 1 queued >3d.
- **Portal-path discovery:** `portal_approve_draft` has **zero production usage ever**. The `draft_approve_and_enqueue` / `portal_approve_draft` drift (uses `get_next_scheduled_for`, can discard slot/draft intent) is **dormant** — a client-portal launch prerequisite, **not current production drift**.
- **`fan_out_episode` past-date clamp** (`now()+1h`) is a **separate design question**, not an active schedule-fidelity bug.

## 2. Status change
**F-SLOT-SCHEDULE-FIDELITY → P4 / WATCH** (post-Fix-1 verification window). Not closed.

**Watch criteria:**
- early `1h_1d` bucket should collapse toward `within_1h`;
- no new June-origin `>3d` late tail;
- median absolute delay should approach the publisher-cron cadence.

## 3. Carried (NOT new implementation lanes)
- **Portal-path drift** — fix `draft_approve_and_enqueue` / `portal_approve_draft` **before Phase 3 client-portal launch** (latent launch prerequisite; dormant today).
- **`fan_out_episode` past-date clamp** — separate design decision.
- **Rule-slot semantics** — considered resolved/explained by Fix 1 pending the watch.

**No implementation work started this pass.** No new lane opened.
