# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-04 | dashboard-architecture-review-kickoff | ICE Dashboard Architecture Review formally kicked off — three foundational decisions locked (Strategic Renovation, Brief+alerts on Telegram only, lighter agent surface). 11-section review document agreed; doc location BOTH repos; ~9-10h estimate; §1 starts next session no-rush. Plus: Cowork night-task unblock (v1-spec owner-gate added; cowork_prompt v2.1→v2.2) and manual run of nightly-health-check-v1 v2.1 (clean pass; 5 stuck items in 3 clusters filed). | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | Three queued items shipped: ai-worker v2.11.1 deployed (F-AI-WORKER-PARSER-SKIP-BUG); audit matrix CASE patch (F-AAP-007 v2); m.fill_pending_slots scheduled_for write (F-PUB-009). 2/3 D-01 reviews escalated type-(c); state-capture override with PK approval; both shipped clean. Lesson #62 type-(c) at 5+ vindications, ready for canonical promotion. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | Phone-flow knock + deep pipeline investigation. B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 brief v1→v2; F-PUB-009 brief authored; F-AI-WORKER-PARSER-SKIP-BUG diagnosed (single root cause for 3 prior P1 findings). T-MCP-11/12 each reinforced. F-AAP-DRAFTS-STUCK subsumed; F-RECOVER-LOOP-001 P1→P3. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 (audit views v2); runbook v1→v2→v2.1 across 2 ChatGPT external audits; F-HISTORIC-DEAD-CLEANUP retired (Phase 1.7); T-MCP-11/12 lessons. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept; audit schema + 2 views; cap lift deferred (math caught). | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams; 3 structural issues identified. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed; post-apply ACL gap surfaced via break-glass. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns P1-urgent. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 root cause confirmed. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied. | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-04 laptop Sydney evening — Dashboard Architecture Review kickoff + Cowork recovery

~3h chat-side. Full detail: `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md`. Prior phase: `docs/runtime/sessions/2026-05-04-laptop-three-applies.md`.

**Three workstreams:**

1. **Cowork night-task unblock** ✅ — diagnosis: Cowork did run at 02:03 AEST 4 May, but `nightly-health-check-v1` queue row was stuck at `review_required` since 2 May (brief never re-fired); next ready row was a cc-owned brief that Cowork picked up because executor had no owner-gate. Fix: 4-file commit `e2cecc6` flipping queue rows + adding 5 missing v1-spec fields to the cc brief + encoding owner-field semantics into v1 spec + cowork_prompt v2.1→v2.2 with owner-gate filter. Two nights of health checks lost (3 May + 4 May).

2. **Manual Cowork run** ✅ CLEAN — PK manually executed v2.2 prompt; Cowork ran `nightly-health-check-v1` v2.1 in ~4 min (~25.5k tokens), 5-of-7 thresholds hit, 0 questions, 0 corrections, 0 schema bugs, 0 production writes. v2.1 SQL fix held first time. Output `docs/audit/health/2026-05-04.md`. Cowork commits `40166245` + `24de9180`. Section 10 surfaced 5 true-stuck items in 3 clusters (LinkedIn-PP residual, YouTube-PP unexpected, YouTube-NY unexpected) — FILED for tomorrow's diagnosis. Queue row reset commit `46255fde` for next nightly fire ~02:00 AEST 5 May (real autonomous test of v2.2 owner-gate).

3. **ICE Dashboard Architecture Review — KICKED OFF** ✅. Four rounds of review iteration with PK-supplied reviewer notes + external standards research + own market research (agency tools, modern admin, multi-tenant, editorial CMS, AI agent observability, content moderation UX). PK's three foundational decisions LOCKED:

   - **Strategic renovation** — design from first principles, implement through staged migration. Existing pages as evidence/source material.
   - **Multi-channel: Brief + alerts on Telegram only** — web is primary for everything else; non-web is the nudge.
   - **Agents as status surface, not full colleague framing** — status cards + section, no calibration UI / threshold tuning / profile pages as MVP.

   **Refreshed IA (6 sections, ~18 items):** NOW (Overview/Inbox/Pipeline) · CLIENTS (All-Clients/Feeds/Onboarding/Connect) · CREATE (Content-Studio/Formats) · INVESTIGATE (Flow/Pipeline-Log/Visual-Pipeline/Agents) · REPORTS (1 nav, 3 tabs: Performance/Costs/Calibration) · ADMIN (Reviews/Compliance-Rules/Subscriptions/Roadmap).

   **Doc location LOCKED:** BOTH repos — review in `Invegent-content-engine/docs/dashboard-review-2026-05/`, link from `invegent-dashboard/docs/architecture-review/`.

   **11-section structure adopted, ~9-10h estimate over 3 sessions.** §1 starts next session whenever PK signals — no rush.

**Standing rules honoured**: D-01 (no production patches; no review fires this session), D-170 (no DB work), Lesson #51 (PF1-PF5 honoured for cowork commits), G1 convention (this session file IS the detail).

**T-MCP-02 quota**: 24 (unchanged). **Net P0+P1 open**: 4 (unchanged). **Closure budget**: +0.5h cowork unblock; architecture work excluded from closure budget per standing rule. Trailing-14d ~19.0h above 8.0 floor.

---

## 🟡 Next session priorities (carry-forward from action_list v2.35)

1. Personal businesses check-in
2. **Tomorrow's autonomous Cowork run validation** — verify 2026-05-05 ~02:00 AEST run executed under v2.2 owner-gate; check `docs/audit/health/2026-05-05.md` exists and is clean
3. **T05 Meta dev support contact** (P1-urgent)
4. **CFW LI fill cycle V3-V5 acid test** when next CFW LI slot fires (~05-06 03:04 UTC) — tests parser fix + F-PUB-009 simultaneously
5. **3 stuck-item clusters from health check** (P1-fast-investigation): LinkedIn-PP residual, YouTube-PP unexpected, YouTube-NY unexpected
6. **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts in `needs_review`
7. **F-PUB-009 7-day flow check** (P2)
8. **Dashboard Architecture Review §1 (current-state inventory)** — when PK signals; ~1.5h estimated

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **7 review_ids close-the-loop pending** (4 from prior batches + v2.34's `ba234fce`, `e462597f`, `753930ad`)
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design; F-HISTORIC-DEAD-CLEANUP RETIRED v2.32)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent; F-AI-WORKER-PARSER-SKIP-BUG is forward-only, will not retroactively recover. Audit trail intact.
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-04 laptop Sydney evening — dashboard architecture review kickoff + cowork recovery (v2.35).*
