# Apply packet — P2 shared-template edit-window containment (Lane A, WS-5) — v2

**Created:** 2026-08-03 Sydney · **Author:** chat (orchestrator) · **Status:** v2 — chain-amended, awaiting PK apply gate
**v2 delta (executable SQL UNCHANGED from v1 `303951c8…`):** addresses AHA shadow findings AHA-01-1/AHA-03-1/AHA-06-1 (mechanical rollback-validation stanza · mandatory read-back runbook rule · materialized claimable-drafts SQL) + db-rls-auditor should-fix (zero-claimable basis includes the `recommended_format` filter; the one approved+pending draft is image_quote, outside the claim list) + its two open questions (updated_at non-restoration acknowledged benign — selector ranks by registry order, nothing reads assignment updated_at; edit-window ownership of row `1ee1a547-…` is EXCLUSIVE to this lane until restore).
**Chain on v1 (`303951c8d4cb7f1c779b76f17e241b7e472ea1fd32e7c15cd87b1d498901617b`):** db-rls-auditor `clean/pass` (high confidence, zero must-fix, all live facts confirmed incl. `'blocked'` in the CHECK list, zero triggers, exact-inverse rollback, selector `assignment_blocked` branch) · AHA shadow `CONCERNS` (3 low, all addressed here) · external review `e9a5e0a8` partial/medium (no concrete defect; escalates to the PK gate this packet already requires).
**Lane:** `ws5-production-envelope-enforcement-foundation` (Gate-1 approved; P1 merged/deployed/verified 2026-08-03)
**Authorizing ruling:** PK P1-v2 gate approval, execution condition 2 — "temporarily contain PP generation/render against the shared template" before the Creatomate editor sitting; restore PP only after the mandatory PP non-regression render PASSES.
**Tier:** T3 (production DML on `c.creative_template_client_assignment`) · one row · CAS-guarded · rollback validated pre-apply.

## Live facts this packet rests on (verified 2026-08-03, re-verify at apply)

1. Template `a3d8472d-9438-4312-9f11-b6a920be4014` (`video_stat_reveal_9x16_v2`, provider `c11bb8ab-…`) has EXACTLY two client assignments:
   - `aa2179eb-800e-4d0f-a323-925705942b73` (NDIS) — already `blocked` (CGU containment; DO NOT TOUCH — its restore is P5, PK-gated).
   - `1ee1a547-08b8-4ce8-8045-d545be16c699` (PP) — `visually_approved`, `approved_by='PK'`, `approved_at='2026-07-19 01:08:00.4319+00'` (THIS packet's single target).
2. PP's CURRENT `select_template('property-pulse', NULL,'video_short_stat')` winner is `dd5fd75e-982d-4c3d-89cd-7ce0936076b2` (`AU_generic_national_Suburb_9:16_V1`, assignment `2e81c7c7-…`) — the shared template appears ONLY in `alternatives[]`. Blocking the PP assignment on the shared template removes it from PP's candidate set WITHOUT changing PP's winner.
3. Zero CLAIMABLE video drafts in flight (db-rls-auditor confirmed, stronger than v1's wording). Basis = BOTH claim-RPC filters: `approval_status IN ('approved','published')` AND `recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')`. The 2 pending stat-family drafts are NDIS `approval_status='rejected'` (one is preserved evidence `d6c7e3e3-…` — untouched); the single approved+pending draft (PP `41c9d11c-…`) is `recommended_format='image_quote'`, outside the claim list. **The canonical claimable-drafts check (AHA-06-1) — run this EXACT SQL pre-apply and as post-apply check 4:**

```sql
SELECT count(*) AS claimable
FROM m.post_draft c
WHERE c.approval_status IN ('approved','published')
  AND c.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')
  AND ( c.video_status = 'pending'
     OR ( c.video_status = 'rendering'
          AND (c.draft_format->>'render_claim_at') IS NOT NULL
          AND (c.draft_format->>'render_claim_at')::timestamptz < now() - interval '15 minutes' ) );
-- PASS criterion: claimable = 0 (mirrors public.claim_pending_video_drafts' selection predicate verbatim)
```
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

**Mandatory read-back rule (AHA-03-1):** the apply is NOT COMPLETE until the returned row is read and recorded in the lane record showing `rows_updated = 1` AND `approved_by_preserved = 'PK'` AND `approved_at_preserved = '2026-07-19 01:08:00.4319+00'`. A 0-row return means containment is NOT in place (the shared template is still PP-selectable) — treat as tripped STOP even though no data changed. Post-apply check 1 (shared template in `rejected[]` with `assignment_blocked`) doubles as the detection net for a missed 0-row outcome.

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

**Mechanical rollback-validation stanza (AHA-01-1) — the declared "validated BEFORE apply" control, made executable.** The rollback cannot be dry-run pre-apply (its CAS matches 0 rows until the forward apply lands), so validation is this STATIC comparison, run and recorded in the lane record BEFORE the forward apply. PASS requires ALL of:
1. Captured pre-image `assignment_status = 'visually_approved'` (the exact literal the rollback SET restores);
2. Rollback SET list = `{assignment_status='visually_approved', updated_at=now()}` and NOTHING else — restores every mutated column except the acknowledged `updated_at` advance (benign: `select_template` ranks by registry order; db-rls-auditor confirmed nothing reads assignment `updated_at`);
3. Rollback WHERE identity (`id` + `template_id`) is character-identical to the forward WHERE identity;
4. Pre-image `approved_by='PK'` and `approved_at='2026-07-19 01:08:00.4319+00'` (confirming both SET lists correctly leave them untouched).
Any criterion failing = do NOT apply; surface to PK.

**Edit-window row ownership (db-rls-auditor open question 2):** row `1ee1a547-…` is owned EXCLUSIVELY by this lane from apply until restore — no other session/lane may touch it; any unexpected state found at rollback time (CAS 0-row) = STOP and surface, never force.

## Post-apply verification (all read-only, run immediately)

1. `select_template('property-pulse', NULL, 'video_short_stat')` → `status='ok'`, `selected.template_id = 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2'` (WINNER UNCHANGED — any other value = STOP + immediate rollback consideration), and `a3d8472d-…` ABSENT from `alternatives[]` (present in `rejected[]` with `assignment_blocked`).
2. `select_template('ndis-yarns','youtube','video_short_stat')` → still `fail_closed` (unchanged).
3. Assignment row re-read: `assignment_status='blocked'`, `approved_by='PK'`, `approved_at='2026-07-19 01:08:00.4319+00'` intact.
4. Re-run the canonical claimable-drafts SQL from §Live-facts-3 (identical text, AHA-06-1) → `claimable = 0`.

## Restore condition (NOT part of this apply)

PP assignment restore = the rollback SQL above, run ONLY after: template edited + re-captured + the mandatory controlled PP non-regression render (MARKET UPDATE preserved) receives PK PASS. Post-restore verification: PP winner still `dd5fd75e-…`; shared template back in `alternatives[]`. Any PP winner change, routing change, or visual regression at any point = hard STOP (PK D-3).

## Guards / non-actions

- Touches EXACTLY one row by primary key; no DDL, no GRANT/REVOKE, no other table.
- NDIS assignment `aa2179eb-…` and all preserved CGU evidence untouched.
- No register version cut (Convention 1 pointer at lane end).
- Not run until: db-rls-auditor pass · apply-harness-auditor shadow read · external review pinned to this packet's hash · explicit PK apply instruction.
