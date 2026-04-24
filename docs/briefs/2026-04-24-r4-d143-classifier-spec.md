# R4 — D143 Classifier Spec (v2 — table-driven)

**Draft date:** 24 Apr 2026 late-evening — rewrite of v1 from earlier same session
**Status:** 🔲 SPEC COMPLETE — awaiting PK weekend review before R5 starts
**Decision reference:** D143 (rule-based SQL content classifier) + D167 (router MVP shadow infrastructure)
**Supersedes:** v1 of this spec (hardcoded classes + rules) — PK feedback drove the rewrite
**Pipeline gate:** Prerequisite for R5 (matching layer design) + R6 (seed_and_enqueue rewrite)

---

## What changed from v1 and why

v1 of this spec had the six classes, their priority order, and their classification rules hardcoded inside a single SQL function body. PK flagged this: adding a seventh class later would be a migration + function rewrite; changing priority order would be a function rewrite; operators had no visible surface showing "these are the current classes and this is their ranking." All three are the wrong default for ICE's trajectory (aged care + mental health verticals will want vocabulary changes).

v2 makes classes + rules data, not code. Two new tables hold them. A rule-interpreter function reads from the tables on every invocation. Changing classes or priority becomes UPDATE + INSERT, no function change, no downtime. Same D167 versioning pattern (`version` + `is_current` + `superseded_by` + `effective_from`) gives full historical audit: at any point we can query "what did `stat_heavy` mean in v1 vs v2."

Cost of the rewrite: ~1.5-2 hours more implementation time up front. Payback: every class change for the rest of ICE's lifetime is UPDATE, not code migration. Given PK's roadmap implies 6+ class changes over the next 18 months across verticals, payback hits within 2-3 changes.

---

## Purpose in one paragraph

The router (D144/D167 infrastructure already shipped) needs to know what *kind* of signal each canonical is before it can match that signal to a (client × platform × format) slot. A breaking-news signal doesn't fit an evergreen carousel slot. A stat-heavy data release doesn't fit a human-story video slot. R4 is the classification layer: read each canonical's title + body + source metadata, evaluate a set of rules stored in `t.content_class_rule` under a priority order stored in `t.content_class`, tag the canonical with exactly one class. Tag is cached on `f.canonical_content_body` so it's computed once per canonical and consumed everywhere downstream. No AI call. No per-client variation (that's R5's job). Deterministic SQL classification that PK can read, see in the dashboard, and change via UPDATE.

---

## Design principle — configuration, not code

The function `m.classify_canonical()` is a rule interpreter. It doesn't know what the classes are. It reads them from the DB every invocation. It doesn't know what priority order they're in. It reads that too. It doesn't know what rules define each class. Same.

This means:
- **Adding a class** = `INSERT INTO t.content_class (...) VALUES (...)` + `INSERT INTO t.content_class_rule (...) VALUES (...)`. Minutes. No deploy.
- **Changing priority** = `UPDATE t.content_class SET priority_rank = N WHERE class_code = '...'`. Seconds. No deploy.
- **Tuning a regex** = `UPDATE t.content_class_rule SET rule_config = jsonb_set(rule_config, '{pattern}', '"new pattern"') WHERE rule_id = ...`. Seconds. Test first on a copy.
- **Disabling a class temporarily** = `UPDATE t.content_class SET is_active = FALSE WHERE class_code = '...'`. Classifier skips it next invocation.
- **A/B testing** = create v2 rows, leave them `is_current = FALSE`, run a one-off query calling classifier against v2 rules on a sample, compare. No commitment.

The function itself rarely changes. Rules change frequently. Versioning gives us history.

---

## Schema

### Table 1 — `t.content_class`

One row per (class_code, version). Holds the class-level metadata.

```sql
CREATE TABLE t.content_class (
  content_class_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code         TEXT NOT NULL,          -- e.g. 'timely_breaking'
  class_name         TEXT NOT NULL,          -- e.g. 'Breaking news, time-sensitive'
  description        TEXT,                   -- operator-readable paragraph
  priority_rank      INT NOT NULL,           -- 1 = highest priority (evaluated first)
  version            TEXT NOT NULL,          -- 'v1', 'v2', etc.
  effective_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by      UUID REFERENCES t.content_class(content_class_id),
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,   -- disable without versioning
  evidence_source    TEXT,                   -- free-text rationale or doc pointer
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT content_class_version_uniq
    UNIQUE (class_code, version)
);

-- Only one current row per class_code at any time
CREATE UNIQUE INDEX content_class_one_current_per_code
  ON t.content_class (class_code) WHERE is_current = TRUE;

-- Only one current class at each priority rank
CREATE UNIQUE INDEX content_class_one_current_per_rank
  ON t.content_class (priority_rank) WHERE is_current = TRUE AND is_active = TRUE;
```

