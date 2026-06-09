-- G-RP: OBS Stage 0A production read-only access path.
-- Creates least-privilege obs_readonly role + column-level SELECT grants on the
-- four CCH-confirmed m.* tables. Password is GENERATED SERVER-SIDE at apply time
-- (never printed, committed, pasted, or stored in this migration text) and must be
-- rotated via ALTER ROLE at observer-wiring time. No business-data mutation.
--
-- NOTE (repo-parity backfill): this file is the password-free record of the
-- migration already applied to production (mbkmaxqhsohbtwsqolns) and recorded in
-- production migration history as 20260609081127_obs_readonly_production_read_path_g_rp.
-- The generated password was INTENTIONALLY NOT CAPTURED anywhere. The obs_readonly
-- role is therefore unusable until its password is rotated/set via a future,
-- separately gated secret-wiring step (ALTER ROLE obs_readonly PASSWORD ...) before
-- any OBS observer use. This file contains no password, DSN, key, token, or credential.

CREATE ROLE obs_readonly WITH LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT NOBYPASSRLS;

DO $grp$
DECLARE
  pw text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
BEGIN
  EXECUTE format('ALTER ROLE obs_readonly PASSWORD %L', pw);
END
$grp$;

ALTER ROLE obs_readonly SET default_transaction_read_only = on;
ALTER ROLE obs_readonly SET statement_timeout = '5s';
ALTER ROLE obs_readonly SET idle_in_transaction_session_timeout = '5s';

GRANT USAGE ON SCHEMA m TO obs_readonly;

GRANT SELECT (
  post_draft_id,
  client_id,
  platform,
  recommended_format,
  recommended_reason,
  draft_format,
  image_status,
  image_url,
  video_status,
  video_url,
  slot_id,
  created_at,
  updated_at
) ON m.post_draft TO obs_readonly;

GRANT SELECT (
  slot_id,
  client_id,
  platform,
  format_preference,
  format_chosen,
  status,
  skip_reason,
  filled_draft_id,
  source_kind,
  is_evergreen,
  created_at,
  updated_at
) ON m.slot TO obs_readonly;

GRANT SELECT (
  attempt_id,
  slot_id,
  decision,
  skip_reason,
  chosen_format,
  threshold_relaxed,
  ai_job_id,
  attempted_at,
  created_at
) ON m.slot_fill_attempt TO obs_readonly;

GRANT SELECT (
  render_log_id,
  post_draft_id,
  client_id,
  ice_format_key,
  render_engine,
  status,
  output_url,
  storage_url,
  credits_used,
  attempt_number,
  created_at
) ON m.post_render_log TO obs_readonly;
