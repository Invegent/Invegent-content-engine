# S3 Content-Prep — M2 ElevenLabs Voice Shortlist (CFW + Invegent) — PK pick-list

**Lane:** Content-prep (T1, docs-only, read-only research) · **Deliverable is VERSION-LESS** — no
register edit.
**Governing constraint:** PK watch ruling, `docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`
§1 — zero DB writes, zero downloads, zero schedule surface during the Phase-1 watch.
**No ElevenLabs API calls, no voice cloning, no config writes were made.** Voice-profile
characteristics below are drawn from ElevenLabs' documented premade voice library as known at this
session's knowledge cutoff — **the exact voice IDs and current library composition must be
reconfirmed live before any pick is finalized** (§5 names the mechanism already built for exactly
this).

---

## 0. Why this is a PK decision, not an engineering task

`c.client_voice_config` has governed read/write RPCs live for both CFW and Invegent already —
`get_voice_config`/`save_voice_config`, upsert-capable, fail-closed, audited
(`docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md:70-83`, applied and proven live,
`docs/briefs/results/cc-0086-brand-host-voice-config-result-v1.md`). Only
**property-pulse** and **ndis-yarns** currently have a row; **care-for-welfare-pty-ltd** and
**invegent** are voice-blind (`cc-0086-brand-host-voice-config-brief-v1.md:45-53`). The write itself
is a one-field dashboard edit. The actual blocker, confirmed by the delta audit, is a **content
decision**: *"Config addition is trivial; the blocker is PK sourcing/approving 2 ElevenLabs voice
IDs — a content decision, not an engineering one"*
(`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:543`). M2 is also gated on **M1**
(loudness measurement) for its *acceptance quality*, not its pick: *"a voice proof needs a real
loudness number, not presence-only"* (`:481`) — meaning the pick can happen now, but the formal
proof-of-done needs M1 landed first. This memo supports the pick only.

## 1. Selection criteria applied (per client, cited to the brand's own governing doc)

For each brand: **register** (does the voice's natural delivery match the brand's documented
written voice), **pace**, **gender-neutrality considerations** (is the brand voice tied to a named
real person, or free to choose), and **consistency across the brand's platform split** (one
`elevenlabs_voice_id` per client must work for every platform that brand publishes to — the schema
is client-keyed, not platform-keyed, `20260719180000_create_client_voice_config_v1.sql` per
`cc-0086-brand-host-voice-config-brief-v1.md:26-30`).

---

## 2. CFW (Care for Welfare) — care/welfare sector, empathetic-professional

### 2.1 Brand-voice ground truth (source: `docs/briefs/2026-04-24-cfw-brand-profile-and-platform-rules.md`)

- **Voice model: practice voice, not a named individual.** The therapist is never named; always
  referred to in the second person as "our therapist" (`:42,107,129`). **This is the single most
  important gender-neutrality fact**: the voice is free to be male, female, or neutral-leaning — it
  is not standing in for a specific real person's identity, unlike a PK-personal clone would be for
  Invegent.
- **`persona_type: voiceover_only`** (`:98`) — this is narration-only audio, no on-camera avatar
  identity to match visually.
- **Register split by platform, same underlying voice:** Facebook/Instagram = warm, practical,
  grounded in real sessions, no clinical jargon without explanation, aimed at parents/carers
  (`:61-65`); LinkedIn = more professional, evidence-informed, collaborative, practitioner-to-
  practitioner, **zero emoji** ("medical-adjacent content with emojis reads as unprofessional",
  `:125`). One voice_id must carry both registers — favour a calm, measured, warm-but-composed
  delivery over anything peppy/casual or flatly corporate.
- **`brand_voice_keywords`:** educational, informative, **compassionate**, empowering, plain-English,
  grounded-in-practice, session-specific, **non-institutional**, continuity-of-care (`:69-71`).
- **Compliance constraint (AHPRA National Law):** no testimonial-style delivery, no promotional
  cadence that could read as a clinical-outcome claim (`:87-88,111`) — favour a measured,
  informational delivery over a sales-read.
- Model/temperature already set low-variance (`claude-sonnet-4-6`, temp 0.7, `:93-95`) — the written
  voice is deliberately controlled, not exploratory; the spoken voice should match that restraint.

### 2.2 Candidate ElevenLabs voice profiles (documented premade-library archetypes)

