# Demo Apply Packet — ephemeral in-txn assertion baseline + separate rollback snapshot (sound)

> Synthetic fixture (hand-authored). The apply captures an EPHEMERAL
> in-transaction non-regression baseline (`_nr_baseline`, TEMP + ON COMMIT DROP)
> that is consumed only inside an assertion DO block, and the rollback restores
> from a SEPARATE, durable pre-apply snapshot with a different name. This is a
> sound harness shape — check 7 must NOT fire.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- ephemeral in-transaction non-regression assertion baseline (dropped at commit)
CREATE TEMP TABLE _nr_baseline ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'north';

UPDATE demo.widget_mix SET weight = weight * 2 WHERE region = 'south';

-- A6 non-regression assertion consumes ONLY the ephemeral baseline
DO $$
DECLARE n_diff int;
BEGIN
  SELECT count(*) INTO n_diff FROM (
    (SELECT widget_id, region, weight FROM _nr_baseline WHERE region = 'north'
     EXCEPT
     SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'north')
  ) x;
  IF n_diff <> 0 THEN RAISE EXCEPTION 'A6 FAILED: north changed.'; END IF;
END $$;

COMMIT;
```

## 2 · Rollback

```sql
BEGIN;

-- restore from the separate, durable pre-apply snapshot (captured out-of-band)
UPDATE demo.widget_mix d SET weight = s.weight
  FROM snap.wmix_snapshot s WHERE d.widget_id = s.widget_id;

COMMIT;
```

## 3 · Execution control — sanctioned channel

Each block is submitted as a single call (one session).
