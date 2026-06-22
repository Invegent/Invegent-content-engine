# Brief — Creative Library v0 pilot: Property Pulse News · Centred Headline / Centred Scrim 16:9 (docs-only spec)

<!-- Selected template: PP_NEWS_CENTRED_SCRIM_16x9_v1 (16:9 master only; secondary 9:16/1:1/4:5 deferred). -->
<!-- File kept at its original ...centred-headline-16x9 path to avoid churn; the variant/template names below are authoritative. -->


**Created:** 2026-06-21 Sydney
**Author:** chat (Session 1, docs/planning owner)
**Status:** PLANNING / SPEC — docs-only. The v0 pilot specification for the first Creative Library
template variant. **Implements nothing. DO NOT IMPLEMENT YET** — any build is a future, separately
PK-gated lane with its own gates.
**Class:** `docs_only` — 0 code / 0 DB / 0 migration / 0 deploy / 0 provider/Creatomate call / 0
template creation / 0 worker invocation / 0 render / 0 publish / 0 dashboard change / 0 AGP/avatar change /
0 secret access / 0 new `ice_format_key`.

> **Terminology:** ICE = the Invegent Content Engine **product**; Invegent = company/platform owner.
> Decision provenance: registers **v3.77** (CE HEAD `2c6901e`) — Creative Library v0 is **shrunk,
> doc/config-backed, evidence-first**. This brief specifies the first pilot variant only.

---

## 1. Executive intent

- **Prove the bridge** from an approved static design → an **executable Creatomate template** that ICE
  can drive with structured props — for one brand, one family, one variant.
- **Keep v0 small and evidence-first:** the win is a single, repeatable, *measured* template render whose
  provenance is captured additively in `m.post_render_log.render_spec.template`. No platform, no registry,
  no automation. If this one variant renders correctly and logs clean evidence, the bridge is proven.

## 2. Pilot scope

| Dimension | v0 value |
|---|---|
| Brand | **Property Pulse** (first pilot) |
| Template family | **Property Pulse News** |
| First variant | **Centred Headline / Centred Scrim** |
| **Selected design artifact** | **Property Pulse News — Centred Scrim design pack** (refined; reviewed + accepted 2026-06-21 as the first-template design source) |
| **Provider template name** | **`PP_NEWS_CENTRED_SCRIM_16x9_v1`** (the Creatomate template to be created — Gate A, §8) |
| **First implementation target** | **16:9 master ONLY** (1920×1080) |
| **Secondary ratios** | **9:16, 1:1, 4:5 — DEFERRED future adaptations** (in the design pack; NOT part of the first implementation) |
| Provider path | **Creatomate TEMPLATE mode** (a Creatomate-hosted template referenced by id — NOT the in-code SOURCE-composition path the current `video-worker` uses) |
| Output | 16:9 landscape still image, **1920×1080** |
| Execution | **manual / template-only smoke** (a hand-driven Creatomate render with fixed props), NOT wired into any worker/pipeline |

**Design pack contents (selected source, recorded — not produced here):** master 16:9 / 1920×1080 frame;
secondary adaptations for 9:16 / 1:1 / 4:5 (deferred); editable layer list (§6); a Creatomate
implementation note; safe-margin guidance; and **consistent layer names across ratios** (§6). The pack is
the *design source* for the template; the template itself is built at **Gate A** (§8).

> Note the provider-path contrast with the existing render audits: today's `video-worker` builds Creatomate
> **SOURCE compositions in code** (`render-provider-creatomate-capability-audit.md` §1). Creative Library v0
> deliberately uses **Creatomate TEMPLATE mode** (a hosted template + modifications) — a distinct path,
> chosen because it is the direct executable form of an approved design.

## 3. Explicit exclusions (v0 does NOT include)

- **No DB registry / no new tables** — v0 is doc/config-backed only.
- **No Template Intelligence Layer** (no learned/auto template selection).
- **No advisor automation** (the format/creative advisor is untouched).
- **No publish integration** — the smoke render is never published, queued, or enqueued.
- **No new `ice_format_key`** — v0 introduces no format key (binding decision deferred — see §10).
- **No avatars / character assets** — excluded pending AGP / `c.brand_avatar` direction; **Branch B NOT
  AUTHORISED**.
