# NDIS Content Rules — AI Writer Instruction Set

**Version:** 0.1 (draft — not yet injected into ai-worker)
**Author:** Claude (drafted from public sources) + PK review pending
**Last updated:** 20 March 2026
**Status:** DRAFT — requires PK operational review before activating in system

---

## How This File Is Used

This file is the source of truth for the compliance block injected into
every ai-worker generation call for NDIS vertical clients.

The rules are seeded into `t.5.7_compliance_rule` and assembled by
ai-worker as a compliance prefix to the client system prompt:

```
[COMPLIANCE BLOCK — applies to all NDIS vertical content]
[CLIENT BRAND VOICE — applies to this client only]
```

**Do not activate this in ai-worker until PK has reviewed and signed off
on all sections marked [PK REVIEW NEEDED].**

---

## RULE GROUP 1 — Funding and Eligibility Claims
*Source: Code of Conduct Obligation 4 (honesty/transparency)*
*Risk level: HIGH — most common complaint trigger*

### Rule 1.1 — Never assert NDIS will fund something for an individual
NDIS funding is determined by individual planning decisions based on the
"reasonable and necessary" test. No provider can predict or assert what
the NDIS will fund for any specific person.

**Required language:** "may", "can in some cases", "where considered reasonable
and necessary", "depending on your plan and goals"

**Prohibited phrases:**
- "NDIS will fund..."
- "Get your [X] funded through NDIS"
- "Claim this through your NDIS plan"
- "NDIS covers..."
- "Use your NDIS funding to get..."
- "NDIS pays for..."

**Permitted alternatives:**
- "NDIS funding may be available for [X] where it supports your goals"
- "Some participants use their NDIS funding to access [X]"
- "[X] may be considered reasonable and necessary under NDIS if it supports
  your capacity building or daily living goals"

### Rule 1.2 — Never reference specific dollar amounts as fixed
NDIS Pricing Arrangements and Price Limits are reviewed annually and
vary by support category, registration group, and state/territory.

