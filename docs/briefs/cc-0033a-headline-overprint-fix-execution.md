# Brief cc-0033a — Close the governed-path headline/subtitle overprint (execution lane)

**Created:** 2026-07-10 Sydney
**Author:** orchestrator (image lane)
**Executor:** `ef-builder` (isolated worktree) — nothing runs until PK Gate 1
**Status:** **HELD at Gate 1** (PK, 2026-07-10) — ~~does not open until **cc-0037 deploys**~~ **← SUPERSEDED, see below.** Brief is complete; no further work pending on this lane.

> **⚠ GATE SUPERSEDED — PK ruling, 2026-07-10 (recorded by the cc-0037 lane as a forward correction; the original condition is struck above, retained as evidence).**
> The original gate ("does not open until cc-0037 deploys") **deadlocked** against PK's later ruling that cc-0037 waits for cc-0033a. Both lanes modify `image-worker/b1_production.ts` + its test file and require the same edge-function deploy; neither could start.
> **PK ruled (b) SERIALISE, then confirmed this supersession: cc-0033a goes FIRST.** It opens, lands, and deploys on its own minimal diff. **cc-0037 is PARKED** behind it and will rebase + re-run its full chain afterwards (`docs/briefs/cc-0037-image-worker-supervised-smoke-entrypoint.md`).
> **Consequence PK accepted, stated explicitly:** cc-0033a now deploys a BLOCKER fix to the live governed render path **with no supervised smoke surface available** — `governed_image_quote_smoke` does not exist until cc-0037 ships. Post-deploy verification therefore rests on this lane's pre-deploy P1 probe evidence (4 renders, production Creatomate key, no production surface; worst admissible 90-char input rendered 3 clean lines) plus observation of real production renders. Rollback stays clean and independent of cc-0037.
> **Gate 1 on this brief remains PK's, and the deploy gate remains a HARD STOP.** This correction removes the *ordering* blocker only; it grants no authority to open the lane.
**Result file:** `docs/briefs/results/cc-0033a-headline-overprint-fix.md` (on completion)
**Predecessor:** `docs/briefs/cc-0033-headline-overprint-replan-v2.md` (the re-plan) · probe evidence `_harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md`

---

> **Lane classification (CCF-02):** SAFETY_GATE · **Tier T3** · **SEVERITY: BLOCKER** — changes the live governed `image_quote` render plan and requires an image-worker deploy. Deploy is a HARD STOP for PK.

> **A-OQ1 REVERSED (PK, 2026-07-10): the overprint is a BLOCKER, not a named carry.** *PP Static TMR Done* is **WITHHELD — the label is FALSE.* New evidence: a **published Facebook card dated 8 July 2026** shows the defect live in production. This lane independently confirms that card and measures the true exposure below. D5 is the top blocker, not a distant Ultimate gate.

> **PK verdicts recorded 2026-07-10 (visual gate — the deciding act):**
> · `P1a_control.png` — **FAIL** (the live defect, reproduced: the subtitle prints through "selective").
> · `P1c_autoshrink.png` — **PASS.** Auto-shrink is accepted as the design.
> · Consequence: **P1c is primary. `Subtitle.y` is optional margin only** — not a safety requirement.
> · **The execution lane is NOT open.** Gate 1 on this brief, and the deploy gate, remain PK's.

## Task

Close **D5**'s named carry: the headline/subtitle overprint that affects **7 of 17** real governed PP static renders (41%). Apply the fix P1 proved — a winner-scoped **layout guard** injected into the Creatomate template-mode `modifications` map, bounding the headline's height and letting its font auto-shrink to fit.

No provider-template write. No writer-prompt change. No tightening. **No `max_lines` constant anywhere.**

## Source context

