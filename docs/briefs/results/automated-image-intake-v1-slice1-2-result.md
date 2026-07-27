# Result — Automated Image Intake v1: Slices 1–3a (reject store · shortage detector · dedup filter) + runbook

**Date:** 2026-07-27 · **Lane:** PRODUCT_PROOF · **Tier:** T2 · **Brief:** `docs/briefs/automated-image-intake-v1.md` (Gate-1 approved 2026-07-27, PK)
**Status:** Slices 1, 2, 3a APPLIED + verified live; orchestration runbook authored. Slice 3 PROOF RUN (live harvest + fenced intake) NOT yet run (next step). Runbook: `docs/briefs/automated-image-intake-v1-runbook.md`.
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

### Slice 3a — `m.filter_new_candidates(jsonb)` (migration `automated_image_intake_v1_slice3_filter_new_candidates`)
- Read-only dedup filter, **SECURITY INVOKER**, search_path-pinned, `service_role` EXECUTE only, NO new grant (service_role already reads c.shared_creative_asset + m.rejected_asset_fingerprint).
- Given harvested candidate fingerprints (provider, provider_asset_id, sha256, source_url), returns per-candidate `is_new` + `exclusion_reason`, matching the shared pool (`c.shared_creative_asset` sha256/source_url) and the reject store (`m.rejected_asset_fingerprint` sha256 / (provider,provider_asset_id) / source_url). This is the S6 stage — where Slice-1's reject store gates the flow. v1 does not dedup against `c.client_brand_asset` (documented limitation).
- Chain: db-rls-auditor **clean/pass** (INVOKER correct, injection-safe, no new advisor, apply/rollback identity) · external review **agree/proceed** (first fully-clean external verdict in the lane) · logic dry-run-validated for ALL paths (pool sha256/source_url + all 3 reject paths + new; reject paths via rolled-back INSERT). Packet sha256 `96695a54…`; rollback `DROP FUNCTION`.
- Verified live as service_role: existing-pool candidate → `dup_pool_sha256`; new candidate → `is_new`.

### Orchestration runbook (Slice 3 spec)
`docs/briefs/automated-image-intake-v1-runbook.md` — the S1–S8 procedure (detect → manifest → harvest → review → crop-proof → dedup → fenced intake → PK shortlist), §2 guardrails verbatim, STOP-at-PK-gate / zero-auto-promotion invariant. Deterministic spine (S1 detector + S6 dedup) is APPLIED; S2/S7/S8 are orchestration templates exercised by the proof run; S3/S4/S5 reuse the proven image agents + crop-proof recipe.

## Verification
- Slice 1 live: RLS forced, grants = service_role + inspector_ro; anon/authenticated SELECT = false; 4 indexes present.
- Slice 2 live: `prosecdef=false` (INVOKER), search_path pinned, EXECUTE service_role-only, `service_role` can read the schedule; shortage detection demonstrated as the real principal.

## Carries / next
- **Slice 3 PROOF RUN (next step):** execute the runbook S2–S8 live for Invegent + CFW against a seeded-real shortage (floor 6): `image-harvester` → `image-reviewer` → crop-proof → `m.filter_new_candidates` dedup → fenced INSERT (S7, PK-gated T3 intake per §2) → PK shortlist. Deterministic spine (S1 + S6) already applied; proof exercises S2/S7/S8 + the agents. Zero production promotion — STOP at the PK visual gate.
- Migration `apply_migration` mints its own ledger version — repo/harness `.sql` filenames diverge from the ledger names (standing gotcha); `_harness/img_intake_v1_20260727/` packets remain local.
