# Brief cc-0008 — `c.client_cadence_rule` table + initial seed (PRV-1 first build)

**Created:** 2026-05-09 Sydney
**Author:** chat (Claude)
**Executor:** chat applies via Supabase MCP `apply_migration` per memory standing rule ("apply_migration is the ONLY correct DDL path for c/m/f/t schemas"). DML seed applied in the same migration call (single transactional unit). CC role: 0 in cc-0008 (chat-driven DDL+DML; no `supabase/migrations/*.sql` file required).
**Status:** drafted (apply pending PK seed review + D-01 fire + PK explicit approval phrase)
**Authority:** PRV-0 design lock — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `24d08aeeb6ed793171f76191f41545cdaca32b5d` blob `ea67a51b0e69c22f7f68712beba07946b8cc968a`
**Source design section:** PRV-0 §3.2 (DDL), §8.1 (cc-0008 scope contract), §11 (PK approvals — commit path + seed authority + sequencing)
**Result file:** `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md` (created on completion of apply session)

---

## Patch history

- **2026-05-09 Sydney — initial draft (v1)** under PK direction. Authored after PRV-0 design lock commit landed and PK signalled "Start cc-0008 apply brief authoring." Pre-flight P1.1–P1.11 ran read-only against production via Supabase MCP `execute_sql`; results captured below in §1. Seed derived empirically from `c.client_publish_schedule` × `c.client_publish_profile` joined on (client_id, platform); decisions on paused-IG handling surfaced for PK in §3.5.

---

## Investigation record

Source: PRV-0 design lock (this session) + chat pre-flight discovery 2026-05-09.

**Trigger:** PRV-0 §8.1 cc-0008 scope contract locked at PK approval 2026-05-09 — cc-0008 creates and seeds `c.client_cadence_rule` only; no generator EF deploy, no cron, no live execution.

**Why now:** cc-0008 is the first cc-NNNN brief in the PRV-1 build sequence (PRV-1 = cc-0008..cc-0011 per PRV-0 §8). The reconciliation pipeline cannot generate `r.expected_publication` rows in cc-0009 unless `c.client_cadence_rule` exists with seed rows reflecting current ICE intent. Therefore cc-0008 must apply cleanly before cc-0009 can be authored or applied.

**What this brief delivers:**
1. New table `c.client_cadence_rule` with all FKs, CHECKs, indexes per PRV-0 §3.2.
2. Initial seed of 14 rows — one per active (client × platform) — derived from `c.client_publish_schedule` (canonical cadence config) joined to `c.client_publish_profile` (publish_enabled, preferred_format).
3. `k.table_registry` + `k.column_registry` documentation rows for the new table per PRV-0 §3.12 standing rule.

**What this brief does NOT deliver** (per PK sequencing clarification 2026-05-09 reflected in PRV-0 §11.3):
- No `r.*` schema (cc-0009).
- No `r.reconciliation_run` table (cc-0009).
- No `r.expected_publication` table (cc-0009).
- No `cadence-rule-generator` Edge Function deploy (cc-0009).
- No cron setup (cc-0009).
- No first generator invocation (cc-0009).
- No temporary log tables (resolved by sequencing — chicken/egg avoided).

**Class match — cc-0001 onboarding-class brief:** Second cc-NNNN brief at "build" class (vs "recovery" class for cc-0003..cc-0007). DDL + seed in one transactional unit, with seed derived from existing config and surfaced to PK pre-apply.

---

## Design intent (replaces "symptom" + "root hypothesis" sections used in recovery briefs)

**Intent:** Establish the canonical source of truth for "this client should publish on this platform with this cadence" as a first-class table in the `c.*` schema, replacing the implicit cadence definition currently spread across `c.client_publish_schedule` (the row-per-slot config) + `c.client_publish_profile` (per-platform pause flag, preferred format, max-per-day).

**Why a new table rather than a view over existing config:**

1. **Reconciliation surface needs deterministic input.** PRV-0 D-2 ("expected ≠ queued") requires cadence to be derivable independent of queue/publish state. A view over the existing slot-row config would still depend on the same source; consolidating to one row per (client × platform × cadence regime) makes generator pseudocode simpler.
2. **Future-proofing for PRV-7+ migration.** PRV-0 D-3 schedules publish-side migration onto `c.client_cadence_rule` after PRV-6 close. Having the canonical table now means the migration path is "switch reads from old config to new" rather than "build new + switch + migrate".
3. **Drift checker requires both sides.** PRV-0 §5.3 cadence-drift-checker compares (a) `c.client_cadence_rule` predictions vs (b) slot-table-derived publish-side predictions. Both must exist as queryable surfaces; (b) already exists (`c.client_publish_schedule`); (a) is created in cc-0008.

**No production behaviour changes from cc-0008 in isolation.** `c.client_cadence_rule` is read by no Edge Function, no cron, no slot generator, and no UI page until cc-0009 (which creates the `r.*` reader path) and PRV-7+ (which migrates publish-side). cc-0008 is pure schema + seed; the table sits inert until cc-0009 wires it up.

## Blast radius

**Zero immediate runtime impact.** No EF reads `c.client_cadence_rule` until cc-0009 deploys `cadence-rule-generator`. No cron is added by cc-0008. No existing query is modified.

**Indirect risk surface:**

1. **Seed correctness affects all downstream PRV-1 reconciliation.** A wrong seed row (wrong weekday, wrong hour, wrong platform) → every subsequent `r.expected_publication` row generated by cc-0009 will inherit the wrong predictions → reconciliation will report `missing` or `late` falsely. Mitigation: PK reviews seed pre-apply per PRV-0 §11.2.
2. **Schema drift if PRV-7+ later changes columns.** Adding columns is backward-compatible; renaming/removing requires a migration. cc-0008 follows PRV-0 §3.2 verbatim; future drift surfaces via `m.ef_drift_log` or formal PRV-7+ migration brief.
3. **k.table_registry + k.column_registry sync drift.** If columns are added later without registry update, doc catalog drifts. Mitigation: standing rule per PRV-0 §3.12 + lesson candidate (column-purpose population in same migration call).

**Cost-of-waiting before cc-0008 applies:** Low. PRV-1 build cannot proceed without it, but no live system is degraded. PRV-1 itself is the next strategic deliverable, not an active incident.

---

## Source context

- **PRV-0 design lock** — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `24d08aeeb6ed793171f76191f41545cdaca32b5d`. Authoritative for table DDL (§3.2), helper-function plan (§4 — but cc-0008 does NOT create helpers), drift-checker plan (§5.3), cc-NNNN sequencing (§8.1, §8.2), PK approvals (§11).
- **`c.client_publish_schedule`** — canonical source for current weekday × time cadence per (client, platform); 1 row per (client, platform, day_of_week, publish_time, enabled).
- **`c.client_publish_profile`** — current source for `publish_enabled`, `paused_reason`, `preferred_format_<platform>`, `max_per_day`, `min_gap_minutes`.
- **`c.client_ai_profile`** — informational only for cc-0008 (contains `platform_rules` + `generation` jsonb but cadence is in publish-schedule, not ai-profile).
- **`c.client`** — FK target (status='active' filter; 4 rows).
- **`k.table_registry` + `k.column_registry`** — doc-catalog targets per PRV-0 §3.12.
- **`m.chatgpt_review`** — D-01 audit trail; one row will be inserted at apply time when chat fires `ask_chatgpt_review` per §5.
- **PRV-0 §11.2 seed authority** — chat authors seed; PK reviews; D-01 fires; apply.

