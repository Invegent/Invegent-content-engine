# Slot-Driven Architecture — Detailed Design v2

**Date:** 25 April 2026 Saturday late evening
**Status:** Architectural design brief v2 — supersedes v1 (`2026-04-25-slot-driven-architecture-detailed-design.md`, commit `1c433083`)
**Authors:** PK + Claude (architectural dialogue, post 4-LLM external review synthesis)
**Purpose:** Provide enough operational detail (tables, functions, crons, SQL) to (a) run an imaginary test on the design and (b) seek a second round of external pressure-testing.

---

## 0. What changed from v1

V1 captured the architectural intent, the load-bearing decisions, and the open questions. V2 takes the synthesis of four external reviews and locks the decisions PK and the reviewers converged on, then writes the design at the level of detail required to actually build it (or to pressure-test the build). Where v1 said "the pool is materialised, vertical-scoped" v2 writes the actual `CREATE TABLE` and the actual `INSERT TRIGGER` and the actual cron line.

This is no-half-solutions territory. PK has explicitly reserved the business decision (build now vs later) to themselves and asked for the architecture conversation to go deep without business framing.

### Locked decisions (consensus from external review + PK)

| # | Decision | Locked value | Source |
|---|---|---|---|
| LD1 | Pool scope | Vertical-scoped with client filter at fill-time | 4-of-4 reviewers + PK |
| LD2 | Pool storage | Materialised (`m.signal_pool` table) | 3-of-4 reviewers + PK |
| LD3 | Empty pool fallback | Evergreen library (never skip as default, never stretch as default) | 4-of-4 reviewers + PK |
| LD4 | Lead time | **24 hours** | PK direct (production-time aware) |
| LD5 | Format synthesis | Format-aware: single-item for image_quote/video/timely_breaking; bundle of 2 for text; bundle of 3 for carousel | Reviewer 4 + PK |
| LD6 | Throttle migration | AEST-day basis (not UTC) | 4-of-4 + PK |
| LD7 | Prompt caching | Used from day 1 (60-80% savings on stable prefix) | 4-of-4 reviewers |
| LD8 | Lightweight title-similarity dedup in v1 | YES (pg_trgm + keyword overlap, 5-day window) | Reviewer 4 + PK |
| LD9 | Reuse penalty curve (not binary dedup) | YES, table-driven | Reviewer 4 |
| LD10 | Slot confidence score | YES, composite metric (top_fitness × pool_depth × diversity × freshness) | Reviewer 4 |
| LD11 | Phased rollout | Foundation → shadow → one client cutover → expand | 4-of-4 reviewers |
| LD12 | Evergreen as ~20-30% baseline mix (not just emergency fallback) | DEFER decision to PK content review; architecture supports it via mixing weights | Reviewer 4 |

### Decisions still open

| # | Question | Why still open | Section |
|---|---|---|---|
| OAQ1 | Slot horizon: 7d default | Could go 14d for visibility; no urgency to lock | §6 |
| OAQ2 | Slot promotion cron cadence | 5min vs trigger-based | §5.3 |
| OAQ3 | Evergreen initial seeding source | Hand-curated v1 vs AI-generated retrospectively | §10.5 |
| OAQ4 | Pool re-poll for breaking news | If hot story arrives after fill, do we override? | §11 |
| OAQ5 | Approval-rejection retry policy | 1 retry then skip, or 0 retries (review backlog protects) | §5.9 |
| OAQ6 | Per-client format preferences | Just inherit defaults from t.platform_format_mix_default for v1 | §6 |

---

## 1. Framing (compact)

The current architecture (R6 seed_and_enqueue) treats signal cardinality as work cardinality — every canonical fans out to many drafts (1:N). The publishing capacity is bounded at ~32/day; the fan-out generates ~477/day. ~93% of work is wasted. The cost of this waste at $190/month is the alarm; the architecture itself is the disease.

The proposed inversion makes **demand the unit of work**. Slots are first-class scheduled events. Pools are materialised time-windowed views of available signals. A fill function pulls the right pool entry into the right slot, exactly once, exactly when needed.

V2 specifies this in enough detail that any other LLM, any other engineer, can either (a) walk the design end-to-end mentally and find holes, or (b) build it.

---

## 2. The pipeline at a glance — with locked decisions baked in

```
┌─ UPSTREAM (UNCHANGED) ────────────────────────────────────────────────────┐
│                                                                           │
│  RSS feeds → ingest-worker → f.raw_content_item                           │
│                                  ↓                                        │
│                          f.canonical_content_item (deduped)               │
│                                  ↓                                        │
│                          f.canonical_content_body (Jina-fetched)          │
│                                  ↓                                        │
│              R4 classifier → t.content_class label                        │
│                                  ↓                                        │
│              vertical-mapper → f.canonical_vertical_map (many-to-many)    │
│                                                                           │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │
                                     │ trigger fires when canonical
                                     │ has body+class+vertical
                                     ↓
┌─ NEW MIDDLE LAYER ────────────────────────────────────────────────────────┐
│                                                                           │
│   ┌──────────────────────┐                  ┌──────────────────────┐      │
│   │  m.signal_pool       │                  │      m.slot         │      │
│   │  (per vertical)      │                  │  (per scheduled     │      │
│   │  - fitness_per_format│                  │   publish event)    │      │
│   │  - reuse_count       │                  │  - 24h fill window  │      │
│   │  - class-aware expiry│                  │  - status lifecycle │      │
│   │  - active flag       │                  │  - confidence score │      │
│   └──────────┬───────────┘                  └──────────┬──────────┘      │
│              │                                          │                  │
│              └─────────► m.fill_pending_slots ◄─────────┘                  │
│                                  │                                        │
│                                  │  Quality gates:                        │
│                                  │  - min_fitness_threshold              │
│                                  │  - min_pool_size                      │
│                                  │  - title-similarity dedup (5d)         │
│                                  │  - reuse penalty applied              │
│                                  │                                        │
│                                  ↓                                        │
│                       Selection: top-N adj_score                          │
│                                  ↓                                        │
│              IF pool gate-passed:    one canonical bundle                 │
│              IF pool gate-failed:    evergreen library lookup             │
│              IF both fail:           skip slot with reason                │
│                                  ↓                                        │
│                       m.slot_fill_attempt (audit row)                     │
│                                  ↓                                        │
│                       m.ai_job (synthesis payload)                        │
│                                                                           │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │
                                     ↓
┌─ DOWNSTREAM (UNCHANGED) ──────────────────────────────────────────────────┐
│                                                                           │
│  ai-worker → m.post_draft (slot_id attached)                              │
│                  ↓                                                        │
│  auto-approver → status=approved or needs_review                          │
│                  ↓                                                        │
│  M11 trigger → m.post_publish_queue                                       │
│                  ↓                                                        │
│  Publishers (FB/IG/LI/YT) → AEST-day throttle → m.post_publish            │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION A — How signals flow IN

This section traces a single RSS item from the moment it hits the feed reader through to its appearance in `m.signal_pool` ready to be selected for a slot. Every table touched, every trigger fired, every cron scheduled.

## A.1 — RSS ingest (existing, unchanged)

**Trigger:** pg_cron `ingest-feeds-every-6h` (existing, jobid 9 or similar).

**SQL invoked:**
```sql
SELECT net.http_post(
  url := <ingest-worker EF URL>,
  headers := <auth>,
  body := jsonb_build_object('mode', 'scheduled')
);
```

**What happens inside ingest-worker EF:**
1. Pulls active feeds from `f.feed_source`
2. For each feed, fetches RSS XML
3. Parses items, normalises into `f.raw_content_item`
4. Deduplicates by URL/title hash into `f.content_item`
5. Canonicalises into `f.canonical_content_item` (handles cross-feed duplicates)

**Tables written:**
- `f.raw_content_item` (one row per feed item per ingest)
- `f.content_item` (normalised)
- `f.canonical_content_item` (deduplicated canonical identity)

**Volume:** ~50 distinct canonicals/day after dedup.

**Output state:** Canonical exists with title + URL. Body NOT yet fetched. Class NOT yet assigned. Pool entry NOT yet created.

## A.2 — Canonical body fetch (existing, unchanged)

**Trigger:** pg_cron `content-fetch-every-10m` (existing).

**SQL invoked:** calls content-fetch EF, which:
1. Queries `f.canonical_content_item` where corresponding `f.canonical_content_body` is NULL or in pending state
2. Calls Jina reader for full text
3. Writes to `f.canonical_content_body`

**Possible outcomes per canonical:**
- `fetch_status = 'success'` → body retrieved, ready for classification
- `fetch_status = 'give_up_paywall'` → no body, won't be classified
- `fetch_status = 'give_up_blocked'` → no body, won't be classified
- `fetch_status = 'pending'` → in flight

Only `success` items proceed. About 50% give-up rate currently — feed quality work in Phase 1.1 of broader roadmap addresses this independently.

## A.3 — R4 classification (existing, unchanged)

**Trigger:** pg_cron `r4-classifier-every-5m` (existing, jobid 68).

**Process:**
1. Picks up canonicals where `fetch_status='success'` and `content_class_code IS NULL`
2. Calls Claude with body text and classification prompt
3. Writes `t.content_class` label back to `f.canonical_content_item.content_class_code`

**Vocabulary:** 6 classes — `timely_breaking`, `stat_heavy`, `multi_point`, `analytical`, `human_story`, `educational_evergreen`.

**Output state:** Canonical has body + class. Vertical mapping not yet done.

## A.4 — Vertical mapping (existing infrastructure, may need extension)

**Process:** When a canonical gets classified, a separate process (or inline within R4 classifier) determines which content verticals it belongs to. A canonical can map to multiple verticals (e.g. "Federal Budget" → both NDIS and Real Estate).

**Existing schema:**
```sql
-- Already exists
TABLE f.canonical_vertical_map (
  canonical_content_item_id uuid REFERENCES f.canonical_content_item,
  content_vertical_id       uuid REFERENCES t.content_vertical,
  fitness_score             numeric,
  PRIMARY KEY (canonical_content_item_id, content_vertical_id)
)
```

This table already drives the R5 matching layer. The new architecture leverages it directly — no schema change needed.

**Output state:** Canonical has body + class + N vertical mappings. **Now ready for pool entry.**

## A.5 — NEW: Pool entry via trigger

This is the first NEW component in the flow IN. When a canonical reaches the "ready for pool" state (body fetched + classified + vertical-mapped), a trigger fires that materialises one pool entry per (vertical, canonical) combination.

**Trigger DDL:**
```sql
CREATE TRIGGER trg_refresh_signal_pool
AFTER INSERT OR UPDATE ON f.canonical_vertical_map
FOR EACH ROW
EXECUTE FUNCTION m.refresh_signal_pool();
```

The trigger fires on `f.canonical_vertical_map` (not directly on body fetch) because that's the table that gets the FINAL piece of state needed for pool entry. By firing here we know body + class + vertical are all present.

**Trigger function pseudocode:**
```sql
CREATE OR REPLACE FUNCTION m.refresh_signal_pool()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_class           text;
  v_freshness_hours int;
  v_fit_per_format  jsonb;
  v_max_fit         numeric;
  v_body_status     text;
