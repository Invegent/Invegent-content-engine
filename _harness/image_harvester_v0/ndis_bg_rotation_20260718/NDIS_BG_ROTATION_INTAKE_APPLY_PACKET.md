# NDIS Yarns bg ROTATION POOL — DB-INTAKE APPLY PACKET (PK apply gate)

**Status:** ✅ **APPLIED 2026-07-19** (PK authorized apply of `47c09a60`, both steps). 14 fenced rows live; pool-neutral; PP untouched. Candidates remain FENCED — promotion is a separate later per-asset PK gate.

## RESULT — APPLIED (2026-07-19)
- **Step 1 upload+verify:** 14/14 HTTP 200; served-bytes sha256 == local == manifest for all 14. Objects at `brand-assets/NDIS_Yarns/Backgrounds/<key>.jpg`.
- **Step 2 fenced INSERT** (`apply_insert.sql` `47c09a60…` executed verbatim): `DO` block returned clean (no `RAISE`) → all baseline/fence/pool-neutrality asserts passed.
- **Post-verify (live):** new_rows=14 · fully_fenced=14 · distinct_keys=14 · distinct_sha=14 · NDIS total 18→32 · **NDIS eligible-bg = 1 (unchanged)** · **PP eligible = 30 (unchanged)**.
- **Guards:** byte-verify 14/14 · db-rls-auditor PASS 0-must-fix (pre-apply, `47c09a60`; posture unchanged — pure DML, no grant/DDL) · external `652fca6e` agree/med/high. Secret rider R2 honored (env-conveyed, never-in-transcript, USE-only).
- **14 applied rows (fenced `intake_candidate`) — asset_id · asset_key (for rollback):**
  - `a7a1de90-18fb-4419-ab11-a75ba3aa92fc` · bg_ny_brand_texture_teal_navy_gradient
  - `c2143420-af9e-4bc9-80c5-f68beec7ed19` · bg_ny_brand_texture_deep_navy_solid
  - `8f25b3a5-e8f3-4ccf-8405-3aa91d964bdf` · bg_ny_brand_texture_navy_sparkle
  - `a6eba9f9-874e-461e-bcd4-16d43b7a7f3c` · bg_ny_brand_texture_flat_navy
  - `740513c1-b7fb-49a2-b0f0-f9f115b4d964` · bg_ny_brand_texture_blue_smoke
  - `1e9fb096-56c4-4fe1-864c-e3c58ce8ad03` · bg_ny_civic_curved_facade (pre-crop)
  - `aba2bb1e-3d6d-49ce-bc1c-2abda28727dd` · bg_ny_civic_teal_panels
  - `fec1db6b-0ab2-44cd-878f-16d60ee74323` · bg_ny_civic_teal_gold_glass
  - `7d1f899d-44a4-4787-9d07-625fa25a355a` · bg_ny_civic_glass_corner_sky
  - `147cec43-511f-46e5-9b35-411944b8e917` · bg_ny_civic_glass_tower
  - `6849877f-b906-4cc8-8bf6-98b130537b6a` · bg_ny_datagrid_navy_grid
  - `f5552445-9135-47d3-9020-1595a284d0f6` · bg_ny_datagrid_navy_flow
  - `ea7147fc-b37a-4cbc-a16d-7381caefd1f8` · bg_ny_datagrid_light_streaks
  - `b2f617a9-9b7c-488e-87ba-40d2fbe00868` · bg_ny_datagrid_connected_dots
- **Rollback (if needed):** `DELETE FROM c.client_brand_asset WHERE asset_id IN (<14 ids above>);` + delete the 14 storage objects. No dependents (fenced, unreferenced).

## PROMOTION — APPLIED (2026-07-19, 4 of 14)
PK visual PASS on the 4 strongest (crop-proof `promo_cropproof/PROMO_FINALISTS_4.jpg`, 0.55-scrim + 74-char headline, post-scrim band-luma 30–34). Promoted via `promote_update.sql` (sha256 `898cc349e1e0100b5a8740fbd3ed7741c32d04619bafb9ff7470cf8e25e92f91`), CAS-guarded fail-closed `DO` txn — returned clean.
- **Promoted (fenced→governed; is_active/approved/production_use_allowed=true, approval_status='governed', safe_for_text_overlay='needs_scrim'):**
  - `a6eba9f9-…` bg_ny_brand_texture_flat_navy · `c2143420-…` bg_ny_brand_texture_deep_navy_solid · `a7a1de90-…` bg_ny_brand_texture_teal_navy_gradient · `6849877f-…` bg_ny_datagrid_navy_grid