## Scope

**In scope:**
- Read-only pre-flight verification (§1) — completed during this brief authoring session; results frozen below.
- One D-01 fire (`ask_chatgpt_review`) per §5 packet; action_type `sql_destructive` (DDL + DML in single transactional migration).
- One `apply_migration` call applying the DDL + seed + k.* registry rows together as a single transactional unit named `cc_0008_client_cadence_rule`.
- 6 verification queries V1–V6 (§4).
- Close-the-loop UPDATE to `m.chatgpt_review` post-apply.
- One commit creating `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`.
- 4-way sync close at session end per memory standing rule.

**Out of scope:**
- Any DDL touching `m.*`, `f.*`, `t.*`, `r.*`, `k.*` schemas beyond the new `c.client_cadence_rule` + its 2 doc-catalog rows in `k.*`.
- Any DML touching tables other than `c.client_cadence_rule` (the seed) and `k.table_registry` + `k.column_registry` (the doc rows).
- `r.*` schema creation (cc-0009).
- `r.reconciliation_run`, `r.expected_publication` (cc-0009).
- `cadence-rule-generator` Edge Function deploy (cc-0009).
- Cron setup of any kind (cc-0009).
- First generator invocation / backfill (cc-0009).
- Helper functions `r.normalise_text`, `r.to_sydney_local_date` (cc-0009).
- `r.compact_raw_json` helper (cc-0010).
- Any temporary log table — explicitly forbidden by PK sequencing clarification (PRV-0 §11.3 closing line).
- Phase 0 scheduling.
- M8b separate brief work.
- 5 outstanding `m.chatgpt_review` close-the-loop UPDATE carries (separate carry).

## Allowed actions

- Read-only `SELECT` against `c.client`, `c.client_publish_profile`, `c.client_publish_schedule`, `c.client_ai_profile`, `k.table_registry`, `k.column_registry`, `m.chatgpt_review`, `pg_extension`, `information_schema.tables`, `information_schema.columns` for pre-flight + verification.
- One `ask_chatgpt_review` D-01 fire per §5.
- One `apply_migration` call per §3 (DDL + DML + k.* registry rows in one transactional unit).
- Up to 3 retry attempts on V1–V6 (network/timeout reasons only).
- One `m.chatgpt_review` UPDATE post-apply for close-the-loop.
- One commit creating `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`.
- One commit updating `docs/00_sync_state.md` + `docs/00_action_list.md` + `docs/runtime/sessions/YYYY-MM-DD-cc-0008-applied.md` + dashboard PHASES roadmap (4-way sync) at session close.

## Forbidden actions

- **No `apply_migration` call before D-01 returns clean agree + PK explicit approval phrase.**
- **No `apply_migration` call before PK has reviewed the seed rows in §3.5 and approved.**
- **No `execute_sql` for any DDL of any kind** (per memory: "execute_sql is effectively read-only on c/f/m/t schemas for DML").
- No `r.*` schema creation in this brief (deferred to cc-0009).
- No EF deploy of any kind.
- No cron edit of any kind.
- No insert into `c.client_cadence_rule` outside the migration's seed.
- No update to `c.client_publish_schedule` or `c.client_publish_profile` (read-only sources).
- No update to `m.chatgpt_review` beyond the close-the-loop UPDATE for the cc-0008 D-01 row.
- No use of `apply_migration` for anything other than the named single migration `cc_0008_client_cadence_rule`.
- No deployment of `cadence-rule-generator`, `ice-evidence-materialiser`, `cadence-drift-checker`, or `reconciliation-matcher` Edge Functions.
- No creation of any `r.*` table, view, or function (all deferred).
- **No creation of any temporary log table** — explicitly forbidden per PK sequencing clarification 2026-05-09.
- No DDL adjustments deviating from PRV-0 §3.2 unless §1 pre-flight surfaces a constraint that genuinely blocks apply.
- No proceeding past D-01 if verdict is anything other than `agree` with `proceed`.
- No proceeding past PK seed review if PK requests modification — return to brief authoring.
- No M8 work (cc-0005 v4 is a separate brief).
- No Phase 0 scheduling activity.

---

## 1. Pre-flight verification (read-only) — COMPLETED 2026-05-09

All §1.x sub-checks ran read-only against production via Supabase MCP `execute_sql` during brief authoring. Re-run §1.1, §1.5, §1.10, §1.11 within ~60s of apply (final re-verification) to confirm no drift. Empirical results captured here are authoritative for D-01 packet `verified_claims`.

### 1.1 Existence + extension + schema readiness — PASS

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='c' AND table_name='client_cadence_rule') AS table_exists,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname='pgcrypto') AS pgcrypto_installed,
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='c') AS schema_c_exists,
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='k') AS schema_k_exists;
```

**Result:** `{table_exists:false, pgcrypto_installed:true, schema_c_exists:true, schema_k_exists:true}`

**Decision rule:** any `false` on the three required `true` values → HALT (§6.2.a/b/c). `table_exists=true` → HALT (§6.2.a — idempotency). All conditions match expected → PASS.

### 1.2 `c.client` FK target structure — PASS

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='c' AND table_name='client'
ORDER BY ordinal_position;
```

**Result:** `client_id` is `uuid`, `is_nullable=NO`, default `gen_random_uuid()`. PRV-0 §3.2 DDL `client_id uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE` is satisfied.

### 1.3 Active clients (FK seed targets) — PASS, count = 4

