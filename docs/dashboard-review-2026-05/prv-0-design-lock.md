# PRV-0 — Platform Reconciliation Subsystem Design Lock

> **Status**: LOCKED for implementation. Schema, contracts, and cc-NNNN brief boundaries are settled. Implementation briefs reference this document; this document is not re-opened except via explicit round-3 decision.
> **Author**: chat (Claude), 2026-05-09 Sydney
> **Inputs**: round-1 synthesis (D-1..D-20) + round-2 synthesis (D-21..D-23 + audit + reviewer disagreement resolution) + PK Path A confirmation 2026-05-09 + PK cadence-drift-check directive + PK PRV-0 approval 2026-05-09 (commit path + seed authority + cc-0008/cc-0009 sequencing clarification — see §11)
> **Authority**: PRV-1 through PRV-6 implementation cc-NNNN briefs treat this as the design contract. Schema, function names, and table names locked here are stable identifiers downstream.
> **Reading order**: §1 framing → §2 locked decisions → §3 schema (full DDL) → §4 helpers → §5 jobs → §6 matcher → §7 dashboards → §8 cc-NNNN breakdown → §9 verification → §10 risks → §11 PK approvals.
> **Commit path** (PK approved 2026-05-09): `docs/dashboard-review-2026-05/prv-0-design-lock.md` — extends the dashboard review §10 product objects with the reconciliation subsystem.
> **Next implementation deliverable after PRV-0**: `cc-0008` apply brief — `c.client_cadence_rule` table + seed only (no EF deploy, no cron — both deferred to cc-0009 per PK sequencing clarification 2026-05-09).

---

## 1. Framing & authority

The Platform Reconciliation Subsystem is a second pipeline running in parallel to ICE's existing publish pipeline. It answers: **"what actually exists on each external platform right now, and does it match what ICE intended?"**

It does not replace, modify, or block the publish pipeline. It reads from publish-pipeline tables (`m.post_publish`, `m.vw_pipeline_state`, etc.) but only as a data source — never as a control surface.

The design rests on six locked principles:

1. **Expected ≠ Queued** (D-2). Expected publications come from cadence rules, never from the queue. A queue bug must surface as `missing`, not as "everything's fine."
2. **Layered evidence** (round-1 §2.2). Four sources, ranked: ICE publish receipt → platform API observation → manual observation → fuzzy match.
3. **Schema separation** (D-1). New schema `r.*` for reconciliation; `m.*` stays for publish.
4. **Manual capability from day 1** (round-2 §3.3). Manual observation table in PRV-1, basic entry form in PRV-2, full UX in PRV-5.
5. **Deterministic matching only in v1** (D-13). No LLM, no embeddings, no perceptual hashing. Tiers 1–5 are all rule-based.
6. **Cadence-rule consolidation as v1 prerequisite** (D-3). New `c.client_cadence_rule` table introduced in PRV-1 as canonical source for reconciliation. Publish-side migration deferred to PRV-7+. Drift between the two surfaces gets a dedicated check (§5.3, new this brief per PK directive).

What this brief does NOT lock:

- Per-platform observer implementations (PRV-2, PRV-3, PRV-4 cc-NNNN briefs each handle one platform)
- Triage Inbox UX (PRV-5 brief)
- Auto-remediation rules beyond the single `published_not_observed → re-fetch` (PRV-6 brief)
- Webhooks, perceptual hashing, embeddings (deferred to PRV-7+, outside v1)

---

## 2. Locked decision sheet (D-1..D-23, post round-2)

Reference for all downstream cc-NNNN briefs. Any deviation from these requires an explicit round-3 decision and update to this brief.

| ID | Topic | Locked value |
|---|---|---|
| D-1 | Schema separation | New `r.*` schema; reconciliation does not pollute `m.*` |
| D-2 | Expected ≠ queued | Expected derives from cadence rules, never from publish/queue tables |
| D-3 | Cadence source | New `c.client_cadence_rule` table; reconciliation reads it; publish-side reads existing config in v1; publish-side migration in PRV-7+ |
| D-4 | MVP order | Meta → LinkedIn → YouTube, with go/no-go gate after PRV-2 (LI access checks); fallback order is Meta → YouTube → LinkedIn |
| D-5 | Auto-OK threshold | 0.90 confidence required for auto-OK; below = `needs_review` |
| D-6 | Webhooks | Deferred PRV-7+; schema supports `source='webhook'` from day 1 |
| D-7 | Perceptual hashing | Deferred PRV-5+; cryptographic hashing only in v1 |
| D-8 | Auto-remediation | v1 = re-fetch on `published_not_observed` only. No auto-pause. No auto-DELETE. |
| D-9 | Text normalisation | v1: lowercase, strip URLs, remove punctuation (except `#@`), collapse whitespace, SHA-256 |
| D-10 | `published_not_observed` | Distinct delta class; not a sub-reason of `missing` |
| D-11 | Three-colour matrix | Green = OK, yellow = needs_review / observer_failed / auth_likely_broken, red = high-confidence mismatch |
| D-12 | Manual override evidence-additivity | Manual entries never erase API observations; both stay in their respective tables |
| D-13 | LLM + pgvector | Deferred indefinitely; re-evaluate after 30 days real data |
| D-14 (revised → D-23) | Backfill 14d → 7d | Superseded by D-23 |
| D-15 | Publisher receipt audit | CLEARED at 100% capture across all platforms last 30 days (audit run 2026-05-09) |
| D-16 | Time zone | Sydney local for all `*_local_date`; `timestamptz` mapped to date at write time |
| D-17 | Reconciliation surface | Owns its own surface; does not feed `m.chatgpt_review` or other ICE finding tables |
| D-18 | Triage Inbox + matrix | Both ship; matrix in PRV-1, full Inbox in PRV-5 |
| D-19 | `raw_json_history` | jsonb[] capped at 10, with compaction rule (`r.compact_raw_json`); migrate to versions table if avg row > 50KB |
| D-20 | Tolerances | Stored in config table, not hardcoded |
| D-21 | Manual override behaviour | Hard-lock on `resolved_state` while active; matcher continues populating audit fields but cannot overwrite resolved state |
| D-22 | `website` platform | OUT of v1 scope (PK confirm); deferred PRV-7+ |
| D-23 | Backfill | 7 days at PRV-1 launch with `expected_status='backfilled'` flag (PK confirm) |

---

## 3. Schema architecture (full DDL, locked)

All DDL applies via `apply_migration` only (never `execute_sql`) per memory: "apply_migration is the ONLY correct DDL path for c/m/f/t schemas". Same rule applies to the new `r.*` schema.

### 3.1 New schema and grants

```sql
-- cc-0009 first migration step
CREATE SCHEMA IF NOT EXISTS r;

GRANT USAGE ON SCHEMA r TO postgres, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA r TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA r TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA r GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA r GRANT ALL ON TABLES TO service_role;

COMMENT ON SCHEMA r IS 'Platform reconciliation subsystem. Separate from m.* (publish pipeline). Reads from m.* but never writes back. See docs/dashboard-review-2026-05/prv-0-design-lock.md.';
```

### 3.2 `c.client_cadence_rule` (NEW table in existing schema)

Authoritative source of truth for "this client should publish on this platform with this cadence." In PRV-1, only reconciliation reads this. In PRV-7+, publish-side migrates onto it.

