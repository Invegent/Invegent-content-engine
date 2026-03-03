# ICE — Technical Blueprint

## Architecture Overview

ICE is built on a single Supabase backend serving multiple surfaces.
All intelligence, automation, and data lives in one place.
Multiple apps and agents read from and write to the same database.
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
│              (PostgreSQL + Edge Functions + Auth)               │
│                                                                 │
│  PIPELINE ENGINE          AGENT LAYER          DATA LAYER       │
│  ───────────────          ───────────          ──────────       │
│  ingest-worker            auto-approver        f.* (feeds)      │
│  content-fetch            feed-intelligence    m.* (publishing) │
│  ai-worker                content-analyst      c.* (clients)    │
│  bundler                  insights-worker      t.* (taxonomy)   │
│  publisher                boost-worker         a.* (enrichment) │
│  pg_cron (scheduler)                           k.* (governance) │
└──────────┬──────────────────────┬──────────────────┬───────────┘
│                      │                  │
▼                      ▼                  ▼
┌──────────────┐      ┌──────────────┐    ┌──────────────┐
│  Operations  │      │    Client    │    │   Client     │
│  Dashboard   │      │    Portal    │    │   Websites   │
│              │      │              │    │  (one per    │
│  Next.js     │      │  Next.js     │    │   client)    │
│  Vercel      │      │  Vercel      │    │  Next.js     │
│  (you only)  │      │  (RLS auth)  │    │  Vercel      │
└──────────────┘      └──────────────┘    └──────────────┘
│                      │                  │
└──────────────────────┴──────────────────┘
Claude Code
builds and maintains all three

---

## Technology Stack

### Core Infrastructure
| Component | Technology | Purpose |
|---|---|---|
| Database | Supabase / PostgreSQL | Single source of truth for all data |
| Serverless functions | Supabase Edge Functions (Deno/TypeScript) | Pipeline workers and agents |
| Scheduling | pg_cron | Automated pipeline orchestration |
| Auth | Supabase Auth + RLS | Multi-tenant client isolation |
| Storage | Supabase Storage | File assets if needed |

### AI Layer
| Component | Technology | Notes |
|---|---|---|
| Primary model | Claude API (Anthropic) | Better synthesis, brand voice, compliance |
| Secondary model | OpenAI GPT-4o | Fallback, specific tasks |
| Model routing | client_ai_profile.model | Per-client config, swappable |
| API pattern | Chat Completions / Responses API | Not Assistants (deprecated) |

### Publishing Layer
| Platform | API | Status |
|---|---|---|
| Facebook | Meta Graph API | ✅ Working |
| LinkedIn | LinkedIn API v2 | 🔲 Next sprint |
| Email | Resend API | 🔲 Planned |
| Website | Next.js + Supabase | 🔲 Planned |
| Instagram | Meta Graph API | 🔲 Future |

### Development & Deployment
| Component | Technology | Purpose |
|---|---|---|
| Dashboard / Portal / Sites | Next.js 14 (App Router) | All three client layers |
| Deployment | Vercel | Auto-deploy on git push |
| Version control | GitHub (Invegent org) | Source of truth for code |
| AI builder | Claude Code | Builds and maintains all layers |
| Local DB access | Supabase MCP | Direct DB queries in chat |

---

## Database Schema

### Schema Map
f.*  — Feed / Ingest layer (facts, raw data)
m.*  — Publishing layer (meaning, decisions, outputs)
c.*  — Client configuration layer
t.*  — Taxonomy reference layer (global, never changes)
a.*  — Enrichment layer (keywords, topics)
k.*  — Governance / data catalog

### Key Tables by Schema

**f schema — Feed & Ingest**
f.feed_source              Master list of all feed sources
f.ingest_run               Log of each ingest execution
f.raw_content_item         Raw items from each source
f.content_item             Normalised content items
f.canonical_content_item   Deduplicated canonical identity
f.content_item_canonical_map  Item → canonical mapping
f.canonical_content_body   Full text extraction with workflow states

