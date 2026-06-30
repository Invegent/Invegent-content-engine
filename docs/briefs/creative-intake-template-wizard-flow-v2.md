# Creative Intake Template Wizard — flow refinement v2 (template-led ordering)

> **Status:** flow-refinement design **only**. **No wizard built, no dashboard code, no runtime
> change, no provider API call, no format/variant enabled, no template bound, no render, no publish,
> no deploy.** No `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema/runtime/
> DB/migration/dashboard change, no `execute_sql`, no Creatomate/HeyGen call, no production enablement,
> no GFCP Layer 3, no Canonical Capability Model, no TMR table created.
> **Produced:** 2026-06-30 (CE Session 3). **Type:** docs/design (refinement of the CI-2 wizard spec).
> **CE state at write time:** `main == f900eb8` (`docs: define template metadata registry model`);
> register **v4.32**.
> **Refines:** `docs/briefs/creative-intake-new-template-wizard-spec-v1.md` (CI-2 wizard spec, v4.28)
> and `docs/briefs/creative-intake-operator-flow-v1.md` (v4.26). **Aligns to:**
> `docs/briefs/template-metadata-registry-v1-design.md` (TMR-1 object model).
> **Implementation gate (binding):** **no dashboard code for this wizard until after TMR-1.** This
> document refines the *flow*; it builds nothing.

---

## 0. What this refinement changes (and what it does not)

**Changes — step ordering only.** The CI-2 spec (v1) ordered the wizard **intent-first** (client/brand
→ platform/format → provider → define-what-you-want → go find a template). This refinement re-orders
the wizard to be **provider-template-led**: the operator *starts from a real provider template that
already exists* and the wizard walks it into ICE governance, populating the **TMR-1 objects in
dependency order**. The new canonical order is:

```
1. Select provider
2. Enter provider template ID
3. Capture inventory
4. Confirm template family
5. Assess platform suitability
6. Assess variant fit
7. Assign client/brand scope
8. Define missing edits
9. Plan proof/render
10. Submit for governance
```

**Does NOT change — anything load-bearing.** Every binding rule from v1 carries unchanged:
- **The wizard creates and proves; it never enables-by-creating.** Output is a `proposed`/`defined`
  intake draft — **not** executable, **not** enabled, **not** production-capable. `defined` ≠ executable.
- **Capture-only.** No step renders, calls a provider, mutates production, or enables anything.
- **AI/operator proposes; the gates + PK approve.** Governance is PK-owned.
- **The proof-gate chain is unchanged** (§Step 9) — this refinement re-orders *capture*, not *proof*.

> **Why template-led fits reality.** Creatomate is **template-based** (renders reference a
> `provider_template_id` + `modifications`), and **provider template names mislead** — e.g.
> `news_quote_insight_1x1_v1` (`490ad9ea…`) reads like a quote card but its element set
> (Headline/Subtitle/Location/Date/Footer + CategoryBadge) is a **market-insight / headline card**
> (TMR-1 §1). An operator in practice has a **template id in hand** and needs ICE to tell them *what it
> actually is, where it fits, and what it still needs* — exactly the TMR inventory→classification→
> governance spine. Template-led ordering makes the wizard a thin operator front-end over TMR-1.

---

## 1. Step ↔ TMR-1 object mapping (the spine)

Each wizard step **populates one TMR-1 object** (`template-metadata-registry-v1-design.md` §0/§2–§9).
The wizard never collapses these objects into one another — TMR keeps them distinct on purpose.

| Step | Wizard action | TMR-1 object populated | Capture-only? |
|---|---|---|---|
| 1 | Select provider | `provider` (creatomate / heygen / future) | yes |
| 2 | Enter provider template ID | **provider template** (the exact external asset — inventory object first) | yes |
| 3 | Capture inventory | **field inventory** + **output contract** | yes (records inventory; does **not** call the provider) |
| 4 | Confirm template family | **template family** (the reusable pattern above the asset) | yes |
| 5 | Assess platform suitability | **platform suitability** (first-class, per-platform) | yes |
| 6 | Assess variant fit | **format variant** candidate (`variant_key` — governed usage) | yes |
| 7 | Assign client/brand scope | **client / brand assignment** (scoped permission / use-case) | yes |
| 8 | Define missing edits | **gap set** (what the template still needs to be usable) | yes |
| 9 | Plan proof/render | **platform proof plan** (which gates, what evidence) | yes (declares; proves nothing) |
| 10 | Submit for governance | **governance gate** → intake draft submitted `proposed`/`defined` | yes (submits a draft; never approves) |

> **TMR rule preserved:** *a provider template existing ≠ a governed variant; template capability ≠
> platform proof; a generic template ≠ a client assignment* (TMR-1 §0). The step order walks these in
> dependency order without ever assuming the next.

---

## 2. The ten steps (refined)

> Every step is **capture-only** — records operator input / recorded evidence into a draft. No step
> renders, calls Creatomate/HeyGen, mutates production, or enables anything.

### Step 1 — Select provider
Capture: `provider` = **Creatomate** | **HeyGen** | **future/unknown** · **provider mode** =
composition/template · avatar/identity · voice/narration · generated image · custom adapter. The
provider+mode choice selects the **adapter-shaped** inventory model used in Step 3 (Creatomate =
element/modification shaped; HeyGen = identity/script shaped — the wizard does not flatten them).

### Step 2 — Enter provider template ID
Capture: the **exact external asset id** (`provider_template_id`, e.g. one Creatomate template id) +
optional source note (where it came from, who owns it). This creates a **provider-template inventory
record** in `proposed` state. **Existing ≠ proven** — entering an id asserts nothing about
governance, suitability, or render proof. If the operator has **no id yet** (template not created),
the record is flagged `template_not_created_yet` and the wizard still proceeds to capture intent.

### Step 3 — Capture inventory
Capture the template's **field inventory** + **output contract**, adapter-shaped:
- **Creatomate:** element list (names + types) · modifiable vs fixed fields (the `modifications` keys,
  e.g. `Headline.text`, `Background.source`) · output dimensions · output type (jpg/mp4) ·
  static/animated · render constraints (overflow / safe-area / required-vs-optional).
- **HeyGen:** avatar/`talking_photo_id` · `voice_id` · scene/background · script/narration (TTS) ·
  language/accent · duration constraints · persona governance hooks.

> **The wizard records inventory; it does NOT call the provider.** A live, authorized provider
> inventory read is the **CI-4 (Creatomate) / CI-5 (HeyGen) connector slice** — and for `quote_card.v1`
> the **Slice 3D** read is currently **BLOCKED**. Here the operator either pastes recorded inventory,
> links a prior capture, or marks `inventory_capture_pending` → output `blocked_needs_provider_inventory`.

### Step 4 — Confirm template family
Capture: which **template family** (reusable pattern) this asset belongs to — `family_key` (e.g.
`generic.real_estate.market_insight_card` · `property_pulse.news_card_family` · `generic.quote_card`),
plus `scope` (generic / brand / client), `creative_purpose`, and the **candidate** `default_format_candidate`
(`ice_format_key`) — candidate, **not** binding. **Honesty gate:** the wizard surfaces the *element-set
truth* against the *name* so a misleadingly-named asset (e.g. `news_quote_insight_1x1_v1` whose elements
are a market-insight card, not a quote card) is classified by **what it is**, not what it is called.

### Step 5 — Assess platform suitability
Capture **first-class, per-platform** suitability: for each candidate platform (facebook / instagram /
linkedin / youtube; website flagged evidence-only) — is the template **physically usable** there
(aspect ratio / size / duration / safe-area)? Result per platform ∈ `suitable` / `unsuitable` /
`needs_resize` / `unknown`. **Suitability ≠ proof** — this is a physical-fit assessment, not a render
or publish proof (those are Step 9 / the proof chain).

### Step 6 — Assess variant fit
Capture the proposed **format variant** (`variant_key`) this template would serve: human name · format
family · version · purpose · **intake kind** = new variant | replacement | additional manual-only |
future automated candidate. **Per v4.24:** "automated candidate" only flags *intent* — it does **not**
grant automated selection (that needs a separate selector decision). Assess whether the captured field
inventory (Step 3) can satisfy the variant's required field contract; gaps feed Step 8.

### Step 7 — Assign client/brand scope
Capture the **client/brand assignment**: scope = **global** | **client-specific** | **pilot-only**, the
client(s)/brand(s), and the use-case. This is a **scoped permission**, not an enablement — assigning a
client does **not** enable the template for that client (client enablement is a downstream proof gate,
Step 9 `client_enabled`). Where brand logo / colours / style / governance apply, record the references
(resolved later via governed assets, never inlined).

### Step 8 — Define missing edits
Capture the **gap set** — exactly what this template still needs before it can be usable:
- missing/unmapped required fields (ICE field → provider field not bound) → `field_mapping_gap`
- missing inventory → `provider_inventory_gap`
- platform unsuitability needing a resize/new asset → `platform_fit_gap`
- missing governance references → `governance_gap`
- missing render/proof → `render_proof_gap`

Each gap names the **operator action** required. The gap set is the wizard's honest "what's left" list;
it is **surfaced, never auto-resolved**.

### Step 9 — Plan proof/render
Declare which **proof gates** are required before execution — the unchanged v4.26 chain:
```
proposed → defined → template_inventory_captured → field_mapped → governed →
smoke_tested → renderable → visually_approved → platform_safe → client_enabled → production_proven
(+ deprecated, blocked)
```
The wizard **plans** the proof (which gates apply, what evidence each needs, the next action); it
**proves nothing**. Binding anti-overclaim rules carry: `smoke_tested` ≠ `production_proven`; `defined`
≠ executable; "provider template exists" ≠ enough; "rendered once" ≠ `platform_safe`; `production_proven`
needs a **real publish** for `client × platform × variant`.

### Step 10 — Submit for governance
Capture the **governance checklist** (brand style-guide ref · allowed assets · logo rules · tone ·
policy/compliance · source/citation · avatar/persona approval if relevant · voice approval if relevant
· **human approver required**) and **submit the intake draft**. Submit produces an intake request
carrying: future `intake_request_id` · `provider_template_id` · proposed `variant_key` · family ·
platform-suitability map · client/brand scope · gap set · proof plan · **initial state = `proposed` or
`defined` only** · **not executable** · **not enabled**. Submit creates the **draft** — it does **not**
bind, render, publish, enable, or self-approve. Governance review + PK ratification are the gate.

---

## 3. Output states (unchanged from v1)

Allowed: `draft_intake` · `proposed` · `defined` · `blocked_needs_provider_inventory` ·
`blocked_needs_governance` · `blocked_needs_render_proof` · `blocked_needs_platform_safety`.

**Must NOT output** `production_proven`, `executable`, or `automated_enabled` — those are only reached
when the corresponding later gates actually prove them (and automation needs a separate selector
decision per v4.24).

---

## 4. Operator guardrails (must be shown in-wizard — unchanged)

- Entering a template id / creating a template **does not enable it**.
- `defined` **does not mean executable**.
- A provider template **existing does not mean it is proven**.
- Platform **suitability is not platform proof**.
- A client **assignment is not client enablement**.
- A smoke test **is not production proof**.
- Unapproved variants **cannot be offered in Content Studio**.
- **Automated selection requires a separate selector decision** (v4.24) — the wizard never grants it.

---

## 5. Property Pulse worked examples (honest — no overclaim)

- **`news_card.v1`** — already **production-proven** (PP × Facebook + Instagram only). Template-led, it
  would walk Steps 1–10 all green: provider Creatomate → its template id → inventory captured → family
  `property_pulse.news_card_family` → suitable fb/ig → variant fit ✓ → PP scope → no gaps → proof chain
  complete → governed. Serves as the picture of a **completed** intake. (Default + production-proven
  **fb + ig only** — no proof borrowed.)
- **`quote_card.v1`** — template-led, it **blocks at Step 3 (Capture inventory)** because the Creatomate
  template inventory is **missing/BLOCKED (Slice 3D — pending a safe Creatomate read)** →
  `blocked_needs_provider_inventory`. Stays **defined / unwired / blocked / not executable**.
- **`market_update.v1`** — template-led, it captures inventory + family but **blocks at Step 9
  (Plan proof/render)** — no `maps_to_variant`, no governed render → `blocked_needs_render_proof`. Stays
  **defined / unwired / not executable**.

> No overclaim: `quote_card.v1` and `market_update.v1` stay **defined / unwired** — not governed /
> renderable / platform_safe / client_enabled / production_proven; **no proof borrowed from
> `news_card.v1`**.

---

## 6. Relationship to TMR-1 and downstream (dependency order)

```
Creative Intake Template Wizard (this flow)
  → populates TMR-1 objects (provider · provider-template · inventory · family · suitability ·
    variant-candidate · client-assignment · gaps · proof-plan · governance)
  → proof gates capture real evidence (render_log / publish / approvals)
  → FVI eligibility (the exact variant is eligible)
  → (GFCP ∧ Client Overlay) qualify global + client capability
  → Content Studio execution
