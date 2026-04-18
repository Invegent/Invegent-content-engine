# ICE — Pre-Sales / Post-Sales Classification

## Generated: 2026-04-18
## Type: Classification document — outputs of session following `docs/14_pre_sales_audit_inventory.md`
## Inputs: audit inventory (38 items + 13 open questions), 3-clock framework, consultant audit (8 Apr), legal register L001–L008

---

## Purpose

This document converts the audit's Section 12 findings (un-classified) into an actionable pre-sales gate. Every audit item is classified as pre-sales, post-sales tier 1/2/3, or parked. The rationale for each classification is explicit. Fresh-eyes pushback on the framework session that produced the audit is in Section F.

This is the definitive pre-sales gate document until superseded. When all Section A items are closed, PK may begin first external sales conversations.

---

## Framework (reference)

**Clock A — Production continuity:** 14 consecutive days, ≥95% schedule adherence, supply ratio ≥1.5×, miss reasons captured for any deviation.

**Clock B — Operational time:** average <2 hours/day across the same 14-day window, measured as total PK time spent on ICE ops (draft review, pipeline troubleshooting, client support).

**Clock C — Client handling readiness:** 7-item checklist:
1. Inbound channel defined (email? form? phone?)
2. Response SLA committed (e.g. 24h for questions, 4h for pipeline incidents)
3. Routing defined (who handles what)
4. Review modes defined (auto / flagged / manual per content type)
5. Emergency pause (one-click halt of all publishing for a client)
6. Testimonial capture workflow (how / when we ask)
7. Billing automation (invoice generation, payment collection, dunning)

Clock A + B + C all green = gate to first external sales conversation.

---

## Classification schema

- **Pre-sales** — must be true before first external sales conversation. Non-negotiable.
- **Post-sales Tier 1** — within 7 days of first contract signed. Required to deliver the service reliably.
- **Post-sales Tier 2** — within 30–60 days of first sale. Quality / scale / compliance improvements.
- **Post-sales Tier 3** — ongoing hygiene. Fix in normal doc/ops maintenance cycles.
- **Parked** — do not work on until a specific trigger fires (e.g. second client signed, Meta Standard Access granted, HeyGen added to v1 packaging).

---

## Headline finding

**You are not cleared to start counting the 14-day Clock A window today.**

Three conditions block the window start:
- Orphan drafts (300 rows with NULL client_id in last 7 days) — pipeline defect actively shedding output
- Instagram 0 posts published across all 4 clients in last 7 days — publisher deployed but pipeline not producing
- CFW and Invegent have no platform tokens and no content_type_prompts — they are counted as "active clients" but cannot publish autonomously

These must be resolved (or those clients/platforms explicitly descoped from Clock A measurement) before the 14-day window starts. Otherwise you are measuring a window that contains known failures and any "95% adherence" number is noise.

**Recommended sequence:**
1. Close stability gaps (pre-sales Section A items 14–18 below) — target: 3–5 days
2. Start 14-day Clock A window — day 0 clock starts
3. During the window: complete other pre-sales items (legal, proof doc, Clock C checklist)
4. End of window + all pre-sales items closed: begin sales conversations

---

## Item count summary

| Classification | Count |
|---|---|
| Pre-sales | 17 |
| Post-sales Tier 1 | 8 |
| Post-sales Tier 2 | 7 |
| Post-sales Tier 3 | 11 |
| Parked | 4 |
| **Total** | **47** |

47 items > 38 audit items because some audit items split (e.g. AI disclosure: contract clause is pre-sales, per-post labelling is tier 2) and some framework-derived items are new (Clock A dashboard, Clock B logger, Clock C seven items as distinct deliverables).

---

## Section A — Pre-sales items (17)

**Definition: must be closed before first external sales conversation. Each item has a named deliverable and a completion test.**

