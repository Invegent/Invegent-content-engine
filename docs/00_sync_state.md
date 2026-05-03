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
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Includes (newest first): 3 May morning chat (F-PUB-006 closed), 3 May morning CC (F-PUB-006 partial), 2 May very late evening (B31 deploy), 2 May late evening (session-end reconciliation), 2 May afternoon (ChatGPT Review MCP built), 1 May early morning UTC (T07 step 4 + auto-approver starvation discovery). Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 mid-morning Sydney chat session 2

Single chat thread, ~1.5h, opened ~10:30 AEST. Full detail: `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md`.

**Closed**: F-PUB-007 (not-real-bug — cron picks up "lost" approvals over time; 34 down from 44 yesterday, all NDIS-Yarns × Facebook at queue 92 vs cap 10), F04 Option A both parts (column_purposes migration + table_purpose refresh), Q-post-render-log-001.

**Surfaced**: F-PUB-010 candidate — asymmetric cap enforcement between trigger and cron (`enqueue-publish-queue-every-5m` has no cap check; trigger respects `max_queued_per_platform`, cron does not). PK directive: hard-cap semantics, surface over-cap as backpressure.

**Promoted**: F-PUB-005 patch brief v1→v2 (drop trigger + add hard cap to cron, ~30-line migration), status: draft → ready. Closes F-PUB-005 + F-PUB-010 in single migration.

**Coverage**: m schema docs 26.2% (180/686) → 28.4% (195/686).

**Closure budget**: +1.5h. Trailing-14-day 6.3h → 7.8h (0.2h short of 8.0 floor; F-PUB-005 patch apply next session clears).

**Pattern signals**: Lesson #62 candidate refined to type-(c) — ChatGPT consistency-bias on sql_destructive (escalate=true persists even after verified_claims body acknowledges Path B clearance). T-MCP-06 added: investigate sql_destructive escalation rate (~80% over 5 fires). Implication: chat reads `verified_claims` body, not just `escalate` boolean, when deciding Path B success.

**Production state at session end**:
- B31 live, F-PUB-004 closing in production
- F-PUB-005 patch ready for next-session apply
- m schema docs coverage 28.4%
- NDIS-Yarns FB queue at 92 vs cap 10 (resolves via F-PUB-005 patch v2 hard-cap on apply)
- T-MCP-02 quota at 12 of 5 (well exceeded)

---

## 🟡 Next session priorities (carry-forward from action_list v2.22)

1. Personal businesses check-in
2. F-PUB-005 patch apply — closes F-PUB-005 + F-PUB-010 in single migration (next-session priority 1 closure work)
3. publish-queue-and-publish CC brief execution (status: ready)
4. B-INV-CFW-Invegent-Silent-Approver investigation (NDIS-Yarns firing all 4 platforms post-B31; CFW + Invegent silent across all platforms)
5. B-INV-LinkedIn-PhantomPublishes investigation (daily 00:00 UTC phantom publishes confirmed reproducible)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` row `2bab95d5-...` — status `escalated` per PK Path A choice; T-MCP-05 close-the-loop UPDATE pending
- F-PUB-005 patch brief at `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` is now `status: ready` (was `draft` until 3 May mid-morning); apply gates per the brief's pre-flight P1-P5

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

*Last updated: 2026-05-03 Sunday mid-morning Sydney (G1 restructure complete).*
