# Demo Apply Packet — psql single-transaction single-file channel (sound)

> Synthetic fixture (hand-authored). The sanctioned channel is a single psql
> invocation running the whole script as one file in one transaction. This must
> NOT get a false INCOMPLETE from channel recognition.

## 1 · Apply

```sql
BEGIN;
DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A1 FAILED: got %, expected 1.', n; END IF;
END $$;
COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | row deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` |

## 3 · Execution control — sanctioned channel

Run the whole script as one file, in one transaction, via a single invocation:

    psql --single-transaction -f apply.sql

Any other channel is a STOP.
