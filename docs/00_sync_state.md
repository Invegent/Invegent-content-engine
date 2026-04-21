# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-21 evening (session-close after the biggest single-session reshuffle since project start)
> Written by: PK + Claude session sync

---

## ⚠️ FIRST THING TOMORROW (Wednesday 22 April)

**Read this entire file. Today's session reshaped the week. Yesterday's plan is no longer current.**

Three commits landed today, plus a strategic pivot that pulled D156 (external epistemic diversity layer) forward from Mon 27 Apr to NOW. Claude Code is currently building the external reviewer layer per `docs/briefs/2026-04-21-external-reviewers.md`. Tomorrow's work picks up wherever Claude Code left off Tuesday evening.

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Read `docs/briefs/2026-04-21-external-reviewers.md` — the spec Claude Code is executing
3. Check Claude Code's progress: which acceptance criteria from the brief are met?
4. Read `docs/incidents/2026-04-19-cost-spike.md` — full post-mortem on ID003 (still the dominant operational context)
5. Read `docs/06_decisions.md` D156 + D157 (existing) and look for D158 + D159 (planned, may not be committed yet)
6. Read `docs/15_pre_post_sales_criteria.md` v3 — A24 has been redefined this session (see below)
7. Query `k.vw_table_summary` before working on any table
8. **Session-close SOP (D150):** verify every commit with `git ls-remote origin main | grep <sha>` before asserting it in sync_state

---

## WHAT HAPPENED TUESDAY 21 APRIL — chronology

### Morning — ID003 three-part fix shipped
- **Commit `d12a52c`** — ai-worker v2.9.0
  - Payload diet via `trimSeedPayload()` — replaces `body_text` with `body_excerpt`, strips `raw_html`/`full_content`, caps length
  - Idempotency guard — checks `m.ai_usage_log` for any prior non-error row tied to this `ai_job_id` AND `post_draft.draft_body` populated. **Deviation from incident spec:** removed the 5-minute time window (the original spec's window was shorter than the 20-min sweep interval, which would have missed the actual failure case). Log-existence check is structurally stronger.
  - Fetch timeout 120s `AbortController` on both Anthropic + OpenAI calls
- **Migration `d157_id003_ai_job_retry_cap`** applied:
  - Added `m.ai_job.attempts INT DEFAULT 0`
  - Updated `sweep-stale-running-every-10m` cron (jobid 9): on each requeue, `attempts += 1`. At `attempts >= 3`, promotes to `status='failed'` + `dead_reason='exceeded_retry_limit'`
- **Deployed:** ai-worker v79 per PK's terminal verification
- **Status:** live but unverified — pipeline naturally dormant means no real ai_jobs have run through v2.9.0 yet

### Midday — Roadmap three-tab rebuild shipped
- **Commit `202037c`** — `app/(dashboard)/roadmap/page.tsx` in `invegent-dashboard`
- Three tabs: By Phase / By Layer / By Sales Stage (new)
- 31-item pre-sales gate now visible in dashboard with category sub-groups
- Vercel auto-deployed; live at dashboard.invegent.com/roadmap

### Afternoon — Strategic pivot: D156 pulled forward to NOW
- PK invoked the principle from D156: any work Claude does should be reviewed by external AI before being trusted
- Original sequencing had D156 starting Mon 27 Apr; PK reordered to "before any other work"
- Reframing during design: shifted from internal-pipeline-guardrails (Architect Reviewer catching code bugs) to **outside-looking-in review of Claude's build work itself** (Strategist + Engineer Reviewer reading commits with full repo context)

### Evening — External reviewer brief written and committed
- **Commit `d8a8dc4`** — `docs/briefs/2026-04-21-external-reviewers.md`
- **Architecture decision: Approach C** (full repo with prompt caching) over RAG
  - Repo currently 400-700k tokens, well within Gemini 2.5 Pro's 2M context
  - Prompt caching keeps cost ~$30-50/month realistic
  - RAG documented as optional future investment, NOT mandatory (PK explicit: "I don't see any value we are developing a system within a system within a system")
- Two reviewers: Strategist (Gemini 2.5 Pro) + Engineer Reviewer (GPT-4.1)
- 8 rules total (4 each), DB-stored in `c.external_reviewer_rule`, editable without redeploy
- Weekly Mon 7am AEST digest via Resend email + commit to `docs/reviews/`
- On-demand trigger via dashboard button (single-page minimal addition, only dashboard work this week)
- **Currently in flight:** Claude Code executing the brief

### Evening — Secrets provisioned
- `ICE_GEMINI_API_KEY` ✅ (PK manual, Google AI Studio)
- `GITHUB_PAT_INVEGENT` ✅ (PK manual, fine-grained PAT, all 3 Invegent repos, contents read+write)
- `GITHUB_WEBHOOK_SECRET` ✅ (PK manual, 64-hex random)

---

## REVISED PLAN 22–28 APRIL

The week's plan is now governed by what Claude Code completes Tuesday evening. **D157 cost-guardrails infrastructure (the original Wed-Thu work) is on hold until the external reviewer has reviewed commits `d12a52c`, `202037c`, and the brief itself.**

### Wednesday 22 April — depends on Claude Code progress

**If Claude Code finished Tuesday evening:**
- Configure GitHub webhooks on both `Invegent-content-engine` and `invegent-dashboard` (PK manual, ~5 min via GitHub UI)
- Trigger retroactive reviews of `d12a52c` and `202037c` via the EF's `?retroactive=true` path
- Read first findings — calibrate prompts if needed

**If Claude Code did not finish:**
- PK + chat-Claude pick up wherever it stopped, reading `docs/briefs/2026-04-21-external-reviewers.md` acceptance criteria

### Thursday 23 April — first live reviews
- Configure webhooks (if not done Wed)
- First live commit triggers both reviewers
- Read first weekly digest (or trigger on-demand to get one same day)

### Friday 24 April — D157 cost-guardrails build (resumes only if reviewer is live + has reviewed v2.9.0)
- Original brief: `docs/briefs/2026-04-20-cost-guardrails.md`
- 4 tables, `ai-cost-tracker` EF, dashboard AI Costs panel
- Inbox anomaly monitor brief + build (A29)
- ALSO: CFW + Invegent content_type_prompts (A11b) — content session

### Saturday 25 April — week review
- What did the external reviewer catch?
- Was the prompt tuning needed?
- Calibrate ai-worker v2.9.0 cost data once pipeline runs

### Sunday 26 April — rest

### Monday 27 April — Meta App Review escalation trigger
- If Meta still In Review, contact dev support
- If reviewer layer has demonstrated value, plan Stage 2 (Meta Bank Reconciliation per Saturday brief)

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active, paused on external expansion until cost controls + reviewer layer in place)
**Gate status:** Pre-sales gate NOT CLEARED. 31 total items. **7 closed. 24 open. A24 in flight via Claude Code today.**

