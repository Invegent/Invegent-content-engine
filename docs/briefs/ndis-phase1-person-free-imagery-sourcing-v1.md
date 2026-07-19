# Brief — NDIS Yarns Phase-1 Real Person-Free Imagery Sourcing (Gate-1)

**Created:** 2026-07-19 Sydney
**Author:** orchestrator
**Executor:** Claude Code (orchestrator-driven two-stage image workflow) → PK visual gate
**Status:** **in-progress — PK VISUAL GATE PASSED 2026-07-19: all 9 best-picks ACCEPTED.** Gate-1 row election: CORE 7 + `ny_assistive_tech_no_user` + `ny_hands_ordinary_activity` (9 rows); `ny_distant_soft_focus_presence` HELD. Two-stage clean (harvester HARVEST_COMPLETE · orchestrator byte-verify 34/34 · image-reviewer REVIEW_COMPLETE `clean`, no cultural ESCALATE · crop-proof text-safe). **PK accepted all 9** ("like all the images") → proceed to fenced DB-intake with good metadata. **Follow-up requested: a second round (new set of images).** NEXT = fenced DB-intake gate packet (§2) → PK apply gate.
**Governing policy:** `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` (rev-2, register v5.79, hash `93825466…`) — this is the **Phase 1** lane it foresaw
**Lane / label / tier (proposed):** T2 · SIDE_PROVING · **sourcing-only, no production surface** (fenced candidate package → PK visual gate; DB intake + promotion are separate downstream gates)
**Result file:** `docs/briefs/results/ndis-phase1-person-free-imagery-sourcing-v1.md` (on completion)

---

## Task

Source **real, person-free / non-identifying** background photography for NDIS Yarns — the warmth layer the policy authorises as Phase 1 — via the proven two-stage image workflow (`image-harvester` → `image-reviewer`, orchestrator byte-verify + crop-proof between stages), and present a **fenced candidate package** for PK's visual gate. The output warms the NDIS background rotation pool beyond the current abstract navy set, **without** entering the identifiable-people (Phase 2, CLOSED) or high-sensitivity (Phase 3, HELD) categories, and **without** touching any DB/storage/production surface. Sourcing ends at the PK visual gate; DB intake and promotion are separate, later PK-gated lanes.

## Source context

- `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` — **the governing policy.** Phase 1 = real, person-free / non-identifying (accessible environments · assistive tech without a user · hands-with-no-identity · distant/soft-focus where identity/disability/service-status is not inferable); enters the rotation pool; opens via this brief. §H GATE 1a = the mandatory **identity-risk screen**; §E = the **permanent exclusions**; §D = cultural content **hard-blocked**.
- memory `ndis-yarns-readiness-v0` + `ndis-bg-sourcing-d7-p0` — brand facts (plain-English disability explainer; navy `#0A2A4A` / teal `#1C8A8A`; strict compliance — general-info-not-advice, NO promo, NO Care-for-Welfare); the existing NDIS bg pipeline is abstract (live `bg_ny_brand_texture_navy_waves` + the v5.77 fenced rotation-pool candidates). Real environmental photography is the **new** register this lane adds.
- `docs/00_sync_state.md` v5.77 — the NDIS abstract/data-grid rotation pool sourcing precedent (two-stage workflow run inline by the orchestrator when agent-types are unregistered; byte-verify N/N sha256; 0.55-scrim crop-proof; Pexels License PK-accepted for the NDIS bg pool).
- `CLAUDE.md` — "NDIS sensitive real-imagery intake" section + "Image workflow acceleration" §2 non-negotiables + the cc-0027 two-stage workflow; `.claude/agents/image-harvester.md` / `image-reviewer.md` — the §I charter fences (harvester Phase-1-person-free-only; reviewer identity-leak+dignity+affiliation+cultural checklist, cultural→ESCALATE-never-PASS).
- memory `cc-0027-image-agents-proving` — allow-list (Unsplash standard / Pexels / Wikimedia CC0), the six ratified licence rows, byte-verify technique, P0 verdict vocabulary.

## Proposed manifest (theme-set batch — P1 batch-first)

One theme-set, one `image-reviewer` pass, one crop-proof pass, one PK visual gate. Aim ~2–4 candidates per row. All rows are **person-free environments**; text-overlay-safe (behind a scrim + NDIS headline), warm/grounded/inclusive tone, NOT clinical.

**CORE rows (recommended for the first manifest — lowest risk, person-free environments):**

| row_key | description | text-safety / brand note |
|---|---|---|
| `ny_accessible_home_interior` | warm accessible home interior — step-free / wide doorway / ramp visible, ordinary lived-in feel; no people | interior mid-tones scrim well (PP-interior shape proven) |
| `ny_accessible_pathway` | step-free path / ramp / accessible public walkway, tactile paving; no people, no plates | open foreground = clean text band |
| `ny_inclusive_public_space` | accessible park / community plaza / accessible playground (empty), inclusive design; no identifiable people | sky/ground gives scrim room |
| `ny_community_facility` | community centre / library / hall — welcoming interior or exterior; no people, no provider signage | avoid legible signage (identity-risk screen) |
| `ny_accessible_transport` | accessible bus/tram stop, low-floor vehicle exterior, platform with lift; no people, no number plates | REJECT legible plates/route branding |
| `ny_everyday_living` | ordinary kitchen / living / home-workspace, accessible-friendly; no people | proven overlay shape |
| `ny_education_or_work` | inclusive classroom / office / workshop environment (empty); no identifiable people, no org branding | avoid whiteboards with legible text |

**EDGE rows (flag for explicit PK inclusion/exclusion — higher dignity or identity risk even person-free):**

