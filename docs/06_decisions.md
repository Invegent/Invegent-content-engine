# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction)

## D142–D146 — See 17 Apr 2026 evening commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data)

## D147–D151 — See 18 Apr 2026 afternoon commit (pilot structure, buyer-risk form, advisor layer, session-close SOP, table-purpose rule)

## D152–D155 — See 18 Apr 2026 evening commit (seeder client_id fix, token-health live direction, native LinkedIn flow, ON CONFLICT root-cause fix)

---

## D156 — External Epistemic Diversity Layer (Four-Stage, Progressively Revenue-Gated)
**Date:** 18 April 2026 late evening | **Status:** ✅ STRATEGIC DIRECTION SET — Stage 1 shipped 21 Apr 2026 (pulled forward from 27 Apr)

### The problem this decides

D155 investigation revealed that ICE's entire monitoring/advisor/audit layer shares one epistemic foundation: Claude-assisted reasoning over Claude-written artefacts interpreting Claude-generated outputs. When Claude is wrong in a systematic way, the whole system is wrong in a correlated way. PK is the only external node.

Three silent failures on 18 April (D152, D154, D155, plus 5-day token death across 3 clients) were all caught by accident during investigation of a different visible symptom. None were caught by ICE's own monitoring. Not because the monitors were badly built — because they shared the blind spots of the systems they were watching.

PK reframed the problem (verbatim): *"In a company environment where there are team members, the competitiveness between employees is what catches errors. Everybody is on their own. The hierarchy takes decisions respecting each individual's contributions. That basic structure always works within companies. I want not just an internalised solution but something external that we can build — AI elements or different agents which are not just Claude-specific."*

### The decision

Build a four-stage external verification layer, progressively gated by revenue. Each stage uses agents with incentives **not aligned with "ICE looks good."**

### Stage 1 — Multi-model adversarial AI review
**Timing:** build during pre-sales. Originally this week; resumed week of 27 Apr per ID003.
**Cost:** ~$75/year total at current volume.

Four roles, assigned by model strength (not by role-per-vendor):

- **Sceptic** (GPT-4 / GPT-4.1) — weekly reads sync_state + decisions log, finds unsupported claims
- **Architect Reviewer** (Gemini 2.5 Pro) — per-commit reads diffs touching EFs/triggers/migrations, finds structural bugs (would have caught D155 — and likely the ID003 timeout pattern)
- **Compliance Auditor** (GPT-4) — weekly reads 5 published posts/client + privacy policy + service agreement, finds drift
- **Devil's Advocate** (Gemini 2.5 Pro) — within 2h of any D149 advisor output, argues against

Output: `m.external_review_queue` table. Dashboard surface. Each item has `action_taken` field.

**Discipline layer is part of this stage, not optional.** Unread items block dashboard home until acknowledged. Weekly review is a scheduled Monday-morning block. Without discipline, output is theatre.

**Build sequence:** Architect Reviewer first, others added as pattern validates.

### Stage 2 — Bank reconciliation against external platforms
**Timing:** parallel to Stage 1.
**Cost:** marginal (platform API calls).

Eight systems, four priority:

1. Meta Graph API — posts per page vs `m.post_publish`
2. GitHub API — commit SHA + push timestamps vs sync_state
3. Vercel deploy API — last deploy SHA per project vs main
4. Supabase management API — EF list + timestamps vs repo
5. LinkedIn via Zapier logs (priority 2)
6. Meta Insights API (priority 2 — serves dual purpose with Phase 2.1)
7. YouTube Data API (priority 2)
8. Xero API (priority 3 — once billing set up)

**Post-ID003 addition:** a ninth reconciliation system is now implied — Anthropic console usage vs `m.ai_usage_log`. Handled in D157 Stop 2 infrastructure rather than here. Noted for completeness.

Output: `m.external_reconciliation_result` table. Dashboard shows green/amber/red per system.

**Key discipline:** external system is authoritative when it disagrees with ICE's DB. Investigate the discrepancy, don't explain it away.

**Build sequence:** Meta reconciliation first, others added as pattern validates.

### Stage 3 — External human review (tiered)
**Timing:** Tier A after Stages 1+2 stable (~6 weeks). Tier B after revenue. Tier C = Stage 4.

