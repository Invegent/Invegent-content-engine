# cc-0017e v1.0 — Migration SQL

**Status:** AUTHORED-PENDING-APPLY. Not applied at v2.88.
**Parent brief:** `docs/briefs/cc-0017e-friction-case-history-and-compat.md`
**Migration name (proposed):** `cc_0017e_friction_case_history_and_compat`

All SQL below is authored content, NOT applied. Apply happens in a future session with fresh D-01 fire and full preflight P-set.

---

## L-v2.86-a pre-apply discipline (HIGH-SIGNAL)

Before running `apply_migration` with the real payload, run a transactional EXEC harness against the same SQL inside a marker `PERFORM` block in a throwaway transaction. Substitution-class drift (RAISE `%%`→`%`, ROWTYPE quoting, reserved-keyword traps) surfaces as a parse-time failure inside the harness, NOT as a partial-apply at production time.

Harness pattern:
```sql
DO $harness$
BEGIN
  PERFORM 1; -- marker
  -- Then EXECUTE the migration SQL inline via dynamic SQL string,
  -- wrapped in ROLLBACK at the end. Any syntax error aborts here.
  RAISE EXCEPTION 'harness_rollback' USING ERRCODE = 'P0001';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'harness_rollback' THEN
    RAISE NOTICE 'cc-0017e harness: parse OK, rolled back as expected';
  ELSE
    RAISE;
  END IF;
END $harness$;
```

Apply the harness BEFORE the real `apply_migration` call. If the harness fails, the migration SQL has a substitution-class drift — fix at brief level before re-applying. Documented per cc-0017d v1.1 Addendum.

**v1.1 doc-patch note (L-v2.86-a scope clarification):** the harness catches substitution-class drift only. Value-class defects (CHECK / FK value violations), schema-resolution defects (`CREATE OR REPLACE` arity-change overload semantics — see §2 below), helper coverage gaps, and phantom-column references in close-the-loop templates are OUTSIDE the harness scope. v2.90 apply surfaced 5 brief defects of these other classes. The harness is necessary but not sufficient.

---

## Apply ordering (mandatory)

1. **DDL:** create `friction.case_history` + grants + index
2. **Function patch:** `fn_triage_case` — **DROP legacy 10-arg signature first**, then CREATE OR REPLACE 11-arg refactored body (see §2 v1.1 doc-patch note for the schema-resolution rationale)
3. **Function patches (5 cc-0017d mutation functions):** `triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view` (signatures byte-stable — no DROP needed)
4. **Backfill:** single CTE statement, 8 rows expected
5. **COMMENT statements**

Reverse-ordering creates "function references table that doesn't exist" windows. Forward-only.

---

## Section 1 — case_history DDL + grants

```sql
-- ============================================================
-- Section 1: friction.case_history shadow table
-- ============================================================

CREATE TABLE friction.case_history (
  history_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  changed_by    text NOT NULL,
  change_kind   text NOT NULL,
  before_row    jsonb,
  after_row     jsonb,
  CONSTRAINT case_history_case_id_fk
    FOREIGN KEY (case_id) REFERENCES friction."case"(case_id) ON DELETE RESTRICT,
  CONSTRAINT case_history_change_kind_chk
    CHECK (change_kind IN (
      'triage',
      'resolve',
      'reopen',
      'mark_duplicate',
      'first_view',
      'compat_legacy_triage',
      'backfill'
    ))
);

CREATE INDEX case_history_case_id_changed_at_idx
  ON friction.case_history (case_id, changed_at DESC);

-- Grants — cc-0017c lockdown pattern
REVOKE ALL ON friction.case_history FROM PUBLIC;
REVOKE ALL ON friction.case_history FROM authenticated;
REVOKE ALL ON friction.case_history FROM anon;
GRANT  SELECT ON friction.case_history TO service_role;
-- No INSERT/UPDATE/DELETE grants: all writes via SECURITY DEFINER functions
```

