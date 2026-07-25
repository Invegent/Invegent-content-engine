# Demo Apply Packet — non-regression assertion whose scope NO baseline covers

> Synthetic fixture (hand-authored). A6 (declared in the register AND repeated as
> a comment) claims 'west' is unchanged vs the pre-image, but the only snapshot
> is filtered to exclude 'west' and there is no full-table snapshot. The
> assertion's scope has no covering baseline anywhere — must fire, even though no
> executable DO block compares 'west'.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- Pre-image snapshot, scoped to the changed regions only.
CREATE TEMP TABLE _changed_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix
 WHERE region IN ('north', 'south', 'east');

-- A1 -- deactivate one changed row, enforced.
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A1 FAILED.'; END IF;
END $$;

-- A6 -- verify 'west' is unchanged vs the pre-image. (No snapshot covers 'west'.)

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed row deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` |
| **A6** | verify 'west' unchanged vs pre-image | 0 diffs | comment only |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