**Why partial unique indexes.** Enforces at the DB layer that the classifier always sees a well-formed set: one row per class_code, no rank collisions. Attempt to create a v2 row while leaving v1 `is_current = TRUE` → constraint violation → migration fails loud, not silent.

### Table 2 — `t.content_class_rule`

N rows per content_class_id. One rule per row. Rules in the same `rule_group` are ANDed; different `rule_group` values are ORed.

```sql
CREATE TABLE t.content_class_rule (
  rule_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_class_id   UUID NOT NULL REFERENCES t.content_class(content_class_id) ON DELETE CASCADE,
  rule_group         INT NOT NULL DEFAULT 1,  -- AND within group, OR across groups
  rule_type          TEXT NOT NULL,
  rule_config        JSONB NOT NULL,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  notes              TEXT,                   -- operator annotation
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT content_class_rule_type_allowed
    CHECK (rule_type IN (
      'title_regex',
      'body_regex',
      'numeric_density',
      'word_count_range',
      'source_type_match',
      'source_name_match',
      'pronoun_density',
      'recency_window',
      'list_marker_count'
    ))
);

CREATE INDEX idx_content_class_rule_class
  ON t.content_class_rule (content_class_id, rule_group, is_active);
```

**Rule vocabulary — nine rule types.** Each has a documented JSONB shape (section below). CHECK constraint on `rule_type` keeps the vocabulary closed — adding a tenth type requires explicit migration + function update (which is correct — new rule types need new interpreter logic).

---

## Rule type vocabulary + config shapes

Each rule_type has a fixed JSONB config shape. The interpreter (`m.evaluate_rule`) reads `rule_config` per type.

### 1. `title_regex` — regex match against `canonical_title`

```json
{
  "pattern": "(^|\\s)(breaking|just announced|announced today)(\\s|$)",
  "flags": "i"
}
```

- `pattern` (required) — PostgreSQL regex pattern
- `flags` (optional, default `'i'`) — regex flags. `'i'` for case-insensitive.

### 2. `body_regex` — regex match against `extracted_text`

```json
{
  "pattern": "(announced today|this morning|just released)",
  "flags": "i",
  "window": "first_500_chars"
}
```

- `pattern` (required) — PostgreSQL regex pattern
- `flags` (optional, default `'i'`)
- `window` (optional, default `'full'`) — one of `'full'`, `'first_500_chars'`, `'first_1000_chars'`, `'last_500_chars'`

### 3. `numeric_density` — count of numeric tokens ÷ word_count

```json
{
  "min_density_pct": 3.0,
  "max_word_count": 600
}
```

- `min_density_pct` (required) — minimum `(count of regex matches for \d+(\.\d+)?%? in extracted_text) ÷ word_count × 100`
- `max_word_count` (optional) — if set, rule only matches when `word_count <= max_word_count`. Used to target short data-dense pieces without catching long analytical pieces that quote stats.

### 4. `word_count_range` — `word_count` between bounds

```json
{
  "min": 400,
  "max": 2000
}
```

- `min` (optional) — inclusive lower bound
- `max` (optional) — inclusive upper bound
- At least one of `min` / `max` required

### 5. `source_type_match` — `feed_source.source_type_code` in list

```json
{
  "codes": ["rss_news", "news_api", "policy_rss", "gov_rss"]
}
```

- `codes` (required) — array of `source_type_code` values; any match → rule matches

### 6. `source_name_match` — `feed_source.source_name` in list

```json
{
  "names": ["ABS", "AIHW", "RBA", "CoreLogic", "PropTrack", "REIA"],
  "match_type": "exact"
}
```

- `names` (required) — array of source names
- `match_type` (optional, default `'exact'`) — one of `'exact'`, `'substring'` (source_name contains any of names), `'regex'` (any name is a regex pattern)

### 7. `pronoun_density` — first-person pronoun frequency

```json
{
  "min_density_pct": 2.0,
  "window": "first_1000_chars",
  "pronoun_set": "first_person"
}
```

- `min_density_pct` (required) — minimum `(count of matches for \b(I|my|me|we|our|us)\b) ÷ (token count of window) × 100`
- `window` (optional, default `'first_1000_chars'`)
- `pronoun_set` (optional, default `'first_person'`) — `'first_person'` or `'third_person_narrative'` (`he|she|they|his|her|their`)

### 8. `recency_window` — `canonical_content_item.first_seen_at` within N hours

```json
{
  "max_age_hours": 48
}
```

- `max_age_hours` (required) — integer; rule matches if `first_seen_at > NOW() - (max_age_hours × interval '1 hour')`

### 9. `list_marker_count` — structural list markers in body

```json
{
  "min_count": 3,
  "pattern_type": "numbered_list"
}
```

