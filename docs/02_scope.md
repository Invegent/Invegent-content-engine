# ICE — Product Scope

## What ICE Is

ICE is a signal-centric content intelligence engine. Unlike traditional social media tools that start with "what should we post today", ICE starts upstream — ingesting raw information streams, extracting meaning, and synthesising branded content automatically. The human decides strategy and reviews exceptions. The engine handles everything else.

The core philosophy: **signals first, posts second.** Every piece of content ICE produces is traceable back to a real-world signal — a policy update, a market movement, a trending topic, a research finding. This makes ICE's output genuinely informative rather than manufactured noise.

---

## What ICE Does

### The Four Content Types

ICE produces four distinct types of content, each with a different trigger and purpose:

**Type 1 — Signal Reactive**
Triggered by external events in the feed. A new NDIS policy drops, a RBA rate decision lands, a court ruling affects disability services — ICE ingests the signal, scores its relevance, and generates a timely post in the client's voice.
- Trigger: external feed event
- Volume: daily
- Shelf life: days
- Current status: working

**Type 2 — Campaign / Mini Series**
Triggered by a client brief or content calendar. "Create a 10-post series explaining how physiotherapy helps NDIS participants." ICE plans the series, generates post outlines for human review, then writes all posts to a schedule.
- Trigger: client brief or calendar
- Volume: weekly planned
- Shelf life: weeks to months
- Current status: designed, not yet built

**Type 3 — Evergreen Pillars**
Foundational educational content that rotates back into the schedule for new followers. "What is an NDIS plan?" gets published quarterly. "How does negative gearing work?" gets published every six months. New audience members always encounter the foundations.
- Trigger: schedule rotation
- Volume: monthly
- Shelf life: permanent
- Current status: designed, not yet built

**Type 4 — Promotional / Event**
Client-initiated time-sensitive posts. "We have 2 spots for new OT clients." "Webinar this Thursday." Human creates the brief, ICE formats and schedules.
- Trigger: manual client request
- Volume: occasional
- Shelf life: hours to days
- Current status: designed, not yet built

---

## Signal Sources

### Currently Working
- RSS feeds (news aggregators, government sources, industry bodies)
- DSS (Department of Social Services) government feeds — zero blockage, high quality
- Manual URL submission

### Planned
- Email newsletters via Postmark inbound parsing
- Reddit API (free, high signal for niche communities)
- YouTube trending topics via Data API
- Google Trends API
- Facebook group/page monitoring (Meta API permitting)
- Twitter/X API (note: now $100/month minimum — evaluate ROI)
- Perplexity API for paywall bypass and real-time synthesis
- Apify scrapers for sites without RSS feeds

### Known Limitations
- Paywalled sources (AFR, The Australian, Domain, News.com.au) — 272 URLs at give-up status
- Facebook group scraping — limited by Meta API policy
- TikTok — API access restricted
- Hard paywalls — no reliable bypass currently (Diffbot partially addresses soft paywalls)

---

## Publish Platforms

### Currently Working
- Facebook Pages (via Meta Graph API)

### Planned — Priority Order
1. LinkedIn (organic reach better than Facebook for B2B, no cold-start problem)
2. Email newsletter (via Resend — owned audience, no algorithm dependency)
3. Client website / blog (via Next.js — content auto-publishes to web presence)
4. Instagram (same Meta API as Facebook, low additional effort)
5. YouTube (requires video production layer — ElevenLabs voice + HeyGen avatar or client recording)

### Platform Abstraction
Each platform is a separate Edge Function behind a platform router. Adding a new platform = adding one function. Removing a broken platform = disabling one function. No other pipeline changes required.

---

## The Three Client Layers

ICE serves three distinct audiences, each with a different interface:

**Layer 1 — Operations Dashboard (internal)**
Used only by Invegent (you). Full pipeline control — feed management, client configuration, draft review, publish queue, agent monitoring, token management. Currently Retool. Migrating to Next.js on Vercel.

**Layer 2 — Client Portal**
Clients log in to see their own content performance, approve campaign briefs, review flagged drafts, and request new content series. Each client sees only their own data — enforced by Supabase Row Level Security. Built in Next.js, separate app from the operations dashboard.

**Layer 3 — Public-Facing Websites**
One Next.js site per client. Content flows from ICE → Supabase → website automatically. NDIS Yarns website, Property Pulse website. Zero manual publishing required. SEO-optimised, auto-updating.

---

## What ICE Does Not Do

- **Video production** — ICE can generate scripts and metadata but does not record or render video. Requires ElevenLabs (voice) + HeyGen (avatar) integration or client self-recording.
- **Graphic design** — ICE does not create images or branded graphics. Canva API or manual templates required for visual content.
- **Community management** — ICE does not respond to comments, messages, or mentions. Human required.
- **Paid advertising management** — ICE can trigger Facebook post boosts via Ads API but does not manage full ad campaigns, creative testing, or budget optimisation.
- **CRM / lead management** — ICE generates awareness content. It does not capture, track, or manage leads from that content.
- **Analytics reporting** — ICE collects performance data and surfaces it in the dashboard. It does not produce formatted client reports (this is the Content Analyst Agent's job — planned).

---

## Current Clients (Internal Test)

**NDIS Yarns**
- Vertical: Disability Services → NDIS (Australia)
- Platform: Facebook
- Purpose: Proof of concept for NDIS allied health sector / OT practice growth
- Status: Active, publishing

**Property Pulse**
- Vertical: Real Estate → AU Residential Property + AU Mortgage & Lending
- Platform: Facebook
- Purpose: Proof of concept for property investment sector / property business pivot validation
- Status: Active, publishing

---

## Target Client Profile (External)

**Primary — NDIS Providers**
- OT practices, physiotherapy, speech therapy, support coordination, plan management
- 2–20 staff, founder-led
- Know they need social media presence, have no time or expertise to do it
- Fear getting NDIS compliance wrong in public communications
- Budget: $500–1,500/month for fully managed content service
- ICE advantage: built by an OT, understands NDIS compliance from the inside

**Secondary — Property Professionals**
- Mortgage brokers, buyers agents, real estate agencies, property educators
- Need consistent thought leadership content to build referral pipeline
- Budget: $800–2,000/month
- ICE advantage: built by an investor, understands the market from the inside

**Future — Any Regulated or Specialised Vertical**
- Aged care, mental health, legal services, accounting, financial planning
- Same pattern: regulated industry + content marketing gap + ICE vertical taxonomy