- **No AGP changes**, no `AVATAR_SHADOW_TELEMETRY` change, no marker writes.
- **No multi-brand onboarding** — Property Pulse only; no NDIS/CFW/Invegent template work in v0.
- **No automated QA engine** — QA stays the existing additive `render_spec.qa` (QA Visibility v0).

## 4. Field schema (the variant's structured props)

The Centred Headline 16:9 variant accepts exactly these fields. **Max lengths are design-fit caps**
(final values pending the real template — see §10); **fallback behaviour** is what the manual smoke does
when a field is absent.

| Field | Req? | Max length (proposed) | Fallback behaviour |
|---|---|---|---|
| `headline` | **required** | ~70 chars (≈2 lines, centred) | none — a missing headline is a hard skip (do not render a headline-less card) |
| `subtitle` | optional | ~90 chars | omit the subtitle element (no placeholder text) |
| `category_badge` | optional | ~18 chars | hide the badge element |
| `location` | optional | ~40 chars | hide the location line |
| `date` | optional | ~24 chars (e.g. "21 June 2026") | hide the date line |
| `footer_label` | optional | ~40 chars | fall back to a fixed brand default (e.g. "Property Pulse") |
| `background_photo` | optional | n/a (asset ref) | fall back to a solid brand-colour background (see §5) — never render with a broken/empty image |
| `logo` | optional | n/a (asset ref) | fall back to the Property Pulse wordmark text, or omit if neither available |

> Validation discipline (manual in v0): truncate-with-ellipsis on overflow rather than letting text
> overflow the safe area; **the required `headline` is the only hard gate.** All fallbacks are
> *documented manual behaviours* for the smoke — there is no fallback CODE in v0.

## 5. Asset requirements (referenced, not created — **no asset creation in this brief**)

- **Property Pulse logo** — the existing brand logo asset (URL/path TBD from the brand profile or the
  uploaded seed design; see §10). Not produced here.
- **Approved background/photo source** — **DECIDED (§10): PK-supplied / licensed image ONLY — no scraping,
  no auto-sourcing, no generation.** A single PK-approved licensed seed image for the smoke.
- **Brand colours** — Property Pulse's existing brand palette (primary/secondary) from the brand profile;
  used for the solid-colour background fallback and accent elements.
- **Font** — **DECIDED (§10): Montserrat** (matches the existing ICE render specs), else a PP-compatible
  Creatomate-supported font with the substitution noted. No new font licensing in this brief.
- **No asset creation, upload, or generation occurs from this brief.** Assets are *referenced by the
  later smoke*, sourced from existing brand assets + the seed design.

## 6. Creatomate mapping (template + modification keys)

- **Provider template name:** **`PP_NEWS_CENTRED_SCRIM_16x9_v1`** (created at Gate A, §8 — **DONE 2026-06-22**).
- **`provider_template_id`:** **`48cba556-0a53-4001-90f0-05420d10efc0`** (Gate A complete; Creatomate template
  exists). URL: `https://creatomate.com/projects/2f8d12c7-5149-4655-bef2-8f9b5587fd11/templates/48cba556-0a53-4001-90f0-05420d10efc0`.
- **Aspect ratio:** 16:9; **output 1920×1080**, **JPEG**.
- **Editable / exported layers** = the 8 modification keys below.
- **`Scrim`** = a **FIXED shape layer** (a constant darkening overlay for headline legibility) — part of the
  exported template but **NOT a modification key** (no prop drives it; it never changes per render).
- **`SafeMargin`** = a **GUIDE only** — design-time safe-area guidance; it is **NOT exported** into the
  Creatomate template (it must not appear in the rendered output).
- **Modification keys** (Creatomate "modifications" map — element name → property):

| Field (§4) | Creatomate modification key |
|---|---|
| `headline` | `Headline.text` |
| `subtitle` | `Subtitle.text` |
| `category_badge` | `CategoryBadge.text` |
| `location` | `Location.text` |
| `date` | `Date.text` |
| `footer_label` | `Footer.text` |
| `background_photo` | `Background.source` |
| `logo` | `Logo.source` |

> These element names are the **contract** the Creatomate template must expose. When the real template is
> built (a separate gated step), its element names must match this map exactly, or the map is updated here
> first.

## 7. Evidence shape — additive `render_spec.template`

