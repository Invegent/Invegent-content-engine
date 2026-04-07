# Invegent — Legal Compliance Register
## Last updated: April 2026
## Type: Internal working document

> **Important:** This document tracks legal issues for internal awareness. It is not legal advice. Before signing the first external client, Invegent requires a formal legal review by an Australian IP lawyer and a health law specialist. Estimated cost: $2,000–5,000 AUD. This is not optional.

---

## How to Use This Document

Each issue has:
- **Risk level:** Critical / High / Medium / Low
- **Status:** Open / Mitigated / Closed / Monitoring
- **Action required:** What needs to happen and by when
- **Owner:** Who is responsible

Review this register quarterly or whenever a significant new capability is added (video, new platforms, new verticals).

---

## L001 — NDIS Content Liability
**Risk level:** Critical
**Status:** Partially mitigated

**Issue:** ICE generates content on behalf of NDIS registered providers. If a post contains advice or claims that violate NDIS Practice Standards, Disability Discrimination Act provisions, or a provider's registration conditions, the provider is primarily liable — but ICE may have secondary liability as a service provider.

**Current mitigations:**
- 22 NDIS-specific compliance rules active, profession-scoped to OT
- HARD_BLOCK mechanism for zero-tolerance violations
- SOFT_WARN mechanism for sensitive content
- All content requires human approval before publishing

**Remaining gaps:**
- No ToS clause limiting ICE's liability for compliance failures
- ICE should not claim compliance guarantee — only compliance-aware generation
- Providers must be told explicitly they remain solely responsible for published content

**Action required:**
- Draft ToS clause: *"ICE's AI-generated content is reviewed against established compliance guidelines but does not constitute legal or regulatory advice. The registered NDIS provider remains solely responsible for the compliance of all published communications."*
- Get this reviewed by a health law specialist before first external NDIS client is signed
- **Deadline: Before first external client**
- **Owner: PK**

---

## L002 — Meta API Development Tier
**Risk level:** Critical
**Status:** Being resolved

**Issue:** ICE currently operates on development-tier Meta API access. This explicitly does not permit managing third-party client pages at scale. Using development-tier access to publish for paying external clients is a violation of Meta's Developer Policies — not a legal infringement, but a platform ToS violation with consequences including permanent account suspension.

**Current status:**
- Meta App Review submitted. Business verification In Review as of April 2026.
- Standard Access requires approximately 1,500 successful API calls within a 15-day window.
- Next review check: 14 April 2026.

**Action required:**
- **Do not onboard any external client to Facebook publishing until Standard Access is confirmed. This is a hard gate, not a soft one.**
- Monitor Meta App Review status weekly
- **Owner: PK**

---

## L003 — RSS Feed Content and Copyright
**Risk level:** Medium
**Status:** Monitoring

**Issue:** ICE ingests RSS feeds, attempts to extract full article text via Jina Reader, and uses that text as AI generation context. This raises questions about whether systematically using copyrighted article text as AI context constitutes infringement — even when the output is original Claude generation.

**Assessment:** Legally unsettled territory. ICE's architecture is arguably defensible because:
- Output is original Claude generation, not a reproduction of source content
- Source articles are used as context, not copied verbatim into published posts
- Published posts reference the source URL
- ICE's give-up mechanism for paywalled content reduces exposure (paywalled sources → 272 give-up URLs, not accessed)

**Current mitigations:**
- Content fetch give-up mechanism for paywalled sources
- Privacy policy discloses third-party data use
- Published posts do not reproduce source text

**Action required:**
- Add ToS clause clarifying that content is generated using public news signals and that Invegent does not reproduce copyrighted material verbatim
- Include in the legal review
- **Deadline: Before first external client**
- **Owner: PK**

---

## L004 — Video Analyser and Platform Terms of Service
**Risk level:** Medium
**Status:** Open — not yet built

**Issue:** The planned video analyser will use Apify actors and Supadata API to extract transcripts from YouTube, Instagram, and TikTok. YouTube's Terms of Service prohibit automated scraping of transcript data. Instagram and TikTok have similar restrictions. Apify and Supadata operate in a legal grey zone that platforms regularly attempt to shut down.

**Risk:** Not copyright infringement, but platform ToS violations. Consequences: API access termination, account bans on the platforms, disruption to ICE's video pipeline.

**Mitigation approach:**
- Use Supadata's API (which is a legitimate commercial service, not a scraper ICE builds and operates)
- Frame the analyser as structural inspiration, not content copying
- Claude's analysis extracts structure and format, not reproduces original content
- Never store full transcripts beyond 24 hours — treat as processing context, not archived data

