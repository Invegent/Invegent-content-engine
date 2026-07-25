# Demo Apply Packet — rollback wrong pre-image (schema-qualified persistent CREATE TABLE)

> Synthetic fixture (hand-authored). The apply captures its pre-image into a
> non-TEMP, schema-qualified table `snap.wmix_pre`, but the rollback restores from
> a DIFFERENT relation `snap.wmix_backup_pre`. The persistent/schema-qualified
> CREATE must be recognised just like a CREATE TEMP TABLE — check 7 must fire.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- persistent, schema-qualified pre-image capture
CREATE TABLE snap.wmix_pre AS
SELECT widget_id, region, weight, is_current FROM demo.widget_mix WHERE region = 'north';

DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET weight = weight * 2 WHERE region = 'north';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A1 FAILED: got %, expected 1.', n; END IF;
END $$;

COMMIT;
```

## 2 · Rollback

```sql
BEGIN;

-- restores from a DIFFERENT relation than the apply captured
UPDATE demo.widget_mix d SET weight = s.weight, is_current = s.is_current
  FROM snap.wmix_backup_pre s WHERE d.widget_id = s.widget_id;

COMMIT;
```

## 3 · Execution control — sanctioned channel

Each block is submitted as a single call (one session).
