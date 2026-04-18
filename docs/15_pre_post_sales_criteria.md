# ICE — Pre-Sales / Post-Sales Classification

## Generated: 2026-04-18 (v1 morning, v2 afternoon reflecting PK Q&A)
## Type: Classification document — supersedes `docs/14_pre_sales_audit_inventory.md` Section 12
## Inputs: audit inventory (38 items + 13 open questions), 3-clock framework, consultant audit (8 Apr), legal register L001–L008, PK answers 18 Apr, decisions D147–D151

---

## Purpose

This document converts the audit's Section 12 findings into an actionable pre-sales gate. Every audit item is classified as pre-sales, post-sales tier 1/2/3, or parked. The rationale for each classification is explicit. Fresh-eyes pushback on the framework session is in Section F.

This is the definitive pre-sales gate document until superseded. When all Section A items are closed AND Clock A/B/C windows complete green, PK may begin first external sales conversations.

---

## v2 changes from v1 (morning → afternoon)

- **A1 reframed** — solicitor engagement descoped per D147. Replaced with pilot structure + liability waiver.
- **A5 sharpened** — buyer-risk clause form set to "50% off next month on KPI miss" per D148.
- **A9 reframed** — orphan drafts are not a pipeline bug; they are drafts from unassigned feeds (PK H6). Action becomes feed-assignment, not code fix.
- **A10 confirmed pre-sales** — Instagram fix for v1 (PK H12).
- **A11 confirmed pre-sales + scope expanded** — CFW and Invegent both activated in Clock A scope (PK H11). Tokens + prompts for both.
- **A12 confirmed resolved** — portal code search shows zero HeyGen / avatar references. Already satisfied at code level.
- **A13 confirmed resolved** — portal code search shows zero video-analyser references. Confirmed internal-only per PK H15.
- **A18 new — promoted from C2** — 8 source-less Edge Functions promoted from Tier 2 to pre-sales (PK H16: "requires a full on investigation to ensure why there is error, I think these are presales").
- **C1 reframed** — auto-approver math clarified. PK raised correct framing: supply-ratio × pass-rate = demand met. The target is demand-met ratio, not pass-rate absolute.
- **New Section I — Advisor Layer Plan** — references D149.
- **Section H updated** — 12 of 16 open questions resolved; 4 remain.

---

## Framework (reference)

**Clock A — Production continuity:** 14 consecutive days, ≥95% schedule adherence, supply ratio ≥1.5×, miss reasons captured for any deviation.

**Clock B — Operational time:** average <2 hours/day across the same 14-day window.

**Clock C — Client handling readiness:** 7-item checklist (inbound channel, SLA, routing, review modes, emergency pause, testimonial capture, billing automation).

Clock A + B + C all green = gate to first external sales conversation.

---

## Classification schema

- **Pre-sales** — must be true before first external sales conversation. Non-negotiable.
- **Post-sales Tier 1** — within 7 days of first contract signed.
- **Post-sales Tier 2** — within 30–60 days of first sale.
- **Post-sales Tier 3** — ongoing hygiene.
- **Parked** — do not work on until specific trigger fires.

---

## Headline finding

**You are not cleared to start counting the 14-day Clock A window today.** Three conditions block the window start (same as v1):

- A9 — drafts from unassigned feeds hitting post_draft with NULL client_id (not a bug, a scoping gap — fixable in ~30 min by assigning feeds)
- A10 — Instagram 0 posts published in 7 days across all 4 clients
- A11 — CFW + Invegent have no platform tokens and no content_type_prompts

Resolve these first, then start the clock. Advisor layer (D149) can build in parallel — not on the critical path.

---

## Item count summary (v2)

| Classification | Count |
|---|---|
| Pre-sales (Section A) | 18 |
| Post-sales Tier 1 (Section B) | 8 |
| Post-sales Tier 2 (Section C) | 6 |
| Post-sales Tier 3 (Section D) | 12 |
| Parked (Section E) | 4 |
| **Total** | **48** |

---

## Section A — Pre-sales items (18)

