# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-21 mid-day Sydney (PK local 14:05, UTC 04:05) — true session-close after external reviewer three-voice layer shipped
> Written by: PK + Claude session sync

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else. Today reshaped the week meaningfully.**

Today shipped:
- ID003 three-part fix (ai-worker v2.9.0 + migration)
- Roadmap three-tab rebuild
- External reviewer layer — three-voice design (Strategist active, Engineer paused, Risk DB-ready awaiting xAI credits)
- Pilot service agreement template v1 (pricing deferred)
- Extensive decision documentation (D158, D159, D160)
- Role-library reframe captured as parked brief

Six commits to Invegent-content-engine plus one to invegent-dashboard. Pre-sales gate moved from 7 closed to 7 closed + 4 in flight.

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Read `docs/briefs/2026-04-21-external-reviewers.md` — what the reviewer layer actually is now
3. Check `m.external_review_queue` for any new findings since last session
4. Check `docs/reviews/` folder for any new digest commits
5. Read `docs/06_decisions.md` D156–D160 for today's decision trail
6. Read `docs/incidents/2026-04-19-cost-spike.md` — ID003 still the dominant operational context
7. Query `k.vw_table_summary` before working on any table
8. **Session-close SOP (D150):** verify every commit with `git ls-remote origin main | grep <sha>` before asserting it in sync_state

---

## TUESDAY 21 APRIL — full day chronology

Session ran from early morning Sydney time through mid-afternoon. Approximately 8 hours elapsed. Order of operations:

### 01:40-03:00 UTC — ID003 three-part fix shipped

