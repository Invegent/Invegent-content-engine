# Content Studio Capability Guidance v1 (design brief — docs/design only)

> **Status:** design / guardrail brief **only**. **No UI built, no runtime change, no Content-Studio
> code change, no format/variant enabled.** No `property-pulse.json`/`creative_contract.ts`/
> `registry-schema-v2.md`/schema/runtime/DB/migration/dashboard change, no `execute_sql`, no render,
> no publish, no Creatomate call, no deploy, no production enablement, no GFCP Layer 3, no template
> binding, no quote_card/market_update render proof.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design (+ register record).
> **CE state at write time:** `main == origin/main == dc450647cf8446207a810c14ae41089895a9a025`;
> register **v4.24**.
> **Purpose:** define how a future Content Studio should *consume* ICE capability truth (Global Format
> Capability + Client Capability Overlay + Format Variant Intake + the selector decision) so that
> **manual** content creation can request formats and variants **without bypassing** capability proof,
> client eligibility, platform safety, or governance. This brief decides direction; it builds nothing.

---

## 0. Inputs (the capability truth Content Studio must respect)

| Source of truth | What it answers | Status | Reference |
|---|---|---|---|
| **Global Format Capability Pyramid (GFCP)** | Is `platform × format` globally supported / proven / blocked / conflicted? | **Shipped + visually confirmed** (read-only RPC `public.get_global_format_capability_pyramid` + `/create/format-capability`) | register v4.19/v4.20 |
| **Client Capability Overlay** | Is *this client* allowed/safe for `platform × format` right now? | **Shipped + visually confirmed** (server-side merge GFCP × PPP on the client Schedule tab) | register v4.21 |
| **Format Variant Intake (FVI)** | If a specific `variant_key` is wanted, is that *exact* variant governed/eligible? | **Pilot:** `news_card.v1` active/production-proven (PP × fb+ig only); `market_update.v1` + `quote_card.v1` **defined/unwired** | `format-variant-intake-pp-image-quote-pilot-v1.md`; register v4.23 |
| **Selector decision** | When no `variant_key` is supplied, what is selected? | **Decided:** automated PP `image_quote` stays `news_card.v1`; manual/Studio explicit variant intent is the next safe evolution; content-class + variant-mix deferred | `format-variant-selector-decision-record.md`; register v4.24 |

**Foundational rule (binding):** Content Studio is a *consumer* of this truth, **never a source of it**.
It may request; it may **not** self-authorize. `defined` ≠ `executable`.

---

## 1. What Content Studio is allowed to request

A future Studio **request object** may carry:

| Field | Required? | Notes |
|---|---|---|
| `client` | required | the operating client (e.g. Property Pulse) |
| `platform` | required | facebook / instagram / linkedin / youtube / … |
| `format` | required | an existing `ice_format_key` (e.g. `image_quote`) — Studio does **not** invent formats |
| `variant_key` | optional | an *explicit* variant request (e.g. `property_pulse.image_quote.news_card.v1`); absent ⇒ safe default |
| `content_intent` | optional | the editorial intent / angle (informational, not a selector input in v1) |
| `source` / content payload | required-for-build | the actual copy/fields/source the asset is built from |
| `manual_approval_state` | required-before-publish | operator approval marker (proposed → approved); see §2.6 |

> **The request is NOT automatically executable.** Submitting a request is a *proposal*. Whether Studio
> may **offer** an option, **build/render** it, or **publish** it is decided by the gates in §2 — never
> by the request alone. **AI/operator proposes; the gates + PK approve.**

---

## 2. Required gates before Studio can offer or execute a choice

Studio (and/or the server it calls) must clear these gates **in order**. A gate that fails stops the
chain at the failure policy in §7.

1. **Global Format Capability (GFCP) gate.** Is `platform × format` globally **supported/proven**, or
   **blocked/conflicted**? Blocked ⇒ not offerable. Conflicted ⇒ review-required (not silently offered).
2. **Client Overlay gate.** Is *this client* **allowed/safe** for `platform × format` (the merged
   GFCP×PPP `overlay_status`)? `client_blocked` / `globally_blocked` ⇒ not offerable;
   `needs_client_setup` ⇒ setup-required; conflict states ⇒ review-required (per R-MAP1/R-MAP2).
3. **Format Variant Intake gate.** *If* a `variant_key` is supplied, is that **exact** variant
   `governed` **and** `eligible` for this `client × platform × format`? Only an FVI-proven, in-scope
   variant passes. A `defined`/unwired variant **fails** this gate.
4. **Selector-default gate.** *If no* `variant_key` is supplied, use the **safe default only** (per
   the v4.24 decision: PP `image_quote` ⇒ `news_card.v1`). Never auto-substitute a different variant.
