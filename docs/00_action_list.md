# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-04-30 Thursday evening Sydney (v1.2 — added R09 reconciliation v2 brief authorship).

## How this file works

**At session start**, chat reads this file and:
1. **Rebuilds the Today / Next 5 view below** from the live state of categories — this is the curated "what to do now" view
2. Runs 🔄 Standing checks (verify at every session open)
3. Ask PK about 💼 Personal businesses (per standing rule — they come first)
4. Surfaces any 🔴 Time-bound items due today or tomorrow

**As work happens**, items move between categories:
- Backlog → Ready → Active → (closed and removed)
- New items arrive from run state follow-ups, decisions, or operator observation
- Items in 🧊 Frozen are surfaced when their trigger condition is met

**At session end**, chat reconciles this file alongside `docs/00_sync_state.md` per standing memory rule. New action items captured during the session are added before the session closes — not retrospectively.

**Per-item shape**: Title · Priority · Owner · Trigger or Due · Source · Brief context. Active and Ready items also have **Next action** — the concrete physical thing to do.

**4-level priority scale** (P0–P3):
- **P0** = blocks today's work or production-critical
- **P1** = has a calendar deadline within 7 days OR is the most strategic open item
- **P2** = should happen within 2-4 weeks OR is investigation work that informs a Phase decision
- **P3** = nice-to-have, hygiene, or low-stakes cosmetic

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **This section is curated, not maintained.** Chat regenerates the table below at every session start by selecting from Time-bound, Active, Personal Businesses, Ready, and Pending Decisions sections. Maximum 5 rows. If you're asking "what should I do next," this is the answer.
>
> **How to rebuild:** (1) include any P0 items unconditionally, (2) include any P1 items with calendar pressure, (3) include the highest-priority Personal Business item if PK has flagged any, (4) include the highest-leverage Ready/Strategic item, (5) cap at 5.
>
> **Last rebuilt:** 2026-04-30 Thursday evening Sydney (initial population).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (per standing rule entry 19) | ICE is bonus, not driver — personal comes first | Ask PK directly: "Anything live in CFW / Property buyers agent / NDIS FBA today that jumps the queue?" |
| 2 | Phase B +24h observation checkpoint | P0 | Due Fri 1 May ~5pm AEST / 03:48 UTC (24h after deploy) | Open `docs/runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md`, copy the 4 obs SQL queries (deploy_timestamp `'2026-04-30 03:48:25.383415+00'` already substituted), run them via Supabase MCP, paste results |
| 3 | Gate B exit decision | P0 | Sat 2 May, gated on rank 2 result | If +24h obs clean (zero new exceeded_recovery_attempts, shadow ai_job <5%, no new slot_fill_no_body_content) → exit Gate B Sat 2 May; if not → fork to extend Gate B 5–7 days OR temporarily disable image_quote at format-mix layer |
| 4 | Decide on `structured_red_team_review_v1` pilot | P1 | Most strategic non-time-bound item | PK reads `docs/runtime/structured_red_team_review_v1_proposal.md` and decides: (a) when to invest 90min calibration slot, (b) which agent (Grok specifically vs any LLM), (c) before or after Phase C cutover |
| 5 | Meta App Review status check | P1 | Past 27 Apr deadline (3 days ago today per memory entry 4) | PK opens Meta App Review dashboard, checks state, contacts Meta dev support if still stuck |

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

| ID | Item | Priority | Due | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| T01 | **Phase B +24h observation checkpoint** | P0 | Fri 1 May ~5pm AEST / 03:48 UTC | chat | Run the 4 obs SQL queries from the Phase B run state file (deploy_timestamp already substituted in queries) via Supabase MCP | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) (queries verbatim) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May (gated on T01 result) | PK + chat | Read T01 result; if clean apply decision rule (exit on schedule); if not, choose between extend Gate B 5–7 days OR disable image_quote at format-mix layer | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) — decision rule documented |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only; cap resets automatically | calendar; no action required |

---

## 🟡 Active (in flight right now)

