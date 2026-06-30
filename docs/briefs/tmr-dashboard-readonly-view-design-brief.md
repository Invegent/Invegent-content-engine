# TMR Dashboard Read-Only View — UX / design brief (`/create/templates`)

> **Status:** UX / design brief **only**. **No implementation.** No dashboard code, no CE code, no
> RPC, no migration, no DB, no `execute_sql`, no provider API call, no render/publish, no template
> binding, no deploy, no production enablement.
> **Consolidated into register v4.33** (the TMR follow-on design pack); this brief is design-only and updates no register itself.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design (dashboard thinking).
> **Repo:** the future page lives in the SEPARATE `invegent-dashboard` repo
> (`dashboard.invegent.com`), NOT this CE repo. This brief is CE design thinking only.
> **CE state at write time:** `main == origin/main == f900eb8` (observed at write); TMR-1 design landed
> at register **v4.32**; this brief consolidated into register **v4.33** (TMR follow-on design pack).
> **Authoritative model this view renders:** `docs/briefs/template-metadata-registry-v1-design.md`
> (TMR-1). This brief invents **no** new data — every panel maps to a TMR-1 object/field.

---

## 0. What this page is (and is not)

`/create/templates` is the **read-only operator window into the Template Metadata Registry (TMR)** —
the inventory + classification + governance state of every provider template ICE knows about. It is
the **read/browse counterpart** to the Creative Intake *wizard* (the write/create flow,
`creative-intake-new-template-wizard-spec-v1.md`). It answers *"what do we have, and how far along is
it?"* — it never creates, binds, enables, renders, or proves anything.

**Load-bearing discipline (inherited verbatim from TMR-1 §0/§9):** the view must keep these distinct
and **never let one imply another**:

- a provider template **existing** ≠ a governed **variant**;
- template **capability** ≠ **platform proof**;
- **platform suitability** (`candidate`/`platform_safe`) ≠ **production proof** (real render **and**
  publish evidence);
- a generic template ≠ a **client assignment**;
- a **candidate** variant/assignment ≠ an **enabled / proven** one.

If the UI ever makes a candidate *look* proven, it has failed. Honesty over polish.

---

## 1. Where it sits (information architecture)

The dashboard's decided **Create** spine (grounded in shipped/decided layers):

| Surface | Question it answers | Status |
|---|---|---|
| **Create → Format Capability** (GFCP) | Is `platform × format` globally possible / proven / blocked / conflicted? | shipped (v4.19/v4.20) |
| **Create → Templates** (THIS view, TMR read) | What templates exist, what family, what platforms, what variant candidates, which clients, what's blocked, what proof? | **design only** |
| **Create → Creative Intake** (wizard) | How does an operator create & prove a *new* template/variant? | design only |
| Client Overlay · FVI · Content Studio | Can *this client* / *this exact variant* execute now? | shipped / pilot |

`/create/templates` is the **browse + inspect** surface; the Creative Intake wizard is the **act**
surface. A row in this view can deep-link **into** the wizard's review steps (read-only handoff), but
this page itself has **no write controls**.

---

## 2. The seven questions → TMR objects → UI surface (the core contract)

Every question the page must answer maps to an existing TMR-1 object. Nothing is synthesised.

| # | Operator question | TMR-1 source (authoritative) | Where it shows in the UI |
|---|---|---|---|
| 1 | **What templates exist?** | §3 Provider template (`provider_template_id`, `provider_template_name`, dimensions, `output_type`, `inventory_status`) | the **main template table** (one row per provider template) |
| 2 | **Which family do they belong to?** | §2 Template family (`family_key`, `family_name`, `scope`, `industry_vertical`) | **Family** column + **group-by-family** mode + family chip in the drawer |
| 3 | **Which platforms are they suitable for?** | §6 Platform suitability (per-platform `suitability_status`, `reason`) | **Platform suitability strip** (small per-platform status pills) on the row + full table in the drawer |
| 4 | **Which variants are they candidates for?** | §7 Variant candidate mapping (`variant_key`, `fit_status`, `missing_fields`) | **Variant candidates** column (count + strongest fit) + full list in the drawer |
| 5 | **Which clients can use them?** | §8 Client / brand assignment (`assignment_scope`, `assignment_status`, `style_guide_reference`) | **Clients** column (scope + assignment state) + assignment table in the drawer |
| 6 | **What is blocked / missing?** | derived across §3 `inventory_status`, §4 missing fields, §6 `blocked`/`not_suitable`, §7 `needs_template_edit`/`missing_fields`, §8 `client_blocked`, §9 lifecycle gaps | **Blockers / gaps** column (scoped reason chips) + a dedicated **"Needs attention"** filter/section |
| 7 | **What proof exists?** | §6 `proof_reference`, §8 `production_proven`, §9 lifecycle stage, §10 audit, §3 `inventory_hash`/`captured_by` | **Proof** column (lifecycle badge) + **Proof & provenance** panel in the drawer (with evidence ids, never raw payloads) |

---

## 3. Page layout

