-- Stage 1.005 — t.evergreen_library: fallback content for thin-pool moments (LD3)
-- Hand-curated by PK in Phase E (parallel content work, ~50 items across verticals).
-- Used by fill function when pool yields no viable candidates.

CREATE TABLE t.evergreen_library (
  evergreen_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                     text NOT NULL,
  content_summary           text NOT NULL,
    -- 1-3 paragraph summary that ai-worker uses as synthesis input
  format_keys               text[] NOT NULL,
    -- which formats this evergreen can be rendered as
  vertical_ids              integer[] NOT NULL,
    -- which verticals this evergreen is relevant to (allows shared use)
  use_cooldown_days         integer NOT NULL DEFAULT 30,
    -- min days between re-use of this evergreen for the same client
  last_used_at              timestamptz,
  last_used_for_client      uuid REFERENCES c.client(client_id) ON DELETE SET NULL,
  use_count                 integer NOT NULL DEFAULT 0,
  is_core                   boolean NOT NULL DEFAULT false,
    -- LD3 / H4: core items get prioritised in deep-thin-pool moments
  is_active                 boolean NOT NULL DEFAULT true,
  staleness_check_at        timestamptz,
    -- H4 staleness columns: last time staleness was assessed
  staleness_score           numeric,
    -- 0..1; 1 = fresh, 0 = stale
  staleness_review_required boolean NOT NULL DEFAULT false,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_evergreen_library_format_keys_nonempty CHECK (
    array_length(format_keys, 1) >= 1
  ),
  CONSTRAINT t_evergreen_library_vertical_ids_nonempty CHECK (
    array_length(vertical_ids, 1) >= 1
  )
);

-- Fallback lookup: active items, by format compatibility, oldest-used first (LRU)
CREATE INDEX idx_evergreen_library_active_lru
  ON t.evergreen_library (is_active, last_used_at NULLS FIRST);

-- Vertical filtering (GIN for array containment queries)
CREATE INDEX idx_evergreen_library_verticals
  ON t.evergreen_library USING GIN (vertical_ids);

-- Format filtering
CREATE INDEX idx_evergreen_library_formats
  ON t.evergreen_library USING GIN (format_keys);

-- Now wire the deferred FKs from Migration 003 and 004
ALTER TABLE m.slot
  ADD CONSTRAINT m_slot_evergreen_id_fkey
  FOREIGN KEY (evergreen_id) REFERENCES t.evergreen_library(evergreen_id) ON DELETE SET NULL;

ALTER TABLE m.slot_fill_attempt
  ADD CONSTRAINT m_slot_fill_attempt_evergreen_id_fkey
  FOREIGN KEY (selected_evergreen_id) REFERENCES t.evergreen_library(evergreen_id) ON DELETE SET NULL;

COMMENT ON TABLE t.evergreen_library IS
  'Hand-curated fallback content for thin-pool moments. ~50 items target across active verticals (Phase E). LD3. Stage 1.005.';
