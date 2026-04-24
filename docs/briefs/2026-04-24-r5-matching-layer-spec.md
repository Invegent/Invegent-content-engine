# R5 — Matching Layer Spec

**Draft date:** 24 Apr 2026 evening (Track B) — **v2 feedback integrated 25 Apr**
**Status:** 🟢 **SPEC v2 — READY FOR BUILD** (feedback from external model review integrated)
**Pipeline position:** R4 (classifier) output → **R5 (this)** → R6 (seed_and_enqueue rewrite)
**Decision refs:** D144 (router master), D167 (router MVP shadow), D143 (classifier)
**Depends on:** R4 content_class column populated on f.canonical_content_body

---

## Purpose in one paragraph

R4 assigns each canonical a `content_class` (timely_breaking, stat_heavy, multi_point, human_story, educational_evergreen, analytical). R3's demand grid (`m.build_weekly_demand_grid`) says "this client wants 12 posts this week — 4 Facebook text + 2 Facebook carousel + 3 Instagram image_quote + 3 LinkedIn video_short_kinetic". R5 is the matching function that answers: **for each demand slot, which specific canonical best fits it?** It reads class-to-format fitness from a table, client-specific overrides from another table, client-specific scoring weights from a third table, and emits `(platform, ice_format_key, canonical_id, digest_item_id, match_score, match_reason)` tuples ready for R6 to convert into seeds + drafts + AI jobs. Pure read-only function. Deterministic. Explainable via `match_reason`. Writes a companion row to `m.post_format_performance` at publish time (via insights-worker) so the learning loop has data when R7 lands.

---

## v2 feedback integration summary

Original spec shipped 24 Apr with 7 open questions. External model review (25 Apr) resolved 5 of 7 with substantive changes and kept 2 open pending real data. Full resolution log in **Questions resolved** section below. Net additions from v2:
- New table `c.client_match_weights` — per-client weight overrides (fitness/quality/recency) with global fallback
- New table `m.post_format_performance` — instrumentation substrate for R7 learning loop (cheap to add now, expensive to retrofit)
- New table `c.client_dedup_policy` — time-windowed cross-platform dedup replaces binary aggressive/permissive
- Revised scoring weights — 40/30/30 default (was 50/30/20) with per-client override path
- New recency-override rule — very fresh canonicals (recency_score > 80 = <4h old) relax fitness threshold from 50 → 40
- Clarified framing — matrix is a production capability map, not a format taxonomy
- Clarified scope — campaigns/series route through reserved slots (R8 subsystem), not this matching pool

---

## Why a table-driven fitness matrix (PK principle applied)

Every (class, format) pair has a fitness score from 0-100:
- `timely_breaking × image_quote` = 95 — breaking news *is* a single strong statement
- `timely_breaking × carousel` = 30 — carousel assumes structure; breaking news is usually one punch
- `multi_point × carousel` = 98 — numbered list → swipe slides, perfect fit
- `multi_point × video_short_stat` = 15 — single stat reveal can't represent 5 points
- `human_story × video_short_avatar` = 92 — avatar telling a human story = strong
- `stat_heavy × animated_data` = 97 — numbers that animate → exactly the format's point
- `analytical × text` = 88 — long LinkedIn text for thought leadership

Hardcoding the 60+ pair scores in function body is the exact drift surface PK flagged for R4. Table-driven means:
- **Tuning:** UPDATE fitness_score when observed performance suggests a different weighting. Seconds, no deploy.
- **New format:** INSERT a fitness row for each existing class × the new format. No function change.
- **Per-client tuning:** client_class_fitness_override lets a client favour or penalise specific pairings without touching defaults.
- **Observability:** operator queries the table to see why a match was chosen (`match_reason` pulls `fitness_score` + `rationale` from the matched row).

Same D167 versioning pattern (`version` + `is_current` + `superseded_by` + `effective_from`) for complete history of how fitness weightings have evolved.

---

## Schema

### Table 1 — `t.class_format_fitness`

Default fitness for each (class × format) pair. 6 classes × ~10 active formats = ~60 rows. D167-style versioning.