BEGIN
  -- Verify pre-conditions: body exists + class assigned
  SELECT cci.content_class_code, ccb.fetch_status 
    INTO v_class, v_body_status
  FROM f.canonical_content_item cci
  LEFT JOIN f.canonical_content_body ccb 
    ON ccb.canonical_content_item_id = cci.canonical_content_item_id
  WHERE cci.canonical_content_item_id = NEW.canonical_content_item_id;

  -- Skip if not ready
  IF v_class IS NULL OR v_body_status != 'success' THEN
    RETURN NEW;
  END IF;

  -- Get class freshness window
  SELECT pool_window_hours INTO v_freshness_hours
  FROM t.class_freshness_rule WHERE content_class_code = v_class;
  IF v_freshness_hours IS NULL THEN v_freshness_hours := 48; END IF;

  -- Compute fitness per format from t.class_format_fitness
  SELECT 
    jsonb_object_agg(format_key, fitness_score),
    MAX(fitness_score)
  INTO v_fit_per_format, v_max_fit
  FROM t.class_format_fitness
  WHERE content_class_code = v_class AND is_current = true;

  -- Insert or update pool entry for this (vertical, canonical)
  INSERT INTO m.signal_pool (
    vertical_id, canonical_id, content_class,
    fitness_score_max, fitness_per_format,
    pool_entered_at, pool_expires_at, is_active
  ) VALUES (
    NEW.content_vertical_id,
    NEW.canonical_content_item_id,
    v_class,
    v_max_fit,
    v_fit_per_format,
    NOW(),
    NOW() + (v_freshness_hours || ' hours')::interval,
    true
  )
  ON CONFLICT (vertical_id, canonical_id) DO UPDATE
    SET fitness_score_max = EXCLUDED.fitness_score_max,
        fitness_per_format = EXCLUDED.fitness_per_format,
        pool_expires_at = EXCLUDED.pool_expires_at,
        is_active = true,
        updated_at = NOW();

  RETURN NEW;
END;
$$;
```

**Output state:** A new row exists in `m.signal_pool` per vertical the canonical maps to. Each row has fitness scores per format (jsonb), a class-aware expiry, and is_active=true.

**Class-aware freshness windows (initial seed):**

| Class | Pool window | Reasoning |
|---|---|---|
| timely_breaking | 6h | News loses relevance fast |
| stat_heavy | 72h | Data points stay relevant 3 days |
| multi_point | 48h | Analysis pieces, 2 days |
| analytical | 72h | Deep takes have shelf life |
| human_story | 168h (7d) | Human stories are quasi-evergreen |
| educational_evergreen | 8760h (1y) | Effectively forever |

Stored in `t.class_freshness_rule` (configurable without code change).

## A.6 — NEW: Pool expiration cron (sweeps stale entries)

**Cron jobname:** `expire-signal-pool-hourly`

**Schedule:** Every hour at :05 UTC.

**Function:**
```sql
CREATE OR REPLACE FUNCTION m.expire_signal_pool()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE v_count int;
BEGIN
  UPDATE m.signal_pool
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true 
    AND pool_expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Cron registration
SELECT cron.schedule(
  'expire-signal-pool-hourly',
  '5 * * * *',
  $$SELECT m.expire_signal_pool();$$
);
```

**Effect:** Pool entries past their freshness horizon get marked `is_active=false`. They're not deleted (audit history preserved). The fill function only queries `is_active=true` entries.

## A.7 — Pool reconciliation cron (drift protection)

**Why needed:** Reviewer 2 flagged pool contamination from updates/deletes upstream. The trigger covers INSERT and UPDATE on `f.canonical_vertical_map`. But what if R4 reclassifies a canonical post-hoc, or the body fetch retroactively fails, or vertical mapping changes? A daily reconciliation catches drift.

**Cron jobname:** `reconcile-signal-pool-daily`

**Schedule:** Daily at 02:30 AEST (→ 16:30 UTC non-DST, 15:30 UTC DST — see §C.4).

**Function pseudocode:**
```sql
CREATE OR REPLACE FUNCTION m.reconcile_signal_pool()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_orphaned int;
  v_class_drifted int;
  v_vertical_changed int;
