# Demo Apply Packet — narrative "rollback" noun must not trip the abort check

> Synthetic fixture (hand-authored). The comments mention "rollback" as a NOUN in
> descriptive narrative, with no abort directive and no conditional. check 2 must
> stay silent (no false positive).

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §2).

```sql
BEGIN;

CREATE TEMP TABLE _out ON COMMIT DROP AS SELECT 1 AS x;

-- this is the ONLY result set. RECORD THIS OUTPUT (the rollback depends on it).
SELECT * FROM _out;

-- the rollback in section 6 restores the originals from the pinned list.
UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';

COMMIT;
```

## 2 · Execution control — sanctioned channel

§1 must be submitted as a single call (one session).
