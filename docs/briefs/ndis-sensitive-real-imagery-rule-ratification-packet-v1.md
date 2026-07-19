# Brief — ratify NDIS Sensitive-Real-Imagery exclusion (new Rule 3.5) — PK RATIFICATION PACKET

**Created:** 2026-07-19 Sydney
**Author:** brief-author (draft; orchestrator persists)
**Executor:** PK (ratification) + orchestrator (docs-only register lane on ratification)
**Status:** draft — awaiting PK gate-1 decisions (OQ-A..OQ-D below)
**Resolves:** OQ-1 of `docs/briefs/generic-shared-asset-pool-assessment-v1.md` §6
**Result file:** `docs/briefs/results/ndis-sensitive-real-imagery-rule.md` (created on completion)

---

## Task

Ratify a fresh **NDIS Sensitive-Real-Imagery exclusion rule** to serve as the authoritative governing citation for the P2 hard-exclusion fence of the generic shared-asset-pool design, closing OQ-1. This packet **proposes** the exact rule text, a placement, and the fence-wiring; **PK decides and ratifies** — nothing here is self-approving. The seed's *"v5.79 NDIS Sensitive-Real-Imagery policy"* does **not** exist in the repo: a full-repo grep for `v5.79`/`Sensitive-Real-Imagery` returns matches **only** inside the assessment packet's own OQ-1 and non_claims lines (`generic-shared-asset-pool-assessment-v1.md:165,192,215`), so the fence currently cites nothing real. PK has chosen (2026-07-19) to ratify a fresh rule rather than accept interim grounding or import an external source. The proposed rule stands on the privacy principle **already cited in-repo** (`docs/compliance/ndis_content_rules.md:202-208`: Code of Conduct Rule 2 — respect the privacy of people with disability; Provider Guidance para 31-35; personal information includes "details about their health or disability", para 32) and extends it to generic/stock imagery for NDIS clients. **Any photography/imagery-*specific* NDIS clause that would require an NDIS document paragraph not visible in-repo is NOT invented here — it is an explicit PK source handoff (see Notes §D).**

## Source context

- `docs/briefs/generic-shared-asset-pool-assessment-v1.md:192` — OQ-1: the seed's v5.79 sensitive-imagery policy is absent at HEAD; interim grounding named as NDIS Rule 3.4 + D7 purpose-binding.
- `docs/briefs/generic-shared-asset-pool-assessment-v1.md:165` — the **sensitive-content exclusion** is risk row **4.3** (High): assets that must NEVER be generic stay client-scoped, structurally ineligible for the shared table via `brand_neutral=false` + a policy fence; this row carries the ⚠ flag that the v5.79 citation is unbacked. *(Note: the launching task named "risk 4.1"; per the cited doc, 4.1 is brand-conflict and 4.3 is the sensitive class — see Notes §C / OQ-C.)*
- `docs/briefs/generic-shared-asset-pool-assessment-v1.md:132,153-155` — the fence mechanism: `brand_neutral` fail-closed (only `true` enters the pool); scoped `blocked` rows; fenced-until-approved; §5 P2 is the dark additive DDL that builds this fence (a separate future PK gate).
- `docs/compliance/ndis_content_rules.md:167-217` — Rule Group 3 (Participant Representation and Dignity) and Rule 3.4, the house-style template + the in-repo privacy grounding this rule reuses.
- `docs/compliance/ndis_content_rules.md:23-25` — the file's binding update process: *no rule may be added/modified/removed without citing the specific NDIS document, section, and paragraph.*
- `docs/compliance/ndis_content_rules.md:11-21,344-355` — the file feeds the **ai-writer text compliance block**, and its NDIS source documents live on PK's local machine (`C:\Users\parve\Downloads\NDIS docs`), not in-repo.
- `docs/briefs/tmr-d7-c-ndis-background-intake-envelope-v1.md:56` — D7 purpose-binding precedent: a policy decision is bound to a fenced asset via the `asset_meta.pk_decision` field.
- `docs/00_sync_state.md:9` — register HEAD is **v5.72** (confirms no v5.79 exists).

## Scope

**In scope:** (1) proposed text for a new NDIS sensitive-imagery exclusion in the exact house style; (2) a placement recommendation (new Rule 3.5 in Group 3 vs a standalone doc); (3) a fence-wiring note stating how the ratified rule replaces the unbacked seed reference as the P2 fence's citation; (4) explicit source-gap disclosure. All docs-only.

**Out of scope:** building/altering the P2 fence, the shared-asset table, the resolver, or any DB object (each is a separate future gate — `generic-shared-asset-pool-assessment-v1.md:6,180`); any asset promotion or reclassification; any change to the ai-worker compliance seed (`t.5.7_compliance_rule`) — this packet proposes source text only; deciding the shared-pool licence bar / data-home / scoped-delta invariant (OQ-2..OQ-5 of the assessment, unrelated to this rule).

## Allowed actions

