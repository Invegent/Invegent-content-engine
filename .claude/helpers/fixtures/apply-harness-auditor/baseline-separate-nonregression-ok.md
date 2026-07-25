# Demo Apply Packet — two baselines, each assertion linked to the correct one

> Synthetic fixture (hand-authored). One snapshot covers the changed platforms;
> a SEPARATE non-regression snapshot covers the unchanged platform. Each
> assertion links (by name) to its own baseline, so neither is a scope gap —
> must NOT be flagged. Exercises multiple-baselines linkage.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- Mutation snapshot: only the platforms being changed.
CREATE TEMP TABLE _mut_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix
 WHERE region IN ('north', 'south');

-- Non-regression snapshot for the UNCHANGED platform.
CREATE TEMP TABLE _east_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix
 WHERE region = 'east';

-- A1 -- changed rows retired (vs the mutation snapshot).
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix d SET is_current = false
    FROM _mut_before b WHERE d.widget_id = b.widget_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> (SELECT count(*) FROM _mut_before) THEN
    RAISE EXCEPTION 'A1 FAILED.';
  END IF;
END $$;

-- A6 -- the unchanged 'east' platform must be identical to its own snapshot.
DO $$
DECLARE n_diff int;
BEGIN
  SELECT count(*) INTO n_diff FROM (
    (SELECT widget_id, region, weight FROM _east_before WHERE region = 'east'
     EXCEPT
     SELECT widget_id, region, weight FROM demo.widget_mix WHERE region = 'east')
  ) x;
  IF n_diff <> 0 THEN RAISE EXCEPTION 'A6 FAILED: east changed.'; END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed rows retired | equal | `GET DIAGNOSTICS` + `RAISE` |
| **A6** | east identical to its snapshot | 0 diffs | `RAISE` |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
