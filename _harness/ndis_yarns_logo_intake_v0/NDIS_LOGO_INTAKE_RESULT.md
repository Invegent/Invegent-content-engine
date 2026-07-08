CLAIMED v5.32 · ndis-yarns-logo-intake-v0 · isolated-worktree ce-ndisreg · register-commit-gate · 2026-07-08
# NDIS Yarns logo-variant INTAKE v0 — RESULT (applied + verified)

**APPLIED + VERIFIED** — 2026-07-08, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `8a8e2569358c81639f969eb2b13e0690d7f55251c9da9baaf64a4269a1d5de52` (re-verified on disk pre-apply). 17 fenced INSERTs in one transaction; all in-txn assertions passed at COMMIT. **T2 · SAFETY_GATE (full chain — new client).**

## What landed (17 fenced candidates, curated)
9 SVG (`usage=logo_vector_source`) + 8 PNG (`usage=logo`) for NDIS Yarns (`fb98a472-…`), ids `d1b10001…`–`d1b10017…`, all DOUBLE-FENCED (is_active=false · approved=false · production_use_allowed=false · intake_candidate). asset_type ∈ {logo_primary, logo_dark, logo_light, logo_icon, watermark, other} — all CHECK-valid; the invalid `'logo'` never used. Storage: `brand-assets/NDIS_Yarns/Logos/ny_logo_*` (17 uploaded x-upsert:false, public-URL sha256 verified 17/17; **no overwrite** of the 3 live files).

## Post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Fenced count | ✓ 17 |
| Governed/active logos | ✓ **0** (nothing selectable) |
| SVG / PNG split | ✓ 9 vector_source + 8 logo |
| `brand_profile.brand_logo_url` | ✓ **unchanged** (still NDIS-Yarns_Logo.png) |
| asset_type values | ✓ all CHECK-valid (logo_dark/logo_icon/logo_light/logo_primary/other/watermark) |
| **sha256 fidelity** | ✓ **all 17 stored hashes == manifest** (large-apply transit verified byte-faithful) |

## Reconstruction caveat (recorded in every row)
Claude Design **manual vector reconstruction** of the live rasters · brand font **approximated** · **not pixel-perfect** to the original · production logo swap deferred to a separate future PK gate. The kit's `source_` files are byte-identical to the 3 live `NDIS_Yarns/Logos/NDIS-Yarns_*` originals (confirmed).

## Review chain
db-rls-auditor **PASS zero-must-fix** (all 8 checks; production-neutral by construction; one non-blocking note: idempotency via WHERE-NOT-EXISTS not a DB unique constraint) · external review `48f76536-f10d-4e5d-983e-5603b95890ef` **partial/escalate, NO concrete defect** (reflexive production-adjacent escalation; verified facts, generic pushback) — surfaced to PK, who approved · PK hash/upload gate approved → upload → apply → proven.

## Standing / NOT done (per PK boundaries)
Rollback `17b4dc66a3e1ffae317b4ccb3d50c0faacbd40b5c66e0bae4557ee04ab6b518c` standing (guarded delete of the 17 fenced lane rows; storage excluded). **NOT done:** promotion · is_active flip · brand_profile change · production logo swap · live render/publish change · TMR activation for NDIS · template assignment · resolver change · **register commit** (separate future PK gate).
