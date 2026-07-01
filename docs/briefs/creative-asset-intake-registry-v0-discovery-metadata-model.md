# Creative Asset Intake & Registry v0 — Discovery + Metadata Model

> **Lane:** planning / **docs-only**. Sister system to TMR; **not** TMR G2. No DB / migration / SQL-mutation / dashboard / runtime / storage / ingestion / render / publish / proof / enablement / binding.
> **Owner:** PK · **Date context:** 2026-07-01 Sydney · **Repo HEAD:** `ac10590` (== origin/main, 0/0) · **Registers:** v4.62 · **Project (reference only):** `mbkmaxqhsohbtwsqolns`

---

## 1. Preflight Result

PASS. branch `main`; `HEAD == origin/main == ac10590`; ahead/behind `0/0`; working tree clean except the known untracked scrap; registers read **v4.62**. Origin had not advanced. No docs written before this brief; no mutation.

## 2. Current Context

- **TMR (templates)** is live at v4.62: `c.creative_template_*` (8 tables), 3 read RPCs, and `public.record_tmr_proof_event(...)` (governed proof write-path). First template `news_quote_insight_1x1_v1` is an honest `platform_candidate`; **0 proof rows**; G2 smoke render not started.
- **Creative Library v2** (`docs/creative-library/*.json`, `registry-schema-v2.md`) is a **declarative, runtime-import-guarded** object graph (`style_guide → patterns + assets → template_families → variants → evidence`). It *names* "assets" conceptually but is **not** a governed DB registry and is not read by production workers.
- **Today's asset reality (the gap):** production workers resolve brand assets ad-hoc from `c.client_brand_profile` columns (e.g. `brand_logo_url`; see the standing "production logo source = brand profile, not resolver" lesson). `resolve_brand_assets()` exists but is isolated to the image-worker Lane-3B path. There is **no governed registry of creative ingredients** (backgrounds, photos, stock, AI images, icons) with identity, provenance, licensing, rights, facets, suitability, or approval. This brief designs that.

**Current sources → registry (map / soft-reference — do NOT duplicate blindly):** concrete sources found in-repo that v0 should reuse rather than re-key:
- `client_brand_profile.brand_logo_url` — the production logo source today (per the standing "logo comes from brand profile" lesson); map as a `brand_image` asset by soft reference, not a copy.
- `client_brand_profile.brand_assets` — existing profile-level brand asset metadata; reconcile/map into the registry rather than re-enter.
- `client_brand_profile.brand_colour_primary` / `brand_colour_secondary` — brand metadata to reference (not "assets" themselves; they inform facet `colour_tone` / brand context).
- Existing storage buckets **`brand-assets`** and **`client-assets`** — where real brand/client asset files already live; v0 `storage_path` should point at (or migrate from) these, not create parallel copies.
- Existing buckets **`post-images`**, **`post-videos`**, **`post-music`** — **output / evidence** surfaces (see §14 output-vs-intake rule), **NOT** intake sources.
- **Creative Library v2** assets (`docs/creative-library/*.json`) are **declarative / metadata-oriented** and runtime-import-guarded — a design vocabulary, **not** a complete governed asset-intake registry. Reconcile its asset intent into the registry; do not treat it as the system of record.

**Principle:** map or soft-reference existing useful sources; **do not duplicate them blindly.** The registry adds governance (identity, rights, facets, scoped suitability, approval) on top of where files already live.

## 3. Why Asset Intake Is Separate From TMR

TMR answers *"which template/layout?"*. Asset Intake answers *"which safe ingredient goes into a template field?"*. They are different governance objects with different risk surfaces:

- **TMR** governs reusable **layouts/templates** and their proof of rendering/publishing.
- **Asset Registry** governs the **media ingredients** templates consume — where **licensing, rights, releases, and provenance** are the dominant risk (a wrong template is ugly; a wrong asset is a legal/brand liability).

Keeping them separate avoids overloading TMR with rights/licensing concerns and lets each evolve independently. They connect only by **soft reference** at suitability time (an asset is "suitable for template X, slot Y") — never a hard schema coupling.

## 4. Asset Definition

