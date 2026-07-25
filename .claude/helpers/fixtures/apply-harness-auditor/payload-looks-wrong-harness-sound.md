# Demo Apply Packet — payload looks wrong, harness is sound (must PASS)

> Synthetic fixture (hand-authored). The business numbers are deliberately odd
> (shares that do not sum to 100, an unusual mix). A correct auditor does NOT
> judge payload/business correctness -- only whether declared controls are
> mechanically enforced. The harness is complete, so this must return PASS.

## 1 · Apply — single call

> Submit the entire block as a single call (sanctioned channel §3).

```sql
BEGIN;

CREATE TEMP TABLE _demo_txn ON COMMIT DROP AS SELECT pg_current_xact_id() AS xid;

CREATE TEMP TABLE _demo_proposed(region text, share numeric(5,2)) ON COMMIT DROP;
INSERT INTO _demo_proposed VALUES
  ('north', 12.34),
  ('south', 99.99),
  ('east',  3.00);

DO $$
DECLARE v_anchor xid8; n int;
BEGIN
  SELECT xid INTO v_anchor FROM _demo_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'GUARD-XID FAILED: identity changed. ABORT.';
  END IF;

  INSERT INTO demo.widget_mix (region, weight, is_current)
    SELECT region, share, true FROM _demo_proposed;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN
    RAISE EXCEPTION 'A1 FAILED: inserted % row(s), expected 3. ABORT.', n;
  END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **GUARD-XID** | current xid == anchor | equal | `RAISE` |
| **A1** | rows inserted | exactly 3 | `GET DIAGNOSTICS` + `RAISE` |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