**m schema — Publishing Pipeline**
m.digest_run               Digest execution windows
m.digest_item              Scored and selected items per digest
m.post_draft               AI-generated drafts awaiting approval
m.post_publish_queue       Approved posts awaiting publishing
m.post_publish             Published post record
m.post_performance         Engagement data from platform APIs (planned)
m.post_boost               Boost job record (campaign_id, adset_id, ad_id, status)
m.post_feedback            Manual feedback on published posts
m.ai_job                   Job queue for AI processing tasks

**c schema — Client Configuration**
c.client                   Client identity (name, slug, timezone, status)
c.client_ai_profile        AI persona, system prompt, model, platform rules
c.client_channel           Platform connections per client
c.client_digest_policy     Content selection rules (strict/lenient, window)
c.client_publish_profile   Publishing settings (mode, throttle, token, enabled,
                           boost_enabled, boost_budget_aud, boost_duration_days,
                           boost_objective, boost_targeting jsonb, boost_score_threshold)
c.client_source            Feed → client links with weights
c.client_content_scope     Client → content vertical links

**t schema — Taxonomy**
t.content_vertical         Vertical hierarchy (global → jurisdiction-specific)
t.6.0_content_domain       Top-level domains (17 domains)
t.6.1_content_pillar       Pillars per domain (71 pillars)
t.6.2_content_theme        Themes per pillar (715 themes)
t.6.3_content_topic        Specific topics (2,582 topics)
t.5.4_use_case_prompt_template  Prompt templates (27)
t.5.5_cta_master           CTA library (9 CTAs)
t.5.6_brand_voice          Brand voice definitions
t.5.7_compliance_rule      Disclaimer and compliance rules

---

## Pipeline Flow
INGEST
pg_cron (every 6 hours)
→ ingest-worker Edge Function
→ reads f.feed_source (active feeds)
→ fetches RSS/API content
→ writes to f.raw_content_item
→ creates f.content_item (normalised)
→ deduplicates into f.canonical_content_item
CONTENT FETCH
pg_cron (every 10 minutes)
→ content-fetch Edge Function
→ reads canonical items with status = 'pending_fetch'
→ attempts full text extraction via Jina reader
→ writes to f.canonical_content_body
→ status: 'success' | 'give_up_paywall' | 'give_up_blocked'
DIGEST
pg_cron (every 2 hours)
→ bundler Edge Function
→ reads client_content_scope → vertical → relevant topics
→ scores canonical items by relevance to client verticals
→ selects top items into m.digest_item
→ creates m.digest_run record
AI GENERATION
pg_cron (every 30 minutes)
→ ai-worker Edge Function
→ reads m.digest_item (status = 'pending_draft')
→ reads c.client_ai_profile (persona, system prompt, model)
→ calls Claude/OpenAI API
→ writes m.post_draft (status = 'needs_review')
APPROVAL
Manual: human reviews draft in dashboard → approve/reject
Auto: auto-approver agent scores against rules → auto-approve or flag
→ approved drafts → m.post_publish_queue
PUBLISH
pg_cron (every 15 minutes)
→ publisher Edge Function
→ reads m.post_publish_queue (due items, mode = 'auto')
→ calls platform API (Facebook, LinkedIn etc)
→ writes m.post_publish
→ updates queue item status
PERFORMANCE (planned)
pg_cron (daily)
→ insights-worker Edge Function
→ calls Facebook Graph API /insights
→ writes m.post_performance
→ feeds back into digest scoring

---

## Content Vertical Taxonomy

A three-level hierarchy that handles both global and jurisdiction-specific content:
Global Domain (universal)
└── Vertical (industry-level, stable)
└── Market/Program (jurisdiction-specific)
Example:
Health & Wellness
└── Disability Services (global vertical)
└── NDIS (Australia-specific)
└── NDCP (New Zealand, future)
Business & Finance
└── Real Estate (global vertical)
└── AU Residential Property
└── AU Commercial Property
└── UK Property (future)

This architecture means:
- New jurisdiction = add rows to t.content_vertical, never change global taxonomy
- New client = configure their vertical scope in c.client_content_scope
- Bundler reads client scope → finds relevant topics → scores content automatically

---

## The Four Agents

### Agent 1 — Auto-Approval Agent
**Purpose:** Eliminate manual review of 80-90% of drafts