| ID | Item | Priority | Status | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| *(none)* | Active queue idle as of 30 Apr Thu evening | — | — | — | — | [briefs/queue.md](briefs/queue.md) |

---

## 💼 Personal businesses (PK confirms at session start)

Per standing memory rule (entry 19): PK personal businesses come first. ICE is bonus, not driver. **Chat asks PK at session start if anything is live; PK populates this section as needed.**

| ID | Item | Priority | Trigger | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| *(awaiting PK input next session)* | | | | | | |

---

## 🟢 Ready / Strategic (next-session candidates)

| ID | Item | Priority | Owner | Estimated time | Next action | Source |
|---|---|---|---|---|---|---|
| R01 | **Decide on `structured_red_team_review_v1` pilot** | P1 | PK | 15min decision + 60-90min calibration | PK reads the proposal doc, makes 3 decisions: (a) when to invest the slot, (b) which agent, (c) before/after Phase C | [proposal](runtime/structured_red_team_review_v1_proposal.md) (commit `ddf3d7ab`) |
| R02 | **Author audit Slice 2 brief** | P1 | PK + chat | 30min | Chat drafts brief at `docs/briefs/audit-slice-2-snapshot-generation.md` per D184 spec; defines `docs/audit/snapshots/{YYYY-MM-DD}.md` output format; pushes to ready queue | D184; [morning sync_state](00_sync_state.md) optional item 4 |
| R03 | **Run brief #2 via Cowork** (after R02) | P2 | Cowork | 30min observed | Once R02's brief lands ready, kick off Cowork; observe whether 5/5 thresholds hit on a different brief shape | D182 v1 second-shape test |
| R04 | **Audit cycle 2 manual run** (after Slice 2 produces snapshot) | P2 | ChatGPT + chat | 30min | Once R03 produces a snapshot file, hand it to ChatGPT for findings; chat captures findings as cycle 2 output | D181 manual loop, cycle 2 of 5 |
| R05 | Next column-purpose Tier 1 brief — operator-alerting trio (external_review_queue + compliance_review_queue + external_review_digest, ~57 cols) | P2 | chat → CC | 60min total | Chat authors brief same shape as slot-core/post-publish briefs, hands to CC | [slot-core run state](runtime/runs/slot-core-purposes-2026-04-30T020151Z.md) follow-ups |
| R06 | Alternative Tier 1 brief — pipeline-health pair (pipeline_health_log + cron_health_snapshot, ~37 cols) | P2 | chat → CC | 60min total | Same shape as R05, alternative target tables | [slot-core run state](runtime/runs/slot-core-purposes-2026-04-30T020151Z.md) follow-ups |
| R07 | Update `invegent-dashboard` roadmap for 26.2% m schema milestone | P3 | chat | 10min | Edit `app/(dashboard)/roadmap/page.tsx`, update PHASES array + lastUpdated; push to main; Vercel auto-deploys | standing rule entry 11 |
| R08 | **Meta App Review status check** | P1 | PK | 5min | PK opens Meta App Review dashboard, captures state; if stuck >27 Apr 2026, contact Meta dev support | userMemories entry 4 — past 27 Apr deadline |
| R09 | **Author reconciliation v2 brief** | P1 | PK + chat | 30-45min brief authorship + ~45-60min implementation later | **AFTER T01 + T02 + personal businesses check complete tomorrow:** read `docs/briefs/reconciliation-v2-spec.md` and turn it into a formal brief at `docs/briefs/reconciliation-v2.md`. Spec is the agreed A+B+C+D plan: append-only sync_state with compact top "Current State Snapshot", three reconciliation templates (Bookmark/Goodnight/Full), default tier = Bookmark, action_list owns task board / sync_state owns state snapshot + narrative. Defer automation script. Falsifiable test: 10 sessions, avg <20min, no content loss → if >35min or content loss, revise | [spec capture](briefs/reconciliation-v2-spec.md) (commit `5837342`); 30 Apr Thu evening discussion + ChatGPT review |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| D-01 | Adopt `structured_red_team_review_v1` after calibration? | P1 | Calibration runs first; this is the post-calibration ratification call | Decide AFTER R01 calibration completes; ratify as D185 if adopted, archive as proposal-rejected if not | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| D-02 | When to invest the 90min red-team calibration slot | P1 | Recommended within 7-10 days, after Phase B Gate B confirmed exited | PK picks calendar slot; chat blocks the time | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| D-03 | Which agent runs the red-team review (Grok specifically vs any LLM) | P2 | Proposal didn't justify Grok specifically; any sufficiently capable LLM works | PK picks: Grok (different model family), another Claude instance (red-team mode), or whichever is most accessible | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content. Either fix source mix or accept thin pool | PK decides: invest in source diversification (~3-5 new feeds per Invegent vertical) OR accept the asymmetry and weight Invegent verticals higher per Phase E | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over from morning sync_state | PK confirms whether the merge actually simplifies vs splits, then chat updates the brief structure | morning sync_state |

