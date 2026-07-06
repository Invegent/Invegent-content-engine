CLAIMED v5.17 · pp-bg-mktdata-intake · shared-main-docs · register-commit-gate · 2026-07-06T12:20Z
# PP market-data INTAKE — RESULT (applied + verified)

**APPLIED + VERIFIED** — 2026-07-06, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `9fc52c38c3db88a7a79f825a7d88035da218d7ba2dd9fe204f830b0a7da59c4c` (re-verified on disk pre-apply). One fenced INSERT; all in-transaction assertions passed at COMMIT. **T2 · SAFETY_GATE · cc-0027.**

## Scope correction (recorded)
PK directive named a 9-asset batch; live DB proved that roster stale — 8 of 9 already present (7 fenced from v5.12 + `bg_pp_kitchen_living_open_plan` governed/active from v5.16). **Only `bg_pp_market_data_chart_grid` was absent.** This lane intook that ONE asset. Surfaced to PK before build; no re-intake of existing rows.

## What landed
- **Storage:** `brand-assets/Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg` — Pexels 6203470 (cottonbro), sha `d3cb9b1c305d207bde49c3a114b51fa33b5693dd0fed9c5f73ec94addaf517b0`, 1,147,375 bytes, 2400×3600. Uploaded x-upsert:false (200), public-URL sha256 verified == approved.
- **Row `b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11`** (PP): double-fenced — `is_active=false` · `asset_meta.approved=false` · `asset_meta.production_use_allowed=false` · `approval_status=intake_candidate`. asset_type='other'. platform_scope {facebook,instagram,linkedin}.
- **asset_meta provenance (PK-required, all present):** source Pexels 6203470 · `visual_review_verdict=ACCEPT_VISUAL_ONLY` · zero-legible-text crop proof PASSED · scrim proof `1:1, 1080, 0.56` · AI-diffusion exclusion CLEARED (real photo-of-screen).

## Post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Fenced row end-state | ✓ is_active=false / approved=false / production_use_allowed=false / intake_candidate / sha d3cb9b1c… |
| Eligible rotation pool | ✓ **8/8/8/7 UNCHANGED** (independent read-only recompute) — no production rotation change |
| Storage public-URL sha256 | ✓ == approved d3cb9b1c… |

## Review chain
db-rls-auditor **PASS** zero-must-fix (two non-blocking should_fix: run as postgres runner; idempotency via WHERE-NOT-EXISTS not a DB unique constraint) → external review `5bbe0efe-8402-48f7-883b-9c4d102ad6fa` **AGREE / risk low / confidence high / proceed** (hash-pinned `9fc52c38…`; first fenced-intake to pass cleanly — explicit INSERT-only framing landed) → PK hash/upload gate approved → upload → apply → proven.

## Standing
- Rollback `9eb0b2488f581794e402da6dcc77116f3d9e09891f4f2ea567585e34777ef1aa` standing — guarded single-row DELETE (refuses if promoted), storage object excluded.
- **NOT approved / NOT promoted / NOT production-safe / NOT eligible for live rotation.** Promotion = separate later PK gate (Option-D resolver pool is production-live).
- **PP background candidates now 14 inactive** (13 prior + market-data); pool remains 8 governed/active.
- Register update (sync_state pointer + action_list marker) = separate docs gate.
