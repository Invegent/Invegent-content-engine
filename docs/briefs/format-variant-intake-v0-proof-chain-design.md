# Format Variant Intake v0 — proof-chain design brief

> **Status:** planning / design brief **only**. **No implementation.** No DB tables, no RPCs, no
> migration, no `execute_sql`, no Creative Library JSON runtime change, no render-worker / publisher
> / Content-Studio change, no dashboard UI, no editable UI, no write RPCs, no deploy, no production
> mutation.
> **Produced:** 2026-06-29 (CE session). **Type:** docs/brief only.
> **CE state at write time:** `main == origin/main == cf5f474c79cea567244f558ddfbf0406e42f4bea`;
> register **v4.20** current.
> **Strategic frame:** mirror the proof-chain discipline proven by the **Global Format Capability
> Pyramid (GFCP)** — a variant must move through governed proof gates; it does **not** become broadly
> available merely because it exists. v0 is an evidence/governance lens, not an automation engine.

---

## 0. Authoritative grounding (what already exists)

This brief does **not** invent a variant model from scratch — it formalises the **lifecycle** over the
already-ratified Creative Library v2 objects.

- **Creative Library v2 registry schema** (`docs/creative-library/registry-schema-v2.md`) already
  defines:
  - **Template Family → Variant** objects (`template_variant_key`, `aspect_ratio`, `render_engine`,
    `provider`, `provider_template_id`, `proof_status` ∈ {`unproven`,`proven`}, `proof_gate`,
    `evidence.render_log_id`).
  - **Capability Contracts** (`capability_contracts[]`): `contract_key` = the canonical
    **`variant_key`** (e.g. `property_pulse.image_quote.news_card.v1`), `contract_ref`,
    `contract_version`, `status` ∈ {`draft`,`candidate`,`active`}, a **deterministic `gate`**
    (`{client_id, recommended_format}` — no AI/scoring), `maps_to_variant`, a **field contract**
    (`ai_authored[]` / `derived[]` / `renderer_fixed[]` / `governed_assets`), `fallback_policy`,
    `validator_policy`, `evidence` (proof inherited from the mapped variant — never independent).
  - **Proof discipline (binding):** no object claims `proven` without a real
    `m.post_render_log.render_log_id`; the registry is **declarative only** (no production worker
    imports the JSON at runtime — runtime-import guard); **ICE governs, providers render only, PK
    approves, AI proposes**.
- **Concrete evidence** (`docs/creative-library/property-pulse.json`, registry `v0.3`): the variant
  `property_pulse.image_quote.news_card.v1` maps to family `property-pulse-news` / variant
  `centred-scrim-1x1`, **`proof_status: proven`**, with a **live production render**
  `render_log 52165857-ba7e-4a0f-82f0-92fd5f66537e` (`label=creative_library_b1_production`,
  `resolver_used=true`). This is the single anchor variant that has actually reached production.
- **GFCP** (registers v4.19/v4.20): answers *"what can ICE support/prove globally for platform ×
  format?"* Its **Layer 3 (variant) is explicitly `not_modelled`**, and it names
  `variant_capability_model_missing` as a `missing_model_pieces[]` gap. **Format Variant Intake is
  the work that fills that gap.**
- **Client Publishing Plan Pyramid** (registers v4.15/v4.16): answers *"what has a client
  enabled/enrolled?"* Its Layer 3 variant mix is likewise a placeholder.
- **Existing intake discipline** (`docs/creative-library/intake/`): the **asset** intake
  (manifest schema, review-packet format, creative-score) is the proven pattern this variant intake
  mirrors at the variant grain.

**Conclusion:** the *objects* exist (variant, capability contract, render proof). What is missing is
the **end-to-end governed proof-chain lifecycle** that takes a variant from idea to
production-proven-and-client-enabled, and the **read model** that lets GFCP Layer 3 and the client
PPP surface variant capability honestly. That lifecycle is this brief.

---

## 1. What is a format variant?

A **format variant** is a specific, named, governed **creative treatment within a format** — the
thing identified by a `variant_key` of the form **`<brand>.<ice_format_key>.<treatment>.<version>`**
(e.g. `property_pulse.image_quote.market_update.v1`).

It binds together (it does not duplicate them):
- a **format** it lives inside (`ice_format_key`, e.g. `image_quote`),
- a Creative Library **Template Family + Variant** (the renderable provider template),
- **governed assets + patterns** it composes (logo, background, headline block, scrim…),
- a **field contract** (which fields are AI-authored / derived / renderer-fixed),
- a **deterministic selector gate** (which config inputs select it — no AI/scoring),
- and a **proof + governance state** (where it sits on the proof chain, §3).

