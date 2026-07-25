# Demo Apply Packet — rollback is a DELETE with no restore-FROM relation (sound)

> Synthetic fixture (hand-authored). The apply captures a durable pre-image, but
> the rollback reverses by an identity DELETE with no restore-FROM relation. There
> is no divergent restore source — check 7 must NOT fire.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

CREATE TABLE snap.wmix_pre AS
SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'north';

INSERT INTO demo.widget_mix (region, weight, is_current) VALUES ('north', 1, true);

COMMIT;
```

## 2 · Rollback

```sql
BEGIN;

-- remove the row this apply inserted (identity DELETE, no restore source)
DELETE FROM demo.widget_mix WHERE region = 'north' AND weight = 1 AND is_current;

COMMIT;
```

## 3 · Execution control — sanctioned channel

Each block is submitted as a single call (one session).
