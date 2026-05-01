# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-05-01 Friday evening Sydney (v2.4 — ChatGPT red-team review of v2.3 caught 7 structural gaps; integrated mid-session via Path A: **T09 P0** safe-to-resume publisher checklist, **T10 P0** quarantine/review pre-T08 queue rows, **T11 P1** YouTube failed-draft replay plan, **O-07/O-08/O-09 P1** OTL additions, **R13 P2** publisher incident postmortem. Acceptance criteria baked into T05/T06/T07/T08. Sequencing change: T09 + T10 must be authored alongside T08 *before* any T07 cron retry).

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
> **Last rebuilt:** 2026-05-01 Friday evening Sydney after Path A red-team integration.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (per standing rule entry 19) | ICE is bonus, not driver — personal comes first | Cleared at session open — PK confirmed nothing live in CFW / Property / NDIS FBA today; reconfirm next session |
| 2 | **T08 — Author auto-approver patch (F-PUB-004)** | P0 | Largest production breakage; LinkedIn 64-draft buffer will dry up; no IG re-enable possible until this lands | Chat authors TypeScript patch tonight (D-08 scope first); ChatGPT cross-check per Lesson #45; PK deploys via Supabase EF dashboard |
| 3 | **T09 — Author safe-to-resume publisher checklist** (NEW v2.4) | P0 | Tonight's T07 step 4 misstep came from sequence ambiguity. A standalone, reusable checklist prevents repeat across every platform | Chat authors `docs/operations/safe_to_resume_publisher.md` in parallel with T08 |
| 4 | **T10 — Quarantine/review pre-T08 queue rows** (NEW v2.4) | P0 | T08 fixes go-forward; T10 disposes pre-existing bad rows. Two populations: F-PUB-005 IG queue rows + 30 cycling drafts | Chat authors disposition queries + decision tree; PK applies post-T08 deploy |
| 5 | T02 — Gate B exit decision | P0 | Sat 2 May; T01 +21h obs clean, default exit | Re-check obs delta at full +24h (~03:48 UTC Sat); apply decision rule |

