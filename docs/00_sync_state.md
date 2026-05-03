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
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED (drop trigger + hard-cap cron) | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Includes (newest first): 3 May morning chat (F-PUB-006 closed), 3 May morning CC (F-PUB-006 partial), 2 May very late evening (B31 deploy), 2 May late evening (session-end reconciliation), 2 May afternoon (ChatGPT Review MCP built), 1 May early morning UTC (T07 step 4 + auto-approver starvation discovery). Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 mid-morning Sydney — F-PUB-005 apply

Apply work block, ~0.5h, immediately following session 2. Full detail: `docs/runtime/sessions/2026-05-03-fpub005-apply.md`.

**Applied**: migration `fpub005_drop_trigger_and_add_hard_cap_to_enqueue_cron` at **2026-05-03 02:29:48 UTC**. Three steps in single transaction: (1) DROP TRIGGER `trg_enqueue_publish_from_ai_job_v1`; (2) DROP FUNCTION `m.enqueue_publish_from_ai_job_v1()`; (3) cron.alter_job replacing jobid=48 (`enqueue-publish-queue-every-5m`) command with cap-aware version (correlated-subquery cap check + COALESCE fallback default 10); (4) COMMENT ON COLUMN `c.client_publish_profile.max_queued_per_platform` documenting hard-cap semantics.

**Closed**: F-PUB-005 (zombie origin) + F-PUB-010 candidate (asymmetric cap enforcement) in single migration.

**Verifications**: V1 (trigger gone) PASS, V2 (function gone) PASS, cron command updated PASS. Post-apply T+0 baseline matches pre-apply P4 across all 11 (client, platform) combos — zero queue growth in 6-min apply window. V3 (+10min backpressure diagnostic), V4 (+30min no-new-zombies), V5 (+60min queue-not-growing-past-cap) deferred to wait-based observation; V5 baseline captured in run state file.

**MCP review** (review_id `0862f3b6-1acb-475e-bd36-49ea5725f957`): proceed/agree/medium-risk/high-confidence/no pushback. **First sql_destructive fire today not to escalate on first pass** — Lesson #62 type-(c) consistency-bias did NOT trigger this time.

**Backpressure expectation (the new normal)**: over-cap (client, platform) combos (NDIS-Yarns × FB/IG/LI; PP × IG/LI) will NOT grow further. Existing 50-128 queued rows drain via `max_per_day` publish rate. Approvals over cap stay un-enqueued — surface as backpressure via the F-PUB-007 verification query.

**Closure budget**: +0.5h. Trailing-14-day 8.3h → **8.8h** (comfortably above 8.0 floor).

**Rollback artefacts**: full pre-patch cron command verbatim + pointer to investigation file for trigger/function source — preserved in run state file.

---

## 🟡 Next session priorities (carry-forward from action_list v2.23)

1. Personal businesses check-in
2. V3-V5 wait-based verifications for F-PUB-005 patch (single query against post-apply T+0 baseline in run state file)
3. publish-queue-and-publish CC brief execution (status: ready)
4. B-INV-CFW-Invegent-Silent-Approver investigation (NDIS-Yarns firing all 4 platforms post-B31; CFW + Invegent silent across all platforms)
5. B-INV-LinkedIn-PhantomPublishes investigation (daily 00:00 UTC phantom publishes confirmed reproducible)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` row `2bab95d5-...` — status `escalated` per PK Path A choice; T-MCP-05 close-the-loop UPDATE pending
- The 5 over-cap (client, platform) combos (NDIS × FB/IG/LI, PP × IG/LI) hold their existing queue depth — by design, drains via publish rate. Don't manually clear or truncate.

---

## 📜 G1 convention (the new rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md` where:
- `YYYY-MM-DD` is the session date (Sydney local OK)
- `{slug}` is a short topic identifier (e.g. `b31-deploy`, `f-pub-006-cleanup`, `mid-morning-chat-session-2`)

**At session end, chat updates this file ONLY by:**
1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 Sunday mid-morning Sydney — F-PUB-005 + F-PUB-010 closed.*
