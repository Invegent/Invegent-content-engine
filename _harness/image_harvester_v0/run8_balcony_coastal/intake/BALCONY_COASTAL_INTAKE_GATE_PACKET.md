# PP balcony/coastal — batch INTAKE gate packet (2 assets, fenced)

**Lane:** `pp-bg-balcony-coastal-intake (2026-07-06)` · **Tier T2 · SAFETY_GATE** · cc-0027 · **FIRST lane under Image Workflow Acceleration v1.**
**apply hash:** `f407c095559da2ff8dd7da8d69339da6834091c1dac9a4ea8edb5d2a6f64c4f1` (`run8_intake_apply.sql`, 10838 bytes)
**rollback hash:** `97b801e4f167d6e424bc7bfcba269b180ab192c9ec48f5a1ebe27f7ca4e216d3` (`run8_intake_rollback.sql`, 751 bytes)

## v1 conventions exercised
- **P1 (batch-first):** both accepted rows intaken in one gate.
- **P2 (tier-right-sized review):** the **mechanical 10-check same-shape gate PASSED** vs the proven market-data/v5.12 fenced-intake template — same table · `asset_type='other'` · identical written-column set · four fences present-and-false · same eligibility-relevant `asset_meta` key set (usage·bucket·license/license_type·safe_for_text_overlay·sha256·asset_key) · no new eligibility keys · bucket=brand-assets · no DDL · no GRANT/REVOKE · no ON CONFLICT (verified on comment-stripped SQL: 2 INSERTs, 2 WHERE-NOT-EXISTS, 0 UPDATE/DELETE). **VERDICT: SAME SHAPE** → the full `db-rls-auditor`+external chain rides the proven shape (last run at v5.17); it is NOT re-run for these conforming fenced inserts.
- **P4 (one register pointer):** the batch gets a single register pointer after apply.

## Per-apply guards (NEVER waived — run regardless of shape)
- Orchestrator byte-verify: both finals match their manifest sha256; finals byte-identical to source; all 8 candidates unique (done).
- image-reviewer REVIEW_COMPLETE/clean; both best-picks pixel-clean (person-free, no legible signage/watermark/rego/boat-name, clean negative space); my crop-proof at 1:1/1080/0.56 passed.
- Upload public-URL sha256 verify (post-upload) · in-txn fail-closed pool-neutrality assertion · branch-warden (at the register step).

## What applies (fenced, double-locked)
| asset_id | key | source | sha256 | dims / bytes |
|---|---|---|---|---|
| b3a20012… | `bg_pp_city_skyline_vantage` | Pexels 97906 (Kaique Rocha) | `2ef9d39b…` | 4000×2667 / 1254714 |
| b3a20013… | `bg_pp_coastal_waterfront` | Pexels 33698814 (Paul Pulimoottil) | `b164c47a…` | 4000×2666 / 1613937 |

Both: `is_active=false` · `approved=false` · `production_use_allowed=false` · `intake_candidate` · platform_scope {fb,ig,li} · scrim spec 1:1/1080/0.56.
**Geography/label constraints embedded in asset_meta:**
- skyline = **GENERIC non-Australian (São Paulo)** — usable generic-only, NEVER label AU/Perth/WA.
- coastal = **verifiable AU (Whitehaven Beach, Whitsundays QLD)** — label AU coastal ONLY, NEVER Perth/WA.

## Pool-neutrality (machine-asserted, in-txn, fail-closed → rollback)
Storage size precheck per row · post-insert: exactly 2 fenced rows with the fence-set · **eligible pool UNCHANGED at all=9 / fb=9 / li=9 / ig=8** (current, verified read-only). `is_active=false` ⇒ resolver rejects at first filter ⇒ zero rotation change.

## Not in scope
No approval, no promotion, no flag flip, no rotation change. Promotion (if ever) = separate later PK gate.

## Sequence (your hash/upload gate)
Approve → upload 2 files → mandatory public-URL sha256 verify → apply `f407c095…` → post-apply verify (2 fenced, pool 9/9/9/8) → register pointer (P4).
**STOPs:** apply-hash ≠ `f407c095…` · storage precheck fail · pool ≠ 9/9/9/8 · any assertion trip. Rollback `97b801e4…` standing.
