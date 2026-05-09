# PRV-0 — Platform Reconciliation Subsystem Design Lock

> **Status**: LOCKED v2 (amended 2026-05-09 from PK directive — minute-precision cadence + paused-profile suppression model). Schema, contracts, and cc-NNNN brief boundaries are settled. Implementation briefs reference this document; this document is not re-opened except via explicit round-3 decision.
> **Author**: chat (Claude), 2026-05-09 Sydney (v1); amended 2026-05-09 Sydney (v2)
> **v2 amendments (2026-05-09 Sydney)**:
>   - **§3.2 DDL** — replaced `preferred_local_hours int[] CHECK (... 0..23)` with `preferred_local_times time[]` (minute-precision authoritative). Column count remains 19. Hour-level metadata is now derived (e.g., `EXTRACT(HOUR FROM unnest(preferred_local_times))::int[]`) at query time rather than stored authoritatively. PK directive: minute precision must be machine-readable; notes alone are insufficient.
>   - **§5.1 cadence-rule-generator** — added paused-profile handling clause. When `c.client_publish_profile.publish_enabled=false` for a (client_id, platform), the generator must NOT emit normal `expected` rows (which would falsely fire missing/late). cc-0009 brief decides between (a) skip insert entirely or (b) insert with `expected_status='suppressed'`. Either path preserves the principle "paused profile ≠ missing publication." The cadence rule itself remains `is_active=true` — distinguishing "not part of cadence" (`rule.is_active=false`) from "temporarily paused" (`publish_profile.publish_enabled=false`).
>   - **No other §1–§11 content changed** in v2. Schema column count, FK targets, CHECK constraints (other than the removed `preferred_local_hours <@ 0..23` check), index definitions, helper signatures, EF specs, matcher tiers, dashboard surfaces, cc-NNNN sequencing, and PK approvals are all unchanged.
> **Inputs**: round-1 synthesis (D-1..D-20) + round-2 synthesis (D-21..D-23 + audit + reviewer disagreement resolution) + PK Path A confirmation 2026-05-09 + PK cadence-drift-check directive + PK PRV-0 approval 2026-05-09 (commit path + seed authority + cc-0008/cc-0009 sequencing clarification — see §11) + PK v2 directive 2026-05-09 (minute precision + paused-profile suppression — see this header block)
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