**Action required:**
- Design the analyser to extract structural elements only (video type, hook structure, content arc) rather than reproduce transcripts
- Include in legal review when video analyser build begins
- **Deadline: Before video analyser is offered to external clients**
- **Owner: PK**

---

## L005 — Avatar Video Consent (Critical)
**Risk level:** Critical
**Status:** Open — consent workflow not yet built

**Issue:** HeyGen requires 2–5 minutes of video footage to create a custom digital avatar. ICE will create these avatars for clients and use them to generate video content at scale. Without explicit, documented consent, this creates serious legal exposure:

- **Australian law:** Privacy Act 1988 (biometric data), Australian Consumer Law (misleading conduct), common law tort of passing off
- **HeyGen ToS:** Requires consent documentation for custom avatars
- **Risk:** A client who later disputes that their avatar was created without proper consent, or that it was used in ways they didn't agree to, could pursue legal action

**There is no circumstance under which a client avatar is created without:**
1. A written consent document signed before any footage is collected
2. Clear description of what the avatar will be used for
3. Explicit consent for commercial use and scale
4. Storage of the consent record in ICE's database

**Creating an avatar of a third party (anyone other than the client or PK) is never permitted.**

**Action required:**
- Draft avatar consent document before HeyGen integration is built
- Build consent workflow into client onboarding (consent form → signed → stored in c.client_ai_profile or dedicated consent table → avatar creation unlocked)
- Include in legal review
- **Deadline: Before HeyGen integration is built**
- **Owner: PK**

---

## L006 — Privacy Policy Currency
**Risk level:** Medium
**Status:** Monitoring

**Issue:** The Privacy Policy (docs/Invegent_Privacy_Policy.md) was last updated March 2026. It may not cover:
- YouTube Data API usage (added after the policy was written)
- HeyGen API usage (not yet integrated)
- Video analyser functionality and transcript processing
- The creator/entertainment tier if it launches

**Action required:**
- Update Privacy Policy when each new data-processing capability is added
- Specifically update when: YouTube channel ingest is built, HeyGen is integrated, video analyser is built
- Review and update annually at minimum
- **Deadline: Rolling — update with each major capability addition**
- **Owner: PK**

---

## L007 — AI Content Disclosure
**Risk level:** Low (monitoring)
**Status:** Monitoring

**Issue:** Multiple governments are moving toward mandatory disclosure requirements for AI-generated content. Australia does not currently have mandatory AI content labelling for social media. The EU AI Act (enforcement from August 2026) includes labelling requirements. YouTube has its own disclosure policy for AI-generated content in certain categories.

**Current position:**
- ICE's content is described as "AI-assisted, human-reviewed" in NDIS Yarns bio
- All drafts have internal metadata flagging AI generation
- No external disclosure is currently required in Australia for this content type

**Action required:**
- Monitor Australian government AI policy developments quarterly
- Build labelling infrastructure now (simple metadata flag on published posts) so compliance is a configuration change, not a rebuild, when requirements arrive
- **Deadline: Monitoring only — no immediate action required**
- **Owner: PK**

---

## L008 — Invegent Business Registration
**Risk level:** Low
**Status:** Closed

**Issue:** Operating as a sole trader without appropriate registration.

**Current status:**
- ABN registered: 39 769 957 807 ✅
- NSW sole trader registration appropriate for current scale ✅
- Business name "Invegent" registered ✅

**When to revisit:**
- At first external client: confirm sole trader liability exposure is acceptable
- At $50,000+/month revenue: consider Pty Ltd structure for liability protection and tax efficiency
- At any point involving employees or contractors: review employer obligations

**Action required:**
- None at current stage
- **Owner: PK**

---

## Legal Review Package

Before the first paying external client is signed, the following needs a formal legal review:

1. **Terms of Service** — covering NDIS liability limitation, AI content disclaimer, platform dependency disclaimers, cancellation terms, data handling
2. **Privacy Policy update** — covering all current and planned data processing
3. **IP ownership clause** — who owns the content ICE generates for clients?
4. **Avatar consent template** — for HeyGen video clients
5. **Platform ToS compliance** — confirmation that ICE's Meta API usage is within bounds for the managed service use case

**Estimated cost:** $2,000–5,000 AUD
**Recommended lawyer type:** IP and technology lawyer with digital media experience, preferably with health sector knowledge
**Timing:** Initiate this as soon as Meta Standard Access is confirmed
