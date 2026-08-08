# CARRY-INFRA-1 — apply-channel transaction proof (PROCEDURE, NOT EXECUTED)

**Status: PREPARED, NOT RUN. Requires a write, therefore blocked by the production-mutation watch
gate (~2026-08-11 20:20 Sydney) and a PK decision on where to run it.**

**Raised by:** PK ruling 2026-08-08 — *"Do not turn the `apply_migration` transaction question into
another cc-0092 rabbit hole. Record it as a reusable infrastructure-proof item. If it needs proving,
prove it once independently and let future gates cite that evidence."*

**Deliberately NOT a cc-0092 deliverable.** cc-0092 discloses the gap honestly in-artifact and
proceeds; this document exists so the question is owned as infrastructure rather than re-litigated
per packet.

## The question

Does the Supabase `apply_migration` channel execute a multi-statement script containing an embedded
`BEGIN` … `COMMIT` as **ONE transaction**, without splitting statements?

## Why it matters beyond cc-0092

Every ICE apply packet in this programme relies on the same shape: a `DO` block asserting pre-state,
then the write, then a `DO` block asserting post-state, all inside one embedded transaction. If the
channel splits statements, or wraps the script in its own transaction that the embedded `COMMIT`
terminates early, then:

- a post-state assertion could fire **after** the write has already committed, so its `RAISE` aborts
  nothing — the protection becomes decorative;
- a pre-state abort might not roll back a write issued by an earlier statement.

**That is the cc-0079 Slice-2 failure class** — a packet declaring a protection its executable SQL
does not enforce. `apply-harness-auditor` exists to catch it statically; this proves the channel
assumption the static audit cannot reach.

## Current status of the claim

**Closed by assertion, not proof.** `db-rls-auditor` flagged this twice (round-1 O-15b, round-2
open question) and could not settle it, because settling it requires performing a write.

**Exposure for cc-0092's own artifacts is small and this is why the lane proceeded:** in both A1 and
A2a, `BEGIN` is the first statement and `COMMIT` the last, with all assertions in between. So the
assertion-to-write atomicity they actually depend on holds under either channel behaviour. The risk
is to *future* packets that assume more.

## Proof procedure

**Run on a scratch target, NOT production.** Options in preference order — PK's choice:

1. **A Supabase dev branch.** ⚠ Branches come up **BARE** (no prod schema) — fine here, the proof
   needs only a scratch table. Costs money; PK authorises.
2. **A dedicated scratch schema on production** — cheaper, but it *is* a production write, so it
   needs the watch gate cleared and a PK gate. Drop the schema afterwards.

### Test 1 — does an embedded `COMMIT` end the channel's transaction early?

```sql
BEGIN;
CREATE SCHEMA IF NOT EXISTS zz_carry_infra_1;
CREATE TABLE zz_carry_infra_1.probe (n int);
INSERT INTO zz_carry_infra_1.probe VALUES (1);
COMMIT;
-- Statement AFTER the COMMIT. If the channel ran the script as one transaction that the COMMIT
-- closed, this executes in a NEW implicit transaction and its failure leaves row 1 committed.
DO $$ BEGIN RAISE EXCEPTION 'CARRY-INFRA-1 probe: deliberate post-COMMIT abort'; END $$;
```

**Read the result:**
- Row `1` present **and** the migration reported failure → the embedded `COMMIT` **did** commit, and
  post-`COMMIT` statements are outside it. Confirms the shape ICE relies on.
- Row `1` absent → the channel wrapped everything and rolled the whole script back, meaning the
  embedded `COMMIT` did **not** have its own effect. **That would invalidate the assumption** and
  every packet's assertion placement needs review.

### Test 2 — does a mid-script `RAISE` roll back an earlier write in the same embedded transaction?

This is the property ICE packets actually depend on.

```sql
BEGIN;
INSERT INTO zz_carry_infra_1.probe VALUES (2);
DO $$ BEGIN RAISE EXCEPTION 'CARRY-INFRA-1 probe: abort AFTER the write, BEFORE commit'; END $$;
COMMIT;
```

**Expected if the assumption holds:** the migration fails and row `2` is **absent** — the assertion
rolled back the write. **If row `2` is present, the assumption is FALSE and this is a finding of the
first order** for the whole programme, not just cc-0092.

### Test 3 — statement splitting

Confirm the channel did not execute statements individually: if it had, test 2's `INSERT` would have
committed on its own before the `DO` block ran.

### Cleanup

```sql
DROP SCHEMA IF EXISTS zz_carry_infra_1 CASCADE;
```

## Recording the outcome

Write a short result doc and cite it from `CLAUDE.md`'s deploy/DB gotchas so future packets reference
one proof instead of re-disclosing the gap. Record: the channel and its version, the exact scripts,
the observed row states, and the verdict per test.

**Until this is proven, the honest posture — the one cc-0092 adopted — is to disclose the assumption
in-artifact rather than assert it settled, and to place `BEGIN` first and `COMMIT` last so
assertion-to-write atomicity does not depend on the answer.**

## Related

- `docs/briefs/artifacts/cc-0092-apply-runbook-v1.md` — N10 channel naming
- `docs/briefs/apply-harness-auditor-registration-packet-v1.md` — the static counterpart
- `CLAUDE.md` — "Standing ICE deploy/DB gotchas"; `apply_migration` mints its own version