| ID | Decision | Choice | Locked by |
|---|---|---|---|
| D-1 | Schema location for reconciliation tables | New schema `r.*`; never write to `m.*`. ICE pipeline stays unmodified. | round-1 |
| D-2 | Source of truth for "expected publications" | `c.client_cadence_rule`; never `m.post_publish_queue`. Queue bugs must surface as `missing`. | round-1 |
| D-3 | Cadence-rule storage | New `c.client_cadence_rule` table introduced in PRV-1. Publish-side migration to it deferred to PRV-7+. Drift between cadence rule and publish-side gets a dedicated check (§5.3). | round-2 + PK directive |
| D-4 | Matching strategy | Five tiers, all deterministic in v1: ICE evidence → platform_post_id → URL → date+platform+caption-prefix → fuzzy. No LLM. No embeddings. | round-1 |
| D-5 | Confidence scale | Numeric 0.000..1.000, fixed mapping per tier (D-4): 1.0, 0.95, 0.92, 0.85, 0.75; manual override = 1.0. | round-1 §3.4 |
| D-6 | Reconciliation status enum | `expected | matched | missing | late | unscheduled_published | observed_no_ice` (no `partial`; that's an evidence-side concept). | round-1 §3.5 |
| D-7 | Manual observation table | First-class in PRV-1. CSV/JSONL import in PRV-2. Full minimal entry form in PRV-2. Triage Inbox UX in PRV-5. | round-1 + round-2 |
| D-8 | Audit run table | `r.reconciliation_run`. One row per generator/materialiser/checker invocation. Holds run_type, trigger, started_at, finished_at, summary jsonb, status. | round-1 §3.6 |
| D-9 | Tolerance defaults | Minutes-late: 60. Caption-prefix length: 60. Same-day window: 24h Sydney local. All overridable per (client, platform) via config table. | round-1 §3.7 |
| D-10 | Manual override authority | Manual override can move a row from any auto-status to `matched` (or back) and is logged in `r.reconciliation_match` with `override_by` text. Hard lock: cron processes never overwrite a match where `override_by IS NOT NULL`. | round-1 + D-21 |
| D-11 | Run audit retention | 90 days for normal `r.reconciliation_run` rows; 365 days for runs with `status != 'succeeded'` (post-mortem evidence). | round-2 §3.5 |
| D-12 | Stale evidence behaviour | If platform observation older than 24h: treat as missing for that day; do not match against it. | round-2 §3.6 |
| D-13 | LLM use in v1 | None in matcher. Could be used in PRV-7+ for caption-similarity v2 if needed; not in v1. | round-2 |
| D-14 | Webhook v1 inclusion | No webhooks in v1. Pull-only. Per-platform observer cron at 30 min default. | round-2 §3.4 |
| D-15 | Caption similarity v1 algorithm | Levenshtein-based ratio with minimum 0.85 to match. Operates on `r.normalise_text(caption)`. | round-2 §3.6 |
| D-16 | `r.normalise_text` definition | Lowercase + collapse whitespace + strip emoji + strip URLs (replace with `[URL]`) + strip @mentions + strip #hashtags. | round-2 §3.7 |
| D-17 | Date semantics | All `*_local_date` columns interpret in Sydney timezone via the helper `r.to_sydney_local_date(ts)`. Independent of server timezone. | round-2 §3.8 |
| D-18 | Platform observer interface | Abstract per-platform observer EF reads from `r.platform_observation` write contract. Per-platform implementation (PRV-2/3/4) supplies its own ingestion. | round-1 + round-2 |
| D-19 | First reconciliation cron cadence | Generator: daily 02:00 Sydney + on-demand. Materialiser: every 30 min. Per-platform observers: every 30 min default. Matcher: every 30 min. Drift-checker: weekly Mon 06:00 Sydney. | round-2 + PK directive |
| D-20 | Bridge with `m.ef_drift_log` | Reconciliation cron failures write to `m.ef_drift_log` (existing pattern); `r.reconciliation_run` is the per-run audit. Both populate. | round-2 §3.9 |
| D-21 | Manual override hard lock semantics | Cron-driven `r.reconciliation_match` upsert MUST include `WHERE override_by IS NULL` clause. Manual rows are write-once-by-human. | round-2 audit response |
| D-22 | Website channel scope | Out of scope for v1. Cadence rule platform CHECK does not include `website` for v1. Re-evaluate in PRV-7+. | round-2 §6 |
| D-23 | Backfill window at PRV-1 launch | 7 days. Generator at first run inserts `r.expected_publication` rows for current date − 6 through current date + 7 (14-day window total). After that, only forward 7 days per daily run. | round-2 §3.10 |

---

## 3. Schema architecture (full DDL, locked)

### 3.1 New schema and grants

```sql
-- cc-0009 migration
CREATE SCHEMA IF NOT EXISTS r;
GRANT USAGE ON SCHEMA r TO authenticator, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA r TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA r TO anon, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA r GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA r GRANT SELECT ON TABLES TO anon, authenticator;
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
    preferred_local_times  time[],                                                -- v2: authoritative; minute precision; Sydney local; e.g. ARRAY['09:06'::time, '13:04'::time]; replaces preferred_local_hours from v1
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

```sql
-- cc-0009 migration
CREATE TABLE r.expected_publication (
    expected_publication_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    cadence_rule_id          uuid NOT NULL REFERENCES c.client_cadence_rule(cadence_rule_id) ON DELETE RESTRICT,
    expected_local_date      date NOT NULL,
    expected_window_start    timestamptz NOT NULL,        -- in Sydney local; computed from rule's preferred_local_times + minutes-late tolerance
    expected_window_end      timestamptz NOT NULL,
    expected_format          text,
    expected_status          text NOT NULL DEFAULT 'expected'
        CHECK (expected_status IN ('expected','matched','missing','late','unscheduled_published','observed_no_ice','backfilled','suppressed')),
    suppression_reason       text,
    matched_match_id         uuid REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL,
    matched_at               timestamptz,
    notes                    text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    created_by_run_id        uuid,
    updated_at               timestamptz NOT NULL DEFAULT now(),
    updated_by_run_id        uuid,
    UNIQUE (client_id, platform, expected_local_date, cadence_rule_id),
    CONSTRAINT expected_window_valid CHECK (expected_window_end > expected_window_start),
    CONSTRAINT expected_status_match_pair CHECK (
        (expected_status IN ('matched') AND matched_match_id IS NOT NULL AND matched_at IS NOT NULL)
        OR (expected_status NOT IN ('matched'))
    )
);

CREATE INDEX expected_publication_client_platform_date
    ON r.expected_publication (client_id, platform, expected_local_date);

CREATE INDEX expected_publication_status_open
    ON r.expected_publication (expected_local_date, expected_status)
    WHERE expected_status IN ('expected','missing','late','observed_no_ice');

COMMENT ON TABLE r.expected_publication IS 'Generated by cadence-rule-generator from c.client_cadence_rule. One row per (client, platform, expected_local_date). expected_status transitions to matched/missing/late by reconciliation-matcher. backfilled rows are inserted retroactively by manual entry or backfill cron. suppressed rows (added v2) are emitted when c.client_publish_profile.publish_enabled=false at generation time — they preserve the cadence prediction without firing missing/late alerts.';
```

### 3.4 `r.ice_publication_evidence`

```sql
-- cc-0010 migration
CREATE TABLE r.ice_publication_evidence (
    ice_publication_evidence_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id      uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    pipeline_state               text NOT NULL CHECK (pipeline_state IN ('drafted','queued','attempted','published','failed')),
    post_draft_id                uuid REFERENCES m.post_draft(post_draft_id) ON DELETE SET NULL,
    post_publish_queue_id        uuid REFERENCES m.post_publish_queue(post_publish_queue_id) ON DELETE SET NULL,
    post_publish_id              uuid REFERENCES m.post_publish(post_publish_id) ON DELETE SET NULL,
    slot_id                      uuid REFERENCES m.slot(slot_id) ON DELETE SET NULL,
    platform_post_id             text,
    published_url                text,
    scheduled_for                timestamptz,
    published_at                 timestamptz,
    failure_reason               text,
    raw_evidence                 jsonb DEFAULT '{}',
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    created_by_run_id            uuid,
    updated_by_run_id            uuid,
    UNIQUE (expected_publication_id)
);

CREATE INDEX ice_evidence_state_recent
    ON r.ice_publication_evidence (pipeline_state, updated_at DESC);

CREATE INDEX ice_evidence_platform_post
    ON r.ice_publication_evidence (platform_post_id)
    WHERE platform_post_id IS NOT NULL;

COMMENT ON TABLE r.ice_publication_evidence IS 'Authoritative evidence from ICE pipeline state. Populated by ice-evidence-materialiser. UNIQUE constraint on expected_publication_id means ICE evidence is exclusive per expected row — multiple ICE pipeline rows for the same expected slot collapse into one evidence row (latest wins).';
```

### 3.5 `r.platform_observation`

```sql
-- cc-0010 migration
CREATE TABLE r.platform_observation (
    platform_observation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    platform_post_id         text NOT NULL,
    observed_at              timestamptz NOT NULL,
    published_at_observed    timestamptz,
    observed_local_date      date NOT NULL,        -- r.to_sydney_local_date(published_at_observed) when known else r.to_sydney_local_date(observed_at)
    caption_text             text,
    caption_normalised       text,                  -- r.normalise_text(caption_text)
    media_count              int CHECK (media_count IS NULL OR media_count >= 0),
    has_video                boolean,
    permalink_url            text,
    raw_payload              jsonb DEFAULT '{}',
    fetch_run_id             uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    is_stale                 boolean GENERATED ALWAYS AS (observed_at < (now() - interval '24 hours')) STORED,
    notes                    text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, platform_post_id),
    CONSTRAINT platform_obs_observed_dates_consistent CHECK (
        published_at_observed IS NULL
        OR observed_at >= published_at_observed
    )
);

CREATE INDEX platform_obs_client_platform_date
    ON r.platform_observation (client_id, platform, observed_local_date);

CREATE INDEX platform_obs_caption_normalised
    ON r.platform_observation USING gin (caption_normalised gin_trgm_ops)
    WHERE caption_normalised IS NOT NULL;