**Definition: must be closed before first external sales conversation. Each item has a named deliverable and a completion test.**

| # | Item | Rationale | Concrete action | Audit ref |
|---|---|---|---|---|
| A1 | Pilot structure with liability waiver (supersedes solicitor engagement) | Per D147: solicitor is deferred until first pilot revenue. Pre-sales deliverable becomes a clean pilot agreement with explicit waiver language rather than a solicitor-reviewed productised agreement. | Draft pilot terms: half-priced service (or 3-month free trial), waiver clause (experimental service, client solely responsible for published content, limited warranties). Keep to one page. PK-drafted; no solicitor needed at this gate. | Audit #2 (reframed), D147 |
| A2 | Meta App Review — status resolved OR pilot workaround documented | Standard Access is the productised gate. Pilot-mode (1–2 clients where PK is added as admin on their Business Manager) is defensible under Meta Developer Policies. | Two parallel tracks: (a) await Meta decision, escalate via dev support on 27 Apr if no movement; (b) draft pilot-mode doc specifying first 1–2 clients run under their Business Manager access, time-boxed to Standard Access confirmation. | Audit #1, Sec 4 Gate 1, Sec 6 L002 |
| A3 | One-page proof document | Single most important sales asset. Without it, no artefact to open a conversation with. | 1-page PDF / URL at invegent.com/proof. Content: NDIS Yarns posts published, reach trend, top-3 performing posts with numbers, compliance rules enforced, time saved vs manual. One before/after snapshot. | Audit #6, Consultant Audit 1 |
| A4 | NDIS Yarns numbers worth showing | A3 depends on this. Consultant audit said 4–8 weeks of organic growth needed. Now ~10 weeks in. | Extract NY metrics end of week. If numbers support proof doc → produce A3. If thin → identify what would make them credible and close that gap. | Audit #9, Consultant Audit 1 |
| A5 | Buyer-risk clause — "50% off next month on KPI miss" | Per D148: capital-preserving form of the consultant's 90-day money-back recommendation. Month-on-month cadence, KPI-triggered. | Define 2–3 measurable KPIs (minimum posts/week, engagement rate, follower growth) with thresholds. Include clause in A1 pilot terms. | Audit #8, D148 |
| A6 | Unit economics confirmed — all subscription costs known | Cannot price a service without cost base. 4 TBC rows in subscription register. | Check invoices: Vercel, HeyGen, Claude Max, OpenAI. Update `k.subscription_register`. Confirm firm monthly number. | Audit #32 |
| A7 | Privacy policy updated — YouTube + HeyGen + video-analyser | Policy dated 4 March. Capabilities added after: YouTube Data API (D138), 5 HeyGen functions, video-analyser. L006 gate. | Add three paragraphs: (1) YouTube public data for feed discovery; (2) HeyGen avatar — only with explicit consent; (3) video transcript analysis — transcripts not retained beyond 24h. Re-host. | Audit #4, Sec 1.13, L006 |
| A8 | AI content disclosure clause in service agreement / pilot terms | L007 gate. Contractual clause pre-sales; per-post labelling infrastructure is Tier 2. | Draft clause: "Content generated by ICE is AI-assisted under compliance-aware editorial rules. Client agrees to disclose AI assistance where required by platform policy or regulatory framework." Include in A1. | Audit #5, L007 |
| A9 | Assign 12 unassigned feeds to clients (resolves orphan drafts) | Per PK H6: orphan drafts are not a pipeline bug — they are drafts from RSS feeds and YouTube channels that have no client assignment. Assigning feeds removes the 300 NULL client_id drafts per week at source. | Open dashboard Feeds page. For each of the 12 unassigned feeds: identify correct client (NY / PP / CFW / Invegent) based on feed domain/topic. Assign via the existing UI. ~30 minutes. | Audit #22, PK H6 |
| A10 | Instagram publishing — fix for v1 | PK H12: fix for v1. 0 posts published in 7 days across 4 clients despite publisher v6 deployed and NY/PP prompts live. | Investigate: are IG drafts being generated? Do they reach post_publish_queue? Is `instagram-publisher-every-15m` cron picking them up? Patch whatever breaks. | Audit #27, PK H12 |
| A11 | CFW + Invegent activation — tokens + prompts | PK H11: both in Clock A scope. Currently counted as active clients but producing nothing. Clock A cannot start with them in this state. | (a) Collect FB / IG tokens for CFW (Brief 041 is blocked on PK doing this). (b) Collect FB / IG / LI tokens for Invegent. (c) Write content_type_prompts for CFW × 3 platforms × 3 job types (9 rows). (d) Write content_type_prompts for Invegent × 3 platforms × 3 job types (9 rows). | Audit #15, #16, PK H11 |
| A12 | HeyGen not exposed in v1 client portal — ✅ CONFIRMED | Code search of `invegent-portal` shows zero HeyGen / avatar / consent references. HeyGen is backend-only. L005 gate not violated at the portal level. | Verified 18 Apr via GitHub code search. If any client-facing route is added later that exposes HeyGen, consent flow must be built first (D149 Legal Advisor is a fit for that gate check). | Audit #24, L005 |
| A13 | video-analyser not exposed to clients — ✅ CONFIRMED | Code search + PK H15: video-analyser is part of feed inflow, processing YouTube video transcripts for signal extraction. Backend-only. Not client-facing. L004 gate not violated. | Verified. No action needed. | Audit #25, L004, PK H15 |
| A14 | RLS audit — confirm no portal route bypasses SECURITY DEFINER | Only 10 of 138 tables have RLS enabled. If all portal queries go through SECURITY DEFINER RPCs, RLS-off is missing defence-in-depth but not exploitable. If any portal page queries tables directly, client could read another client's data. | Grep `invegent-portal` codebase for direct Supabase queries (not via `.rpc()` calls). Confirm every query is either (a) RLS-enforced, or (b) SECURITY DEFINER RPC. Flag exceptions. Verification only — may not require building. | Audit #23 |
| A15 | Commit publisher/index.ts and weekly-manager-report/index.ts | Both had uncommitted changes at audit start. Production code differs from repo. Any push will clobber. | `cd` to working dir, `git status`, review diffs, commit, push. ~5 min. Then re-run the verify step (D150). | Audit #36 |
| A16 | Clock A dashboard — exists and measures schedule adherence | Cannot declare "95% adherence" without a dashboard showing it. Does not exist currently. | Build `/continuity` page in dashboard. Data source: compare `c.client_publish_schedule` expected slots vs `m.post_publish` actual. Rolling 14-day per client × platform with miss reasons. Simple — just correct, not beautiful. | Audit #37, new from framework |
| A17 | Clock C seven items — each explicitly defined and lived | The 7 items are listed but none have a written definition of "done." | New doc `docs/16_client_handling.md`. One paragraph per item: what it is, what ready looks like, where it lives, SLA. Inbound + SLA + routing can share one section; testimonial capture and billing automation need actual build. | New from framework |
| A18 | 8 source-less Edge Functions — full investigation | Per PK H16: "this requires a full on investigation to ensure why there is error, I think these are presales." Recovery / rollback blind spot on: `ingest`, `pipeline-doctor`, `pipeline-ai-summary`, `compliance-monitor`, `video-worker`, `video-analyser`, `heygen-intro`, `heygen-youtube-upload`. | For each: check Supabase function logs for error rates, extract deployed source via Supabase dashboard, commit to `supabase/functions/`, add to deployment pipeline. Identify any showing unhealthy error signals — those get priority. | Audit #18, promoted per PK H16 |

