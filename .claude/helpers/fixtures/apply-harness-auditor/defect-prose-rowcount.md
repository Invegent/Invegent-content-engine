# Demo Apply Packet — prose row-count claim with no fail-closed RAISE

> Synthetic fixture (hand-authored). A stated expected row count appears in prose
> with no GET DIAGNOSTICS + RAISE anywhere. The SPECIFIC row-count finding must be
> emitted (not merely degraded to INCOMPLETE).

## 1 · Plan

The update should affect 8 rows.

## 2 · Apply — single call

> Submit as a single call (sanctioned channel §3).

```sql
BEGIN;
UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
COMMIT;
```

## 3 · Execution control — sanctioned channel

§2 must be submitted as a single call (one session).
