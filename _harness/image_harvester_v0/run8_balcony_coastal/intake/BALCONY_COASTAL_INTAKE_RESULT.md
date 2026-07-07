CLAIMED v5.24 · pp-bg-balcony-coastal-intake · shared-main-docs · register-commit-gate · 2026-07-06T23:55Z
# PP balcony/coastal batch INTAKE — RESULT (applied + verified)

**APPLIED + VERIFIED** — 2026-07-06, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `f407c095559da2ff8dd7da8d69339da6834091c1dac9a4ea8edb5d2a6f64c4f1` (re-verified on disk pre-apply). 2 INSERT-only fenced candidates; all in-transaction assertions passed at COMMIT. **T2 · SAFETY_GATE · cc-0027 · FIRST lane under Image Workflow Acceleration v1.**

## v1 conventions exercised (first real use)
- **P1 batch-first:** both accepted rows intaken in one gate.
- **P2 tier-right-sized review:** mechanical 10-check same-shape gate **PASSED** vs the proven market-data/v5.12 template (verified programmatically incl. comment-stripped DDL/GRANT/upsert checks → **SAME SHAPE**) → the full `db-rls-auditor`+external chain rode the proven shape and was **not re-run**. Time saved vs a per-asset full chain (~28-min auditor + external ×2). Per-apply guards were NOT waived.
- **P4 one register pointer:** the batch gets a single register pointer (v5.24, pending docs gate).

## Per-apply guards (all ran)
Orchestrator byte-verify (both finals == manifest sha256, byte-identical to source, all 8 candidates unique) · image-reviewer REVIEW_COMPLETE/clean (both best-picks person-free, no legible signage/watermark/rego/boat-name, clean negative space) · orchestrator crop-proof 1:1/1080/0.56 PASS (headline crisp, zero legible text) · upload public-URL sha256 verify · in-txn fail-closed pool-neutrality assertion · pre-apply STOP-check.

## What landed (fenced, double-locked)
| asset_id | key | source | sha256 | dims | geography fence |
|---|---|---|---|---|---|
| b3a20012… | `bg_pp_city_skyline_vantage` | Pexels 97906 (Kaique Rocha) | `2ef9d39b…` | 4000×2667 | **GENERIC non-AU (São Paulo)** — never label AU/Perth/WA |
| b3a20013… | `bg_pp_coastal_waterfront` | Pexels 33698814 (Paul Pulimoottil) | `b164c47a…` | 4000×2666 | **AU (Whitehaven QLD)** — label AU coastal only, never Perth/WA |

Both: `is_active=false` · `approved=false` · `production_use_allowed=false` · `intake_candidate` · platform_scope {fb,ig,li} · scrim 1:1/1080/0.56.

## Post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Both rows fenced end-state | ✓ is_active/approved/prod=false · intake_candidate · geo tags correct |
| Eligible pool | ✓ **9/9/9/8 UNCHANGED** — no rotation change |
| Storage public-URL sha256 | ✓ both == approved |

## Harvest context (the two HOLDs)
Standing HOLD structurally confirmed: no verifiable Perth/WA skyline OR coastal exists licence-safe on free stock. **P5 rejected at discovery:** Sydney (readable JPMorgan/CyberCX + Sydney Tower), Brisbane (CityCat + passengers), Gold Coast (crowd + sub-2400), Whitsundays alt (crowd). PK accepted the generic São Paulo skyline (generic-only) and the verifiable AU Whitehaven coastal (fills the pool's coastal gap).

## Standing
- Rollback `97b801e4f167d6e424bc7bfcba269b180ab192c9ec48f5a1ebe27f7ca4e216d3` standing — guarded delete of the 2 unpromoted lane rows; storage objects excluded.
- **NOT approved / NOT promoted / NOT production-safe.** Promotion (if ever) = separate later PK gate.
- **PP background pool now 9 governed/active + 15 inactive candidates** (13 prior + these 2).
- Register pointer (~v5.24) = separate docs gate. Package: `_harness/image_harvester_v0/run8_balcony_coastal/`.
