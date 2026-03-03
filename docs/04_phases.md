# ICE — Project Phases & Deliverables

## Phase Summary
Phase 1 — Stabilise    ← YOU ARE HERE
Phase 2 — Automate
Phase 3 — Expand
Phase 4 — Scale

Each phase has a clear goal, specific deliverables, and a definition
of done. A phase does not end until ALL done criteria are met.
Adding features from Phase 2 while Phase 1 is incomplete is scope creep.

---

## Phase 1 — Stabilise
**Goal:** ICE runs reliably with minimal manual input for two clients.
The foundation is solid enough to onboard a third paying client.

**Target completion:** 6-8 weeks from March 2026

### Deliverables

**1.1 — Fix Content Quality (Feed Layer)**
- [ ] Audit all active feeds — identify and deprecate sources with
      give-up rate > 70%
- [ ] Add minimum 4 open-access replacement feeds per client vertical:
      - NDIS: NDIS.gov.au direct, Summer Foundation, Inclusion Australia,
        DSS newsletter
      - Property: CoreLogic, RBA, REIA, PropTrack
- [ ] Feed success rate above 50% across all active feeds
- [ ] getFeedsQuery in dashboard showing health indicators correctly

**1.2 — Auto-Approval Agent**
- [ ] Edge Function created: auto-approver
- [ ] Scores drafts against client_ai_profile rules
- [ ] Auto-approves drafts scoring above threshold
- [ ] Flags below-threshold drafts with reason code
- [ ] Runs every 30 minutes via pg_cron
- [ ] Manual review time reduced to under 2 hours per week

**1.3 — Dashboard Stable (Retool → Next.js)**
- [ ] Retool tab navigation working correctly (Clients + Feeds tabs)
- [ ] Save Changes mutation verified writing to database
- [ ] All 5 tabs functional for daily use
- [ ] OR: Next.js migration complete and Retool retired
- [ ] Daily operations possible in under 30 minutes

**1.4 — Both Clients Publishing Consistently**
- [ ] NDIS Yarns: minimum 5 posts per week for 4 consecutive weeks
- [ ] Property Pulse: minimum 5 posts per week for 4 consecutive weeks
- [ ] Post quality reviewed and acceptable (not just volume)
- [ ] No manual intervention required for routine publishing

**1.5 — Security & Backups**
- [ ] Supabase Pro enabled ($25/month)
- [ ] Daily automatic backups confirmed active
- [ ] New GitHub Personal Access Token generated (old one rotated)
- [ ] Environment variables audited — no secrets in code

**1.6 — Meta App Review (Start NOW)**
- [ ] Register invegent.com domain — host privacy policy and terms of service
- [ ] Privacy policy covers: data collected, how used, third-party sharing (Meta),
      user rights, contact details
- [ ] Submit ONE review covering all five permissions in a single submission:
      - pages_manage_posts (publish to client pages)
      - pages_read_engagement (read post metrics)
      - ads_management (create and manage boost campaigns)
      - ads_read (read campaign performance)
      - pages_manage_ads (manage ads on client pages)
- [ ] Prepare screencast demo: ingest → draft → approve → publish flow
- [ ] Review submitted — confirmation email received
- [ ] Note: Standard Access graduation requires ~1,500 successful API calls
      within a 15-day window — NDIS Yarns + Property Pulse publishing
      volume is building this record now
- [ ] Timeline: 2-8 weeks for review decision — start immediately, do not wait

**1.7 — Dead Letter Queue**
- [ ] Add dead status to all pipeline tables:
      f.canonical_content_body (fetch_status = 'dead')
      m.post_draft (approval_status = 'dead')
      m.post_publish_queue (status = 'dead')
      m.ai_job (status = 'dead')
- [ ] Add dead_reason column (text) to each table above
- [ ] pg_cron sweep: daily job moves items stuck in terminal failure
      states for > 7 days to 'dead' with reason code
- [ ] Dashboard Failures panel: surfaces all dead items with reason,
      last_error, and one-click "requeue" action
- [ ] Dead items are never deleted — they are an audit trail

### Phase 1 Done When
ALL four of these are true simultaneously:
1. Auto-approval agent running — less than 2 hours/week manual review
2. Both clients producing 5+ posts/week consistently for 4 weeks
3. Feed success rate above 50% across active feeds
4. Dashboard stable for daily use without debugging sessions

---

## Phase 2 — Automate
**Goal:** ICE operates autonomously. Human input drops to
under 2 hours per week total. Feedback loop closes —
ICE learns from what it publishes.

