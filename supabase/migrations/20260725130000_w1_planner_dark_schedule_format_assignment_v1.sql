-- 20260725130000_w1_planner_dark_schedule_format_assignment_v1.sql
-- =============================================================================================
-- WRITABLE PLANNER — W1: the DARK per-schedule-row format-assignment data model + read-path RPC.
--
-- ⛔ PLANNED — NOT YET ENFORCED. NOT APPLIED. Freeze at Gate 2 for review (branch-warden,
--    db-rls-auditor, external review, PK deploy/migrate HARD STOP). This file authors storage
--    and a read-only read path ONLY. It changes NO production behaviour.
--
-- Gate-1 authority (the scope):
--   * docs/briefs/writable-planner-format-per-slot-contract-gate1-v1.md — §2 fields, §7 versioning,
--     §8 provenance/actor-identity caveat, §9 migration, §12 slicing (W1).
--   * docs/briefs/resolver-enforcement-r3-contract-gate1-v1.md — §7 D1 natural-tuple identity.
--     THIS OVERRIDES the planner §2 `schedule_id` key. PK gave Gate-1 approval for W1/W2 ONLY.
--
-- WHAT THIS DOES:
--   1. Creates the DARK table c.client_schedule_format_assignment, keyed by the R3 D1 natural
--      tuple (client_id, platform, day_of_week, publish_time) — NOT schedule_id — so a pin
--      survives save_publish_schedule's DELETE-then-INSERT churn (planner §9.1 / R3 §7 finding).
--   2. Creates the read-only RPC public.get_schedule_planner_state(uuid) that reports each enabled
--      schedule row's planner state, stamping enforcement_status='planned_not_enforced' on EVERY
--      row so W1/W2 can never claim production honours the pin.
--
-- WHAT THIS DOES NOT DO (STRICTLY OUT OF SCOPE for W1):
--   * NO write path (no INSERT/UPDATE surface) — that is W3, gated on cc-0079 R3c. Not built here.
--   * NO change to c.save_publish_schedule (the delete-recreate write path is untouched).
--   * NO change to any worker / edge function. This table is read by NO production worker; the RPC
--     is read by nothing yet. It does NOT read or write m.post_draft.recommended_format, does NOT
--     call the allocator (m.build_weekly_demand_grid / m.allocate_week_formats), and does NOT imply
--     the pin governs anything. A pin here does NOT govern production until cc-0079 R3c flips the
--     resolver to read planner intent.
--   * NO enforcement, NO resolver, NO capability gate — all downstream of W1.
--
-- SECURITY POSTURE (house traps honoured):
--   * schema c IS REST-exposed. (Precision: the "born anon-readable" pg_default_acl default is a
--     schema-PUBLIC behaviour; schema c's live default ACL grants new tables to service_role/
--     inspector_ro, NOT anon/authenticated — so anon/authenticated are never born with access.)
--     REVOKE ALL FROM PUBLIC, anon, authenticated is therefore defense in depth, and because c is
--     REST-exposed the actual guard is RLS ENABLED with NO policies = deny-all to every non-BYPASSRLS
--     role. The read path is the SECDEF RPC below (runs as owner = postgres, which bypasses RLS); the
--     default-granted service_role SELECT is REVOKEd below too, so NO direct role has table access.
--   * a new public.* FUNCTION is born anon+authenticated EXECUTABLE (pg_default_acl trap): so
--     REVOKE EXECUTE FROM PUBLIC, anon, authenticated and GRANT EXECUTE TO service_role only —
--     mirroring the get_publishing_plan_pyramid grant posture.
--   * the RPC is SECURITY DEFINER, SET search_path = '' (every object fully schema-qualified),
--     LANGUAGE sql, STABLE (read-only; no INSERT/UPDATE/DELETE).
--
-- TRANSACTION SHAPE: no explicit BEGIN/COMMIT, deliberately — apply_migration wraps the file in its
--   own transaction, so the CREATE TABLE + CREATE INDEX + CREATE FUNCTION + REVOKE/GRANT + COMMENTs
--   apply atomically (any failure rolls the whole file back). An explicit BEGIN could conflict with
--   a caller-supplied transaction (same reasoning as cc-0063).
--
-- REVERSIBILITY: fully reversible, additive-only, destroys NO existing object. Rollback block at the
--   foot of this file and mirrored as a comment; a standalone rollback sibling may be authored at
--   apply time. Rollback = DROP the function then DROP the table (no other object is created).
--
-- MIGRATION NAME IS PERMANENT IDENTITY. A revision gets a NEW number and a DISTINCT name — never
--   this name with different SQL.
-- ⚠ apply_migration mints its OWN version from wall clock and ignores this filename; the repo
--   filename and the applied ledger version WILL diverge. Decide rename-or-record BEFORE commit and
--   state which was chosen in the result doc.
-- =============================================================================================