- **Post-verify (live):** NDIS eligible-bg **1→5** (navy_waves + these 4) · PP eligible **30 unchanged** · 10 rotation rows remain fenced.
- **Guards:** db-rls-auditor **PASS 0-must-fix** (real `resolve_slot_assets` predicate 1→5 confirmed, PP untouched, CAS idempotent-safe, no DDL/GRANT/exposure) · external `786654cb` partial/high→**PK escalation decision: PROCEED** (concerns were generic T3 caution; per-row eligibility already evidenced by db-rls).
- **Rollback (re-fence):** `UPDATE c.client_brand_asset SET is_active=false, asset_meta=(asset_meta - 'promoted_by') || jsonb_build_object('approved',false,'production_use_allowed',false,'approval_status','intake_candidate') WHERE client_id='fb98a472-…' AND asset_id IN (<4>) AND asset_meta->>'approval_status'='governed';`
- **Held fenced (10):** civic (5, bright/text-marginal), remaining brand-texture (w-bt-a, w-bt-f), remaining data-grid (data_grid-01, data_grid-02, w-dg-b) — future per-asset PK gates.

---

**(original packet below — pre-apply)**

**Status:** READY FOR PK APPLY GATE. PK opened the gate (2026-07-19: all 14, civic-04 pre-crop).
**Lane:** TMR D7 supp — NDIS bg rotation intake. **Tier:** **T2** (dark/additive fenced INSERT; same shape as v5.71).
**Surface:** NDIS storage (`brand-assets` bucket) + `c.client_brand_asset`. Client-isolated; PP untouched. Promotion (un-fence) is a **separate later per-asset PK gate** — NOT here.

## Pinned artifacts (reviewed_input_hash)
- **`apply_insert.sql`** — sha256 **`47c09a602223a233b32a34b986635caca7815e21dce4d12958c74bd2940efef9`** (on-disk artifact; 14-row single fail-closed `DO` transaction — this is the exact bytes db-rls-auditor reviewed and that will be executed).
- **`upload_verify.sh`** — storage upload + public-URL sha256 verify (14 assets).
- Byte sources: `intake_bytes/<asset_key>.jpg` — all **14/14 byte-verified** against pinned sha256 (13 vs manifest; civic-04 vs pre-crop `9801dfdd…`).

## Same-shape determination vs v5.71 (P2 mechanical gate) → T2
Same table `c.client_brand_asset` · same `asset_type='other'` · identical written-column set (`asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active`) · all 4 fences present-and-false (`is_active=false`, meta `approved=false`/`production_use_allowed=false`/`approval_status='intake_candidate'`) · same eligibility-relevant `asset_meta` key set (26 keys, no new eligibility-touching keys) · `bucket='brand-assets'` · **no DDL · no GRANT/REVOKE · no ON CONFLICT/upsert**. → **Same shape → T2**; the full db-rls + external chain already ran for this shape at v5.71. Per-apply guards run every asset (below).

## Pinned baselines (live, read-only 2026-07-19; asserted in-txn, STOP on drift)
- `ndis_client_id` = `fb98a472-ae4d-432d-8738-2273231c1ef4` · NDIS total rows = 18.
- **NDIS eligible-bg = 1** (the promoted `225eb232`) — must be unchanged after intake.
- **PP eligible pool = 30** — must be unchanged.
- **asset_key collisions = 0** for all 14 proposed keys.
- **Proxy-predicate note (db-rls-auditor should-fix):** the in-txn eligibility asserts use a deliberately LOOSE proxy (`asset_type='other' AND is_active AND approved='true' AND usage='background'`), looser than `resolve_slot_assets` true eligibility (which additionally requires license present, `bucket='brand-assets'`, `safe_for_text_overlay ∈ {'true','needs_scrim'}`, platform_scope match, and keys off `usage` not `asset_type`). It is adequate as a fenced-insert tripwire because the load-bearing fences (`is_active`, `approved`) are honored by BOTH the proxy and the real resolver — a fenced row is rejected by resolve_slot_assets regardless. Baselines are proxy counts (NDIS proxy=1, PP proxy=30), not the exact render-eligible pool.

## Audit verdicts
- **db-rls-auditor: PASS · 0 must-fix** (on `apply_insert.sql` `47c09a60…`). Pool-neutral CONFIRMED (14 rows cannot become render-eligible; resolve_slot_assets rejects `is_active IS NOT TRUE` + `approved IS NOT TRUE` as its first two filters; fail-closed asserts match live baselines). Non-exposing CONFIRMED (table grant-locked to service_role/inspector_ro; anon+authenticated hold zero privileges; no GRANT/DDL; no PGRST106). Client-isolated CONFIRMED. Collision guard sound (no unique constraint on `asset_key`; guard is the mechanism; 0 live collisions, 14 distinct keys). RLS disabled = pre-existing grant-lockdown posture, not altered.
- **external review:** **agree · medium · high → proceed** (review_id `652fca6e-3674-467e-929a-218311c5df1b`, reviewed_input_hash `47c09a60…`; no PK escalation). Verified: fail-closed + clear rollback, multiple in-txn asserts, collision guard sound / 0 live collisions.

