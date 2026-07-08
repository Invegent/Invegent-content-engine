# Invegent logo-variant INTAKE v0 — gate packet (17 fenced, curated)

**Lane:** `invegent-logo-intake-v0 (2026-07-08)` · **Tier T2 · SAFETY_GATE** (full chain — NEW client/shape) · **fenced candidate only — NOT approval/promotion.**
**apply hash:** `5673979baeb43271356f910adbd3862087d749ab4877159b9c84808b8f396581` (`invegent_logo_intake_apply.sql`, 47972 bytes)
**rollback hash:** `9f3202dd2e5cb1f76e351bd43bf83f08a269d8b20eaf4836f94355f2a6576b8e` (`invegent_logo_intake_rollback.sql`, 1249 bytes)

## Client state (verified read-only)
- Invegent `93494a09-cc89-41d1-b364-cb63983063a6` (slug `invegent`) — **0 existing `client_brand_asset` rows** (first brand-asset intake).
- **`brand_profile.brand_logo_url` is NULL** — Invegent has *no live logo set at all*. Intake is trivially production-neutral (nothing to disturb); assertion keeps it NULL. `brand-assets/Invegent/` confirmed **empty**.

## Curated scope (17 = 9 SVG + 8 PNG; "curated, not all files")
Distinct, useful variants only — byte-duplicate sizes/lockups dropped (all 17 sha256 distinct; build asserts no byte-dup). SVGs → `usage=logo_vector_source`; PNGs → `usage=logo`. `asset_type` mapped to CHECK-valid values only (`logo_primary/logo_dark/logo_light/logo_icon/watermark/other`; **never** `'logo'`).

- **Wordmark lockup (2000×700):** full-colour (primary, current "Content intelligence" tagline) · white/reversed · dark-navy — SVG + PNG.
- **Legacy "Know what to say" tagline lockup** — SVG + PNG.
- **Mark-only:** cyan · navy · white(=watermark) — SVG (+ cyan/navy PNG).
- **Square brand-bg badge** (cyan-on-navy) · **white watermark** — SVG + PNG.

## Reconstruction caveat (recorded in every row's asset_meta)
**Like NDIS, a RECONSTRUCTION** — Invegent supplied only PNG exports (no native SVG/AI); this kit is a manual SVG reconstruction, **wordmark/tagline approximated**, a governed working master **not a pixel-perfect original**. Production logo swap deferred to a future PK gate. Palette: navy `#1B3A5C` / cyan `#05ADDA` / cyan-highlight `#16C1F3`.

## Fences & production-neutrality (in-txn, fail-closed → ROLLBACK)
All four fences set per row. Storage size-precheck per row. Assertions: (a) exactly **17 fenced** lane rows; (b) Invegent **governed/active logo count == 0**; (c) **`brand_profile.brand_logo_url` stays NULL** (`IF bp_logo IS NOT NULL THEN RAISE`). Any deviation → full rollback.

## Upload
→ `brand-assets/Invegent/Logos/invegent_logo_*` with **`x-upsert:false`** (folder empty → no overwrite). Post-upload **public-URL sha256** verified per file (stronger than the in-SQL size precheck).

## Not in scope (all future separate PK gates)
No promotion · no `is_active` flip · **no `brand_profile.brand_logo_url` set** (Invegent still has no live logo — promoting one later is its own gate) · no production logo swap · no template assignment · no resolver change · **no register commit** (held per PK — "recording" comes after).

## Review chain
- **external review `e1c435c6-452b-491e-ba36-431e1fc7643c`** (hash-pinned `5673979b…`): **partial / apply_corrected, escalate=false — NO concrete defect.** Verified facts (0 rows, brand_logo_url NULL, proven pattern). Two non-DML points: reconstruction *quality* (a product judgment — fenced + caveated, promotion is a later gate) and storage-check integrity (mitigated by post-upload public-URL sha256 verify). Triage: `policy_decision`, not `concrete_defect`.
- **db-rls-auditor: PASS, zero must_fix / zero should_fix** — all 8 checks (INSERT-only; 17 asset_types CHECK-valid, none 'logo'; 0 asset_id/asset_key collisions; assertions fail-closed incl. governed-logo==0 + `brand_logo_url` IS NULL live-verified with the correct "must-remain-NULL" assertion; Invegent/Logos/ empty; guarded rollback; production-neutral). Reconstruction fidelity flagged as a PK judgment for the future promotion gate, not a DB-safety issue.
- **PK hash/upload gate:** upload authorization + apply-hash approval.

Sequence on approval: upload 17 → public-URL sha256 verify → apply `5673979b…` → post-apply proof (17 fenced, governed-logo=0, brand_logo_url NULL, all 17 sha256==manifest) → result doc. Rollback `9f3202dd…` standing.
