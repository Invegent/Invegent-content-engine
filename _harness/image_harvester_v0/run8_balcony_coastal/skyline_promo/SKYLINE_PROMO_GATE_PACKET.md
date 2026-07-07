# PP city_skyline_vantage — PROMOTION gate packet (LIVE production rotation change)

**Lane:** `pp-bg-skyline-promo (2026-07-06)` · **Tier T3 · PRODUCT_PROOF** · cc-0027 · **1-row UPDATE · LIVE PRODUCTION CHANGE.**
**apply hash:** `f0150f365180de084f2f0a7f37abcc3fb89e775e641e3055028ea1dc7d9eacf3` (`skyline_promo_apply.sql`, 4227 bytes)
**rollback hash:** `fde57bd18c7ff15867d77173cae606475afb4ae564d4259bc704e973c52b9072` (`skyline_promo_rollback.sql`, 4544 bytes)

## PK-noted product judgment (recorded, not a blocker)
This is the **generic non-Australian (São Paulo)** skyline, and the pool already carries real Perth/Brisbane/Sydney CBD skylines. Orchestrator flagged the weak-fit/redundancy concern at the visual gate; PK elected intake and now promotion. The geography fence (generic-only, NEVER label AU/Perth/WA) stays binding in production.

## What this changes (acknowledged live change)
Promotes `bg_pp_city_skyline_vantage` (`b3a20012…`, platform_scope {facebook,instagram,linkedin}) intake_candidate → **governed/active** (`is_active=true` · `approved=true` · `production_use_allowed=true` · `governed` · `approved_by=PK` · `approved_at`). At COMMIT:
- **Eligible rotation pool: facebook 10→11 · linkedin 10→11 · instagram 9→10.**

## Pre-state (verified read-only 2026-07-06)
- Row fenced & eligible: is_active=false / approved=false / intake_candidate / prod=false, sha `2ef9d39b…`, usage=background, bucket=brand-assets, sfto=needs_scrim, license present, scope {fb,ig,li}.
- Current pool 10/10/10/9; current governed set = 10 keys (incl. coastal).

## In-transaction assertions (fail-closed → full ROLLBACK)
1. **CAS guard** — only the fenced row with sha `2ef9d39b…`.
2. exactly **1** promoted with the full governed fence-set + `promotion_lane` + `approved_at` + `approved_by=PK`.
3. **pool becomes exactly 11 / fb 11 / li 11 / ig 10** — else RAISE → rollback.
4. **prior 10 governed backgrounds remain governed** (count=10) — else RAISE → rollback.

## Rollback — PROVEN before apply
`skyline_promo_rollback.sql` (`fde57bd1…`) demotes to the **exact** pre-promotion fenced state — verified read-only: `restore == current stored row` is TRUE (jsonb-equal) and local check confirms restore == intake-inserted meta — and asserts pool returns to 10. Standing; reverse production change (PK-gated).

## Geography fence (binding after promotion)
GENERIC non-Australian skyline (São Paulo) — usable generic-only; **NEVER label AU/Perth/WA/any Australian capital.**

## Review chain (T3 full) + STOPs
db-rls-auditor → `ask_chatgpt_review` (hash-pinned `f0150f36…`) → **PK gate** → apply → post-apply live proof (pool 11/11/11/10, resolver includes skyline, unseeded winner unchanged, prior 10 untouched, witnessed selection).
**Named live pre-check STOPs:** apply-hash ≠ `f0150f36…` · pre-apply pool ≠ 10/10/10/9 · row already promoted · any assertion trip · unexpected origin movement.
**Docs push note:** the register pointer for this promotion (a future v5.26) will be committed **locally-only** and held behind the same R4 boundary as v5.25 until the cc-0028 commit is pushed by its own lane.
