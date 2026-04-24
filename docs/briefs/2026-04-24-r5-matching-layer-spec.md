# R5 — Matching Layer Spec

**Draft date:** 24 Apr 2026 evening (Track B)
**Status:** 🔲 SPEC COMPLETE — awaiting PK review
**Pipeline position:** R4 (classifier) output → **R5 (this)** → R6 (seed_and_enqueue rewrite)
**Decision refs:** D144 (router master), D167 (router MVP shadow), D143 (classifier)
**Depends on:** R4 content_class column populated on f.canonical_content_body

---

## Purpose in one paragraph

R4 assigns each canonical a `content_class` (timely_breaking, stat_heavy, multi_point, human_story, educational_evergreen, analytical). R3's demand grid (`m.build_weekly_demand_grid`) says "this client wants 12 posts this week — 4 Facebook text + 2 Facebook carousel + 3 Instagram image_quote + 3 LinkedIn video_short_kinetic". R5 is the matching function that answers: **for each demand slot, which specific canonical best fits it?** It reads class-to-format fitness from a table, client-specific overrides from another table, and emits `(platform, ice_format_key, canonical_id, digest_item_id, match_score, match_reason)` tuples ready for R6 to convert into seeds + drafts + AI jobs. Pure read-only function. Deterministic. Explainable via `match_reason`.

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

  -- FK to catalogs (established by 24 Apr evening catalog unification)
  CONSTRAINT fk_cff_class_code
    FOREIGN KEY (class_code) REFERENCES t.content_class(class_code)
    DEFERRABLE INITIALLY DEFERRED,  -- class_code in t.content_class is NOT unique across versions; see note below
  CONSTRAINT fk_cff_ice_format_key
    FOREIGN KEY (ice_format_key) REFERENCES t."5.3_content_format"(ice_format_key)
);

CREATE UNIQUE INDEX class_format_fitness_one_current_per_pair
  ON t.class_format_fitness (class_code, ice_format_key) WHERE is_current = TRUE;

CREATE INDEX idx_class_format_fitness_lookup
  ON t.class_format_fitness (class_code, ice_format_key, fitness_score DESC)
  WHERE is_current = TRUE;
```

**FK to t.content_class.class_code caveat.** `class_code` in `t.content_class` is NOT globally unique — rows share code across versions. To FK to it cleanly, we'd need a separate `t.content_class_code(class_code)` table holding the stable identifier, then version it separately. For v1 MVP we punt on the FK and rely on the partial unique index (`content_class_one_current_per_code WHERE is_current = TRUE`) + application-level validation. Revisit if drift appears.

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

**Use case example.** Property Pulse has found from 3 months of performance data that stat_heavy × video_short_stat underperforms their audience (property buyers prefer human narrative over numbers). Insert override row with override_score=40 (default is 97). R5 will now prefer other fits for PP's video_short_stat slots without affecting any other client.

### Table 3 — fitness lookup view

Convenience view collapsing default + override into a single effective score:

```sql
CREATE OR REPLACE VIEW t.vw_effective_class_format_fitness AS
SELECT
  client_id,
  class_code,
  ice_format_key,
  COALESCE(override_score, default_score) AS effective_score,
  CASE
    WHEN override_score IS NOT NULL THEN 'client_override'
    ELSE 'default'
  END AS score_source,
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

R5 matching function reads this view. One source of truth. Debuggable: operator can `SELECT * FROM t.vw_effective_class_format_fitness WHERE client_id = '...'` to see exactly what scores R5 will use.

---

## v1 fitness seed matrix

