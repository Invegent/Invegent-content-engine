# Global Format Capability Pyramid — Slice 1B (read-only dashboard UI design brief)

> **Status:** product / UI **design brief only**. **No implementation.** No dashboard code, no
> deploy, no DB, no RPC, no migration, no CE code, no editable UI, no variant implementation.
> **Produced:** 2026-06-29 (CE session — SESSION 2, parallel-safe with Session 1).
> **Type:** docs/brief only.
> **Repo of future execution:** the SEPARATE `invegent-dashboard` repo (`dashboard.invegent.com`),
> **NOT** this content-engine repo. This brief lives in CE docs as the design record.
> **Builds on (approved):** `docs/briefs/global-format-capability-pyramid-slice0-brief.md` +
> `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md` (PK D1–D5 approved).
> **Backend dependency (NOT required to exist yet):** the future Slice 1A read contract
> `public.get_global_format_capability_pyramid(...)` (Slice 0 §5/§6). This brief designs the UI
> **ahead of** that backend; it does not require it to be built.
> **Proven UI pattern this mirrors:** PPP Slice 1B read-only client Pyramid (live in dashboard
> production — `components/clients/PublishingPlanPyramid.tsx`, register v4.15/v4.16).

---

## 0. Standing status (explicit)

- **This is a proposal, NOT implemented.** No dashboard route, component, server action, or deploy.
- **The backend contract it consumes does not exist yet** and is **not required** for this design
  pass (Slice 1A is briefed-but-unbuilt per the Slice 0 decision record §2). This brief is
  deliberately produced in parallel so the UI shape is ready when Slice 1A lands.
- **Approved direction it relies on (Slice 0 decision record D1–D5):** layered evidence/reconciliation
  model (D1); service-role SECURITY DEFINER RPC contract (D2); evidence-based `publisher_path_status`
  with honest uncertainty (D3); variant proof = production-evidence-only, mostly `not_modelled` (D4);
  **page location = Create → Format Capability** (D5).
- **Load-bearing framing:** v0 is an **evidence-and-reconciliation view**, NOT the canonical
  source-of-truth. The UI must *show disagreement honestly*, never manufacture a single clean answer.

---

## 1. Page location and navigation

- **Location:** **Create → Format Capability** (PK-approved, Slice 0 D5).
- **Nav entry:** a new top-level item under the **Create** section, sibling to existing Create
  surfaces — labelled **"Format Capability"**. It earns its own surface (not nested under "Formats"
  or "Creative Library") because it spans platform · format · policy · render · publish · proof ·
  creative evidence · diagnostics.
- **Route shape (suggested):** `/create/format-capability` (final path is a dashboard-repo
  convention call at implementation time; not decided here).
- **Access:** same authenticated dashboard surface as other Create pages. Read-only; no role gating
  beyond existing dashboard auth (no admin-only controls exist in v0).

### Distinction from the client Publishing Plan Pyramid (must be visually unmistakable)

| | **Global Format Capability Pyramid** (this brief) | **Client Publishing Plan Pyramid** (shipped) |
|---|---|---|
| Question | "What can ICE support **globally**?" | "What has **this client** enabled/enrolled?" |
| Location | Create → Format Capability | client **Schedule tab** (`/clients?...&tab=...`) |
| Scope | client-**agnostic** capability surface | one client's adoption/enrollment |
| Client picker | **none** in v0 (no per-client lens) | bound to the selected client |
| Matrix axes | rows = formats, cols = platforms | rows = formats, cols = platforms (same) |
| Editing | none | none (read-only) |

The page header must state, in plain words, **"System-wide capability — not client-specific. For a
client's enabled/enrolled formats, see the client Publishing Plan Pyramid."** so an operator never
mistakes the global view for a client view.

---

## 2. Page purpose

Make the **system-wide platform × format capability truth** a first-class, explainable surface:

1. Show, for every modelled **(platform × format)** pair, **how far up the capability stack it has
   actually climbed** — from "declared in theory" through "configured", "governed", "render-proven",
   "publish-proven", to "proven in production".
