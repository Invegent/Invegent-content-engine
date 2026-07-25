# Demo Apply Packet — comment-only "abort if" conditional

> Synthetic fixture (hand-authored). The abort control is a bare conditional
> comment ("abort if …") with no RAISE — an abort synonym plus a condition and no
> separate obligation modal. The comment-only-abort finding must fire.

## 1 · Apply — single call

> Submit as a single call (sanctioned channel §2).

```sql
BEGIN;

-- abort if count <> expected
UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';

COMMIT;
```

## 2 · Execution control — sanctioned channel

§1 must be submitted as a single call (one session).
