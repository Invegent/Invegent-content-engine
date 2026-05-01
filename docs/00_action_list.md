# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-05-01 Friday evening Sydney (v2.7 — **T15 publisher-gate audit completed**: IG ✅, WP ✅, FB ❌, LinkedIn ❌, YT ❌. Three publishers need approval-gate patches. **T13 scope retained** (LinkedIn). **T17 P0 added** (YouTube — replaces ChatGPT's flagged audit-only ticket; now full patch + gate before T06/T11 replay). **T18 P0 added** (Facebook publisher — confirmed missing gate). **D-10 + D-11 resolved**: per-row loop pattern for queue-based publishers (FB, LinkedIn — mirror IG); SQL fetch-time filter for direct-read publishers (YT — mirror WordPress). T07 step 4 + T06/T11 sequencing updated. **Lesson #47 candidate at 6 catches in 24h**).

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

**Standing rule (per D-01 ratification, 2026-05-01)**: every production patch and every action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy / commit. **v2.7 honest limitation**: this bump was committed without ChatGPT cross-check per PK's standing go-ahead for state-capture bumps. Resume strict rule application at v2.8 if it introduces directives. Code patches (T08/T13/T17/T18/T09/T10/T14) all go through ChatGPT before deploy.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **This section is curated, not maintained.** Chat regenerates the table below at every session start. Maximum 5 rows.
>
> **Last rebuilt:** 2026-05-01 Friday evening Sydney post-T15 completion.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 (standing rule entry 19) | ICE is bonus, not driver | Cleared at session open — reconfirm next session |
| 2 | **Publisher gate batch — T13 + T17 + T18** (THREE-TICKET P0 BATCH) | P0 | Three publishers confirmed missing approval gate. LinkedIn already published 28 unreviewed posts; FB publishes everything regardless; YT will start uploading on T06 reconnect | Chat authors all three patches: T13 LinkedIn (per-row), T18 FB (per-row), T17 YT (fetch-time). ChatGPT review batch. PK deploys all three in same window |
| 3 | **T08 — Author auto-approver patch (F-PUB-004 narrow)** | P0 | Largest known production issue at session start; LinkedIn 64-draft buffer still drying up | Chat authors TypeScript patch (D-08 narrow); ChatGPT review; PK deploys |
| 4 | **T14 — Audit `crosspost_facebook_to_linkedin` RPC** | P0 | Second unguarded LinkedIn enqueue path. Must be characterised before T13 deploy is verified clean | Chat pulls RPC source; documents in audit run state |
| 5 | **T09 + T10 — paired chat-authoring** | P0 | T09 = methodology (safe-to-resume); T10 = pre-fix data disposition. Both required before any cron flip | Chat authors both as docs; ChatGPT review; PK executes T10 + walks T09 |

