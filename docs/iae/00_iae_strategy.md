# IAE — Invegent Advertising Engine
## Strategic Document — Brainstorm Session April 2026

**Status:** Concept only. Not being built. Prerequisites not met.
**Trigger to revisit:** 2–3 paying ICE clients, explicit client demand for paid amplification confirmed.

---

## What IAE Is

IAE is the amplification engine of ICE. It is not a standalone ads product.
It only works because ICE has already done three things:

1. Built an organic engagement pool that proves what content resonates before money is spent
2. Accumulated Custom Audience assets that Meta, Google, and LinkedIn can activate against
3. Established social proof on content that makes paid amplification more effective than cold creative

Without ICE running well for 6+ months, IAE has nothing to amplify.
This is not a business decision — it is a technical and strategic reality.

---

## The Core Insight

Every other ads platform and agency operates on a guess-then-spend model.
They create content or ad creative, spend money to test it, see what works,
optimise, spend more. The testing happens with paid dollars.

ICE inverts this. The testing happens organically first — for free — and paid
spend only amplifies what already proved itself. That is a fundamentally
different risk profile for the client.

No competitor can replicate this because they are not running both the content
operation and the ads operation simultaneously for the same client.

---

## The Flywheel

```
STAGE 1 — Signal
ICE ingests information environment
NDIS policy update, OT research, market movement

STAGE 2 — Content
ICE generates post in client's voice
Published organically to Facebook, Instagram, LinkedIn

STAGE 3 — Performance signal
24–48 hours post-publish
Insights API reads back engagement data
Writes to m.post_performance

STAGE 4 — Signal scoring
ICE compares against client baseline
This post got 3× average engagement
Topic resonated, hook worked, audience responded
Proven creative — no agency knows this before spending

STAGE 5 — Boost decision
IAE reads performance score
If above client's boost_score_threshold → flagged as candidate
Human approval initially, automated once trust established

STAGE 6 — Amplification
Meta Ads API fires 4-step hierarchy
Campaign → Ad Set → Creative (references platform_post_id)
Organic social proof carries over to boosted version
47 likes + 12 comments already visible on the ad
Converts better than cold creative with zero social proof

STAGE 7 — Paid performance back-feed
Spend, reach, impressions, clicks written to m.post_boost
Organic + paid performance now both exist for same content

STAGE 8 — Scoring refinement
Combined performance feeds back into digest scoring weights
ICE starts favouring content that produces organic engagement
AND paid conversion efficiency
Not just 'what got likes' — 'what got likes AND drove enquiries when boosted'

STAGE 9 — Audience building
Every person who engaged becomes Custom Audience seed
Website visitors captured by pixel → retargeting pool
Pools compound over time
Next boost targets warm audiences first — cheaper CPMs, higher conversion

STAGE 10 — Referrer network (NDIS-specific)
Support coordinators and plan managers are identifiable by job title in Meta
~30,000–40,000 support coordinators in Australia, active on Facebook
One referrer relationship = 5–20 participant referrals over career
ICE content builds credibility organically with this audience
IAE boosts that content specifically to this cold referrer segment
Organic credibility makes paid impression land differently than cold ad
```

---

## The Audience Architecture

### Meta's Three Audience Types

**Saved Audiences** — manually defined. Demographics, job titles, locations.
Static. No structural advantage for Invegent. Anyone can build these.

**Custom Audiences** — built from real signals. People who engaged with
content, visited pages, watched videos, clicked links. Dynamic and compounding.
This is where ICE creates structural advantage.

**Lookalike Audiences** — Meta finds people statistically similar to your
Custom Audience. Only as good as the seed feeding it. A strong seed —
highly engaged, highly specific — produces a powerful lookalike.

### The Four Audience Streams

**Stream 1 — Organic Engagement Pool**
Every like, comment, share, save, video watch captured as Custom Audience.
ICE builds this continuously. 260 posts per year compounds the pool.
Month 1: ~50 people. Month 12: ~2,000 highly relevant people.
Built for free, organically, before a single dollar of ad spend.

**Stream 2 — Page Follower Audience**
Followers are a Custom Audience by default.
Reachable for ~$0.001 per impression — categorically cheaper than cold.
ICE content converts visitors to followers.
Better content → more followers → larger warm base for IAE.

