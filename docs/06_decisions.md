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
**Date:** 18 April 2026 late evening | **Status:** ✅ STRATEGIC DIRECTION SET — build Stages 1+2 during pre-sales (deferred from 20 Apr to 27 Apr due to ID003 intervention)

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
| 1 | ~$75/year | Pre-sales — build week of 27 Apr |
| 2 | Marginal | Pre-sales — build week of 27 Apr |
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

### Related decisions

- D147 (pilot + waiver): solicitor deferred, but Stage 1+2 accelerate the readiness that makes the waiver credible
- D149 (four advisor layer): Stage 1 Devil's Advocate is the external counter to D149's Claude-based advisors
- D150 (session-close verify protocol): D156 is the scalable version of D150 — verify against external systems, not just internal Git state
- D151 (universal table-purpose rule): Stage 1 Sceptic will enforce this by flagging any NULL-purpose table that appears
- D153 (live /debug_token cron): specific instance of Stage 2 pattern applied to tokens
- D155 (ON CONFLICT fix): the bug D156 exists to catch before it happens next time
- **D157 (two-stop budget enforcement): ID003's equivalent outcome for cost failures — Stop 2 is a specific instance of Stage-2-style reconciliation applied to Anthropic console vs ICE's usage log**

---

## D157 — Two-Stop Budget Enforcement (ICE Internal + Anthropic Console Hard Cap)
**Date:** 20 April 2026 | **Status:** ✅ ARCHITECTURAL DIRECTION SET — build this week

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

1. **Ship the ai-worker fix first** (payload diet + idempotency + retry cap). Do NOT rely on guardrails to protect a known-broken worker.
2. **Verify 24 hours of clean operation** post-fix.
3. **Build Stop 2 infrastructure** (`m.cost_expectation`, `ai-cost-tracker`, dashboard tile).
4. **Calibrate numbers against 1 week of post-fix data.**
5. **Raise Anthropic console cap** from current $200/month (emergency ceiling) to calibrated Stop 1 figure. Do NOT raise before step 4 — raising the cap before the fix is shipped is an invitation to re-leak.

### Related decisions and pre-sales items

- **D156** — external epistemic diversity layer. Stage 2 bank reconciliation could one day reconcile Anthropic console usage against ICE's `m.ai_usage_log`, as a ninth reconciliation system. Deferred.
- **A27** — LLM-caller Edge Function audit (new pre-sales item). All ~8 callers beyond ai-worker need the same idempotency + retry-cap pattern.
- **A28** — Cost-guardrails infrastructure live (new pre-sales item). Directly implements D157 Stop 2.
- **A29** — Inbox anomaly monitor live (new pre-sales item). Complementary to D157 but independent; catches vendor-billing drift outside ICE's own tables.

### Gate to proceed

1. ai-worker three-part fix shipped and verified ✅ before building Stop 2
2. 7 days of clean post-fix data available ✅ before calibrating numbers
3. PK confirms provisional numbers feel right for personal budget constraints

### Why this is right today

- **Incident is fresh** — the evidence base for why this matters is irrefutable and undocumented at the system level before now.
- **Capital constraint real** — PK is pre-revenue. $155/month loss cannot repeat.
- **Pre-sales gate relevance** — a service that charges clients cannot have silent runaway costs. A27/A28/A29 make this a pre-sales criterion.
- **Infrastructure reusable** — `m.ai_usage_log` already exists and has rich per-call data. Stop 2 builds cheaply on top of existing instrumentation.

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| **ai-worker three-part fix (ID003 remediation)** | 🔲 **Ship Tue 21 Apr — TOP PRIORITY** | **None — ready** |
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🔲 Gated | D143 + D140 + D145 + 60 days data |
| D145 — Benchmark table | 🔲 Research now, build with D144 | Research immediate |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Late this week or next week | None — deferred from 23 Apr due to ID003 |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Batch job later |
| D153 — Token-health live /debug_token cron | 🔲 Spec this week, build after | None — high priority |
| D156 — External epistemic layer Stage 1 (Architect Reviewer) | 🔲 Build Mon 27 Apr | ID003 chain closed |
| D156 — External epistemic layer Stage 2 (Meta reconciliation) | 🔲 Build Tue 28 Apr | Parallel to Stage 1 |
| D157 — Cost guardrails Stop 2 infrastructure | 🔲 Build Wed–Fri 22–24 Apr | ai-worker fix verified |
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
