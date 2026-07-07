# PP "good-enough coverage" BATCH PROMOTION — RESULT (LIVE, applied + fully proven)

**APPLIED + VERIFIED** — 2026-07-06, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `661338bc7e95ca435d7b3d2956b9a252aea474ce028584480fe38f884dd0ccb8` (re-verified on disk pre-apply). 6 CAS-guarded UPDATEs in one transaction; all in-transaction assertions passed at COMMIT. **T3 · PRODUCT_PROOF · cc-0027 · P1 batch at the promotion tier.**

## What this proves for v1
**One full T3 chain promoted 6 assets** (db-rls-auditor + external + PK gate + live proof + proven rollback — once, for the batch) instead of 6 separate single-row lanes. This is the "finish-line accelerator": the batch crossed PP from "good enough" (11) to **17 governed backgrounds across every content pillar** in a single gate.

## Production state change (acknowledged at the T3 gate)
6 fenced candidates → **governed/active** (each: is_active=true · approved=true · production_use_allowed=true · governed · approved_by=PK · approved_at ~2026-07-07T10Z · promotion_lane `pp-bg-goodenough-batch-promo (2026-07-06)`):

| key | pillar | scope |
|---|---|---|
| bg_pp_sold_sign_closeup | sales / results | {fb,ig,li} |
| bg_pp_new_build_construction_site | construction | {fb,li} |
| bg_pp_subdivision_land_estate | land (never WA/Perth) | {fb,li} |
| bg_pp_mortgage_calculator_keys | finance | {fb,ig,li} |
| bg_pp_inspection_checklist_clipboard | inspection | {fb,ig} |
| bg_pp_modern_home_exterior_front | residential exterior | {fb,ig} |

**Eligible rotation pool: facebook 11→17 · linkedin 11→15 · instagram 10→14 · all 11→17.**

## Pre-apply STOP-checks (passed)
Apply-hash == `661338bc…` · all 6 fenced · promotion_lane unused (0 rows) · pool 11/11/11/10.

## Live post-apply proof — ALL PASS
| Check | Result |
|---|---|
| 6 rows governed | ✓ all 6 governed / approved_by=PK |
| Eligible pool | ✓ **17 / fb 17 / li 15 / ig 14** (in-txn asserted) |
| Prior 11 governed | ✓ untouched |
| Unseeded winner | ✓ `bg_perth_cbd` unchanged |
| **Witnessed selection** | ✓ 40 fb seed probes — all 6 promoted rows selected (subdivision 3 · construction 3 · sold 3 · modern 2 · mortgage 2 · inspection 1) |

## Review chain (T3 full)
db-rls-auditor **PASS** zero-must/should-fix (6 CAS guards sound, pool 17/17/15/14 arithmetic confirmed, prior-11 disjoint, mechanical rollback structurally proven, notes cosmetic-only) → external review `9d4cca9a-e784-4443-8070-3ec344efcc50` **AGREE / risk medium / confidence high / proceed** (hash-pinned `661338bc…`) → PK T3 gate → apply → proven.

## Standing
- **Mechanical rollback** `7b63fee564164c36304d2cbb2e7c4af0145a8675fb447642aa073ddf591d3fe0` — strips the 5 added keys + resets the 3 flags, keyed on promotion_lane; **verified byte-exact 6/6** (`rollback(forward(m))==m`) read-only pre-apply. Reverse production change (PK-gated).
- Per-row label/geography fences preserved (subdivision never-WA/Perth). `notes` intentionally left as intake note for byte-exact rollback (cosmetic; resolver reads asset_meta+is_active).
- **PP background pool now 17 governed/active + 7 inactive candidates.** Every core content pillar covered.
- Register pointer = separate docs gate; **local-commit-hold behind the R4 boundary** (cc-0028 `4e81263` unpushed) — and note a parallel-session v5.25 collision (spine-gen took v5.25 on origin) means the image-lane docs pointers need renumbering before push.