**Operational status:** Pipeline dormant (legitimately, not as a bug). 349 populated drafts in pipeline from 17 Apr burst — demand-aware seeder correctly says "supply maxed, no new generation needed". Pipeline will resume naturally as publishers drain the approved queue.

---

## ALL CLIENTS — STATE (POST D155 + ID003 + v2.9.0)

| Client | client_id | FB token | IG config | LI config | Prompts FB/IG/LI | In-pipeline drafts (FB) |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 269 (63 approved + 206 needs_review) |
| Property Pulse | 4036a6b5 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 64 (46 approved + 18 needs_review) |
| Care For Welfare | 3eca32aa | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 16 (13 approved + 3 needs_review) |
| Invegent | 93494a09 | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 0 |

All 4 FB tokens permanent (`expires_at: 0`). D153 (A23) still pending for live revocation detection.

---

## PIPELINE HEALTH

### ai_job status (as of 21 Apr 2026 evening)

| Status | Count | Note |
|---|---|---|
| succeeded | 1052 | Last successful completion 18 Apr 16:40 UTC (pre-ID003-containment) |
| queued | 0 | Empty |
| running | 0 | Empty — pipeline at rest |
| failed | 13 | From ID003 retry-loop termination via OpenAI 429s; not urgent, not leaking |

**Why no new ai_jobs since 18 Apr:**
- Demand-aware seeder (D142) correctly throttles at `in_pipeline >= target_depth`
- 349 populated drafts in pipeline from 17 Apr burst → seeder allows = 0 for all clients
- Pipeline will resume naturally as publishers drain `approved` drafts → demand calc drops below target → seeder produces new seeds
- Estimated drain: ~36 posts/week across 4 clients × FB → 122 approved drafts ≈ 3.4 weeks of natural runway