Evidence **extends** the existing `m.post_render_log.render_spec` JSON spine. It is **additive and
sibling to `render_spec.qa`** (QA Visibility v0) — **no new evidence table**, no change to the
`write_render_log` RPC signature (the JSON payload simply carries a new `template` key).

```jsonc
// m.post_render_log.render_spec  (existing { qa: {...} } stays; template is ADDED alongside)
{
  "qa": { /* unchanged — render_spec.qa from QA Visibility v0 */ },
  "template": {
    "template_id":          "pp-news-centred-scrim-16x9",      // ICE-side stable id for this variant
    "template_version":     "v1",                              // template name is ..._v1; bump on field/mapping change
    "template_family":      "property-pulse-news",
    "template_variant":     "centred-scrim-16x9",
    "provider":             "creatomate",
    "provider_template_id": "48cba556-0a53-4001-90f0-05420d10efc0", // PP_NEWS_CENTRED_SCRIM_16x9_v1 (Gate A)
    "props_hash":           "<hash of the resolved field values>", // reproducibility / dedupe
    "asset_ids":            ["<logo asset ref>", "<background asset ref>"], // refs, not bytes
    "fallback_taken":       false                              // true if any §4 fallback fired
  }
}
```

- `props_hash` = a stable hash of the **resolved props** (post-fallback) — lets two renders be compared
  for "same inputs" without storing the raw text.
- `asset_ids` = **references** (urls/keys), never asset bytes.
- `fallback_taken` mirrors the `render_spec.qa.fallback_taken` convention.
- **No schema migration** — this is JSON inside an existing `jsonb` column.

## 8. Gate sequence + smoke test plan (later, separately gated — NOT run by this brief)

> **GATE A — ✅ DONE (2026-06-22): template created, NO render.** One Creatomate template
> **`PP_NEWS_CENTRED_SCRIM_16x9_v1`** (id `48cba556-0a53-4001-90f0-05420d10efc0`), **16:9 / 1920×1080 JPEG**,
> exposing the §6 modification keys + the fixed `Scrim`, no `SafeMargin`. **No render smoke was run.**
> Deviations recorded in §10.2 (temporary Unsplash background + placeholder logo to replace via
> `Logo.source`; CategoryBadge letter-spacing removed for Creatomate validation; Scrim `fill_rotation`
> dropped, gradient still renders — no visual blocker). Secondary ratios (9:16/1:1/4:5) were **not**
> created at Gate A.
>
> **GATE B1 — ✅ DONE (2026-06-22): manual provider VISUAL export.** A manual Creatomate export produced a
> correct **1920×1080** image (headline readable, subtitle/logo/scrim OK, no SafeMargin visible, background
> correct; minor non-blocking notes: logo slightly dominant, large top sky, footer/date tunable). **This is
> provider-side VISUAL proof ONLY** — it does NOT touch ICE, `m.post_render_log`, `render_spec.template`,
> `render_spec.qa`, storage, or publish.
>
> **GATE C — ✅ COMPLETE / PROVEN (2026-06-22, registers v3.81; shipped `image-worker` v3.10.2, merged
> main `b1feb54`).** One ICE-controlled `template_smoke` render wrote a verified `m.post_render_log` row:
> `status=succeeded`, `render_engine=creatomate`, `ice_format_key='image_quote'` (PK Option A — the column
> is NOT NULL + FK to `t."5.3_content_format"`, so the smoke uses the nearest governed key; identity lives
> in `render_spec.template`, smoke marker in `render_spec.label='creative_library_smoke'`), null draft/client,
> full `render_spec.template` (`provider_template_id=48cba556…`, `props_hash`, `fallback_taken=false`),
> storage+output URLs; 0 queue/0 publish/0 draft side effects; `render_spec.qa` absent (image-worker not
> QA-instrumented — future gap). Original steps (now satisfied):

> **GATE C — the ICE-controlled evidence smoke (NEXT, separately PK-gated):** drive the template through
> the ICE render path so a real `m.post_render_log` row is written, then verify the evidence. A render =
> a provider call + credits → its own gate. **NOT done.** Steps:

**Gate C — ICE-controlled evidence smoke steps:**

1. **One controlled template render** of the variant with fixed, PK-approved props (a real-estate/news
   headline + the PK-supplied/licensed seed photo + the PP logo).
