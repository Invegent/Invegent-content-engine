# Demo Apply Packet — multi-call transaction, unnamed channel

> Synthetic fixture (hand-authored). The transaction is fragmented over two
> execution units with no in-transaction identity guard, and no execution
> channel is named at all. Should return INCOMPLETE (missing channel) while
> still enumerating the multi-call-transaction finding.

## 1 · Apply — run these in order

First, open the transaction and deactivate:

```sql
BEGIN;
UPDATE demo.widget_mix SET is_current = false WHERE region = 'north';
```

Then, in a separate call, insert the replacement and commit:

```sql
INSERT INTO demo.widget_mix (region, weight, is_current) VALUES ('north', 100.00, true);
COMMIT;
```

The two statements above are run one statement at a time as separate calls.

## 2 · Assertion register

| # | Assertion | Expected | Enforcement |
|---|---|---|---|
| **A1** | replacement inserted | 1 | operator eyeballs the row count |