- `min_count` (required) — minimum number of regex matches for marker pattern
- `pattern_type` (required) — one of `'numbered_list'` (`^\s*\d+[.)]\s+`), `'bulleted_list'` (`^\s*[•\-\*]\s+`), `'any_list'` (either)

---

## AND/OR semantics via `rule_group`

A class matches if **any rule_group fully matches**. A rule_group fully matches if **all rules in that group match**.

Concrete example — `timely_breaking` class with 4 rule groups:

| rule_group | rule_type | rule_config (summary) |
|---|---|---|
| 1 | recency_window | `{max_age_hours: 48}` |
| 1 | source_type_match | `{codes: [rss_news, news_api, policy_rss, gov_rss]}` |
| 2 | title_regex | breaking / announced / urgent markers |
| 3 | body_regex | first 500 chars: "announced today" patterns |
| 4 | title_regex | explicit date within 48h |

`timely_breaking` matches if:
- (rule_group 1: recency_window AND source_type_match), **OR**
- (rule_group 2: title_regex for urgency), **OR**
- (rule_group 3: body_regex for timing), **OR**
- (rule_group 4: title_regex for date)

Same logic as v1's prose rules, just structurally represented. The interpreter loops groups in order within a class; first matching group short-circuits class evaluation.

---

## v1 seed data — the six classes and their rules

These rows are what gets inserted when migration Step 2 runs. Same vocabulary + priority + rules as v1 of the spec, just as data.

### v1 class rows

```sql
INSERT INTO t.content_class (class_code, class_name, description, priority_rank, version, evidence_source) VALUES
  ('timely_breaking', 'Breaking news, time-sensitive',
   'Policy announcements, market moves, regulatory decisions, emergency updates. Time-sensitive signals where half-life is measured in hours. Routes to urgent single-image quote posts, short LinkedIn text, urgent carousel slots.',
   1, 'v1', 'docs/briefs/2026-04-24-r4-d143-classifier-spec.md'),

  ('stat_heavy', 'Data / statistics primary',
   'Survey results, benchmark reports, quarterly data releases, price indices. Content where numbers ARE the point. Routes to animated_data, video_short_stat, image-quote-with-number formats.',
   2, 'v1', 'docs/briefs/2026-04-24-r4-d143-classifier-spec.md'),

  ('multi_point', 'List-structured content',
   'Top 10, 5 ways to..., 3 things to know about..., numbered advice. Routes to carousel (strongest fit for LinkedIn 40%, Instagram 30% per D167 mix).',
   3, 'v1', 'docs/briefs/2026-04-24-r4-d143-classifier-spec.md'),

  ('human_story', 'Personal narrative, case study',
   'Participant stories, practitioner reflections, testimonials, profile pieces. Strongest engagement driver in regulated verticals. Routes to video_short_kinetic, video_short_avatar, long-form LinkedIn text.',
   4, 'v1', 'docs/briefs/2026-04-24-r4-d143-classifier-spec.md'),

  ('educational_evergreen', 'Explainer / how-to',
   'Guides, FAQs, beginner content, definition pieces. Long shelf life — stays relevant even if matching takes 2-3 days. Routes to carousel, long-form text, video_short_kinetic_voice.',
   5, 'v1', 'docs/briefs/2026-04-24-r4-d143-classifier-spec.md'),

  ('analytical', 'Deep analysis / thought leadership',
   'Opinion columns, policy analysis, extended commentary, "what this means" pieces. Fallback default — every unmatched canonical lands here. Routes to long-form LinkedIn native article, newsletter, deep-dive video voiceover.',
   6, 'v1', 'docs/briefs/2026-04-24-r4-d143-classifier-spec.md');
```

### v1 rule rows

The full v1 rule set, shown grouped by class. Each block is a single class's rules.

**`timely_breaking` rules** (4 rule_groups):

```sql
-- Rule group 1: recent + news-source (AND)
(class='timely_breaking', group=1, type='recency_window',    config='{"max_age_hours": 48}'),
(class='timely_breaking', group=1, type='source_type_match', config='{"codes": ["rss_news","news_api","policy_rss","gov_rss"]}'),

-- Rule group 2: urgency markers in title
(class='timely_breaking', group=2, type='title_regex',
  config='{"pattern": "(^|\\s)(breaking|just announced|announced today|just in|urgent|update:|this morning|this afternoon|today:|just released)(\\s|$)", "flags": "i"}'),

-- Rule group 3: timing markers in body first 500 chars
(class='timely_breaking', group=3, type='body_regex',
  config='{"pattern": "(announced today|this morning|this afternoon|just released|as of today|as of this)", "flags": "i", "window": "first_500_chars"}'),

-- Rule group 4: explicit date in title (catches "Apr 24 ruling", "yesterday's announcement", etc.)
(class='timely_breaking', group=4, type='title_regex',
  config='{"pattern": "(yesterday|today)\\s+(announcement|ruling|decision|release)", "flags": "i"}');
```