---

## Section 2 — fn_triage_case patched body

**v1.1 doc-patch correction (Defect 3 / L-v2.90-b):**

The v1.0 framing characterised the change as "signature-compatible — existing callers unaffected" because the new 11th argument `p_actor text DEFAULT NULL` allows existing callers passing 10 args (positional or named) to resolve cleanly via the DEFAULT.

**This was wrong at the schema-resolution level.** Two distinctions are required:

1. **Call-resolution compatibility (PRESERVED by DEFAULT NULL):** any caller passing 10 args positionally OR using named-argument syntax resolves to a function with the new 11-arg signature without changing call sites.
2. **Schema-resolution compatibility (BROKEN by arity change):** PostgreSQL's `CREATE OR REPLACE FUNCTION` matches functions by `(schema, name, argument list)`. Adding an 11th argument creates a NEW function entry (different argument list) — it does NOT replace the legacy 10-arg function. After running `CREATE OR REPLACE FUNCTION friction.fn_triage_case(...11 args...)`, the production database has BOTH signatures co-existing:
   - the legacy 10-arg `fn_triage_case` with its pre-patch body (no case_history INSERT, no triaged_at/triaged_by writes)
   - the new 11-arg `fn_triage_case` with the refactored body

   Any 10-arg positional call resolves to the LEGACY function. The patch is defeated for any caller path that doesn't pass the new arg. V-A1 strict signature byte-match surfaces this as a dual-overload condition.

**Required apply pattern:** explicit `DROP FUNCTION IF EXISTS` of the prior 10-arg signature BEFORE the `CREATE OR REPLACE FUNCTION` of the new 11-arg signature. The DROP is the only way to retire the legacy entry from the schema; `CREATE OR REPLACE` alone is insufficient when the argument list changes.

**Signature change:** retires the legacy 10-arg signature; adds an 11-arg signature that adds `p_actor text DEFAULT NULL` as the 11th argument. Call-resolution compatibility is preserved.

**Body refactor:** loads `v_current` first, computes `v_new_triage_state`, conditionally sets `triaged_at`/`triaged_by` on first 'new'→non-'new' transition, INSERTs case_history with `change_kind='compat_legacy_triage'`.

```sql
-- ============================================================
-- Section 2: fn_triage_case compatibility patch
-- ============================================================

-- v1.1 doc-patch: explicit DROP of legacy 10-arg signature.
-- Required because CREATE OR REPLACE FUNCTION with a different argument
-- list creates a sibling overload, not a replacement. See §2 v1.1 note above.
DROP FUNCTION IF EXISTS friction.fn_triage_case(
  uuid, text, text, boolean, text, text, text, timestamptz, text, text
);

CREATE OR REPLACE FUNCTION friction.fn_triage_case(
  p_case_id              uuid,
  p_triage_state         text DEFAULT NULL,
  p_category             text DEFAULT NULL,
  p_quality_flag         boolean DEFAULT NULL,
  p_capture_reason       text DEFAULT NULL,
  p_capture_reason_note  text DEFAULT NULL,
  p_action_decision      text DEFAULT NULL,
  p_next_review_at       timestamptz DEFAULT NULL,
  p_suppression_reason   text DEFAULT NULL,
  p_notes                text DEFAULT NULL,
  p_actor                text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $function$
DECLARE
  v_current           friction."case"%ROWTYPE;
  v_after             friction."case"%ROWTYPE;
  v_new_triage_state  text;
  v_effective_actor   text;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'fn_triage_case: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current
  FROM friction."case" c
  WHERE c.case_id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'case_id % not found in friction.case', p_case_id
      USING ERRCODE = 'P0002';
  END IF;

  v_new_triage_state := COALESCE(p_triage_state, v_current.triage_state);
  v_effective_actor  := COALESCE(p_actor, current_user::text);

  UPDATE friction."case" c
  SET
    triage_state         = v_new_triage_state,
    category             = COALESCE(p_category, c.category),
    quality_flag         = COALESCE(p_quality_flag, c.quality_flag),
    capture_reason       = COALESCE(p_capture_reason, c.capture_reason),
    capture_reason_note  = COALESCE(p_capture_reason_note, c.capture_reason_note),
    action_decision      = COALESCE(p_action_decision, c.action_decision),
    next_review_at       = COALESCE(p_next_review_at, c.next_review_at),
    suppression_reason   = COALESCE(p_suppression_reason, c.suppression_reason),
    notes                = COALESCE(p_notes, c.notes),
    triaged_at           = CASE
                             WHEN v_current.triage_state = 'new'
                                  AND v_new_triage_state <> 'new'
                                  AND v_current.triaged_at IS NULL
                             THEN now()
                             ELSE v_current.triaged_at
                           END,
    triaged_by           = CASE
                             WHEN v_current.triage_state = 'new'
                                  AND v_new_triage_state <> 'new'
                                  AND v_current.triaged_by IS NULL
                             THEN v_effective_actor
                             ELSE v_current.triaged_by
                           END,
    reviewed_at          = now(),
    updated_at           = now()
  WHERE c.case_id = p_case_id;

  SELECT * INTO v_after
  FROM friction."case" c
  WHERE c.case_id = p_case_id;

  INSERT INTO friction.case_history
    (case_id, changed_at, changed_by, change_kind, before_row, after_row)
  VALUES
    (p_case_id, now(), v_effective_actor, 'compat_legacy_triage',
     to_jsonb(v_current), to_jsonb(v_after));

  RETURN p_case_id;
END
$function$;
```

