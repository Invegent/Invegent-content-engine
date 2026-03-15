# ICE — Project Phases & Deliverables

## Phase Summary
Phase 1 — Stabilise    ✅ COMPLETE
Phase 2 — Automate     ← YOU ARE HERE (blocked on LinkedIn + Meta App Review)
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
- [x] Email newsletter ingest built and deployed (feeds@invegent.com,
      newsletter/ndis + newsletter/property Gmail labels,
      email-ingest Edge Function via Gmail OAuth, 2h pg_cron)
- [x] Total: 26 active feed sources across both clients (22 RSS + 2 native + 2 email)

**1.2 — Auto-Approval Agent** ✅
- [x] Edge Function: auto-approver (v1.4.0)
- [x] 9-gate approval logic (5 logic gates + 9-phrase keyword blocklist)
- [x] Auto-approves drafts above threshold
- [x] Flags below-threshold with reason code
- [x] Runs every 10 minutes via pg_cron
- [x] approved_by = 'auto-agent-v1' for auditability
- [x] Blocklist includes pipeline-exposure phrases to prevent technical
      commentary leaking into public posts

**1.3 — Dashboard (Retool)** ✅ → replaced by Next.js
- [x] Retool functional for Phase 1 operations
- [x] Next.js migration complete (Phase 2.5 ✅)
- [x] Retool subscription CANCELLED — March 2026

**1.4 — Both Clients Publishing Consistently** ✅
- [x] NDIS Yarns: 5+ posts per week
- [x] Property Pulse: 5+ posts per week
- [x] 215+ total publish records as of 16 March 2026

**1.5 — Security & Backups** ✅
- [x] Supabase Pro enabled — daily automatic backups confirmed active
- [x] GitHub Personal Access Token rotated
- [x] Environment variables audited

**1.6 — Meta App Review** 🔄 IN PROGRESS
- [x] Privacy Policy live at invegent.github.io/Invegent-content-engine/Invegent_Privacy_Policy
- [x] Data Deletion URL live
- [x] Business verification submitted (ABN: 39 769 957 807, sole trader NSW)
- [x] Business portfolio "Invegent" connected to app — status: In Review
- [x] Correct permissions identified and queued: pages_manage_posts,
      pages_read_engagement, pages_show_list
- [x] Removed incorrect permissions (manage_fundraisers, whatsapp, threads,
      oEmbed, catalog, etc.) from submission queue
- [x] pages_manage_posts API test calls: Completed (green tick)
- [ ] Screencast recording uploaded for all 3 permissions
      NOTE: Meta requires OAuth authorization flow visible in screencast
      → Facebook Connect OAuth flow must be built before screencast (3.3 pulled forward)
- [ ] Data handling section completed
- [ ] Reviewer instructions section completed
- [ ] Business verification approval confirmed
- [ ] Review submitted and decision pending (2-8 weeks)

**1.7 — Dead Letter Queue** ✅
- [x] dead status on f.canonical_content_body, m.post_draft,
      m.post_publish_queue, m.ai_job
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
**Blocked by:** LinkedIn account recovery (2.3), Meta App Review (1.6)

### Deliverables

**2.1 — Facebook Insights Back-Feed** ✅ COMPLETE
- [x] m.post_performance table created
- [x] insights-worker Edge Function (v16)
- [x] Calls Facebook Graph API /insights daily (3am UTC)
- [x] 50 rows populated — 25 with reach data
- [x] Note: New Pages Experience limits impressions to null (platform limitation)
- [x] m.vw_ops_pipeline_health view created

**2.2 — Feed Intelligence Agent** ✅ COMPLETE
- [x] m.agent_recommendations table created
- [x] feed-intelligence Edge Function (v5)
- [x] Weekly analysis via pg_cron (Sundays 2am UTC)
- [x] Recommendations written to m.agent_recommendations

**2.3 — LinkedIn Publisher** ⏳ BLOCKED
- [ ] LinkedIn account recovery in progress (support ticket submitted)
- [ ] Awaiting LinkedIn support response before building
- [ ] Will need: Invegent Company Page → NDIS Yarns page → Property Pulse page → Developer App
- [ ] Permissions required: w_organization_social, r_organization_social

**2.4 — Campaign / Series Content Type** ⏸ DEFERRED
- Deprioritised — will revisit after first paying client

**2.5 — Next.js Dashboard Migration** ✅ COMPLETE
- [x] Repo: github.com/Invegent/invegent-dashboard
- [x] Stack: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [x] Auth: Supabase Auth (email/password)
- [x] Deployed at: dashboard.invegent.com ✅ live
- [x] Caching: force-dynamic + revalidate=0 on dashboard layout
      (all pages always fetch fresh data — no stale renders)
