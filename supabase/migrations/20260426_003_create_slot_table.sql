-- Stage 1.003 — m.slot: scheduled publish slots that pull from the pool
-- Materialised from c.client_publish_schedule by Stage 5 functions.
-- State machine per LD13: future → pending_fill → fill_in_progress → filled → approved → published

CREATE TABLE m.slot (
  slot_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform                  text NOT NULL,
    -- 'facebook' | 'instagram' | 'linkedin' | 'youtube' (matches c.client_publish_schedule.platform)
  scheduled_publish_at      timestamptz NOT NULL,
  format_preference         text[] NOT NULL DEFAULT ARRAY[]::text[],
    -- ordered preference, e.g. ['image_quote','text_post']; first viable wins in fill
  format_chosen             text,
    -- set by fill function once a format is locked in
  fill_window_opens_at      timestamptz NOT NULL,
    -- = scheduled_publish_at - fill_lead_time_minutes; LD4 sets default 1440
  fill_lead_time_minutes    integer NOT NULL DEFAULT 1440,
    -- LD4: 24-hour lead time for image/carousel/video production
  status                    text NOT NULL DEFAULT 'future',
  skip_reason               text,
    -- set when status transitions to 'skipped' or 'failed'
  filled_at                 timestamptz,
  filled_draft_id           uuid REFERENCES m.post_draft(post_draft_id) ON DELETE SET NULL,
  canonical_ids             uuid[] DEFAULT ARRAY[]::uuid[],
    -- selected canonicals for this slot; no FK enforcement (PG limitation on array element FKs);
    -- referential integrity preserved by fill function logic + audit trail in slot_fill_attempt
  is_evergreen              boolean NOT NULL DEFAULT false,
  evergreen_id              uuid,
    -- FK to t.evergreen_library set after that table is created (Migration 005)
  slot_confidence           numeric,
    -- composite metric per LD10, computed in Stage 7
  source_kind               text NOT NULL DEFAULT 'scheduled',
    -- 'scheduled' (from publish_schedule) | 'one_off' (manual/test) | 'urgent_breaking' (Stage 9)
  schedule_id               uuid REFERENCES c.client_publish_schedule(schedule_id) ON DELETE SET NULL,
    -- which schedule rule materialised this slot
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT m_slot_status_check CHECK (
    status IN ('future','pending_fill','fill_in_progress','filled','approved','published','skipped','failed')
  ),
  CONSTRAINT m_slot_evergreen_consistency CHECK (
    (is_evergreen = false AND evergreen_id IS NULL)
    OR (is_evergreen = true AND evergreen_id IS NOT NULL)
  ),
  CONSTRAINT m_slot_fill_window_consistency CHECK (
    fill_window_opens_at <= scheduled_publish_at
  )
);

-- Promotion query (Stage 5): future slots whose window opens within next 10 minutes
CREATE INDEX idx_slot_status_window
  ON m.slot (status, fill_window_opens_at);

-- Materialiser scheduling lookups
CREATE INDEX idx_slot_client_platform_scheduled
  ON m.slot (client_id, platform, scheduled_publish_at);

-- Recovery cron (Stage 9): find stuck fill_in_progress slots
CREATE INDEX idx_slot_fill_in_progress
  ON m.slot (status, filled_at)
  WHERE status = 'fill_in_progress';

-- Pending-fill queue (Stage 8 fill function pickup)
CREATE INDEX idx_slot_pending_fill
  ON m.slot (fill_window_opens_at, scheduled_publish_at)
  WHERE status = 'pending_fill';

COMMENT ON TABLE m.slot IS
  'Scheduled publish slots in the slot-driven architecture. State machine: future → pending_fill → fill_in_progress → filled → approved → published (or skipped/failed). LD13. Stage 1.003.';
