# cc-0017d — §5.2 Migration SQL

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** [`preflight-pset.md`](preflight-pset.md) **Next:** [`vchecks.md`](vchecks.md)
**Section version:** v1.0.1 (v1.1 doc patch — addendum added at top documenting compile-fix substitutions applied at production apply)

---

**Migration name:** `cc_0017d_friction_case_mutation_functions`
**Apply via:** `apply_migration` MCP after D-01 approval + PK explicit approval.
**Atomicity:** single transaction. All 6 CREATE OR REPLACE FUNCTION statements + GRANTs + REVOKEs run together. All-or-nothing per PostgreSQL DDL semantics.
**Recommended timing:** outside 17:30 UTC ± 30 min (cron 85) and 02:00 UTC ± 30 min (cron 86) windows.

All 6 functions share these properties:
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = friction, public`
- Owner: `postgres` (implicit via apply_migration's role)
- `RETURNS TABLE` columns named with `out_` prefix to avoid name collision with `friction.case` columns (per cc-0017b corrective migration learning re ambiguity)

---

## v1.1 Addendum — Compile-fix substitutions applied at production apply

**Added 2026-05-19 Sydney evening (session v2.86, v1.1 doc patch). Doc-only.**

The v1.0 SQL below required two byte-level substitution classes to compile under PostgreSQL 15.x as deployed by Supabase. Both substitutions were applied **inline during the v2.86 production apply** (Path B-prime) and are present in the deployed migration `cc_0017d_friction_case_mutation_functions`. The v1.0 SQL below this addendum is **preserved as authored** for historical record — readers using this brief as a template for future briefs should apply both substitutions before any production apply attempt.

### Substitution class 1 — RAISE EXCEPTION format placeholders (`%%` → `%`)

**Defect:** PL/pgSQL `RAISE EXCEPTION` format strings use a single `%` as a positional placeholder for arguments listed after the format string. The v1.0 brief uses `%%` (the PL/pgSQL escape sequence for a literal percent sign inside `format()`-style function calls). Under `RAISE EXCEPTION`, `%%` emits a literal `%` character and does NOT consume a positional argument — so when the number of positional arguments supplied exceeds the number of `%` placeholders consumed, PostgreSQL raises `too many parameters specified for RAISE` at production apply.

**Affected sites:** **24 instances** across all 6 functions, in messages embedding `p_case_id`, `p_action_decision`, `p_effort_level`, `p_resolution_kind`, `v_current.resolved_at`, `v_current.action_decision`, `v_current.resolution_kind`, `p_predecessor_case_id`, and `p_pattern`.

**Substitution rule:** at every position where a positional argument is intended to be interpolated into a `RAISE EXCEPTION` format string, replace `%%` with `%`.

**Example (v1.0 → applied form):**
```sql
-- v1.0 as authored (rejects at apply):
RAISE EXCEPTION 'triage_case: p_action_decision %% is closure-class or invalid; accepted: act_now/track/defer_intentionally', p_action_decision
  USING ERRCODE = 'P0001';

-- applied form (deployed in cc_0017d_friction_case_mutation_functions):
RAISE EXCEPTION 'triage_case: p_action_decision % is closure-class or invalid; accepted: act_now/track/defer_intentionally', p_action_decision
  USING ERRCODE = 'P0001';
```

**Detection:** production `apply_migration` returns the parse error. A `BEGIN; <CREATE FUNCTION>; ROLLBACK;` transactional dry-run that does NOT invoke the function will compile-pass — the RAISE format string is only validated at RAISE-execution time, not at function-CREATE time. Captured as **L-v2.86-a (HIGH-SIGNAL)**.

### Substitution class 2 — Reserved SQL keyword in `%ROWTYPE` (quote `case`)

**Defect:** `case` is a reserved SQL keyword (SQL:2016 reserved word, also a flow-control keyword in PL/pgSQL). PostgreSQL's DML grammar accepts unquoted `friction.case` because the schema-qualified context disambiguates against the `CASE WHEN ...` flow-control form, but the PL/pgSQL DECLARE `%ROWTYPE` type-name grammar applies strict reserved-keyword parsing and requires the table-identifier portion to be double-quoted.

**Affected sites:** **6 instances** of `friction.case%ROWTYPE` in DECLARE blocks of `triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate` (×2: both `v_current` and `v_predecessor`), and `record_first_view`.

**Substitution rule:** at every DECLARE-block `%ROWTYPE` site, replace `friction.case%ROWTYPE` with `friction."case"%ROWTYPE`.

**Example (v1.0 → applied form):**
```sql
-- v1.0 as authored (rejects at apply):
DECLARE
  v_current               friction.case%ROWTYPE;
  v_effective_next_review timestamptz;

