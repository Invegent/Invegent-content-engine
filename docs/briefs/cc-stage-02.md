# Claude Code Brief — Stage 2: Config tables, helper functions, post_draft columns, trigram index

**Stage:** 2 of 19
**Phase:** A — Foundation
**Pre-req:** Stage 1 complete (commit `b4c8308`, all 8 migrations applied to DB)
**Goal:** Seed 5 config tables (freshness, synthesis, quality, reuse curve, dedup policy). Create 2 helper functions (title_similarity, keyword_overlap). Add `slot_id` + `is_shadow` columns to `m.post_draft`. Add trigram index on `f.canonical_content_item.canonical_title`. **Zero behaviour change** — pipeline still runs as before.
**Estimated duration:** 30–45 min including verification.

---

## Context for CC

This is foundation Stage 2 of 19. Stage 1 created the 7 structural tables. Stage 2 fills in the configuration data those tables will reference, the helper functions the fill function (Stage 8) will call, and the post_draft column extensions that let drafts be tracked back to their originating slot.

**This stage applies via Supabase MCP (NOT `supabase db push`).** The repo's standing pattern is MCP-applied DB-only migrations; CLI history reconciliation is incompatible with the repo's existing 280-migration history. CC creates the migration files (source of truth), commits them on `feature/slot-driven-v3-build`, and pushes — but does NOT run `supabase db push`. Claude (chat) applies via MCP and verifies, the same way Stage 1 worked.

### Schema corrections folded in for Stage 2

Pre-flight against production schema (just verified) found:

| v4 §C.1.5 / §F said | Production reality | Resolution |
|---|---|---|
| 6 format_synthesis_policy rows | 10 ice_format_keys exist in `t.class_format_fitness` | Seed 10 rows (one per format) |
| 6 format_quality_policy rows | Same — 10 formats | Seed 10 rows |
| `f.canonical_content_item.title` | Actual column is `canonical_title` | Trigram index targets `canonical_title` |
| 6 class_freshness_rule rows | 6 classes in `t.content_class` (matches) | Seed 6 rows; class_codes verified below |

The 6 class_codes verified in production: `timely_breaking`, `stat_heavy`, `multi_point`, `human_story`, `educational_evergreen`, `analytical` (priority 1→6).
The 10 ice_format_keys verified in production: `animated_data`, `animated_text_reveal`, `carousel`, `image_quote`, `text`, `video_short_avatar`, `video_short_kinetic`, `video_short_kinetic_voice`, `video_short_stat`, `video_short_stat_voice`.

---

## Pre-flight checks (CC runs first, reports back)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch (`git branch --show-current`)
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — should be fast-forward, no remote changes since `b4c8308`

If any pre-flight fails: STOP, report, do not proceed.

---

## Files to create

All under `supabase/migrations/`. Filenames continue the Stage 1 numbering sequence (009–017).

### Migration 009 — `20260426_009_create_class_freshness_rule_table.sql`

```sql
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
```

---

### Migration 010 — `20260426_010_create_format_synthesis_policy_table.sql`

```sql
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
```

---

### Migration 011 — `20260426_011_create_format_quality_policy_table.sql`