| row_key | description | why it's an edge call |
|---|---|---|
| `ny_assistive_tech_no_user` | assistive technology (mobility aid, AAC device, hearing aid, adaptive tool) photographed **without a user**, in an **everyday non-clinical** context | risks reading clinical / stereotyping (§E clinical-gaze); the reviewer dignity check is load-bearing here — recommend include ONLY with an everyday-context constraint |
| `ny_hands_ordinary_activity` | hands doing an ordinary task (gardening, cooking, craft) — **no identifiable person**, no medical context | partial-person category; must be genuinely non-identifying (no face, no distinguishing features) |
| `ny_distant_soft_focus_presence` | a scene with **distant / blurred** human presence where identity, disability, and service-status cannot be inferred | the Phase-1↔Phase-2 boundary — the highest-risk Phase-1 sub-category; **recommend HOLD from the first manifest** (prove the person-free environmental core first, revisit as a deliberate second pass) |

**Orchestrator recommendation:** run the **7 CORE rows** now; **HOLD `ny_distant_soft_focus_presence`**; treat `ny_assistive_tech_no_user` + `ny_hands_ordinary_activity` as **PK-elected** (include with the stated constraints, or defer). PK sets the final row list at this gate.

## Scope

**In scope:**
- Two-stage licence-safe sourcing (harvester GET-only, allow-list) of the PK-approved manifest rows, into `_harness/image_harvester_v0/**` only.
- Orchestrator byte-verify (sha256 from bytes) between stages; the **identity-risk screen** (§H GATE 1a) and the **text-safety crop-proof** (1:1, 1080, NDIS-appropriate scrim ~0.55 + sample NDIS headline).
- `image-reviewer` pass with the NDIS checklist (identity-leak / dignity / affiliation / cultural flags; cultural → ESCALATE).
- A fenced candidate package + contact sheets + crop-proofs presented for the **PK visual gate**.

**Out of scope (hard):**
- Any identifiable person (Phase 2 CLOSED), minors, participant stories, clinical/personal-care/distress imagery, or First-Nations / culturally specific content (Phase 3 / §D HARD-BLOCKED).
- Any DB intake, upload, INSERT, storage write, governance flip, pool change, or promotion — sourcing ends at the PK visual gate.
- Any §E-excluded content (NDIS logos, provider/affiliation cues, endorsement, pity/inspiration framing, legible records/plates/addresses, tokenism, decorative-only).
- Any charter/policy/register change; any commissioned or paid-stock supply (that is the Phase-2 evidence lane, not this).

## Allowed actions

- Run `image-harvester` (or the orchestrator-inline two-stage equivalent if the agent-type is unregistered this session, per the v5.77 / creative-graph-auditor precedent) on the PK-approved rows, allow-list + GET-only, writes confined to `_harness/image_harvester_v0/**`.
- Orchestrator byte-verify all downloaded candidates (sha256), run the identity-risk screen + crop-proof, run `image-reviewer`, assemble the package.
- Present the package for the PK visual gate; record every identity-risk / dignity / signage decision in the lane record.

## Forbidden actions

- Offer, download, or best-pick any candidate with an identifiable person, face, minor, clinical/medical context, First-Nations/cultural motif, NDIS logo, provider/affiliation cue, legible signage/plate/address, or any §E exclusion.
- Any network POST/auth, any DB/storage/git-production/deploy surface, any intake or promotion.
- Treat any candidate as approved — **PK's visual verdict is the only deciding act**; nothing here is production-safe.
- Open Phase 2 or Phase 3; source distant/soft-focus human presence unless PK explicitly includes that row; appoint or assume any specialist role (§C reviewer / §D adviser stay held).
- Weaken any image-workflow §2 non-negotiable.

## Success criteria

- A fenced candidate package (allow-listed licence + full provenance + sha256 per candidate, byte-verified) covering the PK-approved rows, every candidate person-free and passing the identity-risk screen, with contact sheets + NDIS-scrim crop-proofs, ready for the PK visual gate.
- `image-reviewer` has flagged identity-leak / dignity / affiliation / cultural risks (suggestive only); any cultural element ESCALATED, none passed.
- Zero DB/storage/production surface touched; harvester writes confined to the package root; honest `not_harvestable_licence_safe` returns where a row has no licence-safe person-free candidate.
- The lane record names every readable-signage / dignity / edge-row decision.

## Stop condition

Assemble the package and present it at the **PK visual gate**. Await PK's per-candidate visual verdicts. Do **not** proceed to DB intake or promotion — those are separate downstream PK gates (fenced INSERT + pool-neutrality machine-assertion per §2 for intake; full T3 chain for promotion). Report per result template.

---

## Notes

- **Why person-free first:** the policy's staged model warms the brand now while holding the highest-risk identifiable-participant category behind the evidence-based rights rule (§B) and the held §C reviewer. This lane proves the person-free environmental register; it never approaches Phase 2.
- **Assistive-tech dignity:** if PK includes `ny_assistive_tech_no_user`, the everyday-context constraint is mandatory (no clinical/white-background/medical-equipment framing) — the reviewer dignity flag is the gate, and PK's visual verdict decides.
- **Pool character:** accepted Phase-1 photos rotate alongside the abstract navy backgrounds; any NDIS headline may appear over them, so blind-rotation text-safety (crop-proof) and brand-tone fit (PK visual) both apply.
- **Downstream:** on PK visual accept, the next lanes are (1) fenced DB intake (§2: upload + fenced INSERT + byte/public-URL sha256 + in-txn pool-neutrality machine-assertion + db-rls-auditor → PK apply gate) and (2) per-asset promotion (§2 T3) — each its own PK gate, mirroring the P0 / v5.77 pattern.