```sql
-- cc-0008 migration
CREATE TABLE c.client_cadence_rule (
    cadence_rule_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id              uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform               text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    cadence_type           text NOT NULL CHECK (cadence_type IN ('daily','weekly','monthly','custom_cron','none')),
    posts_per_period       int CHECK (posts_per_period > 0),
    period_unit            text CHECK (period_unit IN ('day','week','month')),
    weekdays               int[] CHECK (weekdays <@ ARRAY[0,1,2,3,4,5,6]),     -- 0=Sun..6=Sat, Sydney local
    preferred_local_hours  int[] CHECK (preferred_local_hours <@ ARRAY(SELECT generate_series(0,23))),
    expected_format        text,                                                -- short | reel | image | linkedin_post | facebook_post | youtube_short | etc
    timezone               text NOT NULL DEFAULT 'Australia/Sydney',
    valid_from             date NOT NULL DEFAULT current_date,
    valid_to               date,
    is_active              boolean NOT NULL DEFAULT true,
    suppression_dates      date[] DEFAULT '{}',                                 -- one-off cancellations
    notes                  text,
    created_at             timestamptz NOT NULL DEFAULT now(),
    created_by             text,
    updated_at             timestamptz NOT NULL DEFAULT now(),
    updated_by             text,
    CONSTRAINT cadence_rule_period_when_count_set CHECK (
        (posts_per_period IS NULL AND period_unit IS NULL)
        OR (posts_per_period IS NOT NULL AND period_unit IS NOT NULL)
    ),
    CONSTRAINT cadence_rule_active_window_valid CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX cadence_rule_active_lookup
    ON c.client_cadence_rule (client_id, platform, is_active)
    WHERE is_active = true;

CREATE INDEX cadence_rule_validity_lookup
    ON c.client_cadence_rule (valid_from, valid_to)
    WHERE is_active = true;

COMMENT ON TABLE c.client_cadence_rule IS 'Canonical cadence rules per (client, platform). Authoritative source for r.expected_publication generation. PRV-1 reconciliation reads this; publish-side reads existing scattered config in v1 and migrates onto this table in PRV-7+.';
```

### 3.3 `r.expected_publication`

What ICE *should have* published. Generated from `c.client_cadence_rule` by the cadence-rule-generator job.

```sql
-- cc-0009 migration
CREATE TABLE r.expected_publication (
    expected_publication_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cadence_rule_id          uuid REFERENCES c.client_cadence_rule(cadence_rule_id) ON DELETE SET NULL,
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    expected_local_date      date NOT NULL,                              -- Sydney local
    expected_window_start    timestamptz NOT NULL,
    expected_window_end      timestamptz NOT NULL,
    scheduled_for            timestamptz,                                -- if a slot exists for this expected row
    slot_id                  uuid,                                       -- soft FK; slot table is in different schema
    expected_format          text,
    expected_title           text,
    expected_caption         text,
    expected_normalised_hash text,                                       -- written by r.normalise_text(expected_caption)
    expected_asset_hash      text,                                       -- cryptographic v1, perceptual PRV-5+
    expected_status          text NOT NULL DEFAULT 'expected'
                             CHECK (expected_status IN (
                                'expected',
                                'cancelled',
                                'suppressed',
                                'skipped',
                                'backfilled',
                                'unknown_pre_prv'
                             )),
    tags                     text[] DEFAULT '{}',
    priority                 int NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    generated_at             timestamptz NOT NULL DEFAULT now(),
    generation_run_id        uuid NOT NULL,                              -- soft FK to r.reconciliation_run
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT expected_window_valid CHECK (expected_window_end > expected_window_start),
    CONSTRAINT expected_unique_per_client_platform_date_rule
        UNIQUE (client_id, platform, expected_local_date, cadence_rule_id)
);

CREATE INDEX expected_pub_lookup
    ON r.expected_publication (client_id, platform, expected_local_date);

CREATE INDEX expected_pub_window_lookup
    ON r.expected_publication (expected_window_start, expected_window_end);

CREATE INDEX expected_pub_active_status
    ON r.expected_publication (expected_status)
    WHERE expected_status IN ('expected','backfilled');

COMMENT ON TABLE r.expected_publication IS 'What ICE was supposed to publish per (client, platform, Sydney-local-date). Generated from c.client_cadence_rule by the cadence-rule-generator Edge Function. Never derived from queue/publish state.';
```

### 3.4 `r.ice_publication_evidence`

What ICE actually did internally. Materialised from `m.vw_pipeline_state` + publish tables.

```sql
-- cc-0010 migration
CREATE TABLE r.ice_publication_evidence (
    ice_evidence_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id  uuid REFERENCES r.expected_publication(expected_publication_id) ON DELETE SET NULL,
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL,
    ai_job_id                uuid,
    post_draft_id            uuid,
    queue_id                 uuid,
    post_publish_id          uuid,
    pipeline_state           text,                                       -- from m.vw_pipeline_state
    draft_status             text,
    queue_status             text,
    publish_status           text,                                       -- 'published'|'failed'|null
    dead_reason              text,
    publisher_response_json  jsonb,
    platform_post_id         text,                                       -- copied from m.post_publish
    platform_permalink       text,
    ice_content_hash         text,                                       -- normalised hash of what ICE generated
    ice_asset_hash           text,
    published_at             timestamptz,
    materialised_at          timestamptz NOT NULL DEFAULT now(),
    materialisation_run_id   uuid NOT NULL,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ice_evidence_expected_lookup
    ON r.ice_publication_evidence (expected_publication_id);

CREATE INDEX ice_evidence_platform_post_id_lookup
    ON r.ice_publication_evidence (platform, platform_post_id)
    WHERE platform_post_id IS NOT NULL;

CREATE INDEX ice_evidence_client_platform_date
    ON r.ice_publication_evidence (client_id, platform, published_at);

COMMENT ON TABLE r.ice_publication_evidence IS 'ICE-side evidence per expected publication: AI job + draft + queue + publish + dead-letter outcome. Materialised from m.vw_pipeline_state and publish tables by ice-evidence-materialiser EF. Strongest evidence layer when platform_post_id is non-null (Tier 1 match anchor).';
```

### 3.5 `r.platform_observation`

External-world evidence. One row per platform post observed, regardless of whether ICE knows about it.

```sql
-- cc-0010 migration
CREATE TABLE r.platform_observation (
    platform_observation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    client_id                uuid REFERENCES c.client(client_id) ON DELETE SET NULL,
    platform_account_id      text NOT NULL,                              -- page_id / ig_user_id / org_urn / channel_id
    platform_post_id         text NOT NULL,
    permalink                text,
    observed_published_at    timestamptz,
    observed_local_date      date,                                       -- Sydney-mapped at write time
    caption_text             text,
    title                    text,
    media_type               text,
    media_url                text,
    thumbnail_url            text,
    external_author_id       text,
    external_author_name     text,
    observed_updated_at      timestamptz,                                -- platform-side last-edit
    raw_json                 jsonb NOT NULL,
    raw_json_history         jsonb[] DEFAULT '{}'                        -- compacted versions, capped at 10
                             CHECK (cardinality(raw_json_history) <= 10),
    engagement_metrics       jsonb,                                      -- like_count, comments_count, etc; populated where free
    visibility               text,                                       -- public | followers | private | unknown
    content_hash             text,                                       -- normalised text hash
    asset_hash               text,                                       -- cryptographic in v1
    hash_version             int NOT NULL DEFAULT 1,
    source                   text NOT NULL CHECK (source IN ('api','manual','publisher_receipt','webhook','imported_csv')),
    ingestion_run_id         uuid NOT NULL,                              -- soft FK to r.reconciliation_run
    observed_at              timestamptz NOT NULL DEFAULT now(),
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, platform_post_id)
);

CREATE INDEX obs_client_platform_date
    ON r.platform_observation (client_id, platform, observed_local_date);

CREATE INDEX obs_published_at
    ON r.platform_observation (platform, observed_published_at DESC);

CREATE INDEX obs_account_lookup
    ON r.platform_observation (platform, platform_account_id);

CREATE INDEX obs_content_hash_lookup
    ON r.platform_observation (platform, content_hash)
    WHERE content_hash IS NOT NULL;

COMMENT ON TABLE r.platform_observation IS 'External evidence: one row per platform post observed. Idempotent via UNIQUE (platform, platform_post_id). On conflict: r.compact_raw_json(old_raw_json) is appended to raw_json_history (capped at 10), then row is updated. Source = api in PRV-2..4; manual + imported_csv in PRV-1; webhook in PRV-7+.';
```