```sql
-- Stage 2.011 — t.format_quality_policy: per-format quality gates for fill function
-- Read by Stage 8 fill function to gate pool candidates by minimum fitness.
-- Tighter thresholds for high-production formats (avatar video) where bad inputs
-- waste expensive generation; looser for cheap formats (text post).

CREATE TABLE t.format_quality_policy (
  ice_format_key            text PRIMARY KEY,
  min_fitness_threshold     numeric NOT NULL,
    -- 0..100 scale matching t.class_format_fitness.fitness_score
  min_pool_size_for_format  integer NOT NULL DEFAULT 3,
    -- minimum candidate count before fill function picks this format
  max_dedup_similarity      numeric NOT NULL DEFAULT 0.75,
    -- title-similarity threshold above which canonicals count as duplicates
  rationale                 text,
  is_current                boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_format_quality_policy_threshold_range CHECK (
    min_fitness_threshold >= 0 AND min_fitness_threshold <= 100
  ),
  CONSTRAINT t_format_quality_policy_pool_size_positive CHECK (
    min_pool_size_for_format >= 1
  ),
  CONSTRAINT t_format_quality_policy_similarity_range CHECK (
    max_dedup_similarity >= 0 AND max_dedup_similarity <= 1
  )
);

-- Seed: 10 rows. Higher production cost = higher min threshold (don't waste avatar
-- generation budget on weak inputs). Carousel needs deeper pool (3+ canonicals).
INSERT INTO t.format_quality_policy (ice_format_key, min_fitness_threshold, min_pool_size_for_format, max_dedup_similarity, rationale) VALUES
  ('image_quote',                60, 2, 0.75, 'Cheap to generate, low risk. Standard threshold.'),
  ('text',                       50, 3, 0.70, 'Lowest production cost. Most permissive. Bundle of 2 needs pool of 3+.'),
  ('carousel',                   55, 4, 0.70, 'Bundle of 3 needs pool of 4+ for diversity. Moderate threshold.'),
  ('video_short_avatar',         75, 2, 0.80, 'Highest production cost (avatar generation $$$). Strict input gate.'),
  ('video_short_kinetic',        65, 2, 0.75, 'Mid-cost kinetic typography. Above-average threshold.'),
  ('video_short_kinetic_voice',  70, 2, 0.80, 'Higher cost (voice + kinetic). Tighter than text-only kinetic.'),
  ('video_short_stat',           65, 2, 0.75, 'Mid-cost stat animation. Above-average threshold.'),
  ('video_short_stat_voice',     70, 2, 0.80, 'Higher cost (voice + stat). Tighter than text-only stat.'),
  ('animated_data',              70, 2, 0.80, 'Custom animation work. Strict input gate.'),
  ('animated_text_reveal',       60, 2, 0.75, 'Lower-cost reveal animation. Standard threshold.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.format_quality_policy;
  IF v_count <> 10 THEN
    RAISE EXCEPTION 'format_quality_policy seed expected 10, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.format_quality_policy IS
  'Per-format fill function quality gates. Tighter thresholds for high-production formats. Stage 2.011.';
```

---

### Migration 012 — `20260426_012_create_reuse_penalty_curve_table.sql`

```sql
-- Stage 2.012 — t.reuse_penalty_curve: soft penalty for reusing pool entries (LD9)
-- Read by Stage 8 fill function. Replaces binary "used → exclude" with a curve
-- that lowers fitness by a multiplier based on prior use count.
-- e.g. reuse_count=0 → 1.0 (no penalty); reuse_count=3+ → 0.5 (halved).

CREATE TABLE t.reuse_penalty_curve (
  reuse_count_min    integer PRIMARY KEY,
    -- bucket lower bound (inclusive); 0,1,2,3 in seed
  reuse_count_max    integer,
    -- bucket upper bound (inclusive); NULL means "and above"
  fitness_multiplier numeric NOT NULL,
    -- multiplied against fitness_score in fill function ranking
  rationale          text,
  is_current         boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_reuse_penalty_curve_multiplier_range CHECK (
    fitness_multiplier > 0 AND fitness_multiplier <= 1
  ),
  CONSTRAINT t_reuse_penalty_curve_bucket_consistency CHECK (
    reuse_count_max IS NULL OR reuse_count_max >= reuse_count_min
  )
);

-- Seed: 4 rows
INSERT INTO t.reuse_penalty_curve (reuse_count_min, reuse_count_max, fitness_multiplier, rationale) VALUES
  (0, 0,    1.00, 'Never used; full fitness preserved.'),
  (1, 1,    0.85, 'Used once; soft 15% penalty allows reuse if pool is otherwise thin.'),
  (2, 2,    0.65, 'Used twice; meaningful penalty discourages over-use.'),
  (3, NULL, 0.50, 'Used 3+ times; halved fitness; near-block in normal pool.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.reuse_penalty_curve;
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'reuse_penalty_curve seed expected 4, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.reuse_penalty_curve IS
  'Soft penalty curve for reusing pool entries. Replaces binary dedup with smooth degradation. LD9. Stage 2.012.';
```

---

### Migration 013 — `20260426_013_create_dedup_policy_table.sql`