### Section A completion test

All 18 items marked done. Then and only then: Clock A + B + C 14-day window starts. No external sales conversation before window completes with metrics in range.

---

## Section B — Post-sales Tier 1 (8)

**Definition: within 7 days of first signed pilot. Required for service delivery to the first client.**

| # | Item | Rationale | Concrete action |
|---|---|---|---|
| B1 | Complete `docs/secrets_reference.md` with 20+ missing env vars | If any token needs rotating and nobody knows where it lives, publishing breaks. | Walk Edge Function source for each env var. Cross-check against Supabase secrets. One row per secret: name, purpose, owning function(s), rotation cadence, replacement source. |
| B2 | Client-specific portal dashboard — "what ICE did for your page this month" | Consultant Audit 1's critical deliverable. Per PK H8: starting point exists; Tier 1 to validate / rebuild. | Walk portal as a client. If operator-oriented, rebuild one page as client-oriented (posts published, reach, top performer, upcoming schedule). |
| B3 | Document `c.client_service_agreement` + `c.onboarding_submission` tables | Core of signing + onboarding. Both have NULL/TODO purpose. D151 rule applies. | Call Claude API to write purpose per D151. Review output. Write to k.table_registry. ~20 rows × 2 tables. |
| B4 | Onboarding runbook for first client | From signed pilot to first autonomous post: what PK does, in order, with timing. | `docs/17_first_client_onboarding_runbook.md`. Step by step. Each step has a "done when" and estimated duration. |
| B5 | Billing automation — invoice → payment → dunning | Clock C item 7. By client 2 needs automation. Do it before client 1. | Choose Xero (already referenced) or Stripe. Set up recurring invoice template. Test with $1 self-invoice. |
| B6 | Testimonial capture workflow | Clock C item 6. Every client who renews at month 3 is a testimonial opportunity. | Define when (month 3 check-in), how (scripted email + optional video), where it goes (proof page + sales deck). Calendar day-90 ask. |
| B7 | Emergency pause workflow | Clock C item 5. One-click halt procedure. | SQL function `public.pause_client(p_client_id UUID)`: set all `c.client_publish_profile.mode` to 'manual', drain queue, pause relevant crons. Test against Invegent first. |
| B8 | Inbound channel + SLA + routing defined | Clock C items 1–3. | Pick channel (support@invegent.com or portal form). Commit SLA: pipeline issues 4h business hours, other 24h. Publish in onboarding doc + portal footer. |