- **Commit `d12a52c`** — ai-worker v2.9.0
  - Payload diet (`trimSeedPayload()`) — replaces `body_text` with `body_excerpt`, strips `raw_html`/`full_content`, caps length
  - Idempotency guard — checks `m.ai_usage_log` for any prior non-error row tied to this `ai_job_id` AND `post_draft.draft_body` populated (D159 — deviation from incident spec's 5-min window, rationale in D159)
  - Fetch timeout 120s `AbortController` on both Anthropic + OpenAI calls
- **Migration `d157_id003_ai_job_retry_cap`** applied:
  - Added `m.ai_job.attempts INT DEFAULT 0`
  - Updated `sweep-stale-running-every-10m` cron (jobid 9): on each requeue `attempts += 1`; at `attempts >= 3` promotes to `status='failed'` + `dead_reason='exceeded_retry_limit'`
- **Deployed:** ai-worker v79 per PK's terminal verification
- **Status:** live but unverified — pipeline naturally dormant, no real ai_jobs have run through v2.9.0 yet

### 03:00-03:30 UTC — Roadmap three-tab rebuild shipped

- **Commit `202037c`** (invegent-dashboard) — `app/(dashboard)/roadmap/page.tsx`
- Three tabs: By Phase / By Layer / By Sales Stage (new)
- 31-item pre-sales gate visible with category sub-groups
- Vercel auto-deployed; live at dashboard.invegent.com/roadmap

### 03:30-07:00 UTC — External reviewer pivot and design

- PK pulled D156 forward from 27 Apr to NOW — "no further commits should happen without external review of Claude's work"
- Brief iterated through several architectural pivots during the session:
  - First: two-voice (Strategist + Engineer) per original D156
  - Then: Risk Reviewer added as third lens (PK reframe after three silent failures discovered during session)
  - Then: role-library reframe proposed, deliberately parked for future
  - Final: three fixed-role voices, role-library captured as follow-on brief
- **D158** decision: Approach C (full repo + prompt caching) over RAG
- **D160** decision: three-voice design, rules-belong-to-role, role-library deferred with gate criteria

### 07:00-13:00 UTC — Claude Code external reviewer build

- **Commit `495216f`** — migration + Strategist + paused Engineer + weekly cron + retroactive query-param + on-demand button
- **Commit `a437a6a`** — Risk Reviewer added as third row in `c.external_reviewer`, xAI integration in EF (v1.2.0), brief updated, dispatch by-provider
- **Commit `1a7aabf`** (invegent-dashboard) — /reviews page + API route + sidebar link
- Retroactive reviews executed: Strategist completed all 4 targets (`d12a52c`, `202037c`, `495216f`, `1a7aabf`) with info-severity findings. Risk returned 403 on all 4 (zero xAI credits at time).
- First digest produced (`b09f062a-f92b-47e5-9052-c696ac764a53`), committed to `docs/reviews/2026-04-21-digest.md`, emailed to pk@invegent.com

### 00:23-04:05 UTC — Documentation caught up

- **Commit `dad6ae2`** — sync_state interim update (replaced by THIS update)
- **Commit `4fe9c57`** + **`88effeb`** — pilot service agreement template v1 at `docs/legal/pilot_service_agreement_template_v1.md` (pricing deferred)
- **Commit `2e909fb`** — external reviewer brief updated to reflect three-voice shipped state
- **Commit `b4e63ca`** — role-library reframe captured as parked brief at `docs/briefs/2026-04-21-reviewer-role-library.md`
- D156, D157, D158, D159, D160 all committed to `docs/06_decisions.md` during session

---

## THE THREE-VOICE EXTERNAL REVIEWER LAYER — current state

| Reviewer | Lens | Model | Provider | DB status | Operational status |
|---|---|---|---|---|---|
| Strategist | Right direction? | gemini-2.5-pro | Google | ✅ Active | ✅ Live, reviewed 4 retroactive commits |
| Engineer | Built well? | gpt-4o | OpenAI | ⏸ Paused | Awaits OpenAI Tier 2 (natural unlock when cumulative API spend reaches $50) |
| Risk | Silent failures? | grok-4-1-fast-reasoning | xAI | ✅ Active | Awaits xAI credit top-up — zero credits at session close |

**Tables live:**
- `c.external_reviewer` — 3 rows
- `c.external_reviewer_rule` — 12 rules total (4 per reviewer), rules keyed on reviewer_key (would migrate to role_code if role-library brief executes)
- `m.external_review_queue` — 4 retroactive findings (all Strategist, all info-severity)
- `m.external_review_digest` — 1 row (today's on-demand digest)

**Edge Functions live:**
- `external-reviewer` v1.2.0 — accepts webhook (HMAC) and retroactive (`x-ai-worker-key`) paths
- `external-reviewer-digest` v1.1.0 — assembles markdown, commits to GitHub, emails via Resend

**Cron:**
- `external-reviewer-digest-weekly` (jobid 66) — Mon 7am AEST (Sun 21:00 UTC)

**Dashboard:**
- `/reviews` page with on-demand "Run digest now" button
- Sidebar link added

**Secrets provisioned today:**

| Secret | Purpose | Provisioned |
|---|---|---|
| `ICE_GEMINI_API_KEY` | Strategist | 20 Apr 23:55 UTC |
| `GITHUB_PAT_INVEGENT` | Fetch repo tarball + commit digest files | 21 Apr 00:15 UTC (recreated after initial naming confusion) |
| `GITHUB_WEBHOOK_SECRET` | HMAC verification | 21 Apr 00:10 UTC |
| `ICE_XAI_API_KEY` | Risk Reviewer | 21 Apr 03:34 UTC |

PAT scope: fine-grained, Invegent org, all 3 repos, contents R+W, webhooks R+W, metadata R.

---

## THINGS YOU (PK) NEED TO DO NEXT SESSION

Ordered by priority:

### 🔴 Action items for three-voice layer to be fully live

1. **Configure GitHub webhook — Invegent-content-engine**
   - GitHub → repo Settings → Webhooks → Add webhook
   - Payload URL: `https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/external-reviewer`
   - Content type: `application/json`
   - Secret: value of `GITHUB_WEBHOOK_SECRET` (check Supabase secrets if forgotten)
   - Events: "Just the push event"
   - Save

2. **Configure GitHub webhook — invegent-dashboard** (same settings as above)

3. **Top up xAI credits** at https://console.x.ai/team/61aeecf7-93d4-433f-973b-b26ac30590de
   - $20 prepaid is plenty for weeks at Grok 4.1 Fast pricing
   - Do NOT enable "Share API Inputs for Model Training" (would send commits to xAI training)
   - Set a monthly spending cap ($25 suggested) as Grok-equivalent of the Anthropic console cap

4. **Make a trivial commit** after webhooks configured to verify end-to-end pipeline works
   - Ideal candidate: a small edit to any qualifying-path file
   - Verify: row appears in `m.external_review_queue` within ~2 min
   - All three reviewers should fire (once xAI credits are in)

### ⏸ Things that will unblock themselves

- OpenAI Tier 2 — $62 credit balance now, $50 auto-recharge settings. Tier 2 unlocks when cumulative API spend reaches $50. Organic from OpenAI fallback calls in ai-worker + any future Engineer Reviewer runs. No action needed — just wait.

### 🟡 Backlog items noticed today but not addressed

- **CFW schedule save bug** (discovered 21 Apr) — dashboard UI shows "Saved ✓" but `c.client_publish_schedule` has zero rows for CFW. Server action swallows error silently. Triage as separate brief after external reviewer bedded in.
- **Discovery pipeline ingest bug** (discovered 21 Apr) — `f.feed_discovery_seed` has 9 feeds provisioned 16 Apr, all marked active, all assigned to all 4 clients, but zero items ingested in 5 days. Root cause: discovery writes `config.url`, ingest reads `config.feed_url`. Simple one-line fix, but means "occupational therapy NDIS" (the one relevant to CFW) has never pulled anything.
- **L008 / A7 privacy policy update** — pilot template drafted today, but pilot cannot be sent until privacy policy is updated with YouTube + HeyGen + video-analyser paragraphs. Draft is easy (30 min), not yet done.
- 13 failed ai_jobs from ID003 — still in `failed` state, not urgent, clean up when convenient
- Shrishti 2FA + passkey (Meta admin redundancy) — PK to chase with spouse

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active, external client expansion still gated on pre-sales criteria and cost controls)
**Gate status:** Pre-sales gate NOT CLEARED. 31 total items. 7 closed. 24 open.

**Today's movement on the gate:**
- A1 (pilot terms) — drafted, pricing deferred. Awaits A7 privacy policy update before first client send.
- A5 (KPI guarantee) — drafted within pilot agreement
- A8 (AI disclosure) — drafted within pilot agreement
- A24 (multi-model review MVP) — 2/3 reviewers live in DB, 1 live with output, first digest delivered. Not yet closed — closes when first live-commit cycle produces findings (requires webhook config).

**Operational status:** Pipeline genuinely dormant — demand-aware seeder correctly reports supply maxed. 349 populated drafts in pipeline from 17 Apr burst. Drain rate ~36 posts/week × 4 clients → 3.4 weeks of natural runway before seeder fires new generation. Pipeline will resume itself.

---

## ALL CLIENTS — STATE

| Client | client_id | FB token | IG config | LI config | Prompts FB/IG/LI | In-pipeline drafts (FB) |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 269 (63 approved + 206 needs_review) |
| Property Pulse | 4036a6b5 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | 64 (46 approved + 18 needs_review) |
| Care For Welfare | 3eca32aa | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 16 (13 approved + 3 needs_review) |
| Invegent | 93494a09 | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | 0 |

All 4 FB tokens permanent (`expires_at: 0`). D153 (A23) still pending for live revocation detection.

---

## PIPELINE HEALTH

### ai_job status (as of 21 Apr 04:00 UTC)

| Status | Count | Note |
|---|---|---|
| succeeded | 1052 | Last successful completion 18 Apr 16:40 UTC (pre-ID003-containment) |
| queued | 0 | Empty |
| running | 0 | Empty — pipeline at rest |
| failed | 13 | From ID003 retry-loop termination; not urgent |

### Crons (42 total active)

Key crons relevant to today's work:
| Job | jobid | Status |
|---|---|---|
| ai-worker-every-5m | 5 | ✅ returning no_jobs (queue empty) |
| sweep-stale-running-every-10m | 9 | ✅ now enforcing retry cap (D157) |
| seed-and-enqueue-facebook-every-10m | 11 | ✅ returning 0 seeds (demand maxed) |
| seed-and-enqueue-instagram-every-10m | 64 | ✅ |
| seed-and-enqueue-linkedin-every-10m | 65 | ✅ |
| external-reviewer-digest-weekly | 66 | ✅ NEW — Mon 7am AEST |

### Ingest health
- 19 raw items + 20 canonical items in last 72h — light but healthy
- Discovery pipeline feeds all returning 0 items due to config-key bug (see backlog)

---

## COST STATUS

**April billing cycle:** 1 April → 30 April
**Spent MTD:** ~$156 USD (most of which is ID003)
**Anthropic console cap:** $200 USD
**Headroom remaining:** ~$44 USD
**Resets:** 1 May 2026

**OpenAI:** $62 credit balance, auto-recharge $50 when balance drops below $20 (today's setup)
**xAI:** Credit top-up pending from PK

**Post-fix operating target:** ~$18 USD/month (recalibrate after pipeline resumes)
**External reviewer layer cost estimate:** ~$30-50/month once all three voices active
**Stop 1 (Anthropic console) calibrated target:** $30 USD/month — set after 7 days of clean post-fix data + calibration

---

## DECISIONS LOGGED — RECENT

| ID | Title | Status |
|---|---|---|
| D147 | Pilot structure with liability waiver | ✅ DECIDED |
| D148 | Buyer-risk clause | ✅ DIRECTION SET |
| D149 | Four-advisor architecture | 🔲 BUILD DEFERRED (D156 reframe covers part) |
| D150 | Session-close trust-but-verify protocol | ✅ ADOPTED |
| D151 | Universal table-purpose rule | ✅ ADOPTED |
| D152 | Seeder post_draft.client_id fix | ✅ APPLIED |
| D153 | Token-health cron should call Meta /debug_token live | 🔲 BUILD NEXT |
| D154 | Native LinkedIn draft flow | ✅ APPLIED |
| D155 | Enqueue trigger ON CONFLICT clause fix | ✅ APPLIED |
| D156 | External epistemic diversity layer | ✅ STAGE 1 SHIPPED (three-voice) |
| D157 | Two-stop budget enforcement | 🟡 PARTIAL — ai-worker fix shipped, cost-guardrails infra on hold |
| D158 | External reviewer Approach C (full repo + caching) over RAG | ✅ COMMITTED (`e97d4e7` via decision write) |
| D159 | ai-worker idempotency via log-existence not time-window | ✅ COMMITTED |
| D160 | Three-voice reviewer design + role-library deferred | ✅ COMMITTED |

All decisions written. The "PENDING" flags in yesterday's sync_state are cleared.

---

## INCIDENTS LOGGED

| ID | Title | Status |
|---|---|---|
| ID003 | AI cost retry loop (15-19 Apr, ~$155 AUD) | ✅ Fix shipped (v2.9.0). Awaits natural verification when pipeline resumes. |

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

## PRE-SALES GATE — SECTION A SNAPSHOT

31 total items. 7 closed. 24 open (4 in flight today).

**Closed (7) — unchanged:** A9, A10a, A11a, A12, A13, A15, A19

**In flight after today:**
- A1, A5, A8 — pilot agreement draft with KPI + AI disclosure + waiver (pricing deferred)
- A24 — three-voice reviewer layer in DB, Strategist live, Engineer + Risk awaiting external unblockers

**Open — 20 items:** A2, A3, A4, A6, A7, A10b, A11b, A14, A16, A17, A18, A20, A21, A22, A23, A25, A26, A27, A28, A29

**Next gate movements likely:**
- A24 closes once live-commit cycle produces findings (needs webhooks)
- A7 (privacy policy update) is the blocker on A1 (pilot template send-ready)
- A11b (CFW + Invegent prompts) is an afternoon's content work

---

## REVISED WEEK PLAN 22–28 APRIL

### Wednesday 22 April
- Configure GitHub webhooks on both repos
- Top up xAI credits
- Make trivial commit to verify end-to-end
- Brief / triage of CFW schedule save bug + discovery pipeline ingest bug (two separate bugs captured today)

### Thursday 23 April
- Privacy policy update (A7) — unblocks pilot template
- CFW operational review — where was the conversation going? 

### Friday 24 April
- D157 cost-guardrails build (RESUMES if reviewer layer produces genuine signal on first live commits)
- Inbox anomaly monitor brief + build (A29)
- CFW + Invegent content prompts (A11b) — content session

### Saturday 25 April
- Week review
- Calibrate ai-worker v2.9.0 cost data if pipeline resumed

### Sunday 26 April
- Rest

### Monday 27 April
- First weekly external reviewer digest lands at 7am AEST
- Meta App Review escalation trigger (if still In Review, contact dev support)

---

## WATCH LIST

- **Wed 22 Apr** — webhooks, xAI credits, verification commit, bug triage
- **Thu 23 Apr** — A7 privacy policy, CFW operational review
- **Fri 24 Apr** — D157 cost-guardrails if reviewer signal is useful; content prompts
- **Mon 27 Apr** — first weekly digest lands; Meta App Review escalation trigger
- **Sat 2 May** — first weekly cost calibration cycle (slipped one week due to D156 pull-forward)

---

## TODAY'S COMMITS — ALL VERIFIED PER D150

**Invegent-content-engine (main):**

| Commit | Description |
|---|---|
| `d12a52c` | feat(ai-worker): v2.9.0 — ID003 three-part remediation (D157, D159) |
| `202037c` | — (this is dashboard, listed below) |
| `d8a8dc4` | docs: brief for external reviewer layer v1 (two-voice, superseded) |
| `f705f45` | docs: brief for roadmap three-tab conversion + pre/post sales view |
| `dad6ae2` | docs: sync_state interim update (superseded by THIS update) |
| `4fe9c57` | docs(legal): pilot service agreement template v1 draft |
| `88effeb` | docs(legal): defer pricing decision to first sales conversation |
| `495216f` | feat(external-reviewer): D156 Stage 1 deploy — two-voice + migration + cron + dashboard button |
| `a437a6a` | feat(external-reviewer): add Risk Reviewer (Grok 4.1 Fast) — three-voice design |
| `758c8f3` | docs: external reviewer brief — two-lens design rationale (superseded) |
| `2e909fb` | docs(brief): update external reviewer brief to reflect three-voice shipped |
| `b4e63ca` | docs(brief): capture reviewer role-library reframe for future execution |

**Invegent-content-engine (Supabase migrations):**

| Migration | Description |
|---|---|
| `d157_id003_ai_job_retry_cap` | DDL: attempts column + sweep cron retry cap |
| `d156_external_reviewer_layer` | DDL: 4 new tables + 2 initial reviewer rows + 8 rules |
| (follow-on migration) | DDL: Risk Reviewer row + 4 rules |

**invegent-dashboard (main):**

| Commit | Description |
|---|---|
| `202037c` | feat(roadmap): three-tab layout + by-sales-stage view |
| `1a7aabf` | feat(reviews): /reviews page + API route + sidebar link |

**Verification command (per D150):**
```
git ls-remote https://github.com/Invegent/Invegent-content-engine.git main
git ls-remote https://github.com/Invegent/invegent-dashboard.git main
```

---

## CLOSING NOTE FOR NEXT SESSION

Today produced six commits to the backend repo and one to the dashboard. All decisions are documented. All open bugs discovered today are captured. The reviewer layer is live in two-of-three form and will be fully live once webhooks configure + xAI credits top up.

PK is also doing a full-time job. This matters — don't expect tight attention across long sessions. The reviewer layer exists specifically to reduce how much PK needs to read every commit. Monday morning's digest is the primary output PK should review, not individual commits. Weekly read time target: 10 minutes.

The pilot agreement template is legally complete but commercially incomplete (pricing deferred). Do not push PK to close pricing early — that decision is gated on product strength/weakness at first sales conversation, not a date.