```sql
CREATE TABLE t.class_format_fitness (
  fitness_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code         TEXT NOT NULL,
  ice_format_key     TEXT NOT NULL,
  fitness_score      NUMERIC(4,1) NOT NULL CHECK (fitness_score >= 0 AND fitness_score <= 100),
  rationale          TEXT,
  version            TEXT NOT NULL,
  effective_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by      UUID REFERENCES t.class_format_fitness(fitness_id),
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT class_format_fitness_version_uniq UNIQUE (class_code, ice_format_key, version),

  CONSTRAINT fk_cff_ice_format_key
    FOREIGN KEY (ice_format_key) REFERENCES t."5.3_content_format"(ice_format_key)
);

CREATE UNIQUE INDEX class_format_fitness_one_current_per_pair
  ON t.class_format_fitness (class_code, ice_format_key) WHERE is_current = TRUE;

CREATE INDEX idx_class_format_fitness_lookup
  ON t.class_format_fitness (class_code, ice_format_key, fitness_score DESC)
  WHERE is_current = TRUE;
```

**FK to t.content_class.class_code caveat.** `class_code` in `t.content_class` is NOT globally unique — rows share code across versions. For v1 MVP we punt on the FK and rely on the partial unique index + application-level validation. Revisit if drift appears.

### Table 2 — `c.client_class_fitness_override`

Per-client overrides to default fitness. Same pattern as `c.client_format_mix_override`. D167-style versioning.

```sql
CREATE TABLE c.client_class_fitness_override (
  override_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  class_code         TEXT NOT NULL,
  ice_format_key     TEXT NOT NULL,
  override_score     NUMERIC(4,1) NOT NULL CHECK (override_score >= 0 AND override_score <= 100),
  rationale          TEXT,
  version            TEXT NOT NULL,
  effective_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by      UUID REFERENCES c.client_class_fitness_override(override_id),
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ccfo_version_uniq UNIQUE (client_id, class_code, ice_format_key, version),
  CONSTRAINT fk_ccfo_ice_format_key
    FOREIGN KEY (ice_format_key) REFERENCES t."5.3_content_format"(ice_format_key)
);

CREATE UNIQUE INDEX client_class_fitness_override_one_current
  ON c.client_class_fitness_override (client_id, class_code, ice_format_key)
  WHERE is_current = TRUE;
```

**Use case example.** Property Pulse has found from 3 months of performance data that stat_heavy × video_short_stat underperforms their audience. Insert override row with override_score=40 (default is 97). R5 will now prefer other fits for PP's video_short_stat slots without affecting any other client.

### Table 3 — fitness lookup view

Convenience view collapsing default + override into a single effective score:

```sql
CREATE OR REPLACE VIEW t.vw_effective_class_format_fitness AS
SELECT
  client_id,
  class_code,
  ice_format_key,
  COALESCE(override_score, default_score) AS effective_score,
  CASE WHEN override_score IS NOT NULL THEN 'client_override' ELSE 'default' END AS score_source,
  COALESCE(override_rationale, default_rationale) AS rationale
FROM (
  SELECT c.client_id,
         cff.class_code, cff.ice_format_key,
         cff.fitness_score AS default_score,
         cff.rationale AS default_rationale,
         ccfo.override_score,
         ccfo.rationale AS override_rationale
  FROM c.client c
  CROSS JOIN t.class_format_fitness cff
  LEFT JOIN c.client_class_fitness_override ccfo
    ON ccfo.client_id = c.client_id
   AND ccfo.class_code = cff.class_code
   AND ccfo.ice_format_key = cff.ice_format_key
   AND ccfo.is_current = TRUE
  WHERE cff.is_current = TRUE
) x;
```

R5 matching function reads this view. One source of truth.

### Table 4 — `c.client_match_weights` (v2 new)

Per-client overrides for the 3-dimensional scoring (fitness/quality/recency weights). Nullable per-client row → falls back to global default in `t.router_policy_default`. Added after feedback review because ICE's mixed portfolio has genuinely different scoring needs per brand (PP is news-driven; CFW is evergreen). Global-only weighting would force a wrong default on one or both.

```sql
CREATE TABLE c.client_match_weights (
  weight_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  fitness_weight     NUMERIC(3,2) NOT NULL CHECK (fitness_weight >= 0 AND fitness_weight <= 1),
  quality_weight     NUMERIC(3,2) NOT NULL CHECK (quality_weight >= 0 AND quality_weight <= 1),
  recency_weight     NUMERIC(3,2) NOT NULL CHECK (recency_weight >= 0 AND recency_weight <= 1),
  rationale          TEXT,
  version            TEXT NOT NULL,
  effective_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by      UUID REFERENCES c.client_match_weights(weight_id),
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT client_match_weights_version_uniq UNIQUE (client_id, version),
  CONSTRAINT client_match_weights_sum_check CHECK (
    ABS((fitness_weight + quality_weight + recency_weight) - 1.00) < 0.01
  )
);

CREATE UNIQUE INDEX client_match_weights_one_current
  ON c.client_match_weights (client_id) WHERE is_current = TRUE;
```