### 3.6 `r.platform_manual_observation`

PK-entered evidence. Operator's word.

```sql
-- cc-0010 migration
CREATE TABLE r.platform_manual_observation (
    manual_observation_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                        uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                         text NOT NULL,
    observed_local_date              date NOT NULL,
    observed_status                  text NOT NULL CHECK (observed_status IN (
                                        'OK',
                                        'missing',
                                        'late',
                                        'duplicate',
                                        'extra',
                                        'wrong-content',
                                        'stale',
                                        'inspection_pending'
                                     )),
    permalink                        text,
    notes                            text,
    screenshot_path                  text,                               -- Supabase Storage path; PRV-5+
    entered_by                       text NOT NULL,
    entered_at                       timestamptz NOT NULL DEFAULT now(),
    expires_at                       timestamptz,                        -- null = never expires until dismissed
    dismissed_at                     timestamptz,
    dismissed_by                     text,
    linked_platform_observation_id   uuid REFERENCES r.platform_observation(platform_observation_id) ON DELETE SET NULL,
    created_at                       timestamptz NOT NULL DEFAULT now(),
    updated_at                       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX manual_obs_active_lookup
    ON r.platform_manual_observation (client_id, platform, observed_local_date)
    WHERE dismissed_at IS NULL;

CREATE INDEX manual_obs_expires_lookup
    ON r.platform_manual_observation (expires_at)
    WHERE expires_at IS NOT NULL AND dismissed_at IS NULL;

COMMENT ON TABLE r.platform_manual_observation IS 'Operator-entered evidence per (client, platform, date). Hard-locks resolved_state on r.reconciliation_match while active (D-21). Dismissed manually or auto-released at expires_at. PRV-1: CSV import; PRV-2: minimal form; PRV-5: full UX with screenshot upload.';
```

### 3.7 `r.reconciliation_match`

The decision record. Joins expected, ICE evidence, and platform observation with confidence + delta class.

```sql
-- cc-0010 migration
CREATE TABLE r.reconciliation_match (
    reconciliation_match_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id   uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    ice_evidence_id           uuid REFERENCES r.ice_publication_evidence(ice_evidence_id) ON DELETE SET NULL,
    platform_observation_id   uuid REFERENCES r.platform_observation(platform_observation_id) ON DELETE SET NULL,
    manual_observation_id     uuid REFERENCES r.platform_manual_observation(manual_observation_id) ON DELETE SET NULL,
    match_status              text NOT NULL CHECK (match_status IN ('OK','needs_review','observer_failed','manually_overridden')),
    delta_class               text NOT NULL CHECK (delta_class IN (
                                'OK',
                                'missing',
                                'late',
                                'duplicate',
                                'extra',
                                'wrong-content',
                                'stale',
                                'published_not_observed',
                                'observer_failed',
                                'needs_review'
                              )),
    confidence                numeric(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    match_method              text NOT NULL,
    match_tiers               jsonb NOT NULL DEFAULT '[]',               -- audit trail: every tier evaluated + score
    explanation               text,                                      -- deterministic string
    expected_time             timestamptz,
    observed_time             timestamptz,
    time_delta_minutes        int,
    content_similarity        numeric(4,3),
    asset_similarity          numeric(4,3),
    resolved_state            text NOT NULL DEFAULT 'open' CHECK (resolved_state IN (
                                'open',
                                'resolved',
                                'manually_overridden_OK',
                                'manually_overridden_wrong_content',
                                'manually_overridden_missing',
                                'manually_overridden_late',
                                'manually_overridden_duplicate',
                                'manually_overridden_extra',
                                'manually_overridden_stale'
                              )),
    matched_at                timestamptz NOT NULL DEFAULT now(),
    matcher_run_id            uuid NOT NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX match_expected_lookup
    ON r.reconciliation_match (expected_publication_id);

CREATE INDEX match_status_lookup
    ON r.reconciliation_match (match_status, delta_class);

CREATE INDEX match_resolved_state_open
    ON r.reconciliation_match (resolved_state)
    WHERE resolved_state = 'open';

CREATE INDEX match_inbox_lookup
    ON r.reconciliation_match (matched_at DESC)
    WHERE match_status IN ('needs_review','observer_failed');

COMMENT ON TABLE r.reconciliation_match IS 'Decision record per expected publication. confidence + delta_class are matcher output; resolved_state is the dashboard-displayed status (hard-locked while a manual override is active per D-21). match_tiers retains full audit trail: each tier evaluated with its score, even if it didn''t win.';
```

### 3.8 `r.reconciliation_run`

Audit trail for every observer / matcher / generator / drift-checker invocation.

```sql
-- cc-0009 migration
CREATE TABLE r.reconciliation_run (
    reconciliation_run_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type               text NOT NULL CHECK (run_type IN (
                                'cadence_generation',
                                'ice_evidence_materialisation',
                                'observer_facebook',
                                'observer_instagram',
                                'observer_linkedin',
                                'observer_youtube',
                                'matcher',
                                'cadence_drift_check',
                                'manual_csv_import',
                                'backfill'
                            )),
    trigger                text NOT NULL CHECK (trigger IN ('scheduled','manual','backfill','event_driven')),
    window_start           timestamptz,
    window_end             timestamptz,
    platforms              text[] DEFAULT '{}',
    clients                uuid[] DEFAULT '{}',
    status                 text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','partial','failed')),
    started_at             timestamptz NOT NULL DEFAULT now(),
    finished_at            timestamptz,
    rows_processed         int DEFAULT 0,
    rows_inserted          int DEFAULT 0,
    rows_updated           int DEFAULT 0,
    rows_skipped           int DEFAULT 0,
    error_json             jsonb,
    summary_json           jsonb,
    triggered_by           text                                          -- pg_cron job name | edge function | manual user
);

CREATE INDEX recon_run_type_status
    ON r.reconciliation_run (run_type, status, started_at DESC);

CREATE INDEX recon_run_recent
    ON r.reconciliation_run (started_at DESC);

COMMENT ON TABLE r.reconciliation_run IS 'Audit trail for every reconciliation pipeline invocation. Every job writes one row at start (status=running) and updates it at finish (status=succeeded|partial|failed). Used for debugging "why is yesterday still showing missing?" investigations.';
```

### 3.9 `r.platform_observer_health`

Per-platform-account health state. Drives yellow vs red distinction in matrix.

```sql
-- cc-0010 migration
CREATE TABLE r.platform_observer_health (
    observer_health_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform                  text NOT NULL,
    client_id                 uuid REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform_account_id       text NOT NULL,
    last_success_at           timestamptz,
    last_attempt_at           timestamptz,
    last_error_at             timestamptz,
    last_error_code           text,
    last_error_message        text,
    consecutive_failures      int NOT NULL DEFAULT 0,
    auth_status               text NOT NULL DEFAULT 'unknown' CHECK (auth_status IN (
                                'healthy','expiring_soon','expired','unauthorized','unknown'
                              )),
    rate_limit_status         text NOT NULL DEFAULT 'unknown' CHECK (rate_limit_status IN (
                                'within_limits','approaching_limit','rate_limited','unknown'
                              )),
    last_seen_post_at         timestamptz,
    staleness_state           text,                                      -- derived: ok | watch | stale | very_stale
    next_retry_at             timestamptz,
    updated_at                timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, platform_account_id)
);

CREATE INDEX observer_health_unhealthy
    ON r.platform_observer_health (platform, auth_status)
    WHERE auth_status NOT IN ('healthy','unknown');

COMMENT ON TABLE r.platform_observer_health IS 'Per-(platform, account) health state. When auth_status NOT IN (healthy, unknown), reconciliation classifies affected expected rows as observer_failed (not missing) — prevents false alarms when a token expires.';
```

