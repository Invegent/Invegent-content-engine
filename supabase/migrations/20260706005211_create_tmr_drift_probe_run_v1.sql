-- Migration: create_tmr_drift_probe_run_v1
-- TMR Provider/Registry Drift Probe v0 (AP-2) — c.tmr_drift_probe_run evidence table
--
-- Brief:   docs/briefs/ap2-tmr-drift-probe-v0-packet.md (PK Gate 1 approved,
--          D-AP2-1..5 as recommended; D-AP2-3 = new dedicated evidence table).
-- Mirror:  20260703064651_create_tmr_shadow_decision_v1.sql (schema-c evidence-table
--          posture precedent: RLS-on-zero-policies, named anon/authenticated revoke).
--
-- WHAT IT IS
--   One row per tmr-drift-probe run (daily pg_cron 'tmr-drift-probe-daily',
--   scheduled ONLY as the final step of the PK conditional sequence — NOT by this
--   migration). Each row carries the three check payloads (provider↔registry ·
--   pool-lag vs vendored markers · render sanity), a divergence summary, and the
--   run verdict. A probe error is a VISIBLE failed run (status 'error' with
--   error_detail), never an empty success — fail-loud doctrine.
--
-- NON-CLAIMS (hard boundaries, packet forbidden list)
--   · The probe INFORMS only: nothing reads this table at runtime; no worker,
--     publisher, or enablement path consumes it. A drift row never blocks anything.
--   · This is the probe's ONLY write surface — it writes to no other table.
--   · No cron in this migration (D-AP2-5: cron.schedule rides as the final,
--     separately-STOP-gated step of the PK conditional sequence).
--
-- SECURITY POSTURE
--   RLS ENABLED with ZERO policies (deny-by-default, house pattern) · service_role
--   INSERT/SELECT only (the probe writes; operators read via service-role paths) ·
--   NO grants to anon / authenticated (revoking PUBLIC alone is insufficient —
--   anon and authenticated are named explicitly).
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED — a local draft until PK
--    explicitly approves the apply inside the AP-2 conditional sequence.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   SELECT cron.unschedule('tmr-drift-probe-daily');   -- only if the cron step ran
--   DROP TABLE IF EXISTS c.tmr_drift_probe_run;

CREATE TABLE c.tmr_drift_probe_run (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at             timestamptz DEFAULT now(),
  probe_version      text,        -- e.g. 'tmr-drift-probe-v1.0.0'
  status             text        CHECK (status IN ('ok', 'drift', 'error')),
  provider_check     jsonb,       -- check (a): provider_missing / known_historical / provider_unregistered / renamed
  pool_check         jsonb,       -- check (b): live per-platform pools + union + per-marker lagging|current diffs
  render_check       jsonb,       -- check (c): checked count + violations[]
  divergence_summary jsonb,       -- compact roll-up (status, counts, lagging_markers, errors)
  error_detail       text         -- non-null iff any check failed (status 'error')
);

COMMENT ON TABLE c.tmr_drift_probe_run IS
'TMR drift probe (AP-2) evidence: one row per daily tmr-drift-probe run — provider↔registry vs c.creative_provider_template, resolver pool vs build-time-vendored markers, B1 render background sanity. Verdict ok|drift|error; errors are visible failed runs, never empty successes. Informs only — consumed by nothing at runtime. Service-fenced: RLS-on-zero-policies, service_role INSERT/SELECT only, no anon/authenticated grants.';

-- ── Posture: deny-by-default (RLS on, ZERO policies), service-fenced ──────────────
ALTER TABLE c.tmr_drift_probe_run ENABLE ROW LEVEL SECURITY;

-- Revoking PUBLIC alone is insufficient — name anon and authenticated explicitly.
REVOKE ALL ON TABLE c.tmr_drift_probe_run FROM PUBLIC;
REVOKE ALL ON TABLE c.tmr_drift_probe_run FROM anon, authenticated;

-- Probe writes + operator reads via service-role paths only (packet posture:
-- INSERT/SELECT to service_role, nothing else).
GRANT SELECT, INSERT ON TABLE c.tmr_drift_probe_run TO service_role;
