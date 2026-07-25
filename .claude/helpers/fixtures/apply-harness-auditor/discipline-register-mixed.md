# Demo Apply Packet — register mixes real controls with a citation and a descriptor

> Synthetic fixture (hand-authored). The assertion register lists real controls
> (G-ATOMIC, A0, A-DRIFT, A6) alongside two rows that are NOT declared controls:
> an evidence/session-probe citation and a descriptive hyphenated phrase. Only
> the real controls must be extracted; the hyphenated REAL controls and A0/A6
> must still extract (regression guard).

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;

CREATE TEMP TABLE _txn ON COMMIT DROP AS SELECT pg_current_xact_id() AS xid;

DO $$
DECLARE v xid8;
BEGIN
  SELECT xid INTO v FROM _txn;
  IF pg_current_xact_id() <> v THEN RAISE EXCEPTION 'G-ATOMIC FAILED: identity changed.'; END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM demo.widget_mix WHERE effective_from = CURRENT_DATE;
  IF n <> 0 THEN RAISE EXCEPTION 'A0 FAILED: collision at target date.'; END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'A-DRIFT FAILED: got %, expected 1.', n; END IF;
END $$;

DO $$
DECLARE s numeric;
BEGIN
  SELECT sum(weight) INTO s FROM demo.widget_mix WHERE is_current;
  IF s <> 100.00 THEN RAISE EXCEPTION 'A6 FAILED: shares sum to %, expected 100.00.', s; END IF;
END $$;

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement | Origin |
|---|---|---|---|---|
| **G-ATOMIC** | xid unchanged | equal | `RAISE` | S1 probe P3 |
| **A0** | no collision at target date | 0 | `RAISE` | §4 |
| **A-DRIFT** | rows deactivated | 1 | `GET DIAGNOSTICS` + `RAISE` | proven live |
| **A6** | shares sum invariant | 100.00 | `RAISE` | §5 |
| **proven by S1** | evidence citation, not a control | — | — | S1 probe P3 |
| **PK-directed** | descriptor, not a control | — | — | narrative |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
