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
- [x] Blocklist includes pipeline-exposure phrases

**1.3 — Dashboard (Retool)** ✅ → replaced by Next.js (2.5)
- [x] Retool subscription CANCELLED — March 2026

**1.4 — Both Clients Publishing Consistently** ✅
- [x] NDIS Yarns: 5+ posts per week
- [x] Property Pulse: 5+ posts per week
- [x] 53 posts published in last 7 days alone (~7-8/day across both clients)

**1.5 — Security & Backups** ✅
- [x] Supabase Pro enabled — daily automatic backups confirmed active
- [x] GitHub Personal Access Token rotated
- [x] Environment variables audited

**1.6 — Meta App Review** 🔄 IN PROGRESS
- [x] Privacy Policy live
- [x] Data Deletion URL live
- [x] Business verification submitted (ABN: 39 769 957 807, sole trader NSW)
- [x] Business portfolio "Invegent" connected — In Review
- [x] Correct permissions identified: pages_manage_posts,
      pages_read_engagement, pages_show_list
- [x] pages_manage_posts API test calls: Completed (green tick)
- [x] Facebook OAuth connect flow built (D020, 16 March 2026)
- [ ] Screencast recording uploaded for all 3 permissions
- [ ] Data handling + reviewer instructions sections completed
- [ ] Business verification approval confirmed
- [ ] Review submitted — decision pending (2-8 weeks)

**1.7 — Dead Letter Queue** ✅
- [x] dead status on all pipeline tables
- [x] dead_reason column on each table
- [x] m.dead_letter_sweep() pg_cron daily at 2am UTC
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
- [x] insights-worker Edge Function (v16), daily 3am UTC
- [x] 50 rows populated — 25 with reach data
- [x] m.vw_ops_pipeline_health view created

**2.2 — Feed Intelligence Agent** ✅ COMPLETE
- [x] m.agent_recommendations table created
- [x] feed-intelligence Edge Function (v5), Sundays 2am UTC
- [x] Give-up rate analysis + recommendations written to DB

**2.3 — LinkedIn Publisher** ⏳ BLOCKED
- [ ] LinkedIn account recovery in progress (support ticket open)
- [ ] Requires: Invegent Company Page → client pages → Developer App
- [ ] Permissions: w_organization_social, r_organization_social
- [ ] OAuth connect flow in portal will use same pattern as Facebook (D020)

**2.4 — Campaign / Series Content Type** ⏸ DEFERRED to Phase 3
- [ ] c.content_campaign table — name, brief, client_id, cadence, start_date
- [ ] c.content_campaign_post table — campaign_id, post_draft_id, sequence, scheduled_for
- [ ] Campaign Planner Agent: brief → N-post outline
- [ ] Campaign Writer Agent: outline → full drafts → post_draft pipeline
- [ ] Campaign management in client portal (series planner UI)

**2.5 — Next.js Dashboard Migration** ✅ COMPLETE
- [x] Repo: github.com/Invegent/invegent-dashboard
- [x] Stack: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [x] Auth: Supabase Auth (email/password, operator only)
- [x] Deployed at: dashboard.invegent.com ✅ live
- [x] All tabs live: Overview, Drafts, Queue, Clients, Feeds,
      Failures, Post Studio, Client Profile, Connect
- [x] Retool subscription CANCELLED — March 2026

**2.6 — Public Proof Dashboard** 🔲 NEXT BUILD CANDIDATE
- [ ] Read-only page on invegent.com
- [ ] NDIS Yarns live metrics: followers, posts, engagement, top posts
- [ ] Primary sales asset for client acquisition conversations
- [ ] Depends on: Facebook Insights data (2.1 ✅), follower numbers (2.7)
- [ ] Requires: invegent-web repo + Vercel project (not yet created)

**2.7 — Audience Foundation** 🔲 ACTIVE
- [ ] Facebook community building (NDIS provider groups)
- [ ] LinkedIn personal profile active (PK as NDIS content authority)
- [ ] First paid Facebook boost campaigns ($200-400/month)
- [ ] Target: NDIS Yarns 500+ engaged followers before first client conversation
- [ ] Distribution started: 16 March 2026

**2.8 — Content Intelligence Profiles** ✅ COMPLETE
- [x] c.client_brand_profile + c.client_platform_profile + c.content_type_prompt
- [x] ai-worker v2.1.0 — structured prompts, Claude primary, OpenAI fallback
- [x] Both clients seeded: provider=anthropic, model=claude-sonnet-4-6