| # | Item | Rationale | Concrete action | Audit ref |
|---|---|---|---|---|
| A1 | Signed service agreement template, legally reviewed | Cannot contract a paying client without a lawyer-reviewed agreement. ToS clauses for NDIS content liability (L001), RSS content generation (L003), video analyser scope (L004), AI content disclosure (L007) must be in one reviewed document. | Engage NSW solicitor (~$2,000–5,000 AUD). Brief: review `docs/legal/service_agreement_v1.md`, specifically sections covering content liability disclaimers, IP (RSS-derived AI content), AI disclosure clause, limitation of liability. Output: revised agreement with [LEGAL REVIEW REQUIRED] markers removed. | Audit #2, Sec 6 L001/L003/L004/L007 |
| A2 | Meta App Review — status resolved or pilot workaround documented | Without Standard Access you cannot productise publishing for third-party client pages at scale. However, a pilot client where PK is added as admin on their Business Manager and publishes under their app credentials is defensible under Meta's Developer Policies. | Two parallel tracks: (a) await Meta decision, escalate via dev support on 27 Apr if no movement. (b) draft a pilot mode doc: first 1–2 clients run under their Business Manager access, explicitly time-boxed (90 days) to Standard Access confirmation. | Audit #1, Sec 4 Gate 1, Sec 6 L002 |
| A3 | One-page proof document | Consultant Audit 1 (8 Apr) flagged this as the single most important pre-sales deliverable. Without it you have no artefact to put in front of a provider. It is 1–2 hours of work. | Produce a 1-page PDF / URL. Content: NDIS Yarns posts published to date, reach trend, top-3 performing posts with engagement numbers, compliance rules enforced, time saved vs manual. Include one before/after snapshot. Host at `invegent.com/proof` or attach to sales conversations. | Audit #6, Consultant Audit 1 |
| A4 | NDIS Yarns numbers worth showing | A4 and A3 are the same gate said two ways. Consultant audit said 4–8 weeks of organic growth needed. You are at ~10 weeks. Numbers may be thin — that is fine for an honest proof doc framed as "early pilot." | Extract NY metrics at end of this week. If numbers support a proof doc, produce it (A3). If numbers are still embarrassing, identify what would make them credible (boost spend? cross-posting?) and close that gap. | Audit #9, Consultant Audit 1 |
| A5 | Buyer-risk-reduction clause in service agreement | Consultant audit recommended 90-day money-back framing. For a sole trader, cash refund is risky. Substitute: service-extension guarantee — "we extend the engagement at no cost until [specific metric] is met." Same buyer-risk reduction, different capital exposure. | Decide the form (cash refund vs service extension vs none). Write the clause. Include in A1 legal review. | Audit #8, Consultant Audit 1 |
| A6 | Unit economics confirmed — all subscription costs known | You cannot price a service when you do not know your cost base. 4 subscriptions are TBC (Vercel, HeyGen, Claude Max, OpenAI). | Check each invoice / login. Resolve the 4 TBC rows. Update `k.subscription_register` and sync_state. Confirm `~$314 + TBC` becomes a firm monthly number. | Audit #32 |
| A7 | Privacy policy updated for YouTube Data API + HeyGen + video-analyser | Policy is dated 4 March. Since then: YouTube Data API added (D138), 5 HeyGen functions deployed, video-analyser deployed. Required by L006 "current capabilities." | Add three paragraphs covering: (1) YouTube public data consumption for feed discovery, (2) HeyGen avatar integration — only with explicit consent, (3) video transcript analysis — transcripts not retained beyond 24h. Re-host at invegent.com. | Audit #4, Sec 1.13, Sec 6 L006 |
| A8 | AI content disclosure clause in service agreement | L007 gate. The client needs to know (and should disclose to their audience) that content is AI-assisted. Per-post labelling infrastructure is separate (Tier 2); the contractual clause is pre-sales. | Draft clause: "Content generated by ICE is AI-assisted under compliance-aware editorial rules. Client agrees to disclose AI assistance where required by platform policy or regulatory framework." Include in A1. | Audit #5, Sec 6 L007 |
| A9 | Fix or descope 300 orphan drafts | Active pipeline defect. Either root-cause and fix, or identify the bypass path (email-ingest? series-writer?) and confirm those drafts are not expected to have client_id. Clock A cannot start until this is settled. | Code trace on ai-worker insert logic. Identify where client_id is dropped. Either patch the insert, or confirm the orphan source is a non-client path and filter those rows from Clock A metrics. | Audit #22, Sec 13 Q6 |
| A10 | Instagram publisher — either producing or explicitly descoped | 0 posts published in 7 days across 4 clients despite publisher v6 deployed and prompts live for NY/PP. Either a pipeline bug (no drafts reaching IG route) or an intentional gap. | Investigate: are IG drafts being generated? Do they reach `post_publish_queue`? Is `instagram-publisher-every-15m` cron picking them up? If intentionally dormant, remove IG from v1 client packaging and sync_state. If bug, fix. | Audit #27 |
| A11 | CFW + Invegent — either activated or descoped from "4 active clients" | sync_state counts 4 clients. Audit confirms 2 of those 4 have no tokens, no prompts, no publishing. Counting them as active corrupts Clock A measurement. | Decision point: (a) activate CFW (collect tokens per Brief 041, write prompts) — adds Clock A surface; or (b) park CFW and Invegent as "pilot clients not yet in Clock A window." Either is fine. Pick one and document. | Audit #15, #16, Sec 9 |
| A12 | Confirm HeyGen avatar features are not exposed to v1 client portal | L005 gate. HeyGen is built but consent flow is partial. Exposing HeyGen features in the portal before the signed-consent pipe is end-to-end is the direct violation the legal register warned against. | Walk the portal as a client user (test account). Confirm: no HeyGen trigger UI visible, no avatar generation available in onboarding, no avatar preview in dashboard. If visible, hide via feature flag until consent flow shipped. | Audit #24, Sec 6 L005 |
| A13 | Confirm video-analyser is not exposed to v1 clients | L004 gate. Function deployed at v9 but unclear if referenced by any client-accessible route. | grep portal + dashboard source for `video-analyser` calls. If called from a client-facing route, gate behind feature flag. If internal-only, document and move on. | Audit #25, Sec 6 L004 |
| A14 | RLS audit — confirm no portal route bypasses SECURITY DEFINER | Only 10 of 138 tables have RLS enabled. If all portal queries go through SECURITY DEFINER functions with explicit `p_client_id UUID`, RLS-off is a missing defence-in-depth layer but not actively exploitable. If any portal page queries a table directly, a client could read another client's data. | Grep portal codebase for direct Supabase queries. Confirm every query is either (a) RLS-enforced table, or (b) RPC call to SECURITY DEFINER function. Flag any exceptions. This is a verification, not necessarily a build — RLS-off may be fine if portal architecture is clean. | Audit #23 |
| A15 | Commit publisher/index.ts and weekly-manager-report/index.ts | Both had uncommitted changes at audit start. Code running in production differs from repo. Any future push will clobber. | `git status`, review diffs, commit with message explaining the change, push. Re-run this check before every session close from now on (session-close SOP update). | Audit #36, Sec 10 |
| A16 | Clock A dashboard — exists and measures the right thing | Cannot declare "95% adherence" without a dashboard showing adherence per client × platform × day over 14 days. Currently this does not exist. | Build a `/continuity` page in dashboard. Data source: compare `c.client_publish_schedule` expected slots vs `m.post_publish` actual publishes. Computed field: `slots_met / slots_scheduled`. Display: rolling 14-day per client with miss reasons. Target: simple — does not need to be beautiful, just correct. | New from framework, Audit Sec 12 #37 |
| A17 | Clock C seven items — each explicitly defined and lived | The 7 Clock C items are listed but none have a written definition of "done." Without that, you cannot answer "is Clock C green?" | For each of the 7 items, write one paragraph in `docs/16_client_handling.md` (new doc): what it is, what "ready" looks like, where it lives (email folder? form? dashboard page?), one sentence SLA. Inbound channel + SLA + routing can share one section; testimonial capture and billing automation are the hardest and need actual build. | New from framework |

