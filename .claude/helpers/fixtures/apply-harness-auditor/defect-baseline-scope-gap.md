# Demo Apply Packet — baseline scope-gap defect fixture

> Synthetic fixture (hand-authored). The in-transaction baseline snapshot is
> scoped by an inclusion filter that excludes the very region a later assertion
> must compare against it. Should return CONCERNS with the baseline-scope finding.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- Pre-apply baseline snapshot -- NOTE the scoping filter.
CREATE TEMP TABLE _demo_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix
 WHERE region IN ('north', 'south', 'east');

-- A1 -- deactivate one row, rowcount enforced.
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET is_current = false
   WHERE widget_id = 'dddd4444-4444-4444-4444-444444444444';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'A1 FAILED: deactivated % row(s), expected 1. ABORT.', n;
  END IF;
END $$;

-- A6 -- the west region must be identical to the pre-apply snapshot.
DO $$
DECLARE n_diff int;
BEGIN
  SELECT count(*) INTO n_diff FROM (
    (SELECT widget_id, region, weight FROM _demo_before WHERE region = 'west'
     EXCEPT
     SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'west')
  ) x;
  IF n_diff <> 0 THEN
    RAISE EXCEPTION 'A6 FAILED: % west row difference(s) vs the snapshot. ABORT.', n_diff;
  END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | row deactivated | exactly 1 | `GET DIAGNOSTICS` + `RAISE` |
| **A6** | west identical to snapshot | 0 differences | `RAISE` |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
