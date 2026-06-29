# Format Variant Intake v0 — Slice 0 PK decision record (source / registry-shape)

> **Type:** PK source / registry-shape decision record (docs/decision-record only). **No
> implementation occurred.** No DB tables, no RPCs, no migration, no `execute_sql`, no Creative
> Library / production registry JSON change, no render-worker / publisher / Content-Studio change,
> no dashboard UI, no editable UI, no write RPC, no deploy, no production mutation.
> **Recorded:** 2026-06-29 (CE session). **Decided by:** PK.
> **Decides against:** `docs/briefs/format-variant-intake-v0-proof-chain-design.md`
> (the proof-chain design brief, verdict `READY_FOR_PK_REVIEW`; §16 open decisions D-V1…D-V4).
> **CE state at record time:** `main == origin/main == 230246b711097f7f9f1fa4e3a59116e5121f7ba8`;
> register **v4.20** current.

---

## 1. Context and reason

The Global Format Capability Pyramid (GFCP, registers v4.18–v4.20) answers *"what can ICE
support/prove globally for platform × format?"* — but its **Layer 3 (variant) is `not_modelled`**,
surfaced only as production-evidence-only, with `variant_capability_model_missing` named as a
`missing_model_pieces[]` gap. The client Publishing Plan Pyramid's Layer-3 variant mix is likewise a
placeholder. The Format Variant Intake v0 design brief proposed a governed **proof-chain lifecycle**
over the already-ratified Creative Library v2 variant / capability-contract objects to fill that gap.

This Slice 0 record fixes **how Format Variant Intake v0 is represented before any implementation** —
the source model, the state vocabulary/grain, the GFCP-projection stance, the pilot, and the runtime
stance. The guiding reason: **prove vocabulary, state shape, and evidence discipline against real
evidence before creating any canonical state tables** (the same "reconcile first, normalise later"
discipline GFCP used — v0 is an evidence/governance lens, not an automation engine, and not yet the
canonical model).

---

## 2. Approved decisions (D-V1 … D-V5)

### D-V1 — v0 source model: **declarative registry evidence blocks**
**Approved.** v0 represents variant lifecycle state in the **declarative Creative Library registry
evidence blocks** (the existing `capability_contracts[]` / Variant `evidence` shape in
`registry-schema-v2.md` §3/§5/§7). **Do NOT create DB-backed `c.client_format_variant_*` tables in
v0.**
**Reason:** prove the vocabulary, state shape, and evidence discipline against real evidence first;
a canonical DB-backed store is designed only *after* the chain has surfaced real needs (it may later
become a component of Canonical Capability Model v1 — §4). The registry stays **declarative** (no
runtime import; runtime-import guard intact).

### D-V2 — proof-state vocabulary and grain
**Approved.** v0 proof states (ordered):
`proposed → defined → governed → renderable → visually_approved → platform_safe → client_enabled →
production_proven`, plus terminal `deprecated` and `blocked`.
**Approved grain:**
- **gates 1–5** (`proposed`…`visually_approved`) are **global variant-level** gates;
- **gate 6** (`platform_safe`) is **platform × variant**;
- **gates 7–8** (`client_enabled`, `production_proven`) are **client × platform × variant**.
Forward motion is **one gate at a time, evidence-gated, PK-authorised** — no auto-promotion;
`production_proven` requires render **and** publish (never render alone); absence of proof maps to an
earlier state, never a false `production_proven`.

### D-V3 — GFCP Layer 3 projection
**Approved as a later, separate slice.** A **read-only, service-role projection** (analogous to the
proven GFCP Slice 1A RPC posture) may later feed GFCP Layer 3 from the variant model. **Do NOT build
this projection in Slice 0** — Slice 0 only defines the shape + source decision. The projection is
read-only when it is built; it does not become the canonical store.

### D-V4 — pilot ratification
**Approved.** First pilot = **Property Pulse `image_quote`** (single brand, single format).
Pilot variants:
- `property_pulse.image_quote.news_card.v1` — the **anchor** (already production-proven, render_log
  `52165857`; its state is backfilled from real evidence).
- `property_pulse.image_quote.market_update.v1` — worked example (forward workflow).
- `property_pulse.image_quote.quote_card.v1` — second candidate (defined only).
**The pilot enables nothing new in production — it is evidence / intake / governance only.**

### D-V5 — runtime stance
**Approved.** Format Variant Intake v0 is **declarative and read-only**. It **must not** change
render selection, publisher behaviour, Advisor decisions, or Content Studio choices until later,
separately-gated slices. The deterministic selector gate (`{client_id, recommended_format}`) and the
live PP `image_quote` render path are **unchanged** by anything in this lane at v0.

---

## 3. Explicit non-goals (Slice 0 and v0)

- **No DB tables / RPCs / migrations / `execute_sql` / apply** — and specifically **no
  `c.client_format_variant_*`** in v0 (D-V1).