**Logic:**
1. Read m.post_draft where approval_status = 'needs_review'
2. Score against c.client_ai_profile rules:
   - Tone compliance
   - Compliance/disclaimer check
   - Topic relevance to client verticals
   - Quality signals (hook strength, CTA present, word count)
3. Decision:
   - Score ≥ threshold → auto-approve → publish queue
   - Score < threshold → flag with reason → human reviews
   - Rule violation → reject with reason

**Implementation:** Edge Function, runs every 30 minutes via pg_cron
**Dependencies:** c.client_ai_profile rules fully populated per client

---

### Agent 2 — Feed Intelligence Agent
**Purpose:** Keep feed quality high without manual monitoring

**Logic:**
1. Weekly analysis of f.canonical_content_body per source:
   - Give-up rate (> 70% for 2 weeks → flag for deprecation)
   - Content quality (% of items producing approved drafts)
   - Relevance score (items matching client verticals)
2. Actions:
   - Poor feed → write recommendation to m.agent_recommendations
   - Gap detected → suggest new feed sources
   - Human approves/rejects recommendations in dashboard

**Implementation:** Edge Function, runs weekly via pg_cron
**New table needed:** m.agent_recommendations

---

### Agent 3 — Content Analyst Agent
**Purpose:** Generate weekly performance reports per client

**Logic:**
1. Read m.post_performance for the past 7 days per client
2. Identify: top performing topics, best posting times, content type performance
3. Compare against vertical benchmarks
4. Generate insight report with recommendations
5. Write to client portal for client to read

**Implementation:** Edge Function, runs weekly via pg_cron
**Dependencies:** Facebook Insights back-feed must be working first

---

### Agent 4 — Auto-Boost Agent
**Purpose:** Automatically boost top-performing posts via the Facebook Ads API
to grow page reach without manual ad management

**Four-step Facebook Ads API hierarchy:**
1. Campaign — create with objective = PAGE_LIKES or POST_ENGAGEMENT
2. Ad Set — define targeting (job title, location, age), budget, schedule
3. Creative — reference the existing page post by platform_post_id
4. Ad — combine creative + ad set → submit for review → goes live

**Logic:**
1. Read m.post_publish where published_at > 24 hours ago
2. Read m.post_performance — check engagement rate vs client threshold
3. If engagement_rate ≥ boost_score_threshold in client_publish_profile:
   - Create Campaign via Ads API
   - Create Ad Set (targeting from boost_targeting jsonb field)
   - Create Ad Creative referencing platform_post_id
   - Create Ad → status transitions: PENDING_REVIEW → ACTIVE
4. Write to m.post_boost (campaign_id, adset_id, creative_id, ad_id, status)
5. Daily: check ad status, write spend and reach back to m.post_boost

**Rate limits:**
- Ads API: 200 calls per hour per ad account
- Each boost = 4 API calls (one per hierarchy level)
- 10 boosts per hour is well within limits

**Permissions required (Meta App Review):**
- ads_management
- ads_read
- pages_manage_ads
- business_management (for Business Manager accounts)

**Implementation:** Edge Function (boost-worker), runs daily via pg_cron
**Dependencies:**
- m.post_performance must be populated (requires Phase 2.1)
- Meta App Review must include ads_management permission (Phase 1.6)
- Standard Access graduation required before boosting third-party client pages

---

## Publishing Mode Architecture

Each client has a mode setting in c.client_publish_profile:
auto     → approved drafts publish automatically on schedule
manual   → approved drafts sit in queue, human triggers publish
staging  → nothing publishes, for testing only

The publisher Edge Function filters by mode = 'auto'. Manual clients require a button press in the dashboard to release queued posts.

---

## Key Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | Supabase / PostgreSQL | Low lock-in, portable, RLS built-in |
| AI API | Claude primary, OpenAI fallback | Claude better for synthesis and brand voice |
| Persona storage | Database (client_ai_profile) | Not in API (Assistants deprecated), portable |
| Pipeline orchestration | pg_cron + Edge Functions | Already proven, no new infrastructure |
| Frontend | Next.js + Vercel | Claude Code builds it, auto-deploy, same pattern for all three layers |
| Multi-tenancy | Supabase RLS | Enforced at DB level, not application level |
| Feed normalisation | Single schema regardless of source | source_type_code field, normaliser per type |