**Apply-time discipline (L-v2.90-b):** in any function patch that changes argument arity, the explicit `DROP FUNCTION IF EXISTS` of the prior signature MUST precede the `CREATE OR REPLACE FUNCTION`. The DROP is not a defensive guard — it is the only mechanism PostgreSQL provides to retire the prior signature when the argument list is changing. Skipping the DROP leaves a silent dual-overload state that V-A1 (or a 7th row in the expected matrix) surfaces.

---

## Section 3 — cc-0017d mutation function patches (5 functions)

Each function's existing logic is preserved byte-stable EXCEPT:
- Pre-existing `SELECT ... FOR UPDATE INTO v_current` is kept.
- Post-UPDATE: `SELECT ... INTO v_after FROM friction."case" WHERE case_id = p_case_id`.
- Post-UPDATE: INSERT into `friction.case_history` with appropriate `change_kind`.
- For `record_first_view`: history INSERT skipped on the early-return idempotent path.
- Function signatures byte-stable across all 5 (L-v2.85-a applied). **No DROP needed for these 5** — argument lists are unchanged, so `CREATE OR REPLACE FUNCTION` correctly replaces the prior body.

### 3.1 triage_case (change_kind='triage')

```sql
CREATE OR REPLACE FUNCTION friction.triage_case(
  p_case_id         uuid,
  p_action_decision text,
  p_actor           text DEFAULT 'pk',
  p_effort_level    text DEFAULT NULL,
  p_next_review_at  timestamptz DEFAULT NULL
)
RETURNS TABLE(
  out_case_id         uuid,
  out_triaged_at      timestamptz,
  out_action_decision text,
  out_triage_state    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $function$
DECLARE
  v_current               friction."case"%ROWTYPE;
  v_after                 friction."case"%ROWTYPE;
  v_effective_next_review timestamptz;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'triage_case: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_action_decision IS NULL THEN
    RAISE EXCEPTION 'triage_case: p_action_decision is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_action_decision NOT IN ('act_now','track','defer_intentionally') THEN
    RAISE EXCEPTION 'triage_case: p_action_decision % is closure-class or invalid; accepted: act_now/track/defer_intentionally', p_action_decision
      USING ERRCODE = 'P0001',
            HINT    = 'For suppress/ignore/duplicate, use friction.resolve_case or friction.mark_duplicate.';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'triage_case: p_actor is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_effort_level IS NOT NULL AND p_effort_level NOT IN ('quick','moderate','deep') THEN
    RAISE EXCEPTION 'triage_case: p_effort_level % invalid; legal: quick/moderate/deep or NULL', p_effort_level
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction."case" c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'triage_case: case_id % not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'triage_case: case_id % is resolved (resolved_at=%); call friction.reopen_case first', p_case_id, v_current.resolved_at
      USING ERRCODE = 'P0001';
  END IF;

  v_effective_next_review := COALESCE(p_next_review_at, v_current.next_review_at);
  IF p_action_decision IN ('track','defer_intentionally') AND v_effective_next_review IS NULL THEN
    RAISE EXCEPTION 'triage_case: action_decision=% requires next_review_at; current row NULL and no p_next_review_at supplied', p_action_decision
      USING ERRCODE = 'P0001',
            HINT    = 'Supply p_next_review_at on this triage call.';
  END IF;

  UPDATE friction."case" c
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

  SELECT * INTO v_after FROM friction."case" c WHERE c.case_id = p_case_id;

  INSERT INTO friction.case_history
    (case_id, changed_at, changed_by, change_kind, before_row, after_row)
  VALUES
    (p_case_id, now(), p_actor, 'triage', to_jsonb(v_current), to_jsonb(v_after));

  RETURN QUERY
    SELECT c.case_id, c.triaged_at, c.action_decision, c.triage_state
    FROM friction."case" c
    WHERE c.case_id = p_case_id;
END
$function$;
```