**`stat_heavy` rules** (3 rule_groups):

```sql
-- Rule group 1: short-and-dense (AND)
(class='stat_heavy', group=1, type='numeric_density',
  config='{"min_density_pct": 3.0, "max_word_count": 600}'),

-- Rule group 2: stats markers in title
(class='stat_heavy', group=2, type='title_regex',
  config='{"pattern": "(^|\\s)(\\d+%|\\d+[.,]\\d+%|survey|study|report shows|data reveals|new figures|new data|statistics show|research shows|benchmark|findings show|increase of|decrease of|up \\d|down \\d|rose|fell)(\\s|$)", "flags": "i"}'),

-- Rule group 3: known-data-source feed
(class='stat_heavy', group=3, type='source_name_match',
  config='{"names": ["ABS","AIHW","RBA","CoreLogic","PropTrack","REIA"], "match_type": "exact"}');
```

**`multi_point` rules** (3 rule_groups):

```sql
-- Rule group 1: numbered list in title
(class='multi_point', group=1, type='title_regex',
  config='{"pattern": "(^|\\s)(\\d+)\\s+(ways?|things?|reasons?|tips?|steps?|signs?|mistakes?|lessons?|rules?|questions?|facts?|myths?|benefits?|strategies|tactics)(\\s|$)", "flags": "i"}'),

-- Rule group 2: "Top N" title
(class='multi_point', group=2, type='title_regex',
  config='{"pattern": "^(top|the top)\\s+\\d+\\s", "flags": "i"}'),

-- Rule group 3: numbered list markers in body
(class='multi_point', group=3, type='list_marker_count',
  config='{"min_count": 3, "pattern_type": "numbered_list"}');
```

**`human_story` rules** (3 rule_groups):

```sql
-- Rule group 1: story/journey markers in title
(class='human_story', group=1, type='title_regex',
  config='{"pattern": "(^|\\s)(my|his|her|their|our)\\s+(story|journey|experience|path|road|battle|fight)(\\s|$)", "flags": "i"}'),

-- Rule group 2: first-person framing in title
(class='human_story', group=2, type='title_regex',
  config='{"pattern": "(^|\\s)(how i|how we|why i|why we|meet)(\\s|$)", "flags": "i"}'),

-- Rule group 3: first-person pronoun density in body
(class='human_story', group=3, type='pronoun_density',
  config='{"min_density_pct": 2.0, "window": "first_1000_chars", "pronoun_set": "first_person"}');
```

**`educational_evergreen` rules** (3 rule_groups):

```sql
-- Rule group 1: explainer markers in title start
(class='educational_evergreen', group=1, type='title_regex',
  config='{"pattern": "^(how to|what is|what are|why|when|where|the complete guide|a guide to|beginner|beginners?|introduction to|understanding|explained)", "flags": "i"}'),

-- Rule group 2: guide/primer markers anywhere in title
(class='educational_evergreen', group=2, type='title_regex',
  config='{"pattern": "(\\s)(explained|guide|guide to|learn|primer|101|fundamentals?|basics?)(\\s|$)", "flags": "i"}'),

-- Rule group 3: step-by-step markers in body
(class='educational_evergreen', group=3, type='body_regex',
  config='{"pattern": "(how to|step 1|step one|first,|firstly,)", "flags": "i", "window": "first_500_chars"}');
```

**`analytical` rules** (4 rule_groups — fallback + explicit markers):

```sql
-- Rule group 1: long-form signal
(class='analytical', group=1, type='word_count_range',
  config='{"min": 1500}'),

-- Rule group 2: "what this means" framing in title
(class='analytical', group=2, type='title_regex',
  config='{"pattern": "(what this means|why it matters|the implications|analysis:|opinion:|comment:|perspective:)", "flags": "i"}'),

-- Rule group 3: editorial-class sources
(class='analytical', group=3, type='source_type_match',
  config='{"codes": ["opinion_rss","editorial_rss","newsletter"]}'),

-- Rule group 4: FALLBACK — always matches (no filter rules).
-- Implementation: omit rules in this group entirely; classifier interprets
-- "lowest-priority class with no rule groups" as the fallback that always fires.
-- See fallback semantics section below.
```

**Fallback class semantics.** A class with `is_current = TRUE AND is_active = TRUE` but no active rule rows is the **fallback** — it matches any canonical that reached it. The interpreter enforces this: when evaluating a class, if `SELECT COUNT(*) FROM t.content_class_rule WHERE content_class_id = X AND is_active = TRUE = 0`, the class matches. v1 setup: `analytical` has rule_groups 1, 2, 3 explicitly AND is the lowest-priority class — rule_group 4 above is **documented but NOT inserted** because if nothing higher matched and no analytical rule matched either, we still want to assign `analytical`. Simpler: always insert the explicit rules AND rely on "lowest priority class wins by default" — described in interpreter logic below.