**Target start:** When Phase 1 done criteria are all met
**Target duration:** 6-8 weeks

### Deliverables

**2.1 — Facebook Insights Back-Feed**
- [ ] m.post_performance table created
- [ ] insights-worker Edge Function created
- [ ] Calls Facebook Graph API /insights daily
- [ ] Engagement data (reach, impressions, engagement rate, clicks,
      shares) written per post
- [ ] Performance visible in dashboard Overview tab
- [ ] Data feeding back into digest scoring weights

**2.2 — Feed Intelligence Agent**
- [ ] m.agent_recommendations table created
- [ ] feed-intelligence Edge Function created
- [ ] Weekly analysis of give-up rates and content quality per source
- [ ] Recommendations written to m.agent_recommendations
- [ ] Dashboard surfaces recommendations with one-click
      approve/dismiss
- [ ] Auto-deprecation for feeds exceeding 70% give-up for 2 weeks

**2.3 — LinkedIn Publisher**
- [ ] LinkedIn API v2 integration
- [ ] linkedin-publisher Edge Function created
- [ ] Platform abstraction layer in place
      (publisher → platform_router → platform_publisher)
- [ ] Both clients configured for LinkedIn
- [ ] Facebook dependency no longer a single point of failure

**2.4 — Campaign / Series Content Type**
- [ ] c.content_campaign table created
- [ ] c.content_campaign_post table created
- [ ] Campaign Planner Agent: brief → 10-post outline
- [ ] Campaign Writer Agent: outline → full drafts → post_draft pipeline
- [ ] Campaign management visible in dashboard
- [ ] First real campaign created and published for NDIS Yarns

**2.5 — Next.js Dashboard Migration**
- [ ] Next.js app scaffolded by Claude Code
- [ ] Connected to Supabase (existing schema, no changes)
- [ ] All 5 tabs migrated: Overview, Draft Inbox, Publish Queue,
      Clients, Feeds
- [ ] Deployed on Vercel
- [ ] Retool subscription cancelled

**2.6 — Public Proof Dashboard**
- [ ] Read-only Next.js page (no auth required)
- [ ] Hosted at proof.invegent.com or similar
- [ ] Shows NDIS Yarns live metrics:
      followers (current + growth since ICE started)
      posts published (total, last 30 days)
      average engagement rate
      top 3 posts (by engagement, with post preview)
- [ ] Data served from m.post_performance via Supabase public read API
- [ ] Used as primary sales asset in client acquisition conversations
- [ ] "This is what ICE did for our own page — it will do the same for yours"
- [ ] Updates automatically as new performance data comes in

### Phase 2 Done When
1. Less than 2 hours/week total manual input for both clients
2. Performance data flowing back into scoring
3. LinkedIn publishing live for both clients
4. First campaign series completed end-to-end
5. Next.js dashboard live on Vercel

---

## Phase 3 — Expand
**Goal:** ICE serves external clients. Client portal live.
First paying client onboarded. Content operation proven
at small scale.

**Target start:** When Phase 2 done criteria are met
**Target duration:** 8-12 weeks

### Deliverables

**3.1 — Client Portal (Phase 1)**
- [ ] Second Next.js app created for client portal
- [ ] Supabase Auth configured — email/password login
- [ ] Row Level Security enforced — clients see only their data
- [ ] Client dashboard shows: posts published this week,
      engagement summary, upcoming queue
- [ ] Clients can approve/reject flagged drafts
- [ ] Clients can view campaign progress
- [ ] Deployed on Vercel at portal.invegent.com (or similar)

**3.2 — Content Analyst Agent**
- [ ] Weekly report generation per client
- [ ] Reads m.post_performance (requires 2.1 to be running)
- [ ] Identifies top performing topics and content types
- [ ] Compares this week vs last 4 weeks
- [ ] Generates plain-language recommendations
- [ ] Report delivered to client portal automatically

**3.3 — Client Onboarding Flow**
- [ ] Documented onboarding checklist (SOP)
- [ ] Client setup in dashboard: 5-step form
      (identity → brand → publishing → feeds → policy)
- [ ] Facebook page connection process documented
- [ ] Seed audience strategy documented per client
- [ ] First external client onboarded end-to-end

**3.4 — Distribution Layer**
- [ ] Facebook Ads API boost integration — four-step API hierarchy:
      Step 1: Create Campaign (objective = POST_ENGAGEMENT or PAGE_LIKES)
      Step 2: Create Ad Set (targeting from boost_targeting jsonb, budget, schedule)
      Step 3: Create Ad Creative (reference platform_post_id from m.post_publish)
      Step 4: Create Ad (combine creative + ad set, submit for review)
