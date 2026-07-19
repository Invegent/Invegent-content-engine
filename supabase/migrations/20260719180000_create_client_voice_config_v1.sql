-- 20260719180000_create_client_voice_config_v1.sql
-- Video D6 Lane 4a (D6-9 voice governance) — governed voice-config table (DARK: no runtime reader).
-- NOTE: renumbered 20260719170000 → 20260719180000 — the original number collided in the ledger
-- with a parallel lane (cc_0042_appetite_inventory_read_path_v1). Migration identity = new number.
--
-- Replaces the hardcoded VOICE_ENV_BY_CLIENT_ID code map in video-worker/voice_id.ts with a
-- governed table so a new client's ElevenLabs voice is added via DATA, not a code deploy.
-- Option B (PK, Gate-1): the table stores the ElevenLabs voice ID VALUE directly. Voice IDs are
-- public-ish identifiers (config, not credentials — ELEVENLABS_API_KEY stays the secret and is
-- unchanged). This migration creates the table + RLS + grants ONLY; the two rows (PP, NDIS) are
-- populated as a SEPARATE PK-supplied step at the apply gate (values never in the repo/transcript).
--
-- Security posture MIRRORS c.client_creative_governance exactly (grounded 2026-07-19):
--   RLS ENABLED, ZERO policies (deny-all to RLS-enforced roles) · service_role bypasses RLS.
--   Table grants: service_role SELECT/INSERT/UPDATE/DELETE · inspector_ro SELECT · nothing else.
--   anon/authenticated: no table grant + RLS deny-all → fully blocked (schema USAGE is irrelevant).
--
-- Ships DARK: NO production path reads this table until Lane 4b (video-worker rewire + deploy).

BEGIN;

CREATE TABLE c.client_voice_config (
  client_id           uuid        PRIMARY KEY REFERENCES c.client (client_id) ON DELETE CASCADE,
  elevenlabs_voice_id text        NOT NULL CHECK (btrim(elevenlabs_voice_id) <> ''),
  enabled             boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE c.client_voice_config IS
  'Governed per-client ElevenLabs voice config (Video D6 Lane 4a, D6-9). One row per client_id; '
  'elevenlabs_voice_id is a public identifier, NOT a credential. Read by video-worker at runtime '
  '(Lane 4b) fail-closed: no enabled row -> voice unresolved -> caller fails loud. Replaces the '
  'hardcoded VOICE_ENV_BY_CLIENT_ID map.';

-- Deny-all baseline (mirror): RLS on, no policies. service_role (BYPASSRLS) is the runtime reader/writer.
ALTER TABLE c.client_voice_config ENABLE ROW LEVEL SECURITY;

-- Explicit least-privilege grants (mirror c.client_creative_governance).
REVOKE ALL ON c.client_voice_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON c.client_voice_config TO service_role;
GRANT SELECT ON c.client_voice_config TO inspector_ro;

COMMIT;

-- ROLLBACK (single statement): DROP TABLE c.client_voice_config;
