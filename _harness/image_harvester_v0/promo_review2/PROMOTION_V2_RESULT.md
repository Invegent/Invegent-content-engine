CLAIMED v5.16 · pp-bg-promo-v2 · shared-main-docs · register-commit-gate · 2026-07-06T10:55Z
# Promotion v2 — RESULT (LIVE PRODUCTION CHANGE, applied + fully proven)

**APPLIED + VERIFIED** — 2026-07-06, project mbkmaxqhsohbtwsqolns, exact PK-approved artifact (`9a76f660…` re-verified on disk pre-apply), applied as postgres. All in-transaction assertions passed at COMMIT (2 promoted / pool 8/8/8/7 / prior 6 governed untouched).

## Production state change (acknowledged at the T3 gate)
`bg_pp_kitchen_living_open_plan` (b3a20003…) + `bg_pp_advisory_desk_flatlay` (b3a20009…) are **governed/active** (approved=true, production_use_allowed=true, approved_by=PK). **PP image_quote eligible background pool: facebook 6→8 · linkedin 6→8 · instagram 5→7.**

## Live post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Both rows governed end-state | ✓ (is_active/approved/production_use_allowed=true, PK) |
| `resolve_brand_assets` (2 keys) | **2 hits** (was 0) |
| fb unseeded winner | `bg_perth_cbd` (rank order preserved) |
| fb new-asset rejections | **0** (both now eligible on facebook) |
| **Witnessed selection** | 16 fb seed probes spread across all 8 pool members; **4 landed on the two new assets** (kitchen ×2, advisory ×2) — seeded rotation demonstrably includes them |
| instagram / linkedin unseeded winner | `bg_perth_cbd` (both) |
| pool | 8/8/8/7 (in-txn asserted) |

## Standing
- Rollback (demotion) `5bea647e…` standing — byte-exact restore + pool 8→6 assertion; itself a reverse production change (PK-gated to use).
- Review chain: db-rls-auditor PASS zero-must-fix → external review PARTIAL/ESCALATE `9ea170e6…` (high-risk — **substantively correct** for a genuine live rotation change, unlike the fenced-intake escalations; no concrete defect) → PK hash approval → applied → proven.
- Carries (recorded): vendored v2 creative_contract key-list now further stale (existing contract-v3 carry, metadata-only, cannot fail a render); scrim-unit normalisation still open for any future scrim_opacity_override.

**PP background pool now 8 governed/active** (perth_cbd · brisbane_cbd · sydney_cbd · au_suburb_aerial_grid · home_keys_contract_table · perth_cbd_skyline_day_wide · **kitchen_living_open_plan · advisory_desk_flatlay**) — first interior + first professional-desk registers added. **13 inactive candidates remain** (3 P0 batch-2 deferred + 6 B3 deferred + 4 B3M4/other... = 13). Register update + packet commit = separate docs gate.