### Section A completion test

All 17 items marked done. Then and only then: Clock A + B + C window starts. No external sales conversation before window completes with metrics in range.

---

## Section B — Post-sales Tier 1 (8)

**Definition: within 7 days of first signed contract. Required for service delivery to the first client.**

| # | Item | Rationale | Concrete action |
|---|---|---|---|
| B1 | Complete `docs/secrets_reference.md` with 20+ missing env vars | If any token needs rotating and nobody knows where it lives, publishing breaks. Audit #20 lists 20+ vars referenced in code but not in the reference doc. | Walk Edge Function source for each referenced env var. Cross-check against Supabase dashboard → Settings → Edge Functions → Secrets. Write one row per secret: name, purpose, owning function(s), rotation cadence, where to get a replacement value. |
| B2 | Client-specific portal dashboard — "what ICE did for your page this month" | Consultant Audit 1's critical deliverable. Portal Home exists (Brief 024) and Performance exists (Brief 031). The question is whether these present client-specific data in a form a client actually understands, not a form an operator understands. | PK walkthrough of the portal as a client. If dashboard is operator-oriented (queue depth, draft statuses), rebuild one page as client-oriented (posts published, reach, top performer, upcoming schedule). |
| B3 | Document `c.client_service_agreement` and `c.onboarding_submission` tables | Core of the signing + onboarding workflow. Both currently have NULL/TODO purpose per `k.vw_table_summary`. You cannot onboard without knowing what each column means. | Update `k.column_purpose` for both tables. Two tables × ~10 columns = ~20 rows. Takes 30 minutes. |
| B4 | Onboarding runbook for first client | From first signed agreement to first autonomous post: what PK does, in order, with timing. | One markdown doc: `docs/17_first_client_onboarding_runbook.md`. Headers: (1) contract signed, (2) invoice issued, (3) technical onboarding (tokens, page access, brand kit), (4) first content brief, (5) first published post, (6) first weekly check-in. Each step has a "done when" and an estimated duration. |
| B5 | Billing automation — invoice → payment → dunning | Clock C item 7. For one client you can do it by hand. By client 2, it needs to be automated. Do it before client 1 signs. | Choose billing tool: Xero (already referenced in tool list), Stripe, or both. Set up recurring invoice template. Test end-to-end with a $1 invoice to yourself. |
| B6 | Testimonial capture workflow | Clock C item 6. Biggest compounding asset. Every client who renews at month 3 is a testimonial opportunity. | Define: when (month 3 check-in), how (scripted email + optional video), where it goes (website + sales deck). Put the first ask in your calendar for day 90 of client 1. |
| B7 | Emergency pause workflow | Clock C item 5. If a client says "pause immediately" (compliance issue, reputation, cancellation notice) you need a documented, one-click procedure. | SQL function `public.pause_client(p_client_id UUID)` that sets all `c.client_publish_profile.mode` to 'manual', drains `m.post_publish_queue`, pauses relevant cron jobs for that client. Test against Invegent first. |
| B8 | Inbound channel + SLA + routing defined and published | Clock C items 1–3. Where does a client reach you? How fast do you respond? For what kinds of requests? | Pick: dedicated email alias (support@invegent.com) or portal form. Commit SLA: pipeline issues 4h business hours, everything else 24h. Publish in client onboarding doc and in portal footer. |

