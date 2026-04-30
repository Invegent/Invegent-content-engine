# ICE — Action List

> **Single source of truth for what's queued, in flight, blocked, or frozen.**
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-04-30 Thursday evening Sydney.

## How this file works

**At session start**, chat reads this file and surfaces:
1. 🔄 Standing checks — verify at every session open
2. 🔴 Time-bound — anything due today or tomorrow
3. 💼 Personal businesses — ask PK if anything live there jumps the queue
4. 🟡 Active — what's in flight right now

**As work happens**, items move between categories:
- Backlog → Ready → Active → (closed and removed)
- New items arrive from run state follow-ups, decisions, or operator observation
- Items in 🧊 Frozen are surfaced when their trigger condition is met

**At session end**, chat reconciles this file alongside `docs/00_sync_state.md` per standing memory rule. New action items captured during the session are added before the session closes — not retrospectively.

**Per-item shape**: Title · Priority · Owner · Trigger or Due · Source · Brief context.

**Priority scale**:
- **P0** = blocks today's work or production-critical
- **P1** = has a calendar deadline within 7 days OR is the most strategic open item
- **P2** = should happen within 2-4 weeks OR is investigation work that informs a Phase decision
- **P3** = nice-to-have, hygiene, or low-stakes cosmetic

---

## 🔄 Standing session-start checks

Run these every session open before deciding what to work on. Most take <2 min.

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1 | Personal business priorities | Ask PK directly: "Anything live in CFW / Property / NDIS FBA that jumps the queue today?" | Whatever PK says |
| S2 | Stage 2.3 trigger | Query last 24h post counts per active client | Any client with 0 posts in 24h → Stage 2.3 jumps queue |
| S3 | Open `m.slot_alerts` count | `SELECT COUNT(*) FROM m.slot_alerts WHERE acknowledged_at IS NULL` | >0 → investigate before new work |
| S4 | Failed slots last 7d | `SELECT COUNT(*) FROM m.slot WHERE status='failed' AND scheduled_publish_at >= NOW() - INTERVAL '7 days'` | New failures since last session → investigate |
| S5 | Anthropic spend trend | Query `m.ai_usage_log` cost since 1st of month | Approaching Stop 1 ($30/mo) → review |
| S6 | sync_state freshness | Last-written timestamp on `docs/00_sync_state.md` | >12h old → re-read full file before assuming state |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Source |
|---|---|---|---|---|---|
| T01 | **Phase B +24h observation checkpoint** | P0 | Fri 1 May ~5pm AEST / 03:48 UTC | chat | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) (queries verbatim) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May (gated on T01 result) | PK + chat | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) — decision rule documented |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | calendar; no action required, awareness only |

---

## 🟡 Active (in flight right now)

| ID | Item | Priority | Status | Owner | Source |
|---|---|---|---|---|---|
| *(none)* | Active queue idle as of 30 Apr Thu evening | — | — | — | [briefs/queue.md](briefs/queue.md) |

---

## 💼 Personal businesses (PK confirms at session start)

Per standing memory rule (entry 19): PK personal businesses come first. ICE is bonus, not driver. **Chat asks PK at session start if anything is live; PK populates this section as needed.**

| ID | Item | Priority | Trigger | Owner | Source |
|---|---|---|---|---|---|
| *(awaiting PK input next session)* | | | | | |

---

## 🟢 Ready / Strategic (next-session candidates)

| ID | Item | Priority | Owner | Estimated time | Source |
|---|---|---|---|---|---|
| R01 | **Decide on `structured_red_team_review_v1` pilot** | P1 | PK | 15min decision + 60-90min calibration | [proposal](runtime/structured_red_team_review_v1_proposal.md) (commit `ddf3d7ab`) |
| R02 | **Author audit Slice 2 brief** | P1 | PK + chat | 30min | D184; [morning sync_state](00_sync_state.md) optional item 4 |
| R03 | **Run brief #2 via Cowork** (after R02) | P2 | Cowork | 30min observed | D182 v1 second-shape test |
| R04 | **Audit cycle 2 manual run** (after Slice 2 produces snapshot) | P2 | ChatGPT + chat | 30min | D181 manual loop, cycle 2 of 5 |
| R05 | Next column-purpose Tier 1 brief (operator-alerting trio: external_review_queue + compliance_review_queue + external_review_digest, ~57 cols) | P2 | chat → CC | 60min total | [slot-core run state](runtime/runs/slot-core-purposes-2026-04-30T020151Z.md) follow-ups |
| R06 | Alternative Tier 1 brief: pipeline-health pair (pipeline_health_log + cron_health_snapshot, ~37 cols) | P2 | chat → CC | 60min total | [slot-core run state](runtime/runs/slot-core-purposes-2026-04-30T020151Z.md) follow-ups |
| R07 | Update `invegent-dashboard` roadmap for 26.2% m schema milestone | P3 | chat | 10min | standing rule entry 11 |
| R08 | **Meta App Review status check** | P1 | PK | 5min | userMemories entry 4 — past 27 Apr deadline |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Source |
|---|---|---|---|---|
| D-01 | Adopt `structured_red_team_review_v1` after calibration? | P1 | Calibration runs first; this is the post-calibration ratification call | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| D-02 | When to invest the 90min red-team calibration slot | P1 | Recommended within 7-10 days, after Phase B Gate B confirmed exited | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| D-03 | Which agent runs the red-team review (Grok specifically vs any LLM) | P2 | Proposal didn't justify Grok specifically; any sufficiently capable LLM works | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content. Either fix source mix or accept thin pool | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over from morning sync_state | morning sync_state |

---

## 📌 Backlog (known, not prioritised yet — awaits trigger)

