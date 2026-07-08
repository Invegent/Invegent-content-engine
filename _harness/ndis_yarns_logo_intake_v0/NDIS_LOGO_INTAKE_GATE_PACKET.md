# NDIS Yarns logo-variant INTAKE v0 — gate packet (17 fenced, curated)

**Lane:** `ndis-yarns-logo-intake-v0 (2026-07-08)` · **Tier T2 · SAFETY_GATE** (full chain — NEW client/shape) · **fenced candidate only — NOT approval/promotion.**
**apply hash:** `8a8e2569358c81639f969eb2b13e0690d7f55251c9da9baaf64a4269a1d5de52` (`ndis_logo_intake_apply.sql`, 44431 bytes)
**rollback hash:** `17b4dc66a3e1ffae317b4ccb3d50c0faacbd40b5c66e0bae4557ee04ab6b518c` (`ndis_logo_intake_rollback.sql`, 1243 bytes)

## Client state (verified read-only)
- NDIS Yarns `fb98a472-…` — **0 existing `client_brand_asset` rows** (first brand-asset intake).
- **Live logo served from `c.client_brand_profile.brand_logo_url`** = `…/NDIS_Yarns/Logos/NDIS-Yarns_Logo.png` — this DML does NOT touch that table. Existing `NDIS_Yarns/Logos/` has 3 live files (Banner/Brand/Logo.png), byte-identical to the kit's `source_` originals → the kit is built from the real live sources.

## Curated scope (17 = 9 SVG + 8 PNG; PK "curated, not all 37")
Distinct, useful variants only — byte-duplicates and redundant sizes dropped (all 17 sha256 distinct). SVGs → `usage=logo_vector_source` (outside resolver scan); PNGs → `usage=logo`. `asset_type` mapped to CHECK-valid values only (`logo_primary/logo_dark/logo_light/logo_icon/watermark/other`; **never** the invalid `'logo'`).

| # | file | asset_type | usage |
|---|---|---|---|
| SVG | master_editable · master_outlined | logo_primary | logo_vector_source |
| SVG | dark · white · horizontal · horizontal_white · mark_only · square_bg · watermark_white | logo_dark/logo_light/other/logo_icon/watermark | logo_vector_source |
| PNG | full_colour | logo_primary | logo |
| PNG | white · dark · horizontal · horizontal_white · mark_only · watermark · square_bg | logo_light/logo_dark/other/logo_icon/watermark | logo |

## Reconstruction caveat (recorded in every row's asset_meta)
Claude Design **manual vector reconstruction** of the live rasters · brand font **approximated** · **not guaranteed pixel-perfect** to the original · **production logo swap deferred to a separate future PK gate.** Fenced-only.

## Fences & production-neutrality (in-txn, fail-closed → ROLLBACK)
All four fences set per row. Storage size-precheck per row. Assertions: (a) exactly **17 fenced** lane rows; (b) NDIS **governed/active logo count == 0** (nothing selectable); (c) **`brand_profile.brand_logo_url` unchanged**. Any deviation RAISEs → full rollback.

## Upload
→ `brand-assets/NDIS_Yarns/Logos/ny_logo_*` with **`x-upsert:false`**. Kit filenames differ from the 3 live files → **no overwrite** (guarded in build + precheck). Post-upload public-URL sha256 verified per file.

## Not in scope (all future separate PK gates)
No promotion · no `is_active` flip · **no `brand_profile.brand_logo_url` change** · no production logo swap · no live render/publish change · **no TMR activation for NDIS** · no template assignment · no resolver change · no register commit until gated.

## Review chain
- **external review `48f76536-f10d-4e5d-983e-5603b95890ef`** (hash-pinned `8a8e2569…`): **partial/escalate, risk medium — NO concrete defect** (verified: 0 rows, live logo from brand_profile, mirrors proven PP v4.87; pushback = generic "failure-scenario analysis" hedging; the documented reflexive-escalation pattern for production-adjacent fenced inserts). Triage: `policy_decision`/`missing_evidence`, not `concrete_defect`.
- **db-rls-auditor: PASS, zero must_fix** — all 8 checks confirmed (INSERT-only; 17 asset_types CHECK-valid, none the invalid 'logo'; dedup idempotent, 0 collisions; assertions fail-closed incl. governed-logo==0 matching the resolver fence + brand_profile unchanged; upload targets disjoint from the 3 live files; guarded rollback; production-neutral by construction). One non-blocking observation: idempotency rests on WHERE-NOT-EXISTS not a DB unique constraint on asset_key (same known note as PP/market-data; safe for a single PK-gated apply).
- **PK hash/upload gate:** upload authorization + apply-hash approval.

Sequence on approval: upload 17 → public-URL sha256 verify → apply `8a8e2569…` → post-apply proof (17 fenced, governed-logo=0, brand_profile unchanged) → result doc. Rollback `17b4dc66…` standing.
