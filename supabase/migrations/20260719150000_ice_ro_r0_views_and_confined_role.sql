-- G-RO v2: ICE operator read-only path — R0 curated views + USAGE-confined role.
-- SUPERSEDES the v1 role migration 20260719120000_create_ice_readonly_role_g_ro.sql
-- (v1 preserved in git history at 1e0dae7; DO NOT apply v1). Design v2:
-- docs/briefs/permission-friction-readonly-db-path-design-v2-amendment.md.
--
-- Why v2 is unconditionally write-safe (fixes the v1 C1/C2 conditional weakness):
--   The read role `ice_readonly` gets USAGE on schema `ice_ro` ONLY — NOT on m/c.
--   Reaching ANY function requires USAGE on its schema regardless of PUBLIC EXECUTE,
--   so the 24 PUBLIC-executable writer SECURITY DEFINER functions in c/m are
--   UNREACHABLE even with the raw credential in a read-write transaction. The role
--   can only SELECT the 10 curated `ice_ro` views (secret-free, explicit columns).
--   PUBLIC EXECUTE is left untouched (recorded as a separate security-debt arc).
--
-- View ownership: views are owned by the migration executor (postgres), which OWNS
--   every source table with force_rls=false — so the owner bypasses RLS and the views
--   return all rows for cross-client operator monitoring WITHOUT needing per-table
--   policies. (An earlier design used a dedicated NOLOGIN owner + SET ROLE, but
--   `GRANT owner TO CURRENT_USER` — needed to SET ROLE — makes Supabase's connection
--   pooler terminate the session; removed. Confidentiality is governed by the explicit
--   view column lists, not the owner; ice_readonly's confinement is unchanged.)
--
-- Exposure: R0 views expose SAFE + IDENTIFIER columns only (ids/enums/timestamps/
--   counts/booleans). ALL freeform/jsonb/URL/body columns and *_by actor labels are
--   withheld (→ R1 execute_sql). Columns grounded by db-rls-auditor 2026-07-19.
--   No SECRET or PII column exists in any source relation.
--
-- CREDENTIAL: server-side throwaway password, NOT captured. Real credential wired
--   out-of-band later (R2). This file has no password/DSN/key/token.

-- ============================ Section A: schema =============================
CREATE SCHEMA IF NOT EXISTS ice_ro;

-- ============================ Section B: the 10 R0 views ====================
-- Owned by the executor (postgres). Non-security_invoker (default) → run with owner
-- rights; owner owns the base tables (force_rls=false) → all rows visible, no policies.

-- 1. slot_status ← m.slot | withheld: skip_reason, source_material, created_by
CREATE VIEW ice_ro.slot_status AS
SELECT slot_id, client_id, platform, scheduled_publish_at, format_preference, format_chosen,
       fill_window_opens_at, fill_lead_time_minutes, status, filled_at, filled_draft_id,
       canonical_ids, is_evergreen, evergreen_id, slot_confidence, source_kind, schedule_id,
       intent_id, created_at, updated_at
FROM m.slot;

-- 2. draft_status ← m.post_draft | withheld: draft_title/body/format, *_reason,
--    image_headline/url, video_url, auto_approval_scores, compliance_flags, *_by
CREATE VIEW ice_ro.draft_status AS
SELECT post_draft_id, digest_item_id, client_id, slot_id, intent_id, platform,
       approval_status, approved_at, scheduled_for, version, notification_sent_at,
       recommended_format, image_status, video_status, created_at, updated_at
FROM m.post_draft;

-- 3. render_status ← m.post_render_log | withheld: output_url, storage_url, error_message, render_spec
CREATE VIEW ice_ro.render_status AS
SELECT render_log_id, post_draft_id, slide_id, client_id, ice_format_key, render_engine,
       creatomate_render_id, status, credits_used, render_duration_ms, attempt_number, created_at
FROM m.post_render_log;

-- 4. publish_status ← m.post_publish_queue | withheld: last_error, dead_reason, locked_by, acknowledged_by
CREATE VIEW ice_ro.publish_status AS
SELECT queue_id, ai_job_id, post_draft_id, client_id, platform, status, scheduled_for,
       attempt_count, locked_at, last_error_code, last_error_subcode, err_368_streak,
       last_error_at, acknowledged_at, publish_origin, created_at, updated_at
FROM m.post_publish_queue;

-- 5. cron_health ← m.cron_health_status (all columns SAFE)
CREATE VIEW ice_ro.cron_health AS
SELECT jobname, last_heartbeat_at, expected_interval_minutes, consecutive_misses,
       status, minutes_since_last
FROM m.cron_health_status;

-- 6. deploy_drift_status ← m.vw_ef_drift_current | withheld: notes
CREATE VIEW ice_ro.deploy_drift_status AS
SELECT slug, last_checked_at, drift_check_run_id, current_class, direction, severity,
       deploy_version, repo_version, repo_path_status, deployed_hash_normalised,
       repo_hash_normalised, security_definer_regression_risk, is_first_observation,
       previous_class, state_changed, first_seen_in_class, last_resolved_at
FROM m.vw_ef_drift_current;

-- 7. pipeline_health ← m.pipeline_health_log (all columns SAFE)
CREATE VIEW ice_ro.pipeline_health AS
SELECT log_id, snapshot_at, queue_total, queue_queued, queue_running, queue_published_1h,
       queue_failed, drafts_needs_review, drafts_approved, images_pending, images_generated,
       images_failed, iw_generated_30m, iw_failed_30m, pub_published_30m, pub_held_30m,
       pub_throttled_30m, ndis_published_today, pp_published_today, has_stuck_items, has_failed_images
FROM m.pipeline_health_log;

-- 8. template_registry_status ← c.creative_provider_template ⨝ c.creative_template_family
--    withheld: pt.captured_by, f.description, f.brand_constraints
CREATE VIEW ice_ro.template_registry_status AS
SELECT pt.id, pt.provider, pt.provider_template_id, pt.provider_template_name, pt.family_id,
       pt.scope, pt.client_id, pt.brand_key, pt.width, pt.height, pt.aspect_ratio,
       pt.output_type, pt.file_type_candidate, pt.duration_seconds, pt.provider_project_reference,
       pt.inventory_status, pt.inventory_source, pt.inventory_hash, pt.status,
       pt.image_slot_min, pt.image_slot_max, pt.needs_governed_background, pt.text_overlay_safe_required,
       pt.created_at, pt.updated_at,
       f.family_key, f.family_name, f.creative_purpose, f.scope AS family_scope,
       f.industry_vertical, f.status AS family_status
FROM c.creative_provider_template pt
LEFT JOIN c.creative_template_family f ON f.id = pt.family_id;

-- 9. asset_governance_status ← c.client_creative_governance (all columns SAFE)
CREATE VIEW ice_ro.asset_governance_status AS
SELECT id, client_id, format, contract_ref, declarative_registry_ref, render_label,
       enabled, created_at, updated_at
FROM c.client_creative_governance;

-- 10. music_governance_status ← m.music_track | withheld: storage_path, notes
CREATE VIEW ice_ro.music_governance_status AS
SELECT track_id, track_key, title, source, storage_bucket, sha256, mime, bytes,
       duration_seconds, loudness_lufs, bpm, mood, energy, tempo_band, genre, vocals,
       text_overlay_safe, approval_status, approved, production_use_allowed, is_active,
       created_at, updated_at
FROM m.music_track;

-- ============================ Section C: confined read role =================
CREATE ROLE ice_readonly WITH LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT NOBYPASSRLS;
DO $pw$ DECLARE pw text := replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
BEGIN EXECUTE format('ALTER ROLE ice_readonly PASSWORD %L', pw); END $pw$;  -- throwaway, not captured
ALTER ROLE ice_readonly SET default_transaction_read_only = on;
ALTER ROLE ice_readonly SET statement_timeout = '15s';
ALTER ROLE ice_readonly SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE ice_readonly SET lock_timeout = '2s';

-- The load-bearing control: USAGE on ice_ro ONLY. No m/c usage → writer functions unreachable.
GRANT USAGE ON SCHEMA ice_ro TO ice_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA ice_ro TO ice_readonly;   -- the 10 views

-- ============================ Section D: fail-closed assertions ==============
DO $assert$
DECLARE n int;
BEGIN
  IF has_schema_privilege('ice_readonly','m','USAGE') THEN RAISE EXCEPTION 'ice_readonly must NOT have USAGE on m'; END IF;
  IF has_schema_privilege('ice_readonly','c','USAGE') THEN RAISE EXCEPTION 'ice_readonly must NOT have USAGE on c'; END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.member
             WHERE r.rolname='ice_readonly') THEN RAISE EXCEPTION 'ice_readonly must have no role memberships'; END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE grantee='ice_readonly' AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
  IF n<>0 THEN RAISE EXCEPTION 'ice_readonly holds % write privilege(s)', n; END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE grantee='ice_readonly' AND table_schema='ice_ro' AND privilege_type='SELECT';
  IF n < 10 THEN RAISE EXCEPTION 'expected >=10 ice_ro view SELECT grants, got %', n; END IF;
  -- No R0 view may be security_invoker (would run as ice_readonly → lose base access / RLS semantics).
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
    WHERE ns.nspname='ice_ro' AND c.relkind='v'
      AND (SELECT option_value FROM pg_options_to_table(c.reloptions)
           WHERE option_name='security_invoker') = 'true';
  IF n <> 0 THEN RAISE EXCEPTION 'G-RO v2 assert: % ice_ro view(s) are security_invoker', n; END IF;
  RAISE NOTICE 'G-RO v2 ok: ice_readonly confined to ice_ro, no m/c usage, zero writes, no memberships.';
END $assert$;
