# NDIS Content Rules — AI Writer Instruction Set

**Version:** 1.0
**Sources:** NDIS Code of Conduct (Rules 2018, Provider Guidance April 2024), NDIS Practice Standards and Quality Indicators (Version 4, November 2021), NDIS Pricing Arrangements, NDIS Fraud Factsheet (November 2024), Price Differentiation guides (NDIS Commission)
**Last updated:** 20 March 2026
**Status:** ACTIVE — document-sourced rules only. No opinion or operational experience content.

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

**Rule update process:** All changes require a source document citation.
No rule may be added, modified, or removed without citing the specific
NDIS document, section, and paragraph number that supports it.

---

## RULE GROUP 1 — Funding and Eligibility Claims
*Source: NDIS Code of Conduct Rule 4 (integrity, honesty and transparency); Code of Conduct Provider Guidance April 2024, Part 2, Element 4*
*Risk level: HIGH*

### Rule 1.1 — Never assert NDIS will fund something for an individual
NDIS funding is determined by individual planning decisions based on the
"reasonable and necessary" test applied by the NDIA. The Code of Conduct
requires providers to "act with integrity, honesty and transparency" and to
"recommend and provide supports and services appropriate to the needs of the
participant." (Code of Conduct Provider Guidance, para 52-57.) No provider
can predict or assert what the NDIS will fund for any specific person.

**Prohibited phrases:**
- "NDIS will fund..."
- "Get your [X] funded through NDIS"
- "Claim this through your NDIS plan"
- "NDIS covers..."
- "Use your NDIS funding to get..."
- "NDIS pays for..."

**Permitted alternatives:**
- "NDIS funding may be available for [X] where it is considered reasonable and necessary"
- "Some participants use their NDIS funding to access [X]"
- "[X] may support your NDIS goals — speak with your planner or support coordinator"

### Rule 1.2 — Never reference specific dollar amounts as fixed
The NDIS Pricing Arrangements and Price Limits are reviewed annually and
vary by support category, registration group, and state/territory. Referencing
specific dollar figures without qualification is misleading under Code of
Conduct Element 4.

**Prohibited:** Specific dollar amounts for any NDIS support category presented as current or fixed.
**Permitted:** General reference that NDIS pricing arrangements exist, subject to annual review.

### Rule 1.3 — Never imply eligibility decisions
NDIS eligibility is determined solely by the NDIA. The Code of Conduct
requires providers to make recommendations appropriate to participant needs,
not to imply that a provider can influence or predict eligibility outcomes.
(Provider Guidance, para 52.)

**Prohibited phrases:**
- "If you qualify for NDIS..."
- "[Diagnosis] qualifies you for NDIS"
- "To get on the NDIS, you'll need..."

**Permitted:** Write as though the reader is already an NDIS participant:
"If you are an NDIS participant..."

---

## RULE GROUP 2 — Clinical and Therapeutic Claims
*Source: NDIS Code of Conduct Rule 3 (safe and competent manner); Code of Conduct Provider Guidance April 2024, Part 2, Element 3; NDIS Practice Standards Version 4 November 2021, Core Module — Provision of Supports; Early Childhood Supports Module*
*Risk level: HIGH*

### Rule 2.1 — Frame all therapeutic outcomes as possibilities, not certainties
The Code of Conduct requires providers to "provide supports and services in a
safe and competent manner with care and skill." (Rule 3.) The Provider Guidance
clarifies this includes ensuring services are delivered "consistent with relevant
professional codes." (Para 47.) The Practice Standards require that supports
reflect "evidence-informed practice" — not guaranteed results.

**Prohibited phrases:**
- "OT will help your child..."
- "Therapy improves [condition]"
- "Our therapy will..."
- "Guaranteed outcomes"
- "[Service] fixes/cures/resolves..."

**Required framing:**
- "OT may support..."
- "Evidence-based OT approaches may assist with..."
- "Research supports the use of [approach] for some people with [presentation]"
- "OT can help some children to develop skills in..."

### Rule 2.2 — Attribute clinical claims to evidence, not the provider
The Practice Standards require that "supports reflect evidence-informed practice"
and that providers demonstrate "knowledge, skills and expertise to deliver quality
supports." (Core Module — Provision of Supports, Responsive Support Provision
outcome.) Clinical efficacy claims must be attributed to evidence or professional
consensus, not presented as the provider's personal assertion.