| # | Candidate archetype | Documented character | Fit rationale |
|---|---|---|---|
| 1 | **Matilda**-type (US female, warm, narration-register) | Warm, measured, narration-friendly, not youthful/casual | Best single-voice bridge across the FB/IG "warm, grounded" register and the LinkedIn "professional, collaborative" register without sounding like two different brands. Strong match to `compassionate`/`non-institutional`/`plain-English` keywords. |
| 2 | **Sarah**-type (US female, calm, gentle-professional) | Calm, unhurried, gentle authority | Slightly more clinical-neutral than #1 — a defensible pick if PK wants the LinkedIn register to lead (practitioner-to-practitioner) with the FB/IG warmth read as a secondary shade of the same voice rather than the primary character. |
| 3 | **Daniel**-type (UK male, calm, measured authority) | Composed, unhurried, professional without being cold | Male alternative, if PK prefers not to default to a female voice for a "practice" identity. Reads well for the LinkedIn evidence-informed register; slightly more restrained for the FB/IG warm register than #1/#2 — worth a direct A/B listen if this option is shortlisted. |

**Not recommended:** anything documented as youthful/bright/high-energy (mismatches
`non-institutional`/AHPRA restraint) or anything documented as deep/authoritative-newsreader
(mismatches the "practice voice speaking plainly to a worried parent" register).

**Primary recommendation: #1**, on the basis that it is the only option that does not require
compromising either platform register to serve the other.

---

## 3. Invegent — B2B builder-in-public / consulting

### 3.1 Brand-voice ground truth (source: `docs/briefs/2026-04-24-invegent-brand-profile-v0.1.md`)

- **Voice model: first-person PK, by default** ("I'm building...", "I noticed...", `:43`) —
  builder-in-public register, peer-level, honest including mistakes, explicitly **not salesy**
  (`:44-47`). This is materially different from CFW: the written voice is tied to a real person
  (PK), even though delivery may be avatar-assisted.
- **`persona_type: hybrid_operator_and_avatar`** (`:126-127`) — the profile explicitly anticipates
  **both** PK's own recorded voice for some videos **and** avatar-delivered content (HeyGen) for
  others; avatar/voice-clone configuration is explicitly deferred and not done
  (`:50-57,149`).
