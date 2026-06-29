# Format Variant Selector — PK decision record (multi-variant `image_quote`)

> **Type:** PK selector-model decision record (docs/design/register only). **No implementation, no
> binding, no runtime change.** No `property-pulse.json`/`creative_contract.ts`/schema/runtime/DB/
> dashboard change, no render, no publish, no Creatomate API call, no deploy, no production enablement.
> **Recorded:** 2026-06-30 (CE session). **Decided by:** PK.
> **Decides against:** `docs/briefs/format-variant-quote-card-inventory-selector-model-brief.md`
> (Slice 3B, verdict `READY_FOR_SELECTOR_DECISION_RECORD`) and
> `docs/briefs/format-variant-quote-card-template-binding-feasibility.md` (Slice 3A).
> **CE state at record time:** `main == origin/main == c7aa3b319e7d518409f9b83c5661f60578e48baf`;
> register **v4.23** (→ v4.24 with this record).

---

## 0. Context

Slice 3A/3B established that the current variant selection is **format-level only**: the advisor
picks `recommended_format`; `resolveCreativeContract(client_id, recommended_format)` returns the
**single** `news_card` contract for `(PP, image_quote)`; ai-worker stamps `draft_format.contract`
**additively** (no render/selection effect). `(client, format)` is **1:1** with one contract, so
multiple variants per `(client, format)` are unrepresentable today (the NEEDS_SCHEMA_DECISION
co-requisite). This record fixes the selector model **before** any template binding or runtime work.

---

## 1. Decision (PK)

- **Keep Option 1 NOW** — **one active *automated* variant per client × format.** For Property Pulse
  `image_quote`, the automated/default variant **remains `property_pulse.image_quote.news_card.v1`**.
- **Adopt Option 5 → Option 2 as the next evolution (gated, later):** **manual / Content Studio
  explicit variant intent first**, then explicit-variant **resolver support**. A future manual/Studio
  request *may* carry a requested `variant_key`; the resolver *may* select that exact variant **only
  if it is governed and eligible**. The **default fallback remains `news_card.v1`**.
- **Defer Option 3** (automated content-class selector) until explicit-intent is proven end-to-end.
- **Defer Option 4** (weighted variant mix) until after that.
- **No runtime change is authorized by this record.** It is a direction-setting decision only.

---

## 2. Implications

- The existing **automated PP `image_quote` path stays on `news_card.v1`** — unchanged.
- **`quote_card.v1` and `market_update.v1` remain `defined` / unwired** — they do **not** enter
  automated scheduling.
- Future `quote_card.v1` (and `market_update.v1`) work must proceed, in order, through:
  1. **template inventory** (Creatomate element list — read-only, authorized, later slice)
  2. **template definition / registry object** (a declarative Template-Family variant, `unproven`)
  3. **governed ratification** (PK + style-guide conformance)
  4. **render proof** (a real governed render → proven `render_log_id`; §8)
  5. **visual approval** (PK)
  6. **platform safety** (per-platform render/safe-area)
  7. **explicit manual / Content Studio variant-intent path** (Option 5/2 plumbing)
  8. **only later** automated selection (Option 3/4) **if separately proven**

---

## 3. Safety rules (binding)

- **No implicit second variant under the same `(client, format)` gate.** The deterministic
  `(client_id, recommended_format)` gate stays 1:1 with `news_card.v1` until an explicit
  variant-intent input exists.
- **No automatic fallback from `news_card.v1` to `quote_card`/`market_update`.**
- **No variant is selected unless explicitly requested AND eligible** (governed + render-proven +
  platform-safe + client-enabled for that variant).
- **Default fallback remains `news_card.v1`.**
- If a requested variant is **missing or ineligible**, the path **fails closed** or falls back to
  `news_card.v1` **only under a documented policy** (to be defined when the explicit-intent path is
  built; not authorized here).
- This record authorizes **no runtime, resolver, schema, registry, or production change.**

---

## 4. Option summary (from Slice 3B — recorded for traceability)

| Option | Decision |
|---|---|
| **1 — one active automated variant per client×format** | **KEEP (now)** — automated stays `news_card.v1` |
| **2 — explicit variant intent (`variant_key` input)** | **ADOPT (next, gated)** — after Option 5 |
| **3 — content-class selector** | **DEFER** until explicit-intent proven |
| **4 — weighted variant mix** | **DEFER** (far future) |
| **5 — manual / Content Studio explicit first** | **ADOPT (next, gated)** — the conservative real-usage entry |

---

## 5. Explicit non-claims / scope

- `quote_card.v1` and `market_update.v1` are **`defined` only** — **NOT** governed/renderable/
  visually_approved/platform_safe/client_enabled/production_proven. No proof is borrowed from
  `news_card.v1`.
- `news_card.v1` remains the **current automated + production-proven** variant (PP × facebook +
  instagram only) — unchanged, not broadened.
- This is a **decision record only**: no `property-pulse.json`/schema/runtime/`creative_contract.ts`/
  DB/dashboard change, no render/publish, no deploy, no production enablement.

## 6. Recommended next gate

- Build nothing automated. The next *buildable* step is a separately-authorized **Creatomate-read
  slice** to capture the `news_quote_insight_1x1_v1` element inventory (read-only) → the
  Template-Definition doc → a declarative variant object → governed render. The **explicit
  variant-intent (Option 5/2) plumbing** is a later, separately-gated runtime slice that must not
  change the automated default.

---

## Cross-references
- Slice 3B (selector options): `docs/briefs/format-variant-quote-card-inventory-selector-model-brief.md`.
- Slice 3A (binding feasibility): `docs/briefs/format-variant-quote-card-template-binding-feasibility.md`.
- Variant records: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md`.
- Selector / stamping code (read-only, unchanged): `supabase/functions/{image,ai}-worker/creative_contract.ts`,
  `supabase/functions/ai-worker/index.ts`.
- Register: v4.24 (this record).