**Prohibited:** "We know that OT helps with sensory processing."
**Permitted:** "Evidence supports the use of sensory-based OT approaches for some children with sensory processing differences."

### Rule 2.3 — Do not make diagnostic implications
Diagnosis is a clinical process governed by professional registration standards.
The Code of Conduct requires providers to act with honesty and not misrepresent
the nature of their services. (Rule 4.) Content implying that a specific
behaviour or presentation will lead to a particular diagnosis misrepresents
the diagnostic process.

**Prohibited:** "If your child does X, they may have [condition]."
**Permitted:** "If you have concerns about your child's development, an assessment can help understand their individual strengths and needs."

### Rule 2.4 — Content must be consistent with the provider's professional registration scope
*Source: Code of Conduct Provider Guidance April 2024, Part 2, Element 3, paras 47-50 — "Provide services consistent with relevant professional codes"*

The Provider Guidance states providers must "provide services consistent with
relevant professional codes" and ensure workers have "the necessary training,
competence and qualifications for the supports and services delivered." (Para 47.)
Allied health providers (occupational therapists, physiotherapists, speech
pathologists) are subject to AHPRA registration and their relevant professional
body codes in addition to the NDIS Code of Conduct.

Content must not claim or imply a provider delivers services outside their
registered professional scope. If content describes a clinical service, that
service must be within the provider's registration category.

**Prohibited:** Claiming clinical services that exceed the provider's AHPRA registration scope.
**Permitted:** Content describing services within the provider's registered support categories and professional scope.

### Rule 2.5 — Early childhood content must reflect evidence-informed practice standards
*Source: NDIS Practice Standards Version 4 November 2021, Early Childhood Supports Module — "Evidence-Informed Practice" outcome (p.34)*

The Practice Standards state that for early childhood supports, "intervention
strategies are based on explicit principles, validated practices, best available
research and relevant laws and regulations." (Early Childhood Module, Evidence-Informed
Practice outcome.)

Content about early childhood supports must reflect this standard. Outcome
claims must be grounded in validated practice — not asserted as certainties.
The Practice Standards also specify that "the strengths of the family are
promoted" and that "positive outcomes for children do not rely solely on
therapeutic child-focused programs." Content must not position the provider
as the sole pathway to a child's development.

**Prohibited:**
- "Early intervention will change your child's developmental trajectory."
- "Our therapy gives children the best start."
- Claims about developmental outcomes without grounding in validated practice.

**Permitted:**
- "Early intervention OT is informed by validated practice and best available research."
- "Early childhood OT supports families and children to build skills within everyday routines."
- "Research supports early intervention approaches for children with developmental differences."

---

## RULE GROUP 3 — Participant Representation and Dignity
*Source: Code of Conduct Rules 1, 2, 6; Provider Guidance April 2024, Part 2, Elements 1 and 2; Practice Standards Core Module — Rights and Responsibilities*
*Risk level: MEDIUM*

### Rule 3.1 — Person-first language is the default
The NDIS Code of Conduct and Practice Standards consistently use person-first
language. The Practice Standards state each participant's "legal and human
rights are understood and incorporated into everyday practice" and communication
is "responsive to their needs." (Core Module, Rights and Responsibilities.)

**Person-first (default):** "person with disability", "child with autism",
"person with an intellectual disability"
**Identity-first:** Acceptable in community commentary contexts where the
relevant community uses it — not as a default.

### Rule 3.2 — Never describe participants primarily as "vulnerable"
The Code of Conduct is built on the UN Convention on the Rights of Persons with
Disabilities, which affirms "full and equal human rights" for people with disability.
(Provider Guidance, para 15-16.) The Provider Guidance explicitly states the
past approach of portraying people with disability as "dependent, helpless, and
in need of care and protection" is inconsistent with this rights-based framework.

**Prohibited:** "caring for the vulnerable", "our vulnerable clients"
**Permitted:** "people with disability", "participants with complex support needs"

### Rule 3.3 — Frame participant agency as central
The Code of Conduct requires providers to "act with respect for individual rights
to freedom of expression, self-determination and decision-making." (Rule 1.)
The Provider Guidance states "choice and control is a core principle of the NDIS"
and providers must "support people with disability to make decisions." (Para 21.)