- **No Creative Library / production registry JSON change** — `property-pulse.json` and the v2
  registry stay as-is; Slice 0 writes only decision-record docs.
- **No GFCP Layer 3 projection build** (D-V3 — later slice).
- **No Slice 1 pilot intake records** (that is the next gate, §7).
- **No render-worker / publisher / Advisor / Content-Studio change** (D-V5).
- **No dashboard / editable UI / write RPC / dry-run.**
- **No `materialise_slots` / cron change, no deploy, no production data mutation.**
- **No production enablement of any variant** — including the new pilot variants.
- AI proposes; **PK approves**; providers render only; ICE governs.

---

## 4. Relationships

- **GFCP:** Format Variant Intake fills GFCP's `variant_capability_model_missing` gap and is what
  turns **Layer 3 from `not_modelled` into a real model** — but only via a *later* read-only
  projection (D-V3). GFCP v0 stays an evidence-and-reconciliation view; it is not retro-fitted.
  Variant states reuse GFCP's evidence layers (`renderable` = render proof D; `production_proven` =
  render D + publish E on a production instance).
- **Client Publishing Plan Pyramid:** `client_enabled` is the client-PPP-owned gate — global variant
  capability (gates 1–6) is the **base**, a client adopting a variant is the **overlay** (the same
  base→overlay split GFCP/PPP already embody). The client PPP's Layer-3 placeholder would later read
  the client-enabled subset, read-only.
- **Creative Library v2:** this is the **governance lifecycle layered on** the existing declarative
  `capability_contracts[]` / Variant objects — it does **not** replace the registry. v0 state lives
  in the registry evidence blocks (D-V1); the registry stays declarative (no runtime import).
- **Content Studio:** a future capability-guided picker would offer operators only
  `client_enabled` / `production_proven` variants — variant capability *gates* what Studio can
  create. **Not in v0** (D-V5).
- **Future Canonical Capability Model v1:** the DB-backed variant model deferred by D-V1 may become a
  component of the Canonical Capability Model v1. Sequence so variant intake **informs, not
  pre-empts** that design; v0 declarative state is the input, not the canon.

---

## 5. Pilot scope

Property Pulse `image_quote` only (§D-V4). The pilot proves: (a) the chain represents the proven
anchor (`news_card.v1`) honestly from real evidence; (b) a new variant (`market_update.v1`) can be
taken through the early governed gates (`proposed → defined → governed → renderable`); (c) GFCP
Layer 3 + the client PPP can later *read* variant state without a runtime/worker change. **No new
variant is enabled in production by the pilot.** Single brand + single format keeps the grain
tractable and avoids avatar/persona coupling (PP `image_quote` is image-only).

---

## 6. Risks and carries

- **R1 — declarative-only state is not queryable** the way a GFCP RPC is; acceptable for v0 (prove
  shape first). A DB-backed store is the D-V1-deferred future decision. *(carry)*
- **R2 — three-grain state** (global / platform / client×platform) is honest but more complex than a
  flat flag; the single-brand/format pilot keeps it manageable. *(carry)*
- **R3 — publish→specific-variant attribution** for `production_proven` relies on the draft→render
  `variant_key` stamp + publish evidence; sparse for new variants (they stay at earlier states
  honestly). *(carry)*
- **R4 — overlap with Canonical Capability Model v1** — sequence variant intake to inform, not
  pre-empt (§4). *(carry)*
- **R5 — no new format taxonomy** — variants map only to existing `ice_format_key`s; intake must not
  introduce new formats. *(constraint)*
- **C — GFCP Layer 3 stays `not_modelled` / production-evidence-only** until the D-V3 projection
  ships (a later gated slice). *(carry)*

---

## 7. Recommended next slice

**Slice 1 — Property Pulse `image_quote` pilot intake records + anchor backfill (docs/registry
only, no runtime change).** Author the declarative intake records for the three pilot variants
(D-V4) using the D-V2 vocabulary/grain, and **backfill the anchor** (`news_card.v1`) state through
the chain from real evidence (render_log `52165857`). Strictly docs/registry-only — **no DB, no
runtime, no production enablement, no GFCP projection** (that is a still-later slice, D-V3). Each
subsequent step stays gated and read-only-first, never starting with editable controls.

---

## Cross-references

- Design brief: `docs/briefs/format-variant-intake-v0-proof-chain-design.md` (proof chain §3, state
  machine §4, intake fields §5, evidence §6, pilot §14, exclusions §15, open decisions §16).
- Creative Library v2 schema: `docs/creative-library/registry-schema-v2.md` (Variant §3; capability
  contracts §7; proof discipline §5/§6).
- Concrete evidence: `docs/creative-library/property-pulse.json` (registry v0.3; `news_card.v1`
  proven via render_log `52165857`).
- GFCP (Layer 3 gap): `docs/briefs/global-format-capability-pyramid-slice1a-backend-brief.md`,
  `…-slice1b-ui-brief.md`; registers v4.18–v4.20.
