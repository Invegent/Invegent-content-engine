# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction)

## D142–D146 — See 17 Apr 2026 evening commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data)

---

## D147 — Pilot Structure with Liability Waiver (Legal Engagement Deferred)
**Date:** 18 April 2026 | **Status:** ✅ DECIDED — supersedes A1 solicitor engagement

### Context
Consultant Audit 1 (8 Apr) and legal register L001/L003/L004/L007 all recommended engaging an NSW solicitor (~$2,000–5,000 AUD) to review `docs/legal/service_agreement_v1.md` before the first paying external client is signed. The docs/15 v1 classification listed this as A1 pre-sales.

PK's position (18 Apr): solicitor engagement requires real money that is not available at this stage. Preference is to defer that spend until revenue exists to justify it.

### The decision
Rather than engaging a solicitor pre-sales, structure the first 1–2 client engagements as **pilots** with explicit waiver language:
- Offer half-priced service (or time-boxed free trial, e.g. 3 months)
- Client signs a waiver acknowledging: pilot status, experimental nature of the service, limited warranties, client remains solely responsible for compliance of all published content
- No service agreement contract at pilot stage — pilot terms instead
- Full service agreement (with solicitor review) commissioned once revenue from pilot(s) exists

### Reasoning
- Capital preservation in a pre-revenue state is correct for a bootstrapped sole trader
- The liability exposure from 1–2 pilot clients where the client has explicitly waived warranty is materially lower than from productised sales under an unreviewed agreement
- Pilot structure also functions as a soft buyer-risk-reduction lever (low commitment, easy entry)
- The solicitor engagement becomes a gate to productised sales, not to first client conversation

### What this does NOT defer
- A7 privacy policy refresh (PK-drafted is acceptable; no solicitor needed)
- A8 AI disclosure clause (standard language, PK-drafted acceptable)
- Meta App Review (A2 — platform gate, separate from legal)
- Avatar consent workflow if HeyGen ever exposed (L005 — still a hard gate)

### Gate to unpark solicitor engagement
One of:
- First paying pilot client converts to full-price productised service
- Second paying pilot signs
- Any revenue milestone crossed (e.g. $2,000/month MRR)

Whichever comes first triggers solicitor engagement using pilot revenue.

### Risk accepted
If a pilot client suffers reputational or regulatory harm from ICE-generated content and the waiver is later challenged, PK is personally exposed. The waiver reduces but does not eliminate this risk. Accepting this risk is the explicit trade-off for capital preservation.

---

## D148 — Buyer-Risk Clause Form: 50% Off Next Month on KPI Miss
**Date:** 18 April 2026 | **Status:** ✅ DIRECTION SET — draft language in A5

### Context
Consultant Audit 1 recommended a 90-day money-back framing to reduce first-client decision risk. docs/15 v1 classification (Section F3) flagged that cash refund is the wrong form for a sole trader with limited capital — a service-extension guarantee achieves the same buyer-risk reduction without the capital hit.

### The decision
Buyer-risk clause form: **50% off the next month's invoice if defined KPIs are not met in the preceding month.**

Key properties:
- Not a cash refund (no capital outflow)
- Not a full service extension (not indefinite obligation)
- Month-on-month trigger (short feedback loop, not 90-day accumulation)
- KPIs are specific and measurable (not subjective "were you satisfied")

### KPIs to define (pending A4 + proof doc data)
The specific numeric KPIs will be set once NDIS Yarns has 4–8 weeks of data to establish what "reasonable" looks like. Candidates:
- Minimum posts published per week
- Minimum average engagement rate
- Minimum follower growth
- Content approval uptime

Start with 2–3 KPIs. Avoid over-specifying — ambiguity in early pilot period is tolerable; concrete targets become the contract norm once proof data exists.

### Reasoning
- Month-on-month cadence means a client who is genuinely underserved does not sit trapped for 90 days
- 50% off is meaningful enough to be a commitment signal, not so generous that it threatens unit economics
- Structured as a refund against future billing, not a credit to be clawed back, keeps accounting simple
- Easier to honour than a service extension because it's a one-time accounting event, not an ongoing service commitment

### Gate
KPI definitions locked in before any pilot client is signed. Placeholder text acceptable in waiver during pilot phase.

---

## D149 — Advisor Layer Architecture (Peer-Level AI Advisors)
**Date:** 18 April 2026 | **Status:** 🔲 BUILD NEXT — Sales Advisor MVP first

### The gap being addressed

