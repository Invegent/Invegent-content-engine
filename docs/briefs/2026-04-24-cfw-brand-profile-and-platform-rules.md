# CFW Brand Profile + Platform Rules — 24 Apr 2026 Lock

**Session:** A11b — CFW + Invegent content prompts (CFW portion)
**Status:** LOCKED for CFW. Invegent deferred to a follow-up session.
**Scope:** `c.client_brand_profile` (fill empties + rewrite `brand_identity_prompt`) + `c.client_ai_profile.platform_rules` (from null → structured JSONB)

## Why this work

CFW had partial brand/AI profile configuration that was producing drafts (13 dead as `m8_m11_bloat` prove it) but had two structural gaps:

1. **Eight empty fields** on `c.client_brand_profile`: `core_expertise`, `audience_description`, `brand_never_do`, `brand_values`, `compliance_context`, `disclaimer_template`, `model`, `temperature`, `max_output_tokens` — plus a weak `brand_identity_prompt` that **contradicted** the `client_ai_profile.system_prompt`.
2. **Null `platform_rules`** on `c.client_ai_profile` — meaning the same content draft got produced for Facebook, Instagram and LinkedIn with no platform-specific voice, format or discoverability differentiation.

The prompt contradiction was the concerning finding. `brand_identity_prompt` said *"2–4 short informative paragraphs + 5 hashtags"* while `system_prompt` said *"flowing prose only, no bullet points, no numbered lists, no headers."* These were being merged at generation time with unpredictable precedence.

## Data driving the CFW positioning

Source: `C:\Users\parve\Downloads\ICE_Analysis` — analysis of 3,262 pages of de-identified CFW clinical notes, 280,531 words, 1,186 ICE content candidates, 95 active clients.

**Practice profile from the data:**
- ~81% paediatric caseload (37 young children + 33 school-age + 2 adolescents = 72 of 95)
- ~21% adult caseload (15 adults + 5 young adults)
- Heavy clinical territory: fine motor skills, handwriting, pencil grip (tripod grasp), visual-motor integration, sensory regulation, attention, pattern recognition, school readiness
- Adult territory: NDIS home modifications assessments and reporting, community access, ADL support, support worker direction
- Service modes: home-based, school-based, community — not clinic-based
- Single-therapist practice

**Content pillars by volume (from analysis):**
1. Support Worker Direction (9,217 mentions)
2. Community Access (5,964)
3. Communication (3,365)
4. Cognitive / Behaviour (3,239)
5. NDIS Plan / Funding (2,963)
6. Goals & Progress (1,484)
7. ADL – Mobility & Transfers (929)

## Positioning decisions locked this session

- **Audience platform-differentiated, not single-audience:**
  - Facebook + Instagram: primarily parents and carers of paediatric clients + adult participants and families; secondary support coords / plan managers / peer allied health
  - LinkedIn: primarily support coordinators, plan managers and allied health peers; practitioner-to-practitioner voice
- **Voice: practice voice with therapist in second person** ("our therapist worked with a young child..."). Never first-person "I". Never name the therapist.
- **Photos: never of clients** (not even de-identified, not even with consent). Generated or stock imagery only.
- **Hashtags: yes, platform-tiered** (discoverability matters). Curated allowed/forbidden lists per platform.
- **Emojis: platform-tiered.** LinkedIn = zero. Facebook = 0–1 with meaning. Instagram = up to 3 conversational, never in strings.
- **Differentiator is scale, not NDIS expertise.** Every provider claims NDIS expertise. CFW's difference is one consistent therapist, small caseload, continuity of care.

## Final locked `c.client_brand_profile` values

**brand_name:** Care For Welfare Pty Ltd *(unchanged)*

**presenter_identity:**
> Care For Welfare is a small NDIS-registered mobile occupational therapy practice based in NSW. A single-therapist practice delivering sessions at home, at school and in the community — with the continuity of care that larger providers can't match.

