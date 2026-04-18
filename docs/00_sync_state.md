# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-18 (Pre-sales reconciliation audit completed, session handoff)
> Written by: PK + Claude reconciliation

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. **Next session: read `docs/14_pre_sales_audit_inventory.md` first — this is the reconciliation audit committed 18 Apr. It flags drift between docs and reality.**
3. Query k schema before working on any table: `SELECT * FROM k.vw_table_summary WHERE schema_name='x' AND table_name='y'`
4. Do NOT fall into discovery mode.

---

## ⚠️ FIRST THING NEXT SESSION — PRE-SALES CLASSIFICATION

**Open a new Claude.ai chat inside the ICE project. Say:**

> Audit inventory is committed at `docs/14_pre_sales_audit_inventory.md`. Read it fully, then let's do the pre-sales classification. Target output: `docs/15_pre_post_sales_criteria.md`.

The classification session will:
- Review all 38 items in Section 12 of the audit
- Resolve the 13 open questions in Section 13
- Classify each item as pre-sales / post-sales tier 1 / tier 2 / tier 3 / parked
- Produce `docs/15_pre_post_sales_criteria.md` as the definitive pre-sales gate document

---

## 18 APRIL 2026 — AUDIT SESSION SUMMARY

**Session type:** Strategic reflection + pre-sales audit preparation

### What happened this session

1. **Self-reflection conversation** — PK asked for honest assessment of work patterns, hours, thinking evolution across the project. Conclusion: sharp on system, continued rigour on sales-readiness. Not avoidance — solo-operator sequential planning.

2. **Pre-sales framework built** — three clocks defined:
   - Clock A: Production continuity — 14 consecutive days, ≥95% schedule adherence, supply ratio ≥1.5x, miss reasons captured
   - Clock B: Operational time — average <2 hours/day across the 14-day window
   - Clock C: Client handling readiness — 7-item checklist (inbound channel, SLA, routing, review modes, emergency pause, testimonial capture, billing automation)

3. **Pre-sales audit brief committed** — `docs/briefs/2026-04-18-pre-sales-audit.md`

4. **Audit executed via Claude Code** — 12 minutes, produced `docs/14_pre_sales_audit_inventory.md` with Sections 1-13 populated.

### Key audit findings (Section 12 headline items — NOT YET CLASSIFIED)

- **Infrastructure drift:** sync_state claims 42 Edge Functions / 63 cron jobs / 60 active feeds. Audit found 40 / 42 / 40. Material discrepancies need reconciling.
- **Auto-approver pass rate correction:** 7-day rolling rate is ~23%, not the 50% claimed in 17 Apr sync. End-of-day validation was point-in-time, not rolling.
- **client-assets bucket already public** — the "fix first thing next session" in previous sync state is already done.
- **8 Edge Functions deployed with no local source code** — source-of-truth risk, cannot patch if they break.
- **20+ env vars referenced in code but missing from `docs/secrets_reference.md`** — secrets doc is stale.
- **RLS disabled on most c.* / m.* tables** — multi-tenant isolation gap.
- **HeyGen fully integrated ahead of L005 avatar consent legal gate** — legal register said consent workflow must exist before HeyGen integration. Order was reversed.
- **300 orphan post_drafts with NULL client_id** despite D127 v2 backfill. Partial backfill only.
- **Consultant audit (8 Apr) pre-sales items NOT DONE:** one-page proof doc, 90-day money-back framing.
- **L002 Meta App Review:** still In Review. 27 Apr escalation trigger is 9 days away.