---

## The classifier function — shape + interpreter logic

```
FUNCTION m.classify_canonical(p_canonical_id UUID)
  RETURNS TABLE(canonical_id UUID, content_class TEXT, classified_at TIMESTAMPTZ, classifier_version TEXT)
  LANGUAGE plpgsql
  SECURITY DEFINER

  1. Load canonical inputs once into locals:
     - v_title       := canonical_content_item.canonical_title
     - v_body        := canonical_content_body.extracted_text
     - v_word_count  := canonical_content_body.word_count
     - v_first_seen  := canonical_content_item.first_seen_at
     - v_source_type := feed_source.source_type_code  (via join path)
     - v_source_name := feed_source.source_name
     - v_resolution  := canonical_content_body.resolution_status

  2. Get current classifier version (single query):
     SELECT MIN(version) INTO v_version
     FROM t.content_class WHERE is_current = TRUE;
     -- Expected: all is_current rows share the same version.

  3. For each class in priority order (is_current + is_active):
       FOR v_class IN
         SELECT content_class_id, class_code
         FROM t.content_class
         WHERE is_current = TRUE AND is_active = TRUE
         ORDER BY priority_rank ASC
       LOOP
         -- 3a. Does this class have active rules?
         IF (SELECT COUNT(*) FROM t.content_class_rule
             WHERE content_class_id = v_class.content_class_id AND is_active) = 0 THEN
           -- Fallback class: matches unconditionally
           RETURN v_class.class_code, NOW(), v_version;
         END IF;

         -- 3b. Does any rule_group match fully?
         FOR v_group IN
           SELECT DISTINCT rule_group FROM t.content_class_rule
           WHERE content_class_id = v_class.content_class_id AND is_active
           ORDER BY rule_group
         LOOP
           v_all_match := TRUE;
           FOR v_rule IN
             SELECT rule_type, rule_config FROM t.content_class_rule
             WHERE content_class_id = v_class.content_class_id
               AND rule_group = v_group
               AND is_active
           LOOP
             IF NOT m.evaluate_rule(v_rule, v_title, v_body, v_word_count,
                                    v_first_seen, v_source_type, v_source_name) THEN
               v_all_match := FALSE;
               EXIT;
             END IF;
           END LOOP;
           IF v_all_match THEN
             RETURN v_class.class_code, NOW(), v_version;
           END IF;
         END LOOP;
       END LOOP;

  4. No class matched (shouldn't happen if a fallback exists):
     RETURN 'analytical', NOW(), v_version;  -- safety default
```

### The rule evaluator

```
FUNCTION m.evaluate_rule(p_rule_type TEXT, p_rule_config JSONB,
                         p_title TEXT, p_body TEXT, p_word_count INT,
                         p_first_seen TIMESTAMPTZ, p_source_type TEXT,
                         p_source_name TEXT)
  RETURNS BOOLEAN

  CASE p_rule_type
    WHEN 'title_regex' THEN
      RETURN p_title ~* (p_rule_config->>'pattern');
    WHEN 'body_regex' THEN
      v_window := COALESCE(p_rule_config->>'window', 'full');
      v_text := CASE v_window
        WHEN 'first_500_chars'  THEN LEFT(p_body, 500)
        WHEN 'first_1000_chars' THEN LEFT(p_body, 1000)
        WHEN 'last_500_chars'   THEN RIGHT(p_body, 500)
        ELSE p_body
      END;
      RETURN v_text ~* (p_rule_config->>'pattern');
    WHEN 'numeric_density' THEN
      -- Count numeric tokens, divide by word_count, compare to threshold
      ...
    WHEN 'word_count_range' THEN
      RETURN p_word_count BETWEEN
             COALESCE((p_rule_config->>'min')::INT, 0)
         AND COALESCE((p_rule_config->>'max')::INT, 999999);
    -- ... remaining 5 rule types
  END CASE;
```

One function per rule_type would also work (more readable, more code). MVP prefers the single `CASE` for compactness — ~150 lines total. Revisit if the interpreter grows past that.

### Why `RETURNS TABLE` not `RETURNS VOID`

Read-only — testable by querying without side effects: `SELECT * FROM m.classify_canonical('<canonical_id>'::uuid);` shows what class a row *would* get. The sweep function (below) does the writes.

---

## Versioning workflow

### Editing in place (fast iteration, during bedding-in)

During the first weeks of R4 operation, rules will need tuning based on real classification data. Fast-iterate by UPDATEing rule rows in place. Same version string. Classifier picks up changes on next invocation. Good for regex tightening, threshold tweaking, adding a missed source name.

Reclassification after in-place edits: operator-triggered. Run `UPDATE f.canonical_content_body SET classifier_version = NULL WHERE classifier_version = '<current>'` on whatever subset should be re-evaluated — sweep picks them up on next cron tick.

