# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-04-30 Friday late afternoon Sydney (v1.6 — R05 done & removed; R02 in queue ready for Cowork; F04 promoted to Active; T05 added: Meta business verification failed; R07 PK-deferred; m schema 39.94%).

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
> **Last rebuilt:** 2026-04-30 Friday late afternoon Sydney (post R05 close + R02 queued + F04 brief authored; PK kicking off R02 Cowork run; B17 + docs/06 numbering reconciliation = next-up while waiting).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (per standing rule entry 19) | ICE is bonus, not driver — personal comes first | Cleared at session open — PK confirmed nothing live in CFW / Property / NDIS FBA today |
| 2 | Phase B +24h observation checkpoint | P0 | Due Fri 1 May ~5pm AEST / 03:48 UTC (24h after deploy) | Open `docs/runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md`, copy the 4 obs SQL queries (deploy_timestamp `'2026-04-30 03:48:25.383415+00'` already substituted), run them via Supabase MCP, paste results |
| 3 | Gate B exit decision | P0 | Sat 2 May, gated on rank 2 result | If +24h obs clean (zero new exceeded_recovery_attempts, shadow ai_job <5%, no new slot_fill_no_body_content) → exit Gate B Sat 2 May; if not → fork to extend Gate B 5–7 days OR temporarily disable image_quote at format-mix layer |
| 4 | **R02 — Audit Slice 2 snapshot generation** (Cowork in flight, PK kicking off now) | P1 | Brief authored + queued ready; PK running Cowork manually | PK pastes Cowork prompt → Cowork executes 16 SQL queries + git op + writes today's snapshot → review_required → chat reviews + closes |
| 5 | **B17 polish + docs/06 numbering reconciliation** (during Cowork wait window) | P3 + P2 | While Cowork runs R02 (~10 min); these are the two hygiene items PK chose | (B17) Single Supabase MCP UPDATE to `latest_run_status` purpose. (docs/06) Add formal log entries for D170, D181, D182, D183, D184; reserve D185 for red-team-review ratification |

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
| T04 | **R01 calibration session** | P1 | Sun 3 May or Mon 4 May (after Gate B exit known) | PK + chat | 90min hard cap. ChatGPT first. Test on original pre-revision Phase B brief + first CC migration draft. If reconstruction hard → skip calibration, defer to Phase C live pilot | [proposal w/ pilot decision](runtime/structured_red_team_review_v1_proposal.md) |
| T05 | **Meta business verification failed** (PK confirmed 30 Apr morning) | P1 | ASAP — pre-weekend ideally | PK | PK contacts Meta dev support per `docs/05_risks.md` Risk 1 + Risk 3. Login required, business interaction. Was "In Review" per userMemories entry 4; now failed. **Phase 1.6 deliverable from Phase 1 plan; blocks all Standard Access graduation work and external client onboarding.** Memory entry 4 stale — needs update to "verification failed 30 Apr" once support contact is logged | [docs/05_risks.md](05_risks.md) Risk 1 + Risk 3, [docs/04_phases.md](04_phases.md) Phase 1.6 |

---

## 🟡 Active (in flight right now)

| ID | Item | Priority | Status | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| F04→Active | **post_render_log column-purposes** (16 cols on `m.post_render_log`) | P2 | brief authored + queue ready | chat (authored) → CC (drafts) → chat (applies) | Awaiting CC pre-flight + migration draft + push (likely overnight). Single table, smallest brief of the run. Strict JSONB rule applies to `render_spec` (image-worker / video-worker EF source must be cited) | [brief](briefs/post-render-log-column-purposes.md) (commit `24fb53d7`); [queue](briefs/queue.md) |
| R02 | **Audit Slice 2 — snapshot generation** (Cowork Tier 0; second-shape D182 test) | P1 | ready in queue | Cowork (PK kicking off) | PK pastes the tailored prompt I provided into Cowork; Cowork executes 16 SQL queries + 1 git op + writes today's snapshot at `docs/audit/snapshots/2026-04-30.md` matching cycle 1 structure (sections 1-17 + 19, NO section 18). Idempotency check FIRST. Output is input material for cycle 2 manual ChatGPT auditor pass (R04). | [brief](briefs/audit-slice-2-snapshot-generation.md) (commit `e7247966`); [queue](briefs/queue.md) |

