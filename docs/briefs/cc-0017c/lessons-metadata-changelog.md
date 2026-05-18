# cc-0017c — §9 Lessons + §10 Metadata + §11 Changelog

## §9 Lessons applicable

### Active baseline lessons used in this brief

- **L41** — `apply_migration` is the only correct DDL path for friction.* schema (event-trigger registration in k.schema_registry). Migration SQL §5.2 specifies apply_migration as the apply method.
- **L58** — atomic multi-file push_files for 4-way sync close. Used at v2.83 close (3-file commit, with 1-file payload defect recovery noted). Will be used again for cc-0017c apply close (separate commit).
- **L62** — Pre-flight P-set + D-01 fire + post-apply V-checks + close-the-loop UPDATE. Full protocol applied throughout this brief.
- **L34** — Trigger filter audit on DDL in event-trigger-registered schemas. Pre-flight P-set is the trigger pre-flight survey.
- **L40** — Runtime probes are authoritative; TypeScript / brief-time references are non-authoritative. P-1 through P-5 are runtime probes; brief-time §4 grant matrix is design reference only.
- **L33** — Event trigger pre-flight survey mandatory for DDL in `k.schema_registry`-registered schemas. friction.* is registered; survey conducted via P-set.
- **L35** — `INSERT ... ON CONFLICT DO UPDATE` defensive pattern for `k.*` registry rows. Not directly exercised this brief (no k.* writes), but registered for future migrations affecting k.schema_registry.
- **ICE-PROC-001** — Patch severity/discipline framework. cc-0017c rated **HIGH severity** (production schema change + permission change + data UPDATE in single migration). Discipline: full P-set + D-01 + 9 V-checks + atomic rollback + close-the-loop.

### Candidate lessons re-exercised by this brief authoring

- **L-v2.81-a** (2 occurrences at v2.83) — parallel-session coordination risk. cc-0017c apply session must check for parallel-session schema changes before apply (pre-flight P-set rerun is the gate). Brief authoring this session does NOT re-exercise L-v2.81-a (no production mutation). Will be re-exercised if a parallel session lands schema change between v2.84 brief commit and cc-0017c apply.
- **L-v2.83-a candidate** (1 occurrence at v2.83) — push_files response file-count verification (dual of L47). Will be re-exercised at cc-0017c brief commit (this commit — 8-file push_files; verify post-call that all 8 landed) AND at cc-0017c apply close commit. NOT yet promoted.
- **L47 candidate** (1 occurrence) — push-failure-with-dropped-ack pattern. Watching for recurrence at cc-0017c brief commit and apply close.

### New lesson candidates from cc-0017c brief authoring

- **L-v2.84-a candidate** — Empirical-finding precedence over idealised plan framing. When fact-finding probes diverge from pre-signed plan amendments (e.g., Amendment F's PUBLIC/authenticated/anon REVOKE framing vs Query 2 showing no such grants exist; Amendment G's `'done'` action_decision vs CHECK domain restriction), brief MUST surface divergence explicitly and offer named options (A/B/C with rationale) rather than silently choose. **First occurrence:** this brief, `risks-and-grants.md §3.4` and `§3.5`. Not yet candidate-promoted — pending observation of recurrence pattern.
- **L-v2.84-b candidate** — Defensive idempotent REVOKE/GRANT for permission migrations. REVOKE statements on roles with no existing grant are no-ops in PostgreSQL; including them defensively (e.g., PUBLIC + authenticated + anon alongside the effective service_role REVOKE) provides forward protection if grants are added by a future migration. **First occurrence:** this brief, `migration-sql.md §5.2 Section B`. Not yet candidate-promoted.

## §10 Metadata

| Field | Value |
|---|---|
| Brief ID | cc-0017c |
| Wave | 0c (friction.* foundational consolidation, third wave) |
| Brief version | v1.0 |
| Parent strategic anchor | Friction Register Consolidation Plan v1 (signed v2.79) + Amendments F + G |
| Predecessor briefs | cc-0017a (Wave 0a — schema foundation, APPLIED v2.81); cc-0017b (Wave 0b — unified emit_event, APPLIED-WITH-CORRECTIVE-MIGRATION v2.82 + v1.1 doc patch v2.83) |
| Successor briefs (anticipated) | Wave 0d (triage/resolution SECURITY DEFINER functions); Wave 0e (audit history shadow tables) |
| Brief authoring session | v2.84 (Sydney late evening 2026-05-18) |
| Brief commit | [TBD on push — single atomic push_files commit] |
| D-01 review_id | [TBD on fire — gated on PK explicit authorisation] |
| Apply migration name | `cc_0017c_friction_register_lockdown_and_backfill` |
| Apply migration version | [TBD on apply — Supabase MCP auto-generates `YYYYMMDDHHMMSS`] |
| Expected V-check pass count | 9/9 (or 8/9 with V-A3 PARTIAL acceptable) |
| Expected backfill rows affected | 0 (per P-3 v2.83 fact-finding) |
| Production state at brief authoring | 22 events / 22 cases / 3 source seeds |
| T-MCP-02 quota impact | +0 this brief commit; +1 at D-01 fire (cum 73 → 74); +0 at apply (close-the-loop UPDATE doesn't increment) |
| Patch severity | HIGH (per ICE-PROC-001) |
| Atomicity | Single apply_migration; Postgres DDL transaction semantics |

## §11 Changelog

### v1.0 (2026-05-18 Sydney late evening, v2.84)

- Initial authoring per PK 4-item directive (verbatim) at v2.83 session close.
- 8 sub-files following cc-0017b precedent (index + 7 sub-files).
- Pre-flight P-set: 5 P-steps capturing grants JSON, FK validity, backfill candidate count, baseline counts, CHECK definition.
- Migration SQL: 3 sections (FK swap + REVOKE lockdown + backfill UPDATE) in single atomic apply_migration.
- V-checks: 9 total (3 for Section A, 4 for Section B, 2 for Section C).
- Hard-stop matrix: 14 trigger conditions across pre-flight, apply, and V-check phases.
- Rollback bodies: per-section + full migration reverse + emergency over-revoke restore.
- D-01 evidence package: full payload spec with explicit weak-evidence disclosure across 6 items (Option C `'done'` mapping; Amendment F PUBLIC/authenticated/anon defensive framing; 0-row backfill at apply time; L-v2.81-a parallel-session risk; Wave 0d gate; V-A3 enforcement test caveat).
- Out-of-scope: 10 items explicitly carried.
- Lessons: 8 active baseline applied; 3 candidates re-exercised observed; 2 new candidates (L-v2.84-a empirical-precedence + L-v2.84-b defensive-idempotent-permissions).

**No production mutations in this brief commit.** No D-01 fire. No apply. Gated on explicit PK authorisation per v2.83 session directive.

---

*Brief authoring complete v1.0. Status: AUTHORED_PENDING_D01. Next gate: PK explicit authorisation to fire D-01 with verbatim P-set capture at fire time.*
