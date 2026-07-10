# TMR D7 — Second-Brand Exit Test v1 (instantiated against NDIS Yarns)

**Status:** DRAFT — read-only analysis, nothing applied. **Lane:** TMR Readiness (side lane) · **Tier:** T1 (docs/read-only)
**Date:** 2026-07-10 · **Authored for:** PK
**Governing doc:** [`docs/governance/pp-tmr-definition-of-done-v1.md`](../governance/pp-tmr-definition-of-done-v1.md) — D7 handoff line 62, routed to this lane.
**Evidence basis:** repo at HEAD `8199153` (worker source, migrations `20260703002813` / `20260703035154`) + SELECT-only live reads, project `mbkmaxqhsohbtwsqolns`.

> **Scope guardrails honoured:** no worker code touched · no asset promoted · no assignment created · no governance row written · no onboarding begun · no render · no publish. This document **specifies a test**; it does not run it, and it decides nothing. Spine Gen v2 remains fenced on its four preconditions.

---

## 0. Structural precondition — D5 gates D7

**D7 cannot be evaluated while D5 is open, and no census result changes that.**

D7 asks whether the spine is safe to **copy** to a second brand. A spine with a live, published, brand-visible rendering defect on its highest-volume format is not safe to copy: onboarding NDIS Yarns onto it propagates the defect to a second brand's audience. The ordering is structural, not a scheduling preference.

This ordering follows from D7's own wording ("ready to copy") and would hold under either classification of the overprint defect. As of PK's ruling below it is no longer a matter of reading — D5 is a blocker, and a blocker cannot be carried past a copy.

> ✅ **A-OQ1 REVERSED — PK, 2026-07-10, confirmed directly in this lane's window.** Overprint is promoted from *named carry* to **BLOCKER**. **PP Static TMR Done is WITHHELD — the label is FALSE.** Evidence: a published Facebook card (8 July 2026) with the headline printing through the subtitle. The defect reaches production posts.
>
> **The governance doc does not yet record this.** At HEAD `2d8b092` it still reads Static = "**NEARLY TRUE** — carries named; overprint carried (A-OQ1)" (line 15) and A-OQ1 = "**Named carry.** Static Done stands with the 7/17 defect enumerated" (line 25). Both lines are now **stale**. The doc already carries one additive supersede block (lines 89–97, retiring `max_lines: 3` as the prescribed fix), so the instrument exists and has been exercised.
>
> **This lane does not amend the governance doc.** Recording the reversal belongs to TMR Fixups, which owns record reconciliation and the additive-supersede instrument, and whose own uncommitted corrections block currently sits on that file. Routed there. Recorded here so the ruling is not carried only in conversation.

---

## What D7 says, and why it could not be evaluated before

The accepted DoD states D7 as:

> the copy artifact carries no PP-hardcoded identity **and** a second-brand dry-run resolves to a governed render **without editing worker code**.

That is two clauses. The first is a code property (measured by the D6 census). The second is a *joint* property of code **and** the second brand's data — and it had never been instantiated against a real brand, which is why it is the weakest-specified criterion. Below it is instantiated against **NDIS Yarns**, the highest-readiness second-brand candidate.

The test is written so it can be executed later as a **dry-run** — a governed render attempted for a real NDIS draft — and either passes cleanly or fails with a named, expected error. It is not executable today; §4 says why.

---

## 1. Correction: the received summary of NDIS readiness is wrong on two counts

The prior readiness workbook and the register both summarise NDIS Yarns as *"brand kit complete + 17 fenced assets; gap is promotion + assignment + declarative registry, **not remediation**."* Two parts of that do not survive contact with the data.

**(a) NDIS Yarns has zero background assets. All 17 are logos.** Live breakdown of `c.client_brand_asset` for `ndis-yarns`:

| `asset_meta.usage` | count | fenced |
|---|---|---|
| `logo` | 8 | all |
| `logo_vector_source` | 9 | all |
| **`background`** | **0** | — |

Every row came from the logo-variant intake lane. `resolve_slot_assets` filters on `asset_meta->>'usage' IN ('background','logo')` ([`20260703002813…:172`](../../supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql)), and when the template declares a Background slot with zero eligible backgrounds it returns `fail_closed` (`:236-239`). Promoting all 17 fenced assets therefore **cannot** produce a governed render — there is nothing for the Background slot to resolve to. **A background sourcing/intake lane is a hard prerequisite, not an optional follow-on.** The workbook's own lane 2 did say "governed background intake"; the one-line summary that has since propagated into the register dropped it.