### 3.10 `r.cadence_drift_log` (NEW per PK directive)

Periodic comparison of `c.client_cadence_rule` predictions vs publish-side actual behaviour. Surfaces divergence between the new canonical source and the existing scattered config during the dual-source state.

```sql
-- cc-0011 migration
CREATE TABLE r.cadence_drift_log (
    cadence_drift_log_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    drift_check_run_id       uuid NOT NULL,                              -- soft FK to r.reconciliation_run (run_type='cadence_drift_check')
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL,
    check_local_date         date NOT NULL,                              -- Sydney local; the date being compared
    horizon_days             int NOT NULL,                               -- 0 = today, 1 = tomorrow, etc
    rule_predicted_publish   boolean NOT NULL,                           -- per c.client_cadence_rule
    slot_predicted_publish   boolean NOT NULL,                           -- per slot table (if a slot exists for that date)
    profile_predicted_publish boolean NOT NULL,                          -- per c.client_publish_profile interpretation
    rule_predicted_format    text,
    slot_predicted_format    text,
    profile_predicted_format text,
    divergence               boolean NOT NULL,                           -- true if predictions disagree
    divergence_class         text CHECK (divergence_class IN (
                                'rule_only',                             -- rule says yes, slot+profile say no
                                'slot_only',                             -- slot says yes, rule+profile say no
                                'profile_only',                          -- profile says yes, rule+slot say no
                                'rule_slot_disagree_with_profile',
                                'rule_profile_disagree_with_slot',
                                'slot_profile_disagree_with_rule',
                                'format_mismatch',                       -- all agree on day but disagree on format
                                'no_divergence'
                              )),
    divergence_reason        text,
    raw_predictions_json     jsonb NOT NULL,                             -- full prediction tuple for debugging
    detected_at              timestamptz NOT NULL DEFAULT now(),
    acknowledged_at          timestamptz,
    acknowledged_by          text,
    resolution_note          text,
    UNIQUE (drift_check_run_id, client_id, platform, check_local_date, horizon_days)
);

CREATE INDEX cadence_drift_open_lookup
    ON r.cadence_drift_log (client_id, platform, check_local_date)
    WHERE divergence = true AND acknowledged_at IS NULL;

CREATE INDEX cadence_drift_recent
    ON r.cadence_drift_log (detected_at DESC)
    WHERE divergence = true;

COMMENT ON TABLE r.cadence_drift_log IS 'Drift check between c.client_cadence_rule (new canonical source) and publish-side existing config (slot table + c.client_publish_profile). Runs daily across a 7-day horizon. Divergence rows are open until acknowledged. Zero open divergences = rule is faithful; non-zero = either rule is wrong (reconciliation will be wrong) OR existing config has special-case behaviour the rule missed (rule needs updating). Critical guardrail during PRV-1..PRV-6 dual-source state.';
```

### 3.11 Materialised views

```sql
-- cc-0011 migration
CREATE MATERIALIZED VIEW r.vw_reconciliation_daily AS
SELECT
    e.client_id,
    cli.client_slug,
    e.platform,
    e.expected_local_date,
    count(*) FILTER (WHERE e.expected_status IN ('expected','backfilled')) AS expected_count,
    count(ice.ice_evidence_id) FILTER (WHERE ice.publish_status = 'published') AS ice_published_count,
    count(po.platform_observation_id) AS observed_count,
    count(rm.reconciliation_match_id) FILTER (WHERE rm.match_status = 'OK') AS ok_count,
    count(rm.reconciliation_match_id) FILTER (WHERE rm.match_status = 'needs_review') AS needs_review_count,
    count(rm.reconciliation_match_id) FILTER (WHERE rm.delta_class = 'observer_failed') AS observer_failed_count,
    count(rm.reconciliation_match_id) FILTER (WHERE rm.delta_class IN ('missing','wrong-content','duplicate','extra','published_not_observed','stale','late')) AS mismatch_count,
    array_agg(DISTINCT rm.delta_class) FILTER (WHERE rm.delta_class IS NOT NULL) AS delta_classes
FROM r.expected_publication e
LEFT JOIN c.client cli ON cli.client_id = e.client_id
LEFT JOIN r.ice_publication_evidence ice ON ice.expected_publication_id = e.expected_publication_id
LEFT JOIN r.reconciliation_match rm ON rm.expected_publication_id = e.expected_publication_id
LEFT JOIN r.platform_observation po ON po.platform_observation_id = rm.platform_observation_id
GROUP BY e.client_id, cli.client_slug, e.platform, e.expected_local_date;

CREATE UNIQUE INDEX vw_recon_daily_pk
    ON r.vw_reconciliation_daily (client_id, platform, expected_local_date);

COMMENT ON MATERIALIZED VIEW r.vw_reconciliation_daily IS 'One row per (client, platform, Sydney-local-date) summarising reconciliation state. Refreshed by matcher EF after each successful run. Backs the daily matrix dashboard surface.';

-- vw_stale_accounts and vw_needs_review_inbox specs in §7
```

### 3.12 `k.column_registry` / `k.table_registry` doc-catalog plan

Per memory ("k.column_registry has no schema_name/table_name columns — joins must go through k.table_registry on table_id; correct table-level doc column is purpose"), each new `r.*` table gets:

1. A `k.table_registry` row with `purpose` populated (the same text as the `COMMENT ON TABLE`)
2. A `k.column_registry` row per column with column-purpose populated

Population is part of the cc-NNNN brief that creates the table. cc-0008 covers `c.client_cadence_rule`; cc-0009 covers `r.expected_publication` + `r.reconciliation_run`; cc-0010 covers `r.ice_publication_evidence` + `r.platform_observation` + `r.platform_manual_observation` + `r.reconciliation_match` + `r.platform_observer_health`; cc-0011 covers `r.cadence_drift_log` + materialised views.

---

## 4. Helper functions (locked signatures)

### 4.1 `r.normalise_text(input text) returns text`

Locked algorithm per D-9. SHA-256 of normalised string.

```sql
-- cc-0009 migration (alongside r.expected_publication, since it's used in expected_normalised_hash population)
CREATE OR REPLACE FUNCTION r.normalise_text(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
    s text;
BEGIN
    IF input IS NULL THEN RETURN NULL; END IF;
    s := lower(input);
    s := regexp_replace(s, 'https?://\S+', '<URL>', 'g');
    s := regexp_replace(s, '[^[:alnum:][:space:]#@<>]', '', 'g');
    s := regexp_replace(s, '\s+', ' ', 'g');
    s := trim(s);
    RETURN encode(digest(s, 'sha256'), 'hex');
END;
$$;

COMMENT ON FUNCTION r.normalise_text(text) IS 'v1 text normalisation per D-9: lowercase + strip URLs (replace with <URL>) + remove punctuation (preserve #@<>) + collapse whitespace + SHA-256 hex. IMMUTABLE so safe in expressions and indexes.';
```

Requires `pgcrypto` extension (already present per existing schema).

### 4.2 `r.to_sydney_local_date(ts timestamptz) returns date`

Sydney mapping at write time per D-16.

```sql
-- cc-0009 migration
CREATE OR REPLACE FUNCTION r.to_sydney_local_date(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT (ts AT TIME ZONE 'Australia/Sydney')::date;
$$;

COMMENT ON FUNCTION r.to_sydney_local_date(timestamptz) IS 'Maps timestamptz to Sydney-local calendar date. Used by observers to populate observed_local_date at write time so the date is fixed regardless of query-time timezone.';
```