### Formal version bump (for larger shifts)

When the change is bigger (adding/removing a class, major priority reshuffle, adding a new rule_type), bump versions properly:

```
BEGIN;

-- 1. Insert new v2 class rows
INSERT INTO t.content_class
  (class_code, class_name, description, priority_rank, version, is_current, is_active, evidence_source)
VALUES
  ('timely_breaking', '...', '...', 1, 'v2', TRUE, TRUE, '...'),
  -- ... all 6 (or 7) classes
  ;

-- 2. Insert new v2 rule rows (referencing the new v2 content_class_ids)
INSERT INTO t.content_class_rule
  (content_class_id, rule_group, rule_type, rule_config, is_active, notes)
VALUES
  -- ... all rules for all v2 classes
  ;

-- 3. Mark v1 rows superseded
UPDATE t.content_class
SET is_current = FALSE,
    superseded_by = (SELECT content_class_id FROM t.content_class
                     WHERE class_code = t.content_class.class_code AND version = 'v2')
WHERE version = 'v1';

-- 4. Trigger reclassification of everything classified under v1
UPDATE f.canonical_content_body SET classifier_version = NULL WHERE classifier_version = 'v1';

COMMIT;
```

Sweep function (next invocation) picks up all NULL-classifier_version rows, classifies them under v2 rules. Full backfill at 100/5min = ~12 hours for 14k rows.

### Rollback

Reverse step 3: mark v1 back to current, drop the superseded_by pointer, mark v2 not-current. Same atomic transaction. Sweep re-reverts classifications on next tick.

```sql
BEGIN;
UPDATE t.content_class SET is_current = FALSE, superseded_by = NULL
  WHERE version = 'v2';
UPDATE t.content_class SET is_current = TRUE
  WHERE version = 'v1';
UPDATE f.canonical_content_body SET classifier_version = NULL WHERE classifier_version = 'v2';
COMMIT;
```

### Historical audit

"What did `stat_heavy` mean in v1 vs v2?":

```sql
SELECT c.version, c.priority_rank, c.description,
       r.rule_group, r.rule_type, r.rule_config
FROM t.content_class c
JOIN t.content_class_rule r USING (content_class_id)
WHERE c.class_code = 'stat_heavy'
ORDER BY c.version, r.rule_group, r.rule_type;
```

Full rule history preserved forever. No separate snapshot table needed — the versioned rows *are* the snapshots.

---

## Where the output lands

Three new columns on `f.canonical_content_body`:

```sql
ALTER TABLE f.canonical_content_body
  ADD COLUMN content_class       TEXT,
  ADD COLUMN classified_at       TIMESTAMPTZ,
  ADD COLUMN classifier_version  TEXT;

CREATE INDEX idx_canonical_content_body_class_null
  ON f.canonical_content_body (updated_at)
  WHERE content_class IS NULL OR classifier_version IS NULL;
```

**No CHECK constraint on `content_class`.** Classifier output is whatever `class_code` values appear in `t.content_class WHERE is_current`. Adding a class in v2 would require widening a hardcoded CHECK if it existed — that's the exact coupling we're avoiding. Trust the classifier (sole writer) to only emit values that exist in the class table.

**No FK to `t.content_class.class_code`.** Because `class_code` repeats across versions (v1 `stat_heavy` AND v2 `stat_heavy` both have class_code `'stat_heavy'`), a simple FK would need to target a separate `content_class_definition` table — unnecessary complexity. The `classifier_version` column pairs with `content_class` to uniquely resolve back to a specific set of rules.

**Partial index on NULL-class rows.** Sweep function needs fast access to "canonicals that need classifying". Partial index keeps the index small (only the work-queue rows).

**Column name is `content_class`, not `content_type`.** `f.canonical_content_body.content_type` already exists for HTTP Content-Type header. Name collision avoided.

---

## Sweep + cron

```
FUNCTION m.classify_canonicals_unclassified(p_batch_size INT DEFAULT 100)
  RETURNS INT  -- count classified this run
  LANGUAGE plpgsql
  SECURITY DEFINER

  -- Select work: NULL class, OR version drift
  FOR v_row IN
    SELECT canonical_id
    FROM f.canonical_content_body
    WHERE content_class IS NULL
       OR classifier_version IS DISTINCT FROM (
         SELECT MIN(version) FROM t.content_class WHERE is_current = TRUE
       )
    ORDER BY updated_at  -- oldest first so newly-landed canonicals don't starve backfill
    LIMIT p_batch_size
  LOOP
    SELECT * INTO v_result FROM m.classify_canonical(v_row.canonical_id);
    UPDATE f.canonical_content_body
    SET content_class = v_result.content_class,
        classified_at = v_result.classified_at,
        classifier_version = v_result.classifier_version,
        updated_at = NOW()
    WHERE canonical_id = v_row.canonical_id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
```