**Stream 3 — Website Visitor Audience**
Meta Pixel captures anyone who clicks through from Facebook to client website.
Warmer than page engagement — they took a second deliberate action.
Small but highest-converting retargeting segment.
Requires Meta Pixel on client website — mandatory onboarding step.

**Stream 4 — Referrer Network (NDIS-specific)**
Cold audience — support coordinators and plan managers by job title.
Within 50km radius of client location.
Cold but highly targeted.
One conversion = 5–20 participant referrals over 12 months.
ICE warms this audience organically first.
IAE boosts content to this cold referrer segment after credibility is established.
Do NOT run referrer targeting until month 9+ of ICE publishing.
Running in month 1 with thin page looks like every other new provider.
Running in month 9 with 260 posts looks completely different.

### The Audience Maturity Model

```
Months 1–3 — Seed phase
No paid spend. ICE publishes. Engagement pool grows slowly.
Goal: quality signal accumulation, not reach.
Small highly-engaged audience over large passive one.

Months 3–6 — Warm audience activation
First IAE boosts. Target: people already in Custom Audience.
Budget: $200–400/month. Cost per result low — audience is warm.
Goal: conversion, not reach.

Months 6–9 — Lookalike expansion
Custom Audience large enough to generate meaningful Lookalike.
1% Lookalike from strong seed = 50,000–100,000 relevant cold people.
Two parallel campaigns: warm retargeting + cold lookalike.

Months 9–12 — Referrer network activation
ICE has 9+ months of credible NDIS content published.
Page has visible engagement and social proof.
Referrer audience sees established provider, not new business.
Conversion rate categorically higher than month 1 referrer targeting.
```

### Email as Canonical Audience Record

Email is the only platform-independent audience asset.
Meta Custom Audience can be revoked. Google can deprecate. LinkedIn can change.
Email list belongs to the client, not to any platform.

Email bridges all platforms:
- Upload to Google Customer Match → Google audience seeded
- Upload to LinkedIn Matched Audiences → LinkedIn audience seeded
- Upload to Meta Custom Audiences → Meta retargeting seeded

One underlying audience, three platform expressions.
The email list is the master record from which platform audiences are derived.

**Email capture must be established at onboarding — not optional.**

---

## The Content Format Layer

ICE must be engineered to build audiences deliberately, not as a side effect.
This requires five deliberate content format types, each with a specific
audience-building purpose.

### Meta's Signal Hierarchy (high to low value)
```
Paid click to website       — highest
Video watched 75%+
Video watched 50%+
Post saved
Post shared
Comment left
Link clicked
Reaction given
Post seen 3+ seconds        — lowest
```

ICE currently produces content that gets reactions and comments.
The format layer is about engineering content that drives the top half:
saves, video completions, website clicks.

### Five Format Types

**signal_reactive** — timely, authoritative, credibility building
Triggered by real-world signal. Builds authority and page credibility.
Audience goal: page engagers Custom Audience.

**video_script** — 60–90 second speaking script, practitioner records
Builds video viewer Custom Audience — most powerful Lookalike seed.
Personal trust that static posts cannot achieve.
ICE generates script. Human delivers it.
Audience goal: video viewer Custom Audience (50%+ watch).

**carousel** — 5–8 slide narrative sequence
Highest average dwell time of any Facebook organic format.
Each slide advances one idea. First slide is hook. Last slide is soft CTA.
Audience goal: deep engagers, post savers.

**community_question** — open peer question
Invites support coordinator and peer engagement.
Builds social proof for future boosts.
Generates comments that keep post active for days.
Audience goal: social proof accumulation.

**website_traffic** — explicit link post to client website
Every click captured by Meta Pixel AND Google pixel simultaneously.
Builds website visitor Custom Audience — warmest retargeting segment.
Requires client website with pixels installed.
Audience goal: pixel retargeting pool.

### Designed Weekly Mix
```
Monday    — signal_reactive
Tuesday   — video_script
Wednesday — carousel or save-intent checklist
Thursday  — community_question
Friday    — website_traffic
```

Five posts per week — same volume ICE already produces.
The change is intentionality of format, not volume.

---

## Platform Strategy

### Facebook
Not dying for NDIS sector in 3–5 year horizon.
Demographic: 45–65 year olds (participant families, carers, support coordinators).
Organic reach declining (1–3% of followers). Increasingly pay-to-play.
Right platform for warm audience retargeting and referrer targeting.

