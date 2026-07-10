# Brief cc-0033 (re-plan v2) — Close the governed-path headline/subtitle overprint

**Created:** 2026-07-10 Sydney
**Author:** orchestrator (re-plan; supersedes the calibration step of `cc-0033-headline-capability-contract-wiring.md`)
**Executor:** — (nothing executes; this is a Gate-1 plan)
**Status:** draft — awaiting PK Gate 1
**Result file:** `docs/briefs/results/cc-0033-headline-overprint.md` (created on completion of the *execution* lane, not this one)

---

> **Lane classification (CCF-02):** SAFETY_GATE (a defect inside the live governed render path) · **Tier T3** for the execution lane that follows (it changes the governed `image_quote` render plan and requires an image-worker deploy). **This document is T1** — a plan, nothing implemented, probed, deployed, or promoted.

## Task

Re-plan cc-0033 around the real capability. The prior brief's step *"set `B1_HEADLINE_MAX_CHARS` to the calibrated number"* is **disproven and retired**: two real headlines of identical length (69 chars) land on opposite sides of the collision boundary, so no character constant separates them (`_harness/cc0033_headline_calibration/CALIBRATION_FINDINGS.md:59-70`). The capability is a **line budget**, and under today's geometry that budget is **≤ 3 lines**.

This brief establishes (1) what the defect actually is, (2) that a code-side fix exists which needs neither a provider-template edit nor font metrics in the worker, (3) the probe that decides it, and (4) an explicit **RESOLVABLE vs CARRY** finding — which, now that **A-OQ1 is settled as a named carry**, is no longer a question about *Static Done* but about **what it costs to close D5**, the criterion the carry is gated at.

## Source context

