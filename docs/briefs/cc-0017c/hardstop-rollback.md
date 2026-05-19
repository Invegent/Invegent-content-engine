# cc-0017c — §5.4 Hard-stop matrix + §5.5 Rollback bodies

**Brief version:** v1.1 (doc-only patch — §5.5-C snapshot WHERE clause aligned to v1.1 migration body: `IN ('suppress','ignore','duplicate')`)

## §5.4 Hard-stop matrix

| Trigger | Condition | Response |
|---|---|---|
| §5.4-A1 | P-set drift between brief-authoring (v2.83 reference) and apply-time | Pause; surface drift to PK; await explicit redirect |
| §5.4-A2 | P-2 FK validity probe returns any `FK_VIOLATION_ORPHAN` row | Hard-stop; do not apply migration; PK decision required |
| §5.4-A3 | P-3 backfill candidate count > 0 unexpectedly | Pause; surface to PK; redirect options: (a) proceed with non-zero count, (b) author resolution mapping for those rows, (c) defer |
| §5.4-A3b | **P-3 `done_count_audit` > 0 (v1.1 NEW)** | Hard-stop; external CHECK domain expansion landed between brief authoring and apply; PK redirect required (may need to revert to Option C with documented rationale OR add `'done'` to migration body) |
| §5.4-A4 | P-5 CHECK constraint definition diverges from expected | Pause; surface to PK; check for parallel-session schema change |
| §5.4-A5 | P-4 total_source_count > 3 OR active_source_count < 3 | Pause; new source seed or deactivation needs FK handling; PK decision |
| §5.4-B1 | apply_migration returns error | Migration rolled back by Postgres transaction semantics; pause; diagnose; surface to PK |
| §5.4-C1 | V-A1 fails (CHECK still present) | Migration did not apply cleanly; investigate before re-attempt |
| §5.4-C2 | V-A2 fails (FK absent) | Migration did not apply cleanly; investigate before re-attempt |
| §5.4-C3 | V-A3 FAILED (not PARTIAL) — invalid source insert succeeded with postgres ownership | FK not enforcing; hard-stop; full rollback per §5.5-FULL |
| §5.4-C4 | V-B1 or V-B2 fails (grants still present) | REVOKE did not bite; hard-stop; investigate role escalation paths |
| §5.4-C5 | V-B3 fails (SELECT lost unexpectedly) | Over-revoked; restore SELECT immediately per §5.5-B-emergency |
| §5.4-C6 | V-B4 fails (emit_event broken) | CRITICAL; hard-stop; full rollback per §5.5-FULL; surface to PK immediately |
| §5.4-C7 | V-C1 fails (rows in unresolved closed-class state post-apply) | Backfill did not bite; investigate WHERE clause; may need targeted re-run |
| §5.4-C8 | V-C2 fails (NULL/act_now/track row count changed) | Hard-stop; UPDATE affected unintended rows; investigate before any further action |

## §5.5 Rollback bodies

**Rollback uses captured P-set output (P-1 grants snapshot, P-5 CHECK definition) — NOT the design-time references in this brief.**

### §5.5-A — Section A rollback (FK swap revert)

```sql
-- A-rollback.1 — Drop the FK
ALTER TABLE friction.event DROP CONSTRAINT event_source_fk;

-- A-rollback.2 — Re-add original CHECK (from P-5 capture)
ALTER TABLE friction.event
ADD CONSTRAINT event_source_check
CHECK ((source = ANY (ARRAY['reconciliation'::text, 'health_check'::text, 'manual'::text])));
```

**Verification post-rollback:**
```sql
SELECT pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'friction' AND cls.relname = 'event'
AND con.conname = 'event_source_check';
-- Expected: CHECK ((source = ANY (ARRAY['reconciliation'::text, 'health_check'::text, 'manual'::text])))
```

### §5.5-B — Section B rollback (REVOKE revert via GRANT)

**Uses P-1 captured grant snapshot. Below is the design-time reference body — use P-1 JSON for exact restoration if grants differed at apply time.**

```sql
-- B-rollback.1 — Restore service_role grants on friction.event
GRANT INSERT ON friction.event TO service_role;
-- (service_role already had SELECT — not affected by REVOKE)

-- B-rollback.2 — Restore service_role grants on friction.case
GRANT INSERT, UPDATE ON friction.case TO service_role;
-- (service_role already had SELECT — not affected by REVOKE)
```