| client_slug | client_id | timezone |
|---|---|---|
| care-for-welfare-pty-ltd | `3eca32aa-e460-462f-a846-3f6ace6a3cae` | Australia/Sydney |
| invegent | `93494a09-cc89-41d1-b364-cb63983063a6` | Australia/Sydney |
| ndis-yarns | `fb98a472-ae4d-432d-8738-2273231c1ef4` | Australia/Sydney |
| property-pulse | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` | Australia/Sydney |

**Decision rule:** count != 4 → SURFACE to PK; all timezones != 'Australia/Sydney' → HALT (§6.2.e). Match → PASS.

### 1.4 `c.client_publish_profile` per active client × platform — PASS, 14 rows

| client_slug | platform | publish_enabled | paused_reason |
|---|---|---|---|
| care-for-welfare-pty-ltd | facebook | true | NULL |
| care-for-welfare-pty-ltd | instagram | true | NULL |
| care-for-welfare-pty-ltd | linkedin | true | NULL |
| invegent | facebook | true | NULL |
| invegent | instagram | true | NULL |
| invegent | linkedin | true | NULL |
| ndis-yarns | facebook | true | NULL |
| ndis-yarns | instagram | **false** | `meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam` |
| ndis-yarns | linkedin | true | NULL |
| ndis-yarns | youtube | true | NULL |
| property-pulse | facebook | true | NULL |
| property-pulse | instagram | **false** | `meta_subcode_2207051_block_25_apr_pp_ig_anti_spam` |
| property-pulse | linkedin | true | NULL |
| property-pulse | youtube | true | NULL |

**Findings:** 14 (client × platform) profiles confirmed; 12 active + 2 paused IG. `max_per_day=2` for all rows; `min_gap_minutes` ∈ {240, 360}. `preferred_format_facebook='image_quote'` for all 4 active FB rows; LI + IG preferred-format columns are NULL across the board. No `paused_until` (time-bound pauses); only `publish_enabled=false` + `paused_reason` text.

### 1.5 `c.client_publish_schedule` aggregate cadence — PASS, 14 active patterns

| client_slug | platform | enabled_slots | weekdays_pg | hour | publish_time | format | publish_enabled |
|---|---|---|---|---|---|---|---|
| care-for-welfare-pty-ltd | facebook | 5 | [1,2,3,4,5] | 9 | 09:06:00 | image_quote | true |
| care-for-welfare-pty-ltd | instagram | 5 | [1,2,3,4,5] | 11 | 11:02:00 | NULL | true |
| care-for-welfare-pty-ltd | linkedin | 5 | [1,2,3,4,5] | 13 | 13:04:00 | NULL | true |
| invegent | facebook | 5 | [1,2,3,4,5] | 8 | 08:06:00 | image_quote | true |
| invegent | instagram | 5 | [1,2,3,4,5] | 10 | 10:36:00 | NULL | true |
| invegent | linkedin | 5 | [1,2,3,4,5] | 12 | 12:36:00 | NULL | true |
| ndis-yarns | facebook | 5 | [1,2,3,4,5] | 8 | 08:00:00 | image_quote | true |
| ndis-yarns | instagram | 5 | [1,2,3,4,5] | 12 | 12:00:00 | NULL | **false** |
| ndis-yarns | linkedin | 5 | [1,2,3,4,5] | 10 | 10:00:00 | NULL | true |
| ndis-yarns | youtube | 5 | [1,2,3,4,5] | 19 | 19:00:00 | NULL | true |
| property-pulse | facebook | 5 | [1,2,3,4,5] | 7 | 07:30:00 | image_quote | true |
| property-pulse | instagram | 5 | [1,2,3,4,5] | 10 | 10:00:00 | NULL | **false** |
| property-pulse | linkedin | 5 | [1,2,3,4,5] | 12 | 12:00:00 | NULL | true |
| property-pulse | youtube | 5 | [1,2,3,4,5] | 17 | 17:00:00 | NULL | true |

**Findings:** Every active (client × platform) pair publishes Mon–Fri (PostgreSQL day_of_week 1..5; Sunday=0). One enabled hour per weekday, so 5 enabled slots/week per pair. `c.client_publish_schedule.day_of_week` integer convention matches PRV-0 §3.2 `weekdays int[]` comment "0=Sun..6=Sat, Sydney local" — no remapping needed. Disabled slot rows exist per pair (e.g. CFW FB has 4 publish_time options/weekday but only 09:06 enabled); the cadence rule reflects ENABLED slots only. `paused_until` NULL on all 14 profile rows; the 2 paused-IG rows use `publish_enabled=false` + `paused_reason` (indefinite).

**Captured for D-01:** 14 uniform weekly patterns; cadence_type='weekly', posts_per_period=5, period_unit='week', weekdays=[1,2,3,4,5]. Cleared.

### 1.6 `c.client_ai_profile` interpretation (informational) — N/A for cadence

`c.client_ai_profile` columns include `platform_rules jsonb`, `generation jsonb`, `persona jsonb`, `guidelines jsonb`, `system_prompt text`. None encode cadence (weekday × hour). Cadence is canonically in `c.client_publish_schedule`. No reads from `c.client_ai_profile` for seed derivation.

### 1.7 Slot-related table inventory — PASS

```sql
SELECT table_schema, table_name FROM information_schema.tables
WHERE (table_name ~* 'slot' OR table_name ~* 'cadence' OR table_name ~* 'schedul')
  AND table_schema NOT IN ('pg_catalog','information_schema')
ORDER BY table_schema, table_name;
```

**Result (6 rows):** `audit.v_slot_health_by_client_platform`, `c.client_publish_schedule`, `m.slot`, `m.slot_alerts`, `m.slot_fill_attempt`, `m.slots_in_critical_window`.

**Interpretation:** `c.client_publish_schedule` is the cadence config (one row per slot definition). `m.slot` is the runtime slot row materialisation. PRV-0 cadence rule reads from CONFIG, not RUNTIME, so `c.client_publish_schedule` is the correct source. `m.slot` is irrelevant to cc-0008 seed.

### 1.8 `k.table_registry` + `k.column_registry` shape + convention — PASS

**`k.table_registry`:** PK = `table_id bigint`. NOT NULL: `schema_name`, `table_name`, `table_kind`, `status`, `allowed_ops`, `pii_risk`, `purpose`, `created_at`, `updated_at`. Optional: `owner`, `source_system`, `source_reference`, `refresh_method`, `refresh_cadence`, `primary_use_cases`, `join_keys`, `rules_summary`, `advisory`.

**`k.column_registry`:** PK = `column_id bigint`. NOT NULL: `table_id` (FK to `k.table_registry`), `column_name`, `ordinal_position`, `data_type`, `is_nullable` (boolean), `is_foreign_key` (boolean), `pii_risk`, `created_at`, `updated_at`. Optional: `udt_name`, `column_default`, `fk_ref_schema`, `fk_ref_table`, `fk_ref_column`, `column_purpose`, `value_semantics`, `allowed_values`, `example_values`, `quality_rules`, `notes`.

**Memory correction:** memory says "k.column_registry has no schema_name/table_name columns — joins must go through k.table_registry on table_id"; correct table-level doc column is `purpose`. Both confirmed empirically.

**Convention from sample existing rows (`c.client`, `c.client_ai_profile`, etc.):** `table_kind='table'`, `status='active'`, `allowed_ops='upsert'`, `pii_risk='none'`. Applied to the new table.

### 1.9 Day-of-week convention in `c.client_publish_schedule` — PASS

distinct_dow ⊆ {0,1,2,3,4,5,6} per §1.5 result. PG convention 0=Sun..6=Sat aligns with PRV-0 §3.2 `weekdays` comment. No translation required at seed time.

### 1.10 `m.chatgpt_review` audit trail — PASS, no prior cc-0008

```sql
SELECT COUNT(*) FILTER (WHERE proposal ILIKE '%cc-0008%') AS cc_0008_review_rows,
       COUNT(*) FILTER (WHERE proposal ILIKE '%client_cadence_rule%') AS cadence_rule_review_rows
FROM m.chatgpt_review;
```

**Result:** `cc_0008_review_rows = 0`, `cadence_rule_review_rows = 0`. Clean ledger; first-fire idempotency.

### 1.11 `apply_migration` history — informational

Memory standing rule: "apply_migration is the ONLY correct DDL path for c/m/f/t schemas". Pattern proven across cc-0005, cc-0006 v3, M4 migration.

The `cc_0008_client_cadence_rule` migration name is reserved for the single transactional unit. Migration name MUST be unique vs `supabase_migrations.schema_migrations` history at apply time:

```sql
-- Final re-verification check (re-run within ~60s of apply)
SELECT version FROM supabase_migrations.schema_migrations
WHERE name = 'cc_0008_client_cadence_rule';  -- expect 0 rows pre-apply
```

If row exists → HALT (§6.2.g — name collision; rename or investigate).

---

## 2. Proposed DDL (PRV-0 §3.2 verbatim, with defensive `IF NOT EXISTS`)

PRV-0 §3.2 DDL is reproduced unmodified except for one safety adjustment: `IF NOT EXISTS` on `CREATE TABLE` and indexes for idempotency protection (zero risk; protects narrow race windows). No CHECK, FK, or column changed. PRV-0 contract honoured exactly.

```sql
-- cc-0008 migration — c.client_cadence_rule table