- [ ] boost-worker Edge Function deployed (see Blueprint: Agent 4)
- [ ] Boost rules configurable per client: boost_enabled, boost_budget_aud,
      boost_duration_days, boost_objective, boost_targeting, boost_score_threshold
- [ ] m.post_boost table created — tracks campaign_id, adset_id, ad_id,
      spend, reach, status per boosted post
- [ ] Standard Access graduation confirmed (required for third-party page boosts)
- [ ] Email newsletter channel via Resend
- [ ] Cross-promotion / spotlight post template in campaign system

**3.5 — Meta App Review**
- [ ] Meta App Review submission prepared
- [ ] Review process started (runs in background, takes weeks)
- [ ] Production publishing permissions obtained
- [ ] All clients migrated from development to production API access

**3.6 — Evergreen Content Type**
- [ ] c.evergreen_post table created
- [ ] Rotation scheduler in pg_cron
- [ ] First set of evergreen posts created per client (10 each)
- [ ] Evergreen posts visible in dashboard

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
- [ ] Reddit API integration via normalised ingest layer
- [ ] YouTube trending topics via Data API
- [ ] Email newsletter ingest via Postmark inbound
- [ ] Apify scrapers for priority non-RSS sources
- [ ] Perplexity API for real-time synthesis and paywall bypass

**4.3 — AI Model Abstraction**
- [ ] Model router implemented
      (ai-job → model_router → claude | openai)
- [ ] Per-client model preference in client_ai_profile
- [ ] A/B testing capability for model quality comparison
- [ ] Cost monitoring per client per model

**4.4 — Client Websites**
- [ ] Next.js website template created
- [ ] One template serves all client websites (config-driven)
- [ ] Content flows ICE → Supabase → website automatically
- [ ] NDIS Yarns website live
- [ ] Property Pulse website live
- [ ] New client website deployable in under 1 hour

**4.5 — Vertical Expansion**
- [ ] Third vertical added (Aged Care or Mental Health)
- [ ] Taxonomy rows added for new vertical
- [ ] At least one client in new vertical
- [ ] Vertical expansion process documented as repeatable SOP

**4.6 — SaaS Evaluation**
- [ ] 10 clients served successfully for 3+ months
- [ ] Unit economics confirmed (revenue per client vs time cost)
- [ ] Evaluate: continue managed service OR build self-serve platform
- [ ] If SaaS: multi-tenant onboarding flow designed
- [ ] If SaaS: pricing model for platform vs managed service defined

### Phase 4 Done When
This phase has no fixed end — it is the operating state of
a mature ICE deployment. Success is defined as:
- 8-10 clients publishing consistently
- Under 10 hours/week total operational time across all clients
- Positive unit economics confirmed
- Clear decision made on managed service vs SaaS path

---

## Cross-Phase Dependencies
Facebook Insights (2.1)
→ required for Content Analyst Agent (3.2)
→ required for Auto-Boost Agent (3.4)
→ required for Public Proof Dashboard content (2.6)
→ required for feed scoring improvement (ongoing)
Auto-Approval Agent (1.2)
→ required for under 2 hours/week target
→ required before scaling to external clients (3.x)
Next.js Dashboard (2.5)
→ required before Client Portal (3.1)
(shares codebase patterns)
Meta App Review (1.6) ← NOW PHASE 1
→ must START immediately — review takes 2-8 weeks regardless of other work
→ single submission covers publishing AND advertising permissions
→ Standard Access graduation (~1,500 API calls in 15 days) blocks
  third-party client publishing and boosting
→ blocking item for ALL external client work (3.x)
LinkedIn Publisher (2.3)
→ required before Facebook dependency = unacceptable risk
→ should complete before first external client onboards
Dead Letter Queue (1.7)
→ required for reliable pipeline monitoring at scale
→ dashboard Failures panel depends on this
Public Proof Dashboard (2.6)
→ required as primary sales asset before first client conversation
→ depends on Facebook Insights (2.1) for live data

---

## What Is Out of Scope (All Phases)

- Native mobile app (web-responsive Next.js covers this)
- Video production pipeline (beyond script generation)
- Full ad campaign management (boost only, not full campaigns)
- CRM / lead management
- Community management (comment responses)
- White-label reseller platform (evaluate in Phase 4 only)
- Platforms outside Australia initially (architecture supports it,
  not a priority)
