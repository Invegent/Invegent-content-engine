# cc-0017c — §5.2 Migration SQL

**Brief version:** v1.1 (doc-only patch — Path A: drop `'done'` from backfill WHERE/CASE per D-01 verdict `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`)

**Migration name:** `cc_0017c_friction_register_lockdown_and_backfill` (unchanged from v1.0; SQL body updated in v1.1)

**Apply method:** Single `apply_migration` call via Supabase MCP (per L41 — apply_migration is the ONLY correct DDL path for friction.* schema given event-trigger registration in k.schema_registry).

**Atomicity:** All three sections (A + B + C) in one migration body. If any section fails, entire migration rolls back (PostgreSQL DDL transaction semantics).

---

## Section A — FK hardening on friction.event.source

**Goal:** Replace `event_source_check` CHECK constraint with FK to `friction.source(source_code)`.

**SQL:**
```sql
-- A.1 — Drop existing CHECK constraint
ALTER TABLE friction.event DROP CONSTRAINT event_source_check;

-- A.2 — Add FK constraint
ALTER TABLE friction.event
ADD CONSTRAINT event_source_fk
FOREIGN KEY (source)
REFERENCES friction.source(source_code);
```

**Notes:**
- Pattern mirrors existing `event_category_fkey` on `friction.event.category` (references `friction.category`).
- No `DEFERRABLE` clause — FK is immediate (matches `event_category_fkey` behaviour, NOT the `event_case_fk` deferrable pattern; case_id FK is deferrable to support attach-or-create trigger in cc-0017b).
- Other CHECKs on friction.event preserved: `event_category_source_check`, `event_reported_by_check`, `event_severity_check`.

---

## Section B — Direct-write lockdown via REVOKE

**Goal:** Remove direct-write capability on friction.event + friction.case from service_role. All writes route through SECURITY DEFINER functions (emit_event, and forthcoming Wave 0d triage/resolution functions).

**SQL:**
```sql
-- B.1 — REVOKE INSERT/UPDATE on friction.event from non-owner roles
REVOKE INSERT, UPDATE ON friction.event FROM service_role;
REVOKE INSERT, UPDATE ON friction.event FROM PUBLIC;
REVOKE INSERT, UPDATE ON friction.event FROM authenticated;
REVOKE INSERT, UPDATE ON friction.event FROM anon;

-- B.2 — REVOKE INSERT/UPDATE on friction.case from non-owner roles
REVOKE INSERT, UPDATE ON friction.case FROM service_role;
REVOKE INSERT, UPDATE ON friction.case FROM PUBLIC;
REVOKE INSERT, UPDATE ON friction.case FROM authenticated;
REVOKE INSERT, UPDATE ON friction.case FROM anon;

-- B.3 — Explicitly preserve SELECT on both tables for service_role
-- (No GRANT needed — SELECT was already granted and is not affected by INSERT/UPDATE REVOKE.
--  This comment block documents the intended preserved state.)
```

**Idempotent semantics:**
- REVOKE on a grant that doesn't exist is a successful no-op per PostgreSQL semantics.
- PUBLIC/authenticated/anon REVOKEs are defensive — current state has no grants to these roles (per Query 2 at v2.83 fact-finding), so REVOKEs are no-ops.
- service_role REVOKEs are the effective changes: removes INSERT on friction.event; removes INSERT+UPDATE on friction.case.

**Post-state expected (matches `risks-and-grants.md §4` post-lockdown matrix):**
- friction.event: postgres ALL, service_role SELECT only
- friction.case: postgres ALL, service_role SELECT only

---

## Section C — `resolved_at` / `resolution_kind` backfill (v1.1: legal-domain-only)

**Goal:** Encode the closure invariant — any case in closed-class `action_decision` must have `resolved_at` set and `resolution_kind` set.

**Empirical context:** 0 rows match WHERE clause at apply time (per Query 3 at v2.83 fact-finding). UPDATE is a forward-looking invariant assertion, not a data correction.

