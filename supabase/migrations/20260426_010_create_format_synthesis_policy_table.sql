-- Stage 2.010 — t.format_synthesis_policy: per-format synthesis bundling rules (LD5)
-- Read by Stage 8 fill function to decide how many canonicals to bundle per slot.
-- Single-item: image_quote, video, timely (one canonical → one synthesised post).
-- Bundle 2: text (two canonicals woven together for richer prose).
-- Bundle 3: carousel (three canonicals → three slides).

CREATE TABLE t.format_synthesis_policy (
  ice_format_key      text PRIMARY KEY,
  synthesis_mode      text NOT NULL,
    -- 'single_item' | 'bundle' | 'campaign'
  bundle_size_min     integer NOT NULL DEFAULT 1,
  bundle_size_max     integer NOT NULL DEFAULT 1,
  rationale           text,
  is_current          boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_format_synthesis_policy_mode_check CHECK (
    synthesis_mode IN ('single_item','bundle','campaign')
  ),
  CONSTRAINT t_format_synthesis_policy_bundle_consistency CHECK (
    bundle_size_min >= 1 AND bundle_size_max >= bundle_size_min
  )
);

-- Seed: 10 rows, one per ice_format_key currently in production t.class_format_fitness
INSERT INTO t.format_synthesis_policy (ice_format_key, synthesis_mode, bundle_size_min, bundle_size_max, rationale) VALUES
  ('image_quote',                'single_item', 1, 1, 'One quote per image. LD5.'),
  ('text',                       'bundle',      2, 2, 'Two canonicals woven into prose for richer hook + supporting evidence. LD5.'),
  ('carousel',                   'bundle',      3, 3, 'Three slides, one canonical per slide. LD5.'),
  ('video_short_avatar',         'single_item', 1, 1, 'Avatar speaking one focused message. LD5.'),
  ('video_short_kinetic',        'single_item', 1, 1, 'Kinetic typography: one core message. LD5.'),
  ('video_short_kinetic_voice',  'single_item', 1, 1, 'Voice-over kinetic: one focused message. LD5.'),
  ('video_short_stat',           'single_item', 1, 1, 'Single hero stat per video. LD5.'),
  ('video_short_stat_voice',     'single_item', 1, 1, 'Voiced single hero stat. LD5.'),
  ('animated_data',              'single_item', 1, 1, 'One dataset, one chart animation. LD5.'),
  ('animated_text_reveal',       'single_item', 1, 1, 'One reveal-line message. LD5.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.format_synthesis_policy;
  IF v_count <> 10 THEN
    RAISE EXCEPTION 'format_synthesis_policy seed expected 10, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.format_synthesis_policy IS
  'Per-format synthesis bundling rules. single_item = one canonical → one post. bundle = N canonicals → one post. LD5. Stage 2.010.';
