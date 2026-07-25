# Demo Apply Packet — assertion links to its NAMED baseline, not the nearby query

> Synthetic fixture (hand-authored). A6's real baseline is a full-table snapshot
> declared earlier; a narrowly-scoped WRONG query sits physically right before
> A6. Linking by the nearest preceding query would falsely flag a scope gap;
> linking by the baseline the assertion actually names does not — must NOT flag.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- Correct full-table baseline the assertion actually uses.
CREATE TEMP TABLE _real_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix;

-- A1 -- deactivate the changed rows.
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A1 FAILED.'; END IF;
END $$;

-- A narrowly-scoped scan sits right here, next to the assertion below. It is
-- NOT the snapshot A6 uses.
CREATE TEMP TABLE _wrong_scan ON COMMIT DROP AS
SELECT widget_id, region FROM demo.widget_mix WHERE region IN ('north', 'south');

-- A6 -- 'east' must be identical to the real full-table snapshot _real_before.
DO $$
DECLARE n_diff int;
BEGIN
  SELECT count(*) INTO n_diff FROM (
    (SELECT widget_id, region, weight FROM _real_before WHERE region = 'east'
     EXCEPT
     SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'east')
  ) x;
  IF n_diff <> 0 THEN RAISE EXCEPTION 'A6 FAILED.'; END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed rows retired | 1 | `GET DIAGNOSTICS` + `RAISE` |
| **A6** | east identical to the real snapshot | 0 diffs | `RAISE` |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