---

## Section C — Post-sales Tier 2 (7)

**Definition: within 30–60 days of first sale. Quality, scale, and compliance improvements.**

| # | Item | Rationale | Concrete action |
|---|---|---|---|
| C1 | Raise auto-approver pass rate to defined target | 7-day rolling rate is 23%. Target has never been defined. Once defined, improvement is prompt engineering (PP is body_too_long dominant — a prompt length fix will move PP from 24% toward 40–50%). | Set target (e.g. 50% approval, 30% review, 20% reject). Diagnose top rejection reasons per client. Fix the top 3 causes. Re-measure after 14 days. |
| C2 | Pull 8 source-less Edge Functions into local repo | Recovery / rollback blind spot. If `ingest` or `compliance-monitor` breaks, current state is "edit in Supabase dashboard and hope." | For each of: `ingest`, `pipeline-doctor`, `pipeline-ai-summary`, `compliance-monitor`, `video-worker`, `video-analyser`, `heygen-intro`, `heygen-youtube-upload` — export from Supabase, commit to `supabase/functions/`, add to deployment pipeline. |
| C3 | Clear compliance review queue and set SLA | 4 items pending human review since 1 Apr, 17 days stale. AI has reviewed them; PK has not. | Review the 4. Set SLA for future compliance items: human review within 7 days of AI confidence score being generated. Wire a Slack/email nag if item sits >7 days. |
| C4 | Per-post AI disclosure labelling infrastructure | Contract clause (A8) covers legal exposure. Actual per-post label (in post body, in image watermark, or in metadata) is regulatory best practice for 2026+ and cheap to build. | Add a column `m.post_draft.ai_disclosure_text` that generates "*AI-assisted draft reviewed by [client name]*" or similar. Client can configure per profile. Include in publisher output. |
| C5 | Activate CFW as an internal reference client | Not required for external sales, but strengthens the proof story ("4 active clients" is more credible than "2 active clients"). Brief 041 is blocked on PK collecting tokens. | Collect CFW Facebook, Instagram, LinkedIn (already Zapier-bridged). Write content_type_prompts (Facebook × 3, IG × 3, LI × 3). Write CFW brand colours into `c.client_ai_profile`. |
| C6 | Fix cron schedule fragility (Audit 4 Gap 3) | 42 active cron jobs firing into one Supabase instance. At 10 clients this becomes concurrency-contended and publishing starts silently failing. | Move from time-based cron firing to queue-table reads. Add per-client concurrency guards. This is a tech debt item that becomes critical between clients 5 and 10. |
| C7 | Build `k.vw_feed_intelligence` documentation + wire to a surface | View exists, has no documented purpose. Likely either critical (feed quality signal) or abandoned. Resolve. | Read the view definition. If useful, add purpose + wire to Feed page in dashboard. If abandoned, drop it. |

