# Day-hero intake (gl7nkS_h4lo) — PK apply-gate packet

**Date:** 2026-07-05 · **Lane class:** PRODUCT_PROOF · **Tier:** T2 (dark/additive DB — the inserted row is double-fenced inactive; pool-neutrality machine-asserted) · **Project:** mbkmaxqhsohbtwsqolns
**Apply artifact:** `dayhero_apply.sql` — sha256 `96746e53f1d7baac03b38e956f9041d25bd43468c8fc5c1cd33cdf63bf2ab26c`
**Rollback:** `dayhero_rollback.sql` — sha256 `229553ec…` (promotion-guarded single-row DELETE; storage object excluded, separately gated)
**Upload manifest:** `upload_manifest.json` — 1 file, staged byte-exact (`upload_staging/bg_pp_perth_cbd_skyline_day_wide.jpg`, 2,386,153 bytes, sha256 `620c77b4…`)

## What this lane does
Brings the PK-accepted cc-0027 run-2 best-pick (Joshua Leong, Unsplash `gl7nkS_h4lo`, bright-day Perth CBD from Kings Park, 4000×2250) into governed inventory as an **inactive intake candidate** under the reserved key **`bg_pp_perth_cbd_skyline_day_wide`** — the key PK reserved on 2026-07-03 for a true bright-day hero, now filled per its purpose. Sequence at apply: (1) PK-authorised upload to `brand-assets/Property_Pulse/Backgrounds/` (`x-upsert:false`; target verified absent), (2) mandatory post-upload public-URL sha256 verification, (3) INSERT-only DML verbatim, (4) read-only end-state verification + result doc.

## The row (Batch-2 pattern)
Fixed asset_id `b2a10008-…b08` · `is_active=false` + `asset_meta.approved=false` + `approval_status='intake_candidate'` + `production_use_allowed=false` (double fence — both resolvers reject on first filter) · platform_scope `{facebook,linkedin}` (P0 skyline scoping; ⊂ PK universe) · full provenance (Unsplash licence + photographer + source/download URLs + sha256 + dims) · reviewer verdict PASS_WITH_NOTE verbatim (cranes + small rooftop corporate logos = accepted trade-off) + PK acceptance record · suggested scrim 0.48 (Lane-3 calibrated default) · `needs_scrim`.

## Option-D safety (the material context change since Batch 2)
The resolver pool now drives **live PP image_quote production** (v4.95). This lane is pool-neutral by construction and the DML **machine-asserts it**: end-state requires the eligible background pool to remain **exactly 5** and the 5 governed background keys untouched, else full rollback. The row's `pk_decision` and `notes` both carry an explicit **promotion warning**: promoting this asset later is a production-behaviour change and its own PK gate (and per the Lane-4 coupling rule, promotion changes rotation composition the moment it lands).

## Pre-state verified live (2026-07-05)
Zero collisions: key / sha256 / asset_id / storage path all absent. Eligible pool = 5. PP total = 29 (concurrent logo-intake lane's candidates included — end-state assertions deliberately scope to this lane's marker + pool + governed set rather than a brittle total count; divergence from Batch-2's total-count pattern is intentional and noted for the auditor).

## Safety design
Storage size precheck (fails closed pre-upload) · NOT-EXISTS dedup on (client, key) · end-state: exactly 1 candidate row in full fenced state + pool==5 + governed set==5 · idempotent re-run (0 rows inserted, assertions hold) · rollback deletes only the unpromoted row and refuses otherwise.

## Review chain
db-rls-auditor → external review (hash-pinned `96746e53…`) → **PK gate: upload authorisation + key confirmation + hash approval** (three decisions, one sitting — Batch-2 precedent). security-auditor not required (no grants/policies/DEFINER/REST surface) — pending auditor confirmation.
