# PP "good-enough coverage" BATCH PROMOTION gate packet (6 assets → live)

**Lane:** `pp-bg-goodenough-batch-promo (2026-07-06)` · **Tier T3 · PRODUCT_PROOF** · cc-0027 · **6-row UPDATE · LIVE PRODUCTION CHANGE.**
**apply hash:** `661338bc7e95ca435d7b3d2956b9a252aea474ce028584480fe38f884dd0ccb8` (`batch_promo_apply.sql`, 10092 bytes)
**rollback hash:** `7b63fee564164c36304d2cbb2e7c4af0145a8675fb447642aa073ddf591d3fe0` (`batch_promo_rollback.sql`, 1882 bytes)

## v1 note
**P1 (batch) applied at the T3 promotion tier:** ONE full T3 chain for the whole batch, not one per asset (§2 keeps the full chain for production rotation changes; P2's review waiver is intake-only). This is the "finish-line accelerator" — 6 promotions in one gate.

## What this changes (acknowledged live change)
Promotes 6 fenced candidates → **governed/active**, each adding a distinct content pillar the live pool lacked:

| asset_id | key | pillar | scope | sha256 |
|---|---|---|---|---|
| b2a10005… | `bg_pp_sold_sign_closeup` | sales / results | {fb,ig,li} | `d566d622…` |
| b3a20005… | `bg_pp_new_build_construction_site` | construction | {fb,li} | `6e32a1e2…` |
| b3a20006… | `bg_pp_subdivision_land_estate` | land (never WA/Perth label) | {fb,li} | `03482fe2…` |
| b3a20007… | `bg_pp_mortgage_calculator_keys` | finance | {fb,ig,li} | `84dbab66…` |
| b3a20008… | `bg_pp_inspection_checklist_clipboard` | inspection | {fb,ig} | `5db1fbe3…` |
| b2a10003… | `bg_pp_modern_home_exterior_front` | residential exterior | {fb,ig} | `836d2cf6…` |

**Eligible rotation pool: facebook 11→17 · linkedin 11→15 · instagram 10→14 · all 11→17** (scopes differ per row; deltas fb +6 / li +4 / ig +4).

## Pre-state (verified read-only 2026-07-06)
All 6 rows fenced/eligible (is_active=false / approved=false / intake_candidate / prod=false, sha per row, sfto=needs_scrim). Current pool 11/11/11/10; current governed set = 11 keys.

## Design — clean mechanical reversal (per-row byte-exact rollback WITHOUT stored blobs)
The forward patch adds `approved_by/approved_at/promotion_decision/promotion_lane/promotion_packet` and sets the 3 flags, and **does NOT touch `pk_decision`, `label_constraint`, `geography`, or `notes`**. The rollback strips exactly those 5 added keys and resets the 3 flags → restores each row's original meta **byte-exact**. Proven read-only pre-apply: **6/6 `rollback(forward(m)) == m`.** (Per-row `label_constraint`/`geography` fences — incl. subdivision's never-WA/Perth — are preserved untouched and stay binding.)

## In-transaction assertions (fail-closed → full ROLLBACK)
1. 6 per-row **CAS-guarded** UPDATEs (each pins its sha + fenced state).
2. exactly **6** promoted with the governed fence-set + `promotion_lane` + `approved_at` + `approved_by=PK`.
3. **pool becomes exactly 17 / fb 17 / li 15 / ig 14** — else RAISE → rollback.
4. **prior 11 governed backgrounds remain governed** (count=11) — else RAISE → rollback.

## Cosmetic note
`notes` is intentionally left as the intake note (to keep the rollback byte-exact); the authoritative governance state is `asset_meta` + `is_active`, which the resolver reads. A notes-refresh is an optional later cosmetic follow-up.

## Review chain (T3 full) + STOPs
db-rls-auditor → `ask_chatgpt_review` (hash-pinned `661338bc…`) → **PK gate** → apply → post-apply live proof (pool 17/17/15/14, unseeded winner unchanged, prior 11 untouched, witnessed selection of promoted rows).
**Named STOPs:** apply-hash ≠ `661338bc…` · pre-apply pool ≠ 11/11/11/10 · any row already promoted · any assertion trip · unexpected origin movement.
**Docs push note:** the register pointer (future v5.26/27) will be committed **locally-only, push held** behind the same R4 boundary as v5.25 (cc-0028 `4e81263` still unpushed).
