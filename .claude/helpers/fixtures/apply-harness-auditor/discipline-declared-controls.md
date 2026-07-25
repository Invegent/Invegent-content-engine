# Demo Apply Packet — declared-control extraction discipline fixture

> Synthetic fixture (hand-authored). It DISCUSSES prior findings, an option, a
> session/probe and a SQLSTATE, and contains a defect-history table — none of
> which are DECLARED controls. Only the genuine STOP register (A1, A2) and the
> executable guard (A1) are real declared controls.

## 1 · Prior findings (discussion — NOT declared controls)

| # | Defect | Closure | Repair |
|---|---|---|---|
| **M-1** | assertions were comments | executable RAISE now | 2 |
| **M-2** | pooled-call split | xid anchor | 1 |
| **M-3** | missing baseline | full snapshot | 3 |

Session S1 proved live that probe P3 raised `ERROR: P0001` when the guard
tripped. The earlier statement-by-statement plan is forbidden here; option
O-4 (re-derive inside the transaction) is deferred — see the deferral register.

## 2 · Apply

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

## 3 · Execution control — sanctioned channel

Submit §2 as a single call carrying the entire script (one session).

### 3.1 — STOP conditions

The apply STOPs on any of: A1 not exactly 1 row · A2 duplicate current pair ·
any channel other than the single-call channel above.
