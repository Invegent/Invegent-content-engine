# ICE — Project Phases & Deliverables

## Phase Summary
Phase 1 — Stabilise    ✅ COMPLETE
Phase 2 — Automate     ← YOU ARE HERE
Phase 3 — Expand
Phase 4 — Scale

Each phase has a clear goal, specific deliverables, and a definition
of done. A phase does not end until ALL done criteria are met.
Adding features from Phase 3 while Phase 2 is incomplete is scope creep.

---

## Phase 1 — Stabilise ✅ COMPLETE
**Goal:** ICE runs reliably with minimal manual input for two clients.
The foundation is solid enough to onboard a third paying client.

**Completed:** March 2026

### Deliverables

**1.1 — Feed Quality** ✅
- [x] 12 active feeds per client (all rss_app)
- [x] Feed success rate above threshold
- [x] NDIS.gov.au tested and rejected as poor source (documented)

**1.2 — Auto-Approval Agent** ✅
- [x] Edge Function: auto-approver (v9)
- [x] 5-gate approval logic implemented
- [x] Auto-approves drafts above threshold
- [x] Flags below-threshold with reason code
- [x] Runs every 10 minutes via pg_cron
- [x] approved_by = 'auto-agent-v1' for auditability

**1.3 — Dashboard (Retool)** ✅ → being replaced by Next.js
- [x] Retool functional for Phase 1 operations
- [ ] Next.js migration in progress (Phase 2.5)

**1.4 — Both Clients Publishing Consistently** ✅
- [x] NDIS Yarns: 5+ posts per week
- [x] Property Pulse: 5+ posts per week
- [x] 393 total posts published as of March 2026

**1.5 — Security & Backups** ✅
- [x] Supabase Pro enabled — daily automatic backups confirmed active
- [x] GitHub Personal Access Token rotated
- [x] Environment variables audited

**1.6 — Meta App Review** 🔄 IN PROGRESS
- [x] Privacy Policy live at invegent.github.io/Invegent-content-engine/Invegent_Privacy_Policy
- [x] Data Deletion URL live
- [x] Business verification submitted (ABN: 39 769 957 807, sole trader NSW)
- [ ] Business verification approval pending (~2 working days)
- [ ] App icon upload pending (portal error — retry required)
- [ ] Tech Provider status — apply after business verification approved
- [ ] Permissions review submission: pages_manage_posts, pages_read_engagement, pages_show_list
- [ ] Review decision (2-8 weeks after submission)

**1.7 — Dead Letter Queue** ✅
- [x] dead status on f.canonical_content_body, m.post_draft, m.post_publish_queue, m.ai_job
- [x] dead_reason column on each table
- [x] m.dead_letter_sweep() function with defined thresholds
- [x] pg_cron daily sweep at 2am UTC
- [x] m.vw_ops_failures_24h view for dashboard surfacing

---

## Phase 2 — Automate ← YOU ARE HERE
**Goal:** ICE operates autonomously. Human input drops to
under 2 hours per week total. Feedback loop closes —
ICE learns from what it publishes.

**Started:** March 2026
**Target completion:** 6-8 weeks from start

### Deliverables

**2.1 — Facebook Insights Back-Feed** ✅ COMPLETE
- [x] m.post_performance table created
- [x] insights-worker Edge Function (v11)
- [x] Calls Facebook Graph API /insights daily (3am UTC)
- [x] 50 rows populated — 25 with reach data
- [x] Note: New Pages Experience limits impressions to null (platform limitation)
- [x] m.vw_ops_pipeline_health view created

**2.2 — Feed Intelligence Agent** ✅ COMPLETE
- [x] m.agent_recommendations table created
- [x] feed-intelligence Edge Function (v1)
- [x] Weekly analysis via pg_cron (Sundays 2am UTC)
- [x] Recommendations written to m.agent_recommendations
- [x] GitHub commit: e622da6

**2.3 — LinkedIn Publisher** ⏳ BLOCKED
- [ ] LinkedIn account recovery in progress (support ticket submitted)
- [ ] Awaiting LinkedIn support response before building
- [ ] Will need: Invegent Company Page → NDIS Yarns page → Property Pulse page → Developer App
- [ ] Permissions required: w_organization_social, r_organization_social

**2.4 — Campaign / Series Content Type** ⏸ DEFERRED
- Deprioritised — will revisit after 2.5 and first paying client

**2.5 — Next.js Dashboard Migration** 🔄 IN PROGRESS
- [ ] Repo: github.com/Invegent/invegent-dashboard
- [ ] Stack: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] Auth: Supabase Auth (email/password, multi-user)
- [ ] Deployed at: dashboard.invegent.com
- [ ] Session 1: scaffold + auth + Overview tab
- [ ] Session 2: Drafts + Queue tabs
- [ ] Session 3: Clients + Feeds tabs
- [ ] Session 4: Failures tab + deploy
- [ ] Retool subscription cancelled on completion

**2.6 — Public Proof Dashboard** 🔲 PLANNED
- [ ] Read-only page within invegent.com app
- [ ] Shows NDIS Yarns live metrics (followers, posts, engagement, top posts)
- [ ] Served from m.post_performance via Supabase
- [ ] Primary sales asset for client acquisition

### Phase 2 Done When
1. Less than 2 hours/week total manual input for both clients
2. Performance data flowing back into scoring
3. LinkedIn publishing live for both clients (unblocked)
4. Next.js dashboard live on Vercel and Retool retired

---

