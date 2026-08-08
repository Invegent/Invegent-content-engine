# ICE Failure-Class Registry (v1)

> Companion to `operational-autonomy-principle-v1.md` §4 (OAP v1, ratified 2026-08-08).
> This file holds the **canonical failure-class names** used across all ICE workers and
> capability briefs. One vocabulary, shared: a brief either **reuses** an existing class
> below or **registers a new one here** — workers never invent private names for the same
> condition. Seeded lazily as capabilities adopt the Operational Contract; empty at
> ratification is the expected state.

## Entry format

```
### <failure_class_name>
- Meaning: <one-line condition description>
- Surfaced by: <worker/component + signal>
- Signal status: authoritative | inferred
- First registered: <date · brief/lane>
- Recovery candidate: <none | short description — grants nothing (OAP §2 layer 4)>
```

## Registered classes

_None yet — seeded lazily per OAP v1 §4._