A variant is the **unit of "can ICE safely introduce and use this specific creative inside a
format?"** — the question GFCP Layer 3 cannot yet answer.

---

## 2. How a variant differs from adjacent concepts

| Concept | What it is | How a variant differs |
|---|---|---|
| **Format** (`ice_format_key`) | The broad content type (image_quote, carousel, video_short_*) | A variant is a *treatment inside* a format; many variants per format |
| **Platform** (facebook/…) | Where content publishes | A variant is defined platform-agnostically but is gated **platform_safe per (platform, variant)** pair; platform is an axis, not the variant |
| **Client enablement** (client PPP) | Whether *a client* has enabled/enrolled a thing | A variant can exist + be globally proven yet **not** client-enabled; `client_enabled` is one gate on the chain, owned by the client PPP layer |
| **Creative Library asset** (`c.client_brand_asset` via `resolve_brand_assets`) | A reusable governed asset (logo, background) | A variant **references** assets (by `asset_key`); the asset is an input, not the variant |
| **Template** (`provider_template_id`) | The provider-backed renderable | A variant `maps_to_variant` one template variant but **adds** the field contract + governance + lifecycle; the template alone has no governance state |
| **Render provider** (creatomate/heygen) | The renderer | A variant **declares** its provider; the provider is "renderer only," never the source of truth (ICE governs) |
| **Persona / avatar** (`character-model-v0`) | A governed identity used in some video variants | Orthogonal: a variant may *reference* an avatar; avatar governance is its own model, not part of variant intake v0 |

---

## 3. The v0 proof chain (the load-bearing model)

A variant advances through **ordered, gated states**. **Forward motion requires evidence at each
gate; a variant never skips a gate.** This is the variant-grain analogue of the GFCP evidence stack
(declared → configured → governed → render-proven → publish-proven).

```
proposed → defined → governed → renderable → visually_approved → platform_safe → client_enabled → production_proven
                                                                                          ↘ (any state) → deprecated / blocked
```

| # | State | Meaning | Maps to existing evidence |
|---|---|---|---|
| 1 | **proposed** | An idea + a reserved `variant_key`. No contract yet. | (new — pre-registry) |
| 2 | **defined** | Full intake record exists: field contract, `maps_to_variant`, assets, selector gate, style-guide conformance claim. | Creative Library capability_contract `status=candidate` (`proof_status=unproven`) |
| 3 | **governed** | PK-ratified governance + style-guide conformance; contract `status=active`. Still no render. | capability_contract `status=active`; governance block + PK approval trail |
| 4 | **renderable** | A real **governed render succeeded** (`render_log_id`; `resolver_used=true`, `fallback_taken=false`). Proves it can be built. | Creative Library variant `proof_status=proven` (Gate C/D2/B0 smoke) = **GFCP render proof (Layer D)** |
| 5 | **visually_approved** | **PK visually approved** the rendered output (human gate). | `evidence.approved_by` / `approved_at` on the proven render |
| 6 | **platform_safe** | Confirmed safe for the specific platform(s): aspect/safe-area/policy, per **(platform, variant)** pair. | safe-area/aspect rules in the style guide + per-pair confirmation |
| 7 | **client_enabled** | A specific client has **enabled/enrolled** the variant. | client PPP enrollment / client config (per-client) |
| 8 | **production_proven** | A real **production render + publish** for the (client, platform, variant) tuple. | **GFCP render proof (D) + publish proof (E)** on a non-smoke production instance |
| — | **deprecated / blocked** | Retired (deprecated) or hard-stopped (blocked: failed a gate, unsafe, provider broken). | terminal/again-gated |

**Anchor truth (PP):** `property_pulse.image_quote.news_card.v1` is today at **production_proven**
(render_log `52165857`). The other candidate PP variants are at **proposed**. The chain must be
able to represent both honestly without overclaiming.

**Design principle (binding):** *A variant must not become broadly available just because it
exists.* Broad availability requires reaching at least **production_proven** for the anchor case and
an explicit **client_enabled** decision per client. Earlier states are visible (for honesty) but
**not** offered to operators as usable.

---

## 4. Valid variant states (state machine)

- **States:** `proposed`, `defined`, `governed`, `renderable`, `visually_approved`, `platform_safe`,
  `client_enabled`, `production_proven`, `deprecated`, `blocked`.
- **Forward transitions** are **one gate at a time** and each requires its gate evidence (§6). No
  auto-promotion in v0 — every forward transition is a **recorded, PK-authorised** step.
- **`blocked`** may be entered from any state when a gate fails (unsafe render, provider breakage,
  policy violation); it records the failing gate + reason and is the variant analogue of a GFCP
  `blocked` cell.