- `_harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md` — probe P1 (4 renders, PK-authorised; production key, no production surface). Establishes: geometry keys **are** honoured in template-mode modifications (`Subtitle.y` applied, P1b); `font_size: null` + `font_size_minimum`/`font_size_maximum` against a bounded `height` **is** accepted and auto-shrinks (P1c); the fix holds at the **worst admissible input** — a 90-char headline, the maximum `assertHeadlineWithinGate` admits — rendering 3 clean lines (P1d).
- `supabase/functions/image-worker/b1_production.ts:191-260` — `buildTmrRenderPlan`. `modifications` is built `{...slotMods, ...textFields}` and typed `Record<string, string | number>`.
- `supabase/functions/image-worker/b1_production.ts:152-161` — `TMR_WINNER_TEXT_FIELDS`, the fail-closed winner map. An unmapped winner already **throws** (`tmr_winner_unmapped`). The layout guard attaches to the same winner key, inheriting that fail-closed property.
- `supabase/functions/image-worker/b1_production.ts:35-40, 75-85` — `B1_HEADLINE_MAX_CHARS = 90`, comment `PROVISIONAL / to_be_calibrated`, enforced fail-loud by `assertHeadlineWithinGate`.
- `supabase/functions/image-worker/b1_production_test.ts` — 22 `Deno.test` cases; hermetic.
- `docs/governance/pp-tmr-definition-of-done-v1.md:25,54` (committed, `8199153`) — cites `max_lines: 3` as the "known real fix". **P1 falsifies this.** Not edited here — handoff below.

## Exposure (measured, not proxied) — 7 of 16 PUBLISHED governed cards = 44%

Full record: `_harness/cc0033_headline_calibration/p1_probe/EXPOSURE_AND_MITIGATION.md`.

`Headline.text` binds to **`post_draft.image_headline`** (`index.ts:791` → `branch_b_proof.ts:41-57` → `b1_production.ts:152-161`). **`draft_title` never reaches the card**, so the 76%-of-105-drafts figure measured a column with no binding to the rendered headline. It is not a wider-error version of the true number — it is a different quantity. **There is no 41–76% band; do not propagate 76%.**

Applying the render-validated wrap model to every published governed card: **7/16 overprint (44%)** — Facebook **5/8**, Instagram **2/8**. The governed path began 2026-06-26 and the legacy path cannot exhibit the defect (below), so 16 is the **entire exposed population**, not a sample. PK's 8 July Facebook card is in the set, predicted independently by the model at 74 chars → 4 lines. **Every governed card that overprints was published.**

## Mitigation lever — VERIFIED, and the assumption fails twice

**Flipping `c.client_creative_governance` (PP, `image_quote`) to `enabled=false` would do nothing at all.** Not "cost governance and fix nothing" — *nothing*.

- `image-worker` never reads that table. Its header states it: *"NO read or flip of c.client_creative_governance.enabled"* (`index.ts:30`, `:652`). The governed branch is gated by `isB1GovernedImageQuote(clientId)` (`index.ts:781`), a comparison against the hardcoded `B1_GOVERNED_CLIENT_ID` (`b1_production.ts:28`). `select_template` / `resolve_slot_assets` do not consult it either. Only `video-worker` does.
- **And the legacy path is clean.** `buildImageQuoteScript` (`index.ts:536-549`) has **no subtitle element at all** — one headline text element, `font_size: 62px`, `width: 860px`, **`height: '480px'`**, `y_alignment: '50%'`. Bounded box, nothing beneath it. It cannot overprint.

**Therefore there is no cheap flip.** Routing PP to legacy needs a code change + image-worker deploy — *the same deploy the fix needs* — and buys a worse card. **Recommendation: do not propose a flip. Ship the fix.**

**Two findings fall out, both bigger than this lane:**

1. **DoD criterion A1 does not measure what it claims.** Its machine-check is `(PP, image_quote).enabled = true` → PASS. The flag is read by nothing on the image path; the check passes against an **inert row**. `image_quote` is gated by a hardcoded client-id constant, not by the governance table. This is the **third instance in this lane** of the same disease — `max_chars: 90`, the capability contract's `limits`, and now A1: *a declared control the production path does not consult.* → handoff.
2. **`B1_GOVERNED_CLIENT_ID` is a load-bearing D6 chokepoint.** A second brand cannot be governed by configuration on this path.

