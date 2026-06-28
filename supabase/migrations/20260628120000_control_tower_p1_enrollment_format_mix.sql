-- 20260628120000_control_tower_p1_enrollment_format_mix.sql
-- =====================================================================
-- P1 behaviour-preserving Control Tower enrollment cutover — replaces the
-- hardcoded PP-only m.format_mix_enrolled gate with a DB-backed enrollment
-- table; seeds PP to preserve existing Phase 1 behaviour; no UI/RPC/variant/
-- multi-client work.
--
-- WHAT THIS DOES (in-scope):
--   (a) CREATE TABLE c.client_control_tower_enrollment  (versioned, current-row
--       model; one current ACTIVE enrollment per (client, platform, control_type)).
--   (b) CREATE TABLE c.client_format_mix_audit          (immutable audit trail;
--       table only — NO triggers, NO write RPCs).
--   (c) Grant / RLS hygiene mirroring the house posture (schema c is NOT
--       REST-exposed; RLS is OFF on sibling c.* tables; service-role-only).
--   (d) Seed ONE current-active enrollment row for Property Pulse
--       (4036a6b5-b4a3-406e-998d-c2fe14a8bbdd) so the gate stays TRUE for PP
--       and FALSE for everyone else — byte-for-byte the prior hardcoded behaviour.
--   (e) Seed ONE bootstrap audit row documenting the seed (provenance).
--   (f) CREATE OR REPLACE m.format_mix_enrolled(uuid) to read the enrollment
--       table (was a hardcoded literal). Fail-closed (EXISTS -> false when no
--       qualifying row). Owner/grants preserved postgres-only.
--
-- WHAT IS STRICTLY OUT OF SCOPE (NOT done here):
--   * m.materialise_slots, m.build_weekly_demand_grid, m.allocate_week_formats
--     are NOT touched. The consumer m.materialise_slots (SECURITY DEFINER, runs
--     as postgres) keeps calling m.format_mix_enrolled exactly as before.
--   * No write RPCs, no enrollment-mutation API, no triggers.
--   * No service_role / anon / authenticated grants on the new tables (deferred
--     to P2). No variant / multi-client rollout. No UI / dashboard / worker /
--     publisher / render changes.
--
-- BEHAVIOUR EQUIVALENCE: with the single seeded PP enforce row, the rewritten
--   m.format_mix_enrolled returns the SAME truth set as the old literal gate:
--   true for PP, false for all others. The seed effective_from='2026-06-01' is
--   safely in the past with effective_until=NULL, so PP is unconditionally
--   enrolled exactly as the old function was.
--
-- migration-name = permanent identity. A revision gets a NEW number + distinct
--   name, never this same name with different SQL.
--
-- STATUS: NOT YET APPLIED. PK-gated apply later. Apply order is top-to-bottom:
--   tables -> grants -> seed enrollment -> seed audit -> CREATE OR REPLACE fn.
-- =====================================================================


-- ---------------------------------------------------------------------
-- (a) c.client_control_tower_enrollment — DB-backed enrollment gate.
--     Versioned current-row model: is_current marks the live revision,
--     status/approval_status/rollout_stage drive whether enforcement is on.
-- ---------------------------------------------------------------------
CREATE TABLE c.client_control_tower_enrollment (
  enrollment_id    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid        NOT NULL,
  platform         text        NULL,                 -- NULL = client-scoped (all platforms)
  control_type     text        NOT NULL,
  enabled          boolean     NOT NULL DEFAULT false,
  rollout_stage    text        NOT NULL,
  approval_status  text        NOT NULL,
  status           text        NOT NULL,
  effective_from   date        NOT NULL,
  effective_until  date        NULL,
  version          integer     NOT NULL DEFAULT 1,
  changed_by       text        NULL,
  changed_at       timestamptz NOT NULL DEFAULT now(),
  approved_by      text        NULL,
  approved_at      timestamptz NULL,
  reason           text        NULL,
  notes            text        NULL,
  superseded_by    uuid        NULL,
  is_current       boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cte_control_type_chk
    CHECK (control_type IN ('format_mix')),               -- extensible later
  CONSTRAINT cte_rollout_stage_chk
    CHECK (rollout_stage IN ('off','shadow','pilot','enforce')),
  CONSTRAINT cte_approval_status_chk
    CHECK (approval_status IN ('pending','approved','rejected')),
  CONSTRAINT cte_status_chk
    CHECK (status IN ('draft','active','superseded')),
  CONSTRAINT cte_version_chk
    CHECK (version >= 1),
  CONSTRAINT cte_effective_window_chk
    CHECK (effective_until IS NULL OR effective_until >= effective_from),
  -- "enabled=true" is only meaningful for a fully-promoted enforce row.
  CONSTRAINT cte_enabled_only_when_enforced_chk
    CHECK (
      enabled = false
      OR (status = 'active' AND approval_status = 'approved' AND rollout_stage = 'enforce')
    ),
  -- FK to c.client(client_id). c.client has a PK/unique on client_id in prod;
  -- if for any reason the apply environment lacks it, the FK creation will fail
  -- loudly rather than silently weaken integrity (see note in result packet).
  CONSTRAINT cte_client_fk
    FOREIGN KEY (client_id) REFERENCES c.client (client_id)
);