2. **Surface disagreement as the product.** Where the layered sources conflict (a default exists where
   support is false; publish evidence without declared support), the page must *show the conflict*,
   not hide it behind a single tidy state. This is the load-bearing difference from the client PPP.
3. Let an operator tell a **global capability gap** ("ICE has no publisher path for this pair at all")
   apart from a **client adoption gap** ("this client hasn't enabled it") — the latter stays the
   client PPP's job; this page answers only the former.
4. Render **honest empty/uncertain states**: "publisher path unknown", "not modelled yet", "evidence
   only" must read as *truthful incompleteness*, never as a defect or a false green.

**Out of purpose (v0):** it does not decide capability (it reports evidence), does not enable/enroll
anything for any client, does not edit config, and is not the canonical model (that is the future
Canonical Capability Model v1).

---

## 3. Layout

A single read-only page, top-to-bottom. Mirrors the proven PPP Slice 1B vertical rhythm (header →
summary → matrix → drawer → placeholder) with one global-specific addition: a **diagnostics
section**.

### 3.1 Header summary band
- Page title **"Global Format Capability"** + the client-agnostic disclaimer (§1).
- `contract_version` (e.g. `gfcp.v0`) and `generated_at` shown as a small "as of" stamp.
- **Capability roll-up counts** from `global_summary`: total cells; counts by `global_support_state`
  (proven-in-production / smoke-proven / configured / theory-only / blocked / conflict / not-modelled);
  **conflict count** called out distinctly (it is the headline health signal of the reconciliation).
- A compact **legend** of the cell-state colour/badge system (§5) — always visible or one click away,
  because the matrix is dense.

### 3.2 Platform summary row
- A boxed summary **per platform** (the modelled set: facebook · instagram · linkedin · youtube;
  website/WordPress shown as **evidence-only** and clearly flagged if surfaced at all).
- Per platform: how many formats are proven-in-production / configured / theory-only / blocked, and a
  one-glance "publisher path" health hint (proven / inferred / unknown coverage).
- This is the global analogue of the PPP "platform mix summary row" — but it summarises **capability
  maturity**, not a client's mix percentages.

### 3.3 Format-major matrix (the core)
- **rows = formats** (the `t."5.3_content_format"` universe, with `display_label`), **columns =
  platforms** — the transpose of the client PPP (global view is format-capability-major).
- Each cell = one `(platform × format)` `global_support_state`, encoded by colour + badge (§5).
- A **conflict/diagnostic marker** (e.g. a small ⚠ corner flag) overlays any cell whose layers
  disagree, in addition to its base state — so a "configured" cell that is *also* in conflict still
  reads as configured-but-flagged.
- Cells are **click-to-open-drawer** (§3.5). Hover shows a one-line state summary; the full proof
  chain is the drawer, not the tooltip (avoids the tooltip-clipping class of bug; no raw dumps).
- Dense-grid hygiene: sticky format-label column + sticky platform header; horizontal scroll inside a
  contained scroll region (the matrix can be wide); **no popover may be trapped inside the scroll
  container** (explicit lesson carried from the PPP tooltip hotfix — drawers/popovers anchor at page
  level, not inside the scrolling matrix).

### 3.4 Diagnostics row / section (global-specific, load-bearing)
- A dedicated **Diagnostics** section below the matrix, fed by `diagnostics[]` (Layer G).
- Lists each conflict cell: which `(platform × format)`, which layers disagree, and the **nature of
  the clash** in plain language — e.g. *"Configured default 5% exists but platform_support=false
  (declared support and configured default disagree)."*
