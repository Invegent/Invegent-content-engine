# Demo Apply Packet — rollback restores from the WRONG pre-image relation

> Synthetic fixture (hand-authored). The apply captures its pre-image into
> wm_A_pre, but the rollback restores from a DIFFERENT relation wm_B_pre — a
> divergent restore identity. Check 7 must fire.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- capture the pre-image of the rows we change
CREATE TEMP TABLE wm_A_pre AS
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

-- restore the pre-apply values
UPDATE demo.widget_mix d SET weight = s.weight, is_current = s.is_current
  FROM wm_B_pre s WHERE d.widget_id = s.widget_id;

COMMIT;
```

## 3 · Execution control — sanctioned channel

Each block is submitted as a single call (one session).