CREATE INDEX platform_obs_recent_fresh
    ON r.platform_observation (client_id, platform, observed_at DESC)
    WHERE is_stale = false;

COMMENT ON TABLE r.platform_observation IS 'Observations fetched from platform APIs by per-platform observer EFs. UNIQUE (platform, platform_post_id) means each post observed exactly once — re-fetches must use UPSERT. is_stale auto-computed; D-12 says stale rows do not match.';
```

### 3.6 `r.platform_manual_observation`

```sql
-- cc-0010 migration
CREATE TABLE r.platform_manual_observation (
    platform_manual_observation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                       uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                        text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    platform_post_id                text,                              -- nullable: human may know the URL but not the ID
    permalink_url                   text,
    observed_local_date             date NOT NULL,
    published_at_observed           timestamptz,
    caption_text                    text,
    caption_normalised              text,
    media_count                     int CHECK (media_count IS NULL OR media_count >= 0),
    has_video                       boolean,
    raw_evidence_url                text,
    observation_method              text CHECK (observation_method IN ('csv_import','manual_form','screenshot','email_forward','phone_report')),
    confidence                      text CHECK (confidence IN ('high','medium','low')),
    notes                           text,
    submitted_by                    text NOT NULL,
    submitted_at                    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, platform_post_id) WHERE platform_post_id IS NOT NULL
);

CREATE INDEX platform_manual_obs_client_platform_date
    ON r.platform_manual_observation (client_id, platform, observed_local_date);

CREATE INDEX platform_manual_obs_caption_normalised
    ON r.platform_manual_observation USING gin (caption_normalised gin_trgm_ops)
    WHERE caption_normalised IS NOT NULL;

CREATE INDEX platform_manual_obs_recent
    ON r.platform_manual_observation (client_id, platform, submitted_at DESC);

COMMENT ON TABLE r.platform_manual_observation IS 'Human-submitted observations. Lives alongside r.platform_observation; matcher tier 1 reads both. Manual entries keep their own raw_evidence_url + observation_method for audit. UNIQUE on (platform, platform_post_id) only when known — multiple URL-only entries for the same post are tolerated.';
```

### 3.7 `r.reconciliation_match`

```sql
-- cc-0010 migration
CREATE TABLE r.reconciliation_match (
    reconciliation_match_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id   uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    matched_evidence_kind     text NOT NULL CHECK (matched_evidence_kind IN ('ice','platform','manual','fuzzy_platform','fuzzy_manual','none')),
    matched_evidence_id       uuid,                                                  -- references r.ice_publication_evidence | r.platform_observation | r.platform_manual_observation by id; not FK because the schema differs
    matched_match_tier        int NOT NULL CHECK (matched_match_tier BETWEEN 1 AND 5),
    matched_confidence        numeric(4,3) NOT NULL CHECK (matched_confidence BETWEEN 0.000 AND 1.000),
    delta_minutes_late        int,
    delta_caption_similarity  numeric(4,3),                                          -- only for fuzzy tiers
    override_by               text,                                                  -- non-null indicates manual override
    override_at               timestamptz,
    override_reason           text,
    matcher_run_id            uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    created_by_run_id         uuid,
    updated_at                timestamptz NOT NULL DEFAULT now(),
    updated_by_run_id         uuid,
    UNIQUE (expected_publication_id),
    CONSTRAINT reconcile_match_override_pair CHECK (
        (override_by IS NULL AND override_at IS NULL)
        OR (override_by IS NOT NULL AND override_at IS NOT NULL)
    ),
    CONSTRAINT reconcile_match_evidence_required_for_non_none CHECK (
        (matched_evidence_kind = 'none' AND matched_evidence_id IS NULL)
        OR (matched_evidence_kind <> 'none' AND matched_evidence_id IS NOT NULL)
    ),
    CONSTRAINT reconcile_match_tier_consistency CHECK (
        (matched_evidence_kind = 'ice'              AND matched_match_tier = 1)
        OR (matched_evidence_kind = 'platform'      AND matched_match_tier = 2)
        OR (matched_evidence_kind = 'manual'        AND matched_match_tier = 3)
        OR (matched_evidence_kind = 'fuzzy_platform' AND matched_match_tier = 4)
        OR (matched_evidence_kind = 'fuzzy_manual'  AND matched_match_tier = 5)
        OR (matched_evidence_kind = 'none')
    )
);

CREATE INDEX reconcile_match_evidence
    ON r.reconciliation_match (matched_evidence_kind, matched_evidence_id)
    WHERE matched_evidence_id IS NOT NULL;

CREATE INDEX reconcile_match_override_audit
    ON r.reconciliation_match (override_at DESC)
    WHERE override_by IS NOT NULL;

COMMENT ON TABLE r.reconciliation_match IS 'One row per expected_publication describing how it matched (or not). UNIQUE on expected_publication_id means re-running matcher upserts in place. matched_evidence_kind=none means matcher found no match (used for missing/late states). Manual override is sticky: cron re-matcher MUST include WHERE override_by IS NULL clause (D-21). Tier consistency CHECK prevents misclassification.';
```

### 3.8 `r.reconciliation_run`

```sql
-- cc-0009 migration
CREATE TABLE r.reconciliation_run (
    reconciliation_run_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type                 text NOT NULL CHECK (run_type IN (
        'cadence_generation','ice_evidence_materialisation','platform_observation','manual_observation',
        'matching','cadence_drift_check','backfill','manual_override','adhoc'
    )),
    trigger                  text NOT NULL CHECK (trigger IN ('scheduled','manual','rpc','backfill','dependency')),
    started_at               timestamptz NOT NULL DEFAULT now(),
    finished_at              timestamptz,
    status                   text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','succeeded','failed','partial','cancelled')),
    rows_processed           int,
    rows_inserted            int,
    rows_updated             int,
    rows_skipped             int,
    error_summary            text,
    summary_json             jsonb DEFAULT '{}',
    triggered_by             text,                              -- username/system label
    parent_run_id            uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    CONSTRAINT recon_run_finished_when_done CHECK (
        (status IN ('running') AND finished_at IS NULL)
        OR (status NOT IN ('running'))
    )
);

CREATE INDEX recon_run_type_recent
    ON r.reconciliation_run (run_type, started_at DESC);

CREATE INDEX recon_run_status_failed
    ON r.reconciliation_run (status, started_at DESC)
    WHERE status IN ('failed','partial','cancelled');

