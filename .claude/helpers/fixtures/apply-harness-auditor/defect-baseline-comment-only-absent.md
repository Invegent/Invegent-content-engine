# Demo Apply Packet — comment-only baseline assertion, baseline ABSENT

> Synthetic fixture (hand-authored). A6 claims a non-regression comparison
> against a pre-apply baseline, but NO snapshot is ever captured and there is no
> executable comparison. The needed baseline is absent — must be flagged even
> though there is no DO block for A6.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

-- A1 -- deactivate one row, enforced.
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A1 FAILED: got %, expected 1.', n; END IF;
END $$;

-- A6 -- the 'youtube' rows must be byte-identical to the pre-apply baseline.
-- (No snapshot of youtube is ever captured in this transaction.)

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | row deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` |
| **A6** | youtube identical to baseline | 0 diffs | comment only |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
