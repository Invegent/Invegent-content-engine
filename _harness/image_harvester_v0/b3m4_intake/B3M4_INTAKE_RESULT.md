CLAIMED v5.14 · pp-bg-b3m4-intake · shared-main-docs · register-commit-gate · 2026-07-06T09:15Z
# PP B3M4 intake — RESULT (APPLIED + VERIFIED)

**Date:** 2026-07-06 · **T2 · SAFETY_GATE** · project mbkmaxqhsohbtwsqolns · applied as postgres on PK hash approval (key `bg_pp_advisory_desk_flatlay` confirmed).
**Artifact:** `b3m4_intake_apply.sql` sha256 `4772c0a57ae3d3f97d3b4c868dabdf15631786e07d6944017163b54cf195829c` — re-verified pre-apply; executed verbatim.

## Sequence
1. Artifact hash + 2/2 staged files hash+size verified. 2. Uploads → `brand-assets/Property_Pulse/Backgrounds/` (`x-upsert:false`, 200). 3. Post-upload public-URL sha256: 2/2 exact. 4. Apply committed — all in-txn assertions passed.

## Post-apply verification (independent, read-only — ALL PASS)
- **2 new rows, both double-fenced** (is_active=false · approved=false · intake_candidate · production_use_allowed=false · ACCEPT_VISUAL_ONLY). Keys/sha verified: `bg_pp_advisory_desk_flatlay`=`97e00405…`, `bg_pp_contract_signing_closeup`=`ff4d3682…`. Ids b3a20009 / b3a20010.
- **Production untouched:** `resolve_brand_assets` 0 hits; `resolve_slot_assets` (live market_insight/facebook) winner still `bg_perth_cbd`, both new rows rejected `inactive`; eligible pool still **6** (fb 6 / li 6 / ig 5). PP total 38 → **40**.
- Label constraints embedded (advisory = person-free reframe, never location-specific, key note; contract = pen-on-blank, no legible content).

## Review chain
db-rls-auditor PASS zero-must-fix (pool-neutrality proven from live fn body; 3 low advisory notes) → external review PARTIAL/ESCALATE `511ae9a8…` (generic production-DML escalation, no concrete defect — same reflex as the v5.12 batch review `fe9d7372`; pushback machine-enforced by the in-txn asserts) → PK key+hash approval → applied → verified.

## Standing
- Rollback `6056452c…` (guarded delete of the 2 unpromoted lane rows; storage excluded).
- **Key note:** advisory keyed `bg_pp_advisory_desk_flatlay` per PK — the workbook `bg_pp_real_estate_agent_tablet` slot stays OPEN for a future release-safe/paid agent image.
- Boundaries held: no approval/promotion/production_use_allowed/render/publish/pool-change.

**PP background inventory now:** 6 governed/active (production pool) + **15 inactive intake candidates** (5 P0 batch-2 + 8 B3 batch + 2 B3M4). The whole free-stock B3/P1 harvest program is intaken. Promotion of any candidate = its own PK gate + a live Option-D rotation change. Packet commit/push + register entry = separate PK gate.
