# Creative Library A1 — Closeout (A1.0 → A1.5)

> **Docs-only closeout.** Captures what A1 built, proved, deliberately did NOT build, the
> current truth, the open carries, and the recommended next direction. No code/DB/worker/
> dashboard/provider/production-behaviour change is described or implied here. Registers: v3.93.

## 1. Executive summary

Creative Library A1 moved ICE from **"assets + templates"** to a **Governed Creative Design
System**: Style Guide → (governs) → Assets + Patterns → (compose) → Template Families →
(instantiate as) → Creative Instances → Evidence. The model is **declarative and governed** —
ICE governs, providers render, PK approves, AI proposes (never approves). It is **visible** (a
read-only dashboard) but **not yet consumed by production workers**.

## 2. What was built

| Phase | Outcome | Register |
|---|---|---|
| **A1.0** Architecture Ratification | The Governed Creative Design System model ratified (layer model + core principle) | v3.86 |
| **A1.1** Registry Schema Evolution | `registry-schema-v2.md`; `property-pulse.json` v0.1→v0.2 (additive) | v3.87 |
| **A1.2** Pattern Library v1 | 5 Property Pulse patterns formalised (candidate; `proof_posture` vocab) | v3.88 |
| **A1.3** Property Pulse Style Guide v1 | `property-pulse-styleguide-v1` (brand constitution; `governance_candidate`) | v3.89 |
| **A1.4** Template Families v1 | `property-pulse-news` family + 2 proven variants formalised | v3.90 |
| **A1.5** Dashboard v2 Visibility | `/creative-library` re-vendored v0.2 + 4 sub-tabs, live in production | v3.92 |
| **`creative-graph-auditor`** | Read-only static auditor of the v2 declarative graph, registered in the team contract | v3.91 |

## 3. What was proven

- Governed creative objects (Style Guide, Patterns, Template Families, Variants) **can be modelled** declaratively.
- **Proof is carried at the variant level** — only variants with a real `render_log_id` are `proven`; families/patterns/style-guides are never render-proven.
- The dashboard **can display the v2 model** (Style Guide / Patterns / Families / Evidence) read-only in production.
- The Creative Library **remains read-only and governed** — the dashboard assigns no proof and performs no writes.
- Production operator testing **exposed a real legacy defect**: `c.client_brand_profile.brand_logo_url` for Property Pulse pointed at a missing logo (`property_pulse_icon_500.png`), failing the production Creatomate render path (46 failed renders).
- A **minimal config repair** (repoint to the existing governed `PP_logo_2.png`) unblocked the render path — single-row DML, externally reviewed, PK-applied, verified.
- **Operator testing is now producing useful product evidence** (the 3-test forensic audit + the queued retest).

## 4. What was deliberately NOT built

- Branch B (production runtime registry consumption).
- Production runtime consumption of the declarative registry by any worker.
- A Content Studio **creative treatment selector**.
- A1.6 Intake Generalisation.
- HeyGen / avatar governance.
- Character library.
- Voice library.
- Provider-side source-of-truth (providers stay renderers only).
- AI approval of creative objects (AI proposes; PK/governance approves).

## 5. Current truth

- The Creative Library is **visible and governed**.
- The Creative Library is **NOT yet consumed by production workers**.
- Production workers still read the **brand-profile logo field** (`c.client_brand_profile.brand_logo_url` via `getBrand`/`getBrandAndSlug`).
- The governed resolver (`resolve_brand_assets`) **exists but is not the production render path** (it lives only in image-worker's isolated `creative_library_manual_render` Lane-3B mode; video-worker has none).
- **Content Studio is Creative-Library-unaware today.**
- **Creative treatment belongs under format** (format is the contract; treatment is a governed choice within it).
- **The Advisor remains sovereign** over format decisions; operators express preferences only.

## 6. Known carries

- Dashboard **vendored registry must be re-vendored** on any source change (no auto drift detection; currently v0.2 @ `161816a`).
- **image-worker QA gap** — image renders carry no `render_spec.qa`.
- **Production worker logo source is still the legacy brand profile** (not the governed resolver).
- **Content Studio operator explainability gaps** (e.g. why a platform/format is unavailable).
- **LinkedIn image policy decision** — taxonomy `platform_support` has `image_quote`/`carousel` = `linkedin:false`, yet LinkedIn image publishers exist; intended-or-stale is a product decision.
- **Episode edit / regenerate / approve controls** not built (Series UI).
- **Publish-queue render-success gate** — publishes were enqueued despite failed renders.
- **A1.6 intake model** (generalise intake to patterns/style-guides/families) — future.
- **Branch B** — production registry consumption — future.
- **HeyGen / avatar / voice governance** — future.
- **Architecture mind-map agent / mapkeeper** (Ask-ICE / operator advisor) — future idea.

## 7. Next mountain (recommended direction)

1. **Wait for the four queued Property Pulse posts to publish.**
2. Run a **post-publish Production Evidence Audit** (read-only forensic, same method as the 3-test audit).
3. **Verify Creatomate production recovery** (the logo fix unblocked ~40+ renders — confirm the next batch renders clean).
4. **Improve Content Studio operator explainability** (surface why a format/platform is unavailable, before submission).
5. **Then** decide whether to implement creative-treatment selection.
6. **Branch B later** — only if evidence demands it.
7. **HeyGen later** — only if evidence demands it.

Detailed sequencing: see [creative-library-next-mountain.md](creative-library-next-mountain.md). Operator
principles: see [../operator/ice-operator-philosophy.md](../operator/ice-operator-philosophy.md).