**v1.1 — Path A applied: legal-domain-only closed-class set.** Per D-01 verdict `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79` (verdict: partial, corrected_action: Option A) + PK directive 2026-05-18 Sydney late evening. Migration WHERE and CASE restricted to current legal `case_action_decision_check` domain values: `('suppress','ignore','duplicate')`. `'done'` is not currently legal under `case_action_decision_check` and is not in scope for cc-0017c. It would only be introduced via a future lifecycle-domain expansion (Amendment G nomenclature work + new brief), if such expansion is deemed needed.

**SQL:**
```sql
-- C.1 — Backfill resolved_at + resolution_kind for cases in current-legal closed-class action_decision (v1.1)
UPDATE friction.case
SET
  resolved_at = COALESCE(updated_at, created_at, now()),
  resolution_kind = CASE action_decision
    WHEN 'suppress'  THEN 'suppressed'
    WHEN 'ignore'    THEN 'ignored'
    WHEN 'duplicate' THEN 'duplicate'
  END
WHERE action_decision IN ('suppress','ignore','duplicate')
  AND resolved_at IS NULL;
```

**Notes:**
- `COALESCE(updated_at, created_at, now())` — prefer `updated_at` as resolution proxy; fall back to `created_at`; defensive fallback to `now()` (should not be reachable — friction.case has NOT NULL on created_at).
- `resolution_kind` mapping matches legal `case_resolution_kind_check` domain `(NULL OR 'acted_on'/'tracked_done'/'deferred_done'/'suppressed'/'ignored'/'duplicate'/'reopened')`.
- WHERE clause restricted to the three closed-class values currently legal under `case_action_decision_check`. `'done'` removed per Path A.
- All other CHECKs on friction.case preserved: `suppress_requires_reason`, `track_or_defer_requires_next_review`, `capture_reason_note_required_for_incrementality`, `quality_flag_requires_real_category`, `case_capture_reason_check`, `case_effort_level_check`, `case_severity_check`, `case_triage_state_check`.
- **Forward-looking concern:** `suppress_requires_reason` requires a non-NULL reason field. If a future case has `action_decision='suppress'` with NULL reason AND is backfilled by this UPDATE, the UPDATE would violate the existing CHECK and fail. At apply time, 0 rows match, so this is moot. Flagged for Wave 0d enforcement design.

---

## Combined migration body (apply order) — v1.1

Single atomic migration:

```sql
-- cc-0017c — Section A: FK hardening on friction.event.source
ALTER TABLE friction.event DROP CONSTRAINT event_source_check;
ALTER TABLE friction.event
ADD CONSTRAINT event_source_fk
FOREIGN KEY (source) REFERENCES friction.source(source_code);

-- cc-0017c — Section B: Direct-write lockdown via REVOKE
REVOKE INSERT, UPDATE ON friction.event FROM service_role;
REVOKE INSERT, UPDATE ON friction.event FROM PUBLIC;
REVOKE INSERT, UPDATE ON friction.event FROM authenticated;
REVOKE INSERT, UPDATE ON friction.event FROM anon;
REVOKE INSERT, UPDATE ON friction.case FROM service_role;
REVOKE INSERT, UPDATE ON friction.case FROM PUBLIC;
REVOKE INSERT, UPDATE ON friction.case FROM authenticated;
REVOKE INSERT, UPDATE ON friction.case FROM anon;

-- cc-0017c — Section C: Backfill resolved_at + resolution_kind (v1.1: legal-domain-only per Path A)
UPDATE friction.case
SET
  resolved_at = COALESCE(updated_at, created_at, now()),
  resolution_kind = CASE action_decision
    WHEN 'suppress'  THEN 'suppressed'
    WHEN 'ignore'    THEN 'ignored'
    WHEN 'duplicate' THEN 'duplicate'
  END
WHERE action_decision IN ('suppress','ignore','duplicate')
  AND resolved_at IS NULL;
```

**Migration version:** Auto-generated by Supabase MCP on apply (format `YYYYMMDDHHMMSS`).

**Expected apply outcome:**
- Section A: 1 constraint dropped + 1 FK added
- Section B: 8 REVOKE statements executed (2 effective on service_role; 6 no-op on PUBLIC/authenticated/anon)
- Section C: 0 rows affected (per P-3 expected value; v1.1 WHERE restricted to current legal domain)

**Total apply duration estimate:** < 200ms (DDL + small REVOKE block + 0-row UPDATE on 22-row table).
