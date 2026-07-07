# PP coastal_waterfront — PROMOTION gate packet (LIVE production rotation change)

**Lane:** `pp-bg-coastal-promo (2026-07-06)` · **Tier T3 · PRODUCT_PROOF** · cc-0027 · **1-row UPDATE · LIVE PRODUCTION CHANGE.**
**apply hash:** `e4830afaa5f1273abcf758a6688d75fbf229bfed760b04214f7810891a8d575b` (`coastal_promo_apply.sql`, 4189 bytes)
**rollback hash:** `a9b892d639f10f6c92765cb2109d70e96ed078aec2ab60c830b8cb0c1138897b` (`coastal_promo_rollback.sql`, 4715 bytes)

## v1 note
P2's "review once per shape" is **intake-only**. This is a production rotation change → §2 keeps the **full T3 chain** (db-rls-auditor + external review + PK gate + live proof + rollback-proven-before-apply). Nothing waived.

## What this changes (acknowledged live change)
Promotes `bg_pp_coastal_waterfront` (`b3a20013…`, Whitehaven Beach QLD, platform_scope {facebook,instagram,linkedin}) intake_candidate → **governed/active** (`is_active=true` · `approved=true` · `production_use_allowed=true` · `governed` · `approved_by=PK` · `approved_at`). **First coastal in the live pool.** At COMMIT:

- **Eligible rotation pool: facebook 9→10 · linkedin 9→10 · instagram 8→9.** Selectable in live PP image_quote rotation.

## Pre-state (verified read-only 2026-07-06)
- Row fenced & eligible: is_active=false / approved=false / intake_candidate / prod=false, sha `b164c47a…`, usage=background, bucket=brand-assets, sfto=needs_scrim, license present.
- Current pool 9/9/9/8; current governed set = 9 keys (brisbane, perth, advisory_desk, suburb_aerial_grid, home_keys, kitchen, market_data, perth_skyline_day_wide, sydney).

## In-transaction assertions (fail-closed → full ROLLBACK)
1. **CAS guard** on the UPDATE: matches only the fenced row with sha `b164c47a…`.
2. exactly **1** promoted with the full governed fence-set + `promotion_lane` + `approved_at` + `approved_by=PK`.
3. **pool becomes exactly 10 / fb 10 / li 10 / ig 9** — else RAISE → rollback.
4. **prior 9 governed backgrounds remain governed** (count=9) — else RAISE → rollback.

## Rollback — PROVEN before apply
`coastal_promo_rollback.sql` (`a9b892d6…`) demotes to the **exact** pre-promotion fenced state — verified read-only: `restore == current stored row` is TRUE (jsonb-equal), and local check confirms restore == the intake-inserted meta — and asserts pool returns to 9. Standing; a reverse production change (PK-gated to use).

## Label fence (binding after promotion)
AU coastal / **Whitehaven QLD** — never label Perth/WA (it is QLD, not WA). Two small unbranded moored vessels lower-centre (scrim/crop).

## Review chain (T3 full) + STOPs
db-rls-auditor → `ask_chatgpt_review` (hash-pinned `e4830afa…`) → **PK gate** (live-rotation ack + hash approval) → apply → post-apply live proof (pool 10/10/10/9, resolver includes coastal, unseeded winner unchanged, prior 9 untouched, witnessed selection).
**Named live pre-check STOPs:** apply-hash ≠ `e4830afa…` · pre-apply pool ≠ 9/9/9/8 · row already promoted · any assertion trip · unexpected origin movement.