COMMENT ON TABLE r.reconciliation_run IS 'One row per scheduled or manual run of any reconciliation EF. parent_run_id permits chained runs (e.g., backfill_run kicks ice_evidence_materialisation_run and child references parent). Retention: 90 days for succeeded; 365 days for failed/partial/cancelled (D-11).';
```

### 3.9 `r.platform_observer_health`

```sql
-- cc-0010 migration
CREATE TABLE r.platform_observer_health (
    platform_observer_health_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                    uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                     text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    last_observed_at             timestamptz,
    last_successful_run_id       uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    last_failure_run_id          uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    last_failure_reason          text,
    consecutive_failure_count    int NOT NULL DEFAULT 0 CHECK (consecutive_failure_count >= 0),
    is_healthy                   boolean GENERATED ALWAYS AS (consecutive_failure_count = 0) STORED,
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, platform)
);

CREATE INDEX platform_observer_health_unhealthy
    ON r.platform_observer_health (platform, consecutive_failure_count DESC)
    WHERE consecutive_failure_count > 0;

COMMENT ON TABLE r.platform_observer_health IS 'Lightweight health summary per (client, platform) observer. Updated by per-platform observer EFs after each run. Used by dashboard surface §7.1.';
```

### 3.10 `r.cadence_drift_log` (NEW per PK directive)

```sql
-- cc-0011 migration
CREATE TABLE r.cadence_drift_log (
    cadence_drift_log_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    detected_at              timestamptz NOT NULL DEFAULT now(),
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    cadence_rule_prediction  jsonb NOT NULL,                     -- what c.client_cadence_rule says (cadence_type, posts_per_period, weekdays, preferred_local_times, etc)
    publish_side_prediction  jsonb NOT NULL,                     -- what existing publish-side config says (slot table + publish_profile)
    drift_kind               text NOT NULL CHECK (drift_kind IN ('cadence_only','frequency','time_window','platform_set','format','minor')),
    drift_severity           text NOT NULL CHECK (drift_severity IN ('info','warn','error')),
    drift_summary            text NOT NULL,
    operator_action          text CHECK (operator_action IN ('migrate_publish','migrate_cadence','document_intentional','no_action')),
    operator_action_at       timestamptz,
    operator_action_by       text,
    operator_action_notes    text,
    detected_by_run_id       uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL
);

CREATE INDEX cadence_drift_unresolved
    ON r.cadence_drift_log (client_id, platform, detected_at DESC)
    WHERE operator_action IS NULL;

CREATE INDEX cadence_drift_severe_recent
    ON r.cadence_drift_log (drift_severity, detected_at DESC)
    WHERE drift_severity IN ('warn','error') AND operator_action IS NULL;

COMMENT ON TABLE r.cadence_drift_log IS 'Each row is a detected drift between c.client_cadence_rule and publish-side config (slot table + c.client_publish_profile). cadence-drift-checker EF writes; PRV-7+ planning reads. operator_action records the human reconciliation decision.';
```

### 3.11 Materialised views

```sql
-- cc-0011 migrations
CREATE MATERIALIZED VIEW r.mv_reconciliation_daily_matrix AS
WITH days AS (
    SELECT generate_series(current_date - interval '13 days', current_date + interval '7 days', interval '1 day')::date AS d
)
SELECT
    cli.client_id,
    cli.client_slug,
    cli.client_name,
    p.platform,
    days.d AS local_date,
    COUNT(ep.expected_publication_id) FILTER (WHERE ep.expected_status = 'expected') AS expected_open,
    COUNT(ep.expected_publication_id) FILTER (WHERE ep.expected_status = 'matched') AS matched,
    COUNT(ep.expected_publication_id) FILTER (WHERE ep.expected_status = 'missing') AS missing,
    COUNT(ep.expected_publication_id) FILTER (WHERE ep.expected_status = 'late') AS late,
    COUNT(ep.expected_publication_id) FILTER (WHERE ep.expected_status = 'unscheduled_published') AS unscheduled,
    COUNT(ep.expected_publication_id) FILTER (WHERE ep.expected_status = 'observed_no_ice') AS obs_no_ice,
    COUNT(ep.expected_publication_id) FILTER (WHERE ep.expected_status = 'suppressed') AS suppressed,
    NOW() AS last_refreshed
FROM c.client cli
CROSS JOIN (VALUES ('facebook'),('instagram'),('linkedin'),('youtube')) AS p(platform)
CROSS JOIN days
LEFT JOIN r.expected_publication ep
    ON ep.client_id = cli.client_id
    AND ep.platform = p.platform
    AND ep.expected_local_date = days.d
WHERE cli.status = 'active'
GROUP BY cli.client_id, cli.client_slug, cli.client_name, p.platform, days.d;

CREATE UNIQUE INDEX recon_daily_matrix_pk
    ON r.mv_reconciliation_daily_matrix (client_id, platform, local_date);

CREATE MATERIALIZED VIEW r.mv_observer_freshness_summary AS
SELECT
    cli.client_slug,
    poh.platform,
    poh.last_observed_at,
    poh.consecutive_failure_count,
    poh.is_healthy,
    poh.last_failure_reason
FROM r.platform_observer_health poh
JOIN c.client cli ON cli.client_id = poh.client_id
WHERE cli.status = 'active';

CREATE UNIQUE INDEX recon_obs_freshness_pk
    ON r.mv_observer_freshness_summary (client_slug, platform);
```

Refresh schedule: hourly via pg_cron; refresh on-demand RPC.

### 3.12 `k.column_registry` / `k.table_registry` doc-catalog plan

Standing rule: every new table introduced in PRV-1 cc-NNNN briefs must populate `k.table_registry` (1 row) + `k.column_registry` (1 row per column) in the same `apply_migration` transactional unit. Pattern: chat-authored `column_purpose` VALUES table joined with `information_schema.columns` for type/nullability so the registry row data types always match the actual table.

---

## 4. Helper functions (locked signatures)

### 4.1 `r.normalise_text(input text) returns text`

Implementation: lowercase + collapse whitespace + strip emoji (Unicode emoji blocks) + replace URL substrings with `[URL]` + strip `@mentions` and `#hashtags`. Returns NULL if input is NULL.