BEGIN
  -- Find pool entries whose canonical is no longer in vertical_map
  WITH orphaned AS (
    UPDATE m.signal_pool sp
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM f.canonical_vertical_map cvm
        WHERE cvm.canonical_content_item_id = sp.canonical_id
          AND cvm.content_vertical_id = sp.vertical_id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_orphaned FROM orphaned;

  -- Find pool entries whose content_class no longer matches canonical's current class
  WITH drifted AS (
    UPDATE m.signal_pool sp
    SET content_class = cci.content_class_code,
        updated_at = NOW()
    FROM f.canonical_content_item cci
    WHERE sp.canonical_id = cci.canonical_content_item_id
      AND sp.is_active = true
      AND sp.content_class != cci.content_class_code
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_class_drifted FROM drifted;

  RETURN jsonb_build_object(
    'orphaned_deactivated', v_orphaned,
    'class_drift_corrected', v_class_drifted,
    'reconciled_at', NOW()
  );
END;
$$;
```

This is a defensive mechanism. If we never see drift in the wild, it's cheap. If we see drift, it surfaces in the daily reconcile log.

## A.8 — Flow IN summary

```
RSS hit → raw_content_item
       → content_item (normalised)
       → canonical_content_item (deduped)
       → canonical_content_body (Jina fetched, status=success)
       → R4 classifier writes content_class_code on canonical
       → vertical-mapper writes canonical_vertical_map rows
       → trg_refresh_signal_pool fires
       → m.signal_pool INSERT or UPDATE per (vertical, canonical)
         with fitness_per_format jsonb computed from t.class_format_fitness
         with pool_expires_at from t.class_freshness_rule[content_class]
         with is_active=true
```

End-to-end latency from RSS hit to pool-ready: ~6-30 minutes depending on body fetch queue depth.

---

# SECTION B — How signals flow OUT

This section traces a single slot from materialisation through publish. Every table read, every function called, every state transition.

## B.1 — Schedule rule definition (existing, no change)

Each client has recurring publishing rules in `c.client_publish_schedule` like:
- "NDIS Yarns FB image_quote: every Mon, Wed, Fri at 10:00 AEST"
- "Property Pulse LinkedIn carousel: every Tue, Thu at 11:00 AEST"

Schema (existing):
```sql
TABLE c.client_publish_schedule (
  schedule_rule_id    uuid PK,
  client_id           uuid FK,
  platform            text,
  format_preference   text[],     -- ordered list, first match wins
  cadence_kind        text,       -- 'weekly_dow', 'daily', 'monthly_dom'
  cadence_dow         int[],      -- e.g. {1,3,5} for M/W/F
  publish_time_aest   time,       -- e.g. '10:00:00'
  is_active           boolean,
  ...
)
```

**No schema change needed.** Existing rules drive the new materialiser.

## B.2 — NEW: Slot materialisation

**Cron jobname:** `materialise-slots-nightly`

**Schedule:** Daily at 01:00 AEST (→ 15:00 UTC non-DST).

**Function:**
```sql
CREATE OR REPLACE FUNCTION m.materialise_slots(p_horizon_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule        RECORD;
  v_slot_time   timestamptz;
  v_horizon_end timestamptz;
  v_inserted    int := 0;
  v_skipped_dup int := 0;
BEGIN
  v_horizon_end := NOW() + (p_horizon_days || ' days')::interval;

  FOR v_rule IN
    SELECT cps.*, cpp.is_enabled, cpp.status AS profile_status
    FROM c.client_publish_schedule cps
    JOIN c.client_publish_profile cpp 
      ON cpp.client_id = cps.client_id 
     AND cpp.platform = cps.platform
    WHERE cps.is_active = true
      AND cpp.is_enabled = true
      AND cpp.status = 'active'
  LOOP
    -- Compute upcoming concrete slot times for this rule within horizon
    FOR v_slot_time IN
      SELECT slot_at FROM m.compute_rule_slot_times(
        v_rule.cadence_kind,
        v_rule.cadence_dow,
        v_rule.publish_time_aest,
        NOW(),
        v_horizon_end
      )
    LOOP
      INSERT INTO m.slot (
        client_id, platform, scheduled_publish_at,
        format_preference,
        fill_window_opens_at,
        fill_lead_time_minutes,
        status, source_rule_id, source_kind
      ) VALUES (
        v_rule.client_id, v_rule.platform, v_slot_time,
        v_rule.format_preference,
        v_slot_time - interval '24 hours',  -- LOCKED LD4: 24h lead
        1440,
        'future', v_rule.schedule_rule_id, 'recurring'
      )
      ON CONFLICT (client_id, platform, scheduled_publish_at) 
      DO NOTHING;

      IF FOUND THEN v_inserted := v_inserted + 1;
                ELSE v_skipped_dup := v_skipped_dup + 1; END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'skipped_dup', v_skipped_dup,
    'horizon_end', v_horizon_end
  );
END;
$$;
```

**Helper function `m.compute_rule_slot_times` (sketch):**
```sql
CREATE OR REPLACE FUNCTION m.compute_rule_slot_times(
  p_cadence_kind text,
  p_cadence_dow  int[],
  p_publish_time time,
  p_from         timestamptz,
  p_to           timestamptz
)
RETURNS TABLE (slot_at timestamptz)
LANGUAGE plpgsql
AS $$
DECLARE v_d date;
BEGIN
  -- Iterate days in horizon (in AEST), emit slot times where dow matches
  FOR v_d IN 
    SELECT d::date FROM generate_series(
      p_from AT TIME ZONE 'Australia/Sydney',
      p_to AT TIME ZONE 'Australia/Sydney',
      '1 day'::interval
    ) d
  LOOP
    IF p_cadence_kind = 'weekly_dow' AND EXTRACT(ISODOW FROM v_d)::int = ANY(p_cadence_dow) THEN
      slot_at := (v_d::text || ' ' || p_publish_time::text)::timestamp 
                 AT TIME ZONE 'Australia/Sydney';
      IF slot_at > NOW() AND slot_at < p_to THEN
        RETURN NEXT;
      END IF;
    END IF;
    -- Other cadence_kinds (daily, monthly_dom) added similarly
  END LOOP;
END;
$$;
```

**Trigger-based re-materialisation** (LD11 + OAQ supports it):
```sql
CREATE TRIGGER trg_rematerialise_on_rule_change
AFTER INSERT OR UPDATE OR DELETE ON c.client_publish_schedule
FOR EACH ROW
EXECUTE FUNCTION m.handle_schedule_rule_change();
```

The trigger function deletes future-status slots tied to the changed rule and re-runs the materialiser for that specific rule. Future slots in 'pending_fill' or beyond are NOT touched (they're already in flight).

## B.3 — NEW: Slot promotion (future → pending_fill)

**Cron jobname:** `promote-slots-to-pending-every-5m`

**Schedule:** `*/5 * * * *` (every 5 min).

**Function:**
```sql
CREATE OR REPLACE FUNCTION m.promote_slots_to_pending()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE v_count int;
BEGIN
  UPDATE m.slot
  SET status = 'pending_fill', updated_at = NOW()
  WHERE status = 'future'
    AND fill_window_opens_at <= NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
```

This is a separate cron (and not embedded in the fill function) because the promotion is purely time-driven and shouldn't be coupled to the fill function's own schedule. Keeps state honest.

## B.4 — NEW: Pool query at fill time

The fill function fires every 10 minutes. Each tick processes up to N pending slots. For each slot:

**Query the pool** for canonicals matching the slot's vertical, fit for the slot's format, that haven't been blocked by dedup rules.

The pool query (illustrative SQL):
```sql
WITH pool_with_penalty AS (
  SELECT 
    sp.canonical_id,
    sp.fitness_score_max,
    (sp.fitness_per_format->>p_format)::numeric AS format_fitness,
    sp.reuse_count,
    COALESCE(rpc.penalty_applied, 0) AS reuse_penalty,
    (sp.fitness_per_format->>p_format)::numeric 
      - COALESCE(rpc.penalty_applied, 0) AS adj_score
  FROM m.signal_pool sp
  LEFT JOIN t.reuse_penalty_curve rpc 
    ON sp.reuse_count BETWEEN rpc.reuse_count_min AND rpc.reuse_count_max
  WHERE sp.vertical_id = p_vertical_id
    AND sp.is_active = true
    AND sp.fitness_per_format ? p_format
),
title_blocked AS (
  -- Lightweight title-similarity dedup (LD8)
  SELECT pwp.canonical_id
  FROM pool_with_penalty pwp
  JOIN f.canonical_content_item cci 
    ON cci.canonical_content_item_id = pwp.canonical_id
  WHERE EXISTS (
    SELECT 1
    FROM m.post_publish pp
    JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
    WHERE pp.client_id = p_client_id
      AND pp.published_at > NOW() - interval '5 days'
      AND m.title_similarity(cci.title, pd.draft_title) > 0.7
  )
)
SELECT canonical_id, format_fitness, reuse_count, adj_score
FROM pool_with_penalty
WHERE adj_score >= p_min_fitness  -- quality gate
  AND canonical_id NOT IN (SELECT canonical_id FROM title_blocked)
ORDER BY adj_score DESC
LIMIT p_bundle_max;
```

## B.5 — NEW: Quality gates

Three gates run BEFORE any AI call:

1. **Pool size gate.** After dedup and fitness filtering, do we have ≥ `min_pool_size` candidates? If not → skip or evergreen.
2. **Fitness gate.** Is the top candidate's `adj_score` ≥ `min_fitness_threshold`? If not → skip or evergreen.
3. **Diversity gate (multi-item only).** For carousel/text, are the top-N items from at least 2 distinct sources or content_classes? If all from same source → drop one and re-query.

Per-format defaults stored in `t.format_quality_policy`:

| Format | min_fitness | min_pool | diversity_required |
|---|---|---|---|
| image_quote | 0.65 | 1 | false |
| carousel | 0.60 | 2 | true |
| text | 0.60 | 1 | false |
| video_short_kinetic | 0.65 | 1 | false |
| video_short_avatar | 0.65 | 1 | false |
| timely_breaking | 0.55 | 1 | false |

## B.6 — NEW: Title-similarity dedup function

**Function:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION m.title_similarity(p_a text, p_b text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(
    -- Trigram similarity (catches reorderings, typos)
    similarity(lower(p_a), lower(p_b))::numeric,
    -- Keyword overlap (catches different phrasings)
    CASE 
      WHEN GREATEST(
        CARDINALITY(string_to_array(p_a, ' ')),
        CARDINALITY(string_to_array(p_b, ' '))
      ) = 0 THEN 0
      ELSE 
        CARDINALITY(
          ARRAY(
            SELECT unnest(string_to_array(lower(p_a), ' ')) 
            INTERSECT 
            SELECT unnest(string_to_array(lower(p_b), ' '))
          )
        )::numeric / GREATEST(
          CARDINALITY(string_to_array(p_a, ' ')),
          CARDINALITY(string_to_array(p_b, ' '))
        )
    END
  );
$$;
```

**Use:** in pool query, block any canonical whose title is >0.7 similar to any title published for that client in last 5 days.

**Cost:** pg_trgm with a GiST index on title is fast enough (~milliseconds for hundreds of comparisons). Add index:
```sql
CREATE INDEX idx_canonical_title_trgm 
  ON f.canonical_content_item 
  USING gist (title gist_trgm_ops);
```

## B.7 — NEW: Synthesis prompt construction

Once selected canonicals are known, build the AI job payload:

```jsonc
{
  "job_type": "slot_fill_synthesis",
  "input_payload": {
    "slot_id": "uuid...",
    "client_id": "uuid...",
    "platform": "facebook",
    "format": "carousel",
    "synthesis_mode": "multi_item",
    "bundle_size": 3,
    "canonical_ids": ["uuid1", "uuid2", "uuid3"],
    "is_evergreen": false,
    "client_brand_voice_ref": "client_ai_profile.voice_id",
    "policy_version": "v2.0"
  }
}
```

**The ai-worker** (existing EF, slight modification) reads this payload and constructs a prompt with two cacheable sections:

```
[CACHED PREFIX — stable per (client, format)]
- System instructions
- Brand voice definition
- Format-specific rules
- Compliance requirements
- Output schema

[DYNAMIC SUFFIX — changes per slot]
- The N canonical bodies
- Slot-specific context (today's date, scheduled publish time, etc.)
```

Anthropic's `cache_control: {type: "ephemeral"}` marks the prefix. With current pricing (Sonnet 4.x: $3/M input → $0.30/M cached input), this saves 60-80% on the prefix portion. At 5k tokens cached prefix + 2k tokens dynamic suffix per call, savings work out to ~$0.01 per call vs $0.025 uncached.

## B.8 — Slot lifecycle states

```
   future
     │ (fill_window_opens_at <= NOW)
     ↓
   pending_fill
     │ ┌───────────────────┐
     │ │ fill_pending_slots │
     │ │ runs every 10 min  │
     │ └─────────┬──────────┘
     │           │
     │           ├─[gates_pass]──> filled (canonical bundle)
     │           │
     │           ├─[gates_fail]──> filled (evergreen)
     │           │
     │           └─[no_evergreen]──> skipped (skip_reason)
     │
   filled
     │ (ai-worker generates draft)
     ↓
   draft_generated
     │ (auto-approver runs)
     ↓
   ┌───────────────────┐
   │ approved          │ → published (after publisher fires)
   │ needs_review      │ → either approved or rejected
   │ rejected          │ → slot back to pending_fill (1 retry max)
   └───────────────────┘
```

## B.9 — Approval-rejection retry policy (OAQ5)

**Proposed:** 1 retry on rejection, then permanent skip with reason 'rejected_repeatedly'.

```sql
CREATE OR REPLACE FUNCTION m.handle_draft_rejection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.approval_status = 'rejected' AND OLD.approval_status != 'rejected' THEN
    UPDATE m.slot
    SET status = CASE 
                   WHEN fill_attempt_count >= 2 THEN 'skipped'
                   ELSE 'pending_fill'
                 END,
        skip_reason = CASE 
                        WHEN fill_attempt_count >= 2 THEN 'rejected_repeatedly'
                        ELSE NULL
                      END,
        updated_at = NOW()
    WHERE filled_draft_id = NEW.post_draft_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_draft_rejection
AFTER UPDATE OF approval_status ON m.post_draft
FOR EACH ROW
EXECUTE FUNCTION m.handle_draft_rejection();
```

## B.10 — Publisher (existing, throttle migration)

The existing publisher EFs (FB, IG, LI, YT) call `m.publisher_lock_queue_v1` or `_v2` to atomically claim a queue row with throttle enforcement. **The throttle CTE in the lock RPC migrates to AEST-day basis (LD6):**

```sql
-- Current (UTC):
SELECT COUNT(*) FROM m.post_publish 
WHERE created_at >= date_trunc('day', NOW())
  AND client_id = ... AND platform = ...

-- New (AEST):
SELECT COUNT(*) FROM m.post_publish 
WHERE created_at >= 
  (date_trunc('day', NOW() AT TIME ZONE 'Australia/Sydney')) 
  AT TIME ZONE 'Australia/Sydney'
  AND client_id = ... AND platform = ...
```

Migration is a one-line CTE change in the lock RPC source code. Affects all 5 publishers (FB, IG, LI, YT, Zapier-LinkedIn). Test in shadow before cutover.

## B.11 — Flow OUT summary

```
Schedule rule active in c.client_publish_schedule
  → m.materialise_slots() runs nightly
  → m.slot rows created in 'future' status, fill_window_opens 24h before publish
  → 24h before publish: m.promote_slots_to_pending() flips status to 'pending_fill'
  → m.fill_pending_slots() runs every 10 min:
      - locks pending_fill slots with FOR UPDATE SKIP LOCKED
      - queries m.signal_pool for vertical+format with reuse penalty
      - applies title-similarity dedup
      - applies quality gates (fitness, pool size, diversity)
      - if pass: selects bundle, computes slot_confidence, inserts m.ai_job
      - if fail: tries t.evergreen_library, else skips
      - records m.slot_fill_attempt audit row
      - updates m.slot to status='filled' with filled_canonical_ids
  → ai-worker picks up m.ai_job, calls Claude with cached prompt
  → m.post_draft inserted with slot_id FK
  → auto-approver (existing) sets approval_status
  → on approve: M11 trigger enqueues m.post_publish_queue
  → publisher EF picks up, calls Meta/LinkedIn/etc. API
  → on success: m.post_publish row created, m.slot status='published'
```

End-to-end: 24 hours from `pending_fill` to publish (lead time) + variable processing time within that window.

---

# SECTION C — Full data model

## C.1 — New tables

### C.1.1 `m.signal_pool`

```sql
CREATE TABLE m.signal_pool (
  pool_entry_id      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id        uuid         NOT NULL REFERENCES t.content_vertical(content_vertical_id),
  canonical_id       uuid         NOT NULL REFERENCES f.canonical_content_item(canonical_content_item_id) ON DELETE CASCADE,
  content_class      text         NOT NULL,
  fitness_score_max  numeric(4,3) NOT NULL CHECK (fitness_score_max >= 0 AND fitness_score_max <= 1),
  fitness_per_format jsonb        NOT NULL DEFAULT '{}'::jsonb,
  pool_entered_at    timestamptz  NOT NULL DEFAULT NOW(),
  pool_expires_at    timestamptz  NOT NULL,
  is_active          boolean      NOT NULL DEFAULT true,
  used_in_slots      uuid[]       NOT NULL DEFAULT ARRAY[]::uuid[],
  reuse_count        int          NOT NULL DEFAULT 0,
  created_at         timestamptz  NOT NULL DEFAULT NOW(),
  updated_at         timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE (vertical_id, canonical_id)
);

CREATE INDEX idx_signal_pool_active 
  ON m.signal_pool (vertical_id, is_active, fitness_score_max DESC) 
  WHERE is_active = true;
CREATE INDEX idx_signal_pool_expiry 
  ON m.signal_pool (pool_expires_at) 
  WHERE is_active = true;
CREATE INDEX idx_signal_pool_class 
  ON m.signal_pool (vertical_id, content_class, is_active) 
  WHERE is_active = true;
CREATE INDEX idx_signal_pool_canonical 
  ON m.signal_pool (canonical_id);

COMMENT ON TABLE m.signal_pool IS 
  'Materialised pool of canonicals available for slot fill, scoped per vertical, with class-aware expiry and reuse tracking.';
```

### C.1.2 `m.slot`

```sql
CREATE TABLE m.slot (
  slot_id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               uuid         NOT NULL REFERENCES c.client(client_id),
  platform                text         NOT NULL,
  scheduled_publish_at    timestamptz  NOT NULL,
  format_preference       text[]       NOT NULL,
  fill_window_opens_at    timestamptz  NOT NULL,
  fill_lead_time_minutes  int          NOT NULL DEFAULT 1440,
  status                  text         NOT NULL DEFAULT 'future' 
                          CHECK (status IN ('future','pending_fill','filled','approved',
                                            'published','skipped','failed')),
  source_rule_id          uuid         REFERENCES c.client_publish_schedule(schedule_rule_id),
  source_kind             text         NOT NULL DEFAULT 'recurring' 
                          CHECK (source_kind IN ('recurring','one_off','breaking_news_insert')),
  filled_at               timestamptz,
  filled_canonical_ids    uuid[]       DEFAULT ARRAY[]::uuid[],
  filled_draft_id         uuid         REFERENCES m.post_draft(post_draft_id),
  filled_format_used      text,
  slot_confidence         numeric(4,3),
  skip_reason             text,
  fill_attempt_count      int          NOT NULL DEFAULT 0,
  created_at              timestamptz  NOT NULL DEFAULT NOW(),
  updated_at              timestamptz  NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, platform, scheduled_publish_at)
);

CREATE INDEX idx_slot_pending_fill 
  ON m.slot (fill_window_opens_at) 
  WHERE status = 'pending_fill';
CREATE INDEX idx_slot_promotable 
  ON m.slot (fill_window_opens_at) 
  WHERE status = 'future';
CREATE INDEX idx_slot_client_platform 
  ON m.slot (client_id, platform, scheduled_publish_at);
CREATE INDEX idx_slot_status 
  ON m.slot (status, scheduled_publish_at);

COMMENT ON TABLE m.slot IS 
  'Concrete slot rows materialised from c.client_publish_schedule rules. One row = one publish event. Lead time 24h locked.';
```

### C.1.3 `m.slot_fill_attempt`

```sql
CREATE TABLE m.slot_fill_attempt (
  attempt_id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                 uuid         NOT NULL REFERENCES m.slot(slot_id),
  attempted_at            timestamptz  NOT NULL DEFAULT NOW(),
  pool_snapshot           jsonb        NOT NULL DEFAULT '[]'::jsonb,
  pool_size_before_gates  int          NOT NULL,
  pool_size_after_gates   int          NOT NULL,
  gate_failures           jsonb        DEFAULT '{}'::jsonb,
  selected_canonical_ids  uuid[],
  outcome                 text         NOT NULL 
                          CHECK (outcome IN ('filled','fallback_evergreen','skipped_thin_pool',
                                             'skipped_low_fitness','failed_ai','failed_other')),
  ai_job_id               uuid         REFERENCES m.ai_job(ai_job_id),
  scoring_version         text,
  policy_version          text,
  created_at              timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slot_fill_attempt_slot 
  ON m.slot_fill_attempt (slot_id, attempted_at DESC);
CREATE INDEX idx_slot_fill_attempt_outcome 
  ON m.slot_fill_attempt (outcome, attempted_at DESC);
```

### C.1.4 `t.evergreen_library`

```sql
CREATE TABLE t.evergreen_library (
  evergreen_id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id           uuid         NOT NULL REFERENCES t.content_vertical(content_vertical_id),
  format_keys           text[]       NOT NULL,
  title                 text         NOT NULL,
  content_summary       text         NOT NULL,
  source_canonical_id   uuid         REFERENCES f.canonical_content_item(canonical_content_item_id),
  last_used_at          timestamptz,
  use_cooldown_days     int          NOT NULL DEFAULT 90,
  use_count             int          NOT NULL DEFAULT 0,
  is_active             boolean      NOT NULL DEFAULT true,
  notes                 text,
  created_by            text         DEFAULT 'pk',
  created_at            timestamptz  NOT NULL DEFAULT NOW(),
  updated_at            timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evergreen_active 
  ON t.evergreen_library (vertical_id, is_active, last_used_at NULLS FIRST);
```

### C.1.5 `t.class_freshness_rule`

```sql
CREATE TABLE t.class_freshness_rule (
  content_class_code  text  PRIMARY KEY,
  pool_window_hours   int   NOT NULL CHECK (pool_window_hours > 0),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO t.class_freshness_rule VALUES
  ('timely_breaking',       6,    '6h horizon — news loses relevance fast'),
  ('stat_heavy',            72,   '3d horizon — data points stay relevant'),
  ('multi_point',           48,   '2d horizon — analysis pieces'),
  ('analytical',            72,   '3d horizon — deep takes have shelf life'),
  ('human_story',           168,  '7d horizon — human stories quasi-evergreen'),
  ('educational_evergreen', 8760, '1y horizon — effectively forever');
```

### C.1.6 `t.format_synthesis_policy`

```sql
CREATE TABLE t.format_synthesis_policy (
  format_key       text  PRIMARY KEY,
  synthesis_mode   text  NOT NULL CHECK (synthesis_mode IN ('single_item','multi_item')),
  bundle_size_max  int   NOT NULL CHECK (bundle_size_max >= 1),
  bundle_size_min  int   NOT NULL DEFAULT 1,
  notes            text
);

INSERT INTO t.format_synthesis_policy VALUES
  ('image_quote',         'single_item', 1, 1, 'Single quotable insight'),
  ('carousel',            'multi_item',  3, 2, 'Capped at 3 per Reviewer 4 — too many = hallucinated connections'),
  ('text',                'multi_item',  2, 1, 'Capped at 2 — long-form needs focus, not breadth'),
  ('video_short_kinetic', 'single_item', 1, 1, 'One narrative arc'),
  ('video_short_avatar',  'single_item', 1, 1, 'One topic per persona delivery'),
  ('timely_breaking',     'single_item', 1, 1, 'Single hot story');
```

### C.1.7 `t.format_quality_policy`

```sql
CREATE TABLE t.format_quality_policy (
  format_key                text         PRIMARY KEY,
  min_fitness_threshold     numeric(4,3) NOT NULL DEFAULT 0.6,
  min_pool_size             int          NOT NULL DEFAULT 1,
  diversity_required        boolean      NOT NULL DEFAULT false,
  recency_check_classes     text[]       NOT NULL DEFAULT ARRAY['timely_breaking'],
  recency_max_age_hours     int          NOT NULL DEFAULT 12,
  notes                     text
);

INSERT INTO t.format_quality_policy VALUES
  ('image_quote',         0.65, 1, false, ARRAY['timely_breaking'], 12, 'Quality > quantity'),
  ('carousel',            0.60, 2, true,  ARRAY['timely_breaking'], 24, 'Diversity required for multi-item'),
  ('text',                0.60, 1, false, ARRAY['timely_breaking'], 24, 'Single thesis acceptable'),
  ('video_short_kinetic', 0.65, 1, false, ARRAY['timely_breaking'], 24, 'Production cost high → fitness threshold higher'),
  ('video_short_avatar',  0.65, 1, false, ARRAY['timely_breaking'], 24, 'Same'),
  ('timely_breaking',     0.55, 1, false, ARRAY['timely_breaking'], 6,  'Lower threshold — breaking-news bias');
```

### C.1.8 `t.reuse_penalty_curve`

```sql
CREATE TABLE t.reuse_penalty_curve (
  reuse_count_min  int          PRIMARY KEY,
  reuse_count_max  int          NOT NULL,
  penalty_applied  numeric(4,3) NOT NULL,
  notes            text
);

INSERT INTO t.reuse_penalty_curve VALUES
  (0, 0, 0.000,  'First use — no penalty'),
  (1, 1, 0.100,  'Second use — light penalty'),
  (2, 2, 0.250,  'Third use — meaningful penalty'),
  (3, 99, 0.500, 'Heavy penalty after 3 uses');
```

## C.2 — Tables modified

### C.2.1 `m.post_draft` (add slot_id FK)

```sql
ALTER TABLE m.post_draft 
  ADD COLUMN slot_id uuid REFERENCES m.slot(slot_id),
  ADD COLUMN is_shadow boolean NOT NULL DEFAULT false;

CREATE INDEX idx_post_draft_slot ON m.post_draft (slot_id);
CREATE INDEX idx_post_draft_shadow ON m.post_draft (is_shadow) WHERE is_shadow = true;
```

`slot_id` is nullable for backwards compatibility during migration. After Phase D decommission, can be made NOT NULL.

`is_shadow` flag enables Phase B parallel running without affecting publishing.

## C.3 — Tables removed (Phase D)

| Table/Function | Reason |
|---|---|
| `m.seed_and_enqueue_ai_jobs_v1` | Replaced by `m.fill_pending_slots` |
| Cron 11, 64, 65 (R6 seed crons) | Replaced by fill cron |
| `m.post_seed` (or repurposed as `m.slot_fill_attempt`) | TBD per OAQ |

## C.4 — Cron schedule (full)

| Jobname | Schedule | UTC equivalent | Function | Status in v2 design |
|---|---|---|---|---|
| `expire-signal-pool-hourly` | `5 * * * *` | every hour at :05 | `m.expire_signal_pool()` | NEW |
| `materialise-slots-nightly` | `0 15 * * *` (non-DST) | 15:00 UTC = 01:00 AEST | `m.materialise_slots(7)` | NEW |
| `reconcile-signal-pool-daily` | `30 16 * * *` (non-DST) | 16:30 UTC = 02:30 AEST | `m.reconcile_signal_pool()` | NEW |
| `promote-slots-to-pending-every-5m` | `*/5 * * * *` | every 5 min | `m.promote_slots_to_pending()` | NEW |
| `fill-pending-slots-every-10m` | `*/10 * * * *` | every 10 min | `m.fill_pending_slots(5)` | NEW |
| `seed-and-enqueue-facebook-every-10m` | (paused) | — | `m.seed_and_enqueue_ai_jobs_v1('facebook')` | DECOMMISSIONED Phase D |
| `seed-and-enqueue-instagram-every-10m` | (paused) | — | `m.seed_and_enqueue_ai_jobs_v1('instagram')` | DECOMMISSIONED Phase D |
| `seed-and-enqueue-linkedin-every-10m` | (paused) | — | `m.seed_and_enqueue_ai_jobs_v1('linkedin')` | DECOMMISSIONED Phase D |

**DST note:** AEST is UTC+10 in winter, UTC+11 (AEDT) in summer. Cron uses fixed UTC. This means `0 15 * * *` is `01:00 AEST` non-DST but `02:00 AEST` during DST. For non-business-critical sweeps (expire, reconcile), the 1h drift is acceptable. For materialisation, drift of 1h doesn't affect correctness because we materialise 7 days ahead.

If we want exact AEST timing despite DST, we'd need pg_cron entries that change with DST — not currently a feature. Workaround: schedule cron at the time that's correct for the more common period, accept the 1h drift for the other. Mark in code with comment.

---

# SECTION D — Cross-cutting concerns (updated from v1)

## D.1 — Empty pool fallback

Already covered in §B.5. Order of operations:

1. Try pool with reuse penalty + title dedup + fitness threshold
2. If `pool_size_after_gates < min_pool_size` → try evergreen
3. If evergreen has no LRU-eligible item → skip slot with `skip_reason='thin_pool_no_evergreen'`

**Reviewer 4 framing:** evergreen may be 20-30% of normal output, not just emergency fallback. This means the architecture should support a SCHEDULED evergreen mix (not only emergency). For v1, treat as fallback only. For v2, add `is_evergreen_slot=true` as a slot attribute that always pulls from evergreen library.

## D.2 — Dedup (full)

Three layers of dedup:

1. **Slot-level uniqueness:** UNIQUE(client_id, platform, scheduled_publish_at) prevents duplicate slot rows
2. **Reuse penalty curve (LD9):** soft penalty grows with reuse count, doesn't block but discourages
3. **Title-similarity (LD8):** hard block within 5-day window for same client at >0.7 similarity

Semantic dedup (embedding-based) deferred to v2.

## D.3 — Quality gates (full)

Three pre-AI-call gates:

1. **Pool size** ≥ `min_pool_size` (per format)
2. **Fitness threshold** ≥ `min_fitness_threshold` (per format)
3. **Diversity** (multi-item only) — bundle items from ≥2 distinct sources

Optionally also:
4. **Recency** — for `recency_check_classes` items, age ≤ `recency_max_age_hours`

## D.4 — Time zones

LD6 locks AEST as the timezone for date-sensitive logic. Implementation:

- Storage: timestamptz throughout (always UTC under the hood, but tz-aware)
- Comparison: AEST-day boundaries for throttle counts and "today's posts"
- Display: AEST for human-readable
- Cron schedules: UTC with DST notes

Throttle CTE migration: see §B.10. One-line change in lock RPC source.

## D.5 — Observability (full)

**Mandatory metrics (queryable from data model):**

```sql
-- Pool depth per vertical+format
SELECT vertical_id, 
       (jsonb_each_text(fitness_per_format)).key AS format_key,
       COUNT(*) AS depth,
       AVG((jsonb_each_text(fitness_per_format)).value::numeric) AS avg_fitness
FROM m.signal_pool
WHERE is_active = true
GROUP BY vertical_id, format_key;

-- Slot fill outcomes (last 7 days)
SELECT outcome, COUNT(*), AVG(pool_size_after_gates) AS avg_pool_size
FROM m.slot_fill_attempt
WHERE attempted_at > NOW() - interval '7 days'
GROUP BY outcome;

-- Skip reason breakdown
SELECT skip_reason, COUNT(*) AS skipped_count
FROM m.slot
WHERE status = 'skipped' 
  AND scheduled_publish_at > NOW() - interval '7 days'
GROUP BY skip_reason;

-- Same-canonical reuse (semantic dedup signal)
SELECT canonical_id, reuse_count, used_in_slots
FROM m.signal_pool
WHERE reuse_count > 1
ORDER BY reuse_count DESC;

-- Cost per slot (when ai_usage_log links via ai_job_id)
SELECT s.client_id, s.platform, s.filled_format_used,
       SUM(aul.cost_usd) AS total_cost_usd,
       COUNT(*) AS slots_filled
FROM m.slot s
JOIN m.slot_fill_attempt sfa ON sfa.slot_id = s.slot_id
JOIN m.ai_usage_log aul ON aul.ai_job_id = sfa.ai_job_id
WHERE s.filled_at > NOW() - interval '30 days'
GROUP BY s.client_id, s.platform, s.filled_format_used;
```

These queries become dashboard tiles in Phase B+ (LD11).

## D.6 — Slot confidence score (LD10)

```sql
CREATE OR REPLACE FUNCTION m.compute_slot_confidence(
  p_top_fitness   numeric,
  p_pool_depth    int,
  p_diversity     numeric,  -- 0-1, fraction of distinct sources in bundle
  p_max_age_hours numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(1.0,
    p_top_fitness * 0.4
    + LEAST(p_pool_depth::numeric / 5.0, 1.0) * 0.2
    + p_diversity * 0.2
    + GREATEST(0, 1.0 - p_max_age_hours / 72.0) * 0.2
  )::numeric;
$$;
```

Stored on `m.slot.slot_confidence`. Surface in dashboard. Use future Phase 2.1 engagement data to tune weights.

---

# SECTION E — Imaginary test scenarios

These walk through the architecture for specific scenarios. Each is designed to be pressure-tested by an external reviewer or by PK mentally.

## Scenario 1: Busy news day for NDIS

**Setup:** Tuesday morning. 12 new NDIS-relevant canonicals have entered `m.signal_pool` for vertical_id='ndis-australia' over the last 24h. NDIS Yarns (NY) has 3 slots today: FB image_quote 10am, LI carousel 11am, IG carousel 14:00.

**At Mon 10:00 AEST (24h before NY-FB-Tue-10:00):**
- Slot promoter cron runs at 10:05, finds NY-FB-Tue-10:00 has `fill_window_opens_at <= NOW()`, promotes status to `pending_fill`
- Same for NY-LI-Tue-11:00 (window opened 11:00 Mon)
- Same for NY-IG-Tue-14:00 (window opened 14:00 Mon)

**At Mon 10:10 AEST:**
- Fill cron runs. `m.fill_pending_slots(5)` finds 3 NY pending slots. Locks them.
- For NY-FB-Tue-10:00 (image_quote, single_item, min_fitness 0.65):
  - Query NY's NDIS pool → 12 candidates
  - Apply title-similarity dedup → 12 still
  - Apply reuse penalty → 12 with adjusted scores (most have reuse_count=0)
  - Top item: "NDIS price guide updated" with fitness 0.82 for image_quote
  - Pass quality gate
  - Insert m.ai_job with single canonical_id
  - Mark slot 'filled', increment that canonical's reuse_count
- For NY-LI-Tue-11:00 (carousel, multi_item, bundle_size 3, min_fitness 0.60):
  - Query pool → top item now has reuse_count=1, penalty=0.10, adj_score=0.72
  - 2nd top: "Plan management changes" 0.78
  - 3rd top: "Provider list update" 0.71
  - Pass diversity check (3 distinct sources)
  - Insert m.ai_job with 3 canonical_ids
- For NY-IG-Tue-14:00 (carousel):
  - Top items now have reuse_count=1-2, penalties applied
  - Bundle of 3 selected, all distinct from FB and LI choices ideally
  - Pass diversity, insert ai_job

**At Mon 10:20-13:00 AEST:**
- ai-worker processes 3 ai_jobs sequentially
- Drafts written, attached to slots
- Auto-approver runs, all approved
- M11 trigger enqueues to publish queue

**At Tue 10:00 AEST (24h later):**
- Publishers fire. NY-FB publishes. NY-LI at 11:00. NY-IG at 14:00.

**Cost:** 3 Claude calls. ~$0.06 with caching.

**Pressure-test points:**
- Did diversity gate work for both carousels? Or did 2 carousels end up with overlapping items?
- Did the reuse penalty actually shift selections meaningfully, or did the same top 3 win all 3 slots?
- 12 canonicals → 3 used. Where did the other 9 go? They stay in pool until expired. Future slots can use them.

## Scenario 2: Slow news day, pool starvation, evergreen kicks in

**Setup:** Wednesday. Only 4 NDIS-relevant canonicals in pool. NY has 2 slots: FB image_quote 10am, LI carousel 11am.

**Fill cron runs:**
- NY-FB pulls top item: "minor admin update", fitness 0.62. Above 0.65 threshold? NO (0.62 < 0.65). 
- Quality gate FAILS on min_fitness for image_quote.
- Try evergreen: query `t.evergreen_library` where vertical='ndis', format='image_quote', LRU. Returns evergreen item "What is an NDIS plan? key facts" — last used 95 days ago, eligible.
- Mark slot filled with evergreen, increment evergreen use_count, update last_used_at
- m.slot_fill_attempt outcome='fallback_evergreen'

**For NY-LI carousel:**
- Pool has 4 candidates, top 2 above fitness 0.60
- Diversity: only 2 distinct sources (smaller pool concentrated)
- min_pool_size=2 met, diversity met
- Bundle of 2 selected (within bundle_size 2-3 range, min=2 OK)
- Filled normally

**Pressure-test points:**
- Was 0.65 threshold for image_quote too strict? Should it have used the 0.62 item?
- Did evergreen rotation work — did we pick a stale-enough one?
- For the carousel with bundle_size_min=2, did we accept 2 even though policy says max=3? Yes, min is 2, max is 3.

## Scenario 3: Breaking news arrives mid-day, all slots already filled

**Setup:** Monday 14:00 AEST. All Tuesday slots already filled (24h ago, at Mon 10-14:00). Suddenly a major NDIS reform is announced 14:30 Monday afternoon.

**What happens automatically:**
- Ingest worker (every 6h) catches the reform article, canonicalises it within 1-6h
- R4 classifies as `timely_breaking`
- Pool entry created, expires in 6h
- BUT all Tue slots are already 'filled' status — fill cron won't reprocess them
- The breaking story sits in pool until Wed slots fill (Tue 10am-2pm), at which point its 6h freshness window may have expired

**Mitigation options (OAQ4):**
- A) PK manually inserts a `breaking_news_insert` source_kind slot at Mon 16:00 AEST publishing same day at 17:00 (1h lead time exception for breaking)
- B) Architecture supports auto-detection: if a high-fitness timely_breaking canonical enters the pool, automatically insert a breaking_news slot for next available platform with empty schedule
- C) Accept that 24h lead time means breaking news of <24h relevance can't be published