**(b) NDIS does not need its own provider template — and PP's client-scoped one is not what renders PP.** `select_template` rejects any candidate whose `scope <> 'generic'` with reason `wrong_scope` ([`20260703035154…:188-190`](../../supabase/migrations/20260703035154_create_select_template_v1.sql)). The candidate pool is the **16 generic** provider templates, shared fleet-wide. PP's single client-scoped template is therefore *ineligible* under the live selector; PP's actual winner is the generic `generic_market_insight_card_1x1_v1`. This is good news the readiness matrix mis-scored as a gap: the "client-scoped provider template: none" row for NDIS is **not** a blocker. The reusable unit is genuinely the generic library.

---

## 2. The exit test

D7 passes for a brand **B** when both halves hold. Each check below is a machine-checkable predicate, evaluated *before* the dry-run.

> **Label namespace.** Code conditions are `D7-C*`, data predicates are `D7-P*`. They deliberately do **not** reuse `A*`/`B*`/`C*`/`D*`, which the DoD uses for its Levels A–D. An earlier draft numbered these `A1–A4` / `B1–B7`; the collision risk against DoD Level B was flagged and is fixed here.

### Half A — code carries no PP identity on B's path

Every literal in the D6 census (see the companion census handed to `register-reconciler`) must be either removed, or provably unreachable for B. The four that are **reachable** for B today:

| # | Site | Effect on B's render if unfixed |
|---|---|---|
| D7-C1 | `isB1GovernedImageQuote(clientId)` — [`b1_production.ts:69`](../../supabase/functions/image-worker/b1_production.ts:69) | B never enters the governed branch at all; silently renders legacy. |
| D7-C2 | `B1_GOVERNED_CLIENT_SLUG = 'property-pulse'` — [`b1_production.ts:33`](../../supabase/functions/image-worker/b1_production.ts:33) | Passed straight to `select_template(p_client_slug…)`. If C1 were lifted alone, **B's draft would resolve PP's templates, PP's logo and PP's backgrounds.** Cross-brand asset bleed. |
| D7-C3 | `category: 'PROPERTY NEWS'` / `footer: 'propertypulse.com.au'` — [`branch_b_proof.ts:50`](../../supabase/functions/image-worker/branch_b_proof.ts:50), [`:55`](../../supabase/functions/image-worker/branch_b_proof.ts:55), consumed at [`index.ts:662`](../../supabase/functions/image-worker/index.ts:662) | B's card **renders with PP's category badge and PP's domain in the footer.** Not a gate failure — a wrong card that publishes. |
| D7-C4 | `TMR_WINNER_TEXT_FIELDS` — one entry, [`b1_production.ts:152`](../../supabase/functions/image-worker/b1_production.ts:152) | Keyed by *template*, not client. Passes for B **iff** B binds the same generic card. Its "acceptable" classification in the audit is conditional on exactly that, and should be re-checked per brand, not assumed. |

**C1 and C2 are a single atomic fix.** Lifting the gate without making the slug data-driven converts a fail-closed condition into silent cross-brand bleed — strictly worse than today. Any Spine Gen v2 plan that stages them separately fails this test.

