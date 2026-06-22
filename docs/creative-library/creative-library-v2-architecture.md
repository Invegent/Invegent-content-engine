# Creative Library v2 — Governed Creative Design System (A1.0 Architecture Ratification)

> **Status: RATIFIED (A1.0, 2026-06-23).** This document is the authoritative
> architecture foundation for all subsequent Creative Library implementation work.
> **Docs-only ratification — NO production behaviour changes.** PK has approved this
> architectural direction. This closes **A1.0**.
>
> **Nothing here is consumed by production workers.** Declarative architecture only.

---

## 1. Architecture reconciliation summary

The **Creative Library Foundation Sprint is CLOSED** and proven end-to-end (still-image
governed, animated proven, governed assets + secure resolver + governed render evidence +
production dashboard). Two reviews then reframed the *next* phase:

- The **Property Pulse Template Priority Audit** showed the first real expansion should be
  built around **reusable creative structures**, not individual content themes.
- The **Creative Library v2 Architecture review** concluded the Creative Library is evolving
  into a **Governed Creative Design System** — a **taxonomy evolution, not an infrastructure
  rewrite**.

This ratification records that model as approved. It is an **additive evolution** of the
existing, proven foundation — not a replacement. No tables, code, resolver, worker, dashboard,
or provider behaviour changes as part of A1.0.

---

## 2. Core principle

> **ICE owns creative governance. Providers execute renders. PK remains approval authority.
> AI may propose. AI never approves.**

This is unchanged from v1 and is reaffirmed as the spine of v2.

---

## 3. Creative Library v2 — definition

Creative Library is **no longer** defined as:

> ~~Assets + Templates~~

It is now defined as:

> **A Governed Creative Design System.**

A governed system of styles, assets, patterns, template families, instances, and evidence —
each a first-class, PK-governed concept — that composes reusable creative structure under the
established ICE governance discipline.

---

## 4. Layer model (approved)

```
                 Style Guide
                     │  governs
                     ▼
            ┌────────────────────┐
            │  Assets   +   Patterns   │   ← sibling governed libraries
            └────────────────────┘
                     │  compose
                     ▼
              Template Families
                     │  instantiated as
                     ▼
              Creative Instances
                     │
                     ▼
                  Evidence
```

**Load-bearing relationships:**

- **Assets and Patterns are SIBLING governed libraries.** Neither is nested under the other.
- **Patterns MAY reference Assets.** (A pattern can use a governed asset.)
- **Assets do NOT belong beneath Patterns.** Assets are independently governed and reusable.
- **Template Families compose BOTH** Assets and Patterns.
- **Creative Instances** are concrete instantiations of a Template Family.
- **Evidence** records what was actually produced (the existing `render_spec` spine generalised).

---

## 5. Layer definitions (first-class governed concepts)

| Concept | Purpose | Relationships |
|---|---|---|
| **Style Guide** | The brand-level governing rules (palette, type, tone, scrim/overlay conventions, safe areas) that constrain everything below. | **Governs** Assets, Patterns, Template Families, and Instances for a brand. |
| **Assets** | Governed brand media (logos, backgrounds, etc.) — the existing `c.client_brand_asset` library, resolved via `resolve_brand_assets`. | A **sibling** of Patterns. May be **referenced by** Patterns and **composed by** Template Families. Independently governed. |
| **Creative Patterns** | Reusable creative *structures* (layout/composition recipes, motion patterns, scrim-headline arrangements) — the "how it is built", independent of any one theme. | A **sibling** of Assets. **May reference** Assets. **Composed by** Template Families. Governed in its own library. |
| **Template Families** | Provider-backed template groupings that **compose** Assets + Patterns into a renderable family (e.g. "Property Pulse News"), spanning aspect ratios/variants. | **Composes** Assets + Patterns. **Instantiated as** Creative Instances. Maps to provider template(s). |
| **Creative Instances** | A concrete instantiation of a Template Family with specific field values + resolved assets → a single renderable creative. | **Instantiated from** a Template Family. **Produces** Evidence on render. |
| **Evidence** | The governed record of what was produced (provider, template identity, asset_ids, resolver_used, fallback_taken, QA, props_hash, output). | Generalisation of the existing `render_spec.template` / `render_spec.qa` evidence spine. |

---

## 6. Foundation preservation (explicitly UNCHANGED)

Creative Library v2 is **additive**. The following remain exactly as proven in the Foundation
Sprint and are **NOT** changed by this ratification or by v2 in general:

- **Governed assets** (`c.client_brand_asset`) — unchanged.
- **`resolve_brand_assets()`** — unchanged behaviour and signature.
- **Resolver scope** (service_role-only, approved+active, per client_slug + asset_keys) — unchanged.
- **Provider ownership model** (providers execute renders; ICE governs) — unchanged.
- **Evidence-first governance** (`render_spec` spine) — extended, not replaced.
- **Intake framework** (`docs/creative-library/intake/` schema + agent spec) — unchanged.
- **Review-packet workflow** (PK reviews before upload/governance) — unchanged.
- **PK approval gate** — unchanged and never weakened.

> **Creative Library v2 is an additive evolution. Not a rewrite.**

---

## 7. Registry direction (declarative only)

The next implementation phase will **extend the declarative registry**
(`docs/creative-library/<brand>.json`) with:

- `style_guide` — the brand style-guide reference.
- `patterns[]` — the governed Creative Patterns library.
- `composed_of_patterns[]` — which patterns a Template Family / implementation composes.
- a **generalised evidence model** — Evidence as a first-class, pattern-aware concept (a
  superset of today's `render_spec.template`).

> **Declarative architecture only. NOT yet consumed by production workers.**

This mirrors the v1 discipline: the registry describes governed structure; nothing in
production routing reads it until a separate, PK-gated lane wires a consumer.

---

## 8. Sprint reframe — Creative Library Expansion roadmap

The **Creative Library Expansion** roadmap **Lane A** is reframed:

- ~~**Lane A — Template Factory**~~ → **Lane A — Creative Design System**

### Planned phases (Lane A — Creative Design System)

| Phase | Name | Scope (high-level) |
|---|---|---|
| **A1.0** | **Architecture Ratification** | **THIS lane — CLOSED.** Ratify the v2 model (this document). Docs-only. |
| A1.1 | Registry Schema Evolution | Extend the declarative registry with `style_guide`, `patterns[]`, `composed_of_patterns[]`, generalised evidence (declarative only). |
| A1.2 | Pattern Library v1 | Define the first governed Creative Patterns (declarative). |
| A1.3 | Style Guide v1 | Define the first governed Style Guide (declarative). |
| A1.4 | Template Families | Compose Assets + Patterns into the first governed Template Family/families (declarative). |
| A1.5 | Dashboard Evolution (future) | Revisit the Creative Library dashboard IA to surface the new layers (future; see §9). |
| A1.6 | Intake Generalisation | Generalise the intake framework (review packets, scores, agent) to cover Patterns / Style Guides / Template Families, not just assets. |

All **later lanes remain unchanged** unless they directly conflict with this approved
architecture. Each phase is its own separately-PK-gated lane; sequencing here is declarative.

---

## 9. Implementation sequence

`A1.0 (ratify) → A1.1 (registry schema) → A1.2 (patterns) → A1.3 (style guide) →
A1.4 (template families) → A1.6 (intake generalisation)`; **A1.5 (dashboard) is deferred**
until the Creative Design System sprint is otherwise complete.

Discipline (unchanged ICE order): **declarative first → governed → (only then, separately
gated) operational.** No phase consumes the registry in production without its own PK gate.

---

## 10. Dashboard

**Do NOT redesign the dashboard in this sprint. No navigation changes.**

> **Carry (future):** the Creative Library dashboard IA will be revisited (phase A1.5) **after**
> the Creative Design System sprint is complete, to surface Style Guides / Patterns / Template
> Families / Instances. Not now.

---

## 11. Constraints (binding)

This ratification and all of Lane A must hold to:

- **No** new database tables / migrations.
- **No** resolver behaviour change.
- **No** registry consumption in production.
- **No** dashboard redesign.
- **No** additional infrastructure invented.
- **No** weakening of governance.

And the established ICE principles:

- **Governance before execution.**
- **Evidence before promotion.**
- **Declarative before operational.**
- **Providers execute · ICE governs · PK approves.**

---

## 12. No-production-change confirmation

A1.0 is **documentation only**. As ratified here: 0 DB / 0 migration / 0 code / 0 worker /
0 resolver / 0 dashboard / 0 provider / 0 render / 0 deploy / 0 registry-JSON / 0 asset /
0 production behaviour change. The live render/publish paths, `resolve_brand_assets`, the
governed assets, the production dashboard, and all worker behaviour are **unchanged**.

> **This architecture ratification closes A1.0 and is the authoritative foundation for all
> subsequent Creative Library implementation work.**
