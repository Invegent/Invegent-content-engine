-- Stage 2.009 — t.class_freshness_rule: how long each content class stays "fresh" in the pool
-- Read by Stage 3 m.refresh_signal_pool to compute pool_expires_at.
-- Per LD2: timely_breaking decays fast; educational_evergreen lingers.
--
-- NOTE: t.content_class is a versioned table (class_code not globally unique;
-- only unique per (class_code, version) and partial-unique per class_code WHERE is_current=true).
-- A SQL FK on class_code is therefore not enforceable. Integrity is maintained
-- via the seed insert below (which references only current class_codes verified
-- in production at brief-write time) and through admin-controlled future updates.

CREATE TABLE t.class_freshness_rule (
  class_code              text PRIMARY KEY,
  freshness_window_hours  integer NOT NULL,
    -- pool entry expires this many hours after pool_entered_at
  rationale               text,
  is_current              boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_class_freshness_rule_window_positive CHECK (freshness_window_hours > 0)
);

INSERT INTO t.class_freshness_rule (class_code, freshness_window_hours, rationale) VALUES
  ('timely_breaking',       48,   'Breaking content stale within 2 days; faster decay protects against publishing yesterday''s news.'),
  ('stat_heavy',            168,  '7 days. Statistics retain interest until next data drop or rebuttal cycle.'),
  ('multi_point',           120,  '5 days. Listicle-style content has medium shelf life.'),
  ('human_story',           240,  '10 days. Personal stories and case studies stay relatable longer than news.'),
  ('educational_evergreen', 720,  '30 days. Concept explainers genuinely durable; longest pool window.'),
  ('analytical',            240,  '10 days. Analysis loses freshness as new data lands but slower than breaking news.');

DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.class_freshness_rule;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'class_freshness_rule seed expected 6, got %', v_count;
  END IF;
END $$;

-- Sanity: every seeded class_code corresponds to a current+active row in t.content_class
DO $$
DECLARE v_orphans integer;
BEGIN
  SELECT COUNT(*) INTO v_orphans
  FROM t.class_freshness_rule cfr
  WHERE NOT EXISTS (
    SELECT 1 FROM t.content_class cc
    WHERE cc.class_code = cfr.class_code AND cc.is_current = true AND cc.is_active = true
  );
  IF v_orphans > 0 THEN
    RAISE EXCEPTION 'class_freshness_rule has % orphan class_codes (no matching current+active t.content_class row)', v_orphans;
  END IF;
END $$;

COMMENT ON TABLE t.class_freshness_rule IS
  'Per-class pool freshness window in hours. Read by Stage 3 trigger to compute pool_expires_at. LD2. Stage 2.009.';