| ID | Item | Priority | Trigger to promote to Ready | Source |
|---|---|---|---|---|
| B01 | 9 LOW-confidence column rows joint session (3 post-publish + 6 F-002 P1/P2/P3) | P2 | Joint operator+chat session scheduled | [post-publish followup](audit/decisions/post_publish_observability_low_confidence_followup.md), [F-002 followups](audit/decisions/f002_p1_low_confidence_followup.md) |
| B02 | **27 Apr fill-pending-slots constraint race investigation** | P2 | Before Phase C cutover begins | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) follow-up |
| B03 | Provider diversification on retry (worker-side, separate code path) | P2 | After +24h obs window confirms body-health filter held alone | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) follow-up |
| B04 | Stub-content classifier improvements (`nds.org.au/news`, `ndis.gov.au/print/pdf/node/18` misclassified) | P3 | When upstream classifier work resumes | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) follow-up |
| B05 | 27 Apr cron infrastructure pause investigation | P3 | Only if pattern recurs during a future migration burst | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) informational |
| B06 | Branch hygiene sweep (10 stale branches across 3 repos) | P3 | Session prep window | [morning sync_state](00_sync_state.md) backlog |
| B07 | Phase B filename hygiene rename `20260428163000_audit_f002_p2_column_purposes_corrected.sql` → `20260428064115` | P3 | Cosmetic; do during a hygiene window per Lesson #36 | [morning sync_state](00_sync_state.md) backlog |
| B08 | CC Phase C final report file (Tier 0 doc generation) | P3 | When Phase C cutover planning begins | [morning sync_state](00_sync_state.md) backlog |
| B09 | Pre-sales: A11b prompts ×18 rows + A4→A3 proof doc + A18 source-less EFs audit + A6 subscription costs | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B10 | YouTube channel ingest activation (brief committed Apr 8, source_type_code='youtube_channel' designed) | P2 | When YouTube layer earns build (per D183 build-when-evidence) | [docs/briefs/2026-04-08-youtube-channel-ingest.md](briefs/2026-04-08-youtube-channel-ingest.md) |
| B11 | Manual newsletter subscription setup for `feeds@invegent.com` (newsletter/ndis + newsletter/property labels) | P3 | When PK has 30min for subscription form-filling | userMemories entry 8 |
| B12 | Nightly pipeline health Cowork task (Supabase pipeline only, separate from weekly reconciliation) | P2 | After D182 second run confirms Cowork reliability across brief shapes | userMemories entry 23 |
| B13 | Telegram channels + `claude rc` Remote Control + Opus 4.6 1M context integration | P3 | When useful trigger emerges | userMemories entry 23 |
| B14 | `docs/15_pre_post_sales_criteria.md` classification of 38 audit items | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B15 | Phase E — Invegent vertical signal weighting (~30% of ~50-item budget = ~15 items, ~5/vertical) | P2 | After thin-pool decision (D-04 above) is made | userMemories entry 29, D174 |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

These are **intentionally** deferred with documented triggers. Do not promote to Ready unless the trigger fires.

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor (OpenAI reads snapshot, writes findings) | Manual cycle 5+ per D181 (currently cycle 1) | D181, D184 |
| F04 | Most-undocumented m table column-purpose slices: `external_review_digest` (17), `cron_health_snapshot` (16), `post_render_log` (16) | After R05 or R06 ships and proven | [slot-core run state](runtime/runs/slot-core-purposes-2026-04-30T020151Z.md) follow-ups |
| F05 | D156 (deferred to 27 Apr per the original ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) | LinkedIn Community Management API approval — evaluate Late.dev if unresolved by 13 May 2026 | userMemories entry 2 |

---

## Update protocol

This file's accuracy depends on disciplined updates. The rules:

1. **At session start (chat reads first):**
   - Run 🔄 Standing checks (S1–S6 above)
   - Surface any 🔴 Time-bound items due today or tomorrow
   - Ask PK about 💼 Personal businesses
   - Show PK the 🟢 Ready section if open-ended on what to work on

2. **As work happens (chat updates inline):**
   - Item moves Backlog → Ready when its trigger fires
   - Item moves Ready → Active when work starts
   - Item moves Active → (removed) when done; closure summary in commit message
   - New items added with full row when identified — never deferred to "I'll add it at end of session"

3. **At session end (chat reconciles):**
   - Verify nothing in Active was missed
   - Move any new follow-ups from run states / decisions into Backlog
   - Update Last updated timestamp
   - Sync with `docs/00_sync_state.md` and memory entry 14

4. **Removal vs done:**
   - Done items are removed from this file (single-source-of-truth principle)
   - The audit trail lives in: commit messages, run state files, decisions log, sync_state
   - This file is the **active backlog**, not the historical record

5. **No silent additions:**
   - Every new item references its source (run state, decision, observation, brief)
   - "I'll just add this casually" is not allowed — without a source, it's not actionable

6. **Standing rule extension** (memory entry 11 four-way sync now):
   - docs/00_sync_state.md
   - docs/06_decisions.md
   - invegent-dashboard roadmap page.tsx
   - **docs/00_action_list.md (this file)**

---

## v1 honest limitations

- **Personal businesses section is empty** — chat asks PK at every session open; populated by PK
- **Standing checks not yet automated** — S1-S6 manual until a session-start preamble script earns build
- **No automated freshness check** — chat must remember to update Last updated timestamp
- **Categories may evolve** — if 🟢 Ready and 📌 Backlog blur over time, consider merging or sub-categorising. Try v1 for 2 weeks before changing the shape.

If after 2 weeks this file is consistently stale or PK is still asking "what's next" because the file isn't being read, the experiment failed and we go back to sync_state-only with a clearer NEXT SESSION section. Falsifiable.