- **`deprecated`** is a deliberate retirement (superseded by a newer `version`, or withdrawn).
- **Scope axes:** state 1–5 are **variant-global** (brand-level capability); state 6 is **per
  (platform, variant)**; states 7–8 are **per (client, platform, variant)**. The model must store
  state at the right grain (a variant can be `production_proven` for PP-facebook yet only `governed`
  for another client) — exactly the base→overlay split GFCP/PPP already use.
- **Honest empty states:** absence of proof maps to the appropriate earlier state, **never** to a
  false `production_proven` (mirrors GFCP: no "Proven in production" without render+publish).

---

## 5. Required intake fields (the variant intake record)

Mostly already expressible in the Creative Library `capability_contracts[]` shape (§0); v0 adds the
**lifecycle state** + **per-gate evidence**. Proposed record:

**Identity & binding**
- `variant_key` (canonical, `brand.format.treatment.version`)
- `contract_ref` (version-less), `contract_version`
- `client_slug` / `client_id` (or `scope: global` for brand-agnostic), `brand`
- `ice_format_key` (existing governed format only — no new format taxonomy)
- `maps_to_variant`: `{ template_family_key, template_variant_key, provider, provider_template_id, render_engine, aspect_ratio }`

**Composition & contract**
- `governed_assets`: `{ logo: {asset_key, policy}, background: {asset_keys, policy}, … }`
- `composed_of_patterns[]` (pattern_keys)
- `field_contract`: `ai_authored[]` / `derived[]` / `renderer_fixed[]` (each `{field, required, max_chars, policy/source/value}`)
- `selector_gate`: deterministic inputs only (`{client_id, recommended_format}`) — no AI/scoring
- `fallback_policy` (e.g. `governed_only_fail_loud`)
- `style_guide_key` (conformance target)

**Lifecycle & evidence**
- `lifecycle_state` (one of §4)
- `state_scope` (`global` / `platform:<p>` / `client:<id>:platform:<p>`)
- `evidence`: `{ render_log_id, render_spec_template_id, publish_evidence_ref, proof_gate, source_commit, review_packet, approved_by, approved_at, supporting_render_log_ids[], notes }`
- `platform_applicability[]` + per-pair `platform_safe` status
- `governance`: `{ owner: ICE, approval: PK, ai_role: propose-only }`
- `blocked_reason` / `deprecated_reason` (when applicable)

**Discipline:** every field above is **declarative** in v0; nothing here is a runtime binding and
nothing is imported by a production worker.

---

## 6. Evidence required at each gate

| Gate (→ state) | Required evidence | Who confirms |
|---|---|---|
| → **defined** | complete intake record (§5): field contract + maps_to_variant + assets + selector gate | AI proposes; recorded |
| → **governed** | style-guide conformance statement + PK governance ratification (contract `status=active`, `approved_by=PK`, `approved_at`) | **PK** |
| → **renderable** | a real `m.post_render_log.render_log_id`, `status=succeeded`, `resolver_used=true`, `fallback_taken=false` (a governed smoke/Gate render) | render evidence (DB) |
| → **visually_approved** | PK visual approval of *that* render output (recorded `approved_by/at` + review packet) | **PK (human)** |
| → **platform_safe** | per-(platform,variant): aspect/safe-area/policy check passes; recorded | ICE check + PK sign-off |
| → **client_enabled** | client PPP enrollment / client config row enabling the variant for the client | **PK / client config** |
| → **production_proven** | a real **production** (non-`_smoke/`) render **and** a publish for the (client, platform, variant) tuple — render proof (D) + publish proof (E) | render + publish evidence (DB) |
| → **blocked** | the failing gate + reason (unsafe/broken/policy) | ICE/PK |

**Binding:** no state is claimed without its evidence; `production_proven` requires **both** a real
production render and a publish — never render alone (the GFCP render≠reach rule, carried to the
variant grain). Smoke/`_smoke/` renders satisfy **renderable**, never **production_proven**.

---

## 7. What is read-only in v0

- The **surfacing** of variant lifecycle state (e.g. a future GFCP Layer-3 read view, or a variant
  column in the client PPP) is **read-only** — it reports state, it does not change it.