- `docs/governance/pp-tmr-definition-of-done-v1.md` — the **accepted DoD of record** (PK Gate 1, 2026-07-10; all seven defaults accepted as written). **A-OQ1 is CLOSED: the overprint is a NAMED CARRY** — *PP Static TMR Done* stands with the defect enumerated, and its closure is gated at **D5**, not Level A. *(Verification note: this file is untracked/uncommitted at the time of writing, carrying a `CLAIMED v5.46` stub. Its existence and content are verified; PK's acceptance is taken from it, not independently witnessed by this lane.)*
- `docs/briefs/cc-0036-pp-tmr-definition-of-done.md` — the source packet. **D5** ("no live governed-path defects") is **DEFECT OPEN — 7/17 overprint**, and is one of the three hard reconciliation gates (D4 drift · D5 defect · D6 chokepoint regression) for *PP Ultimate TMR Done*.
- `_harness/cc0033_headline_calibration/CALIBRATION_FINDINGS.md` — the probe record (3 renders, production Creatomate key, no production surface touched). Model validated 3/3 against real renders. 7 of 17 real governed renders overprint (41%).
- `_harness/cc0033_headline_calibration/generic_market_insight_card_1x1_v1_provider_template_source.json` — provider template `48cba556-0a53-4001-90f0-05420d10efc0`. Verified by re-reading the JSON for this brief: **`Subtitle` carries `x`, `width`, `font_size`, `line_height`, `y_anchor` — and no `y` key.** Every other element on the card has one. `Headline` is `y: 26%`, `y_anchor: 0%` (top-anchored), `font_size: 74`, `line_height: 105%`, and has **no `height` bound** — it grows downward without limit.
- `supabase/functions/image-worker/b1_production.ts:191-260` (`buildTmrRenderPlan`) — the governed render plan. **`modifications` is a free-form `Record<string, string | number>`**, built as `{ ...slot_resolution.modifications, ...textFields }` and handed to Creatomate in template mode. The winner map (`TMR_WINNER_TEXT_FIELDS`, `:152-161`) contributes **field names only, no geometry**.
- `supabase/functions/image-worker/b1_production.ts:35-40, 75-85` — `B1_HEADLINE_MAX_CHARS = 90 // PROVISIONAL / to_be_calibrated`, enforced by `assertHeadlineWithinGate` (fail-loud, no truncation).
- `supabase/functions/image-worker/contract_validation.ts:51-55` — WARN-ONLY; `limit_source` resolves `'fallback_constant'` because the contract carries no `limits` object.
- `supabase/functions/ai-worker/creative_contract.ts:143-149` + `docs/creative-library/property-pulse.json:330` — the contract declares headline `max_chars: 90`, `policy: hard_gate_throw`, self-labelled `PROVISIONAL/to_be_calibrated`.
- `supabase/functions/ai-worker/index.ts:643` — the authoring prompt gives the writer no budget at all: `image_headline: 10-15 word pull quote for the visual overlay`.
- Memory / prior lane fact: **Creatomate exposes no template create/update API**; template geometry can be read via `GET /v1/templates/{id}` but not written. This is why the fix route matters.

## The defect, stated precisely

Three independent facts compose it:

1. `Subtitle` has no `y` → it falls back to the provider default (50% → 540px), confirmed by render.
2. `Headline` is top-anchored at 280.8px with an unbounded height; each line box is 74 × 1.05 = 77.7px.
3. Nothing in the template or the worker relates the two.

So the headline's 4th line begins at 513.9px and ends at 591.6px — **51.6px past the subtitle's top**. Three lines clear by 26px; four collide. The template's own `Headline` placeholder text reads *"Headline goes here in up to two lines"* — it was authored for two.

**`assertHeadlineWithinGate` has never fired on any of the 17 real renders** (longest was 78 chars, limit 90). The declared hard gate is inert, and every collision passed it. The capability contract's `max_chars: 90` reached neither the writer prompt nor the render gate — the number was declared, stamped, and reviewed, but never enforced against the thing it describes.

**`max_lines: 3` is a function of the geometry, not a constant.** It is the budget *given* `Subtitle.y = 50%`. If a fix moves the subtitle down, the budget changes. Any design that hard-codes `3` without pinning the geometry that produced it repeats the original mistake in a new unit.

## The finding that changes the plan

`buildTmrRenderPlan` merges `slot_resolution.modifications` and the text fields into an **untyped, free-form modifications map**. Creatomate template-mode modifications are keyed `ElementName.property`. Nothing in the worker restricts those keys to `.text` / `.source`. **A geometry key such as `Subtitle.y` is therefore expressible at render time, in versioned, reviewable, testable worker code, without touching the provider template.**

This matters because Creatomate has no template-write API: before this observation, the "template-side fix" (option (b) in the probe findings) implied PK hand-editing the template in the Creatomate UI — an unversioned, unreviewable change to a live production asset. It no longer does.

**This is unverified.** Whether Creatomate honours positional/dimensional keys (not just `.text` / `.source`) in template-mode modifications, and whether a bounded-height auto-shrink property exists for text elements, are **assumptions this brief refuses to make**. They are what probe **P1** exists to decide.

## Scope

**In scope (this Gate-1 document):**
1. Retire the char-limit calibration step and record why.
2. Define the candidate designs R1/R2/R3 and the probe P1 that discriminates them.
3. Return an explicit RESOLVABLE-or-CARRY finding — the cost and condition of closing **D5**, given A-OQ1 is settled.
4. Name the PK decisions the execution lane cannot make for itself.

**Out of scope:** any code edit; any probe render (P1 is *planned* here, *run* in the execution lane under its own gate); any deploy; the `limits`-shape / writer-prompt wiring (see "Lane split"); background promotion; carries C1 geo-pairing / C2 scrim / C3 crop; any non-PP client or non-`image_quote` format; reconciling the drift noted below.

## Candidate designs

| | Design | Fix location | Needs font metrics | Needs template write | Effect on a too-long headline |
|---|---|---|---|---|---|
| **R1** | Render-time geometry mod: pin `Subtitle.y` below the headline's maximum extent; bound `Headline` height with auto-shrink if the provider supports it | `buildTmrRenderPlan` (worker code) | no | **no** | renders correctly (shrinks or clears) |
| **R2** | Deterministic wrap enforcement: worker computes the wrap and gates on line count | image-worker + font metrics at the enforcement point | **yes** | no | **fails the draft** (`image_status='failed'`) |
| **R3** | Writer budget only: teach the ai-worker prompt the line budget | ai-worker prompt | no | no | reduces frequency; **guarantees nothing** |

> **P1 RAN 2026-07-10 (PK-authorised). R1 is ALIVE — geometry keys are honoured and auto-shrink works.** Evidence: `_harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md`. Consequences: R2 and R3 are no longer needed to close the defect; **no tightening is required**; PK decision 3 below is **moot**; `max_lines: 3` is the diagnosis, not the fix, and must not be encoded anywhere. The `modifications` type must widen to accept `null` (`font_size: null`). Remaining gate: **PK visual review of `P1c_autoshrink.png`** — the design shrinks the headline font on long headlines, a visible brand change.

**Recommendation: R1, conditional on P1 passing.** It removes the structural under-specification rather than defending against it, needs no font metrics inside a Deno edge function, and — crucially — **is the only option that does not convert a silently-ugly render into a blocked draft**. R3 is a cheap complement (write-to-fit makes the backstop rare) but is not a fix and must not be sold as one. R2 is the fallback if P1 fails, and it carries a real product cost: today's 41% overprint rate becomes a 41% draft-failure rate unless R3 lands first and works.

**Probe P1 (execution lane, own gate):** against `48cba556`, render (a) a control, (b) a 4-line headline with an explicit `Subtitle.y` modification, (c) a 4-line headline with a bounded `Headline` height + auto-shrink. Decides: are geometry keys honoured in template mode? Is there an auto-shrink property? What is the line budget *after* the fix? `_smoke/` only — no `m.post_draft`, no publish, no render-log row. Cost ≈ 3 render credits.

## Allowed actions (for the execution lane this brief proposes)

- Read repo, docs, registers, `m.post_render_log` as evidence.
- Run probe P1 to `_smoke/` only, with the production Creatomate key conveyed by PK (read-only **use**, never printed, never written to disk — CCF-02 R2 secret-handling rider applies: secret is `CREATOMATE_API_KEY`, conveyed by PK at the gate, use-not-change).
- In an **isolated worktree**: implement the design PK selects; hermetic deno tests for the changed pure module.
- Prepare — not execute — the image-worker deploy plan with `--no-verify-jwt` confirmed.

## Forbidden actions

- **Do not resurrect the char-limit calibration.** No `B1_HEADLINE_MAX_CHARS` recalibration as the fix. It is disproven (`CALIBRATION_FINDINGS.md:51-70`).
- **Do not hard-code `3`** as a free-standing constant divorced from the geometry that produced it.
- **Do not hand-edit the provider template** in the Creatomate UI. Unversioned, unreviewable, live, and irreversible-in-practice — PK gate even to propose it.
- **Do not ship a tightening** (R2, or any change that fails drafts) without PK's explicit decision. Tightening converts an ugly render into a blocked draft.
- **No runtime JSON import** — a contract change is a vendored-projection edit only (`registry-schema-v2.md:183-184, 227`).
- **Deploy / merge / migrate is a HARD STOP for PK.** `deploy_edge_function` / `apply_migration` are deny-listed.
- **Out-of-lane holds (do not touch):** background promotion (awaiting PK's "best 2–3 of 7"), carries C1/C2/C3, the fenced PP video B-roll `42211c0f…`, cc-0035, Spine Gen v2.
- **R4 / shared worktree.** Six sibling lanes share this worktree and cc-0035 is a concurrent T3 production write on `m.post_draft`. Re-verify HEAD before any commit; never push another lane's unpushed commit.

## Success criteria (this document)

- PK can answer each open question below with a single decision.
- The disproven step is retired in writing, with the evidence citation, so it cannot be resurrected by a later reader.
- D5 receives a RESOLVABLE-or-CARRY finding with its condition stated — not a hedge.

## Stop condition

Present for PK Gate 1. **Nothing executes** — not P1, not a worktree, not a line of code. On acceptance, the execution lane opens under its own T3 chain (ef-builder → branch-warden → db-rls-auditor → external review pinned to the final diff hash → PK deploy gate).

---

## RESOLVABLE or CARRY — the cost of closing D5

**A-OQ1 is closed: the overprint is a named carry, and *PP Static TMR Done* stands without it.** That decision is not re-opened here. What follows is the finding the carry's closure gate (**D5**) now depends on.

**The defect is RESOLVABLE, and the cost is one T3 lane.** It is not resolvable *inside* this Gate-1 document, and it is not carried by necessity — the carry is a scheduling choice, not a technical constraint.

The evidence: the collision is fully characterised (geometry read, arithmetic closed, model validated 3/3 against real renders); a fix route exists that needs no provider-template write and no font metrics (R1); and the worker code path that would carry it is a pure, already-tested module. The one thing standing between the plan and the fix is probe P1 — three `_smoke/` renders.

**The condition.** If P1 shows Creatomate ignores geometry keys in template-mode modifications, R1 dies. The remaining routes are R2 (a tightening — converts 41% of renders into failed drafts, a product decision PK must make) or a hand-edit of the live provider template (forbidden without a PK gate of its own). **In that branch the carry stops being cheap: D5's closure cost rises from one T3 lane to a product decision about draft-failure rate.** That is the branch worth knowing about before the carry is treated as indefinitely affordable.

**Consequence for the DoD.** `cc-0036` justified the carry as *"a template-calibration bug with a known real fix (`max_lines: 3`)."* That is now precisely correct on the first clause and imprecise on the second: the fix is known **conditionally**, and `max_lines: 3` is the *diagnosis*, not the fix — it is a budget derived from today's geometry, not a lever anyone has yet shown is pullable. The carry stands. Its stated basis should be read as **"a known fix route, pending P1,"** not "a known fix."

## Lane split (recommended)

The original cc-0033 conflated two things. Splitting them lets the defect close without waiting on a contract-design debate:

- **cc-0033a — the defect** (this brief): P1 → R1/R2 → image-worker → PK deploy gate. Closes D5.
- **cc-0033b — the capability loop**: give the vendored contract a real `limits` shape so `contract_validation.limit_source` resolves `'contract'`; carry the budget into the ai-worker authoring prompt (R3). Closes the "governance metadata the production path never consults" pattern named at `CALIBRATION_FINDINGS.md:107-114`. **The `limits` shape must express a line budget bound to a named geometry, not a char count.**

## PK decisions required at Gate 1

1. **Accept the split** (cc-0033a / cc-0033b), or keep one lane?
2. **Authorise probe P1** (3 `_smoke/` render credits, production key conveyed at the gate, read-only use)? Without it, R1 vs R2 cannot be decided on evidence.
3. **Pre-authorise the R2 fallback, or stop for a fresh gate if P1 fails?** R2 is a tightening: it makes ~41% of today's headlines fail their drafts. Recommendation: **stop for a fresh gate** — do not pre-authorise a tightening against a hypothetical.
4. **When is D5's closure scheduled?** A-OQ1 is settled and the carry is in force, so nothing forces this lane to run now. But the carry's affordability rests on R1 surviving P1 (see the finding above), and P1 costs three render credits. Recommendation: **run P1 early even if the fix ships late** — it converts the carry from an assumption into a priced one.

*(A-OQ1 — carry vs blocker for Static Done — was open in the draft of this brief and is now **closed as a named carry** per the accepted DoD of record. It is not a decision required here.)*

## Observations surfaced, not resolved (handoffs)

- **Vendored-contract drift.** `creative_contract.ts:138` pins `provider_template_id: 'fb9820f8-3fee-4448-b324-3d500fa74b40'`, but the live governed render resolves through TMR to `48cba556-0a53-4001-90f0-05420d10efc0` (`render_spec->'tmr'->>'provider_template_id'`, corroborated by the probe fetch). Two different provider templates named by the same governed path. **Not investigated here.** → `register-reconciler` / `creative-graph-auditor`; possibly the same class as the D4 11-vs-9 drift.
- **The v5.27 quality proof passed overprinting cards.** `pp-static-tmr-cross-platform-quality-proof-v1-result.md` declared *production-ready* and logged four carries; it never inspected headline wrap. That is a gap in the proof's coverage, not just a missed defect. → worth a line in the D5 defect register.
- **Harness hygiene (R4).** `_harness/cc0033_headline_calibration/audiotest/` contains `R0_control_no_mods.mp4`, `R1_source_empty.mp4`, `EMPTY_BED_TEST_RESULT.md` — **video/music-lane artifacts sitting inside the cc-0033 harness sub-root**, unstaged. Not this lane's. Attribution or relocation is a separate call; flagged, untouched.
- **Nothing in the unstaged harness dir assumes the disproven approach.** Checked per directive: `CALIBRATION_FINDINGS.md` is the evidence that *disproves* it; the three PNGs are its render proofs; `Montserrat[wght].ttf` and the template/account JSONs are inputs to the validated wrap model. The dir is safe to build on — it is the exhibit, not the error.