- Draft the proposed Rule 3.5 text (Notes §A) and place it for PK review.
- On PK ratification: add the ratified rule to `docs/compliance/ndis_content_rules.md` **with a source-document citation** per the file's update rule (`:23-25`), bump the version + changelog.
- On PK ratification: update the assessment's risk-4.3 mitigation text (`generic-shared-asset-pool-assessment-v1.md:165`) to cite the ratified Rule 3.5 in place of the "v5.79" seed reference (surgical docs-only edit).
- Record the ratification in the result doc + a register pointer (Convention 1).

## Forbidden actions

- **Do NOT add or modify any rule without a source citation** — the file's own update process forbids it (`docs/compliance/ndis_content_rules.md:23-25`). If the imagery-*specific* clause lacks an in-repo NDIS paragraph, it stays a PK handoff (Notes §D), not a fabricated citation.
- **Do NOT invent** an NDIS document, section, or paragraph number for the imagery/photography clause. The v1.0 changelog shows unsourced `[PK REVIEW NEEDED]` sections were deliberately removed (`:361`) — do not reintroduce an unsourced clause.
- **Do NOT treat** "v5.79 NDIS Sensitive-Real-Imagery policy" as an existing source — grep-confirmed absent (appears only in `generic-shared-asset-pool-assessment-v1.md:165,192,215`).
- **Do NOT build, apply, or wire** the P2 fence / shared table / resolver here — those are separate future PK gates at their own tiers (`generic-shared-asset-pool-assessment-v1.md:6,180`; DML/DDL ≥ T2 per CLAUDE.md Convention 3). This packet is docs-only.
- **Do NOT mark** the rule proven/authoritative until PK ratifies; **do NOT** approve, promote, or reclassify any asset.
- **Do NOT edit** the ai-worker compliance seed (`t.5.7_compliance_rule`) or any DB object; **do NOT** change CLAUDE.md or registers beyond the PK-instructed surgical edits.

## Success criteria

- The proposed rule text cites **only** the in-repo privacy principle (Code of Conduct Rule 2 + Provider Guidance para 31-35 / para 32, per `ndis_content_rules.md:202-208`) **or** a PK-supplied source — no NDIS paragraph is invented.
- The imagery-specific gap is recorded as an explicit open question / PK source handoff, not papered over.
- PK has made the placement decision (Rule 3.5 in Group 3 vs standalone).
- On ratification: risk-4.3 mitigation text cites the ratified rule; the seed "v5.79" reference is gone; the compliance file's version + changelog are bumped with a source citation.
- OQ-1 is closed (the P2 fence now points at a real governing rule).

## Stop condition

Return this packet to PK for gate-1 ratification. On PK decision, apply the surgical docs-only edits via the register lane (verify-or-abort, exact anchors), then report per the result template and stop. If PK cannot supply the imagery-specific source and elects the privacy-principle-only grounding, record that election explicitly and stop.

---

## Notes

### §A — Proposed rule text (house style; grounded on the in-repo privacy principle)

> Written to match Rule 3.4's shape (heading · source-citation line · principle paragraph · Prohibited / Permitted lists). The privacy grounding is verbatim-adjacent to Rule 3.4 (`ndis_content_rules.md:202-208`). The bracketed source line is a **placeholder for PK**, not an assertion (see §D).

```
### Rule 3.5 — Never use identifiable real-participant or person-with-disability imagery without verifiable consent; generic/stock imagery for NDIS clients must be participant- and brand-neutral
*Source: Code of Conduct Rule 2 (respect the privacy of people with disability); Code of Conduct Provider Guidance April 2024, Part 2, Element 2, paras 31-35 — personal information includes "details about their health or disability" (para 32). Imagery/photography-specific application: [PK TO SUPPLY OR CONFIRM — exact NDIS document, section and paragraph governing photographic/visual depiction of participants; NOT present in the repo at HEAD. If none is supplied, this rule rests on the privacy principle above, applied to imagery by analogy to Rule 3.4.]*

Code of Conduct Rule 2 requires providers to "respect the privacy of people with disability" and comply with Commonwealth and State privacy laws. (Provider Guidance, para 31-35.) Personal information includes "details about their health or disability." (Para 32.) An identifiable image of a real NDIS participant — or of an identifiable person depicted as a person with disability — is use of personal information and, exactly as Rule 3.4 treats a written participant scenario, may not be used without verifiable consent. This principle extends to generic and stock background imagery used for NDIS-vertical clients: imagery may enter a shared or reused asset pool serving NDIS clients only if it is participant-neutral and brand-neutral — no identifiable real person represented as a participant, no NDIS affiliation / logo / civic or organisational cue, no culturally-specific or consent-bound depiction. Imagery that identifies or implies a specific participant, or that could read as an NDIS/organisational affiliation, must remain client-scoped and is structurally ineligible for the generic pool.

**Prohibited:**
- Any identifiable image of a real NDIS participant (or a person depicted as one) without documented, verifiable consent for the specific use
- Reusing or pooling participant, culturally-specific, or consent-bound imagery across clients
- Generic/stock imagery that carries an NDIS affiliation, logo, or civic/organisational cue
- Generic/stock imagery that depicts an identifiable person as a person with disability without a documented consent/rights basis

**Permitted:**
- Participant-neutral, brand-neutral generic/stock imagery (e.g. abstract textures, non-identifying scenes) under a clear multi-entity commercial licence
- Client-scoped imagery used only for the client that holds the documented consent/rights basis
- Population-level, non-identifying representation consistent with Rules 3.1-3.3
```