**2.9 — Post Studio** ✅ COMPLETE
- [x] Operator-prompted content generation in dashboard
- [x] Generates via Claude using brand + platform profiles
- [x] Send to Queue or Save to Drafts
- [x] End-to-end verified: Post Studio → Queue → Facebook published

**2.10 — AI Usage Ledger and Cost Attribution** 🔲 PLANNED
- [ ] Schema migration: m.ai_model_rate + m.ai_usage_log
      (see D021 for full schema)
- [ ] Seed initial rates: Claude Sonnet ($3.00/$15.00 per 1M),
      OpenAI GPT-4o ($2.50/$10.00 per 1M)
- [ ] ai-worker update: capture input_tokens + output_tokens from every
      API response, calculate cost_usd from rates table, insert ledger row
- [ ] Fallback tracking: failed primary call + successful fallback call
      each get their own ledger row, both attributed to client
- [ ] Ops dashboard: AI Costs tab — total spend, per-client breakdown,
      model split (Claude vs OpenAI), cost per post, month trend
- [ ] Rates table update is the only action needed when provider changes
      pricing — no code deployment required

**2.11 — Per-Post Platform Targeting** 🔲 PLANNED
- [ ] Schema migration: target_platforms TEXT[] on m.digest_item,
      platform TEXT on m.post_draft
      (see D022 for full schema and architecture)
- [ ] Bundler update: populate target_platforms from active publish profiles
      when not explicitly overridden
- [ ] ai-worker update: loop over target_platforms, generate one draft per
      platform using platform-specific client_platform_profile
- [ ] Auto-approver update: platform-aware threshold (LinkedIn may differ)
- [ ] Post Studio update: platform ticker on manual/instant posts
- [ ] Dashboard Drafts tab: platform badge on each draft
- [ ] Client portal: platform ticker on instant posts and campaign briefs

### Phase 2 Done When
1. Less than 2 hours/week total manual input ✅ (approaching)
2. Performance data flowing back into scoring ✅ (2.1 complete)
3. LinkedIn publishing live ❌ (blocked on account recovery)
4. Next.js dashboard live with all tabs ✅ (complete)
5. Usage ledger running (2.10) — no cost surprises
6. Platform targeting in pipeline (2.11) — token efficiency

---

## Phase 3 — Expand
**Goal:** ICE serves external clients. Client portal live.
First paying client onboarded. Content operation proven
at small scale.

**Target start:** When Phase 2 done criteria are met
**Target duration:** 8-12 weeks

### Deliverables

**3.1 — Client Portal v1** 🔄 IN PROGRESS
- [x] Repo: github.com/Invegent/invegent-portal
- [x] Stack: Next.js 14 + Supabase Auth + RLS
- [x] Deployed at: portal.invegent.com ✅ live
- [x] Auth: Magic link via Resend — SMTP configured, domain verified,
      full login flow smoke tested 17 March 2026
- [x] portal_user table: email → client_id lookup, user_id hydrated on first login
- [x] PKCE flow: same-browser requirement documented (security feature, not bug)
- [x] Middleware: /callback correctly excluded from auth guard
- [x] Draft inbox — approve/reject working, posts move to publish queue ✅
- [x] Calendar — read-only scheduled + published posts view ✅
- [x] draft-notifier Edge Function deployed (v2) — fires when draft flagged
      ⚠️ email delivery not yet confirmed — pending live test
- [ ] RLS policies — verify client data isolation enforced
- [ ] Facebook connect flow in portal (moved from dashboard, D020)
- [ ] Email notification live test: flag a draft → confirm email arrives

**v1 remaining to onboard first paying client:**
- [ ] Confirm draft-notifier email delivery end-to-end
- [ ] RLS audit — confirm clients cannot see each other's data
- [ ] Facebook OAuth connect flow moved to portal

**3.2 — Content Analyst Agent** 🔲
- [ ] Weekly report generation per client
- [ ] Reads m.post_performance (requires 2.1 ✅)
- [ ] Identifies top performing topics, content types, posting times
- [ ] Plain-language recommendations written to client portal
- [ ] Replaces manual monthly report until this is built

**3.3 — Client Onboarding Flow** 🔲
- [ ] Portal onboarding sequence:
      Welcome → Connect Facebook → Connect LinkedIn → Brand voice review
      → First content preview (3 drafts) → Go-live confirmation
- [ ] Supabase setup SOP (you insert client rows before portal access granted)
- [ ] First external client onboarded end-to-end