**v1 behaviour:** option A (manual insert via dashboard or SQL). Option B in v2.

**Pressure-test points:**
- How does PK detect a breaking story is in the pool? Dashboard alert when high-fitness `timely_breaking` enters?
- What if the schedule has no immediate-availability slot — must we create a one-off?
- What's the impact on downstream throttles when a breaking insert pushes daily count to 3 instead of 2?

## Scenario 4: Schedule rule changes, materialised slots need updating

**Setup:** PK changes NY's FB image_quote schedule from "Mon/Wed/Fri 10am" to "Mon/Wed/Fri 11am" via dashboard.

**What happens:**
- `c.client_publish_schedule.publish_time_aest` UPDATE fires
- `trg_rematerialise_on_rule_change` trigger fires
- Function deletes future-status slots with this `source_rule_id` (only future, not pending_fill or beyond)
- Function calls `m.materialise_slots(7)` for affected rule
- New slots created with 11am scheduled_publish_at, fill_window_opens 11am one day prior

**Edge case:** What if the change happens AFTER a slot has already promoted to pending_fill but BEFORE it's filled?

Decision: pending_fill slots are NOT touched. The change applies to future slots only. The dashboard should warn PK if there are in-flight slots that won't reflect the change.

**Pressure-test points:**
- Does the trigger correctly handle DST-related shift? (e.g. moving from non-DST to DST means the AEST time still maps to a different UTC time)
- What if PK deactivates a rule entirely (`is_active=false`)? Future slots should be deleted, in-flight slots should be allowed to complete.