---

## 💼 Personal businesses (PK confirms at session start)

Per standing memory rule (entry 19): PK personal businesses come first. ICE is bonus, not driver. **Chat asks PK at session start if anything is live; PK populates this section as needed.**

| ID | Item | Priority | Trigger | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| *(none flagged this session)* | | | | | | |

---

## 🟢 Ready / Strategic (next-session candidates)

| ID | Item | Priority | Owner | Estimated time | Next action | Source |
|---|---|---|---|---|---|---|
| ~~R01~~ | ~~Decide on `structured_red_team_review_v1` pilot~~ | — | — | — | **DECIDED 30 Apr — see T04 (calibration scheduled) and proposal PILOT DECISION header.** | [proposal](runtime/structured_red_team_review_v1_proposal.md) (commit `4d6a0fba`) |
| ~~R02~~ | ~~Author audit Slice 2 brief~~ | — | — | — | **DONE — brief authored at commit `e7247966`. Promoted to Active (queue ready, Cowork running).** | — |
| R03 | **Audit cycle 2 manual run** (after Slice 2 produces snapshot) | P2 | ChatGPT + chat | 30min | Once R02 (Cowork) produces a snapshot file, hand it to ChatGPT for findings; chat captures findings as cycle 2 output. Renumbered from old R04 — no longer gated on R03 because R03 (run brief #2 via Cowork) was conflated with R02 itself | D181 manual loop, cycle 2 of 5 |
| ~~R05~~ | ~~Operator-alerting trio brief~~ | — | — | — | **CLOSED 2026-04-30 — see queue.md Recently completed and run state. m schema 31.6% → 39.94%. F04 promoted to Active in its place.** | — |
| ~~R06~~ | ~~Pipeline-health pair brief~~ | — | — | — | **CLOSED 2026-04-30 — see queue.md Recently completed.** | — |
| R07 | Update `invegent-dashboard` roadmap milestone | P3 | chat | 10min | **PK 30 Apr afternoon: explicitly delayed.** Will reflect ~42% m schema once F04 lands; bundle into a single dashboard update covering today's full ~9.2 → 42% sweep | standing rule entry 11 |
| R08 | **Meta App Review status check** | P1 | PK | 5min | **OVERLAPS WITH T05** — when PK contacts dev support for business verification, also captures App Review status in the same conversation | userMemories entry 4 — past 27 Apr deadline |
| R09 | **Author reconciliation v2 brief** | P1 | PK + chat | 30-45min brief authorship + ~45-60min implementation later | **AFTER T01 + T02 + personal businesses check complete tomorrow** | [spec capture](briefs/reconciliation-v2-spec.md) (commit `5837342`) |
| R10 | **Phase C cutover live pilot — apply red-team review** (gated on T04 outcome OR T04 skipped) | P1 | PK + ChatGPT (red-team) + chat | ~30min added to Phase C cutover review process | When Phase C cutover brief is drafted: hand brief + draft migration to ChatGPT in red-team mode | [proposal w/ pilot decision](runtime/structured_red_team_review_v1_proposal.md) |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| D-01 | Adopt `structured_red_team_review_v1` as standing rule? | P1 | **REFRAMED 30 Apr:** decision deferred until **after Phase C pilot (R10)**, NOT after calibration. | After Phase C pilot completes, evaluate: useful / noisy / unnecessary. | [proposal w/ pilot decision](runtime/structured_red_team_review_v1_proposal.md) |
| ~~D-02~~ | ~~When to invest the 90min red-team calibration slot~~ | — | — | **RESOLVED 30 Apr.** | — |
| ~~D-03~~ | ~~Which agent runs the red-team review~~ | — | — | **RESOLVED 30 Apr.** | — |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content. | PK decides: invest in source diversification OR accept the asymmetry and weight Invegent verticals higher per Phase E | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over from morning sync_state | PK confirms whether the merge actually simplifies vs splits | morning sync_state |

---

## 📌 Backlog (known, not prioritised yet — awaits trigger)

> Backlog items don't have a Next action column because the next action is "wait for the trigger to fire". When a trigger fires, the item moves to Ready and gains a Next action.

| ID | Item | Priority | Trigger to promote to Ready | Source |
|---|---|---|---|---|
| B01 | 9 LOW-confidence column rows joint session (3 post-publish + 6 F-002 P1/P2/P3) | P2 | Joint operator+chat session scheduled | [post-publish followup](audit/decisions/post_publish_observability_low_confidence_followup.md), [F-002 followups](audit/decisions/f002_p1_low_confidence_followup.md) |
| B02 | **27 Apr fill-pending-slots constraint race investigation** | P2 | Before Phase C cutover begins | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) follow-up |
| B03 | Provider diversification on retry (worker-side, separate code path) | P2 | After +24h obs window confirms body-health filter held alone | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) follow-up |
| B04 | Stub-content classifier improvements | P3 | When upstream classifier work resumes | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) follow-up |
| B05 | 27 Apr cron infrastructure pause investigation | P3 | Only if pattern recurs during a future migration burst | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) informational |
| B06 | Branch hygiene sweep (10 stale branches across 3 repos) | P3 | Session prep window | [morning sync_state](00_sync_state.md) backlog |
| B07 | Phase B filename hygiene rename | P3 | Cosmetic; do during a hygiene window per Lesson #36 | [morning sync_state](00_sync_state.md) backlog |
| B08 | CC Phase C final report file (Tier 0 doc generation) | P3 | When Phase C cutover planning begins | [morning sync_state](00_sync_state.md) backlog |
| B09 | Pre-sales: A11b prompts ×18 rows + A4→A3 proof doc + A18 source-less EFs audit + A6 subscription costs | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B10 | YouTube channel ingest activation | P2 | When YouTube layer earns build (per D183 build-when-evidence) | [docs/briefs/2026-04-08-youtube-channel-ingest.md](briefs/2026-04-08-youtube-channel-ingest.md) |
| B11 | Manual newsletter subscription setup for `feeds@invegent.com` | P3 | When PK has 30min for subscription form-filling | userMemories entry 8 |
| B12 | Nightly pipeline health Cowork task | P2 | After D182 second run confirms Cowork reliability across brief shapes (R02 outcome will determine) | userMemories entry 23 |
| B13 | Telegram channels + `claude rc` Remote Control + Opus 4.6 1M context integration | P3 | When useful trigger emerges | userMemories entry 23 |
| B14 | `docs/15_pre_post_sales_criteria.md` classification of 38 audit items | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B15 | Phase E — Invegent vertical signal weighting | P2 | After thin-pool decision (D-04) is made | userMemories entry 29, D174 |
| B16 | **Red-team review v1 — ratification call (proposal → standing rule)** | P1 | After R10 (Phase C cutover live pilot) completes | [proposal w/ pilot decision](runtime/structured_red_team_review_v1_proposal.md) |
| B17 | **`m.cron_health_snapshot.latest_run_status` purpose polish** | P3 | **PK 30 Apr afternoon: do this evening during R02 Cowork wait** | [pipeline-health-pair run state](runtime/runs/pipeline-health-pair-purposes-2026-04-30T060202Z.md) chat-applied closure note |
| B18 | **`docs/06_decisions.md` numbering reconciliation** | P2 | **PK 30 Apr afternoon: do this evening during R02 Cowork wait** | Formal log visibly stops at D011 but operational decisions reference D170, D181, D182, D183, D184. Add formal entries for the most-cited operational decisions; reserve D185 for future red-team-review ratification |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

