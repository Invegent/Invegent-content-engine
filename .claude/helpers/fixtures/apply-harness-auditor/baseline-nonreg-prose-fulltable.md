# Demo Apply Packet — prose non-regression assertion, full-table snapshot covers it

> Synthetic fixture (hand-authored). Same "Zephyr untouched" prose assertion as
> the uncovered fixture, but an in-transaction full-table snapshot is present. A
> full-table snapshot covers every partition, so Zephyr is covered — must NOT
> fire.

## 1 · Partition summary (before → after)

| region | before | after |
|---|---|---|
| north | 5 | 3 |
| south | 4 | 2 |
| zephyr | 6 | 6 |

## 2 · Apply — single call

> Submit as a single call (sanctioned channel §4).

```sql
BEGIN;

-- Full-table pre-image snapshot (covers every partition, Zephyr included).
CREATE TEMP TABLE _all_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix;

-- A convenience snapshot of just the changed partitions also exists.
CREATE TEMP TABLE _changed_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix
 WHERE region IN ('north', 'south');

-- A1 -- deactivate one changed row, enforced.
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A1 FAILED.'; END IF;
END $$;

COMMIT;
```

## 3 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed row deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` |
| **A6** | Zephyr untouched — its rows unchanged | 0 diffs | comment only |

## 4 · Execution control — sanctioned channel

§2 must be submitted as a single call carrying the entire script (one session).
