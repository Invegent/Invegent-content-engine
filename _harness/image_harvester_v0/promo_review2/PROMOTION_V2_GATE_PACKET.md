# Promotion v2 gate packet — *** LIVE PRODUCTION CHANGE *** (T3 · PRODUCT_PROOF)

**Date:** 2026-07-06 · project mbkmaxqhsohbtwsqolns · **2-row UPDATE** promoting the PK-ratified set (#1 kitchen + #2 advisory desk). The Option-D resolver pool drives live PP image_quote rotation; this apply changes it at COMMIT.
**Apply:** `promotion_apply.sql` sha256 `9a76f6603e3f1bbf7330a0971f61363c66c58a34c782ddd1e745975f794c5d85`
**Rollback (demotion):** `promotion_rollback.sql` sha256 `5bea647eef60c44311b44a1a231abb5959d9aa07280993fa2a3c70b2a061821c` — byte-exact restore verified live (meta+notes 2/2 true); itself a reverse production change (pool → 6/6/6/5).

## What it does — and the live effect
Two UPDATEs: `bg_pp_kitchen_living_open_plan` (b3a20003…) and `bg_pp_advisory_desk_flatlay` (b3a20009…) flip intake_candidate → **governed/active** (is_active=true, approved=true, production_use_allowed=true, PK stamps + promotion markers; notes rewritten to governed, constraints preserved).

**Production impact, stated plainly:** both carry `platform_scope={facebook,instagram,linkedin}`, so the eligible background pool grows:
- **facebook 6 → 8 · linkedin 6 → 8 · instagram 5 → 7.** Under Option D this changes PP image_quote **rotation composition on all three platforms from COMMIT** — seeded FNV selection maps over the larger per-platform lists.
- Both new assets **rank last by created_at** (they're the newest), so the **unseeded winner stays `bg_perth_cbd`** on every platform; only seeded rotation spreads wider.
- The prior 6 governed keys are untouched (asserted). S1 shadow will observe the 8-pool (evidence-only).

## Safety
CAS guards per UPDATE (asset_id + client + key + still-candidate state + exact sha256; drift → 0 rows → abort). Same-transaction assertions: exactly 2 promoted · **eligible pool == exactly all=8 / fb=8 / li=8 / ig=7** · prior 6 governed keys untouched — any miss rolls everything back. Idempotent re-run. `created_at` untouched (rank order cannot shift). No DDL/INSERT/DELETE/grants/storage.

## Pre-state (live)
Both rows pristine intake candidates (pool currently 6/6/6/5); rollback literals verified byte-exact vs live.

## Review chain
db-rls-auditor → external review (hash-pinned `9a76f660…`) → **PK T3 gate = hash approval = authorising the flip AND acknowledging the fb/li/ig 6→8/8→8/5→7 live rotation change.** security-auditor n/a (no grants/policies/DEFINER/REST/storage change).

## Post-apply verification plan (independent, read-only)
1. Both rows governed end-state. 2. Live `resolve_slot_assets` on the production market_insight template per platform: fb/li/ig each show the 2 new keys among eligible (no longer `inactive`-rejected), unseeded winner still `bg_perth_cbd`, and a **seeded probe that lands on each new asset** (witnessed selection). 3. `resolve_brand_assets` returns both keys. 4. Pool == 8/8/8/7; prior governed 6 intact. Result doc follows.

## PK approval requested
Approve hash `9a76f660…` = authorise the 2-asset promotion AND acknowledge the live fb/li/ig pool growth 6→8 / 6→8 / 5→7.
