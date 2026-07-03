# Batch 2 — PP P0 background DB-intake: RESULT

**APPLIED + VERIFIED** — 2026-07-03, project mbkmaxqhsohbtwsqolns. PK ratified all three gate decisions (dawn-moody key naming · upload authorisation · artifact hash) and the exact reviewed artifact was applied as postgres.
**Artifact:** `batch2_apply.sql` sha256 `89e42bb0256dcd0641cd520a5d70ee8e492b6c3437ce4e6da9ae7de3aa8027f1` — re-verified on disk immediately before apply; byte-identical to the db-rls-auditor-PASS + external-review-agree (`a77497a7…`) artifact.

## 1. Upload verification result (pre-apply, mandatory step)
All 7 files uploaded from `upload_staging/` to `brand-assets/Property_Pulse/Backgrounds/` (service-role, `x-upsert:false` — overwrite impossible), then each downloaded back via public URL: **7/7 byte-size AND sha256 exact matches** (`upload_verification.json`). No existing storage object touched; orphan untouched.

## 2. Inserts confirmed
Exactly **7 rows** inserted into `c.client_brand_asset` (fixed ids b2a10001…–b2a10007…), verified live post-apply — every row: `is_active=false`, `asset_meta.approved=false`, `approval_status='intake_candidate'`, `production_use_allowed=false`, correct sha256, platform_scope ⊂ {facebook,instagram,linkedin}, full provenance + PK visual-review constraint embedded. Key `bg_pp_perth_skyline_dawn_moody` used per Decision 1 (day_wide key remains reserved for the future bright-day hero).

## 3. Original rows unchanged
The 4 pre-existing PP rows verified untouched: all still approved+active, platform_scope intact, `updated_at` timestamps bit-identical to their pre-Batch-2 values (backgrounds: the Batch-1 timestamp 2026-07-03 03:02:02; logo: 2026-07-02 14:15:19). PP total rows: **11** (4 + 7), asserted in-transaction and re-confirmed read-only.

## 4. Resolver exclusion confirmed (live, not inferred)
- `resolve_brand_assets('property-pulse', <7 new keys>)` → **0 rows**.
- `resolve_slot_assets('property-pulse','facebook','image_quote', generic_quote_card_1x1_v1)` (read-only call) → status `ok`, selected background **still `bg_perth_cbd`** (identical pre-Batch-2 behaviour), and all **7 candidates appear in `rejected` with reason_code=`inactive`**. Zero production-selection impact; resolvers remain dark (zero callers).

## 5. Rollback still valid and promotion-guarded
`batch2_rollback.sql` (sha256 `473f7ac1…`) targets exactly the 7 fixed ids and requires lane-marker + `is_active=false` + `approved=false` — all guards verified present on the live rows. If any row is later promoted, the rollback refuses it and aborts wholesale (manual-review escape). Storage objects are not deleted by rollback (separately gated).

## Boundaries honoured
No approved=true, no is_active=true, no production eligibility, no render, no publish, no runtime/dashboard change, no Format Mix binding, no resolver-caller change, no storage deletion, no orphan action, no Batch 3.

## Where this leaves the P0 scope
All 7 visually-accepted P0 candidates are now **governed inventory candidates** with complete audit metadata. Promotion to approved/active is a separate future PK gate (per-asset or batched), honouring the embedded usage constraints (dawn-moody ≠ day hero · aerial never-Perth · for-sale sign offset-templates-only · open-home generic scope). Open carries unchanged: bright-day Perth skyline hero, Perth-specific suburb aerial, auction crowd manual sourcing, orphan Brisbane delete/hold, B3/B4 P1 harvest+review, B5 P2. Commit/push of lane artifacts remains a separate gate.
