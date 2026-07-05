# Day-hero PROMOTION gate packet — *** LIVE PRODUCTION CHANGE ***

**Date:** 2026-07-05 · **Lane class:** PRODUCT_PROOF · **Tier: T3** (production-touching: the Option-D resolver pool drives live PP image_quote rotation; this apply changes it at COMMIT)
**Apply artifact:** `promotion_apply.sql` — sha256 `635275548c47d53f2ff59db9113c4df457a3878913ca408b620063be14e206fd`
**Rollback (demotion):** `promotion_rollback.sql` — sha256 `3c5a8e2556d80865795a5094306ab1237450ea3f07b2ff0f59c97269a6de3df9` — byte-exact restore verified against live row (meta_exact + notes_exact = true); itself a production change in reverse (pool 6→5).

## What this does — and its live effect
One UPDATE: `bg_pp_perth_cbd_skyline_day_wide` (`b2a10008…`, the PK-accepted cc-0027 day-hero) flips intake_candidate → **governed/active** (`is_active=true`, `approved=true`, `production_use_allowed=true`, PK stamps + promotion markers; notes rewritten to governed wording with trade-offs preserved).

**Production impact, stated plainly:**
- Eligible background pool for **facebook and linkedin** callers: **5 → 6**. Under Option D this changes PP image_quote **rotation composition in production from the moment of COMMIT** — seeded FNV selection maps over a 6-list instead of a 5-list, so future renders' background picks shift.
- **Instagram pool stays 5**: this asset's `platform_scope={facebook,linkedin}` and the platform fence is live. **Per-platform pool divergence begins here** — a first for PP, working exactly as the fence was designed; flagged as a PK-visible consequence, not a defect. (Extending to instagram later = separate additive DML.)
- Unseeded/top-rank behaviour unchanged (`bg_perth_cbd` keeps created_at rank 1); S1 shadow rows will observe the 6-pool (evidence-only); stamper `background_key` evidence continues.

## Safety design
CAS guards (id + client + key + still-candidate state + intake-lane marker + exact sha256; drift → 0 rows → abort). Same-transaction assertions: exactly 1 row in full promoted state · **pool == exactly 6** · the prior 5 governed keys untouched · the 5 batch-2 candidates untouched — any miss rolls everything back. Idempotent re-run. `created_at` untouched (rank order cannot shift). No DDL/INSERT/DELETE/grants/storage.

## Review chain
- db-rls-auditor: `db_rls_auditor_verdict.json` (required PASS)
- External review: `external_review.json` — `reviewed_input_hash` must equal `635275548…`
- security-auditor: n/a (no grants/policies/DEFINER/REST change) — recorded.

## Post-apply verification plan (independent, read-only)
1. Row end-state. 2. Live `resolve_slot_assets` on the production market_insight template: **facebook** → day-hero appears among eligible (rejected list no longer contains it; seeded probes reach it; unseeded winner still `bg_perth_cbd`); **instagram** → day-hero rejected `platform_excluded` (fence proof, pool 5). 3. `resolve_brand_assets` returns the key. 4. Prior-governed + candidates counts unchanged. Result doc follows.

## PK approval being requested
Approve hash `635275548…` = authorise the flip AND acknowledge the live production-rotation change (fb/li pool 5→6; instagram divergence by design).