These are **intentionally** deferred with documented triggers. Do not promote to Ready unless the trigger fires.

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor (OpenAI reads snapshot, writes findings) | Manual cycle 5+ per D181 (currently cycle 1; cycle 2 in flight via R02) | D181, D184 |
| ~~F04~~ | ~~`m.post_render_log` (16 cols)~~ | — | **PROMOTED to Active 2026-04-30 17:10 — see Active section.** |
| F05 | D156 (deferred to 27 Apr per the original ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) | LinkedIn Community Management API approval — evaluate Late.dev if unresolved by 13 May 2026 | userMemories entry 2 |
| F07 | **Grok red-team agent evaluation** | Only if T04 ChatGPT calibration is noisy / misses obvious risks, or if second-model comparison wanted before Phase C | [proposal w/ pilot decision](runtime/structured_red_team_review_v1_proposal.md) |
| F08 | **Large m-schema tables column-purpose work** (m.post_draft 100+ cols, m.post_seed, etc.) | When m-schema small-tables sweep complete (after F04→Active lands tomorrow) AND a coherent brief shape designed for tables of this size | After today's 5-brief Tier 1 column-purpose sweep |

---

## Update protocol

This file's accuracy depends on disciplined updates. The rules:

1. **At session start (chat reads first):**
   - **Rebuild the Today / Next 5 view** by selecting from the categories below
   - Run 🔄 Standing checks (S1–S6)
   - Surface any 🔴 Time-bound items due today or tomorrow
   - Ask PK about 💼 Personal businesses (per standing rule)

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
   - Every new item references its source

