# Format Variant Intake — Slice 1 pilot records: Property Pulse `image_quote` (v1)

> **Status:** declarative intake records (docs/registry only). **No implementation.** No DB tables,
> no RPCs, no migration, no `execute_sql` mutation, no runtime change, no render-worker / publisher /
> Advisor / Content-Studio change, no production enablement, no deploy.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/registry only.
> **Scope (D-V1):** v0 lifecycle state lives in **declarative registry evidence blocks** — this file —
> NOT in DB-backed `c.client_format_variant_*` tables. **`property-pulse.json` was NOT edited in
> Slice 1** (it feeds a runtime-vendored projection / runtime-import guard); these records reference
> its objects by key. **No schema file edited.**
> **UPDATE — Slice 1B (commit `e2e782f`, register v4.22):** the `news_card.v1` registry record in
> `property-pulse.json` was subsequently reconciled (R1 + R2 below — stale render citation retired,
> contract ratified `active`/production-proven for PP × facebook+instagram only). creative-graph-auditor
> **PASS**; the runtime / vendored `creative_contract.ts` projection (contract-identity fields only) is
> **unaffected** (9 + 13 worker tests pass; runtime-import guard intact). No schema change; no DB/deploy.
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

> **Findings — both RECONCILED in Slice 1B (commit `e2e782f`, creative-graph-auditor PASS):**
> 1. **Stale registry citation — RECONCILED.** `property-pulse.json` had cited a
>    `render_log 52165857-ba7e-4a0f-82f0-92fd5f66537e` as the "LIVE PRODUCTION INSTANCE", but that
>    render_log_id does **NOT exist** in `m.post_render_log`. Slice 1B **retired** it and wired the 4
>    real production render IDs (above) into `production_instances` / `known_instances` / the variant
>    notes; `52165857` now survives only as an explicit "corrected/stale" note.
> 2. **Governance-record gap — RECONCILED.** The `news_card.v1` `capability_contract` was `candidate`
>    despite production proof. Slice 1B **ratified** it: top-level + evidence `status` → `active`,
>    `approved_by` → PK, `approved_at` → 2026-06-30, `proof_status` `proven_via_mapped_variant`, scoped
>    to **PP × facebook+instagram only**. The vendored projection (which carries no status/evidence) is
>    unaffected; the resolver was noted as wired in ai-worker for additive contract-stamping only (no
>    format-selection/render change).

---

## 2. `property_pulse.image_quote.market_update.v1` — worked example (DEFINED, Slice 2A)

| Field | Value |
|---|---|
| `variant_key` | `property_pulse.image_quote.market_update.v1` |
| `family / brand` | Property Pulse (`property-pulse`); intended family `property-pulse-news` |
| `format` | `image_quote` (existing `ice_format_key`; no new taxonomy) |
| `version` | `v1` |
| `scope` | global variant-level (gates 1–5) — content definition only; not yet platform/client scoped |
| `proof_state` | **`defined`** (Slice 2A — declarative content/field-contract definition authored; NO render/publish/governance/production evidence yet) |

### 2.1 Purpose
A Property Pulse **market-update** `image_quote` treatment for a single, concise real-estate market
signal — rate movement, price/rent movement, auction/clearance context, or buyer/seller-market
commentary. Distinct from `news_card.v1` (headline-led news): `market_update.v1` **foregrounds one
market signal** (optionally a hero stat), not a news headline. Factual, concise, informative —
aligned to the PP style-guide voice/tone (`property-pulse-styleguide-v1`).

### 2.2 Content field contract (declarative — intent, not yet a runtime contract)
| Field | Required | Notes (aligned to PP content rules; limits PROVISIONAL/to_be_calibrated) |
|---|---|---|
| `headline` | required | concise market-signal headline; max ~90 chars (mirrors news_card provisional limit); hard-gate on overflow/blank at render time (later gate) |
| `market_signal` | required | the ONE clear movement, e.g. "Cash rate held at 4.35%", "Perth median +1.2% MoM" |
| `supporting_stat` | optional | hero numeric stat (value + label) — would compose `pp_stat_card_v1` |
| `short_context` | optional | ≤1 line of context |
| `source_context` | optional | attribution / source line |
| `callout` | optional | short tag, e.g. "Buyer's market" |
| `suburb_region` | optional | suburb / region label |
| `timeframe` | optional | period, e.g. "May 2026", "QoQ" |

Authorship policy intent: `headline`/`market_signal` AI-authored (hard-gated), `supporting_stat`/
context/callout optional; no AI rewrite in v0 (one bounded repair deferred to a later ACI slice).

