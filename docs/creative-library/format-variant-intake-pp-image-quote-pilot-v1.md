# Format Variant Intake — Slice 1 pilot records: Property Pulse `image_quote` (v1)

> **Status:** declarative intake records (docs/registry only). **No implementation.** No DB tables,
> no RPCs, no migration, no `execute_sql` mutation, no runtime change, no render-worker / publisher /
> Advisor / Content-Studio change, no production enablement, no deploy.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/registry only.
> **Scope (D-V1):** v0 lifecycle state lives in **declarative registry evidence blocks** — this file —
> NOT in DB-backed `c.client_format_variant_*` tables. **`property-pulse.json` is NOT edited** (it
> feeds a runtime-vendored projection / runtime-import guard); these records reference its objects by
> key. **No schema file edited.**
> **Decides against:** `docs/briefs/format-variant-intake-v0-slice0-decision-record.md` (D-V1…D-V5)
> and `docs/briefs/format-variant-intake-v0-proof-chain-design.md` (proof chain §3, evidence §6).
> **CE state at write time:** `main == origin/main == b9240cca596601f7503448a4b4202ea1d669f5ba`;
> register **v4.21**.

---

## 0. Record shape (declarative)

Each pilot variant is a declarative intake record with: `variant_key`, `format` (existing
`ice_format_key`), `scope` (per D-V2 grain), `proof_state` (one of the D-V2 states), an `evidence`
block (real, cited IDs only), `missing_gates` (what is not yet evidenced), and `governance` refs.
**Evidence discipline (binding):** `renderable` requires a real succeeded governed render;
`production_proven` requires render **and** publish evidence; smoke ≠ production proof; absence of
evidence ⇒ an earlier state, never a failure. **AI proposes; PK approves.**

**Proof states (D-V2):** `proposed → defined → governed → renderable → visually_approved →
platform_safe → client_enabled → production_proven` (+ `deprecated`, `blocked`).

---

## 1. `property_pulse.image_quote.news_card.v1` — ANCHOR (backfilled from real evidence)

| Field | Value |
|---|---|
| `variant_key` | `property_pulse.image_quote.news_card.v1` |
| `contract_ref` | `property_pulse.image_quote.news_card` · `contract_version` `v1` |
| `format` | `image_quote` (existing `ice_format_key`; no new taxonomy) |
| `scope` | client `property-pulse` × platforms `facebook`, `instagram` (production-proven pair grain, D-V2 gates 7–8); render-proven global (gates 1–5) |
| `proof_state` | **`production_proven`** |

**Evidence block (verified read-only against live prod `mbkmaxqhsohbtwsqolns`, 2026-06-30):**
- **renderable (Layer D) — PROVEN.** 4 succeeded **governed production** renders (`render_engine=creatomate`,
  `render_spec.label=creative_library_b1_production`, **not** a `/_smoke/` path), carrying
  `render_spec.variant_key=property_pulse.image_quote.news_card.v1`:
  - `render_log fcbe5993-9791-45a6-98fc-a82c8ffd579f` → draft `1d6c8bab-fd4b-4270-8da6-4561e06ef6df`
  - `render_log 5b821214-63c4-4451-ad59-7090b00793d3` → draft `33b171fc-e68f-48aa-930f-2fe2ac9bfd94`
  - `render_log 53575bc8-f0e2-4c40-a99a-a7706da48513` → draft `b4e811da-2bae-4b59-86cc-1b81a37f3131`
  - `render_log 5f7cfc89-5895-44af-af80-56d76e9e856e` → draft `b4e44eef-b8bd-42fd-aba3-e64d6a15b64e`
  - render window `2026-06-27 21:45:12Z` → `2026-06-29 00:15:10Z`.
- **visually_approved — PROVEN (recorded).** Draft `1d6c8bab` + render `fcbe5993` are the register
  **v4.08** ACI B1/B2 natural-evidence proof (B1 `draft_format.contract` + B2 `render_spec` echo, PK-
  recorded). Governed render (`resolver_used=true`).
- **client_enabled — PROVEN.** Property Pulse is enrolled/enforce for `image_quote` (Control Tower
  enrollment, register v4.13; PP `image_quote` active in the live GFCP/PPP matrices).
- **production_proven (Layer D + E) — PROVEN.** 2 distinct news_card.v1 drafts were **published**:
  - **instagram** — `post_publish 88ee578a-f65b-49e7-a0df-67c57ba384cd`, draft `33b171fc-…`, published `2026-06-29 00:00:26Z`.
  - **facebook** — `post_publish 1472a6fa-c338-46d3-abb3-be100696033b`, draft `1d6c8bab-…`, published `2026-06-29 06:05:14Z`.

**missing_gates:** none for the fb/ig pair (full render→publish chain present). `production_proven`
is bounded to **facebook + instagram** (the two published pairs); other platforms for this variant
are not production_proven (no publish evidence).

**governance refs:** `capability_contract property_pulse.image_quote.news_card.v1` in
`docs/creative-library/property-pulse.json` (`maps_to_variant` family `property-pulse-news` /
variant `centred-scrim-1x1`, provider `fb9820f8-3fee-4448-b324-3d500fa74b40`). Owner ICE · approval PK
· AI propose-only.

