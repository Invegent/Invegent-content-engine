# Demo Apply Packet — comment-only STOP defect fixture

> Synthetic fixture (hand-authored). The declared STOPs are SQL comments, not
> executable guards. Should return CONCERNS (channel + register present, so not
> INCOMPLETE) with the declared-STOP, comment-abort, and unenforced-row-count
> findings enumerated.

## 1 · Apply script

> Submit the entire block as a single call (sanctioned channel in §3).

```sql
BEGIN;

CREATE TEMP TABLE _demo_pinned(widget_id uuid) ON COMMIT DROP;
INSERT INTO _demo_pinned VALUES
  ('aaaa1111-1111-1111-1111-111111111111'),
  ('bbbb2222-2222-2222-2222-222222222222'),
  ('cccc3333-3333-3333-3333-333333333333');

-- A1 must report exactly 3 rows updated, else ABORT.
UPDATE demo.widget_mix d SET is_current = false
  FROM _demo_pinned p WHERE d.widget_id = p.widget_id;

-- A2 and A3 must all pass BEFORE COMMIT.
INSERT INTO demo.widget_mix (region, weight, is_current)
  VALUES ('north', 100.00, true);

COMMIT;
```

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | rows deactivated | exactly 3 | must report 3, else ABORT |
| **A2** | replacement inserted | exactly 1 | BEFORE COMMIT |
| **A3** | no duplicate current pair | 0 | BEFORE COMMIT |

## 3 · Execution control — sanctioned channel

§1 must be submitted as a single call carrying the entire script (one session).
