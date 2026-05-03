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
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED (5-signal panel + paused-cron hardening) | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED (drop trigger + hard-cap cron) | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Includes (newest first): 3 May morning chat (F-PUB-006 closed), 3 May morning CC (F-PUB-006 partial), 2 May very late evening (B31 deploy), 2 May late evening (session-end reconciliation), 2 May afternoon (ChatGPT Review MCP built), 1 May early morning UTC (T07 step 4 + auto-approver starvation discovery). Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 late-morning Sydney — T02 Gate B body-health exit ratified

~0.5h chat-side, immediately following F-PUB-005 apply session. Full detail: `docs/runtime/sessions/2026-05-03-t02-ratification.md`.

**Closed**: T02 (Phase B image+quote body-health gate exit) at +71.3h post-deploy.

**5-signal panel**: S1 exceeded_recovery_attempts=0 PASS, S2 shadow ai_job 0 fail / 14 total PASS, S3 slot_fill_no_body_content=0 PASS, S4 pool_thin all=0 PASS, S4b pool_thin Invegent=0 PASS, S5 slot_alerts=0 PASS, **S5b cron_health_alert=1 FAIL → carved out**.

**S5b carve-out**: single failing row was alert_id `231c929c-...` for jobid 53 (`instagram-publisher-every-15m`), alert_type `no_recent_runs`, raised 2026-05-01 00:00:00 UTC, auto-resolved 15 min later. Jobid 53 is in the carried-forward "do not touch" set per T07 step 4 rollback. Heartbeat alert is the expected consequence of the cron being deliberately paused.

**MCP review fire #14** (review_id `521628d0-57f6-44ff-a18a-5fca58b51fb1`): plan_review, escalate_explicit_flag, partial/medium/medium. Pushback separated: strong = judgement-call assertion of spec-author intent without evidence; weak = type-c flavour "override of escalation procedures" framing when the proposal IS the escalation. PK chose Path A.

**Path A hardening (paused-cron enumeration)**: 4 paused crons total — jobid 11 (FB seed-enqueue), 53 (IG publisher), 64 (IG seed-enqueue), 65 (LI seed-enqueue). Lifetime cron_health_alert history: only jobid 53 has ever raised one (3 lifetime, 1 in T02 window). Jobs 11/64/65 zero lifetime alerts. S5b carve-out is structurally bounded.

**T-MCP-02 quota**: 14 of 5 (was 13 of 5). Plan_review escalation rate ~6 of 7 (high). Sql_destructive ~50% (3 of 6) unchanged.

**Closure budget**: +0.5h. Trailing-14-day 8.8h → **9.3h** (comfortably above 8.0 floor).

---

## 🟡 Next session priorities (carry-forward from action_list v2.24)

1. Personal businesses check-in
2. T04 R01 calibration session (90min hard cap, due Sun/Mon)
3. T05 Meta dev support contact (PK external action, ASAP)
4. V3-V5 wait-based verifications for F-PUB-005 patch (single query against post-apply T+0 baseline)
5. publish-queue-and-publish CC brief execution (status: ready)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` rows `2bab95d5-...` (T-MCP-01) and `521628d0-...` (T02 ratification) — status `escalated`, T-MCP-05 close-the-loop UPDATEs pending PK confirmation
- The 5 over-cap (client, platform) combos (NDIS × FB/IG/LI, PP × IG/LI) hold their existing queue depth — by design, drains via publish rate. Don't manually clear or truncate.

---

## 📜 G1 convention (the new rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md` where:
- `YYYY-MM-DD` is the session date (Sydney local OK)
- `{slug}` is a short topic identifier (e.g. `b31-deploy`, `f-pub-006-cleanup`, `t02-ratification`)

**At session end, chat updates this file ONLY by:**
1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 Sunday late-morning Sydney — T02 ratified.*
