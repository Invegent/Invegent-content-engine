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
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns to P1-urgent; F-AAP-007 + B-AUDIT-CHECK5-DRIFT logged | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 confirmed root cause (slot-driven v4 vs auto-approver SQL fetcher contract break); ChatGPT correction validated | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions; closure effectiveness metric; bidirectional severity anchors | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED (5-signal panel + paused-cron hardening) | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED (drop trigger + hard-cap cron) | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 evening Sydney — Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean

~1.9h chat-side. Full detail: `docs/runtime/sessions/2026-05-03-faap001-002-apply.md`.

**Trigger**: PK "close session with full reconciliation" instruction at session-end. Session opened with stance retire decision under S20.

**Major events**:

1. **Stance retired** explicit by PK. Criterion #1 fired v2.27 (V3-V5 PASS held ~13h). T05 audit-gating logic shifted from trust-rebuild to verification-driven (B-AUDIT-V4-PEERS clean).

2. **B-AUDIT-V4-PEERS read-only audit** complete. Doc: `docs/audit/runs/2026-05-03-baudit-v4-peers.md` (commit 356e0588). Audit-gate verdict: CLEAR. Active-path findings: F-AAP-001 (known), F-AAP-002 (P2), F-AAP-003 (P3 misleading-metric), B-CRON-V3-ORPHAN (P3 cleanup). Dormant findings: F-AAP-004/005/006 (paused crons; must fix before resumption). Confirmed-safe: `m.fill_pending_slots`, 2 `_updated_at` triggers, all `bundle_*`/`select_*`/`score_*` legacy functions.

3. **F-AAP-001 fix applied at 09:25 UTC.** Brief (commit dbf8c488) → CC migration (commit f3b6604) → MCP review escalated (`745482fb-...`) → replay test PASS (96 rows) → apply → criterion #1 PASS (96), #4 PASS (23 v4 approvals at 09:30 cron tick), #6 interim PASS (zero over-cap growth at 8min). T-MCP-08 lesson candidate reinforced (sql_destructive escalation produced new knowledge via replay).

4. **F-AAP-002 fix applied at ~09:35 UTC.** Brief (commit f03ec564) → CC migration with surprise pre-flight #4 (commit ee03009) → MCP review escalated (`d4e25cfa-...`) Lesson #62 type-(c) → state-capture exception applied with PK approval → apply → criterion #1 reconciled to warn cnt=2 (Path 1 accept), other 11 checks unchanged.

5. **Two follow-up findings discovered during F-AAP-002 verification**:
   - **F-AAP-007 (NEW, P2)**: audit Check 8 (`approved_drafts_missing_queue_entry`) doesn't account for F-PUB-010 hard-cap backpressure. Currently misreporting fail cnt=56; will grow as F-AAP-001 drain continues. Same fix shape as F-AAP-002 but for F-PUB-010.
   - **B-AUDIT-CHECK5-DRIFT (NEW, P3)**: Check 5 queries `status='locked'` which isn't in current vocabulary; locks signalled via `locked_at`/`locked_by`. Older drift; not v4-specific.

**Standing rules honoured**: D-01 (MCP review fired twice), D-186 (closure budget +1.9h, trailing-14d 13.1h, well above 8.0 floor), D170 (chat applies migrations only), Lessons #32, #36, #51, #62 type-(c) correctly applied.

**Pattern signals**: audit-cycle compounding healthy (B-AUDIT-V4-PEERS surfaced F-AAP-002/003/B-CRON-V3-ORPHAN; F-AAP-002 verification surfaced F-AAP-007/B-AUDIT-CHECK5-DRIFT). Worth tracking as stat: findings per audit cycle. State-capture exception cleanly applied to consistency-bias re-fire skip (F-AAP-002 second MCP not fired).

**Closure budget**: +1.9h. Trailing-14-day 11.2 → 13.1h. Above floor.

**Net P0+P1 open findings**: down by 2 (F-AAP-001 + F-AAP-002 closed).

---

## 🟡 Next session priorities (carry-forward from action_list v2.28)

1. Personal businesses check-in
2. **T05 Meta dev support contact** (returned to P1-urgent post audit-gate clearance)
3. F-AAP-007 fix brief drafting (P2; same shape as F-AAP-002 but for F-PUB-010 backpressure)
4. B-AUDIT-V4-PEERS-EF read-only audit (P3, CC-suitable)
5. publish-queue-and-publish CC brief execution (P2, still queued)
6. T-MCP-05 close-the-loop UPDATE on `m.chatgpt_review` rows: `1e5ab2eb-...` (v2.27) + NEW v2.28: `745482fb-...` (F-AAP-001) + `d4e25cfa-...` (F-AAP-002)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` rows: `2bab95d5-...` (T-MCP-01), `521628d0-...` (T02 ratification), `1e5ab2eb-...` (F-AAP-001 v2.27 close-out plan), **NEW v2.28: `745482fb-...` (F-AAP-001 apply) + `d4e25cfa-...` (F-AAP-002 apply)** — T-MCP-05 close-the-loop UPDATEs pending PK confirmation
- The 5 over-cap (client, platform) combos (NDIS × FB/IG/LI, PP × IG/LI) hold their existing queue depth — by design, drains via publish rate. V3-V5 confirmed holding through F-AAP-001 apply (no over-cap growth at 8min interim check). Don't manually clear or truncate.
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3 per R01 calibration carry-forward Option γ
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4 migration. **NEW v2.28**: resumption gate must include fix-or-deprecation of `match_demand_to_canonicals` (F-AAP-004) before reactivating.
- **NEW v2.28**: jobid 12 (`planner-hourly`) — still active despite producing v3 orphan data (B-CRON-V3-ORPHAN). Do NOT pause without first running reader-side audit on digest_item/digest_run consumers (EFs, dashboards, ad-hoc queries). Reader-side audit is a separate read-only investigation pass.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 evening Sydney — Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean.*