**No rows at v1 launch.** Every client falls back to global default 40/30/30. Rows get inserted only when a client accumulates enough performance data to justify a tuned weight profile (likely 4-8 weeks post-insights-worker shipping).

### Table 5 — `m.post_format_performance` (v2 new)

Instrumentation substrate for future R7 data-driven tuning. R5 reads nothing from this table and writes nothing to it — but the path from "classifier + matching decision" to "published outcome" needs a stable home so R7's learning loop has data to work from when it lands. Written by insights-worker (Phase 2.1) daily, when engagement metrics come back from platform APIs.

```sql
CREATE TABLE m.post_format_performance (
  performance_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_publish_id             UUID NOT NULL REFERENCES m.post_publish(post_publish_id) ON DELETE CASCADE,
  client_id                   UUID NOT NULL REFERENCES c.client(client_id),
  platform                    TEXT NOT NULL,
  ice_format_key              TEXT NOT NULL,
  content_class               TEXT,
  fitness_score_at_publish    NUMERIC(4,1),
  quality_score_at_publish    NUMERIC(4,2),
  recency_score_at_publish    NUMERIC(4,1),
  final_match_score_at_publish NUMERIC(6,2),
  match_weights_version       TEXT,
  fitness_version             TEXT,
  classifier_version          INT,
  published_at                TIMESTAMPTZ NOT NULL,
  reach                       INT,
  impressions                 INT,
  engagement_count            INT,
  engagement_rate             NUMERIC(5,4),
  ctr                         NUMERIC(5,4),
  clicks                      INT,
  shares                      INT,
  saved                       INT,
  measured_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  measurement_window_hours    INT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_pfp_platform FOREIGN KEY (platform) REFERENCES t."5.0_social_platform"(platform_code),
  CONSTRAINT fk_pfp_format FOREIGN KEY (ice_format_key) REFERENCES t."5.3_content_format"(ice_format_key),
  CONSTRAINT pfp_measurement_uniq UNIQUE (post_publish_id, measurement_window_hours)
);

CREATE INDEX idx_pfp_client_class_format ON m.post_format_performance (client_id, content_class, ice_format_key, published_at DESC);
CREATE INDEX idx_pfp_performance_lookup ON m.post_format_performance (content_class, ice_format_key, engagement_rate DESC);
```

**Why capture versions at publish time?** A post published under fitness_version='v1' and classifier_version=1 should be compared against other v1/1 decisions, not against v2/2 decisions made 6 months later. Versioning each row at publish time means R7 can do apples-to-apples comparisons as the underlying vocabulary evolves.

**Populated by insights-worker, not R5.** Phase 2.1 (insights-worker) ships the writer. R5 just ensures the path is there.

### Table 6 — `c.client_dedup_policy` (v2 new)

Replaces the binary "aggressive vs permissive" dedup framing from v1 with time-windowed cross-platform logic. Each client gets a policy row; policy defines how long the same canonical is blocked from cross-posting.

```sql
CREATE TABLE c.client_dedup_policy (
  policy_id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                      UUID NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  min_cross_platform_gap_hours   INT NOT NULL DEFAULT 24 CHECK (min_cross_platform_gap_hours >= 0),
  same_platform_repost_gap_days  INT NOT NULL DEFAULT 7 CHECK (same_platform_repost_gap_days >= 0),
  rationale                      TEXT,
  version                        TEXT NOT NULL,
  effective_from                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by                  UUID REFERENCES c.client_dedup_policy(policy_id),
  is_current                     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT client_dedup_policy_version_uniq UNIQUE (client_id, version)
);

CREATE UNIQUE INDEX client_dedup_policy_one_current
  ON c.client_dedup_policy (client_id) WHERE is_current = TRUE;
```

**Defaults:** 24h cross-platform gap, 7d same-platform gap. Clients can widen or narrow based on audience overlap. Same-platform repost gap captures the evergreen rotation pattern — a pillar piece can reasonably be republished after a week with fresh framing.