```

The wizard sits at the **very front** and can enable nothing on its own. TMR-1 is the metadata spine
it writes into; **TMR-1 must exist before this wizard has a backend to submit drafts to** — hence the
implementation gate (§7).

---

## 7. Implementation sequencing (NOT implemented here — gated behind TMR-1)

**Binding gate: no dashboard code for this wizard until after TMR-1.** Recommended slices once TMR-1
lands (each separately PK-gated):

- **CI-2A** — clickable prototype / static wizard UI in the new template-led order (no data).
- **CI-2B** — read-only wizard form, **no submit**.
- **CI-2C** — local **draft-only** intake request model (client-side, no backend).
- **CI-2D** — server-backed **draft** intake model **writing into the TMR-1 tables** (first backend).
- **CI-2E** — governance / proof-event model (append-only proof events).
- **CI-2F** — provider inventory **handoff** to CI-4 (Creatomate) / CI-5 (HeyGen) reads.

> Sequence intent: **TMR-1 backend first → prototype → read-only form → local draft → server draft →
> proof events → provider handoff.** No step enables a variant; enablement always requires the full
> proof chain + PK gates.

---

## 8. Explicit non-claims / scope

- **Docs/design only.** No wizard built, no dashboard/runtime/Content-Studio code change, no TMR table,
  no `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema/DB/migration change, no
  `execute_sql`, no render, no publish, no Creatomate/HeyGen API call, no deploy, no production
  enablement, no provider connector, no GFCP Layer 3, no Canonical Capability Model, **no format or
  variant enabled, no template bound.**