### Seeder crons (verified firing 22:40 UTC)

| Job | jobid | Active | Last fire result |
|---|---|---|---|
| seed-and-enqueue-facebook-every-10m | 11 | ✅ | Returns 0 seeds (demand maxed) |
| seed-and-enqueue-instagram-every-10m | 64 | ✅ | Returns 0 seeds |
| seed-and-enqueue-linkedin-every-10m | 65 | ✅ | Returns 0 seeds |
| **sweep-stale-running-every-10m** | **9** | ✅ | **NOW FIXED — retry cap at 3 attempts (D157)** |
| ai-worker-every-5m | 5 | ✅ | Returns no_jobs (queue empty) |

Total active crons: 42.

### Publish queue (pre-fix snapshot, may have drained)

| Client | Platform | Queued | Note |
|---|---|---|---|
| Care For Welfare | Facebook | 7 | Publishing continues |
| NDIS-Yarns | Facebook | 10 | Publishing continues |
| Property Pulse | Facebook | 19 | Publishing continues |

**This snapshot is from 20 Apr — may have drained throughout 21 Apr.** Recheck Wed morning.

### Ingest layer health (verified Tuesday afternoon)
- 19 raw items + 20 canonical items in last 72h
- Healthy but quiet — feeds still crawling, just light upstream content volume
- Not a bug, not a blocker

---

## COST STATUS

**April billing cycle:** 1 April → 30 April
**Spent month-to-date:** ~$156 USD (most of which is ID003)
**Anthropic console cap:** $200 USD (raised Mon 20 Apr from $150)
**Headroom remaining this month:** ~$44 USD
**Resets:** 1 May 2026

**Post-fix operating target:** ~$18 USD/month (to be recalibrated after pipeline resumes)

**Stop 1 (Anthropic console) target after fix:** $30 USD/month — will set once cost-guardrails calibration complete

**External reviewer layer cost (new):** ~$30-50/month estimated. Tracked in `m.ai_usage_log` with `content_type='external_review'` once D157 cost panel ships.

---

## DECISIONS LOGGED — RECENT

| ID | Title | Status |
|---|---|---|
| D147 | Pilot structure with liability waiver | ✅ DECIDED |
| D148 | Buyer-risk clause | ✅ DIRECTION SET |
| D149 | Four-advisor architecture | 🔲 BUILD NEXT (deferred — see D156 reframe) |
| D150 | Session-close trust-but-verify protocol | ✅ ADOPTED |
| D151 | Universal table-purpose rule | ✅ ADOPTED |
| D152 | Seeder post_draft.client_id fix | ✅ APPLIED |
| D153 | Token-health cron should call Meta /debug_token live | 🔲 BUILD NEXT |
| D154 | Native LinkedIn draft flow | ✅ APPLIED |
| D155 | Enqueue trigger ON CONFLICT clause fix | ✅ APPLIED |
| D156 | External epistemic diversity layer | 🟢 PULLED FORWARD — building NOW via Claude Code |
| D157 | Two-stop budget enforcement (ICE internal + Anthropic console) | 🟡 PARTIAL — ai-worker fix shipped, cost-guardrails infra on hold |
| **D158** | **External reviewer Approach C (full repo + caching) over RAG** | **🔲 PENDING — to write** |
| **D159** | **ai-worker idempotency via log-existence not time-window** | **🔲 PENDING — to write** |

D158 + D159 captured in this session's chat. Not yet committed to `docs/06_decisions.md`. Tomorrow's first task should be writing them, OR they get written before any future work that depends on those reasoning chains.

---

## INCIDENTS LOGGED

| ID | Title | Status |
|---|---|---|
| ID003 | AI cost retry loop (15-19 Apr, ~$155 AUD) | ✅ Fix shipped (v2.9.0). Awaiting verification on first natural ai_job run. |

---

## META BUSINESS VERIFICATION

| Item | Status |
|---|---|
| 2FA block on PK admin | ✅ Cleared |
| Shrishti admin 2FA + passkey | ⏳ Pending — PK to chase |
| invegent.com DNS TXT verify | ✅ Verified |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — **27 Apr = escalation trigger** |

---

## TOKEN CALENDAR

| Platform | Client | Sentinel expiry | Reality |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | All 4 clients | 2099-12-31 (permanent) | ✅ verified via /debug_token 18 Apr |
| Instagram | All 4 clients | 2099-12-31 (shared FB token) | ✅ |

