# Demo Apply Packet — arbitrary proper noun in a non-regression sentence (no fire)

> Synthetic fixture (hand-authored). A comment uses non-regression language but
> names an arbitrary proper noun ("Canberra") that appears ONLY in narrative and
> is NOT a partition/domain value of the mutated relation. It must NOT be
> extracted as a scope, so check 6 must stay silent (grounding guard).

## 1 · Partition summary (before → after)

| region | before | after |
|---|---|---|
| north | 5 | 3 |
| south | 4 | 2 |

## 2 · Apply — single call

> Submit as a single call (sanctioned channel §4).

```sql
BEGIN;

-- Pre-image snapshot, scoped to the changed partitions.
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

-- A6 -- the Canberra office confirmed the layout is unchanged from last review.

COMMIT;
```

## 3 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed row deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` |

## 4 · Execution control — sanctioned channel

§2 must be submitted as a single call carrying the entire script (one session).