## Intake set — 14 fenced rows
| category | asset_key | candidate | dims | sha256(12) | creator |
|---|---|---|---|---|---|
| brand_texture | `bg_ny_brand_texture_teal_navy_gradient` | brand_texture-02 | 1920×2880 | `58ee7d2240ac` | Eva Bronzini |
| brand_texture | `bg_ny_brand_texture_deep_navy_solid` | brand_texture-03 | 1920×2880 | `5f3ceb631d4e` | Eva Bronzini |
| brand_texture | `bg_ny_brand_texture_navy_sparkle` | w-bt-a | 1920×2880 | `96445e0bdf5a` | Eva Bronzini |
| brand_texture | `bg_ny_brand_texture_flat_navy` | w-bt-e | 1920×2880 | `f0f385dc13b8` | Eva Bronzini |
| brand_texture | `bg_ny_brand_texture_blue_smoke` | w-bt-f | 1920×1280 | `a99671f1e5b7` | Marek Piwnicki |
| civic_neutral | `bg_ny_civic_curved_facade` | civic_neutral-04 (**PRE-CROP** 1:1) | 1600×1600 | `9801dfddc536` | Mikitayo |
| civic_neutral | `bg_ny_civic_teal_panels` | civic_neutral-05 | 1920×1284 | `1facbb759341` | Ronald van Eendenburg |
| civic_neutral | `bg_ny_civic_teal_gold_glass` | civic_neutral-02 | 1920×1280 | `4c79ebacbdcb` | Jan van der Wolf |
| civic_neutral | `bg_ny_civic_glass_corner_sky` | civic_neutral-03 | 1920×1280 | `1b616bf87326` | Jan van der Wolf |
| civic_neutral | `bg_ny_civic_glass_tower` | civic_neutral-01 | 1920×1280 | `26a2697de406` | Mineia Martins |
| data_grid | `bg_ny_datagrid_navy_grid` | w-dg-a (CGI "3D Render", non-AI) | 1920×1440 | `014d2f6b0889` | 3D Render |
| data_grid | `bg_ny_datagrid_navy_flow` | w-dg-b | 1920×2880 | `413c47c05d27` | Ahmed (@mutecevvil) |
| data_grid | `bg_ny_datagrid_light_streaks` | data_grid-01 | 1920×2880 | `874049f829bb` | Evija Ciematniece |
| data_grid | `bg_ny_datagrid_connected_dots` | data_grid-02 | 1920×1280 | `4341d9610358` | Solen Feyissa |

Each row: `asset_type='other'`, `platform_scope=NULL`, `is_active=false`, `usage='background'`, `safe_for_text_overlay='needs_scrim'` (provisional; authoritative verdict = PK crop-proof at the **promotion** gate), `license_type='pexels_license'`, `harvest_lane='ndis-bg-rotation-20260718'`. Already-live `brand_texture-01`/`225eb232` is EXCLUDED.

## Ordered apply (STOP on any tripwire; nothing promoted)
1. **Upload + verify** — `bash upload_verify.sh`: POST each `intake_bytes/<key>.jpg` → `brand-assets/NDIS_Yarns/Backgrounds/<key>.jpg` `x-upsert:false` (expect 200; existing-object = collision STOP) → GET public URL → served sha256 == local sha256 (== manifest). 14/14 or STOP (no INSERT).
2. **Fenced INSERT** — run `apply_insert.sql` via `execute_sql` (single `DO` txn): baseline asserts (NDIS elig-bg=1, PP elig=30) → collision guard → 14 INSERTs → rowcount==14 → fence-state assert (all 14 fully fenced) → pool-neutrality assert (NDIS elig-bg & PP elig unchanged). Any assert `RAISE` → whole txn rolls back.
3. **Post-verify (read-only)** — list the 14 new rows (asset_id + key + fences) · NDIS eligible-bg == 1 · PP eligible == 30 · NDIS total rows 18→32.
4. **db-rls-auditor PASS** (0 must-fix) on the applied change.

## Per-apply guards — NON-WAIVABLE
byte-verify (done: 14/14) · public-URL sha256 (step 1) · in-txn pool-neutrality + fence-state asserts (step 2) · db-rls-auditor (step 4) · branch-warden on any record commit. No upsert/DDL/GRANT.

## Secret rider (R2)
`SUPABASE_SERVICE_ROLE_KEY` (+ `SUPABASE_URL`) for the storage upload — env-conveyed, **never in transcript**, USE-only (no posture change). Keeps the lane T2.

## STOP conditions (Convention 2 — non-removable)
Upload non-200 / x-upsert:false collision · served≠local sha · any in-txn assert RAISE · NDIS eligible-bg moves off 1 · PP eligible moves off 30 · rowcount≠14 · a new row not fully fenced · db-rls non-clean · unexpected origin movement. A tripped STOP voids the remainder; resume needs a fresh PK gate.

## Rollback (validated before apply)
Fenced rows are ineligible → no pool/production impact. **DB:** `DELETE FROM c.client_brand_asset WHERE client_id='fb98a472-…' AND asset_meta->>'asset_key' IN (<14 keys>) AND asset_meta->>'approval_status'='intake_candidate';` (targets only the 14 fenced rows). **Storage:** delete the 14 uploaded objects under `brand-assets/NDIS_Yarns/Backgrounds/`. No dependents (unreferenced, fenced).

## Non-claims
Intake is fenced — renders nothing, changes no pool, flips no governance. Promotion (un-fencing) of any asset is a separate later per-asset PK gate. Video path untouched. `safe_for_text_overlay` is provisional until the PK crop-proof at promotion.
