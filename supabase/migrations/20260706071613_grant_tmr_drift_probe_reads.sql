-- Migration: grant_tmr_drift_probe_reads
-- AP-2 TMR Drift Probe v0 — service_role SELECT grants for the probe's direct reads.
--
-- WHY: tmr-drift-probe runs as service_role and reads c.client_brand_asset (per-platform
--   eligible-pool replica) and m.post_render_log (render sanity) DIRECTLY — its
--   independent-replica design (NOT via a SECDEF resolver). Those two tables have only
--   ever been reached by postgres (admin) or SECDEF definer access, so service_role was
--   never granted SELECT — the probe's first supervised run fail-loud'd with
--   'permission denied for table client_brand_asset' (a VISIBLE error row, never a false
--   success). c.creative_provider_template already had the grant (provider check passed).
--
-- SCOPE (minimal, PK Option 1, 2026-07-06): grant SELECT to service_role ONLY, on exactly
--   the two tables the probe needs. No anon/authenticated/PUBLIC grant. No RLS change. No
--   SECDEF helper. No EF change. Both tables have RLS DISABLED already (relrowsecurity=false)
--   and NO browser-role grants (anon/authenticated SELECT = false, verified) — this migration
--   does not touch that: it adds ONLY the trusted-backend service_role read.
--
-- POSTURE: service_role is the backend-only role (never a browser principal). Adding read
--   access to these two tables for it does not expose them to anon/authenticated (which
--   remain denied) or PUBLIC. Idempotent GRANT.
--
-- ROLLBACK (reference only): REVOKE SELECT ON c.client_brand_asset FROM service_role;
--                            REVOKE SELECT ON m.post_render_log   FROM service_role;

GRANT SELECT ON c.client_brand_asset TO service_role;
GRANT SELECT ON m.post_render_log    TO service_role;