### 3.2 resolve_case (change_kind='resolve')

```sql
CREATE OR REPLACE FUNCTION friction.resolve_case(
  p_case_id          uuid,
  p_resolution_kind  text,
  p_actor            text DEFAULT 'pk'
)
RETURNS TABLE(
  out_case_id         uuid,
  out_resolved_at     timestamptz,
  out_resolution_kind text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $function$
DECLARE
  v_current                  friction."case"%ROWTYPE;
  v_after                    friction."case"%ROWTYPE;
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
    RAISE EXCEPTION 'resolve_case: p_resolution_kind % is not a legal terminal resolution', p_resolution_kind
      USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'resolve_case: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction."case" c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'resolve_case: case_id % not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'resolve_case: case_id % is already resolved (resolved_at=%, resolution_kind=%)',
      p_case_id, v_current.resolved_at, v_current.resolution_kind
      USING ERRCODE = 'P0001';
  END IF;

  v_expected_action_decision := CASE p_resolution_kind
    WHEN 'acted_on'      THEN 'act_now'
    WHEN 'tracked_done'  THEN 'track'
    WHEN 'deferred_done' THEN 'defer_intentionally'
    WHEN 'suppressed'    THEN 'suppress'
    WHEN 'ignored'       THEN 'ignore'
    WHEN 'duplicate'     THEN 'duplicate'
  END;

  IF v_current.action_decision IS DISTINCT FROM v_expected_action_decision THEN
    RAISE EXCEPTION 'resolve_case: resolution_kind=% requires action_decision=%, but case_id % has action_decision=%',
      p_resolution_kind, v_expected_action_decision, p_case_id, COALESCE(v_current.action_decision, 'NULL')
      USING ERRCODE = 'P0001',
            HINT    = 'Re-triage via friction.triage_case or fn_triage_case first. For duplicate, prefer friction.mark_duplicate.';
  END IF;

  UPDATE friction."case" c
  SET
    resolved_at     = now(),
    resolution_kind = p_resolution_kind,
    updated_at      = now()
  WHERE c.case_id = p_case_id;

  SELECT * INTO v_after FROM friction."case" c WHERE c.case_id = p_case_id;

  INSERT INTO friction.case_history
    (case_id, changed_at, changed_by, change_kind, before_row, after_row)
  VALUES
    (p_case_id, now(), p_actor, 'resolve', to_jsonb(v_current), to_jsonb(v_after));

  RETURN QUERY
    SELECT c.case_id, c.resolved_at, c.resolution_kind
    FROM friction."case" c
    WHERE c.case_id = p_case_id;
END
$function$;
```

