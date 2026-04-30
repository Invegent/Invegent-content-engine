# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-04-30 Friday late evening Sydney (v2.2 — T07 steps 1+2 done; PP IG `publish_enabled=false` applied at 12:02:25 UTC; OTL — Operational Truth Layer captured as strategic work stream per ChatGPT's structural framing; canonical Lesson #46 promoted: "cron health ≠ system health").

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
> **Last rebuilt:** 2026-04-30 Friday late evening Sydney (post T07 step 1+2 apply + OTL capture).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (per standing rule entry 19) | ICE is bonus, not driver — personal comes first | Cleared at session open — PK confirmed nothing live in CFW / Property / NDIS FBA today; reconfirm next session |
| 2 | **T07 step 4 — PK re-enables IG cron jobid 53** | P1 | PP IG explicitly disabled at chat layer (step 1 done at 12:02:25 UTC; step 2 verified all 4 profiles). Other 3 clients now safe to resume | PK action via Supabase dashboard: cron.job → jobid 53 instagram-publisher-every-15m → set active=true. Throttle math: 2 posts/day × 3 active clients = max 6 IG posts/24h. 39-row safe backlog clears over ~7 days |
| 3 | **T06 — Reconnect YouTube OAuth** | P1 | YT broken since 11 Apr (OAuth refresh tokens expired). 19 stranded slots; 18 already-rendered drafts retriable post-reconnect | PK action via dashboard: Clients → Connect → YouTube for NDIS-Yarns + Property Pulse + Invegent |
| 4 | Phase B +24h observation checkpoint | P0 | Due Fri 1 May ~5pm AEST / 03:48 UTC (24h after deploy) | Run the 4 obs SQL queries from the Phase B run state file via Supabase MCP |
| 5 | **O-01 — Author Platform-Source-of-Truth map** (NEW from OTL framing) | P1 | Tonight's audit proved cron-level monitoring missed 3+ weeks of YT silent break + 5+ days of IG backlog. Source-of-truth doc is the most enabling piece of OTL — every other OTL item references it | Author `docs/operations/platform_source_of_truth.md` with one row per platform: source table, queue path (or N/A), publisher EF, success marker, failure marker, token location, recovery owner. ~30min effort. Tomorrow's session, not tonight |

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
| S7 | B19 trigger check | `SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname='m' AND relname='slot'` | n_live_tup > 5000 → promote B19 to Ready |
| S8 | Publisher cron health | Verify all expected platform publishers `cron.job.active=true` AND last_success < 1h: jobid 7/34/53/54/55 | Any unexpected `active=false` OR last_success > 1h → investigate |
| S9 | Publisher OAuth health | YT: count of `m.post_draft` with `draft_format ? 'youtube_upload_error'` last 7d. IG: count of `m.post_publish.error::text ILIKE '%OAuth%'` last 7d | Any non-zero count → OAuth reconnect required |
| **S10 (new)** | **Business-outcome publish check** (per OTL framing — promotes O-03) | `SELECT platform, COUNT(*) FROM m.post_publish WHERE created_at > NOW() - INTERVAL '24 hours' AND status='published' GROUP BY platform` | Any expected-publishing platform with 0 rows in 24h → investigate. Currently expected: facebook, instagram (post-T07 step 4), linkedin, youtube (post-T06), website |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| T01 | **Phase B +24h observation checkpoint** | P0 | Fri 1 May ~5pm AEST / 03:48 UTC | chat | Run the 4 obs SQL queries from the Phase B run state file via Supabase MCP | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May (gated on T01 result) | PK + chat | Read T01 result; apply decision rule | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only | calendar |
| T04 | **R01 calibration session** | P1 | Sun 3 May or Mon 4 May | PK + chat | 90min hard cap. ChatGPT first | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| T05 | **Meta business verification + PP IG block recovery** | P1 | ASAP — pre-weekend ideally | PK | PK contacts Meta dev support — covers business verification + PP IG `subcode 2207051` block + Meta App Review status (R08) in same conversation | [docs/05_risks.md](05_risks.md), [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |
| T06 | **Reconnect YouTube OAuth** | P1 | Within 7 days | PK | Dashboard action: Clients → Connect → YouTube for NDIS-Yarns + Property Pulse + Invegent. Verification via 30-min cron tick | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum |
| T07 | **Instagram publisher recovery — 6-step sequence** | P1 | Within 7 days | mixed | **Step 1 ✅ DONE 2026-04-30 12:02:25 UTC** — `publish_enabled=false` applied to PP IG via single-row UPDATE; `paused_reason='meta_subcode_2207051_block_25_apr_pp_ig_anti_spam'`. **Step 2 ✅ DONE** — verified all 4 IG profiles: only PP shows `publish_enabled=false`. **Step 3** (optional `dry_run=true` invocation) skipped — IG publisher v2.0.0 source already proves `publish_enabled` is honored. **Step 4 — PK action**: re-enable cron jobid 53 via Supabase dashboard. **Step 5** — chat monitors 30-60min after step 4. **Step 6** — PK PP recovery via T05 Meta dev support contact | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |

---

## 🟡 Active (in flight right now)

| ID | Item | Priority | Status | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| F04→Active | **post_render_log column-purposes** (16 cols on `m.post_render_log`) | P2 | brief authored + queue ready | chat (authored) → CC (drafts) → chat (applies) | Awaiting CC pre-flight + migration draft + push (likely overnight) | [brief](briefs/post-render-log-column-purposes.md) |

---

## 💼 Personal businesses (PK confirms at session start)

Per standing memory rule (entry 19): PK personal businesses come first. ICE is bonus, not driver. **Chat asks PK at session start if anything is live; PK populates this section as needed.**

| ID | Item | Priority | Trigger | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| *(none flagged this session)* | | | | | | |

---

## 🏗 Operational Truth Layer (NEW strategic stream — captured 30 Apr v2.2)

> Tonight's publisher audit proved ICE has been operating with cron-layer monitoring while business-layer truth was unmonitored. ChatGPT's structural framing nailed it: **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."**
>
> This section is the design surface for what an Operations Auditor role would canonically inspect (analogous to the Data Auditor role under D181). The 6 items below are scoped, ordered by enabling-power, and each has a concrete first-action.

| ID | Item | Priority | Owner | First action | Notes |
|---|---|---|---|---|---|
| **O-01** | **Platform-source-of-truth map** | P1 | chat | Author `docs/operations/platform_source_of_truth.md` with one row per platform. Columns: source table (e.g. `m.post_publish_queue` for IG, `m.post_draft` for YT), queue path (or "direct"), publisher EF + version, success marker (e.g. `m.post_publish.status='published'`), failure marker (e.g. `m.post_draft.draft_format->>'youtube_upload_error'`), token location (e.g. `c.client_channel.config->>'refresh_token'` for YT), recovery owner | Most enabling piece. Every other OTL item references this map |
| **O-02** | **Per-client/platform circuit breakers** | P2 | chat + PK | Step 1: audit each publisher EF for whether it honors `publish_enabled` (IG v2.0.0 confirmed; FB/LI/YT pending). Step 2: design auto-trip on N consecutive failures (e.g. 3 OAuth failures in 24h → auto-set `publish_enabled=false` + write to `paused_reason`). Step 3: alert via existing notifier path | PP IG today proved the manual circuit breaker pattern works; auto-trip is the natural extension |
| **O-03** | **Business-outcome monitors** (NOT cron monitors) | P1 | chat | Author `m.fn_business_outcome_health()` returning per-platform: posts_published_24h, queue_rows_aged_gt_1h, oauth_errors_7d, drafts_stuck_in_failed. Initially manual via Supabase MCP per S10 standing check; later cron + Resend alert when thresholds breached | S10 added today as the manual version of this. Promote to function + alerts when bandwidth allows |
| **O-04** | **Pre-DDL verification gate** (formal checklist) | P2 | chat | Append to `docs/audit/decisions/migration_naming_discipline.md` (or new doc) the pre-DDL discipline: (1) identify which code path consumes the table/column being changed; (2) read the consumer's source; (3) verify the change won't orphan or duplicate work; (4) for trigger changes specifically — confirm whether the consumer reads via the trigger output | Today's wrong-pass YT trigger fix would have been caught by step 2. Formalizes Lesson #43 + #45 into a checklist |
| **O-05** | **External-account health checks** (daily matrix) | P1 | chat | Build `m.vw_external_account_health` view: per (client, platform): token_state (valid/expired/missing), last_publish_attempt_at, last_publish_success_at, anti_spam_flag_state, days_since_last_success. Surface in dashboard | Closely parallels S9 standing check but expanded. The IG `subcode 2207051` flag would have been visible 24h before T07's surface-time |
| **O-06** | **Recovery playbooks by failure class** | P2 | chat | Author `docs/operations/recovery_playbooks.md` starting with the 3 we just hit: (1) OAuth token expired → reconnect via dashboard → reset `video_status='failed'→'generated'` for retriable drafts. (2) Meta anti-spam block on single account → `publish_enabled=false` + Meta dev support + cooldown. (3) Audit trail broken → verify external publish state before replaying | Each playbook is short — a 5-step recovery checklist. Adds new entries as new failure classes appear |

---

## 🟢 Ready / Strategic (next-session candidates)

| ID | Item | Priority | Owner | Estimated time | Next action | Source |
|---|---|---|---|---|---|---|
| ~~R01~~ | ~~Decide on `structured_red_team_review_v1` pilot~~ | — | — | — | **DECIDED 30 Apr.** | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| ~~R02~~ | ~~Author audit Slice 2 brief~~ | — | — | — | **CLOSED 2026-04-30 17:30 Sydney.** | — |
| ~~R03~~ | ~~Manual ChatGPT cycle 2 audit pass~~ | — | — | — | **CLOSED 2026-04-30 evening (commit `bbfc4944`).** | — |
| ~~R05~~ | ~~Operator-alerting trio brief~~ | — | — | — | **CLOSED 2026-04-30.** | — |
| ~~R06~~ | ~~Pipeline-health pair brief~~ | — | — | — | **CLOSED 2026-04-30.** | — |
| R07 | Update `invegent-dashboard` roadmap milestone | P3 | chat | 10min | Bundle into single dashboard update covering today's full ~9.2→42% sweep | standing rule entry 11 |
| R08 | **Meta App Review status check** | P1 | PK | 5min | **OVERLAPS WITH T05 + T07 step 6** — same Meta dev support conversation | userMemories entry 4 |
| R09 | **Author reconciliation v2 brief** | P1 | PK + chat | 30-45min brief authorship | After T01 + T02 + personal businesses check | [spec capture](briefs/reconciliation-v2-spec.md) |
| R10 | **Phase C cutover live pilot — apply red-team review** | P1 | PK + ChatGPT (red-team) + chat | ~30min added to Phase C cutover review | When Phase C cutover brief is drafted | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| R11 | **Cycle 3 audit run** | P3 | chat (snapshot) + ChatGPT (auditor) | 5min + 30min + closure | Run the refreshed brief on a future day | D181 manual loop |
| **R12** | **Define Operations Auditor role** (after OTL items in place) | P1 | chat | When O-01 + O-03 + O-05 are authored — define `docs/audit/roles/operations_auditor.md` with scope = the OTL inspection points. Analogous to `data_auditor.md` per D181 | Tonight's PK feedback explicitly called for this. Captured as the eventual role definition that the OTL items make possible |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| D-01 | Adopt `structured_red_team_review_v1` as standing rule? | P1 | **Strong evidence emerging:** today's ChatGPT cross-check on the publisher operational audit caught a wrong production migration before it landed. Non-Phase-C, real-stakes, high-value catch. Captured for D185 ratification consideration. | After Phase C pilot (R10) completes, evaluate | [proposal](runtime/structured_red_team_review_v1_proposal.md), [D185 reservation](06_decisions.md) |
| ~~D-02~~ | ~~When to invest the 90min red-team calibration slot~~ | — | — | **RESOLVED 30 Apr.** | — |
| ~~D-03~~ | ~~Which agent runs the red-team review~~ | — | — | **RESOLVED 30 Apr.** | — |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content | PK decides | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over | PK confirms | morning sync_state |
| ~~D-06~~ | ~~YouTube enqueue architecture intent~~ | — | — | **RESOLVED 30 Apr late evening.** | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum |
| D-07 | **Property Pulse IG specific recovery path** | P1 | T07 step 1+2 done at chat layer; step 4 awaits PK; step 6 awaits Meta dev support contact via T05 | Per T05 Meta conversation outcome | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |

---

## 📌 Backlog (known, not prioritised yet — awaits trigger)

| ID | Item | Priority | Trigger to promote to Ready | Source |
|---|---|---|---|---|
| B01 | 9 LOW-confidence column rows joint session | P2 | Joint operator+chat session scheduled | [post-publish followup](audit/decisions/post_publish_observability_low_confidence_followup.md) |
| B02 | 27 Apr fill-pending-slots constraint race investigation | P2 | Before Phase C cutover begins | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B03 | Provider diversification on retry | P2 | After +24h obs window confirms body-health filter held alone | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B04 | Stub-content classifier improvements | P3 | When upstream classifier work resumes | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B05 | 27 Apr cron infrastructure pause investigation | P3 | Only if pattern recurs during a future migration burst | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B06 | Branch hygiene sweep (10 stale branches across 3 repos) | P3 | Session prep window | [morning sync_state](00_sync_state.md) |
| B07 | Phase B filename hygiene rename | P3 | Cosmetic | [morning sync_state](00_sync_state.md) |
| B08 | CC Phase C final report file (Tier 0 doc generation) | P3 | When Phase C cutover planning begins | [morning sync_state](00_sync_state.md) |
| B09 | Pre-sales: A11b + A4→A3 + A18 + A6 | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B10 | YouTube channel ingest activation | P2 | When YouTube layer earns build (per D183) | [docs/briefs/2026-04-08-youtube-channel-ingest.md](briefs/2026-04-08-youtube-channel-ingest.md) |
| B11 | Manual newsletter subscription setup | P3 | When PK has 30min | userMemories entry 8 |
| B12 | Nightly pipeline health Cowork task | P2 | Trigger met today; awaits bandwidth | userMemories entry 23 |
| B13 | Telegram channels + `claude rc` Remote Control + Opus 4.6 1M context | P3 | When useful trigger emerges | userMemories entry 23 |
| B14 | `docs/15_pre_post_sales_criteria.md` classification | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B15 | Phase E — Invegent vertical signal weighting | P2 | After thin-pool decision (D-04) | userMemories entry 29, D174 |
| B16 | Red-team review v1 — ratification call | P1 | After R10 (Phase C cutover live pilot) | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| ~~B17~~ | ~~`m.cron_health_snapshot.latest_run_status` purpose polish~~ | — | — | **CLOSED 2026-04-30 evening.** |
| ~~B18~~ | ~~`docs/06_decisions.md` numbering reconciliation~~ | — | — | **CLOSED 2026-04-30 evening.** |
| B19 | Add `idx_slot_filled_draft_id` on `m.slot` | P3 | `m.slot.n_live_tup > 5000` (currently 159). Standing check S7 | F-2026-04-30-D-002 closure |
| B20 | m-schema column-purpose continuation — medium tables | P2 | After F04 lands | userMemories "On the horizon" item 5 |
| B21 | Audit heygen/video-worker output for stranded YT slots | P2 | After T06 (PK reconnects YT OAuth) AND a successful upload completes — quantify whether 18 already-rendered drafts can be reset to `video_status='generated'` for retry | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor | Manual cycle 5+ per D181 | D181, D184 |
| ~~F04~~ | ~~`m.post_render_log` (16 cols)~~ | — | **PROMOTED to Active 2026-04-30.** |
| F05 | D156 (deferred per ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) | LinkedIn Community Management API approval / Late.dev evaluation 13 May | userMemories entry 2 |
| F07 | Grok red-team agent evaluation | Only if T04 ChatGPT calibration is noisy | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| F08 | Large m-schema tables column-purpose work | After F04 + B20 complete AND a coherent brief shape designed for tables of this size | After today's 5-brief sweep |

---

## 🎓 Canonical Lessons (promoted from candidates this session)

> When a candidate Lesson hits the same pattern twice OR is captured in a written framing that's clearly worth preserving, it gets promoted here as canonical. Candidate Lessons live in run-state files and `docs/audit/open_findings.md` until promoted.

- **Lesson #46 (PROMOTED 30 Apr v2.2 from PK + ChatGPT framing)** — **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."**
  - Operationalized as: standing checks S8 (cron-level), S9 (OAuth/token-level), S10 (business-outcome-level) all distinct.
  - Operationalized as: OTL stream O-01 through O-06 (Operational Truth Layer).
  - Operationalized as: pre-DDL verification gate (O-04) requires reading the consumer's source before changing the producer.
  - This Lesson supersedes candidates #43 (verify EF source), #44 (cron-level vs operation-level success), #45 (treat external red-team pre-checks as mandatory) — those become specific applications of #46.

---

## Update protocol

This file's accuracy depends on disciplined updates. The rules:

1. **At session start (chat reads first):**
   - Rebuild the Today / Next 5 view
   - Run 🔄 Standing checks (S1–S10)
   - Surface any 🔴 Time-bound items due today or tomorrow
   - Ask PK about 💼 Personal businesses

2. **As work happens (chat updates inline):**
   - Item moves Backlog → Ready when its trigger fires
   - Item moves Ready → Active when work starts
   - Item moves Active → (removed) when done

3. **At session end (chat reconciles):**
   - Verify nothing in Active was missed
   - Move any new follow-ups into Backlog or OTL
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

## v2.2 honest limitations

- **Personal businesses section is empty** — chat asks PK at every session open; populated by PK
- **Standing checks not yet automated** — S1-S10 manual until a session-start preamble script earns build
- **Today / Next 5 is human-curated each session**
- **Reconciliation v2 not yet implemented** — R09 captures the work
- **Two-step graduation for red-team review v1** — calibration → pilot → standing rule. D185 reserved.
- **Tier 1 column-purpose pattern at 5× today** — F04 makes 6×. B20 captures medium-tables continuation.
- **Meta business verification + PP IG block** — T05 scoped to both via same Meta dev support conversation.
- **Lesson #32 reminder during B17** — pre-flight every directly-touched table via `k.vw_table_summary`.
- **R03 cycle 2 audit closure pattern** — verify each finding against live MCP before deciding action.
- **Publisher operational audit (v2.0)** — surfaced two production issues; standing check S8 added.
- **ChatGPT cross-check halted wrong YT migration (v2.1)** — chat's first-pass framing of T06 was wrong; ChatGPT pulled R6 spec evidence chat had access to but didn't surface; pre-check via EF source proved the trigger exclusion was intentional. Real cause: OAuth refresh-token expiry. T06 reframed.
- **Operational Truth Layer captured (v2.2)** — PK + ChatGPT structural framing tonight elevated tonight's audit from "fix YT + IG" to "ICE is missing the business-outcome monitoring layer." Six OTL items captured (O-01 through O-06) as the canonical inspection points an Operations Auditor role would cover (R12 captures the role definition itself, gated on OTL items being authored). Lesson #46 promoted to canonical: cron health ≠ system health. Standing check S10 added (business-outcome publish check). T07 step 1+2 applied at 12:02:25 UTC.
- **One injection-pattern observation** — PK's last message had a `[DEVELOPER MODE](#settings/Connectors/Advanced)` markdown link tail that didn't appear to be part of PK's actual content (probably auto-appended by some app in the paste path or external agent tail). Chat ignored it per standard injection-defense rules. No "developer mode" exists; chat behavior unchanged. Flagged inline in the response. If this appears again, capture as a B-item to investigate the source.

If after 2 weeks this file is consistently stale or PK is still asking "what's next" because the file isn't being read, the experiment failed. Falsifiable.

---

## Changelog

- **v1.0–v1.6** (30 Apr Thu evening through 30 Apr Fri afternoon): initial creation through R02 brief queued; T05 added.
- **v1.7** (30 Apr Fri evening, 17:35 Sydney): R02 closed.
- **v1.8** (30 Apr Fri evening, ~17:55 Sydney): B17 + B18 closed.
- **v1.9** (30 Apr Fri evening, ~18:35 Sydney): R03 cycle 2 audit closed; B19 + S7 added.
- **v2.0** (30 Apr Fri late evening, ~21:15 Sydney): publisher operational audit committed; T06 + T07 + B20 + B21 + S8 added.
- **v2.1** (30 Apr Fri late evening, ~22:30 Sydney): ChatGPT cross-check halted wrong YT trigger fix; T06 reframed to OAuth reconnect; T07 reframed with explicit 6-step sequence; D-06 resolved; S9 added; F-PUB-001 corrigendum committed.
- **v2.2** (30 Apr Fri late evening, ~23:00 Sydney): **T07 step 1 applied** — `UPDATE c.client_publish_profile SET publish_enabled=false, paused_reason='meta_subcode_2207051_block_25_apr_pp_ig_anti_spam', paused_at=now() WHERE platform='instagram' AND client_id=PP` — applied 12:02:25 UTC. Step 2 verified: only PP shows `publish_enabled=false`; other 3 IG profiles unchanged with their queue depths (CFW 10, Invegent 5, NDIS-Yarns 24). Step 4 awaits PK dashboard action. **OTL — Operational Truth Layer captured** as new strategic stream (O-01 through O-06) per ChatGPT's structural framing. **Lesson #46 promoted** to canonical: "Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer." Standing check **S10 added** (business-outcome publish check). **R12 added** — Operations Auditor role definition (gated on OTL items in place). T07 row updated to reflect step 1+2 done. Today/Next 5 rebuilt: T07 step 4 (PK action) at rank 2; T06 OAuth reconnect at rank 3; T01 obs at rank 4; O-01 source-of-truth map authoring at rank 5 for tomorrow. Honest-limitations entry captures the developer-mode injection-pattern observation in PK's pasted message tail; ignored per standard injection-defense rules.