## Scenario 5: Same-news two articles 2 days apart, title-similarity dedup fires

**Setup:** Monday a canonical from "ABC News: NDIS pricing review announced" enters pool. NY publishes from it Mon 10am FB.

Wednesday a canonical from "The Guardian: NDIS announces pricing review" enters pool. Title similarity to ABC version: ~0.75 by trigram + keyword overlap.

**At Wed 10:00 AEST fill (for Thu publish):**
- Pool query for NY image_quote
- Title-similarity check: Guardian title vs Mon-published ABC title
- Within 5-day window, similarity 0.75 > 0.7 threshold
- Guardian canonical BLOCKED in this fill
- Falls to next-best canonical

**Pressure-test points:**
- Is 0.7 threshold the right calibration? Too strict = miss legitimate variations. Too loose = duplicate-feeling content.
- 5-day window — does it cover the typical news-cycle re-coverage pattern?
- What if Guardian version is materially better written or has unique angle? Currently no override mechanism.
- Cost of pg_trgm GiST index: negligible at our scale (<1000 canonicals/month).

## Scenario 6: Pool starvation across slots in same day

**Setup:** Tuesday. Pool has 5 candidates. NY has 3 slots same day plus PP (shared NDIS pool only via PP's own scope) has 2 slots.

**Fill cron for NY:**
- Slot 1 picks top item, reuse_count=1
- Slot 2 sees reuse_count=1 → penalty 0.10 → may pick same top OR drop to #2 depending on score gap
- Slot 3 → similarly affected

**The reuse penalty curve creates 3 outcomes:**

| Item | Format fitness | Reuse 0 (NY-1) | Reuse 1 (NY-2) | Reuse 2 (NY-3) |
|---|---|---|---|---|
| A (top) | 0.85 | 0.85 | 0.75 | 0.60 |
| B | 0.80 | 0.80 | 0.80 | 0.80 |
| C | 0.75 | 0.75 | 0.75 | 0.75 |
| D | 0.65 | 0.65 | 0.65 | 0.65 |
| E | 0.60 | 0.60 | 0.60 | 0.60 |

After NY-1 picks A, NY-2's adj_scores: A=0.75, B=0.80, C=0.75. B wins.
After NY-2 picks B (B reuse=1), NY-3's adj_scores: A=0.60 (reuse=1), B=0.70 (reuse=1), C=0.75. C wins.

**Outcome:** NY gets posts using A, B, C across 3 slots. Diversity preserved without binary blocking.

**Pressure-test points:**
- Does the penalty curve produce the right pattern of diversity, or does it sometimes lock into a clear winner that doesn't shift?
- For very tight clusters (all items 0.78-0.82), is the penalty enough to differentiate?
- PP's NDIS pool query: would PP also use A/B/C, or are PP filters at fill-time different enough?

## Scenario 7: AI call fails mid-fill

**Setup:** Fill function selects bundle, inserts m.ai_job. Worker picks up, calls Claude, gets HTTP 500.

**What happens:**
- ai-worker marks ai_job status='failed' with last_error
- The slot's status is already 'filled' (optimistic)
- M11 trigger doesn't fire (no draft generated)
- Slot now has status='filled' but no draft

**Recovery path:**
- A separate cron `recover-stuck-slots-every-15m` checks for slots with status='filled' but `filled_draft_id IS NULL` and `filled_at < NOW() - interval '30 minutes'`
- If found, revert to status='pending_fill' and increment fill_attempt_count
- Next fill cron tries again

**Pressure-test points:**
- 30 min recovery threshold — enough? Too long?
- After 3 failed attempts, slot becomes 'failed' permanently. That's the cap.
- Is `failed` distinguishable from `skipped` in dashboard? Yes — different status values.

## Scenario 8: Pool reconciliation finds drift

**Setup:** A canonical was retroactively reclassified by R4 from `multi_point` to `analytical` (e.g. operator manually fixed a misclassification).

**Effect on pool:**
- Original entry has `content_class='multi_point'`, `pool_expires_at` set for 48h horizon
- After reclassification, real class is `analytical` which has 72h horizon
- Drift exists

**Reconciliation cron at 02:30 AEST:**
- `m.reconcile_signal_pool()` runs
- Detects pool entry where `signal_pool.content_class` != current `canonical_content_item.content_class_code`
- Updates pool entry, recomputes `pool_expires_at` if applicable

**Pressure-test points:**
- Does the reconciler also recompute `fitness_per_format` if the class change affects fitness? Yes, should.
- What if R4 reclassifies during the same day a slot is being filled from this entry? Race condition; reconciler runs after-the-fact daily.
- Is daily frequency enough for class drift, or should it be more frequent?

---

# SECTION F — Risk register (updated from v1, +reviewer additions)

| # | Risk | Mitigation | New from v2? |
|---|---|---|---|
| R1 | Pool starvation: top items consumed early, late slots get scraps | Reuse penalty curve (LD9) — diversifies across slots same day | Yes (V2 framing) |
| R2 | Stale content drift via wide look-back | Class-aware freshness rules in `t.class_freshness_rule` | — |
| R3 | "Slot filled" with bad content (silent quality fail) | Quality gates pre-AI; engagement loop in Phase 2.1 | — |
| R4 | Retry cost creep | Hard retry cap (1 attempt + 1 retry, then skip) | — |
| R5 | AI hallucination on multi-item synthesis | Reduced bundle sizes (LD5: 3 not 5 for carousel, 2 not 4 for text) | YES (Reviewer 4) |
| R6 | Race conditions: pool refresh during fill | `FOR UPDATE SKIP LOCKED` on slot rows; pool snapshot in audit | — |
| R7 | Schedule rule drift | Trigger-based re-materialisation | — |
| R8 | Time zone bugs | AEST migration (LD6) | — |
| R9 | Title similarity false positives (legitimate variation blocked) | 0.7 threshold tunable; 5-day window scoped | YES |
| R10 | Title similarity false negatives (genuine duplicates pass) | pg_trgm + keyword overlap covers most cases; semantic dedup deferred | YES |
| R11 | Cost from prompt size growth | Prompt caching (LD7); periodic prompt audit | YES (Reviewer 4) |
| R12 | Pool contamination from upstream UPDATE/DELETE | Reconciliation cron daily | YES (Reviewer 2) |
| R13 | DST transition bugs | Cron drift acceptable for sweeps; materialiser unaffected | YES |
| R14 | Recitation/copyright filter from Claude on widely-published news | Pre-flight test on canonical bundle; paraphrase-prompt fallback | YES (Reviewer 1) |
| R15 | Approval deadlock (rejected drafts pile up) | Auto-approver tuning + 1-retry cap | — |
| R16 | Migration cutover dual-running | Phase B shadow + per-platform cutover | — |
| R17 | Vertical-shared pool cross-client surprise | Brand voice + scope filter at fill-time | — |
| R18 | Evergreen library stale ("fades") | LRU rotation + monthly content review | — |
| R19 | Underfilled slots from over-strict gates (silent calibration drift) | Skip reasons distinguish thin_pool vs low_fitness vs no_evergreen for tuning | YES (Reviewer 3) |
| R20 | Engagement metric absent during early life of system | Acknowledged; tied to Phase 2.1 (Insights worker) | — |

---

# SECTION G — Implementation phasing (updated from v1)

## Phase A — Foundation (estimated 4-6 hours)

**Goal:** Tables + functions exist. No behaviour change.

1. Create new tables (§C.1)
2. Create new functions (§A, §B)
3. Seed `t.class_freshness_rule`, `t.format_synthesis_policy`, `t.format_quality_policy`, `t.reuse_penalty_curve`
4. Create `t.evergreen_library` (empty — Phase E seeds)
5. Add `slot_id` and `is_shadow` columns to `m.post_draft`
6. Install pg_trgm extension and create title trigram index
7. Run trigger backfill: insert pool entries for existing classified canonicals (one-time)
8. Run materialiser once for next 7 days of slots (status='future')
9. Verify `m.signal_pool` populates correctly via trigger on next ingest cycle
10. Verify `m.expire_signal_pool()` works (cron registered + sweeping)
11. Verify slot promotion cron flips status correctly

**Success criteria:** Pool has rows. Slots materialised for next 7 days. Old pipeline still owns generation. R6 still paused.

## Phase B — Shadow + parallel diff (estimated 3-5 hours)

**Goal:** Fill function runs in shadow, drafts comparable to "what the old pipeline would have done."

1. Activate `fill-pending-slots-every-10m` cron with `is_shadow=true` flag in payload
2. ai-worker writes shadow drafts with `is_shadow=true`
3. Build dashboard query: side-by-side comparison of shadow drafts vs current queue drafts for the same upcoming publish times
4. PK reviews ~30 shadow drafts over 5-7 days
5. Tune fitness thresholds, bundle sizes, prompts based on observation
6. Verify `m.slot_fill_attempt` audit captures pool snapshots correctly

**Success criteria:** Shadow drafts produce content of equivalent or better quality vs current. PK confidence >= "I'd publish these."

## Phase C — Cutover (estimated 2-4 hours)

**Goal:** Slot-driven generation owns one client/platform end to end.

1. Migrate publisher lock RPC throttle to AEST-day basis (one-line change, deploy with caution)
2. Cut over NY Facebook only (lowest stakes — already at cap of 2/day)
3. Activate fill cron in production mode (write real m.post_draft, not shadow) for NY-FB
4. Verify drafts flow through auto-approver → publish queue → publisher
5. Watch for one week: quality, cost, cron success rate, throttle behaviour
6. If clean: extend to NY-IG, NY-LI, then PP across platforms
7. CFW + Invegent later (those have r6_enabled=false anyway)

**Success criteria:** Live slot-driven generation producing publishable content for NY-FB. Cost <$0.50/week for NY-FB alone.

## Phase D — Decommission (estimated 1-2 hours)

**Goal:** Old pipeline removed.

1. Drop `m.seed_and_enqueue_ai_jobs_v1`
2. Decommission cron 11, 64, 65 (already paused; mark for deletion)
3. Update sync_state, decisions log
4. Archive `m.post_seed` (or rename to `m.slot_fill_attempt` per OAQ; v2 lean: rename + extend)

**Success criteria:** Clean codebase. Single source of truth for generation logic.

## Phase E — Evergreen seeding (estimated 3-4 hours, content not engineering)

**Goal:** Evergreen library populated for fallback.

1. NDIS evergreen library — 25 hand-curated items by PK
2. Property evergreen library — 15 items
3. Invegent evergreen library — 10 items (cross-vertical, smaller)
4. Each with title + content_summary + format_keys + use_cooldown_days

**Success criteria:** Library can serve fallback for any vertical+format combination present in client schedules.

## Total

13-21 hours of engineering + 3-4 hours of content. Parallel-able where appropriate. Shadow phase has 5-7 days of calendar elapsed but minimal active work during.

---

# SECTION H — How this design serves the project (objective view)

This section explicitly addresses how the proposed architecture serves the project's stated objectives, written without optimism bias.

The current pipeline's failure mode — supply-driven fan-out producing 15× more drafts than publishable capacity — is a structural error, not a tuning problem. Throwing more crons, smaller batch sizes, or rate caps at the existing fan-out can mask the symptom but cannot eliminate the architectural mismatch. The proposed slot-driven inversion eliminates the root cause: work is generated only when work is needed.

**Objective benefits:**

1. **Cost predictability.** AI calls scale linearly with publishing capacity (slots × week), not with signal volume. As ICE adds clients, costs grow proportionally and predictably. This is a financial accounting requirement, not just an engineering preference — without it, ICE cannot accurately quote managed-service pricing to clients.

2. **Production-time alignment.** The 24-hour lead time is locked specifically because content production beyond text — image generation for carousels, kinetic shorts via Creatomate, avatar videos via HeyGen — requires meaningful elapsed time. A 1-2 hour lead time would force these production steps onto a knife-edge of the slot's publish time. 24h gives the system breathing room to handle production failures gracefully.

3. **Auditability.** Every slot fill produces a `m.slot_fill_attempt` row capturing the pool snapshot at that moment, the gates applied, the policy version, the model version. When a published post performs poorly or is challenged, the system can answer "why this draft for this slot?" with a complete trace. This is foundational for compliance-aware verticals (NDIS especially) and for future engagement-loop tuning.

4. **Observability.** Pool depth as a first-class metric immediately surfaces feed coverage gaps (e.g., Invegent vertical's known Grade D adequacy). The current pipeline hides this behind aggregate "did we publish" health checks. The new architecture makes coverage visible, which makes coverage fixable.

5. **Linear scaling for vertical expansion.** Adding "Aged Care" as a new vertical means adding rows to `t.content_vertical`, registering feeds, and seeding evergreen — not modifying the pipeline code. The architecture treats vertical as a first-class dimension of the pool, not a per-canonical filter applied at runtime.

**Honest constraints:**

1. **The architecture trades noisy efficiency for brittle precision.** The current pipeline's waste is also its safety net — generating 477 drafts means a few good ones land regardless of pool quality. The new pipeline's discipline (one fill per slot) means every miss is visible. The reviewers were unanimous on this. The mitigations (quality gates, evergreen, reuse penalty, retry caps) reduce but do not eliminate the brittleness. If pool quality is genuinely thin for a vertical, the new pipeline surfaces this faster and more painfully than the old one did.

2. **Tuning curve.** Fitness thresholds (0.55, 0.60, 0.65), bundle sizes (1, 2, 3), reuse penalty values (0.10, 0.25, 0.50), title similarity threshold (0.7), look-back windows (5 days for dedup, class-aware for pool), 24h lead time — none of these have empirical validation yet. They are reasoned defaults. The shadow phase exists specifically to tune them against real production. PK's expectation should be 2-4 weeks of post-cutover tuning before defaults stabilise.

3. **Engagement feedback absent at v1.** The fill function picks based on fitness scores from `t.class_format_fitness` — a static matrix. Without engagement back-feed (Phase 2.1 of broader roadmap), the system cannot learn whether its picks actually perform. This is a known gap, not a design flaw, but PK should plan for the engagement loop as an explicit Phase F not an optional enhancement.

4. **Single point of architectural risk.** The fill function is the new R6 — a single function carrying significant complexity (pool query, gates, dedup, reuse penalty, evergreen fallback, audit insert, ai_job insert, slot status updates) inside one transaction. Bugs here have outsized effect. The mitigation is heavy testing in shadow phase, defensive error handling, and an automatic recovery path for stuck-filled-but-no-draft slots. But the function will still be the most operationally dangerous piece of code in ICE post-cutover.

5. **Content production beyond text is out of architecture scope.** This brief addresses how to select the right signal and synthesise the right text. It does not address how the resulting carousel image gets generated, how the video gets rendered, or how the avatar gets recorded. Those workflows already exist as separate concerns; this architecture hands them content briefs to act on.

**Net assessment:** The architecture serves the project's stated objectives — cost discipline, observability, scalability, and production-time alignment — at the cost of higher operational complexity and a tuning period. The cost-benefit is favourable IF PK is willing to invest the 13-21 hours of engineering plus 2-4 weeks of post-cutover tuning. If PK is not willing or the timing is wrong, the minimal-patch alternative (per-slot generation cap + reduced cron frequency in current R6) achieves 80-90% of cost reduction without architectural commitment, and is consistent with deferring this design until first paying client demands it.

The brief does not recommend either path; that decision is reserved to PK.

---

# SECTION I — Open architectural questions (still)

These remain for PK or further reviewer discussion.

| # | Question | Defaults if unanswered |
|---|---|---|
| OAQ1 | Slot horizon: 7d default | 7d locked unless PK objects |
| OAQ2 | Slot promotion cadence: cron 5min vs trigger | 5min cron (simpler) |
| OAQ3 | Evergreen seed source for v1 | Hand-curated |
| OAQ4 | Breaking news insert mechanism | v1: manual SQL by PK; v2: auto-detect |
| OAQ5 | Approval-rejection retry policy | 1 retry then skip |
| OAQ6 | Per-client format preferences | Use t.platform_format_mix_default for v1 |
| OAQ7 | Title similarity threshold tuning | Start at 0.7; tune in shadow |
| OAQ8 | DST cron drift acceptable? | Yes for sweeps; revisit if business-critical |
| OAQ9 | Evergreen as 20-30% baseline mix vs emergency only | Emergency only for v1; revisit for v2 |
| OAQ10 | Throttle migration timing (separate from rest of cutover?) | Bundle with Phase C cutover |

---

# SECTION J — Reading order (if skimming)

If 90 minutes for full read isn't realistic:

1. §1 Framing + §0 Locked decisions table (5 min)
2. §2 Pipeline at a glance (3 min)
3. §A.5 Pool entry trigger + §B.4 Pool query at fill time (10 min)
4. §C.1 Tables (skim, ~10 min)
5. §E Test scenarios — pick 2-3 to walk through mentally (15 min)
6. §H How this design serves the project (10 min)
7. §I Open questions (5 min)

That's ~60 min for the load-bearing material.

---

*End of brief v2. Ready for second-round external pressure-testing.*
