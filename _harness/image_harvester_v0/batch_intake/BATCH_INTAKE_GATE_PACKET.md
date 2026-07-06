# PP background B3 batch-intake — PK apply/upload-gate packet

**Date:** 2026-07-06 · **Tier:** T2 · **Label:** SAFETY_GATE · **Project:** mbkmaxqhsohbtwsqolns · `c.client_brand_asset`
**Apply:** `batch_intake_apply.sql` — sha256 `4c1f84a177b7ac005a790f097effdd415127c22f225c8acf32c47b4e3c3cc12f`
**Rollback:** `batch_intake_rollback.sql` — sha256 `297f3032075d822f120c3ebc329246c10cc830267cb88270f5defd80db98ba4d` (guarded 8-row delete; storage objects NOT deleted — separate gate)
**Upload manifest:** `upload_manifest.json` (8 files, staged byte-exact in `upload_staging/`) · **Roster:** `roster.json`

## Scope (exactly as ratified)
8 storage uploads → `brand-assets/Property_Pulse/Backgrounds/` + 8 INSERT-only rows, **all double-fenced**: `is_active=false` · `asset_meta.approved=false` · `production_use_allowed=false` · `approval_status=intake_candidate`. No live resolver eligibility; no production pool change.

| # | asset_key | fixed asset_id | source / licence | dims | scope | label constraint |
|---|---|---|---|---|---|---|
| 1 | bg_pp_au_suburb_texture | b3a20001… | Martin David / Unsplash | 5343×3559 | fb·ig·li | generic AU suburb, never location-specific |
| 2 | bg_pp_transaction_keys_contract | b3a20002… | FreeStockPro / Pexels | 6000×4000 | fb·ig·li | — |
| 3 | bg_pp_kitchen_living_open_plan | b3a20003… | Ibrar Tariq / Unsplash | 8640×5760 | fb·ig·li | — |
| 4 | bg_pp_family_backyard_summer | b3a20004… | Grace Bobadilla / Unsplash | 3879×5818 | fb·ig | — |
| 5 | bg_pp_new_build_construction_site | b3a20005… | Troy Mortier / Unsplash | 5760×3840 | fb·li | — |
| 6 | bg_pp_subdivision_land_estate | b3a20006… | Iain / Unsplash | 4032×3024 | fb·li | **generic new-estate/subdivision ONLY; NEVER WA/Perth/location-specific** |
| 7 | bg_pp_mortgage_calculator_keys | b3a20007… | Żerdzicki / Pexels | 1920×1080 | fb·ig·li | — |
| 8 | bg_pp_inspection_checklist_clipboard | b3a20008… | Żerdzicki / Unsplash | 1920×1253 | fb·ig | — |

Each `asset_meta` carries: `visual_review_verdict=ACCEPT_VISUAL_ONLY` · photographer + source_site + source_url + download_url · licence name/type/url + attribution · sha256 (+ measurement provenance) · width/height/bytes/mime/aspect_ratio · platform_scope · `safe_for_text_overlay=needs_scrim` + suggested scrim · `label_constraint` (assets 1 & 6) · harvest + `intake_lane_batch` markers · packet pointer. Market-data excluded (HOLD).

## Pre-state verified live (2026-07-06)
PP total 30 · eligible pool **all=6 · facebook=6 · linkedin=6 · instagram=5** (the 6 governed keys) · **zero collisions** on the 8 asset_keys / 8 asset_ids / sha256 / storage paths.

## Fail-closed safety
1. **Storage size prechecks** (8) — apply is inert until PK-authorised upload completes (targets currently absent).
2. **NOT-EXISTS dedup** per (client, asset_key) — single-run, idempotent.
3. **End-state assertions (all in one txn, else full rollback):** exactly 8 fenced candidate rows · **0** new rows carrying any true flag · **pool neutrality: all=6 / fb=6 / li=6 / ig=5 unchanged** (per-platform replica mirrors `resolve_slot_assets`) · the 6 governed keys still active+approved. The 8 rows are `is_active=false` → excluded by the resolver's FIRST filter, so they cannot enter production selection.

## Required checks → where satisfied
asset_key uniqueness ✓ (pre-state + NOT-EXISTS) · storage path uniqueness ✓ (pre-state) · sha256 verified before upload ✓ (staging re-hash) · post-upload byte/hash verify ✓ (mandatory public-URL step at apply) · insert count exactly 8 ✓ (assertion) · no true-flag rows ✓ (assertion) · no render/publish/promotion ✓ (out of scope). Both resolvers stay dark to these rows.

## Review chain
db-rls-auditor → external review (hash-pinned `4c1f84a1…`) → **PK gate: upload authorisation + hash approval** → apply → read-only end-state verify → result doc + branch-warden at commit. security-auditor not required (no grants/policies/DEFINER/REST surface).

## Apply sequence at the gate
(1) PK authorises upload → 8 files pushed (`x-upsert:false`) → (2) mandatory post-upload public-URL sha256 verification (in-SQL precheck is size-only) → (3) apply `4c1f84a1…` verbatim → (4) read-only end-state + pool-neutrality re-verification → result doc.