## The change (exact)

**One file: `supabase/functions/image-worker/b1_production.ts`. Plus its test file.**

1. **Widen the modifications type** — `Record<string, string | number>` → `Record<string, string | number | null>`, on `TmrRenderPlan.modifications` and the local in `buildTmrRenderPlan`. Required: `font_size: null` is how Creatomate selects auto-fit, and it is **not expressible** in the current type. (Surfaced by P1, not by the compiler — the map is built by spread.)

2. **Add a winner-scoped layout guard**, parallel to `TMR_WINNER_TEXT_FIELDS`:

```ts
// Layout guard — the STRUCTURAL fix for the headline/subtitle overprint (cc-0033a).
// The provider template under-specifies the card: `Subtitle` carries no `y` (it falls back to
// the provider default, 50% → 540px) while `Headline` is top-anchored at 26% with NO height
// bound, so it grows downward without limit and prints through the subtitle. Bounding the
// headline's height and letting its font auto-shrink makes overflow structurally impossible:
// no headline length can collide, so nothing has to be rejected to keep the card readable.
//
// These values are geometry for template `generic_market_insight_card_1x1_v1` ONLY. They are
// NOT a portable constant and NOT a line budget — a line count is a CONSEQUENCE of this
// geometry, never an input to it. (The earlier "max_lines: 3" was the budget implied by the
// OLD geometry; it does not survive the fix. Do not re-derive it, do not encode it.)
// Evidence: _harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md
export const TMR_WINNER_LAYOUT_GUARD: Record<string, Record<string, string | number | null>> = {
  'generic_market_insight_card_1x1_v1': {
    'Headline.height': '22%',           // top 26% + 22% = bottom 518.4px, above Subtitle's 540px
    'Headline.font_size': null,         // null => auto-fit within the bounded height
    'Headline.font_size_minimum': '30 px',
    'Headline.font_size_maximum': '74 px', // the template's authored size; never grow past it
  },
};
```

3. **Merge it into the plan**, between slot mods and text fields, in `buildTmrRenderPlan`:

```ts
const layoutGuard = TMR_WINNER_LAYOUT_GUARD[winnerName] ?? {};
const modifications: Record<string, string | number | null> = {
  ...(slotMods as Record<string, string | number | null>),
  ...layoutGuard,
  ...textFields,
};
```

Order is deliberate and must be preserved: `slotMods` carries `Background.source` / `Logo.source` / `Scrim.opacity` (no overlap); `textFields` carries `.text` only (no overlap). The guard sits between them so neither can silently override geometry. **A winner with no guard entry gets `{}` — behaviour identical to today**, and an *unmapped* winner still throws upstream at `TMR_WINNER_TEXT_FIELDS`.

4. **Correct the misleading comment** on `B1_HEADLINE_MAX_CHARS`. It is not, and never was, a fit guarantee — it never fired on any of the 17 real renders, and every collision passed it. Its real role after this change is an **outer sanity bound** that keeps input far above the auto-shrink floor (at 90 chars the font lands nowhere near 30px — P1d). Retire `PROVISIONAL / to_be_calibrated`; say what it does.

**PK-pending, one line:** whether to also set `'Subtitle.y': '60%'` in the guard. See Decision 1.

## Scope

**In scope:** the four items above; hermetic tests; the deploy plan.
**Out of scope:** the contract `limits` shape and the ai-worker writer budget (→ **cc-0033b**, unopened); `assertHeadlineWithinGate` reading the contract; format selection / TMR spine / render selection; `contract_validation` (`limit_source` stays `'fallback_constant'`); any non-PP client or non-`image_quote` format; carries C1/C2/C3; background promotion; cc-0035; Spine Gen v2.

## Allowed actions

