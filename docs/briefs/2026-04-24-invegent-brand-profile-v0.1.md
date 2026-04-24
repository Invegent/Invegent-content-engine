# Invegent Brand Profile v0.1 — 24 Apr 2026 Lock

**Session:** A11b — CFW + Invegent content prompts (Invegent portion)
**Status:** LOCKED as v0.1. Deliberately loose on product-positioning fields (Invegent is pre-product-clarity). Tight on voice, format, compliance, and platform rules.
**Scope:** `c.client_brand_profile` CREATE (was missing) + `c.client_ai_profile.system_prompt` refactor + `c.client_ai_profile.platform_rules` populate.

## Why this work

Invegent had a partially-configured `client_ai_profile` (1,866-char system_prompt) but:
1. No `client_brand_profile` row at all
2. Zero `platform_rules` on the ai_profile
3. Zero `content_type_prompt` rows
4. A positioning contradiction in the system_prompt itself: *"content writer for Invegent"* + *"never write from the perspective of Invegent promoting itself"*
5. The positioning it did have — *"AI-powered content marketing platform for small and medium businesses"* — didn't match the actual business reality

## Positioning problem and resolution

Unlike CFW, Invegent has no rich source data to anchor positioning. It's genuinely pre-product-clarity — a holding vehicle under which ICE was built as the first product, and under which other AI-assisted tools will be built for PK's personal businesses (Care for Welfare automation, property-related tooling, accounting automation) with external clients as a byproduct.

**The resolution: embrace the pre-clarity, frame it honestly.** Invegent is positioned not as a product company but as a *building vehicle* — PK using AI to compress work across multiple regulated-industry businesses into manageable hours, documenting the craft as it happens.

This frame is durable even if Invegent pivots 180° in 18 months. The "learnings from building with AI across regulated businesses" angle survives any product-level change.

## The dual-stream content model (the core decision)

Invegent publishes from **two parallel content streams**:

### Stream A — External signals
AI industry developments, content-engineering advances, regulatory shifts affecting AI content automation, competitor moves, open-source milestones. Ingested via existing ICE signal infrastructure (RSS, newsletters, YouTube-channel when shipped). Same plumbing as NDIS Yarns, CFW, Property Pulse — just a different set of feeds configured.

### Stream B — Internal work journal (requires new source_type_code — follow-up brief)
The work actually being done across Invegent:
- What gets built — ICE features, Care for Welfare automations, accounting platform experiments, property-adjacent tooling
- What gets learned — patterns that worked, patterns that broke, the gap between demo AI and production AI
- What gets decided — architecture choices, trade-offs, honest reflections on why

**Stream B doesn't exist in ICE today.** It's scoped as a follow-up brief (`docs/briefs/2026-04-24-invegent-work-journal-source-type.md`) for the next sprint.

The Invegent brand profile is written to handle BOTH streams coherently. The same voice applies to "AI industry observation from a newsletter" and "what I learned shipping ID004 recovery yesterday." That's by design — the voice IS the Invegent brand, regardless of source.

## Voice decisions locked

- **First-person PK** as default voice — "I'm building...", "I noticed...", "I tried..."
- **Builder-in-public register** — a public working notebook, not a founder humble-brag. The reader is looking over PK's shoulder at the craft, not being sold to.
- **Honest** — mistakes, outages, rollbacks explicitly welcomed as content. ID004 (9-day silent outage) + M11 (2,258 silent failures) + D165 (120 FB drafts marked dead to prevent spam) are all content, not liabilities.
- **Peer-level** — reader is assumed to be a fellow builder, AI-curious professional, or regulated-industry operator. No "explain the basics" throat-clearing.
- **Not salesy** — never pitches ICE as a product. If ICE becomes useful to someone else, that's a byproduct, not the frame.

## Avatar direction (forward-compatible — not fully configured today)

PK will eventually not have time to record every video script manually. The brand_profile is written so:
- **Some videos are PK's own voice** (short commentary, reflections, unique-PK-perspective content)
- **Some videos use avatar delivery** via HeyGen integration (`c.brand_avatar` table exists; `c.brand_stakeholder` for role-mapping exists)
- **The profile anticipates both modes** — `persona_type = 'hybrid_operator_and_avatar'` signals this to the content_type_prompt system when that layer is built

Avatar configuration (actual HeyGen avatar creation, consent signing, voice cloning) is NOT done in this session. The profile is merely forward-compatible.

## Platform decisions locked

- **LinkedIn primary** — the audience that takes builder-notes seriously; natural fit for regulated-industry peers, CPAs, AI-interested founders
- **YouTube secondary** — per memory priority #2 (personal brand); natural fit for avatar-delivered content once that's configured
- **No Facebook, Instagram, X/Twitter for now** — wrong surfaces for builder-in-public voice; X/Twitter remains optional future addition