```sql
SELECT cron.schedule(
  'classify-canonicals-every-5m',
  '*/5 * * * *',
  $$SELECT m.classify_canonicals_unclassified(100);$$
);
```

At 5-min cadence with batch size 100, backfills at 1,200/hour. Current ingest rate ~50/hour. Backfill stays ahead forever.

Why 5m not 10m: bundler runs every 10m. If classifier ran 10m, a newly-fetched canonical could miss the immediate-next-bundler window. 5m ensures any newly-fetched canonical is classified before the next bundler tick.

---

## Integration contract — what R5 / R6 consume

**R5 (matching layer) reads:**
- `content_class` is the filter key — R5 demand rows target specific classes. Simple SQL equality, no fuzzy matching.
- Every canonical with a body + `resolution_status = 'success'` is classified within 5-10 min of fetch.
- R5 can rely on `content_class IS NOT NULL` for all success-status canonicals older than ~10 min.

**R6 (seed_and_enqueue rewrite) reads:**
- R6 calls R5, R5 returns (digest_item, platform, format, content_class) tuples already resolved.
- R6 doesn't touch classifier directly — it's a consumer of R5's output.

**Future dashboard consumption:**
- Class distribution panel (last 7 days of canonicals by class) — straight SELECT against `f.canonical_content_body`.
- Class management UI (view t.content_class, edit priority_rank, toggle is_active) — nice-to-have, not MVP.

---

## Migration plan — four atomic steps

### Step 1 — Schema (low risk, reversible)

Create `t.content_class` + `t.content_class_rule` tables + all indexes. Add three columns to `f.canonical_content_body` (`content_class`, `classified_at`, `classifier_version`). Zero breakage — no existing code reads or writes these.

### Step 2 — Seed v1 rules

INSERT all six classes into `t.content_class` and all rule rows into `t.content_class_rule`. Version = 'v1'. All `is_current = TRUE`, `is_active = TRUE`. This is just data, not code. Table content is the classifier configuration.

### Step 3 — Function + sweep + cron

Ship `m.classify_canonical()` + `m.evaluate_rule()` + `m.classify_canonicals_unclassified()` + `classify-canonicals-every-5m` cron. Sweep starts backfilling at 100/5min. ~12 hours to classify the ~14k existing canonicals. Nothing downstream reads `content_class` yet — wrong classifications are harmless.

### Step 4 — Verification gate before R5 starts

Before R5 design builds on top, verify:

- **Cron health clean.** `classify-canonicals-every-5m` has no failures in 24h. Check via `m.cron_health_alert`.
- **Class distribution reasonable.** No single class > 60% of classified rows, no class < 2%.
- **Spot-check quality.** Pick 10 random rows per class, eyeball title + class. If misfire rate > 30% for any class, tune rules (editing in place, same version) before R5.

**Verification queries:**

```sql
-- Distribution check
SELECT content_class, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM f.canonical_content_body
WHERE content_class IS NOT NULL
GROUP BY content_class
ORDER BY n DESC;

-- Spot-check sampler
SELECT content_class, canonical_title, classifier_version
FROM f.canonical_content_body cb
JOIN f.canonical_content_item ci USING (canonical_id)
WHERE content_class IS NOT NULL
ORDER BY random()
LIMIT 60;  -- 10 rows per class on average
```

---

## What's explicitly NOT in scope for v1

1. **AI-assisted classification.** Rule-based SQL only, per D143. Future work if 60d data shows rule-based misroutes.
2. **Per-client class preferences.** R5's job. Some clients weigh classes differently in matching — that's not a classifier concern.
3. **Multi-label classification.** One class per canonical. If both breaking AND stat-heavy, priority order wins.
4. **Classifier override table.** Deferred until evidence operators want manual override. Would add `m.canonical_class_override(canonical_id, override_class, reason, set_by)` + have classifier respect it. ~30 min work when triggered.
5. **Confidence scores.** Rules are binary. No probabilistic outputs.
6. **Non-English support.** English only. Multi-language falls through to fallback class.
7. **Dashboard UI for class management.** Query-direct sufficient until the vocabulary stabilises.
8. **Rule linter.** No automated check that a regex is well-formed or that rule_group AND/OR logic produces the intended predicate. Tested via spot-check only.
9. **JSONB config schema validation via CHECK constraints.** Rule types have documented shapes but the DB doesn't enforce them. If a `title_regex` rule has `rule_config = '{"wrong_key": "value"}'`, the interpreter will fail at evaluation time (NULL return). Acceptable for MVP given write-rate is near-zero (only operator edits). Add JSON Schema validation if/when UI-driven rule editing ships.

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rules produce lopsided distribution (e.g. 90% `analytical`) | Medium | R5 chokes on narrow class supply | Step 4 verification gate; tune rules until distribution spans all six reasonably |
| Regex false positives on edge cases (e.g. "5 minute read" → `multi_point`) | High | Operator annoyance; R5 routes wrong signal | Tighten regex iteratively in place; UPDATE rule_config as cheap fix |
| Backfill cost at scale (14k rows) | Low | 12-hour window | Backfill parallel to pipeline; zero production impact |
| Malformed `rule_config` JSONB bypasses validation | Low | Rule silently returns false, class fails to match when expected | Visible via Step 4 spot-check; no JSON Schema until UI editing |
| Version bump workflow executed wrong (e.g. v2 inserted but v1 not superseded) | Medium | Two `is_current = TRUE` rows for same class_code → partial unique index raises error | DB-layer safety: partial unique indexes force correct workflow. Migration fails loud. |
| Rule priority produces surprising result (e.g. human story with stats → `stat_heavy`) | Medium | Occasional misroute | Priority 4 pronoun_density rule catches genuine stories before they reach stat_heavy's body rule; spot-check during Step 4 |
| Someone edits `t.content_class_rule` without understanding group semantics | Medium | Logic change (AND→OR accidentally) | Rule groups documented in column comment + in this spec; future dashboard UI will enforce visually |

