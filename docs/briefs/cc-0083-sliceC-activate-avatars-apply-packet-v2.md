# cc-0083 Slice C — activate NDIS avatars apply packet (v2)

**Created:** 2026-07-26 Sydney · **Lane:** cc-0083 (avatar role-lens selection) · **Slice:** C (governed DML)
**Tier:** T3 (production DML on `c.brand_avatar` — changes render eligibility) · **Gate:** PK apply gate (staged, not applied)
**Governing brief:** `docs/briefs/cc-0083-avatar-role-lens-selection-gate1-v1.md`
**Supersedes v1** (`…sliceC-…-v1.md`): closes apply-harness-auditor shadow finding **AHA-07-1** (check-7 apply/rollback identity) by pinning the apply baseline with a pre-assertion and making both writes unconditional + symmetric, plus a post-rollback assertion.

---

## 1. Purpose

Give NDIS-Yarns **three distinct-role active characters** so role-lens selection has ≥3 carriers to discriminate among. Activate the **realistic** avatars for `participant` (Alex) and `local_area_coordinator` (Marcus) alongside the already-active `support_coordinator` (Sarah). Multi-active is legal (non-unique `is_active` index, INV-4). **Sarah stays the sole default host** — INV-1/INV-2 unchanged.

## 2. Ground truth (live read 2026-07-26, project `mbkmaxqhsohbtwsqolns`; re-confirmed by db-rls-auditor v1)

NDIS realistic avatars (all carry non-empty `heygen_avatar_id` + `heygen_voice_id`, `avatar_type='stock'`):

| role_code | render_style | is_active (pre) | is_default_host | is_primary |
|---|---|---|---|---|
| support_coordinator | realistic | **true** | **true** | false |
| participant | realistic | false | false | false |
| local_area_coordinator | realistic | false | false | false |
| (other 4 roles) | realistic | false | false | false |

Pre-state: exactly **1** active realistic avatar (support_coordinator), **1** realistic default host (support_coordinator), participant + LAC realistic both **inactive**.

## 3. Apply channel (single atomic call)

**ONE `apply_migration` call** — name `cc0083_activate_ndis_participant_lac_avatars`. Body = pre-assertion → `UPDATE` → post-assertion, all in one transaction. IDs resolved by join (not hardcoded).

## 4. Apply SQL (migration body)

```sql
-- cc-0083 Slice C: activate NDIS-Yarns realistic avatars for participant + local_area_coordinator.
-- Governed multi-active; default host UNCHANGED; join-scoped; pre- AND post- fail-closed assertions.

-- (A) PRE-ASSERTION — pin the baseline so the write set is provably exactly the 2 target rows.
--     Aborts on any drift from §2 (a target already active, or a different active count).
DO $$
DECLARE v_pre_active int; v_pre_targets_inactive int;
BEGIN
  SELECT count(*) INTO v_pre_active
  FROM c.brand_avatar ba
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic' AND ba.is_active IS TRUE;

  SELECT count(*) INTO v_pre_targets_inactive
  FROM c.brand_avatar ba
  JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic'
    AND bs.role_code IN ('participant', 'local_area_coordinator')
    AND ba.is_active IS NOT TRUE;

  IF v_pre_active <> 1 THEN
    RAISE EXCEPTION 'cc-0083 Slice C pre-check: expected exactly 1 active realistic avatar at baseline, got %', v_pre_active;
  END IF;
  IF v_pre_targets_inactive <> 2 THEN
    RAISE EXCEPTION 'cc-0083 Slice C pre-check: expected participant+LAC realistic both inactive at baseline, got % inactive', v_pre_targets_inactive;
  END IF;
END $$;

-- (B) UPDATE — unconditional over the role-scoped realistic set (the pre-check guarantees this set
--     is exactly the 2 inactive target rows, so no data-dependent guard is needed).
WITH ny AS (SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns')
UPDATE c.brand_avatar ba
SET is_active = true
FROM ny, c.brand_stakeholder bs
WHERE ba.client_id = ny.client_id
  AND ba.stakeholder_id = bs.stakeholder_id
  AND ba.render_style = 'realistic'
  AND bs.role_code IN ('participant', 'local_area_coordinator');

-- (C) POST-ASSERTION — exactly 3 active realistic avatars in the expected role set,
--     and exactly 1 realistic default host (unchanged). Else abort.
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
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic' AND ba.is_active IS TRUE;

  SELECT count(*) INTO v_default
  FROM c.brand_avatar ba
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic' AND ba.is_default_host IS TRUE;

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
-- cc-0083 Slice C rollback: deactivate the two role-scoped realistic avatars (participant + LAC).
-- Symmetric to apply: apply set this exact role-scoped set true; rollback sets the same set false.
WITH ny AS (SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns')
UPDATE c.brand_avatar ba
SET is_active = false
FROM ny, c.brand_stakeholder bs
WHERE ba.client_id = ny.client_id
  AND ba.stakeholder_id = bs.stakeholder_id
  AND ba.render_style = 'realistic'
  AND bs.role_code IN ('participant', 'local_area_coordinator');

-- POST-ROLLBACK ASSERTION (fail-closed): the two targets are now inactive and the default host is intact.
DO $$
DECLARE v_targets_active int; v_default int;
BEGIN
  SELECT count(*) INTO v_targets_active
  FROM c.brand_avatar ba
  JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic'
    AND bs.role_code IN ('participant', 'local_area_coordinator') AND ba.is_active IS TRUE;

  SELECT count(*) INTO v_default
  FROM c.brand_avatar ba
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic' AND ba.is_default_host IS TRUE;

  IF v_targets_active <> 0 THEN
    RAISE EXCEPTION 'cc-0083 Slice C rollback: participant/LAC still active (%); rollback did not achieve its scope', v_targets_active;
  END IF;
  IF v_default <> 1 THEN
    RAISE EXCEPTION 'cc-0083 Slice C rollback: default host disturbed; expected 1, got %', v_default;
  END IF;
END $$;
```