```sql
-- cc-0009 migration
CREATE OR REPLACE FUNCTION r.normalise_text(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    out text;
BEGIN
    IF input IS NULL THEN RETURN NULL; END IF;
    out := lower(input);
    out := regexp_replace(out, 'https?://\S+', '[URL]', 'g');
    out := regexp_replace(out, '@\w+', '', 'g');
    out := regexp_replace(out, '#\w+', '', 'g');
    -- strip emoji (basic ranges; PRV-7+ may extend)
    out := regexp_replace(out, '[\x{1F000}-\x{1FFFF}]', '', 'g');
    out := regexp_replace(out, '[\x{2600}-\x{27BF}]', '', 'g');
    out := regexp_replace(out, '\s+', ' ', 'g');
    out := trim(out);
    RETURN out;
END;
$$;

COMMENT ON FUNCTION r.normalise_text IS 'D-16 spec: lowercase + collapse whitespace + strip emoji + replace URL substrings with [URL] + strip @mentions and #hashtags. Used by matcher tier 4/5 caption similarity.';
```

### 4.2 `r.to_sydney_local_date(ts timestamptz) returns date`

```sql
-- cc-0009 migration
CREATE OR REPLACE FUNCTION r.to_sydney_local_date(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (ts AT TIME ZONE 'Australia/Sydney')::date;
$$;

COMMENT ON FUNCTION r.to_sydney_local_date IS 'D-17 spec: interpret ts in Sydney timezone, return the date. Used everywhere observed_local_date / expected_local_date is computed from a timestamptz.';
```

### 4.3 `r.compact_raw_json(j jsonb) returns jsonb`

```sql
-- cc-0010 migration
CREATE OR REPLACE FUNCTION r.compact_raw_json(j jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    keys_to_drop text[] := ARRAY['__internal_debug','request_headers','response_headers','full_html'];
    out jsonb := j;
    k text;
BEGIN
    IF j IS NULL OR jsonb_typeof(j) != 'object' THEN RETURN j; END IF;
    FOREACH k IN ARRAY keys_to_drop LOOP
        out := out - k;
    END LOOP;
    RETURN out;
END;
$$;

COMMENT ON FUNCTION r.compact_raw_json IS 'Strips known-bulky internal-only keys from raw API payloads before storage. Used by per-platform observer EFs (PRV-2/3/4) when populating r.platform_observation.raw_payload.';
```

---

## 5. Edge Function specs

### 5.1 `cadence-rule-generator`

Reads `c.client_cadence_rule`, generates `r.expected_publication` rows for the next N days.