### 3.3 reopen_case (change_kind='reopen')

```sql
CREATE OR REPLACE FUNCTION friction.reopen_case(
  p_case_id                uuid,
  p_actor                  text DEFAULT 'pk',
  p_clear_action_decision  boolean DEFAULT false
)
RETURNS TABLE(
  out_case_id               uuid,
  out_reopen_count          integer,
  out_prior_resolution_kind text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $function$
DECLARE
  v_current friction."case"%ROWTYPE;
  v_after   friction."case"%ROWTYPE;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'reopen_case: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'reopen_case: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction."case" c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reopen_case: case_id % not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NULL THEN
    RAISE EXCEPTION 'reopen_case: case_id % is already open (resolved_at IS NULL); nothing to reopen', p_case_id
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE friction."case" c
  SET
    resolved_at     = NULL,
    resolution_kind = 'reopened',
    reopen_count    = c.reopen_count + 1,
    action_decision = CASE WHEN p_clear_action_decision THEN NULL ELSE c.action_decision END,
    updated_at      = now()
  WHERE c.case_id = p_case_id;

  SELECT * INTO v_after FROM friction."case" c WHERE c.case_id = p_case_id;

  INSERT INTO friction.case_history
    (case_id, changed_at, changed_by, change_kind, before_row, after_row)
  VALUES
    (p_case_id, now(), p_actor, 'reopen', to_jsonb(v_current), to_jsonb(v_after));

  out_case_id               := v_current.case_id;
  out_reopen_count          := v_current.reopen_count + 1;
  out_prior_resolution_kind := v_current.resolution_kind;
  RETURN NEXT;
END
$function$;
```

### 3.4 mark_duplicate (change_kind='mark_duplicate')

```sql
CREATE OR REPLACE FUNCTION friction.mark_duplicate(
  p_case_id             uuid,
  p_predecessor_case_id uuid,
  p_actor               text DEFAULT 'pk'
)
RETURNS TABLE(
  out_case_id             uuid,
  out_predecessor_case_id uuid,
  out_resolved_at         timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $function$
DECLARE
  v_current     friction."case"%ROWTYPE;
  v_after       friction."case"%ROWTYPE;
  v_predecessor friction."case"%ROWTYPE;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'mark_duplicate: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_predecessor_case_id IS NULL THEN
    RAISE EXCEPTION 'mark_duplicate: p_predecessor_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_case_id = p_predecessor_case_id THEN
    RAISE EXCEPTION 'mark_duplicate: p_case_id and p_predecessor_case_id are identical (%); no self-link', p_case_id
      USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'mark_duplicate: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction."case" c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_duplicate: case_id % not found', p_case_id USING ERRCODE = 'P0002';
  END IF;
  IF v_current.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'mark_duplicate: case_id % is already resolved (resolved_at=%)', p_case_id, v_current.resolved_at
      USING ERRCODE = 'P0001',
            HINT    = 'Reopen via friction.reopen_case first if you need to mark it duplicate.';
  END IF;

  SELECT * INTO v_predecessor FROM friction."case" c WHERE c.case_id = p_predecessor_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_duplicate: predecessor_case_id % not found', p_predecessor_case_id USING ERRCODE = 'P0002';
  END IF;

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
        'cc-0017e-v1.0'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  UPDATE friction."case" c
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

  SELECT * INTO v_after FROM friction."case" c WHERE c.case_id = p_case_id;

  INSERT INTO friction.case_history
    (case_id, changed_at, changed_by, change_kind, before_row, after_row)
  VALUES
    (p_case_id, now(), p_actor, 'mark_duplicate', to_jsonb(v_current), to_jsonb(v_after));

  RETURN QUERY
    SELECT c.case_id, c.predecessor_case_id, c.resolved_at
    FROM friction."case" c
    WHERE c.case_id = p_case_id;
END
$function$;
```