---

## v1 fitness seed matrix

6 classes × 10 buildable formats = 60 rows. Scores represent default fitness — informed by the D167 mix rationale + spec's format descriptions from `t.5.3_content_format`.

**Why only 10 formats, not all 22?** The matrix is a PRODUCTION CAPABILITY MAP, not a taxonomy. `t."5.3_content_format"` has 22 formats but only ~10 are currently ICE-buildable end-to-end. Expanding the matrix before ICE can produce the format is speculative work — drift from capability reality and the fitness scores become fictional. Rule: matrix rows follow production capability. When we ship a new format worker (e.g. audio via ElevenLabs, newsletter via Resend), we add 6 rows (one per class) at the same time.

### Legend
- 90-100 = canonical fit (format was designed for this class)
- 70-89 = strong fit (format handles this class well)
- 50-69 = acceptable fit (works but not optimal)
- 30-49 = weak fit (mismatches show; use only if nothing better available)
- 0-29 = poor fit (avoid unless desperate)

### v1 matrix

| class ↓ / format → | text | image_quote | carousel | animated_text_reveal | animated_data | video_short_kinetic | video_short_kinetic_voice | video_short_stat | video_short_stat_voice | video_short_avatar |
|---|---|---|---|---|---|---|---|---|---|---|
| **timely_breaking** | 88 | 95 | 30 | 82 | 70 | 55 | 55 | 60 | 60 | 50 |
| **stat_heavy** | 60 | 80 | 70 | 75 | 97 | 50 | 50 | 95 | 95 | 45 |
| **multi_point** | 65 | 40 | 98 | 50 | 40 | 90 | 90 | 20 | 20 | 50 |
| **human_story** | 75 | 55 | 60 | 55 | 30 | 75 | 80 | 30 | 35 | 92 |
| **educational_evergreen** | 70 | 65 | 92 | 55 | 50 | 82 | 88 | 40 | 40 | 78 |
| **analytical** | 88 | 55 | 75 | 50 | 55 | 60 | 65 | 30 | 35 | 55 |

### Rationale examples (populated in `rationale` column)

- **timely_breaking × image_quote (95):** "Breaking news IS a single strong statement. Image quote pulls the core of the announcement front-and-centre. Short production time matches the time-sensitive nature."
- **multi_point × carousel (98):** "Numbered list maps 1:1 to carousel slides. Format designed for exactly this content shape. Carousel is 40% of LinkedIn mix per D167 — heavy format consumer."
- **stat_heavy × animated_data (97):** "Animation of the key number is the format's entire point. Numbers that move have 3x scroll-stop vs static stats per format advisor_description."
- **human_story × video_short_avatar (92):** "AI avatar telling a human story creates intimacy that static formats can't. Works strongly for NDIS participant narratives and property investor journeys."
- **stat_heavy × video_short_avatar (45):** "Avatar reading numbers feels flat — the motion of stats (animated_data or video_short_stat) is the core shape. Avoid pairing unless narrative context around the stat is strong."

These rationales ship in the seed INSERT so operators querying the table understand the shape.

---

## The matching algorithm — signature + logic

```
FUNCTION m.match_demand_to_canonicals(
  p_client_id UUID,
  p_week_start DATE DEFAULT CURRENT_DATE,
  p_min_fitness_score NUMERIC DEFAULT 50.0,
  p_max_per_slot INT DEFAULT 1
) RETURNS TABLE (
  platform            TEXT,
  ice_format_key      TEXT,
  content_class       TEXT,
  canonical_id        UUID,
  digest_item_id      UUID,
  fitness_score       NUMERIC,
  quality_score       NUMERIC,
  recency_score       NUMERIC,
  final_match_score   NUMERIC,
  match_reason        TEXT
)
LANGUAGE plpgsql
STABLE
```

**Inputs:**
- `p_client_id` — client for which to match
- `p_week_start` — passed through to `m.build_weekly_demand_grid`
- `p_min_fitness_score` — base threshold for class×format pairs; overridden per-candidate by recency rule (default 50; recency>80 candidates get 40)
- `p_max_per_slot` — how many candidates to return per (platform, format) demand row (default 1; increase to get fallbacks for R6)