## Phase 3 — Expand
**Goal:** ICE serves external clients. Client portal live.
First paying client onboarded. Content operation proven
at small scale.

**Target start:** When Phase 2 done criteria are all met
**Target duration:** 8-12 weeks

### Deliverables

**3.1 — Client Portal (Phase 1)**
- [ ] Repo: github.com/Invegent/invegent-portal
- [ ] Stack: Next.js 14 + Supabase Auth + RLS
- [ ] Deployed at: portal.invegent.com
- [ ] Client dashboard: posts this week, engagement, upcoming queue
- [ ] Clients can approve/reject flagged drafts
- [ ] Clients can view campaign progress

**3.2 — Content Analyst Agent**
- [ ] Weekly report generation per client
- [ ] Reads m.post_performance (requires 2.1 ✅)
- [ ] Identifies top performing topics and content types
- [ ] Report delivered to client portal automatically

**3.3 — Client Onboarding Flow**
- [ ] Documented onboarding SOP
- [ ] Client setup in dashboard: 5-step form
- [ ] Facebook page connection process documented
- [ ] First external client onboarded end-to-end

**3.4 — Distribution Layer**
- [ ] Facebook Ads API boost integration (four-step hierarchy)
- [ ] boost-worker Edge Function deployed
- [ ] Boost rules configurable per client in c.client_publish_profile
- [ ] m.post_boost table tracking campaign_id, adset_id, ad_id, spend, reach, status
- [ ] Standard Access graduation confirmed
- [ ] Email newsletter channel via Resend

**3.5 — Meta App Review** ← depends on Phase 1.6
- [ ] Production publishing permissions obtained
- [ ] All clients on production API access

**3.6 — Evergreen Content Type**
- [ ] c.evergreen_post table created
- [ ] Rotation scheduler in pg_cron
- [ ] First set of evergreen posts created per client (10 each)

### Phase 3 Done When
1. First external paying client live and publishing for 4 weeks
2. Client portal accessible and used by at least one client
3. Content Analyst Agent delivering weekly reports
4. Meta App Review approved or in final review stage

---

## Phase 4 — Scale
**Goal:** ICE serves 5-10 clients with minimal marginal effort
per new client. Business model proven. Architecture supports
growth without linear time increase.

**Target start:** When Phase 3 done criteria are met
**Target duration:** Ongoing

### Deliverables

**4.1 — Multi-Client Operations**
- [ ] Onboarding a new client takes under 2 hours
- [ ] Per-client time cost under 30 minutes/week
- [ ] Client portal self-service for common requests
- [ ] Billing and contract management process established

**4.2 — Additional Signal Sources**
- [ ] Reddit API integration
- [ ] YouTube trending topics via Data API
- [ ] Email newsletter ingest via Postmark inbound
- [ ] Apify scrapers for priority non-RSS sources
- [ ] Perplexity API for real-time synthesis and paywall bypass

**4.3 — AI Model Abstraction**
- [ ] Model router: ai-job → model_router → claude | openai
- [ ] Per-client model preference in client_ai_profile
- [ ] A/B testing capability for model quality comparison
- [ ] Cost monitoring per client per model

**4.4 — Client Websites**
- [ ] Next.js website template (config-driven, one template serves all)
- [ ] Content flows ICE → Supabase → website automatically
- [ ] NDIS Yarns website live
- [ ] Property Pulse website live

**4.5 — Vertical Expansion**
- [ ] Third vertical added (Aged Care or Mental Health)
- [ ] At least one client in new vertical

**4.6 — SaaS Evaluation**
- [ ] 10 clients served successfully for 3+ months
- [ ] Unit economics confirmed
- [ ] Evaluate: continue managed service OR build self-serve platform

### Phase 4 Done When
No fixed end — operating state of a mature ICE deployment.
Success: 8-10 clients, under 10 hours/week total, positive unit economics,
clear managed service vs SaaS path decision made.

---

## Cross-Phase Dependencies

```
Facebook Insights (2.1) ✅
→ required for Content Analyst Agent (3.2)
→ required for Auto-Boost Agent (3.4)
→ required for Public Proof Dashboard content (2.6)
→ required for feed scoring improvement (ongoing)

Auto-Approval Agent (1.2) ✅
→ required for under 2 hours/week target
→ required before scaling to external clients (3.x)

Next.js Dashboard (2.5) ← IN PROGRESS
→ required before Client Portal (3.1) — shares codebase patterns

Meta App Review (1.6) ← IN PROGRESS
→ single submission covers publishing AND advertising permissions
→ Standard Access graduation (~1,500 API calls in 15 days) blocks
  third-party client publishing and boosting
→ blocking item for ALL external client work (3.x)

LinkedIn Publisher (2.3) ← BLOCKED on account recovery
→ required before Facebook dependency = unacceptable risk
→ should complete before first external client onboards

Dead Letter Queue (1.7) ✅
→ required for reliable pipeline monitoring at scale
→ vw_ops_failures_24h view surfaces for dashboard

Public Proof Dashboard (2.6)
→ required as primary sales asset before first client conversation
→ depends on Facebook Insights (2.1) ✅
```

---

## What Is Out of Scope (All Phases)

- Native mobile app (web-responsive Next.js covers this)
- Video production pipeline (beyond script generation)
- Full ad campaign management (boost only, not full campaigns)
- CRM / lead management
- Community management (comment responses)
- White-label reseller platform (evaluate in Phase 4 only)
- Platforms outside Australia initially (architecture supports it, not a priority)