6. **Standing rule extension** (memory entry 11 four-way sync now):
   - docs/00_sync_state.md
   - docs/06_decisions.md
   - invegent-dashboard roadmap page.tsx
   - **docs/00_action_list.md (this file)**

---

## v1.6 honest limitations

- **Personal businesses section is empty** — chat asks PK at every session open; populated by PK
- **Standing checks not yet automated** — S1-S6 manual until a session-start preamble script earns build
- **No automated freshness check** — chat must remember to update Last updated timestamp AND rebuild Today / Next 5
- **Today / Next 5 is human-curated each session** — there's no algorithm; chat applies the rebuild heuristic at session start
- **Reconciliation v2 not yet implemented** — R09 captures the work to author the brief tomorrow.
- **Two-step graduation for red-team review v1** — calibration → pilot → standing rule.
- **Tier 1 column-purpose pattern at 5× repetition today** — Phase D + slot-core + post-publish + pipeline-health-pair + operator-alerting-trio. F04 (post_render_log) tomorrow makes 6×. After F04, the column-purpose work shifts to other schemas (k 36 cols at 83.6%, t 170 cols at 74.3%, c 479 cols at 0%, f 195 cols at 0%) or to large m-schema tables (F08 frozen) — different brief shape.
- **Meta business verification failure** — T05 added; this is now a Phase 1.6 blocker per docs/04_phases.md and Risk 3 per docs/05_risks.md. The userMemories entry 4 says "In Review (unblocked 16 Apr)" which is now stale — memory needs updating once PK has support contact logged.

If after 2 weeks this file is consistently stale or PK is still asking "what's next" because the file isn't being read, the experiment failed. Falsifiable.

---

## Changelog

- **v1.0** (30 Apr Thu evening): initial creation
- **v1.1** (30 Apr Thu evening): patched per ChatGPT review
- **v1.2** (30 Apr Thu evening): added R09 reconciliation v2 brief authorship
- **v1.3** (30 Apr Fri afternoon, 15:51 Sydney): R06 brief authored
- **v1.4** (30 Apr Fri afternoon, 16:10 Sydney): R01 pilot decision committed
- **v1.5** (30 Apr Fri afternoon, 16:20 Sydney): R06 closed; R05 brief authored
- **v1.6** (30 Apr Fri late afternoon, 17:10 Sydney): **R05 closed (m schema 31.6% → 39.94%, 274/686).** F04 (post_render_log brief) authored at commit `24fb53d7` and promoted from Frozen to Active. R02 (audit Slice 2 brief) added to queue ready for Cowork — PK running it manually now. **T05 added: Meta business verification failed (PK confirmed 30 Apr morning) — Phase 1.6 blocker.** R07 marked PK-deferred. R08 noted to overlap with T05 (single PK contact event). New B17 + B18 (B17 polish + docs/06 numbering reconciliation — PK chose these as wait-window work). New F08 (large m-schema tables column-purpose work — explicitly frozen until appropriate brief shape designed). Today/Next 5 rebuilt — R02 in flight at rank 4, B17+B18 wait-window work at rank 5.
