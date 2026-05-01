# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-05-01 Friday evening Sydney (v2.6 — **LinkedIn publisher approval-gate discovery**: source pull of `linkedin-zapier-publisher` v1.0.0 confirms NO approval gate exists in the publisher. 28 `needs_review` LinkedIn drafts have been published in last 14 days; total since publisher deployment unknown. Re-orders patch priorities materially: **T13 P0** publisher gate becomes primary fix; **T14 P0** cross-post RPC audit; **T15 P0** verify FB+IG+WordPress publisher gates; **T16 P1** content-quality audit of 28 published drafts; **T12 reframed P1** trigger gate becomes defence-in-depth post-T13. F-PUB-005 reframed: not a "trigger forgot to gate" bug, but a missing publisher gate compounded by enqueue-everything trigger design. **D-10** opened on T13 gate location.

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

**Standing rule (per D-01 ratification, 2026-05-01)**: every production patch and every action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy / commit. **v2.6 honest limitation**: this bump was committed without ChatGPT cross-check per PK's explicit go-ahead — bookkeeping bump documenting tonight's investigation findings is treated as state-capture rather than directive-introduction. Resume strict rule application from v2.7 onward.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **This section is curated, not maintained.** Chat regenerates the table below at every session start. Maximum 5 rows. If you're asking "what should I do next," this is the answer.
>
> **Last rebuilt:** 2026-05-01 Friday evening Sydney post-LinkedIn-publisher discovery.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (standing rule entry 19) | ICE is bonus, not driver | Cleared at session open — reconfirm next session |
| 2 | **T13 — Author LinkedIn publisher approval gate** (NEW v2.6, supersedes T12) | P0 | Largest production breakage discovered tonight. 28 `needs_review` LinkedIn drafts published in last 14d. Smallest patch, biggest impact | Chat authors single-line gate addition to `linkedin-zapier-publisher` per-row loop (D-10 settles location); ChatGPT review; PK deploys via Supabase EF dashboard |
| 3 | **T15 — Verify FB + IG + WordPress publisher approval gates** (NEW v2.6) | P0 | Pair with T13 — if FB or WordPress are also missing gates, escalate immediately | Chat pulls each publisher source, documents in `docs/audit/runs/2026-05-01-publisher-gate-audit.md` |
| 4 | **T08 — Author auto-approver patch (F-PUB-004 narrow)** | P0 | Largest known production issue at session start; remains P0. LinkedIn 64-draft buffer still drying up | Chat authors TypeScript patch (D-08 narrow); ChatGPT review; PK deploys |
| 5 | **T14 + T10 + T09 — chat-authoring triplet** | P0 | T14 audits second LinkedIn enqueue path (cross-post RPC); T10 disposes pre-fix queue rows; T09 safe-to-resume checklist | Chat authors all three; ChatGPT review; PK executes T10 + walks T09 + decides T14 follow-up |