-- applied form (deployed):
DECLARE
  v_current               friction."case"%ROWTYPE;
  v_effective_next_review timestamptz;
```

**Detection:** production `apply_migration` returns `syntax error at or near "case"` pointing at the DECLARE line. Captured as **L-v2.86-c**.

### Production apply sequence (Path B-prime)

1. **Apply attempt 1** → fails on RAISE format (`too many parameters specified for RAISE`). Inline Round 1: 24 substitutions `%%` → `%` across the migration. Verified via transactional dry-run with a marker SELECT against one function body to force runtime PARSE of RAISE.
2. **Apply attempt 2** → fails on ROWTYPE quoting (`syntax error at or near "case"`). Inline Round 2: 6 substitutions `friction.case%ROWTYPE` → `friction."case"%ROWTYPE`. Same dry-run verification.
3. **Apply attempt 3** → success. All 6 functions deployed with byte-match signatures per main brief §3 / `vchecks.md` V-A1.

Both substitution classes were applied **inline before commit** rather than via a corrective follow-up migration, because the failed `apply_migration` calls did not persist any state (Postgres DDL transaction-atomic). The migration name `cc_0017d_friction_case_mutation_functions` therefore represents a single logical migration that succeeded on the third attempt with the substitutions present.

### Lesson: pre-apply discipline going forward (L-v2.86-a HIGH-SIGNAL)

Future briefs producing PL/pgSQL function bodies SHOULD include a pre-apply discipline that exercises the function bodies at runtime, not just at function-CREATE time. The plain `BEGIN; <CREATE FUNCTION>; ROLLBACK;` form parses the SQL and creates the function within the transaction, but does NOT exercise the inner RAISE format-string semantics or the ROWTYPE resolution paths that depend on reserved-keyword grammar.

**Recommended pre-apply check (transactional dry-run with marker invocation):**
```sql
BEGIN;
  -- 1. Apply the full migration body
  <full CREATE OR REPLACE FUNCTION ...> for all functions;

  -- 2. Force runtime exercise of at least one RAISE path per function
  DO $$
  BEGIN
    BEGIN
      PERFORM friction.triage_case(
        p_case_id := '00000000-0000-0000-0000-000000000000'::uuid,
        p_action_decision := 'act_now'
      );
    EXCEPTION WHEN OTHERS THEN NULL; -- swallow expected raise
    END;
    -- repeat for each function; expects clean RAISE not parse error
  END $$;

