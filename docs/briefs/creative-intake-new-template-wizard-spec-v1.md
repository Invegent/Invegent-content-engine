# CI-2 — New Template Wizard spec v1 (design — docs/design only)

> **Status:** design spec **only**. **No wizard built, no dashboard code, no runtime change, no
> format/variant enabled, no provider API call.** No `property-pulse.json`/`creative_contract.ts`/
> `registry-schema-v2.md`/schema/runtime/DB/migration/dashboard change, no `execute_sql`, no render,
> no publish, no Creatomate/HeyGen call, no deploy, no production enablement, no provider connector, no
> GFCP Layer 3, no Canonical Capability Model.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design (+ register record).
> **CE state at write time:** `main == origin/main == cb955d5edaaf7c082d049646e1ba3e8dcd801f10`;
> register **v4.27**.
> **Purpose:** specify the future operator-facing **"New Template" wizard** for Creative Intake (the
> CI-2 slice in the CE v4.26 Creative Intake Operator Flow) — how a dashboard operator starts a new
> creative template/variant intake **without** understanding backend architecture, producing an
> **intake request/draft** that must pass governance + proof gates before it can ever execute. This
> spec decides direction; it builds nothing.

---

## 0. Where CI-2 sits

| Slice | Role | Status |
|---|---|---|
| **CI-1** | read-only **status** surface (what exists / stage / blocked / next action) | **shipped to prod** (v4.27, `/create/creative-intake`) |
| **CI-2 (this spec)** | the **New Template wizard** — *creates* a new intake request/draft | **design only** |
| CI-3…CI-6 | provider inventory model · Creatomate connector · HeyGen intake · explicit variant-intent | later, gated |

**Foundational rule (binding, from v4.26):** the wizard **creates and proves; it never
enables-by-creating.** Its output is a `proposed`/`defined` **intake request** — **not** executable,
**not** enabled, **not** production-capable. `defined` ≠ executable. **AI/operator proposes; the gates
+ PK approve.**

---

## 1. Wizard purpose

The wizard helps an operator **start** a new creative template or variant intake **safely**. It does
**not** create executable production capability. Its product is an **intake request / draft record**
that enters the proof chain at `proposed`/`defined` and must pass governance and every proof gate
(§Step 9) before anything is renderable, approvable, or selectable in Content Studio.

---

## 2. Entry point

Future dashboard entry (design only — **no button implemented in CI-2**):
- the **Creative Intake** page (`/create/creative-intake`, the CI-1 surface),
- a **"New Template" / "Start intake"** action on that page.

CI-2 is the *spec* for what that action would open; the clickable affordance is a later slice
(CI-2A/2B).

---

## 3. Wizard steps

> Every step is **capture-only** (records operator input into a draft); no step renders, calls a
> provider, mutates production, or enables anything.

### Step 1 — Choose client / brand
Capture: `client` · `brand / family` · scope = **global** | **client-specific** | **pilot-only**.

### Step 2 — Choose platform and format
Capture: `platform(s)` · `format` (an existing `ice_format_key` — the wizard does **not** invent
formats) · **required output type** (static image · animated image · carousel · short video · avatar
video · voice/narration video · long video) · `aspect ratio / size` · `platform constraints`.

### Step 3 — Choose provider
Capture: provider = **Creatomate** | **HeyGen** | **future/unknown** · **provider mode** =
composition/template · avatar/identity · voice/narration · generated image · custom adapter. The
provider+mode choice selects the adapter-shaped inventory model used in Step 7.

### Step 4 — Define variant identity
Capture: proposed `variant_key` · human-readable name · format family · version · purpose · and the
**intake kind**: new variant | replacement for an existing variant | additional **manual-only**
variant | **future automated candidate**. (Per v4.24, "automated candidate" only flags intent — it
does **not** grant automated selection; that needs a separate selector decision.)

### Step 5 — Define content field contract
Capture required/optional fields. Examples (adapter-shaped):

**Creatomate image templates:** `headline` · `subtitle` · `quote_text` · `stat` · `callout` ·
`location/suburb` · `date/timeframe` · `source_context` · `background_image` · `logo`.

**HeyGen / avatar templates:** `narration_text` · `script` · `avatar_role` · `talking_photo/avatar id`
· `voice id` · `background/scene` · `language/accent` · `duration`.