| Aspect | Spec |
|---|---|
| Trigger | pg_cron daily at 02:00 Sydney + on-demand via RPC |
| Reads | `c.client_cadence_rule` (active rules); `c.client_publish_profile` (publish_enabled per client × platform — v2); `r.expected_publication` (existing rows for dedup) |
| Writes | `r.expected_publication` (insert new rows; status=expected for active platforms, status=suppressed OR skipped for paused — v2 cc-0009 decision); `r.reconciliation_run` (audit) |
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
    profile = select publish_enabled, paused_reason
              from c.client_publish_profile
              where client_id=rule.client_id and platform=rule.platform;
    for date in horizon_dates {
      if date in rule.suppression_dates: continue;
      if not rule_says_publish_on(rule, date): continue;
      window = compute_window(rule, date);
      // v2 amendment — paused-profile suppression (PK directive 2026-05-09):
      // If publish_profile is paused, do NOT emit a normal 'expected' row that
      // would fire missing/late. cc-0009 brief decides between (a) skip OR
      // (b) insert with expected_status='suppressed'. Either path preserves
      // the cadence rule shape while preventing false missing alerts.
      if profile.publish_enabled is false {
        apply_paused_handling(profile, date, rule);   // option (a) skip OR option (b) status='suppressed'
        continue;
      }
      insert into r.expected_publication(...) values (...) on conflict do nothing;
    }
  }
  update r.reconciliation_run set status='succeeded', finished_at=now(), summary_json={...} where reconciliation_run_id=run_id;
}
```

`compute_dates_for_rule` and `rule_says_publish_on` are the real logic — they handle weekly cadences, custom_cron schedules, weekday filters, etc. Implementation detail in cc-0008.

**v2 amendment — distinguishing "not part of cadence" vs "temporarily paused" (PK directive 2026-05-09):**

The system now has two layers controlling whether expected rows are emitted for a (client × platform) pair:

| Layer | Field | Semantics |
|---|---|---|
| Cadence rule | `c.client_cadence_rule.is_active` | `false` means the rule is NOT part of cadence at all (e.g., client never wanted this platform). Generator skips the rule entirely at the `where is_active=true` filter. |
| Publish profile | `c.client_publish_profile.publish_enabled` | `false` means the platform is temporarily paused (e.g., Meta anti-spam block). Cadence intent is preserved (`is_active=true`); generator detects pause via the new clause and emits suppressed/skipped rows. |

This separation matters because:

- A reconciliation report should show "Property Pulse IG paused since 25 Apr — cadence shape unchanged" rather than "Property Pulse IG removed from cadence" (the latter would be wrong for audit purposes).
- When the pause lifts (e.g., anti-spam block resolved), no cadence-rule edit is needed — only the `publish_profile.publish_enabled` flag flips.
- `cadence-drift-checker` (§5.3) compares cadence rule predictions vs publish-side expected publications. With paused-profile suppression, both sides agree (cadence side `is_active=true` producing rows; publish-side suppressed/skipped) → 0 drift. Without this clause, cadence side would produce N rows while publish side produced 0 rows → false drift alert.

**cc-0009 brief decision required: option (a) skip vs option (b) `expected_status='suppressed'`.** Both are valid. Option (b) is recommended for richer audit trail (drift-checker can see "we WOULD have expected here, but profile was paused"). Option (a) is simpler. cc-0009 brief locks this choice; PRV-0 v2 only mandates that ONE of the two must be implemented.

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

Compares `c.client_cadence_rule` (PRV-1 reconciliation source) against publish-side config (`m.slot` rows + `c.client_publish_profile`). Detects shape drift between the two — frequency, time-window, platform-set, format. PRV-7+ uses this to drive the migration of publish-side onto `c.client_cadence_rule`.

| Aspect | Spec |
|---|---|
| Trigger | pg_cron weekly Mon 06:00 Sydney + on-demand via RPC |
| Reads | `c.client_cadence_rule`, `c.client_publish_schedule` (the row-per-slot config), `c.client_publish_profile` (paused / preferred_format / max_per_day) |
| Writes | `r.cadence_drift_log` (one row per detected drift, per client × platform, per detection); `r.reconciliation_run` |
| Tolerance | Frequency: ±1 post per period accepted as `info`; >1 = `warn`; missing platform on one side = `error`. Time window: ±60 min accepted as `info`; >60 min = `warn`. |
| Verify_jwt | `false` |

Pseudocode:

```
fn cadence_drift_checker() {
  run_id = create_run('cadence_drift_check');
  for (client, platform) in cross_join_active_clients_and_platforms() {
    cadence_pred = derive_pred_from_cadence_rule(client, platform);
    publish_pred = derive_pred_from_publish_side(client, platform);
    drifts = compare(cadence_pred, publish_pred);
    for drift in drifts {
      insert into r.cadence_drift_log(client_id, platform, cadence_rule_prediction, publish_side_prediction, drift_kind, drift_severity, drift_summary, detected_by_run_id) values (...);
    }
  }
  finalise_run(run_id);
}
```

### 5.4 `reconciliation-matcher`

Reads `r.expected_publication` rows in `expected | backfilled` status, matches against evidence, upserts `r.reconciliation_match`, transitions `r.expected_publication.expected_status`.

| Aspect | Spec |
|---|---|
| Trigger | pg_cron every 30 min + on-demand RPC |
| Reads | `r.expected_publication`, `r.ice_publication_evidence`, `r.platform_observation`, `r.platform_manual_observation`, `r.matcher_config` |
| Writes | `r.reconciliation_match` (upsert by expected_publication_id WHERE override_by IS NULL — D-21); `r.expected_publication.expected_status` transitions; `r.reconciliation_run` |
| Tier order | 1=ice, 2=platform, 3=manual, 4=fuzzy_platform, 5=fuzzy_manual; first match wins |
| Verify_jwt | `false` |

### 5.5 Platform observer interface (PRV-2/3/4)

Per-platform observer EFs (`facebook-observer`, `instagram-observer`, `linkedin-observer`, `youtube-observer`) implement a common interface: read API → upsert `r.platform_observation` → update `r.platform_observer_health`. Per-platform implementation detail belongs in their own cc-NNNN briefs (PRV-2/3/4).

---

## 6. Matching engine specification

### 6.1 Tier hierarchy (locked)

| Tier | Name | Evidence source | Match rule | Confidence |
|---|---|---|---|---|
| 1 | ICE evidence | `r.ice_publication_evidence` (pipeline_state='published') | exact join on `expected_publication_id` | 1.000 |
| 2 | platform_post_id | `r.platform_observation` (fresh; not stale) | exact match on `(platform, platform_post_id)` of any `r.ice_publication_evidence` for the same expected — covers ICE-published-but-id-confirmed-from-platform | 0.950 |
| 3 | URL match | `r.platform_observation` OR `r.platform_manual_observation` | `permalink_url` matches `r.ice_publication_evidence.published_url` (case-insensitive, query string ignored) | 0.920 |
| 4 | Date+platform+caption-prefix | `r.platform_observation` (fresh) — caption substring | `observed_local_date = expected_local_date AND r.normalise_text(caption_text) starts_with first 60 chars of normalised draft caption` | 0.850 |
| 5 | Date+platform+caption-similarity | `r.platform_observation` (fresh) OR `r.platform_manual_observation` — caption Levenshtein | `same_local_date AND ratio(r.normalise_text(caption), r.normalise_text(observed_caption_normalised)) >= 0.85` | 0.750 |

After tier 5 fails for an `expected` row → status transitions to `missing` (or `late` if observed evidence exists with `published_at_observed > expected_window_end`).

Tier 1 (ICE evidence) matches deterministically on `expected_publication_id`. Tiers 2–5 use evidence rows from `r.platform_observation` / `r.platform_manual_observation` — tier confidence reflects how indirect the match is.

`matched_evidence_kind` and `matched_match_tier` constraint pair (D-13 hard lock): tier 1 ↔ ice, tier 2 ↔ platform, tier 3 ↔ manual, tier 4 ↔ fuzzy_platform, tier 5 ↔ fuzzy_manual. `none` permitted on `missing`/`late`/`unscheduled_published` rows.

### 6.2 Delta classification rules (locked)

After a match is found at tier T, `delta_minutes_late` is computed from `published_at_observed - expected_window_end`. Negative deltas (early) are recorded as `0`. Status transition rules:

| Condition | Resulting status |
|---|---|
| Match at tier 1, `delta_minutes_late <= 0` | `matched` |
| Match at tier 1, `delta_minutes_late > 0` AND `<= 60` | `matched` (within tolerance) |
| Match at tier 1, `delta_minutes_late > 60` | `late` |
| Match at tier 2/3, any delta | `matched` (platform/url evidence is authoritative regardless of timing) |
| Match at tier 4/5, any delta | `matched` (fuzzy is best-effort; timing not enforceable from caption) |
| No match across 1–5, AND `expected_window_end < now()` | `missing` |
| No match across 1–5, AND observed evidence exists for date+platform with no expected | `unscheduled_published` (separate row in expected, status=`unscheduled_published` directly inserted by matcher) |

`observed_no_ice` is a separate path: a `r.platform_observation` row exists with no matching `r.ice_publication_evidence` AND no matching `r.expected_publication` for that local_date — interpreted as an off-cadence post. Treatment: insert a synthetic `r.expected_publication` row with status=`unscheduled_published` and tier=2 match.

### 6.3 Tolerance defaults (config table)

```sql
-- cc-0010 migration
CREATE TABLE r.matcher_config (
    matcher_config_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                    uuid REFERENCES c.client(client_id) ON DELETE CASCADE,            -- NULL = global default
    platform                     text CHECK (platform IS NULL OR platform IN ('facebook','instagram','linkedin','youtube')),
    minutes_late_tolerance       int NOT NULL DEFAULT 60 CHECK (minutes_late_tolerance >= 0),
    caption_prefix_length        int NOT NULL DEFAULT 60 CHECK (caption_prefix_length >= 10),
    same_day_window_hours        int NOT NULL DEFAULT 24 CHECK (same_day_window_hours >= 1),
    fuzzy_levenshtein_threshold  numeric(4,3) NOT NULL DEFAULT 0.850 CHECK (fuzzy_levenshtein_threshold BETWEEN 0.500 AND 1.000),
    notes                        text,
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, platform)
);

