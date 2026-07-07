# PP coastal_waterfront PROMOTION — RESULT (LIVE production change, applied + fully proven)

**APPLIED + VERIFIED** — 2026-07-06, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `e4830afaa5f1273abcf758a6688d75fbf229bfed760b04214f7810891a8d575b` (re-verified on disk pre-apply). One CAS-guarded UPDATE; all in-transaction assertions passed at COMMIT. **T3 · PRODUCT_PROOF · cc-0027.**

## v1 note
P2's "review once per shape" is intake-only; this production rotation change kept the **full T3 chain** (§2 non-negotiable). Nothing waived.

## Production state change (acknowledged at the T3 gate)
`bg_pp_coastal_waterfront` (`b3a20013…`, Whitehaven Beach QLD, platform_scope {facebook,instagram,linkedin}) promoted intake_candidate → **governed/active** (is_active=true · approved=true · production_use_allowed=true · governed · approved_by=PK · approved_at 2026-07-07T09:33:37.674826Z). **First coastal in the live pool.** **PP image_quote eligible pool: facebook 9→10 · linkedin 9→10 · instagram 8→9.**

## Pre-apply STOP-checks (passed)
Apply-hash == `e4830afa…` · row still fenced (`false/false/intake_candidate`) · pool still 9/9/9/8 immediately before apply.

## Live post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Row governed end-state | ✓ governed · approved_by=PK · approved_at 09:33:37Z |
| Eligible pool | ✓ **10 / fb 10 / li 10 / ig 9** · coastal confirmed in eligible set |
| Prior 9 governed | ✓ untouched |
| Unseeded winner | ✓ `bg_perth_cbd` unchanged (fb + ig) |
| **Witnessed selection** | ✓ 30 fb seed probes across all 10 pool members; **`bg_pp_coastal_waterfront` selected 3×** — live resolver rotates it in |

## Review chain (T3 full)
db-rls-auditor **PASS** zero-must-fix / zero-should-fix (pre-state 9/9/9/8 confirmed, CAS matches 1 row, 10/10/10/9 arithmetic verified, prior-9 exact, rollback jsonb-equal) → external review `790fec05-15f0-45dc-a124-5ee00d9f31e3` **AGREE / risk medium / confidence high / proceed** (hash-pinned `e4830afa…`) → PK T3 gate approved → apply → proven.

## Standing
- Rollback (demotion) `a9b892d639f10f6c92765cb2109d70e96ed078aec2ab60c830b8cb0c1138897b` standing — byte-exact restore (verified read-only: restore == current stored row AND == intake-inserted meta) + pool 10→9 assertion; a reverse production change (PK-gated to use).
- Label fence binding: AU coastal / Whitehaven QLD — never label Perth/WA.
- **PP background pool now 10 governed/active + 14 inactive candidates.** The pool's first coastal. (Sibling `bg_pp_city_skyline_vantage` remains fenced.)
- Register pointer (~v5.25) = separate docs gate.