```
┌ /create/templates ───────────────────────────────────────────────────────────┐
│  Templates                                  [ group: Family ▾ ] [ ⌕ search ]    │
│  Read-only inventory of every provider template ICE knows about.               │
│                                                                                 │
│  ┌ Summary strip (counts, read-only) ────────────────────────────────────────┐ │
│  │  Templates: N   Families: N   Production-proven: N   Needs attention: N     │ │
│  │  By provider: creatomate N · heygen N      By scope: generic/brand/client   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Filters:  [Provider ▾] [Family ▾] [Platform ▾] [Output type ▾]                 │
│            [Lifecycle stage ▾] [Scope ▾] [Needs attention ☐]                    │
│                                                                                 │
│  ┌ Template table (rows = provider templates) ───────────────────────────────┐ │
│  │ Template (name·id·dims)│Family│Output│Platforms│Variant cand.│Clients│Proof│ │
│  │ ───────────────────────────────────────────────────────────────────────── │ │
│  │ news_quote_insight_1x1 │ market│ img  │ fb ig li │ market_update│ PP    │ ⚑  │ │
│  │   490ad9ea… · 1080²     │ insight│ 1:1  │ ● ● ◐ ○○ │  strong (+2) │ approv│smoke│ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                       (row → opens detail drawer)│
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Default grouping: by Template Family** (answers Q2 at a glance; the family is the umbrella, each
  row a concrete provider asset across 1:1 / 4:5 / 9:16 / 16:9 / version / client variants per TMR-1 §2).
- **One row per provider template** (TMR-1 §3). Name shown **with a "name may mislead" affordance** —
  e.g. `news_quote_insight_1x1_v1` is actually a market-insight card (TMR-1 §1/§4); the row shows the
  *classified* family/purpose, not just the raw provider name, so the misleading name never drives the
  read.
- **Platform suitability strip** = small per-platform pills (facebook / instagram / linkedin /
  youtube), colour/'shape'-coded by `suitability_status`, with a tooltip carrying the `reason`.
- Everything is **scannable read-only**; the only interaction is **open drawer** + **filter/search** +
  **deep-link to the wizard's read-only review**.

---

## 4. Detail drawer (per template) — the full TMR record, read-only

Opening a row reveals the complete classification, mirroring the PPP / GFCP read-only drawer pattern
(blocked reasons + operator next-actions prominent; raw technical detail collapsed):

1. **Identity** (§3) — provider, `provider_template_id`, provider name **+ classified purpose**,
   dimensions, `aspect_ratio`, `output_type`, `file_type_candidate`, duration.
2. **Family** (§2) — `family_name`, `family_key`, `scope`, `industry_vertical`, `creative_purpose`.
3. **Field inventory** (§4) — the element table (element_name · field_kind · dynamic/fixed · role),
   e.g. the 8-dynamic + 1-fixed-Scrim set; **only `default_value_safe`/sanitised styles** shown.
4. **Output contract** (§5) — what it can physically produce; the basis for platform suitability.
5. **Platform suitability** (§6) — full per-platform table with `suitability_status`, `reason`,
   `constraints`, `last_reviewed_at`; a labelled note that **suitability ≠ production proof.**
6. **Variant candidates** (§7) — `variant_key` · `fit_status` · `required_field_mapping_status` ·
   `missing_fields`; each labelled **candidate analysis, not a binding.**
7. **Client / brand assignments** (§8) — `assignment_scope` · `assignment_status` ·
   `style_guide_reference` · approval trail; same generic template can list multiple clients with
   independent state.
8. **Governance & proof lifecycle** (§9) — the stage on the
   `discovered → … → production_proven` chain, with the anti-overclaim ladder
   (inventory captured ≠ renderable ≠ platform-safe ≠ client-enabled ≠ production-proven) shown as a
   stepper so the operator sees exactly how far a template really is.
9. **Proof & provenance** (§6/§9/§10) — evidence references (render/publish ids), `captured_by` /
   `captured_at` / `capture_method` / `inventory_hash`; **no raw payloads, no secrets, no tokens.**
10. **Next action (read-only)** — the single concrete next step (e.g. *"capture field inventory"*,
    *"needs template edit for quote element"*, *"awaiting visual approval"*) + a deep-link into the
    Creative Intake wizard where that action is actually performed.

---

## 5. How each state is expressed (the honesty layer)

**Lifecycle badge (Q7 / §9)** — a single per-template maturity label, capped by the weakest proven
layer, never over-claiming:

| Badge | Meaning |
|---|---|
| `discovered` | known to exist, nothing captured |
| `inventory_captured` / `verified` | fields known; **not renderable yet** |
| `classified` / `field_mapped` | family + variant candidates assessed |
| `smoke_rendered` | a render succeeded; **not platform-safe / not published** |
| `visually_approved` / `platform_safe` | safe-area fit confirmed; **not client-enabled** |
| `client_enabled` | a client may use it; **not yet production-proven** |
| `production_proven` | real per-platform render **and** publish evidence exists |
| `blocked` / `deprecated` | scoped block / retired |

**Blockers / gaps (Q6)** — scoped reason chips, each naming *which layer* failed (so a block is never
generic): `inventory_missing` · `fields_unmapped` · `platform_not_suitable` · `needs_template_edit` ·
`no_render_proof` · `no_publish_proof` · `client_blocked` · `unassigned`. A **"Needs attention"**
filter collects every template with ≥1 open blocker.

**Suitability pills (Q3)** use distinct visual states for `production_proven` vs `platform_safe`/
`candidate` vs `not_suitable`/`blocked`/`unknown` — and the proven state is reserved **only** for
templates with real evidence, never for "configured/candidate" rows.

---

## 6. Empty / partial / loading states (important — TMR has no tables yet)

TMR-1 is **design-only**; the backing tables are a later **TMR-2/TMR-3** task. The view must therefore
degrade honestly:

- **Registry-not-yet-populated** (no TMR backend): show an explicit *"Template Metadata Registry not
  yet populated"* empty state, **not** a fake/seeded grid. Never imply templates exist when the
  registry is empty.
- **Partial capture** (template row exists but inventory/suitability/variant not captured): show
  **`unknown` / `not_captured`** explicitly per cell — never blank-as-OK, never inferred.
- **Loading**: skeleton rows; never optimistic placeholder data.
- **Single known real template today** (`490ad9ea…`, the misleadingly-named market-insight card) is the
  natural first/only row when the registry is first populated — and it must read as
  `market_update.v1 = strong_candidate`, `quote_card.v1 = needs_template_edit`, **not** as a proven
  quote card.

---

## 7. Read-only & safety guarantees (UX-level)

- **No write controls anywhere** on this page — no create/edit/bind/enable/approve/render/publish
  buttons. The only actions are filter, search, open-drawer, and deep-link to the wizard's review.
- **Backend (future):** consumes a **read-only TMR contract** (service-role read RPC or server-action
  assembly, dashboard server-side only — mirroring the GFCP/PPP Slice-1A posture); **browser never
  calls it directly**; **no secrets / raw provider payloads / tokens** ever rendered (TMR-1 §3/§10).
- **No proof borrowing:** the view shows only evidence that exists for *that* template/platform/client;
  it never reuses one cell's proof to colour another.

---

## 8. Open design questions (for later — none block this thinking pass)

- **Q-A — Grouping default:** family-major (recommended) vs provider-major vs flat? (recommended:
  family-major, with a provider toggle.)
- **Q-B — Where the misleading-name affordance lives:** inline rename-display vs tooltip-only.
  (recommended: show classified purpose as primary, raw provider name secondary with an ⓘ.)
- **Q-C — Client column density:** show all assignments inline vs a count + drawer. (recommended:
  count + scope summary inline, full table in drawer.)
- **Q-D — Relationship to GFCP:** should a template row link to the GFCP `platform × format` cell it
  supports? (recommended: yes, read-only cross-link once both exist — TMR-1 §12.)
- **Q-E — Variant deep-link target:** link a variant candidate to FVI's variant lifecycle view.
  (recommended: yes, read-only.)

---

## 9. Explicit non-claims / scope

- **Design thinking only** — no dashboard/CE/runtime code, no RPC, no migration, no DB, no
  `execute_sql`, no provider/Creatomate/HeyGen call, no render/publish, no template binding, no
  deploy, no production enablement, **no secrets in docs.**
- **Register:** consolidated into v4.33 (TMR follow-on design pack); this brief itself updates no register.
- **Depends on TMR backend existing first** — the view is unbuildable until TMR-2/TMR-3 create the
  tables and a read contract; this brief is the UX layer that will sit on top, not a build.
- **No overclaim:** candidate ≠ proven; suitability ≠ proof; template ≠ variant; assignment ≠
  enablement. `quote_card.v1` stays `needs_template_edit`; `market_update.v1` stays a strong
  *candidate*; `news_card.v1` remains the only production-proven variant (PP × facebook + instagram).
- **Read-only:** this page never mutates TMR or any downstream system; the wizard owns all writes.

---

## Cross-references

- **Authoritative model:** `docs/briefs/template-metadata-registry-v1-design.md` (TMR-1 — every panel
  maps to its §2–§10 objects).
- Creative Intake (write flow this view complements): `docs/briefs/creative-intake-operator-flow-v1.md`,
  `docs/briefs/creative-intake-new-template-wizard-spec-v1.md`.
- Provider inventory capture / read-access source: `docs/briefs/creative-intake-provider-inventory-capture-model-v1.md`,
  `docs/briefs/provider-inventory-read-access-pattern-v1.md`,
  `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md`.
- Read-only-view pattern parents (posture + drawer reuse): GFCP
  `docs/briefs/global-format-capability-pyramid-slice0-brief.md`; PPP Slice 1B (shipped read-only
  client Pyramid).
- Downstream systems TMR feeds (TMR-1 §12): GFCP · Client Overlay · FVI · Creative Library · Format Mix.
