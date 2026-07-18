# TMR D7 · (c) NDIS background intake + promotion (bounded envelope for the PK apply gates)

**Status:** ENVELOPE (prep) — NOTHING uploaded, inserted, or promoted. Two PK-gated applies staged below.
**Lane:** TMR D7 (N5). **Tier:** fenced intake = T2 (dark/additive, client-isolated) · promotion = T3 (makes the asset render-eligible).
**Surface:** NDIS storage (`brand-assets` bucket) + `c.client_brand_asset` — DISJOINT from N7b (worker code). Parallel-safe.
**Result doc:** `docs/briefs/results/tmr-d7-second-brand-proof-v1.md`.

## Scope (PK 2026-07-18)
`brand_texture-01` is the **SOLE P0 background** for the FB-first proof — NOT the final rotation pool. `civic_neutral-04` is NOT intaken here (its crop step routed back to `TMR-supp-ndis-bg`). One eligible background is sufficient for `resolve_slot_assets`.

## Asset (pinned)
- **Source file (local, harvested):** `_harness/image_harvester_v0/ndis_bg_20260717/final/ndisyarns_bg_brand_texture_v1.jpg`
- **bytes:** 57991 · **sha256:** `40fb69b42a881533e9f1bb73380330073f6f89e3a2150cabf7ca045ab7b788f5` · **dims:** 1920×2877 (portrait) · **mime:** image/jpeg
- **NOTE — not a 1:1 crop:** the "final" is byte-identical to the source download (uncropped portrait). This is consistent with PP practice — PP backgrounds are uncropped portraits (e.g. `bg_pp_modern_home_exterior_front` 3840×5760) and the generic template's `Background` element covers/crops to 1:1 at render. If PK instead wants a pre-cropped 1080² master, that is a crop step in `TMR-supp-ndis-bg`; otherwise intake the portrait as-is.
- **Licence:** Pexels License (free commercial, no attribution required). **Creator:** Allec Gomes. **Source page:** https://www.pexels.com/photo/smooth-dark-blue-pattern-12306417/
- **Text-safety (harvester crop-proof):** "dark uniform navy negative space everywhere; ideal scrim backdrop; excellent headline legibility; matches brand navy." Warnings: none. Authoritative text-safety verdict = the PK crop-proof/visual at the **promotion** gate.

## Sub-step 1 — FENCED intake (upload + INSERT). PK apply gate. T2.
**Upload:** local final → `brand-assets/NDIS_Yarns/Backgrounds/bg_ny_brand_texture_navy_waves.jpg` (mirrors PP `Property_Pulse/Backgrounds/…`).
**Per-apply guards (NON-WAIVABLE):**
- **byte-verify:** uploaded object bytes' sha256 == `40fb69b4…` (local final).
- **public-URL sha256:** GET the public URL, hash, == `40fb69b4…` (confirms the served bytes).
- **in-txn pool-neutrality (fail-closed):** assert eligible-pool deltas are ZERO after the fenced INSERT — NDIS eligible backgrounds stay **0** (row is fenced) and PP eligible pool is unchanged (client-isolated by `resolve_slot_assets` `WHERE client_id=…`). Any non-zero delta → ROLLBACK.
- **db-rls-auditor** on the INSERT (scope, RLS/grants, no DDL/GRANT, ON CONFLICT correctness).