**3.4 — Distribution Layer (Boost Agent)** 🔲
- [ ] Facebook Ads API boost integration (four-step: campaign → adset → creative → ad)
- [ ] boost-worker Edge Function, daily pg_cron
- [ ] m.post_boost table: campaign_id, adset_id, ad_id, spend, reach, status
- [ ] Boost rules per client: boost_enabled, budget, duration, objective,
      targeting, score_threshold (all in c.client_publish_profile)
- [ ] Standard Access graduation confirmed before enabling for clients
- [ ] Meta Business Manager partner access required per client (separate from OAuth)
- [ ] Email newsletter channel via Resend

**3.5 — Meta App Review (permissions submission)** 🔲
- [ ] OAuth screencast recorded using Care for Welfare page
- [ ] All 3 permission screencasts uploaded to App Review
- [ ] Data handling + reviewer instructions completed
- [ ] Production permissions obtained (pages_manage_posts,
      pages_read_engagement, pages_show_list)
- [ ] All clients migrated to production API access

**3.6 — Evergreen Content Type** 🔲
- [ ] c.evergreen_post table + rotation scheduler
- [ ] 10 evergreen posts per client seeded

**3.7 — Client Portal v2 (operating features)** 🔲
Builds on v1 foundation — scheduled after first client is live on v1:
- [ ] Platform ticker on instant posts + series (requires 2.11)
- [ ] Instant post / slot picker (brief → generation → slot selection → confirm)
      Available slots calculated from publish profile throttle rules —
      not a free datetime picker
- [ ] AI cost transparency — posts generated, AI cost, included in plan
      (requires 2.10 usage ledger)
- [ ] Feedback signals — thumbs up/down per post, topic preferences,
      free-text brief requests → feeds m.post_feedback → scoring weights
- [ ] Performance dashboard — reach, engagement, follower growth
      (requires 2.1 ✅ and meaningful data volume)
- [ ] Monthly performance report — auto-delivered (requires 3.2)

**3.8 — Content Series Planner in Portal** 🔲
Requires Phase 2.4 campaigns to be built first:
- [ ] Campaign brief form in portal
- [ ] AI-generated post outline for client review
- [ ] Approve/edit individual posts in series
- [ ] Schedule full series with one action (start date + cadence)
- [ ] Series progress view (published / pending / upcoming)

**3.9 — Client Offboarding Flow** 🔲
- [ ] Pause publishing (stops auto-publishing, keeps account)
- [ ] Export content history (all published posts as CSV)
- [ ] Disconnect pages (revoke OAuth tokens)
- [ ] Account closure request → your offboarding checklist

### Phase 3 Done When
1. First external paying client live and publishing for 4 weeks
2. Portal v1 accessible and used by at least one client
3. Content Analyst Agent delivering weekly reports (or manual report
   substituting until 3.2 is built)
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
- [ ] Portal self-service for common requests
- [ ] Billing and contract management process established

**4.2 — Additional Signal Sources**
- [ ] Reddit API (signal ingest only — not publishing)
- [ ] YouTube trending topics via Data API
- [ ] Email newsletter ingest full setup (D017)
- [ ] Apify scrapers for non-RSS sources
- [ ] Perplexity API for real-time synthesis and paywall bypass

**4.3 — AI Model Abstraction**
- [ ] Model router: ai-job → model_router → claude | openai | future
- [ ] Per-client model preference in client_brand_profile
- [ ] A/B testing for model quality comparison
- [ ] Usage ledger (2.10) already tracking cost per model — use to inform decisions
- [ ] Recent post history injection (last 7 posts) into system prompt
      to prevent topic repetition

**4.4 — Client Websites**
- [ ] Next.js website template (config-driven)
- [ ] Content flows ICE → Supabase → website automatically
- [ ] NDIS Yarns + Property Pulse websites live

**4.5 — Vertical Expansion**
- [ ] Third vertical: Aged Care or Mental Health
- [ ] Taxonomy rows added, at least one client in vertical

**4.6 — SaaS Evaluation**
- [ ] 10 clients served for 3+ months
- [ ] Unit economics confirmed (usage ledger from 2.10 provides data)
- [ ] Decide: continue managed service OR build self-serve platform

**4.7 — Mobile Dashboard**
- [ ] Ops dashboard responsive for mobile (internal tool — deferred)
- [ ] Sidebar collapses to hamburger, touch targets 44px min

**4.8 — TOTP Authenticator App for Portal**
- [ ] Supabase Auth TOTP enabled for portal
- [ ] Client can opt in via portal settings
- [ ] For clients handling sensitive participant data who want stronger auth

### Phase 4 Done When
No fixed end. Success: 8-10 clients, under 10 hours/week total,
positive unit economics, clear managed service vs SaaS decision made.