```sql
-- Stage 2.013 — t.dedup_policy: configurable dedup thresholds (LD16)
-- Read by Stage 8 fill function. Replaces magic-number thresholds with named profiles.
-- Default profile applies to all clients unless overridden in c.client_dedup_policy.

CREATE TABLE t.dedup_policy (
  policy_name                    text PRIMARY KEY,
  title_similarity_threshold     numeric NOT NULL,
    -- pg_trgm similarity above which two canonicals are dupes (0..1)
  keyword_overlap_threshold      numeric NOT NULL,
    -- jaccard overlap on keyword sets above which two canonicals are dupes (0..1)
  same_canonical_block_hours     integer NOT NULL,
    -- per F4/LD15: hard block re-using same canonical for same client+platform
    -- within this many hours
  same_source_diversity_min      integer NOT NULL DEFAULT 2,
    -- minimum distinct source_domains required when bundling (LD8 / source diversity)
  rationale                      text,
  is_current                     boolean NOT NULL DEFAULT true,
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_dedup_policy_title_range CHECK (
    title_similarity_threshold >= 0 AND title_similarity_threshold <= 1
  ),
  CONSTRAINT t_dedup_policy_keyword_range CHECK (
    keyword_overlap_threshold >= 0 AND keyword_overlap_threshold <= 1
  ),
  CONSTRAINT t_dedup_policy_block_positive CHECK (
    same_canonical_block_hours > 0
  )
);

-- Seed: 3 named profiles
INSERT INTO t.dedup_policy (
  policy_name, title_similarity_threshold, keyword_overlap_threshold,
  same_canonical_block_hours, same_source_diversity_min, rationale
) VALUES
  ('default', 0.75, 0.60, 168, 2,
   'Standard dedup. 168h = 7 days same-canonical block. Two distinct sources required for bundles.'),
  ('strict',  0.65, 0.50, 336, 3,
   'Tighter dedup for high-volume publishing. 14-day same-canonical block. Three sources for bundles.'),
  ('lenient', 0.85, 0.75, 72,  1,
   'Looser dedup for thin pool clients. 3-day same-canonical block. Single-source bundles permitted.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.dedup_policy;
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'dedup_policy seed expected 3, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.dedup_policy IS
  'Named dedup threshold profiles. Default applies to all clients unless overridden. LD16. Stage 2.013.';
```

---

### Migration 014 — `20260426_014_alter_post_draft_add_slot_id_is_shadow.sql`

```sql
-- Stage 2.014 — Extend m.post_draft with slot_id and is_shadow
-- slot_id: links draft back to the slot that originated it (NULL for legacy R6 drafts).
-- is_shadow: drafts created during shadow-mode fill (Phase B) — never published.
-- Both columns are nullable for backwards-compatibility with existing drafts.

ALTER TABLE m.post_draft
  ADD COLUMN slot_id    uuid REFERENCES m.slot(slot_id) ON DELETE SET NULL,
  ADD COLUMN is_shadow  boolean NOT NULL DEFAULT false;

-- Index 1: slot lookup (ai-worker idempotency check, Stage 11 LD18)
CREATE INDEX idx_post_draft_slot_id
  ON m.post_draft (slot_id)
  WHERE slot_id IS NOT NULL;

-- Index 2: shadow filter (publishers exclude is_shadow=true)
CREATE INDEX idx_post_draft_is_shadow
  ON m.post_draft (is_shadow, created_at)
  WHERE is_shadow = true;

COMMENT ON COLUMN m.post_draft.slot_id IS
  'FK to m.slot. NULL for legacy R6 drafts. Set by Stage 8 fill function for slot-driven drafts. Stage 2.014.';
COMMENT ON COLUMN m.post_draft.is_shadow IS
  'TRUE for drafts created during Phase B shadow mode. Excluded from publish queue. Default false. Stage 2.014.';
```

---

### Migration 015 — `20260426_015_create_title_similarity_function.sql`

```sql
-- Stage 2.015 — m.title_similarity: pg_trgm-based fuzzy title comparison
-- IMMUTABLE so it can be used in indexes and parallelised in queries.
-- Returns numeric in [0,1] where 1.0 = identical.

CREATE OR REPLACE FUNCTION m.title_similarity(p_a text, p_b text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  -- pg_trgm similarity() returns real; cast to numeric for type stability across callers.
  -- Coalesce NULL inputs to '' so the function never returns NULL.
  SELECT similarity(coalesce(p_a, ''), coalesce(p_b, ''))::numeric;
$$;

COMMENT ON FUNCTION m.title_similarity(text, text) IS
  'Trigram-based fuzzy title similarity. Returns 0..1 where 1=identical. IMMUTABLE. LD8. Stage 2.015.';
```

---

### Migration 016 — `20260426_016_create_keyword_overlap_function.sql`

