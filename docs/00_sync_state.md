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
| 2026-05-03 | audit-readiness-completion-night | Migration 3 (audit views v2) applied; runbook v1→v2→v2.1 across 2 ChatGPT external audit cycles; F-HISTORIC-DEAD-CLEANUP retired as miscategorised (per Phase 1.7: dead rows are audit trail); T-MCP-11/12 lessons; 3-tier validation pattern logged for canonical promotion | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
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

### 2026-05-03 late night Sydney — Audit-readiness completion + 2-tier ChatGPT external validation

~1.5h chat-side this phase; ~2.25h combined with prior pipeline-relief-apply-night phase. Full detail: `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md`. Prior phase: `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md`.

**Trigger**: PK directive "i want this to be in place so a free audit can be run by chatgpt" following the M1+M2 apply session. Continuous chat session covering both phases.

**Migrations applied (this phase)**:
- `audit_views_v2_matrix_and_success` — `audit.v_brand_platform_audit_matrix` (with `likely_bottleneck` enum across 14 possible values, computed via 7 CTEs) + `audit.v_publish_success_recent` (14d proof-of-published).

**Combined session migrations (3 total)**: M1 dead-queue sweep + M2 audit views v1 + M3 audit views v2.

**Audit infrastructure complete**: 4 `audit.*` views deployed + runbook v1→v2→v2.1 documenting the autonomous audit flow.

**ChatGPT external validation cycles (2)**:
- **Cycle 1**: ChatGPT audited runbook v1 → found 4 verified errors (worker_http_log doesn't capture publishers; cron health predicate vocabulary wrong; Fix 4 sweep narrower than full picture; cap=30 doesn't unblock queues already at 50-105). Chat verified each claim against ground truth and authored runbook v2.
- **Cycle 2**: ChatGPT audited runbook v2 → substantively validated all corrections + matrix view classifications. Surfaced one nuance: `dead_reason` column (which v2.31 verification missed) shows every dead row already carries an explicit annotation. Chat verified, retired F-HISTORIC-DEAD-CLEANUP as miscategorised (per Phase 1.7 design: "Dead items are never deleted — they are an audit trail"), and authored v2.1 patch.

**ChatGPT D-01 fires (3 this session)**: `7228440f` (initial pipeline-relief plan), `cee17af5` (apply-level after revisions), `648ae6a4` (audit views v2 plan). All ESCALATED partial verdict; all honoured per protocol; all 3 pushback sets classified weak/medium/weak per Lesson #62. T-MCP-02 quota 18 → **21**.

**New lesson candidates**:
- **T-MCP-11**: pre-flight discipline includes verifying log/health table actually contains the data assumed; table existence ≠ usable; column references must be schema-verified.
- **T-MCP-12**: query EVERY annotation column when verifying table contents (last_error, dead_reason, skip_reason, fail_reason, etc.) — not just the most obvious one.
- **3-tier validation meta-pattern**: high-stakes documentation should pass through (1) author publishes, (2) external audit runs against doc, (3) author re-verifies external findings against ground truth. Worth promoting after 1-2 more cycles.

**ChatGPT 2nd audit also reported pipeline drain progression**: PP-FB classification shifted `approved_not_queued_cap_blocked` → `slot_orphan_filled`. Migration 1 sweep + jobid 48 ticking allowed the cap-blocked drafts to enter queue. Pipeline producing 9 FB + 5 LI publishes in 48h. Healthier than morning state.

**Standing rules honoured**: D-01 (3 reviews fired, all honoured; v2.32 doc updates following external review verification did NOT require additional D-01 fire), D-170 (chat applies migrations only via `apply_migration`), D-186 (closure +2.25h total session, trailing-14d 14.7→17.0h, well above 8.0h floor), Phase 1.7 design (dead rows are audit trail), G1 convention.

**F-HISTORIC-DEAD-CLEANUP RETIRED**: 47 dead rows all carry explicit `dead_reason` annotations from prior named remediations (`m8_m11_bloat_window_2026-04-17`, `pre_m8_stale_2026-04-09`, `post_draft_not_found_orphan_F-PUB-006_2026-05-03`, `F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03`, hand-typed prose for the 734-attempt March row). Audit trail intact; no cleanup appropriate.

**Closure budget**: +1.5h this phase, +0.7h prior phase = +2.25h total session. Trailing-14d 14.7 → ~17.0h. Above floor.

**Net P0+P1 open findings**: unchanged at ~9 (B-PIPELINE-INCIDENT-REMEDIATION P1 ongoing; structural fixes deferred to next session).

---

## 🟡 Next session priorities (carry-forward from action_list v2.32)

1. Personal businesses check-in
2. **T05 Meta dev support contact** (P1-urgent, unchanged from v2.29)
3. **B-PIPELINE-INCIDENT-REMEDIATION** — deferred fixes: cap lift with revised per-stream targets paired with F-PUB-009 fix, recovery loop patch. Sequence: F-PUB-009 first → cap lift → Fix 3.
4. **F-AAP-007 fix apply path** (brief committed; carry-forward)
5. **B-AUDIT-CHECK5-DRIFT fix apply path** (brief committed; carry-forward)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` row `1bae5068-c77a-40f1-a2a6-769fbc5988b9` (T-MCP-05-NEW) — escalated, awaits close-the-loop UPDATE in next session
- **T-MCP-05-NEW2 batch (4 review_ids)**: `1bae5068`, `7228440f`, `cee17af5`, `648ae6a4` — all awaiting close-the-loop UPDATE in next batch closure
- The 5 over-cap (client, platform) combos hold their existing queue depth — by design, drains via publish rate. **1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward** (status=`dead`, last_error LIKE 'not_approved:%', `dead_reason='F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03'`)
- **47 historic dead queue rows retained as audit trail** — all carry explicit `dead_reason` annotations per Phase 1.7 design ("Dead items are never deleted"). F-HISTORIC-DEAD-CLEANUP RETIRED v2.32 as miscategorised
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4 migration
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 4 CFW LinkedIn slots in `marked_failed: exceeded_recovery_attempts` state (slots `bd979865`, `f6e56cff`, `b1f55068`, `b6c77804`) — quiescent, do not reset until `m.recover_stuck_slots` patch applied (Fix 3 deferred)
- NDIS-Yarns LinkedIn slot `8f9e5c57-d162-4f65-aaf2-85dbe8fddbd0` — orphan state (filled, NULL draft_id) since 4-27, do not touch pending Fix 5 review
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3) — surfaced v2.30, ChatGPT 2nd audit confirms still present

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 late night Sydney — audit-readiness completion + 2-tier ChatGPT external validation (Migration 3 + runbook v1→v2→v2.1; F-HISTORIC-DEAD-CLEANUP retired; T-MCP-11/12 lessons logged).*
