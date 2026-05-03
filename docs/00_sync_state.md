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
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 confirmed root cause (slot-driven v4 vs auto-approver SQL fetcher contract break); ChatGPT correction validated | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions; closure effectiveness metric; bidirectional severity anchors | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED (5-signal panel + paused-cron hardening) | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED (drop trigger + hard-cap cron) | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 late-afternoon Sydney — F-PUB-005 V3-V5 PASS + F-AAP-001 confirmed root cause

~1.5h chat-side. Full detail: `docs/runtime/sessions/2026-05-03-faap001-rootcause.md`.

**Trigger**: PK 3-step session sequence at session start: (1) F-PUB-005 V3-V5 verifications; (2) B-INV-CFW-Invegent-Silent-Approver investigation; (3) conditional `publish-queue-and-publish` brief if structural uncertainty surfaced.

**Closed**: F-PUB-005 V3-V5 wait-based verifications PASS across all 11 (client, platform) combos. B-INV-CFW-Invegent-Silent-Approver resolved (premise superseded by system-wide silence finding).

**New finding — F-AAP-001 (P1)**: auto-approver SQL fetch function `m.auto_approver_fetch_drafts` requires INNER JOIN on `m.digest_item` + `m.digest_run`, incompatible with slot-driven v4 drafts (`slot_fill_synthesis_v1` job type, ai-worker v2.10.0+) that have `pd.digest_item_id = NULL`. 131 of 135 post-25-April drafts unreachable; 0 of 122 current `needs_review` drafts pass current SQL fetch. Auto-approver silent on entire v4 architecture since 2026-05-02 19:00 UTC (when legacy digest-flow backlog exhausted). Severity P1 — blocks auto-approver on entire v4 architecture.

**ChatGPT correction VALIDATED**: First MCP review of close-out plan ESCALATED (review_id `1e5ab2eb-d29b-4fa6-8e0c-262780f31e0d`), recommending EF source inspection before commit. PK accepted. Inspection of `auto-approver` v53 + `ai-worker` v94 confirmed root cause — upgraded F-AAP-001 from "inferred hypotheses" to "confirmed mechanism". Without source read, F-AAP-001 would have been committed with wrong root cause hypothesis (originally proposed: created_at cutoff at 2026-04-25). Different from Lesson #62 type-(c) — escalation produced genuinely new knowledge.

**Next-session brief queued**: F-AAP-001 fix design. **Path 1 (preferred)**: rewrite SQL fetcher to LEFT JOIN `digest_item`/`digest_run`, read `client_id` from `pd.client_id` instead of `dr.client_id`, preserve LATERAL on `c.client_publish_profile`. **Path 2**: populate `digest_item_id` at slot-fill time (more surface area; couples v4 to dropped v3 dependency).

**Stance retire criterion #1 fired** (V3-V5 PASS, ~13h post-apply). Stance NOT retired — PK accepted close only, did not signal retirement. T05 stays P1-deferred until explicit retirement signal.

**Closure budget**: +0.9h. Trailing-14-day 10.3 → ~11.2h. Above floor.

**Pattern signal**: `plan_review` MCP escalation on inferred hypotheses with one-tool-call-away upstream confirmation = high-value escalation pattern. Lesson candidate. T-MCP-06 sql_destructive hypothesis does NOT apply — different action_type.

---

## 🟡 Next session priorities (carry-forward from action_list v2.27)

1. Personal businesses check-in
2. Operational stance retire decision (criterion #1 fired this session; PK to signal retire/keep)
3. **F-AAP-001 fix brief** — Path 1 SQL fetcher rewrite + acceptance criteria + migration drafting (CC-suitable; chat applies via Supabase MCP per D170)
4. T05 Meta dev support contact (P1-deferred until stance retired)
5. publish-queue-and-publish CC brief execution (status: `ready`, deferred from this session's rank 4)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` rows `2bab95d5-...` (T-MCP-01), `521628d0-...` (T02 ratification), and **NEW: `1e5ab2eb-...` (F-AAP-001 close-out plan, this session)** — T-MCP-05 close-the-loop UPDATEs pending PK confirmation
- The 5 over-cap (client, platform) combos (NDIS × FB/IG/LI, PP × IG/LI) hold their existing queue depth — by design, drains via publish rate. V3-V5 confirmed holding. Don't manually clear or truncate.
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3 per R01 calibration carry-forward Option γ
- **NEW v2.27**: Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4 migration. Verify still appropriate when F-AAP-001 fix brief is drafted; the legacy digest-flow path may need to be cleanly retired or kept paused per the Path 1/2 design choice.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 Sunday late-afternoon Sydney — F-PUB-005 V3-V5 PASS + F-AAP-001 confirmed root cause.*
