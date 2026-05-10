# Addendum — cc-0009

**Brief reference:** `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` (FROZEN at v2.1, commit `ae301a923de07e5ff796349a889b7a8e730c8a80`)
**Governing process:** [ICE-PROC-001](../../process/ICE-PROC-001-patch-severity.md)
**Created:** 2026-05-10 Sydney
**Status:** Active

---

## Purpose

This addendum supersedes specific wording in the core brief listed above for all redlines that arose after the brief was frozen and require governing interpretation at apply time. The core brief remains the structural reference; **this addendum governs interpretation at apply time wherever they conflict** (per ICE-PROC-001 §4.1).

For redlines that do NOT supersede wording (S3 wording-only logs), see `docs/briefs/redlines/cc-0009-redlines.md`.

---

## How to use this file

- One block per redline.
- Append new redlines at the end; do not rewrite existing entries.
- An entry that has been replaced by a later decision goes to status `Superseded` (with reference to the superseding ID).
- An entry withdrawn by PK goes to status `Withdrawn` (with reason).
- Active entries are authoritative.

---

## Redlines

### R15 — Physical schema existence vs registry existence

- **Severity:** S3 (per PK CCH directive 2026-05-10; see classification note below)
- **Date:** 2026-05-10 Sydney
- **Source:** PK CCH directive 2026-05-10 (cc-0009 freeze under ICE-PROC-001)
- **Issue:** Schema registry existence and physical Postgres schema existence were previously discussed interchangeably in the core brief's Stage A wording (notably in Lineage predicate 5, §1.1 schema readiness, and §1.2 registry status sections).
- **Decision:**
  - **Physical schema existence** is verified via `information_schema.schemata`. This answers: does the Postgres schema `r` physically exist?
  - **Registry existence** is verified separately via `k.schema_registry`. This answers: is schema `r` registered in ICE metadata?
  - The two concepts are **independent**. They are NOT interchangeable.
  - `schema_r_exists` may be either `true` or `false` prior to Stage A. **Both states are acceptable** under `CREATE SCHEMA IF NOT EXISTS r` (CCH R12 lock).
  - The trigger `trg_k_registry_sync_on_create_table` requires registry presence to fire correctly on `CREATE TABLE r.*`; physical schema presence is handled idempotently by the `IF NOT EXISTS` clause. The two checks at §1.1 (physical) and §1.2 (registry) are independent and must both PASS by their own decision rules.
- **Effect:** This addendum governs any conflicting narrative wording in the core brief. Where the core brief implies the two concepts are interchangeable, the operator MUST treat them as independent per the decision above. Stage A pre-flight reports both states separately in the result file.
- **Status:** Active

**Classification note (severity routing):** PK directive 2026-05-10 tagged R15 as severity **S3** AND placed it in both the addendum and the redline register. Per ICE-PROC-001 §4.2, S3 entries normally route only to the redline register; per §4.1, addenda are the home for S2 entries that supersede wording. R15 is dual-routed under PK explicit direction: the addendum entry establishes governing interpretation at apply time (which is functionally an S2 effect); the redline register entry (`docs/briefs/redlines/cc-0009-redlines.md`) cross-references this addendum. The classification ambiguity (S3 governance vs S2 supersession) is flagged for PK awareness; tiebreak rules in ICE-PROC-001 §3 would default S2-vs-S3 ambiguities to S3, but PK's explicit dual-route placement is the authoritative resolution for R15.

---

<!-- Append additional redline blocks below this line, in order of arrival. -->