- Also surfaces `missing_model_pieces[]` ("variant capability not modelled", "no publisher capability
  catalog") as honest, named gaps — distinct from conflicts.
- This section is the reconciliation product: it is where PK reads *where the model is wrong or
  incomplete*. It must be present even when empty ("No layer conflicts detected" — neutral, not red).

### 3.5 Side drawer (read-only, per cell)
- Opens on cell click; mirrors the PPP read-only drawer pattern.
- **Top, prominent:** the resolved `global_support_state` + `evidence_maturity` label, then
  **blocked reasons** and **operator actions** (the actionable bits first).
- **Middle:** the **layered proof chain** (§6) rendered as a stack so the operator sees exactly which
  layer is satisfied and which is missing.
- **Bottom, collapsed under "Technical details":** safe whitelisted `detail_payload` only. **No raw
  `render_spec` dumps, no secrets, no tokens, no prompts** (§9).
- Drawer anchors at page level (not inside the matrix scroll region).

### 3.6 Layer 3 variant placeholder
- A clearly-labelled **"Variant capability — not modelled yet (v0)"** section/placeholder.
- Where safe production variant evidence exists (`render_spec.variant_key` from `m.post_render_log`),
  show it as **evidence only**, captioned "production evidence, not an allowlist". Otherwise the
  section reads `not_modelled`. No variant matrix, no variant editing, no docs-JSON authority.

---

## 4. Matrix orientation

- **rows = formats**
- **columns = platforms**
- This is the **transpose of the client Publishing Plan Pyramid** (which is also format-major but in
  a client context). Keeping the same axis convention means the two pyramids read consistently while
  the *content* (capability vs adoption) differs. Confirmed direction from Slice 0 §10.

---

## 5. Cell states (visual model)

Each cell resolves to exactly **one** base `global_support_state` (Slice 0 §4), optionally overlaid
with a **conflict flag**. Proposed honest visual encoding (final palette is a dashboard styling call;
the *semantics* and ordering are fixed here):

| State | Meaning (from Slice 0 §4) | Visual intent |
|---|---|---|
| **Proven in production** | render proof **and** publish proof observed | strongest positive (green, solid) |
| **Smoke-proven** | governed smoke/proof render observed; publish not yet proven | positive-but-partial (green, hollow / teal) |
| **Configured and enforceable** | declared + configured + governance present + enforcement path | neutral-positive (blue) |
| **Configured but not smoke-proven** | declared + configured, no governed render/proof yet | neutral (light blue / grey-blue) |
| **Supported in theory only** | declared support only; no config / policy / proof | faint neutral (grey) |
| **Ungoverned** | appears (config/evidence) but governance policies absent | amber (caution, not error) |
| **Blocked** | a hard prerequisite missing; names which layer (`*_gap`) | red — but **only** for a true hard block |
| **Conflict / diagnostic** | layers disagree (overlay flag + Diagnostics row) | ⚠ overlay on the base state |
| **Not modelled yet** | no backing model (e.g. variant) | hatched / "—" neutral, captioned |

Rules:
- **A cell is never red merely because a count is zero or a proof is simply absent** — absence of
  proof maps to "configured but not smoke-proven" / "theory only" / "unknown", not to red. Red is
  reserved for a genuine hard block.
- **Conflict is an overlay, not a replacement** — a configured cell that conflicts still shows
  configured + a ⚠; the Diagnostics section (§3.4) explains it.
- The legend (§3.1) must define every state in operator language.

---

## 6. Drawer content (per cell)

Rendered as the layered proof chain (Slice 0 layers A–G), top-to-bottom, each line honestly labelled
present/absent/unknown. All values come from the Slice 1A matrix-cell fields (Slice 0 §6); **none are
invented in the UI**.

1. **Declared support** — Layer A (`platform_support`): supported / not supported / unknown.
2. **Configured default** — Layer B (`configured_default_present`, `default_mix_pct`): present + the
   default share **labelled "configured default, not enforced globally"** (display only).
3. **Policy readiness** — Layer C (`synthesis_policy_present`, `quality_policy_present`,
   `fitness_policy_present`): each shown present/missing.
4. **Render proof** — Layer D (`render_path_status`, `render_provider` where safe):
   proven / evidence-only / none / unknown; provider shown only where safe (creatomate/heygen/…).
5. **Publish proof** — Layer E (`publisher` reach evidence): proven / none / unknown.
6. **Creative proof** — Layer F (`creative_library_status`): production_evidence / none
   (evidence only, never presented as an allowlist).
7. **Publisher path status** — Slice 0 D3 labels: `publisher_proven` / `publisher_inferred` /
   `publisher_unknown` / `publisher_blocked` / `publisher_unsupported` — **honest uncertainty, never
   invented certainty**.
8. **Blocked reasons** — `blocked_reasons[]`, each scoped to the failing layer
   (`global_platform_block` / `policy_gap` / `render_path_gap` / `publisher_path_gap` / `proof_gap` /
   `creative_library_gap` / `variant_model_gap`).
9. **Diagnostics** — any Layer-G conflict touching this cell, in plain language (also in §3.4).
10. **Operator actions** — `operator_actions[]`: the exact next step(s), if any (e.g. "no render path
    — capability gap, needs a render-path build", "evidence-only publish — confirm publisher
    coverage"). Read-only suggestions; **the page performs no actions**.

Plus, collapsed under **"Technical details"**: the safe whitelisted `detail_payload` only.

---

## 7. Clear distinction from the client Pyramid (v0 boundaries)

- **No client enablement in v0** — the page shows no per-client enabled/enrolled state. Client
  adoption is the **deferred client-overlay** (§11), not v0.
- **No client editing** — nothing on this page mutates client config, enrollment, or schedule.
- **No schedule controls** — no cadence, no max-per-week, no slot controls (those belong to the
  client Schedule editor / client PPP).
- The page is **read-only, client-agnostic, capability-only**. A header disclaimer (§1) makes this
  explicit so it is never confused with the client PPP.

---

## 8. Variant posture

- **Mostly `not_modelled`** in v0 — there is no DB-backed variant capability registry; docs JSON is
  **not** runtime authority (Slice 0 D4 / §8).
- **Production evidence shown where safe** — `render_spec.variant_key` from `m.post_render_log` may be
  surfaced as **evidence only**, captioned "production evidence, not an allowlist".
- **Layer 3 stays a placeholder** (§3.6) until a real variant capability model exists (future
  `c.client_format_variant_*`-style work, separately gated). No variant matrix or editing in v0.

---

## 9. What the UI must NOT show (safety)

- **No secrets** — `page_access_token`, `credential_env_key`, `destination_id` never rendered;
  `page_id` only ever as a boolean "connected" signal, never the value.
- **No raw `render_spec` dumps** — only whitelisted contract-identity fields via `detail_payload`.
- **No tokens / client credentials** of any kind.
- **No raw prompts** unless explicitly marked safe in the contract (default: do not show).
- **No raw `c.client.profile`** or other free-form client config blobs.
- The browser **never calls the RPC directly** — all data arrives via the dashboard service-role
  server action (mirrors PPP Slice 1B: server-side only). The UI consumes an already-sanitised,
  whitelisted payload; it must not re-derive or fetch anything secret client-side.

---

## 10. MVP Slice 1B scope

**In scope (the read-only page):**
- The **Create → Format Capability** route + nav entry.
- One **read-only server action** (dashboard, service-role) that calls the Slice 1A contract and
  passes through the already-sanitised payload (no new secret derivation).
- **Header summary band** (§3.1), **platform summary row** (§3.2), **format-major matrix** (§3.3),
  **Diagnostics section** (§3.4), **read-only side drawer** (§3.5), **Layer 3 variant placeholder**
  (§3.6).
- Full **cell-state encoding + legend** (§5) and **honest empty/uncertain states** throughout.
- Consistency reuse: reuse PPP/Creative-Mix cell + drawer rendering helpers where they fit, since the
  cell contract intentionally mirrors PPP Slice 1A (`evidence_maturity`, `blocked_reasons`,
  `detail_payload`).

**Explicitly out of MVP scope:**
- No client overlay / per-client lens · no client picker on this page.
- No editing, write RPC, dry-run, or admin controls.
- No variant matrix / variant model build (placeholder only).
- No schedule controls.
- No correction of the `t.*`/`m.*` conflicts (they are *surfaced* as diagnostics, not fixed).
- No publisher capability catalog build (publisher status stays evidence/inference).
- No CE code, no DB mutation, no migration, no deploy beyond the standard dashboard gate trail when
  Slice 1B is later implemented and approved.

---

## 11. Later enhancements (separately gated)

- **Client overlay** — overlay a selected client's enabled/enrolled state onto the global matrix so a
  global gap and a client gap are visible together (the base→overlay relationship from Slice 0 §1).
- **Canonical Capability Model v1** — after v0 exposes enough conflicts, the normalized
  source-of-truth tables/catalogs (Slice 0 §3 carry); the UI would then read the canonical model
  instead of reconciling raw sources.
- **Variant model** — a real `c.client_format_variant_*`-style capability model → a populated Layer 3.
- **Editable / admin controls** — governed capability administration (declare support, configure
  defaults) with write guardrails. Far future; not before the canonical model and a security review.
- **Static publisher capability catalog** — replaces inferred publisher status with a declared table.

---

## 12. Open PK / product decisions

The Slice 0 source/contract decisions (D1–D5) are already resolved, so most direction is fixed. UI
design decisions still open for PK:

- **UI-D1 — Nav label & exact route.** "Format Capability" under Create, route `/create/format-capability`?
  *(Recommended: yes; final route is a dashboard-repo convention call.)*
- **UI-D2 — Website/WordPress columns.** Show website/WordPress as an **evidence-only** column in the
  matrix, or keep the v0 matrix to the four modelled social platforms and surface website only in
  Diagnostics/`missing_model_pieces`? *(Recommended: four-platform matrix in v0; website as an
  evidence-only/Diagnostics note to avoid implying a modelled capability that isn't.)*
- **UI-D3 — Diagnostics prominence.** Diagnostics as a section **below** the matrix (recommended), or
  also as an always-visible header banner when conflict count > 0? *(Recommended: section below +
  header conflict count; promote to banner only if conflicts are chronically high.)*
- **UI-D4 — Variant placeholder visibility.** Always render the Layer-3 placeholder (recommended, so
  the "not modelled yet" gap is honest and visible), or hide it until a variant model exists?
  *(Recommended: always render, captioned.)*
- **UI-D5 — Legend placement.** Persistent legend vs collapsible. *(Recommended: persistent compact
  legend given matrix density.)*

No decision here forces a default that changes production behaviour; all are presentation calls on a
read-only surface.

---

## Validation (this design pass)

- **No implementation occurred** — design brief only; no component, route, or server action written.
- **No dashboard code changed** — nothing edited in the `invegent-dashboard` repo.
- **No deploy occurred.**
- **No DB mutation occurred** — no RPC, no migration, no `execute_sql`, no apply, no ledger change.
- **No CE code / worker / publisher / render / schedule / avatar / video / scene change.**
- **No tooltip-hotfix work touched.**
- **No editable / variant / write work started.**

---

## Hard stop

This is the design brief. **Stop after the brief.** Implementation (Slice 1B in `invegent-dashboard`)
is a separate, later, PK-gated lane that runs *after* Slice 1A (the read contract) exists, through the
standard gate trail (ef/build → `tsc`/`next build` → branch-warden → external review → PK deploy
hard-stop). **Do not push unless separately authorised.**

---

## Cross-references

- Slice 0 brief: `docs/briefs/global-format-capability-pyramid-slice0-brief.md` (source map, layered
  model, cell states §4, payload schema §6, UI direction §10).
- Slice 0 decision record: `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md`
  (PK D1–D5 + Canonical Capability Model v1 carry).
- Proven UI pattern: PPP Slice 1B — `components/clients/PublishingPlanPyramid.tsx` (separate
  `invegent-dashboard` repo); register notes v4.15 (ship) + v4.16 (tooltip hotfix).
- Proven contract pattern: `docs/briefs/ppp-slice1a-data-contract-validation.md`.
- Inventory grounding: `docs/briefs/publishing-plan-pyramid-inventory-brief.md`.