---

## Section C — Post-sales Tier 2 (6)

**Definition: within 30–60 days of first sale.**

| # | Item | Rationale | Concrete action |
|---|---|---|---|
| C1 | Auto-approver — define target demand-met ratio and raise to target | **Reframed per PK H9.** Correct math: supply-ratio × pass-rate = demand met. 23% pass rate is acceptable if supply is 4× demand (D142 seeder targets supply ratio 1.5× — combined: at 1.5× × 23% = 35% of demand met; below target). Target = demand met ratio ≥ 100% with acceptable PK review burden. | Set demand-met target. Diagnose top rejection reasons per client (PP is body_too_long dominant — prompt length fix). Measure combined supply × pass-rate = demand met. Adjust either lever. |
| C2 | Clear compliance review queue + set SLA | 4 items AI-reviewed, pending human review since 1 Apr (17 days stale). | Review the 4. Set SLA: human review within 7 days of AI confidence score. Wire nag if >7 days. |
| C3 | Per-post AI disclosure labelling | Contract clause (A8) is pre-sales. Per-post label infrastructure is best practice. | Column `m.post_draft.ai_disclosure_text`. Configurable per client profile. Include in publisher output. |
| C4 | Fix cron schedule fragility (Audit 4 Gap 3) | 42 active crons firing into one Supabase instance. At 10 clients → concurrency-contended. | Move from time-based firing to queue-table reads. Per-client concurrency guards. Critical between clients 5–10. |
| C5 | Document `k.vw_feed_intelligence` + keep | Per PK H14: not advocating drop; the question was "is it used?" Default is keep + document. D151 rule applies. | Read view definition. Call Claude API per D151. Wire to Feed page in dashboard if surface makes sense. |
| C6 | HeyGen productisation decision | Currently backend-only (A12 confirmed). Decision point: offer avatar features in v2 pilot packaging, or park indefinitely. | PK decision. If "yes in v2": consent flow is a hard gate first (E2 unparks). If "no/not yet": stays parked. |

---

## Section D — Post-sales Tier 3 (12)

**Definition: ongoing doc / governance / hygiene.**

