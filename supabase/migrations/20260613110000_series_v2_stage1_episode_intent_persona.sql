-- ============================================================================
-- Content Series v2 — Stage 1: additive episode schema foundation (behaviour-inert)
-- ============================================================================
-- Brief: docs/briefs/content-series-v2-t1-integration.md §3 + §15 (Stage 1 only).
-- Prepares the schema bridge series → episode → creative_intent → child outputs,
-- WITHOUT activating that flow. ADDITIVE, NULLABLE, INERT.
--
-- Stage 1 ONLY — explicitly NOT included: fan_out_episode, retry_episode,
-- approve_series_outline fix, series-writer EF re-point, series_post_insert
-- deprecation, UI, T1 creation-from-series, any Advisor/compliance/render/
-- publisher/scheduling change. No function/RPC body is modified. No behaviour
-- change: every existing reader/writer ignores these new nullable columns; all
-- 46 existing episode rows stay valid (new columns default NULL).
--
-- Affected table: c.content_series_episode (additive columns + one partial index).
-- ============================================================================

-- 1. The bridge: one creative_intent per episode (Stage 2 will populate it).
ALTER TABLE c.content_series_episode
  ADD COLUMN IF NOT EXISTS intent_id uuid
    REFERENCES m.creative_intent(intent_id) ON DELETE SET NULL;

-- 2. Persona / avatar carry fields (Stage 2 carries these into intent source_material).
ALTER TABLE c.content_series_episode ADD COLUMN IF NOT EXISTS persona_label     text;
ALTER TABLE c.content_series_episode ADD COLUMN IF NOT EXISTS avatar_preference text;
ALTER TABLE c.content_series_episode ADD COLUMN IF NOT EXISTS persona_notes     text;

COMMENT ON COLUMN c.content_series_episode.intent_id IS
  'Series v2 (Stage 1, additive/inert): the creative_intent this episode fans out to. NULL for all legacy/existing episodes; populated only by the Series v2 fan-out path (Stage 2+, not yet active). ON DELETE SET NULL preserves episode lineage if an intent is removed.';
COMMENT ON COLUMN c.content_series_episode.persona_label IS
  'Series v2 (Stage 1, additive/inert): operator persona label for the episode (e.g. "Priya — First-Time Investor"). Carried into intent source_material by Stage 2. NULL = none.';
COMMENT ON COLUMN c.content_series_episode.avatar_preference IS
  'Series v2 (Stage 1, additive/inert): avatar/stakeholder-role hint for the episode. Carried as persona intent only; does NOT override the Branch A pin (separate avatar-governance lane). NULL = none.';
COMMENT ON COLUMN c.content_series_episode.persona_notes IS
  'Series v2 (Stage 1, additive/inert): free-text persona/avatar notes for the episode. NULL = none.';

-- 3. Partial index for the future episode→intent read/detail path (Stage 2+).
CREATE INDEX IF NOT EXISTS idx_content_series_episode_intent_id
  ON c.content_series_episode (intent_id) WHERE intent_id IS NOT NULL;
