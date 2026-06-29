# FVI Slice 3B — `quote_card.v1` template inventory + selector-model decision brief

> **Status:** read-only investigation + design/decision brief **only**. **No binding, no render, no
> publish, no production enablement.** No `property-pulse.json`/`creative_contract.ts`/schema/runtime/
> DB/dashboard change, no Creatomate API call, no deploy. Read-only inspection + this docs note.
> **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 8e2c8be0f2fdbf85dda61a6a26191a96efd3b48b`; register **v4.23**.
> **Builds on:** `docs/briefs/format-variant-quote-card-template-binding-feasibility.md` (Slice 3A,
> verdict NEEDS_TEMPLATE_DEFINITION + co-requisite NEEDS_SCHEMA_DECISION).

---

## Slice-C verdict: **READY_FOR_SELECTOR_DECISION_RECORD**
The **selector model can be decided now** (it is fully analyzable from code — Task B). The **template
inventory still cannot be documented from local sources** (Task A): `news_quote_insight_1x1_v1` has
no field/element inventory anywhere in-repo, and fetching it requires a Creatomate read (runtime
secret) or a governed render — both out of this slice's scope. So the next durable step is a
**selector-model decision record**, with the template inventory deferred to a Creatomate-read /
render slice.

---

## Task A — template inventory: `news_quote_insight_1x1_v1`

| Q | Answer |
|---|---|
| 1. Local field/element inventory? | **NO.** The template (`provider_template_id 490ad9ea-7473-49e4-9d3c-e1ae8a12d790`) is referenced only as prose in 3 docs (`branch-b-lane-b1-v2-expansion-brief.md` §7, the Slice 3A feasibility note, the FVI intake doc). It is **not** in `property-pulse.json`, and **no worker code references it** (truly unwired). |
| 2. If yes, list fields/elements | N/A — none recorded. |
| 3. If no, required inventory checklist | **(below).** The Creatomate dynamic elements of the template must be enumerated and mapped to the `quote_card.v1` field contract before any binding/render. |
| 4. Supports `quote_text` / `attribution`(`speaker_role`) / `topic_label` / `short_context` / `source_context`? | **UNKNOWN** — no element inventory; the name "quote_insight" is suggestive but not verifiable. |
| 5. Compatible with PP style guide? | **Plausibly** (a PP-family B0 1:1 template, same provider/brand as the proven `centred-scrim-1x1`), but **unverified** against the field contract and accessibility/scrim rules. |
| 6. What must be verified before any render proof? | The element inventory (Q3 checklist), the field-contract mapping, governed-asset binding (logo/background), the scrim/legibility + accessibility conformance, and the selector decision (Task B). |

### Required inventory checklist (Task A.3 — to satisfy in a later Creatomate-read / render slice)
For `news_quote_insight_1x1_v1` (`490ad9ea…`), enumerate and record (read-only):
1. **Dynamic element list** — every modifiable Creatomate element name + type (text / image / shape).
2. **Field-contract mapping** — which element carries `quote_text` (req), `attribution`/`speaker_role`,
   `topic_label`, `short_context`, `source_context`, plus governed `logo` + `background` slots.
3. **Constraints per element** — max length / overflow behaviour / required-vs-optional, to reconcile
   with the `quote_card.v1` provisional limits (e.g. `quote_text` ≤ ~140).
4. **Output spec** — aspect ratio (expect 1:1), output mime, dimensions.
5. **Brand/style conformance** — scrim/legibility, palette, safe-area, accessibility (contrast / min
   font / text-over-image) vs `property-pulse-styleguide-v1`.
6. **Asset slots** — logo (`pp_logo_primary`) + background (`bg_*`) bindings via `resolve_brand_assets`.

This checklist is the input to a future declarative **Template-Family variant object** (still
`proof_status:"unproven"` until a governed render — schema §8).

---

## Task B — selector-model decision

### Current state (confirmed read-only)
The only selection is **format-level**: the advisor picks `recommended_format` (`decidedFormat`); the
resolver gates on `resolveCreativeContract(client_id, decidedFormat)` returning the **single**
`news_card` contract only for `(PP, image_quote)`; ai-worker then **additively stamps**
`draft_format.contract` ("no effect on format selection, the prompt, or rendering"). **There is no
variant-level selector** — `(client, format)` is **1:1** with one contract. Multiple variants per
`(client, format)` are unrepresentable today. This is the NEEDS_SCHEMA_DECISION co-requisite from 3A.

### Options

| Option | Benefits | Risks | Data/model changes | Runtime change? | Safe for v0/v1? |
|---|---|---|---|---|---|
| **1 — One active variant per client×format (status quo)** | Simplest, safest; deterministic 1:1; zero governance burden | Can't use quote_card/market_update automatically; they stay defined/unwired | None | **None** | **YES** (it *is* v0) |
| **2 — Explicit variant intent** (creative_intent/draft supplies `variant_key`) | Deliberate selection; resolver picks the exact variant by an explicit input; still deterministic (no AI/scoring); good for Content Studio + series | New gate input threaded creative_intent→draft→resolver; governance for which variants are selectable per (client,format); fallback to `news_card` default when unset | Add `variant_intent`/`variant_key` to creative_intent/draft; resolver gate → `(client_id, recommended_format, variant_intent?)`; registry defines multiple contracts per (client,format) | **YES** — but **additive + opt-in** (default unchanged = news_card) | **YES** as a deliberate, gated step (manual first) |
| **3 — Content-class selector** (classifier/advisor maps topic→variant) | Automatic variant choice by content type (market data→market_update, quote/advice→quote_card, news→news_card) | Needs a governed class→variant map + fallback; misclassification risk; higher complexity; advisor-driven (less deterministic unless strict) | Content-class→variant mapping (governed) + classifier integration | **YES** (selection logic) | **NO** — too much model/governance burden now; defer |
| **4 — Weighted variant mix** (variant mix inside format mix) | Proportional variant variety at scale | Highest governance burden; needs variant-mix config + enforcement (like the format-mix Control Tower) + per-variant proof; non-deterministic allocation | Variant-mix tables/config + allocation + per-variant proof | **YES** (allocation) | **NO** — far future, after explicit-intent is proven |
| **5 — Manual-only variant selection first** (Content Studio explicit; automated stays news_card) | Lowest-risk path to actually USING quote_card; automated scheduling untouched until the selector is proven | Requires the explicit-variant plumbing (overlaps Option 2) scoped to manual/CS; governance for CS-selectable variants | Explicit variant intent on the CS path only | **YES** — but scoped to the manual/CS path; **automated path byte-unchanged** | **YES** — the conservative real-usage path |

### Recommended selector path (conservative)
- **Now: Option 1** — the **automated scheduling path stays on `news_card.v1`**; `quote_card.v1` and
  `market_update.v1` remain `defined`/unwired. Zero runtime change.
- **Next (gated): Option 5 → Option 2** — let `quote_card.v1` (and later `market_update.v1`) proceed
  as **manual / Content-Studio explicit-variant** candidates via an **explicit variant-intent**
  selector input (Option 2 scoped to manual first). The default/automated resolution stays `news_card`
  (fallback when no variant intent is supplied).
- **Defer: Option 3 (content-class) and Option 4 (variant mix)** until explicit-intent (Option 2) is
  proven end-to-end. Do not build automated variant mix before deliberate selection works.

This matches the conservative expectation: **automated stays on `news_card.v1`; quote_card.v1 is a
manual/Content-Studio explicit-variant candidate later; the selector should support explicit variant
intent before any automated variant mix.** No runtime change is proposed in this brief.

---

## Task C — next-slice recommendation

**`READY_FOR_SELECTOR_DECISION_RECORD`.**
- The **template inventory cannot be documented** from local sources (no in-repo element list;
  Creatomate read / governed render is out of scope) → **not** READY_FOR_TEMPLATE_DEFINITION_DOC yet.
- The **selector model can be decided now** (Task B) → record a **PK selector-decision** ratifying
  Option 1 (now) + Option 5/2 (next, explicit variant intent, manual/CS first), deferring Options 3/4.
- **Not** READY_FOR_BINDING_PATCH (both template inventory and a render are still required; schema §8).
- **Not** BLOCKED (the selector is decidable; the template is inspectable later via a Creatomate-read
  slice).

**Suggested sequence after this brief:** (1) PK selector-decision record (declarative); (2) a
Creatomate-read slice to capture the `news_quote_insight_1x1_v1` element inventory (read-only,
authorized) and produce the Template-Definition doc; (3) a declarative Template-Family variant object
(`unproven`); (4) governed render (non-declarative, gated) to satisfy §8; only then (5) a binding
patch + (per the selector decision) the explicit-variant resolver plumbing.

## What must still NOT be claimed
`quote_card.v1` remains **`defined` only** — not governed/renderable/platform_safe/client_enabled/
production_proven. `news_card.v1` remains the **current automated + production-proven** variant
(PP × facebook+instagram). No proof borrowed. No runtime change proposed or made.

---

## Cross-references
- Slice 3A feasibility: `docs/briefs/format-variant-quote-card-template-binding-feasibility.md`.
- Variant records: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md` (§3).
- Template candidate origin: `docs/briefs/branch-b-lane-b1-v2-expansion-brief.md` §7.
- Schema: `docs/creative-library/registry-schema-v2.md` (§3 Variant, §7 Capability Contract, §8 validation).
- Selector / stamping code (read-only): `supabase/functions/{image,ai}-worker/creative_contract.ts`,
  `supabase/functions/ai-worker/index.ts` (resolveCreativeContract @ ~line 988, additive stamping only).
- Register: v4.23.