CREATE TABLE IF NOT EXISTS c.client_cadence_rule (
    cadence_rule_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id              uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform               text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    cadence_type           text NOT NULL CHECK (cadence_type IN ('daily','weekly','monthly','custom_cron','none')),
    posts_per_period       int CHECK (posts_per_period > 0),
    period_unit            text CHECK (period_unit IN ('day','week','month')),
    weekdays               int[] CHECK (weekdays <@ ARRAY[0,1,2,3,4,5,6]),
    preferred_local_hours  int[] CHECK (preferred_local_hours <@ ARRAY(SELECT generate_series(0,23))),
    expected_format        text,
    timezone               text NOT NULL DEFAULT 'Australia/Sydney',
    valid_from             date NOT NULL DEFAULT current_date,
    valid_to               date,
    is_active              boolean NOT NULL DEFAULT true,
    suppression_dates      date[] DEFAULT '{}',
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

CREATE INDEX IF NOT EXISTS cadence_rule_active_lookup
    ON c.client_cadence_rule (client_id, platform, is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS cadence_rule_validity_lookup
    ON c.client_cadence_rule (valid_from, valid_to)
    WHERE is_active = true;

COMMENT ON TABLE c.client_cadence_rule IS 'Canonical cadence rules per (client, platform). Authoritative source for r.expected_publication generation. PRV-1 reconciliation reads this; publish-side reads existing scattered config in v1 and migrates onto this table in PRV-7+.';
```

---

## 3. Proposed DML — initial seed (chat-authored per PRV-0 §11.2; PK reviews before D-01 fires)

Seed strategy decision:

- **Option A — 12 active rows only.** Skip the 2 paused IG rows entirely. Reconciliation never expects them. Simpler.
- **Option B — 14 rows, 2 with `is_active=false`** (recommended; reflected below). Both paused IG rules seeded with `is_active=false` + notes capturing the `paused_reason`. Preserves historical intent; cadence-drift-checker (cc-0011) gets correct comparison data even for paused platforms; allows PK to flip `is_active=true` without re-deriving the rule when blocks lift.

PK directs change to Option A by reply if preferred — chat re-issues without the 2 `is_active=false` rows.

### 3.1 Active cadence rules (12 rows, `is_active=true`)

```sql
INSERT INTO c.client_cadence_rule (
    client_id, platform, cadence_type, posts_per_period, period_unit,
    weekdays, preferred_local_hours, expected_format,
    timezone, valid_from, valid_to, is_active, suppression_dates, notes,
    created_by, updated_by
) VALUES
-- Care For Welfare Pty Ltd
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[9],  'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 09:06).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[11], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 11:02).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[13], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 13:04).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- Invegent
('93494a09-cc89-41d1-b364-cb63983063a6', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[8],  'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 08:06).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('93494a09-cc89-41d1-b364-cb63983063a6', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[10], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 10:36).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('93494a09-cc89-41d1-b364-cb63983063a6', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[12], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 12:36).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- NDIS-Yarns (IG paused; see §3.2)
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[8],  'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 08:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[10], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 10:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'youtube',   'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[19], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 19:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- Property Pulse (IG paused; see §3.2)
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[7],  'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 07:30).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[12], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 12:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'youtube',   'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[17], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 initial seed; derived from c.client_publish_schedule enabled slots (Mon-Fri 17:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed');
```

### 3.2 Paused-IG cadence rules (2 rows, `is_active=false` per Option B)

```sql
INSERT INTO c.client_cadence_rule (
    client_id, platform, cadence_type, posts_per_period, period_unit,
    weekdays, preferred_local_hours, expected_format,
    timezone, valid_from, valid_to, is_active, suppression_dates, notes,
    created_by, updated_by
) VALUES
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[12], NULL, 'Australia/Sydney', current_date, NULL, false, '{}', 'cc-0008 initial seed; PAUSED. c.client_publish_profile.publish_enabled=false; paused_reason=meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam. Cadence preserved at Mon-Fri 12:00 for when block lifts; is_active=false until manually re-enabled.', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY[10], NULL, 'Australia/Sydney', current_date, NULL, false, '{}', 'cc-0008 initial seed; PAUSED. c.client_publish_profile.publish_enabled=false; paused_reason=meta_subcode_2207051_block_25_apr_pp_ig_anti_spam. Cadence preserved at Mon-Fri 10:00 for when block lifts; is_active=false until manually re-enabled.', 'cc-0008-chat-seed', 'cc-0008-chat-seed');
```

### 3.3 `k.table_registry` row for the new table

`table_id` is bigint; cc-0008 assumes identity-default behaviour and omits explicit value (PK reviews at apply pre-flight if column is not identity).

```sql
INSERT INTO k.table_registry (
    schema_name, table_name, table_kind, status, owner,
    source_system, source_reference, refresh_method, refresh_cadence,
    allowed_ops, pii_risk, purpose,
    primary_use_cases, join_keys, rules_summary, advisory
) VALUES (
    'c', 'client_cadence_rule', 'table', 'active', 'invegent',
    'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.2', 'manual_upsert', 'on_change',
    'upsert', 'none',
    'Canonical cadence rules per (client, platform). Authoritative source for r.expected_publication generation. PRV-1 reconciliation reads this; publish-side reads existing scattered config in v1 and migrates onto this table in PRV-7+.',
    'PRV-1 reconciliation seed for r.expected_publication; future PRV-7+ publish-side cadence source; cadence-drift-checker (cc-0011) input.',
    'client_id -> c.client(client_id); platform IN (facebook,instagram,linkedin,youtube)',
    '1 row per (client, platform, valid window). is_active=false reserves cadence shape for paused platforms. Edits do not auto-propagate to c.client_publish_schedule until PRV-7+.',
    'cc-0008 introduced this table. cc-0009 will deploy cadence-rule-generator EF reading this table. cc-0011 will deploy cadence-drift-checker comparing predictions vs publish-side config.'
);
```

### 3.4 `k.column_registry` rows for the 19 columns

Two-step pattern (information_schema-driven join with `column_purpose` from a small VALUES table):

```sql
WITH t AS (
    SELECT table_id FROM k.table_registry
    WHERE schema_name='c' AND table_name='client_cadence_rule'
),
cols AS (
    SELECT column_name, ordinal_position, data_type, udt_name,
           (is_nullable='YES') AS is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='c' AND table_name='client_cadence_rule'
),
purposes (column_name, fk_schema, fk_table, fk_column, column_purpose) AS (
    VALUES
    ('cadence_rule_id',       NULL::text, NULL::text, NULL::text,
     'Surrogate primary key. One row per cadence rule (client, platform, valid window).'),
    ('client_id',             'c', 'client', 'client_id',
     'FK to c.client. ON DELETE CASCADE — deleting a client removes all its cadence rules.'),
    ('platform',              NULL, NULL, NULL,
     'External publishing platform identifier. CHECK enum: facebook | instagram | linkedin | youtube. Excludes website/blog (PRV-0 D-22 deferred to PRV-7+).'),
    ('cadence_type',          NULL, NULL, NULL,
     'High-level cadence regime. CHECK enum: daily | weekly | monthly | custom_cron | none. cc-0008 seed uses ''weekly'' uniformly.'),
    ('posts_per_period',      NULL, NULL, NULL,
     'Number of expected publications per period_unit. NULL when cadence_type=none. CHECK > 0; jointly NULL or set with period_unit.'),
    ('period_unit',           NULL, NULL, NULL,
     'Period over which posts_per_period applies. CHECK enum: day | week | month. Jointly NULL or set with posts_per_period.'),
    ('weekdays',              NULL, NULL, NULL,
     'Allowed weekdays for publication. 0=Sun..6=Sat, Sydney local. CHECK weekdays <@ ARRAY[0..6]. cc-0008 seed uses {1,2,3,4,5} (Mon-Fri) for all 14 rows.'),
    ('preferred_local_hours', NULL, NULL, NULL,
     'Preferred publish hours in Sydney local time. CHECK preferred_local_hours <@ ARRAY[0..23]. cc-0008 seed uses 1 hour per (client, platform) per current single-slot config.'),
    ('expected_format',       NULL, NULL, NULL,
     'Expected post format for reconciliation Tier 4 fuzzy match (caption-similarity hint). cc-0008 seed: ''image_quote'' for FB rows; NULL for IG/LI/YT (no preferred_format_<platform> set).'),
    ('timezone',              NULL, NULL, NULL,
     'IANA tz name interpretation for valid_from/valid_to/preferred_local_hours/weekdays. NOT NULL; default Australia/Sydney.'),
    ('valid_from',            NULL, NULL, NULL,
     'Earliest date this cadence rule applies. NOT NULL; default current_date. Used by generator to bound horizon and by drift-checker to bound history.'),
    ('valid_to',              NULL, NULL, NULL,
     'Latest date this cadence rule applies. NULL means open-ended. CHECK valid_to IS NULL OR valid_to >= valid_from.'),
    ('is_active',             NULL, NULL, NULL,
     'Whether the rule should drive r.expected_publication generation. False = preserve historical intent without producing predictions. cc-0008: 12 rows true (active platforms); 2 rows false (paused IG anti-spam blocks).'),
    ('suppression_dates',     NULL, NULL, NULL,
     'One-off cancellation dates within the valid window. Generator skips these. cc-0008 seed: empty for all rows.'),
    ('notes',                 NULL, NULL, NULL,
     'Free-text narrative for human operators. cc-0008 seed populates with derivation provenance.'),
    ('created_at',            NULL, NULL, NULL, 'Row creation timestamp. NOT NULL; default now().'),
    ('created_by',            NULL, NULL, NULL, 'Identifier of the actor who created the row. cc-0008 seed: ''cc-0008-chat-seed''.'),
    ('updated_at',            NULL, NULL, NULL, 'Last-modified timestamp. NOT NULL; default now().'),
    ('updated_by',            NULL, NULL, NULL, 'Identifier of the last actor to modify the row. cc-0008 seed: ''cc-0008-chat-seed''.')
)
INSERT INTO k.column_registry (
    table_id, column_name, ordinal_position, data_type, udt_name,
    is_nullable, column_default,
    is_foreign_key, fk_ref_schema, fk_ref_table, fk_ref_column,
    column_purpose, pii_risk
)
SELECT t.table_id, c.column_name, c.ordinal_position, c.data_type, c.udt_name,
       c.is_nullable, c.column_default,
       (p.fk_schema IS NOT NULL), p.fk_schema, p.fk_table, p.fk_column,
       p.column_purpose, 'none'
FROM cols c
JOIN purposes p USING (column_name)
CROSS JOIN t;
```

This pattern keeps `data_type`/`udt_name`/`is_nullable`/`column_default` empirically sourced from `information_schema.columns` at apply time (so they always match the actual table) while `column_purpose` and FK metadata come from the small VALUES table (chat-authored documentation).

### 3.5 Seed surface for PK review

**Summary:** 14 rows total — 12 active + 2 paused (Option B).

| # | client_slug | platform | hour (Sydney) | format | is_active |
|---|---|---|---|---|---|
| 1 | care-for-welfare-pty-ltd | facebook | 9 | image_quote | true |
| 2 | care-for-welfare-pty-ltd | instagram | 11 | NULL | true |
| 3 | care-for-welfare-pty-ltd | linkedin | 13 | NULL | true |
| 4 | invegent | facebook | 8 | image_quote | true |
| 5 | invegent | instagram | 10 | NULL | true |
| 6 | invegent | linkedin | 12 | NULL | true |
| 7 | ndis-yarns | facebook | 8 | image_quote | true |
| 8 | ndis-yarns | linkedin | 10 | NULL | true |
| 9 | ndis-yarns | youtube | 19 | NULL | true |
| 10 | property-pulse | facebook | 7 | image_quote | true |
| 11 | property-pulse | linkedin | 12 | NULL | true |
| 12 | property-pulse | youtube | 17 | NULL | true |
| 13 | ndis-yarns | instagram | 12 | NULL | **false** (anti-spam) |
| 14 | property-pulse | instagram | 10 | NULL | **false** (anti-spam) |

Common attributes for all 14 rows: `cadence_type='weekly'`, `posts_per_period=5`, `period_unit='week'`, `weekdays=[1,2,3,4,5]`, `timezone='Australia/Sydney'`, `valid_from=current_date`, `valid_to=NULL`, `suppression_dates={}`.

**PK decision points before D-01 fire:**

1. **Option A vs Option B** (paused IG handling). Recommend B (14 rows; 2 with is_active=false). PK confirms or downgrades to A (12 rows only).
2. **`expected_format` policy.** Currently 4 FB rows have `image_quote`; 10 rows have NULL. PRV-0 §6.1 Tier 4 matcher uses `expected_format` only as a hint, not a blocker. PK confirms NULL is acceptable for IG/LI/YT, or supplies values to set.
3. **Hour aggregation policy.** `c.client_publish_schedule` rows include `MM:SS` precision (e.g. CFW FB = 09:06:00). The seed uses HOUR only (`preferred_local_hours=[9]`) since PRV-0 cadence rule has no minute-precision column. PK confirms minute precision is not required at cadence-rule layer (it can be added in cc-0009 generator window computation).
4. **`valid_from=current_date` for all rows.** Not historical; rule applies forward from apply date. Acceptable per PRV-0 D-23 (PRV-1 backfill is 7-day, generated by cc-0009). PK confirms.

PK explicit approval phrase required after seed review and before chat fires §5 D-01 packet.

---

## 4. Verification queries (post-apply, V1–V6)

All 6 must PASS post-apply. Run via Supabase MCP `execute_sql` (read-only) within ~60s of `apply_migration` completion.

### V1 — Table exists with all FKs, CHECKs, indexes per PRV-0 §3.2

```sql
-- V1a: table existence + column count
SELECT
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='c' AND table_name='client_cadence_rule') AS table_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='c' AND table_name='client_cadence_rule') AS column_count;

-- V1b: CHECK constraints
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname='c' AND rel.relname='client_cadence_rule' AND con.contype='c'
ORDER BY con.conname;

-- V1c: FK constraints
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname='c' AND rel.relname='client_cadence_rule' AND con.contype='f'
ORDER BY con.conname;

-- V1d: indexes
SELECT i.relname AS index_name, pg_get_indexdef(idx.indexrelid) AS definition
FROM pg_index idx
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='c' AND t.relname='client_cadence_rule'
ORDER BY i.relname;
```

**Pass:**
- V1a: `table_exists=true` AND `column_count=19`.
- V1b: ≥ 7 inline-CHECK + 2 named CHECK constraints (cadence_rule_period_when_count_set + cadence_rule_active_window_valid).
- V1c: 1 FK constraint referencing `c.client(client_id)` with `ON DELETE CASCADE`.
- V1d: ≥ 3 indexes (PK + cadence_rule_active_lookup + cadence_rule_validity_lookup).

### V2 — Seed row count matches chat-authored expectation

```sql
SELECT COUNT(*) AS total_rows,
       COUNT(*) FILTER (WHERE is_active=true) AS active_rows,
       COUNT(*) FILTER (WHERE is_active=false) AS inactive_rows
FROM c.client_cadence_rule;
```

**Pass (Option B):** `total_rows=14 AND active_rows=12 AND inactive_rows=2`.
**Pass (Option A — if PK selected):** `total_rows=12 AND active_rows=12 AND inactive_rows=0`.

### V3 — Every active (client × platform) pair has at least one seeded rule

```sql
WITH expected_active_pairs AS (
    SELECT cli.client_id, cli.client_slug, cpp.platform
    FROM c.client_publish_profile cpp
    JOIN c.client cli ON cli.client_id = cpp.client_id
    WHERE cli.status='active' AND cpp.publish_enabled=true
),
seeded_pairs AS (
    SELECT client_id, platform FROM c.client_cadence_rule WHERE is_active=true
)
SELECT
    (SELECT COUNT(*) FROM expected_active_pairs) AS expected_active_pairs_count,
    (SELECT COUNT(*) FROM seeded_pairs) AS seeded_active_pairs_count,
    array_agg(client_slug || '/' || platform) FILTER (
        WHERE NOT EXISTS (SELECT 1 FROM seeded_pairs s WHERE s.client_id = expected_active_pairs.client_id AND s.platform = expected_active_pairs.platform)
    ) AS missing_pairs
FROM expected_active_pairs;
```

**Pass:** `expected_active_pairs_count = seeded_active_pairs_count = 12 AND missing_pairs IS NULL`.

### V4 — No NULL in NOT NULL columns; CHECK constraints satisfied

```sql
SELECT
    COUNT(*) FILTER (WHERE client_id IS NULL) AS null_client_id,
    COUNT(*) FILTER (WHERE platform IS NULL) AS null_platform,
    COUNT(*) FILTER (WHERE cadence_type IS NULL) AS null_cadence_type,
    COUNT(*) FILTER (WHERE timezone IS NULL) AS null_timezone,
    COUNT(*) FILTER (WHERE valid_from IS NULL) AS null_valid_from,
    COUNT(*) FILTER (WHERE is_active IS NULL) AS null_is_active,
    COUNT(*) FILTER (WHERE created_at IS NULL) AS null_created_at,
    COUNT(*) FILTER (WHERE updated_at IS NULL) AS null_updated_at,
    COUNT(*) FILTER (WHERE (posts_per_period IS NULL) != (period_unit IS NULL)) AS broken_period_pair,
    COUNT(*) FILTER (WHERE valid_to IS NOT NULL AND valid_to < valid_from) AS broken_validity_window
FROM c.client_cadence_rule;
```

**Pass:** every count = 0.

### V5 — `valid_from <= valid_to` invariant where both set

```sql
SELECT cadence_rule_id, client_id, platform, valid_from, valid_to
FROM c.client_cadence_rule
WHERE valid_to IS NOT NULL AND valid_to < valid_from;
```

**Pass:** 0 rows returned.

### V6 — `k.table_registry` + `k.column_registry` rows populated for the new table

```sql
-- V6a: table registry row
SELECT table_id, schema_name, table_name, table_kind, status, allowed_ops, pii_risk,
       LEFT(purpose, 60) AS purpose_preview
FROM k.table_registry
WHERE schema_name='c' AND table_name='client_cadence_rule';

-- V6b: column registry rows
SELECT cr.column_name, cr.ordinal_position, cr.data_type, cr.is_nullable, cr.is_foreign_key,
       LEFT(cr.column_purpose, 60) AS purpose_preview
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name='c' AND tr.table_name='client_cadence_rule'
ORDER BY cr.ordinal_position;
```

**Pass:**
- V6a: 1 row with status='active', allowed_ops='upsert', pii_risk='none', purpose populated.
- V6b: 19 rows, ordinal_position 1..19 in sequence, every `column_purpose` non-NULL.

---

## 5. D-01 packet content (NOT YET FIRED)

### 5.1 `proposal` (prose)

```
Apply cc-0008 (PRV-1 first build): create c.client_cadence_rule
table + seed 14 rows (12 active + 2 paused IG with is_active=false;
per PRV-0 §11.2 chat-authored seed; per PK approval Option B) +
populate k.table_registry (1 row) + k.column_registry (19 rows).
All in one transactional unit via Supabase MCP apply_migration
named cc_0008_client_cadence_rule.

Source design: docs/dashboard-review-2026-05/prv-0-design-lock.md
commit 24d08aeeb6ed793171f76191f41545cdaca32b5d §3.2 (DDL verbatim)
+ §8.1 (cc-0008 scope contract; DDL+seed only, no EF, no cron)
+ §11 (PK approvals).

Pre-flight P1.1–P1.11 PASS:
- c.client_cadence_rule does not exist (idempotency confirmed)
- pgcrypto installed; schemas c + k exist
- c.client.client_id is uuid PK (FK target valid)
- 4 active clients confirmed (CFW, Invegent, NDIS-Yarns, Property Pulse)
- 14 (client × platform) profiles in c.client_publish_profile;
  12 publish_enabled=true, 2 false (Meta anti-spam IG blocks)
- c.client_publish_schedule shows uniform Mon-Fri weekly pattern,
  1 hour/day per pair (5 enabled slots/week per pair)
- day_of_week convention is 0..6 PG; matches PRV-0 §3.2 weekdays
- k.table_registry / k.column_registry shapes confirmed; convention
  values selected (table_kind=table, allowed_ops=upsert, pii_risk=none)
- No prior cc-0008 D-01 row in m.chatgpt_review (clean ledger)

DDL: PRV-0 §3.2 verbatim with defensive IF NOT EXISTS additions
on CREATE TABLE + CREATE INDEX. No semantic deviation.

DML: 14 INSERTs into c.client_cadence_rule + 1 INSERT into
k.table_registry + 19 INSERTs into k.column_registry (CTE-driven
join with information_schema.columns + chat-authored purposes
VALUES table). All in one apply_migration transactional unit.

Verification: V1 (table+FKs+CHECKs+indexes per PRV-0 §3.2),
V2 (row counts 14/12/2 matching seed), V3 (every active pair seeded),
V4 (no NULL in NOT NULL; joint period pair correct; window valid),
V5 (validity window invariant), V6 (k.* registry rows populated).
All 6 must PASS.

Rollback: DROP TABLE c.client_cadence_rule CASCADE + explicit
DELETE on k.column_registry + k.table_registry rows for this table
(see §6.3).

No production behaviour change in cc-0008 isolation: no EF reads
the table until cc-0009 deploys cadence-rule-generator.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply cc-0008: create c.client_cadence_rule table + 14-row initial seed + 1 k.table_registry row + 19 k.column_registry rows, all in one apply_migration transactional unit named cc_0008_client_cadence_rule.",
  "production_action_if_approved": "Single Supabase MCP apply_migration call applying DDL (CREATE TABLE c.client_cadence_rule with all FKs/CHECKs/indexes per PRV-0 §3.2 + IF NOT EXISTS defensive additions) + DML (14 INSERTs into c.client_cadence_rule per §3.1+§3.2; 1 INSERT into k.table_registry per §3.3; 19 INSERTs into k.column_registry per §3.4) as one transactional unit.",
  "consequence_if_delayed": "PRV-1 build sequence stalls. cc-0009 (r.* schema + cadence-rule-generator EF deploy + first backfill) cannot apply until cc-0008 lands because cc-0009's cadence-rule-generator needs c.client_cadence_rule rows to read. Delay is direct schedule slip on PRV-1.",
  "cost_of_waiting": "Low. No live system degraded. PRV-1 is the next strategic deliverable, not an active incident. Acceptable to delay to capture PK seed review feedback or refine seed.",
  "current_evidence": [
    "PRV-0 design lock: docs/dashboard-review-2026-05/prv-0-design-lock.md commit 24d08aeeb6ed793171f76191f41545cdaca32b5d blob ea67a51b0e69c22f7f68712beba07946b8cc968a; §3.2 DDL is the authoritative spec for the table being created.",
    "Pre-flight §1.1: c.client_cadence_rule.table_exists=false (idempotency); pgcrypto=true; schema c + k exist.",
    "Pre-flight §1.2: c.client.client_id is uuid NOT NULL with gen_random_uuid() default. FK target valid.",
    "Pre-flight §1.3: 4 active clients (CFW, Invegent, NDIS-Yarns, Property Pulse); all Australia/Sydney.",
    "Pre-flight §1.4: 14 (client × platform) rows in c.client_publish_profile; 12 publish_enabled=true + 2 publish_enabled=false (NDIS-Yarns IG + Property Pulse IG; Meta anti-spam blocks).",
    "Pre-flight §1.5: 14 uniform weekly cadence patterns from c.client_publish_schedule; weekdays=[1,2,3,4,5] (Mon-Fri PG convention); 1 hour per (client × platform); enabled_slot_count=5 per pair.",
    "Pre-flight §1.6: c.client_ai_profile does not encode cadence (informational only).",
    "Pre-flight §1.7: c.client_publish_schedule is canonical cadence config; m.slot is runtime materialisation (irrelevant to seed).",
    "Pre-flight §1.8: k.table_registry + k.column_registry shapes confirmed; convention values selected (table_kind=table, status=active, allowed_ops=upsert, pii_risk=none).",
    "Pre-flight §1.9: day_of_week is 0..6 PG convention; matches PRV-0 §3.2 weekdays comment.",
    "Pre-flight §1.10: m.chatgpt_review has no prior cc-0008 row (clean ledger; first-fire idempotency).",
    "Pre-flight §1.11: apply_migration name 'cc_0008_client_cadence_rule' will be checked at final re-verification for collision with supabase_migrations history."
  ],
  "known_weak_evidence": [
    "Option A vs Option B for paused IG (NDIS-Yarns + Property Pulse instagram) is a judgement call. Brief recommends B (14 rows; 2 is_active=false) per audit-trail preservation. PK could choose A (12 rows only) without semantic harm to cc-0008 outputs.",
    "expected_format is empirically NULL for IG/LI/YT in c.client_publish_profile; cc-0008 seed reflects this. Tier 4 matcher (PRV-0 §6.1 confidence=0.750) uses expected_format only as a hint. PK can populate later without re-applying cc-0008.",
    "Minute precision in c.client_publish_schedule.publish_time (e.g., 09:06:00) is collapsed to hour in cc-0008 seed. PRV-0 cadence rule has no minute column. Generator window computation in cc-0009 will need to decide whether to widen window for minute-shifts. Not a cc-0008 blocker.",
    "valid_from=current_date for all 14 rows; not historical. PRV-1 backfill (D-23 7-day) is generated in cc-0009 by the generator EF, not by cc-0008 seed. Acceptable per PRV-0 sequencing.",
    "k.table_registry.table_id is bigint; cc-0008 brief assumes identity/default behaviour and omits explicit value. If schema reveals not-identity-default at apply time, brief is HALTED and re-issued v2 with explicit table_id derivation.",
    "cc-0008 does not deploy cadence-rule-generator (cc-0009). Until cc-0009 lands, no EF reads this table. Risk window: c.client_cadence_rule sits inert with seed; if a future EF accidentally reads it before cc-0009 wires it up, that EF should fail closed. No EF currently exists with this read path."
  ],
  "default_action": "proceed if D-01 returns clean agree AND PK has reviewed §3.5 seed + given explicit approval phrase AND final §1 re-verification within ~60s shows no drift",
  "references": {
    "cc-0008 brief (this)": "docs/briefs/cc-0008-client-cadence-rule-table-and-seed.md",
    "PRV-0 design lock (authority)": "docs/dashboard-review-2026-05/prv-0-design-lock.md @ commit 24d08aeeb6ed793171f76191f41545cdaca32b5d",
    "cc-0007 reference structure": "docs/briefs/cc-0007-ai-worker-401-jwt-format-recovery.md",
    "Memory standing rules": "Lesson #61 (P1-P5 mandatory pre-flight); D-01 protocol per docs/runtime/mcp_review_protocol.md; apply_migration is ONLY DDL path for c/m/f/t schemas; D-50 / Lesson v2.50 acceptance integrity"
  },
  "sql_to_apply": "Single apply_migration named cc_0008_client_cadence_rule containing the DDL from §2 + DML from §3.1 + §3.2 + §3.3 + §3.4. See brief §2 and §3 for full text."
}
```

### 5.3 Decision rule on D-01 verdict

- `agree` + `proceed` + risk ≤ medium + 0 pushback → apply (with PK explicit approval phrase received post-§3.5 seed review).
- `agree` + `proceed` + reviewer notes Option A preference → surface to PK for Option choice; default is Option B unless PK affirms A.
- `agree` + `proceed` + reviewer notes minor item → adjust brief in-place if non-substantive.
- `partial` → read `corrected_action`; if substantive → do not proceed; surface to PK for state-capture-exception per Lesson #62.
- `disagree` OR risk=high OR ≥1 substantive pushback → do not proceed; surface to PK for state-capture-exception consideration.

---

## 6. Rollback / no-op / halt logic

### 6.1 NO-OP path (run before D-01 fire)

- Pre-flight §1.1 reveals `table_exists=true` → HALT (§6.2.a). No-op.
- Pre-flight §1.5 reveals 0 active patterns → HALT (§6.2.h). Cannot derive seed.
- Pre-flight §1.10 reveals prior cc-0008 D-01 row → HALT (§6.2.i). Investigate.

Document any no-op outcome in result file.

### 6.2 HALT paths

- **6.2.a Table already exists:** §1.1 `table_exists=true`. Idempotency violated. Investigate prior apply.
- **6.2.b pgcrypto missing:** §1.1 `pgcrypto_installed=false`. DDL would fail.
- **6.2.c Schema infrastructure missing:** §1.1 `schema_c_exists=false` OR `schema_k_exists=false`.
- **6.2.d FK target shape wrong:** §1.2 `c.client.client_id` is not uuid NOT NULL.
- **6.2.e Active client count mismatch:** §1.3 returns < 4 active clients OR timezone != Australia/Sydney.
- **6.2.f Day-of-week out of 0..6:** §1.9 returns values outside expected range.
- **6.2.g Migration name collision:** §1.11 reveals `cc_0008_client_cadence_rule` already in `supabase_migrations.schema_migrations`.
- **6.2.h No active cadence config:** §1.5 returns 0 patterns.
- **6.2.i Prior cc-0008 D-01 row:** §1.10 returns count > 0.
- **6.2.j PRV-0 §3.2 deviation required:** if pre-flight reveals a constraint that genuinely blocks the verbatim DDL.
- **6.2.k Sequencing violation attempted:** if at any point apply attempts to deploy `cadence-rule-generator`, create `r.*` schema, create `r.reconciliation_run`, set up cron, or create a temp log table → HALT immediately. These are forbidden in cc-0008.
- **6.2.l PK seed review rejection:** PK reviews §3.5 and rejects → HALT v1; chat re-issues v2 with PK-directed changes.

### 6.3 ROLLBACK path (verification fails after apply)

If V1–V6 FAIL post-apply:

1. Halt session continuation immediately.
2. Diagnose which V failed and why (capture full output).
3. Issue rollback DDL via `apply_migration` named `cc_0008_rollback_client_cadence_rule`:

```sql
-- cc-0008 rollback — drop table + remove k.* registry rows

