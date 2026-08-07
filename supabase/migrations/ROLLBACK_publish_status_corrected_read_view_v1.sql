-- ROLLBACK_publish_status_corrected_read_view_v1.sql
-- =====================================================================
-- ROLLBACK for NOT_APPLIED_publish_status_corrected_read_view_v1.sql —
-- the corrected publish-status read surface plus its service-role
-- companion RPC.
--
-- STATUS: NOT EXECUTED. Runnable as-is (an early revision left the
--   rollback as commented-out text needing a manual un-comment at the
--   moment of a crisis — the worst possible time to hand-edit). House
--   pattern: the existing ROLLBACK_* migrations in this directory, e.g.
--   ROLLBACK_20260725120000_durable_platform_support_guard.sql, which
--   EXISTS on disk in the shared checkout but is UNTRACKED, which is
--   why `git log --all` from an isolated worktree could not see it (an
--   earlier revision recorded it as non-existent; retracted).
--   No timestamp in the filename because the forward artifact has none;
--   the apply lane renames BOTH, as a pair, at apply time.
--
-- ── WHAT THIS REVERTS — APPLY/ROLLBACK IDENTITY ──────────────────────
-- The forward artifact creates TWO objects:
--   1. ice_ro.publish_status_v2        (view)  + its GRANT/REVOKE
--   2. public.get_publish_status_v2()  (RPC)   + its REVOKEs/GRANT
-- This file drops exactly those two. Grants and revokes on a view or
-- function are dropped WITH the object, so no separate REVOKE is needed
-- and no residue remains.
--
-- ⚠ DROP ORDER IS LOAD-BEARING: RPC FIRST, THEN VIEW. The RPC's return
-- type IS the view's row type, so it genuinely depends on the view;
-- dropping the view first would fail on the dependency or, with
-- CASCADE, silently take the RPC with it. NEVER CASCADE — it would also
-- drop anything a third party has since built on top, turning a scoped
-- rollback into an unbounded one. Plain DROP in dependency order lets
-- any unexpected dependency FAIL LOUDLY.
--
-- SCOPE OF "no residue": exact inverses AT THE CATALOG-OBJECT LEVEL.
-- NOT a claim about the migration ledger — `apply_migration` mints its
-- own ledger row, which this file does not delete. Ledger
-- reconciliation is an apply-lane responsibility.
--
-- UNTOUCHED by both directions: the original ice_ro.publish_status
-- view, m.post_publish, m.post_draft, m.post_publish_queue, c.client,
-- every other ice_ro view, the ice_readonly and service_role roles,
-- all schema USAGE grants, and all triggers. No DML either way — this
-- rollback touches no data, only two catalog entries.
--
-- ── NATURE OF A ROLLBACK HERE ────────────────────────────────────────
-- Dropping a read-only view and a read-only RPC removes READ surfaces.
-- It cannot corrupt, resurrect or lose content: no writer reads either.
-- If a Task-3 consumer has been pointed at the RPC by then, it breaks
-- LOUDLY (function does not exist) rather than silently — the correct
-- failure mode, but a rollback is still an incident to record, not a
-- neutral undo.
--
-- ── CATALOG-VISIBILITY CAVEAT ────────────────────────────────────────
-- `information_schema.role_table_grants` is VISIBILITY-FILTERED even
-- for a superuser. Harmless for an expected-NON-ZERO check
-- (invisibility fails it closed), but unusable for a COMPLETENESS claim
-- — in a SET comparison the same filter applies to both sides and
-- cancels, so an invisible grant is hidden from the comparison
-- entirely. Every completeness-shaped check here (asserts 4 and 5) is
-- therefore over `pg_class.relacl` via `aclexplode()`, which is not
-- visibility-filtered. The only remaining information_schema reads are
-- the 19-column contract check and a scalar count used solely for the
-- closing NOTICE — no control depends on either.
--
-- ── ATOMICITY + NAMED CHANNEL ────────────────────────────────────────
-- The entire rollback lives inside ONE PL/pgSQL DO block — a SINGLE
-- top-level statement, so any RAISE rolls back both DROPs, even under
-- autocommit and even if a pooled channel split the surrounding
-- statements. THE DO BLOCK IS THE REAL TRANSACTION BOUNDARY AND THE
-- ONLY PROTECTION CLAIMED AGAINST POOLED SPLITTING. (Rev 4's
-- `inet_server_port() = 6543` guard is REMOVED: its own header conceded
-- it may cover an empty set, so its catch rate was self-declared zero
-- while its spurious-abort surface was not.) The surrounding
-- BEGIN; … COMMIT; is a nested no-op under both channels below.
-- CHANNEL (required): run as ONE single call — exactly one
-- `mcp__supabase__apply_migration` call with this entire file as the
-- `query` parameter, or one un-split `psql -1 -v ON_ERROR_STOP=1 -f
-- <file>` on a direct (non-pooled, 5432) connection.
--
-- ── IDENTITY BINDING BEFORE THE DROP ─────────────────────────────────
-- Binding by NAME alone would happily drop a DIFFERENT object that
-- merely occupies the name. STEP 1 proves, BEFORE any effect, that each
-- object is the one the forward artifact created:
--   VIEW — relkind='v'; references `m.post_publish ` WITH the trailing
--     space (the bare substring 'post_publish' is also satisfied by
--     m.post_publish_QUEUE, so each check now stands alone); does NOT
--     reference m.post_publish_queue; carries the distinctive
--     draft_state_anomaly column; and matches the SAME ordered
--     19-column contract the forward artifact pins.
--   RPC — SECURITY DEFINER; returns SETOF exactly that view's row type;
--     and its BODY references publish_status_v2. The body check matters
--     because, unlike the view's normalised deparse, an SQL function's
--     prosrc is stored verbatim and IS statically knowable.
-- All pre-effect, so a mismatch aborts with ZERO partial state.
-- ON AN EXACT md5 PIN: a byte pin for the VIEW cannot be authored here
-- — pg_get_viewdef returns a NORMALISED deparse only knowable after the
-- apply (db-rls-auditor independently confirmed this and said it would
-- have made the same call). The property checks above are the
-- authorable equivalent, and the forward artifact now EMITS
-- md5(pg_get_viewdef) and md5(prosrc) into the apply transcript so the
-- exact pins are captured without an out-of-channel query.
--
-- ── PRECONDITION ─────────────────────────────────────────────────────
-- Run ONLY after the forward artifact has been applied. If either
-- object is missing this fails closed rather than silently
-- "succeeding" on a no-op — a silent no-op would let an operator
-- believe a rollback happened when the real problem is being connected
-- to the wrong database.
-- =====================================================================


