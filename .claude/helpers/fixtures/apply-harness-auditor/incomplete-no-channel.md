# Demo Apply Packet — correct SQL but NO named execution channel

> Synthetic fixture (hand-authored). The SQL is mechanically sound (xid guard,
> RAISE-backed row count, register present) but the packet never names an
> execution channel at all. Should return INCOMPLETE, not PASS.

## 1 · Apply

```sql
BEGIN;

CREATE TEMP TABLE _demo_txn ON COMMIT DROP AS SELECT pg_current_xact_id() AS xid;

CREATE TEMP TABLE _demo_pinned(widget_id uuid) ON COMMIT DROP;
INSERT INTO _demo_pinned VALUES
  ('55555555-5555-5555-5555-555555555555'),
  ('66666666-6666-6666-6666-666666666666');

DO $$
DECLARE v_anchor xid8;
BEGIN
  SELECT xid INTO v_anchor FROM _demo_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'GUARD-XID FAILED: identity changed.';
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix d SET is_current = false
    FROM _demo_pinned p WHERE d.widget_id = p.widget_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN
    RAISE EXCEPTION 'A1 FAILED: deactivated % row(s), expected 2.', n;
  END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **GUARD-XID** | current xid == anchor | equal | `RAISE` |
| **A1** | rows deactivated | exactly 2 | `GET DIAGNOSTICS` + `RAISE` |