**Output:**
- One row per matched slot. Includes the resolved canonical_id + digest_item_id (R6 needs both to build the seed_payload).
- `fitness_score`, `quality_score`, `recency_score` — the three dimensions as scored
- `final_match_score` = weighted composite per client_match_weights (or global 40/30/30 default)
- `match_reason` = human-readable string like "fitness=95 × 0.40 + quality=80 × 0.30 + recency=90 × 0.30 = 89.0 (weights: default)"

**Algorithm:**

```
0. Load client weights:
   SELECT COALESCE(cmw.fitness_weight, 0.40) AS fw,
          COALESCE(cmw.quality_weight, 0.30) AS qw,
          COALESCE(cmw.recency_weight, 0.30) AS rw,
          CASE WHEN cmw.weight_id IS NOT NULL
               THEN cmw.version ELSE 'global_default_40_30_30' END AS weights_version
   FROM c.client c
   LEFT JOIN c.client_match_weights cmw
     ON cmw.client_id = c.client_id AND cmw.is_current = TRUE
   WHERE c.client_id = p_client_id

1. Load demand grid:
   SELECT platform, ice_format_key, weekly_slot_count
   FROM m.build_weekly_demand_grid(p_client_id, p_week_start)
   WHERE weekly_slot_count > 0

2. Load dedup policy:
   SELECT COALESCE(cdp.min_cross_platform_gap_hours, 24) AS cross_gap_hrs,
          COALESCE(cdp.same_platform_repost_gap_days, 7) AS same_gap_days
   FROM c.client_dedup_policy cdp
   WHERE cdp.client_id = p_client_id AND cdp.is_current = TRUE

3. For each demand row (platform, format, slot_count):

   3a. Find candidate canonicals:
       SELECT di.digest_item_id, cci.canonical_id, ccb.content_class,
              ccb.word_count, cci.first_seen_at, di.final_score,
              efcf.effective_score AS fitness_score,
              efcf.score_source
       FROM m.digest_item di
       JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
       JOIN f.canonical_content_item cci ON cci.canonical_id = di.canonical_id
       JOIN f.canonical_content_body ccb ON ccb.canonical_id = cci.canonical_id
       JOIN t.vw_effective_class_format_fitness efcf
         ON efcf.client_id = dr.client_id
        AND efcf.class_code = ccb.content_class
        AND efcf.ice_format_key = demand_row.ice_format_key
       WHERE dr.client_id = p_client_id
         AND di.selection_state = 'selected'
         AND di.bundled = true
         AND ccb.content_class IS NOT NULL
         AND ccb.fetch_status = 'success'
         -- Same-platform dedup (same canonical, same platform, within repost gap):
         AND NOT EXISTS (
           SELECT 1 FROM m.post_publish pp
           WHERE pp.client_id = p_client_id
             AND pp.platform = demand_row.platform
             AND pp.canonical_id = cci.canonical_id
             AND pp.created_at > NOW() - (same_gap_days * interval '1 day')
         )
         -- Cross-platform dedup (same canonical, different platform, within cross gap):
         AND NOT EXISTS (
           SELECT 1 FROM m.post_publish pp
           WHERE pp.client_id = p_client_id
             AND pp.platform <> demand_row.platform
             AND pp.canonical_id = cci.canonical_id
             AND pp.created_at > NOW() - (cross_gap_hrs * interval '1 hour')
         )
         -- Not already seeded / drafted for this (client, platform):
         AND NOT EXISTS (
           SELECT 1 FROM m.post_seed ps
           WHERE ps.client_id = p_client_id
             AND ps.platform = demand_row.platform
             AND ps.digest_item_id = di.digest_item_id
         )
         AND NOT EXISTS (
           SELECT 1 FROM m.post_draft pd
           WHERE pd.client_id = p_client_id
             AND pd.platform = demand_row.platform
             AND pd.digest_item_id = di.digest_item_id
         )

   3b. Score candidates with recency-override:
       quality_score    = COALESCE(di.final_score, 0.5) * 100
       recency_score    = recency_bonus(cci.first_seen_at) * 100

       -- Recency override: very fresh canonicals may not fit format perfectly
       -- but still deserve to ship. Lower threshold from 50 → 40 if recency > 80.
       effective_fitness_threshold =
         CASE WHEN recency_score > 80 THEN 40 ELSE p_min_fitness_score END

       WHERE fitness_score >= effective_fitness_threshold

       final_match_score =
         fitness_score * fw         -- weighted fitness (0-100 × weight)
       + quality_score * qw         -- weighted quality
       + recency_score * rw         -- weighted recency

       where recency_bonus(first_seen_at) =
         CASE
           WHEN NOW() - first_seen_at < interval '4 hours'   THEN 1.0   -- recency_score > 80 → threshold relaxed
           WHEN NOW() - first_seen_at < interval '24 hours'  THEN 0.7
           WHEN NOW() - first_seen_at < interval '72 hours'  THEN 0.5
           WHEN NOW() - first_seen_at < interval '7 days'    THEN 0.3
           ELSE 0.1
         END

   3c. Return top slot_count rows ordered by final_match_score DESC

4. Within-run cross-platform dedup:
   If same canonical_id ranked highest for multiple (platform, format) matches THIS run,
   keep it for the slot with highest final_match_score. The lower-scored platforms fall
   to second-best candidate (function returns p_max_per_slot rows so fallback candidates exist).

   This is the within-run version of the time-windowed cross-platform dedup applied
   in 3a; it prevents one run from scheduling the same canonical for FB AND LinkedIn
   simultaneously. Cross-run scheduling (FB today, LinkedIn tomorrow) is governed
   by the time-window in 3a.

   Exception: campaigns/series bypass this entirely — they route through reserved
   slots in the scheduler (R8 series subsystem), NOT the matching pool.

5. Return assembled result set.
```