- This refinement changes **wizard step ordering** (intent-led → template-led) and **maps the steps to
  the TMR-1 objects**; it changes **no proof gate, no guardrail, no output-state rule** from v1.
- The CI-1 production status surface **remains read-only and unchanged**.
- `market_update.v1` / `quote_card.v1` remain **defined / unwired**; `news_card.v1` remains the
  **default + production-proven** variant (PP × facebook + instagram only). No proof borrowed.
- **No dashboard code until after TMR-1** (binding gate, §7).

## Cross-references
- CI-2 wizard spec v1 (refined here): `docs/briefs/creative-intake-new-template-wizard-spec-v1.md` (v4.28).
- Creative Intake Operator Flow v1 (stages + proof chain): `docs/briefs/creative-intake-operator-flow-v1.md` (v4.26).
- TMR-1 object model (the metadata spine): `docs/briefs/template-metadata-registry-v1-design.md` (v4.31).
- TMR-2 schema/RLS proposal: `docs/briefs/template-metadata-registry-tmr2-schema-rls-proposal.md`.
- TMR read-only dashboard view design: `docs/briefs/tmr-dashboard-readonly-view-design-brief.md`.
- Provider inventory capture model: `docs/briefs/creative-intake-provider-inventory-capture-model-v1.md`.
- quote_card template inventory (Slice 3D, BLOCKED): `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md`.
- Selector decision (v4.24): `docs/briefs/format-variant-selector-decision-record.md`.
- Provider models (read-only): `docs/briefs/render-provider-creatomate-capability-audit.md`,
  `docs/briefs/render-provider-heygen-capability-audit.md`.