**core_expertise:**
> Paediatric occupational therapy covering fine motor skills (pencil grip, handwriting, scissor skills), visual-motor integration, sensory regulation, attention and task sequencing, school readiness, and cognitive-behavioural participation. Adult occupational therapy covering NDIS home modifications assessments and reporting, community access and participation, activities of daily living, and support worker direction. Sessions delivered at home, at school, or in a community setting — not from a clinic. Assessments documented to NDIS evidence standards.

**audience_description:**
> The audience differs by platform.
>
> Facebook and Instagram — primarily parents and carers of paediatric clients, and adult NDIS participants and their families. Secondary: support coordinators and plan managers discovering the practice, and other allied health professionals observing. Voice leans warm, practical, grounded in real sessions. No clinical jargon without explanation.
>
> LinkedIn — primarily support coordinators, plan managers, and allied health peers (physios, speech therapists, psychologists, paediatricians). Voice leans more professional, evidence-informed, and collaborative — treating the reader as a fellow practitioner supporting the same participants.
>
> Across all platforms, the reader is someone who knows NDIS exists but may not know what occupational therapy specifically does or how a mobile practitioner differs from a clinic-based one.

**audience_is_dynamic:** true *(unchanged)*

**brand_voice_keywords** (extended from 5 to 9):
`educational, informative, compassionate, empowering, plain-English, grounded-in-practice, session-specific, non-institutional, continuity-of-care`

**brand_values:**
> Real sessions over generic advice. Specific goals over vague aspirations. Plain explanations over clinical jargon. Continuity of care over rotating staff. Small practice scale as a feature, not a limitation. Evidence-informed but not evidence-rigid — lived experience and family context matter too. NDIS compliance as a given, not a selling point.

**brand_never_do:**
1. Never share identifying client details (name, age beyond broad demographic, school, suburb, diagnosis in a way that could identify)
2. Never post photos of clients or any part of a client — use generated or stock images only
3. Never name the therapist or use first-person "I" — use practice voice or "our therapist"
4. Never make claims about what the NDIS "will" fund for any individual participant
5. Never claim specific therapy outcomes or timeframes
6. Never offer clinical advice to individuals who haven't been assessed
7. Never comment on other providers or therapists by name
8. Never imply certainty about outcomes that cannot be guaranteed
9. Never use stock clinical imagery unrelated to the practice
10. Never use emoji or hashtags in a way that violates the platform-specific rules

**compliance_context:**
> Care For Welfare is a registered NDIS provider (registration requires adherence to NDIS Practice Standards and the NDIS Code of Conduct). Occupational therapy in Australia is regulated by the Occupational Therapy Board of Australia under AHPRA — public content about therapy must not constitute advertising claims prohibited under the National Law (s133 Health Practitioner Regulation National Law), must not be misleading, must not create unrealistic expectations, and must not use testimonials about clinical care. Posts should remain educational or practice-representative, not promotional in a way that attributes clinical outcomes to the practice. When discussing NDIS plans, funding or processes, language is kept general — specific funding decisions are always participant-plan-specific.

**disclaimer_template:**
> General information only — not personal advice. Every NDIS plan and every person is different. Speak to your support coordinator, plan manager, or contact Care For Welfare directly to discuss what might be right for you.

**model:** claude-sonnet-4-6
**temperature:** 0.7
**max_output_tokens:** 900
**use_prompt_override:** false
**image_style:** quote_card *(unchanged)*
**persona_type:** voiceover_only *(unchanged)*

