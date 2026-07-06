CLAIMED v5.12 · pp-bg-b3-batch-intake · shared-main-docs · register-commit-gate · 2026-07-06T07:35Z
# PP background B3 batch-intake — RESULT (APPLIED + VERIFIED)

**Date:** 2026-07-06 · **Tier T2 · SAFETY_GATE** · project mbkmaxqhsohbtwsqolns · applied as postgres on PK hash approval.
**Artifact:** `batch_intake_apply.sql` sha256 `4c1f84a177b7ac005a790f097effdd415127c22f225c8acf32c47b4e3c3cc12f` — re-verified on disk immediately pre-apply; executed verbatim.

## Sequence as executed
1. **Staged hash verify:** 8/8 staged files sha256+size matched the manifest before any upload.
2. **Uploads:** 8 → `brand-assets/Property_Pulse/Backgrounds/` (`x-upsert:false`, all HTTP 200).
3. **Mandatory post-upload verify:** 8/8 public-URL downloads matched sha256+bytes (`upload_verification.json`).
4. **Apply:** committed — all in-transaction assertions passed (8 fenced rows · 0 true-flag rows · pool 6/6/6/5 · 6 governed keys untouched).

## Post-apply verification (independent, read-only — ALL PASS)
- 8 new rows, **all double-fenced**: is_active=false · approved=false · approval_status=intake_candidate · production_use_allowed=false · verdict ACCEPT_VISUAL_ONLY. Fixed ids b3a20001…-b3a20008…, keys: bg_pp_au_suburb_texture · bg_pp_transaction_keys_contract · bg_pp_kitchen_living_open_plan · bg_pp_family_backyard_summer · bg_pp_new_build_construction_site · bg_pp_subdivision_land_estate · bg_pp_mortgage_calculator_keys · bg_pp_inspection_checklist_clipboard.
- **Label constraints embedded:** estate = "generic new-estate/subdivision ONLY; NEVER label WA/Perth/location-specific"; suburb texture = never location-specific; transaction = unsigned-template/zero-PII note. (3 rows carry explicit `label_constraint`.)
- **Production untouched (Option D live):** `resolve_brand_assets` 0 hits for all 8; `resolve_slot_assets` on the live market_insight template → facebook + instagram winners still `bg_perth_cbd`, all 8 batch rows rejected `inactive`; eligible pool still **6** (fb 6 / li 6 / ig 5). PP total 38.
- Licences: 6 Unsplash-standard + 2 Pexels — ratified-policy-compliant (no CC BY / CC BY-SA / AI / paid).

## Review chain
db-rls-auditor PASS zero-must-fix (pool-neutrality proven from live fn body) → external review PARTIAL/ESCALATE `fe9d7372…` (its "irreversible deletions" reason misread the INSERT-only apply; surfaced to PK) → **PK hash + upload approval** → applied → verified.

## Standing
- Rollback `297f3032…` (guarded 8-row delete of unpromoted lane rows; storage objects excluded).
- **CARRY (db-rls-auditor low note):** `suggested_scrim_opacity` mixes 0-100 (au_suburb=55, transaction=48) and 0-1 (others) units — metadata-only, not resolver-consumed; **normalize before any scrim_opacity_override at the promotion gate.**
- Market-data (Blazek) remains HOLD (legible chart header failed the crop proof); excluded from this batch.
- Boundaries held: no approval/promotion/production_use_allowed/render/publish/pool-change. Packet commit/push + register entry = separate PK gate (git currently behind origin by 1 — rebase at commit time).

**PP background inventory now:** 6 governed/active (production pool) + 13 inactive intake candidates (5 P0 batch-2 + 8 B3 batch). Promotion of any candidate = its own PK gate and (per Option D) a live production-rotation change.
