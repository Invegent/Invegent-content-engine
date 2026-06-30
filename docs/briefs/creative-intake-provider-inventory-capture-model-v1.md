# CI-3 — Provider Inventory Capture Model v1 (design — docs/design only)

> **Status:** design brief **only**. **No connector built, no provider API call, no dashboard/runtime/
> DB change, no format/variant enabled.** No `property-pulse.json`/`creative_contract.ts`/
> `registry-schema-v2.md`/schema/migration change, no `execute_sql`, no render, no publish, no
> Creatomate/HeyGen call, no deploy, no production enablement, no provider connector, no GFCP Layer 3,
> no Canonical Capability Model.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design (+ register record).
> **CE state at write time:** `main == origin/main == 65550c0aef50c61812d00c63ff34ca306b0d3918`;
> register **v4.28**.
> **Purpose:** define what **"provider inventory capture"** means across Creatomate, HeyGen, and future
> providers — the information the Creative Intake wizard (CI-2) must collect about a provider
> template/asset before a template/variant can move beyond `defined`. Decides direction; builds nothing.

---

## 0. Where CI-3 sits

| Slice | Role | Status |
|---|---|---|
| CI-1 | read-only **status** surface | shipped to prod (v4.27) |
| CI-2 | **New Template wizard** spec (creates intake drafts) | spec (v4.28) |
| **CI-3 (this brief)** | **provider inventory capture model** — what to collect per provider before binding | **design only** |
| CI-4 / CI-5 | Creatomate connector / HeyGen intake model | later, gated |

**Foundational rule (binding):** **inventory capture is read-only fact-gathering, not enablement.**
Capturing a provider's inventory does **not** govern, render, prove, or enable anything. `captured` ≠
`governed` ≠ `renderable` ≠ `production_proven`. **AI/operator proposes; the gates + PK approve.**

---

## 1. Purpose of provider inventory capture

Provider inventory capture records **what a provider template/asset can actually accept and produce**.
It answers, for one provider object:
- What provider object **exists**? (id, type, name)
- What **inputs** does it accept? (dynamic fields/elements)
- What **outputs** does it produce? (format, dimensions, duration, audio…)
- What is **dynamic** vs **fixed**?
- What **proof** is available? (render proof, visual approval)
- What is still **missing**?

It is the prerequisite for the `template_inventory_captured` proof gate (v4.26) and for `field_mapped`.

---

## 2. Standard (provider-neutral) inventory model

A normalized inventory record carries these sections. Provider-specific detail lives in the adapter
(§4–§6); the common ICE layer stores only a **normalized summary + safe metadata**.

**Core identity:** `provider` · `provider_object_type` · `provider_object_id` · `provider_object_name`
· `inventory_source` · `captured_at` · `captured_by` · `inventory_status`.

**Format / output:** `output_format` · `aspect_ratio` · `dimensions` · `duration` ·
`render_kind` (static / animated / video / avatar / voice) · `supported_platforms` (if known).

**Input contract:** `required_fields` · `optional_fields` · `field_types` · `max_lengths` ·
`allowed_media_types` · `language/voice/avatar fields` (if relevant) · `background/asset slots` ·
`logo/brand slots`.

**Output contract:** `asset_type` · `file_type` · `resolution` · `duration` · `audio_presence` ·
`captions/subtitles_presence` · `safe_zones / layout constraints` · `platform constraints`.

**Evidence:** `inventory_source` · `screenshot/reference` (if available) · `provider_metadata_response`
(sanitized, if available) · `render_proof` (if available) · `visual_approval` (if available) ·
`known_limitations`.

---

## 3. Inventory statuses

`missing` · `requested` · `captured_from_docs` · `captured_from_provider_read` ·
`captured_from_manual_entry` · `captured_from_render_probe` · `verified` · `stale` · `blocked`.

**Clarifications (binding):**
- **`captured` ≠ `governed`** — inventory is fact-gathering, not a style/policy approval.
- **`verified` ≠ `renderable`** — confirming the inventory is accurate is not a successful render.
- **Render proof is a separate gate** (`renderable`, needs a real governed render).
- **Inventory is not production proof** — `production_proven` needs real publish evidence.

