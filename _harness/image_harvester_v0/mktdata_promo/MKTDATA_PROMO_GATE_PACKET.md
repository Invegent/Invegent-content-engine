# PP market-data — PROMOTION gate packet (LIVE production rotation change)

**Lane:** `pp-bg-mktdata-promo (2026-07-06)` · **Tier T3 · PRODUCT_PROOF** · cc-0027 · **1-row UPDATE · LIVE PRODUCTION CHANGE.**
**apply hash:** `0275b74c1e3583f1049d9405b785115b2479240859280a963b576730b5f26828` (`mktdata_promo_apply.sql`, 4194 bytes)
**rollback hash:** `193b5f97e18222146846a119048ba1d40daacbf6e364542a276e16ffbc322404` (`mktdata_promo_rollback.sql`, 4537 bytes)

## What this changes (acknowledged as a live production change)
Promotes `bg_pp_market_data_chart_grid` (`b3a20011…`, platform_scope {facebook,instagram,linkedin}) from intake_candidate → **governed/active** (`is_active=true` · `approved=true` · `production_use_allowed=true` · `approval_status=governed` · `approved_by=PK` · `approved_at`). Under Option D the resolver pool is production-live, so at COMMIT:

- **Eligible rotation pool: facebook 8→9 · linkedin 8→9 · instagram 7→8.** Rotation composition shifts on all three platforms; market-data becomes selectable in live PP image_quote production.

## Pre-state (verified read-only 2026-07-06)
- Row is fenced & promotion-eligible: is_active=false / approved=false / intake_candidate / prod=false, sha `d3cb9b1c…`, usage=background, bucket=brand-assets, sfto=needs_scrim, license present.
- Current pool 8/8/8/7; current governed set = 8 keys (brisbane, perth, advisory_desk, suburb_aerial_grid, home_keys, kitchen, perth_skyline_day_wide, sydney).

## In-transaction assertions (fail-closed → full ROLLBACK)
1. **CAS guard** on the UPDATE: matches only the fenced row with sha `d3cb9b1c…` (won't fire if already promoted or bytes changed).
2. exactly **1** row promoted with the full governed fence-set + `promotion_lane` + `approved_at` + `approved_by=PK`.
3. **pool becomes exactly 9 / fb 9 / li 9 / ig 8** — else RAISE → rollback.
4. **prior 8 governed backgrounds remain governed** (count=8) — else RAISE → rollback.

## Rollback — PROVEN before apply
`mktdata_promo_rollback.sql` (`193b5f97…`) demotes the row to its **exact** pre-promotion fenced state (byte-exact asset_meta restore — verified read-only: `restore == current stored row` is TRUE) and asserts pool returns to 8. Standing; itself a reverse production change (PK-gated to use).

## Review chain (T3 full)
db-rls-auditor (read-only) → `ask_chatgpt_review` (hash-pinned `0275b74c…`) → **PK gate** (live rotation change acknowledgement + hash approval) → apply → post-apply live proof (pool 9/9/9/8, resolver includes market-data, unseeded winner unchanged, prior 8 untouched) → result doc.

**Named live pre-check STOPs:** apply-hash ≠ `0275b74c…` · pre-apply pool ≠ 8/8/8/7 · row no longer fenced (already promoted) · any assertion trip · unexpected origin movement.