---

## Platform Publishing Roadmap

| Platform | Phase | Status | Notes |
|---|---|---|---|
| Facebook | 1 | ✅ Live | Primary platform |
| LinkedIn | 2 | ⏳ Blocked | Account recovery ticket open |
| Instagram | 2+ | 🔲 Planned | Same Meta API sprint as LinkedIn |
| Email newsletter | 3 | 🔲 Planned | Resend API, owned audience |
| Reddit | 4 | 🔲 Signal ingest only | Not publishing |
| YouTube | 4 | 🔲 Planned | Requires video production layer |
| TikTok | Skip | ❌ | Wrong audience for NDIS vertical |
| Twitter/X | Skip | ❌ | $100/month API, wrong audience |

Video/shorts/reels (Instagram Reels, YouTube Shorts, TikTok) are handled
by the platform targeting architecture (D022) — a new platform type gets
a new client_platform_profile row with a script-generation prompt rather
than a post-copy prompt. The platform ticker in the portal shows these
as available once a client has video production set up.

---

## Cross-Phase Dependencies

```
Facebook Insights (2.1) ✅
→ required for Content Analyst Agent (3.2)
→ required for Boost Agent (3.4)
→ required for Public Proof Dashboard (2.6)
→ required for feed scoring improvement

Content Intelligence Profiles (2.8) ✅
→ required for consistent brand voice at scale
→ required before adding new clients

AI Usage Ledger (2.10)
→ required before portal cost transparency (3.7)
→ required for unit economics confirmation (4.6)
→ should run before first paying client so cost baseline is established

Platform Targeting (2.11)
→ required for platform ticker in portal (3.7, 3.8)
→ required for token efficiency at scale
→ required for video/reels content type (4+)

Auto-Approval Agent (1.2) ✅
→ required for under 2 hours/week target
→ required before scaling to external clients

Next.js Dashboard (2.5) ✅
→ portal (3.1) scaffolded using same patterns

Meta App Review (1.6) ← IN PROGRESS
→ requires OAuth connect flow (D020 ✅)
→ blocks ALL external client work (3.x)

LinkedIn Publisher (2.3) ← BLOCKED
→ required before Facebook is sole platform risk
→ should complete before first external client onboards

Campaigns (2.4)
→ required before series planner in portal (3.8)

Public Proof Dashboard (2.6)
→ required as primary sales asset before first client conversation
→ depends on Insights (2.1 ✅) and follower numbers (2.7)
→ requires invegent-web repo + Vercel project (not yet created)

Client Portal v1 (3.1) ← IN PROGRESS
→ Magic link auth ✅ working (17 Mar 2026)
→ Inbox + calendar ✅ working
→ draft-notifier ⚠️ deployed, email delivery not yet confirmed
→ RLS audit pending
→ Facebook OAuth connect flow pending
```

---

## Infrastructure Status (17 March 2026)

### Edge Functions (11 active)
| Function | Version | Status |
|---|---|---|
| ingest | v81 | ✅ Active |
| content_fetch | v52 | ✅ Active |
| ai-worker | v49 | ✅ Active |
| publisher | v41 | ✅ Active |
| auto-approver | v16 | ✅ Active |
| insights-worker | v18 | ✅ Active |
| feed-intelligence | v7 | ✅ Active |
| email-ingest | v2 | ✅ Active |
| draft-notifier | v2 | ✅ Active |
| inspector | v69 | ✅ Active |
| inspector_sql_ro | v24 | ✅ Active |

### Vercel Projects
| Project | Domain | Status |
|---|---|---|
| invegent-dashboard | dashboard.invegent.com | ✅ Live |
| invegent-portal | portal.invegent.com | ✅ Live |
| invegent-web | invegent.com | ❌ Not created yet — needed for 2.6 |

### Email Infrastructure
| Component | Status |
|---|---|
| Resend domain (invegent.com) | ✅ Verified 16 Mar 2026 |
| Supabase Auth SMTP | ✅ Configured (smtp.resend.com:465) |
| RESEND_API_KEY Edge Secret | ✅ Added 17 Mar 2026 |
| Magic link delivery | ✅ Confirmed working |

---

## What Is Out of Scope (All Phases)

- Native mobile app (web-responsive Next.js portal covers mobile)
- Video production (ICE generates scripts; rendering requires ElevenLabs/HeyGen)
- Full ad campaign management (boost only, not campaign creative testing)
- CRM / lead management
- Community management (comment responses)
- White-label reseller platform (evaluate in Phase 4 only)
- Platforms outside Australia initially
