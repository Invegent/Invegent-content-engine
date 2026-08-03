# Apply packet — P2 shared-template edit-window containment (Lane A, WS-5)

**Created:** 2026-08-03 Sydney · **Author:** chat (orchestrator) · **Status:** DRAFT — awaiting chain + PK apply gate
**Lane:** `ws5-production-envelope-enforcement-foundation` (Gate-1 approved; P1 merged/deployed/verified 2026-08-03)
**Authorizing ruling:** PK P1-v2 gate approval, execution condition 2 — "temporarily contain PP generation/render against the shared template" before the Creatomate editor sitting; restore PP only after the mandatory PP non-regression render PASSES.
**Tier:** T3 (production DML on `c.creative_template_client_assignment`) · one row · CAS-guarded · rollback validated pre-apply.

## Live facts this packet rests on (verified 2026-08-03, re-verify at apply)

1. Template `a3d8472d-9438-4312-9f11-b6a920be4014` (`video_stat_reveal_9x16_v2`, provider `c11bb8ab-…`) has EXACTLY two client assignments:
   - `aa2179eb-800e-4d0f-a323-925705942b73` (NDIS) — already `blocked` (CGU containment; DO NOT TOUCH — its restore is P5, PK-gated).
   - `1ee1a547-08b8-4ce8-8045-d545be16c699` (PP) — `visually_approved`, `approved_by='PK'`, `approved_at='2026-07-19 01:08:00.4319+00'` (THIS packet's single target).
2. PP's CURRENT `select_template('property-pulse', NULL,'video_short_stat')` winner is `dd5fd75e-982d-4c3d-89cd-7ce0936076b2` (`AU_generic_national_Suburb_9:16_V1`, assignment `2e81c7c7-…`) — the shared template appears ONLY in `alternatives[]`. Blocking the PP assignment on the shared template removes it from PP's candidate set WITHOUT changing PP's winner.
3. Zero renderable stat drafts in flight: the only `video_status='pending'` stat drafts are 2 NDIS drafts with `approval_status='rejected'`; `public.claim_pending_video_drafts` claims only `approval_status IN ('approved','published')` — unclaimable. (One of them is preserved evidence `d6c7e3e3-…` — untouched by this packet.)
4. Post-apply, the shared template is unselectable by EVERY client (both of its assignments `blocked`) → no governed render can bind it during the edit window. Out-of-band probe renders (direct Creatomate API by provider_template_id) are unaffected by design — that is the calibration path.

## Forward apply (ONE `execute_sql` call — single-statement atomic UPDATE, CAS-guarded)

```sql
WITH updated AS (
  UPDATE c.creative_template_client_assignment
     SET assignment_status = 'blocked',
         updated_at = now()
   WHERE id = '1ee1a547-08b8-4ce8-8045-d545be16c699'
     AND template_id = 'a3d8472d-9438-4312-9f11-b6a920be4014'
     AND assignment_status = 'visually_approved'   -- CAS: fail-closed if state moved
   RETURNING id, assignment_status, approved_by, approved_at
)
SELECT count(*) AS rows_updated, min(approved_by) AS approved_by_preserved,
       min(approved_at::text) AS approved_at_preserved
  FROM updated;
```

**Executable STOP semantics:** the CAS predicate makes a moved/missing row update 0 rows — the channel is a single atomic UPDATE statement (MCP `execute_sql`, one call, auto-commit of that single statement; nothing multi-statement to compose). `rows_updated <> 1` in the returned row = the operator STOP signal: state moved, do NOT retry, re-read and surface to PK. `approved_by`/`approved_at` are not in the SET list — preserved by construction and echoed back for the record.

## Rollback (validated against the captured pre-image BEFORE apply; PK-run after PP non-regression PASS)

```sql
WITH restored AS (
  UPDATE c.creative_template_client_assignment
     SET assignment_status = 'visually_approved',
         updated_at = now()
   WHERE id = '1ee1a547-08b8-4ce8-8045-d545be16c699'
     AND template_id = 'a3d8472d-9438-4312-9f11-b6a920be4014'
     AND assignment_status = 'blocked'             -- CAS
   RETURNING id, assignment_status, approved_by, approved_at
)
SELECT count(*) AS rows_restored FROM restored;
```

Byte-exact reverse of the forward change (only `assignment_status` flips back; `updated_at` advances — the table has no other mutated column; `approved_by/approved_at` untouched in both directions). Pre-image to capture immediately before apply:
`SELECT id, template_id, client_id, assignment_status, approved_by, approved_at, updated_at FROM c.creative_template_client_assignment WHERE id='1ee1a547-08b8-4ce8-8045-d545be16c699';`

## Post-apply verification (all read-only, run immediately)

1. `select_template('property-pulse', NULL, 'video_short_stat')` → `status='ok'`, `selected.template_id = 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2'` (WINNER UNCHANGED — any other value = STOP + immediate rollback consideration), and `a3d8472d-…` ABSENT from `alternatives[]` (present in `rejected[]` with `assignment_blocked`).
2. `select_template('ndis-yarns','youtube','video_short_stat')` → still `fail_closed` (unchanged).
3. Assignment row re-read: `assignment_status='blocked'`, `approved_by='PK'`, `approved_at='2026-07-19 01:08:00.4319+00'` intact.
4. Re-confirm zero claimable stat drafts (the §Live-facts-3 query).

## Restore condition (NOT part of this apply)

PP assignment restore = the rollback SQL above, run ONLY after: template edited + re-captured + the mandatory controlled PP non-regression render (MARKET UPDATE preserved) receives PK PASS. Post-restore verification: PP winner still `dd5fd75e-…`; shared template back in `alternatives[]`. Any PP winner change, routing change, or visual regression at any point = hard STOP (PK D-3).

## Guards / non-actions

- Touches EXACTLY one row by primary key; no DDL, no GRANT/REVOKE, no other table.
- NDIS assignment `aa2179eb-…` and all preserved CGU evidence untouched.
- No register version cut (Convention 1 pointer at lane end).
- Not run until: db-rls-auditor pass · apply-harness-auditor shadow read · external review pinned to this packet's hash · explicit PK apply instruction.