5. **Platform-safety gate.** Does the *rendered* asset meet the platform's requirements (aspect/safe-
   area/spec)? No platform-safe evidence ⇒ not publishable on that platform.
6. **Human-approval gate.** For **manual** Studio, require explicit operator **approval before
   publish** (manual_approval_state = approved). No silent publish.

> Gates 1–4 are **eligibility** (may we offer/select this?). Gate 5 is **renderable-on-platform**.
> Gate 6 is **human sign-off**. All six must hold before a manual publish.

---

## 3. Explicit variant-intent rule (the v4.24 selector decision, applied to Studio)

- **Manual / Content Studio explicit variant intent is the next safe selector evolution** (Option 5 →
  Option 2 from the selector decision record). Studio is the *first* safe place for it because it is
  operator-driven and approval-gated.
- A future Studio request **may carry `variant_key`**.
- The resolver **may select that exact variant only if it is eligible** (governed + render-proven +
  platform-safe + client-enabled for that variant).
- **Default fallback remains `news_card.v1`** for Property Pulse `image_quote` when no `variant_key`
  is supplied.
- **`quote_card.v1` and `market_update.v1` must NOT be selected** merely because they are **defined**.
- **`defined` does not mean `executable`.** A defined-but-unwired variant is a catalog entry, not a
  runnable choice.
- A **missing or ineligible** requested variant must **fail closed**, or fall back to `news_card.v1`
  **only under a documented policy** (to be defined when the explicit-intent path is built — **not
  authorized here**). No implicit fallback in the absence of such a policy.

---

## 4. Studio UI guidance (future behavior — not built here)

- **Show only safe/eligible formats by default** (those passing the GFCP + Client Overlay gates).
- **Show blocked/conflicted options as disabled with a reason** — never hidden-and-silently-droppable
  in a way that hides *why* (operator should see "blocked: …", "conflict: review required").
- **Show defined-but-unwired variants as "not available yet"** (visible for transparency, **not
  selectable**) — e.g. `quote_card.v1`, `market_update.v1`.
- **Show production-proven variants distinctly** from defined/unproven variants (a proven badge vs a
  "defined only / not available yet" badge) so the operator never confuses catalog presence with
  executability.
- **Warn if a `platform × client` pair is globally conflicted** (surface the Overlay conflict reason;
  do not let the operator proceed as if clean).
- **Never let the operator publish from an unproven/unapproved variant** — the publish control is
  disabled until gates §2.3/§2.5/§2.6 hold.
- **Distinguish, as separate operator-visible facts** (do not collapse into one "available" flag):
  - **format availability** (GFCP),
  - **client enablement** (Overlay),
  - **variant eligibility** (FVI),
  - **render proof** (a real governed render exists),
  - **publish proof** (a real publish exists for `client × platform × variant`).

> The UI's job is to make the *difference* between "exists", "eligible", "render-proven" and
> "publish-proven" legible — so an operator cannot mistake a `defined` variant for a usable one.

---

## 5. Manual Studio vs automated scheduling

- **Automated scheduling remains conservative** — it stays on the safe default per the v4.24 decision
  (PP `image_quote` ⇒ `news_card.v1`); it does **not** gain variant choice from this brief.
- **Studio can become the first safe place for explicit variant intent** precisely because it is
  **operator-driven and approval-gated** (a human selects and signs off before publish), so a wrong
  choice is caught at the human-approval gate rather than fanning out automatically.
- **Studio must NOT automatically expand into content-class or weighted variant selection** (Options 3
  and 4 stay deferred). Studio offers *explicit* operator choice, not automated classification.
- **Any future automated selector must be separately proven** end-to-end before it is allowed to pick
  variants without a human in the loop.

---

## 6. Minimal future implementation path (likely slices — NOT implemented here)

Defined for sequencing only; each is a separate, separately-authorized, PK-gated slice:

1. **Studio capability read-model / server-side loader** — read-only: surface GFCP + Client Overlay +
   FVI eligibility to Studio (server-side, no browser-direct RPC), so Studio can *display* eligibility.
   *(Read-only guidance/status first — the recommended first build.)*
2. **Studio request object includes optional `variant_key`** — additive, opt-in; default unchanged.
3. **Eligibility check for requested `platform × format × variant`** — the gate logic of §2.1–§2.4 as a
   server-side check (deterministic; no AI scoring).
4. **Manual approval gate** — operator approval state required before publish (§2.6).
5. **Render proof gate** — a governed render must exist/succeed before publish is offered (§2.5 input).
6. **Publish gate** — publish only when all gates hold; record publish evidence.
7. **Dashboard / status surfacing** — operator-facing eligibility/proof status (ties to GFCP/Overlay).

