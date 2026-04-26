-- Stage 2.009 — t.class_freshness_rule: how long each content class stays "fresh" in the pool
-- Read by Stage 3 m.refresh_signal_pool to compute pool_expires_at.
-- Per LD2: timely_breaking decays fast; educational_evergreen lingers.

CREATE TABLE t.class_freshness_rule (
  class_code              text PRIMARY KEY REFERENCES t.content_class(class_code) ON UPDATE CASCADE,
  freshness_window_hours  integer NOT NULL,
    -- pool entry expires this many hours after pool_entered_at
  rationale               text,
  is_current              boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_class_freshness_rule_window_positive CHECK (freshness_window_hours > 0)
);

-- Seed: 6 rows matching all is_current=true classes in t.content_class
-- Windows tuned so timely classes drop out of pool within publish-cycle of breaking;
-- evergreen-leaning classes hang around long enough to be picked up by multiple slots.
INSERT INTO t.class_freshness_rule (class_code, freshness_window_hours, rationale) VALUES
  ('timely_breaking',       48,   'Breaking content stale within 2 days; faster decay protects against publishing yesterday''s news.'),
  ('stat_heavy',            168,  '7 days. Statistics retain interest until next data drop or rebuttal cycle.'),
  ('multi_point',           120,  '5 days. Listicle-style content has medium shelf life.'),
  ('human_story',           240,  '10 days. Personal stories and case studies stay relatable longer than news.'),
  ('educational_evergreen', 720,  '30 days. Concept explainers genuinely durable; longest pool window.'),
  ('analytical',            240,  '10 days. Analysis loses freshness as new data lands but slower than breaking news.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.class_freshness_rule;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'class_freshness_rule seed expected 6, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.class_freshness_rule IS
  'Per-class pool freshness window in hours. Read by Stage 3 trigger to compute pool_expires_at. LD2. Stage 2.009.';
