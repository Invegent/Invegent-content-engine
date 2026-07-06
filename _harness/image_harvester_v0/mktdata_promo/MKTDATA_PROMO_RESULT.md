CLAIMED v5.20 · pp-bg-mktdata-promo · shared-main-docs · register-commit-gate · 2026-07-06T22:40Z
# PP market-data PROMOTION — RESULT (LIVE production change, applied + fully proven)

**APPLIED + VERIFIED** — 2026-07-06, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `0275b74c1e3583f1049d9405b785115b2479240859280a963b576730b5f26828` (re-verified on disk pre-apply). One CAS-guarded UPDATE; all in-transaction assertions passed at COMMIT. **T3 · PRODUCT_PROOF · cc-0027.**

## Production state change (acknowledged at the T3 gate)
`bg_pp_market_data_chart_grid` (`b3a20011…`, platform_scope {facebook,instagram,linkedin}) promoted intake_candidate → **governed/active** (is_active=true · approved=true · production_use_allowed=true · approval_status=governed · approved_by=PK · approved_at 2026-07-06T22:25:33.327761Z). **PP image_quote eligible background pool: facebook 8→9 · linkedin 8→9 · instagram 7→8.** First abstract/data-motif background in the live pool.

## Pre-apply STOP-checks (passed)
Apply-hash == `0275b74c…` · row still fenced (`false/false/intake_candidate`) · pool still 8/8/8/7 immediately before apply.

## Live post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Row governed end-state | ✓ is_active/approved/production_use_allowed=true · governed · approved_by=PK · approved_at 22:25:33Z |
| Eligible pool | ✓ **9/9/9/8** (fb/li/ig); market-data confirmed present in eligible set |
| Prior 8 governed | ✓ untouched (count 8) |
| Unseeded winner | ✓ `bg_perth_cbd` unchanged on all 3 platforms (market-data newest → ranks last; idx-0 pick unaffected) |
| **Witnessed selection** | ✓ 24 facebook seed probes spread across all 9 pool members; **`bg_pp_market_data_chart_grid` selected 2×** — live resolver demonstrably rotates it into production |

Resolver mechanics (confirmed from `resolve_slot_assets` body): seeded FNV-1a rotation over the ranked eligible pool (bg_true class then bg_needs, each created_at ASC); market-data joins the needs_scrim class last by created_at, so unseeded pick is unchanged and seeded picks include it.

## Review chain (T3 full)
db-rls-auditor **PASS** zero-must-fix (one non-blocking note: rollback WHERE not CAS-guarded on promoted-state — acceptable for a PK-gated one-shot, its own demotion assertion still fail-closes) → external review `017992cd-e318-46e6-8e17-b075a9d00103` **AGREE / risk medium / confidence high / proceed** (hash-pinned `0275b74c…`) → PK T3 gate approved → apply → proven.

## Standing
- Rollback (demotion) `193b5f97e18222146846a119048ba1d40daacbf6e364542a276e16ffbc322404` standing — byte-exact restore (verified read-only: restore JSON jsonb-equals the pre-promotion row) + pool 9→8 assertion; itself a reverse production change (PK-gated to use).
- Usage constraint stands: abstract market/data line-chart-on-grid, geography-neutral, text-clean (crop-proof passed).
- **PP background pool now 9 governed/active + 13 inactive candidates.** Market-data carry (the last of the 3 HOLD rows — balcony/coastal still HOLD) CLOSED end-to-end: re-source → intake → promotion → live selection witnessed.
- Register update (sync_state pointer + action_list marker, ~v5.18) = separate docs gate.