T05/T06/T11/T12/T16 remain P1 in Time-bound table; not on tonight's chat-authoring critical path.

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
| **S12 (NEW v2.6)** | **Approval-gate compliance check** | `SELECT pp.platform, pd.approval_status, COUNT(*) FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id WHERE pp.created_at > NOW() - INTERVAL '24 hours' AND pp.status='published' GROUP BY pp.platform, pd.approval_status` | Any platform with `published` posts where draft was `'needs_review'` or `'rejected'` at publish time → publisher gate failed (F-PUB-005-class issue) |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| ~~T01~~ | ~~Phase B +24h observation checkpoint~~ | — | — | — | **DONE 2026-05-01 00:30 UTC at +21h. All 5 targets pass. Zero alerts since deploy.** | [obs run state](audit/runs/2026-05-01-phase-b-+24h-obs.md) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May | PK + chat | **Default: exit on schedule.** Re-check obs delta at full +24h mark | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) + [+24h obs](audit/runs/2026-05-01-phase-b-+24h-obs.md) |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only | calendar |
| T04 | **R01 calibration session** | P1 | Sun 3 May or Mon 4 May | PK + chat | 90min hard cap. ChatGPT first | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| T05 | **Meta dev support contact** — covers business verification + PP IG block + NDIS-Yarns IG block + App Review status | P1 | ASAP — Mon 4 May at latest | PK | Single Meta dev support conversation. **Done when** = outcome of all four documented; PP and NDIS-Yarns IG have either a clear unblock path with timeline or a final "won't unblock" verdict; App Review status confirmed | [docs/05_risks.md](05_risks.md), [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |
| T06 | **Reconnect YouTube OAuth** | P1 | Within 7 days | PK | Dashboard: Clients → Connect → YouTube for NDIS-Yarns + PP + Invegent. **Done when** = each of 3 clients has valid refresh token; one dry-run token refresh succeeds; one controlled YT upload succeeds; `m.post_publish` audit row with non-null `platform_post_id` | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum |
| T07 | **Instagram publisher recovery** (steps 1-2 done, step 4 attempted+rolled-back, NDIS-Yarns also locked) | P1 | Gated on T08 + T15 + T10 + T09 + T05 | mixed | **Step 1 ✅ DONE 2026-04-30 12:02:25 UTC**. **Step 2 ✅ DONE**. **Step 3 skipped**. **Step 4 ⚠ ATTEMPTED+ROLLED-BACK 2026-05-01 00:00→00:19 UTC**. **REVISED step 4 sequence (per v2.6)**: (a) deploy F-PUB-004 patch via T08; (b) verify IG publisher gate via T15 (provably gates per tonight's failures, but document); (c) author + walk T09 safe-to-resume checklist; (d) execute T10 disposition on pre-T08 IG queue rows; (e) wait for fresh CFW or Invegent IG draft to reach `approved`; (f) revisit cron re-enable with `?limit=1`. **Note (v2.6)**: T13 (LinkedIn gate) and T14 (cross-post audit) are LinkedIn-platform concerns, not gates on IG re-enable — but should still be in flight or done before re-enable. **Done when** = (i) unaffected IG clients (CFW + Invegent) publish via cron; (ii) PP/NDIS-Yarns IG remain not picked up; (iii) IG aged-row count trends down; (iv) zero new Meta 403/2207051/2207027 errors in 24h | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| **T08** | **Author auto-approver patch (F-PUB-004 fix — NARROW per D-08)** | P0 | This session — author; deploy this week | chat (authors) → ChatGPT (review per D-01) → PK (deploys) | Two changes to `supabase/functions/auto-approver/index.ts`: (1) **stratify fetch** by (client, platform); (2) **add reject-cooldown / terminal state** — skipped drafts move to `'rejected'` with `rejection_reason`. **NO length-cap or keyword-list changes** (D-08 narrow). **Note (v2.6)**: T15 source pulls confirm publishers truncate body at publish time (LinkedIn 3000 char `slice(0, 3000)`) — auto-approver length-cap rejection of LinkedIn drafts was operationally pointless (drafts would have been truncated regardless). Strengthens narrow scope decision. **Done when** = (i) per-bucket fetch verifiable; (ii) skipped drafts move to terminal `'rejected'` with `rejection_reason`; (iii) fresh `'approved'` rows across CFW IG + Invegent IG + LinkedIn within 1 cron cycle; (iv) S11 non-zero | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| **T09** | **Author safe-to-resume publisher checklist** | P0 | This session — author; walk before each future cron flip | chat (authors) → ChatGPT (review) → PK (walks before each cron flip) | Author `docs/operations/safe_to_resume_publisher.md`. Reusable checklist: (a) affected client/platform pairs disabled or excluded; (b) only fresh, post-fix approvals are eligible; (c) old queue rows quarantined or reviewed (T10 dependency); (d) dry run passes; (e) S10 + S11 + **S12 (new v2.6)** business-outcome checks clean; (f) rollback command pre-drafted. **Done when** = checklist authored, reviewed by ChatGPT, cited in T07 revised step 4 sequence, walked successfully on T07 IG re-enable | tonight's red-team |
| **T10** | **Quarantine/review pre-T08 queue rows** | P0 | This session — author; execute post-T08 deploy | chat (authors disposition) → ChatGPT (review) → PK (executes per population) | Author disposition SQL + decision tree. **(P-A)** IG queue rows referencing drafts in `approval_status='needs_review'` (created via F-PUB-005) — disposition: mark queue rows terminal, leave drafts alone; **(P-B)** ~30 score-DESC drafts re-cycling in auto-approver fetch — explicit operator decision per draft. **(P-C, NEW v2.6)** LinkedIn queue rows referencing `needs_review` drafts that haven't yet been published — disposition: hold pending T13 deploy, then either approve (if quality-acceptable per T16) or mark terminal. 64 pre-25-Apr LinkedIn approved queue rows are NOT in scope. **Done when** = all three populations dispositioned with audit trail | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 + F-PUB-005 |
| T11 | **YouTube failed-draft replay plan** | P1 | After T06 done | chat (authors) → ChatGPT (review) → PK (executes) | Author replay SQL with strict eligibility filter. **Done when** = SQL authored + reviewed; on T06 OAuth reconnect, executed against 18 already-rendered drafts; result audit captured | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |
| ~~T12 (was P1)~~ | **F-PUB-005 fix — trigger gate-on-approval patch** (REFRAMED v2.6 — defence-in-depth, post-T13) | P1 | After T13 + observation window | chat (authors SQL migration) → ChatGPT (review) → PK (applies via apply_migration) | **Reframed v2.6**: T13 (publisher gate) is now the primary fix; T12 (trigger gate) becomes defence-in-depth, post-T13. **Architectural note**: source pulls confirm the current architecture is "enqueue-everything trigger + gate-at-publisher pre-flight" — F-PUB-005 isn't a trigger bug per se, it's that the publisher (LinkedIn-zapier specifically) was missing the gate. Trigger gate is a sensible additional layer once T13 lands but no longer P0. **Done when** = trigger function updated; test inserts verified; zero new F-PUB-005-class queue contamination in 24h post-deploy | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |
| **T13 (NEW v2.6)** | **Add `approval_status='approved'` gate to `linkedin-zapier-publisher`** | P0 | This session — author; deploy this week | chat (authors) → ChatGPT (review per D-01) → PK (deploys via Supabase EF dashboard) | Patch to per-row loop in `linkedin-zapier-publisher` v1.0.0 → v1.1.0: extend the existing draft SELECT to include `approval_status`, add a check `if (draft.approval_status !== 'approved') skip` (or move to publisher_lock_queue_v2 RPC per D-10 decision). The publisher currently has NO approval gate at all (verified via source pull). 28 `needs_review` drafts published in 14d as a result. **Done when** = (i) publisher source updated and ChatGPT-reviewed; (ii) deployed; (iii) zero new `'needs_review'`-state LinkedIn published rows for 24h post-deploy; (iv) v1.1.0 logged in EF history; (v) S12 standing check confirms compliance | tonight's source pull |
| **T14 (NEW v2.6)** | **Audit `crosspost_facebook_to_linkedin` RPC** | P0 | This session — investigate; patch this week if needed | chat (investigates source) → propose fix per findings | The `linkedin-zapier-publisher` calls this RPC at the top of every run as Step 1 — second unguarded enqueue path beyond the AI-job trigger. Pull RPC source via `pg_get_functiondef`, document behaviour, decide whether: (a) the RPC needs an approval gate too (defence-in-depth); (b) T13's per-row gate is sufficient because cross-posted rows still go through the same publisher loop. **Done when** = source documented in `docs/audit/runs/2026-05-01-crosspost-rpc-audit.md`; decision recorded; if patch needed, scoped as T14b ticket | tonight's source pull |
| **T15 (NEW v2.6)** | **Verify approval gates on FB + IG + WordPress publishers** | P0 | This session — verification only | chat (pulls source for each) → document findings | Pull source for `publisher` (FB), `instagram-publisher`, `wordpress-publisher`. Verify whether each gates on `approval_status` before publishing. IG provably gates (tonight's failures). FB and WordPress unknown. If any are missing the gate, escalate as separate ticket (T15b/c/d). **Done when** = each publisher's gate (or absence) is documented in `docs/audit/runs/2026-05-01-publisher-gate-audit.md` with code excerpt and verdict | tonight's source pull |
| **T16 (NEW v2.6)** | **Audit 28 needs_review LinkedIn published drafts (content-quality review)** | P1 | This week — PK time | PK reviews; chat surfaces list | Chat queries `m.post_publish` JOIN `m.post_draft` WHERE platform='linkedin' AND draft.approval_status='needs_review' for last 14d (extend window if T15 reveals issue is older). PK scans titles/bodies for quality, brand fit, compliance, accuracy. Outcome may inform whether any need to be deleted from LinkedIn or reposted with corrections. **Done when** = each of N drafts has been operator-reviewed and dispositioned (acceptable / delete-from-LinkedIn / repost-corrected); audit row captured in `docs/audit/runs/` | tonight's data query |

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

## 🏗 Operational Truth Layer (strategic stream — captured 30 Apr v2.2, validated 1 May, expanded v2.4 + v2.6)

> Tonight's publisher audit + auto-approver investigation + LinkedIn publisher source pull proved ICE has been operating with cron-layer monitoring while business-layer truth was unmonitored AND while the publisher itself was missing the approval gate. ChatGPT's structural framing nailed it: **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."** v2.6 sharpening: source-of-truth verification means reading the consumer's actual code, not inferring from architectural framing.

| ID | Item | Priority | Owner | First action | Notes |
|---|---|---|---|---|---|
| **O-01** | **Platform-source-of-truth map** | P1 — escalated | chat | Author `docs/operations/platform_source_of_truth.md` with one row per platform. Columns: source table, queue path (or "direct"), publisher EF + version, **approval gate location (NEW v2.6)**, success marker, failure marker, token location, recovery owner | Most enabling piece. v2.6 finding: per-platform variation in approval gate is the kind of thing this map exists to surface |
| **O-02** | **Per-client/platform circuit breakers** | P2 | chat + PK | Step 1: audit each publisher EF for whether it honors `publish_enabled` (IG v2.0.0 confirmed; FB/LI/YT pending — partially addressed by T15). Step 2: design auto-trip on N consecutive failures. Step 3: alert via existing notifier path | T13 + T15 partially overlap with O-02 audit step 1 |
| **O-03** | **Business-outcome monitors** (NOT cron monitors) | P1 | chat | Author `m.fn_business_outcome_health()` returning per-platform: posts_published_24h, queue_rows_aged_gt_1h, oauth_errors_7d, drafts_stuck_in_failed, fresh_approvals_24h, **published_unreviewed_24h (NEW v2.6, S12)**. Initially manual via S10+S11+S12 standing checks | S10+S11 added v2.3; S12 added v2.6 |
| **O-04** | **Pre-DDL verification gate** (formal checklist) | P2 | chat | Append to `docs/audit/decisions/migration_naming_discipline.md` (or new doc) the pre-DDL discipline | v2.6 vindication: tonight's investigation followed the spirit of O-04 in pulling EF source before authoring T12 — caught the bigger issue |
| **O-05** | **External-account health checks** (daily matrix) | P1 | chat | Build `m.vw_external_account_health` view: per (client, platform): token_state, last_publish_attempt_at, last_publish_success_at, anti_spam_flag_state, days_since_last_success | Closely parallels S9 + S11 standing checks but expanded |
| **O-06** | **Recovery playbooks by failure class** | P2 | chat | Author `docs/operations/recovery_playbooks.md` starting with the 4 we hit: (1) OAuth token expired; (2) Meta anti-spam block on single account; (3) Audit trail broken; (4) Auto-approver starvation. **Add (5, NEW v2.6): Publisher missing approval gate** | Each playbook is short — a 5-step recovery checklist |
| **O-07** | **Production change packet** (formal pre-fix discipline) | P1 — operationalises D-01 | chat | Author `docs/operations/production_change_packet.md` template. Every production fix must include: hypothesis / source-of-truth code path / exact SQL or code change / dry-run query / rollback command / success metric / red-team check result | v2.6 vindication: "source-of-truth code path" is the step that caught tonight's discovery |
| **O-08** | **Disabled-publisher-with-growing-queue alert** | P1 | chat | Specific instance of O-03 deserving first-class status | Net-additive to O-03 |
| **O-09** | **OAuth/token lifecycle monitor** (proactive) | P1 | chat | Active-alerting layer above O-05's view | Proactive complement to S9 |
| **O-10 (NEW v2.6)** | **Publisher approval-gate audit (one-time + ongoing)** | P0 — partially in flight as T15 | chat | One-time audit (T15) covers FB/IG/LinkedIn/WordPress/YouTube publishers. Ongoing: every new or modified publisher EF must include an explicit approval-gate test in PR review. Captured as part of O-07 production change packet template | T15 is the first execution; O-10 makes it standing |

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
| R13 | **Publisher incident postmortem (1 May — F-PUB-004 starvation + LinkedIn publisher gate-missing + 4 cross-checks)** | P2 → expanded scope | chat (authors) → PK (review) | 60-90min authorship (was 45-60min) | Author `docs/audit/postmortems/2026-05-01-publisher-incident.md`. Cover: (1) initial wrong diagnosis (YT trigger fix); (2) red-team correction #1; (3) actual source-of-truth architecture (YT reads `m.post_draft` directly); (4) auto-approver starvation discovery (F-PUB-004); (5) red-team correction #2 (bulk-quarantine averted); (6) red-team correction #3 (v2.3→v2.4 missing-controls review); (7) red-team correction #4 (D-09 → T12 reframing); (8) **pre-DDL verification of T12 led to LinkedIn publisher gate-missing discovery (v2.6)**; (9) F-PUB-005 reframed: not trigger bug, but consumer-side missing gate; (10) the 28 published needs_review LinkedIn drafts; (11) permanent guardrails (S10/S11/S12/OTL/T08/T09/T10/T13/T14/T15). **v2.6 update**: tonight's session has now produced 4 distinct red-team catches plus 1 pre-DDL discovery — the pattern is itself the lesson | tonight's session |
| R14 | **D185 entry to `docs/06_decisions.md`** | P1 | chat | 15min — author D185 entry capturing D-01 ratification context (4 catches + 1 pre-DDL discovery), standing rule wording, evidence pile, what's NOT in scope, retirement-condition language | Per 4-way sync standing rule | D-01 closure |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| ~~D-01~~ | ~~Adopt `structured_red_team_review_v1` as standing rule?~~ | — | **DECIDED 2026-05-01 — RATIFIED.** v2.6 strengthens evidence: 4th catch came from pre-DDL source pull discipline that the rule operationalises | — | — |
| ~~D-02, D-03, D-06~~ | — | — | **All resolved 30 Apr.** | — | — |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content | PK decides | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 scope (per D180) or keep separate | P2 | Carry-over | PK confirms | morning sync_state |
| D-07 | **Property Pulse + NDIS-Yarns IG specific recovery path** (now both clients) | P1 | T07 step 4 attempt confirmed both PP and NDIS-Yarns are flagged | Per T05 Meta conversation outcome | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| ~~D-08~~ | ~~F-PUB-004 fix scope~~ | — | **DECIDED 2026-05-01 — NARROW.** v2.6 strengthens: source pull confirms LinkedIn publisher truncates body at publish — auto-approver length-cap rejection was operationally pointless. Cap and keyword changes belong upstream/per-client; T08 stays narrow | — | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| ~~D-09~~ | ~~F-PUB-005 fix now or backlog?~~ | — | **DECIDED 2026-05-01 — promoted to T12 P1 (simpler design option).** **REFRAMED v2.6 — T12 is now defence-in-depth post-T13**; T13 (publisher gate) is the primary fix. Architectural note: F-PUB-005 isn't really a trigger bug — it's that the consumer (publisher) was missing the gate the architecture relied on | — | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |
| **D-10 (NEW v2.6)** | **T13 gate location: per-row in publisher loop, in `publisher_lock_queue_v2` RPC, or both?** | P0 | Per-row in EF loop (option a): simplest, smallest patch, gates each draft individually as it loads. Lock-time RPC gate (option b): cleaner architecturally, prevents non-approved rows from even being locked, but requires SQL function change. Both (option c): defence-in-depth. **My recommendation**: option (a) for T13 (smallest safe patch); option (b) added later as architectural cleanup once T13 stabilises. Avoid option (c) for now (two changes at once = harder to verify) | When T13 is being drafted — i.e. now | tonight's source pull |

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
| **B22** | **Investigate ai-worker prompt for per-client length cap enforcement** | P2 → **promote candidacy** | After T08 patch landed AND fresh approvals confirmed. **v2.6 finding**: publisher truncates LinkedIn at 3000 chars regardless — strengthens case that ai-worker prompt-side cap is the right place for this discipline (so drafts don't get rejected by auto-approver for being over a synthetic cap) | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| ~~B23~~ | ~~F-PUB-005 trigger gate-on-approval fix~~ | — | **PROMOTED to T12 (P1, defence-in-depth post-T13) 2026-05-01 v2.6.** | — |
| **B24 (NEW v2.6)** | **Replace LinkedIn Zapier bridge with direct `linkedin-publisher`** | P2 | When LinkedIn Community Management API is approved (per existing F06 trigger). The current bridge was a stopgap that was never hardened with the approval gate; T13 patches it but the better long-term move is the direct publisher | F06 trigger overlap; tonight's source pull |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor | Manual cycle 5+ per D181 | D181, D184 |
| ~~F04~~ | — | **PROMOTED to Active 2026-04-30.** | — |
| F05 | D156 (deferred per ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) — direct integration | LinkedIn Community Management API approval / Late.dev evaluation 13 May. **Note (v2.6)**: B24 captures the same architectural target | userMemories entry 2 |
| F07 | Grok red-team agent evaluation | Only if T04 ChatGPT calibration is noisy | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| F08 | Large m-schema tables column-purpose work | After F04 + B20 complete | After today's 5-brief sweep |

---

## 🎓 Canonical Lessons

- **Lesson #46 (PROMOTED 30 Apr v2.2)** — **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."**
  - Operationalized as: standing checks S8 (cron-level), S9 (OAuth/token-level), S10 (business-outcome-level), S11 (auto-approver-business-outcome), **S12 (approval-gate-compliance, NEW v2.6)**.
  - Operationalized as: OTL stream O-01 through O-10 (v2.6 added O-10 publisher approval-gate audit).
  - Operationalized as: pre-DDL verification gate (O-04) — **vindicated tonight when pre-DDL source pull for T12 surfaced the LinkedIn publisher gate-missing issue (T13)**.
  - Operationalized as: T09 safe-to-resume publisher checklist; T13 publisher gate; T15 publisher gate audit.
  - **F-PUB-004 (auto-approver starvation) and F-PUB-005-actually-publisher-gate (LinkedIn unreviewed publishing) are the two most direct applications of #46 to date.**

- **Lesson #47 candidate (RAISED v2.6 from 3-catch to 4-catch + 1 pre-DDL discovery)** — **"Investigation following the source-of-truth principle reliably surfaces issues deeper than the initial hypothesis. Each red-team layer reveals the next."**
  - Tonight: trigger fix (averted) → bulk-quarantine fix (averted) → action_list missing controls (caught) → D-09 reframing (caught) → pre-DDL source pull → LinkedIn publisher gate-missing (caught).
  - Five catches in one session. Pattern strong enough to consider promoting Lesson #47 from candidate to canonical at next R10 application.

---

## Update protocol

1. **At session start**: Rebuild Today/Next 5; Run S1–S12 (S12 added v2.6); Surface time-bound items; Ask PK about personal businesses
2. **As work happens**: Item moves Backlog → Ready → Active → (removed)
3. **At session end**: Verify nothing missed; Move follow-ups; Update timestamp; Sync with sync_state
4. **Done items removed** from this file; audit trail in commits / run states / decisions log
5. **No silent additions**: Every new item references its source
6. **Standing rule extension** (memory entry 11 four-way sync): sync_state, decisions, dashboard roadmap, **action_list (this file)**
7. **Standing rule (per D-01 ratification)**: every production patch and every action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy / commit. Bookkeeping bumps documenting state (e.g. v2.6 capturing tonight's investigation findings) may proceed without ChatGPT review at PK's explicit go-ahead

---

## v2.6 honest limitations

- All v2.5 limitations still apply.
- **v2.6 was committed without ChatGPT cross-check** per PK's explicit go-ahead. Justified as a state-capture bookkeeping update rather than a directive-introduction. Strict rule resumes from v2.7 onward.
- **The 28 needs_review LinkedIn published drafts figure is a 14-day snapshot, not a total.** The actual count since `linkedin-zapier-publisher` v1.0.0 was first deployed (created 2026-03-12 per EF metadata) could be considerably higher. T16 should query the full window when executed.
- **T12 reframing means F-PUB-005 nomenclature is now slightly misaligned**: the original F-PUB-005 framing was "trigger doesn't gate on approval"; v2.6 finding is "publisher doesn't gate on approval." Original framing isn't wrong (the trigger does enqueue regardless), but the operational consequence was always at the publisher. Captured for postmortem (R13) clarity.
- **D-10 needs PK call before T13 drafting begins.** My recommendation is option (a) per-row gate; PK + ChatGPT may prefer (b) lock-time RPC.
- **T15 verification is itself a potential disruption source**: pulling FB or WordPress publisher source might surface another gate-missing issue and re-order priorities again. This is the desired behaviour but worth flagging.
- **The PK-action items (T05 Meta dev support, T06 YT OAuth, T16 content audit) are still PK-only.** Chat can't accelerate them.

---

## Changelog

- **v1.0–v1.6** (30 Apr Thu evening through 30 Apr Fri afternoon): initial creation through R02 brief queued; T05 added.
- **v1.7** (30 Apr Fri evening): R02 closed.
- **v1.8** (30 Apr Fri evening): B17 + B18 closed.
- **v1.9** (30 Apr Fri evening): R03 cycle 2 audit closed; B19 + S7 added.
- **v2.0** (30 Apr Fri late evening): publisher operational audit committed; T06 + T07 + B20 + B21 + S8 added.
- **v2.1** (30 Apr Fri late evening): ChatGPT cross-check halted wrong YT trigger fix; S9 added; F-PUB-001 corrigendum.
- **v2.2** (30 Apr Fri late evening): T07 step 1 applied; OTL captured (O-01..O-06); Lesson #46 promoted; S10 added; R12 added.
- **v2.3** (1 May Fri early morning UTC, ~00:30 UTC): T07 step 4 attempted+rolled-back; F-PUB-004 + F-PUB-005 discovered; T08 + D-08 + D-09 + B22 + B23 + S11 added.
- **v2.4** (1 May Fri evening Sydney): ChatGPT red-team pass on v2.3 caught 7 structural gaps; T09 + T10 + T11 + R13 + O-07 + O-08 + O-09 added; acceptance criteria on T05/T06/T07/T08.
- **v2.5** (1 May Fri evening Sydney): D-01 RATIFIED; D-08 → narrow; D-09 → T12 P1; B16 + B23 closed; R14 created; Lesson #47 candidate captured.
- **v2.6** (1 May Fri evening Sydney, ~+45min after v2.5): **LinkedIn publisher approval-gate discovery via pre-DDL source pull.** `linkedin-zapier-publisher` v1.0.0 confirms NO approval gate. 28 needs_review LinkedIn drafts published in 14d. **T13 P0** (publisher gate) added; **T14 P0** (cross-post RPC audit) added; **T15 P0** (FB+IG+WordPress gate verification) added; **T16 P1** (28-draft content audit) added; **T12 reframed P1** (defence-in-depth post-T13). T07 step 4 sequence updated. **D-10** opened (T13 gate location). **S12** standing check added (approval-gate compliance). **O-10** added (publisher approval-gate audit). **B24** added (replace Zapier bridge with direct LinkedIn publisher). **Lesson #47 candidate raised** from 3-catch to 4-catch + 1 pre-DDL discovery (5 total catches in one session). F-PUB-005 reframed: not a trigger bug, a missing publisher gate. R13 postmortem scope expanded.