**Why fitness at 40% / quality at 30% / recency at 30% (default):**

Fitness leads because routing wrong content to wrong format is the primary problem R5 exists to solve. Quality is the second gate — a middling-fitness high-quality piece is usually better than a perfect-fitness low-quality piece. Recency at 30% (revised up from original draft 20%) reflects ICE's mixed portfolio: Property Pulse is heavily news-driven; Care For Welfare is evergreen; NDIS Yarns sits in between. 30% is the middle ground and defensible for all three. Clients that deviate substantially from this profile tune via `c.client_match_weights` once performance data supports a decision — e.g. Property Pulse may eventually set 35/25/40 if recency data confirms that matters most for their audience.

**Recency-override rule:** very fresh canonicals (recency_score > 80 — content <4h old) get a relaxed fitness threshold (40 instead of 50). Breaking news often doesn't fit any specific format perfectly, but publishing a timely take is more valuable than skipping the story entirely.

Weights remain configurable without function rewrites: `c.client_match_weights` for per-client, `t.router_policy_default` for global fallback.

### Why `STABLE` not `VOLATILE`

R5 is read-only. Returns same output for same inputs within a transaction. Enables caching and query planner optimisations. No writes — R6 is the write side.

---

## What R6 consumes

R6's new `m.seed_and_enqueue_ai_jobs_v2()` flow becomes:

```
FOR each active client c:
  1. Call m.match_demand_to_canonicals(c.client_id, CURRENT_DATE, 50.0, 1)
  2. For each returned row:
     a. Create m.post_seed row with seed_payload including:
        {
          "platform": <platform>,
          "ice_format_key": <ice_format_key>,
          "content_class": <content_class>,
          "match_metadata": {
            "fitness_score": <fitness_score>,
            "quality_score": <quality_score>,
            "recency_score": <recency_score>,
            "final_match_score": <final_match_score>,
            "match_reason": <match_reason>,
            "weights_version": <weights_version>,
            "fitness_version": <fitness_version>
          },
          "digest_item": <digest_item full row>
        }
     b. Create m.post_draft stub
     c. Create m.ai_job (rewrite_v1 or similar job_type)
```

R6 doesn't touch classification, fitness weightings, or matching logic. R5 is a clean black-box interface.

---

## Integration points with already-shipped infrastructure

| Infrastructure | How R5 uses it |
|---|---|
| `t.5.0_social_platform` (24 Apr catalog unification) | Platform code validation via FK through demand grid |
| `t.5.3_content_format` (same) | ice_format_key validation via FK on fitness table |
| `t.platform_format_mix_default` (R1 from 22 Apr) | Read indirectly via `m.build_weekly_demand_grid` |
| `c.client_format_mix_override` (R2 from 22 Apr) | Same |
| `m.build_weekly_demand_grid` (R3 from 22 Apr) | **Direct dependency** |
| `f.canonical_content_body.content_class` (R4 from 24-25 Apr) | **Direct dependency** |
| `m.digest_item`, `m.digest_run`, `f.canonical_content_item` | Source of candidate canonicals |
| `m.post_publish` | Cross-platform dedup lookback queries |
| `c.client_digest_policy` (explicit rows now per 24 Apr) | Ensures every client has policy before matching (guard) |
| `c.client_match_weights` (v2 new) | Per-client scoring weights with global fallback |
| `c.client_dedup_policy` (v2 new) | Per-client time-windowed dedup configuration |
| `m.post_format_performance` (v2 new) | Populated by insights-worker, consumed by future R7 |

