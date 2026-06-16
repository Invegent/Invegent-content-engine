# AGP — D-01 #2 Schema Direction: Ratified

**Date:** 2026-06-16 Sydney
**Register:** v3.57
**Lane:** AVATAR-GOVERNANCE-PLANNING (Branch B readiness, P3, planning-only)
**Gate:** D-01 #2 (Schema direction)
**Status:** SCHEMA DIRECTION RATIFIED BY PK
**Branch B implementation:** NOT AUTHORISED
**Authority impact:** none.
**Footprint:** 0 code / 0 DB write / 0 migration / 0 column / 0 index / 0 backfill / 0 resolver / 0 avatar activation.

## What was ratified

- Adopt two booleans on `c.brand_avatar`:
  - `is_primary` — supports `role_exact` selection.
  - `is_default_host` — supports `default_host` fallback.
- Intended shape: `NOT NULL DEFAULT false` for both.
- Partial unique guards:
  - `is_primary`: one primary per `stakeholder_id` + `render_style`.
  - `is_default_host`: one default host per `client_id` + `render_style`.
- `brand_avatar_id` ASC remains the final technical tiebreaker only.
- The markers are preferences among ELIGIBLE rows only.
- Eligibility remains separate and unchanged: `is_active`, consent, `heygen_avatar_id` / renderability, `render_style`.

## Rejected for now

- Integer `priority` column — accepted only as a future-compatible option if evidence later warrants; not adopted now.
- Mapping table — rejected as over-engineered for the current grain.

## Review

- Review id: `abcf77cb-22ff-4c6c-bce7-3dd20502d179`.
- Result: escalated — partial / medium / medium.
- Resolved by: PK, at 2026-06-16 00:49 UTC.
- No strong objection blocked ratification.
- Integer-priority concern accepted as future-compatible, not a blocker.
- Backfill-correctness concern assigned to D-01 #3 (shadow parity proof).
- Direction-vs-execution confusion noted.

## Not authorised

No migration, no column add, no index, no backfill, no resolver change, no avatar activation, and no Branch B implementation. This closes a design (direction) gate only. **When the D-01 #2-migration sub-gate is later authorised, all DDL MUST be applied via `apply_migration` only.**

## Gate map

- #1 Deterministic Resolution — CLOSED.
- #2 Schema direction — CLOSED.
- #2-migration — PENDING (the next gated item).
- #3 Shadow proof — PENDING.
- #4 Cutover — BLOCKED.
