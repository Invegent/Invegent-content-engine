# Invegent — Product Charter
## Last updated: April 2026
## Type: Internal working document

This document defines what ICE is, what it is not, and how it makes decisions about scope. It is the first document to check before any build session starts. If a proposed feature does not fit the charter, it should not be built — or the charter should be deliberately updated to reflect a strategic change.

---

## What ICE Is

ICE is a signal-centric AI content engine. It ingests raw information from the world, extracts what is relevant to each client's context, generates platform-ready content in their voice, checks it against profession-specific compliance rules, and publishes it on a schedule — with a human approval step on flagged content.

The pipeline in one line: **signal → score → generate → comply → approve → publish → measure → improve.**

---

## The Four Content Types

**Type 1 — Signal Reactive**
Triggered by external events in the feed. A policy drops, a rate decision lands, a court ruling affects the sector. ICE ingests the signal, scores relevance, generates a timely post.
- Trigger: external feed event
- Volume: daily
- Current status: working

**Type 2 — Campaign / Content Series**
A multi-episode series on a planned topic. "10 posts explaining how OT supports NDIS early childhood participants." ICE plans the series, generates outlines for approval, writes all episodes.
- Trigger: client brief or content calendar
- Volume: weekly planned
- Current status: working

**Type 3 — Evergreen Pillars**
Foundational educational content that rotates back into the schedule for new followers. Permanently relevant, published on rotation.
- Trigger: schedule rotation
- Volume: monthly
- Current status: designed, not yet built

**Type 4 — Promotional / Event**
Client-initiated time-sensitive posts. "We have 2 spots for new OT clients." Human creates the brief, ICE formats and schedules.
- Trigger: manual brief in Content Studio
- Volume: occasional
- Current status: working (Single Post in Content Studio)

---

## Signal Source Hierarchy

Signal sources are ranked by quality and reliability. Higher quality sources produce better content. ICE monitors sources continuously and surfaces feed health to the operator.

**Tier 1 — Primary (always active):**
- RSS feeds from government sources (NDIS.gov.au, DSS, ABS, RBA)
- Official industry body feeds (OT Australia, Inclusion Australia, Summer Foundation, REIA)
- Open-access news sources (ABC, SBS Business)

**Tier 2 — Secondary (active per client vertical):**
- Email newsletter subscriptions (sector-specific, via Gmail label routing)
- YouTube channel subscriptions (inspiration and signal, per client)
- Curated industry aggregators

**Tier 3 — Future (Phase 4):**
- Reddit API (community signal, niche discussions)
- Google Trends API (volume and timing)
- Perplexity API (real-time synthesis, paywall bypass for research)
- Apify scrapers (priority sites without RSS)

**Excluded permanently:**
- Twitter/X — API costs prohibitive ($100+/month minimum), audience mismatch for NDIS vertical
- TikTok — API restricted, content format not appropriate for professional/B2B verticals
- Paywalled sources — ethical and legal risk, give-up mechanism already implemented

---

## Platform Publishing Priority

**Active now:**
- Facebook (Meta Graph API, text/image/video)
- YouTube (Data API, video content)

**Active when API approved:**
- LinkedIn (Community Management API — review in progress as of April 2026)

**Phase 2 (after Meta App Review Standard Access):**
- Instagram (same Meta API as Facebook, low additional effort)

**Phase 4 (requires additional build):**
- Email newsletter (via Resend — owned audience, no algorithm dependency)
- Client website / blog (ICE → Supabase → Next.js website, auto-publish)

**Never (for ICE core product):**
- Twitter/X — deprioritised permanently for professional/regulated verticals
- TikTok — API restricted, audience mismatch, content format wrong
- Pinterest, Snapchat, other platforms — not relevant to current verticals

---

## Video Pipeline Hierarchy

Video is an extension of ICE's output layer, not a separate product. All video content flows through the same pipeline (brief → script → render → publish). The render step is more complex than text/image. That is the only difference.

**Layer 1 — Short-form kinetic (active now):**
- Creatomate templates, 15–60 seconds, branded graphics and stats
- Cost: ~$0.05/video, included in Creatomate Essential subscription
- Formats: video_short_kinetic, video_short_stat

**Layer 2 — Avatar presenter video (next build):**
- HeyGen API, script → AI avatar → talking head, 1–30 minutes
- Requires: custom avatar trained on 2–5 minutes of client footage
- Cost: ~$1–5/minute of rendered video via API
- Use case: NDIS explainer videos, property market analysis, OT education, YouTube channel episodes
- Consent requirement: explicit written consent from every client before avatar is created

**Layer 3 — Long-form episode (Phase 4):**
- HeyGen structured episodes, 5–30 minutes
- Script structure: intro + 3 points + CTA
- Claude writes structured script, HeyGen renders, youtube-publisher uploads
- Use case: personal brand YouTube channel, entertainment/creator tier

