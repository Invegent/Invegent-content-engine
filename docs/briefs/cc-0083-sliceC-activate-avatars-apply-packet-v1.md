# cc-0083 Slice C — activate NDIS avatars apply packet (v1)

**Created:** 2026-07-26 Sydney · **Lane:** cc-0083 (avatar role-lens selection) · **Slice:** C (governed DML)
**Tier:** T3 (production DML on `c.brand_avatar` — changes render eligibility) · **Gate:** PK apply gate (staged, not applied)
**Governing brief:** `docs/briefs/cc-0083-avatar-role-lens-selection-gate1-v1.md`

---

## 1. Purpose

Give NDIS-Yarns **three distinct-role active characters** so role-lens selection has ≥3 carriers to discriminate among. Activate the **realistic** avatars for `participant` (Alex) and `local_area_coordinator` (Marcus) alongside the already-active `support_coordinator` (Sarah). Multi-active is legal (non-unique `is_active` index, INV-4). **Sarah stays the sole default host** — INV-1/INV-2 unchanged.

## 2. Ground truth (live read 2026-07-26, project `mbkmaxqhsohbtwsqolns`)

NDIS realistic avatars (all carry non-empty `heygen_avatar_id` + `heygen_voice_id`, `avatar_type='stock'`):

| role_code | render_style | is_active (pre) | is_default_host | is_primary |
|---|---|---|---|---|
| support_coordinator | realistic | **true** | **true** | false |
| participant | realistic | false | false | false |
| local_area_coordinator | realistic | false | false | false |
| (other 4 roles) | realistic | false | false | false |

Pre-state: exactly **1** active realistic avatar (support_coordinator), **1** realistic default host (support_coordinator).

## 3. Apply channel (single atomic call)

**ONE `apply_migration` call** — name `cc0083_activate_ndis_participant_lac_avatars`. Body = one join-scoped `UPDATE` + a fail-closed in-txn assertion, all in a single transaction. IDs are resolved by join (not hardcoded), per the data-migration guidance.

## 4. Apply SQL (migration body)

```sql
-- cc-0083 Slice C: activate NDIS-Yarns realistic avatars for participant + local_area_coordinator.
-- Governed multi-active; default host UNCHANGED; join-scoped; fail-closed assertion.

WITH ny AS (SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns')
UPDATE c.brand_avatar ba
SET is_active = true
FROM ny, c.brand_stakeholder bs
WHERE ba.client_id = ny.client_id
  AND ba.stakeholder_id = bs.stakeholder_id
  AND ba.render_style = 'realistic'
  AND bs.role_code IN ('participant', 'local_area_coordinator')
  AND ba.is_active IS DISTINCT FROM true;

-- Fail-closed STOP: exactly 3 active realistic avatars, all in the expected role set,
-- and exactly 1 realistic default host (unchanged). Else abort.
DO $$
DECLARE v_active int; v_expected int; v_default int;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE bs.role_code IN
           ('support_coordinator','participant','local_area_coordinator'))
    INTO v_active, v_expected
  FROM c.brand_avatar ba
  JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns'
    AND ba.render_style = 'realistic'
    AND ba.is_active IS TRUE;

  SELECT count(*) INTO v_default
  FROM c.brand_avatar ba
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns'
    AND ba.render_style = 'realistic'
    AND ba.is_default_host IS TRUE;

  IF v_active <> 3 OR v_expected <> 3 THEN
    RAISE EXCEPTION 'cc-0083 Slice C: expected 3 active realistic avatars in the role set, got active=% in_set=%', v_active, v_expected;
  END IF;
  IF v_default <> 1 THEN
    RAISE EXCEPTION 'cc-0083 Slice C: default host count changed; expected 1, got %', v_default;
  END IF;
END $$;
```

## 5. Rollback SQL

```sql
-- cc-0083 Slice C rollback: deactivate the two newly-activated realistic avatars; restores pre-state
-- (support_coordinator remains the sole active + default host). Neither is a default host, so INV-2 holds.
WITH ny AS (SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns')
UPDATE c.brand_avatar ba
SET is_active = false
FROM ny, c.brand_stakeholder bs
WHERE ba.client_id = ny.client_id
  AND ba.stakeholder_id = bs.stakeholder_id
  AND ba.render_style = 'realistic'
  AND bs.role_code IN ('participant', 'local_area_coordinator');
```

**Apply/rollback identity:** apply flips `is_active` false→true on exactly the participant + LAC realistic rows; rollback flips those same two rows true→false, restoring the recorded pre-state (1 active, support_coordinator). The default-host row is never in the write set. Symmetric.

## 6. Declared safety harness (for static audit)

| # | Control | Executable enforcement |
|---|---|---|
| H1 | Default host unchanged | Write set excludes any `is_default_host` row; assertion re-checks `v_default = 1` |
| H2 | Scope | join on `client_slug='ndis-yarns'` + `render_style='realistic'` + `role_code IN (participant, local_area_coordinator)` — no other client/style/role |
| H3 | Multi-active legality | `is_active` has only a NON-unique index; setting a 2nd/3rd active is permitted (INV-4); INV-2 (`is_default_host ⟹ is_active`) not stressed (activations, not deactivations, on non-hosts) |
| H4 | Fail-closed assertion | `DO $$ … RAISE EXCEPTION` on active≠3 / not-in-set / default≠1 — executable STOP in the same txn |
| H5 | Atomicity | single `apply_migration` call → one transaction |
| H6 | Reversibility | §5 deactivates exactly the two rows; pre-state restored |
| H7 | Baseline | §2 records pre-state (1 active, 1 default host) |

No GRANT/REVOKE, no DDL, no ON CONFLICT, no default-host mutation.

## 7. Post-apply verification (read-only)

1. NDIS realistic active avatars = 3, roles = {support_coordinator, participant, local_area_coordinator}.
2. NDIS realistic default host still = 1 (support_coordinator/Sarah).
3. Each active role has exactly 1 active realistic avatar with non-empty heygen ids.
4. Record the minted migration version in the result doc.

## 8. Non-claims

Slice C only makes the two roles render-eligible. It does **not** wire the script→role signal (Slice B ai-worker), change the fallback (Slice B heygen-worker), or set any `is_primary`. Selection still won't route by role until Slice B ships.
