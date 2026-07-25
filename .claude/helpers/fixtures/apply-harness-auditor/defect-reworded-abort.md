# Demo Apply Packet — reworded abort claim (wording-variant defect)

> Synthetic fixture (hand-authored). The abort intent is PARAPHRASED (no literal
> "else ABORT"): "halt and do not commit", "cancel the whole apply". A correct
> auditor still catches these as comment-only controls. Should return CONCERNS.

## 1 · Apply — single call

> Submit the whole script as a single call (sanctioned channel §3).

```sql
BEGIN;

-- A1 has to update exactly 3 rows; if it does not, halt and do not commit.
UPDATE demo.widget_mix SET is_current = false
  WHERE region = 'north' AND is_current;

-- A2 must add exactly one replacement row, otherwise cancel the whole apply.
INSERT INTO demo.widget_mix (region, weight, is_current)
  VALUES ('north', 100.00, true);

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | rows deactivated | 3 | prose note above the statement |
| **A2** | replacement inserted | 1 | prose note above the statement |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