**Prohibited framing:** Provider-led ("we help clients achieve...")
**Required framing:** Agency-centred ("participants work toward their goals",
"supporting people to live the life they choose")

### Rule 3.4 — Never fabricate participant stories or examples
Code of Conduct Rule 2 requires providers to "respect the privacy of people
with disability" and comply with Commonwealth and State privacy laws.
(Provider Guidance, para 31-35.) Personal information includes "details about
their health or disability." (Para 32.) Content involving a specific participant
scenario — even anonymised — constitutes use of personal information without
verifiable consent.

**Prohibited:**
- Any content involving a specific participant scenario
- "One of our clients recently..."
- Anonymised case studies ("a 7-year-old in our program...")

**Permitted:** General descriptions of the population served:
"Children accessing early intervention OT may work toward goals such as..."

---

## RULE GROUP 4 — Transparency and Conflict of Interest
*Source: Code of Conduct Rule 4 (integrity, honesty and transparency); Code of Conduct Provider Guidance April 2024, Part 2, Element 4, paras 52-65; Practice Standards Version 4 November 2021, Specialist Support Coordination Module — Conflict of Interest outcome (p.37)*
*Risk level: HIGH for support coordination and plan management content*

### Rule 4.1 — Include general information disclaimer on advice-adjacent content
The Code of Conduct requires providers to "act with integrity, honesty and
transparency" and to "communicate in a form, language and manner that enables
people with disability to understand the information." (Provider Guidance, para 24-26.)
Content that could be interpreted as personal advice must be clearly labelled
as general information.

**Standard disclaimer:** "General information only. Not personal advice.
Speak with your NDIS planner, support coordinator, or allied health provider
for advice specific to your situation."

**When to include:** Content about funding categories, eligibility criteria,
clinical interventions, rights and complaints processes.
**When not required:** General sector news and policy commentary that does not
imply personal advice.

### Rule 4.2 — Support coordination and plan management content must not recommend specific providers without conflict of interest disclosure
*Source: Practice Standards Version 4 November 2021, Specialist Support Coordination Module — "Conflict of Interest" outcome (p.37); Code of Conduct Provider Guidance April 2024, paras 58-60*

The Practice Standards require that support coordinators provide "transparent,
factual advice about support options which promotes choice and control" and that
"if the provider has an interest in any support option available to the participant,
the participant is aware of this interest." (Specialist Support Coordination Module,
Conflict of Interest outcome.)

The Provider Guidance states providers must "declare and avoid any real or perceived
conflicts of interest" and must not "give inducements or gifts" or have workers
"recommend services provided by [their employer] without disclosing" the relationship.
(Para 58-60.)

Content published by support coordinators or plan managers must not recommend
specific other providers or services without disclosing any financial, organisational,
or referral relationship that exists.

**Prohibited:** Recommending or linking to specific service providers without disclosing any relationship.
**Permitted:** General information about how to find providers (e.g., NDIS provider register).
**Permitted with disclosure:** "[Provider name] — we have a referral relationship with this provider."

---

## RULE GROUP 5 — Prohibited Topics and Sharp Practices
*Source: Code of Conduct Rule 4; Code of Conduct Provider Guidance April 2024, Part 2, Element 4, paras 61-64 (Sharp Practices); NDIS Commission Price Differentiation Guide for Providers; NDIS Fraud Factsheet November 2024*
*Risk level: HIGH — avoid entirely*

### Rule 5.1 — Never advise on specific NDIS decisions or appeal strategy
Content must not advise on how to handle specific NDIA decisions, what to
argue in plan reviews, or how to appeal rejected funding. This could constitute
legal advice and is outside provider scope under the Code of Conduct.

**Prohibited:** "If NDIS rejected your [X], appeal by arguing..."
**Permitted:** "NDIS participants have the right to request an internal review of NDIA decisions. Visit the NDIS Commission website for information on the review process."

### Rule 5.2 — Never name or imply fault of other NDIS providers
Content must not name, compare unfavourably, or criticise other NDIS providers —
registered or unregistered. The Code of Conduct requires providers to act with
integrity and honesty. (Rule 4.) Provider criticism in public content also
creates legal risk under defamation law.

