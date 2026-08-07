-- NOT_APPLIED_publish_status_corrected_read_view_v1.sql
-- =====================================================================
-- Task 2 (publish-truth lane) — corrected publish-status read surface,
-- sourced from m.post_publish (durable, delete-protected) instead of
-- m.post_publish_queue (purged on FB/IG/LinkedIn publish success by
-- trg_cleanup_queue_on_publish_v1; never populated for YouTube —
-- queue_id is NULL from row creation).
--
-- TWO OBJECTS, ONE SHAPE:
--   1. ice_ro.publish_status_v2       — R0 OPERATOR surface (ice_readonly)
--   2. public.get_publish_status_v2() — SERVICE-ROLE companion RPC
-- Object 2 is SETOF object 1's row type, so the 19-column shape has
-- exactly ONE definition and cannot drift.
--
-- STATUS: NOT YET APPLIED. The filename is deliberately not a
--   timestamped migration name so no apply tool sweeps it up. At apply
--   time the apply lane renames this file and its paired rollback,
--   together, to a real timestamped identity.
--   Review state: branch-warden safe; db-rls-auditor and
--   apply-harness-auditor both at concerns/CONCERNS through rev 4 and
--   both recommending FREEZE; rev 5 is a PK-approved SUBTRACTIVE pass
--   (one guard added, three controls/sections cut, four prose
--   corrections). NEITHER AUDITOR HAS RE-RUN AGAINST THIS REVISION.
--   External review has never run. Apply requires the full chain
--   re-run, pinned to this file's hash. OWNER OF THE HASH-RE-REVIEW
--   STOP: the ORCHESTRATOR / PK gate — no in-database guard can know
--   which artifact text a human approved.
--
-- Brief:     docs/briefs/publish-truth-tasks-2-3-corrected-view-and-cockpit-repoint-gate1-brief-v1.md
-- Diagnosis: docs/briefs/results/publish-status-view-blindness-diagnosis-v1.md
-- Rollback:  supabase/migrations/ROLLBACK_publish_status_corrected_read_view_v1.sql
-- Evidence narrative, cc-0080 gotcha dispositions, design-choice
--   history and the live census figures live in the LANE RESULT DOC,
--   not here. Rationale for that split: across four revisions every
--   material error in this artifact lived in its prose, never in an
--   assertion — so the prose that is not load-bearing for an assertion
--   belongs where it can be revised without re-cutting reviewed SQL.
--
-- ── SCOPE — WHAT THIS SQL ACTUALLY DOES ──────────────────────────────
--   1. CREATE VIEW ice_ro.publish_status_v2
--   2. GRANT SELECT on it TO ice_readonly (scoped to it ONLY — no
--      schema-wide catch-all, which a DROP VIEW could not revert)
--   3. REVOKE ALL on it FROM PUBLIC, anon, authenticated
--   4. CREATE FUNCTION public.get_publish_status_v2()
--   5. REVOKE ALL on it FROM PUBLIC, anon, authenticated — LOAD-BEARING
--   6. GRANT EXECUTE on it TO service_role ONLY
--   7. pg_notify('pgrst','reload schema') — a BELT, not the mechanism
--   8. Read-only catalog SELECTs + two in-database role probes
-- It creates NO table (baselines are PL/pgSQL locals). No DML. It does
-- NOT touch, replace or DROP the existing ice_ro.publish_status view —
-- machine-verified by an md5 comparison of its definition before and
-- after (assertion 2). It does not touch m.post_publish_queue, any
-- trigger, or any writer function. It grants NO schema USAGE.
--
-- ── ATOMICITY + NAMED APPLY CHANNEL ──────────────────────────────────
-- The ENTIRE apply lives inside ONE PL/pgSQL DO block. A DO block is a
-- SINGLE top-level statement, so ANY RAISE rolls back the whole thing
-- (including the DDL) even under autocommit, and even if a pooled
-- channel split the surrounding statements. THE DO BLOCK IS THE REAL
-- TRANSACTION BOUNDARY AND THE ONLY PROTECTION THIS FILE CLAIMS
-- AGAINST POOLED STATEMENT-SPLITTING. (Rev 4 carried an
-- `inet_server_port() = 6543` guard; it is REMOVED. Its own header
-- conceded it may cover an empty set — in a Supavisor topology the
-- backend sees 5432 in both the pooled and direct cases — so its
-- self-declared catch rate was zero while its spurious-abort surface
-- was not.)
-- The surrounding BEGIN; … COMMIT; is a nested no-op under both
-- channels below; retained only as insurance against a future channel
-- that does not wrap. It is not the guarantee.
-- CHANNEL (required): apply as ONE single call — either exactly one
-- `mcp__supabase__apply_migration` call with this entire file as the
-- `query` parameter, or one un-split `psql -1 -v ON_ERROR_STOP=1 -f
-- <file>` run on a direct (non-pooled, 5432) connection. Never split
-- across tool calls; never paste statement-by-statement.
-- The DO block does not SET LOCAL search_path: every data reference is
-- schema-qualified and unqualified catalog references resolve via
-- pg_catalog's implicit precedence, which search_path cannot override.
--
-- ── APPLY/ROLLBACK IDENTITY ──────────────────────────────────────────
-- Two objects created; the paired rollback drops exactly those two,
-- RPC FIRST then view (the RPC depends on the view's row type). Never
-- CASCADE. Grants are dropped with the object, so the directions are
-- exact inverses AT THE CATALOG-OBJECT LEVEL — NOT a claim about the
-- migration ledger, which `apply_migration` mints and the rollback does
-- not delete. Ledger reconciliation is an apply-lane responsibility.
--
-- ── CATALOG-VISIBILITY CAVEAT (why aclexplode, not information_schema)
-- `information_schema.role_table_grants` is VISIBILITY-FILTERED even
-- for a superuser. For an expected-NON-ZERO check that is harmless
-- (invisibility fails it closed). For any COMPLETENESS claim — an
-- expected-zero sweep, or a SET comparison where the same filter
-- applies to both sides and cancels — it is not good enough for a
-- control. Every completeness-shaped check in both files is therefore
-- expressed over `pg_class.relacl` / `pg_proc.proacl` via
-- `aclexplode()`, which is not visibility-filtered. Remaining
-- information_schema uses are expected-non-zero, or paired with a
-- `has_*_privilege` belt that also resolves privileges inherited via
-- PUBLIC.
--
-- ── HOW THE DASHBOARD REACHES THIS DATA (rev 2's claim was WRONG) ─────
-- REVISION 2 CLAIMED "THE DASHBOARD CANNOT READ THIS VIEW". THAT CLAIM
-- WAS FALSE and is retracted in full; it briefed a live PK decision and
-- must not survive in any downstream doc. Accurately:
--   * No PostgREST / supabase-js route exists to schema ice_ro —
--     service_role has no USAGE on it (ASSERTED, assertion 15) and the
--     schema is not exposed. That much was right.
--   * BUT `public.exec_sql(query text)` is SECURITY DEFINER owned by
--     postgres with `service_role=X` in proacl, so it EXECUTES AS
--     POSTGRES and CAN read ice_ro. The dashboard ALREADY DOES THIS IN
--     PRODUCTION for three ice_ro views —
--     …\dash-operator-cockpit-v1\actions\capability-matrix.ts:9-11
--     documents the mechanism verbatim, and …\actions\asset-gap.ts:58
--     runs `FROM ice_ro.asset_gap_backlog` via supabase.rpc('exec_sql').
-- The companion RPC exists NOT because exec_sql cannot reach the view,
-- but because exec_sql is a RED-inventory arbitrary-SQL injection sink
-- under containment with ~74 call sites, and PK ruled against a 75th.
--
-- ── COMPANION RPC — what each posture point buys, and which assertion
--    enforces it ────────────────────────────────────────────────────
--  * NOT in ice_ro, and NO service_role USAGE on ice_ro — that schema's
--    confinement is a single schema-USAGE grant, so widening it would
--    expose all 15 views at once (16 after this apply) with no per-view
--    control.                                          → assertion 15
--  * A SECURITY DEFINER RPC, not a service_role-readable view: a view
--    in an exposed schema would give unfiltered `?select=` plus
--    arbitrary filter/order over ~1793 cross-client rows. An RPC is one
--    named, greppable entry point with room for a client filter later.
--  * SHAPE DEFINED ONCE: `RETURNS SETOF ice_ro.publish_status_v2` with
--    body `SELECT * FROM ice_ro.publish_status_v2`. No second column
--    list exists, so the objects cannot drift.  → assertions 7, 11
--    Confirmed callable: schema USAGE gates NAME LOOKUP, not
--    OID-resolved type use, so has_type_privilege(service_role, <view
--    reltype>, USAGE) is TRUE while schema USAGE is FALSE. Live
--    precedent: f.ai_worker_lock_jobs_v1 returns SETOF m.ai_job to
--    roles with no USAGE on m.
--    The `SELECT *` in the body is deliberate: the shape is pinned by
--    the view's explicit 19-column list plus assertions 7 and 11.
--    Re-listing the names would create the second definition this
--    design eliminates.
--  * search_path pinned to the empty string (92 live
--    function_search_path_mutable WARNs; this adds no 93rd), asserted
--    against the EXACT stored encoding `search_path=""` — an "is some
--    search_path set?" test would pass `search_path=public`.
--                                                      → assertion 10
--  * Owner postgres + STABLE asserted: for a SECURITY DEFINER function
--    the OWNER IS THE EFFECTIVE PRIVILEGE SET.          → assertion 10
--  * THE REVOKE IS LOAD-BEARING: schema `public` carries a
--    pg_default_acl granting anon/authenticated EXECUTE on NEW
--    functions, so a function created there is BORN ANON-EXECUTABLE.
--    Order matters: CREATE → REVOKE → GRANT service_role. Enforced as
--    an ALLOW-LIST (grantee set must be EXACTLY {postgres,
--    service_role}), not a deny-list of three known roles.
--                                                      → assertion 12
--    `CREATE OR REPLACE` PRESERVES an existing ACL, so a precondition
--    refuses to replace over an existing function.
--    Schema `public` chosen deliberately: only an exposed schema is
--    callable by supabase.rpc(), and `public` is the shipped exposed
--    schema every existing dashboard RPC uses.
--  * ZERO arguments — no parameter, no interpolation, no dynamic SQL,
--    nothing to inject. The deliberate opposite of exec_sql.
--
-- ⚠ FLAGGED, NOT SOLVED (PK/security-auditor): this shape is
--   CROSS-CLIENT AND UNFILTERED, so making it service_role-reachable
--   means any dashboard authz weakness becomes a CROSS-TENANT
--   PUBLISH-HISTORY READ. The RPC form is what leaves room for a client
--   filter later; none is added because none was specified.
--
-- ── SECRET-FREE DISCIPLINE — what is enforced, precisely ─────────────
-- Three columns are hard-excluded, each verified live as NECESSARY:
--   request_payload  — `webhook_prefix` holds 372 full Zapier
--                      catch-hook URLs (bearer-equivalent).
--   error            — 25 rows carry high-entropy AQ… strings, 3 with
--                      the AQV LinkedIn access-token prefix.
--   response_payload — its `data` key is a Facebook /debug_token blob
--                      (app_id, scopes, user_id). The RAW COLUMN is
--                      excluded; exactly two named keys are extracted.
-- KEPT: platform_post_id — the platform's own post/video ID, an
--   IDENTIFIER (same category as creatomate_render_id, already exposed
--   in ice_ro.render_status).
-- ENFORCED (assertions 8, 14) — stated as what the checks actually do:
--   (1) no request_payload/response_payload/error COLUMN on either
--       object;
--   (2) no `webhook_prefix` literal in either definition;
--   (3) `response_payload` is referenced EXACTLY TWICE in the view's
--       deparse — an OCCURRENCE PIN. This is the real guard. Rev 4
--       pinned only the set of literal keys matched by a `->>`/`->`
--       regex, which silently MISSED two live-proven forms that still
--       reach the blob while returning the permitted pair: a JSON-path
--       operator (`response_payload #>> '{data,app_id}'`) and a
--       non-literal key (`response_payload ->> some_col`). An
--       occurrence count closes every form, including those.
--   (4) those two references extract exactly {wp_post_url,
--       youtube_url} — catches SUBSTITUTION of a permitted key (e.g.
--       swapping one for 'data'), which an occurrence count alone
--       would not.
--   (3)+(4) together subsume rev 4's standalone `data`-key regex,
--   which is REMOVED as redundant; its warning is folded into (4)'s
--   error message.
--
-- ── POSTGREST CACHE + THE REQUIRED GATES ─────────────────────────────
-- SCHEMA-CACHE RELOAD: Supabase's `extensions.pgrst_ddl_watch` event
--   trigger (live, enabled) ALREADY issues `NOTIFY pgrst, 'reload
--   schema'` on CREATE VIEW / CREATE FUNCTION, and `pgrst_drop_watch`
--   does the same on the rollback's DROPs. THAT is the mechanism. The
--   explicit pg_notify below is a BELT — a second, identical notify;
--   duplicates in one transaction collapse, and it is delivered only on
--   COMMIT, so a rolled-back apply notifies nothing.
--
-- ⛔ PRE-APPLY CHANNEL CHECK (run BEFORE applying, through the intended
--   channel). Three assertions independently require the executing role
--   to be postgres (10's proowner, 12's grantee allow-list, 13's
--   membership). If the channel runs as a different superuser all three
--   fire and a T3 gate is spent on an environment mismatch. So first
--   run, through that exact channel:
--       SELECT current_user,
--              pg_has_role(current_user,'service_role','MEMBER');
--   Live-confirmed: postgres is a member of both service_role and
--   ice_readonly, so it passes. This check exists to catch a channel
--   that is not what we think it is, not to test the database.
--
-- ⛔ REQUIRED POST-APPLY GATE — an APPLY-LANE STOP THIS SQL CANNOT
--   ENFORCE. Assertion 13 proves ONLY in-database EXECUTE by a member
--   of service_role, PRE-COMMIT, inside this transaction. It does NOT
--   prove the consumption path. Three failure modes sit outside it:
--   whether PostgREST exposes and serialises a function whose return
--   composite lives in the UNEXPOSED schema ice_ro; the schema-cache
--   reload; and anything post-commit. db-rls-auditor could not resolve
--   the first read-only and said so: there is ZERO PRECEDENT in this
--   database — all three SETOF-composite functions return types from
--   schema `m`, which IS exposed; all 35 `setof` functions in `public`
--   return `record`; exec_sql returns jsonb. This is genuinely
--   unproven, not merely unverified. The apply is NOT complete until:
--     (a) CONSUMPTION PROOF. Call supabase.rpc('get_publish_status_v2')
--         live from a server-side service client. It must return an
--         ARRAY OF ROW OBJECTS EACH CARRYING THE 19 CONTRACT KEYS.
--         ON ROW COUNT — read this carefully, because the obvious
--         phrasing is wrong: "a count equal to m.post_publish" is
--         exactly the comparison this artifact rejected internally (it
--         is why assertion 9 reads both counts in ONE statement). Two
--         counts taken independently across a network boundary cannot
--         be simultaneous, and m.post_publish is actively written, so
--         one concurrent publish would either trip a STOP that voids a
--         T3 sequence or invite an operator to rationalise the delta by
--         hand — and an ambiguous STOP is a discretionary STOP. PASS
--         CONDITION: the RPC count EQUALS the m.post_publish count, OR
--         exceeds it by a delta explicable by publishes landing between
--         the two readings — in which case RE-READ BOTH ONCE before
--         declaring anything (the same read-then-re-check discipline
--         applied to the cache case below). A shortfall, a key/shape
--         mismatch, a PGRST-class error, or a schema-cache miss that
--         survives one reload is a STOP THAT VOIDS THE REMAINDER OF THE
--         SEQUENCE. If the RPC is not visible, re-issue
--         `NOTIFY pgrst, 'reload schema'` and re-check BEFORE declaring
--         a STOP, so cache lag is never misread as a design failure.
--     (b) ADVISOR NON-REGRESSION. Re-run get_advisors(security) and
--         confirm exactly: function_search_path_mutable 92 ·
--         anon_security_definer_function_executable 40 ·
--         authenticated_security_definer_function_executable 49. ANY
--         increase means the search_path pin or the REVOKE did not hold
--         → STOP.
-- IF GATE (a) FAILS: re-cut with an explicit RETURNS TABLE(...)
--   signature. SETOF is deliberately not abandoned pre-emptively — it
--   is the better design if it works, and the gate is what tells us.
--   The RETURNS TABLE drift cost is machine-closable at apply time by
--   comparing the function's ordered (proargnames, proallargtypes)
--   where proargmodes='t' against the view's ordered pg_attribute list,
--   failing closed; the honest residual is only drift introduced LATER
--   by altering the view. ⚠ A re-cut takes a NEW MIGRATION NUMBER AND A
--   DISTINCT NAME — never an edit under the same identity.
--
-- =====================================================================
-- ── SOURCE CONTRACT (the authoritative reader's guide) ───────────────
--
-- (a) FIELDS — 19 columns, identical for BOTH objects (the RPC returns
--     SETOF the view's row type). Ordered names pinned by assertion 7.
--     TYPES ARE NOT PINNED by assertion: only destination_id was
--     independently type-verified, so pinning the rest would assert
--     more than was checked.
--   post_publish_id        uuid  PK of m.post_publish. ONE ROW = ONE
--                                PUBLISH EVENT (per-platform,
--                                per-attempt) — NOT one draft.
--   post_draft_id          uuid  FK to m.post_draft. NOT UNIQUE here —
--                                a draft may publish on 2 platforms (28
--                                known) and may have several attempts.
--   attempt_no             int   Publisher attempt ordinal.
--   publish_status         text  m.post_publish.status VERBATIM. See (b).
--   platform               text  m.post_publish.platform —
--                                AUTHORITATIVE (what actually
--                                published). ⚠ NULLABLE: "authoritative"
--                                means "the right column to trust", NOT
--                                "never NULL".
--   platform_post_id       text  Platform's own post/video ID.
--                                Identifier, not a secret.
--   published_at           tstz  When the platform accepted the post.
--   queue_id               uuid  HISTORICAL / AUDIT POINTER ONLY. A
--                                non-NULL value does NOT mean a live
--                                m.post_publish_queue row exists —
--                                FB/IG/LinkedIn queue rows are DELETED
--                                on publish success, and YouTube's is
--                                NULL from row creation. NEVER join this
--                                to the queue and infer liveness.
--   ai_job_id              uuid  Originating AI job pointer.
--   client_id              uuid  Owning client. ⚠ NULLABLE.
--   client_slug            text  From c.client; NULL if client_id is
--                                NULL or the client row is missing
--                                (LEFT JOIN, fail-visible by design).
--   destination_id         TEXT  ⚠ TEXT, **not** uuid. Do not cast blindly.
--   publish_created_at     tstz  m.post_publish.created_at (row birth;
--                                distinct from published_at).
--   draft_approval_status  text  m.post_draft.approval_status —
--                                WHOLE-DRAFT, NOT per-platform. NULL
--                                only when no draft row matched.
--   draft_platform         text  m.post_draft.platform — CROSS-CHECK
--                                ONLY. May disagree with `platform`
--                                (155 known). NEVER authoritative.
--   draft_video_status     text  m.post_draft.video_status — YouTube's
--                                correct per-platform marker.
--   public_permalink       text  Public URL, or NULL. See (c) and (d).
--   draft_state_anomaly_reason text
--                                NULL |
--                                'dead_or_rejected_draft_but_published' |
--                                'draft_row_missing'.
--   draft_state_anomaly    bool  NEVER NULL. true iff a reason applies.
--
-- (b) STATUS VOCABULARY AND ITS SOURCE — all three pass through
--     VERBATIM; this view neither remaps nor filters:
--   publish_status ← m.post_publish.status. CHECK-CLOSED to
--     {queued, sent, failed, retrying, published}; live: published
--     1510, failed 283. Nothing like 'success'/'succeeded' exists or is
--     permitted, so keying the anomaly rule on ='published' is
--     exhaustive for the published case. ⚠ LATENT GAP: 'sent' is
--     PERMITTED BUT UNOBSERVED (0 rows) and is NOT counted as
--     published, so a 'sent' row will never raise an anomaly even if
--     its draft is dead — a deliberate conservative choice, and a named
--     follow-up if any publisher starts writing 'sent'.
--   draft_approval_status ← m.post_draft.approval_status. CHECK-CLOSED
--     to 8 values, 6 live, ZERO NULLs (and NOT NULL at schema level).
--     The terminal-negative set used by the anomaly rule —
--     {dead, rejected, voided, draft} — is EXHAUSTIVE against the live
--     set. 'needs_review' and 'scheduled' are NEUTRAL / IN-FLIGHT and
--     deliberately NOT anomalous.
--   draft_video_status ← m.post_draft.video_status. NO check
--     constraint; live {NULL, published, failed, archived_stale,
--     generated, pending}. Tolerate NULL; do not assume closure.
--
-- (c) PLATFORM URL BEHAVIOUR — extraction is by KEY, never by platform
--     name, so a NULL or unexpected platform cannot suppress a real
--     link (the 54 WordPress rows carry platform='website', NOT
--     'wordpress', and platform is nullable — a platform-gated CASE
--     would have silently nulled all of them):
--     platform='youtube' → response_payload->>'youtube_url'
--                          (188 rows, canonical 43-char watch URLs)
--     platform='website' → response_payload->>'wp_post_url'
--                          (54 rows, 69-110 chars)
--     Facebook / Instagram / LinkedIn → ALWAYS NULL; no URL key exists
--                          in their payloads (`ig_media_id` is an ID,
--                          not a URL, and is not extracted).
--     No other key is ever read (PINNED, assertion 8). Zero rows carry
--     both keys; if one ever does, youtube_url wins by COALESCE
--     argument order — a documented invariant, not fixed in SQL,
--     because a `permalink_source` column would break the pinned
--     19-column contract.
--
-- (d) UNAVAILABLE-LINK BEHAVIOUR: `public_permalink IS NULL` means
--     "this publish record carries no public URL for that platform."
--     NOT "the publish failed", NOT "was not published", NOT "data
--     missing" — check publish_status and published_at for that. NULL
--     is CORRECT and EXPECTED for every Facebook, Instagram and
--     LinkedIn row. A URL is never synthesized, templated or inferred.
--     Consumers MUST render the no-link case as a legitimate state,
--     never as an error, never as an empty-string href.
--
-- (e) PERMISSIONS / ACCESS PATH:
--   OBJECT 1 — ice_ro.publish_status_v2
--     * `ice_readonly` via `python scripts/db-read.py "SELECT … FROM
--       ice_ro.publish_status_v2 …"` — THE INTENDED AUDIENCE. That role
--       holds USAGE on ice_ro only (never m or c), no write privilege
--       anywhere, and is default_transaction_read_only. It reads this
--       view because the view is non-security_invoker and runs with
--       OWNER rights over the base tables; the role never gains
--       base-table access. Checked at apply time by assertion 17.
--     * The owner (postgres) and any superuser.
--     * NOT PUBLIC / anon / authenticated (assertion 4); no PostgREST
--       route to ice_ro exists anyway.
--     * service_role has NO direct route (assertion 15) but reaches the
--       data via the pre-existing exec_sql path, or — preferably —
--       object 2.
--   OBJECT 2 — public.get_publish_status_v2()
--     * Schema `public` (only an exposed schema is callable by
--       supabase.rpc()). ZERO arguments. Returns SETOF
--       ice_ro.publish_status_v2 — the same 19 columns by construction.
--     * SECURITY DEFINER, owner postgres, STABLE, search_path=""
--       (assertion 10). Callable by `service_role` ONLY, enforced as an
--       allow-list (assertion 12).
--     * ⚠ In-database EXECUTE is proven pre-commit (assertion 13). THE
--       supabase.rpc() CONSUMPTION PATH IS NOT PROVEN BY THIS FILE and
--       has zero precedent in this database for an unexposed-schema
--       return composite. It MUST clear the POST-APPLY GATE above
--       before any consumer is pointed at it.
--     * Requires NO new dependency on exec_sql — the point.
--   ROW SCOPE, BOTH OBJECTS: NO row-level filtering. Both return ALL
--     clients' rows (~1793). NEITHER is a tenant-safe surface.
-- =====================================================================


BEGIN;   -- nested no-op under both named channels; the DO block is the real boundary

DO $apply$
DECLARE
  n                 int;
  n_before          int;
  n_after           int;
  n_base_rows       int;
  n_view_rows       int;
  v_old_view        regclass;
  v_old_def_before  text;
  v_old_def_after   text;
  v_new_def         text;
  v_fn_src          text;
  v_cols            text[];
  v_granted_pre     text[];
  v_granted_post    text[];
  v_keys            text[];
  v_fn_grantees     text[];
  v_prior_role      text;
  v_expected_cols   text[] := ARRAY[
    'post_publish_id','post_draft_id','attempt_no','publish_status','platform',
    'platform_post_id','published_at','queue_id','ai_job_id','client_id',
    'client_slug','destination_id','publish_created_at','draft_approval_status',
    'draft_platform','draft_video_status','public_permalink',
    'draft_state_anomaly_reason','draft_state_anomaly'
  ];
BEGIN
  -- ===================================================================
  -- STEP 1 — PRECONDITIONS + BASELINES (before any effect)
  -- ===================================================================

  -- Remember the session's prior role so the probes restore it exactly:
  -- RESET ROLE would clear a session-level SET ROLE an operator had set
  -- beforehand, which SET LOCAL never touches.
  v_prior_role := current_setting('role');

  -- 1a. Neither new object may already exist (fail closed on a re-run,
  --     and refuse to CREATE OR REPLACE over an unknown ACL).
  IF to_regclass('ice_ro.publish_status_v2') IS NOT NULL THEN
    RAISE EXCEPTION 'publish_status_v2 precondition: ice_ro.publish_status_v2 already exists — this artifact is not idempotent by design; investigate before re-applying';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
             WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2') THEN
    RAISE EXCEPTION 'publish_status_v2 precondition: public.get_publish_status_v2 already exists — refusing to CREATE OR REPLACE over an unknown ACL (CREATE OR REPLACE preserves the existing ACL)';
  END IF;

  -- 1b. The ORIGINAL queue-backed view must exist AND still be
  --     queue-backed. If it was already corrected in place, this
  --     artifact's premise is stale → fail closed.
  v_old_view := to_regclass('ice_ro.publish_status');
  IF v_old_view IS NULL THEN
    RAISE EXCEPTION 'publish_status_v2 precondition: the original ice_ro.publish_status view was not found — baseline is not what this artifact was authored against';
  END IF;
  v_old_def_before := pg_get_viewdef(v_old_view);
  IF position('post_publish_queue' IN v_old_def_before) = 0 THEN
    RAISE EXCEPTION 'publish_status_v2 precondition: the original ice_ro.publish_status is no longer defined over m.post_publish_queue — its definition changed since authoring; re-review before applying';
  END IF;

  -- 1c. Grant baselines. The scalar count feeds the closing NOTICE; the
  --     SET is what guards, because a bare +/-1 count cannot catch a
  --     PAIRED collateral change (one view's grant revoked and
  --     another's granted nets to the expected delta). Over aclexplode,
  --     not information_schema — this is a completeness claim.
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
    RAISE EXCEPTION 'publish_status_v2 precondition: ice_readonly holds SELECT on zero ice_ro relations — baseline is not what this artifact was authored against';
  END IF;

  -- ===================================================================
  -- STEP 2 — EFFECTS (same DO block ⇒ same statement ⇒ any RAISE below
  -- rolls ALL of this back)
  -- ===================================================================

  -- 2a. The view — the ONE definition of the 19-column shape.
  EXECUTE $view$
    CREATE VIEW ice_ro.publish_status_v2 AS
    SELECT
      pp.post_publish_id,
      pp.post_draft_id,
      pp.attempt_no,
      pp.status                AS publish_status,
      pp.platform,
      pp.platform_post_id,
      pp.published_at,
      pp.queue_id,
      pp.ai_job_id,
      pp.client_id,
      cl.client_slug,
      pp.destination_id,
      pp.created_at            AS publish_created_at,
      pd.approval_status       AS draft_approval_status,
      pd.platform              AS draft_platform,
      pd.video_status          AS draft_video_status,
      COALESCE(
        pp.response_payload ->> 'youtube_url',
        pp.response_payload ->> 'wp_post_url'
      )                        AS public_permalink,
      CASE
        WHEN pd.post_draft_id IS NULL THEN 'draft_row_missing'
        WHEN pd.approval_status IN ('dead','rejected','voided','draft')
             AND pp.status = 'published' THEN 'dead_or_rejected_draft_but_published'
        ELSE NULL
      END                      AS draft_state_anomaly_reason,
      COALESCE(
        pd.post_draft_id IS NULL
        OR (pd.approval_status IN ('dead','rejected','voided','draft')
            AND pp.status = 'published'),
        false
      )                        AS draft_state_anomaly
    FROM m.post_publish pp
    LEFT JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
    LEFT JOIN c.client cl     ON cl.client_id     = pp.client_id
  $view$;

  EXECUTE 'GRANT SELECT ON ice_ro.publish_status_v2 TO ice_readonly';
  EXECUTE 'REVOKE ALL ON ice_ro.publish_status_v2 FROM PUBLIC, anon, authenticated';

  -- 2b. The companion RPC. RETURNS SETOF the view's row type ⇒ the
  --     19-column shape is declared exactly once, in 2a.
  EXECUTE $fn$
    CREATE FUNCTION public.get_publish_status_v2()
      RETURNS SETOF ice_ro.publish_status_v2
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
    AS $body$
      SELECT * FROM ice_ro.publish_status_v2
    $body$
  $fn$;

  -- ORDER IS LOAD-BEARING (born anon-executable via pg_default_acl):
  -- REVOKE first, then grant only service_role. Verified as an
  -- allow-list by assertion 12.
  EXECUTE 'REVOKE ALL ON FUNCTION public.get_publish_status_v2() FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.get_publish_status_v2() FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.get_publish_status_v2() FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_publish_status_v2() TO service_role';

  -- ===================================================================
  -- STEP 3 — FAIL-CLOSED ASSERTIONS (every one executable; there is no
  -- comment-only guard anywhere in this artifact)
  -- ===================================================================

  v_new_def := pg_get_viewdef('ice_ro.publish_status_v2'::regclass);
  SELECT p.prosrc INTO STRICT v_fn_src
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2';

  -- 1. the view exists and is a view
  SELECT count(*) INTO STRICT n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v' AND c.relname = 'publish_status_v2';
  IF n <> 1 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 1: expected exactly 1 new ice_ro view, found %', n;
  END IF;

  -- 2. the ORIGINAL view is byte-for-byte unchanged — actually TESTED
  --    (md5 before vs after), not merely claimed
  v_old_view := to_regclass('ice_ro.publish_status');
  IF v_old_view IS NULL THEN
    RAISE EXCEPTION 'publish_status_v2 assert 2: the original ice_ro.publish_status disappeared during this apply';
  END IF;
  v_old_def_after := pg_get_viewdef(v_old_view);
  IF md5(v_old_def_after) <> md5(v_old_def_before) THEN
    RAISE EXCEPTION 'publish_status_v2 assert 2: the original ice_ro.publish_status definition CHANGED during this apply (md5 % -> %)',
      md5(v_old_def_before), md5(v_old_def_after);
  END IF;

  -- 3. non-security_invoker (else it would run as the caller and lose
  --    base access to m.post_publish / m.post_draft / c.client)
  SELECT count(*) INTO STRICT n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v' AND c.relname = 'publish_status_v2'
    AND lower((SELECT option_value FROM pg_options_to_table(c.reloptions)
               WHERE option_name = 'security_invoker')) IN ('true','on','yes','1');
  IF n <> 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 3: the new view is security_invoker';
  END IF;

  -- 4. zero PUBLIC/anon/authenticated exposure on the view. The
  --    has_table_privilege belt is REQUIRED, not redundant: it resolves
  --    privileges inherited via PUBLIC, invisible to a grantee-name match.
  SELECT count(*) INTO STRICT n
  FROM information_schema.role_table_grants
  WHERE table_schema = 'ice_ro' AND table_name = 'publish_status_v2'
    AND grantee IN ('PUBLIC','anon','authenticated');
  IF n <> 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 4: % PUBLIC/anon/authenticated grant(s) on the new view', n;
  END IF;
  IF has_table_privilege('anon','ice_ro.publish_status_v2','SELECT')
     OR has_table_privilege('authenticated','ice_ro.publish_status_v2','SELECT') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 4: anon/authenticated can SELECT the new view';
  END IF;

  -- 5. exactly one ice_readonly SELECT grant on the new view
  --    (expected-NON-zero ⇒ visibility filtering can only fail it closed)
  SELECT count(*) INTO STRICT n
  FROM information_schema.role_table_grants
  WHERE table_schema = 'ice_ro' AND table_name = 'publish_status_v2'
    AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';
  IF n <> 1 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 5: expected exactly 1 ice_readonly SELECT grant on the new view, got %', n;
  END IF;

  -- 6. GRANT SET comparison (not a scalar delta) + confinement.
  SELECT array_agg(DISTINCT c.relname::text ORDER BY c.relname::text)
  INTO STRICT v_granted_post
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) a
  WHERE ns.nspname = 'ice_ro'
    AND a.grantee = 'ice_readonly'::regrole
    AND a.privilege_type = 'SELECT';
  IF v_granted_post IS DISTINCT FROM
     (SELECT array_agg(t ORDER BY t)
        FROM unnest(v_granted_pre || ARRAY['publish_status_v2']) t) THEN
    RAISE EXCEPTION 'publish_status_v2 assert 6: the ice_readonly ice_ro grant set is not exactly the pre-apply set PLUS publish_status_v2 — a collateral grant change occurred. pre=% post=%',
      v_granted_pre, v_granted_post;
  END IF;
  SELECT count(*) INTO STRICT n_after
  FROM information_schema.role_table_grants
  WHERE table_schema = 'ice_ro' AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';
  IF has_schema_privilege('ice_readonly','m','USAGE') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 6: ice_readonly gained USAGE on schema m';
  END IF;
  IF has_schema_privilege('ice_readonly','c','USAGE') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 6: ice_readonly gained USAGE on schema c';
  END IF;
  SELECT count(*) INTO STRICT n
  FROM pg_class rel
  CROSS JOIN LATERAL aclexplode(rel.relacl) acl
  WHERE acl.grantee = 'ice_readonly'::regrole
    AND acl.privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
  IF n <> 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 6: ice_readonly holds % write privilege(s) (relacl/aclexplode sweep, not visibility-filtered)', n;
  END IF;

  -- 7. COLUMN CONTRACT — ordered NAMES against the 19-element literal.
  SELECT array_agg(column_name::text ORDER BY ordinal_position)
  INTO STRICT v_cols
  FROM information_schema.columns
  WHERE table_schema = 'ice_ro' AND table_name = 'publish_status_v2';
  IF v_cols IS DISTINCT FROM v_expected_cols THEN
    RAISE EXCEPTION 'publish_status_v2 assert 7: column contract mismatch. expected % got %', v_expected_cols, v_cols;
  END IF;

  -- 8. SECRET-FREE on the view — four sub-claims, all enforced.
  SELECT count(*) INTO STRICT n
  FROM information_schema.columns
  WHERE table_schema = 'ice_ro' AND table_name = 'publish_status_v2'
    AND column_name IN ('request_payload','response_payload','error');
  IF n <> 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 8: the view exposes % hard-excluded secret-bearing column(s)', n;
  END IF;
  IF position('webhook_prefix' IN v_new_def) > 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 8: the view references webhook_prefix (372 live Zapier catch-hook URLs — bearer-equivalent)';
  END IF;
  --    OCCURRENCE PIN — the real guard. A key-literal regex alone
  --    silently misses a JSON-path operand (response_payload #>>
  --    '{data,app_id}') and a non-literal key (response_payload ->>
  --    some_col): both still reach the /debug_token blob while
  --    returning the permitted key set. Counting references closes
  --    every form.
  n := (length(v_new_def) - length(replace(v_new_def, 'response_payload', '')))
       / length('response_payload');
  IF n <> 2 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 8: response_payload must be referenced EXACTLY twice in the view (the two permitted key extractions); found % — any third reference, JSON-path operand (#>>/#>) or dynamic key is forbidden', n;
  END IF;
  --    …and those two references must extract exactly the permitted
  --    pair. Catches SUBSTITUTION, which the occurrence count cannot.
  SELECT array_agg(DISTINCT k[1] ORDER BY k[1]) INTO STRICT v_keys
  FROM regexp_matches(v_new_def, 'response_payload\s*->>?\s*''([A-Za-z0-9_]+)''', 'g') AS k;
  IF v_keys IS DISTINCT FROM ARRAY['wp_post_url','youtube_url'] THEN
    RAISE EXCEPTION 'publish_status_v2 assert 8: the response_payload key extraction set must be EXACTLY {wp_post_url, youtube_url}; found %. In particular the `data` key is a Facebook /debug_token blob (app_id, scopes, user_id) and must never be extracted.', v_keys;
  END IF;

  -- 9. ROW PARITY — relative AND SNAPSHOT-CONSISTENT. Both counts are
  --    read in ONE statement so they share a snapshot: under READ
  --    COMMITTED two separate counts take two snapshots, and because
  --    m.post_publish is actively written, a single concurrent INSERT
  --    would abort a CORRECT apply and make genuine fan-out
  --    indistinguishable from ordinary concurrency. No total hardcoded.
  SELECT (SELECT count(*) FROM m.post_publish),
         (SELECT count(*) FROM ice_ro.publish_status_v2)
  INTO STRICT n_base_rows, n_view_rows;
  IF n_view_rows <> n_base_rows THEN
    RAISE EXCEPTION 'publish_status_v2 assert 9: row parity FAILED — m.post_publish has % row(s) but the view returns % (LEFT JOIN fan-out or drop; a duplicate c.client or m.post_draft key is the usual cause)', n_base_rows, n_view_rows;
  END IF;

  -- 10. the RPC: SECURITY DEFINER · owner postgres · STABLE · and an
  --     EXACTLY-EMPTY search_path (stored as the proconfig element
  --     search_path="" — pinning that exact value is what distinguishes
  --     it from search_path=public, which an "is some search_path set?"
  --     test would pass). Owner and volatility are asserted because for
  --     a SECURITY DEFINER function the OWNER IS THE EFFECTIVE
  --     PRIVILEGE SET.
  SELECT count(*) INTO STRICT n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2'
    AND p.prosecdef
    AND p.proowner = 'postgres'::regrole
    AND p.provolatile = 's'
    AND p.proconfig @> ARRAY['search_path=""'];
  IF n <> 1 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 10: expected exactly 1 public.get_publish_status_v2 that is SECURITY DEFINER, owned by postgres, STABLE, with proconfig containing search_path="" — found %', n;
  END IF;

  -- 11. the RPC's return type IS the view's row type — what makes a
  --     second, drifting column list impossible
  SELECT count(*) INTO STRICT n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2'
    AND p.proretset
    AND p.prorettype = (SELECT c.reltype FROM pg_class c JOIN pg_namespace n2 ON n2.oid = c.relnamespace
                        WHERE n2.nspname = 'ice_ro' AND c.relname = 'publish_status_v2');
  IF n <> 1 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 11: the RPC does not return SETOF ice_ro.publish_status_v2 — the single-definition guarantee is broken';
  END IF;

  -- 12. RPC EXECUTE ACL as an ALLOW-LIST: grantee set must be EXACTLY
  --     {postgres, service_role}. Stronger than naming three forbidden
  --     roles — anything unexpected fails, including PUBLIC (grantee
  --     oid 0, which renders as '-'). This is the check that proves the
  --     born-anon-executable pg_default_acl hazard closed.
  SELECT array_agg(DISTINCT a.grantee::regrole::text ORDER BY a.grantee::regrole::text)
  INTO STRICT v_fn_grantees
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  CROSS JOIN LATERAL aclexplode(p.proacl) a
  WHERE ns.nspname = 'public' AND p.proname = 'get_publish_status_v2'
    AND a.privilege_type = 'EXECUTE';
  IF v_fn_grantees IS DISTINCT FROM ARRAY['postgres','service_role'] THEN
    RAISE EXCEPTION 'publish_status_v2 assert 12: the RPC EXECUTE grantee set must be EXACTLY {postgres, service_role}; found % (PUBLIC renders as ''-'')', v_fn_grantees;
  END IF;
  IF NOT has_function_privilege('service_role','public.get_publish_status_v2()','EXECUTE') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 12: service_role CANNOT execute the RPC — the companion object would be useless to the dashboard';
  END IF;

  -- 13. IN-DATABASE EXECUTE PROBE — NARROW CLAIM. Proves ONLY that a
  --     member of service_role can EXECUTE the function inside this
  --     transaction, pre-commit. It does NOT prove the supabase.rpc()
  --     consumption path — that is the REQUIRED POST-APPLY GATE.
  --     Membership is checked first and separately so "the probe could
  --     not run" is never confused with "the RPC is unreachable".
  IF NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 13: cannot run the in-database probe — the executing role (%) is not a member of service_role. PROBE-ENVIRONMENT limitation, NOT evidence the RPC is broken. Run the PRE-APPLY CHANNEL CHECK named in the header before applying. Refusing to ship an unproven reachability claim.', current_user;
  END IF;
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM 1 FROM public.get_publish_status_v2() LIMIT 1;
    IF v_prior_role = 'none' THEN RESET ROLE; ELSE EXECUTE format('SET LOCAL ROLE %I', v_prior_role); END IF;
  EXCEPTION WHEN OTHERS THEN
    IF v_prior_role = 'none' THEN RESET ROLE; ELSE EXECUTE format('SET LOCAL ROLE %I', v_prior_role); END IF;
    RAISE EXCEPTION 'publish_status_v2 assert 13: service_role could not execute public.get_publish_status_v2(): % (SQLSTATE %). Re-cut with the RETURNS TABLE contingency, under a NEW migration number and distinct name.', SQLERRM, SQLSTATE;
  END;

  -- 14. SECRET-FREE on the COMPANION — not inherited by assumption.
  IF position('webhook_prefix'    IN v_fn_src) > 0
     OR position('request_payload'  IN v_fn_src) > 0
     OR position('response_payload' IN v_fn_src) > 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 14: the RPC body references a hard-excluded secret-bearing column/key';
  END IF;
  SELECT count(*) INTO STRICT n
  FROM pg_attribute a
  WHERE a.attrelid = 'ice_ro.publish_status_v2'::regclass
    AND a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('request_payload','response_payload','error');
  IF n <> 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 14: the RPC return type exposes % hard-excluded column(s)', n;
  END IF;

  -- 15. THE PREMISE OF THE COMPANION-RPC DESIGN, asserted rather than
  --     assumed: service_role must NOT hold USAGE on ice_ro. If it did,
  --     the RPC would be unnecessary and every ice_ro view would
  --     already be directly reachable.
  IF has_schema_privilege('service_role','ice_ro','USAGE') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 15: service_role HOLDS USAGE on schema ice_ro — the premise of the companion-RPC design is false and the confinement of every ice_ro view is broader than documented. STOP.';
  END IF;

  -- 16. THE ANOMALY BICONTITIONAL. HONEST SCOPE: during THIS apply this
  --     is a CONSTRUCTION TAUTOLOGY — the view was created 200 lines
  --     above from a definition whose two encodings of the anomaly rule
  --     (the CASE producing the reason, and the COALESCE'd boolean)
  --     provably agree, so it cannot fail here. It is NOT apply-time
  --     proof of anything. Its value is as a RE-CUT GUARD: if a future
  --     revision edits the CASE or drops the COALESCE, this fails
  --     closed at that apply. One seq scan over ~1793 rows is free, so
  --     it stays.
  SELECT count(*) INTO STRICT n
  FROM ice_ro.publish_status_v2
  WHERE draft_state_anomaly IS NULL
     OR draft_state_anomaly IS DISTINCT FROM (draft_state_anomaly_reason IS NOT NULL);
  IF n <> 0 THEN
    RAISE EXCEPTION 'publish_status_v2 assert 16: % row(s) violate the anomaly contract (flag NULL, or flag <> (reason IS NOT NULL)) — the two encodings of the anomaly rule inside the view have diverged', n;
  END IF;

  -- 17. OBJECT 1 REACHABILITY — the PRIMARY surface gets proof too. If
  --     ice_readonly could not read it, the apply would report success
  --     while the operator surface was dead on arrival.
  IF NOT has_schema_privilege('ice_readonly','ice_ro','USAGE') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 17: ice_readonly lacks USAGE on schema ice_ro — the R0 operator surface would be unreachable';
  END IF;
  IF NOT has_table_privilege('ice_readonly','ice_ro.publish_status_v2','SELECT') THEN
    RAISE EXCEPTION 'publish_status_v2 assert 17: ice_readonly cannot SELECT the new view — the R0 operator surface would be unreachable';
  END IF;
  --     The probe below is what actually closes this. The privilege
  --     checks above do NOT by themselves determine readability: they
  --     say nothing about the view owner still holding base-table
  --     SELECT, nor about RLS on the source tables. Those are covered
  --     in fact by assertions 9 and 16, which both SELECT the view and
  --     would fail if either were broken. postgres is a member of
  --     ice_readonly, so under the named channel this probe RUNS and
  --     the WARNING branch is unreachable; the branch exists only so a
  --     non-member channel degrades to a named gap rather than a
  --     spurious abort.
  IF pg_has_role(current_user, 'ice_readonly', 'MEMBER') THEN
    BEGIN
      SET LOCAL ROLE ice_readonly;
      PERFORM 1 FROM ice_ro.publish_status_v2 LIMIT 1;
      IF v_prior_role = 'none' THEN RESET ROLE; ELSE EXECUTE format('SET LOCAL ROLE %I', v_prior_role); END IF;
    EXCEPTION WHEN OTHERS THEN
      IF v_prior_role = 'none' THEN RESET ROLE; ELSE EXECUTE format('SET LOCAL ROLE %I', v_prior_role); END IF;
      RAISE EXCEPTION 'publish_status_v2 assert 17: ice_readonly holds the privileges but could NOT actually read the view: % (SQLSTATE %)', SQLERRM, SQLSTATE;
    END;
  ELSE
    RAISE WARNING 'publish_status_v2 assert 17: executing role (%) is not a member of ice_readonly, so the direct read probe was SKIPPED — reachability rests on the privilege checks plus assertions 9/16 having read the view successfully.', current_user;
  END IF;

  -- ===================================================================
  -- STEP 4 — CLOSE OUT
  -- ===================================================================
  -- BELT, not the mechanism: Supabase's extensions.pgrst_ddl_watch
  -- event trigger already NOTIFYs pgrst on CREATE VIEW / CREATE
  -- FUNCTION. Duplicate identical notifies in one transaction collapse,
  -- and this is delivered only on COMMIT.
  PERFORM pg_notify('pgrst', 'reload schema');

  -- Emit the identity pins into the apply transcript automatically, so
  -- the rollback's exact-pin step does not depend on anyone remembering
  -- an out-of-channel query afterwards.
  RAISE NOTICE 'publish_status_v2 IDENTITY PINS (record in the lane result doc): view md5(pg_get_viewdef)=% | rpc md5(prosrc)=%',
    md5(v_new_def), md5(v_fn_src);
  RAISE NOTICE 'publish_status_v2 ok: view created (19 cols name-pinned, snapshot-consistent row parity %=%), grant SET unchanged bar +publish_status_v2 (count % -> %), companion RPC SECURITY DEFINER/postgres-owned/STABLE/search_path=""/EXECUTE={postgres,service_role} probed in-database as service_role, original publish_status md5-unchanged, response_payload referenced exactly twice extracting only {wp_post_url,youtube_url}, ice_readonly reachability probed, service_role has NO ice_ro USAGE. NOT COMPLETE UNTIL THE POST-APPLY GATE (live supabase.rpc + advisor non-regression) PASSES.',
    n_base_rows, n_view_rows, n_before, n_after;
END
$apply$;

COMMIT;

-- END NOT_APPLIED_publish_status_corrected_read_view_v1.sql
-- =====================================================================