| # | Item | Action |
|---|---|---|
| D1 | sync_state drift — EF count | Fix in next sync. Verify per D150. |
| D2 | sync_state drift — cron count | Same as D1. |
| D3 | sync_state drift — feed count | Same as D1. |
| D4 | Close client-assets bucket issue in sync_state | Bucket is public. Remove "fix first thing" note. |
| D5 | Clean up 2 local-only Edge Functions | Delete `ai-diagnostic` or deploy. Remove `linkedin-publisher` (superseded by linkedin-zapier-publisher). |
| D6 | Document 22 TODO tables per D151 | Batch job. Priority: `c.*` and `m.*` first. |
| D7 | Brief 041 result file | Log as PARTIAL / blocked on tokens. |
| D8 | Brief 042 result file | DONE in reality. Retroactive result.md. |
| D9 | Brief 036 gap investigated | Intentional skip or forgotten? Check. |
| D10 | Subscription register 13 vs 12 rows reconciled | Query `SELECT * FROM k.subscription_register`. D151 for any NULL purpose. |
| D11 | 115 SECURITY DEFINER functions — dead code sweep | Quarterly. For each: called by any Edge Function or dashboard route? If not, deletion candidate. |
| D12 | Audit brief SQL templates fixed | 3 queries had column mismatches. Update for next audit. |

---

## Section E — Parked (4)

**Definition: do not work on until specific trigger fires.**

| # | Item | Trigger to unpark |
|---|---|---|
| E1 | CFW brand colours NULL | When CFW reaches full production (after A11 completion). |
| E2 | HeyGen productisation for clients | L005 consent flow shipped end-to-end + C6 decision to include avatar in client packaging. |
| E3 | Self-serve SaaS onboarding | After 5+ pilot / managed service clients retained for 3+ months each. |
| E4 | Creator / entertainment tier | After self-serve SaaS layer exists. Not before. |

---

## Section F — Fresh-eyes pushback on the framework session (unchanged from v1)

### F1 — You cannot start the 14-day Clock A window today
Audit flagged stability defects but not as Clock A blockers. See Section A items A9, A10, A11. Fix first, then start clock.

### F2 — Auto-approver 23% is not necessarily a problem
50% was a one-day snapshot miscoded as a benchmark. Define target first. Classed as Tier 2 (C1).

### F3 — 90-day cash money-back is the wrong form for a sole trader
Resolved per D148 — "50% off next month on KPI miss" is the capital-preserving alternative.

### F4 — Meta App Review is softer than "no external clients until Standard Access"
Pilot clients where PK is admin on their Business Manager is defensible. Captured in A2 two-track approach.

### F5 — The sync_state handoff protocol has a trust-but-verify hole
Resolved per D150 — verify-commit-landed step added to session-close SOP.

---

## Section G — Pre-sales gate checklist (go / no-go)

This is the single list PK pulls up before opening a sales conversation.

```
Legal (no solicitor required at pilot stage per D147)
[ ] A1  Pilot terms + liability waiver drafted
[ ] A5  50% off KPI miss clause with defined KPIs
[ ] A7  Privacy policy updated (YouTube + HeyGen + video-analyser)
[ ] A8  AI disclosure clause in pilot terms

Proof
[ ] A3  One-page proof document written and hosted
[ ] A4  NDIS Yarns numbers support the proof document

Platform
[ ] A2  Meta App Review resolved OR pilot workaround documented

Stability
[ ] A9  12 unassigned feeds assigned to clients
[ ] A10 Instagram publishing live across NY + PP
[ ] A11 CFW + Invegent tokens + prompts complete
[x] A12 HeyGen not exposed in v1 portal (confirmed via code search)
[x] A13 video-analyser internal-only (confirmed)
[ ] A14 RLS verification — no portal route bypasses SECURITY DEFINER
[ ] A15 Publisher + weekly-manager-report committed (5 min task)
[ ] A16 Clock A dashboard live
[ ] A18 8 source-less Edge Functions investigated + source pulled

Clock C
[ ] A17 All 7 client-handling items defined and documented

Economics
[ ] A6  All TBC subscription costs resolved

Timebox
[ ] Clock A window complete — 14 consecutive days ≥95% adherence
[ ] Clock B window complete — avg <2 hrs/day ops time
[ ] Clock C — all 7 items green

First external sales conversation authorised only when every box above is ticked.
```