T05 (Meta dev support) and T06 (YT OAuth) remain P1 PK-actions; live in Time-bound table; not on critical path for tonight's chat-authoring work.

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
| S10 | **Business-outcome publish check** (per OTL framing — promotes O-03) | `SELECT platform, COUNT(*) FROM m.post_publish WHERE created_at > NOW() - INTERVAL '24 hours' AND status='published' GROUP BY platform` | Any expected-publishing platform with 0 rows in 24h → investigate |
| **S11** | **Auto-approver business outcome** | `SELECT COUNT(*) FROM m.post_draft WHERE approval_status='approved' AND updated_at > NOW() - INTERVAL '24 hours' GROUP BY platform` | Any platform with 0 fresh approvals in 24h (excluding FB which skips state) → auto-approver may be starving (F-PUB-004 pattern) |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| ~~T01~~ | ~~Phase B +24h observation checkpoint~~ | — | — | — | **DONE 2026-05-01 00:30 UTC at +21h. All 5 targets pass. Zero alerts since deploy.** Run state at `docs/audit/runs/2026-05-01-phase-b-+24h-obs.md`. Watch for +21h→+24h delta tomorrow. | [obs run state](audit/runs/2026-05-01-phase-b-+24h-obs.md) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May | PK + chat | **Default: exit on schedule.** Re-check obs delta at full +24h mark; if any new alerts surface in +21h→+24h, fork to extend or disable image_quote | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) + [+24h obs](audit/runs/2026-05-01-phase-b-+24h-obs.md) |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only | calendar |
| T04 | **R01 calibration session** | P1 | Sun 3 May or Mon 4 May | PK + chat | 90min hard cap. ChatGPT first | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| T05 | **Meta dev support contact** — covers business verification + PP IG block + NDIS-Yarns IG block + App Review status | P1 | ASAP — Mon 4 May at latest | PK | Single Meta dev support conversation. **Done when** = outcome of all four documented in a `docs/audit/runs/` entry; PP and NDIS-Yarns IG have either a clear unblock path with timeline or a final "won't unblock" verdict; App Review status confirmed | [docs/05_risks.md](05_risks.md), [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |
| T06 | **Reconnect YouTube OAuth** | P1 | Within 7 days | PK | Dashboard: Clients → Connect → YouTube for NDIS-Yarns + PP + Invegent. **Done when** = each of 3 clients has valid refresh token; one dry-run token refresh succeeds without `invalid_grant`; one controlled YT upload succeeds end-to-end (gated on T11 replay plan); `m.post_publish` receives an audit row with non-null `platform_post_id` | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum |
| T07 | **Instagram publisher recovery** (steps 1-2 done, step 4 attempted+rolled-back, NDIS-Yarns also locked) | P1 | Gated on T08 + T09 + T10 + T05 | mixed | **Step 1 ✅ DONE 2026-04-30 12:02:25 UTC** — PP IG `publish_enabled=false`. **Step 2 ✅ DONE** — verified other 3 IG profiles. **Step 3 skipped**. **Step 4 ⚠ ATTEMPTED+ROLLED-BACK 2026-05-01 00:00→00:19 UTC** — NDIS-Yarns IG also locked. **REVISED step 4 sequence (per v2.4)**: (a) deploy F-PUB-004 patch via T08; (b) author + walk T09 safe-to-resume checklist; (c) execute T10 disposition on pre-T08 queue rows; (d) wait for fresh CFW or Invegent IG draft to reach `approved` status; (e) revisit cron re-enable with `?limit=1` only after observing fresh approvals. **Done when** = (i) unaffected IG clients (CFW + Invegent) publish successfully via cron; (ii) PP/NDIS-Yarns IG remain not picked up while locked; (iii) `m.post_publish_queue` IG aged-row count trends down; (iv) zero new Meta 403 / subcode 2207051 / 2207027 errors in a 24h observation window | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| **T08** | **Author auto-approver patch (F-PUB-004 fix)** | P0 | This week — blocks all IG/LinkedIn re-enable | chat (authors) → ChatGPT (red-team review per Lesson #45) → PK (deploys) | Two changes to `supabase/functions/auto-approver/index.ts`: (1) **stratify fetch** by (client, platform) — fair-share across buckets instead of pure score-DESC; (2) **add reject-cooldown / terminal state** — skipped drafts move to `'rejected'` (not `'needs_review'`) with `rejection_reason` populated. Per D-08 scope decision, may also include length-cap and keyword-list updates. **Done when** = (i) auto-approver fetches per (client, platform) bucket — verifiable by inspecting fetch SQL output; (ii) skipped drafts move to terminal `'rejected'` with `rejection_reason`; (iii) fresh `'approved'` rows appear across CFW IG + Invegent IG + LinkedIn within 1 cron cycle of deploy; (iv) S11 shows non-zero fresh approvals per platform in 24h | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| **T09 (NEW v2.4)** | **Author safe-to-resume publisher checklist** | P0 | This week — required before any cron flip | chat (authors) → ChatGPT (review) → PK (walks before each cron flip) | Author `docs/operations/safe_to_resume_publisher.md`. Reusable checklist for any publisher cron re-enable: (a) affected client/platform pairs disabled or excluded; (b) only fresh, post-fix approvals are eligible; (c) old queue rows quarantined or reviewed (T10 dependency); (d) dry run passes; (e) S10 + S11 business-outcome checks clean for that platform; (f) rollback command pre-drafted. **Done when** = checklist authored, reviewed by ChatGPT, cited in T07 revised step 4 sequence, walked successfully on T07 IG re-enable | tonight's red-team |
| **T10 (NEW v2.4)** | **Quarantine/review pre-T08 queue rows** | P0 | This week — required before T07 IG retry | chat (authors disposition) → ChatGPT (review) → PK (executes per population) | Author disposition SQL + decision tree. Two distinct populations: **(P-A)** IG queue rows in `m.post_publish_queue` referencing drafts in `approval_status='needs_review'` (created via F-PUB-005 trigger gap) — disposition: mark queue rows terminal, leave drafts alone; **(P-B)** the ~30 score-DESC drafts re-cycling in auto-approver fetch (17 Apr legacy FB stragglers + 25 Apr LinkedIn over-cap) — disposition: explicit operator decision per draft (publish / re-score / skip / mark terminal). 64 pre-25-Apr LinkedIn approved queue rows are NOT in scope (valid pre-starvation approvals; leave alone). **Done when** = both populations have explicit dispositions applied with audit trail; no IG queue row referencing a non-`approved` draft remains; no draft in the cycling-30 set re-enters fetch top-30 post-T08 | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 + F-PUB-005 |
| **T11 (NEW v2.4)** | **YouTube failed-draft replay plan** | P1 | After T06 done | chat (authors) → ChatGPT (review) → PK (executes) | Author replay SQL with strict eligibility filter: only retry drafts where `video_status='failed'` AND `draft_format ? 'youtube_upload_error'` AND `youtube_video_id IS NULL` AND `video_url IS NOT NULL` AND no existing successful `m.post_publish` row for that draft_id. Prevents double-upload and unsafe retry of drafts that failed for non-token reasons. **Done when** = SQL authored + reviewed; on T06 OAuth reconnect, executed against the 18 already-rendered drafts; result audit captured in `docs/audit/runs/` | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |

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

## 🏗 Operational Truth Layer (strategic stream — captured 30 Apr v2.2, validated 1 May, expanded v2.4)

> Tonight's publisher audit + auto-approver investigation proved ICE has been operating with cron-layer monitoring while business-layer truth was unmonitored. ChatGPT's structural framing nailed it: **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."** v2.4 update: ChatGPT red-team identified 3 additional OTL items (O-07 production change packet, O-08 disabled+growing-queue alert, O-09 OAuth lifecycle monitor) — captured below.

| ID | Item | Priority | Owner | First action | Notes |
|---|---|---|---|---|---|
| **O-01** | **Platform-source-of-truth map** | P1 | chat | Author `docs/operations/platform_source_of_truth.md` with one row per platform. Columns: source table, queue path (or "direct"), publisher EF + version, success marker, failure marker, token location, recovery owner | Most enabling piece. Every other OTL item references this map |
| **O-02** | **Per-client/platform circuit breakers** | P2 | chat + PK | Step 1: audit each publisher EF for whether it honors `publish_enabled` (IG v2.0.0 confirmed; FB/LI/YT pending). Step 2: design auto-trip on N consecutive failures. Step 3: alert via existing notifier path | PP+NDIS IG today proved the manual circuit breaker pattern works; auto-trip is the natural extension |
| **O-03** | **Business-outcome monitors** (NOT cron monitors) | P1 | chat | Author `m.fn_business_outcome_health()` returning per-platform: posts_published_24h, queue_rows_aged_gt_1h, oauth_errors_7d, drafts_stuck_in_failed, **fresh_approvals_24h** (added v2.3 per F-PUB-004). Initially manual via S10+S11 standing checks; later cron + Resend alert | S10+S11 added today as the manual version |
| **O-04** | **Pre-DDL verification gate** (formal checklist) | P2 | chat | Append to `docs/audit/decisions/migration_naming_discipline.md` (or new doc) the pre-DDL discipline | Today's wrong-pass YT trigger fix would have been caught |
| **O-05** | **External-account health checks** (daily matrix) | P1 | chat | Build `m.vw_external_account_health` view: per (client, platform): token_state, last_publish_attempt_at, last_publish_success_at, anti_spam_flag_state, days_since_last_success | Closely parallels S9 + S11 standing checks but expanded |
| **O-06** | **Recovery playbooks by failure class** | P2 | chat | Author `docs/operations/recovery_playbooks.md` starting with the 4 we just hit: (1) OAuth token expired; (2) Meta anti-spam block on single account; (3) Audit trail broken; (4) **Auto-approver starvation** | Each playbook is short — a 5-step recovery checklist |
| **O-07 (NEW v2.4)** | **Production change packet** (formal pre-fix discipline) | P1 — tied to D-01 | chat | Author `docs/operations/production_change_packet.md` template. Every production fix must include: hypothesis / source-of-truth code path / exact SQL or code change / dry-run query / rollback command / success metric / red-team check result. If D-01 ratifies `structured_red_team_review_v1`, this is the artifact that operationalises it. If D-01 doesn't ratify, this is the lighter-weight discipline capturing the same intent | Tonight's red-team: practical companion to O-04. Wrong YT trigger fix would have been caught at the "source-of-truth code path" step |
| **O-08 (NEW v2.4)** | **Disabled-publisher-with-growing-queue alert** | P1 | chat | Specific instance of O-03 deserving first-class status. Alert when: (i) cron is disabled AND (ii) queue rows for that platform are increasing OR (iii) oldest queued row exceeds threshold. Catches the F-PUB-005 + cron-disabled interaction directly. Once B23 (F-PUB-005 fix) ships, the trigger-insertion-while-disabled scenario stops, but O-08 still catches other queue-growth-while-disabled scenarios | Net-additive to O-03 |
| **O-09 (NEW v2.4)** | **OAuth/token lifecycle monitor** (proactive) | P1 | chat | Active-alerting layer above O-05's view. Track and alert on: refresh token missing / refresh token revoked / repeated `invalid_grant` / no successful token refresh in N days / connected account lacks required scopes. Turns YouTube-class outages from surprise failures into routine account-health items detected before they break publishing | Proactive complement to S9 (which only sees errors that already occurred) |

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
| R08 | **Meta App Review status check** | P1 | PK | 5min | **OVERLAPS WITH T05** — same Meta dev support conversation | userMemories entry 4 |
| R09 | **Author reconciliation v2 brief** | P1 | PK + chat | 30-45min brief authorship | After T01 + T02 + personal businesses check | [spec capture](briefs/reconciliation-v2-spec.md) |
| R10 | **Phase C cutover live pilot — apply red-team review** | P1 | PK + ChatGPT (red-team) + chat | ~30min added to Phase C cutover review | When Phase C cutover brief is drafted | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| R11 | **Cycle 3 audit run** | P3 | chat (snapshot) + ChatGPT (auditor) | 5min + 30min + closure | Run the refreshed brief on a future day | D181 manual loop |
| R12 | **Define Operations Auditor role** (after OTL items in place) | P1 | chat | When O-01 + O-03 + O-05 are authored — define `docs/audit/roles/operations_auditor.md` | Tonight's PK feedback explicitly called for this |
| **R13 (NEW v2.4)** | **Publisher incident postmortem (1 May near-miss + F-PUB-004 starvation)** | P2 | chat (authors) → PK (review) | 45-60min authorship | Author `docs/audit/postmortems/2026-05-01-publisher-incident.md`. Cover: initial wrong diagnosis (YT trigger fix); red-team correction (cross-check #1); actual source-of-truth architecture (YT reads `m.post_draft` directly); auto-approver starvation discovery; second cross-check (bulk-quarantine averted); third cross-check (this v2.3→v2.4 review); what monitoring missed; permanent guardrails (S10/S11/OTL/T08/T09/T10). Without this, the lesson decays into memory. Strong evidence artifact for D-01 ratification | tonight's red-team |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| D-01 | Adopt `structured_red_team_review_v1` as standing rule? | P1 | **Strong evidence accumulating:** ChatGPT cross-check #1 halted wrong YT trigger fix; cross-check #2 halted bulk-quarantine of legacy FB drafts; **cross-check #3 (tonight) caught 7 structural gaps in v2.3 action_list** (T09, T10, T11, O-07, O-08, O-09, R13). Three real-stakes catches in 24 hours, each catching a different failure mode (wrong code path, wrong destructive action, wrong-by-omission planning). The argument for ratifying NOW (without waiting for R10 Phase C pilot) is meaningfully stronger than 24h ago | Re-evaluate ratification timing — possibly bring forward to next session decision rather than waiting for R10 | [proposal](runtime/structured_red_team_review_v1_proposal.md), [D185 reservation](06_decisions.md) |
| ~~D-02, D-03, D-06~~ | — | — | — | **All resolved 30 Apr.** | — |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content | PK decides | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over | PK confirms | morning sync_state |
| D-07 | **Property Pulse + NDIS-Yarns IG specific recovery path** (now both clients) | P1 | T07 step 4 attempt confirmed both PP and NDIS-Yarns are flagged. Recovery via T05 Meta dev support contact | Per T05 Meta conversation outcome | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| **D-08** | **F-PUB-004 fix scope: just stratification or also cap/keyword tuning?** | P0 | Stratification + reject-cooldown unblocks all platforms but doesn't fix underlying issue (synthesis layer producing too-long LinkedIn drafts; "restrictive practice" being a blocked NDIS keyword). PK decides whether T08 patch is narrow (stratification only) or wide (also caps + keywords) | When T08 patch is being drafted — i.e. now | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| **D-09** | **F-PUB-005 (trigger doesn't gate on approval): fix now or backlog?** | P2 | Hygiene item; not blocking. Compounds with F-PUB-004 to make recovery harder. Two design options: skip trigger insert if not approved (simpler) vs add `'awaiting_approval'` queue status (cleaner). T10 will dispose of the symptom (queue rows referencing non-approved drafts) — D-09 decides whether to fix the root cause | Decide whether to bundle with T08 patch | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |

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
| B16 | Red-team review v1 — ratification call | P1 | After R10 (Phase C cutover live pilot) — **but D-01 evidence may bring this forward** | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| ~~B17, B18~~ | — | — | — | **CLOSED 2026-04-30.** |
| B19 | Add `idx_slot_filled_draft_id` on `m.slot` | P3 | `m.slot.n_live_tup > 5000` (currently 159). Standing check S7 | F-2026-04-30-D-002 closure |
| B20 | m-schema column-purpose continuation — medium tables | P2 | After F04 lands | userMemories "On the horizon" item 5 |
| B21 | Audit heygen/video-worker output for stranded YT slots | P2 | After T06 (PK reconnects YT OAuth) AND a successful upload completes | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |
| **B22** | **Investigate ai-worker prompt for per-client length cap enforcement** | P2 | After T08 patch landed AND fresh approvals confirmed. If LinkedIn drafts continue exceeding cap, ai-worker prompt change needed | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| **B23** | **F-PUB-005 trigger gate-on-approval fix** | P2 | After T08 + post-T08 stabilisation period. Hygiene fix; not blocking. T10 disposes of symptom this session; B23 fixes root cause later | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor | Manual cycle 5+ per D181 | D181, D184 |
| ~~F04~~ | — | — | **PROMOTED to Active 2026-04-30.** |
| F05 | D156 (deferred per ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) | LinkedIn Community Management API approval / Late.dev evaluation 13 May | userMemories entry 2 |
| F07 | Grok red-team agent evaluation | Only if T04 ChatGPT calibration is noisy | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| F08 | Large m-schema tables column-purpose work | After F04 + B20 complete | After today's 5-brief sweep |

---

## 🎓 Canonical Lessons

- **Lesson #46 (PROMOTED 30 Apr v2.2 from PK + ChatGPT framing)** — **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."**
  - Operationalized as: standing checks S8 (cron-level), S9 (OAuth/token-level), S10 (business-outcome-level), **S11 (auto-approver-business-outcome — added v2.3 from F-PUB-004)** all distinct.
  - Operationalized as: OTL stream O-01 through O-09 (Operational Truth Layer; v2.4 added O-07 production change packet, O-08 disabled+growing-queue alert, O-09 OAuth lifecycle monitor).
  - Operationalized as: pre-DDL verification gate (O-04) requires reading the consumer's source before changing the producer.
  - Operationalized as: T09 safe-to-resume publisher checklist (v2.4) — every cron flip walks an explicit verification of consumer state before producer state changes.
  - **F-PUB-004 (auto-approver starvation) is the most direct application of #46 to date** — auto-approver cron returned 200 OK every 10 min for 5 days while approving zero IG/LinkedIn drafts.
  - This Lesson supersedes candidates #43, #44, #45 — those become specific applications of #46.

---

## Update protocol

1. **At session start**: Rebuild Today/Next 5; Run S1–S11; Surface time-bound items; Ask PK about personal businesses
2. **As work happens**: Item moves Backlog → Ready → Active → (removed)
3. **At session end**: Verify nothing missed; Move follow-ups; Update timestamp; Sync with sync_state
4. **Done items removed** from this file; audit trail in commits / run states / decisions log
5. **No silent additions**: Every new item references its source
6. **Standing rule extension** (memory entry 11 four-way sync): sync_state, decisions, dashboard roadmap, **action_list (this file)**

---

## v2.4 honest limitations

- All v2.3 limitations still apply.
- **v2.4 came from a ChatGPT red-team pass on v2.3** (the 3rd cross-check of the day). 7 items added without external prompting — strong evidence that even after Lesson #46 + OTL framing, the action list was missing structural items that an outside reader spotted in <10min. This is the failure mode `structured_red_team_review_v1` exists to address.
- **The PK-action items (T05 Meta dev support, T06 YT OAuth) are still PK-only.** Chat can't accelerate them. They've been sitting at P1 for 24h+. If they remain pending past Mon 4 May, surface as escalation candidates next session.
- **T09 + T10 are P0 because they gate T07 IG retry.** Without T09 the next cron re-enable repeats tonight's mistake; without T10 the cron re-enable publishes pre-fix bad rows. Both must land before T07 step 4 is retried.
- **T11 is P1 not P0** because it gates only on T06 (YT OAuth reconnect, PK action) — not on tonight's chat-authoring trio.
- **Today/Next 5 deliberately excludes T05 + T06** even though both are P1. They're PK-action items, not on tonight's critical path. They're surfaced in the Time-bound table.

---

## Changelog

- **v1.0–v1.6** (30 Apr Thu evening through 30 Apr Fri afternoon): initial creation through R02 brief queued; T05 added.
- **v1.7** (30 Apr Fri evening, 17:35 Sydney): R02 closed.
- **v1.8** (30 Apr Fri evening, ~17:55 Sydney): B17 + B18 closed.
- **v1.9** (30 Apr Fri evening, ~18:35 Sydney): R03 cycle 2 audit closed; B19 + S7 added.
- **v2.0** (30 Apr Fri late evening, ~21:15 Sydney): publisher operational audit committed; T06 + T07 + B20 + B21 + S8 added.
- **v2.1** (30 Apr Fri late evening, ~22:30 Sydney): ChatGPT cross-check halted wrong YT trigger fix; T06 reframed; T07 6-step sequence; D-06 resolved; S9 added; F-PUB-001 corrigendum.
- **v2.2** (30 Apr Fri late evening, ~23:00 Sydney): T07 step 1 applied at 12:02:25 UTC; OTL captured (O-01..O-06); Lesson #46 promoted; S10 added; R12 added.
- **v2.3** (1 May Fri early morning UTC / Friday late evening Sydney, ~00:30 UTC): T07 step 4 attempted at 00:00 UTC, rolled back at 00:19 UTC after NDIS-Yarns IG hit subcode 2207051 on 2nd cron tick. NDIS-Yarns IG locked. T01 ✅ done at +21h. F-PUB-004 discovered (auto-approver starvation). F-PUB-005 discovered (trigger doesn't gate on approval). T08 added (P0). D-08 + D-09 added. B22 + B23 added. S11 added. Today/Next 5 rebuilt. Two ChatGPT cross-checks tonight caught wrong-direction actions; strong evidence for D-01 / D185 ratification.
- **v2.4** (1 May Fri evening Sydney, post-PK-back-on-laptop): **ChatGPT red-team pass on v2.3 caught 7 structural gaps; integrated mid-session via Path A.** New tickets: **T09 P0** (safe-to-resume publisher checklist), **T10 P0** (quarantine/review pre-T08 queue rows), **T11 P1** (YouTube failed-draft replay plan), **R13 P2** (publisher incident postmortem). New OTL items: **O-07 P1** (production change packet, tied to D-01), **O-08 P1** (disabled-publisher-with-growing-queue alert), **O-09 P1** (OAuth/token lifecycle monitor). Acceptance criteria ("Done when") added to T05/T06/T07/T08. T07 step 4 revised sequence updated to gate on T08 + T09 + T10 + T05 (was previously gated only on T08 + T05). Today/Next 5 rebuilt: T08 + T09 + T10 are tonight's chat-authoring trio; T05 + T06 drop out of top 5 (still P1, in Time-bound table). D-01 evidence escalated: 3 cross-checks in 24h; ratification timing argument now reasonably brings forward decision rather than waiting for R10. Lesson #46 operationalisations expanded to include T09 explicitly.