### 4.3 `r.compact_raw_json(j jsonb) returns jsonb`

Strips bulky fields before pushing to `raw_json_history` per D-19.

```sql
-- cc-0010 migration
CREATE OR REPLACE FUNCTION r.compact_raw_json(j jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
    excluded_keys text[] := ARRAY['comments','reactions','insights','metrics','attachments_data','media_data','thumbnails','base64_data'];
    result jsonb;
    key text;
BEGIN
    IF j IS NULL THEN RETURN NULL; END IF;
    result := j;
    FOREACH key IN ARRAY excluded_keys LOOP
        IF result ? key THEN
            result := result - key;
        END IF;
    END LOOP;
    -- Drop any value that's a long string (>10KB) — likely binary or oversize text
    SELECT jsonb_object_agg(k, v)
    INTO result
    FROM jsonb_each(result) AS kv(k, v)
    WHERE NOT (jsonb_typeof(v) = 'string' AND length(v::text) > 10240);
    RETURN result;
END;
$$;

COMMENT ON FUNCTION r.compact_raw_json(jsonb) IS 'Strips bulky fields from raw_json before pushing to raw_json_history per D-19. Excludes comments, reactions, insights, metrics, attachments_data, media_data, thumbnails, base64_data, and any field with a string value >10KB. Keeps all small text fields and metadata. Tunable via excluded_keys array.';
```

---

## 5. Edge Function specs

All Edge Functions follow the same pattern: write a row to `r.reconciliation_run` at start, do work, update the row at end. JWT-verify is set per `supabase/config.toml` (per recent v2.54 + v2.58 lessons — never inherit JWT settings).

### 5.1 `cadence-rule-generator`

Reads `c.client_cadence_rule`, generates `r.expected_publication` rows for the next N days.

| Aspect | Spec |
|---|---|
| Trigger | pg_cron daily at 02:00 Sydney + on-demand via RPC |
| Reads | `c.client_cadence_rule` (active rules); `r.expected_publication` (existing rows for dedup) |
| Writes | `r.expected_publication` (insert new rows); `r.reconciliation_run` (audit) |
| Horizon | 7 days forward at PRV-1 launch (D-23) + 7 days backfill at first run only |
| Idempotency | UNIQUE constraint on (client_id, platform, expected_local_date, cadence_rule_id) — INSERT ... ON CONFLICT DO NOTHING |
| Verify_jwt | `false` (custom-header internal cron pattern) |
| Config.toml | Must add `[functions.cadence-rule-generator] verify_jwt = false` per v2.54 lesson |

Pseudocode:

```
fn cadence_rule_generator(horizon_days: int = 7, backfill: bool = false) {
  run_id = insert into r.reconciliation_run(run_type='cadence_generation', trigger='scheduled', status='running');
  rules = select * from c.client_cadence_rule where is_active=true and (valid_to is null or valid_to >= current_date);
  for rule in rules {
    horizon_dates = compute_dates_for_rule(rule, horizon_days, backfill);
    for date in horizon_dates {
      if date in rule.suppression_dates: continue;
      if not rule_says_publish_on(rule, date): continue;
      window = compute_window(rule, date);
      insert into r.expected_publication(...) values (...) on conflict do nothing;
    }
  }
  update r.reconciliation_run set status='succeeded', finished_at=now(), summary_json={...} where reconciliation_run_id=run_id;
}
```

`compute_dates_for_rule` and `rule_says_publish_on` are the real logic — they handle weekly cadences, custom_cron schedules, weekday filters, etc. Implementation detail in cc-0008.

### 5.2 `ice-evidence-materialiser`

Reads pipeline state, populates `r.ice_publication_evidence`.

| Aspect | Spec |
|---|---|
| Trigger | pg_cron every 30 minutes |
| Reads | `m.vw_pipeline_state`, `m.post_draft`, `m.post_publish_queue`, `m.post_publish`, `r.expected_publication` |
| Writes | `r.ice_publication_evidence` (upsert by `expected_publication_id`); `r.reconciliation_run` |
| Match-back | Joins ICE pipeline rows to expected via slot_id (when available) or (client_id, platform, scheduled_for date) |
| Verify_jwt | `false` |

Pseudocode:

```
fn ice_evidence_materialiser() {
  run_id = create_run('ice_evidence_materialisation');
  recent_expected = select * from r.expected_publication
    where expected_local_date >= current_date - interval '8 days' and expected_status in ('expected','backfilled');
  for ep in recent_expected {
    pipeline_row = find_matching_pipeline_row(ep);  // by slot_id, then by date+client+platform
    if pipeline_row is null: continue;  // no ICE attempt yet
    upsert into r.ice_publication_evidence(expected_publication_id, ...) values (...);
  }
  finalise_run(run_id);
}
```

### 5.3 `cadence-drift-checker` (NEW — PK directive)

Compares cadence rule predictions vs slot/profile predictions. Writes to `r.cadence_drift_log`.

| Aspect | Spec |
|---|---|
| Trigger | pg_cron daily at 03:00 Sydney (after cadence-rule-generator at 02:00) |
| Reads | `c.client_cadence_rule`, slot table, `c.client_publish_profile`, `c.client_ai_profile` |
| Writes | `r.cadence_drift_log`; `r.reconciliation_run` (run_type='cadence_drift_check') |
| Horizon | 7 days forward |
| Verify_jwt | `false` |

Algorithm:

```
fn cadence_drift_checker(horizon_days: int = 7) {
  run_id = create_run('cadence_drift_check');
  for client in active_clients() {
    for platform in active_platforms_for(client) {
      for d in 0..horizon_days {
        check_date = current_date + d * interval '1 day';
        rule_pred = rule_predicted_publish(client, platform, check_date);   // reads c.client_cadence_rule
        slot_pred = slot_predicted_publish(client, platform, check_date);   // reads slot table
        profile_pred = profile_predicted_publish(client, platform, check_date);  // reads c.client_publish_profile + ai_profile

        all_agree = (rule_pred.publish == slot_pred.publish == profile_pred.publish)
                     and (rule_pred.format == slot_pred.format == profile_pred.format);

        if all_agree:
          divergence = false;
          divergence_class = 'no_divergence';
        else:
          divergence = true;
          divergence_class = classify_divergence(rule_pred, slot_pred, profile_pred);

        insert into r.cadence_drift_log(...) values (...);
      }
    }
  }
  finalise_run(run_id, summary={open_divergences: count_open(...)});
}
```

Acceptance criteria for the drift checker (success metrics for the dual-source state):

- After PRV-1 launch + 7 days, expected open divergences = 0. Non-zero indicates either (a) cadence rule needs updating to match existing publish-side behaviour (rule is wrong) or (b) existing publish-side has bugs the rule correctly predicts (rule is right; publish-side is wrong). Either way the drift log surfaces it.
- During PRV-7+ migration of publish-side onto `c.client_cadence_rule`, drift count can be tracked over time as the migration proceeds — when drift hits sustained zero, migration is functionally complete.

Surfaces in dashboard NOW tab as a small tile: "Cadence drift: N open" with click-through to the drift log. If N > 0 in NOW, operator investigates.

### 5.4 `reconciliation-matcher`

Joins evidence sources, classifies, writes match decisions.

| Aspect | Spec |
|---|---|
| Trigger | pg_cron every 30 minutes (offset from materialiser by 15 min) |
| Reads | `r.expected_publication`, `r.ice_publication_evidence`, `r.platform_observation`, `r.platform_manual_observation`, `r.platform_observer_health` |
| Writes | `r.reconciliation_match`; `r.reconciliation_run`; refreshes `r.vw_reconciliation_daily` |
| Tier order | Per §6 below |
| Verify_jwt | `false` |

Pseudocode in §6.