Note: `emitter_version` bumped from `cc-0017d-v1.0.1` to `cc-0017e-v1.0` to mark the patch generation. This is an audit signal, not a behavioural change.

### 3.5 record_first_view (change_kind='first_view', skipped on idempotent path)

```sql
CREATE OR REPLACE FUNCTION friction.record_first_view(
  p_case_id uuid,
  p_actor   text DEFAULT 'pk'
)
RETURNS TABLE(
  out_case_id             uuid,
  out_first_viewed_at     timestamptz,
  out_was_already_viewed  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $function$
DECLARE
  v_current friction."case"%ROWTYPE;
  v_after   friction."case"%ROWTYPE;
BEGIN
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'record_first_view: p_case_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_actor IS NULL OR length(trim(p_actor)) = 0 THEN
    RAISE EXCEPTION 'record_first_view: p_actor is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_current FROM friction."case" c WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'record_first_view: case_id % not found', p_case_id USING ERRCODE = 'P0002';
  END IF;

  IF v_current.first_viewed_at IS NOT NULL THEN
    -- Idempotent path: NO history INSERT (nothing changed)
    out_case_id            := v_current.case_id;
    out_first_viewed_at    := v_current.first_viewed_at;
    out_was_already_viewed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE friction."case" c
  SET
    first_viewed_at = now(),
    updated_at      = now()
  WHERE c.case_id = p_case_id;

  SELECT * INTO v_after FROM friction."case" c WHERE c.case_id = p_case_id;

  INSERT INTO friction.case_history
    (case_id, changed_at, changed_by, change_kind, before_row, after_row)
  VALUES
    (p_case_id, now(), p_actor, 'first_view', to_jsonb(v_current), to_jsonb(v_after));

  out_case_id            := p_case_id;
  out_first_viewed_at    := v_after.first_viewed_at;
  out_was_already_viewed := false;
  RETURN NEXT;
END
$function$;
```

---

## Section 4 — Acknowledged legacy backfill (8 rows expected)

```sql
-- ============================================================
-- Section 4: Backfill 8 acknowledged legacy cases
-- Source: P4 probe (v2.88) — 8 rows triage_state='acknowledged', triaged_at IS NULL, triaged_by IS NULL
-- ============================================================

WITH before_state AS (
  SELECT to_jsonb(c.*) AS before_row, c.case_id
  FROM friction."case" c
  WHERE c.triage_state = 'acknowledged'
    AND c.triaged_at IS NULL
    AND c.triaged_by IS NULL
),
updated AS (
  UPDATE friction."case" c
  SET
    triaged_at = c.reviewed_at,
    triaged_by = 'legacy_backfill',
    updated_at = now()
  FROM before_state b
  WHERE c.case_id = b.case_id
  RETURNING c.case_id, to_jsonb(c.*) AS after_row
)
INSERT INTO friction.case_history
  (case_id, changed_at, changed_by, change_kind, before_row, after_row)
SELECT
  u.case_id,
  now(),
  'cc-0017e-backfill',
  'backfill',
  b.before_row,
  u.after_row
FROM updated u
JOIN before_state b ON b.case_id = u.case_id;
```

**Defensive guard:** WHERE predicate triple-pins (`triage_state='acknowledged'` AND both NULL). Re-runs are no-ops by construction.

**Expected V-F1 matrix:**
- 8 rows in friction.case have new `triaged_at = reviewed_at`, `triaged_by = 'legacy_backfill'`
- 8 rows in friction.case_history with `change_kind='backfill'`, `changed_by='cc-0017e-backfill'`
- before_row/after_row jsonb captures the full row state for replay

