# Creative Intake Operator Flow v1 (design brief — docs/design only)

> **Status:** design brief **only**. **No UI built, no runtime change, no Content-Studio change, no
> format/variant enabled, no provider API call.** No `property-pulse.json`/`creative_contract.ts`/
> `registry-schema-v2.md`/schema/runtime/DB/migration/dashboard change, no `execute_sql`, no render,
> no publish, no Creatomate/HeyGen call, no deploy, no production enablement, no GFCP Layer 3, no
> template binding, no quote_card/market_update render proof.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design (+ register record).
> **CE state at write time:** `main == origin/main == 44544f4e2f8a48c263ab0b274f5bcdc68c6075a1`;
> register **v4.25**.
> **Purpose:** define the future dashboard/operator flow for **creating and proving new creative
> templates and variants across providers** (Creatomate, HeyGen, future), in an operator-friendly way
> that never lets an unproven template/variant become executable. This brief decides direction; it
> builds nothing.

---

## 0. Where Creative Intake sits (the missing front-of-house)

The shipped/decided layers answer *consumption*; **Creative Intake** is the *production* front-of-house
that must exist **before** any of them can offer a new template/variant:

| Layer | Answers | Status |
|---|---|---|
| **GFCP** | Is `platform × format` globally possible / proven / blocked / conflicted? | shipped (v4.19/v4.20) |
| **Client Overlay** | Can *this client* use that `platform × format` right now? | shipped (v4.21) |
| **FVI** | Is the *exact* creative variant eligible? | pilot (v4.22/v4.23) |
| **Content Studio (guidance)** | How does manual creation *request* a format/variant safely? | guidance v1 (v4.25) |
| **→ Creative Intake (this brief)** | How does an operator **create and prove** a new template/variant before Studio can execute it? | **design only** |

**Foundational rule (binding):** Creative Intake **creates and proves**; it never enables-by-creating.
A new template/variant starts `proposed` and advances **only** as real evidence is captured. `defined`
≠ executable; "provider template exists" ≠ governed/renderable; "rendered once" ≠ platform_safe;
production_proven needs real **publish** evidence. **AI/operator proposes; the gates + PK approve.**

---

## 1. Operator goal

The operator wants to **create a new creative template or variant without knowing backend
architecture**. They express intent in plain terms ("I want to make a new creative template") and ICE
guides them through the rest. Supported operator actions (v1 scope of the *flow*, not the build):

