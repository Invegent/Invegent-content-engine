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
**Date:** 18 April 2026 late evening | **Status:** ✅ STRATEGIC DIRECTION SET — build Stages 1+2 during pre-sales

### The problem this decides

D155 investigation revealed that ICE's entire monitoring/advisor/audit layer shares one epistemic foundation: Claude-assisted reasoning over Claude-written artefacts interpreting Claude-generated outputs. When Claude is wrong in a systematic way, the whole system is wrong in a correlated way. PK is the only external node.

Three silent failures on 18 April (D152, D154, D155, plus 5-day token death across 3 clients) were all caught by accident during investigation of a different visible symptom. None were caught by ICE's own monitoring. Not because the monitors were badly built — because they shared the blind spots of the systems they were watching.

PK reframed the problem (verbatim): *"In a company environment where there are team members, the competitiveness between employees is what catches errors. Everybody is on their own. The hierarchy takes decisions respecting each individual's contributions. That basic structure always works within companies. I want not just an internalised solution but something external that we can build — AI elements or different agents which are not just Claude-specific."*

### The decision

Build a four-stage external verification layer, progressively gated by revenue. Each stage uses agents with incentives **not aligned with "ICE looks good."**

### Stage 1 — Multi-model adversarial AI review
**Timing:** build during pre-sales. This week.
**Cost:** ~$75/year total at current volume.

Four roles, assigned by model strength (not by role-per-vendor):

- **Sceptic** (GPT-4 / GPT-4.1) — weekly reads sync_state + decisions log, finds unsupported claims
- **Architect Reviewer** (Gemini 2.5 Pro) — per-commit reads diffs touching EFs/triggers/migrations, finds structural bugs (would have caught D155)
- **Compliance Auditor** (GPT-4) — weekly reads 5 published posts/client + privacy policy + service agreement, finds drift
- **Devil's Advocate** (Gemini 2.5 Pro) — within 2h of any D149 advisor output, argues against

Output: `m.external_review_queue` table. Dashboard surface. Each item has `action_taken` field.

**Discipline layer is part of this stage, not optional.** Unread items block dashboard home until acknowledged. Weekly review is a scheduled Monday-morning block. Without discipline, output is theatre.

**Build sequence:** Architect Reviewer first (Monday 20 Apr), others added as pattern validates.

### Stage 2 — Bank reconciliation against external platforms
**Timing:** parallel to Stage 1. This week.
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

Output: `m.external_reconciliation_result` table. Dashboard shows green/amber/red per system.

**Key discipline:** external system is authoritative when it disagrees with ICE's DB. Investigate the discrepancy, don't explain it away.

**Build sequence:** Meta reconciliation first (Tuesday 21 Apr), others added as pattern validates.

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
| 1 | ~$75/year | Pre-sales — build this week |
| 2 | Marginal | Pre-sales — build this week |
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

From this decision, the following become Section A items in docs/15 v3:

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

None. Stage 1+2 have no external dependencies. Build starts Monday 20 April per the continuity brief.

### Related decisions

- D147 (pilot + waiver): solicitor deferred, but Stage 1+2 accelerate the readiness that makes the waiver credible
- D149 (four advisor layer): Stage 1 Devil's Advocate is the external counter to D149's Claude-based advisors
- D150 (session-close verify protocol): D156 is the scalable version of D150 — verify against external systems, not just internal Git state
- D151 (universal table-purpose rule): Stage 1 Sceptic will enforce this by flagging any NULL-purpose table that appears
- D153 (live /debug_token cron): specific instance of Stage 2 pattern applied to tokens
- D155 (ON CONFLICT fix): the bug D156 exists to catch before it happens next time

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🔲 Gated | D143 + D140 + D145 + 60 days data |
| D145 — Benchmark table | 🔲 Research now, build with D144 | Research immediate |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Build this week (Thu 23 Apr per brief) | None — ready |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Batch job later |
| D153 — Token-health live /debug_token cron | 🔲 Spec Wed 22 Apr, build after | None — high priority |
| D156 — External epistemic layer Stage 1 (Architect Reviewer) | 🔲 Build Mon 20 Apr | None — first build of new direction |
| D156 — External epistemic layer Stage 2 (Meta reconciliation) | 🔲 Build Tue 21 Apr | None — parallel to Stage 1 |
| Phase 2.1 — Insights-worker | 🔲 Next major build | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Engagement data |
| Solicitor engagement | 🔲 Parked per D147 + D156 refinement | First pilot revenue OR second pilot signed |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| CFW + Invegent content prompts | 🔲 A11b pre-sales | PK prompt-writing session |
| TBC subscription costs | 🔲 A6 pre-sales | Invoice check |
| CFW profession fix | 🔲 Immediate | Change in Profile |
| Auto-approver target pass rate | 🔲 C1 | Single PK decision |
| Monitoring items A20-A22 (D155 follow-on) | 🔲 New pre-sales | Build after Stage 1+2 up |
| Professional indemnity insurance | 🔲 Pre-pilot | Underwriting forces clarification |
