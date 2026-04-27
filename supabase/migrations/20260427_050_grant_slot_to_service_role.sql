-- Stage 12.050 — Grant service_role write access to m.slot
--
-- Root cause: m.slot was created without service_role grants. ai-worker's
-- slot status UPDATE was silently failing through PostgREST. CC's v2.10.x
-- code didn't destructure { error } so the failure was invisible — 19 of 20
-- successful drafts left their slots in pending_fill instead of filled.
--
-- Scope: minimum needed for current EFs (only ai-worker writes to m.slot).
-- Future EFs that need more grants add them in their own migrations.
--
-- Pre-flight verified at author time:
--   SELECT grantee, privilege_type
--   FROM information_schema.table_privileges
--   WHERE table_schema='m' AND table_name='slot' AND grantee='service_role';
-- returned zero rows.

GRANT SELECT, UPDATE ON m.slot TO service_role;

-- No INSERT/DELETE — those happen via SQL functions running as postgres.
-- No grants on signal_pool/slot_alerts/slot_fill_attempt/cron_health_check —
-- those are written exclusively by SQL functions, not EFs via Supabase JS.

COMMENT ON TABLE m.slot IS
  'Forward slot calendar for slot-driven Phase B. Stage 12.050: service_role granted SELECT, UPDATE for ai-worker EF.';