**Note:** PUBLIC/authenticated/anon GRANTs are NOT restored — they were never present (per P-1 capture). Restoring them would create a state divergent from pre-apply baseline.

### §5.5-B-emergency — Restore SELECT if over-revoked (V-B3 failure)

```sql
-- Emergency: restore SELECT if accidentally revoked
GRANT SELECT ON friction.event TO service_role;
GRANT SELECT ON friction.case TO service_role;
```

### §5.5-C — Section C rollback (backfill reverse) — v1.1: legal-domain-only

**Empirical context:** Backfill UPDATE affects 0 rows at apply time (per P-3). Reverse is a no-op if 0 rows were affected.

**If apply-time P-3 showed N > 0 rows backfilled:** Reverse is destructive (sets resolved_at + resolution_kind back to NULL). Must capture pre-update state via dedicated SELECT into temp table BEFORE Section C apply, then UPDATE-reverse using that snapshot.

```sql
-- C-rollback.1 — Pre-apply snapshot (executed IMMEDIATELY before Section C apply, NOT at rollback time) — v1.1: legal-domain-only
CREATE TEMP TABLE _cc0017c_backfill_pre_state AS
SELECT case_id, resolved_at AS pre_resolved_at, resolution_kind AS pre_resolution_kind
FROM friction.case
WHERE action_decision IN ('suppress','ignore','duplicate')
  AND resolved_at IS NULL;

-- C-rollback.2 — Reverse using snapshot (executed at rollback time)
UPDATE friction.case c
SET
  resolved_at = pre.pre_resolved_at,
  resolution_kind = pre.pre_resolution_kind
FROM _cc0017c_backfill_pre_state pre
WHERE c.case_id = pre.case_id;

DROP TABLE _cc0017c_backfill_pre_state;
```

**Hardstop note:** With P-3 expected = 0 at apply time, Section C is a no-op and rollback is trivially a no-op. Pre-apply snapshot still captured defensively. If P-3 > 0 at apply time, hard-stop §5.4-A3 fires BEFORE Section C executes — rollback path not reached.

**PostgreSQL DDL transaction semantics:** apply_migration is atomic — if any step fails, all roll back automatically. Manual Section C rollback is only needed in the rare case where apply succeeded but post-apply V-checks revealed an unrecoverable issue requiring full reversal.

### §5.5-FULL — Full migration rollback (all three sections)

Execute in reverse order: C-rollback → B-rollback → A-rollback. Verify with full V-check rerun.

```sql
-- 1. Section C reverse (no-op if P-3 = 0 at apply; uses pre-apply snapshot if P-3 > 0; v1.1: legal-domain-only)
-- (See §5.5-C body above)

-- 2. Section B reverse
GRANT INSERT ON friction.event TO service_role;
GRANT INSERT, UPDATE ON friction.case TO service_role;

-- 3. Section A reverse
ALTER TABLE friction.event DROP CONSTRAINT event_source_fk;
ALTER TABLE friction.event
ADD CONSTRAINT event_source_check
CHECK ((source = ANY (ARRAY['reconciliation'::text, 'health_check'::text, 'manual'::text])));
```

**Verification post-full-rollback:**
1. P-1 rerun → grants match pre-apply snapshot
2. P-2 rerun → 22 events still FK_VALID (constraint dropped — probe now joins against friction.source but no FK enforced; all source values still map cleanly)
3. P-3 rerun → backfill_candidate_count matches pre-apply P-3 value (0)
4. P-5 rerun → CHECK constraint definition matches captured definition
5. Re-run V-B4 (emit_event end-to-end) → should still PASS (emit_event behaviour unaffected by rollback of FK/REVOKE/backfill)

## §5.6 Rollback decision tree

```
Failure detected?
├── Pre-flight P-set drift → §5.4-A1 to A5 (incl. A3b done_count_audit) → STOP before apply
├── apply_migration error → Postgres auto-rollback → §5.4-B1 → diagnose
├── V-A failure → Section A only revert → §5.5-A
├── V-B failure (over-revoke V-B3) → §5.5-B-emergency only (no Section A revert)
├── V-B failure (other) → §5.5-B revert + verify Section A unaffected
├── V-B4 FAILED (emit_event broken) → CRITICAL → §5.5-FULL
├── V-C failure → §5.5-C revert + verify Sections A + B unaffected
└── Multiple V-failures → §5.5-FULL
```