Warn-only, therefore **not** D7 blockers (but they will emit noise on B's first render, and that noise is expected, not a defect): `resolveCreativeContract` returns no contract for B, so `contract_validation` warns on `contract_identity` against `EXPECTED_VARIANT_KEY` / `EXPECTED_CONTRACT_REF` ([`contract_validation.ts:10-11`](../../supabase/functions/image-worker/contract_validation.ts:10)). Both are evidence-only and never gate the render.

### Half B — B's data resolves, end to end, with no code edit

Seven predicates. All must hold. NDIS Yarns' status today is scored against each.

| # | Predicate | Source of truth | NDIS today |
|---|---|---|---|
| D7-P1 | `c.client` row, `status='active'`, resolvable by `client_slug` | `select_template:152` (`fail_closed 'client_not_found'` on miss) | ✅ |
| D7-P2 | `client_format_config` row for `image_quote`, `is_enabled` | live | ✅ (1 row, `platform` NULL) |
| D7-P3 | ≥1 **generic** provider template with a `creative_template_variant_candidate` at `format_key='image_quote'` and `status` ≥ `smoke_rendered` | `select_template:186-198` | ✅ (16 generic, shared) |
| D7-P4 | `creative_template_platform_suitability` row for (template, platform) not in `not_suitable`/`blocked` | `select_template:203-213` | ✅ **CLOSED — passes with warning** (see below) |
| D7-P5 | `creative_template_client_assignment` for (B, template) at `visually_approved` \| `client_enabled` \| `production_proven` | `select_template:231-253` | 🔴 **0 rows** |
| D7-P6 | ≥1 eligible background **per platform B publishes to** — `usage='background'`, `is_active`, `asset_meta.approved=true`, `safe_for_text_overlay ∈ {'true','needs_scrim'}` | `resolve_slot_assets:172-217` | 🔴 **0 backgrounds**, all platforms (§1a) |
| D7-P7 | ≥1 asset `usage='logo'`, `is_active`, `asset_meta.approved=true` — zero eligible logos ⇒ `fail_closed 'missing_required_logo'` | `resolve_slot_assets:26` | 🔴 8 exist, **all fenced** |
| D7-P8 | **The bound template renders B's text without overprint** — headline does not collide with subtitle at B's real content lengths | D5 / cc-0033 re-plan | 🔴 **blocked on D5 — now a BLOCKER, not a carry** (§0) |

**P6 is a per-platform predicate, not a scalar.** The record-reconciliation lane established (uncommitted corrections block, HEAD `2d8b092`) that PP's live eligible background pool is **platform-parameterised** — 17 platform-agnostic, 17 facebook, 15 linkedin, 14 instagram — and that recording it as a single number is itself the defect that produced the stale "11 vs 9" D4 figure. The same trap applies here: `platform_scope` fences assets per platform, so a brand can hold an eligible background on facebook and **`fail_closed` on linkedin**. P6 must be evaluated against B's actual platform set (for NDIS: facebook, instagram, linkedin — see P4) and reported as a triple, never as "≥1 background exists."

**On P8, and why it is not a payload assertion.** P6/P7 and the C-conditions are checkable from data and from the emitted `modifications`. P8 is not: overprint is a **render-geometry** property that only exists once the provider composes the card. Nothing in `select_template`, `resolve_slot_assets`, or `render_spec` observes it — which is precisely why 7/17 PP cards carry the defect while every governed render reports `selector_status='ok'`.

So P8 has no cheap machine check today, and this document does not invent one. It resolves as: **D5 must be closed for the specific template B binds** — evidenced by whatever instrument the cc-0033 re-plan lands — **and** B's dry-run card passes a PK visual check at B's own content lengths. The second clause is not redundant. Overprint is a function of *text length against box geometry*, and NDIS's headlines are not PP's: the stat-led NDIS corpus ("160,000 people may lose NDIS access", "82% of providers operating at a loss") differs in length distribution from PP's property headlines. **A D5 closure proven on PP's corpus does not automatically transfer to B.** P8 must be re-evidenced per brand.

Do **not** prescribe `max_lines: 3` as the fix. The governance doc's own supersede block (lines 89–97) retired it; only the 7/17 measurement and the carry survive that correction.

**P4 closed (2026-07-10).** NDIS `image_quote` drafts slot to three platforms — `facebook` (41), `instagram` (38), `linkedin` (6). `generic_market_insight_card_1x1_v1` carries a `creative_template_platform_suitability` row for all three (plus `website`). The table is keyed on (template, platform) with **no `client_id`** — suitability is a property of the template, so NDIS inherits PP's coverage for free. Every row is `suitability_status='candidate'`, which is not in `('not_suitable','blocked')` and therefore **passes** the filter.

Two consequences worth recording. First, `p_platform` is read from `m.slot.platform` for the draft, **not** from `client_format_config` — so NDIS's single `platform=NULL` format-config row is irrelevant to this predicate. Second, because *zero* generic templates sit at `platform_safe` or `production_proven`, `v_ps_proven = 0` and **every governed selector call today emits the `platform_suitability_unproven` warning — including Property Pulse's live renders.** That is the design working as intended (permissive, never silent), but it means the warning is not a second-brand signal and must not be read as one during the dry-run.

Note P7 against the standing "Invegent is hard-blocked because `brand_logo_url` IS NULL" claim: on the **governed** path the logo comes from `resolve_slot_assets`, *not* from `client_brand_profile.brand_logo_url`. The NULL-logo hard-fail is a **legacy-path** failure mode. It remains true that Invegent is blocked, but the governed-path blocker is P7 (no approved logo *asset*), not the profile column. Worth correcting before it drives a remediation lane at the wrong table.

### Pass condition

D7 passes for B when **D5 is closed** (§0) **and** D7-C1…C4 are resolved-or-unreachable **and** D7-P1…P8 all hold **and** a dry-run render for a real B draft produces `image_status` != `failed` with `render_spec.tmr.selector_status='ok'`, a `Background.source` and `Logo.source` resolved from **B's own** `asset_id`s, and no PP string in the emitted `modifications`.

**A green render is not a passing D7 — twice over.** C3 means a render can succeed, stamp clean TMR evidence, and still be a Property Pulse card carrying NDIS's headline. P8 means it can pass every payload assertion and still publish collided text. The first failure is invisible to the eye reading the status field; the second is invisible to the payload. A passing D7 therefore needs **three** distinct observations — status, emitted `modifications`, and the composed pixels — and no two of them substitute for the third.

The `platform_suitability_unproven` warning will be present in the dry-run's `warnings[]`. Per P4 it is emitted for PP too, so it is **expected noise, not a finding**.

---

## 3. What a dry-run would return today

Run against NDIS Yarns right now, the draft never reaches the resolver: `isB1GovernedImageQuote` returns false and the draft renders legacy, silently. That is the fail-closed behaviour working as designed — and it is why D7 cannot be evaluated by observation, only by this predicate set.

Were C1 lifted alone (the tempting one-line change), the draft would enter the branch and `select_template` would be called with `p_client_slug='property-pulse'`. The selector would succeed, and NDIS's post would render **PP's background, PP's logo, PP's category badge, PP's footer** — a clean-looking, fully-stamped, entirely wrong card. This is the concrete failure D7 exists to prevent, and it is one line of code away.

---

## 4. Ordered prerequisites for NDIS Yarns (recommendation only — each its own PK-gated lane)

0. **cc-0033 re-plan → D5 closure.** Structurally first (§0): the spine must not carry a published brand-visible defect before it is copied. *(TMR Image lane.)*
1. **Spine Gen v2** — C1+C2 atomically, C3 parameterised from brand data, C4 re-checked. *(Fenced on 4 preconditions; 3 open.)*
2. **NDIS background sourcing + intake** — the `image-harvester` → `image-reviewer` → PK visual gate flow, categories per the workbook (civic/policy, brand-colour wash, abstract data-grid). Closes P6. **Newly identified as a hard prerequisite.** Note the First-Nations cultural-motif category carries a standing cultural sign-off requirement and is *not* in the proven image-agent scope.
3. **Logo promotion** — promote from the 8 fenced `usage='logo'` rows. Closes P7.
4. **Assignment** — bind NDIS to `generic_market_insight_card_1x1_v1` at `visually_approved`+. Closes P5. *(No suitability work needed — P4 already passes.)*
5. **Governance row + `ndis-yarns.json`** — the declarative registry and `c.client_creative_governance` row.
6. **Dry-run** — execute §2's pass condition.

Steps 2–5 are data lanes and can proceed independently of 0 and 1; **step 6 cannot run until both 0 and 1 land.** Nothing above is scheduled, sourced, promoted, or activated by this document.

---

## 5. Open questions for PK

- ~~**OQ1 — P4 unclosed.**~~ **CLOSED 2026-07-10** — passes with the `platform_suitability_unproven` warning, which PP also emits. See §2 Half B.
- **OQ2 — does C3 belong in D7 or D6?** A brand-visible literal that survives a green render is arguably a D6 chokepoint (it *is* a PP identity literal in the governed path) **and** a D7 failure. It is currently in neither register entry. Recorded here under both; PK to assign.
- **OQ3 — the register's NDIS summary is wrong (§1a).** Routed to `register-reconciler` alongside the D6 census, or corrected in place?
- ~~**OQ5 — is the A-OQ1 reversal real?**~~ **RESOLVED 2026-07-10 — PK confirmed directly: overprint is a BLOCKER, PP Static TMR Done withheld.** The ruling was correctly relayed. DoD lines 15 and 25 are stale and need an additive supersede; that recording is Fixups', not this lane's. See §0.
- **OQ4 — no generic template is `platform_safe`/`production_proven` on any platform.** All 44 suitability rows across the 11 generic `image_quote` candidates are `candidate`. PP renders in production on that footing today. In scope for this lane only as an observation; it looks like a separate promotion/proof gap, not a second-brand blocker.
