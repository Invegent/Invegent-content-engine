# FVI Slice 3D — `quote_card.v1` Creatomate template inventory (read-only)

> **Status:** read-only template inventory + docs-only record. **No render was produced. No binding
> occurred. No Creatomate API call was made.** No `property-pulse.json`/`creative_contract.ts`/schema/
> runtime/DB/dashboard/migration change, no `execute_sql`, no deploy, no production enablement.
> `quote_card.v1` **remains `defined` only.**
> **Produced:** 2026-06-30 (CE session). **Type:** read-only inventory / docs only.
> **CE state at write time:** `main == origin/main == 15e50714f3e9caccc4f0ddabc02ed77e3111cfef`;
> register **v4.24**.
> **Builds on:** Slice 3A `format-variant-quote-card-template-binding-feasibility.md`
> (NEEDS_TEMPLATE_DEFINITION), Slice 3B `format-variant-quote-card-inventory-selector-model-brief.md`
> (Task A: template inventory not documentable from local sources), Slice 3C
> `format-variant-selector-decision-record.md` (selector PK decision).

---

## Verdict: **BLOCKED** (on read-only Creatomate element-inventory access)

The candidate template's **live element inventory cannot be captured in this environment.** No
Creatomate MCP/connector is available, and reading the template's element list over the Creatomate
REST API would require the Creatomate API key — a **runtime secret** — to be extracted and exposed in
a shell/network call. Per the slice preflight (step 9: *"if Creatomate access would require mutation
or unsafe credential exposure, hard stop and report"*), **no Creatomate call was made.** The template
identity and the *proven-sibling* element contract are recorded below as the best available local
evidence; the candidate's actual elements remain **UNVERIFIED**, so the binding-readiness
classification is **BLOCKED** until an authorized read-only Creatomate template read (or a governed
render) supplies the element list.

This does **not** advance `quote_card.v1`: it remains **`defined` only** — not governed, not
renderable, not platform_safe, not client_enabled, not production_proven.

---

## CI-4 — Creatomate read-only inventory read attempt (2026-06-30, register v4.30)

> **CI-4 verdict: `BLOCKED_NO_SAFE_READ_PATH`.** A read-only Creatomate template-metadata read for
> `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` was **authorized** for this slice but **could not be performed
> safely**, for the same root cause Slice 3D found — now confirmed by direct investigation of the
> integration. **No Creatomate API call was made. No provider mutation, no render, no publish.**
> `quote_card.v1` **remains `defined` / unwired / blocked** — unchanged.

**Prior status (Slice 3D):** BLOCKED — element inventory UNVERIFIED; no safe read path identified.

**Read method attempted (CI-4):** read-only investigation of the local Creatomate integration to find a
safe metadata read path. Findings (no secret printed or stored):
- **Key handling:** `CREATOMATE_API_KEY` is loaded via `Deno.env.get('CREATOMATE_API_KEY')`
  (`supabase/functions/image-worker/index.ts:464`, also `video-worker`) — a **runtime secret held only
  in the Supabase edge-function environment**. It is **not** in the repo (no `.env` present; the name
  appears only as a `Deno.env.get` reference + in docs — the **value never appears anywhere in-repo**).
- **Endpoints used:** the workers call only `https://api.creatomate.com/v2/renders` (render **submit** +
  render-**status** GET), each with `Authorization: Bearer <runtime key>`. There is **no
  template-metadata read endpoint** (`GET /v1/templates/{id}`) wired anywhere in the codebase.
- **No connector:** there is **no Creatomate MCP/connector** in this session (the only render-provider
  MCP is HeyGen HyperFrames).
- **Why no safe path:** performing `GET /v1/templates/490ad9ea…` requires the `CREATOMATE_API_KEY`.
  The only ways to obtain it here are (a) extract the runtime secret and place it in a local
  shell/network call — **unsafe credential exposure, explicitly forbidden**; or (b) run the read inside
  an edge function that already holds the key — but **no read-only template-metadata endpoint exists**,
  and creating/deploying one is **out of this slice's scope** (no runtime edit, no deploy). Invoking the
  existing render path would **create a render** — forbidden. So **no safe read-only path is available**.

**Sanitized inventory result (CI-4):** **none captured** — the read was not performed (no safe path).
The candidate's actual element list remains **UNVERIFIED** (see §2.1). No payload, no secret, nothing to
sanitize.

**Field mapping to `quote_card.v1` (CI-4):** **still UNVERIFIED for every field** (`quote_text`,
`attribution`/`speaker_role`, `topic_label`, `short_context`, `source_context`, suburb/region, callout,
`background_image`, `logo`) — unchanged from §3; no element list to map against.

**Classification (CI-4):** **`BLOCKED_NO_SAFE_READ_PATH`** (not READY_FOR_TEMPLATE_DEFINITION /
NEEDS_TEMPLATE_EDIT / NEEDS_NEW_TEMPLATE — those require the element list; not
BLOCKED_UNSUITABLE_TEMPLATE — suitability is unknown without the inventory).

**Next action (unblock options — each a later, separately-gated slice; the safe access pattern + security controls for these are defined in `docs/briefs/provider-inventory-read-access-pattern-v1.md` — CI-4B, register v4.31):**
1. **CI-4 implementation slice (recommended):** a small **read-only edge function endpoint** that holds
   `CREATOMATE_API_KEY` server-side (Deno.env), calls `GET https://api.creatomate.com/v1/templates/490ad9ea…`,
   and returns **sanitized element metadata only** (names/types/dimensions — no secrets, no render). This
   is a separate PK-gated runtime + deploy lane (out of this docs slice).
2. **Creatomate connector/MCP** that holds the key and exposes a read-only template-metadata tool.
3. **PK runs the read manually** with safe key handling and pastes the **sanitized** element list for
   capture into this doc.

**Proof-gate impact (CI-4):** **none.** `quote_card.v1` does **not** advance — it stays `defined` /
unwired / blocked at `template_inventory_captured`. No binding, no governance, no render proof, no
approval. No proof borrowed from `news_card.v1`.

---

## 0. Creatomate read access — determination (preflight step 8/9)

| Question | Finding |
|---|---|
| Creatomate MCP/connector available? | **NO.** The connected MCP render surface is **HeyGen HyperFrames** (`compose`/`render_video`/`list_projects`/…), not Creatomate. No Creatomate tool exists in this session. |
| Could the template be read via Creatomate REST read-only? | The Creatomate `GET /v1/templates/{id}` endpoint is read-only, **but** it requires the Creatomate **API key** (a runtime secret held in the edge-function environment / Supabase secrets). |
| Would that require unsafe credential exposure? | **YES.** Obtaining the key means extracting a production runtime secret and placing it in a shell/network call — **unsafe credential exposure.** Out of scope and explicitly forbidden by this slice. |
| Decision | **No Creatomate call made.** Hard-stop on Creatomate access per preflight step 9. Inventory assembled from local sources only; the live element list is recorded as **BLOCKED / UNVERIFIED**. |

**How ICE drives Creatomate templates (context, read-only):** the governed B0/B1 *image* path uses
**Creatomate template-mode** — a `{ template_id: <provider_template_id>, modifications, output_format }`
render script, where `modifications` is a flat dict keyed by Creatomate **element names**
(`<Element>.text` / `<Element>.source`). The element keys are defined **per template** inside the
Creatomate-hosted template; ICE code only supplies values for the element names it knows. For a
*wired* template those keys appear in `buildManualModifications`; the candidate is **unwired**, so its
keys are not in the repo. (The *video* path is different — source-mode composition JSON built in code,
not template-mode; not relevant here. See `docs/briefs/render-provider-creatomate-capability-audit.md`.)

---

## 1. Template identity

| Field | Value | Source of evidence |
|---|---|---|
| Provider template id | `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` | `docs/briefs/branch-b-lane-b1-v2-expansion-brief.md` §7; consistent across Slice 3A/3B + the FVI intake doc §3.4 |
| Known name | `news_quote_insight_1x1_v1` | same |
| Provider | Creatomate (composition/template-mode provider) | `render-provider-creatomate-capability-audit.md`; B0 template-mode path |
| Aspect ratio / dimensions | **Expected 1:1 (≈1080×1080)** — *inferred from the `_1x1_` name + the proven sibling `news_static_centered_scrim_1x1_v1`; NOT verified* | naming convention; proven-sibling output (jpg / image/jpeg) `manual_render.ts:52-65` |
| Output format | **Expected `jpg` / `image/jpeg`** — *inferred from proven sibling; NOT verified* | `manual_render.ts:64` |
| Wiring status | **UNWIRED** — PK-authored in B0 (register v3.98), never wired/registered; `0` occurrences in `property-pulse.json`; not referenced by any worker | grep (repo): only 3 prose refs in briefs; `creative_contract.ts` does not reference it |
| Registry status | **Not a registry object** — no variant, no `capability_contract` in `property-pulse.json` | `property-pulse.json` (0 hits) |

---

## 2. Element inventory

**Candidate `news_quote_insight_1x1_v1` (`490ad9ea`) — UNVERIFIED (no read-only Creatomate access).**
The template's modifiable Creatomate element list is **not recorded anywhere in-repo** and was **not**
read live (see §0). The following is therefore the inventory *gap*, plus the proven-sibling pattern
for reference only.

### 2.1 Candidate element inventory — UNKNOWN
| Element class | Candidate (`490ad9ea`) |
|---|---|
| Text elements | **UNKNOWN** — name suggests a quote element (e.g. a `Quote.text` + possibly `Attribution`/`Source`/`Topic`/`Insight`), but the actual element names/types are unverified. |
| Image / background elements | **UNKNOWN** (expected a `Background.source` slot by family convention; unverified). |
| Logo / brand elements | **UNKNOWN** (expected a `Logo.source` slot by family convention; unverified). |
| Shape / scrim elements | **UNKNOWN** (a legibility scrim is expected for a PP-family B0 1:1; unverified). |
| Dynamic / customizable fields | **UNKNOWN** — the `modifications` element-key set is what must be enumerated. |
| Fixed / non-editable fields | **UNKNOWN**. |

### 2.2 Proven-sibling element contract — `news_static_centered_scrim_1x1_v1` (`fb9820f8`) — REFERENCE ONLY
This is the **news-card** template's element set (`buildManualModifications`,
`supabase/functions/image-worker/manual_render.ts:106-121`). It is the analogous shape for a wired
PP-family 1:1 template — **NOT** the quote template's elements. The quote template almost certainly
differs (quote-led, not news-headline-led):

