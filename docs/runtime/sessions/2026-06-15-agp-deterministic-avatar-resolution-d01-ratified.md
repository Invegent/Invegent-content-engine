# AGP — D-01 #1 Deterministic Avatar Resolution: Design Ratified

**Date:** 2026-06-15 Sydney
**Register:** v3.56
**Lane:** AVATAR-GOVERNANCE-PLANNING (Branch B readiness, P3, planning-only)
**Gate:** D-01 #1 (Deterministic Avatar Resolution)
**Status:** DESIGN DIRECTION RATIFIED BY PK
**Branch B implementation:** NOT AUTHORISED
**Authority impact:** none.
**Footprint:** 0 code / 0 DB write / 0 schema / 0 migration / 0 deploy / 0 avatar activation / 0 lookupAvatar change.

## What was ratified

- D-01 #1 design direction ratified by PK.
- External review `75b1ef94` escalated but resolved by PK.
- No strong objection blocked ratification.
- The empirical concern raised in review was accepted and assigned to D-01 #3 (shadow proof), not treated as a blocker.

## Ratified design direction

- Meaningful priority/default semantics for avatar selection.
- `brand_avatar_id` ASC is a final tiebreaker only (never the primary selector).
- The A2 pin stays active throughout.
- Shadow-first rollout.
- 100% parity + 0 drift against the live A2-pinned path required before any cutover.

## Not authorised

Schema, migration, code, deploy, avatar activation, `lookupAvatar` change, and Branch B implementation are all NOT authorised by this ratification — this closes a design gate only.

## Gate map

- #1 Deterministic Resolution — RATIFIED / CLOSED.
- #2 Schema decision — PENDING.
- #3 Shadow proof — PENDING.
- #4 Cutover — BLOCKED (gated on #2 + #3 and the 100% parity / 0 drift bar).