6 classes × 10 buildable formats = 60 rows. Scores represent default fitness — informed by the D167 mix rationale + spec's format descriptions from `t.5.3_content_format`.

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
  final_match_score   NUMERIC,
  match_reason        TEXT
)
LANGUAGE plpgsql
STABLE
```

**Inputs:**
- `p_client_id` — client for which to match
- `p_week_start` — passed through to `m.build_weekly_demand_grid`
- `p_min_fitness_score` — skip class×format pairs below this threshold (default 50)
- `p_max_per_slot` — how many candidates to return per (platform, format) demand row (default 1; increase for R6 to have fallbacks)

**Output:**
- One row per matched slot. Includes the resolved canonical_id + digest_item_id (R6 needs both to build the seed_payload).
- `fitness_score` = score that won this match
- `final_match_score` = composite of fitness × recency × canonical final_score
- `match_reason` = human-readable string like "fitness=95 (default) + recency=0.8 + canonical_score=0.92 → 0.703"

**Algorithm:**

```
1. Load demand grid:
   SELECT platform, ice_format_key, weekly_slot_count
   FROM m.build_weekly_demand_grid(p_client_id, p_week_start)
   WHERE weekly_slot_count > 0

2. For each demand row (platform, format, slot_count):

   2a. Find candidate canonicals:
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
         AND ccb.content_class IS NOT NULL     -- R4 has classified it
         AND ccb.fetch_status = 'success'
         AND efcf.effective_score >= p_min_fitness_score
         -- Not already seeded for this (client, platform) combination:
         AND NOT EXISTS (
           SELECT 1 FROM m.post_seed ps
           WHERE ps.client_id = p_client_id
             AND ps.platform = demand_row.platform
             AND ps.digest_item_id = di.digest_item_id
         )
         -- Not already in m.post_draft for this (client, platform):
         AND NOT EXISTS (
           SELECT 1 FROM m.post_draft pd
           WHERE pd.client_id = p_client_id
             AND pd.platform = demand_row.platform
             AND pd.digest_item_id = di.digest_item_id
         )

   2b. Rank candidates:
       final_match_score =
         fitness_score * 0.5                           -- 0-100 scaled to 0-50
       + COALESCE(di.final_score, 0.5) * 30            -- 0-30 (quality weight)
       + recency_bonus(cci.first_seen_at) * 20         -- 0-20 (freshness weight)

       where recency_bonus(first_seen_at) =
         CASE
           WHEN NOW() - first_seen_at < interval '24 hours'  THEN 1.0
           WHEN NOW() - first_seen_at < interval '72 hours'  THEN 0.7
           WHEN NOW() - first_seen_at < interval '7 days'    THEN 0.4
           ELSE 0.1
         END

   2c. Return top slot_count (or p_max_per_slot × slot_count) rows
       ordered by final_match_score DESC

3. Cross-platform deduplication:
   If same canonical_id appears in multiple (platform, format) matches this run,
   keep it for the slot with highest final_match_score. Null out the others.
   Reason: one canonical → one post per run per client, across platforms.
   (Exception: future campaign work may want cross-posting; flagged as follow-up.)

4. Return assembled result set.
```

**Why fitness at 50% weight, quality at 30%, recency at 20%:**

Fitness dominates because routing wrong content to wrong format is the primary problem R5 exists to solve. Quality matters but a middling stat_heavy → animated_data is still better than a perfect human_story → animated_data (wrong class → wrong format). Recency is the tiebreaker for when you have multiple equally-good candidates.

Weights are configurable in the function body BUT also available as rows in `t.router_policy_default` (setting_keys: `r5_fitness_weight`, `r5_quality_weight`, `r5_recency_weight`) so operators can tune without function rewrites. Function reads the settings table on invocation.

### Why `STABLE` not `VOLATILE`

R5 is read-only. Returns same output for same inputs within a transaction. Enables caching and query planner optimisations. No writes — R6 is the write side.

### Why not a materialised view

A materialised view would need refresh coordination with the cron cadence. R5 is called on-demand by R6's seeder cron. Function avoids the refresh plumbing.

---

## What R6 consumes

R6's new `m.seed_and_enqueue_ai_jobs_v2()` flow becomes:

```
FOR each active client c:
  1. Call m.match_demand_to_canonicals(c.client_id, CURRENT_DATE, 50.0, 1)
  2. For each returned row (platform, ice_format_key, canonical_id, digest_item_id, ...):
     a. Create m.post_seed row with seed_payload including:
        {
          "platform": <platform>,
          "ice_format_key": <ice_format_key>,
          "content_class": <content_class>,
          "match_metadata": {
            "fitness_score": <fitness_score>,
            "final_match_score": <final_match_score>,
            "match_reason": <match_reason>
          },
          "digest_item": <digest_item full row>
        }
     b. Create m.post_draft stub
     c. Create m.ai_job (rewrite_v1 or similar job_type)