---

## Dependencies for R5 to start

**Required:**
- This spec reviewed + approved by PK
- Class distribution clean post-backfill (Step 4 gate passed)
- Any rule tuning done in-place before R5 baseline locks in

**Not required:**
- Dashboard class management UI
- Classifier override table
- AI fallback classifier
- JSON Schema validation

---

## Open questions for PK (weekend review)

1. **Rule_type vocabulary — right nine?** The types are: `title_regex`, `body_regex`, `numeric_density`, `word_count_range`, `source_type_match`, `source_name_match`, `pronoun_density`, `recency_window`, `list_marker_count`. If operational experience suggests a missing type (e.g. `url_pattern_match` for source domains), worth adding to v1 rather than post-hoc.

2. **Starting class vocabulary — keep all six in v1?** With the table-driven design, adding/removing a class becomes cheap. Still worth starting with a good v1 shape. If PK's experience suggests starting narrower (e.g. drop `human_story` until participant feeds exist) or broader (add `practitioner_alert` now), it's a seed-data decision only — no schema change.

3. **Priority order in v1.** `timely_breaking > stat_heavy > multi_point > human_story > educational_evergreen > analytical`. Same as v1 of the spec. Question remains: promote `human_story` above `stat_heavy` to protect narratives that quote numbers?

4. **Dashboard surface for class distribution + class management — when?** Distribution panel (7-day class counts) is ~1h. Class management UI (view/edit class table + rule table) is ~4-6h. Both nice-to-have. Does PK want either for the post-rollout first week, or defer until the vocabulary stabilises?

5. **Classifier override path — MVP or deferred?** Still unresolved. Table-driven design doesn't make override easier or harder — same decision as v1.

6. **Fallback class semantics — explicit rule_group or convention?** v1 rules show `analytical` fallback as "lowest priority class with rule_groups that may not match — if none match, class still wins." Alternative: add explicit `rule_group = 99` for analytical with no rules → always matches. Either works; the current design uses the first (cleaner rule table; interpreter logic slightly more complex).

---

## When to start R5

Same recommendation as v1:

1. PK reviews this spec over weekend → answers to 6 open questions
2. Any scope adjustments land (drop a class, add a rule_type, etc.)
3. Optional: ship Steps 1-3 of migration plan (~45-60 min with the seed data) → overnight backfill → Monday morning Step 4 verification
4. R5 design starts Monday afternoon on real classification data

**Recommendation: serial.** Spec review first, then implement R4, then R5 design on real data.

**Implementation estimate (revised):** 3-4 hours including seed data and verification, up from v1's 2-3 hours. Extra hour is the rule interpreter's CASE-per-type logic.

---

## Related decisions

- **D143** — the decision this spec implements
- **D144** — router master spec R4 feeds into
- **D167** — router MVP infrastructure; this spec uses the same versioning pattern (`version` + `is_current` + `superseded_by` + `effective_from`) as `t.platform_format_mix_default`
- **D164** — 7-day canonical dedup window (no conflict: R4 runs per-canonical, dedup runs per-client-per-canonical)
- **A21 / L6** (24 Apr) — ON CONFLICT audit confirms the classifier function's proposed UPSERT pattern is safe

## Related files

- `docs/06_decisions.md` — D143, D144, D166, D167 entries
- `docs/research/platform_format_mix_defaults.md` — research on which formats each platform needs (informs "typical slot fit" rationale in class descriptions)
- `docs/briefs/2026-04-22-router-mvp-shadow-infrastructure.md` — D167 infrastructure that this spec builds on