- **This raises a selection-criteria fork the memo surfaces rather than resolves for PK:**
  - **(a) A stock/library ElevenLabs voice** for narrator-style Stream-A content (industry-signal
    commentary not in PK's own words) — gender/accent is a free brand choice here, same as CFW.
  - **(b) A voice deliberately chosen to *represent* PK** for Stream-B builder-notebook content
    (what PK actually built/learned) — here accent/register consistency with PK's real voice
    (Australian, CPA/professional register) becomes a first-order criterion, not a nice-to-have,
    because the written voice is explicitly first-person-PK.
  - A **future, separate decision** (not in scope for this memo or for `c.client_voice_config`,
    which only stores one `elevenlabs_voice_id`) is whether Invegent ever needs a professional
    voice-clone of PK himself rather than any stock voice — that is an ElevenLabs voice-cloning
    workflow, explicitly out of this memo's no-cloning constraint.
- **Platforms: LinkedIn primary (200–500 words, zero emoji, "professional audience... reads as
  hype", `:136`), YouTube secondary** (narration **60–150 words**, title 5–12 words, `:137`) — the
  YouTube narration-length ceiling is the more voice-relevant constraint (this is spoken content).
- **`brand_voice_keywords`:** builder-in-public, first-person-authentic, honest-including-mistakes,
  peer-level-not-teacher, craft-over-hype, regulated-industry-grounded, signal-centric,
  professional-discipline (`:95`). **Never use growth-hack/engagement-bait delivery** (`:108`).
- Slightly higher temperature than CFW (0.75 vs 0.7, `:119`) — "more voice variation is appropriate
  for PK first-person" — the spoken voice can afford a little more natural variation/conversational
  colour than CFW's more restrained register.

### 3.2 Candidate ElevenLabs voice profiles (documented premade-library archetypes)

| # | Candidate archetype | Documented character | Fit rationale |
|---|---|---|---|
| 1 | **Charlie**-type (Australian-accented male, casual-professional) | Conversational, grounded, not corporate-polished | Best accent-consistency match if PK wants the stock voice to read as plausibly-PK (Australian, CPA/property/NDIS-operator context) for Stream-B builder-notebook content — directly serves the "peer-level, not teacher" and "honest including mistakes" keywords better than a generic US narrator voice would. |
| 2 | **Antoni**-type (US male, well-rounded, conversational) | Even, confident, not overly formal | Safer default if PK wants a clearly-distinct "narrator" voice for Stream-A signal-commentary content, deliberately NOT reading as PK's own voice (avoids implying first-person PK when the content is aggregated industry signal, not a personal builder-note). |
| 3 | **Adam**-type (US male, deep, documentary/narration register) | Measured, authoritative-but-not-salesy | Alternative for longer-form YouTube explainer narration specifically — the profile's own YouTube narration ceiling (60–150 words) rewards a voice that carries authority without needing pace/energy to hold attention; less ideal for shorter LinkedIn-native video. |

**Not recommended:** anything documented as high-energy/hype-adjacent or "influencer" in character
— directly conflicts with `brand_never_do` item 8 ("never use growth-hack engagement tactics... no
hook-grids", `2026-04-24-invegent-brand-profile-v0.1.md:108`).

**Primary recommendation:** PK resolves the (a)/(b) fork first (§3.1) — if the answer is "one voice
for now, refine later," **#1 (Charlie-type)** is the safer single pick because it is consistent with
*either* reading (works as a plausible PK-adjacent voice for Stream B, and is not so
generic-American-narrator that it undercuts the brand's Australian-operator grounding for Stream A).

---

## 4. Selection criteria summary (for PK's pick-list)

| Criterion | CFW | Invegent |
|---|---|---|
| Register | Warm→professional bridge (practice voice) | Peer-level, honest, non-hype (builder voice) |
| Pace | Measured, unhurried, composed | Conversational, slightly more natural variation OK |
| Gender-neutrality | Free choice — voice is not a named person | Constrained by the first-person-PK convention; free only for the "stock narrator, not PK" reading |
| Platform-consistency | Must carry both FB/IG warmth and LinkedIn zero-emoji professionalism in one voice | Must carry LinkedIn professional register and YouTube narration-length register in one voice |
| Written-voice source | `docs/briefs/2026-04-24-cfw-brand-profile-and-platform-rules.md` | `docs/briefs/2026-04-24-invegent-brand-profile-v0.1.md` |

## 5. Post-pick confirmation step (named, not performed here)

Before any `save_voice_config` write: audition the shortlisted candidate(s) with the **already-built
and deployed** `voice-preview` edge function (`supabase/functions/voice-preview/index.ts`, deployed
`verify_jwt=true`, 21/21 hermetic tests, per `docs/briefs/results/cc-0086-brand-host-voice-config-result-v1.md:22-23,48-49`)
— it accepts an operator-supplied `elevenlabs_voice_id` + a fixed sample sentence, calls the real
ElevenLabs TTS endpoint, and returns transient audio that **persists nothing**
(`cc-0086-brand-host-voice-config-brief-v1.md:84-91`). This is the correct, already-governed
mechanism to (a) reconfirm the exact voice IDs behind the archetypes named above still exist in the
current ElevenLabs library, and (b) let PK actually hear the candidate against CFW/Invegent's real
platform copy before committing a `client_id`'s config. This memo does not invoke it.

## 6. What this memo is NOT proposing

No ElevenLabs API call made. No voice cloned. No `c.client_voice_config` row written or previewed.
No register edit. This is a research/pick-list deliverable only.

## 7. Open questions for PK

1. CFW: confirm or reject the primary recommendation (Matilda-type), or shortlist a different
   archetype for a `voice-preview` audition.
2. Invegent: resolve the (a) stock-narrator vs (b) PK-representative fork (§3.1) before finalizing a
   pick — this changes which candidate is "correct," not just which is preferred.
3. Authorize a `voice-preview` audition pass on the shortlisted candidates (read-only, non-persisting,
   already governed) as the next concrete step once the watch window allows it.

## 8. Sources

`docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md` ·
`docs/briefs/results/cc-0086-brand-host-voice-config-result-v1.md` ·
`supabase/migrations/20260719180000_create_client_voice_config_v1.sql` (cited via the brief) ·
`docs/briefs/2026-04-24-cfw-brand-profile-and-platform-rules.md` ·
`docs/briefs/2026-04-24-invegent-brand-profile-v0.1.md` ·
`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` ·
`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`.

**Caveat carried forward per the task's own instruction:** ElevenLabs voice-library composition and
exact `voice_id` values are not something this read-only, no-network-call lane can verify; the
archetype names above reflect documented, long-standing ElevenLabs premade voices as of this
session's knowledge — §5's `voice-preview` audition is the named live-confirmation step before any
pick is finalized.
