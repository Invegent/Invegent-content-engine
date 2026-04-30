# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-04-30 Friday late evening Sydney (v2.1 — ChatGPT cross-check halted wrong YT trigger fix; T06 corrected from migration to PK OAuth reconnect; T07 corrected with explicit sequencing via `c.client_publish_profile.publish_enabled`; F-PUB-001 corrigendum committed; Lesson candidates #43-#45 captured).

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

> **This section is curated, not maintained.** Chat regenerates the table below at every session start. Maximum 5 rows. If you're asking "what should I do next," this is the answer.
>
> **Last rebuilt:** 2026-04-30 Friday late evening Sydney (post ChatGPT cross-check; T06 corrected to PK action; T07 sequencing locked).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (per standing rule entry 19) | ICE is bonus, not driver — personal comes first | Cleared at session open — PK confirmed nothing live in CFW / Property / NDIS FBA today; reconfirm next session |
| 2 | **T06 — Reconnect YouTube OAuth** (CORRECTED from trigger fix) | P1 | YT publishing broken since 11 Apr (OAuth refresh tokens expired/revoked for NDIS-Yarns + Property Pulse; Invegent needs first-time setup). 19 stranded slots; AI synthesis + 18 video renders already sunk | PK action via dashboard: Clients → Connect → YouTube for NDIS-Yarns + PP + Invegent. Verify via 30-min cron tick or manual EF invocation post-reconnect: successful upload + `m.post_publish` audit row written |
| 3 | Phase B +24h observation checkpoint | P0 | Due Fri 1 May ~5pm AEST / 03:48 UTC (24h after deploy) | Open `docs/runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md`, copy the 4 obs SQL queries (deploy_timestamp `'2026-04-30 03:48:25.383415+00'` already substituted), run them via Supabase MCP, paste results |
| 4 | **T07 — Instagram publisher recovery** (CORRECTED with explicit 6-step sequence) | P1 | 92 IG queue items piling up; ChatGPT correctly flagged: must exclude PP via `publish_enabled=false` BEFORE re-enabling cron, not after | Run the 6-step sequence in T07 below. Most likely path = (a) chat applies single-row UPDATE to PP IG profile, (b) PK enables cron via dashboard, (c) monitor 30-60 min |
| 5 | Gate B exit decision | P0 | Sat 2 May, gated on rank 3 result | If +24h obs clean → exit Gate B Sat 2 May; if not → fork to extend Gate B 5–7 days OR temporarily disable image_quote at format-mix layer |

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
| S7 | B19 trigger check (added 30 Apr v1.9) | `SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname='m' AND relname='slot'` | n_live_tup > 5000 → promote B19 to Ready |
| S8 | Publisher cron health (added 30 Apr v2.0) | Verify all expected platform publishers have `cron.job.active=true` AND last successful run < 1h ago: jobid 7 (FB-publisher), 34 (YT-publisher), 53 (IG-publisher), 54 (LinkedIn-Zapier), 55 (WP) | Any unexpected `active=false` OR last_success > 1h → investigate before new work |
| S9 | **Publisher OAuth health** (added 30 Apr v2.1) | Sample query for YT: `SELECT COUNT(*) FROM m.post_draft WHERE created_at > NOW() - INTERVAL '7 days' AND draft_format ? 'youtube_upload_error'`. Equivalent for IG via `m.post_publish.error::text ILIKE '%OAuth%'` | Any non-zero count of OAuth/token errors in last 7d → OAuth reconnect required |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| T01 | **Phase B +24h observation checkpoint** | P0 | Fri 1 May ~5pm AEST / 03:48 UTC | chat | Run the 4 obs SQL queries from the Phase B run state file (deploy_timestamp already substituted) via Supabase MCP | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) (queries verbatim) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May (gated on T01 result) | PK + chat | Read T01 result; if clean apply decision rule (exit on schedule); if not, choose between extend Gate B 5–7 days OR disable image_quote at format-mix layer | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only; cap resets automatically | calendar |
| T04 | **R01 calibration session** | P1 | Sun 3 May or Mon 4 May (after Gate B exit known) | PK + chat | 90min hard cap. ChatGPT first | [proposal w/ pilot decision](runtime/structured_red_team_review_v1_proposal.md) |
| T05 | **Meta business verification failed** + **PP IG block recovery** | P1 | ASAP — pre-weekend ideally | PK | PK contacts Meta dev support per `docs/05_risks.md` Risk 1 + Risk 3. **Now scoped to also include: PP IG `subcode 2207051` block recovery in same conversation.** Phase 1.6 deliverable | [docs/05_risks.md](05_risks.md), [operational audit run](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |
| **T06** | **Reconnect YouTube OAuth** (CORRECTED 30 Apr late evening from "trigger fix" to PK OAuth action per ChatGPT cross-check) | P1 | Within 7 days; YT silent break since 11 Apr | PK | Dashboard action: Clients → Connect → YouTube for each of: **NDIS-Yarns** (`fb98a472`, refresh token expired/revoked), **Property Pulse** (`4036a6b5`, refresh token expired/revoked), **Invegent** (`93494a09`, no refresh token configured). Verification: trigger one `youtube-publisher` invocation manually OR wait for the 30-min cron tick; check `m.post_publish` for new YT row + `m.post_draft.draft_format->>youtube_video_id` populated | [operational audit run](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum |
| **T07** | **Instagram publisher recovery — 6-step sequence** (CORRECTED 30 Apr late evening per ChatGPT cross-check on sequencing) | P1 | Within 7 days (clear 92-item backlog) | chat (steps 1-3, 5) + PK (step 4 + step 6) | (1) chat applies `UPDATE c.client_publish_profile SET publish_enabled=false, paused_reason='meta_subcode_2207051_block_25_apr', paused_at=now() WHERE platform='instagram' AND client_id=PP_id` — single-row data update. (2) chat verifies all 4 IG profiles — only PP shows `publish_enabled=false`. (3) optional: chat manually invokes `instagram-publisher` once with `dry_run=true`; PP rows should return `status='skipped', reason='publish_disabled'`. (4) PK re-enables cron jobid 53 via dashboard. (5) chat monitors 30-60 min for NDIS+CFW+Invegent backlog clearing. (6) PK schedules PP recovery via T05 conversation with Meta dev support | [operational audit run](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrected sequence |

---

## 🟡 Active (in flight right now)

| ID | Item | Priority | Status | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| F04→Active | **post_render_log column-purposes** (16 cols on `m.post_render_log`) | P2 | brief authored + queue ready | chat (authored) → CC (drafts) → chat (applies) | Awaiting CC pre-flight + migration draft + push (likely overnight). Single table, smallest brief of the run. Strict JSONB rule applies to `render_spec` (image-worker / video-worker EF source must be cited) | [brief](briefs/post-render-log-column-purposes.md) (commit `24fb53d7`); [queue](briefs/queue.md) |

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
| ~~R01~~ | ~~Decide on `structured_red_team_review_v1` pilot~~ | — | — | — | **DECIDED 30 Apr.** | [proposal](runtime/structured_red_team_review_v1_proposal.md) (commit `4d6a0fba`) |
| ~~R02~~ | ~~Author audit Slice 2 brief~~ | — | — | — | **CLOSED 2026-04-30 17:30 Sydney.** | — |
| ~~R03~~ | ~~Manual ChatGPT cycle 2 audit pass~~ | — | — | — | **CLOSED 2026-04-30 evening (commit `bbfc4944`).** | — |
| ~~R05~~ | ~~Operator-alerting trio brief~~ | — | — | — | **CLOSED 2026-04-30.** | — |
| ~~R06~~ | ~~Pipeline-health pair brief~~ | — | — | — | **CLOSED 2026-04-30.** | — |
| R07 | Update `invegent-dashboard` roadmap milestone | P3 | chat | 10min | PK 30 Apr afternoon: explicitly delayed. Will reflect ~42% m schema once F04 lands; bundle into single dashboard update | standing rule entry 11 |
| R08 | **Meta App Review status check** | P1 | PK | 5min | **OVERLAPS WITH T05 + T07 step 6** — same Meta dev support conversation | userMemories entry 4 |
| R09 | **Author reconciliation v2 brief** | P1 | PK + chat | 30-45min brief authorship + ~45-60min implementation later | After T01 + T02 + personal businesses check | [spec capture](briefs/reconciliation-v2-spec.md) (commit `5837342`) |
| R10 | **Phase C cutover live pilot — apply red-team review** | P1 | PK + ChatGPT (red-team) + chat | ~30min added to Phase C cutover review | When Phase C cutover brief is drafted | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| R11 | **Cycle 3 audit run** | P3 | chat (snapshot) + ChatGPT (auditor) | 5min snapshot + 30min audit + closure session | Run the refreshed brief on a future day; ChatGPT validates the brief refresh | D181 manual loop |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| D-01 | Adopt `structured_red_team_review_v1` as standing rule? | P1 | **Strong evidence emerging:** today's ChatGPT cross-check on the publisher operational audit caught a wrong production migration before it landed (T06 "trigger fix" was wrong; real fix is OAuth reconnect). This is non-Phase-C evidence that the structured red-team pattern delivers value. Captured for D185 ratification consideration. | After Phase C pilot (R10) completes, evaluate. | [proposal w/ pilot decision](runtime/structured_red_team_review_v1_proposal.md), [D185 reservation](06_decisions.md) |
| ~~D-02~~ | ~~When to invest the 90min red-team calibration slot~~ | — | — | **RESOLVED 30 Apr.** | — |
| ~~D-03~~ | ~~Which agent runs the red-team review~~ | — | — | **RESOLVED 30 Apr.** | — |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content | PK decides | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over from morning sync_state | PK confirms | morning sync_state |
| ~~D-06~~ | ~~YouTube enqueue architecture intent~~ | — | — | **RESOLVED 30 Apr late evening:** YT goes via separate path `slot → ai_job → video-worker/heygen-worker → post_draft.video_url → youtube-publisher` (reads `m.post_draft` directly, NOT `m.post_publish_queue`). Trigger exclusion is correct architecture. T06 reframed to OAuth reconnect. | [operational audit run](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum |
| D-07 | **Property Pulse IG specific recovery path** | P1 | Per-IG-account anti-spam block. The toggle field is `c.client_publish_profile.publish_enabled` (verified by reading IG publisher EF v2.0.0 source). | T07 step 6: PK contacts Meta dev support in T05 conversation; recovery path determined by Meta response | [operational audit run](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |

---

## 📌 Backlog (known, not prioritised yet — awaits trigger)

> Backlog items don't have a Next action column because the next action is "wait for the trigger to fire". When a trigger fires, the item moves to Ready and gains a Next action.

| ID | Item | Priority | Trigger to promote to Ready | Source |
|---|---|---|---|---|
| B01 | 9 LOW-confidence column rows joint session (3 post-publish + 6 F-002 P1/P2/P3) | P2 | Joint operator+chat session scheduled | [post-publish followup](audit/decisions/post_publish_observability_low_confidence_followup.md) |
| B02 | 27 Apr fill-pending-slots constraint race investigation | P2 | Before Phase C cutover begins | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B03 | Provider diversification on retry | P2 | After +24h obs window confirms body-health filter held alone | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B04 | Stub-content classifier improvements | P3 | When upstream classifier work resumes | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B05 | 27 Apr cron infrastructure pause investigation | P3 | Only if pattern recurs during a future migration burst | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B06 | Branch hygiene sweep (10 stale branches across 3 repos) | P3 | Session prep window | [morning sync_state](00_sync_state.md) |
| B07 | Phase B filename hygiene rename | P3 | Cosmetic | [morning sync_state](00_sync_state.md) |
| B08 | CC Phase C final report file (Tier 0 doc generation) | P3 | When Phase C cutover planning begins | [morning sync_state](00_sync_state.md) |
| B09 | Pre-sales: A11b prompts ×18 rows + A4→A3 proof doc + A18 source-less EFs audit + A6 subscription costs | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B10 | YouTube channel ingest activation | P2 | When YouTube layer earns build (per D183) | [docs/briefs/2026-04-08-youtube-channel-ingest.md](briefs/2026-04-08-youtube-channel-ingest.md) |
| B11 | Manual newsletter subscription setup for `feeds@invegent.com` | P3 | When PK has 30min for subscription form-filling | userMemories entry 8 |
| B12 | Nightly pipeline health Cowork task | P2 | Trigger met today; awaits bandwidth | userMemories entry 23 |
| B13 | Telegram channels + `claude rc` Remote Control + Opus 4.6 1M context integration | P3 | When useful trigger emerges | userMemories entry 23 |
| B14 | `docs/15_pre_post_sales_criteria.md` classification of 38 audit items | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B15 | Phase E — Invegent vertical signal weighting | P2 | After thin-pool decision (D-04) is made | userMemories entry 29, D174 |
| B16 | Red-team review v1 — ratification call (proposal → standing rule) | P1 | After R10 (Phase C cutover live pilot) completes; D185 reserved | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| ~~B17~~ | ~~`m.cron_health_snapshot.latest_run_status` purpose polish~~ | — | — | **CLOSED 2026-04-30 evening.** |
| ~~B18~~ | ~~`docs/06_decisions.md` numbering reconciliation~~ | — | — | **CLOSED 2026-04-30 evening (commit `5775929f`).** |
| B19 | Add `idx_slot_filled_draft_id` on `m.slot` | P3 | `m.slot.n_live_tup > 5000` (currently 159) OR EXPLAIN-evidenced seq scan with measurable cost. Standing check S7 | F-2026-04-30-D-002 closure |
| B20 | m-schema column-purpose continuation — medium-sized tables (between F04's 16 cols and F08's 100+) | P2 | After F04 lands. 412 m-schema columns still missing purpose | userMemories "On the horizon" item 5 |
| **B21** | **Audit heygen/video-worker output for stranded YT slots** (TRIGGER UPDATED) | P2 | After T06 (PK reconnects YT OAuth) AND a successful upload completes (verified by `draft_format->>youtube_video_id` populated and `m.post_publish` row written) — NOT after a trigger migration. Quantify whether the 18 already-rendered + already-attempted drafts can simply be reset to `video_status='generated'` for the publisher to retry, plus assess sunk cost on the 16 still-pending drafts | [operational audit run](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

These are **intentionally** deferred with documented triggers. Do not promote to Ready unless the trigger fires.

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor (OpenAI reads snapshot, writes findings) | Manual cycle 5+ per D181 (currently cycle 2 done; cycle 3 ready as R11) | D181, D184 |
| ~~F04~~ | ~~`m.post_render_log` (16 cols)~~ | — | **PROMOTED to Active 2026-04-30 17:10.** |
| F05 | D156 (deferred to 27 Apr per the original ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) | LinkedIn Community Management API approval — evaluate Late.dev if unresolved by 13 May 2026 | userMemories entry 2 |
| F07 | Grok red-team agent evaluation | Only if T04 ChatGPT calibration is noisy | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| F08 | Large m-schema tables column-purpose work (m.post_draft 100+ cols, m.post_seed, etc.) | After F04 + B20 complete AND a coherent brief shape designed for tables of this size | After today's 5-brief sweep |

---

## Update protocol

This file's accuracy depends on disciplined updates. The rules:

1. **At session start (chat reads first):**
   - Rebuild the Today / Next 5 view
   - Run 🔄 Standing checks (S1–S9)
   - Surface any 🔴 Time-bound items due today or tomorrow
   - Ask PK about 💼 Personal businesses

2. **As work happens (chat updates inline):**
   - Item moves Backlog → Ready when its trigger fires
   - Item moves Ready → Active when work starts
   - Item moves Active → (removed) when done

3. **At session end (chat reconciles):**
   - Verify nothing in Active was missed
   - Move any new follow-ups into Backlog
   - Update Last updated timestamp
   - Sync with `docs/00_sync_state.md`

4. **Removal vs done:**
   - Done items removed from this file; audit trail in commit messages, run state files, decisions log

5. **No silent additions:**
   - Every new item references its source

6. **Standing rule extension** (memory entry 11 four-way sync):
   - docs/00_sync_state.md
   - docs/06_decisions.md
   - invegent-dashboard roadmap page.tsx
   - **docs/00_action_list.md (this file)**

---

## v2.1 honest limitations

- **Personal businesses section is empty** — chat asks PK at every session open; populated by PK
- **Standing checks not yet automated** — S1-S9 manual until a session-start preamble script earns build
- **Today / Next 5 is human-curated each session**
- **Reconciliation v2 not yet implemented** — R09 captures the work
- **Two-step graduation for red-team review v1** — calibration → pilot → standing rule. D185 reserved.
- **Tier 1 column-purpose pattern at 5× today** — F04 makes 6×. B20 captures medium-tables continuation.
- **Meta business verification + PP IG block** — T05 now scoped to both; PK contacts Meta dev support for both.
- **Brief-author bug discipline** — schema-drift fallback rule is residual safety only.
- **Lesson #32 reminder during B17** — pre-flight every directly-touched table via `k.vw_table_summary`.
- **R03 cycle 2 audit closure pattern** — verify each finding against live MCP before deciding action. Captured candidate Lessons #41 + #42.
- **Publisher operational audit (v2.0)** — PK's ad-hoc audit surfaced two production issues; standing check S8 added. Operations Auditor role gap captured.
- **ChatGPT cross-check halted wrong YT migration (v2.1)** — chat's first-pass framing of T06 was "add YT to enqueue trigger whitelist" (wrong). ChatGPT pulled the R6 spec evidence ("No YouTube in R6 v1") that chat had access to but didn't surface, then proposed an architecture pre-check. Pre-check via the EF source (`youtube-publisher` v1.5.0) proved the trigger exclusion was intentional — YT uses `m.post_draft` directly via OAuth-authed API call, not the queue. Real root cause is OAuth refresh-token expiry (12 invalid_grant + 5 expired/revoked + 1 missing for Invegent). T06 reframed to PK dashboard action. Three Lesson candidates captured: **#43** verify EF source-of-truth before assuming pipeline architecture, **#44** distinguish cron-level success from operation-level success when auditing publishers, **#45** treat external red-team pre-check suggestions as mandatory before production DDL. **This is significant operational evidence for D-01 / D185 ratification** — the structured red-team pattern delivered value on a non-Phase-C, non-rehearsed audit, on real production stakes. **Standing check S9 added** (publisher OAuth health) — a 7-day rolling check on `youtube_upload_error` count + IG OAuth error grep — so this class of OAuth-expiry silent break gets caught at session start.

If after 2 weeks this file is consistently stale or PK is still asking "what's next" because the file isn't being read, the experiment failed. Falsifiable.

---

## Changelog

- **v1.0–v1.6** (30 Apr Thu evening through 30 Apr Fri afternoon): initial creation through R02 brief queued; T05 added.
- **v1.7** (30 Apr Fri evening, 17:35 Sydney): R02 closed; D182 v1 validated across 2 brief shapes.
- **v1.8** (30 Apr Fri evening, ~17:55 Sydney): B17 + B18 closed.
- **v1.9** (30 Apr Fri evening, ~18:35 Sydney): R03 cycle 2 audit closed; B19 + S7 added; R11 captured.
- **v2.0** (30 Apr Fri late evening, ~21:15 Sydney): publisher operational audit committed; T06 + T07 + D-06 + D-07 + B20 + B21 + S8 added.
- **v2.1** (30 Apr Fri late evening, ~22:30 Sydney): **ChatGPT cross-check halted wrong YT trigger fix.** T06 reframed from "trigger migration" to "PK reconnects YT OAuth via dashboard" — real root cause is OAuth refresh-token expiry, not a missing trigger entry. T07 reframed with explicit 6-step sequence (PP IG `publish_enabled=false` BEFORE re-enabling cron). D-06 resolved (YT uses separate path via `m.post_draft`, NOT the queue). D-07 narrowed to PP-specific recovery via T05. B21 trigger condition updated. F-PUB-001 corrigendum committed in operational audit run. Standing check **S9** added (publisher OAuth health — catches OAuth-expiry silent breaks at session start). Three Lesson candidates raised (**#43** verify EF source-of-truth, **#44** cron-level vs operation-level success, **#45** treat external red-team pre-check as mandatory). T05 scope expanded to also include PP IG block recovery via the same Meta dev support contact. Today/Next 5 rebuilt with corrected T06 + T07 framing.
