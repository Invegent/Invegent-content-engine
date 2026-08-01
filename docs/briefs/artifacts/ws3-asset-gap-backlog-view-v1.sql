-- WS-3 (a) — Asset Gap backlog read view v1  [T2 · ADDITIVE · READ-ONLY]
-- Programme brief: docs/briefs/creatomate-global-ultimate-programme-brief-v1.md §3 WS-3(a), §6 wk1.3
-- Packet:          docs/briefs/ws3-asset-gap-read-view-packet-v1.md
--
-- ONE secret-free ice_ro view over m.asset_gap_suggestion, following the cc-0090
-- pattern exactly (20260731001557_cc_0090_asset_graduation_read_model_v1.sql), which
-- itself extends G-RO v2 (20260719150000_ice_ro_r0_views_and_confined_role.sql).
--
-- Adds ZERO production authority: no table, no DML, no write function, no change to
-- any existing view / function / worker / template / grant outside the one new view.
-- Live-verified 2026-08-01: grep over this repository's only two code roots that exist
-- (`app/` and `supabase/functions/`) for asset_gap_suggestion / asset_gap_observation /
-- run_asset_gap_analysis returns zero functional hits — the single match is a prose
-- comment at supabase/functions/image-worker/index.ts:45. So this view is the FIRST
-- consumer of the table in THIS repo, not an additional one. The dashboard lives in a
-- separate repository (invegent-dashboard) and was not searched.
--
-- Rollback: docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1-rollback.sql

-- ============================ Section A: the view ==================================
-- Owned by the executor (postgres), non-security_invoker — identical to the ten G-RO v2
-- views and the four cc-0090 views, so it runs with owner rights and returns all rows
-- for cross-client operator monitoring without needing per-table RLS policies.
--
-- EXPOSURE (R0 rule: SAFE + IDENTIFIER columns only — ids / enums / timestamps / counts
-- / booleans / bounded codes). Every column below is one of those. appetite_signature is
-- a bare sha256 hex digest (live-sampled 2026-08-01: 64 hex chars, no embedded content),
-- so it is an identifier, not freeform text.
--
-- WITHHELD, and why (each → R1 execute_sql, exactly as the G-RO v2 header prescribes):
--   appetite_descriptor    jsonb   — freeform canonical appetite payload
--   diagnostic_evidence    jsonb   — freeform cc-0046 classifier evidence payload
--   dismissed_reason       text    — operator-written freeform
--   claimed_by             text    — actor label (G-RO v2 withholds all *_by labels)
--   harvest_manifest_ref   text    — harvest-package path pointer
--   candidates_ref         text    — fenced harvest-package path pointer
-- See packet §6 OQ-1: whether dismissed_reason should be surfaced is a PK exposure call,
-- deliberately NOT resolved here (withholding is the conservative default).
CREATE VIEW ice_ro.asset_gap_backlog AS
SELECT
  s.id,
  s.client_id,
  cl.client_slug,

  -- aggregation identity ------------------------------------------------------
  s.appetite_signature,
  s.client_pool_policy,
  s.permitted_governance_scopes,
  s.preferred_scope_order,
  s.sourcing_target_scope,
  s.vertical_key,
  s.platform,
  s.format,
  s.slot_kind,

  -- dual-axis verdict (cc-0041 Artifact A) -------------------------------------
  s.why_needed,
  s.primary_route,
  s.asset_gap_detected,
  s.asset_gap_drainability,

  -- orthogonal classification (cc-0046) ----------------------------------------
  s.subject_kind,
  s.failure_state,
  s.classifier_version,
  s.diagnosed_at,
  s.evidence_confidence,

  -- lifecycle + demand ----------------------------------------------------------
  s.status,
  s.demand_count,
  s.priority_score,
  s.first_seen_at,
  s.last_seen_at,
  s.latest_source_post_id,
  s.source_of_demand,
  s.analyzer_version,
  s.inventory_policy_version,

  -- queue safety (codes/counters/timestamps only — claimed_by withheld) ----------
  s.attempt_count,
  s.next_retry_at,
  s.claim_expires_at,
  s.last_error_code,

  -- resolution pointers (FK ids; the XOR is enforced by the base-table CHECK) -----
  s.resolved_client_asset_id,
  s.resolved_shared_asset_id,

  s.created_at,
  s.updated_at