> Sequence intent: **read-only guidance/status (slice 1) before editable execution (slices 2–6).**

---

## 7. Failure policy (deterministic, fail-safe)

| Condition | Policy |
|---|---|
| Unsupported **global** format (`platform × format` not supported by GFCP) | **BLOCK** (not offerable) |
| **Client disabled** for `platform × format` (Overlay `client_blocked` / `needs_client_setup`) | **BLOCK or SETUP-REQUIRED** (offer the setup path, not the publish path) |
| **Global conflict** (Overlay conflict state, R-MAP1/R-MAP2) | **REVIEW-REQUIRED** (surface reason; do not auto-proceed) |
| Variant **`defined` only** (not render-proven) | **BLOCK from render** (visible as "not available yet") |
| Variant **missing inventory / template** (no element inventory or `maps_to_variant`) | **BLOCK** |
| Variant **requested but ineligible** (not governed/render-proven/platform-safe/client-enabled) | **FAIL CLOSED** |
| Fallback to the safe default | allowed **only if an explicit documented fallback policy exists** (§3); otherwise fail closed |

**Default posture: fail closed.** When in doubt, do not offer/execute; surface the reason.

---

## 8. Current examples (Property Pulse — honest, no overclaim)

| Studio request | Outcome | Why |
|---|---|---|
| PP · facebook · `image_quote` · **no `variant_key`** | **Eligible → `news_card.v1`** (the safe default) | v4.24 selector default; `news_card.v1` production-proven for PP × facebook |
| PP · facebook · `image_quote` · `variant_key = news_card.v1` | **Eligible** | production-proven for PP × **facebook** (publish `1472a6fa`) |
| PP · instagram · `image_quote` · `variant_key = news_card.v1` | **Eligible** | production-proven for PP × **instagram** (publish `88ee578a`) |
| PP · facebook · `image_quote` · `variant_key = quote_card.v1` | **BLOCKED / not available** | **`defined` only** — no template inventory (BLOCKED pending safe Creatomate read), no render proof |
| PP · facebook · `image_quote` · `variant_key = market_update.v1` | **BLOCKED / not available** | **`defined` only** — no template binding, no render proof |

> **No overclaim:** `quote_card.v1` and `market_update.v1` are **`defined` only / unwired** — not
> governed, not renderable, not platform_safe, not client_enabled, not production_proven; **no proof is
> borrowed from `news_card.v1`**. `news_card.v1` is production-proven for **PP × facebook + instagram
> only** — no other platform, no broadening.

---

## 9. Output decision (recommendation)

- **Content Studio should be the first place to support explicit variant intent** — it is operator-
  driven and approval-gated, the safest entry point for the v4.24 Option 5 → Option 2 evolution.
- It **must be gated by GFCP + Client Overlay + Format Variant Intake** (the §2 gate chain) — Studio
  consumes capability truth, it never overrides it.
- **Do not expose unproven variants as executable** — `defined`/unwired variants are shown as "not
  available yet", never as a runnable choice.
- **Build read-only guidance/status first** (§6 slice 1) **before** any editable execution — let the
  operator *see* eligibility/proof before Studio can *act* on a variant request.

This brief authorizes **no implementation**. The first buildable step (separately authorized) is the
**read-only Studio capability read-model / status surface**; explicit `variant_key` execution and its
gates are later, separately-gated slices that must not change the conservative automated default.

---

## Explicit non-claims / scope
- **Docs/design only.** No UI built, no runtime/Content-Studio/dashboard code change, no
  `property-pulse.json`/`creative_contract.ts`/schema/DB/migration change, no `execute_sql`, no render,
  no publish, no Creatomate call, no deploy, no production enablement, no GFCP Layer 3, no template
  binding, no quote_card/market_update render proof, **no format or variant enabled.**
- `quote_card.v1` / `market_update.v1` remain **`defined` only / unwired**; `news_card.v1` remains the
  **default + production-proven** variant (PP × facebook + instagram only). No proof borrowed.
- This brief defines **future guardrails**; it decides direction, it does not implement.

## Cross-references
- Selector decision (v4.24): `docs/briefs/format-variant-selector-decision-record.md`.
- Variant inventory + selector options (Slice 3B): `docs/briefs/format-variant-quote-card-inventory-selector-model-brief.md`.
- quote_card template inventory (Slice 3D, BLOCKED): `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md`.
- FVI pilot records: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md`.
- GFCP (shipped): register v4.19 (RPC) / v4.20 (UI). Client Overlay (shipped): register v4.21.
- Operator philosophy: `docs/operator/ice-operator-philosophy.md` (§9 — Studio reduces uncertainty before submission).
- Register: v4.25 (this brief).