### Instagram
Same Meta API, same pixel, same Custom Audiences — unified with Facebook.
Audience skews younger: participants 20–30s, younger support coordinators.
Content format shift: visual, Reels, shorter.
Lowest marginal cost to add to ICE — same pipeline, format adaptation only.
Priority: add to ICE publishing layer as near-term extension.

### LinkedIn
Most underrated platform for NDIS providers.
Not for participant acquisition — for referrer network building.
Support coordinators, plan managers, LACs, allied health professionals.
All on LinkedIn. Professional context — follower is professional endorsement.
ICE LinkedIn publisher already partially deployed.
Needs stabilisation before IAE activation.

### Reddit
Intelligence only — not publishing, not advertising.
r/NDIS: 47,000+ members, extraordinarily active.
Highest-quality signal of genuine community need.
Add r/NDIS to ICE ingest feed layer as signal source.
Do not attempt Reddit advertising — community hostile to overt marketing.

### YouTube
Long-game SEO compounding value.
ICE video script format enables client self-recording.
Content ranked on Google search generates enquiries for years.
Not a publishing priority in current phases.

### TikTok
Growing in disability space but compliance risk is high.
AHPRA advertising guidelines + NDIS Code of Conduct + TikTok moderation.
Defer until Phase 4+.

---

## The Automation Model

### At Full Build — Realistic Split

**Fully automated (~80%)**
Signal ingestion, content generation, publishing, performance ingestion,
audience tracking, boost detection, campaign execution, reporting.

**AI-assisted, human approves (~15%)**
Flagged drafts, boost approvals, compliance edge cases,
weekly performance summary review.

**Fully manual (~5%)**
Video recording by practitioner, strategic direction, onboarding steps.

The 5% manual is irreducible and should not be reduced.
The human touch in video and strategy is the product differentiation.

### IAE Automation Detail

```
Performance threshold detection  — fully automated
Boost candidate flagging          — fully automated
Boost brief generation            — AI-driven (Claude)
Human approval                    — human-in-loop (required)
Campaign creation                 — fully automated (boost-worker)
Budget management                 — rule-based, hard caps in code
Performance monitoring            — fully automated (daily)
Lookalike creation                — semi-automated
Cross-platform email upload       — semi-automated
Reporting                         — AI-assisted (Claude synthesises)
```

---

## The Competitive Position

An agency doing ads-only for an NDIS provider has:
- No organic performance data before spend
- No content operation feeding the creative pipeline
- No compliance depth from inside the sector
- No compound audience from months of organic relationship building

Invegent doing ICE + IAE has all of that. The longer a client stays,
the wider the moat gets. Month 12 is categorically harder to replicate
than month 1.

The flywheel does not work without ICE.
ICE works fine without IAE.
But ICE + IAE together creates something neither can create alone —
and something no competitor is building for this sector.

---

## IAE Pricing Mental Model

Two components, clearly separated:

**Ad spend** — client's money. Passed through or managed separately.
Full transparency. Never bundled into Invegent's fee.

**IAE management fee** — Invegent's fee for running the system.

```
Starter  — Meta boost only, up to $500/month ad spend:    $200/month
Standard — Meta + LinkedIn, up to $1,500/month ad spend:  $400/month
Growth   — All platforms, up to $3,000/month ad spend:    $700/month
```

On top of ICE content fees.
Combined ICE Standard ($800/month) + IAE Standard ($400/month) = $1,200/month.
Acquiring two NDIS participants at $1,500–$3,000/month in plan claims
covers the annual cost.

---

## Business Advisor Assessment

**Recommendation: Do not build IAE yet.**

ICE has zero external paying clients. Phase 1 is not complete.
IAE introduces direct financial liability before operational foundation is stable.
Distraction cost is high — focus is the highest value activity right now.

**Build sequence:**
1. Complete ICE Phase 1
2. Get 2–3 paying ICE clients
3. Run ICE for 3+ months, let audience pools compound
4. Ask clients directly whether they want paid amplification
5. If demand confirmed: agency referral partnership before building
6. If agency partnership validates demand: then scope IAE Phase A build

Phase 3.4 Meta boost (within ICE) is not IAE.
It is a feature of ICE that tests whether clients respond to paid amplification.
Build Phase 3.4 when Phase 3 arrives. Do not conflate with IAE.

---

*Document created: April 2026*
*Source: brainstorming session — holiday period*
*Status: strategic concept, no build commitment*