> `stale` matters: a provider object can change after capture; a stale inventory must be re-captured
> before it is trusted for binding.

---

## 4. Creatomate inventory model (composition-based)

**Identity:** `template_id` / `provider_template_id` · `template_name` · provider project/workspace
(only if safe to record) · **template mode**: image template / video source / composition.

**Template structure:** element list — element **names** + **types**; dynamic vs fixed elements; text
fields; image fields; video fields; audio fields; shape/scrim/background fields; logo/brand fields.
(ICE drives Creatomate **image** templates in **template-mode** via a `{template_id, modifications}`
render script keyed by element names like `Headline.text` / `Background.source`; the *video* path is
source-mode composition JSON — the inventory model captures both shapes.)

**Output:** dimensions · aspect ratio · duration (if video/animated) · output file type · static vs
animated.

**Field mapping:** ICE field → Creatomate element · required/optional · max text length · fallback
behaviour · missing-element handling.

**Safety:** **no provider mutation during read** · **no API-key exposure in docs** · store only safe
metadata · **no raw secrets** · **no render unless separately authorized** (render is a different gate).

**Reference points (read-only, grounding):**
- Proven sibling `news_static_centered_scrim_1x1_v1` (`fb9820f8…`) exposes **6 text elements +
  2 governed image slots** (`CategoryBadge.text`, `Headline.text`, `Subtitle.text`, `Location.text`,
  `Date.text`, `Footer.text`, `Background.source`, `Logo.source`) — the analogous shape for a wired PP
  1:1 template (illustrative only).
- **quote_card candidate `news_quote_insight_1x1_v1`, template id `490ad9ea-7473-49e4-9d3c-e1ae8a12d790`
  — current status = `blocked` / inventory `missing`.** Its element list is not in-repo and was not read
  (Slice 3D BLOCKED, pending safe Creatomate read). **Inventory is required before any binding.**

---

## 5. HeyGen inventory model (identity / persona-based)

**Identity:** provider_object_type ∈ { avatar, talking_photo, voice, scene/background, template (if
applicable) } · `provider_object_id` · display name (if safe) · ownership / brand scope.

**Inputs:** `narration_text / script` · `voice_id` · `avatar / talking_photo_id` · `background/scene` ·
`language/accent` · `duration constraints` · `aspect_ratio` · `subtitles/captions` (if applicable).

**Governance:** avatar/persona approval · voice approval · scene/background approval · brand/persona
fit · policy restrictions · consent/ownership (if applicable).

**Output:** video format · resolution · duration · audio presence · language · platform constraints.

> **HeyGen is identity/persona-driven, not template-element-driven like Creatomate.** Its render path
> consumes a `talking_photo_id + voice_id + TTS + single scene`; avatar identities are provisioned on a
> separate asset path. So HeyGen inventory captures **identities + governance** (which avatar/voice are
> approved for this brand/use), not a Creatomate-style element/modification list.

---

## 6. Future provider model (minimum adapter requirements)

A new provider adapter must:
- declare its **object type**,
- declare its **input contract**,
- declare its **output contract**,
- declare its **capability limits**,
- declare its **proof / evidence type**,
- support an **inventory-capture source**,
- keep **provider-specific fields inside the adapter**,
- and surface only a **normalized summary + safe metadata** to the common ICE layer.

The intake stages and proof gates are unchanged across providers — only the §2 inventory *content*
differs per adapter.

---

## 7. Relationship to the CI-2 wizard

- The New Template wizard **may request** inventory (Step 7).
- The wizard **cannot mark `field_mapped`** until inventory exists (no provider fields to map to).
- The wizard **cannot mark `renderable`** without a render proof (a separate gate).
- The wizard **cannot mark `executable`** from inventory alone.
- **Missing inventory ⇒ `blocked_needs_provider_inventory`** (the CI-2 output state).

---

## 8. Relationship to FVI and the proof gates

- **FVI `defined`** can exist **before** inventory (content/field contract only).
- **`template_inventory_captured`** requires inventory (this model).
- **`field_mapped`** requires ICE fields mapped to provider inputs.
- **`governed`** requires PK / style / policy review.
- **`renderable`** requires a successful governed render.
- **`production_proven`** requires real publish evidence.