- [x] Timezone: all dates display in Australia/Sydney (AEST/AEDT)
- [x] Overview tab: pipeline health, published stats, client cards, token banner
- [x] Drafts tab: defaults to Needs Review, filterable by all statuses,
      Approve/Reject buttons (server-side via draft_approve_and_enqueue
      and draft_set_status DB functions to bypass m schema RLS)
- [x] Queue tab: status tabs (queued/published/failed/skipped/dead),
      sorted by scheduled_for DESC, client names via exec_sql join
- [x] Clients tab: publish profiles, token status, mode, platform config
- [x] Feeds tab: grouped by client, give-up rates, health badges
- [x] Failures tab: dead items from all pipeline tables with dead_reason
- [x] Post Studio tab: brief → generate → save to draft or send to queue
      Full end-to-end working: generates via Claude API, creates
      post_draft + post_publish_queue entries, publishes to Facebook
      within 15 minutes via publisher cron
- [x] Client Profile tab: brand, platform, prompts, generation settings
- [x] Retool subscription CANCELLED — March 2026

**Dashboard schema fixes applied March 2026:**
- m.post_draft.digest_item_id: made nullable (manual/studio posts have no digest chain)
- m.post_draft.client_id: new column added (direct FK for manual/studio posts,
  eliminates "Unknown" client name issue)
- DB functions created:
  - public.manual_post_insert() — SECURITY DEFINER, inserts draft + queue entry atomically
  - public.draft_approve_and_enqueue() — SECURITY DEFINER, approves draft and creates
    queue entry using direct client_id or digest chain as fallback
  - public.draft_set_status() — SECURITY DEFINER, updates approval_status with timestamp
  - public.draft_action_function() — legacy, superseded by above

**2.6 — Public Proof Dashboard** 🔲 NEXT BUILD CANDIDATE
- [ ] Read-only page within invegent.com app
- [ ] Shows NDIS Yarns live metrics (followers, posts, engagement, top posts)
- [ ] Served from m.post_performance via Supabase
- [ ] Primary sales asset for client acquisition
- [ ] Depends on: meaningful follower numbers (2.7), Facebook Insights data (2.1 ✅)

**2.7 — Audience Foundation** 🔲 PLANNED
- [ ] Facebook community building (NDIS provider groups — organic presence)
- [ ] LinkedIn personal profile active (PK as NDIS content authority)
- [ ] First paid Facebook boost campaigns ($200-400/month per client)
- [ ] Facebook Custom Audiences (provider email lists)
- [ ] Target: NDIS Yarns 500+ engaged followers before first client conversation
- [ ] NDIS Yarns distribution started: 16 March 2026

**2.8 — Content Intelligence Profiles** ✅ COMPLETE
- [x] c.client_brand_profile table — brand identity, presenter voice, compliance, model config
- [x] c.client_platform_profile table — per-platform rules (one row per client per platform)
- [x] c.content_type_prompt table — per-job-type task prompts and output schemas
- [x] ai-worker v2.1.0 deployed — reads all three tables, assembles structured prompts
- [x] Legacy fallback: if no brand_profile or content_type_prompt, falls back to c.client_ai_profile
- [x] Brand profiles seeded for both clients (NDIS Yarns + Property Pulse)
- [x] Platform profiles seeded: 7 platforms × 2 clients (Facebook active, 6 inactive stubs)
- [x] Content type prompts seeded: rewrite_v1 + synth_bundle_v1 + promo_v1 × 2 clients (Facebook)
- [x] Client Profile Editor tab live in dashboard
- [x] Service role grants applied to all three c-schema tables
- [x] Both clients: provider=anthropic, model=claude-sonnet-4-6, temperature=0.72,
      max_output_tokens=1200

**2.9 — Post Studio** ✅ COMPLETE
- [x] Post Studio tab in dashboard — operator-prompted content generation
- [x] Supports promo_v1 job type (promotional/manual content briefs)
- [x] Generates via Claude API using client brand + platform profiles
- [x] Send to Queue: creates post_draft (approved) + post_publish_queue entry
- [x] Save to Drafts: creates post_draft (needs_review) for manual approval
- [x] Approve button creates queue entry via draft_approve_and_enqueue()
- [x] Drafts created via Post Studio carry client_id directly (no digest chain needed)
- [x] End-to-end verified: Post Studio → Queue → Facebook published

### Phase 2 Done When
1. Less than 2 hours/week total manual input for both clients ✅ (approaching)
2. Performance data flowing back into scoring ✅ (2.1 complete)
3. LinkedIn publishing live for both clients ❌ (blocked on account recovery)
4. Next.js dashboard live on Vercel with all tabs complete ✅

---

## Phase 3 — Expand
**Goal:** ICE serves external clients. Client portal live.
First paying client onboarded. Content operation proven
at small scale.

**Target start:** When Phase 2 done criteria are met
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