INSERT INTO r.matcher_config (client_id, platform) VALUES (NULL, NULL);  -- global default row
```

Lookup order: (client, platform) → (client, NULL) → (NULL, NULL).

### 6.4 Manual override interaction (D-21 hard lock)

```sql
-- Example matcher upsert pattern
INSERT INTO r.reconciliation_match (...)
VALUES (...)
ON CONFLICT (expected_publication_id) DO UPDATE SET
    matched_evidence_kind = EXCLUDED.matched_evidence_kind,
    -- ... other fields ...
    updated_at = now(),
    updated_by_run_id = EXCLUDED.updated_by_run_id
WHERE reconciliation_match.override_by IS NULL;
```

The `WHERE override_by IS NULL` clause is non-negotiable. Any cron path that omits it is a schema violation. Manual UI writes set `override_by` to the username + `override_at = now()` and the row becomes immune to cron updates.

---

## 7. Dashboard surfaces

### 7.1 Daily matrix view (PRV-1)

Top-level reconciliation overview. Reads `r.mv_reconciliation_daily_matrix`. Shows for each (client × platform × date in last 14 days + next 7 days):

- expected_open count (unresolved)
- matched / missing / late / unscheduled / observed_no_ice / suppressed counts
- observer freshness indicator (joins `r.mv_observer_freshness_summary`)
- click-through to drilldown

Suppressed counts (v2): displayed dimmed; tooltip explains "publish_profile paused; cadence rule active."

### 7.2 Drilldown panel

Per (client × platform × date) drilldown. Shows:

- All `r.expected_publication` rows for the day, with status and matched evidence
- Click any row → see ICE evidence, platform observations, manual observations, match record
- Manual override action button (writes to `r.reconciliation_match` with `override_by`)

### 7.3 Minimal manual entry form (PRV-2)

Captures `r.platform_manual_observation` rows. 7 fields: client (dropdown), platform (dropdown), platform_post_id (text), permalink_url (text), observed_local_date (date), caption_text (textarea), observation_method (dropdown).

Auto-populates: caption_normalised (via `r.normalise_text`), observed_at = now(), submitted_by from auth, submitted_at = now().

### 7.4 Triage Inbox (PRV-5)

Full UX deferred to PRV-5 brief. v1 placeholder: single page listing all `r.expected_publication` with `expected_status IN ('missing','late','observed_no_ice')` and unresolved drift rows.

### 7.5 Cadence drift visibility

Reads `r.cadence_drift_log` WHERE `operator_action IS NULL` ORDER BY detected_at DESC. PRV-1 shows row count + table with drift_kind + drift_severity + drift_summary + action button.

---

## 8. PRV-1 cc-NNNN brief breakdown

### 8.1 cc-0008 — `c.client_cadence_rule` table + seed (DDL + DML only)

Scope:

- Create `c.client_cadence_rule` table (§3.2 DDL — v2 with `preferred_local_times time[]`).
- Seed initial rows derived from `c.client_publish_schedule` × `c.client_publish_profile` per active client × platform.
- Populate `k.table_registry` + `k.column_registry` rows.

Out of scope (deferred to cc-0009):

- `r.*` schema.
- `r.expected_publication`, `r.reconciliation_run` tables.
- Helper functions `r.normalise_text`, `r.to_sydney_local_date`.
- `cadence-rule-generator` Edge Function deploy.
- pg_cron schedule.
- First generator invocation / backfill.

PK approval gate: §3.5-style seed surface table + Option choice (paused-IG handling) + 4 decision points + D-01 fire + explicit approval phrase.

**v2 amendment:** Per PK directive 2026-05-09 (paused-profile suppression model), all 14 (client × platform) cadence rules have `is_active=true`. The 2 paused IG rows (NDIS-Yarns, Property Pulse) keep cadence intent active; their `notes` capture `c.client_publish_profile.publish_enabled=false` + `paused_reason`. Generator-side suppression handled in cc-0009.

### 8.2 cc-0009 — `r.*` schema + `r.reconciliation_run` + `r.expected_publication` + helper functions + generator EF deploy + first backfill + cron enable

Scope:

- Create `r` schema with grants (§3.1).
- Create `r.reconciliation_run` (§3.8) and `r.expected_publication` (§3.3) tables.
- Create helper functions `r.normalise_text`, `r.to_sydney_local_date` (§4.1, §4.2).
- Deploy `cadence-rule-generator` EF (§5.1) with `verify_jwt=false` config.toml entry.
- Enable pg_cron daily 02:00 Sydney + on-demand RPC trigger.
- Run first invocation (7-day backfill + 7-day forward; D-23).
- **v2:** Lock cc-0009 brief decision: option (a) skip-on-paused vs option (b) `expected_status='suppressed'` for paused-profile rows. Either chosen path must be reflected in the generator pseudocode + schema (`expected_status` enum already includes `suppressed` per §3.3).

Out of scope:

- `r.ice_publication_evidence`, `r.platform_observation`, `r.platform_manual_observation`, `r.reconciliation_match`, `r.platform_observer_health` (cc-0010).
- `r.compact_raw_json` (cc-0010).
- `ice-evidence-materialiser`, `reconciliation-matcher` (cc-0010).
- Any per-platform observer (PRV-2/3/4).
- `r.cadence_drift_log` + `cadence-drift-checker` + materialised views (cc-0011).

### 8.3 cc-0010 — `r.platform_observation` + `r.platform_manual_observation` + `r.ice_publication_evidence` + `r.reconciliation_match` + `r.platform_observer_health` + `r.matcher_config` + ICE evidence materialiser + manual observation CSV import + matcher EF v0 (manual + Tier 1 only)

Scope:

- All §3.4–§3.7 + §3.9 tables.
- `r.matcher_config` + global default row (§6.3).
- Helper `r.compact_raw_json` (§4.3).
- `ice-evidence-materialiser` EF (§5.2) + cron every 30 min.
- `reconciliation-matcher` EF v0 (Tier 1 only — ice evidence; Tier 2–5 deferred to PRV-2/3/4 cc-NNNN briefs once observers exist) + cron every 30 min.
- Manual observation CSV import RPC (one-off; PRV-2 brief gives full UI).

Out of scope:

- Per-platform observer EFs (PRV-2/3/4).
- Tier 2–5 matching (depends on observers existing).
- `r.cadence_drift_log` (cc-0011).
- Materialised views (cc-0011).

### 8.4 cc-0011 — `r.cadence_drift_log` + `cadence-drift-checker` EF + materialised views + matrix view

Scope:

- `r.cadence_drift_log` table (§3.10).
- `cadence-drift-checker` EF (§5.3) + weekly cron Mon 06:00 Sydney.
- `r.mv_reconciliation_daily_matrix` materialised view (§3.11).
- `r.mv_observer_freshness_summary` materialised view (§3.11).
- Hourly refresh cron for materialised views.

Out of scope:

- Tier 2–5 matching (PRV-2/3/4 cc-NNNN briefs).
- Auto-remediation of drift (PRV-7+).

### 8.5 PRV-1 close gate

PRV-1 closes when:

1. `c.client_cadence_rule` has rows for all active (client × platform) pairs.
2. `r.expected_publication` is being generated daily without errors for 4 consecutive runs.
3. `r.reconciliation_match` Tier 1 (ice evidence) is matching at ≥ 95% for the last 7 days of expected rows for clients where ICE pipeline is healthy.
4. Manual observation CSV import has been exercised at least once.
5. `cadence-drift-checker` weekly cron has fired at least once and produced 0 `error`-severity drift entries (or those have been resolved to `document_intentional`).
6. Dashboard daily matrix view is loading and displaying correct counts.
7. `m.ef_drift_log` is clean for all reconciliation EFs.

---

## 9. Verification approach

### 9.1 General pattern

Every cc-NNNN brief in PRV-1 includes:

1. Pre-flight P1.x discovery (read-only) capturing source row counts, schema shapes, and EF/cron states.
2. DDL + DML proposal.
3. D-01 fire (`ask_chatgpt_review` action_type per scope).
4. apply_migration + EF deploy + cron enable as appropriate.
5. V1–Vn post-apply verification queries.
6. Result file with all of the above + outcome.
7. 4-way sync close.

### 9.2 Cross-brief verification

After each cc-NNNN apply, the next brief's pre-flight verifies prior cc-NNNN outputs are still in place. cc-0009 pre-flight checks `c.client_cadence_rule` row count = expected. cc-0010 pre-flight checks `r.expected_publication` is being generated.

This rolling verification means a regression in an earlier brief surfaces at the next apply, not weeks later.

### 9.3 Acceptance integrity (per D-50 / Lesson v2.50)

After each cc-NNNN apply commit, chat re-fetches the landed file/blob via `get_file_contents` and verifies SHA + size match local fingerprint. PRV-1 close gate (§8.5) includes acceptance-integrity audit of all 4 cc-NNNN apply commits + their result file commits.

---

## 10. Risks register (locked from round-2 + new)

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Cadence rule seed wrong on day 1 → all reconciliation downstream wrong | PK reviews seed surface table pre-apply (cc-0008 §3.5). |
| R-2 | Generator EF cron stalls silently | `r.reconciliation_run` audit row + `m.ef_drift_log` integration (D-20). |
| R-3 | Platform observer falls behind | `r.platform_observer_health.consecutive_failure_count` surface; dashboard alert at >= 3. |
| R-4 | Manual override clobbered by cron | D-21 hard lock — `WHERE override_by IS NULL` clause mandatory. |
| R-5 | Caption similarity false positive | Tier 5 confidence is 0.750 (lowest); manual override always available. |
| R-6 | Cadence rule and publish-side drift unnoticed | `cadence-drift-checker` (§5.3) weekly + `r.cadence_drift_log`. |
| R-7 | `r.expected_publication` UNIQUE constraint conflict on regenerated horizons | INSERT ... ON CONFLICT DO NOTHING (§5.1). |
| R-8 | `r.platform_observation` raw_payload bloat | `r.compact_raw_json` strips bulky keys (§4.3). |
| R-9 | Materialised view refresh stale during dashboard read | hourly refresh + `last_refreshed` column visible to UI. |
| R-10 (v2) | Paused profile (e.g., Meta anti-spam) generates false missing alerts | v2 generator clause: detect publish_profile.publish_enabled=false → suppress/skip. cc-0009 brief locks option (a) vs (b). |

---

## 11. PK approvals (2026-05-09 Sydney)

### 11.1 Commit path

PK approved committing PRV-0 design lock to `docs/dashboard-review-2026-05/prv-0-design-lock.md` as the canonical Platform Reconciliation Subsystem design contract. v1 landed at commit `24d08aeeb6ed793171f76191f41545cdaca32b5d`. v2 amendments commit follows this approval.

### 11.2 Seed authority for cc-0008

PK approved chat as the seed author for `c.client_cadence_rule` cc-0008 initial rows. Chat derives empirically from `c.client_publish_schedule` × `c.client_publish_profile`; PK reviews via §3.5-style surface table; D-01 fires; PK explicit approval phrase received; chat applies via single `apply_migration`.

### 11.3 cc-0008 / cc-0009 sequencing

PK approved hard-line sequencing: cc-0008 = DDL + seed only. No EF deploy. No cron. No first generator invocation. No `r.*` schema. No temporary log tables. All such items deferred to cc-0009.

### 11.4 v2 amendments (this header) — minute precision + paused-profile suppression

PK approved 2026-05-09 (this session):

- Replace `preferred_local_hours int[]` with `preferred_local_times time[]` as the authoritative cadence schedule field. Hour-level metadata is derived (not stored authoritatively). Notes alone are insufficient to preserve minute precision.
- Add paused-profile handling clause to `cadence-rule-generator`. Cadence rule remains `is_active=true` for paused platforms; generator detects `c.client_publish_profile.publish_enabled=false` and either skips insert or emits `expected_status='suppressed'` (cc-0009 brief locks the choice). Distinguishes "not part of cadence" from "temporarily paused."

These amendments propagate into cc-0008 (seed uses `preferred_local_times` arrays; all 14 rows `is_active=true`) and cc-0009 (generator implements the paused-profile clause; brief locks suppress vs skip).

---

*End of PRV-0 design lock. Schema, contracts, and cc-NNNN breakdown locked. PK approvals received 2026-05-09 (see §11). cc-0008 apply brief authoring is the next implementation deliverable.*