> **Honest findings (surfaced, not fixed here):**
> 1. **Stale registry citation:** `property-pulse.json` cites a `render_log 52165857-ba7e-4a0f-82f0-92fd5f66537e`
>    as the "LIVE PRODUCTION INSTANCE" — that render_log_id **does NOT exist** in the live
>    `m.post_render_log`. The real production renders are the 4 IDs above. This is a registry
>    evidence-citation discrepancy to reconcile separately (registry edit is out of this Slice's scope).
> 2. **Governance-record gap:** the `capability_contract` `status` in `property-pulse.json` is
>    `candidate` (formal PK `active` ratification not recorded), even though the variant is render- and
>    publish-proven in production. The lifecycle reached `production_proven` ahead of a recorded
>    `governed` ratification — a record gap (not a render/publish gap) to reconcile under the PK gate.

---

## 2. `property_pulse.image_quote.market_update.v1` — worked example

| Field | Value |
|---|---|
| `variant_key` | `property_pulse.image_quote.market_update.v1` |
| `format` | `image_quote` |
| `scope` | global variant-level (gates 1–5) — not yet platform/client scoped |
| `proof_state` | **`proposed`** |

**Evidence block (verified read-only):** **none.** 0 succeeded renders carrying this `variant_key`
(`m.post_render_log`); 0 publishes; **no `capability_contract` for this key in the registry**.

**missing_gates:** `defined` (needs a complete intake record: field contract + **`maps_to_variant`
template-family-variant binding** — no template family variant exists for `market_update` yet),
`governed`, `renderable` (needs a real governed render — explicitly **out of this declarative
Slice's scope**), `visually_approved`, `platform_safe`, `client_enabled`, `production_proven`.

**governance refs:** none yet (no contract). Owner ICE · approval PK · AI propose-only.

> **Honest state:** `proposed` only. Advancing to `defined`→`renderable` (the design's "worked
> example" forward path) requires a real Creatomate template-family variant + a governed smoke/render —
> render work that is **outside** the declarative Slice 1 scope (no render in this slice). Recorded
> honestly at `proposed`; no overclaim.

---

## 3. `property_pulse.image_quote.quote_card.v1` — second candidate

| Field | Value |
|---|---|
| `variant_key` | `property_pulse.image_quote.quote_card.v1` |
| `format` | `image_quote` |
| `scope` | global variant-level (gates 1–5) |
| `proof_state` | **`proposed`** |

**Evidence block (verified read-only):** **none.** 0 succeeded renders carrying this `variant_key`;
0 publishes; no `capability_contract` for this key in the registry. (Live check confirms the **only**
PP `image_quote` `variant_key` present in production is `news_card.v1`.)

**missing_gates:** `defined` (needs field contract + `maps_to_variant` binding — none exists),
`governed`, `renderable` (needs a real render — out of this Slice's scope), `visually_approved`,
`platform_safe`, `client_enabled`, `production_proven`.

**governance refs:** none yet. Owner ICE · approval PK · AI propose-only.

> **Honest state:** `proposed` only — no template, no contract, no evidence. No overclaim.

---

## 4. Pilot summary

| Variant | proof_state | render evidence | publish evidence | overclaim? |
|---|---|---|---|---|
| `…news_card.v1` | **production_proven** | 4 governed production renders (cited) | 2 publishes — fb + ig (cited) | no — fully evidenced |
| `…market_update.v1` | **proposed** | none | none | no — honest earliest state |
| `…quote_card.v1` | **proposed** | none | none | no — honest earliest state |

**This pilot enables nothing new in production** — it is evidence / intake / governance recording
only. `news_card.v1` was already live (this backfills its lifecycle state from real evidence);
`market_update.v1` and `quote_card.v1` are reserved keys at `proposed` and gate nothing.

---

## 5. Risks / open questions

- **R1 — stale registry citation:** `property-pulse.json` cites a non-existent
  `render_log 52165857`; the real production renders are the 4 cited here. Reconcile the registry
  citation separately (registry-JSON edit + re-vendor review; out of this Slice's scope). *(carry)*
- **R2 — governance-record gap:** `news_card.v1` reached `production_proven` while its
  `capability_contract.status` is still `candidate` (no recorded PK `active` ratification). Record the
  governance ratification under the PK gate to align the registry with reality. *(carry)*
- **R3 — worked-example forward path needs render work:** taking `market_update.v1` past `proposed`
  needs a real template-family variant + governed render — render work outside declarative Slice 1.
  A later gated slice (Branch-B-style) would do that. *(carry)*
- **R4 — no DB-backed state store (D-V1):** lifecycle state is declarative here; a queryable
  canonical store + the GFCP Layer 3 read-only projection (D-V3) remain later, gated steps. *(carry)*

## 6. Recommended next gate

- Reconcile the two `news_card.v1` registry discrepancies (R1 stale render_log citation, R2 governance
  ratification) in a separate PK-gated `property-pulse.json` registry pass (with the re-vendor / runtime
  guard review).
- The GFCP Layer 3 read-only projection (D-V3) and any DB-backed variant store (D-V1 future) remain
  **not started**.
- `market_update.v1` / `quote_card.v1` advance only via a separately-gated slice that includes real
  render work — **not** declarative-only.

---

## Cross-references

- Slice 0 decision record: `docs/briefs/format-variant-intake-v0-slice0-decision-record.md` (D-V1…D-V5).
- Design brief: `docs/briefs/format-variant-intake-v0-proof-chain-design.md` (proof chain §3, evidence §6, pilot §14).
- Registry schema: `docs/creative-library/registry-schema-v2.md` (Variant §3; capability contracts §7; proof discipline §5/§6).
- Registry instance (NOT edited): `docs/creative-library/property-pulse.json` (registry v0.3).
- Anchor proof lineage: register v4.08 (ACI B1/B2 natural evidence — draft `1d6c8bab` / render `fcbe5993`).
