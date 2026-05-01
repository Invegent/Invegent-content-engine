# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-05-01 Friday evening Sydney (v2.5 — **D-01 RATIFIED**: `structured_red_team_review_v1` is now a standing rule from this commit forward. **D-09 resolved → T12 P1 created** (F-PUB-005 trigger gate-on-approval patch, simpler design option). B16 + B23 closed. T07 step 4 sequence updated to gate on T08+T09+T10+T12+T05. Tonight's chat-authoring set is now four artefacts: T08 + T09 + T10 + T12).

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

**Standing rule (NEW v2.5, per D-01 ratification)**: every production patch and every action_list version bump from this commit forward goes through ChatGPT cross-check before deploy / commit. v2.5 itself is the ratification commit and is not subject to itself.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **This section is curated, not maintained.** Chat regenerates the table below at every session start. Maximum 5 rows. If you're asking "what should I do next," this is the answer.
>
> **Last rebuilt:** 2026-05-01 Friday evening Sydney post-D-01 ratification.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (standing rule entry 19) | ICE is bonus, not driver — personal comes first | Cleared at session open — PK confirmed nothing live in CFW / Property / NDIS FBA today; reconfirm next session |
| 2 | **T08 — Author auto-approver patch (F-PUB-004 narrow)** | P0 | Largest production breakage; LinkedIn 64-draft buffer will dry up; no IG re-enable until lands | Chat authors TypeScript patch (D-08 narrow scope); ChatGPT review; PK deploys via Supabase EF dashboard |
| 3 | **T12 — Author F-PUB-005 trigger gate patch** (NEW v2.5) | P1 | Needed alongside T08 — prevents fresh queue contamination accumulating around T09's safe-to-resume check | Chat authors SQL migration (D-09 simpler fix); ChatGPT review; PK applies via Supabase MCP `apply_migration` |
| 4 | **T09 + T10 — paired chat-authoring** | P0 | Walks T07 step 4 gate. T09 = methodology checklist, T10 = pre-T08 data disposition. Both required before any cron flip | Chat authors both as docs; ChatGPT review; PK executes T10 post-T08 deploy, walks T09 pre-flip |
| 5 | T02 — Gate B exit decision | P0 | Sat 2 May; T01 +21h obs clean | Default: exit on schedule. Re-check obs delta at full +24h (~03:48 UTC Sat) |

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
| S11 | **Auto-approver business outcome** | `SELECT COUNT(*) FROM m.post_draft WHERE approval_status='approved' AND updated_at > NOW() - INTERVAL '24 hours' GROUP BY platform` | Any platform with 0 fresh approvals in 24h (excluding FB which skips state) → auto-approver may be starving (F-PUB-004 pattern) |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| ~~T01~~ | ~~Phase B +24h observation checkpoint~~ | — | — | — | **DONE 2026-05-01 00:30 UTC at +21h. All 5 targets pass. Zero alerts since deploy.** | [obs run state](audit/runs/2026-05-01-phase-b-+24h-obs.md) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May | PK + chat | **Default: exit on schedule.** Re-check obs delta at full +24h mark; if any new alerts surface in +21h→+24h, fork to extend or disable image_quote | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) + [+24h obs](audit/runs/2026-05-01-phase-b-+24h-obs.md) |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only | calendar |
| T04 | **R01 calibration session** | P1 | Sun 3 May or Mon 4 May | PK + chat | 90min hard cap. ChatGPT first | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| T05 | **Meta dev support contact** — covers business verification + PP IG block + NDIS-Yarns IG block + App Review status | P1 | ASAP — Mon 4 May at latest | PK | Single Meta dev support conversation. **Done when** = outcome of all four documented in a `docs/audit/runs/` entry; PP and NDIS-Yarns IG have either a clear unblock path with timeline or a final "won't unblock" verdict; App Review status confirmed | [docs/05_risks.md](05_risks.md), [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |
| T06 | **Reconnect YouTube OAuth** | P1 | Within 7 days | PK | Dashboard: Clients → Connect → YouTube for NDIS-Yarns + PP + Invegent. **Done when** = each of 3 clients has valid refresh token; one dry-run token refresh succeeds without `invalid_grant`; one controlled YT upload succeeds end-to-end (gated on T11 replay plan); `m.post_publish` receives an audit row with non-null `platform_post_id` | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum |
| T07 | **Instagram publisher recovery** (steps 1-2 done, step 4 attempted+rolled-back, NDIS-Yarns also locked) | P1 | Gated on T08 + T09 + T10 + T12 + T05 | mixed | **Step 1 ✅ DONE 2026-04-30 12:02:25 UTC**. **Step 2 ✅ DONE**. **Step 3 skipped**. **Step 4 ⚠ ATTEMPTED+ROLLED-BACK 2026-05-01 00:00→00:19 UTC**. **REVISED step 4 sequence (per v2.5)**: (a) deploy F-PUB-004 patch via T08; (b) apply F-PUB-005 trigger gate via T12; (c) author + walk T09 safe-to-resume checklist; (d) execute T10 disposition on pre-T08 queue rows; (e) wait for fresh CFW or Invegent IG draft to reach `approved` status; (f) revisit cron re-enable with `?limit=1` only after observing fresh approvals. **Done when** = (i) unaffected IG clients (CFW + Invegent) publish successfully via cron; (ii) PP/NDIS-Yarns IG remain not picked up while locked; (iii) `m.post_publish_queue` IG aged-row count trends down; (iv) zero new Meta 403 / subcode 2207051 / 2207027 errors in a 24h observation window | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| **T08** | **Author auto-approver patch (F-PUB-004 fix — NARROW per D-08)** | P0 | This session — author; deploy this week | chat (authors) → ChatGPT (red-team review per D-01 standing rule) → PK (deploys) | Two changes to `supabase/functions/auto-approver/index.ts`: (1) **stratify fetch** by (client, platform) — fair-share across buckets instead of pure score-DESC; (2) **add reject-cooldown / terminal state** — skipped drafts move to `'rejected'` (not `'needs_review'`) with `rejection_reason` populated. **NO length-cap or keyword-list changes** (D-08 narrow). Length cap mismatch handled separately via B22 (ai-worker prompt); keyword list handled separately as per-client config. **Done when** = (i) auto-approver fetches per (client, platform) bucket — verifiable by inspecting fetch SQL output; (ii) skipped drafts move to terminal `'rejected'` with `rejection_reason`; (iii) fresh `'approved'` rows appear across CFW IG + Invegent IG + LinkedIn within 1 cron cycle of deploy; (iv) S11 shows non-zero fresh approvals per platform in 24h | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| **T09** | **Author safe-to-resume publisher checklist** | P0 | This session — author; walk before each future cron flip | chat (authors) → ChatGPT (review) → PK (walks before each cron flip) | Author `docs/operations/safe_to_resume_publisher.md`. Reusable checklist for any publisher cron re-enable: (a) affected client/platform pairs disabled or excluded; (b) only fresh, post-fix approvals are eligible; (c) old queue rows quarantined or reviewed (T10 dependency); (d) dry run passes; (e) S10 + S11 business-outcome checks clean for that platform; (f) rollback command pre-drafted. **Done when** = checklist authored, reviewed by ChatGPT, cited in T07 revised step 4 sequence, walked successfully on T07 IG re-enable | tonight's red-team |
| **T10** | **Quarantine/review pre-T08 queue rows** | P0 | This session — author; execute post-T08 deploy | chat (authors disposition) → ChatGPT (review) → PK (executes per population) | Author disposition SQL + decision tree. Two distinct populations: **(P-A)** IG queue rows in `m.post_publish_queue` referencing drafts in `approval_status='needs_review'` (created via F-PUB-005 trigger gap) — disposition: mark queue rows terminal, leave drafts alone; **(P-B)** the ~30 score-DESC drafts re-cycling in auto-approver fetch — disposition: explicit operator decision per draft (publish / re-score / skip / mark terminal). 64 pre-25-Apr LinkedIn approved queue rows are NOT in scope (valid pre-starvation approvals; leave alone). **Done when** = both populations have explicit dispositions applied with audit trail; no IG queue row referencing a non-`approved` draft remains; no draft in the cycling-30 set re-enters fetch top-30 post-T08 | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 + F-PUB-005 |
| T11 | **YouTube failed-draft replay plan** | P1 | After T06 done | chat (authors) → ChatGPT (review) → PK (executes) | Author replay SQL with strict eligibility filter: only retry drafts where `video_status='failed'` AND `draft_format ? 'youtube_upload_error'` AND `youtube_video_id IS NULL` AND `video_url IS NOT NULL` AND no existing successful `m.post_publish` row for that draft_id. Prevents double-upload and unsafe retry. **Done when** = SQL authored + reviewed; on T06 OAuth reconnect, executed against the 18 already-rendered drafts; result audit captured | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |
| **T12 (NEW v2.5)** | **F-PUB-005 fix — trigger gate-on-approval patch** (D-09 simpler fix) | P1 | This session — author; apply this week | chat (authors SQL migration) → ChatGPT (review per D-01 standing rule) → PK (applies via Supabase MCP `apply_migration`) | Modify trigger function `m.enqueue_publish_from_ai_job_v1` to gate INSERT into `m.post_publish_queue` on `approval_status='approved'`. Simpler design option chosen over `'awaiting_approval'` queue state per D-09 — keeps consumer state machine narrow. **Done when** = (i) trigger function updated and deployed via apply_migration; (ii) test insert with `approval_status='needs_review'` does NOT create queue row; (iii) test insert with `approval_status='approved'` DOES create queue row; (iv) zero new F-PUB-005-class queue contamination observed in 24h post-deploy | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |

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

> Tonight's publisher audit + auto-approver investigation proved ICE has been operating with cron-layer monitoring while business-layer truth was unmonitored. ChatGPT's structural framing nailed it: **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."** v2.4 added O-07 + O-08 + O-09.

| ID | Item | Priority | Owner | First action | Notes |
|---|---|---|---|---|---|
| **O-01** | **Platform-source-of-truth map** | P1 | chat | Author `docs/operations/platform_source_of_truth.md` with one row per platform. Columns: source table, queue path (or "direct"), publisher EF + version, success marker, failure marker, token location, recovery owner | Most enabling piece. Every other OTL item references this map |
| **O-02** | **Per-client/platform circuit breakers** | P2 | chat + PK | Step 1: audit each publisher EF for whether it honors `publish_enabled` (IG v2.0.0 confirmed; FB/LI/YT pending). Step 2: design auto-trip on N consecutive failures. Step 3: alert via existing notifier path | PP+NDIS IG today proved the manual circuit breaker pattern works; auto-trip is the natural extension |
| **O-03** | **Business-outcome monitors** (NOT cron monitors) | P1 | chat | Author `m.fn_business_outcome_health()` returning per-platform: posts_published_24h, queue_rows_aged_gt_1h, oauth_errors_7d, drafts_stuck_in_failed, **fresh_approvals_24h**. Initially manual via S10+S11 standing checks; later cron + Resend alert | S10+S11 added today as the manual version |
| **O-04** | **Pre-DDL verification gate** (formal checklist) | P2 | chat | Append to `docs/audit/decisions/migration_naming_discipline.md` (or new doc) the pre-DDL discipline | Today's wrong-pass YT trigger fix would have been caught |
| **O-05** | **External-account health checks** (daily matrix) | P1 | chat | Build `m.vw_external_account_health` view: per (client, platform): token_state, last_publish_attempt_at, last_publish_success_at, anti_spam_flag_state, days_since_last_success | Closely parallels S9 + S11 standing checks but expanded |
| **O-06** | **Recovery playbooks by failure class** | P2 | chat | Author `docs/operations/recovery_playbooks.md` starting with the 4 we just hit: (1) OAuth token expired; (2) Meta anti-spam block on single account; (3) Audit trail broken; (4) **Auto-approver starvation** | Each playbook is short — a 5-step recovery checklist |
| **O-07** | **Production change packet** (formal pre-fix discipline) | P1 — now **operationalises D-01** | chat | Author `docs/operations/production_change_packet.md` template. Every production fix must include: hypothesis / source-of-truth code path / exact SQL or code change / dry-run query / rollback command / success metric / red-team check result. **D-01 ratified 2026-05-01 — this is the artifact that operationalises the standing rule** | Tonight's red-team: practical companion to O-04 |
| **O-08** | **Disabled-publisher-with-growing-queue alert** | P1 | chat | Specific instance of O-03 deserving first-class status. Alert when: (i) cron is disabled AND (ii) queue rows for that platform are increasing OR (iii) oldest queued row exceeds threshold. **Note: T12 closes the F-PUB-005 + cron-disabled interaction directly**, but O-08 still catches other queue-growth-while-disabled scenarios | Net-additive to O-03 |
| **O-09** | **OAuth/token lifecycle monitor** (proactive) | P1 | chat | Active-alerting layer above O-05's view. Track and alert on: refresh token missing / refresh token revoked / repeated `invalid_grant` / no successful token refresh in N days / connected account lacks required scopes. Turns YouTube-class outages from surprise failures into routine account-health items | Proactive complement to S9 |

---

## 🟢 Ready / Strategic (next-session candidates)

| ID | Item | Priority | Owner | Estimated time | Next action | Source |
|---|---|---|---|---|---|---|
| ~~R01–R06~~ | ~~Various~~ | — | — | — | **All closed 30 Apr.** | — |
| R07 | Update `invegent-dashboard` roadmap milestone | P3 | chat | 10min | Bundle into single dashboard update covering today's full ~9.2→42% sweep | standing rule entry 11 |
| R08 | **Meta App Review status check** | P1 | PK | 5min | **OVERLAPS WITH T05** — same Meta dev support conversation | userMemories entry 4 |
| R09 | **Author reconciliation v2 brief** | P1 | PK + chat | 30-45min brief authorship | After T01 + T02 + personal businesses check | [spec capture](briefs/reconciliation-v2-spec.md) |
| R10 | **Phase C cutover live pilot — apply red-team review** | P1 | PK + ChatGPT (red-team) + chat | ~30min added to Phase C cutover review | When Phase C cutover brief is drafted. **Per D-01 ratification (2026-05-01)**, R10 becomes the first formal application of the standing rule, not the validation gate | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| R11 | **Cycle 3 audit run** | P3 | chat (snapshot) + ChatGPT (auditor) | 5min + 30min + closure | Run the refreshed brief on a future day | D181 manual loop |
| R12 | **Define Operations Auditor role** (after OTL items in place) | P1 | chat | When O-01 + O-03 + O-05 are authored — define `docs/audit/roles/operations_auditor.md` | Tonight's PK feedback explicitly called for this |
| R13 | **Publisher incident postmortem (1 May near-miss + F-PUB-004 starvation + 3 cross-checks)** | P2 | chat (authors) → PK (review) | 45-60min authorship | Author `docs/audit/postmortems/2026-05-01-publisher-incident.md`. Cover: initial wrong diagnosis (YT trigger fix); red-team correction (cross-check #1); actual source-of-truth architecture; auto-approver starvation discovery; second cross-check (bulk-quarantine averted); third cross-check (v2.3→v2.4 review); fourth contribution (D-09 reframing → T12); permanent guardrails (S10/S11/OTL/T08/T09/T10/T12). Strong evidence artifact for D-01 ratification (already ratified) | tonight's red-team |
| **R14 (NEW v2.5)** | **D185 entry to `docs/06_decisions.md`** | P1 | chat | 15min — author D185 entry capturing: D-01 ratification context (3 cross-checks in 24h), the standing rule wording, evidence pile, what's NOT in scope (e.g. cycle 3 audit still proceeds independently), retirement-condition language | Per 4-way sync standing rule — D-01 ratification is incomplete until 06_decisions.md captures D185 | D-01 closure |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| ~~D-01~~ | ~~Adopt `structured_red_team_review_v1` as standing rule?~~ | — | **DECIDED 2026-05-01 Friday evening Sydney — RATIFIED.** Three real-stakes red-team catches in 24h cleared the bar without waiting for R10. Standing rule from this commit forward: every production patch and every action_list version bump goes through ChatGPT cross-check before deploy / commit. R10 (Phase C cutover) becomes the first formal application post-ratification, not the validation gate. **Follow-up R14 created** to record D185 in `docs/06_decisions.md` | — | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| ~~D-02, D-03, D-06~~ | — | — | **All resolved 30 Apr.** | — | — |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content | PK decides | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over | PK confirms | morning sync_state |
| D-07 | **Property Pulse + NDIS-Yarns IG specific recovery path** (now both clients) | P1 | T07 step 4 attempt confirmed both PP and NDIS-Yarns are flagged. Recovery via T05 Meta dev support contact | Per T05 Meta conversation outcome | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| ~~D-08~~ | ~~F-PUB-004 fix scope: just stratification or also cap/keyword tuning?~~ | — | **DECIDED 2026-05-01 Friday evening Sydney — NARROW.** Stratification + reject-cooldown only. No length-cap or keyword-list changes in T08. Cap mismatch handled separately via B22; keyword list handled separately as per-client config | — | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| ~~D-09~~ | ~~F-PUB-005 (trigger doesn't gate on approval): fix now or backlog?~~ | — | **DECIDED 2026-05-01 Friday evening Sydney.** Not bundled into T08; not pushed to ordinary backlog; promoted to **T12 P1** as a separate near-term safety patch. Simpler design option (skip insert if `approval_status != 'approved'`) chosen over cleaner `'awaiting_approval'` queue state — keeps consumer state machine narrow. Sequenced in T07 step 4 gate | — | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |

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
| B13 | Telegram channels + `claude rc` + Opus 4.6 1M context | P3 | When useful trigger emerges | userMemories entry 23 |
| B14 | `docs/15_pre_post_sales_criteria.md` classification | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B15 | Phase E — Invegent vertical signal weighting | P2 | After thin-pool decision (D-04) | userMemories entry 29, D174 |
| ~~B16~~ | ~~Red-team review v1 — ratification call~~ | — | **CLOSED 2026-05-01 with D-01 ratification.** | — |
| ~~B17, B18~~ | — | — | **CLOSED 2026-04-30.** | — |
| B19 | Add `idx_slot_filled_draft_id` on `m.slot` | P3 | `m.slot.n_live_tup > 5000` (currently 159). Standing check S7 | F-2026-04-30-D-002 closure |
| B20 | m-schema column-purpose continuation — medium tables | P2 | After F04 lands | userMemories "On the horizon" item 5 |
| B21 | Audit heygen/video-worker output for stranded YT slots | P2 | After T06 (PK reconnects YT OAuth) AND a successful upload completes | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |
| **B22** | **Investigate ai-worker prompt for per-client length cap enforcement** | P2 | After T08 patch landed AND fresh approvals confirmed. If LinkedIn drafts continue exceeding cap, ai-worker prompt change needed | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| ~~B23~~ | ~~F-PUB-005 trigger gate-on-approval fix~~ | — | **PROMOTED to T12 (P1) 2026-05-01 with D-09 resolution.** | — |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor | Manual cycle 5+ per D181 | D181, D184 |
| ~~F04~~ | — | **PROMOTED to Active 2026-04-30.** | — |
| F05 | D156 (deferred per ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) | LinkedIn Community Management API approval / Late.dev evaluation 13 May | userMemories entry 2 |
| F07 | Grok red-team agent evaluation | Only if T04 ChatGPT calibration is noisy | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| F08 | Large m-schema tables column-purpose work | After F04 + B20 complete | After today's 5-brief sweep |

---

## 🎓 Canonical Lessons

- **Lesson #46 (PROMOTED 30 Apr v2.2 from PK + ChatGPT framing)** — **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."**
  - Operationalized as: standing checks S8 (cron-level), S9 (OAuth/token-level), S10 (business-outcome-level), S11 (auto-approver-business-outcome).
  - Operationalized as: OTL stream O-01 through O-09.
  - Operationalized as: pre-DDL verification gate (O-04).
  - Operationalized as: T09 safe-to-resume publisher checklist.
  - Operationalized as (v2.5): T12 trigger gate-on-approval — closes the F-PUB-005 producer-side leak that was contributing to consumer-side queue contamination.
  - **F-PUB-004 (auto-approver starvation) is the most direct application of #46 to date.**

- **Lesson #47 candidate (NEW v2.5, captured for future ratification)** — **"Three real-stakes red-team catches in a single rolling 24h window is sufficient base rate to ratify a standing review rule."** Awaits at least one further data point under the new rule (e.g., R10 first formal application) before promotion. Until promoted, lives here as a candidate, not as governing principle.

---

## Update protocol

1. **At session start**: Rebuild Today/Next 5; Run S1–S11; Surface time-bound items; Ask PK about personal businesses
2. **As work happens**: Item moves Backlog → Ready → Active → (removed)
3. **At session end**: Verify nothing missed; Move follow-ups; Update timestamp; Sync with sync_state
4. **Done items removed** from this file; audit trail in commits / run states / decisions log
5. **No silent additions**: Every new item references its source
6. **Standing rule extension** (memory entry 11 four-way sync): sync_state, decisions, dashboard roadmap, **action_list (this file)**
7. **NEW v2.5 (per D-01 ratification)**: every production patch and every action_list version bump from this commit forward goes through ChatGPT cross-check before deploy / commit

---

## v2.5 honest limitations

- All v2.4 limitations still apply.
- **D-01 ratification is captured here but not yet recorded in `docs/06_decisions.md`** — R14 created P1 to author the D185 entry next session. Until 06_decisions.md captures D185, the ratification is tracked in action_list only. This is a 4-way sync gap.
- **The PK-action items (T05 Meta dev support, T06 YT OAuth) are still PK-only.** Chat can't accelerate them. Sitting at P1 for 24h+. If pending past Mon 4 May, surface as escalation candidates next session.
- **T08 + T09 + T10 + T12 are tonight's chat-authoring set.** All four go through ChatGPT cross-check (per the new D-01 standing rule) before PK deploys / applies / executes.
- **Today/Next 5 deliberately excludes T05 + T06 + T11** even though all P1. T05/T06 are PK-action only; T11 gates on T06.

---

## Changelog

- **v1.0–v1.6** (30 Apr Thu evening through 30 Apr Fri afternoon): initial creation through R02 brief queued; T05 added.
- **v1.7** (30 Apr Fri evening, 17:35 Sydney): R02 closed.
- **v1.8** (30 Apr Fri evening, ~17:55 Sydney): B17 + B18 closed.
- **v1.9** (30 Apr Fri evening, ~18:35 Sydney): R03 cycle 2 audit closed; B19 + S7 added.
- **v2.0** (30 Apr Fri late evening, ~21:15 Sydney): publisher operational audit committed; T06 + T07 + B20 + B21 + S8 added.
- **v2.1** (30 Apr Fri late evening, ~22:30 Sydney): ChatGPT cross-check halted wrong YT trigger fix; S9 added; F-PUB-001 corrigendum.
- **v2.2** (30 Apr Fri late evening, ~23:00 Sydney): T07 step 1 applied; OTL captured (O-01..O-06); Lesson #46 promoted; S10 added; R12 added.
- **v2.3** (1 May Fri early morning UTC, ~00:30 UTC): T07 step 4 attempted+rolled-back; F-PUB-004 + F-PUB-005 discovered; T08 + D-08 + D-09 + B22 + B23 + S11 added.
- **v2.4** (1 May Fri evening Sydney, post-PK-back-on-laptop): ChatGPT red-team pass on v2.3 caught 7 structural gaps; T09 + T10 + T11 + R13 + O-07 + O-08 + O-09 added; acceptance criteria on T05/T06/T07/T08.
- **v2.5** (1 May Fri evening Sydney, ~PK-back-on-laptop +30min): **D-01 RATIFIED** — `structured_red_team_review_v1` is now a standing rule from this commit forward. **D-08 resolved → narrow** (no length-cap or keyword changes in T08). **D-09 resolved → T12 P1** (F-PUB-005 trigger gate-on-approval, simpler design option). T07 step 4 sequence updated to gate on T08 + T09 + T10 + T12 + T05. B16 + B23 closed. R14 created P1 to record D185 in 06_decisions.md. Lesson #47 candidate captured (3 catches in 24h sufficient for ratification — awaits 1 further data point). Today/Next 5 rebuilt: T08 + T12 + T09/T10 paired + T02. Tonight's chat-authoring set is now four artefacts.