- `ef-builder` in an **isolated worktree**: the edits above + tests. Local only.
- `deno check` + the image-worker test suite (hermetic, no network).
- Prepare — not execute — the deploy: `supabase functions deploy image-worker --no-verify-jwt`.

## Forbidden actions

- **No `max_lines` constant, no line-count input, no `3`.** A line count is an output of geometry here. Encoding it repeats the disproven `B1_HEADLINE_MAX_CHARS` mistake in a new unit.
- **No provider-template write.** Creatomate exposes no template create/update API; a UI hand-edit of a live asset is unversioned and unreviewable — its own PK gate, not this lane's.
- **No tightening.** R2 (deterministic wrap enforcement) is **moot**: it would fail ~41% of live headlines; R1 fails zero. Do not reintroduce it.
- **No writer-prompt / contract edit** — that is cc-0033b.
- **No runtime JSON import** (`registry-schema-v2.md:183-184, 227`).
- **Deploy / merge / migrate = HARD STOP for PK.** `deploy_edge_function` is deny-listed. Any deploy MUST carry `--no-verify-jwt` or it flips `verify_jwt`→true and breaks `x-series-key`-only callers.
- **Do not edit `docs/governance/pp-tmr-definition-of-done-v1.md`** — committed governance; correction is an additive dated SUPERSEDE block owned by the record-reconciliation lane. Handoff below.
- **Do not cut a register pointer.** v5.47 is committed at `6001d18`; cc-0035 holds a claim on v5.48.
- **R4 / shared worktree.** Six sibling lanes share this tree. Re-verify HEAD before any commit. Stage by **explicit pathspec only** — `.claude/settings.json` and `docs/briefs/pp-video-tmr-template-workbook-v1.xlsx` are ownerless tracked-dirty and would be swept by `git add -A`. Never push another lane's unpushed commit.

## Success criteria