---

## Section D — Post-sales Tier 3 (11)

**Definition: ongoing doc / governance / hygiene. Fix in normal maintenance cycles.**

| # | Item | Action |
|---|---|---|
| D1 | sync_state drift — EF count 42 vs 40 | Fix in next sync_state write. Add session-close verification step. |
| D2 | sync_state drift — cron 63 vs 42 | Same as D1. |
| D3 | sync_state drift — feeds 60 vs 40 | Same as D1. |
| D4 | Close client-assets bucket issue in sync_state | Audit confirmed bucket is public. Remove the "fix first thing" note. |
| D5 | Clean up 2 local-only Edge Functions | Delete `ai-diagnostic` or deploy it. Remove `linkedin-publisher` (superseded by linkedin-zapier-publisher). |
| D6 | Document 22 TODO tables | Prioritise `c.*` and `m.*` first (client-facing / pipeline-critical). Governance backlog in k schema. |
| D7 | Brief 041 status logged as PARTIAL / blocked on tokens | One-line result file. |
| D8 | Brief 042 result file created | DONE in reality (linkedin-zapier-publisher shipped). Write retroactive result.md. |
| D9 | Brief 036 gap investigated | Check notes, Telegram, Cowork tasks. If intentional skip, note and move on. |
| D10 | Subscription register 13 vs 12 rows reconciled | Identify the extra row, decide if sync_state needs updating or k.subscription_register does. |
| D11 | 115 SECURITY DEFINER functions — dead code sweep | Periodic sweep: for each, is it called by at least one Edge Function or dashboard route? If not, mark candidate for deletion. Do quarterly. |
| D12 | Audit brief SQL templates fixed | 3 queries in brief had column-name mismatches. Update for next audit run. |

