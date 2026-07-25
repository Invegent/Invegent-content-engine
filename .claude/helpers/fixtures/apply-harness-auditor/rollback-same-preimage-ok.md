# Demo Apply Packet — rollback restores from the SAME pre-image relation (sound)

> Synthetic fixture (hand-authored). The apply captures its pre-image into wm_pre
> and the rollback restores from wm_pre — the same restore identity. Check 7 must
> stay silent.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

CREATE TEMP TABLE wm_pre AS
SELECT widget_id, weight FROM demo.widget_mix WHERE region = 'north';

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

-- restore the pre-apply values from the SAME pre-image
UPDATE demo.widget_mix d SET weight = s.weight
  FROM wm_pre s WHERE d.widget_id = s.widget_id;

COMMIT;
```

## 3 · Execution control — sanctioned channel

Each block is submitted as a single call (one session).