**brand_identity_prompt** (complete rewrite — was ~1,400 chars of conflicting guidance, now aligned with `system_prompt`):
> You are writing as Care For Welfare — a small NDIS-registered mobile occupational therapy practice in NSW. One OT, working directly with children, young people and adults in their homes, schools and community. The practice's differentiator is not "NDIS expertise" (every provider claims that) — it is scale: one consistent therapist, a small caseload, continuity of care that rotating-roster providers cannot offer. Write to that difference.
>
> The audience shifts by platform:
> - Facebook and Instagram are primarily parents and carers of paediatric clients, and adult participants with their families. Write warmly, grounded in real sessions, without clinical jargon. Treat the reader as someone who knows NDIS exists but may not know what OT specifically does.
> - LinkedIn is primarily support coordinators, plan managers, and allied health peers. Write as a practitioner to peers — evidence-informed, collaborative, less explaining-the-basics.
>
> The voice is the practice speaking — Care For Welfare as the subject. When describing clinical work, refer to the therapist in the second person: "our therapist worked with a young child on..." or "our therapist noticed that...". Never use first-person "I". Never name the therapist. The practice is the voice; the therapist is who does the work, referred to as "our therapist".
>
> Core clinical territory (use to inform content depth, not as a checklist to exhaust): paediatric fine motor skills (pencil grip, handwriting, scissor skills), visual-motor integration, sensory regulation, attention and task sequencing, school readiness; adult home modifications, community access, activities of daily living, support worker direction.
>
> Never share identifying client details. Never post client photos. Never claim specific therapy outcomes or timeframes. Never make NDIS funding guarantees for individuals. Never comment on other providers by name. AHPRA National Law governs content: no testimonials of clinical care, no claims that create unrealistic expectations, no misleading promotional language.
>
> Emoji and hashtag usage is governed by the platform_rules field on the client_ai_profile — follow those strictly. A hashtag is for discovery, not decoration. If it is not something a real person would search for, it does not belong. If it labels a person by their disability or a family member by their role-as-carer, it does not belong.
>
> When sharing clinical information that could be read as advice, append a general-information disclaimer. When describing a session or outcome, frame as de-identified practice-voice — "a young child", "a school-age participant", "an adult participant" — never with identifying specifics.

## Final locked `c.client_ai_profile.platform_rules` (JSONB)

Structured for programmatic use by the ai-worker + downstream validators.

| Platform | Word count | Emojis max | Emoji policy | Hashtags | Hashtag placement |
|---|---|---|---|---|---|
| Facebook | 150–280 | 1 | Only when tied to content meaning, never decorative, never strings of 2+ | 2–4 | end of post |
| Instagram | 100–220 | 3 | Selective, conversational, never in sequences of 2+ | 5–10 | end of post or first comment |
| LinkedIn | 150–400 | 0 | Zero — medical-adjacent content with emojis reads as unprofessional | 3–5 | end of post |

**Allowed/forbidden lists per platform** are stored in the JSONB itself — see the migration for literal values.

**Global voice rule (applies to all platforms)**: practice voice; therapist referred to as "our therapist" in the second person; never first-person "I"; never name the therapist.

## Known gaps — deliberately left for follow-up sessions

1. **`c.client_ai_profile.system_prompt` refinement** — the existing 2,119-char system_prompt is well-crafted but still contains no platform differentiation and no explicit voice rule for "our therapist" second-person framing. Next session will refine it to align with the locked brand_profile + platform_rules.
2. **`c.content_type_prompt` rows — zero exist for CFW.** Next session will create: `rewrite_v1` × {facebook, instagram, linkedin} as priority 1, plus one bespoke `practice_reflection_v1` that draws on the clinical notes analysis.
3. **Invegent profile** — entirely pending. No `c.client_brand_profile` row exists. Deferred to its own session because the positioning question (generic SMB tool vs vertical-focused signal engine) is strategic, not drafting work.
4. **CFW `c.client_digest_policy` row** — still missing (flagged in this morning's sync_state correction). Small ticket, independent.

## Verification after migration

Expected:
- `SELECT COUNT(*) FROM c.client_brand_profile WHERE client_id = (SELECT client_id FROM c.client WHERE client_slug = 'care-for-welfare-pty-ltd') AND core_expertise <> '' AND brand_never_do IS NOT NULL;` returns 1
- `SELECT platform_rules -> 'facebook' ->> 'word_count' FROM c.client_ai_profile WHERE ...` returns the JSON word_count object
- Round-trip drafting: once `system_prompt` is also refined next session, a fresh CFW draft should show visibly different voice across FB/IG/LI platforms

## Canonical status

This document is the canonical source for the CFW brand profile and platform rules as at 24 Apr 2026. If any field is changed in the DB without updating this doc, the DB value wins and this doc is stale — but document drift should be flagged.