-- One current ACTIVE enrollment per (client_id, platform, control_type).
-- NULLS NOT DISTINCT (PG15+) so a NULL platform is treated as a single value
-- (a client-scoped row is unique among client-scoped rows). Partial: only
-- current + active rows are constrained, so historical/superseded/draft rows
-- never collide.
CREATE UNIQUE INDEX cte_one_current_active_uq
  ON c.client_control_tower_enrollment (client_id, platform, control_type)
  NULLS NOT DISTINCT
  WHERE (is_current AND status = 'active');

-- Helpful lookup index for the gate read path (client + control_type, current).
CREATE INDEX cte_client_control_current_idx
  ON c.client_control_tower_enrollment (client_id, control_type)
  WHERE is_current;

COMMENT ON TABLE c.client_control_tower_enrollment IS
  'P1 DB-backed Control Tower enrollment gate (replaces hardcoded PP-only format_mix_enrolled). Versioned current-row model. RLS intentionally OFF: schema c is NOT REST-exposed and access is service-role-only, consistent with sibling c.* tables. No anon/authenticated grants (P2).';


-- ---------------------------------------------------------------------
-- (b) c.client_format_mix_audit — immutable audit trail (table only).
--     No triggers, no write RPCs in P1; rows are appended by future governed
--     write paths (P2) and by the bootstrap seed below.
-- ---------------------------------------------------------------------
CREATE TABLE c.client_format_mix_audit (
  audit_id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid        NOT NULL,
  platform         text        NULL,
  control_type     text        NOT NULL DEFAULT 'format_mix',
  action           text        NOT NULL,
  before_data      jsonb       NULL,
  after_data       jsonb       NULL,
  actor            text        NULL,
  approval_status  text        NULL,
  reason           text        NULL,
  request_source   text        NULL,
  version_from     integer     NULL,
  version_to       integer     NULL,
  superseded_ids   uuid[]      NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE c.client_format_mix_audit IS
  'P1 immutable audit trail for Control Tower format_mix enrollment changes. Table only in P1 (no triggers, no write RPCs). RLS intentionally OFF: schema c is NOT REST-exposed, service-role-only, consistent with sibling c.* tables / c.client_publish_profile_audit precedent.';


-- ---------------------------------------------------------------------
-- (c) Grant / RLS hygiene — least privilege, house posture.
--     Schema c is NOT REST-exposed and RLS is OFF on sibling c.* tables;
--     access is service-role-only via the postgres owner / service connection.
--     Revoke ALL from PUBLIC and explicitly from anon + authenticated (REVOKE
--     FROM PUBLIC alone is insufficient on Supabase). Owner stays postgres.
--     service_role read grants are DEFERRED to P2 — intentionally not added.
--     RLS is left OFF on both tables (consistent with c.client,
--     c.client_format_config, c.client_publish_profile, c.client_publish_profile_audit).
-- ---------------------------------------------------------------------
REVOKE ALL ON TABLE c.client_control_tower_enrollment FROM PUBLIC;
REVOKE ALL ON TABLE c.client_control_tower_enrollment FROM anon;
REVOKE ALL ON TABLE c.client_control_tower_enrollment FROM authenticated;

REVOKE ALL ON TABLE c.client_format_mix_audit FROM PUBLIC;
REVOKE ALL ON TABLE c.client_format_mix_audit FROM anon;
REVOKE ALL ON TABLE c.client_format_mix_audit FROM authenticated;


-- ---------------------------------------------------------------------
-- (d) Seed exactly ONE enrollment row — Property Pulse, client-scoped,
--     fully promoted (enforce/approved/active/enabled), effective in the past.
--     This preserves the old hardcoded gate's behaviour exactly.
-- ---------------------------------------------------------------------
INSERT INTO c.client_control_tower_enrollment (
  client_id, platform, control_type, enabled,
  rollout_stage, approval_status, status,
  effective_from, effective_until, version,
  changed_by, approved_by, reason, notes, is_current
) VALUES (
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,  -- Property Pulse
  NULL,                                           -- client-scoped (matches client-only hardcoded gate)
  'format_mix',
  true,
  'enforce',
  'approved',
  'active',
  '2026-06-01'::date,                             -- safely past -> PP always enrolled
  NULL,
  1,
  'migration:20260628120000',
  'PK',
  'Seeded to preserve existing Phase 1 Property Pulse hardcoded enrollment behaviour.',
  'Seeded to preserve existing Phase 1 Property Pulse hardcoded enrollment behaviour.',
  true
);


-- ---------------------------------------------------------------------
-- (e) Seed ONE bootstrap audit row documenting the seed (immutable provenance).
--     after_data captures the seeded enrollment row as jsonb.
-- ---------------------------------------------------------------------
INSERT INTO c.client_format_mix_audit (
  client_id, platform, control_type, action,
  before_data, after_data, actor, approval_status,
  reason, request_source, version_from, version_to
)
SELECT
  e.client_id,
  e.platform,
  e.control_type,
  'seed_enrollment_p1',
  NULL::jsonb,
  to_jsonb(e),
  'migration:20260628120000',
  'approved',
  'P1 behaviour-preserving bootstrap of PP format_mix enrollment',
  'migration_p1',
  NULL,
  1
FROM c.client_control_tower_enrollment e
WHERE e.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid
  AND e.control_type = 'format_mix'
  AND e.is_current = true
  AND e.status = 'active';


-- ---------------------------------------------------------------------
-- (f) m.format_mix_enrolled(uuid) — DB-backed gate (CREATE OR REPLACE).
--   Was: LANGUAGE sql IMMUTABLE, hardcoded literal == PP uuid.
--   Now: LANGUAGE sql STABLE — it reads c.client_control_tower_enrollment, so
--        it is no longer IMMUTABLE; STABLE is correct (within-statement-
--        consistent read; CURRENT_DATE is stable within a statement).
--   search_path kept 'public','pg_temp'; the table reference is schema-qualified
--   (c.*), so it resolves regardless of search_path. Owner stays postgres.
--   No dynamic SQL. Fail-closed: EXISTS returns false when no qualifying row.
--   Grants preserved postgres-only after replace so the SECURITY DEFINER
--   consumer m.materialise_slots (running as postgres) can still call it.
--   m.materialise_slots / m.build_weekly_demand_grid / m.allocate_week_formats
--   are NOT touched.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.format_mix_enrolled(p_client_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO 'public','pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM c.client_control_tower_enrollment e
    WHERE e.client_id       = p_client_id
      AND e.control_type    = 'format_mix'
      AND e.enabled         = true
      AND e.status          = 'active'
      AND e.approval_status = 'approved'
      AND e.rollout_stage   = 'enforce'
      AND e.is_current      = true
      AND e.effective_from  <= CURRENT_DATE
      AND (e.effective_until IS NULL OR e.effective_until >= CURRENT_DATE)
  );
$$;

-- Preserve postgres-only EXECUTE posture (REVOKE FROM PUBLIC alone is
-- insufficient on Supabase; revoke anon/authenticated explicitly). Do NOT grant
-- service_role/anon/authenticated — the only caller is postgres-owned
-- m.materialise_slots running as its owner.
REVOKE EXECUTE ON FUNCTION m.format_mix_enrolled(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION m.format_mix_enrolled(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION m.format_mix_enrolled(uuid) FROM authenticated;