- **Create a new creative template** (a provider template treatment new to ICE)
- **Create a new format variant** (a new `variant_key` for an existing `ice_format_key`)
- **Link an existing provider template** (register a provider-hosted template ICE doesn't yet model)
- **Request a provider-specific template inventory** (capture the provider's element/field model)
- **Submit for governance** (style-guide / compliance / persona-voice review)
- **Run a smoke test** (a controlled, non-publishing render to prove renderability)
- **Request visual approval** (PK sign-off on the rendered result)
- **Promote after proof** (advance proof state only when evidence supports it)

> The operator never edits the registry, code, or DB directly. The flow records declarative intake +
> real evidence; promotion is gated.

---

## 2. Intake flow stages (future dashboard flow)

### Stage 1 — Choose scope
`client / brand` · `platform` · `format` (`ice_format_key`) · `variant` (existing) **or** new variant
· `manual-only` vs `automated-candidate` · `provider` (Creatomate / HeyGen / future). The scope choice
seeds the provider adapter (Stage 3) and the gate set (Stage 6).

### Stage 2 — Template requirements (provider-neutral intent)
- **output type:** static image · animated image · video · avatar video · voice video · carousel
- **size / aspect ratio** (per target platform; see §platform sizes)
- **duration** (if video)
- **number of fields** + the field list:
  - **required text fields**
  - **image / background slots**
  - **logo / brand slots**
  - **avatar / persona fields** (if HeyGen / avatar)
  - **voice / narration fields** (if voice provider)
  - **animation fields** (if animated)
  - **audio / music fields** (if applicable)
  - **captions / subtitles** (if applicable)

This stage is the **provider-neutral input intent**. It is mapped to concrete provider fields in
Stage 4 via the Stage 3 inventory.

### Stage 3 — Provider-specific inventory (adapter-shaped, NOT one schema)
The intake captures a **different inventory model per provider** (it must not pretend providers share a
template model):

**Creatomate (composition-based):**
- `template_id` / `provider_template_id`
- **element list** (Creatomate element names + types)
- dynamic **text / image fields** (the `modifications` keys, e.g. `Headline.text`, `Background.source`)
- dimensions · duration (if video) · output format (jpg / mp4)
- modifiable vs fixed fields
- static vs animated
- render constraints (overflow / required-vs-optional / safe-area)

**HeyGen (identity-based):**
- avatar / **talking_photo_id** (or avatar id)
- **voice_id**
- scene / background
- script / narration (TTS text)
- language / accent (if relevant)
- duration constraints
- **avatar / persona governance** (which avatar identity is approved for this brand/use)
- provider safety constraints

**Future providers:**
- provider type / `renderMode` (composition vs identity vs other)
- required **input contract**
- **output contract**
- supported formats
- proof / evidence fields

> **Reality note (read-only, grounding):** today ICE drives Creatomate **image** templates in
> template-mode (`{template_id, modifications}`) and **video** in source-mode (composition JSON);
> HeyGen render consumes `talking_photo_id + voice_id + TTS + single scene`, with a separate
> avatar-provisioning path. The intake adapter model reflects this asymmetry rather than flattening it.

### Stage 4 — Field-contract mapping (ICE variant fields → provider fields)
Map each ICE variant field to a concrete provider element/field captured in Stage 3. Examples:

| ICE variant field | Provider field (example) |
|---|---|
| `quote_text` | Creatomate text element (e.g. `Quote.text`) |
| `attribution` | Creatomate text element |
| `background_image` | Creatomate image/source field (`Background.source`) / governed asset |
| `logo` | Creatomate image/source field (`Logo.source`) / governed asset |
| `narration_text` | HeyGen script / TTS text |
| `avatar_role` | HeyGen avatar / persona (`talking_photo_id`) |
| `voice` | HeyGen `voice_id` |

A mapping is **incomplete** until every *required* ICE field binds to a real provider field. No
mapping ⇒ cannot render (Stage 6/7).

### Stage 5 — Governance
Check, before any approval: brand **style guide** · governed **assets** · **logo usage** · **tone** ·
**compliance / policy** · **source / citation** rules · **platform copy limits** · **avatar / persona
approval** (if applicable) · **voice approval** (if applicable). Governance is PK-owned; the flow
records the checklist + outcome, it does not self-approve.

### Stage 6 — Proof gates (ordered lifecycle)
```
proposed → defined → template_inventory_captured → field_mapped → governed →
smoke_tested → renderable → visually_approved → platform_safe → client_enabled → production_proven
(+ deprecated, blocked)
```
**Clarifications (binding, anti-overclaim):**
- **`smoke_tested` ≠ `production_proven`** — a smoke render proves the pipeline runs, not that it ships.
- **`defined` ≠ executable** — a content/field contract is not a runnable choice.
- **"provider template exists" ≠ enough** — it must be inventoried, mapped, governed, and proven.
- **"rendered once" ≠ `platform_safe`** — platform safety needs per-platform render / safe-area proof.
- **`production_proven` needs real publish evidence** — a real publish for `client × platform × variant`.

> This generalises the FVI proof chain (`proposed…production_proven`) by inserting the explicit
> production steps an operator must perform: `template_inventory_captured`, `field_mapped`,
> `smoke_tested`. It is the same evidence discipline, made operator-legible.

### Stage 7 — Dashboard status (what the operator sees)
For each intake record: **what is complete** · **what is blocked** · **what proof is missing** ·
**what action is next** · **manual-only vs automated-eligible** · **can it appear in Content Studio?**
· **can it appear in Format Mix?** Status is derived from the proof gate + the GFCP/Overlay/FVI layers
— never asserted by the operator.

---

## 3. Standard model vs provider-specific model

- **ICE standardises the intake STAGES and PROOF GATES** (Stages 1–7 above) — the operator experience
  and the evidence discipline are uniform across providers.
- **ICE does NOT force every provider into one template schema** — provider adapters carry different
  inventory models (Creatomate elements/modifications vs HeyGen avatar/voice/scene).
- **The common (provider-neutral) layer is exactly:** `provider` · `format` · `variant` ·
  **input contract** · **output contract** · **proof state** · **evidence** · **eligibility**.
- Everything provider-specific (template ids, element names, talking_photo/voice ids, scene payloads,
  render constraints) lives **inside the adapter** and never leaks into the common layer — mirroring
  the existing Render Intelligence abstraction (submit · poll · cost · capabilities · renderMode).

---

## 4. Creatomate + HeyGen examples

**Creatomate `image_quote` (composition-based, image):**
- provider template (`provider_template_id`)
- fields / elements (Creatomate element list)
- background image slot · logo slot · text slots
- static or animated
- image output (jpg)
- platform size (e.g. 1:1 ≈1080×1080)

**HeyGen avatar video (identity-based, video):**
- avatar / talking_photo
- voice
- background / scene
- narration / script (TTS)
- duration
- language / accent
- avatar / persona governance (approved identity for the brand/use)
- video output (mp4)
- platform constraints (aspect / duration / safe-area)

> The two examples deliberately do **not** share a field model — Creatomate is element/modification
> shaped; HeyGen is identity/script shaped. The intake handles both through the same *stages*, not the
> same *schema*.

---

## 5. Relationship to existing ICE layers

- **GFCP** — whether `platform × format` is globally possible / proven.
- **Client Overlay** — whether the *client* can use that `platform × format`.
- **FVI** — whether the *exact* creative variant is eligible.
- **Content Studio** — *requests* explicit variant intent (consumes the above; never overrides).
- **Creative Intake (this brief)** — **creates and proves** the variant/template **before** Studio can
  execute it. Intake feeds FVI (a proven variant) which feeds Overlay/Studio eligibility.

> Order of dependency: **Creative Intake → FVI eligibility → (GFCP ∧ Client Overlay) → Content Studio
> execution.** Nothing downstream can offer what Intake has not yet proven.

---

## 6. Future dashboard UX guidance (possible operator screens — not built here)

- **Creative Intake home** (list of intake records + status badges)
- **New Template wizard** (Stages 1–2 guided)
- **Provider inventory screen** (Stage 3, adapter-shaped)
- **Field mapping screen** (Stage 4)
- **Governance checklist** (Stage 5)
- **Smoke test / render proof screen** (Stage 6 `smoke_tested` → `renderable`)
- **Approval screen** (Stage 6 `visually_approved`, PK)
- **Capability proof timeline** (the gate history with evidence ids)
- **Status badge / next action** (Stage 7)
- **Promotion decision** (advance proof state — gated; PK for irreversible promotions)

---

## 7. Failure and blocking rules (fail-closed)

| Condition | Rule |
|---|---|
| No provider inventory | **cannot bind** |
| No field mapping | **cannot render** |
| No governance | **cannot approve** |
| No smoke render | **cannot mark `renderable`** |
| No visual approval | **cannot publish manually** |
| No platform proof | **cannot mark `platform_safe`** |
| No client eligibility | **cannot expose to client Studio** |
| No production proof (real publish) | **cannot mark `production_proven`** |
| No explicit selector decision | **cannot automate** (per v4.24 — automated stays the safe default) |

**Default posture: fail closed.** A missing gate blocks the next step and surfaces the reason.

---

## 8. Current Property Pulse examples (honest — no overclaim)

| Variant | Intake state | Why |
|---|---|---|
| `news_card.v1` | **`production_proven`** for **PP × Facebook + Instagram only** | full chain present (4 governed renders + 2 publishes fb/ig); default + active |
| `quote_card.v1` | **`defined`, BLOCKED** | Creatomate template inventory **missing/BLOCKED** (Slice 3D — pending safe Creatomate read); no field mapping, no render proof |
| `market_update.v1` | **`defined`** | needs template binding / render path; no `maps_to_variant`, no render proof |
| HeyGen / avatar (illustrative) | **future** | an avatar/video intake must capture avatar, voice, background, script, scene, **and persona governance** before any render |

> **No overclaim:** `quote_card.v1` and `market_update.v1` are **`defined` only / unwired** — not
> governed/renderable/platform_safe/client_enabled/production_proven; **no proof is borrowed from
> `news_card.v1`**. `news_card.v1` is production-proven **PP × facebook + instagram only**. The HeyGen
> example is **illustrative future scope** — ICE has no proven HeyGen creative-intake variant here.

---

## 9. Recommended next slices (sequence — NOT implemented here)

Each is a separate, separately-authorized, PK-gated slice:

- **CI-1** — **read-only dashboard status surface** for Creative Intake records (the safe first build;
  shows proof state + next action; no editing).
- **CI-2** — **New Template wizard** design/spec (Stages 1–2).
- **CI-3** — **provider inventory capture model** (the adapter-shaped Stage 3 data model).
- **CI-4** — **Creatomate inventory connector / read flow** (safe, authorized Creatomate read — the
  Slice 3D unblock).
- **CI-5** — **HeyGen avatar/video intake model** (identity-shaped Stage 3 + persona/voice governance).
- **CI-6** — **explicit variant-intent request model for Content Studio** (the v4.25 Option 5→2 path).

> Sequence intent: **read-only status first (CI-1)** before any wizard/connector/editable execution.

---

## Explicit non-claims / scope
- **Docs/design only.** No UI built, no runtime/Content-Studio/dashboard code change, no
  `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema/DB/migration change, no
  `execute_sql`, no render, no publish, no Creatomate/HeyGen API call, no deploy, no production
  enablement, no GFCP Layer 3, no template binding, no quote_card/market_update render proof, **no
  format or variant enabled.**
- `quote_card.v1` / `market_update.v1` remain **`defined` only / unwired**; `news_card.v1` remains the
  **default + production-proven** variant (PP × facebook + instagram only). No proof borrowed.
- The HeyGen/avatar content is **illustrative future scope**, not a claim of existing capability.
- This brief defines **future flow + guardrails**; it decides direction, it does not implement.

## Cross-references
- Content Studio capability guidance (v4.25): `docs/briefs/content-studio-capability-guidance-v1.md`.
- Selector decision (v4.24): `docs/briefs/format-variant-selector-decision-record.md`.
- quote_card template inventory (Slice 3D, BLOCKED): `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md`.
- FVI pilot records + proof chain: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md`.
- Provider models (read-only): `docs/briefs/render-provider-creatomate-capability-audit.md` (composition-based),
  `docs/briefs/render-provider-heygen-capability-audit.md` (identity-based).
- GFCP (shipped): register v4.19/v4.20. Client Overlay (shipped): register v4.21.
- Register: v4.26 (this brief).