**Fenced INSERT skeleton** (values pinned; `<PUBLIC_URL>` set post-upload; fenced = all four fences false):
```sql
INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active)
SELECT
  gen_random_uuid(),
  (SELECT client_id FROM c.client WHERE client_slug='ndis-yarns'),
  'other',                                   -- backgrounds use asset_type 'other' (PP precedent)
  'NDIS Yarns background — brand navy waves (P0, FB-first proof)',
  '<PUBLIC_URL>',                            -- brand-assets/NDIS_Yarns/Backgrounds/bg_ny_brand_texture_navy_waves.jpg
  jsonb_build_object(
    'mime','image/jpeg', 'bytes',57991, 'usage','background',
    'width',1920, 'height',2877, 'bucket','brand-assets',
    'sha256','40fb69b42a881533e9f1bb73380330073f6f89e3a2150cabf7ca045ab7b788f5',
    'license','Pexels License (free for commercial use, no attribution required)',
    'license_url','https://www.pexels.com/license/', 'license_type','pexels_license',
    'attribution_required', false,
    'asset_key','bg_ny_brand_texture_navy_waves',
    'has_text', false, 'has_people', false,
    'photographer','Allec Gomes',
    'source_url','https://www.pexels.com/photo/smooth-dark-blue-pattern-12306417/',
    'source_platform','pexels',
    'visual_style','abstract_texture',
    'safe_for_text_overlay','<needs_scrim|true — crop-proof at promotion>',
    'suggested_scrim_opacity', 0.55,
    'harvest_lane','ndis-bg-20260717',
    'review_packet','_harness/image_harvester_v0/ndis_bg_20260717/NDIS_BG_GATE_PACKET.md',
    'sha256_source','harvest final file hashed at envelope build 2026-07-18; upload target must byte-match (verified in apply assertions + post-upload public-URL hash)',
    -- FENCES (all false — intake is fenced-until-promoted):
    'approved', false, 'production_use_allowed', false, 'approval_status','intake_candidate',
    'pk_decision','D7 P0 background intake (sole P0, FB-first proof), PK 2026-07-18; fenced. Promotion/eligibility = separate PK gate. Rotation pool + civic_neutral-04 deferred.'
  ),
  NULL,                                      -- platform_scope null = agnostic (passes FB; recommended)
  false                                      -- is_active false (fenced)
;
```
**Rollback:** `DELETE FROM c.client_brand_asset WHERE asset_id='<new id>'` + remove the uploaded object. No dependents (fenced, unreferenced).

## Sub-step 2 — PROMOTION (un-fence → eligible). PK visual/apply gate. T3.
Mirrors the step-2 logo promotion. **Precondition:** PK crop-proof / text-safety visual PASS (sets the authoritative `safe_for_text_overlay`). Then:
```sql
UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || jsonb_build_object(
      'approved', true, 'production_use_allowed', true, 'approval_status','governed',
      'safe_for_text_overlay','<PK crop-proof verdict: needs_scrim|true>',
      'promoted_by','D7 N5 background promotion — PK visual gate <date>; sole P0 for FB-first proof')
WHERE asset_id='<new id>'
  AND is_active=false AND asset_meta->>'approved'='false';   -- CAS guard
```
**Guards:** db-rls-auditor; post-verify NDIS eligible backgrounds = **1** (this asset), PP pool unchanged, no render triggered. **Rollback:** re-fence (mirror step-2 rollback).
**Eligibility check (post-promotion):** `resolve_slot_assets` background predicate = `is_active` + `approved=true` + `license` + `bucket='brand-assets'` + `safe_for_text_overlay ∈ {'true','needs_scrim'}` + platform_scope-passes (null passes FB, emits one-time `platform_scope_unbacked` warning — expected, PP emits it too).

## Preconditions / STOP conditions
- **Preconditions:** PK-approved P0 (done); pinned sha256 (done); byte-verify + public-URL sha256 + pool-neutrality assertions in the apply; db-rls-auditor clean.
- **STOPs (either sub-step):** uploaded/served sha256 ≠ `40fb69b4…` · any eligible-pool delta on the fenced INSERT · PP pool moves · more than one NDIS background becomes eligible at promotion · db-rls non-clean · rowcount ≠ 1.

## Scope boundary / non-claims
Nothing uploaded/inserted/promoted by this envelope. Intake is fenced (renders nothing). Promotion makes the SOLE P0 background eligible; it does NOT by itself render NDIS — still gated on N7b deploy + N2 assignment + N3 proof + N1 flip. `safe_for_text_overlay` is the PK crop-proof's to set at promotion. No rotation pool implied. Video path untouched.