Each field marked required vs optional; required fields must later bind to real provider fields
(Step 7 → `field_mapped`).

### Step 6 — Define visual / template requirements
Capture: background image required? · logo placement? · text-slot count? · max text length? · static
or animated? · duration? · captions? · audio/voice? · avatar/persona? · scene/background? · output
format? · accessibility/readability requirements (contrast / min font / text-over-image).

### Step 7 — Provider inventory / template source
Capture **one of**: link an existing provider template · request a provider inventory read · create a
new provider template outside ICE · provider template not created yet. Then, adapter-shaped:

- **Creatomate:** template id · element list (required) · modifiable fields · output dimensions ·
  animation/static state.
- **HeyGen:** avatar/talking_photo id · voice id · scene/background · script/narration requirements ·
  duration constraints.

> The wizard **records the source/intent**; it does **not** call Creatomate/HeyGen. Actually reading a
> provider's inventory is the CI-4/CI-5 connector slice (and, for `quote_card`, the Slice 3D unblock).

### Step 8 — Governance checklist
Capture: brand style-guide reference · allowed assets · logo rules · tone rules · policy/compliance
rules · source/citation requirements · avatar/persona approval (if relevant) · voice approval (if
relevant) · **human approver required**. Governance is PK-owned; the wizard records the checklist, it
does not self-approve.

### Step 9 — Proof plan
Declare which proof gates are required before execution (the v4.26 chain). What each requires:
- **proposed** — the intake exists.
- **defined** — content/field contract captured (Steps 5–6). *Not executable.*
- **template_inventory_captured** — the provider template's element/field list is captured (Step 7 / CI-4/CI-5).
- **field_mapped** — every required ICE field maps to a real provider field.
- **governed** — Step 8 checklist + PK ratification done.
- **smoke_tested** — a controlled, non-publishing render proved the pipeline runs. *Not production proof.*
- **renderable** — a real governed render succeeded (proven `render_log`).
- **visually_approved** — PK approved the rendered result.
- **platform_safe** — per-platform render / safe-area proof.
- **client_enabled** — client enrolled for this platform × format × variant.
- **production_proven** — real publish evidence for client × platform × variant.

### Step 10 — Review and submit
The wizard produces an intake draft carrying: future `intake_request_id` · proposed `variant_key` ·
provider · format · field contract · missing gates · next action · **initial state = `proposed` or
`defined` only** · **not executable** · **not enabled**. Submit creates the **intake request/draft**
(in a future CI-2C/2D model) — it does **not** bind, render, publish, or enable.

---

## 4. Wizard output states

Allowed output states: `draft_intake` · `proposed` · `defined` ·
`blocked_needs_provider_inventory` · `blocked_needs_governance` · `blocked_needs_render_proof` ·
`blocked_needs_platform_safety`.

The wizard **must NOT** output `production_proven`, `executable`, or `automated_enabled` — those are
only reached when the corresponding later gates actually prove them (and automation needs a separate
selector decision, §5).

---

## 5. Operator guardrails (must be shown in-wizard)

- Creating a template **does not enable it**.
- `defined` **does not mean executable**.
- A provider template **existing does not mean it is proven**.
- A smoke test **is not production proof**.
- Unapproved variants **cannot be offered in Content Studio**.
- **Automated selection requires a separate selector decision** (v4.24) — the wizard never grants it.

---

## 6. Provider-specific differences (one wizard, adapter-shaped)

**Creatomate (composition/template):** template id · element inventory · field mapping · output size ·
static/animated output · render modifications.

**HeyGen (avatar/identity):** avatar/talking_photo · voice · script/narration · scene/background ·
language/duration · persona governance.

**Future provider:** the adapter declares its **input contract**, **output contract**, **proof
evidence**, and **safety constraints**; the wizard's stages/gates are unchanged — only the Step 7
inventory model differs. (The common layer stays `provider / format / variant / input contract /
output contract / proof state / evidence / eligibility`.)

---

## 7. Property Pulse examples (honest — no overclaim)

**A. `news_card.v1`** — already **production-proven** (PP × Facebook + Instagram only). The wizard
**would not create it now**; it serves as the picture of a *completed* intake (all gates green).