ICE has ~20 specialist doer agents (Edge Functions operating as junior compliance officers, content writers, QA, SRE, etc.). It has zero peer-level senior advisors. The gap is real: every strategic decision PK faces — pricing, first client target, feature prioritisation, pilot structure, sales objections — currently has only PK's own reasoning plus whatever Claude session PK happens to be in.

The role being built: a peer-level advisor who reads current project state and gives PK their lens on a specific decision.

### The four advisors

1. **Sales Advisor** — 15-year B2B services salesperson, Australian SME focus. Cares about deal velocity and client retention. Pushes back on pricing, positioning, feature prioritisation. BUILD FIRST.
2. **Legal/Risk Advisor** — not a lawyer substitute, first-pass reader of contracts, waivers, regulatory exposure. Reads proposed pilot structure (D147) and flags what can bite. Critical given D147 defers solicitor engagement.
3. **Operations / Founder Discipline Advisor** — reads Clock B metrics, catches overcommitment, pushes back when PK is building instead of selling. Sole-trader failure mode counterweight.
4. **Product Strategy Advisor** — long-term product direction. Reads the roadmap and challenges assumptions. Intentionally separate from the session-active Claude persona to avoid executor-reviewing-own-work conflict.

### Architecture tiers

**Tier 1 — Claude Projects (MVP — this week):** Four Claude Projects, each with a tight persona-defining custom instruction, each connected to the Invegent GitHub repo for docs access. Ask same question in separate tabs. Manual aggregation.

**Tier 2 — Telegram bots via OpenClaw (if Tier 1 validated):** Each advisor becomes a Telegram bot. Always on phone. Add a "team meeting" bot that fans a question to multiple advisors and returns aggregated responses.

**Tier 3 — Edge Function wrappers (only if Tier 2 insufficient):** Advisors as callable Edge Functions. Other agents (e.g. Monday External Brain) can consult advisors. Programmatic access.

**Build Tier 1 only initially.** Two weeks of use validates whether the pattern works. No further build committed before validation.

### The team meeting pattern

Ask all four advisors the same question in parallel. Paste responses into a new session with a synthesiser prompt: "Four advisors gave these views. Map where they agree, where they disagree, what the decision hinges on, what questions I haven't asked."

Without the synthesis step, four opinions is noise. With it, it's a decision-ready brief.

### Audit requirement from day one

`m.advisor_log` table: timestamp, advisor, question, response, retrospective_verdict (populated later), retrospective_notes. After a quarter of data, advisors who were wrong get rewritten or retired. Advisors who were right get consulted more. Without this logging, there is no way to distinguish a helpful advisor from a confident sycophant.

```sql
CREATE TABLE m.advisor_log (
  advisor_log_id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_name        TEXT NOT NULL,
  question            TEXT NOT NULL,
  response            TEXT NOT NULL,
  asked_at            TIMESTAMPTZ DEFAULT NOW(),
  context_refs        JSONB,  -- which docs / commits were in context
  retrospective_verdict TEXT, -- right | wrong | partial | unclear
  retrospective_notes TEXT,
  retrospective_dated DATE
);
```

Create table before first advisor consultation.

### Transferability

Same four advisors, re-pointed at different docs/repos, work for Care for Welfare practice decisions, future property buyers agent business, FBA store, personal brand. Each business inherits the same advisory board reading its own sync_state and decisions log. This is the pattern that transfers to PK's next projects — not the NDIS content pipeline itself.

### Gate to build

None. Tier 1 is zero-cost (uses existing Claude Max subscription). Build immediately. Validate over two weeks. Proceed to Tier 2 only if validated.

### What this does NOT replace

- PK's strategic commitments (decisions still his to make)
- Human advisors / mentors / peers (advisors good at pattern-matching, not at creative reframes)
- High-stakes one-shot calls (first sale, first legal review, first onboarding — PK-led, advisor-assisted)

Realistic speedup: 2–4× on repetitive ops thinking, 1.2–1.5× on strategic work (reduced context-switching cost), 1× on hard human calls. Still a substantial win.

---

## D150 — Session-Close Trust-But-Verify Protocol
**Date:** 18 April 2026 | **Status:** ✅ ADOPTED — effective immediately

### The problem

18 Apr morning sync_state wrote "audit inventory committed" before verifying the commit landed on main. It had not. The file existed locally, was not on the remote. The next session read sync_state, assumed the commit was real, and could not find the file.