> Inventory sits between `defined` and `field_mapped`; it unblocks mapping but proves nothing
> downstream.

---

## 9. Security / governance rules (binding)

- **Never store API keys.** **Never paste provider secrets into docs.**
- Inventory reads must be **read-only** (no provider mutation during capture).
- Provider metadata must be **sanitized**; raw provider payloads may need **redaction**.
- Record **only safe IDs / names / field metadata** — no tokens, no credential env keys, no signed URLs.
- **No automatic enablement after capture** — capture changes no production behaviour.
- A provider read that would require unsafe credential exposure is a **hard stop** (the Slice 3D
  precedent for `490ad9ea`).

---

## 10. Current examples (honest — no overclaim)

- **`news_card.v1`** — inventory/proof **effectively satisfied** via its proven binding + real governed
  renders (the proven Creatomate template + production renders). It is the *completed* picture.
- **`quote_card.v1`** — **`blocked`** because the Creatomate template inventory for `490ad9ea…`
  (`news_quote_insight_1x1_v1`) is **missing** (Slice 3D, pending safe Creatomate read). Stays
  **defined / unwired / blocked**.
- **`market_update.v1`** — **`defined`** but has **no provider template / inventory yet** (no
  `maps_to_variant`). Inventory not even started.
- **HeyGen / avatar** — **future** intake must capture avatar, voice, scene, script, and **persona
  governance** before any render. (Illustrative future scope — no proven HeyGen creative-intake variant
  exists.)

> No overclaim: `market_update.v1` / `quote_card.v1` are **defined / unwired** — not governed/
> renderable/platform_safe/client_enabled/production_proven; **no proof borrowed from `news_card.v1`**.
> `news_card.v1` is production-proven **PP × facebook + instagram only**.

---

## 11. Future implementation slices (recommended — NOT implemented here)

- **CI-3A** — static inventory schema / spec refinement (the §2 model, formalized).
- **CI-3B** — dashboard **read-only inventory detail card** (display captured inventory; no capture).
- **CI-4** — Creatomate **read-only inventory connector / read flow** (the Slice 3D unblock; safe key handling).
- **CI-5** — HeyGen avatar/video **inventory model** (identity + persona/voice governance).
- **CI-2A/2B** — wizard prototype can **reference** inventory requirements (display-only).
- **Later** — server-backed inventory records (the `creative_template_inventory` sketch from CI-2 §8).

> Sequence intent: **spec → read-only display → safe read connector → server records.** No slice enables
> a variant; enablement always needs the full proof chain + PK gates.

---

## Explicit non-claims / scope
- **Docs/design only.** No connector/provider call, no dashboard/runtime/Content-Studio code change, no
  `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema/DB/migration change, no
  `execute_sql`, no render, no publish, no Creatomate/HeyGen API call, no deploy, no production
  enablement, no GFCP Layer 3, no Canonical Capability Model, **no format or variant enabled.**
- `quote_card.v1` template inventory **remains BLOCKED** pending safe Creatomate read.
- `market_update.v1` / `quote_card.v1` remain **defined / unwired**; `news_card.v1` remains the
  **default + production-proven** variant (PP × facebook + instagram only). No proof borrowed.
- The inventory model + data entities are a **non-authoritative future design** — nothing is created.

## Cross-references
- CI-2 wizard spec (v4.28): `docs/briefs/creative-intake-new-template-wizard-spec-v1.md`.
- Creative Intake Operator Flow v1 (v4.26): `docs/briefs/creative-intake-operator-flow-v1.md`.
- quote_card template inventory (Slice 3D, BLOCKED): `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md`.
- Content Studio capability guidance (v4.25): `docs/briefs/content-studio-capability-guidance-v1.md`.
- Provider models (read-only): `docs/briefs/render-provider-creatomate-capability-audit.md`,
  `docs/briefs/render-provider-heygen-capability-audit.md`.
- FVI pilot records: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md`.
- Register: v4.29 (this brief).