---

## Section E — Parked (4)

**Definition: do not work on until a specific trigger fires.**

| # | Item | Trigger to unpark |
|---|---|---|
| E1 | CFW brand colours NULL | When CFW activated as reference client (C5). |
| E2 | HeyGen productisation for clients | L005 consent flow shipped end-to-end + decision to include avatar in client packaging. |
| E3 | Self-serve SaaS onboarding (Consultant Audit 2) | After 5+ managed service clients retained for 3+ months each. |
| E4 | Creator/entertainment tier | After self-serve SaaS layer exists. Not before. Consultant Audit 2 was explicit: the current temptation to skip to creator tier would be a mistake. |

---

## Section F — Fresh-eyes pushback on the framework session

Five places where I think the 18 Apr framework session / audit needs correction or sharpening.

### F1 — You cannot start the 14-day Clock A window today

The audit surfaces three active stability defects (orphan drafts, IG publishing zero, CFW/Invegent not producing) but does not flag that these block Clock A measurement. The framework implicitly treats "audit complete" as equivalent to "ready to start measuring." It is not. See Section A items A9, A10, A11. Fix those first, then start the clock.

### F2 — Auto-approver 23% is not necessarily a problem

The 18 Apr session logged this as HIGH severity drift (50% claimed, 23% actual). That framing assumes 50% was the target. It wasn't — it was a one-day snapshot that made it into sync_state as if it were a benchmark. 23% may be acceptable if the target is "auto-approve a quarter, review the rest, ship every day within Clock B." Before calling this a gate, define the target. I classed it as Tier 2 (quality work) not Pre-sales (blocker). If PK disagrees, reclassify.

### F3 — 90-day cash money-back is the wrong form

Consultant Audit 1 recommended "90-day money-back framing." For a sole trader with 1–2 initial clients, a 90-day cash refund is material capital exposure. Service-extension guarantee ("we continue month-on-month at no cost until [specific metric] is met") achieves the same buyer-risk reduction without the capital hit. I captured this under A5 — PK to pick the form.

### F4 — Meta App Review is a softer gate than "no external clients until Standard Access"

Legal register L002 framed this as a hard gate. Audit #1 inherits that framing. Fresh-eyes read: for a pilot client where PK is added as a full admin on their Business Manager and publishing uses their app permissions rather than a third-party app bundle, you are operating as their admin — not as a productised third-party tool at scale. This is defensible under Meta's Developer Policies for 1–2 pilot relationships. Productising (self-serve Facebook connect in portal for anonymous new clients) is where Standard Access becomes non-negotiable. Captured in A2 two-track approach.

### F5 — The sync_state handoff protocol has a trust-but-verify hole

18 Apr sync_state wrote "audit inventory committed" before verifying the commit landed on main. It did not. The 18 Apr audit itself is an instance of the same optimism-bias it was commissioned to surface (42 EFs claimed vs 40 real, 63 crons vs 42, etc.). The handoff protocol needs a verification step at write time: before declaring any file "committed," check `git ls-remote`. Two-line shell check, catches every instance. Add to session-close SOP.

---

## Section G — Pre-sales gate checklist (go / no-go)

This is the single list PK pulls up before opening a sales conversation. Every item must be ✅ before the first external pitch.

