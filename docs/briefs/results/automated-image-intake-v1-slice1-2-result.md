# Result — Automated Image Intake v1: Slice 1 (reject store) + Slice 2 (shortage detector)

**Date:** 2026-07-27 · **Lane:** PRODUCT_PROOF · **Tier:** T2 · **Brief:** `docs/briefs/automated-image-intake-v1.md` (Gate-1 approved 2026-07-27, PK)
**Status:** Slice 1 + Slice 2 APPLIED + verified live. Slice 3 (orchestration) NOT built (next outcome).
**Canonical ID:** `cc-NNNN` (central registrar to assign; not invented here).

## Outcome
Two foundational DB objects for the automated background-intake pipeline are live, each through the full T2 chain and a PK apply gate. Both are additive/dark; neither promotes or renders anything.

### Slice 1 — `m.rejected_asset_fingerprint` (migration `automated_image_intake_v1_slice1_rejected_fingerprint`, ledger `20260727012219`)
- Reject dedup store so the pipeline never re-offers a PK-rejected background. Schema `m` (not REST-exposed). RLS **enabled + forced**, `service_role`-only, anon/authenticated zero access.
- **Composite key** (Gate-1 correction 1): partial UNIQUE `(provider, provider_asset_id)` + partial UNIQUE `sha256` + md5-hashed `source_url` index — catches the same provider image at a different size/filename, not just exact bytes. pHash deferred to v2. v1 rejects are GLOBAL (`client_scope` informational).
- Chain: db-rls-auditor concerns→2 fixes applied (idempotency UNIQUEs, md5 index)→clean; external review partial/no-defect; packet sha256 `9ee262a7…`→revised `5eda2f41…`; rollback `DROP TABLE`.

### Slice 2 — `m.detect_background_shortage(int, text[], int, text)` (migration `automated_image_intake_v1_slice2_shortage_detector`)
- Read-only shortage detector, **SECURITY INVOKER**, search_path-pinned, `service_role` EXECUTE only.
- **Supply** = distinct backgrounds from a `public.select_template` seed sweep (rotation depth) — the drift-free measure, since existing `analyze_asset_gap`/`probe_asset_inventory` only catch hard fail-closed, NOT thin-but-nonzero pools. **Demand** = enabled `c.client_publish_schedule` rows. **Shortage** = supply < floor (default 4). Shortages ranked by demand. `category_spread` surfaces shared-pool `subject_tags` diversity so a satisfied count can't mask a monotonous pool (Gate-1 correction 2).
- **MF-1 (db-rls-auditor BLOCK):** under INVOKER the demand CTE reads `c.client_publish_schedule` as `service_role`, which lacked SELECT → 42501. The inline dry-run masked it by running as postgres. **PK ruling:** keep INVOKER + `GRANT SELECT ON c.client_publish_schedule TO service_role` (auditor-preferred, least-privilege, no new security_definer advisory). Re-audit PASS.
- Chain: db-rls-auditor BLOCK→fix→re-audit PASS; external review partial/no-defect; packet sha256 `8d32b763…`; rollback `DROP FUNCTION` + `REVOKE SELECT`.
- **Runtime proof (as `service_role` via `SET LOCAL ROLE`):** no 42501; at floor 6, Invegent + CFW correctly flagged (supply 4, shortfall 2, priority 1), PP/NDIS (15-17) excluded.

## Verification
- Slice 1 live: RLS forced, grants = service_role + inspector_ro; anon/authenticated SELECT = false; 4 indexes present.
- Slice 2 live: `prosecdef=false` (INVOKER), search_path pinned, EXECUTE service_role-only, `service_role` can read the schedule; shortage detection demonstrated as the real principal.

## Carries / next
- **Slice 3 (next outcome):** orchestration runbook — detector → auto-manifest → `image-harvester` → `image-reviewer` → crop-proof → dedup (vs pool + `m.rejected_asset_fingerprint`) → fenced INSERT → PK shortlist, **STOP at the PK visual gate, zero auto-promotion**. Proof: shortage → candidates → rejected fingerprints excluded → PK shortlist, no production promotion. Detector already emits the shortage input; proof drives a seeded-real shortage (raised floor) since the pool sits at 4 post-cc-0073.
- Migration `apply_migration` mints its own ledger version — repo/harness `.sql` filenames diverge from the ledger names (standing gotcha); `_harness/img_intake_v1_20260727/` packets remain local.