Implementation is ~3 hours of function authoring on top of 6 new tables + 1 view.

---

## Migration plan — three atomic steps

### Step 1 — Schema

Create the 6 tables + 1 view in one atomic migration. Add 3 rows to `t.router_policy_default` for global-default weights (0.40 / 0.30 / 0.30). If `t.router_policy_default` doesn't exist yet, hardcode in R5 function body as MVP.

### Step 2 — Seed v1 fitness matrix + dedup policy

One atomic transaction:
- 60 rows into `t.class_format_fitness`
- 4 rows into `c.client_dedup_policy` (defaults 24h cross / 7d same)
- Zero rows into `c.client_match_weights` (global fallback 40/30/30 until data supports tuning)
- Zero rows into `m.post_format_performance` (populated by insights-worker)
- Zero rows into `c.client_class_fitness_override` (populated as performance data surfaces specific bad fits)

### Step 3 — Function + verification

Ship `m.match_demand_to_canonicals()`. Verify with dry-run per client:

```sql
SELECT * FROM m.match_demand_to_canonicals(
  'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,
  CURRENT_DATE, 50.0, 3
);
```

Expected: 10-20 rows showing platform, format, canonical, fitness, quality, recency, final_match_score, reason. Spot-check that breaking news canonicals match image_quote slots AND that recency-override rule fires for content <4h old.

---

## Questions resolved (25 Apr feedback)

External review resolved 5 of 7 open questions. Two remain open pending real data.

### 1. Fitness weightings — RESOLVED ✅
**Decision:** 40/30/30 global default (fitness/quality/recency), per-client overrides via `c.client_match_weights`.
**Rationale:** Mixed-portfolio ICE (news-driven PP, evergreen CFW, mixed NY) needs middle-ground default + per-client flex. Not 50/30/20 (underweights recency for PP). Not pure recency-weighted (quality still gates credibility).

### 2. Minimum fitness threshold — RESOLVED ✅
**Decision:** Default 50 with recency-override to 40 when recency_score > 80.
**Rationale:** Breaking topics deserve to ship even with imperfect format fit. Exception only fires for very fresh content (<4h), keeping it conservative.

### 3. Fitness matrix scope — RESOLVED ✅
**Decision:** 6 classes × 10 buildable formats = 60 rows. Matrix tracks production capability, not taxonomy.
**Rationale:** Adding matrix rows for formats ICE can't produce creates fictional scores. New format worker ships → matrix rows added same migration.

### 4. Cross-platform dedup — RESOLVED ✅
**Decision:** Time-windowed policy via `c.client_dedup_policy.min_cross_platform_gap_hours` (default 24h cross-platform, 7d same-platform).
**Rationale:** Binary aggressive/permissive is wrong framing. Realistic policy: same platform blocked, different platform allowed with delay.

### 5. Client override semantics — RESOLVED ✅
**Decision:** Replacement, not multiplier.
**Rationale:** `COALESCE(override_score, default_score)`. Deterministic, debuggable, explainable. Multipliers create hidden interactions.

### 6. Campaigns / series — DEFERRED TO R8 ✅
**Decision:** Campaigns route through reserved slots, NOT the R5 matching pool.
**Rationale:** Strategic content can't compete with reactive news in the same pool. R8 series subsystem spec will handle `c.content_series.is_priority = true` + scheduler reservation. Out of R5 scope.

### 7. Fitness tuning cadence — RESOLVED ✅
**Decision:** Manual tuning v1. `m.post_format_performance` table built now for future R7 learning loop.
**Rationale:** Without the instrumentation substrate in place, R7 has nothing to learn from. Cheap to add now, expensive to retrofit.

### Still open (both data-dependent, non-blocking)

**Q1a — when to revisit the 40/30/30 default?**
Proposed: after 4 weeks of data in `m.post_format_performance` per client, compare engagement by weight combination. If single-weight tuning improves engagement >10%, update default.

