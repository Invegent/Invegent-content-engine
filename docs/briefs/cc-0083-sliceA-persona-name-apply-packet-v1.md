# cc-0083 Slice A — persona_name apply packet (v1)

**Created:** 2026-07-26 Sydney · **Lane:** cc-0083 (avatar role-lens selection) · **Slice:** A (schema + data)
**Tier:** T3 (DDL + governed DML on `c.*`) · **Gate:** PK apply gate (this packet is staged, not applied)
**Governing brief:** `docs/briefs/cc-0083-avatar-role-lens-selection-gate1-v1.md`

---

## 1. Purpose

Add a **`persona_name`** column to `c.brand_stakeholder` (the missing "name" half of PK's identity requirement — selection stays keyed on `role_code`; `persona_name` is presentational) and populate the 7 NDIS-Yarns persona names. Additive, dark, reversible; changes **no** selection behaviour.

Execution refinement vs the gate-1 brief: the poller *display* change (`persona_name — role_label`) moves out of Slice A into the **Slice B code-deploy batch**, so all EF deploys land in one event. Slice A is **schema + data only** — no code, no deploy.

## 2. Ground truth (live read 2026-07-26, project `mbkmaxqhsohbtwsqolns`)

- `c.brand_stakeholder.persona_name` does **not** exist (`information_schema.columns` count = 0).
- NDIS-Yarns has exactly **7** stakeholder rows, `sort_order` 1–7, `role_label` = role only (no name folded in). role_codes (live truth): `participant`, `support_coordinator`, `local_area_coordinator`, `allied_health_provider`, `plan_manager`, `support_worker`, `family_carer`.
- Persona-name map (from `docs/video/avatar-profiles-ndis-yarns.md`): participant→Alex · support_coordinator→Sarah · local_area_coordinator→Marcus · allied_health_provider→Priya · plan_manager→James · support_worker→Caleb · family_carer→Diane.

## 3. Apply channel (single atomic call)

**ONE `apply_migration` call** — migration name `cc0083_add_persona_name_to_brand_stakeholder`. `apply_migration` wraps the migration body in a single transaction, so the ADD COLUMN + backfill + post-assertion compose atomically (no pooled multi-call split). The applied version is minted by `apply_migration` (wall-clock); record it post-apply vs the repo filename (naming-identity gotcha).

## 4. Apply SQL (migration body)

```sql
-- cc-0083 Slice A: add persona_name to c.brand_stakeholder + populate NDIS-Yarns personas.
-- Additive nullable column; NDIS-scoped backfill; transactional with an executable post-assertion.

ALTER TABLE c.brand_stakeholder
  ADD COLUMN IF NOT EXISTS persona_name text;

COMMENT ON COLUMN c.brand_stakeholder.persona_name IS
  'Human persona first name for the stakeholder role (e.g. "Sarah"). Presentational identity paired with role_label; selection remains keyed on role_code. Nullable; populated per client. cc-0083.';

-- NDIS-Yarns persona-name backfill (by client_slug + role_code; idempotent).
WITH ny AS (
  SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns'
)
UPDATE c.brand_stakeholder bs
SET persona_name = m.persona_name
FROM ny, (VALUES
  ('participant',            'Alex'),
  ('support_coordinator',    'Sarah'),
  ('local_area_coordinator', 'Marcus'),
  ('allied_health_provider', 'Priya'),
  ('plan_manager',           'James'),
  ('support_worker',         'Caleb'),
  ('family_carer',           'Diane')
) AS m(role_code, persona_name)
WHERE bs.client_id = ny.client_id
  AND bs.role_code = m.role_code;

-- Executable STOP (fail-closed): exactly 7 NDIS rows must carry the expected persona_name, else abort.
DO $$
DECLARE v_ok int;
BEGIN
  SELECT count(*) INTO v_ok
  FROM c.brand_stakeholder bs
  JOIN c.client cl ON cl.client_id = bs.client_id
  WHERE cl.client_slug = 'ndis-yarns'
    AND bs.persona_name = CASE bs.role_code
      WHEN 'participant'            THEN 'Alex'
      WHEN 'support_coordinator'    THEN 'Sarah'
      WHEN 'local_area_coordinator' THEN 'Marcus'
      WHEN 'allied_health_provider' THEN 'Priya'
      WHEN 'plan_manager'           THEN 'James'
      WHEN 'support_worker'         THEN 'Caleb'
      WHEN 'family_carer'           THEN 'Diane'
    END;
  IF v_ok <> 7 THEN
    RAISE EXCEPTION 'cc-0083 Slice A assertion failed: expected 7 NDIS persona_name rows, got %', v_ok;
  END IF;
END $$;
```

## 5. Rollback SQL

```sql
-- cc-0083 Slice A rollback: drop the column (removes column + all persona_name data in one step).
ALTER TABLE c.brand_stakeholder DROP COLUMN IF EXISTS persona_name;
```

**Apply/rollback identity:** apply does two things (add column, populate 7 rows); rollback drops the column, which reverses **both** at once (the data cannot survive its column). This is a superset undo, not a partial one — the pre-apply state (`persona_name` absent) is exactly restored. No separate UPDATE-reversal is needed or possible.

## 6. Declared safety harness (for static audit)

| # | Control | Executable enforcement |
|---|---|---|
| H1 | Additive-only | `ADD COLUMN IF NOT EXISTS` — nullable, no default, no rewrite; cannot violate existing constraints |
| H2 | Client-scoped backfill | `UPDATE … WHERE client_id = (ndis-yarns) AND role_code = m.role_code` — no other client touched |
| H3 | Fail-closed post-assertion | `DO $$ … IF v_ok <> 7 THEN RAISE EXCEPTION … END $$` — executable STOP inside the same txn; a short/over-write count aborts the whole migration |
| H4 | Atomicity | single `apply_migration` call → one transaction; ADD COLUMN + UPDATE + assertion commit-or-rollback together |
| H5 | Reversibility | §5 DROP COLUMN restores exact pre-state |
| H6 | Baseline | pre-state recorded in §2 (column absent; 7 rows, names null) |

No prose-only STOPs, no pooled multi-call composition, no ON CONFLICT/upsert, no GRANT/REVOKE, no RLS change.

## 7. Post-apply verification (read-only, after PK apply)

1. Column exists: `information_schema.columns` count = 1.
2. `SELECT role_code, persona_name FROM c.brand_stakeholder … WHERE client_slug='ndis-yarns'` returns the 7 expected pairs, none null.
3. No other client has a non-null `persona_name`.
4. Record the `apply_migration`-minted version in the result doc (filename-vs-applied divergence).

## 8. Non-claims

Slice A stores + populates the name only. It does **not** wire selection, activate any avatar, change the poller display, or touch `role_label`. Those are Slices B/C.
