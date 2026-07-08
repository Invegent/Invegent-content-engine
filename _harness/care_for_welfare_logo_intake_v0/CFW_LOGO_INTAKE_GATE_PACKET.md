# Care for Welfare logo-variant INTAKE v0 — gate packet (16 fenced, curated)

**Lane:** `cfw-logo-intake-v0 (2026-07-08)` · **Tier T2 · SAFETY_GATE** (full chain — NEW client/shape) · **fenced candidate only — NOT approval/promotion.**
**apply hash:** `e0b283ff5142bdbfb9a5eab7d8993a0f1fd2bc8af0b543fb213a6cac3ae510a4` (`cfw_logo_intake_apply.sql`, 43786 bytes)
**rollback hash:** `bb5000bb37a90c98c6229df7311c654162d96020c06f670445927cc8f0e224b5` (`cfw_logo_intake_rollback.sql`, 1195 bytes)

## Client state (verified read-only)
- Care for Welfare `3eca32aa-e460-462f-a846-3f6ace6a3cae` (slug `care-for-welfare-pty-ltd`) — **0 existing `client_brand_asset` rows** (first brand-asset intake).
- **Live logo served from `c.client_brand_profile.brand_logo_url`** = `…/**client-assets**/submissions/730049b9-…/logo.png` — a **DIFFERENT bucket** from the intake's `brand-assets`. Overwrite is structurally impossible. `brand-assets/Care_for_Welfare/` confirmed **empty**.

## Curated scope (16 = 9 SVG + 7 PNG; "curated, not all files")
Distinct, useful variants only — many byte-duplicate sizes/lockups dropped (all 16 sha256 distinct; build asserts no byte-dup). SVGs → `usage=logo_vector_source`; PNGs → `usage=logo`. `asset_type` mapped to CHECK-valid values only (`logo_primary/logo_dark/logo_light/logo_icon/watermark/other`; **never** the invalid `'logo'`).

- **Wordmark (2048×676) colourways:** full-colour (primary) · white/reversed · dark — SVG + PNG each.
- **Mark-only (tree/person icon):** full-colour · dark · white — SVG (+ full/white PNG).
- **Square brand-bg badge** · **white watermark** — SVG + PNG.

## Faithful-vector note (recorded in every row's asset_meta)
**Unlike NDIS, the CFW kit is FAITHFUL** — prepared from genuine CFW vector sources (SVG/AI/EPS); production SVG has true vector paths, no embedded raster, **wordmark already outlined (no font dependency)**. Not a font-approximated reconstruction. Production logo swap deferred to a separate future PK gate. Palette: black `#000000` + cyan `#00BCE4` / red `#C41230` / lime `#C3CF21` leaf accents.

## Fences & production-neutrality (in-txn, fail-closed → ROLLBACK)
All four fences set per row. Storage size-precheck per row. Assertions: (a) exactly **16 fenced** lane rows; (b) CFW **governed/active logo count == 0** (nothing selectable); (c) **`brand_profile.brand_logo_url` unchanged** (still the client-assets submissions URL). Any deviation RAISEs → full rollback.

## Upload
→ `brand-assets/Care_for_Welfare/Logos/cfw_logo_*` with **`x-upsert:false`** (folder empty; live logo in a different bucket → no overwrite). Post-upload public-URL sha256 verified per file.

## Not in scope (all future separate PK gates)
No promotion · no `is_active` flip · **no `brand_profile.brand_logo_url` change** · no production logo swap · no live render/publish change · no template assignment · no resolver change · **no register commit** (held per PK).

## Review chain
- **external review `3270c228-3900-4639-aca6-c4bec0860aec`** (hash-pinned `e0b283ff…`): **AGREE / risk low / confidence high / proceed** — clean (cross-bucket isolation + INSERT-only framing verified; no defect).
- **db-rls-auditor: PASS, zero must_fix** — all 8 checks (INSERT-only; 16 asset_types CHECK-valid, none 'logo'; 0 asset_id/asset_key collisions; assertions fail-closed incl. governed-logo==0 + brand_logo_url live-verified == client-assets path; brand-assets/Care_for_Welfare/ empty, cross-bucket so overwrite impossible; guarded rollback; production-neutral by construction). One non-blocking note: idempotency via WHERE-NOT-EXISTS not a DB unique constraint (same known note as NDIS/PP).
- **PK hash/upload gate:** upload authorization + apply-hash approval.

Sequence on approval: upload 16 → public-URL sha256 verify → apply `e0b283ff…` → post-apply proof (16 fenced, governed-logo=0, brand_profile unchanged, all 16 sha256==manifest) → result doc. Rollback `bb5000bb…` standing.