ROLLBACK;
```

This pattern would have caught both substitution classes before the first production apply attempt. Brief authors should bake an equivalent marker block into the brief's preflight P-set.

---

## Step 1 — `friction.triage_case`

```sql
CREATE OR REPLACE FUNCTION friction.triage_case(
  p_case_id          uuid,
  p_action_decision  text,
  p_actor            text  DEFAULT 'pk',
  p_effort_level     text  DEFAULT NULL,
  p_next_review_at   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  out_case_id         uuid,
  out_triaged_at      timestamptz,
  out_action_decision text,
  out_triage_state    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_current               friction.case%ROWTYPE;
  v_effective_next_review timestamptz;
BEGIN
  -- Param validation
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'triage_case: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_action_decision IS NULL THEN
    RAISE EXCEPTION 'triage_case: p_action_decision is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_action_decision NOT IN ('act_now','track','defer_intentionally') THEN
    RAISE EXCEPTION 'triage_case: p_action_decision %% is closure-class or invalid; accepted: act_now/track/defer_intentionally', p_action_decision
      USING ERRCODE = 'P0001',
            HINT    = 'For suppress/ignore/duplicate, use friction.resolve_case or friction.mark_duplicate.';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'triage_case: p_actor is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_effort_level IS NOT NULL AND p_effort_level NOT IN ('quick','moderate','deep') THEN
    RAISE EXCEPTION 'triage_case: p_effort_level %% invalid; legal: quick/moderate/deep or NULL', p_effort_level
      USING ERRCODE = 'P0001';
  END IF;

  -- Lock + load
  SELECT * INTO v_current FROM friction.case c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'triage_case: case_id %% not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'triage_case: case_id %% is resolved (resolved_at=%%); call friction.reopen_case first', p_case_id, v_current.resolved_at
      USING ERRCODE = 'P0001';
  END IF;

  -- Cross-column pre-validation: track_or_defer_requires_next_review
  v_effective_next_review := COALESCE(p_next_review_at, v_current.next_review_at);
  IF p_action_decision IN ('track','defer_intentionally') AND v_effective_next_review IS NULL THEN
    RAISE EXCEPTION 'triage_case: action_decision=%% requires next_review_at; current row NULL and no p_next_review_at supplied', p_action_decision
      USING ERRCODE = 'P0001',
            HINT    = 'Supply p_next_review_at on this triage call.';
  END IF;

  -- Apply
  UPDATE friction.case c
  SET
    action_decision = p_action_decision,
    triage_state    = CASE WHEN c.triage_state = 'new' THEN 'acknowledged' ELSE c.triage_state END,
    triaged_at      = COALESCE(c.triaged_at, now()),
    triaged_by      = COALESCE(c.triaged_by, p_actor),
    effort_level    = COALESCE(p_effort_level, c.effort_level),
    next_review_at  = COALESCE(p_next_review_at, c.next_review_at),
    reviewed_at     = now(),
    updated_at      = now()
  WHERE c.case_id = p_case_id;

  RETURN QUERY
    SELECT c.case_id, c.triaged_at, c.action_decision, c.triage_state
    FROM friction.case c
    WHERE c.case_id = p_case_id;
END
$function$;

COMMENT ON FUNCTION friction.triage_case(uuid, text, text, text, timestamptz) IS
  'Wave 0d operator triage entrypoint. Sets action_decision + triaged_at (first-only per Amendment C) + triaged_by (first-only) + triage_state (new→acknowledged) + effort_level + next_review_at + reviewed_at. Rejects closure-class action_decisions (suppress/ignore/duplicate); use friction.resolve_case or friction.mark_duplicate for those. Rejects resolved cases; call friction.reopen_case first. Coexists with legacy fn_triage_case; legacy retains broader signature.';
```

## Step 2 — `friction.resolve_case`

```sql
CREATE OR REPLACE FUNCTION friction.resolve_case(
  p_case_id          uuid,
  p_resolution_kind  text,
  p_actor            text  DEFAULT 'pk'
)
RETURNS TABLE (
  out_case_id         uuid,
  out_resolved_at     timestamptz,
  out_resolution_kind text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_current                  friction.case%ROWTYPE;
  v_expected_action_decision text;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'resolve_case: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_resolution_kind IS NULL THEN
    RAISE EXCEPTION 'resolve_case: p_resolution_kind is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_resolution_kind = 'reopened' THEN
    RAISE EXCEPTION 'resolve_case: p_resolution_kind=reopened is a transient marker, not a terminal resolution'
      USING ERRCODE = 'P0001',
            HINT    = 'Use acted_on/tracked_done/deferred_done/suppressed/ignored/duplicate.';
  END IF;
  IF p_resolution_kind NOT IN ('acted_on','tracked_done','deferred_done','suppressed','ignored','duplicate') THEN
    RAISE EXCEPTION 'resolve_case: p_resolution_kind %% is not a legal terminal resolution', p_resolution_kind
      USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'resolve_case: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction.case c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'resolve_case: case_id %% not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'resolve_case: case_id %% is already resolved (resolved_at=%%, resolution_kind=%%)',
      p_case_id, v_current.resolved_at, v_current.resolution_kind
      USING ERRCODE = 'P0001';
  END IF;

  -- Strict mapping resolution_kind ↔ action_decision
  v_expected_action_decision := CASE p_resolution_kind
    WHEN 'acted_on'      THEN 'act_now'
    WHEN 'tracked_done'  THEN 'track'
    WHEN 'deferred_done' THEN 'defer_intentionally'
    WHEN 'suppressed'    THEN 'suppress'
    WHEN 'ignored'       THEN 'ignore'
    WHEN 'duplicate'     THEN 'duplicate'
  END;

  IF v_current.action_decision IS DISTINCT FROM v_expected_action_decision THEN
    RAISE EXCEPTION 'resolve_case: resolution_kind=%% requires action_decision=%%, but case_id %% has action_decision=%%',
      p_resolution_kind, v_expected_action_decision, p_case_id, COALESCE(v_current.action_decision, 'NULL')
      USING ERRCODE = 'P0001',
            HINT    = 'Re-triage via friction.triage_case or fn_triage_case first. For duplicate, prefer friction.mark_duplicate.';
  END IF;

  UPDATE friction.case c
  SET
    resolved_at     = now(),
    resolution_kind = p_resolution_kind,
    updated_at      = now()
  WHERE c.case_id = p_case_id;

  RETURN QUERY
    SELECT c.case_id, c.resolved_at, c.resolution_kind
    FROM friction.case c
    WHERE c.case_id = p_case_id;
END
$function$;

COMMENT ON FUNCTION friction.resolve_case(uuid, text, text) IS
  'Wave 0d explicit case closure. Sets resolved_at + resolution_kind on an OPEN case. Strict mapping: resolution_kind must match action_decision (acted_on↔act_now, tracked_done↔track, deferred_done↔defer_intentionally, suppressed↔suppress, ignored↔ignore, duplicate↔duplicate). Rejects reopened as resolution_kind (transient marker). For duplicate, prefer friction.mark_duplicate.';
```

## Step 3 — `friction.reopen_case`

```sql
CREATE OR REPLACE FUNCTION friction.reopen_case(
  p_case_id               uuid,
  p_actor                 text     DEFAULT 'pk',
  p_clear_action_decision boolean  DEFAULT false
)
RETURNS TABLE (
  out_case_id               uuid,
  out_reopen_count          integer,
  out_prior_resolution_kind text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_current friction.case%ROWTYPE;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'reopen_case: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'reopen_case: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction.case c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reopen_case: case_id %% not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NULL THEN
    RAISE EXCEPTION 'reopen_case: case_id %% is already open (resolved_at IS NULL); nothing to reopen', p_case_id
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE friction.case c
  SET
    resolved_at     = NULL,
    resolution_kind = 'reopened',
    reopen_count    = c.reopen_count + 1,
    action_decision = CASE WHEN p_clear_action_decision THEN NULL ELSE c.action_decision END,
    updated_at      = now()
  WHERE c.case_id = p_case_id;

  out_case_id               := v_current.case_id;
  out_reopen_count          := v_current.reopen_count + 1;
  out_prior_resolution_kind := v_current.resolution_kind;
  RETURN NEXT;
END
$function$;

COMMENT ON FUNCTION friction.reopen_case(uuid, text, boolean) IS
  'Wave 0d operator-initiated reopen. Bypasses emit_event 14-day window check. Clears resolved_at, sets resolution_kind=reopened (transient marker), increments reopen_count. Optional p_clear_action_decision=true resets action_decision to NULL forcing fresh triage; default false preserves prior intent.';
```

## Step 4 — `friction.mark_duplicate`

```sql
CREATE OR REPLACE FUNCTION friction.mark_duplicate(
  p_case_id              uuid,
  p_predecessor_case_id  uuid,
  p_actor                text  DEFAULT 'pk'
)
RETURNS TABLE (
  out_case_id             uuid,
  out_predecessor_case_id uuid,
  out_resolved_at         timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_current     friction.case%ROWTYPE;
  v_predecessor friction.case%ROWTYPE;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'mark_duplicate: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_predecessor_case_id IS NULL THEN
    RAISE EXCEPTION 'mark_duplicate: p_predecessor_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_case_id = p_predecessor_case_id THEN
    RAISE EXCEPTION 'mark_duplicate: p_case_id and p_predecessor_case_id are identical (%%); no self-link', p_case_id
      USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'mark_duplicate: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction.case c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_duplicate: case_id %% not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'mark_duplicate: case_id %% is already resolved (resolved_at=%%)', p_case_id, v_current.resolved_at
      USING ERRCODE = 'P0001',
            HINT    = 'Reopen via friction.reopen_case first if you need to mark it duplicate.';
  END IF;

  SELECT * INTO v_predecessor FROM friction.case c WHERE c.case_id = p_predecessor_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_duplicate: predecessor_case_id %% not found', p_predecessor_case_id USING ERRCODE = 'P0002';
  END IF;

  -- Audit warning if fingerprints diverge (best-effort, never blocks)
  -- v1.1 note: this audit row is written under internal-prefix namespace
  -- 'cc-0017d/mark_duplicate/...' which is intentionally OUTSIDE the
  -- ^cc-[0-9]{4}[a-z]?-test/ regex that friction.purge_test_case enforces.
  -- V-check fixture cleanup that triggers this audit path requires a
  -- corrective pattern (see vchecks.md v1.1 Addendum, Drift 3).
  IF v_current.dedupe_fingerprint IS DISTINCT FROM v_predecessor.dedupe_fingerprint THEN
    BEGIN
      INSERT INTO friction.emit_error
        (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
      VALUES (
        'manual',
        'cc-0017d/mark_duplicate/' || p_case_id::text,
        format('mark_duplicate audit: cross-fingerprint duplicate. case=%s predecessor=%s case_fp=%s predecessor_fp=%s',
               p_case_id, p_predecessor_case_id,
               COALESCE(v_current.dedupe_fingerprint, 'NULL'),
               COALESCE(v_predecessor.dedupe_fingerprint, 'NULL')),
        'CROSS-FINGERPRINT-DUPLICATE',
        jsonb_build_object(
          'case_id', p_case_id,
          'predecessor_case_id', p_predecessor_case_id,
          'case_fingerprint', v_current.dedupe_fingerprint,
          'predecessor_fingerprint', v_predecessor.dedupe_fingerprint,
          'actor', p_actor
        ),
        'cc-0017d-v1.0'
      );
    EXCEPTION WHEN OTHERS THEN NULL;  -- audit best-effort
    END;
  END IF;

  UPDATE friction.case c
  SET
    predecessor_case_id = p_predecessor_case_id,
    triage_state        = 'duplicate',
    action_decision     = 'duplicate',
    resolution_kind     = 'duplicate',
    resolved_at         = now(),
    triaged_at          = COALESCE(c.triaged_at, now()),
    triaged_by          = COALESCE(c.triaged_by, p_actor),
    reviewed_at         = now(),
    updated_at          = now()
  WHERE c.case_id = p_case_id;

  RETURN QUERY
    SELECT c.case_id, c.predecessor_case_id, c.resolved_at
    FROM friction.case c
    WHERE c.case_id = p_case_id;
END
$function$;

COMMENT ON FUNCTION friction.mark_duplicate(uuid, uuid, text) IS
  'Wave 0d duplicate marker. Closes a case as duplicate of a predecessor: sets predecessor_case_id, triage_state=duplicate, action_decision=duplicate, resolution_kind=duplicate, resolved_at=now(). Cross-fingerprint dedupes allowed but logged to friction.emit_error as CROSS-FINGERPRINT-DUPLICATE under internal prefix cc-0017d/mark_duplicate/<case_id> for audit. Rejects self-link.';
```

## Step 5 — `friction.record_first_view`

```sql
CREATE OR REPLACE FUNCTION friction.record_first_view(
  p_case_id  uuid,
  p_actor    text  DEFAULT 'pk'
)
RETURNS TABLE (
  out_case_id            uuid,
  out_first_viewed_at    timestamptz,
  out_was_already_viewed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_current friction.case%ROWTYPE;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'record_first_view: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'record_first_view: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction.case c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'record_first_view: case_id %% not found', p_case_id USING ERRCODE = 'P0002';
  END IF;

  IF v_current.first_viewed_at IS NOT NULL THEN
    out_case_id            := v_current.case_id;
    out_first_viewed_at    := v_current.first_viewed_at;
    out_was_already_viewed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE friction.case c
  SET
    first_viewed_at = now(),
    updated_at      = now()
  WHERE c.case_id = p_case_id;

  SELECT c.first_viewed_at INTO out_first_viewed_at
  FROM friction.case c WHERE c.case_id = p_case_id;
  out_case_id            := p_case_id;
  out_was_already_viewed := false;
  RETURN NEXT;
END
$function$;

COMMENT ON FUNCTION friction.record_first_view(uuid, text) IS
  'Wave 0d idempotent first-view timestamp setter. Wave 7 UI callsite (/operations case-detail GET). Sets first_viewed_at=now() only if currently NULL; otherwise returns existing value with was_already_viewed=true. Works on open and resolved cases.';
```

## Step 6 — `friction.purge_test_case`

```sql
CREATE OR REPLACE FUNCTION friction.purge_test_case(
  p_pattern  text
)
RETURNS TABLE (
  out_events_deleted  integer,
  out_cases_deleted   integer,
  out_errors_deleted  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_events  integer;
  v_cases   integer;
  v_errors  integer;
BEGIN
  IF p_pattern IS NULL OR p_pattern !~ '^cc-[0-9]{4}[a-z]?-test/' THEN
    RAISE EXCEPTION 'purge_test_case: p_pattern must match ^cc-[0-9]{4}[a-z]?-test/ (e.g. cc-0017d-test/%%); got %%', p_pattern
      USING ERRCODE = 'P0001';
  END IF;

  WITH deleted_events AS (
    DELETE FROM friction.event
    WHERE observation_text LIKE p_pattern OR source_event_id LIKE p_pattern
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_events FROM deleted_events;

  WITH deleted_cases AS (
    DELETE FROM friction.case
    WHERE case_title LIKE p_pattern
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_cases FROM deleted_cases;

  WITH deleted_errors AS (
    DELETE FROM friction.emit_error
    WHERE source_event_id LIKE p_pattern
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_errors FROM deleted_errors;

  out_events_deleted := v_events;
  out_cases_deleted  := v_cases;
  out_errors_deleted := v_errors;
  RETURN NEXT;
END
$function$;

COMMENT ON FUNCTION friction.purge_test_case(text) IS
  'Wave 0d V-check cleanup helper (L-v2.85-d realised at v2.86). Postgres-owner DELETE on friction.event + friction.case + friction.emit_error rows matching a strict regex prefix pattern. Pattern MUST match ^cc-[0-9]{4}[a-z]?-test/ (e.g. cc-0017d-test/%, cc-0018-test/%). EXECUTE granted to service_role ONLY (reduced blast radius). Does NOT clean cross-fingerprint audit rows under internal prefix cc-NNNN[a-z]?/mark_duplicate/<case_id> — those require a separate corrective pattern targeting raw_payload::text. Future brief authors should use the slash-prefix convention for test data.';
```

## Step 7 — GRANTs + REVOKEs

```sql
-- Function 1: triage_case
REVOKE EXECUTE ON FUNCTION friction.triage_case(uuid, text, text, text, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.triage_case(uuid, text, text, text, timestamptz) TO service_role, authenticated;

-- Function 2: resolve_case
REVOKE EXECUTE ON FUNCTION friction.resolve_case(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.resolve_case(uuid, text, text) TO service_role, authenticated;

-- Function 3: reopen_case
REVOKE EXECUTE ON FUNCTION friction.reopen_case(uuid, text, boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.reopen_case(uuid, text, boolean) TO service_role, authenticated;

-- Function 4: mark_duplicate
REVOKE EXECUTE ON FUNCTION friction.mark_duplicate(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.mark_duplicate(uuid, uuid, text) TO service_role, authenticated;

-- Function 5: record_first_view
REVOKE EXECUTE ON FUNCTION friction.record_first_view(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.record_first_view(uuid, text) TO service_role, authenticated;

-- Function 6: purge_test_case (service_role only)
REVOKE EXECUTE ON FUNCTION friction.purge_test_case(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.purge_test_case(text) TO service_role;
```

---

**End of migration SQL.** All 6 functions + 6 grant blocks run atomically. **Apply only after applying both v1.1 Addendum substitution classes (RAISE `%%`→`%` and `friction.case%ROWTYPE`→`friction."case"%ROWTYPE`) to the v1.0 SQL above** — the deployed migration `cc_0017d_friction_case_mutation_functions` already incorporates both substitutions. Continue to [`vchecks.md`](vchecks.md).