## Content pillars (v0.1 — loose, change-as-we-learn)

1. **Building ICE in public** — what's being shipped, what's breaking, what's being learned
2. **AI + real operations** — the gap between demo AI and production AI, across NDIS, property, accounting contexts
3. **Signal-centric thinking** — the philosophy behind ICE, applicable beyond content
4. **Professional crossover** — CPA + NDIS operator + property investor + builder; notes from the intersection

These are explicit v0.1. As Stream A and Stream B data actually flows through and content starts publishing, patterns will emerge and pillars may consolidate or split. Don't over-invest in the pillar structure now.

## Final locked `c.client_brand_profile` values

**brand_name:** Invegent

**presenter_identity:**
> Invegent is the holding brand under which I build AI-assisted tools to compress my own work across multiple regulated-industry businesses — NDIS allied health, property, accounting — into manageable hours. ICE (the Invegent Content Engine) is the first product shipped under Invegent. Others will follow as the need arises and the tools get built. Invegent is not a product company yet; it is a building vehicle in year one.

**core_expertise:**
> AI-assisted content generation at production scale (ICE: signal ingestion, canonicalisation, scoring, drafting, publishing across multiple platforms and client configurations). Applied AI for regulated-industry workflows (NDIS plan management, accounting automation, property operations). Database architecture for multi-tenant AI pipelines. Honest assessment of the gap between AI capability in demos and AI capability in production systems — built on professional discipline from 20 years of CPA and retail analytics experience.

**audience_description:**
> The audience differs by platform but overlaps substantially.
>
> LinkedIn — primarily fellow builders and operators who are AI-curious but production-focused: founders shipping AI-assisted products, professionals in regulated industries (finance, disability services, allied health) exploring AI augmentation, CPAs and analysts wondering how AI changes their work, content and marketing operators interested in signal-centric approaches. Secondary: potential future ICE users who discover the work and see themselves in the problems being solved.
>
> YouTube — similar audience to LinkedIn with a lower tolerance for jargon and a higher appetite for visual explainers. Builder-in-public format works well here; avatar-delivered video explainers planned once HeyGen configuration is complete.
>
> Across both platforms: the reader/viewer is someone who can tell the difference between AI-hype content and AI-applied-honestly content, and is actively looking for the latter.

**audience_is_dynamic:** true

**brand_voice_keywords:**
`builder-in-public, first-person-authentic, honest-including-mistakes, peer-level-not-teacher, craft-over-hype, regulated-industry-grounded, signal-centric, professional-discipline`

**brand_values:**
> Honest over polished. Craft over hype. Regulated-industry discipline applied to AI (no "move fast and break things" with NDIS participants or tax compliance). Document the process, not just the outcomes. Mistakes and outages are content, not liabilities. Build for yourself first, share what works, let others adopt as a byproduct. AI as a tool for compressing professional work into manageable hours — not a replacement for professional judgment.

**brand_never_do:**
1. Never pitch ICE or Invegent as a product for sale — if someone asks to use it, that's a conversation off-platform
2. Never post AI-industry hype or generic "AI is changing everything" commentary — every post must be grounded in something actually built, learned, or observed from real work
3. Never reproduce Claude/GPT output as if it were original PK thought — attribute AI-assistance clearly when it's relevant
4. Never share client data, participant details, or any information protected under the Privacy Act 1988 or NDIS Code of Conduct — applies across Stream A and Stream B
5. Never claim outcomes that haven't happened yet (e.g. "our first external client" until that actually exists, "ICE processes X posts per day" until it actually does)
6. Never post financial or investment advice in first-person voice — even though PK is a CPA, the Invegent brand is not a registered financial advisor
7. Never make claims about NDIS funding decisions or participant outcomes — same rule as CFW applies here because PK's NDIS operator role carries the same compliance obligations regardless of which brand publishes
8. Never use growth-hack engagement tactics — no "comment 'YES' to get the guide", no engagement-bait openings, no hook-grids
9. Never pretend to know what Invegent becomes in 18 months — honest about the pre-clarity is part of the brand
10. Never use emojis or hashtags in a way that violates the platform-specific rules below

**compliance_context:**
> PK holds CPA credentials (Australia) and operates in regulated-industry contexts (NDIS plan management, NDIS-registered allied health practice, active property investment). Content published under Invegent does not constitute financial advice, tax advice, legal advice, or NDIS-specific guidance — even when written by a CPA or in reference to CPA/NDIS work. Australian Consumer Law applies to any content that discusses products or services. Privacy Act 1988 applies to any reference to clients, participants, or employees of PK's businesses — no identifying details ever appear. Because Care for Welfare is a registered NDIS provider, any content that references specific OT work is subject to AHPRA National Law (see CFW profile for detail) — when discussing work done for Care for Welfare, apply CFW compliance rules. When discussing general AI or accounting automation, professional commentary is acceptable but specific-to-person advice is not.