Sentinel is temporary until D153/A23 live /debug_token alerter is built.

---

## SECRETS PROVISIONED THIS SESSION

| Secret | Purpose | Status |
|---|---|---|
| `ICE_GEMINI_API_KEY` | External reviewer — Strategist (Gemini 2.5 Pro) | ✅ added 20 Apr 23:55 UTC |
| `GITHUB_PAT_INVEGENT` | External reviewer EF — fetch repo tarballs + commit digest files | ✅ added 21 Apr 00:15 UTC (recreated after initial naming confusion) |
| `GITHUB_WEBHOOK_SECRET` | External reviewer EF — verify webhook HMAC signatures | ✅ added 21 Apr 00:10 UTC |

PAT scope: fine-grained, Invegent org, all 3 repos (`Invegent-content-engine`, `invegent-dashboard`, `invegent-portal`), contents read+write, webhooks read+write, metadata read.

---

## PRE-SALES SECTION A — UPDATED SNAPSHOT (31 items, 7 closed, 24 open + A24 in flight)

**See `docs/15_pre_post_sales_criteria.md` for full detail. Summary only.**

### Closed (7) — unchanged
- A9, A10a, A11a, A12, A13, A15, A19

### A24 redefined this session
**A24 — Stage 1 multi-model review MVP** was originally specified as "Architect Reviewer (Gemini per-commit) + Sceptic (GPT-4 weekly)" — both internal-pipeline guardrails. **Reframed today** to "Strategist (Gemini per-commit) + Engineer Reviewer (GPT per-commit)" — outside-looking-in review of build work. Spec: `docs/briefs/2026-04-21-external-reviewers.md`. Build in flight via Claude Code Tuesday evening.

A24 closes when: (a) reviewer EF deployed, (b) at least one retroactive review of `d12a52c` produces findings, (c) one weekly digest delivered to PK email.

### Open — 23 items
A1, A2, A3, A4, A5, A6, A7, A8, A10b, A11b, A14, A16, A17, A18, A20, A21, A22, A23, A25, A26, A27, A28, A29

### Items affected by today's work
- **A24** — In flight, expected close Wed/Thu 22-23 Apr
- **A26** (review discipline) — partially addressed via on-demand button, weekly cron, GitHub commit of digest. Full "unread-blocks-dashboard" deferred.
- **A27** (LLM-caller EF audit) — pattern established by today's ai-worker fix, but the audit of other ~7 LLM-callers remains open
- **A28** (cost guardrails infra) — partially addressed (retry cap is one component) but full D157 Stop 2 build pending

---

## WATCH LIST

- **Wed 22 Apr** — Check Claude Code completion. Configure webhooks. Trigger retroactive reviews.
- **Thu 23 Apr** — First live commit triggers reviewer. First weekly digest (or on-demand).
- **Fri 24 Apr** — D157 cost-guardrails infra build (RESUMES only if reviewer layer is live)
- **Sun 26 Apr** — rest
- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — first weekly cost calibration cycle (was Sat 25 Apr; slipped one week due to D156 pull-forward)
- D158 + D159 to be written into `docs/06_decisions.md`
- 13 failed ai_jobs from ID003 still in `failed` state — triage when convenient (not urgent)
- Shrishti 2FA + passkey (Meta admin redundancy) — PK to chase
- L008 / pilot terms (A1) — PK to draft this session or next

---

## TODAY'S COMMITS (verify per D150)

| Commit | Repo | Description |
|---|---|---|
| `d12a52c` | Invegent-content-engine | feat(ai-worker): v2.9.0 — ID003 three-part remediation (D157) |
| `202037c` | invegent-dashboard | feat(roadmap): three-tab layout + by-sales-stage view |
| `d8a8dc4` | Invegent-content-engine | docs: brief for external reviewer layer (D156 pulled forward, Approach C) |
| `f705f45` | Invegent-content-engine | docs: brief for roadmap three-tab conversion + pre/post sales view |
| `d157_id003_ai_job_retry_cap` (migration) | Invegent-content-engine (Supabase) | DDL: attempts column + sweep cron retry cap |

Plus whatever Claude Code is committing tonight as it builds the external reviewer layer.

**Verify each:** `git ls-remote https://github.com/Invegent/Invegent-content-engine.git main` should return latest. Same for invegent-dashboard.