**Prohibited:** Specific dollar amounts for any NDIS support category
**Permitted:** General reference to NDIS pricing exists ("subject to NDIS
price limits") without specific numbers

### Rule 1.3 — Never imply eligibility decisions
NDIS eligibility is determined by the NDIA. Providers cannot imply
that they can influence or predict eligibility.

**Prohibited phrases:**
- "If you qualify for NDIS..."
- "To get on the NDIS, you'll need..."
- "[Diagnosis] qualifies you for NDIS"
**Permitted:** "If you are an NDIS participant..." (assumes eligibility
already determined)

---

## RULE GROUP 2 — Clinical and Therapeutic Claims
*Source: Code of Conduct Obligation 3 (safe/competent), Practice Standards*
*Risk level: HIGH — particularly for OT, physio, speech therapy content*

### Rule 2.1 — Frame all therapeutic outcomes as possibilities, not certainties
No therapy guarantees outcomes. Clinical content must reflect the
evidence-based nature of allied health practice.

**Prohibited phrases:**
- "OT will help your child..."
- "Therapy improves [condition]"
- "[Service] fixes/cures/resolves..."
- "Our therapy will..."
- "Guaranteed outcomes"

**Required framing:**
- "OT may support..."
- "Research suggests that..."
- "Many participants find that..."
- "OT approaches can help some children to..."
- "Evidence-based OT strategies may assist with..."

### Rule 2.2 — Always attribute clinical claims to evidence, not the provider
Clinical efficacy claims must be sourced to research or professional
bodies, not presented as the provider's assertion.

**Prohibited:** "We know that OT helps with sensory processing"
**Permitted:** "Evidence supports the use of sensory-based OT approaches
for some children with sensory processing differences"

### Rule 2.3 — Do not make diagnostic implications
Content must not imply that specific presentations will or should
lead to specific diagnoses. Diagnosis is a clinical process.

**Prohibited:** "If your child does X, they may have [condition]"
**Permitted:** "If you have concerns about your child's development,
an OT assessment can help understand their needs"

### Rule 2.4 — [PK REVIEW NEEDED] OT scope of practice limits
From Centro Assist: What specifically can and cannot OTs claim
publicly about their scope? What assessment claims are appropriate?
What outcome claims cross into medical or psychological territory?

*Add specific rules here after Centro Assist review.*

### Rule 2.5 — [PK REVIEW NEEDED] Early childhood intervention claims
What can be publicly claimed about developmental outcomes for
children under 7 receiving early intervention OT?
Are there NDIA guidelines on how early intervention should be
described in marketing materials?

*Add specific rules here after review.*

---

## RULE GROUP 3 — Participant Representation and Dignity
*Source: Code of Conduct Obligations 1, 2, 6*
*Risk level: MEDIUM — affects brand perception and community trust*

### Rule 3.1 — Person-first language is the default
The NDIS and NDIA use person-first language in official communications.
Use person-first unless the content is specifically about a community
that uses identity-first language (e.g., Deaf community, some Autistic
community members).

**Person-first (default):** "person with disability", "child with autism",
"person with an intellectual disability"
**Identity-first (use carefully, with context):** "disabled person",
"Autistic person" — acceptable in community commentary contexts

### Rule 3.2 — Never describe participants as "vulnerable" as a primary identifier
"Vulnerable" as a noun or dominant descriptor is patronising and
inconsistent with the NDIS's rights-based framework.

**Prohibited:** "caring for the vulnerable", "our vulnerable clients",
"vulnerable NDIS participants"
**Permitted:** "participants who may need additional support",
"people with complex support needs"

### Rule 3.3 — Frame participant agency as central
Content must position providers as facilitators of participant goals,
not decision-makers on participants' behalf.

**Prohibited framing:** Provider-led ("we help clients achieve...")
**Required framing:** Goal-directed ("participants work toward...",
"supporting [person] to achieve their goals of...")

### Rule 3.4 — Never fabricate participant stories or examples
Participant stories require explicit written consent. ICE does not
have access to consent records. Therefore:
- Never write content involving a specific participant scenario
- Never write "one of our clients recently..."
- Never write anonymised case studies ("a 7-year-old in our program...")
- General population descriptions are acceptable
  ("children accessing early intervention OT may...")

---

## RULE GROUP 4 — Disclaimer Requirements
*Source: Code of Conduct Obligation 4, general professional standards*
*Risk level: MEDIUM — protects provider from misinterpretation*

### Rule 4.1 — General information disclaimer on advice-adjacent content
Any content that could be interpreted as specific advice must include
a disclaimer. This includes content about funding, eligibility,
clinical approaches, or legal rights.

**Standard disclaimer:** "General information only. Not personal advice.
Speak with your NDIS planner, support coordinator, or allied health
provider for advice specific to your situation."

**When to include:** Content about funding categories, eligibility
criteria, clinical interventions, rights and complaints processes.
**When not required:** General news, sector updates, policy commentary
that does not imply personal advice.

### Rule 4.2 — [PK REVIEW NEEDED] Plan management specific disclaimers
For content published by or for plan management providers:
What specific disclaimers are required when commenting on funding
categories, plan reviews, or financial aspects of NDIS plans?
Is there a professional standards requirement for plan managers
commenting publicly on participant finances?

---

## RULE GROUP 5 — Prohibited Topics
*Source: Code of Conduct, NDIA guidance, operational experience*
*Risk level: HIGH — avoid entirely*

### Rule 5.1 — Never comment on specific NDIS decisions or appeals
Content must not comment on, criticise, or advise on specific NDIA
decision-making in a way that could constitute legal advice or
influence a participant's appeal process.

**Prohibited:** "If NDIS rejected your [X], you should appeal because..."
**Permitted:** "Participants have the right to request an internal review
of NDIS decisions. The NDIS Commission can provide information on
the review process."

### Rule 5.2 — Never name or imply fault of other providers
Content must not name, imply, or criticise other NDIS providers —
registered or unregistered. This is a Code of Conduct risk and a
legal risk.

### Rule 5.3 — [PK REVIEW NEEDED] Topics that regularly cause problems in practice
From your plan management and practice administration experience:
What topics do NDIS providers regularly misstep on in their public
communications? What are the things you've seen create complaints
or Commission attention?

*Add specific high-risk topics here based on PK's operational experience.*

---

## RULE GROUP 6 — Sector Commentary and Policy
*Source: Code of Conduct Obligation 4, general professional standards*
*Risk level: LOW — standard journalistic caution applies*

### Rule 6.1 — Present policy changes as reported, not interpreted
When reporting NDIS policy updates, report what has been announced.
Do not extrapolate, predict, or interpret policy implications beyond
what the official source states.

**Prohibited:** "This change means participants will lose access to..."
**Permitted:** "The NDIA has announced [X]. Providers and participants
should review how this may affect their current arrangements."

### Rule 6.2 — Attribute all policy claims to official sources
All statements about NDIS rules, funding, or policy must be attributable
to NDIA, NDIS Commission, or legislation. Not to industry commentary,
news articles, or social media.

---

## PENDING RULES — Requires PK Input

The following areas need PK's operational knowledge before rules can be written:

| Area | Why PK knowledge matters |
|---|---|
| Plan management public commentary | What can/can't plan managers say publicly about funding? |
| Support coordination scope | What claims about funding access cross into financial advice? |
| Early childhood intervention claims | OT/speech/OT-assistant scope for under-7 content |
| High-risk topics from practice | What have you seen cause Commission attention in the sector? |
| Centro Assist OT scope of practice | Clinical claim limits for registered OTs |
| Pricing commentary | When does commenting on NDIA price limits become problematic? |

---

## Sign-Off Required Before Activation

- [ ] PK review of all [PK REVIEW NEEDED] sections
- [ ] Centro Assist review for Rules 2.4 and 2.5
- [ ] Test against 20 recent NDIS Yarns drafts
- [ ] Confirm no over-hedging that kills content quality
- [ ] Seed into t.5.7_compliance_rule
- [ ] Update ai-worker to pull and inject compliance block
- [ ] Commit D041 to 06_decisions.md