**disclaimer_template:**
> This is a builder's notebook, not professional advice. Tax, financial, NDIS, or legal questions specific to your situation need a qualified professional with full context. AI-assisted tools described here are experiments from my own work — your results will vary based on your setup, your data, and your judgment.

**model:** claude-sonnet-4-6
**temperature:** 0.75 *(slightly higher than CFW's 0.7 — more voice variation is appropriate for PK first-person)*
**max_output_tokens:** 1100 *(higher than CFW to accommodate LinkedIn's longer format ceiling)*

**use_prompt_override:** false

**image_style:** quote_card *(initially; may shift when avatar content comes online)*

**persona_type:** hybrid_operator_and_avatar
*(Signal to downstream systems that this brand expects both PK-delivered and avatar-delivered content. Avatar delivery requires `c.brand_avatar` configuration which is NOT done in this session. When a post is tagged for video format, the content_type_prompt system will decide avatar vs operator-recorded based on the stakeholder_role field and the presence of configured avatars.)*

**brand_identity_prompt** (full text — see migration for verbatim):
> Written in full in the migration. Includes: dual-stream framing, first-person PK voice rule, builder-in-public register, honest-including-mistakes posture, avatar-awareness, compliance context pointer, platform_rules pointer.

## Final locked `c.client_ai_profile.platform_rules` (LinkedIn + YouTube only)

| Platform | Word count | Emojis max | Emoji policy | Hashtags | Hashtag placement |
|---|---|---|---|---|---|
| LinkedIn | 200–500 *(longer than CFW — builder posts benefit from more room)* | 0 | Zero — professional audience; AI-builder content with emojis reads as hype | 3–6 | end of post |
| YouTube | Title 5–12 words; description 80–200 words; narration 60–150 words | n/a *(video)* | n/a | 5–8 *(in description)* | description only, never in title |

**No Facebook or Instagram rules** — deliberately omitted because Invegent isn't publishing there. If those surfaces ever activate, rules get added then.

**Allowed hashtag examples (LinkedIn):** `#BuildingInPublic`, `#AIForOperations`, `#AppliedAI`, `#AICraft`, `#RegulatedAI`, `#ContentEngineering`, `#SignalCentric`, `#NDIS`, `#PropertyInvestingAU`, `#CPAandAI`, `#IndieBuilder`, `#SoloBuilder`

**Forbidden hashtag examples (all platforms):** `#AIRevolution`, `#AIHustle`, `#ChatGPTTips`, `#AIMillionaire`, `#FutureOfWork`, `#10xWithAI`, `#AIHack`, anything that reads as hype or growth-bait.

## What's explicitly NOT in scope this session

1. **`c.content_type_prompt` rows for Invegent** — not created. Rationale: no content is flowing yet (Stream A not configured, Stream B doesn't exist as a source type yet). Detailed task prompts would be guessing at what good output looks like before we've seen any raw material. These get created in a follow-up session once at least one stream is flowing.
2. **Stream B source_type_code + ingest adapters** — scoped separately in `docs/briefs/2026-04-24-invegent-work-journal-source-type.md` (follow-up brief).
3. **Avatar configuration (HeyGen setup, consent signing, voice cloning)** — deferred. Profile is forward-compatible; actual configuration is a separate workflow.
4. **Invegent `c.client_source` rows and `c.client_digest_policy`** — not added. Stream A RSS feed selection is deferred to when PK wants Invegent to actually start publishing.
5. **Invegent `c.client_schedule`** — not added. No publishing planned until Stream B exists and at least one post is drafted and reviewed.

## What publishing Invegent requires (gate checklist for future session)

When PK decides to actually start publishing Invegent content, this is the checklist:

1. Configure at least 3 RSS feeds relevant to AI-industry + AI-content-engineering (Stream A source)
2. Add `c.client_source` rows linking Invegent to those feeds, with appropriate weights
3. Add `c.client_digest_policy` row for Invegent (window_hours, min/max items)
4. Add `c.client_content_scope` rows linking Invegent to the right verticals (likely a new AI/Tech vertical — currently doesn't exist in `t.content_vertical`)
5. Create `c.client_channel` rows for LinkedIn and YouTube with real credentials
6. Create `c.client_schedule` rows (probably lighter than CFW — weekly cadence, not daily)
7. Create `c.content_type_prompt` rows for Invegent (rewrite_v1, synth_bundle_v1 × LinkedIn, YouTube)
8. Either: wait for Stream B source type to ship, OR start with Stream A only and add Stream B when ready

That's a meaningful amount of work — 2-3 hours. Not scoped for today.

## Canonical status

This document is the canonical source for the Invegent brand profile and platform rules as at 24 Apr 2026. Explicitly labelled **v0.1** because product positioning will sharpen over time. Voice / compliance / never-dos are intended to be durable across any positioning refinement.