DROP TABLE IF EXISTS c.client_cadence_rule CASCADE;

DELETE FROM k.column_registry
WHERE table_id IN (
    SELECT table_id FROM k.table_registry
    WHERE schema_name='c' AND table_name='client_cadence_rule'
);

DELETE FROM k.table_registry
WHERE schema_name='c' AND table_name='client_cadence_rule';
```

4. Re-run V1 (table_exists=false expected) and V6 (k.* registry rows = 0 expected) to confirm rollback applied.
5. Document failure mode + diagnosis in result file.
6. PK escalation; cc-0008 v2 brief.

---

## 7. Result-file convention

**Path:** `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`

**Standard sections (mirror cc-0006 / cc-0007 result pattern):**

1. **Header** — brief reference, apply session date, executor, D-01 verdict, PK approval phrase, outcome summary, seed option chosen (A or B).
2. **Apply summary** — logical action, project, method, result, table created (yes/no), seed rows inserted, k.* registry rows inserted, rollback fired (yes/no), §6 path triggered (or NONE).
3. **Pre-flight + final re-verification** — table comparing initial pre-flight values (per §1) vs ~60s-before-apply re-verification values; status PASS/FAIL per §1.1–§1.11.
4. **DDL applied** — exact CREATE TABLE + CREATE INDEX + COMMENT statements applied (mirroring §2 of brief).
5. **DML applied** — number of seed rows by client × platform × is_active state (matching §3.5 surface table); 1 k.table_registry row; 19 k.column_registry rows.
6. **Verification (V1–V6)** — status table per V; capture exact returned counts and any anomalies.
7. **D-01 record** — `m.chatgpt_review` row id, verdict, conditions stated by reviewer, PK approval phrase, action_type ('sql_destructive'), close-the-loop UPDATE status.
8. **Hold-state assertions** — STANDING_THREE EFs untouched, no EF deploy, no cron edit, no temp log tables, no `r.*` schema work, no Phase 0 scheduling, no M8 work, no other DDL/DML.
9. **Open / next** — propose readiness gate for cc-0009; flag any seed adjustments observed during apply (e.g., PK chose Option A); flag any new findings observed.
10. **New brief-runner-v0 patterns observed** — capture lessons for future PRV-1 build briefs (this is the first PRV-1 cc-NNNN brief; first to combine DDL + 14-row seed + 20 k.* rows in one apply_migration).

---

## 8. Stop condition

1. §1 pre-flight all §1.1–§1.11 PASS (no HALT triggered).
2. PK reviewed §3.5 seed and gave explicit approval phrase for Option A or Option B.
3. §5 D-01 fire returns clean agree; reviewer's notes match brief content.
4. Final read-only re-verification confirms no drift (re-run §1.1, §1.5, §1.10, §1.11 within ~60s of apply).
5. §3 apply_migration call completes successfully (single transactional unit; no partial apply).
6. §4 verification V1–V6 all PASS.
7. Close-the-loop UPDATE on `m.chatgpt_review` for the cc-0008 D-01 row.
8. Result file `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md` committed.
9. PRV-1 cc-0008 closure documented in 4-way sync close.
10. cc-0009 readiness signal logged for next session pickup.

If any of §6.1, §6.2.{a-l}, or §6.3 paths trigger: report and stop.

---

## Notes

This is the **eighth cc-NNNN brief** (sixth-applied class will be when this lands; cc-0007 is queued ahead of it). It is the **first PRV-1 build-class apply brief** — earlier cc-NNNN were Phase 0 (cc-0001), M-class queue integrity remediation (cc-0003..cc-0006), and recovery class (cc-0007).

### Brief-runner-v0 watch items specific to cc-0008

1. **First multi-INSERT seed inside one apply_migration call.** 14 + 1 + 19 = 34 INSERTs total, all transactional. Watch for: transaction size limits (none expected at this volume); ROLLBACK behaviour if any INSERT fails (entire migration unwinds — desired).
2. **First brief consuming a PRV-0 contract.** PRV-0 §3.2 DDL is the source of truth. Any deviation requires v2.
3. **First brief with explicit Option A vs Option B PK choice.** Option choice is reserved for PK; D-01 reviewer must not make the choice on PK's behalf.
4. **First brief generating k.* doc-catalog rows alongside the table.** Sets the precedent for "registry rows in same migration as the table they document" per PRV-0 §3.12.
5. **First brief with empirical seed derivation surfaced for review in §3.5** (transparent table; decision points; PK gate before D-01).
6. **First cc-NNNN brief at PRV build class.** Subsequent cc-0009..cc-0011 will follow this pattern.
7. **Lesson candidates from cc-0008 cycle (post-apply):**
   - **L26 (DDL + seed + k.* registry in one apply_migration)** — codify if pattern proves clean.
   - **L27 (PRV contract consumption discipline)** — PRV-0 §3.2 DDL verbatim; deviation = v2.
   - **L28 (seed provenance documentation)** — every seed row's `notes` references the source query and slot times.
   - **L29 (Option A/B surfacing pattern)** — codify for any seed brief with non-trivial scope decision.

### Open dependencies for the apply session

Before cc-0008 can apply:

- **PK reviews §3.5 seed surface table.** PK confirms Option A or B.
- **PK directs on the 4 decision points in §3.5.**
- **Final §1 re-verification within ~60s of apply** — re-run §1.1, §1.5, §1.10, §1.11.
- **D-01 fire** (`ask_chatgpt_review` action_type=sql_destructive) returns clean agree.
- **PK explicit approval phrase** received in chat after D-01.

When all hold: apply session can proceed with one `apply_migration` call.

**No M8 dependency. cc-0008 can apply independently of cc-0005 v4 status. No cc-0007 dependency (cc-0007 is parallel, not blocking).**

### Sequencing reminders (PK directive 2026-05-09 — boilerplate forbidden actions)

- cc-0008 must NOT deploy or enable `cadence-rule-generator` Edge Function. → moved to cc-0009.
- cc-0008 must NOT create `r.*` schema. → moved to cc-0009.
- cc-0008 must NOT create `r.reconciliation_run` table. → moved to cc-0009.
- cc-0008 must NOT create `r.expected_publication` table. → moved to cc-0009.
- cc-0008 must NOT set up any cron job. → moved to cc-0009.
- cc-0008 must NOT execute the first generator backfill. → moved to cc-0009.
- cc-0008 must NOT create any temporary log table for chicken/egg purposes. → resolved by sequencing.

If at apply time any of these are attempted: HALT immediately per §6.2.k.

---

*Brief authored 2026-05-09 Sydney by chat. Inputs: PRV-0 design lock (commit 24d08aeeb6ed793171f76191f41545cdaca32b5d); chat read-only pre-flight P1.1–P1.11 against production via Supabase MCP execute_sql; PK direction "Start cc-0008 apply brief authoring"; cc-0007 brief structure as template. Output: full apply brief (11-step pre-flight + DDL + 14-row seed + k.* doc-catalog rows + V1–V6 verification + D-01 packet with sql_destructive action_type + rollback path + result-file convention). No production state changed by drafting (read-only SELECTs only). cc-0008 apply gated by PK §3.5 seed review + D-01 + PK explicit approval phrase. Awaiting PK direction to schedule apply session.*