- **Tier A — Public sanitised brief** ($50/finding, no NDA) — r/supabase / Claude Devs Discord / Hacker News. Architecture-only, no code, no tokens, no prompts. Also marketing collateral.
- **Tier B — Signed brief on Upwork/Fiverr** ($200-500/engagement, NDA required) — Australian freelancer preferred. Test with small engagement first. Rotate Supabase service-role key afterwards.
- **Tier C — Agency retainer** — see Stage 4.

### Stage 4 — Australian boutique agency retainer (revenue-gated)
**Timing:** 5+ clients OR $5k MRR. NOT before.
**Cost:** $10-15k AUD/year.

Profile: Australian (NSW preferred), Supabase + Next.js specialists, NDIS-adjacent experience, small team, fixed retainer not T&M. Buy: monthly 90-min architecture review + quarterly deep audit + emergency response SLA + security review checklist access.

**Solicitor engagement trigger refined:** when EITHER first pilot converts to full-price OR second pilot signs cleanly after 90 days. Revenue is the trigger, not confidence (per tonight's refinement to D147).

### Dual purpose framing (strategic positioning, not just defence)

Every external layer component has two purposes:
1. **Catch failures** that internal monitoring can't see
2. **Sales differentiator** — AI-audits-AI positioning that no generic content agency can replicate

Customer-facing pitch eventually:
> "ICE is built on an AI-audited AI stack. We run GPT-4 against Claude's outputs weekly. We reconcile against Meta's own API daily. We publish our architecture for external review. Your content is safer because of it."

This is the most defensible positioning a solo founder can build. The same infrastructure that gives sales differentiation is the infrastructure that would have caught D155 on day one.

### Cost profile

| Stage | Cost | When |
|---|---|---|
| 1 | ~$75/year | Pre-sales — shipped 21 Apr |
| 2 | Marginal | Pre-sales — build next |
| 3A | $50/finding (bounded) | After 6 weeks |
| 3B | $200-500/engagement | After first revenue |
| 4 | $10-15k/year | 5+ clients or $5k MRR |
| Solicitor | $2-5k | First pilot conversion OR second pilot signed |

### What this does NOT replace

- PK's strategic judgement (decisions stay with PK)
- The D149 Claude-based advisor layer (runs in parallel — Devil's Advocate is the Stage 1 counterpart to D149)
- Professional indemnity insurance (a separate Stage 4-adjacent item noted: underwriting process itself forces clarification)

### What this explicitly defers

- Do NOT build more internal Claude-only monitoring as a substitute
- Do NOT skip the Stage 1 discipline layer — output without reading is theatre
- Do NOT start Stage 3B until revenue exists
- Do NOT start Stage 4 until $5k MRR
- Do NOT engage solicitor until pilot revenue

### Follow-on items promoted to pre-sales

From this decision, the following became Section A items in docs/15 v3:

- A24 — Stage 1 external multi-model review layer (MVP: Architect Reviewer + Sceptic)
- A25 — Stage 2 bank reconciliation layer (MVP: Meta + GitHub + Vercel + Supabase)
- A26 — Review discipline mechanism (unread-blocks-dashboard + weekly block)

These are not optional for pre-sales closure. A managed service with 1 client where the pipeline silently fails for 7 days because there's no alert is commercially fatal. These must exist before a paying pilot signs.

### Reasoning on why this is right today

- Capital constraint: PK is pre-revenue. Expensive options (agency, solicitor) correctly parked until revenue justifies them.
- Epistemic constraint: Claude-only solutions can't protect against Claude's blind spots. Different vendors with different training data genuinely surface different things.
- Positioning opportunity: every defensive layer doubles as sales differentiation. The AI-audits-AI framing is defensible and not easily imitated.
- Discipline constraint: output without reading is worse than no output (creates false confidence). Dashboard-surface + acknowledge-to-dismiss is how to close this.
- Sequencing: Stage 1+2 pay for themselves in D155-class prevention. Stage 3+4 layer in as revenue permits.

### Gate to proceed

None. Stage 1+2 have no external dependencies. Deferred from 20 Apr to 27 Apr due to ID003 intervention — ID003 remediation must complete first because it is actively bleeding money.

**UPDATE 21 Apr:** Stage 1 pulled forward and shipped today (commits `495216f`, `a437a6a`). See D160 for implementation detail.

### Related decisions

- D147 (pilot + waiver): solicitor deferred, but Stage 1+2 accelerate the readiness that makes the waiver credible
- D149 (four advisor layer): Stage 1 Devil's Advocate is the external counter to D149's Claude-based advisors
- D150 (session-close verify protocol): D156 is the scalable version of D150 — verify against external systems, not just internal Git state
- D151 (universal table-purpose rule): Stage 1 Sceptic will enforce this by flagging any NULL-purpose table that appears
- D153 (live /debug_token cron): specific instance of Stage 2 pattern applied to tokens
- D155 (ON CONFLICT fix): the bug D156 exists to catch before it happens next time
- **D157 (two-stop budget enforcement): ID003's equivalent outcome for cost failures — Stop 2 is a specific instance of Stage-2-style reconciliation applied to Anthropic console vs ICE's usage log**
- **D158 — Approach C (full repo + caching) chosen over RAG for the reviewer layer's context strategy**
- **D159 — ai-worker idempotency implementation detail via log-existence not time-window**
- **D160 — Three-voice implementation detail + role-library deferred**

---

## D157 — Two-Stop Budget Enforcement (ICE Internal + Anthropic Console Hard Cap)
**Date:** 20 April 2026 | **Status:** ✅ ARCHITECTURAL DIRECTION SET — ai-worker fix shipped 21 Apr (commit `d12a52c`); Stop 2 infrastructure deferred pending external reviewer

### The problem this decides

ID003 (cost retry loop, 15–19 April 2026, ~$155 AUD lost) surfaced that ICE has:
- No internal cost monitoring, anomaly detection, or throttling
- No Anthropic-side spend cap prior to the incident
- No surface in the dashboard showing cost per published post, LLM calls per ai_job, or retry patterns
- Inbox billing receipts as the only alerting mechanism

The incident could have been catastrophic at 10× scale. The loop consumed ~$40/day at 2-client volume. At 10 clients, the same bug would have consumed ~$200/day, potentially $6,000 before detection. A single-founder operation with personal-budget-tier API spend cannot tolerate that failure mode structurally.

### The decision

Implement budget enforcement at **two independent stops**:

**Stop 1 — Anthropic console monthly spend cap.**
- Dumb, blunt, authoritative. Enforced at Anthropic's billing side.
- Doesn't know anything about ICE.
- Only job: **absolute worst-case financial ceiling**.
- Trade-off: when hit, ALL Claude API calls stop across all callers — no discrimination between a runaway loop and a legitimate high-volume day.

**Stop 2 — ICE internal budget controls.**
- Smart, detailed, early-warning.
- Enforced inside the pipeline by a new `ai-cost-tracker` Edge Function + `m.cost_expectation` table.
- Knows expected cost per job type, per client, per caller.
- Job: **catch anomalies before they become expensive; throttle gracefully rather than hard-stop; preserve essential publishing while pausing advisory functions**.
- Trade-off: only as good as the budget model; only works if monitoring fires before damage is done.

**The key constraint:** Stop 2's thresholds must be well below Stop 1, with enough gap between them that Stop 2 provides meaningful early warning before Stop 1 becomes necessary.

### Why two stops, not one

One alone is insufficient:
- Stop 1 only = no graceful degradation; no per-caller visibility; only triggers after money is already spent
- Stop 2 only = if it has a bug, nothing protects PK financially; same vulnerability as the system it monitors

Two stops = defence in depth. Stop 2 catches 99% of issues gracefully. Stop 1 catches the edge cases where Stop 2 itself has failed.

### Stop 2 architecture

**`m.cost_expectation` table** — expected spend per (caller, day), calibrated weekly from `m.ai_usage_log`.

**`ai-cost-tracker` Edge Function** — daily cron:
- Reads prior day's actual spend from `m.ai_usage_log`
- Compares to `m.cost_expectation`
- Writes `m.cost_alert` row if actual > 1.5× expected
- Writes daily summary to `m.cost_daily_summary`

**Dashboard tile** — Monitor tab:
- 7-day rolling spend per caller
- Expected line vs actual line
- Red flag if any day > 2× expected or month-to-date > 80% of monthly budget

**Throttle rules (pg_cron function):**
- If daily spend > `daily_throttle_threshold` (e.g. $10 USD):
  - Disable non-essential LLM-calling crons: `pipeline-ai-summary`, `ai-diagnostic`, `weekly-manager-report`, `client-weekly-summary`
  - Keep essential: `ai-worker`, `auto-approver`
  - Write to `m.cost_throttle_log`
- If daily spend > `daily_halt_threshold` (e.g. $30 USD):
  - Disable ALL LLM-calling crons
  - Alert via Telegram + email
- Re-enable automatically at next UTC midnight unless manually blocked

### Provisional numbers (calibrate after fix ships + 1 week data)

These numbers are Sunday 19 Apr estimates based on the limited clean data available. They must be refined after the ai-worker fix is shipped and 7 days of post-fix data accumulates.

| Level | Threshold (USD) | Threshold (AUD approx) | Action |
|---|---|---|---|
| Green baseline | ≤ $0.50/day | ≤ $0.75/day | Normal |
| Soft alert (Stop 2a) | > $1.50/day | > $2.25/day | Email alert; no throttle |
| Throttle (Stop 2b) | > $5/day | > $7.50/day | Disable advisory crons; Telegram alert |
| Halt (Stop 2c) | > $15/day | > $22/day | Disable all LLM crons; urgent alert |
| Hard cap (Stop 1, Anthropic console) | $30/month | $45/month | API returns 429 for all ICE calls |

**Target monthly baseline:** $10–15 USD = $15–22 AUD.

**PK's pain threshold:** target + 25% = maximum the system should be allowed to reach if everything is working correctly. Anything above this is evidence of malfunction.

**Provisional Anthropic cap (after fix ships):** $30 USD/month, to be reviewed after 2 weeks of post-fix operation. Currently held at $200 USD for remainder of April billing cycle as emergency ceiling.

### Why this approach, not alternatives

Alternatives considered:
- **"Just set the Anthropic cap and call it done"** — insufficient. When the cap is hit, ALL ICE AI capability dies with zero graceful degradation. Clients publishing stops. Loop-detection stops. Alerting stops.
- **"Per-API-key caps"** — Anthropic doesn't support per-key monthly caps in the console. Only org-level.
- **"Rate limit by tokens per minute"** — Anthropic does support TPM limits but they're per-model and awkward to tune. Not the right tool for "monthly budget" — that's what spend caps are for.
- **"Switch to a cheaper model like Haiku"** — doesn't solve the structural problem. A retry loop on Haiku at 152× multiplier still hurts, just more slowly.
- **"Let the incident happen and learn from it"** — that WAS the status quo. Cost $155 and confidence.

### What this does NOT do

- **Does not prevent the underlying retry loop bug.** Cost guardrails catch the *symptom* (cost anomaly). The fix for the cause (payload diet + idempotency guard + retry cap) is separate, in the immediate-fix brief.
- **Does not replace the need for the external reconciliation layer (D156).** D156 catches architectural failures that don't show up in cost patterns. D157 catches cost anomalies even when architecture looks fine.
- **Does not eliminate surprise.** A cleverly-designed future bug that stays below all thresholds could still cause a 14-day slow leak. The inbox anomaly monitor (separate brief) catches that vector.

### Order of operations (critical)

This matters for preventing re-ignition of the current incident:

1. **Ship the ai-worker fix first** (payload diet + idempotency + retry cap). Do NOT rely on guardrails to protect a known-broken worker. ✅ Done 21 Apr.
2. **Verify 24 hours of clean operation** post-fix. ⏳ In progress.
3. **Build Stop 2 infrastructure** (`m.cost_expectation`, `ai-cost-tracker`, dashboard tile). 🔲 Deferred pending external reviewer layer bedding in.
4. **Calibrate numbers against 1 week of post-fix data.**
5. **Raise Anthropic console cap** from current $200/month (emergency ceiling) to calibrated Stop 1 figure. Do NOT raise before step 4 — raising the cap before the fix is shipped is an invitation to re-leak.

### Related decisions and pre-sales items

- **D156** — external epistemic diversity layer. Stage 2 bank reconciliation could one day reconcile Anthropic console usage against ICE's `m.ai_usage_log`, as a ninth reconciliation system. Deferred.
- **D159** — this decision's `ai-worker` implementation uses log-existence idempotency not time-window. Deviation from original spec, rationale captured separately.
- **A27** — LLM-caller Edge Function audit (new pre-sales item). All ~8 callers beyond ai-worker need the same idempotency + retry-cap pattern.
- **A28** — Cost-guardrails infrastructure live (new pre-sales item). Directly implements D157 Stop 2.
- **A29** — Inbox anomaly monitor live (new pre-sales item). Complementary to D157 but independent; catches vendor-billing drift outside ICE's own tables.

### Gate to proceed

1. ai-worker three-part fix shipped and verified ✅ Done 21 Apr (commit `d12a52c` + migration `d157_id003_ai_job_retry_cap`)
2. 7 days of clean post-fix data available — in progress
3. PK confirms provisional numbers feel right for personal budget constraints

### Why this is right today

- **Incident is fresh** — the evidence base for why this matters is irrefutable and undocumented at the system level before now.
- **Capital constraint real** — PK is pre-revenue. $155/month loss cannot repeat.
- **Pre-sales gate relevance** — a service that charges clients cannot have silent runaway costs. A27/A28/A29 make this a pre-sales criterion.
- **Infrastructure reusable** — `m.ai_usage_log` already exists and has rich per-call data. Stop 2 builds cheaply on top of existing instrumentation.

---

## D158 — External Reviewer Architecture: Approach C (Full Repo + Prompt Caching) over RAG
**Date:** 21 April 2026 morning | **Status:** ✅ ARCHITECTURAL DIRECTION SET — implemented in commits `495216f` + `a437a6a`

### The problem this decides

D156 Stage 1 committed to building an external reviewer layer. It left open HOW the reviewers access the repo context they need to review. Two candidate approaches:

- **Approach C (full repo + caching):** each review call sends the entire relevant repo as context, with prompt caching to keep costs bounded across repeated calls touching the same files
- **RAG approach:** embed the repo into a vector store, retrieve relevant chunks per review, send only those chunks

RAG is the conventional "efficient" answer. Approach C is the conventional "brute force" answer. The question was which fits ICE's reality.

### The decision

**Approach C — full repo context with prompt caching.** Not RAG.

### Why Approach C, not RAG

**Repo size fits modern context windows.** The Invegent-content-engine repo is currently 400-700k tokens. Gemini 2.5 Pro has a 2M context window. Grok 4.1 Fast has a 2M context window. Both can swallow the full repo and still have headroom for the commit diff plus rules. RAG is a solution to "my context doesn't fit" — we don't have that problem.

**RAG adds silent failure modes.** Retrieval misses, chunking boundaries, embedding drift, reranker quirks. Each is a failure surface where the reviewer sees incomplete context and doesn't know it. A reviewer operating on incomplete context with no signal that it's incomplete is worse than one that complains about token limits. ICE has already demonstrated it struggles with silent failures (ID003, D155, CFW schedule, discovery pipeline ingest on 21 Apr). Adding RAG to the reviewer layer adds another silent-failure surface to the exact system built to catch silent failures.

**Cost is acceptable.** At ~$1/commit for Strategist (Gemini) and ~$0.01/commit for Risk (Grok with prompt caching), the three-voice layer runs at roughly $30-50/month total. That is not a number worth optimising against when the alternative introduces silent-failure risk.

**Bridge is documented, not closed.** If the repo grows past 1M tokens in the future (likely around 2-3 years of continued development at current pace), the bridge forward is either (a) shard by scope — reviewers see only their relevant scope — or (b) introduce RAG at that point. Today: Approach C. Tomorrow: revisit.

### PK verbatim

When presented with the two options, PK's position was: *"I don't see any value we are developing a system within a system within a system."*

Translation: the reviewer layer exists to catch failures in the main system. Introducing its own substantial internal complexity (vector store, embedding pipeline, retrieval tuning) contradicts its purpose. The reviewer must be simpler than what it reviews, not a second system of equal complexity.

### What this does NOT decide

- Does not rule out RAG permanently — if repo exceeds context window, revisit
- Does not apply to other AI uses inside ICE (content generation, etc.) — those are separate decisions
- Does not say RAG is bad — says RAG is wrong for THIS use case at THIS scale

### Related decisions

- D156 — parent decision establishing the reviewer layer
- D157 — the cost-guardrails layer Approach C depends on (without caching, Approach C is expensive; with caching, it's negligible)
- D160 — the three-voice implementation that this context strategy underpins

---

## D159 — ai-worker ID003 Idempotency via Log-Existence, Not Time-Window
**Date:** 21 April 2026 morning | **Status:** ✅ IMPLEMENTED in ai-worker v2.9.0 (commit `d12a52c`)

### The problem this decides

The ID003 incident post-mortem (`docs/incidents/2026-04-19-cost-spike.md`) proposed an idempotency guard for ai-worker to prevent retry-loop cost spirals. The specific mechanism in the original spec: *"skip LLM call if already-logged in last 5 minutes."*

When implementing this in v2.9.0, the five-minute window was reviewed and rejected in favour of log-existence checking.

### The decision

The idempotency guard in ai-worker v2.9.0 checks for **any prior non-error `m.ai_usage_log` entry tied to this `ai_job_id` AND a populated `post_draft.draft_body`**. Not bounded by any time window.

If a prior successful call exists, the new invocation:
- Does NOT call the LLM
- Marks the `ai_job` as `succeeded`
- Logs the fact of skipping (for observability)

### Why log-existence, not time-window

**The time window from the spec was shorter than the sweep interval that caused the original bug.** `sweep-stale-running` runs every 10 minutes and requeues "stuck" jobs. A 5-minute idempotency window would have missed exactly the failure case it was supposed to prevent. A job completes successfully at T+0, sweep-stale-running requeues at T+20 thinking it was stuck (because the status was written non-atomically with the LLM call), idempotency guard checks "any call in last 5 minutes" and finds none, calls LLM again. Cost doubles. This is ID003 in miniature.

**Log-existence has no window. It's strictly stronger.** If a log row for this ai_job exists and the draft body is populated, the work is done. Period. No matter how long ago.

**Draft body check ensures partial completions don't block re-attempts.** If the LLM call succeeded but the draft-write transaction failed, the `draft_body` would be null, and the idempotency guard would allow the retry. This is correct — we want to retry partial failures, but never retry full successes.

### What this does NOT decide

- Does not make retries impossible. `m.ai_job.attempts` column (added in migration `d157_id003_ai_job_retry_cap`) still caps retries at 3. Idempotency protects completed work; retry cap protects legitimate failures.
- Does not apply retroactively to pre-v2.9.0 behaviour. ID003 is sealed history; v2.9.0 is forward-looking protection.
- Does not eliminate ALL cost leakage. A net-new job with a genuinely broken external API could still retry up to 3 times. The retry cap limits the blast radius.

### Related decisions

- D157 — the cost-guardrails architecture this implements in detail
- D156 — the external reviewer layer that will catch similar design mistakes earlier in future

---

## D160 — External Reviewer: Three-Voice Design with Role Library Deferred
**Date:** 21 April 2026 evening | **Status:** ✅ IMPLEMENTED (commits `495216f`, `a437a6a`); role-library reframe captured for future execution

### The problem this decides

D156 established that external review was needed. Implementation produced three successive architectural questions today:

1. How many voices? (one, two, or three reviewers)
2. What roles do they play? (scope, engineering, risk, other)
3. How coupled are roles to models? (fixed binding, or rotatable, or fully independent)

Each question had a cost-vs-value trade-off. PK and Claude worked through them iteratively across the session. This decision captures the final architecture and the deliberate parking of the more ambitious role-library design.

### The decision

**What ships today — three voices, fixed roles for now, rotation by SQL if needed.**

| Role | Lens | Model | Status |
|---|---|---|---|
| Strategist | "Is this the right thing to build?" | Gemini 2.5 Pro | ✅ Active |
| Engineer | "Is this built well?" | GPT-4o | ⏸ Paused (OpenAI Tier 1 TPM block) |
| Risk | "How does this fail?" | Grok 4.1 Fast Reasoning | ✅ Active in DB (xAI credits pending) |

**Rules belong to the role, not the model.** If a model is rotated into a different role, it inherits the new role's rules automatically.

**Rotation is a DB update, not a code change.** `UPDATE c.external_reviewer SET model = 'X' WHERE role_code = 'Y'` is all that's needed. No redeploy.

**What is deferred — the role library reframe.**

PK raised a broader design during implementation: roles should not be fixed. They should be a *library* — any of Claude's uses (content writer, engineer, salesman, risk reviewer, compliance auditor, future-maintainer, drift detector) can be invoked on-demand against any commit set, using any of the three models. The architecture would separate: roles (the lens), models (the voice), invocations (the moment of asking).

This reframe is architecturally sound but defers to a future brief. Reasons:

- Today's three-voice deployment has zero commits of real data. Building the library before knowing whether even two voices produce useful findings is optimising the machine before confirming it works.
- PK's explicit honesty: *"I'm not very excited with these ideas because these ideas are becoming burdensome."* Respect the signal. Build what's needed now; revisit when evidence justifies more.
- Today had five substantial outputs. Adding a sixth would have been throughput for its own sake.

### Why three voices (not two or one)

- One voice = single provider dependency, single epistemic regime. Defeats D156's purpose.
- Two voices = adequate for scope + engineering coverage. What today's design started as before PK introduced the third lens.
- Three voices = adds adversarial lens that neither Strategist nor Engineer ask. Directly addresses the pattern demonstrated today (three silent failures found in one session across three subsystems). Risk Reviewer's four rules — silent failure detection, worst-case production scenario, missing guardrails, hidden assumptions — target the exact failure mode.

### Why Grok over GPT for Risk

- OpenAI Tier 1 TPM (30k) blocks full-context review of ICE commits (commits + brief + decisions often exceed 100k tokens).
- Raising to Tier 2 requires $50 cumulative API spend plus 7-day wait. Blocks today.
- Grok has 500k TPM default on Tier 1 and 2M context window.
- Grok is structurally further from Claude's cultural/methodological orbit than GPT (different org, different training regime, different alignment decisions). Better third voice for D156's stated purpose — epistemic diversity, not just provider diversity.

### Why all three models are "top tier" (PK constraint)

PK's explicit rule: only use top-tier AI models from major providers. No DeepSeek, Qwen, or other open-source/Chinese models regardless of benchmarks. Three reasons:

- NDIS compliance concerns — Chinese-hosted infrastructure is a live issue for regulated clients
- Reputation risk for a solo founder pitching NDIS providers — using Chinese AI in the review layer would need explanation
- Fewer moving parts in vendor relationships — Anthropic, Google, xAI already cover adversarial diversity adequately

### Architectural components live after commits `495216f` + `a437a6a`

- Tables: `c.external_reviewer` (3 rows), `c.external_reviewer_rule` (12 rules total, 4 per reviewer)
- Migration: applied
- Edge Function: `external-reviewer` v1.2.0 (dispatches by provider; full context for Gemini and xAI, focused 100k for OpenAI)
- Edge Function: `external-reviewer-digest` v1.1.0 (assembles weekly digest, emails to pk@invegent.com, commits to `docs/reviews/`)
- Cron: `external-reviewer-digest-weekly` (jobid 66, Mon 7am AEST)
- Dashboard: `/reviews` page + API route + sidebar link (dashboard repo commit `1a7aabf`)
- Retroactive reviews of `d12a52c`, `202037c`, `495216f`, `1a7aabf` executed via Strategist. Grok retroactively unable to run due to zero xAI credits at time of deployment.

### Gate criteria for evaluating the layer ("earned its keep" definition)

After 3 weekly digests and/or first live-commit cycle:
- **Layer earns its keep if:** (a) at least 2 findings changed what was about to be built, OR (b) at least 1 finding prevented a silent failure from shipping, OR (c) enough "aligned" reviews on risky commits that PK stops double-checking
- **Layer has NOT earned its keep if:** (a) all findings are info-severity and PK ignores all of them, (b) PK finds themself fixing things the reviewers said were fine, (c) the digest sits unread for a week

If layer does NOT earn its keep by this gate, options are: (i) rotate role→model assignments per the flexibility built into the design, (ii) tune rule prompts to be stricter or narrower, (iii) retire the layer and recover the monthly cost.

### What is explicitly deferred to a future brief

`docs/briefs/2026-04-21-reviewer-role-library.md` captures the role-library reframe for future execution. Gate: at least 2 weekly digests of current three-voice output, plus a concrete use case for a role not currently in the library.

### PK context that informed this decision

PK's framing, captured verbatim from the session:

> "The idea should be to have as many roles that we want as a file. So when we say, look, yes, we have run this rule with the Grok or with the ChatGPT, and next review that we want maybe we can simply run a salesman kind of pitch for all the three models and have a look at it. Or maybe we can run engineering question that what risk do we have when we commit all of these changes that we have made in next three to four weeks. So we can run the same questions to all three. So the thing is, you know, the ocean is as big as it is. And by defining more roles, it doesn't hurt us we can run them anytime."

And later:

> "I'm not very excited with these ideas because these ideas are becoming burdensome. But the thing is, I have to get this project going with very limited resources, and I cannot hire any person. So having these roles will be help, especially coming out of different models. So therefore, yes, we have to build it. At some point of time. And at this point of time, we can go ahead with what we have."

Both quotes are preserved because they capture the honest tension: the reviewer architecture substitutes for a team PK can't hire, so it genuinely serves him, but it is also meta-work that competes with content work for scarce solo-founder time. The correct rhythm is build-when-needed, not build-speculatively.

### Related decisions

- D156 — parent decision (external epistemic diversity layer)
- D158 — the context strategy (Approach C) that this layer uses
- D157 — the cost guardrails that make running three models affordable

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🔲 Gated | D143 + D140 + D145 + 60 days data |
| D145 — Benchmark table | 🔲 Research now, build with D144 | Research immediate |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Late this week or next week | None — deferred from 23 Apr due to ID003 |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Batch job later |
| D153 — Token-health live /debug_token cron | 🔲 Spec this week, build after | None — high priority |
| D156 Stage 2 — Meta reconciliation | 🔲 Next external-layer build | Stage 1 verified earning its keep |
| D157 — Cost guardrails Stop 2 infrastructure | 🔲 Deferred until external reviewer beds in | ai-worker fix verified ✅ + external reviewer stable |
| D157 — Raise Anthropic cap to calibrated Stop 1 | 🔲 Week of 5 May | 7 days post-fix clean data + weekly calibration |
| Inbox anomaly monitor | 🔲 Build Fri 24 Apr | Separate brief TBW |
| Phase 2.1 — Insights-worker | 🔲 Next major build | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Engagement data |
| Solicitor engagement | 🔲 Parked per D147 + D156 refinement | First pilot revenue OR second pilot signed |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| CFW + Invegent content prompts | 🔲 A11b pre-sales | PK prompt-writing session |
| TBC subscription costs | 🔲 A6 pre-sales | Invoice check |
| CFW profession fix | 🔲 Immediate | Change in Profile |
| Auto-approver target pass rate | 🔲 C1 | Single PK decision |
| Monitoring items A20–A22 (D155 follow-on) | 🔲 Build after Stage 1+2 up | Stage 1+2 live |
| Professional indemnity insurance | 🔲 Pre-pilot | Underwriting forces clarification |
| A27 — LLM-caller Edge Function audit (ID003 follow-on) | 🔲 After ai-worker fix establishes pattern | Pattern proven |
| **Reviewer role-library rebuild (post-D160)** | 🔲 Captured as brief; execute when evidence justifies | 2+ weekly digests + concrete use case for a role not in current library |
| **CFW schedule save bug investigation** | 🔲 Discovered 21 Apr — UI shows "Saved ✓" but DB has zero rows | Triage after external reviewer stable |
| **Discovery pipeline ingest bug fix** | 🔲 Discovered 21 Apr — config.url vs config.feed_url mismatch; 9 discovery feeds never ingested anything | Simple one-line fix; triage with CFW bug |