This is the same optimism-bias pattern the audit itself flagged (42 EFs claimed vs 40 real, 63 crons vs 42, 60 feeds vs 40). Sync_state is being written with asserted states rather than verified states.

### The rule

Before any session-close sync_state write asserts that a file is committed or a commit exists, the session must run:

```bash
git ls-remote origin main | grep <expected_sha>
```

or equivalent check that the commit exists on the remote. Two-line shell check. Catches every instance.

If the check fails, sync_state says "commit attempted, verify on next session" rather than "committed."

### Generalisation

Any assertion in sync_state that could be verified cheaply should be verified cheaply before being written. The pattern: state → verify → write. Not state → write.

Applies to: commits landed, cron jobs active, Edge Functions deployed, tables populated, migrations applied.

### Ownership

Claude writes sync_state. Claude also runs the verification step. This is not added workload for PK — it is added discipline for Claude.

---

## D151 — Universal Table Purpose Rule
**Date:** 18 April 2026 | **Status:** ✅ ADOPTED — effective immediately

### Context

Audit found 22 tables with NULL or TODO purpose in `k.vw_table_summary`. These accumulated over time because documenting a new table was a manual step that often got skipped.

PK position (18 Apr H13): "The purpose of all the tables were not initially written due to me being slack. We need to ensure that all the rows have a purpose. If it's not there call Claude API to write a purpose by reading the table contents."

### The rule

For any `k.vw_table_summary` row where `purpose IS NULL` or `purpose ILIKE '%TODO%'`:
1. Read the table's recent contents (`SELECT * FROM <schema>.<table> LIMIT 20`)
2. Read the table's column definitions (`information_schema.columns`)
3. Call Claude API with brief: "Given these column names and sample rows, write a one-paragraph purpose for this table in the style used in k.vw_table_summary. No speculation — describe what the data actually represents."
4. Write the response to `k.table_registry.purpose` or equivalent source field
5. Flag in session notes so PK can review and refine

Extends to views: any view with NULL purpose gets the same treatment, with the view definition also included in the Claude prompt.

### Implementation path

Option A — batch job: pg_cron nightly scans for NULL-purpose tables, calls a new Edge Function `table-purpose-writer`, writes results.

Option B — manual sweep: one session runs through all 22 current NULL rows, clears the backlog, then the batch job (A) handles future accretion.

Recommendation: Option B first to clear backlog, then deploy Option A for maintenance.

### Why this matters

Undocumented tables are invisible governance. Every new agent reading state from the schema has to guess at intent. This rule ensures every new table is documented within 24 hours of creation. It also means any future audit doesn't re-flag these as findings.

### Related

Same principle applies to: Edge Functions (purpose in function header comment), cron jobs (purpose in `cron.job.command` as a leading comment), briefs (purpose in first section). Standing rule for the project: nothing un-purposed for more than 24 hours.

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D142 — Demand-aware seeder | 🔲 Build next session | Pipeline stable 48h post D135 |
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🔲 Gated | D143 + D140 + D145 + 60 days data |
| D145 — Benchmark table (research + schema) | 🔲 Research now, build with D144 | Can research immediately |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Build this week | None — ready now |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Non-blocking; batch job later |
| Phase 2.1 — Insights-worker | 🔲 Next major build after D142 | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Needs engagement data |
| NDIS Support Catalogue data load | 🔲 Phase 3 | Tables exist |
| Solicitor engagement | 🔲 Parked per D147 | First pilot revenue OR $2k MRR |
| F1 Prospect demo generator | 🔲 ~mid-June 2026 | 60+ days NDIS Yarns data |
| LinkedIn Community Management API | 🔲 13 May 2026 | Evaluate Late.dev if pending |
| D124 — Boost Configuration UI | 🔲 Phase 3.4 | Meta Standard Access |
| RSS.app discovery dashboard page | 🔲 Phase 3 | No urgency |
| Cowork daily inbox task | 🔲 Phase 4 | Gmail MCP |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| animated_data advisor conflict | 🔲 Immediate | Format Library page fix |
| Assign 12 unassigned feeds to clients | 🔲 Next session (A9) | Via Feeds page |
| CFW content session + Invegent content session | 🔲 A11 pre-sales | PK tokens + prompt writing |
| Confirm TBC subscription costs | 🔲 A6 pre-sales | Invoice check — Vercel, HeyGen, Claude Max, OpenAI |
| CFW profession fix ('other' → 'occupational_therapy') | 🔲 Immediate | Change in Profile |
| Auto-approver target pass rate decision | 🔲 C1 | Single PK decision |