-- ---------------------------------------------------------------------------------------------
-- OBJECT 1 — the DARK table: one governed format assignment per schedule natural-tuple row.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE c.client_schedule_format_assignment (
  assignment_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- D1 natural-tuple identity (NOT schedule_id) — matches the UNIQUE constraint on
  -- c.client_publish_schedule (client_id, platform, day_of_week, publish_time), which is the
  -- stable identity that survives save_publish_schedule's delete-recreate churn.
  client_id          uuid    NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform           text    NOT NULL REFERENCES t."5.0_social_platform"(platform_code),
  day_of_week        integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- Sunday = 0
  publish_time       time    NOT NULL,

  -- fixed = this row demands one named format; policy = this row draws from the weekly mix.
  format_mode        text    NOT NULL DEFAULT 'policy'
                       CHECK (format_mode IN ('fixed','policy')),
  -- required iff format_mode='fixed', NULL iff policy (cross-field CHECK below).
  requested_format   text    NULL REFERENCES t."5.3_content_format"(ice_format_key),
  CONSTRAINT client_schedule_format_assignment_mode_format_ck
    CHECK ((format_mode = 'fixed'  AND requested_format IS NOT NULL)
        OR (format_mode = 'policy' AND requested_format IS NULL)),

  -- provenance (planner §8): assigned_by is NON-AUTHORITATIVE (see column comment).
  assigned_by        text    NULL,
  assignment_reason  text    NOT NULL DEFAULT 'migration_default'
                       CHECK (assignment_reason IN (
                         'operator_choice','campaign_requirement','platform_constraint',
                         'resolver_fallback','migration_default','reverted_to_policy')),
  assignment_detail  text    NULL,

  -- versioning (planner §7), mirroring c.client_format_mix_override
  -- (is_current / superseded_by / effective_from): edits are versioned, never destructive.
  effective_from     date        NOT NULL DEFAULT CURRENT_DATE,
  superseded_by      uuid        NULL REFERENCES c.client_schedule_format_assignment(assignment_id),
  is_current         boolean     NOT NULL DEFAULT true,
  assigned_at        timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- At most one CURRENT assignment per natural-tuple schedule row.
-- ⚠ W3 FORWARD NOTE: this is a PARTIAL unique index. A future write path's upsert MUST spell the
--   arbiter as the index predicate — ON CONFLICT (client_id, platform, day_of_week, publish_time)
--   WHERE is_current — a plain column-list / constraint-name conflict target will NOT match a partial
--   index and will error or mis-fire. (db-rls-auditor forward note; re-audited at W3.)
CREATE UNIQUE INDEX client_schedule_format_assignment_current_tuple_uk
  ON c.client_schedule_format_assignment (client_id, platform, day_of_week, publish_time)
  WHERE is_current;

COMMENT ON TABLE c.client_schedule_format_assignment IS
  'DARK — read by NO production worker. W1 of the writable planner (writable-planner-format-per-slot-contract-gate1-v1.md §12). '
  'Keyed by the cc-0079 R3 D1 natural tuple (client_id, platform, day_of_week, publish_time), NOT schedule_id, so a pin '
  'survives save_publish_schedule''s DELETE-then-INSERT churn. PLANNED — NOT YET ENFORCED: a pin here does NOT govern '
  'production until cc-0079 R3c flips the resolver to read planner intent. No write path exists yet (W3). RLS enabled, '
  'no policies (deny-all); read path is the SECDEF RPC public.get_schedule_planner_state.';

COMMENT ON COLUMN c.client_schedule_format_assignment.assigned_by IS
  'NON-AUTHORITATIVE / attributed-unverified. ICE has NO actor identity: audit "actor" columns are free text, there are '
  'ZERO FKs to auth.users, and auth.uid() is NULL under service-role (how every dashboard write reaches the DB). This field '
  'is best-effort attribution only and MUST NOT be read as an authenticated identity. Real per-operator attribution is an '
  'S1/authz dependency (planner contract §8).';

COMMENT ON COLUMN c.client_schedule_format_assignment.format_mode IS
  'fixed = this row pins one named requested_format; policy = draws from the weekly mix (requested_format NULL). '
  'First-class and never inferred (planner §2). Default policy = today''s behaviour exactly.';

COMMENT ON COLUMN c.client_schedule_format_assignment.is_current IS
  'Versioning (planner §7): exactly one current row per natural tuple (partial-unique index). Edits write a new current '
  'version and set superseded_by on the prior row; nothing is hard-deleted in the normal path.';

-- Grants / RLS lockdown (defense in depth on a dark table).
-- REVOKE FROM PUBLIC alone is insufficient on Supabase — name anon/authenticated explicitly as
-- defense in depth. (They are NOT born with schema-c access — schema c's default ACL grants new
-- tables to service_role/inspector_ro, not anon/authenticated — but c IS REST-exposed, so the real
-- guard is the RLS deny-all below.)
REVOKE ALL ON c.client_schedule_format_assignment FROM PUBLIC;
REVOKE ALL ON c.client_schedule_format_assignment FROM anon;
REVOKE ALL ON c.client_schedule_format_assignment FROM authenticated;
-- schema c's default ACL auto-grants service_role SELECT, and service_role has BYPASSRLS — so without
-- this REVOKE it could read the table DIRECTLY over REST, bypassing the deny-all RLS. W1 is dark and
-- W2 reads ONLY via the SECDEF RPC below (which runs as owner postgres), so service_role needs NO
-- direct table access here. Revoke it so the "RPC is the only read path" posture is literally true.
-- (A future W3 write path grants exactly what its writer needs, in its own migration.)
REVOKE SELECT ON c.client_schedule_format_assignment FROM service_role;
-- RLS ENABLED with NO policies = deny-all to every non-BYPASSRLS role. The SECDEF RPC below runs as
-- owner (postgres, BYPASSRLS) and is the ONLY read path; no direct role grant on the table remains.
ALTER TABLE c.client_schedule_format_assignment ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------------------------
-- OBJECT 2 — the read-only read-path RPC. Reports each enabled schedule row's planner state,
-- LEFT JOINed to its current assignment on the natural tuple. Read-only; no DML; no allocator;
-- does NOT touch m.post_draft.recommended_format. enforcement_status is a constant on EVERY row.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_schedule_planner_state(p_client_id uuid)
  RETURNS TABLE (
    platform           text,
    day_of_week        integer,
    publish_time       time,
    enabled            boolean,
    format_mode        text,
    requested_format   text,
    assigned_by        text,
    assignment_reason  text,
    effective_from     date,
    enforcement_status text,
    contract_version   text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT
    s.platform,
    s.day_of_week,
    s.publish_time,
    s.enabled,
    COALESCE(a.format_mode, 'policy')    AS format_mode,   -- no current assignment ⇒ policy (today's behaviour)
    a.requested_format,
    a.assigned_by,
    a.assignment_reason,
    a.effective_from,
    'planned_not_enforced'::text         AS enforcement_status,  -- W1/W2 never claim production honours the pin
    'planner_w1_v1'::text                AS contract_version
  FROM c.client_publish_schedule s
  LEFT JOIN c.client_schedule_format_assignment a
    ON  a.client_id    = s.client_id
    AND a.platform     = s.platform
    AND a.day_of_week  = s.day_of_week
    AND a.publish_time = s.publish_time
    AND a.is_current
  WHERE s.client_id = p_client_id
    AND s.enabled
  ORDER BY s.platform, s.day_of_week, s.publish_time;
$$;

COMMENT ON FUNCTION public.get_schedule_planner_state(uuid) IS
  'READ-ONLY (STABLE, SECURITY DEFINER, search_path='''') planner read path for W1/W2. Returns one row per ENABLED '
  'c.client_publish_schedule row for the client, LEFT JOINed to the current (is_current) assignment on the natural tuple; '
  'format_mode COALESCEs to policy when unassigned. Stamps enforcement_status=''planned_not_enforced'' and '
  'contract_version=''planner_w1_v1'' on every row. Does NOT read/write m.post_draft.recommended_format, does NOT call the '
  'allocator, and does NOT imply the pin governs production (cc-0079 R3c is the flip). EXECUTE granted to service_role only.';

-- EXECUTE lockdown (born-anon-executable trap): REVOKE FROM PUBLIC alone is insufficient.
REVOKE EXECUTE ON FUNCTION public.get_schedule_planner_state(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_schedule_planner_state(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_schedule_planner_state(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_schedule_planner_state(uuid) TO service_role;

-- =============================================================================================
-- ROLLBACK (fully reversible, additive-only — destroys NO pre-existing object):
--
--   DROP FUNCTION IF EXISTS public.get_schedule_planner_state(uuid);
--   DROP TABLE    IF EXISTS c.client_schedule_format_assignment;
--
-- Drop the function first (it depends on nothing but reads the table), then the table. Both objects
-- are created by this file and by nothing else, so the rollback returns the schema to its exact
-- pre-apply state. No data migration, no backfill, no ACL residue (the table/function cease to exist).
-- =============================================================================================