| Creatomate element key | Type | Fed from (PK field) |
|---|---|---|
| `CategoryBadge.text` | text | `category` |
| `Headline.text` | text | `headline` |
| `Subtitle.text` | text | `subtitle` |
| `Location.text` | text | `location` |
| `Date.text` | text | `date` |
| `Footer.text` | text | `footer` |
| `Background.source` | image | governed background asset URL (via `resolve_brand_assets`) |
| `Logo.source` | image | governed logo asset URL (via `resolve_brand_assets`) |

> The proven sibling exposes **6 text elements + 2 governed image slots (background, logo)**. A
> quote-led template would be expected to expose a quote element + attribution/topic, but this MUST be
> verified against `490ad9ea`'s real element list before any mapping is trusted.

---

## 3. Field mapping to `quote_card.v1` — UNVERIFIED

`quote_card.v1` content field contract (FVI intake doc §3.2). Mapping cannot be confirmed without the
candidate's element list (§2.1):

| `quote_card.v1` field | Required? | Maps to a `490ad9ea` element? |
|---|---|---|
| `quote_text` | required | **UNKNOWN** — no verified quote element (the name "quote_insight" is suggestive but unverified). |
| `attribution` / `speaker_role` | optional | **UNKNOWN**. |
| `topic_label` | optional | **UNKNOWN** (the sibling's `CategoryBadge` is the analogue, but not confirmed present here). |
| `short_context` | optional | **UNKNOWN**. |
| `source_context` | optional | **UNKNOWN**. |
| `suburb_region` (optional) | optional | **UNKNOWN**. |
| `callout` (optional) | optional | **UNKNOWN**. |
| governed `logo` slot | (asset) | **UNKNOWN** (expected by family convention; unverified). |
| governed `background` slot | (asset) | **UNKNOWN** (expected by family convention; unverified). |

**Result: field mapping UNVERIFIED for every field.** The "quote_insight" name is consistent with the
intended quote-led treatment, but no element-level confirmation exists.

---

## 4. Brand / style compatibility — PLAUSIBLE, UNVERIFIED

| Dimension | Assessment |
|---|---|
| Property Pulse logo | Expected to bind via a `Logo.source` governed slot (`resolve_brand_assets`, `pp_logo_primary`) by family convention — **unverified** against `490ad9ea`. |
| Colours / brand assets | PP-family B0 1:1 template, same provider/brand context as the proven `centred-scrim-1x1` — **plausibly** style-guide aligned, **unverified**. |
| Readability | Quote-led layout *should* favour large quote type; **unverified** (no element/layout inspection). |
| Mobile-first layout | 1:1 (expected) suits feed/mobile — **unverified dimensions**. |
| No clutter | Intent (FVI §3.3: "short quote only, no clutter") — **unverified** against the actual template. |
| Accessibility concerns | Scrim / contrast / min-font / text-over-image (`property-pulse-styleguide-v1` `accessibility_rules`) **cannot be assessed** without the element list + a render. |

No style-guide *conformance* judgment is made here (that is PK's, and requires a render).

---

## 5. Binding readiness classification: **BLOCKED**

| Class | Applies? | Why |
|---|---|---|
| READY_FOR_TEMPLATE_DEFINITION | **No** | The element list is unknown — a Template-Definition doc cannot be written from verified evidence. |
| NEEDS_TEMPLATE_EDIT | **No** | Cannot assess whether the template needs edits without its current element inventory. |
| NEEDS_NEW_TEMPLATE | **No** | Cannot conclude a new template is required without confirming the candidate's elements are insufficient. |
| **BLOCKED** | **YES** | **Blocked on read-only Creatomate element-inventory access**, which is unavailable in this environment without unsafe runtime-secret exposure (§0). The inventory is the prerequisite to any of the other three classifications. |

**Unblock condition:** an **authorized read-only Creatomate template read** (e.g. a Creatomate
connector/MCP, or a PK-run read of `GET /v1/templates/490ad9ea…` with the key handled safely), **or** a
single governed render of the template — either supplies the element list that resolves §2.1, §3, §4
and lets the classification advance to READY_FOR_TEMPLATE_DEFINITION / NEEDS_TEMPLATE_EDIT /
NEEDS_NEW_TEMPLATE.

---

## 6. Missing proof gates (all remain OPEN regardless of inventory)

Even once the element inventory is captured, **none** of these is satisfied by this slice:

- **registry template/variant object** — no declarative Template-Family variant for the quote treatment exists in `property-pulse.json`.
- **governed ratification** — no PK ratification + style-guide conformance review.
- **render proof** — no governed render (no proven `render_log_id`; schema §8 unmet).
- **visual approval** — none (PK).
- **platform safety** — none (per-platform render / safe-area).
- **explicit variant-intent plumbing** — Option 5→2 (Slice 3C) not built; no runtime selector change.
- **client enablement** — none.
- **production proof** — none.

---

## 7. Explicit non-claims / scope

- `quote_card.v1` remains **`defined` only** — **NOT** governed/renderable/platform_safe/
  client_enabled/production_proven. **No proof is borrowed from `news_card.v1`** (a distinct variant).
- `news_card.v1` remains the **current automated + production-proven** variant (PP × facebook +
  instagram only) — unchanged, not broadened.
- The candidate template `news_quote_insight_1x1_v1` (`490ad9ea`) remains **unwired and unproven**.
- **This slice is read-only inventory / docs only:** no render was produced, no binding occurred, no
  Creatomate API call was made, no `property-pulse.json`/`creative_contract.ts`/schema/runtime/DB/
  dashboard change, no deploy, no production enablement.

---

## 8. Recommended next gate

1. **Authorized read-only Creatomate element read** (a Creatomate connector/MCP, or a PK-run safe key
   read) → enumerate `490ad9ea`'s element list → resolve §2.1/§3/§4 → re-classify (§5). *(blocked here)*
2. Only then a **Template-Definition doc** + a declarative **Template-Family variant object**
   (`proof_status:"unproven"`) in `property-pulse.json` (the only schema-clean declarative step).
3. A **governed render** (non-declarative, separately gated) to satisfy schema §8 before any
   `capability_contract.maps_to_variant`.
4. Per the Slice 3C decision: the **explicit variant-intent (Option 5→2)** resolver plumbing is a
   later, separately-gated runtime slice that must not change the automated `news_card.v1` default.

---

## Cross-references
- Slice 3A (feasibility): `docs/briefs/format-variant-quote-card-template-binding-feasibility.md`.
- Slice 3B (inventory/selector brief): `docs/briefs/format-variant-quote-card-inventory-selector-model-brief.md`.
- Slice 3C (selector decision): `docs/briefs/format-variant-selector-decision-record.md`.
- Variant records: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md` (§3 quote_card.v1).
- Template candidate origin: `docs/briefs/branch-b-lane-b1-v2-expansion-brief.md` §7.
- Proven-sibling element contract (read-only): `supabase/functions/image-worker/manual_render.ts:106-121` (`buildManualModifications`).
- Creatomate provider mechanism: `docs/briefs/render-provider-creatomate-capability-audit.md`.
- Schema: `docs/creative-library/registry-schema-v2.md` (§3 Variant, §7 Capability Contract, §8 validation).
- Register: v4.24 (no register bump in this slice — inventory note only).