---

## Section H — Open questions still requiring PK input (remaining 4 of 16)

12 of 16 resolved in PK Q&A. Remaining:

| # | Question | Blocking item | PK to answer |
|---|---|---|---|
| H1 | Vercel deployment state | A16 | Run `vercel login` in your terminal once. Caches a token the MCP can use. No new permissions to give — one-time 5-second action. |
| H2 | Last commit dates for dashboard / portal / web repos | A14, A16 | I checked `invegent-portal` this session — will check dashboard + web next session and add results here. |
| H3 | Meta App Review status change since 14 Apr | A2 | Blocked on (a) Shrishti 2FA + passkey — you to chase; (b) invegent.com DNS TXT — needs investigation. |
| H16 | 8 source-less Edge Functions — any showing unhealthy error signals | A18 | Now pre-sales per your answer. Investigation happens in A18 execution, not as a standalone question. |

**Resolved this session:**
- H4 → D147 (pilot + waiver, defer solicitor)
- H5 → portal code search: zero avatar/consent/HeyGen references (A12 satisfied)
- H6 → orphan drafts = unassigned feeds (A9 reframed)
- H7 → no proof doc elsewhere (A3 stands)
- H8 → Tier 1 to validate / rebuild client dashboard (B2)
- H9 → auto-approver math clarified: supply × pass-rate = demand met (C1 reframed)
- H10 → D148 (50% off next month on KPI miss)
- H11 → CFW + Invegent in Clock A scope (A11 confirmed)
- H12 → Instagram fix for v1 (A10 confirmed)
- H13 → D151 (universal table purpose rule)
- H14 → keep vw_feed_intelligence + document (C5)
- H15 → video-analyser internal-only (A13 confirmed)

---

## Section I — Advisor Layer Plan (new, per D149)

Parallel track to pre-sales work. Not on the critical path — does not gate any Section A item. But highest-leverage long-term investment because it transfers to every future project.

### Build order
1. **Sales Advisor (this week)** — Claude Project, custom instruction defining persona + scope + escalation rules, GitHub repo connected for docs access. Ask three real questions (pre-sales gate closure, first client target, half-priced pilot structure). Validate over two weeks.
2. **Legal/Risk Advisor (week 3 if Sales Advisor validates)** — same template. Particularly valuable given D147 defers solicitor; Legal Advisor reads proposed pilot terms and flags exposure.
3. **Ops Discipline Advisor (week 4)** — reads Clock B metrics, catches overcommitment.
4. **Product Strategy Advisor (week 5)** — separate voice from session-active Claude to avoid executor-reviewing-own-work.

### Validation criteria (after 2 weeks with Sales Advisor)
- Did PK read advisor responses and change any decision based on them?
- Did the advisor catch anything PK would not have caught alone?
- Are the responses specific to ICE context (good) or generic consulting platitudes (bad)?

If yes to first two, proceed to next advisor. If no, tighten brief and retry once before abandoning the pattern.

### Audit infrastructure (build before first consultation)
`m.advisor_log` table per D149. Log every question + response. Retrospective verdict filled in after 6 weeks. After a quarter: advisors with poor retrospective scores get rewritten or retired.

### What this does NOT replace
- PK's strategic commitments (decisions stay with PK)
- Human advisors / mentors / peers
- High-stakes one-shot calls

---

## Change log

- **2026-04-18 morning** — v1 initial classification. Produced in Claude.ai session following Claude Code audit.
- **2026-04-18 afternoon** — v2 reflecting PK answers to 16 open questions. Material changes: A1 reframed (D147), A5 sharpened (D148), A9 reframed (feed assignment), A11 confirmed + expanded, A18 promoted from C2, C1 reframed (demand-met math), new Section I (advisor layer per D149). 12 of 16 open questions resolved; 4 remain.

---

*End of classification v2. PK to action Section G checklist.*
