-- Stage 1.008 — f.canonical_vertical_map: canonical → vertical mapping (NEW)
--
-- v4 assumed this table exists; it does not. The existing pipeline scopes
-- vertical at digest_item.client_id level, indirectly via c.client_content_scope.
-- This table closes that structural gap and preserves v4's vertical-scoped
-- pool design.
--
-- Population (Stage 3 trigger, NOT Stage 1):
--   When f.canonical_content_body.content_class transitions NULL → set
--   (i.e. when m.classify_canonicals_unclassified runs), insert one row per
--   distinct vertical that any subscribing client cares about, sourced via:
--     canonical → content_item_canonical_map → content_item → c.client_source
--     → c.client_content_scope.vertical_id
--
-- This table is empty after Stage 1. Population is Stage 3's job. Backfill of
-- existing classified canonicals is Stage 4 (m.backfill_missing_pool_entries).
--
-- Stage 3's m.refresh_signal_pool trigger fires on INSERT to THIS table,
-- replacing v4's (incorrect) plan to fire on f.canonical_vertical_map directly
-- as if it pre-existed.

CREATE TABLE f.canonical_vertical_map (
  canonical_id    uuid NOT NULL REFERENCES f.canonical_content_item(canonical_id) ON DELETE CASCADE,
  vertical_id     integer NOT NULL REFERENCES t.content_vertical(vertical_id) ON DELETE CASCADE,
  mapped_at       timestamptz NOT NULL DEFAULT now(),
  mapping_source  text NOT NULL DEFAULT 'classifier_auto',
    -- 'classifier_auto' | 'manual' | 'backfill'
  notes           text,

  CONSTRAINT f_canonical_vertical_map_pk PRIMARY KEY (canonical_id, vertical_id),
  CONSTRAINT f_canonical_vertical_map_source_check CHECK (
    mapping_source IN ('classifier_auto','manual','backfill')
  )
);

-- Vertical-side lookup (Stage 3 pool refresh fires per vertical row inserted)
CREATE INDEX idx_canonical_vertical_map_vertical
  ON f.canonical_vertical_map (vertical_id, canonical_id);

-- Recency lookup (e.g. "all canonicals mapped to vertical X in last 24h")
CREATE INDEX idx_canonical_vertical_map_mapped_at
  ON f.canonical_vertical_map (mapped_at DESC);

COMMENT ON TABLE f.canonical_vertical_map IS
  'Canonical → vertical mapping. New structural piece for slot-driven architecture. Empty after Stage 1; populated by Stage 3 trigger on classifier output. Stage 1.008.';
