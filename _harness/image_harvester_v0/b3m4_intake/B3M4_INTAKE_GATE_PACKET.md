# PP B3M4 intake — PK apply-gate packet (T2 · SAFETY_GATE)

**Date:** 2026-07-06 · project mbkmaxqhsohbtwsqolns · **2 uploads + 2 INSERT-only double-fenced candidates.** NOT approval/promotion.
**Apply:** `b3m4_intake_apply.sql` sha256 `4772c0a57ae3d3f97d3b4c868dabdf15631786e07d6944017163b54cf195829c`
**Rollback:** `b3m4_intake_rollback.sql` sha256 `6056452c055aeec7fd93ef4b8595c70dfbfae25e5831151ce1f651c328ea5fdd`
**Manifest:** `upload_manifest.json` — 2 files staged byte-exact (hash+size verified).

## Assets (the two B3M4 ACCEPT_VISUAL_ONLY best-picks)
| Proposed key | id | source | dims/bytes | scope | scrim |
|---|---|---|---|---|---|
| **bg_pp_advisory_desk_flatlay** | b3a20009… | Pexels 11391944 (Towfiqu barbhuiya) | 6000×4000 / 2,948,464 | fb,ig,li | 0.55 |
| **bg_pp_contract_signing_closeup** | b3a20010… | Pexels 7431849 (Elisabeth Ende) | 3888×2592 / 277,280 | fb,ig,li | 0.60 |

Each row: is_active=false + approved=false + approval_status=intake_candidate + production_use_allowed=false, ACCEPT_VISUAL_ONLY, full Pexels provenance + sha256, label constraints embedded, `needs_scrim`. Scrim recorded as 0-1 fractions (consistent units — deliberately avoids the batch's unit-mix carry).

## PK decision embedded in the gate — advisory key choice
The advisory image is a **person-free reframe** of the workbook's `bg_pp_real_estate_agent_tablet` row (no agent, no model release). Proposed key = **`bg_pp_advisory_desk_flatlay`** (honest to content) — this leaves the literal `bg_pp_real_estate_agent_tablet` workbook slot **open** for a future release-safe/paid agent image. **Alternative:** key it `bg_pp_real_estate_agent_tablet` to fill that workbook row instead. Confirm the key at the gate (changes the asset_key + storage filename + hash → re-cut if changed). The contract key `bg_pp_contract_signing_closeup` matches its workbook row directly.

## Pool neutrality (Option D live)
Machine-asserted in-transaction: eligible pool must stay **fb 6 / li 6 / ig 5** and the 6 governed keys untouched, else full rollback. The 2 new rows are is_active=false → `resolve_slot_assets` rejects them on its first filter; `resolve_brand_assets` excludes them. Zero production effect.

## Pre-state verified live (2026-07-06)
PP total 38 · eligible pool 6 · 0 collisions on both keys (all 3 candidate key names) / sha256 / asset_ids / storage paths · storage targets absent (apply inert until PK-authorised upload).

## Safety
2 storage size prechecks (fail-closed pre-upload) · NOT-EXISTS dedup → idempotent · end-state asserts 2 fenced / 0 true-flag / pool 6/6/6/5 / governed 6. Rollback = guarded delete of the 2 unpromoted lane rows (refuses if any promoted; storage excluded).

## Apply sequence (on PK approval)
(1) upload 2 staged files `x-upsert:false`, (2) MANDATORY post-upload public-URL sha256 verification, (3) apply `4772c0a5…` verbatim, (4) read-only end-state + pool re-verification, (5) result doc.

## Review chain
db-rls-auditor → external review (hash-pinned) → **PK gate = advisory-key confirmation + upload authorisation + hash approval.** security-auditor not expected (no grants/policies/DEFINER/REST change).
