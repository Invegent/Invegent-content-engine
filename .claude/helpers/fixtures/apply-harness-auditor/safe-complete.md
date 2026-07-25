# Demo Apply Packet — mechanically-complete SAFE fixture

> Synthetic fixture (hand-authored). Not a real packet. A mechanically sound
> harness: executable RAISE-backed row counts, a named single-call channel, a
> full-scope in-transaction baseline, and a consistent rollback identity set.
> This fixture must return PASS.

## 1 · Apply script — ONE transaction, ONE call

> Submit this entire block as a single call. See §4 for the sanctioned channel.

```sql
BEGIN;

-- STEP 0 — transaction identity anchor + full pre-apply snapshot (no mutation)
CREATE TEMP TABLE _demo_txn ON COMMIT DROP AS
SELECT pg_current_xact_id() AS xid;

-- Full-table snapshot, every region included (no scoping filter).
CREATE TEMP TABLE _demo_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix;

-- The identities this apply retires — written once.
CREATE TEMP TABLE _demo_pinned(widget_id uuid) ON COMMIT DROP;
INSERT INTO _demo_pinned VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

-- GUARD-XID — every mutating step re-asserts the transaction identity.
DO $$
DECLARE v_anchor xid8;
BEGIN
  SELECT xid INTO v_anchor FROM _demo_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'GUARD-XID FAILED: transaction identity changed; not one call. ABORT.';
  END IF;
END $$;

-- A1 — deactivate the 3 pinned rows; rowcount asserted where it is real.
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix d SET is_current = false
    FROM _demo_pinned p WHERE d.widget_id = p.widget_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN
    RAISE EXCEPTION 'A1 FAILED: deactivated % row(s), expected 3. ABORT.', n;
  END IF;
END $$;

-- A2 — assert every region still holds current rows (absence guard).
DO $$
DECLARE n_reg int;
BEGIN
  SELECT count(DISTINCT region) INTO n_reg FROM demo.widget_mix WHERE is_current;
  IF n_reg <> 4 THEN
    RAISE EXCEPTION 'A2 FAILED: only % region(s) hold current rows, expected 4. ABORT.', n_reg;
  END IF;
END $$;

-- A6 — untouched region identical to the in-transaction snapshot.
DO $$
DECLARE n_diff int;
BEGIN
  SELECT count(*) INTO n_diff FROM (
    (SELECT widget_id, region, weight FROM _demo_before WHERE region = 'north'
     EXCEPT
     SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'north')
  ) x;
  IF n_diff <> 0 THEN
    RAISE EXCEPTION 'A6 FAILED: % north row difference(s) vs the snapshot. ABORT.', n_diff;
  END IF;
END $$;

COMMIT;
```

## 2 · Assertion register — every STOP and where it is enforced

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **GUARD-XID** | current xid == the anchored xid | equal | `RAISE` in the GUARD-XID block |
| **A1** | rows deactivated by identity | exactly 3 | `GET DIAGNOSTICS` + `RAISE` |
| **A2** | regions holding current rows | exactly 4 | `RAISE` |
| **A6** | untouched region identical to snapshot | 0 differences | `RAISE` |

## 3 · Rollback

```sql
BEGIN;

-- The 3 originals to reactivate — SAME pinned identity list as §1, unchanged.
CREATE TEMP TABLE _demo_pinned(widget_id uuid) ON COMMIT DROP;
INSERT INTO _demo_pinned VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix d SET is_current = true
    FROM _demo_pinned p WHERE d.widget_id = p.widget_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN
    RAISE EXCEPTION 'R2 FAILED: reactivated % row(s), expected 3. ABORT.', n;
  END IF;
END $$;

COMMIT;
```

## 4 · Execution control — sanctioned channel

§1 must be submitted as a single call so all statements share one backend
session and one transaction. The sanctioned channel is a single execute call
carrying the entire §1 script (proven to compose as one session, one xid).

### 4.1 — Sequence

1. GUARD-XID — anchor the transaction identity.
2. A1 — deactivate the pinned rows.
3. A2 — assert all regions still present.
4. A6 — assert the untouched region is unchanged.

### 4.2 — STOP conditions

Any channel other than the single-call channel above · any RAISE EXCEPTION from
§1 · packet hash mismatch.
