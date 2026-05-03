# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog with priorities and triggers
3. Open the most-recent session file from the index below if deeper context is needed

The two top-level files (sync_state + action_list) are complementary: this file answers *"what happened recently"*, action_list answers *"what's queued next"*.

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-03 | pipeline-relief-apply-night | Pipeline relief Migration 1+2 applied: 16 dead queue rows swept (NDIS-FB preserved per F-PUB-005); audit schema + 2 views created; cap lift deferred (math error caught: cap=30 doesn't unblock streams already at 50-105 queued); PP-FB orphan/pending finding surfaced via new audit view | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end pipeline investigation: 4 stalled streams diagnosed; 3 structural issues identified (F-AAP-001 backfill avalanche, F-PUB-010 cap collision, F-PUB-009 legacy spread); CFW LinkedIn recovery-loop pathology evidenced ×4 | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed end-to-end via reusable SECURITY DEFINER function; post-apply ACL gap surfaced + closed via break-glass; T-MCP-08 3rd vindication; new lesson candidate (post-apply ACL verification) | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns to P1-urgent; F-AAP-007 + B-AUDIT-CHECK5-DRIFT logged | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 confirmed root cause (slot-driven v4 vs auto-approver SQL fetcher contract break); ChatGPT correction validated | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions; closure effectiveness metric; bidirectional severity anchors | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED (5-signal panel + paused-cron hardening) | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED (drop trigger + hard-cap cron) | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 night Sydney — Pipeline relief apply + audit views v1

~0.7h chat-side this apply session. Full detail: `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md`. Investigation prerequisite at `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md`.

**Trigger**: PK observation of LinkedIn silence on CFW / NDIS-Yarns / Invegent (3 days) + Facebook silence on CFW + Invegent. PK directed end-to-end pipeline investigation "tonight" with explicit priority.

**Investigation findings** (prior session): 4 stalled streams. Three structural issues colliding: F-AAP-001 backfill avalanche reapproved ~25 days of drafts × F-PUB-010 hard-cap blocking new entries × F-PUB-009 legacy spread function ignoring slot intent. Plus CFW LinkedIn recovery-loop pathology ×4 evidenced (`m.recover_stuck_slots` refilled failed slots with already-published drafts). Plus 10 (→17 by apply time) stale dead queue rows from F-AAP-001 outage era.

**ChatGPT D-01 review fires**: 2 (review_ids `7228440f` plan-level, `cee17af5` apply-level). Both ESCALATED partial verdict. T-MCP-02 quota 18 → **20**.

**Math correction caught at apply time**: original recommendation of uniform cap=30 doesn't unblock 3 of 4 over-cap streams (queue depths 50/72/105 all exceed 30). Pure future-ceiling change with zero immediate effect. Cap lift deferred entirely.

**State drift caught at apply time**: Invegent-LI stuck pending_fill slot 32afbe4a SELF-HEALED in the 9h gap between investigation and apply (recovery loop filled it cleanly with draft 7802673f at 5-3 12:40 UTC). Removed from Fix 5 scope. Dead queue rows grew 10→17.

**Migrations applied (2)**:

1. `pipeline_relief_dead_queue_sweep_v2` — DELETE 16 dead queue rows from F-AAP-001 era (12 PP-FB + 4 CFW-IG; **1 NDIS-FB row preserved per F-PUB-005 carry-forward**). First attempt failed on `m.system_audit_log.triggered_by` check constraint (custom value rejected); v2 used `manual` and succeeded. Audit log row recorded.

2. `audit_schema_and_views_v1` — CREATE SCHEMA `audit` + 2 read-only views (`audit.v_publish_queue_summary` + `audit.v_slot_health_by_client_platform`). C2 view uses CORRECTED slot status vocab (`filled|future|failed|pending_fill`) per chat-side review of original ChatGPT audit-readiness proposal. Includes `orphan_filled_slots` column for the filled-but-NULL-draft pathology.

**View paid for itself on first use**: `v_slot_health_by_client_platform` immediately surfaced **Property Pulse Facebook with 1 orphan_filled_slot + 1 pending_fill_slot** — not in tonight's original diagnosis. Logged as new finding `B-PP-FB-ORPHAN-PENDING-FILL` for next session investigation.

**Standing rules honoured**: D-01 (2 reviews, both honoured per protocol on escalate=true — PK explicitly resolved option (a) on second), D-170 (chat applies migrations only), D-186 (closure +0.7h, trailing-14d 14.7→15.4h, well above 8.0h floor), F-PUB-005 carry-forward (1 NDIS-FB row preserved), G1 convention.

**Pattern signals**:
- Lesson #62 type-(a) reinforced: ChatGPT pushback correctly classified strong/medium/weak; strong objection (NDIS-FB exclusion) actioned, weak (view efficiency) declined.
- **NEW lesson candidate**: state-snapshot age ≥ 4h requires re-verification before any DML/DDL. State drifted in 9h: 10→17 dead rows, 1 stuck slot self-healed.
- Audit view validates the partial-adoption pattern from chat-side review of v1 audit-readiness report. C2's first query surfaced what ad-hoc SQL missed.

**Closure budget**: +0.7h. Trailing-14d 14.7 → 15.4h. Above floor.

**Net P0+P1 open findings**: unchanged (tonight's work was incident-relief + audit-infra; no P0/P1 closure or new P0/P1 logged).

---

## 🟡 Next session priorities (carry-forward from action_list v2.30)

1. Personal businesses check-in
2. **T05 Meta dev support contact** (P1-urgent, unchanged from v2.29)
3. **B-PIPELINE-INCIDENT-REMEDIATION** — deferred fixes from tonight: cap lift with revised per-stream targets (~80/100/130/30) paired with F-PUB-009 fix, Fix 3 recovery loop function patch, Fix 2 F-PUB-009 structural fix. Likely needs sequencing as: F-PUB-009 first → cap lift → Fix 3.
4. **F-AAP-007 fix apply path** (brief committed; carry-forward from v2.29)
5. **B-AUDIT-CHECK5-DRIFT fix apply path** (brief committed; carry-forward from v2.29)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` row `1bae5068-c77a-40f1-a2a6-769fbc5988b9` (T-MCP-05-NEW) — escalated, awaits close-the-loop UPDATE in next session
- The 5 over-cap (client, platform) combos hold their existing queue depth — by design, drains via publish rate. **NEW v2.30**: 1 NDIS-FB dead queue row preserved tonight per this carry-forward (status=`dead`, last_error LIKE 'not_approved:%'); next dead-row sweep should continue to exclude.
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4 migration
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **NEW v2.30**: 4 CFW LinkedIn slots in `marked_failed: exceeded_recovery_attempts` state (slots `bd979865`, `f6e56cff`, `b1f55068`, `b6c77804`) — quiescent, do not reset until `m.recover_stuck_slots` patch is applied (Fix 3 deferred to next session)
- **NEW v2.30**: NDIS-Yarns LinkedIn slot `8f9e5c57-d162-4f65-aaf2-85dbe8fddbd0` — orphan state (filled, NULL draft_id) since 4-27, do not touch pending Fix 5 review of recovery loop interaction

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 night Sydney — pipeline relief apply + audit views v1 (Migration 1+2 applied; cap lift / Fix 3 / Fix 2 deferred to next session).*
