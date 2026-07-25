# Demo Apply Packet — prose non-regression assertion named in a COMMENT, uncovered

> Synthetic fixture (hand-authored). The non-regression assertion is stated in a
> COMMENT (not a register cell): the Zephyr partition must remain unchanged.
> Zephyr is corroborated by the summary table, the only snapshot excludes it, and
> there is no full-table snapshot — must fire.

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

-- Pre-image snapshot, scoped to the changed partitions only.
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

-- A6 -- the Zephyr partition must remain unchanged vs the pre-image.

COMMIT;
```

## 3 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed row deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` |

## 4 · Execution control — sanctioned channel

§2 must be submitted as a single call carrying the entire script (one session).
