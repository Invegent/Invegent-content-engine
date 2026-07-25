# Demo Apply Packet — same 'west' assertion, but a FULL-TABLE snapshot covers it

> Synthetic fixture (hand-authored). Identical non-regression assertion for
> 'west' as the uncovered fixture, but an in-transaction full-table snapshot is
> present. A full-table snapshot covers every scope, so 'west' is covered — must
> NOT fire.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- Full-table pre-image snapshot (covers every region).
CREATE TEMP TABLE _all_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix;

-- A narrowly-scoped convenience snapshot also exists (not the one A6 relies on).
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

-- A6 -- verify 'west' is unchanged vs the full-table pre-image.
DO $$
DECLARE n_diff int;
BEGIN
  SELECT count(*) INTO n_diff FROM (
    (SELECT widget_id, region, weight FROM _all_before WHERE region = 'west'
     EXCEPT
     SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'west')
  ) x;
  IF n_diff <> 0 THEN RAISE EXCEPTION 'A6 FAILED: west changed.'; END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed row deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` |
| **A6** | verify 'west' unchanged vs pre-image | 0 diffs | `RAISE` |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