**Q7a — when to move from manual to data-driven tuning?**
Proposed: when `m.post_format_performance` has 200+ rows per client with engagement data. Full R7 trigger at ~2 months post-insights-worker shipping.

---

## What's out of scope for v1

- Confidence intervals on fitness scores
- AI-generated fitness suggestions
- Cross-client learning (PP's fitness tuning informs NY's defaults)
- Format families ("any video format" matches "video_*")
- Multi-class canonicals (R4 forces single-class)
- Performance-based automatic retuning
- Campaigns/series (deferred to R8 series subsystem)

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fitness seed weights produce starved slots | High for first week | Some slots empty | Step 3 verification shows gaps immediately; tune in place |
| R5 returns duplicate canonical_ids across platforms | Medium | Same canonical published lockstep | Step 4 within-run dedup + Step 3a time-windowed dedup |
| Performance on wide joins | Low-Medium | Slow cron tick | Indexes + STABLE + idx_pp_dedup on (client_id, canonical_id, platform, created_at) |
| Fitness weights penalise novel formats before data | Medium | Overcommits to proven formats | Reserve 10% "discovery budget" as v1.1 enhancement |
| Client override table grows large | Low | Read amplification | Partial index + per-client filter keeps it fast |
| `m.post_format_performance` populated slowly | High near-term | R7 has no data until Phase 2.1 ships | Accept — substrate is cheap to have empty; retrofit cost is expensive |

---

## When to start R5 implementation

**Blockers cleared:**
- R4 schema + seed landed ✅ (24 Apr evening)
- R4 classifier function + sweep + cron ✅ (25 Apr morning, jobid 68)
- R4 backfill complete — validate before R5 build
- v2 spec integration (this revision) ✅

**Required before R5 build:**
- PK confirms Q1a and Q7a are non-blocking (data-dependent, don't block structural R5 build)
- R4 backfill confirms reasonable class distribution
- `t.router_policy_default` exists OR hardcoded MVP weights accepted

**Recommended sequence:**
1. R4 backfill completes, distribution reviewed
2. R5 Step 1 (schema, 6 tables + 1 view): ~45 min
3. R5 Step 2 (seed 60 fitness rows + 4 dedup policies): ~30 min
4. R5 Step 3 (function + verification): ~90 min
5. R6 rewrite consuming R5 output: separate ~3-4h session

**Implementation estimate:** ~3 hours for R5 end-to-end. Spec now stable; feedback integration is complete.

---

## Related

- **Spec:** `docs/briefs/2026-04-24-r4-d143-classifier-spec.md` — what R5 depends on
- **Infrastructure:** `docs/briefs/2026-04-22-router-mvp-shadow-infrastructure.md` — D167 versioning pattern
- **Catalog unification:** `docs/briefs/2026-04-24-router-catalog-unification-shipped.md`
- **Hardcoded audit:** `docs/briefs/2026-04-24-router-hardcoded-values-audit.md` — Finding 4 is R5's soft dependency
- **Decisions:** D143, D144, D166, D167
- **Future spec (R7):** learning loop from `m.post_format_performance` — not yet written
- **Future spec (R8):** series/campaign subsystem that bypasses matching pool — not yet written

---

## Changelog

**v2 — 25 Apr 2026** — feedback integration from external model review
- Added `c.client_match_weights` table (per-client weight overrides)
- Added `m.post_format_performance` table (R7 learning substrate)
- Added `c.client_dedup_policy` table (time-windowed cross-platform dedup)
- Revised default weights: 40/30/30 (was 50/30/20)
- Added recency-override rule: fitness threshold relaxes 50 → 40 when recency_score > 80
- Added "production capability map" framing for matrix scope
- Clarified campaigns route to R8 reserved slots, not matching pool
- Resolved 5 of 7 open questions; 2 remain data-dependent (tuning cadence)
- Algorithm extended: loads weights + dedup policy at start; dedup via NOT EXISTS on m.post_publish
- Output schema: now returns quality_score + recency_score + final_match_score as separate columns
- R6 seed_payload includes weights_version + fitness_version for insights-worker correlation

**v1 — 24 Apr 2026 evening** — initial spec (Track B)
- Original 6 tables (later revised to 3 tables v1 + 3 tables v2 = 6 total), 60-row matrix, 7 open questions
