# Demo Apply Packet — targeted mutation baseline legitimately excludes another platform

> Synthetic fixture (hand-authored). The snapshot is a payload-target IDENTITY
> baseline scoped to the rows being changed. Another platform is intentionally
> out of scope because it is not being mutated. No assertion compares the
> excluded platform against this baseline, so there is NO scope gap — must NOT
> be flagged.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- Snapshot ONLY the platforms being changed. Regions outside this set are not
-- part of this apply and are not asserted here.
CREATE TEMP TABLE _mut_before ON COMMIT DROP AS
SELECT widget_id, region, weight FROM demo.widget_mix
 WHERE region IN ('north', 'south');

-- A1 -- assert the changed rows retired exactly the snapshot count.
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix d SET is_current = false
    FROM _mut_before b WHERE d.widget_id = b.widget_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> (SELECT count(*) FROM _mut_before) THEN
    RAISE EXCEPTION 'A1 FAILED: deactivated %, expected the snapshot count.', n;
  END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | changed rows retired match snapshot | equal | `GET DIAGNOSTICS` + `RAISE` |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
