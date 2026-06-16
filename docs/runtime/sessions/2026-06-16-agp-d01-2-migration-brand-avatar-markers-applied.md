# AGP — D-01 #2-Migration (brand_avatar priority/default markers): Applied & Verified

**Date:** 2026-06-16 Sydney
**Register:** v3.58
**Lane:** AVATAR-GOVERNANCE-PLANNING (Branch B readiness, P3, planning-only)
**Gate:** D-01 #2-migration
**Status:** APPLIED & VERIFIED
**Branch B implementation:** NOT AUTHORISED
**Authority impact:** none (additive dormant metadata; selection inert).

## Migration

- Name: `agp_d01_2_migration_brand_avatar_priority_default_markers`
- Version: `20260616015419`
- Apply method: Supabase MCP `apply_migration` only (no repo SQL commit).
- Added to `c.brand_avatar`: `is_primary` and `is_default_host` (boolean, NOT NULL, DEFAULT false).
- Indexes: `uq_brand_avatar_primary_per_role_style` UNIQUE (stakeholder_id, render_style) WHERE is_primary; `uq_brand_avatar_default_host_per_client_style` UNIQUE (client_id, render_style) WHERE is_default_host.

## Review

- Review id: `bebea250-639a-43cc-9092-495ff7503e96`.
- Result: agree / low risk / high confidence / proceed.
- Resolution: non-escalated; provenance recorded; resolved_by = PK.
- PK phrase: "PK APPROVES AGP D-01 #2-MIGRATION BRAND_AVATAR PRIORITY/DEFAULT MARKERS APPLY".

## Verification (db-rls-auditor, read-only)

- Migration present (version 20260616015419).
- Columns `is_primary` / `is_default_host`: boolean, NOT NULL, DEFAULT false.
- Both partial unique indexes present with correct predicates.
- No backfill: primaries = 0, default_hosts = 0, total_rows = 28; all markers false.
- No resolver change; no avatar activation; selection remains inert.

## Notes

- D-01 #2-migration applied and verified.
- Migration added dormant metadata only.
- No backfill was performed.
- A2 pin still drives selection.
- D-01 #3 shadow resolver + telemetry is next.
- D-01 #4 cutover remains blocked.
- Branch B remains NOT AUTHORISED.

## Gate map

- #1 Deterministic Resolution — CLOSED.
- #2 Schema direction — CLOSED.
- #2-migration — APPLIED / VERIFIED.
- #3 Shadow resolver + telemetry — PENDING (next).
- #4 Cutover — BLOCKED.
