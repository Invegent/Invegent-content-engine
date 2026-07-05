CLAIMED v5.02 · pp-bg-dayhero-promotion · shared-main-docs · register-commit-gate · 2026-07-05T06:20Z
# Day-hero PROMOTION — RESULT (LIVE PRODUCTION CHANGE, applied + fully proven)

**APPLIED + VERIFIED** — 2026-07-05, project mbkmaxqhsohbtwsqolns, exact PK-approved artifact (`635275548…` re-verified on disk pre-apply), applied as postgres. All four in-transaction assertions passed at COMMIT (1 promoted / pool==6 / prior 5 governed untouched / 5 batch-2 candidates untouched).

## Production state change (acknowledged at the gate)
`bg_pp_perth_cbd_skyline_day_wide` (`b2a10008…`) is **governed/active**: `approved=true`, `production_use_allowed=true`, `approved_by=PK`, promotion markers + trade-offs recorded. **PP image_quote eligible background pool: facebook/linkedin 5 → 6; instagram stays 5** (platform fence, `platform_scope={facebook,linkedin}`) — the first per-platform pool divergence, by design.

## Live post-apply proof — all six checks PASS
| Check | Result |
|---|---|
| fb unseeded winner | `bg_perth_cbd` (rank order preserved) |
| fb rejected backgrounds | exactly the 5 batch-2 candidates; **day-hero no longer rejected** |
| **Witnessed selection** | seed `wit-1` on the production market_insight template **selects `bg_pp_perth_cbd_skyline_day_wide`** (auditor-recommended proof) |
| Seeded distribution | 27 probe seeds spread across all 6 pool members |
| ig fence | day-hero rejected `platform_excluded`; ig unseeded winner `bg_perth_cbd` (pool 5) |
| `resolve_brand_assets` | returns the day-hero key (1 hit) |

## Standing
- Rollback (demotion) `3c5a8e2556…` standing — byte-exact restore, pool 6→5 assertion; itself a reverse production change (PK gate to use).
- Known consequence folded into existing carry: the vendored v2 creative_contract's descriptive 5-key background list is now stale **evidence text** (stamp-metadata only, cannot fail a render) → strengthens the contract-v3 carry.
- Note for the record (auditor low): `before_state.json` doesn't capture the `platform_scope` column — neither script writes it, fidelity unaffected.
- Chain: db-rls-auditor PASS zero-must-fix → external review agree `8cc1a406…` → PK hash approval → applied → live-proven. Register update (v5.0x) = separate docs gate.

**The full cc-0027 → production arc is complete:** candidate agents sourced it → stress-proven → PK visual acceptance → governed intake (pool-neutral) → PK promotion gate → **live in the production rotation, selection witnessed.**
