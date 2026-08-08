# PK Intervention Log

> Operator-side half of the OAP v1 evidence dataset (`docs/governance/operational-autonomy-principle-v1.md` §7;
> ratified v6.176). One line per event where ICE cost PK attention, appended at the time it happens.
> The machine-side half is AR v1 (`_harness/assurance_routine/`, first fire 2026-08-12 08:00 Sydney).
> Joined ~Sep 2026 to rank recurring investigation/repair classes and elect RP-001.

## Buckets

- **investigation** — ICE couldn't tell PK reality; PK had to establish what actually happened.
- **repair** — reality was known; PK had to restore it.
- **decision** — legitimate authority boundary (policy / creative / business). Not a defect; never targeted to zero.

## Rules

- One line per intervention, appended immediately (accuracy of minutes matters less than capturing the event).
- `failure_class`: use a name from `docs/governance/failure-classes-v1.md` if one fits; otherwise a short
  provisional name — recurring provisional names are themselves a signal to register the class.
- Append-only; never rewrite past entries. Corrections get a new line.

## Format

```
| date | bucket | ~min | failure_class | note |
```

## Entries

| date | bucket | ~min | failure_class | note |
|------|--------|------|---------------|------|