- The **intake record** itself in v0 lives as **governed declarative data** (Creative Library
  registry evidence blocks + this brief's record shape), advanced by a **manual, PK-gated workflow**
  — **not** an editable dashboard UI and **not** a write RPC.
- Any future read contract (a "variant capability" RPC, analogous to GFCP Slice 1A) is **read-only,
  service-role, SECURITY DEFINER** — same posture as the proven GFCP/PPP RPCs.

---

## 8. What stays manual / human-approved

- **governed** (style-guide conformance + governance ratification) — **PK**.
- **visually_approved** (looking at the actual render) — **PK**, irreducibly human.
- **client_enabled** (a business decision to use it for a client) — **PK / client owner**.
- **production_proven** confirmation (acknowledging the live render+publish) — recorded by ICE,
  acknowledged by PK.
- AI may **propose** a variant (state `proposed`/`defined`) and gather evidence; AI **never**
  promotes a state or approves a gate.

---

## 9. What must NOT be automated yet (v0)

- **No auto-promotion** between states (every forward transition is manual + evidenced).
- **No AI variant selection** at render time (the selector gate stays deterministic config inputs).
- **No broad multi-client / multi-format rollout** — pilot is single brand + single format (§14).
- **No write RPCs / editable UI / dry-run save.**
- **No Creative Library runtime change** (registry stays declarative; runtime-import guard intact).
- **No render-worker / publisher / Content-Studio change.**
- **No DB-backed variant table built in v0** (that is the *next* slice's source-decision, §16).

---

## 10. Connection to GFCP

- Format Variant Intake **fills GFCP's `variant_capability_model_missing` gap** and is what turns
  GFCP **Layer 3 from `not_modelled` into a real model**.
- The variant proof states **reuse GFCP's evidence layers**: `renderable` = GFCP render proof (D);
  `production_proven` = GFCP render (D) + publish (E) on a production instance. GFCP already surfaces
  `creative_library_status = production_evidence` from `render_spec.variant_key` — that is the
  **production_proven anchor** for the PP news_card variant.
- Sequencing: GFCP v0 stays *evidence-and-reconciliation*; the variant model becomes the canonical
  variant capability source a later GFCP slice (or the Canonical Capability Model v1) reads — it does
  **not** retro-fit GFCP v0.

## 11. Connection to the Client Publishing Plan Pyramid

- **`client_enabled`** is the client-PPP-owned gate: the global variant capability (states 1–6) is
  the **base**; a client adopting a variant is the **overlay** — the exact base→overlay split GFCP
  (global) and the client PPP (adoption) already embody.
- The client PPP's Layer-3 variant placeholder would later read the **client-enabled** subset of
  governed variants (read-only), not a separate model.

## 12. Connection to Content Studio (later)

- A future **capability-guided picker** in Content Studio would offer operators **only**
  `client_enabled` / `production_proven` variants for a (client, platform, format) — variant
  capability *gates* what Studio can create, preventing unproven creatives from entering production.
- **Not in v0.** No Content Studio change here; this brief only defines the model Studio would later
  consume read-only.

## 13. Connection to Creative Library v2

- Format Variant Intake is the **governance lifecycle layered on top of** the existing Creative
  Library `capability_contracts[]` / Variant objects — it does **not** replace the declarative
  registry.
- The registry stays **declarative** (no runtime import). Variant lifecycle state is recorded in the
  registry **evidence blocks** in v0; a DB-backed variant capability model (if chosen in the next
  slice, §16) would be the canonical store the registry projects from — same "ICE governs, providers
  render, vendored projection only" discipline.
- The existing **asset intake** (`docs/creative-library/intake/`) is the proven sibling pattern at
  the asset grain; variant intake mirrors its review-packet + evidence discipline at the variant
  grain.

---

## 14. First pilot scope

**Pilot = Property Pulse `image_quote` variants only** (single brand, single format — narrowest safe
slice; PP image_quote is the one path already production-proven, so the chain can be exercised
end-to-end against real evidence).

| Pilot variant | Starting state | Role in the pilot |
|---|---|---|
| `property_pulse.image_quote.news_card.v1` | **production_proven** (render_log `52165857`) | **Anchor** — backfill its state through all 8 gates from real evidence; proves the chain models reality without overclaim |
| `property_pulse.image_quote.market_update.v1` | **proposed** | **Worked example** — drive a brand-new variant `proposed → defined → governed → renderable` (smoke) to prove the *forward* workflow + gates (stops at renderable/visually_approved in the pilot; no broad rollout) |
| `property_pulse.image_quote.quote_card.v1` | **proposed** | Second candidate — defined only; demonstrates multiple variants per format without enabling them |

Pilot proves: (a) the chain represents the proven anchor honestly, (b) a new variant can be taken
through the early governed gates, (c) GFCP Layer 3 + the client PPP can *read* variant state without
a runtime/worker change. **The pilot does not enable any new variant in production.**

---

## 15. Hard exclusions

No DB tables/RPCs created · no migration / `execute_sql` / apply · no Creative Library JSON runtime
change (declarative only; runtime-import guard intact) · no render-worker / publisher change · no
Content-Studio change · no dashboard UI / editable UI / write RPC / dry-run · no auto-promotion · no
AI variant selection · no multi-client or multi-format rollout · no avatar/video/scene work · no
`materialise_slots` / cron change · no deploy · no production data mutation. **AI proposes; PK
approves.**

---

## 16. Recommended next implementation slice

**Format Variant Intake v0 — Slice 0 (source & registry-shape decision), mirroring GFCP Slice 0.**
Before any build, PK decides:
- **D-V1:** where variant lifecycle state lives in v0 — **(a)** Creative Library registry evidence
  blocks only (declarative, no new DB), vs **(b)** a future DB-backed `c.client_format_variant_*`
  capability model (the GFCP-named missing piece). *(Recommended: (a) declarative for v0; design (b)
  as the canonical store only once the chain has surfaced real needs — same "reconcile first,
  normalise later" discipline GFCP used.)*
- **D-V2:** the canonical **state vocabulary** (the 8 states + deprecated/blocked) and grain
  (global / platform / client×platform).
- **D-V3:** the **read surface** — confirm a later read-only "variant capability" projection
  (analogous to GFCP Slice 1A RPC) is the path to populate GFCP Layer 3, **read-only, service-role**.
- **D-V4:** pilot ratification (§14) — confirm PP image_quote, the 3 variants, and that the pilot
  enables nothing new in production.

Then: **Slice 1** = the pilot intake records (declarative) + backfilling the anchor variant's state
from real evidence; **Slice 2** = a read-only variant-capability projection feeding GFCP Layer 3.
Each gated, each mirroring the proven GFCP/PPP lane (design → read-contract → read-UI), never
starting with editable controls.

---

## 17. Risks / open questions

- **R1 — state storage (D-V1):** declarative-registry-only state is simplest for v0 but not queryable
  the way GFCP's RPC is; a DB-backed model is queryable but is net-new schema. *Open for PK.*
- **R2 — grain complexity:** state at three grains (global / platform / client×platform) is honest
  but more complex than a flat flag; the pilot (single brand/format) keeps it tractable.
- **R3 — publish proof for `production_proven`:** mapping a publish to a *specific variant* relies on
  the draft→render `variant_key` stamp + publish evidence; coverage may be sparse for new variants
  (acceptable — they simply stay at earlier states honestly).
- **R4 — overlap with Canonical Capability Model v1:** the DB-backed variant model (D-V1b) may be a
  component of the future Canonical Capability Model; sequence so variant intake informs, not
  pre-empts, that design.
- **R5 — avatar/persona variants:** video variants referencing avatars touch the separate
  character-model governance; v0 pilot is image_quote only to avoid that coupling.
- **R6 — no new format taxonomy:** variants must map to existing `ice_format_key`s; intake must not
  introduce new formats (a variant is a treatment, not a format).

---

## 18. Verdict

**`READY_FOR_PK_REVIEW`** — the design is fully grounded in the existing Creative Library v2 schema
(variant + capability-contract objects, proof discipline), the proven GFCP evidence model, and the
concrete PP `image_quote` production-proven anchor. The proof chain, state machine, intake fields,
per-gate evidence, connections (GFCP / client PPP / Content Studio / Creative Library), pilot, and
hard exclusions are specified, and the open decisions are explicit (§16 D-V1…D-V4). No further
inventory is required to take the source/shape decision (so not `NEEDS_MORE_INVENTORY`); nothing
blocks the design (so not `BLOCKED`).

---

## Cross-references

- Creative Library v2 schema: `docs/creative-library/registry-schema-v2.md` (Variant object §3;
  capability contracts §7; proof discipline §5/§6).
- Concrete variant evidence: `docs/creative-library/property-pulse.json` (registry v0.3;
  `property_pulse.image_quote.news_card.v1` proven via render_log `52165857`).
- GFCP: `docs/briefs/global-format-capability-pyramid-slice1a-backend-brief.md`,
  `…-slice1b-ui-brief.md`, `…-slice0-decision-record.md` (Layer 3 `not_modelled`;
  `variant_capability_model_missing`); registers v4.18–v4.20.
- Client PPP: `docs/briefs/publishing-plan-pyramid-inventory-brief.md` (§11 variant gap).
- Asset intake (sibling pattern): `docs/creative-library/intake/` (review-packet + evidence discipline).
- Branch B variant proofs: `docs/briefs/branch-b-template-capability-contracts.md`,
  `docs/briefs/branch-b-lane-b0-governed-variant-proof.md`.
