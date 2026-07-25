# Demo Apply Packet — prose non-regression assertion, filtered baseline INCLUDES it

> Synthetic fixture (hand-authored). Same "Zephyr untouched" prose assertion, but
> the filtered pre-image snapshot's value set INCLUDES Zephyr. The scope is
> covered — must NOT fire.

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

-- Pre-image snapshot whose value set INCLUDES zephyr.
CREATE TEMP TABLE _before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix
 WHERE region IN ('north', 'south', 'zephyr');

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