### 5.5 Platform observer interface (PRV-2/3/4)

Common shape every platform observer implements:

```
interface PlatformObserver {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'youtube';
  observe(account: PlatformAccount, since: timestamptz, until: timestamptz): ObservationBatch;
  health_check(account: PlatformAccount): HealthState;
}
```

Each observer:

1. Creates a `r.reconciliation_run` row with `run_type='observer_<platform>'`
2. Updates `r.platform_observer_health` for the (platform, account) pair
3. Calls platform API with windowing + pagination
4. For each post returned: upserts into `r.platform_observation` (on conflict: push old `r.compact_raw_json(raw_json)` to `raw_json_history` capped at 10, then update fields)
5. Finalises run

Per-platform implementations in cc-0012 (Meta), cc-0013 (LinkedIn or YouTube), cc-0014 (the other one).

---

## 6. Matching engine specification

### 6.1 Tier hierarchy (locked)

| Tier | Rule | Confidence |
|---|---|---|
| 1 | `r.platform_observation.platform_post_id == r.ice_publication_evidence.platform_post_id` | 1.000 |
| 2 | `r.platform_observation.permalink == r.ice_publication_evidence.platform_permalink` | 0.980 |
| 3 | Same `(client_id, platform)` + `observed_published_at` within `expected_window_start..expected_window_end + tolerance` AND `r.platform_observation.content_hash == r.expected_publication.expected_normalised_hash` | 0.950 |
| 4 | Same `(client_id, platform, expected_local_date)` AND text similarity (Jaro-Winkler on caption_text vs expected_caption) ≥ 0.80 | 0.750 |
| 5 | Asset hash match (cryptographic v1; perceptual PRV-5+) | 0.850 |
| Manual | `r.platform_manual_observation.linked_platform_observation_id` set explicitly | 0.950 |

Auto-OK: confidence ≥ 0.90 AND time within tolerance AND no active manual override of conflicting status.

Pseudocode for matcher per expected row:

```
fn classify_expected(ep: ExpectedPublication) -> ReconciliationMatch {
  active_override = find_active_manual_override(ep.client_id, ep.platform, ep.expected_local_date);
  if active_override:
    return match_record_locked_by_override(ep, active_override);

  ice_evidence = find_ice_evidence(ep);
  observer_health = find_observer_health(ep.platform, ep.client_id);

  if observer_health.auth_status not in ('healthy','unknown'):
    return classify_observer_failed(ep, ice_evidence, observer_health);

  obs_candidates = find_observation_candidates(ep);  // by date, client, platform

  // Tier 1
  if ice_evidence and ice_evidence.platform_post_id:
    obs = find_obs_by_platform_post_id(ice_evidence.platform_post_id);
    if obs: return classify_match(ep, ice_evidence, obs, tier=1, confidence=1.000);

  // Tier 2
  if ice_evidence and ice_evidence.platform_permalink:
    obs = find_obs_by_permalink(ice_evidence.platform_permalink);
    if obs: return classify_match(ep, ice_evidence, obs, tier=2, confidence=0.980);

  // Tier 3
  for obs in obs_candidates:
    if obs.observed_published_at within window(ep) + tolerance(platform)
       and obs.content_hash == ep.expected_normalised_hash:
      return classify_match(ep, ice_evidence, obs, tier=3, confidence=0.950);

  // Tier 4
  for obs in obs_candidates:
    if obs.observed_local_date == ep.expected_local_date:
      sim = jaro_winkler(obs.caption_text, ep.expected_caption);
      if sim >= 0.80:
        return classify_match(ep, ice_evidence, obs, tier=4, confidence=0.750, content_similarity=sim);

  // Tier 5 (asset hash) — only if Tier 4 didn't match
  if ep.expected_asset_hash:
    obs = find_obs_by_asset_hash(ep.expected_asset_hash);
    if obs: return classify_match(ep, ice_evidence, obs, tier=5, confidence=0.850);

  // No match found → classify the gap
  return classify_no_match(ep, ice_evidence, obs_candidates);
}
```

### 6.2 Delta classification rules (locked)

| Class | Rule (deterministic) |
|---|---|
| `OK` | Match found (any tier), confidence ≥ 0.90, time within tolerance, content matches |
| `late` | Match found, confidence ≥ 0.85, but `observed_published_at > expected_window_end` within tolerance (FB/IG/YT: 2h; LI: 4h) |
| `missing` | Expected row exists, no platform observation, no successful ICE publish receipt with platform_post_id |
| `published_not_observed` | Expected row exists, ICE publish receipt has non-null platform_post_id, no platform observation matches |
| `wrong-content` | Same client/platform/date, observation exists, but normalised content hash mismatch AND text similarity < 0.50 |
| `duplicate` | More than one observation maps to the same expected row (Tier 1 or Tier 2 collision) |
| `extra` | Observation exists with no matching expected row |
| `stale` | No observation for client/platform within cadence threshold |
| `observer_failed` | Observer health row indicates auth/rate-limit/network failure for the (platform, account) and the failure window covers the expected row's check time |
| `needs_review` | Match confidence in 0.50..0.89 OR observation exists but no clear classification rule applies |

### 6.3 Tolerance defaults (config table)

```sql
-- cc-0010 migration
CREATE TABLE r.matcher_config (
    config_key       text PRIMARY KEY,
    config_value     jsonb NOT NULL,
    description      text,
    updated_at       timestamptz NOT NULL DEFAULT now(),
    updated_by       text
);

INSERT INTO r.matcher_config (config_key, config_value, description) VALUES
  ('late_tolerance_minutes',
   '{"facebook":120,"instagram":120,"linkedin":240,"youtube":120}',
   'Minutes after expected_window_end before late triggers'),
  ('stale_threshold_days_default',
   '7',
   'Default stale threshold when expected cadence is unknown'),
  ('text_similarity_match_threshold',
   '0.80',
   'Tier 4 minimum Jaro-Winkler score to consider a match'),
  ('text_similarity_wrong_content_threshold',
   '0.50',
   'Below this, with same date+client+platform, classify as wrong-content'),
  ('auto_ok_confidence_threshold',
   '0.90',
   'Per D-5: minimum confidence for match_status=OK'),
  ('needs_review_confidence_band',
   '{"min":0.50,"max":0.89}',
   'Confidence range routed to needs_review');
```

### 6.4 Manual override interaction (D-21 hard lock)

When `r.platform_manual_observation` has a row where:

```
client_id = ep.client_id
AND platform = ep.platform
AND observed_local_date = ep.expected_local_date
AND dismissed_at IS NULL
AND (expires_at IS NULL OR expires_at > now())
```

…the matcher:

1. Still computes confidence + delta_class + match_tiers (audit trail)
2. Sets `match_status = 'manually_overridden'`
3. Sets `resolved_state = 'manually_overridden_<status>'` based on the manual row's `observed_status`
4. Stores the manual_observation_id on the match row

Operator dismisses override → next matcher run resumes authority. Override expires → next matcher run reclassifies.

---

## 7. Dashboard surfaces

### 7.1 Daily matrix view (PRV-1)

Path: `/reconciliation/matrix?date=YYYY-MM-DD` (default = today)

Columns: `Client | Platform | Expected | ICE produced | ICE published | Observed | Status | Evidence`

Rows: one per (client × platform) for the selected date. Status cell colour-coded per D-11:

- Green: status = OK
- Yellow: status in (needs_review, observer_failed, manually_overridden_OK) OR observer health = expiring_soon/expired
- Red: status in (missing, wrong-content, duplicate, extra, published_not_observed, stale) AND not manually-overridden

Backfilled rows have a grey border (D-23 visual cue).

Click cell → drilldown.

### 7.2 Drilldown panel

Side panel showing for the clicked (client, platform, date):