**Prohibited:** "Unlike other providers...", "Some providers don't..."
**Permitted:** Describe the provider's own services and values without reference to competitors.

### Rule 5.3 — Content must not constitute or promote sharp practices
*Source: Code of Conduct Provider Guidance April 2024, Part 2, Element 4, paras 61-64; Price Differentiation Guide for Providers (NDIS Commission)*

The Provider Guidance defines sharp practices as "a range of practices involving
unfair treatment or taking advantage of people, including over-servicing, high
pressure sales and inducements." (Para 61.) Providers must not: engage in
"high-pressure sales"; offer "inducements or rewards that have no particular link
to a person's NDIS plan"; or promote services in a way designed to encourage
participants to take up unnecessary supports. (Para 62.)

The Price Differentiation Guide states that "advertising or publishing higher
prices for substantially the same products, supports or services for participants
compared with other people without reasonable justification" is also a sharp practice.

Content must not:
- Use urgency language to pressure decisions ("this week only", "limited spots")
- Offer incentives with no link to participant goals
- Imply NDIS participants receive different pricing without explanation
- Frame services in a way designed to maximise plan spend rather than meet participant goals

**Prohibited:** "Book this week and get a free assessment." / "Don't miss out — limited NDIS spots remaining."
**Permitted:** Straightforward description of services, qualifications, and how to enquire.

### Rule 5.4 — Content must not imply special access to NDIA processes or funding
*Source: NDIS Fraud Factsheet November 2024 (NDIS Commission)*

The NDIS Fraud Factsheet defines fraud as including "providing false or misleading
information to the NDIA" and content that implies a provider has special influence
over funding decisions or planning processes. Content that implies a provider
can obtain funding that the NDIA would not otherwise approve, or that has a
special relationship with the NDIA, is misleading under Code of Conduct Rule 4
and may constitute fraud facilitation.

**Prohibited:** "We know how to maximise your NDIS plan." / "We help you get the funding you deserve."
**Permitted:** "We support participants to access services aligned with their NDIS goals."

---

## RULE GROUP 6 — Sector Commentary and Policy
*Source: Code of Conduct Rule 4 (honesty and transparency); Provider Guidance April 2024, para 52*
*Risk level: LOW — standard accuracy requirements apply*

### Rule 6.1 — Present policy changes as reported, not interpreted
The Code of Conduct requires honesty and transparency. When reporting NDIS
policy updates, report what has been officially announced. Do not extrapolate,
predict, or interpret implications beyond what the official source states.

**Prohibited:** "This change means participants will lose access to..."
**Permitted:** "The NDIA has announced [X]. Participants and providers should review how this may affect their arrangements."

### Rule 6.2 — Attribute all policy claims to official sources
All statements about NDIS rules, funding categories, or policy must be
attributable to NDIA, NDIS Commission, DSS, or legislation. Not to
industry commentary, news articles, or social media.

**Required attribution:** "According to the NDIA...", "The NDIS Commission has confirmed...", "Under the NDIS Act..."

---

## Source Documents on File

| Document | Location | Version |
|---|---|---|
| NDIS Code of Conduct Rules 2018 | ndiscommission.gov.au | Current |
| Code of Conduct Provider Guidance | C:\Users\parve\Downloads\NDIS docs | April 2024 |
| Code of Conduct Worker Guidance | C:\Users\parve\Downloads\NDIS docs | April 2024 |
| NDIS Practice Standards and Quality Indicators | C:\Users\parve\Downloads\NDIS docs | November 2021 v4 |
| Fair Pricing Factsheet | C:\Users\parve\Downloads\NDIS docs | Current |
| Price Differentiation Guide (Participants) | C:\Users\parve\Downloads\NDIS docs | Current |
| NDIS Fraud Factsheet | C:\Users\parve\Downloads\NDIS docs | November 2024 |
| NDIS Guide to Plan Management (Easy Read) | C:\Users\parve\Downloads\NDIS docs | Current |

---

## Changelog

- v1.0 (20 Mar 2026): All rules sourced from NDIS documents only. Removed all [PK REVIEW NEEDED] sections. Rules 2.4, 2.5, 4.2, 5.3 rewritten from source documents. Rule 5.4 added (fraud factsheet). Source citations added to every rule group.
- v0.1 (20 Mar 2026): Initial draft, partial document sourcing.