### Blockers captured in Section 13
- Vercel MCP requires interactive auth (only `authenticate` tool available in audit context)
- `gh` CLI not installed — audit couldn't check sibling repos
- Meta review status needs PK confirmation
- Solicitor engagement external

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate to first external client conversation is OPEN.**
**4 clients, 14 publish profiles, 5 platforms — audit found 40 cron jobs and 40 Edge Functions (sync_state was overstating).**

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI | Platforms | Website |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 15 | active | FB ✅ IG ✅ LI ✅ WP ✅ | careforwelfare.com.au |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB ✅ IG ✅ LI ✅ | invegent.com ✅ blog live |

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | Publisher | NY | PP | CFW | Invegent | Notes |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.7.0 | ✅ | ✅ | ✅ | ✅ | 375+ posts. Schedule wiring live. |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 published — prompts live |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | LIVE. First PP post published 15 Apr. |
| YouTube | youtube-publisher v1.5.0 | ✅ | ✅ | ❌ future | ❌ future | prompts live |
| WordPress | wordpress-publisher v1.0.0 | ❌ | ❌ | ✅ active | ❌ | CFW pipeline generating |

---

## CONTENT TYPE PROMPTS — COVERAGE STATE

| Platform | NDIS Yarns | Property Pulse | CFW | Invegent |
|---|---|---|---|---|
| Facebook | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| Instagram | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| LinkedIn | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| YouTube | ✅ 3 job types | ✅ 3 job types | ❌ future | ❌ future |

**CFW and Invegent content_type_prompts:** Pending — needs dedicated content session per client.

---

## 17 APRIL 2026 — FULL BUILD DAY SUMMARY (preserved from prior sync)

### Pipeline fixes
- **D135 — Pipeline selection gap FIXED** — `select_digest_candidates()` + cron #62 every 30m. 550 candidates promoted, pipeline unblocked.
- **D127 v2 — Incident auto-resolve FIXED** — rewritten to join through digest_item → digest_run (post_draft.client_id was NULL). Backfilled client_id on all existing post_draft rows. **AUDIT NOTE 18 APR:** 300 orphan post_drafts with NULL client_id remain — backfill was partial.
- **D140 — Score gate disabled** — auto-approver v1.5.0, min_score=0. All final_scores = 0 (old bundler removed). Gate re-enabled when D140 scoring is built.
- **D142 — Demand-aware seeder LIVE** — seed_and_enqueue_ai_jobs_v1 v2. Caps supply to weekly demand × 1.5 buffer. NY: target=9, was generating 147/week (94% waste). PP: target=9, was generating 63/week. Zero new seeds created on first run — queues already over target.
- **Throttle fix** — all publish profiles now have max_per_day=2, min_gap_minutes=240 minimum. NY/PP Facebook retain 360-minute gap. Publisher schedule overrides throttle (D141).

### Dashboard builds (D126-D139) — preserved in 06_decisions.md

### CFW brand profile — resolved (logo + persona + system prompt + profession). Colours still NULL (manual entry).

### Decisions logged
- **D141-D146** — see 06_decisions.md for full analysis

---

## AUTO-APPROVER STATE (CORRECTED BY 18 APR AUDIT)

| Metric | Point-in-time (17 Apr validation) | 7-day rolling (18 Apr audit) |
|---|---|---|
| Overall pass rate | 50% | ~23% |
| NDIS-Yarns | 57.1% | (in audit Section 9) |
| Property Pulse | 26.3% | (in audit Section 9) |
| Care For Welfare | 100% (7 drafts) | (in audit Section 9) |

**The 50% number was a snapshot. True rolling average is much lower. Pre-sales gate must use rolling metric, not snapshot.**

---

## INFRASTRUCTURE STATE (CORRECTED BY 18 APR AUDIT)

| Metric | Sync state claimed (17 Apr) | Audit found (18 Apr) |
|---|---|---|
| Edge Functions | 42 | 40 |
| Active cron jobs | 63 | 42 |
| Active feeds | 60 | 40 |
| Deprecated feeds | 20 | (in audit Section 8) |
| content_type_prompt rows | 24 | (in audit Section 7) |
| f.feed_discovery_seed rows | 9 | (in audit Section 8) |

**Reconciliation of these numbers is a Section 12 classification item.**

---

## META BUSINESS VERIFICATION