---

## 📌 Backlog (known, not prioritised yet — awaits trigger)

> Backlog items don't have a Next action column because the next action is "wait for the trigger to fire". When a trigger fires, the item moves to Ready and gains a Next action.

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
   - **Rebuild the Today / Next 5 view** by selecting from the categories below
   - Run 🔄 Standing checks (S1–S6)
   - Surface any 🔴 Time-bound items due today or tomorrow
   - Ask PK about 💼 Personal businesses (per standing rule)
   - Show PK the 🟢 Ready section if PK is open-ended on what to work on

2. **As work happens (chat updates inline):**
   - Item moves Backlog → Ready when its trigger fires (gains Next action when promoted)
   - Item moves Ready → Active when work starts
   - Item moves Active → (removed) when done; closure summary in commit message
   - New items added with full row when identified — never deferred to "I'll add it at end of session"

3. **At session end (chat reconciles):**
   - Verify nothing in Active was missed
   - Move any new follow-ups from run states / decisions into Backlog
   - Update Last updated timestamp
   - Sync with `docs/00_sync_state.md` and memory entry 14

4. **Removal vs done:**
   - Done items are removed from this file (active-action-index principle)
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

## v1.2 honest limitations

- **Personal businesses section is empty** — chat asks PK at every session open; populated by PK
- **Standing checks not yet automated** — S1-S6 manual until a session-start preamble script earns build
- **No automated freshness check** — chat must remember to update Last updated timestamp AND rebuild Today / Next 5
- **Today / Next 5 is human-curated each session** — there's no algorithm; chat applies the rebuild heuristic at session start
- **Categories may evolve** — if 🟢 Ready and 📌 Backlog blur over time, consider merging or sub-categorising. Try v1.x for 2 weeks before changing the shape.
- **Reconciliation v2 not yet implemented** — R09 captures the work to author the brief tomorrow. Until v2 lands, sessions still use freeform reconciliation; default-Bookmark rule does NOT apply yet.

If after 2 weeks this file is consistently stale or PK is still asking "what's next" because the file isn't being read, the experiment failed and we go back to sync_state-only with a clearer NEXT SESSION section. Falsifiable.

---

## Changelog

- **v1.0** (30 Apr Thu evening): initial creation — 8 categories, 4-level priority, update protocol, falsifiable 2-week test
- **v1.1** (30 Apr Thu evening): patched per ChatGPT review:
  1. Header rename: "single source of truth" → "single active action index" (sync_state, run states, decisions, briefs, commits retain authority)
  2. Added ⭐ Today / Next 5 section at top — rebuilt every session start, max 5 rows, the curated "what to do now" view
  3. Added Next action column to 🔴 Time-bound, 🟡 Active, 🟢 Ready, 🤝 Pending decisions tables (the difference between a label and an executable task)
  4. Wording fix: "3-tier priority" → "4-level priority" (P0–P3 is 4 levels)
- **v1.2** (30 Apr Thu evening): added R09 reconciliation v2 brief authorship, P1, gated on T01+T02+personal-businesses-check completing tomorrow first; spec captured at `docs/briefs/reconciliation-v2-spec.md`