```sql
-- Stage 2.016 — m.keyword_overlap: jaccard overlap on tokenised keyword sets
-- IMMUTABLE so it can be used in computed columns and indexes.
-- Returns numeric in [0,1] where 1.0 = identical token sets.
--
-- Implementation: lowercase, split on non-word chars, drop tokens shorter than 4 chars
-- (filters common stopwords without a stopword list), compute jaccard on the result.

CREATE OR REPLACE FUNCTION m.keyword_overlap(p_a text, p_b text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  v_set_a text[];
  v_set_b text[];
  v_intersection int;
  v_union int;
BEGIN
  IF p_a IS NULL OR p_b IS NULL OR length(trim(p_a)) = 0 OR length(trim(p_b)) = 0 THEN
    RETURN 0;
  END IF;

  -- Tokenise: lowercase → split on non-word → drop short tokens → distinct
  SELECT array_agg(DISTINCT t)
    INTO v_set_a
  FROM unnest(regexp_split_to_array(lower(p_a), '\W+')) AS t
  WHERE length(t) >= 4;

  SELECT array_agg(DISTINCT t)
    INTO v_set_b
  FROM unnest(regexp_split_to_array(lower(p_b), '\W+')) AS t
  WHERE length(t) >= 4;

  IF v_set_a IS NULL OR v_set_b IS NULL OR
     array_length(v_set_a, 1) IS NULL OR array_length(v_set_b, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Jaccard: |A ∩ B| / |A ∪ B|
  SELECT COUNT(*) INTO v_intersection
  FROM (SELECT unnest(v_set_a) INTERSECT SELECT unnest(v_set_b)) x;

  SELECT COUNT(*) INTO v_union
  FROM (SELECT unnest(v_set_a) UNION SELECT unnest(v_set_b)) x;

  IF v_union = 0 THEN
    RETURN 0;
  END IF;

  RETURN (v_intersection::numeric / v_union::numeric);
END;
$$;

COMMENT ON FUNCTION m.keyword_overlap(text, text) IS
  'Jaccard overlap on tokenised keyword sets. Tokens lowercased + split on non-word + filtered to len>=4. Returns 0..1. IMMUTABLE. LD8. Stage 2.016.';
```

---

### Migration 017 — `20260426_017_create_canonical_title_trgm_index.sql`

```sql
-- Stage 2.017 — GiST trigram index on f.canonical_content_item.canonical_title
-- Speeds up Stage 8 fill function dedup checks (m.title_similarity in WHERE clause)
-- from a sequential scan over the full canonical table to an index lookup.
--
-- Note: column is canonical_title (not title — v4 had this wrong).

CREATE INDEX IF NOT EXISTS idx_canonical_title_trgm
  ON f.canonical_content_item
  USING GIST (canonical_title gist_trgm_ops);

COMMENT ON INDEX f.idx_canonical_title_trgm IS
  'Trigram GiST index for fast similarity lookups on canonical_title. Used by Stage 8 fill function dedup. Stage 2.017.';
```

---

## Code changes

None. Stage 2 is DDL + seed data only.

---

## Commands to run

From `C:\Users\parve\Invegent-content-engine` on `feature/slot-driven-v3-build`:

```bash
# 1. Confirm clean state
git status
git branch --show-current   # should print: feature/slot-driven-v3-build

# 2. Files are now created on disk. DO NOT run `supabase db push`.
#    Claude (chat) will apply migrations via Supabase MCP after CC commits the files.
#    Just stage, commit, and push:

git add supabase/migrations/20260426_009_create_class_freshness_rule_table.sql
git add supabase/migrations/20260426_010_create_format_synthesis_policy_table.sql
git add supabase/migrations/20260426_011_create_format_quality_policy_table.sql
git add supabase/migrations/20260426_012_create_reuse_penalty_curve_table.sql
git add supabase/migrations/20260426_013_create_dedup_policy_table.sql
git add supabase/migrations/20260426_014_alter_post_draft_add_slot_id_is_shadow.sql
git add supabase/migrations/20260426_015_create_title_similarity_function.sql
git add supabase/migrations/20260426_016_create_keyword_overlap_function.sql
git add supabase/migrations/20260426_017_create_canonical_title_trgm_index.sql

git commit -m "feat(slot-driven): Stage 2 — config tables + helpers + post_draft cols + trigram index

Phase A foundation continued. Zero behaviour change. R6 stays paused.

- t.class_freshness_rule (6 seeds: timely_breaking 48h → educational_evergreen 720h)
- t.format_synthesis_policy (10 seeds: single_item / bundle synthesis modes)
- t.format_quality_policy (10 seeds: per-format min_fitness_threshold)
- t.reuse_penalty_curve (4 seeds: 0/1/2/3+ reuse buckets)
- t.dedup_policy (3 seeds: default / strict / lenient profiles)
- m.post_draft: ADD COLUMN slot_id uuid + is_shadow boolean
- m.title_similarity(text,text): pg_trgm wrapper, IMMUTABLE
- m.keyword_overlap(text,text): jaccard on tokenised sets, IMMUTABLE
- f.idx_canonical_title_trgm: GiST trigram index on canonical_title

Schema corrections vs v4:
- 10 ice_format_keys in production (not 6 as v4 §C.1.5 assumed)
- canonical_title (not title) on f.canonical_content_item

Migrations applied via Supabase MCP per repo standing pattern.

Refs: 26d88b8 (v4), b4c8308 (Stage 1)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

Paste this template into chat with values filled in:

```
## Stage 2 CC report (git side only)