- Expected row (full content)
- ICE evidence (ai_job → draft → queue → publish + dead_reason if any)
- Platform observation (if any) with permalink, raw_json compact view, edit history
- Match record: confidence, all tiers evaluated (`match_tiers` jsonb expanded), explanation
- Manual override (if any) with notes, expiry, dismiss button
- Action buttons: Mark OK, Mark wrong-content, Attach permalink, Dismiss override (gated by override existence)

### 7.3 Minimal manual entry form (PRV-2)

Path: `/reconciliation/manual/new`

Five fields:

1. Client (dropdown of active clients)
2. Platform (dropdown: facebook, instagram, linkedin, youtube)
3. Observed local date (date picker, default today)
4. Observed status (dropdown of D-21 enum values)
5. Notes (textarea)

Optional: permalink (text), expires_at (date, default null = never).

Submit → INSERT INTO `r.platform_manual_observation`. No screenshot upload in PRV-2; that's PRV-5.

### 7.4 Triage Inbox (PRV-5)

Path: `/reconciliation/inbox`

Shows all `r.reconciliation_match` rows where `resolved_state = 'open' AND match_status != 'OK'`, sorted by `matched_at DESC`. Bulk action buttons (mark resolved, attach manual observation, etc.).

Backed by `r.vw_needs_review_inbox` materialised view.

### 7.5 Cadence drift visibility

NOW dashboard tab gets a small tile: "Cadence drift: N open" — clicks through to `/reconciliation/drift?status=open`. List view of `r.cadence_drift_log` rows with `divergence=true AND acknowledged_at IS NULL`. Each row shows the three predictions side-by-side. Acknowledge button updates `acknowledged_at + acknowledged_by + resolution_note`.

If N=0 sustained for 14 days, the tile turns green and the rule-vs-publish-side dual-source state is functionally validated.

---

## 8. PRV-1 cc-NNNN brief breakdown

PRV-1 is composed of four cc-NNNN apply briefs, executed in dependency order. Each is a standard apply brief with §1 pre-flight, §2 D-01 fire context, §3 SQL, §4 verification, §8 HALT criteria — same shape as cc-0003..cc-0007.

### 8.1 cc-0008 — `c.client_cadence_rule` table + seed (DDL + DML only)

| Aspect | Detail |
|---|---|
| Schemas touched | `c.*`, `k.*` (registry rows for new table + columns) |
| DDL | `c.client_cadence_rule` table + indexes + comment |
| Seed | One row per active (client × platform) pair, derived from current `c.client_publish_profile` + `c.client_ai_profile` interpretation by chat (committed to brief as exact INSERT statements). PK reviews seed before D-01 fires (per PK approval 2026-05-09). |
| EF deploy | NONE in cc-0008. `cadence-rule-generator` Edge Function is deferred to cc-0009 per PK sequencing clarification 2026-05-09 — no live generator execution until `r.reconciliation_run` exists for audit. |
| Cron | NONE in cc-0008. Cron setup deferred to cc-0009. |
| Verification | V1 table exists with all FKs, CHECKs, and indexes; V2 row count of seeded cadence rules matches the chat-authored expectation (one per active client × platform); V3 every active (client × platform) pair has at least one seeded rule; V4 no NULL in required columns; V5 `valid_from <= valid_to` invariant holds where both set; V6 `k.table_registry` + `k.column_registry` rows populated for the new table |
| HALT criterion | None specific to sequencing (resolved by PK clarification — no EF/cron in cc-0008, so no chicken/egg) |
| D-01 action_type | `sql_destructive` (DDL + DML for table + seed) — likely 1 fire |
| Estimated effort | ~1–2 sessions (apply brief authoring + apply + verify; simpler than original cc-0008 scope) |

### 8.2 cc-0009 — `r.*` schema + `r.reconciliation_run` + `r.expected_publication` + helper functions + generator EF deploy + first backfill + cron enable

| Aspect | Detail |
|---|---|
| Schemas touched | NEW `r.*` schema; `k.*` (registry) |
| DDL | Schema creation + grants; `r.reconciliation_run`; `r.expected_publication`; functions `r.normalise_text`, `r.to_sydney_local_date` |
| EF deploy | `cadence-rule-generator` Edge Function + `supabase/config.toml` entry (`verify_jwt=false`) — moved from cc-0008 to cc-0009 per PK sequencing clarification 2026-05-09. EF source committed to repo, deployed via `supabase functions deploy cadence-rule-generator --no-verify-jwt` per v2.54+v2.58 lesson. |
| Cron | Add daily 02:00 Sydney via pg_cron — **enabled at end of cc-0009 only after the first manual generator invocation succeeds** (gated on V5 PASS below). |
| Initial population | After DDL applied + EF deployed, run `cadence-rule-generator` once with `backfill=true` and `trigger='manual'` → writes one `r.reconciliation_run` row (status progressing running → succeeded) + populates 7 days backward + 7 days forward in `r.expected_publication` per D-23. Cron enable follows only if the manual invocation completes cleanly. |
| Verification | V1 schema `r` exists with grants per §3.1; V2 `r.reconciliation_run` + `r.expected_publication` exist with all FKs, CHECKs, indexes; V3 helper functions exist and pass spot-check tests (e.g., `r.normalise_text('Hello world')` deterministic; `r.to_sydney_local_date('2026-05-09T15:00:00Z')` returns `2026-05-10`); V4 EF deploys successfully with `verify_jwt=false` confirmed via gateway response; V5 manual generator invocation writes exactly one `r.reconciliation_run` row with `run_type='cadence_generation'` + `trigger='manual'` + `status='succeeded'`; V6 `r.expected_publication` populated with ~70–100 rows after backfill (4 active clients × ~4 platforms × ~14 days × cadence factor); V7 `expected_status='backfilled'` correctly applied to past-dated rows; V8 unique constraint enforced (no duplicate `(client_id, platform, expected_local_date, cadence_rule_id)` tuples); V9 cron job enabled with `active=true` and schedule `0 16 * * *` UTC (= 02:00 Sydney AEST/AEDT — confirm exact UTC offset at apply time); V10 `k.table_registry` + `k.column_registry` rows populated |
| HALT criterion | If V5 fails (manual generator invocation does not produce a clean `succeeded` audit row), do not enable cron. Cron enable is gated. |
| D-01 action_type | `sql_destructive` (DDL) + `ef_deploy` + `cron_edit` — likely 3 fires (DDL pre-flight; EF deploy after DDL applied; cron edit after manual generator run succeeds) |
| Estimated effort | ~2–3 sessions (apply brief authoring + 3 apply phases + verify) |

### 8.3 cc-0010 — `r.platform_observation` + `r.platform_manual_observation` + `r.ice_publication_evidence` + `r.reconciliation_match` + `r.platform_observer_health` + `r.matcher_config` + ICE evidence materialiser + manual observation CSV import + matcher EF v0 (manual + Tier 1 only)

| Aspect | Detail |
|---|---|
| DDL | All 6 remaining tables + helper function `r.compact_raw_json` |
| EF deploy | `ice-evidence-materialiser` (cron every 30 min); `reconciliation-matcher` v0 (cron every 30 min, offset 15 min); `manual-observation-csv-import` (one-shot RPC) |
| Initial population | Load PK's 13 seed manual observations from 2026-05-09 via CSV import |
| Matcher v0 | Tier 1 + manual override only — no Tier 3/4/5 yet (those wait for observers in PRV-2+) |
| Verification | V1..V6 table existence + FKs; V7 13 manual observations loaded; V8 ICE evidence materialiser populates `r.ice_publication_evidence` for backfilled expected rows; V9 matcher v0 produces `manually_overridden` rows for the 13 seeds; V10 matcher_config seeded |
| D-01 action_type | `sql_destructive` + `ef_deploy` × 3 + `cron_edit` × 2 — likely 4 fires |
| Estimated effort | ~3 sessions |