- `deno check` clean; image-worker suite green, including **new** cases: guard present for the mapped winner · guard absent → `{}` and byte-identical modifications · guard **not** overridden by `slotMods` or `textFields` · `null` survives into the map.
- The change set is **exactly** `b1_production.ts` + `b1_production_test.ts`. Nothing else.
- `branch-warden` → `safe`. `db-rls-auditor` → `pass` (T3 chain requires it; **the DB is not this lane's subject** — no schema, no DML, no grants, no RPC change. Substitution named per CCF-02 R1).
- External review pinned to the final diff `sha256`, verdict clean.
- Deploy command prepared with `--no-verify-jwt`, rollback written and validated **before** apply.
- Post-deploy: one governed render on a real PP `image_quote` draft renders 3 clean lines, no overprint. **PK visual verdict is the deciding act.**

## Deploy collision — cc-0037 owns uncommitted changes to the SAME files

**Verified at HEAD `2d8b092`:** `supabase/functions/image-worker/b1_production.ts` (+27), `b1_production_test.ts` (+40) and `index.ts` (+133) are **already modified and staged in the shared worktree** by the parked **cc-0037** lane (supervised image-render probe harness; `B1_SMOKE_LABEL`, `assertExpectedProviderTemplate` — already imported at `index.ts:338`). cc-0037 holds a clean T3 chain at PK's deploy gate, external review pinned to `010abb01…dee4`.

This is not only a deploy collision — it is a **file collision**. cc-0033a edits `b1_production.ts`, which cc-0037 has already changed and staged. Consequences:

- **Two lanes cannot deploy `image-worker` concurrently**, and cc-0033a cannot cut a clean diff of `b1_production.ts` without inheriting or conflicting with cc-0037's staged edits.
- **cc-0037's external review is pinned to a hash that does not include cc-0033a's change.** Combining them into one worker version **invalidates that review** — it must be re-run on the combined diff (contract rule 1 + `reviewed_input_hash`).
**PK RULING 2026-07-10: SERIALISE.** cc-0037 deploys first; cc-0033a then rebases onto the post-cc-0037 HEAD and runs its own full T3 chain. Consequences for this lane:

- cc-0037's external review (`010abb01…dee4`) **stays valid** — its diff is unchanged. Combining would have invalidated it; serialising does not.
- cc-0033a's `ef-builder` worktree must be cut **from the commit that contains cc-0037's merged change**, not from `2d8b092`. Cutting early reproduces the file collision.
- cc-0033a's external review must be pinned to **its own post-rebase diff hash**. No review of the pre-rebase diff carries across.
- **cc-0033a is BLOCKED-ON-cc-0037, and cc-0037 is parked at PK's deploy gate.** The blocker cannot start until PK releases a lane this lane does not own. **Standing risk: the defect keeps publishing while it waits** — see below.

**Bleed rate during serialisation (stated so nobody has to re-derive it).** PP publishes governed `image_quote` cards near-daily. Measured overprint rate is **44% overall, 63% on Facebook**. Every governed card that overprints has reached production. Each day cc-0033a waits is, in expectation, roughly one more published card with a ~44% chance of the defect. **This is not an argument against serialising** — it is the cost of it, and PK should be the one holding it, not discover it later.

**Zero-deploy interim levers, if PK wants the bleeding stopped while cc-0037 clears** (none are free; none are this lane's to run): (a) shorten `image_headline` on approved-but-unrendered PP drafts (`image_status='pending'`) so they wrap to ≤3 lines — a production DML, per-draft, **T3**; (b) pause PP publishing — stops good cards with the bad. **No code-free flip exists** (see above: the governance row is inert on this path). Recommendation: **do neither by default.** Surface them only because "wait for cc-0037" should be a chosen cost, not an assumed one.

**Deploy mechanics (when the gate opens).** Do **not** request a `deploy_edge_function` deny-lift. `drift-check` reads GitHub `main`, not local disk, so an unpushed commit classifies **A-LE** and `safe-deploy.sh` hard-blocks with no override. **Push first**, refresh drift to **B-FD**, then `safe-deploy.sh image-worker --allow-warn`. Validate the rollback command form **before** the forward deploy. (This is the same pattern the video-worker v3.6.0 lane proved — a push clears the A-LE false-block.)

## Rollback

`git revert` the commit + redeploy the prior image-worker version (`--no-verify-jwt`). The guard is additive and winner-scoped: reverting restores today's exact modifications map. No DB state, no migration, no asset, no governance row is touched — **nothing to un-apply.**

## Stop condition

Report per `docs/briefs/_template_result.md`, then stop. **Deploy is a separate PK gate.**

---

## PK decisions required at Gate 1

1. **Gate 1 on this brief** — the execution lane does not open without it.

2. ~~cc-0037 vs cc-0033a: serialise or combine?~~ **ANSWERED: serialise** (PK, 2026-07-10). cc-0033a is now **blocked on cc-0037's deploy gate**, which PK holds in another lane. **Remaining ask: release cc-0037, or tell this lane to keep waiting.**

3. ~~Does `cc-0033b` open now or later?~~ **ANSWERED: later** (PK, 2026-07-10). The contract `limits` shape + ai-worker writer budget are deferred; the defect closes without them. **Carry it** — `contract_validation.limit_source` stays `'fallback_constant'` until cc-0033b runs, so the capability contract remains decorative on this path. That is now a known, chosen state rather than an unnoticed one.

4. **`Subtitle.y: '60%'` — in or out?** *(Answered in principle: "optional margin only." Recorded default below; overturn it with one word if you'd rather have the margin.)*
   At `Headline.height: 22%` the headline box bottom is **518.4px**, provably above the subtitle's default **540px** — the offset buys margin, not safety, and margin costs a visibly gappy card under a short headline (`P1d_final_worstcase.png`). **Ships OUT unless PK elects otherwise.** If you want to see the like-for-like before it ships, one render (22%, no offset, worst-case headline) settles it — not spent without your say-so.

## Handoffs

- **Record reconciliation (TMR Fixups lane) — `max_lines: 3` RETIRED as a stated capability (PK, 2026-07-10).**
  The DoD is **committed at `8199153`** and cites it at `pp-tmr-definition-of-done-v1.md:25` and `:54`. **This lane does not edit that file.** The instrument is an **additive dated SUPERSEDE block**, never an in-place rewrite. Proposed text, for TMR Fixups to apply under its own gate:

  > **SUPERSEDE — 2026-07-10 (cc-0033a probe P1).** The A-OQ1 row and the cc-0033 hold-note above
  > describe the overprint's fix as `max_lines: 3`. **That capability statement is retired.** `3` was
  > never a property of the card: it was the line budget *implied by* `Subtitle.y = 50%` together with
  > an unbounded `Headline` height. Probe P1 (`_harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md`,
  > 4 renders) shows the budget is **4** once the subtitle is offset and **~8** once the headline height is
  > bounded with auto-shrink — i.e. the number changes the moment the defect is fixed, so it cannot be the
  > capability. The real fix is a **winner-scoped layout guard** (`Headline.height` + `font_size: null` +
  > min/max) injected into the Creatomate template-mode modifications map: no provider-template write, and
  > **no headline is rejected** (the previously-considered wrap-enforcement route would have failed ~41% of
  > live headlines). **A-OQ1 is unaffected** — the overprint remains a named carry, closure gated at D5.
  > Its stated basis changes from "a known real fix (`max_lines: 3`)" to "a **proven** fix (cc-0033a),
  > pending its own T3 lane."
  >
  > **A-OQ1 IS REVERSED (PK, 2026-07-10): BLOCKER, not named carry.** *PP Static TMR Done* is
  > **WITHHELD (label FALSE)**. Basis: a **published** Facebook card (8 July 2026) shows the defect live.
  > The carry ruling rested on the framing "7/17 test cards"; that framing was wrong. Measured truth:
  > **7 of 16 PUBLISHED governed cards overprint (44%)** — FB 5/8, IG 2/8 — i.e. *every* overprinting
  > governed card reached production. Evidence: `EXPOSURE_AND_MITIGATION.md`. The `76%` proxy is void:
  > it measured `draft_title`, which has **no binding** to `Headline`.
  >
  > **Criterion A1 additionally does not measure what it claims.** Its check —
  > `c.client_creative_governance (PP, image_quote).enabled = true` — reads a row that **nothing on the
  > image path consults** (`image-worker/index.ts:30, :652, :781`; gate is the hardcoded
  > `B1_GOVERNED_CLIENT_ID`). A1 passes against an inert row. `image_quote` is gated by a constant, not
  > by governance. Also a **D6 chokepoint**. → this needs its own reconciliation, not a footnote.

  Two notes for the reconciler. First, the supersede on `max_lines: 3` *strengthens* the record: when A-OQ1 was accepted the fix was **asserted**; it is now **demonstrated**. Second, the A1 finding is the **third instance in one lane** of a single pattern — `max_chars: 90`, the contract's absent `limits`, and now A1: **a declared control that the production path does not consult.** That pattern, not any one of its instances, is the thing worth recording.
- **cc-0033b** — the capability loop: give the vendored contract a `limits` shape so `contract_validation.limit_source` resolves `'contract'`, and carry a budget into the ai-worker prompt. Note the shape must express something the render path can *consult*, and **not** a line count.
- **Coverage gap, not just a missed defect.** `pp-static-tmr-cross-platform-quality-proof-v1-result.md` declared the surface production-ready and logged four carries while passing overprinting cards; it never inspected headline wrap. Worth one line in the D5 defect register.
- **Vendored-contract drift** (unresolved, out of lane): `creative_contract.ts:138` pins `provider_template_id: 'fb9820f8-…'`; the live governed render resolves through TMR to `48cba556-…`. Two provider templates named by one governed path. → `register-reconciler` / `creative-graph-auditor`.