BEGIN;   -- nested no-op under both named channels; the DO block is the real boundary

DO $rollback$
DECLARE
  n                int;
  n_before         int;
  n_after          int;
  v_view           regclass;
  v_def            text;
  v_fn_src         text;
  v_view_md5       text;
  v_fn_md5         text;
  v_cols           text[];
  v_granted_pre    text[];
  v_granted_post   text[];
  v_expected_cols  text[] := ARRAY[
    'post_publish_id','post_draft_id','attempt_no','publish_status','platform',
    'platform_post_id','published_at','queue_id','ai_job_id','client_id',
    'client_slug','destination_id','publish_created_at','draft_approval_status',
    'draft_platform','draft_video_status','public_permalink',
    'draft_state_anomaly_reason','draft_state_anomaly'
  ];
BEGIN
  -- ===================================================================
  -- STEP 1 — PRECONDITIONS, IDENTITY BINDING, BASELINES (pre-effect)
  -- ===================================================================

  -- 1a. Both objects MUST exist. Fail closed, never a silent no-op.
  v_view := to_regclass('ice_ro.publish_status_v2');
  IF v_view IS NULL THEN
    RAISE EXCEPTION 'publish_status_v2 rollback precondition: ice_ro.publish_status_v2 does not exist — the forward artifact was never applied here (or you are connected to the wrong database). Refusing to report a rollback that did nothing.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
                 WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2') THEN
    RAISE EXCEPTION 'publish_status_v2 rollback precondition: public.get_publish_status_v2() does not exist — state does not match a completed forward apply. STOP and re-review; do not force.';
  END IF;

  -- 1b. VIEW IDENTITY.
  SELECT count(*) INTO STRICT n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'ice_ro' AND c.relname = 'publish_status_v2' AND c.relkind = 'v';
  IF n <> 1 THEN
    RAISE EXCEPTION 'publish_status_v2 rollback identity: ice_ro.publish_status_v2 is not a view (relkind check failed) — refusing to drop an object this rollback does not recognise';
  END IF;

  v_def := pg_get_viewdef(v_view);
  --    TRAILING SPACE IS DELIBERATE: 'm.post_publish ' cannot be
  --    satisfied by 'm.post_publish_queue'.
  IF position('m.post_publish ' IN v_def) = 0 THEN
    RAISE EXCEPTION 'publish_status_v2 rollback identity: ice_ro.publish_status_v2 does not reference m.post_publish — this is not the object the forward artifact created. STOP.';
  END IF;
  IF position('post_publish_queue' IN v_def) > 0 THEN
    RAISE EXCEPTION 'publish_status_v2 rollback identity: ice_ro.publish_status_v2 references m.post_publish_queue — not the object the forward artifact created (which sources the durable table, never the queue). STOP.';
  END IF;
  IF position('draft_state_anomaly' IN v_def) = 0 THEN
    RAISE EXCEPTION 'publish_status_v2 rollback identity: ice_ro.publish_status_v2 lacks this artifact''s distinctive draft_state_anomaly column — not our object. STOP.';
  END IF;

  --    The SAME ordered 19-column contract the forward artifact pins.
  SELECT array_agg(column_name::text ORDER BY ordinal_position)
  INTO STRICT v_cols
  FROM information_schema.columns
  WHERE table_schema = 'ice_ro' AND table_name = 'publish_status_v2';
  IF v_cols IS DISTINCT FROM v_expected_cols THEN
    RAISE EXCEPTION 'publish_status_v2 rollback identity: the view does not match the pinned 19-column contract — it is not the object the forward artifact created, or it was altered since. expected % got %. STOP.',
      v_expected_cols, v_cols;
  END IF;

  -- 1c. RPC IDENTITY — signature AND body.
  SELECT count(*) INTO STRICT n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2'
    AND p.prosecdef
    AND p.proretset
    AND p.prorettype = (SELECT c.reltype FROM pg_class c JOIN pg_namespace n2 ON n2.oid = c.relnamespace
                        WHERE n2.nspname = 'ice_ro' AND c.relname = 'publish_status_v2')
    AND position('publish_status_v2' IN p.prosrc) > 0;
  IF n <> 1 THEN
    RAISE EXCEPTION 'publish_status_v2 rollback identity: public.get_publish_status_v2() is not the SECURITY DEFINER function returning SETOF ice_ro.publish_status_v2 whose body reads that view. STOP.';
  END IF;

  -- 1d. The ORIGINAL queue-backed view must still be present. Neither
  --     direction touches it; if it is gone, state has drifted beyond
  --     what this rollback was authored against.
  IF to_regclass('ice_ro.publish_status') IS NULL THEN
    RAISE EXCEPTION 'publish_status_v2 rollback precondition: the original ice_ro.publish_status view is missing — state has drifted. STOP and re-review; do not force.';
  END IF;

  -- 1e. Capture the identity pins of what is about to be destroyed, so
  --     the transcript records exactly which bytes went away.
  SELECT p.prosrc INTO STRICT v_fn_src
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2';
  v_view_md5 := md5(v_def);
  v_fn_md5   := md5(v_fn_src);

  -- 1f. Baselines. The scalar count is for the closing NOTICE ONLY —
  --     no control depends on it (rev 4 also RAISEd on it, which was
  --     the last control in either file expressed over the
  --     visibility-filtered information_schema; assert 4's aclexplode
  --     SET comparison strictly subsumes its detection power, so the
  --     RAISE is removed and the prose is now true).
  SELECT count(*) INTO STRICT n_before
  FROM information_schema.role_table_grants
  WHERE table_schema = 'ice_ro' AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';

  SELECT array_agg(DISTINCT c.relname::text ORDER BY c.relname::text)
  INTO STRICT v_granted_pre
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) a
  WHERE ns.nspname = 'ice_ro'
    AND a.grantee = 'ice_readonly'::regrole
    AND a.privilege_type = 'SELECT';
  IF v_granted_pre IS NULL THEN
    RAISE EXCEPTION 'publish_status_v2 rollback precondition: ice_readonly holds SELECT on zero ice_ro relations — state does not match a completed forward apply';
  END IF;

  -- ===================================================================
  -- STEP 2 — EFFECTS, IN DEPENDENCY ORDER: RPC FIRST, THEN VIEW.
  -- No CASCADE. Same DO block ⇒ any RAISE below rolls both DROPs back.
  -- ===================================================================
  EXECUTE 'DROP FUNCTION public.get_publish_status_v2()';
  EXECUTE 'DROP VIEW ice_ro.publish_status_v2';

  -- ===================================================================
  -- STEP 3 — FAIL-CLOSED POST-ROLLBACK ASSERTIONS
  -- ===================================================================

  -- 1. both objects are gone
  IF to_regclass('ice_ro.publish_status_v2') IS NOT NULL THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 1: ice_ro.publish_status_v2 is still present after the DROP';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
             WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2') THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 1: public.get_publish_status_v2() is still present after the DROP';
  END IF;

  -- 2. the ORIGINAL view survived. EXISTENCE ONLY — this direction
  --    changes nothing about its definition, so no md5 claim is made;
  --    the message claims exactly what is tested and no more.
  IF to_regclass('ice_ro.publish_status') IS NULL THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 2: the original ice_ro.publish_status view no longer exists after this rollback';
  END IF;

  -- 3. (reserved — rev 4's scalar grant-delta RAISE was removed here as
  --    subsumed by assert 4; numbering is kept stable so review
  --    references across revisions still resolve.)

  -- 4. SET comparison — the surviving grant set must be EXACTLY the
  --    pre-drop set minus the one dropped view. Catches a collateral
  --    grant loss on any OTHER ice_ro relation, which a bare -1 count
  --    cannot (a simultaneous +1/-1 on two views nets to -1 and would
  --    pass). Over aclexplode, not information_schema.
  SELECT array_agg(DISTINCT c.relname::text ORDER BY c.relname::text)
  INTO STRICT v_granted_post
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) a
  WHERE ns.nspname = 'ice_ro'
    AND a.grantee = 'ice_readonly'::regrole
    AND a.privilege_type = 'SELECT';
  IF v_granted_post IS DISTINCT FROM
     (SELECT array_agg(t ORDER BY t) FROM unnest(v_granted_pre) t WHERE t <> 'publish_status_v2') THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 4: the surviving ice_readonly grant set is not exactly the pre-drop set minus publish_status_v2 — a collateral grant change occurred. pre=% post=%',
      v_granted_pre, v_granted_post;
  END IF;

  -- 5. ice_readonly confinement unchanged. Over aclexplode: this sweep
  --    expects ZERO, the one shape where information_schema's
  --    visibility filter would yield a VACUOUS PASS.
  IF has_schema_privilege('ice_readonly','m','USAGE') THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 5: ice_readonly holds USAGE on schema m';
  END IF;
  IF has_schema_privilege('ice_readonly','c','USAGE') THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 5: ice_readonly holds USAGE on schema c';
  END IF;
  SELECT count(*) INTO STRICT n
  FROM pg_class rel
  CROSS JOIN LATERAL aclexplode(rel.relacl) acl
  WHERE acl.grantee = 'ice_readonly'::regrole
    AND acl.privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
  IF n <> 0 THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 5: ice_readonly holds % write privilege(s) (relacl/aclexplode sweep, not visibility-filtered)', n;
  END IF;

  -- 6. service_role must STILL not hold USAGE on ice_ro — this rollback
  --    must not widen anything on its way out.
  IF has_schema_privilege('service_role','ice_ro','USAGE') THEN
    RAISE EXCEPTION 'publish_status_v2 rollback assert 6: service_role holds USAGE on schema ice_ro — confinement is broader than documented. STOP.';
  END IF;

  -- ===================================================================
  -- STEP 4 — CLOSE OUT
  -- ===================================================================
  -- BELT, not the mechanism: Supabase's extensions.pgrst_drop_watch
  -- event trigger already NOTIFYs pgrst on these DROPs. Duplicate
  -- identical notifies in one transaction collapse, and this is
  -- delivered only on COMMIT.
  PERFORM pg_notify('pgrst', 'reload schema');

  SELECT count(*) INTO STRICT n_after
  FROM information_schema.role_table_grants
  WHERE table_schema = 'ice_ro' AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';

  RAISE NOTICE 'publish_status_v2 rollback IDENTITY PINS OF THE DROPPED OBJECTS (record in the incident/result doc): view md5(pg_get_viewdef)=% | rpc md5(prosrc)=%',
    v_view_md5, v_fn_md5;
  RAISE NOTICE 'publish_status_v2 rollback ok: RPC then view dropped in dependency order, original publish_status intact, ice_readonly grant set = pre-drop set minus publish_status_v2 (count % -> %, indicative only), confinement intact, service_role still has no ice_ro USAGE. REMINDER: migration-ledger reconciliation is an apply-lane step this file does not perform.',
    n_before, n_after;
END
$rollback$;

COMMIT;

-- END ROLLBACK_publish_status_corrected_read_view_v1.sql
-- =====================================================================