2. **No publish / no queue / no enqueue** — the output is inspected, not distributed.
3. **No provider/Creatomate call until separately PK-approved** (the actual render IS a provider call +
   credits → its own gate).
4. **Verify visual output** — the rendered 1920×1080 still matches the approved design (headline centred,
   safe-area respected, brand colours/logo correct).
5. **Verify `render_spec.template`** — present, well-formed, all §7 fields populated, `fallback_taken`
   accurate.
6. **Verify `render_spec.qa`** — still present and unchanged (the additive `template` key must not
   disturb the existing QA object).
7. **Record cost/credits if available** (see §9).

## 9. Cost / fallback note

- **Creatomate credit capture may be null** at render time on some paths — if the render response carries
  credits, record them in `render_spec.qa.cost_*` (existing fields); if not, **estimate manually** and
  note it as an estimate.
- **Production fallback is DEFERRED to v1** — v0's fallbacks (§4) are documented *manual* behaviours for
  the smoke, not a coded fallback engine. A robust render-time fallback path (e.g. auto solid-colour on
  missing photo) is a v1 concern.

## 10. Decisions (RESOLVED by PK 2026-06-21)

1. **`ice_format_key` binding → DECIDED: MANUAL-ONLY smoke for v0, NO key binding, NO new key.** The v0
   smoke is a hand-driven Creatomate render with fixed props; it is **not** bound to any existing
   `ice_format_key` and introduces **no new** key. A pipeline/format-key binding is a future, separately
   PK-approved step (not v0).
2. **Final Creatomate template id → RESOLVED at Gate A (2026-06-22):** `provider_template_id` =
   **`48cba556-0a53-4001-90f0-05420d10efc0`** (template `PP_NEWS_CENTRED_SCRIM_16x9_v1`, 1920×1080 JPEG).
   **Gate A deviations (recorded, no visual blocker):** background is a **temporary Unsplash placeholder**;
   logo is a **temporary placeholder** (must be replaced via `Logo.source`); `CategoryBadge` letter-spacing
   removed (Creatomate validation); the `Scrim` gradient persists visually but the unsupported
   `fill_rotation` was dropped (no visual blocker). **No render smoke was run at Gate A.**
3. **Font → DECIDED: Montserrat (primary), else an existing PP-compatible Creatomate font.** Montserrat
   matches the current ICE render specs (the existing `video-worker` already renders in `Montserrat`), so
   it is the consistent default; if a licensing/availability issue arises, substitute a PP-compatible
   Creatomate-supported font and note the substitution.
4. **Photo source → DECIDED: PK-supplied / licensed ONLY. NO scraping, NO auto-sourcing, NO generation.**
   The seed background for the smoke is a single PK-approved, licensed image; ICE does not source it
   automatically in v0.

## 11. Acceptance checklist

- [ ] Brief reviewed (PK).
- [ ] **No scope creep** — still doc/config-backed, single variant, no registry/automation/publish.
- [ ] **AGP collision avoided** — no avatar/character/`c.brand_avatar`/marker/Branch-B touch.
- [ ] **Format-key scoping respected** — keyed conceptually from `ice_format_key` (not `render_engine`);
      no new `ice_format_key` introduced.
- [ ] **Render evidence shape accepted** — `render_spec.template` is additive, sibling to `render_spec.qa`,
      no new table, no RPC signature change.
- [ ] **Design pack accepted** — Property Pulse News — Centred Scrim pack is the selected design source;
      **16:9 master only** for first implementation; secondary ratios (9:16/1:1/4:5) deferred.
- [ ] **Gate A understood** — the next provider-side step is *template creation only*
      (`PP_NEWS_CENTRED_SCRIM_16x9_v1`, 16:9), **no render smoke**, separately PK-gated.

## 12. Scope / non-goals + provenance

Docs only. No code, no DB mutation, no migration, no deploy, no provider/Creatomate call, no template
creation, no worker invocation, no render, no publish, no dashboard change, no AGP/avatar change, no
secret access, no new `ice_format_key`. This is the **pilot spec**; the Creatomate template build, the
manual smoke render, and any pipeline binding are **future, separately PK-gated steps**. Decision context:
registers v3.77 (CE HEAD `2c6901e`). Companions: `render-provider-creatomate-capability-audit.md`,
`creative-render-intelligence-character-architecture.md`. **DO NOT IMPLEMENT YET.**