**3.3 — Client Onboarding Flow** ← NEXT BUILD (pulled forward for Meta App Review)
- [ ] Facebook OAuth connect flow — /connect page on dashboard
      (pulled forward: required for Meta App Review screencast showing
      OAuth authorization flow; also needed for external client onboarding)
      Plan: Care for Welfare page disconnected and reconnected as demo
      to show real business authorising the app during screencast
- [ ] Documented onboarding SOP
- [ ] Client setup in dashboard: 5-step form
      (identity → brand → publishing → feeds → Facebook OAuth connect)
- [ ] First external client onboarded end-to-end

**3.4 — Distribution Layer**
- [ ] Facebook Ads API boost integration (four-step hierarchy)
- [ ] boost-worker Edge Function deployed
- [ ] Boost rules configurable per client in c.client_publish_profile
- [ ] m.post_boost table tracking campaign_id, adset_id, ad_id, spend, reach, status
- [ ] Standard Access graduation confirmed
- [ ] Email newsletter channel via Resend

**3.5 — Meta App Review** ← depends on Phase 1.6 + 3.3 OAuth flow
- [ ] OAuth screencast recorded with Care for Welfare page
- [ ] All 3 permission screencasts uploaded
- [ ] Data handling + reviewer instructions sections completed
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
- [ ] Reddit API integration (signal ingest only — not publishing)
- [ ] YouTube trending topics via Data API
- [ ] Email newsletter ingest (feeds@invegent.com — architecture designed D017)
      feeds.ndis@invegent.com + feeds.property@invegent.com aliases
      email-ingest Edge Function via Gmail OAuth
      source_type_code = 'email_newsletter' in f.feed_source
- [ ] Apify scrapers for priority non-RSS sources
- [ ] Perplexity API for real-time synthesis and paywall bypass

**4.3 — AI Model Abstraction**
- [ ] Model router: ai-job → model_router → claude | openai
- [ ] Per-client model preference in client_brand_profile
- [ ] A/B testing capability for model quality comparison
- [ ] Cost monitoring per client per model
- [ ] Recent post history injection (last 7 posts) into system prompt
      to prevent topic repetition — planned enhancement to ai-worker

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

**4.7 — Mobile Dashboard**
- [ ] Sidebar collapses to hamburger menu on mobile
- [ ] All pages responsive for single-column mobile layout
- [ ] Touch target sizing (min 44px)
- [ ] Post Studio two-panel stacks vertically on mobile
- [ ] Note: deferred — internal ops tool, laptop always available;
      prioritise after first paying client

### Phase 4 Done When
No fixed end — operating state of a mature ICE deployment.
Success: 8-10 clients, under 10 hours/week total, positive unit economics,
clear managed service vs SaaS path decision made.

---

## Platform Publishing Roadmap

| Platform | Phase | Status | Notes |
|---|---|---|---|
| Facebook | 1 | ✅ Live | Primary platform |
| LinkedIn | 2 | ⏳ Blocked | Account recovery ticket open |
| Instagram | 2 | 🔲 Planned | Same Meta API sprint as LinkedIn |
| Email newsletter | 3 | 🔲 Planned | Resend API, owned audience |
| Reddit | 4 | 🔲 Signal ingest only | Not publishing |
| YouTube | 4 | 🔲 Planned | Requires video production layer |
| TikTok | Skip | ❌ | Wrong audience for NDIS vertical |
| Twitter/X | Skip | ❌ | $100/month API, wrong audience |

---

## Cross-Phase Dependencies

```
Facebook Insights (2.1) ✅
→ required for Content Analyst Agent (3.2)
→ required for Auto-Boost Agent (3.4)
→ required for Public Proof Dashboard content (2.6)
→ required for feed scoring improvement (ongoing)

Content Intelligence Profiles (2.8) ✅
→ required for consistent brand voice at scale
→ required before adding new clients (each needs their own profile set)

Auto-Approval Agent (1.2) ✅
→ required for under 2 hours/week target
→ required before scaling to external clients (3.x)

Next.js Dashboard (2.5) ✅ COMPLETE — Retool cancelled
→ portal (3.1) can now be scaffolded using same patterns

Meta App Review (1.6) ← IN PROGRESS
→ requires OAuth connect flow (3.3 pulled forward) for screencast
→ single submission covers publishing permissions (pages_manage_posts,
  pages_read_engagement, pages_show_list)
→ Standard Access graduation (~1,500 API calls in 15 days) —
  NDIS Yarns + Property Pulse publishing history building this now
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
→ depends on Audience Foundation (2.7) for meaningful follower numbers

OAuth Connect Flow (3.3 pulled forward)
→ required for Meta App Review screencast (shows OAuth authorization)
→ required for external client onboarding
→ build target: 16 March 2026 session
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