**Apply/rollback identity (AHA-07-1 closed):** the apply pre-assertion (A) guarantees the migration runs only from the exact §2 baseline (participant + LAC inactive), so the unconditional role-scoped UPDATE (B) has a **deterministic** write set = exactly those 2 rows. The rollback drives the **same** unconditional role-scoped predicate false, so the two write sets are provably identical — no data-dependent guard asymmetry remains. The post-rollback assertion fails closed if the rollback under- or over-reaches or disturbs the default host. Neither write set ever includes an `is_default_host` row. One-shot by design: a second apply aborts at the pre-check (baseline no longer 1-active) — correct fail-closed behaviour for a migration.

## 6. Declared safety harness (for static audit)

| # | Control | Executable enforcement |
|---|---|---|
| H1 | Default host unchanged | Write set excludes any `is_default_host` row (role filter); post-assertion re-checks `v_default=1`; rollback re-checks `v_default=1` |
| H2 | Scope | join on `client_slug='ndis-yarns'` + `render_style='realistic'` + `role_code IN (participant, local_area_coordinator)` — no other client/style/role |
| H3 | Baseline pinned | pre-assertion (A) aborts unless exactly 1 active realistic + both targets inactive — makes the UPDATE write set deterministic |
| H4 | Multi-active legality | `is_active` has only a NON-unique index; a 2nd/3rd active is permitted (INV-4); INV-2 not stressed (activations on non-hosts) |
| H5 | Fail-closed assertions | pre (A), post (C), and post-rollback DO-blocks all `RAISE EXCEPTION` in-txn |
| H6 | Atomicity | single `apply_migration` call → one transaction (pre + UPDATE + post commit-or-rollback together) |
| H7 | Reversibility + symmetry | §5 drives the identical role-scoped predicate false; pre-check guarantees apply/rollback write-set identity |
| H8 | Baseline record | §2 records pre-state |

No GRANT/REVOKE, no DDL, no ON CONFLICT, no default-host mutation, no pooled multi-call.

## 7. Post-apply verification (read-only)

1. NDIS realistic active avatars = 3, roles = {support_coordinator, participant, local_area_coordinator}.
2. NDIS realistic default host still = 1 (support_coordinator/Sarah).
3. Each active role has exactly 1 active realistic avatar with non-empty heygen ids.
4. Record the minted migration version in the result doc.

## 8. Non-claims

Slice C only makes the two roles render-eligible. It does **not** wire the script→role signal (Slice B ai-worker), change the fallback (Slice B heygen-worker), or set any `is_primary`. Selection still won't route by role until Slice B ships; with the role signal null in production, `heygen-worker` still returns the default host (Sarah) deterministically (db-rls-auditor v1, no regression).