**B. `market_update.v1`** — the wizard would capture the field contract (Steps 5–6) and then **block
at template binding / render proof** → output `blocked_needs_render_proof` (it has no `maps_to_variant`
and no governed render). It remains **defined / unwired / not executable**.

**C. `quote_card.v1`** — the wizard would capture the field contract and then **block at provider
inventory** because the Creatomate template inventory is **missing/BLOCKED** (Slice 3D, pending safe
Creatomate read) → output `blocked_needs_provider_inventory`. It remains **defined / unwired /
blocked / not executable**.

> No overclaim: `market_update.v1` and `quote_card.v1` stay **defined / unwired** — not governed/
> renderable/platform_safe/client_enabled/production_proven; **no proof borrowed from `news_card.v1`**.

---

## 8. Data model sketch (DESIGN ONLY — non-authoritative, future, NO DB migration)

Future entities the wizard would eventually write to (sketch — **not** created here, **not** a schema):
- `creative_intake_request` — the draft/request (client, platform, format, provider, variant_key, state, next_action).
- `creative_template_inventory` — captured provider element/field inventory (adapter-shaped).
- `creative_field_mapping` — ICE field → provider field bindings.
- `creative_governance_check` — the Step 8 checklist + approver + outcome.
- `creative_proof_event` — append-only proof-gate events (render_log ids, publish ids, approvals).
- `creative_variant_eligibility` — derived eligibility (executable? Studio-offerable? automated?).

> **Non-authoritative / future only.** No table, RPC, schema, or migration is created or implied by
> this spec. The current CI-1 surface remains a **static** model; a server-backed model is CI-2D+.

---

## 9. Relationship to existing surfaces

- **CI-1 status surface** — *shows* intake status (read-only).
- **CI-2 wizard** — *creates* new intake requests (drafts; never enables).
- **FVI** — records the variant lifecycle / evidenced state.
- **GFCP** + **Client Overlay** — qualify whether the format/client/platform is globally possible and
  client-safe.
- **Content Studio** — may *request* explicit variant intent **only after** eligibility (governed +
  render-proven + platform-safe + client-enabled), per v4.25/v4.24.

> Dependency order: **CI-2 intake → proof gates → FVI eligibility → (GFCP ∧ Client Overlay) → Content
> Studio execution.** The wizard sits at the very front and can enable nothing on its own.

---

## 10. Future implementation slices (recommended — NOT implemented here)

- **CI-2A** — clickable prototype / static wizard UI (no data).
- **CI-2B** — read-only wizard form with **no submit**.
- **CI-2C** — local **draft-only** intake request model (client-side, no backend).
- **CI-2D** — server-backed **draft** intake model (the first backend; read/write of drafts only).
- **CI-2E** — governance / proof-event model (append-only proof events).
- **CI-2F** — provider inventory **handoff** (wire to CI-4 Creatomate / CI-5 HeyGen inventory reads).

> Sequence intent: **prototype → read-only form → local draft → server draft → proof events → provider
> handoff.** No step enables a variant; enablement always requires the full proof chain + PK gates.

---

## Explicit non-claims / scope
- **Docs/design only.** No wizard built, no dashboard/runtime/Content-Studio code change, no
  `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema/DB/migration change, no
  `execute_sql`, no render, no publish, no Creatomate/HeyGen API call, no deploy, no production
  enablement, no provider connector, no GFCP Layer 3, no Canonical Capability Model, **no format or
  variant enabled.**
- The CI-1 production surface **remains read-only and unchanged**.
- `market_update.v1` / `quote_card.v1` remain **defined / unwired**; `news_card.v1` remains the
  **default + production-proven** variant (PP × facebook + instagram only). No proof borrowed.
- The data model is a **non-authoritative future sketch** — no entity is created or implied as built.

## Cross-references
- Creative Intake Operator Flow v1 (v4.26): `docs/briefs/creative-intake-operator-flow-v1.md`.
- CI-1 status surface shipment (v4.27): register `docs/00_sync_state.md`.
- Content Studio capability guidance (v4.25): `docs/briefs/content-studio-capability-guidance-v1.md`.
- Selector decision (v4.24): `docs/briefs/format-variant-selector-decision-record.md`.
- quote_card template inventory (Slice 3D, BLOCKED): `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md`.
- FVI pilot records: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md`.
- Register: v4.28 (this spec).