---

## Section 5 — COMMENT statements

```sql
COMMENT ON TABLE  friction.case_history IS
  'Shadow audit table for friction.case mutations. One row per SECURITY DEFINER mutation function call that modifies a case. Populated explicitly from inside each mutation function (mirrors friction.emission_rule_history pattern). cc-0017e v1.0.';
COMMENT ON COLUMN friction.case_history.change_kind IS
  'Semantic operation: triage | resolve | reopen | mark_duplicate | first_view | compat_legacy_triage | backfill';
COMMENT ON COLUMN friction.case_history.before_row IS
  'to_jsonb(friction.case ROWTYPE) snapshot BEFORE the UPDATE. NULL for INSERT events (none in v1.0).';
COMMENT ON COLUMN friction.case_history.after_row IS
  'to_jsonb(friction.case ROWTYPE) snapshot AFTER the UPDATE. NULL for DELETE events (none in v1.0; DELETE prevented by trigger).';
COMMENT ON COLUMN friction.case_history.changed_by IS
  'Actor source: operational triage rows = p_actor argument from mutation function; backfill rows = cc-0017e-backfill; compat_legacy_triage rows = COALESCE(p_actor, current_user::text).';

COMMENT ON FUNCTION friction.fn_triage_case(uuid, text, text, boolean, text, text, text, timestamptz, text, text, text) IS
  'cc-0017e v1.0 compatibility patch. Legacy 10-arg signature retired via explicit DROP; new 11-arg signature with optional p_actor. Body refactored to load v_current first, conditionally set triaged_at/triaged_by on first new->non-new transition, INSERT case_history change_kind=compat_legacy_triage.';
COMMENT ON FUNCTION friction.triage_case(uuid, text, text, text, timestamptz) IS
  'cc-0017d v1.0 + cc-0017e v1.0 history-INSERT patch. Triages a case to action_decision (act_now/track/defer_intentionally). Idempotent set-once on triaged_at/triaged_by. Writes case_history change_kind=triage.';
COMMENT ON FUNCTION friction.resolve_case(uuid, text, text) IS
  'cc-0017d v1.0 + cc-0017e v1.0 history-INSERT patch. Resolves a case to a terminal resolution_kind. Requires matching action_decision per the resolution map. Writes case_history change_kind=resolve.';
COMMENT ON FUNCTION friction.reopen_case(uuid, text, boolean) IS
  'cc-0017d v1.0 + cc-0017e v1.0 history-INSERT patch. Reopens a resolved case (sets resolved_at=NULL, resolution_kind=reopened, increments reopen_count). Writes case_history change_kind=reopen.';
COMMENT ON FUNCTION friction.mark_duplicate(uuid, uuid, text) IS
  'cc-0017d v1.0 + cc-0017e v1.0 history-INSERT patch. Marks a case as duplicate of a predecessor. Writes friction.emit_error audit row for cross-fingerprint duplicates. Writes case_history change_kind=mark_duplicate.';
COMMENT ON FUNCTION friction.record_first_view(uuid, text) IS
  'cc-0017d v1.0 + cc-0017e v1.0 history-INSERT patch. Records first viewer; idempotent on second call (no history INSERT on idempotent path). Writes case_history change_kind=first_view only when first_viewed_at actually changes.';
```

---

## Apply notes

- Use `apply_migration` (NOT `db push`) — friction schema is registered in `k.schema_registry` (L41).
- Single migration name: `cc_0017e_friction_case_history_and_compat`.
- All sections execute in a single transaction implicitly (Supabase MCP `apply_migration` is transactional per call).
- DO NOT split sections across multiple `apply_migration` calls — DDL + function patches + backfill must commit atomically. If any section fails, the whole migration rolls back and re-application is safe.
- Post-apply: run vchecks.md matrix.
- Post-V-checks: D-01 fire with results.
- Post-D-01: close-the-loop UPDATE on m.chatgpt_review.
