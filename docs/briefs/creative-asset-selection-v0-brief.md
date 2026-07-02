# Brief — Creative Asset Selection v0 — Template Slot Matching & Safe Asset Choice (design)

**Created:** 2026-07-02 Sydney
**Author:** chat (PK-directed framing)
**Executor:** Claude Code (design/discovery) → PK gate before any build
**Status:** draft
**Result file:** `docs/briefs/results/creative-asset-selection-v0-result.md` (on completion)

---

## Task

Design (do **not** build yet) the **decision logic** by which ICE chooses the right *governed* asset for each slot of an **already-selected template** at render time. Produce a grounded design: the slot→asset-type→eligibility matrix, the filter/rank decision order, the fail-closed policy, and a thin slice-1 — plus a decision packet for PK. This is **Asset Selection**, distinct from Asset Intake and from Template Selection (see boundary).

## The distinction that governs this brief

- **Asset Intake** (already covered, v4.63) = how assets *enter* ICE and become governed (license, approval, `c.client_brand_asset` + `asset_meta`). **This brief does NOT re-open intake or the asset schema.**
- **Asset Selection** (this brief) = how ICE *chooses* the right governed asset for a template slot at render time.
- **Template Selection** (separate, upstream — TMR + Format Advisor) = how ICE chooses *which template*. **Assumed already done** here; this brief starts from a selected `provider_template_id` and fills its slots.

Pipeline position:

```
Format Advisor (format) → TMR (picks template) → ASSET SELECTION (fills slots) → Render → Proof
```

## The six questions the design must answer

1. **What asset slots can a template request?** e.g. `Background.source`, `Logo.source`, `SlideImage.source`, `Icon.source`, and (future) `Avatar.source`, `Broll.source`, `Music.source`. Source = the template's `dynamic` image/logo/video/audio fields (`c.creative_provider_template_field`).
2. **What makes an asset eligible?** Client fit, platform fit, format fit, template-slot-type fit, license (valid + not expired), release/consent status, aspect ratio, text-safe area / safety.
3. **What ranking logic?** Prefer approved + client-specific, correct aspect ratio, brand-aligned, good text-safe area (`safe_for_text_overlay`), recently-unused (freshness).
4. **What fails closed?** Unknown license, expired license, wrong client, missing release/consent, unsuitable platform, and **output-asset-mistaken-as-input** (never feed a rendered/published output back in as a source).
5. **What when no asset is available?** **Production → STOP (no governed asset = no production render).** **Smoke → neutral synthetic placeholder is allowed** (proven useful in the TMR G2 lane, but explicitly *not* a brand-ready asset).
6. **How does this connect to TMR?** TMR chooses the template + exposes its required slots (`provider_template_field` where `dynamic`=true); Asset Selection fills those slots and returns a render-modifications map.

## Deliverable — the two tables the design must contain

**A. Slot → asset-type → eligibility matrix** (extend to cover all live slots in the 16-template library, e.g.):

| Template slot | Accepts asset type | Eligibility checks |
|---|---|---|
| `Background.source` | image / background | client, license, aspect, **text-safe area** (`safe_for_text_overlay`) |
| `Logo.source` | logo / image | client, brand-approved, **transparent preferred** (light/dark to match template bg) |
| `SlideImage.source` | image | platform, format, aspect |
| `Icon.source` | image / icon | brand-approved, simple |
| `Broll.source` *(future)* | video | platform, license, duration |
| `Music.source` *(future)* | audio | license, platform, duration |

**B. Decision order** (filter → rank → return-or-fail):

```
1. Filter by client
2. Filter by rights / license (valid, not expired, release present)
3. Filter by template slot type
4. Filter by platform / format
5. Filter by size / aspect
6. Filter by safety / release (text-safe area, consent, not an output-as-input)
7. Rank by brand fit + freshness (+ text-safe suitability)
8. Return selected asset — or FAIL CLOSED (production) / neutral placeholder (smoke)
```

## Scope

**In scope:** the decision-logic design only — the two tables above, the fail-closed/placeholder policy, where the logic runs, and a thin **slice-1** proposal (e.g. resolve `Background.source` + `Logo.source` + `Scrim.opacity` for the *live static* templates, behind a read-only resolver, no production-path change).

**Out of scope:** Asset Intake / the asset schema (v4.63); Template Selection (TMR/Format Advisor upstream); building the resolver; any UI; any big schema/metadata expansion; video/avatar/audio slot *implementation* (they appear in the matrix as design coverage only); marking templates `client_enabled`/`platform_safe`/`production_proven`.

## Allowed actions

- Read-only DB/function reads to map how assets are resolved today (`public.resolve_brand_assets(p_client_slug, p_asset_keys)`, the workers' `brand_logo_url` path) and what eligibility signals already exist in `c.client_brand_asset.asset_meta` (`safe_for_text_overlay`, `scene_type`, license fields).
- Read `c.creative_provider_template_field` to enumerate the real `dynamic` slots per template.
- Produce the design doc + slot matrix + decision order + fail-closed policy + slice-1 + decision packet.

## Forbidden actions

- No DDL/DML, migrations, RPC/worker/dashboard code changes, or deploys.
- No asset / brand-profile / registry mutation; no `client_assignment` inserts; no proof events.
- Do not re-open intake or change the asset schema. Respect active holds in `docs/00_sync_state.md` (marker **v4.72**); videos remain parked.

## Success criteria

- **Current-state map** of asset resolution today: `resolve_brand_assets` (governed, but only image-worker isolated mode), the main workers' single `brand_logo_url` path, and the eligibility signals present vs missing in `asset_meta`.
- The **slot matrix (A)** filled for every live slot across the 16 templates, keyed to real `dynamic` fields.
- The **decision order (B)** specified as concrete, checkable filter+rank steps.
- A **fail-closed policy** stated exactly: production = stop; smoke = neutral placeholder; plus the explicit fail-closed triggers (unknown/expired license, wrong client, missing release, unsuitable platform, output-as-input).
- A **slice-1** proposal: smallest useful resolver (proposal: `Background.source` + `Logo.source` + `Scrim.opacity` for the dark static cards, read-only, off the production path) + the gates it needs.
- A **decision packet** of the PK choices required before any build.

## Stop condition

Produce the design doc + decision packet, then **stop for PK**. No build proceeds until PK approves scope + slice-1.

---

## Notes

- **Grounding already gathered:** governed resolver `resolve_brand_assets(client_slug, asset_keys)` exists but is off the main render path (memory `production-logo-source-brand-profile-not-resolver`); `asset_meta.safe_for_text_overlay` is populated for Sydney/Brisbane, **null for Perth**, and there are **no `logo_light`/`logo_dark`** governed yet (the asset_type enum supports them). Any backfill of those is **Intake's** job (separable from this selection logic), not this brief's.
- **Open PK decisions the design will surface:** (a) **where selection runs** — a new read-only `resolve_render_plan`/`resolve_slot_assets` RPC returning `{modifications}` (lean: testable, off the hot path) vs. extending a worker; (b) **logo variants now or later** — govern `logo_light`/`logo_dark` for slice-1, or ship slice-1 with `Scrim.opacity` + background-suitability and keep the single `brand_logo_url` for now; (c) confirm **`client_assignment` enablement** stays a separate PK gate (design models it, never triggers it).
- **Confirms future direction (Claude Code notes):** template creation should be **declarative JSON / API-driven** (not fragile browser automation), with **smoke render** and **visual review** as *separate* gates — already the Path-A pattern used to build the 16-template library. The production placeholder rule here reinforces that: placeholders are a smoke-only affordance, never a production asset.
