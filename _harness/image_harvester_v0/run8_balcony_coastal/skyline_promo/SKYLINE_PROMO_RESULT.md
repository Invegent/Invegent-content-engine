# PP city_skyline_vantage PROMOTION — RESULT (LIVE production change, applied + fully proven)

**APPLIED + VERIFIED** — 2026-07-06, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `f0150f365180de084f2f0a7f37abcc3fb89e775e641e3055028ea1dc7d9eacf3` (re-verified on disk pre-apply). One CAS-guarded UPDATE; all in-transaction assertions passed at COMMIT. **T3 · PRODUCT_PROOF · cc-0027.**

## Recorded product judgment
GENERIC non-Australian (São Paulo) skyline; the pool already carries real Perth/Brisbane/Sydney skylines. Orchestrator flagged weak-fit/redundancy at the visual gate and again at the T3 gate; PK elected to promote. Geography fence (`geography=generic_non_au`, label_constraint: never label AU/Perth/WA) preserved and binding.

## Production state change (acknowledged at the T3 gate)
`bg_pp_city_skyline_vantage` (`b3a20012…`, platform_scope {facebook,instagram,linkedin}) promoted intake_candidate → **governed/active** (is_active=true · approved=true · production_use_allowed=true · governed · approved_by=PK · approved_at 2026-07-07T09:55:17.094366Z). **PP image_quote eligible pool: facebook 10→11 · linkedin 10→11 · instagram 9→10.**

## Pre-apply STOP-checks (passed)
Apply-hash == `f0150f36…` · row still fenced (`false/false/intake_candidate`) · pool still 10/10/10/9.

## Live post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Row governed end-state | ✓ governed · approved_by=PK · approved_at 09:55:17Z |
| Eligible pool | ✓ **11 / fb 11 / li 11 / ig 10** · skyline confirmed in eligible set |
| Prior 10 governed | ✓ untouched |
| Unseeded winner | ✓ `bg_perth_cbd` unchanged (fb + ig) |
| **Witnessed selection** | ✓ 33 fb seed probes across all 11 pool members; **`bg_pp_city_skyline_vantage` selected 4×** — live resolver rotates it in |

## Review chain (T3 full)
db-rls-auditor **PASS** zero-must-fix (all 7 checks green; pre-state 10/10/10/9, CAS 1 row, 11/11/11/10 simulated, prior-10 exact, rollback jsonb-equal) → external review `09a86df7-e19e-462a-a02a-7a140accebe4` **AGREE / risk medium / confidence high / proceed** (hash-pinned `f0150f36…`) → PK T3 gate approved → apply → proven.

## Standing
- Rollback (demotion) `fde57bd18c7ff15867d77173cae606475afb4ae564d4259bc704e973c52b9072` standing — byte-exact restore (verified read-only: restore == current stored row AND == intake-inserted meta) + pool 11→10 assertion; a reverse production change (PK-gated to use).
- Geography fence binding: generic-only, never label AU/Perth/WA.
- **PP background pool now 11 governed/active + 13 inactive candidates.** Both run8 assets (coastal + skyline) are live.
- Register pointer (~v5.26) = separate docs gate; will be **local-commit-only, push held** behind the R4 boundary until the cc-0028 commit (`4e81263`) is pushed by its own lane.