**Layer 4 — Generative B-roll (Phase 4):**
- Runway Gen or Kling AI for atmospheric/cinematic B-roll layered into avatar videos
- Adds visual variety to presenter videos without requiring additional footage
- Cost: ~$0.10–0.50/clip, used sparingly

**Video analyser tool (next build):**
- Paste any YouTube/Instagram/TikTok URL
- Returns: transcript, Hindi/English translation, video type classification, production tech stack analysis, "recreate" brief
- Transcript extraction: Supadata API (YouTube), Apify actors (Instagram/TikTok)
- Analysis: Claude API (already integrated)
- Output: brief formatted for Content Studio video pipeline

**YouTube channel subscriptions as inspiration feeds:**
- Stored in f.feed_source with source_type_code = 'youtube_channel'
- Polled weekly via YouTube Data API (free quota)
- New uploads → transcript extracted → analysed → stored in f.canonical_content_body
- Client reviews in inspiration library, marks "Recreate" → enters video pipeline

---

## Vertical Expansion Rules

Every new vertical ICE enters follows the same sequence. No shortcuts.

1. **Compliance research** — what are the profession's rules of conduct? What can they not say publicly?
2. **Taxonomy extension** — add rows to t.content_vertical and related tables. Never touch global taxonomy.
3. **Compliance rules** — generate NDIS-style rules for the new profession, calibrated to zero HARD_BLOCK on test content
4. **Proof client** — at least one internal or paying client in the vertical before it is considered live
5. **Document** — add the vertical to this charter and to 07_business_context.md

**Current active verticals:**
- Disability Services → NDIS (Australia) — NDIS Yarns
- Real Estate → AU Residential Property + AU Mortgage & Lending — Property Pulse

**Target next vertical:**
- Aged care OR mental health (assess based on NDIS client network referrals)

**Future verticals (Phase 4):**
- Legal services, Accounting, Financial planning, Physiotherapy, Speech Therapy
- Each is a 1–2 week extension when the AI compliance rule generator is built

---

## Onboarding Flow (Clients)

All client onboarding happens through invegent.com. Platform forms (LinkedIn, Facebook, industry directories) serve as lead capture only — they direct prospects to invegent.com.

**Path A — Ready now:**
Short form on invegent.com. Client provides: business name, practice type, website, Facebook page URL, preferred posting frequency, a few brand voice notes. PK completes technical config (feed assignment, AI profile, channel connection) after form submission. Client receives confirmation and first draft within 5 business days.

**Path B — Needs a conversation:**
Calendar booking link on invegent.com. 30-minute discovery call. Leads to Path A if appropriate.

**The key principle:** onboarding burden sits with PK, not the client. The client provides brand inputs. PK handles everything technical. This is a managed service, not a SaaS platform.

---

## Decision Framework — Should We Build X?

Before building any new feature, check it against these questions in order:

1. **Does it serve Priority 1 or Priority 2 businesses?** (Care for Welfare / personal brand)
   - If yes: strong signal to build
   - If no: move to question 2

2. **Does it reduce operational hours per client?**
   - If yes: strong signal to build
   - If no: move to question 3

3. **Does it directly enable the next paying external client?**
   - If yes: build it
   - If no: move to question 4

4. **Does it fix a known legal, compliance, or platform risk?**
   - If yes: build it immediately
   - If no: move to question 5

5. **Does it support the SaaS transition path?**
   - If yes: add to Phase 4 roadmap
   - If no: do not build now — add to the ideas backlog and revisit at next quarterly review

---

## Standing Exclusions

These are never built regardless of how compelling the case sounds:

- Native mobile app (web-responsive Next.js covers the use case)
- Full ad campaign management (boost only via IAE agent, not full campaign management)
- CRM / lead management (this is not ICE's job)
- Community management — responding to comments and messages (human required, always)
- White-label reseller platform (evaluate at Phase 4 only, after 10 clients served)
- Competitor benchmarking for external clients (out of scope, creates legal risk)
- Video production requiring client filming (ICE uses AI avatar, not recorded footage)

---

## Known Intentional Gaps

These are gaps that are known, accepted, and not a priority:

- **No automated email newsletter channel** — Gmail infrastructure built, subscriptions pending. Not blocking.
- **No publisher schedule wiring** — Schedule UI live, publisher doesn't read it yet. Pre-external client gate.
- **No self-serve onboarding** — Managed service first. SaaS comes after proof.
- **No Instagram publishing** — After Meta App Review Standard Access is confirmed.
- **No pgvector / semantic search** — Planned for Phase 4 when data volume justifies it.
- **No job queue for long-running tasks** — pg_cron pattern works up to 20 clients. Trigger.dev/Inngest at 20+.
