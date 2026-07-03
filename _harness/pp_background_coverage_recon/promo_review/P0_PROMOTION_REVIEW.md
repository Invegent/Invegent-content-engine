# P0 Background Promotion Review — Selective Visual Gate (PK decision packet)

**Date:** 2026-07-03 · **Lane:** review only — **no DB mutation performed or drafted-for-apply**; all 7 candidates verified live still `is_active=false / approved=false / intake_candidate` before review.
**Visual evidence:** `promotion_ranking_sheet.jpg` (this folder) · full crop/scrim/mobile pages in `_harness/pp_background_intake_p0/review_pack/` · candidates on disk in `batch2/upload_staging/`.

## The decisive constraint

Background selection in `resolve_slot_assets` v1 is **blind seeded rotation** over ALL eligible (approved+active) backgrounds — no theme, format, or headline awareness (theme-aware selection is a future carry). **Promotion therefore means: "this image may appear behind ANY PP image post on its scoped platforms."** The ranking below weighs that harder than pure visual quality: an asset must be safe and on-brand under any headline, or it stays inactive until theme-aware selection exists.

Current eligible pool: 3 (Perth/Brisbane/Sydney CBD). Promoting the recommended 2 → pool of 5, all `needs_scrim`, originals keep rank precedence (created_at); seeded rotation spreads across 5. Zero live callers today (resolvers dark); S1 shadow stamping, once built, would observe the wider pool — evidence-only.

## Recommendation: promote 2, option on a 3rd

| Rank | Asset | Verdict on file | Why | Risk under blind rotation |
|---|---|---|---|---|
| **#1 PROMOTE** | `bg_pp_au_suburb_aerial_grid` | PASS_GENERIC_ONLY | Visually strongest of the 7; even rooftop pattern takes scrim+text excellently; adds the missing *residential* texture to an all-CBD pool; core to suburb/market content | None visually. Its constraint is caption governance ("never label Perth") — not triggered by background use. Scrim: keep 64-class (busy pattern) when scrim-48 recalibration lands |
| **#2 PROMOTE** | `bg_pp_home_keys_contract_table` | PASS (clean) | Best text-safe zone of the set (blurred empty left half); transaction/settlement feel fits ANY property headline; theme-neutral | None. Note: widely-used non-exclusive stock (recorded in meta) |
| **#3 OPTIONAL** | `bg_pp_open_home_entry` | PASS_WITH_NOTE | Most neutral of the remainder — bright, welcoming, generic; good text zones | Soft: scope note says open-home/checklist content; US-style porch. Acceptable-generic under rotation, but promote only if you want a 5→6 pool now |

## Stay inactive (deferred, with the reason each defers)

- **`bg_pp_sold_sign_closeup`** (clean PASS, but): the image *says* "SOLD". Under blind rotation it would land behind rate updates, buyer tips, settlement explainers — thematically wrong/misleading. **Defer to theme-aware selection**; it's a first-rate asset for sold-results content specifically.
- **`bg_pp_for_sale_sign_street`** (PARTIAL_FIT_ONLY): its recorded constraint — *no centre-text overlay unless the template offsets text* — is **unenforceable by the v1 resolver** (rotation can pair it with centre-text templates, which is exactly what the current selectable set uses). Defer until offset-aware/theme-aware selection.
- **`bg_pp_perth_skyline_dawn_moody`** (PASS_WITH_NOTE): mood constraint ("moody market-update only") is likewise unenforceable under rotation, and the pool already has 3 city skylines — lowest marginal value. Also keeps pressure on the real carry: the bright-day Perth hero.
- **`bg_pp_modern_home_exterior_front`** (PASS_WITH_NOTE): scope note (seller tips / modern housing, not detached-home hero) is a soft constraint; visually fine but adds less than #1–#3. Hold for the next promotion round or theme-aware selection.

## What promotion would change (for the next lane, NOT this one)

Per selected asset, a small UPDATE flipping `is_active=true` + `asset_meta.approved=true` + `approval_status='governed'` + `production_use_allowed=true` + PK approval stamp — CAS-guarded, with rollback, through the standard chain (db-rls-auditor → external review → PK hash gate). The Batch-2 rollback remains promotion-guarded: promoted rows become un-deletable by it, by design. Nothing else changes: no render, no publish, no runtime/dashboard/Format Mix, resolvers stay dark.

## PK decisions requested

1. Ratify the promotion set: **#1 + #2** (recommended), optionally **+ #3**.
2. Confirm the 4 deferrals (each stays `intake_candidate`, revisited when theme-aware selection or the relevant carry lands).
3. On your ratification I prepare the promotion DML packet as its own gated lane (stop-at-hash-gate, as usual).
