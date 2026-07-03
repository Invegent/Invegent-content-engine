# Batch 2 — PP P0 background DB-intake: PK apply-gate packet

**Date:** 2026-07-03 · **Project:** mbkmaxqhsohbtwsqolns · **Table:** `c.client_brand_asset` (INSERT-only) · **Client:** property-pulse (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
**Apply artifact:** `batch2_apply.sql` — sha256 `89e42bb0256dcd0641cd520a5d70ee8e492b6c3437ce4e6da9ae7de3aa8027f1` (22,983 bytes)
**Rollback artifact:** `batch2_rollback.sql` — sha256 `473f7ac18f1fa37fd5da801730e284f8525011f4859f3136ae953b7e9efd40a0`
**Upload manifest:** `upload_manifest.json` / `.csv` · staged files in `upload_staging/` (7 files, hash-verified against the visually-reviewed harvest candidates at build time)

## Posture

Intake only. The 7 rows enter as **governed inventory candidates**: `is_active=false` (column) AND `asset_meta.approved=false` AND `approval_status='intake_candidate'` AND `production_use_allowed=false` — double-fenced against `resolve_slot_assets`/`resolve_brand_assets` (both filter on active+approved; these rows are excluded on the first filter). No production approval, no render/publish, no runtime/dashboard/Format Mix/resolver-caller change, no storage deletion, no orphan action, no platform expansion beyond {facebook,instagram,linkedin} subsets, no replacement of the 3 live backgrounds.

## The 7 assets (proposed rows)

| asset_id (fixed) | asset_key | Source / photographer | Licence | Dims | platform_scope | Visual verdict carried into meta |
|---|---|---|---|---|---|---|
| b2a10001… | **bg_pp_perth_skyline_dawn_moody** | Unsplash / fadder 8 | Unsplash | 4480×2471 | {facebook,linkedin} | PASS_WITH_NOTE: moody market-update only, NOT day hero |
| b2a10002… | bg_pp_au_suburb_aerial_grid | Unsplash / Tom Rumble | Unsplash | 4000×2250 | {facebook,instagram,linkedin} | PASS_GENERIC_ONLY: never label Perth |
| b2a10003… | bg_pp_modern_home_exterior_front | Unsplash / Troy Mortier | Unsplash | 3840×5760 | {facebook,instagram} | PASS_WITH_NOTE: not detached-home hero |
| b2a10004… | bg_pp_for_sale_sign_street | Unsplash / Richard Bell | Unsplash | 6000×4000 | {facebook,instagram,linkedin} | PARTIAL_FIT_ONLY: offset-text templates only |
| b2a10005… | bg_pp_sold_sign_closeup | Pexels / Thirdman | Pexels | 4271×6406 | {facebook,instagram,linkedin} | PASS |
| b2a10006… | bg_pp_home_keys_contract_table | Unsplash / Tierra Mallorca | Unsplash | 4592×3448 | {facebook,instagram,linkedin} | PASS (widely-used stock noted) |
| b2a10007… | bg_pp_open_home_entry | Unsplash / Francesca Tosolini | Unsplash | 4945×3297 | {facebook,instagram} | PASS_WITH_NOTE: generic/open-home scope |

**Key-naming proposal (PK to ratify at this gate):** the fadder8 dawn image is keyed **`bg_pp_perth_skyline_dawn_moody`**, NOT the workbook's `bg_pp_perth_cbd_skyline_day_wide` — the file is a dawn/moody shot and PK's visual verdict restricted it accordingly; keying it as "day_wide" would repeat the label-mismatch problem and would squat the key reserved for the true bright-day hero (still a manual carry). Upload filenames match the proposed keys.

Every row's `asset_meta` carries: mime/bytes/width/height/**sha256** (+ measurement provenance), usage=background, bucket+source_path, asset_key, honest location (aerial explicitly says "photographed over Melbourne — never label as Perth"), aspect_ratio, has_people=false, has_text (true for the 2 sign images), licence name/type/URL + attribution status + optional-credit text, photographer, source_site/source_url/original_download_url, approved=false + approval_status + pk_decision (intake_only) + production_use_allowed=false, full visual-review verdict + constraint note, suggested_scrim_opacity, **safe_for_text_overlay='needs_scrim'**, harvest + intake lane markers, review-packet pointer. `platform_scope` = workbook platform list ∩ PK's approved {facebook,instagram,linkedin} (Website entries dropped; no YouTube).

## Apply sequence (two PK-gated steps)

1. **Upload (PK-run or PK-authorised):** the 7 files from `upload_staging/` to `brand-assets/Property_Pulse/Backgrounds/` per `upload_manifest.csv` (existing flat path convention per Batch-1 decision). After upload I verify each object by downloading via public URL and matching sha256 (post-upload hash check) — before any SQL.
2. **Insert (exact artifact, as postgres):** `batch2_apply.sql`. Fail-closed design:
   - **Upload prechecks in-transaction:** a DO block asserts each of the 7 storage objects exists with the exact expected byte size — missing/wrong upload aborts before any INSERT.
   - **Dedup guards:** each INSERT is `WHERE NOT EXISTS (same client + asset_key)` — re-run inserts 0 (idempotent).
   - **End-state verification:** exactly 7 candidate rows (marker + inactive + unapproved + expected asset_ids), the 4 pre-existing approved+active PP rows still exactly 4, PP total exactly 11 — else EXCEPTION → full rollback.
   - No UPDATE/DELETE statements exist in the artifact.

## Rollback

`batch2_rollback.sql`: guarded DELETE of only the 7 fixed asset_ids **that still carry the Batch-2 lane marker AND are still inactive+unapproved** (refuses to delete anything promoted later), verifies 0 lane rows remain and PP total back to 4. Storage objects are intentionally NOT deleted by rollback (storage deletion stays PK-gated); they'd become inert ungoverned files pending PK decision — same class as the known Brisbane orphan.

## Review chain

- **db-rls-auditor:** `db_rls_auditor_verdict.json` (this folder) — must PASS before the gate.
- **External review:** `external_review.json` — `reviewed_input_hash` must equal `89e42bb0…`; any artifact edit voids both reviews.
- **security-auditor:** NOT invoked — no grants, no storage policies, no SECURITY DEFINER objects, no permission surface touched (INSERT-only DML into an existing service-role-only table using existing public-bucket URLs). Recorded here per the review expectation.

## Recommendation

**Proceed to apply** once PK: (a) ratifies the `bg_pp_perth_skyline_dawn_moody` key naming, (b) authorises the 7 uploads, and (c) approves the exact artifact hash `89e42bb0…`. Until then nothing changes anywhere.
