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
- [x] Screencasts recorded for all 3 permissions (18 March 2026)
- [ ] Screencasts uploaded to App Review submission
- [ ] Data handling + reviewer instructions sections completed
- [ ] Business verification approval confirmed (In Review — ~2 working days)
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
**Previous blocker resolved:** LinkedIn account recovery — new account
created at pk@invegent.com (18 March 2026). Developer apps verified.
API products added. LinkedIn is now unblocked — ready to build.

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

**2.3 — LinkedIn Publisher** 🔲 READY TO BUILD
- [x] Account blocker resolved — new LinkedIn account: pk@invegent.com
- [x] Invegent Company Page connected and verified on both dev apps
- [x] Developer app: Invegent Publisher (Client ID: 78npkxuir4z64j)
- [x] Share on LinkedIn product added (Default Tier) ✅
- [x] Sign In with LinkedIn using OpenID Connect added (Standard Tier) ✅
- [ ] linkedin-publisher Edge Function built
- [ ] OAuth connect flow — /connect page on portal (same pattern as Facebook D020)
      Auth via pk@invegent.com LinkedIn account
      Permissions: w_member_social (personal posts) or
      w_organization_social (company page posts)
- [ ] c.client_channel row for LinkedIn per client
- [ ] Both clients configured and test posts verified
- [ ] Platform abstraction layer confirmed (publisher → platform router)

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
- [ ] Read-only page at invegent.com/proof
- [ ] NDIS Yarns live metrics: followers, posts published, engagement, top posts
- [ ] Primary sales asset for client acquisition conversations
- [ ] Depends on: Facebook Insights data (2.1 ✅)
- [x] invegent-web repo created (18 March 2026)
- [x] invegent-web deployed to Vercel — invegent.com (DNS propagating 18 Mar)
- [ ] /proof page built into invegent-web

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
- [ ] Ops dashboard: AI Costs tab — total spend, per-client breakdown,
      model split (Claude vs OpenAI), cost per post, month trend

**2.11 — Per-Post Platform Targeting** 🔲 PLANNED
- [ ] Schema migration: target_platforms TEXT[] on m.digest_item,
      platform TEXT on m.post_draft
- [ ] Bundler update: populate target_platforms from active publish profiles
- [ ] ai-worker update: loop over target_platforms, one draft per platform
- [ ] Auto-approver update: platform-aware threshold
- [ ] Post Studio + portal: platform ticker

### Phase 2 Done When
1. Less than 2 hours/week total manual input ✅ (approaching)
2. Performance data flowing back into scoring ✅ (2.1 complete)
3. LinkedIn publishing live 🔲 (unblocked — ready to build)
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
- [x] draft-notifier Edge Function deployed (v2) — confirmed working 18 Mar 2026
- [x] RLS enforced on m.post_draft, post_publish_queue, post_publish,
      post_performance — applied 17 March 2026, confirmed working 18 Mar 2026
- [ ] Facebook connect flow in portal (moved from dashboard, D020)

**v1 remaining to onboard first paying client:**
- [ ] Facebook OAuth connect flow moved to portal
- [ ] draft notifier email subject redesign (noted — pending)

**3.2 — Content Analyst Agent** 🔲
**3.3 — Client Onboarding Flow** 🔲
**3.4 — Distribution Layer (Boost Agent)** 🔲
**3.5 — Meta App Review (permissions submission)** 🔲
**3.6 — Evergreen Content Type** 🔲
**3.7 — Client Portal v2** 🔲
**3.8 — Content Series Planner in Portal** 🔲
**3.9 — Client Offboarding Flow** 🔲

### Phase 3 Done When
1. First external paying client live and publishing for 4 weeks
2. Portal v1 accessible and used by at least one client
3. Content Analyst Agent delivering weekly reports (or manual substitute)
4. Meta App Review approved or in final review stage

---

## Phase 4 — Scale
**Goal:** ICE serves 5-10 clients with minimal marginal effort
per new client. Business model proven.

**Target start:** When Phase 3 done criteria are met

### Deliverables
4.1 Multi-Client Operations / 4.2 Additional Signal Sources /
4.3 AI Model Abstraction / 4.4 Client Websites /
4.5 Vertical Expansion / 4.6 SaaS Evaluation /
4.7 Mobile Dashboard / 4.8 TOTP for Portal

---

## Platform Publishing Roadmap

| Platform | Phase | Status | Notes |
|---|---|---|---|
| Facebook | 1 | ✅ Live | Primary platform |
| LinkedIn | 2 | 🔲 Ready to build | Account unblocked 18 Mar 2026 |
| Instagram | 2+ | 🔲 Planned | Same Meta API sprint as LinkedIn |
| Email newsletter | 3 | 🔲 Planned | Resend API, owned audience |
| Reddit | 4 | 🔲 Signal ingest only | Not publishing |
| YouTube | 4 | 🔲 Planned | Requires video production layer |
| TikTok | Skip | ❌ | Wrong audience for NDIS vertical |
| Twitter/X | Skip | ❌ | $100/month API, wrong audience |

---

## Infrastructure Status (18 March 2026)

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
| invegent-web | invegent.com | ✅ Deployed — DNS propagating 18 Mar |

### LinkedIn Developer Apps (18 March 2026)
| App | Client ID | Status |
|---|---|---|
| Invegent Publisher | 78npkxuir4z64j | ✅ Company verified, Share on LinkedIn added |
| Invegent Community | 78im589pktk59k | ✅ Company verified (secondary, not used for publishing) |

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