- ✅ Pre-flight passed: yes/no (if no, what failed)
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 9/9
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No supabase db push.
Awaiting Claude (chat) to apply migrations via MCP.
```

---

## Then PAUSE

After CC reports the commit pushed, Claude (chat) applies migrations 009–017 via Supabase MCP, then runs Stage 2 verification queries:

```sql
-- V1: 5 new tables exist in t schema, post_draft has new columns
SELECT table_schema, table_name FROM information_schema.tables
WHERE (table_schema, table_name) IN (
  ('t','class_freshness_rule'),
  ('t','format_synthesis_policy'),
  ('t','format_quality_policy'),
  ('t','reuse_penalty_curve'),
  ('t','dedup_policy')
);
-- EXPECTED: 5 rows

-- V2: Seed counts
SELECT 'class_freshness_rule' AS t, COUNT(*) FROM t.class_freshness_rule
UNION ALL SELECT 'format_synthesis_policy', COUNT(*) FROM t.format_synthesis_policy
UNION ALL SELECT 'format_quality_policy', COUNT(*) FROM t.format_quality_policy
UNION ALL SELECT 'reuse_penalty_curve', COUNT(*) FROM t.reuse_penalty_curve
UNION ALL SELECT 'dedup_policy', COUNT(*) FROM t.dedup_policy;
-- EXPECTED: 6, 10, 10, 4, 3

-- V3: post_draft new columns
SELECT column_name FROM information_schema.columns
WHERE table_schema='m' AND table_name='post_draft'
  AND column_name IN ('slot_id','is_shadow');
-- EXPECTED: 2 rows

-- V4: helper functions callable
SELECT m.title_similarity('NDIS reform announced', 'NDIS reform announcement');
-- EXPECTED: numeric > 0.7

SELECT m.keyword_overlap('NDIS reform announced today', 'NDIS reform announcement next week');
-- EXPECTED: numeric > 0 (some overlap on "ndis", "reform", "announced/announcement")

-- V5: Trigram index exists
SELECT indexname FROM pg_indexes
WHERE schemaname='f' AND indexname='idx_canonical_title_trgm';
-- EXPECTED: 1 row

-- V6: R6 still paused
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
-- EXPECTED: all three active=false
```

If all pass, Stage 2 closed → Stage 3 brief follows (pool trigger + helper).

---

## Rollback (if any verification fails)

```sql
DROP INDEX IF EXISTS f.idx_canonical_title_trgm;
DROP FUNCTION IF EXISTS m.keyword_overlap(text,text);
DROP FUNCTION IF EXISTS m.title_similarity(text,text);
ALTER TABLE m.post_draft DROP COLUMN IF EXISTS is_shadow;
ALTER TABLE m.post_draft DROP COLUMN IF EXISTS slot_id;
DROP TABLE IF EXISTS t.dedup_policy;
DROP TABLE IF EXISTS t.reuse_penalty_curve;
DROP TABLE IF EXISTS t.format_quality_policy;
DROP TABLE IF EXISTS t.format_synthesis_policy;
DROP TABLE IF EXISTS t.class_freshness_rule;
```

---

*End Stage 2 brief. v4 commit `26d88b8`. Stage 1 closed at `b4c8308`. Author: Claude (chat). For execution by: Claude Code (local).*