### §B — Placement recommendation (PK decides)

**Recommend: a new Rule 3.5 inside `docs/compliance/ndis_content_rules.md`, Rule Group 3 (Participant Representation and Dignity).** Reasoning: (1) Group 3 already governs participant representation/dignity and is anchored on the same privacy principle (Code of Conduct Rule 2, Provider Guidance para 31-35) that Rule 3.4 uses (`:167-168,202-208`) — an imagery exclusion is the visual sibling of Rule 3.4's textual one; (2) single NDIS compliance source-of-truth aids discoverability and keeps the update-process discipline (`:23-25`) in one place; (3) the fence can then cite one stable anchor (`ndis_content_rules.md#rule-3-5`).

**Caveat PK should weigh (argues toward a standalone doc):** this file's stated function is the **text** compliance block injected into every ai-worker generation call (`:11-21`); an *imagery* exclusion is read by neither the ai-worker prompt nor the image resolver, so it sits slightly outside the file's original charter. If PK prefers to keep this file purely text-generation-scoped, the alternative is a standalone `docs/compliance/ndis_imagery_rules.md` carrying the same rule and citation. Both satisfy the fence-wiring need equally; recommendation is Rule 3.5 in Group 3 for cohesion, **PK decides**.

### §C — Fence-wiring note (how the rule becomes the P2 citation)

The sensitive-content hard-exclusion is risk row **4.3** of the assessment (`generic-shared-asset-pool-assessment-v1.md:165`), realized by the design as `brand_neutral=false` + a policy fence keeping such assets client-scoped and structurally ineligible for the shared table (`:132,153-155`; §5 P2 dark DDL, `:180`). Wiring on ratification: (1) in risk-4.3's mitigation text, **replace** the unbacked *"v5.79 NDIS Sensitive-Real-Imagery policy"* reference with a citation to the ratified **Rule 3.5** (its file + rule number); (2) when the P2 fence is later built (its own future gate), the class-exclusion carries Rule 3.5 as its governing citation, and a fenced/excluded asset binds the decision through the existing `asset_meta.pk_decision` field precedent (D7, `tmr-d7-c-…:56`). This closes OQ-1: the fence points at a real, PK-ratified rule instead of the seed. *(The launching task referenced "risk 4.1"; the cited doc places brand-conflict at 4.1 and the sensitive class at 4.3 — surfaced as OQ-C for PK to confirm the intended row.)*

### §D — Source-gap honesty (critical)

What is **grounded in-repo and safe to assert now:** the privacy principle — identifiable participant / person-with-disability imagery is personal information requiring verifiable consent — via Rule 3.4's own body (`ndis_content_rules.md:202-208`, quoting Code of Conduct Rule 2 + Provider Guidance para 31-35 / para 32) and the Group 3 header (`:168`).

What is **NOT in-repo and must not be invented:** any NDIS clause *specifically about photography / imagery / visual depiction of participants*. The NDIS source documents live on PK's local machine (`:349-355`), and the file's update rule requires "the specific NDIS document, section, and paragraph number" (`:23-25`). Therefore the imagery-specific source line in §A is a bracketed **PK handoff**: PK to supply/confirm the exact source paragraph, or elect that the rule rests on the privacy principle applied to imagery by analogy to Rule 3.4. Either way the citation is honest; neither path fabricates an NDIS paragraph.

---

## PK gate-1 decisions required (from brief-author findings)

- **OQ-A (source):** Supply/confirm the exact NDIS document/section/paragraph for a photography/imagery-**specific** clause, **or** elect that the rule rests on the privacy principle (Code of Conduct Rule 2 + para 31-35/32) applied to imagery by analogy to Rule 3.4. The file's update rule (`:23-25`) requires a source per clause; without a PK source the imagery-specific line stays principle-grounded-by-analogy.
- **OQ-B (placement):** New Rule 3.5 inside Rule Group 3 of `ndis_content_rules.md` (recommended), **or** a standalone `docs/compliance/ndis_imagery_rules.md`.
- **OQ-C (risk row):** Confirm the fence-wiring targets **risk 4.3** (the launching task said "4.1", which is brand-conflict).
- **OQ-D (scope):** Confirm the rule stays **NDIS-vertical-scoped** (matching the compliance file) rather than being written as an all-client imagery policy — cross-client brand-neutrality for non-NDIS pool assets is governed separately by risk 4.1's `blocked`/`brand_neutral` mechanism.

**Next gate:** PK resolves OQ-A..OQ-D → orchestrator finalises Rule 3.5 text → external review on the final text → PK ratifies → orchestrator applies the surgical docs-only edits (add Rule 3.5 with citation; replace the v5.79 seed reference at risk 4.3) via the verify-or-abort register lane. Building the P2 fence remains a separate future gate.