> An **asset** is a single, identifiable, reusable creative ingredient (a file or media object) that ICE may place into a template field — with its own identity, provenance, licensing/rights, classification, scoped suitability, and approval lifecycle, **independent of any template**.

v0 = **images only** (backgrounds, slide images, brand images). Video b-roll / video snippets / audio are explicitly **later** (the model is designed to extend to them, but they are out of v0 scope).

## 5. Metadata Buckets

The model uses **one primary asset family + many facets + governed suitability records** (NOT a rigid category tree) because assets overlap (a single image can be real-estate + interior + kitchen + luxury + background + PP + stock-licensed + 1:1 + Instagram-safe + no-people + commercial-use). Buckets:

- **A. Asset identity:** `asset_key`, `asset_name`, `asset_type`, `asset_version`, `status`, `storage_path`, `checksum/hash`, `source_system`, `created_at`, `updated_at`.
- **B. Media properties:** `file_type`, `mime_type`, `width`, `height`, `aspect_ratio`, `orientation`, `duration_seconds` (video/audio later), `file_size`, `has_transparency`, `dominant_colours`, `text_safe_area` estimate.
- **C. Source / provenance:** one of `client_supplied | stock | AI_generated | internal_design | photographer_supplied | brand_asset | scraped_not_allowed | unknown`. **Fail-closed rule: `unknown` (and `scraped_not_allowed`) → not production usable.**
- **D. Licensing / rights:** see §6.
- **E. Safety / release:** `people_present`, `faces_visible`, `minor_present`, `property_visible`, `address_visible`, `license_plate_visible`, `brand_logo_visible`, `sensitive_context`, `release_required`, `release_available`, `restriction_notes`. **Fail-closed: `release_required && !release_available` → not production usable.**
- **F. Creative classification facets (what the asset IS):** `industry`, `scene_type`, `subject`, `asset_role`, `mood`, `style`, `quality_level`, `visual_density`, `colour_tone`, `background_suitability`, `slide_suitability`. (e.g. industry=`real_estate`, scene_type=`interior`, subject=`kitchen`, asset_role=`background_image`, mood=`premium`, style=`photographic`, visual_density=`low`.)
- **G. Suitability (where it's allowed/fits) — separate from F:** see §8.
- **H. Governance lifecycle:** see §9.

## 6. Licensing and Rights Model

Licensing is the highest-risk bucket → its own record per asset (1-to-1 or 1-to-many over time): `license_type`, `license_owner`, `source_url_or_reference`, `license_document_reference`, `commercial_use_allowed`, `modification_allowed`, `social_use_allowed`, `paid_ads_allowed`, `client_restricted`, `allowed_clients[]`, `allowed_platforms[]`, `expiry_date`, `attribution_required`, `attribution_text`.

**Governing rules (all fail-closed):**
- Any boolean right that is **NULL/unknown → treated as NOT allowed** (no implicit permission).
- `expiry_date` in the past → asset is `expired` (not usable) regardless of approval.
- `client_restricted=true` → usable **only** for `allowed_clients`.
- `attribution_required=true` → downstream must carry `attribution_text` (a render/publish-time obligation, recorded but enforced later).
- **Source ≠ rights:** even `client_supplied` and `brand_asset` require an explicit rights record (client-supplied ≠ cleared for paid ads / all platforms).

## 7. Category / Facet Model

- **One primary family** per asset (`asset_type` / `asset_role`, e.g. `background_image`, `slide_image`, `brand_image`, `icon`, `overlay`) — the coarse "what is this".
- **Many facets** (bucket F) attached as separate rows, so the **same asset can carry many overlapping facets** without a forced single-parent tree.
- **Overlap handling:** facets are additive labels, not a hierarchy; a query intersects facets ("interior AND kitchen AND low-density AND no-people"). This is why classification is a **separate, multi-row table**, not columns on the asset.
- Facet **vocabularies are governed** (CHECK / lookup) to prevent free-text drift — but new facet values can be added by migration, like TMR's status vocabularies.

## 8. Suitability Model

**Classification (F) says what an asset is; suitability says where it may be used** — and suitability is always **scoped**, never global. Four suitability dimensions, each its own governed record (soft refs, no hard FK to client/template/format):
- `asset_client_suitability` — per client.
- `asset_platform_suitability` — per platform (instagram, facebook, linkedin, youtube, website…).
- `asset_format_suitability` — per ICE format / aspect (1:1, 16:9, market_update_card…).
- `asset_template_slot_suitability` — per **(TMR template, slot/field)** — this is the bridge to TMR (§10).

Each suitability row carries `fit_status` (e.g. `unknown | candidate | suitable | not_suitable | needs_review | blocked`) + `reason`. Example: asset `property_pulse_bg_modern_kitchen_001` × client `property-pulse` × platform `instagram` × format `market_update.v1` × slot `background_image` → `fit_status=suitable`, reason "clean background, no people, good text-safe area".

## 9. Lifecycle Model

Asset statuses: `draft → candidate → approved → restricted → expired → archived → rejected`.

**Core rule — approval is SCOPED, never universal.** `approved` means approved only for a defined combination of **client + platform + format + template-slot + usage-type + license-condition** (carried on the suitability + review records), not "approved everywhere". An asset can be `approved` for PP/Instagram/1:1/background and simultaneously `not_suitable` for paid ads or another client.

- `restricted` = usable only under named conditions (`restriction_notes`).
- `expired` = license/expiry lapsed → not usable (auto-derivable from `expiry_date`).
- `rejected` / `archived` = terminal; never production usable.
- Mirroring TMR: approval transitions are recorded as **`asset_review_event`** rows (incl. a `visual_review` kind), so approval is auditable and never inferred.

## 10. Relationship to TMR

- **TMR** chooses/governs the **template**; **Asset Registry** supplies **safe assets** for the template's fields; the **proof lifecycle** (TMR `record_tmr_proof_event`) validates the final rendered output.
- The bridge is `asset_template_slot_suitability`: a **soft reference** from an asset to a (TMR `provider_template_id`, slot/field name such as `background_image` / `slide_image`). No hard FK — Asset Registry stays independent and TMR is not coupled to asset rows.
- **Future pipeline (design intent, not built):** creative intent → template selection via TMR → **asset selection via Asset Registry** (find approved assets suitable for client + variant + aspect + slot + platform + usage) → render → proof/approval → publish eligibility.

## 11. v0 Scope

**In scope (small, manual, PP-first):** image assets only (`background_image`, `slide_image`, `brand_image`); Property Pulse first; **manual** intake / approval / licensing metadata; basic category+facet model; client + platform + format + template-slot suitability; a **dashboard read model**; **no auto-selection**.

**Out of scope for v0:** automatic asset selection; video b-roll; audio/music; bulk DAM integration; computer-vision tagging; AI image-safety scoring; production publishing integration; Format Mix binding; cross-client reuse automation.

## 12. Proposed Future Tables (conceptual — NOT implemented)

Mirror TMR's governance posture (schema `c`, service-role-only, RLS deny-all, read RPCs, soft refs, append-only events):
- `c.creative_asset` — identity (bucket A) + current `status`.
- `c.creative_asset_file` — media properties (bucket B); ≥1 per asset (allows re-encodes/derivatives later).
- `c.creative_asset_license` — licensing/rights (bucket D); the rights record.
- `c.creative_asset_classification` — facets (bucket F); **many rows per asset** (the overlap solution).
- `c.creative_asset_suitability` — scoped suitability (bucket G); the four dimensions incl. the `template_slot` soft-ref bridge to TMR.
- `c.creative_asset_review_event` — append-only approval/review/restriction/rejection events (incl. `visual_review`); the asset analogue of `creative_template_proof_event`.
- `c.creative_asset_usage_event` — append-only usage log (which asset, where rendered/published); design now, populate later.

**Namespace recommendation:** keep under the existing **`c`** schema (consistent with TMR's `c.creative_*`, same service-role-only / non-REST / RLS-deny-all posture, reuses the `record_*`/read-RPC patterns). Revisit a dedicated namespace only if the asset domain grows large enough to warrant isolation — not in v0.

## 13. Dashboard Visibility Requirements

Read-only, via service-role read RPCs (mirror TMR's `/create/templates`): an **Asset Library** list (identity + status + source + key facets + license summary + expiry flag) with filters (client, platform, format, slot, facet, status, source), and a **detail drawer** (full facets, license/rights with `expiry_date` + restriction flags, safety/release flags, suitability matrix, review-event history, usage history). **Honest surfacing:** show `unknown`-source / missing-rights / expired assets as **not production usable** with the reason — never hide the gap. No write UI in v0 (intake/approval are manual/server-mediated).

## 14. Governance Rules

- **Fail-closed everywhere:** unknown source, unknown rights boolean, missing required release, or expired license ⇒ **not production usable**.
- **Source ≠ rights ≠ approval ≠ suitability** — four independent gates; all must pass for a given scope.
- **Scoped approval only** — no global "approved".
- **Append-only audit** — review + usage events are immutable; approvals are recorded, never inferred (mirror TMR proof discipline).
- **Service-role-only, non-REST, RLS deny-all** — same posture as TMR `c.*`; reads via SECURITY DEFINER RPCs with the mandatory `REVOKE … FROM public, anon, authenticated`.
- **No production claim from inventory** — registering/classifying an asset never makes it production-usable; that requires scoped approval + clean rights + (recommended) visual review.
- **Render/publish outputs are NOT intake assets.** `post-images`, `post-videos`, `m.post_render_log.storage_url`, and `m.post_publish` are **output / proof / evidence** surfaces, not reusable creative ingredients by default. **Asset Intake = source ingredients used BEFORE render; TMR / proof / render outputs = evidence of generated outputs AFTER render.** Do **not** re-ingest rendered outputs into the intake registry unless a future explicit *derivative-asset* lane defines that policy.

## 15. Open Questions for PK

1. **PP-only first?** → Recommend **yes** (mirror TMR pilot-first; lowest blast radius).
2. **AI-generated → `approved`?** → Allow into the registry as `candidate`, but **require explicit rights + visual review** before `approved`; AI provenance/rights ambiguity ⇒ default **not production-usable** until cleared. *(PK policy.)*
3. **License expiry alerts?** → Capture `expiry_date` from day one; **alerting is a future lane**.
4. **Stock client-restricted by default?** → Default to the **license's actual scope**; restrict to a client only when the license is single-client. *(PK policy.)*
5. **Client-supplied require explicit usage rights?** → **Yes** — client-supplied still needs a rights record (≠ cleared for paid ads/all platforms).
6. **Global vs scoped approval?** → **Scoped only** in v0.
7. **Approval require visual review?** → Recommend **yes** for production use (a `visual_review` event), mirroring TMR's `visual_approval`.
8. **Track usage from day one?** → **Design** `creative_asset_usage_event` now; **populating** it can be deferred. *(PK call on when logging starts.)*
9. **Same asset suitable for many facets/categories?** → **Yes** — that is the entire reason for the facet + multi-row classification model.
10. **How does intake connect to template fields (`background_image`, `slide_image`)?** → Via `asset_template_slot_suitability` soft-referencing the TMR `(provider_template_id, slot)`; the asset's `asset_role`/facets must match the slot's expected kind.
11. **Where does v0 `storage_path` live?** → *(PK decision, flagged.)* Reuse the existing **`brand-assets` / `client-assets`** buckets, or create a new dedicated **`creative-assets`** bucket later. Recommend reusing existing buckets for v0 (no new infra) and revisiting a dedicated bucket only if asset volume/scope grows.

## 16. Recommended Next Lane

If this brief is accepted: **`Creative Asset Intake & Registry v0 — Schema Proposal (PP image assets)`** — a docs-only schema design packet for the 7 `c.creative_asset_*` tables (columns + governed vocabularies + RLS/grant posture + read-RPC contract), reviewed by `db-rls-auditor` → `security-auditor` → external, then a PK apply hard-stop — exactly the proven TMR schema lane. **Strictly after** TMR G2–G5 are at a safe pause or PK explicitly parallelises; it shares the `c` schema but **not** TMR's active apply chain, so it must not interleave migrations with an in-flight TMR gate.

## 17. Final Verdict

```
READY_FOR_PK_REVIEW
```

Docs-only design; nothing mutated, ingested, rendered, or published. The model is grounded in existing TMR + Creative Library + brand-asset conventions; open questions are flagged with recommendations for PK; v0 is deliberately small (PP images, manual, no auto-selection).