### 8.4 cc-0011 — `r.cadence_drift_log` + `cadence-drift-checker` EF + materialised views + matrix view

| Aspect | Detail |
|---|---|
| DDL | `r.cadence_drift_log`; mat views `r.vw_reconciliation_daily`, `r.vw_stale_accounts`, `r.vw_needs_review_inbox` |
| EF deploy | `cadence-drift-checker` (cron daily 03:00 Sydney) |
| Dashboard | New `/reconciliation/matrix` page in invegent-dashboard reading `r.vw_reconciliation_daily`; new `/reconciliation/drift` page reading `r.cadence_drift_log` |
| Verification | V1 drift log table exists; V2 mat views refresh successfully; V3 first drift checker run produces ≤ 0 open divergences (or at most a small number with PK acknowledgement); V4 matrix page renders with backfilled data |
| D-01 action_type | `sql_destructive` + `ef_deploy` + `cron_edit` + dashboard PR |
| Estimated effort | ~3 sessions |

### 8.5 PRV-1 close gate

PRV-1 is "done" when:

1. All four cc-NNNN apply briefs (cc-0008..cc-0011) committed and verified
2. `r.expected_publication` has rows for at least 7 days backward + 7 days forward
3. `r.ice_publication_evidence` is materialised for at least 80% of expected rows where pipeline state is non-null
4. The 13 seed manual observations are loaded and visible in `r.platform_manual_observation`
5. `r.cadence_drift_log` has at most 5 open divergences (any more = rule needs refining before PRV-2)
6. Dashboard `/reconciliation/matrix` renders for `today` and at least 3 historical dates
7. PK acknowledges PRV-1 close in chat

Then PRV-2 (Meta observers) starts.

---

## 9. Verification approach

### 9.1 General pattern

Each cc-NNNN apply brief follows the brief-runner-v0 conventions established in cc-0003..cc-0007:

- §1 pre-flight (mandatory — never skipped per Lesson #61)
- §2 D-01 fire context with verified_claims
- §3 SQL / EF / config payload
- §4 verification queries (V1..VN, all must PASS)
- §8 HALT criteria (specific empirical conditions for aborting apply)
- §9 patterns observed (post-apply lessons)

§1.5-style discovery is the default per v2.48 standing rule.

### 9.2 Cross-brief verification

After all PRV-1 cc-NNNN briefs apply, a final cross-brief verification:

```sql
-- VX1: expected publications were generated and backfilled
SELECT expected_status, count(*) FROM r.expected_publication GROUP BY expected_status;
-- expect: 'expected' rows for next 7 days, 'backfilled' rows for past 7 days

-- VX2: ICE evidence is materialised
SELECT
  count(*) FILTER (WHERE ice.ice_evidence_id IS NOT NULL)::numeric / count(*)::numeric AS coverage_ratio
FROM r.expected_publication ep
LEFT JOIN r.ice_publication_evidence ice USING (expected_publication_id)
WHERE ep.expected_status IN ('expected','backfilled')
  AND ep.expected_local_date <= current_date;
-- expect: coverage_ratio >= 0.80

-- VX3: 13 seed manual observations loaded
SELECT count(*) FROM r.platform_manual_observation WHERE entered_at::date = '2026-05-09';
-- expect: 13

-- VX4: matcher classified the seeds as manually_overridden
SELECT count(*) FROM r.reconciliation_match
  WHERE manual_observation_id IS NOT NULL AND match_status = 'manually_overridden';
-- expect: 13

-- VX5: cadence drift is acceptably low
SELECT count(*) FROM r.cadence_drift_log
  WHERE divergence = true AND acknowledged_at IS NULL;
-- expect: <= 5; if higher, investigate rule definitions before PRV-2

-- VX6: matrix view renders
SELECT count(*) FROM r.vw_reconciliation_daily
  WHERE expected_local_date BETWEEN current_date - 7 AND current_date + 7;
-- expect: >= 50 rows (4 clients × 4 platforms × ~14 days × cadence factor)
```

### 9.3 Acceptance integrity (per D-50 / Lesson v2.50)

Every cc-NNNN apply brief produces a result file at `docs/briefs/results/cc-NNNN-*.md`. Chat re-fetches the landed result file via Invegent GitHub MCP to verify CC committed it correctly before declaring closure. Lesson v2.50 standing rule.

---

## 10. Risks register (locked from round-2 + new)

| Risk | Likelihood | Mitigation |
|---|---|---|
| `c.client_cadence_rule` seed misinterprets existing scattered config → wrong expected rows generated | Medium | Cadence-drift checker (§5.3) catches this; high drift count at PRV-1 close gate triggers seed correction before PRV-2 |
| Slot table schema changes during PRV migration | Low | Generator job uses soft FK to slot_id; gracefully degrades when slot missing |
| Publisher receipt platform_post_id capture regresses | Low | Empirically 100% over last 30 days (audit 2026-05-09); add VX-style coverage check to weekly health report |
| Tier 4 fuzzy match produces too many false `wrong-content` flags | Medium | Threshold tunable in `r.matcher_config`; PRV-3 close review |
| Observer auth expires silently and reconciliation reports false `missing` | Medium | `r.platform_observer_health` + classification of `observer_failed` not `missing` (D-11 yellow); dashboard warning banner |
| Manual override fatigue — operator marks too many things OK without investigating | Medium | Triage Inbox in PRV-5 surfaces high-frequency overrides; review at PRV-6 |
| `c.client_cadence_rule` and existing publish-side diverge during dual-source state | High by definition | THIS IS WHY THE DRIFT CHECKER EXISTS (§5.3 + D-3 refinement) |
| `raw_json_history` bloat | Low at current volumes | Compaction rule (D-19); migration trigger if avg row > 50KB |
| Schema r.* RLS gaps allow cross-client data leakage | Low (single-operator system today) | RLS policies added in cc-0010; future-proofs for client portal |

---

## 11. PK approvals (2026-05-09 Sydney)

All PRV-0 residual items resolved by PK in chat 2026-05-09 with one sequencing clarification.

1. **Commit path APPROVED**: `docs/dashboard-review-2026-05/prv-0-design-lock.md`. This brief lives as an architecture extension to the dashboard review of 2026-05, not as a single-apply brief or runtime session record.

2. **Seed authority APPROVED**: chat authors `c.client_cadence_rule` seed INSERT statements as part of cc-0008, derived from current `c.client_publish_profile` + `c.client_ai_profile` interpretation per (client × platform). PK reviews seed before cc-0008 D-01/apply fires. Chat does not apply seed without PK explicit approval phrase.

3. **Sequencing APPROVED — option (a) with clarification**: cc-0008 creates and seeds `c.client_cadence_rule` only. No generator EF deploy in cc-0008. No cron setup in cc-0008. No live generator execution in cc-0008. cc-0009 creates the `r.*` schema, `r.reconciliation_run`, `r.expected_publication`, and helpers; deploys the `cadence-rule-generator` Edge Function; runs the first manual generator invocation with `backfill=true` (which writes the first `r.reconciliation_run` audit row); then enables the cron only after the manual run succeeds (V5 gate in §8.2). No temporary log table required — chicken/egg resolved by sequencing.

Sequencing clarification reflected in §8.1 (cc-0008 — DDL + DML only) and §8.2 (cc-0009 — DDL + EF deploy + first backfill + cron enable, gated).

**Next session**: cc-0008 apply brief authoring. Chat authors brief including the seed INSERT statements; PK reviews seed; D-01 fires; apply.

---

*End of PRV-0 design lock. Schema, contracts, and cc-NNNN breakdown locked. PK approvals received 2026-05-09 (see §11). cc-0008 apply brief authoring is the next implementation deliverable.*