FROM m.asset_gap_suggestion s
JOIN c.client cl ON cl.client_id = s.client_id;

-- ============================ Section B: grants ====================================
-- Explicit per-view grant (belt) + the same catch-all the two prior migrations issue
-- (suspenders). GRANT ... ON ALL TABLES IN SCHEMA is evaluated at execution time, so it
-- must be re-run here for this NEW view to become reachable.
GRANT SELECT ON ice_ro.asset_gap_backlog TO ice_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA ice_ro TO ice_readonly;

-- Defensive and explicit (views carry no default PUBLIC/anon/authenticated grant in
-- Postgres — unlike functions — but this states intent rather than relying on absence).
REVOKE ALL ON ice_ro.asset_gap_backlog FROM PUBLIC, anon, authenticated;

-- ============================ Section C: fail-closed assertions ====================
DO $assert$
DECLARE n int;
BEGIN
  -- 1. the view exists
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v' AND c.relname = 'asset_gap_backlog';
  IF n <> 1 THEN RAISE EXCEPTION 'ws3 assert: expected 1 new ice_ro view, found %', n; END IF;

  -- 2. non-security_invoker (would otherwise run as ice_readonly and lose base access)
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v' AND c.relname = 'asset_gap_backlog'
      AND lower((SELECT option_value FROM pg_options_to_table(c.reloptions)
                 WHERE option_name = 'security_invoker')) IN ('true','on','yes','1');
  IF n <> 0 THEN RAISE EXCEPTION 'ws3 assert: asset_gap_backlog is security_invoker'; END IF;

  -- 3. zero PostgREST-reachable exposure
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE table_schema = 'ice_ro' AND table_name = 'asset_gap_backlog'
      AND grantee IN ('PUBLIC', 'anon', 'authenticated');
  IF n <> 0 THEN RAISE EXCEPTION 'ws3 assert: % PUBLIC/anon/authenticated grant(s) on asset_gap_backlog', n; END IF;
  -- belt: has_table_privilege resolves privileges inherited via PUBLIC, which a
  -- grantee-name match cannot see if the grant were ever made PUBLIC-only.
  IF has_table_privilege('anon', 'ice_ro.asset_gap_backlog', 'SELECT')
  OR has_table_privilege('authenticated', 'ice_ro.asset_gap_backlog', 'SELECT') THEN
    RAISE EXCEPTION 'ws3 assert: anon/authenticated can SELECT asset_gap_backlog';
  END IF;

  -- 4. exactly one ice_readonly SELECT grant on the new view
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE table_schema = 'ice_ro' AND table_name = 'asset_gap_backlog'
      AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';
  IF n <> 1 THEN RAISE EXCEPTION 'ws3 assert: expected 1 ice_readonly SELECT grant on asset_gap_backlog, got %', n; END IF;

  -- 5. schema-WIDE grant total (the cc-0090 should-fix pattern): the catch-all GRANT in
  --    Section B cannot silently over-grant if an unrelated relation lands in ice_ro
  --    between authoring and apply. 14 live at authoring (2026-08-01) + 1 new = 15.
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE table_schema = 'ice_ro' AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';
  IF n <> 15 THEN RAISE EXCEPTION 'ws3 assert: expected ice_readonly at exactly 15 ice_ro SELECT grants (14 existing + 1 new), got %', n; END IF;

  -- 6. ice_readonly confinement unchanged (re-asserts the load-bearing G-RO v2 control)
  IF has_schema_privilege('ice_readonly','m','USAGE') THEN RAISE EXCEPTION 'ws3 assert: ice_readonly gained USAGE on m'; END IF;
  IF has_schema_privilege('ice_readonly','c','USAGE') THEN RAISE EXCEPTION 'ws3 assert: ice_readonly gained USAGE on c'; END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE grantee = 'ice_readonly' AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
  IF n <> 0 THEN RAISE EXCEPTION 'ws3 assert: ice_readonly holds % write privilege(s)', n; END IF;

  RAISE NOTICE 'ws3 ok: ice_ro.asset_gap_backlog created, non-security_invoker, ice_readonly-only SELECT, zero PUBLIC/anon/authenticated exposure, schema total 15, confinement intact.';
END $assert$;