| Item | Status |
|---|---|
| 2FA block | ✅ Cleared |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — **27 Apr escalation trigger = 9 days away** |
| invegent.com domain | ⏳ DNS TXT — click Verify when resolved |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Alert |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | NDIS Yarns | 31 May 2026 | ⚠️ Auto-alert fires ~1 May |
| Facebook | Property Pulse | 14 Jun 2026 | ✅ |
| Facebook | Care For Welfare | ~Jun 2026 | ⚠️ Auto-alert at 30d |
| Facebook | Invegent | ~Jun 2026 | ⚠️ Auto-alert at 30d |

---

## WHAT IS NEXT

### IMMEDIATE (next Claude.ai session — classification)
1. **Read `docs/14_pre_sales_audit_inventory.md` fully**
2. **Classify all 38 items** in Section 12 as pre-sales / post-sales-tier-1/2/3 / parked
3. **Resolve the 13 open questions** in Section 13
4. **Produce `docs/15_pre_post_sales_criteria.md`** — definitive pre-sales gate document

### OPERATIONAL (you, to be scheduled post-classification)
- CFW content session — write content_type_prompts
- Invegent content session — write content_type_prompts
- Assign 12 unassigned feeds to clients
- PP prompt length check (body_too_long gating at 26.3%)
- CFW colours manual entry
- Meta domain verify when DNS propagates
- Confirm TBC subscriptions (Vercel, HeyGen, Claude Max, OpenAI)

### BUILD (post-classification, from the new docs/15 criteria)
- Continuity dashboard (`/continuity` page)
- Operational time logger
- Client handling checklist items (Clock C — 7 items)
- Phase 2.1 Insights-worker (likely pre-sales per audit findings)
- Phase 2.6 Proof dashboard (likely pre-sales per consultant audit)

### GATED — DO NOT BUILD
- D143-D146 (60 days data required)
- D124 Boost Config UI (Meta Standard Access gate)
- HeyGen avatar features client-facing (L005 consent gate — URGENT, already built ahead of gate)

---

## KNOWN ACTIVE ISSUES (updated per 18 Apr audit)

| Issue | Priority | Status |
|---|---|---|
| Auto-approver 7-day pass rate 23% (not 50%) | HIGH | Correction from audit — classification item |
| 8 Edge Functions deployed with no local source | HIGH | Source-of-truth risk — classification item |
| RLS disabled on most c.* / m.* tables | HIGH | Multi-tenant isolation gap — classification item |
| L005 avatar consent not built before HeyGen | HIGH | Legal gate skipped — classification item |
| 20+ env vars missing from secrets_reference.md | MED | Stale docs — classification item |
| 300 orphan post_drafts NULL client_id | MED | D127 v2 backfill was partial — classification item |
| Proof doc NOT BUILT (consultant audit gate) | MED | Pre-sales per 8 Apr audit |
| 90-day money-back framing NOT BUILT | LOW | Pre-sales per 8 Apr audit |
| client-assets bucket status | RESOLVED | Audit confirmed already public |
| CFW colours missing | MED | Manual entry needed |
| CFW + Invegent prompts missing | HIGH | Content session needed |
| PP auto-approver 26.3% | MED | body_too_long — check prompt length |
| Meta domain verification | MED | DNS TXT propagating |
| 12 feeds unassigned | MED | Assign via Feeds page |

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Status |
|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | ✅ |
| Property Pulse | urn:li:organization:112999127 | ✅ |
| Care For Welfare | urn:li:organization:74152188 | ✅ |
| Invegent | urn:li:organization:111966452 | ✅ |

---

## SUBSCRIPTION REGISTER

| Service | Monthly AUD | Status |
|---|---|---|
| Supabase Pro | $25 | ✅ |
| Creatomate Essential | ~$85 | ✅ |
| Zapier | ~$30 | ✅ |
| Google Workspace (2 users) | $74 | ✅ |
| RSS.app Pro | ~$100 | ✅ |
| Resend | $0 | ✅ |
| GitHub | $0 | ✅ |
| Vercel | TBC | ❓ |
| HeyGen | TBC | ❓ |
| Claude Max | TBC | ❓ |
| OpenAI | TBC | ❓ |
| **Confirmed total** | **~$314 AUD/mo** | 4 TBC |