```
Legal
[ ] A1  Service agreement reviewed by NSW solicitor, signed clean copy ready
[ ] A5  Buyer-risk clause decided + in service agreement
[ ] A7  Privacy policy updated for YouTube + HeyGen + video-analyser
[ ] A8  AI disclosure clause in service agreement

Proof
[ ] A3  One-page proof document written and hosted
[ ] A4  NDIS Yarns numbers support the proof document

Platform
[ ] A2  Meta App Review status resolved OR pilot workaround documented

Stability
[ ] A9  Orphan drafts — root cause identified and resolved or descoped
[ ] A10 Instagram publishing — producing or explicitly descoped from v1
[ ] A11 CFW/Invegent — activated or descoped from Clock A scope
[ ] A12 HeyGen hidden in v1 portal
[ ] A13 video-analyser hidden in v1 portal
[ ] A14 RLS verification — no portal route bypasses SECURITY DEFINER
[ ] A15 Publisher + weekly-manager-report committed to repo
[ ] A16 Clock A dashboard live and measuring

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

## Section H — Open questions still requiring PK input

From audit Section 13 + this session. Each needs a PK answer before some item above can be fully executed.

| # | Question | Blocking item | PK to answer |
|---|---|---|---|
| H1 | Vercel deployment state for 3 projects — MCP needs interactive auth | A16 (dashboard needs deploy) | Run `vercel login` then re-invoke audit |
| H2 | Last commit dates for `invegent-dashboard` / `invegent-portal` / `invegent-web` | A14, A16 | `cd` into each, `git log -1 --format='%h %ai %s'`, paste |
| H3 | Meta App Review: any status change since 14 Apr? | A2 | Check Meta Business Manager → App Review |
| H4 | Has solicitor been engaged? Quote received? Timeline? | A1 | Direct answer |
| H5 | Does portal collect signed avatar consent end-to-end? | A12 | Walk through portal onboarding, verify consent flow exists and stores a signed row |
| H6 | Orphan drafts: is there a non-client seed path (email-ingest, series-writer) that legitimately produces NULL client_id? | A9 | Code trace (Tier 2 investigation is fine, but answer "is this a bug or expected?" first) |
| H7 | Is there a proof doc draft outside the repo? | A3 | Check Google Drive, local files |
| H8 | Is the current portal dashboard effective as a sales demo, or does it read as operator-oriented? | B2 | Walk through as a client; decide rebuild vs keep |
| H9 | What is the auto-approver target pass rate? | C1 | Single decision: 30%? 50%? 70%? |
| H10 | Buyer-risk clause form: cash refund, service extension, or none? | A5 | Single decision |
| H11 | CFW/Invegent: activate in v1 Clock A scope, or park? | A11 | Single decision |
| H12 | Instagram: fix for v1 or descope for v1? | A10 | Single decision |
| H13 | 13th subscription_register row — what is it? | D10 | Query: `SELECT * FROM k.subscription_register` |
| H14 | `k.vw_feed_intelligence` — keep/drop? | C7 | Read the view definition, decide |
| H15 | Is video-analyser referenced from any client-facing route? | A13 | Grep portal + dashboard source |
| H16 | Any of the 8 source-less Edge Functions showing error signals that make them Tier 1 not Tier 2? | C2 | Check Supabase function logs for each |

---

## How this document is used

- **Today:** PK reviews classifications. Pushes back on any line that's wrong. Answers H1–H16 where possible (most take <10 minutes each).
- **This week:** PK closes Section A pre-sales items sequentially (A9/A10/A11 first — stability — then the clock starts).
- **Days 1–14 of Clock A window:** PK closes remaining Section A items in parallel (legal, proof doc, Clock C definitions).
- **End of 14-day window:** PK evaluates the Section G gate checklist. If all green → first external sales conversation. If any red → diagnose the specific red, close it, restart the 14-day clock for whatever metric is affected.
- **After first signed contract:** Section B items execute in the first week. Section C over 30–60 days. Section D in normal cadence. Section E stays parked until triggers fire.

This document supersedes the "Phase 1 / Phase 2 / Phase 3" mental model for pre-sales gating. Phases describe what has been built; this document describes what gates the next commercial step.

---

## Change log

- 2026-04-18 — Initial classification. Produced in Claude.ai session following Claude Code audit. Supersedes no earlier document.

---

*End of classification. PK to action.*