### 2.3 Visual / layout intent (NOT yet rendered)
Brand-safe `image_quote`: 1:1 first (mirroring the proven `centred-scrim-1x1` treatment family),
**one clear market signal**, concise headline, optional hero-stat callout, a category badge
("MARKET UPDATE"), background photo + legibility scrim, governed logo — **no clutter**, mobile-first
readable, meeting the style-guide `accessibility_rules` (contrast / min font size / text-over-image).
This is *intent only* — no template renders it yet (see missing gates).

### 2.4 Governance / style-guide references
- Style guide: `property-pulse-styleguide-v1` (active) — voice/tone, palette, scrim, logo, safe-area,
  accessibility rules govern this variant.
- Intended composing patterns (all currently `candidate`, not variant-proven):
  `pp_headline_block_v1`, `pp_stat_card_v1` (for the optional hero stat — a forward-looking pattern
  not yet rendered by any proven variant), `pp_category_badge_v1`, `pp_background_plus_scrim_v1`.
- Governed assets (intended): logo `pp_logo_primary`, backgrounds `bg_perth_cbd`/`bg_brisbane_cbd`/
  `bg_sydney_cbd` (via `resolve_brand_assets`, unchanged). Owner ICE · approval PK · AI propose-only.

### 2.5 Platform intent
Intended **facebook + instagram first** (mirroring the proven `news_card.v1` pairs). This is *intent
only* — **NOT `platform_safe`** until per-platform render/safe-area evidence exists.

### 2.6 Evidence + missing gates (honest)
**Evidence (verified read-only, unchanged):** **none** — 0 succeeded renders carrying this
`variant_key` in `m.post_render_log`, 0 publishes, **no `capability_contract` for this key in
`property-pulse.json`** (intentionally not added — a registry contract requires a `maps_to_variant`
template-family variant, which does not exist yet; adding a contract without it would break the
schema/reference-resolution).

**Missing gates (all still open):**
- **template binding (`maps_to_variant`)** — no Creatomate template-family variant exists for
  `market_update` yet (a new provider template, or an extended PP-news family variant, is required).
- **governed** — PK ratification + a style-guide conformance review are not done.
- **renderable** — no governed render (render work is explicitly OUT of this declarative slice).
- **visually_approved** — none.
- **platform_safe** — none.
- **client_enabled** — none.
- **production_proven** — none.

> **Honest state:** `defined` — the content field contract, visual intent, governance refs, and
> platform intent are now authored. It is **NOT** governed/renderable/visually_approved/platform_safe/
> client_enabled/production_proven; **no proof is borrowed from `news_card.v1`** (a distinct variant).
> Advancing to `renderable` requires real template + render work in a later, separately-gated slice.

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
| `…news_card.v1` | **production_proven** (PP × fb+ig) | 4 governed production renders (cited) | 2 publishes — fb + ig (cited) | no — fully evidenced |
| `…market_update.v1` | **defined** (Slice 2A — §2) | none (not yet renderable) | none | no — content/contract defined; all proof gates open |
| `…quote_card.v1` | **proposed** | none | none | no — honest earliest state |

**This pilot enables nothing new in production** — it is evidence / intake / governance recording
only. `news_card.v1` was already live (its lifecycle state backfilled from real evidence; registry
reconciled in Slice 1B); `market_update.v1` is now **`defined`** (declarative content/field-contract
definition only — no render/publish/governance/production evidence, enables nothing); `quote_card.v1`
remains a reserved key at `proposed` and gates nothing.

---

## 5. Risks / open questions

- **R1 — stale registry citation — RECONCILED (Slice 1B, commit `e2e782f`).** The non-existent
  `render_log 52165857` citation was retired and replaced with the 4 real production render IDs;
  creative-graph-auditor PASS. *(closed)*
- **R2 — governance-record gap — RECONCILED (Slice 1B, commit `e2e782f`).** `news_card.v1` ratified
  `active` / production-proven (PP × facebook+instagram only), PK approval trail recorded;
  creative-graph-auditor PASS. *(closed)*
- **R3 — worked-example forward path needs render work:** taking `market_update.v1` past `proposed`
  needs a real template-family variant + governed render — render work outside declarative Slice 1.
  A later gated slice (Branch-B-style) would do that. *(carry)*
- **R4 — no DB-backed state store (D-V1):** lifecycle state is declarative here; a queryable
  canonical store + the GFCP Layer 3 read-only projection (D-V3) remain later, gated steps. *(carry)*

## 6. Recommended next gate

- ~~Reconcile the two `news_card.v1` registry discrepancies (R1, R2) in a separate PK-gated
  `property-pulse.json` pass.~~ **DONE — Slice 1B (commit `e2e782f`, register v4.22):** R1 + R2
  reconciled, creative-graph-auditor PASS, runtime unaffected. Residual: the vendored
  `creative_contract.ts` header comment still says "UNWIRED" (stale; runtime-code doc drift) and the
  dashboard `lib/creative-library/registry.ts` v0.2 re-vendor remain separate carries.
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