T05/T06/T11/T12/T16 remain P1 in Time-bound table; not on tonight's chat-authoring critical path. **T06 now blocked by T17** (cannot reconnect YT OAuth until YT publisher has approval gate).

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
| S10 | **Business-outcome publish check** | `SELECT platform, COUNT(*) FROM m.post_publish WHERE created_at > NOW() - INTERVAL '24 hours' AND status='published' GROUP BY platform` | Any expected-publishing platform with 0 rows in 24h → investigate |
| S11 | **Auto-approver business outcome** | `SELECT COUNT(*) FROM m.post_draft WHERE approval_status='approved' AND updated_at > NOW() - INTERVAL '24 hours' GROUP BY platform` | Any platform with 0 fresh approvals in 24h → auto-approver may be starving |
| S12 | **Approval-gate compliance check** | `SELECT pp.platform, pd.approval_status, COUNT(*) FROM m.post_publish pp JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id WHERE pp.created_at > NOW() - INTERVAL '24 hours' AND pp.status='published' GROUP BY pp.platform, pd.approval_status` | Any platform with `published` posts where draft was `'needs_review'` or `'rejected'` at publish time → publisher gate failed |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| ~~T01~~ | ~~Phase B +24h observation checkpoint~~ | — | — | — | **DONE 2026-05-01 00:30 UTC at +21h. All 5 targets pass. Zero alerts since deploy.** | [obs run state](audit/runs/2026-05-01-phase-b-+24h-obs.md) |
| T02 | **Gate B exit decision** | P0 | Sat 2 May | PK + chat | **Default: exit on schedule.** Re-check obs delta at full +24h mark | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only | calendar |
| T04 | **R01 calibration session** | P1 | Sun 3 May or Mon 4 May | PK + chat | 90min hard cap. ChatGPT first | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| T05 | **Meta dev support contact** | P1 | ASAP — Mon 4 May at latest | PK | Single Meta dev support conversation covers all four: business verification + PP IG block + NDIS-Yarns IG block + App Review status. **Done when** = outcome of all four documented; PP and NDIS-Yarns IG have either a clear unblock path with timeline or final verdict | [docs/05_risks.md](05_risks.md), [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 |
| T06 | **Reconnect YouTube OAuth** | P1 | Within 7 days — **BUT BLOCKED ON T17** (NEW v2.7) | PK | **DO NOT reconnect OAuth until T17 deployed.** Once T17 lands and YT publisher gates on approval, then dashboard: Clients → Connect → YouTube for NDIS-Yarns + PP + Invegent. **Done when** = each of 3 clients has valid refresh token; T17 gate verified active; one dry-run token refresh succeeds; one controlled YT upload succeeds (gated on T11); `m.post_publish` audit row with non-null `platform_post_id` | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-001 corrigendum + [v2.7 T15 finding] |
| T07 | **Instagram publisher recovery** (steps 1-2 done, step 4 attempted+rolled-back) | P1 | Gated on T08 + T10 + T09 + T05 | mixed | **Step 1 ✅ DONE 2026-04-30**. **Step 2 ✅ DONE**. **Step 3 skipped**. **Step 4 ⚠ ATTEMPTED+ROLLED-BACK 2026-05-01 00:00→00:19 UTC**. **REVISED step 4 sequence (per v2.7)**: (a) deploy T08 auto-approver patch; (b) walk T09 safe-to-resume checklist; (c) execute T10 disposition on pre-T08 IG queue rows; (d) wait for fresh CFW or Invegent IG draft to reach `approved`; (e) cron re-enable with `?limit=1`. **IG publisher already correctly gates** (T15 verified) — no IG-publisher patch needed. **Done when** = (i) unaffected IG clients (CFW + Invegent) publish via cron; (ii) PP/NDIS-Yarns IG remain not picked up; (iii) IG aged-row count trends down; (iv) zero new Meta 403/2207051/2207027 errors in 24h | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| **T08** | **Author auto-approver patch (F-PUB-004 fix — NARROW per D-08)** | P0 | This session — author; deploy this week | chat (authors) → ChatGPT (review per D-01) → PK (deploys) | Two changes to `supabase/functions/auto-approver/index.ts`: (1) **stratify fetch** by (client, platform); (2) **add reject-cooldown / terminal state** — skipped drafts move to `'rejected'` with `rejection_reason`. **NO length-cap or keyword-list changes** (D-08 narrow). **Done when** = (i) per-bucket fetch verifiable; (ii) skipped drafts move to terminal `'rejected'` with `rejection_reason`; (iii) fresh `'approved'` rows across CFW IG + Invegent IG + LinkedIn within 1 cron cycle; (iv) S11 non-zero | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| **T09** | **Author safe-to-resume publisher checklist** | P0 | This session — author; walk before each future cron flip | chat (authors) → ChatGPT (review) → PK (walks before each cron flip) | Author `docs/operations/safe_to_resume_publisher.md`. Reusable checklist; cites S10 + S11 + S12. **Done when** = checklist authored, reviewed, cited in T07 step 4 sequence, walked successfully on T07 IG re-enable | tonight's red-team |
| **T10** | **Quarantine/review pre-T08 queue rows + pre-T13/T18 LinkedIn/FB queue rows** | P0 (scope expanded v2.7) | This session — author; execute post-T08+T13+T18 deploy | chat (authors disposition) → ChatGPT (review) → PK (executes per population) | Three populations: **(P-A)** IG queue rows referencing `needs_review` drafts (created via F-PUB-005) — disposition: mark queue rows terminal; **(P-B)** ~30 score-DESC drafts re-cycling in auto-approver fetch — explicit operator decision per draft; **(P-C, NEW v2.7)** LinkedIn AND FB queue rows referencing `needs_review` drafts not yet published — disposition: hold pending T13+T18 deploy; once gates active, drafts will requeue with `not_approved:<status>` and operator decides per draft (approve/reject). 64 pre-25-Apr LinkedIn `approved` queue rows are NOT in scope. **Done when** = all three populations dispositioned with audit trail | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 + F-PUB-005 |
| T11 | **YouTube failed-draft replay plan** | P1 | After T17 + T06 done | chat (authors) → ChatGPT (review) → PK (executes) | Author replay SQL with strict eligibility filter: `video_status='failed'` AND `draft_format ? 'youtube_upload_error'` AND `youtube_video_id IS NULL` AND `video_url IS NOT NULL` AND no successful `m.post_publish` row. **NEW v2.7**: also include `approval_status='approved'` filter (post-T17 gate matches this). **Done when** = SQL authored + reviewed; on T06 reconnect, executed against eligible drafts; result audit captured | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 + T17 dependency |
| T12 | **F-PUB-005 fix — trigger gate-on-approval patch** (defence-in-depth, post-T13/T17/T18) | P1 | After publisher-gate batch + observation window | chat → ChatGPT → PK | Reframed v2.6: T12 is defence-in-depth, post-T13/T17/T18. Architecture is "enqueue-everything trigger + gate-at-publisher" — once all consumers gate properly, trigger gate is bonus. **Done when** = trigger function updated; test inserts verified; zero new F-PUB-005-class queue contamination in 24h post-deploy | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |
| **T13** | **Add approval gate to `linkedin-zapier-publisher`** (PER-ROW pattern, mirror IG) | P0 | This session — author; deploy this week | chat (authors) → ChatGPT (review per D-01) → PK (deploys via Supabase EF dashboard) | Per-row gate inside the publisher loop, mirror IG v2.0.0 exactly: extend draft SELECT to include `approval_status`, add check after load — if `!== 'approved'` then requeue 60min, `status='queued'`, `last_error='not_approved:<status>'`, no `post_publish` row, results.push held. v1.0.0 → v1.1.0. **Done when** = (i) source updated and ChatGPT-reviewed; (ii) deployed; (iii) zero new `'needs_review'`-state LinkedIn published rows for 24h post-deploy; (iv) v1.1.0 logged; (v) S12 confirms compliance | [v2.6 source pull, v2.7 T15] |
| **T14** | **Audit `crosspost_facebook_to_linkedin` RPC** | P0 | This session — investigate; patch this week if needed | chat (investigates source) → propose fix per findings | Pull RPC source via `pg_get_functiondef`. Document behaviour. Decide: (a) RPC needs approval gate (defence-in-depth); (b) T13's per-row gate sufficient because cross-posted rows still go through publisher loop. **Done when** = source documented; decision recorded; if patch needed, scoped as T14b | tonight's source pull |
| ~~T15~~ | ~~**Verify approval gates on FB + IG + WordPress publishers**~~ | — | — | — | **DONE 2026-05-01 evening — five publishers audited.** Findings: IG ✅ gates (per-row, gold standard), WP ✅ gates (SQL fetch-time filter), FB ❌ missing (selects but no check, F-PUB-005-class), LinkedIn ❌ missing (doesn't even select), YT ❌ missing (reads `m.post_draft` directly with no filter). Three new tickets created: T13 (LinkedIn, retained), T17 (YT NEW), T18 (FB NEW). Audit doc to be authored as part of R13 postmortem rather than standalone | tonight's source pull |
| T16 | **Audit needs_review LinkedIn published drafts (content-quality review)** | P1 | This week — PK time | PK reviews; chat surfaces list | Chat queries full window since `linkedin-zapier-publisher` v1.0.0 deployment (created 2026-03-12) for blast-radius count + risk stratification. Staged review: (1) last 14 days first (28 known); (2) any with risky/compliance keywords; (3) high-visibility clients; (4) older low-risk if manageable. **Done when** = blast-radius count documented; staged review tier 1 complete (last 14d); each draft dispositioned (acceptable / delete-from-LinkedIn / repost-corrected) | tonight's data query, ChatGPT v2.6 review |
| **T17 (NEW v2.7, replaces ChatGPT's flagged audit ticket)** | **Add approval gate to `youtube-publisher`** (FETCH-TIME pattern, mirror WordPress) | P0 | This session — author; deploy before T06 OAuth reconnect | chat (authors) → ChatGPT (review per D-01) → PK (deploys via Supabase EF dashboard) | SQL fetch-time filter — add `.eq('approval_status', 'approved')` to the existing draft SELECT in `Deno.serve` of `youtube-publisher` v1.5.0 → v1.6.0. **Different pattern from T13/T18** because YT is a direct-read publisher (reads `m.post_draft` directly, no queue). Fetch-time filter is cleaner here than per-row check. **CRITICAL SEQUENCING**: T17 must deploy before T06 OAuth reconnect — otherwise YT will start uploading on reconnect anything `video_status='generated'` regardless of approval. **Done when** = (i) source updated (single line addition to draft SELECT); (ii) ChatGPT-reviewed; (iii) deployed v1.6.0; (iv) one dry-run with `approval_status='needs_review'` draft confirms it's NOT picked up; (v) T06 reconnect cleared to proceed | [v2.7 T15 finding, ChatGPT v2.6 review] |
| **T18 (NEW v2.7)** | **Add approval gate to `publisher` (FB)** (PER-ROW pattern, mirror IG) | P0 | This session — author; deploy this week | chat (authors) → ChatGPT (review per D-01) → PK (deploys via Supabase EF dashboard) | Per-row gate inside the publisher loop, mirror IG v2.0.0. The FB publisher already SELECTs `approval_status` (verified via source pull) — only needs the `if (draft.approval_status !== 'approved')` check after the existing load. v1.7.0 → v1.8.0. **Note (v2.7)**: FB's current data shows all published drafts as `approval_status='published'` because publisher updates that state post-publish. Adding the gate doesn't break the FB flow but does prevent any future manual-needs-review drafts from being silently published. **Done when** = (i) source updated and ChatGPT-reviewed; (ii) deployed; (iii) test draft with `approval_status='needs_review'` confirmed held with `not_approved:needs_review`; (iv) S12 confirms compliance | [v2.7 T15 finding, ChatGPT v2.6 review] |

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

## 🏗 Operational Truth Layer (strategic stream)

> **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."** v2.7 sharpening: gate patterns differ by consumer architecture — queue-based publishers gate per-row in the loop; direct-read publishers gate via SQL fetch-time filter. Both are valid; the right one is determined by the consumer's existing architecture, not by global preference.

| ID | Item | Priority | Owner | First action | Notes |
|---|---|---|---|---|---|
| **O-01** | **Platform-source-of-truth map** | P1 — escalated | chat | Author `docs/operations/platform_source_of_truth.md` with one row per platform. Columns: source table, queue path (or "direct"), publisher EF + version, **approval gate location + pattern (NEW v2.7: per-row vs fetch-time)**, success marker, failure marker, token location, recovery owner | Most enabling piece. v2.7: the gate-pattern-by-architecture finding goes here |
| **O-02** | **Per-client/platform circuit breakers** | P2 | chat + PK | Step 1: audit each publisher EF for whether it honors `publish_enabled` (IG v2.0.0 confirmed; FB confirmed via T15; LinkedIn confirmed via T15; YT confirmed via T15; WordPress confirmed via T15). Step 2: design auto-trip on N consecutive failures. Step 3: alert via existing notifier path | T15 substantially closed Step 1 |
| **O-03** | **Business-outcome monitors** | P1 | chat | Author `m.fn_business_outcome_health()` with per-platform metrics including S10/S11/S12 fields | S10+S11+S12 in place as manual versions |
| **O-04** | **Pre-DDL verification gate** (formal checklist) | P2 | chat | Append to `docs/audit/decisions/migration_naming_discipline.md` | v2.6+v2.7 vindication: pre-DDL pull caught the LinkedIn/FB/YT gate-missing issues |
| **O-05** | **External-account health checks** (daily matrix) | P1 | chat | Build `m.vw_external_account_health` view | Closely parallels S9 + S11 + S12 |
| **O-06** | **Recovery playbooks by failure class** | P2 | chat | Author `docs/operations/recovery_playbooks.md` covering: (1) OAuth token expired; (2) Meta anti-spam block on single account; (3) Audit trail broken; (4) Auto-approver starvation; (5) **Publisher missing approval gate (NEW v2.6)** | Each playbook is short — a 5-step recovery checklist |
| **O-07** | **Production change packet** (formal pre-fix discipline) | P1 — operationalises D-01 | chat | Author `docs/operations/production_change_packet.md` template | v2.6+v2.7 vindication: "source-of-truth code path" step is what caught tonight's discoveries |
| **O-08** | **Disabled-publisher-with-growing-queue alert** | P1 | chat | Specific instance of O-03 deserving first-class status | Net-additive to O-03 |
| **O-09** | **OAuth/token lifecycle monitor** (proactive) | P1 | chat | Active-alerting layer above O-05's view | Proactive complement to S9 |
| **O-10** | **Publisher approval-gate audit (one-time + ongoing)** | P0 — partially in flight as T13/T17/T18 | chat | T15 one-time audit complete (v2.7). Ongoing: every new or modified publisher EF must include explicit approval-gate test in PR review (captured as part of O-07 production change packet template). **NEW v2.7**: B24 acceptance criterion — direct `linkedin-publisher` (when built) must include gate from day-1 | T15 closed; ongoing discipline carried forward |
| **O-11 (NEW v2.7)** | **Gate-pattern documentation** | P2 | chat | Document the two valid gate patterns and when each applies. Per-row loop pattern (IG, FB, LinkedIn) for queue-based publishers — allows requeue with cooldown. SQL fetch-time filter pattern (WordPress, YT) for direct-read publishers — prevents draft from being selected. New publishers must use the pattern matching their architecture | New finding from v2.7 T15 audit |

---

## 🟢 Ready / Strategic (next-session candidates)

| ID | Item | Priority | Owner | Estimated time | Next action | Source |
|---|---|---|---|---|---|---|
| ~~R01–R06~~ | ~~Various~~ | — | — | — | **All closed 30 Apr.** | — |
| R07 | Update `invegent-dashboard` roadmap milestone | P3 | chat | 10min | Bundle into single dashboard update | standing rule entry 11 |
| R08 | **Meta App Review status check** | P1 | PK | 5min | OVERLAPS WITH T05 | userMemories entry 4 |
| R09 | **Author reconciliation v2 brief** | P1 | PK + chat | 30-45min | After T01 + T02 + personal businesses check | [spec capture](briefs/reconciliation-v2-spec.md) |
| R10 | **Phase C cutover live pilot — apply red-team review** | P1 | PK + ChatGPT + chat | ~30min added to Phase C cutover review | When Phase C cutover brief is drafted. **D-01 ratified — first formal application** | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| R11 | **Cycle 3 audit run** | P3 | chat + ChatGPT | 5min + 30min + closure | Run refreshed brief on a future day | D181 manual loop |
| R12 | **Define Operations Auditor role** | P1 | chat | When O-01 + O-03 + O-05 are authored | Tonight's PK feedback explicitly called for this |
| R13 | **Publisher incident postmortem (1 May session)** | P2 → expanded scope further | chat (authors) → PK (review) | 90-120min authorship (was 60-90min v2.6) | Author `docs/audit/postmortems/2026-05-01-publisher-incident.md`. Cover: (1) wrong YT trigger fix averted; (2) auto-approver starvation discovery; (3) wrong bulk-quarantine averted; (4) v2.3→v2.4 missing-controls catch; (5) D-09→T12 reframing; (6) **pre-DDL T12 led to LinkedIn publisher gate-missing (v2.6)**; (7) **ChatGPT v2.6→v2.7 review caught FB+YT also missing gates**; (8) F-PUB-005 reframed; (9) the 28+ unreviewed LinkedIn published drafts; (10) gate-pattern by architecture finding; (11) permanent guardrails (S10/S11/S12/OTL/T08/T09/T10/T13/T17/T18). **6 distinct red-team catches in one session** — strongest D-01 ratification evidence to date. Append T15 audit findings inline rather than as separate doc | tonight's session |
| R14 | **D185 entry to `docs/06_decisions.md`** | P1 | chat | 15min | Author D185 entry capturing D-01 ratification context (6 catches), standing rule wording, evidence pile, retirement-condition language | Per 4-way sync standing rule | D-01 closure |

---

## 🤝 Pending decisions (waiting on PK call)

| ID | Decision | Priority | Notes | Next action | Source |
|---|---|---|---|---|---|
| ~~D-01~~ | ~~Adopt structured_red_team_review_v1?~~ | — | **DECIDED 2026-05-01 — RATIFIED.** v2.7 strengthens further: 6th catch came from ChatGPT review of v2.6 finding FB+YT gate-missing without my prompting | — | — |
| ~~D-02, D-03, D-06~~ | — | — | **All resolved 30 Apr.** | — | — |
| D-04 | Invegent thin-pool resolution path | P2 | 142 of 155 Invegent canonicals had no body content | PK decides | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md), D174 |
| D-05 | Stage 1.2 brief — merge into Stage 2.2 (per D180) or keep separate | P2 | Carry-over | PK confirms | morning sync_state |
| D-07 | **Property Pulse + NDIS-Yarns IG specific recovery path** | P1 | T07 step 4 attempt confirmed both flagged | Per T05 Meta conversation outcome | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-002 corrigendum |
| ~~D-08~~ | ~~F-PUB-004 fix scope~~ | — | **DECIDED — NARROW.** v2.7 strengthens further | — | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| ~~D-09~~ | ~~F-PUB-005 fix now or backlog?~~ | — | **DECIDED — promoted to T12 P1, REFRAMED v2.6 — defence-in-depth post-T13/T17/T18.** Once all 5 publisher-side gates are in place, trigger gate is bonus | — | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-005 |
| ~~D-10~~ | ~~T13 gate location: per-row vs lock-time RPC vs both?~~ | — | **DECIDED 2026-05-01 (ChatGPT review).** Per-row in publisher loop. Lock-time RPC gate explicitly rejected (would hide the problem at lock time and leave queue rows sitting silently). Per-row is clearer because it explicitly records `not_approved:<status>` and surfaces in S12. T13 + T18 both use per-row pattern (mirror IG) | — | [v2.6 ChatGPT review] |
| **D-11 (NEW v2.7, RESOLVED same session)** | **Which gate pattern for which publisher?** | — | **RESOLVED 2026-05-01.** Two distinct valid patterns by publisher architecture: **per-row in loop** for queue-based publishers (FB, LinkedIn — mirror IG); **SQL fetch-time filter** for direct-read publishers (YT — mirror WordPress). Decision driven by existing architecture rather than global preference. Captured as O-11 standing documentation. T13 + T18 use per-row; T17 uses fetch-time | — | [v2.7 T15 audit] |

---

## 📌 Backlog (known, not prioritised yet — awaits trigger)

| ID | Item | Priority | Trigger to promote to Ready | Source |
|---|---|---|---|---|
| B01 | 9 LOW-confidence column rows joint session | P2 | Joint operator+chat session scheduled | [post-publish followup](audit/decisions/post_publish_observability_low_confidence_followup.md) |
| B02 | 27 Apr fill-pending-slots constraint race investigation | P2 | Before Phase C cutover begins | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B03 | Provider diversification on retry | P2 | After +24h obs window confirms body-health filter held alone | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B04 | Stub-content classifier improvements | P3 | When upstream classifier work resumes | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B05 | 27 Apr cron infrastructure pause investigation | P3 | Only if pattern recurs | [Phase B run state](runtime/runs/phase-b-patch-image-quote-body-health-2026-04-30T033748Z.md) |
| B06 | Branch hygiene sweep (10 stale branches) | P3 | Session prep window | [morning sync_state](00_sync_state.md) |
| B07 | Phase B filename hygiene rename | P3 | Cosmetic | [morning sync_state](00_sync_state.md) |
| B08 | CC Phase C final report file | P3 | When Phase C cutover planning begins | [morning sync_state](00_sync_state.md) |
| B09 | Pre-sales: A11b + A4→A3 + A18 + A6 | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B10 | YouTube channel ingest activation | P2 | When YouTube layer earns build | [docs/briefs/2026-04-08-youtube-channel-ingest.md](briefs/2026-04-08-youtube-channel-ingest.md) |
| B11 | Manual newsletter subscription setup | P3 | When PK has 30min | userMemories entry 8 |
| B12 | Nightly pipeline health Cowork task | P2 | Trigger met today; awaits bandwidth | userMemories entry 23 |
| B13 | Telegram channels + `claude rc` + Opus 4.6 1M context | P3 | When useful trigger emerges | userMemories entry 23 |
| B14 | `docs/15_pre_post_sales_criteria.md` classification | P2 | Next focused pre-sales session | [docs/14_pre_sales_audit_inventory.md](14_pre_sales_audit_inventory.md) |
| B15 | Phase E — Invegent vertical signal weighting | P2 | After thin-pool decision (D-04) | userMemories entry 29, D174 |
| ~~B16~~ | ~~Red-team review v1 — ratification call~~ | — | **CLOSED 2026-05-01 with D-01 ratification.** | — |
| ~~B17, B18~~ | — | — | **CLOSED 2026-04-30.** | — |
| B19 | Add `idx_slot_filled_draft_id` on `m.slot` | P3 | `m.slot.n_live_tup > 5000` (currently 159) | F-2026-04-30-D-002 closure |
| B20 | m-schema column-purpose continuation — medium tables | P2 | After F04 lands | userMemories "On the horizon" item 5 |
| B21 | Audit heygen/video-worker output for stranded YT slots | P2 | After T06 (PK reconnects YT OAuth) AND a successful upload completes | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-003 |
| B22 | **Investigate ai-worker prompt for per-client length cap enforcement** | P2 | After T08 patch landed AND fresh approvals confirmed | [op audit](audit/runs/2026-04-30-publishers-operational.md) F-PUB-004 |
| ~~B23~~ | ~~F-PUB-005 trigger gate-on-approval fix~~ | — | **PROMOTED to T12 (P1, defence-in-depth post-T13/T17/T18).** | — |
| **B24** | **Replace LinkedIn Zapier bridge with direct `linkedin-publisher`** | P2 | When LinkedIn Community Management API is approved (per F06). **NEW v2.7 acceptance criterion**: direct `linkedin-publisher` must include approval gate from day-1 (per O-10 ongoing discipline). Cannot ship without it | F06 trigger overlap; tonight's source pull; v2.7 T15 |

---

## 🧊 Frozen / Deferred (explicit trigger conditions)

| ID | Item | Trigger to revisit | Source |
|---|---|---|---|
| F01 | D182 Phase 4b — GitHub Actions validation | When a brief actually demands cloud-side validation | D183 |
| F02 | D182 Phase 4c — OpenAI API answer step | When a brief generates real questions PK cannot trivially answer | D183 |
| F03 | Audit Slice 3 — auto-auditor | Manual cycle 5+ per D181 | D181, D184 |
| ~~F04~~ | — | **PROMOTED to Active 2026-04-30.** | — |
| F05 | D156 (deferred per ID003 fix scope) | Pending completion when ICE has bandwidth | userMemories entry 5 |
| F06 | LinkedIn publisher (Phase 2.3) — direct integration | LinkedIn Community Management API approval / Late.dev evaluation 13 May. **B24 captures same target with v2.7 day-1 gate criterion** | userMemories entry 2 |
| F07 | Grok red-team agent evaluation | Only if T04 ChatGPT calibration is noisy | [proposal](runtime/structured_red_team_review_v1_proposal.md) |
| F08 | Large m-schema tables column-purpose work | After F04 + B20 complete | After today's 5-brief sweep |

---

## 🎓 Canonical Lessons

- **Lesson #46 (PROMOTED 30 Apr v2.2)** — **"Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer."**
  - Operationalized as: standing checks S8/S9/S10/S11/S12.
  - Operationalized as: OTL stream O-01 through O-11 (v2.7 added O-11 gate-pattern documentation).
  - Operationalized as: pre-DDL verification gate (O-04) — **vindicated three times this session** (LinkedIn gate-missing, FB gate-missing, YT gate-missing).
  - Operationalized as: T09 safe-to-resume; T13/T17/T18 publisher gates; T15 publisher gate audit.
  - **F-PUB-004 (auto-approver starvation) and F-PUB-005-actually-three-publishers-missing-gate are the most direct applications of #46.**

- **Lesson #47 candidate (RAISED v2.7 from 5-catch to 6-catch session)** — **"Investigation following the source-of-truth principle reliably surfaces issues deeper than the initial hypothesis. Each red-team layer reveals the next."**
  - Tonight: trigger fix averted → bulk-quarantine averted → action_list missing controls caught → D-09 reframing → pre-DDL source pull → LinkedIn publisher gate-missing caught → ChatGPT v2.6 review → FB + YT publishers also missing gates caught.
  - Six catches in one session. **Pattern strong enough to promote Lesson #47 from candidate to canonical at next R10 application** (or sooner if R10 is delayed).

- **Lesson #48 candidate (NEW v2.7)** — **"Gate placement is determined by consumer architecture, not global preference."** Queue-based publishers gate per-row in the loop (allows requeue with cooldown). Direct-read publishers gate via SQL fetch-time filter (prevents selection). Both are valid; the right one is determined by the consumer's existing architecture. Captured as O-11 standing documentation.

---

## Update protocol

1. **At session start**: Rebuild Today/Next 5; Run S1–S12; Surface time-bound items; Ask PK about personal businesses
2. **As work happens**: Item moves Backlog → Ready → Active → (removed)
3. **At session end**: Verify nothing missed; Move follow-ups; Update timestamp; Sync with sync_state
4. **Done items removed** from this file; audit trail in commits / run states / decisions log
5. **No silent additions**: Every new item references its source
6. **Standing rule extension** (memory entry 11 four-way sync): sync_state, decisions, dashboard roadmap, action_list (this file)
7. **Standing rule (per D-01 ratification)**: every production patch and every action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy / commit. Bookkeeping bumps (state-capture only) may proceed without ChatGPT review at PK's explicit go-ahead

---

## v2.7 honest limitations

- All v2.6 limitations still apply.
- **v2.7 was committed without ChatGPT cross-check** per PK's standing go-ahead for state-capture bumps. Code patches (T08/T13/T17/T18/T09/T10/T14) all go through ChatGPT before deploy.
- **T15 audit doc not separately authored** — findings captured inline in this file and will roll into R13 postmortem. If a separate `docs/audit/runs/2026-05-01-publisher-gate-audit.md` is wanted, that's a tiny extraction job from this file.
- **The 28-figure for unreviewed LinkedIn published drafts is still a 14-day snapshot.** T16 will pull the full window since `linkedin-zapier-publisher` v1.0.0 deployed (created 2026-03-12 per EF metadata). True blast radius could be considerably higher.
- **FB publisher gate-missing has lower current operational impact** than LinkedIn because FB's auto-approve flow doesn't transit `'approved'` state explicitly — but the gate is still semantically wrong and would matter the moment FB introduces a manual review step.
- **YouTube publisher gate-missing was unreached via T06 dormancy** — YT cron has been broken since 11 Apr (OAuth) so no unreviewed drafts have been uploaded. T17 catches it BEFORE T06 reconnect, which is the only reason it's not already a published-content incident.
- **The PK-action items (T05, T06, T16) are still PK-only.** T06 is now blocked on T17.
- **Three publisher patches in one deploy window** is a meaningful operational risk surface. Each is small (single-line/few-line change), but coordinated deploy needs care. T09 safe-to-resume checklist must precede each cron flip post-deploy.

---

## Changelog

- **v1.0–v1.6** (30 Apr Thu evening through 30 Apr Fri afternoon): initial creation through R02 brief queued; T05 added.
- **v1.7–v1.9** (30 Apr Fri evening): R02/R03 closed; B17/B18/B19 + S7 added.
- **v2.0–v2.2** (30 Apr Fri late evening): publisher operational audit; OTL captured; Lesson #46 promoted; T06/T07 + S8/S9/S10 added.
- **v2.3** (1 May early UTC): T07 step 4 attempted+rolled-back; F-PUB-004/005 discovered; T08 + D-08/D-09 + S11 added.
- **v2.4** (1 May evening): ChatGPT red-team caught 7 structural gaps; T09/T10/T11/R13 + O-07/O-08/O-09 added.
- **v2.5** (1 May evening): D-01 RATIFIED; T12 created; B16+B23 closed; R14 created; Lesson #47 candidate.
- **v2.6** (1 May evening, +45min): LinkedIn publisher gate-missing discovery; T13/T14/T15/T16 P0/P1 + S12 + O-10 + B24 + D-10 added; T12 reframed defence-in-depth; F-PUB-005 reframed.
- **v2.7** (1 May evening, +1h after v2.6): **T15 audit complete** — IG ✅ WP ✅ FB ❌ LinkedIn ❌ YT ❌. **T17 P0 added** (YT gate, fetch-time, mirrors WordPress) — replaces ChatGPT-flagged audit-only ticket; deploy must precede T06 reconnect. **T18 P0 added** (FB gate, per-row, mirrors IG). **T13 retained** (LinkedIn gate, per-row, mirrors IG). **D-10 RESOLVED**: per-row in publisher loop, not lock-time RPC. **D-11 RESOLVED same session**: gate pattern by publisher architecture (per-row for queue-based; fetch-time for direct-read). **O-11 added** (gate-pattern documentation). T07 + T06 + T11 sequencing updated. **Lesson #47 candidate raised to 6-catch session.** **Lesson #48 candidate added** (gate placement by architecture, not global preference). T10 scope expanded to include LinkedIn + FB pre-fix queue rows. T15 closed; audit findings captured inline pending R13 postmortem rollup.