```

R6 doesn't touch classification, fitness weightings, or matching logic. R5 is a clean black-box interface. Changing matching behaviour = changing R5, never R6.

---

## Integration points with already-shipped infrastructure

| Infrastructure | How R5 uses it |
|---|---|
| `t.5.0_social_platform` (from 24 Apr catalog unification) | Platform code validation via FK through demand grid |
| `t.5.3_content_format` (same) | ice_format_key validation via FK on fitness table |
| `t.platform_format_mix_default` (R1 from 22 Apr) | Read indirectly via `m.build_weekly_demand_grid` |
| `c.client_format_mix_override` (R2 from 22 Apr) | Same |
| `m.build_weekly_demand_grid` (R3 from 22 Apr) | **Direct dependency** — R5 calls this function |
| `f.canonical_content_body.content_class` (R4 from 24 Apr evening) | **Direct dependency** — R5 filters on this |
| `m.digest_item`, `m.digest_run`, `f.canonical_content_item` | Source of candidate canonicals |
| `c.client_digest_policy` (explicit rows now per 24 Apr evening) | Ensures every client has policy before matching (guard) |

R5 is genuinely the glue between existing infrastructure. Implementation is ~2-3 hours of function authoring on top of 4 new tables + 1 view.

---

## Migration plan — three atomic steps

### Step 1 — Schema

Create `t.class_format_fitness`, `c.client_class_fitness_override`, `t.vw_effective_class_format_fitness`. Add FKs where possible. Add 3 rows to `t.router_policy_default` (fitness/quality/recency weights) — this requires `t.router_policy_default` to exist, which is a Finding 4 deliverable from the hardcoded audit. If that's not built yet, hardcode the weights in the R5 function body for MVP and flag the dependency.

### Step 2 — Seed v1 fitness matrix

INSERT the 60 (class × format) rows with default scores + rationales. One atomic transaction.

### Step 3 — Function + verification

Ship `m.match_demand_to_canonicals()`. Verify with a dry-run query per client:

```sql
SELECT * FROM m.match_demand_to_canonicals(
  'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,  -- NDIS Yarns
  CURRENT_DATE, 50.0, 3
);
```

Expected: 10-20 rows showing platform, format, canonical, fitness, reason. Spot-check that matches make sense (e.g. breaking news canonicals matching image_quote slots, not carousel slots).

---

## Open questions for PK review

1. **Fitness weightings — 50/30/20 (fitness/quality/recency)?** If Property Pulse audience favors recency strongly, weighting should skew recency up. Alternatively per-client weighting via `c.client_match_weights` table (adds complexity). MVP: global weights. Upgrade later if warranted.

2. **Minimum fitness threshold — 50?** At 50, poor-fit formats get excluded. At 30, more content finds a home but quality drops. Default 50 is conservative. Per-client threshold override possible via `c.client_publish_profile.min_fitness_score`.

3. **Fitness matrix — 60 rows right?** v1 seed has 6 classes × 10 buildable formats. Missing: 12 other formats in `t.5.3_content_format` (article, audio, newsletter, poll, story, thread, etc.) that aren't ICE-buildable yet. When/if those become buildable, add rows at that time.

4. **Cross-platform dedup — aggressive or permissive?** Step 3 of the algorithm dedups across platforms (one canonical → one post per run). Property Pulse wanted same content across FB+LI on different days — permissive mode (allow repeats with delay) might be a client-level setting. MVP: aggressive dedup; revisit.

5. **Client override semantics — supplement or replace defaults?** Current design: client override replaces default (if override_score exists, use it; else use default). Alternative: multiplier (client override = 1.2× default). Multiplier is harder to reason about. Replacement is simpler.

6. **What about campaigns / series?** Content series (`c.content_series` from earlier work) may want guaranteed slot reservation, not competitive matching against signals. Flagged as R5.5 or campaign-specific routing. Not in R5 MVP.

7. **Rate of fitness tuning — manual or data-driven?** v1 is manual — operator updates when performance data suggests a weight change. Data-driven (automatic adjustment from `m.post_format_performance`) is a natural R7+ upgrade. Not MVP.

---

## What's out of scope for v1

- Confidence intervals on fitness scores (e.g. "95±2" vs "95")
- AI-generated fitness suggestions
- Cross-client learning (PP's fitness tuning informs NY's defaults)
- Format families (e.g. "any video format" matches "video_*")
- Multi-class canonicals (R4 already forces single-class)
- Performance-based automatic retuning

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fitness seed weights produce starved slots (some (platform, format) combinations have zero matches per run) | High for first week | Some slots empty | Step 3 verification query shows gaps immediately; tune fitness scores in place |
| R5 returns duplicate canonical_ids across platforms when dedup logic is buggy | Medium | Same canonical published to multiple platforms in lockstep | Step 3 cross-platform dedup handled explicitly + verification query checks for it |
| Performance on wide joins (m.digest_item × t.vw_effective_class_format_fitness) | Low | Slow response during cron tick | Indexes on filter columns + function STABLE + typical digest scale (~200 items per client per run) keeps work small |
| Fitness weights inform the wrong thing (e.g. penalise novel formats before they get performance data) | Medium | System overcommits to proven formats, misses discovery opportunities | Reserve a "discovery budget" — 10% of slots get matched against random-within-threshold rather than highest-score. Flagged as v1.1 enhancement. |
| Client override table grows to thousands of rows per client | Low (over 12 months) | Read amplification on the view | Partial index + per-client filter keeps it fast even at 10k rows per client |

---

## When to start R5 implementation

**Blockers cleared:**
- R4 schema + seed landed ✅ (24 Apr evening, this session)
- R4 classifier function + sweep + cron → next migration (Step 3 of R4 spec)
- R4 backfill complete — 24h wait after R4 cron starts

**Required before R5 build:**
- PK reviews this spec + answers 7 open questions
- R4 backfill confirms reasonable class distribution (no class > 60% or < 2%)
- `t.router_policy_default` exists OR this spec accepts hardcoded weights for MVP

**Recommended sequence:**
1. PK reviews this spec + R4 spec together over weekend
2. Monday: ship R4 Step 3 (function + sweep + cron) — starts backfill
3. Monday evening: R4 backfill complete, distribution clean
4. Tuesday: R5 Steps 1-2 (schema + seed)
5. Tuesday afternoon: R5 Step 3 (function + verification)
6. Wednesday: R6 rewrite consuming R5 output

**Implementation estimate:** 2-3 hours for R5 after R4 is producing clean classifications. Most of the work is the function + verification; schema is mechanical.

---

## Related

- **Spec:** `docs/briefs/2026-04-24-r4-d143-classifier-spec.md` — what R5 depends on
- **Infrastructure:** `docs/briefs/2026-04-22-router-mvp-shadow-infrastructure.md` — D167 versioning pattern this spec reuses
- **Catalog unification:** `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` — platform + format vocabulary R5 references
- **Hardcoded audit:** `docs/briefs/2026-04-24-router-hardcoded-values-audit.md` — Finding 4 (`t.router_policy_default`) is R5's soft dependency
- **Decisions:** D143, D144, D166, D167

---

## Summary — how R5 fits in the router pipeline

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ R3: Demand Grid  │     │ R4: Classifier   │     │ R5: Matching     │
│ (shipped 22 Apr) │     │ (shipped 24 Apr) │     │ (this spec)      │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ per client per   │     │ per canonical:   │     │ per demand slot: │
│ week:            │ ──▶ │                  │ ──▶ │                  │
│ (platform,       │     │ content_class    │     │ best canonical   │
│  format,         │     │ (6 classes)      │     │ for that slot    │
│  slot_count)     │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │ R6: Seed+Enqueue │
                                                   │ (pending build)  │
                                                   ├──────────────────┤
                                                   │ create seed+     │
                                                   │ draft+ai_job     │
                                                   │ per R5 match     │
                                                   └──────────────────┘
```

R5 is the glue. Everything before R5 is infrastructure. Everything after R5 is execution. R5 itself is pure routing intelligence.
