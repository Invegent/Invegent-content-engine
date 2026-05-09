# Brief cc-0008 — `c.client_cadence_rule` table + initial seed (PRV-1 first build)

**Created:** 2026-05-09 Sydney
**Author:** chat (Claude)
**Executor:** chat applies via Supabase MCP `apply_migration` per memory standing rule ("apply_migration is the ONLY correct DDL path for c/m/f/t schemas"). DML seed applied in the same migration call (single transactional unit). CC role: 0 in cc-0008 (chat-driven DDL+DML; no `supabase/migrations/*.sql` file required).
**Status:** drafted v2 (apply pending PK seed review + D-01 fire + PK explicit approval phrase)
**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7` (v1 was commit `24d08aeeb6ed793171f76191f41545cdaca32b5d` blob `ea67a51b0e69c22f7f68712beba07946b8cc968a`)
**Source design section:** PRV-0 v2 §3.2 (DDL — `preferred_local_times time[]`), §5.1 (generator paused-profile clause), §8.1 (cc-0008 scope contract — all 14 rows is_active=true), §11.4 (PK v2 directive)
**Result file:** `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md` (created on completion of apply session)

---

## Patch history

- **2026-05-09 Sydney — v2 patch** (doc-only; no apply yet). Two corrections per PK directive 2026-05-09:

  **Correction 1 — Minute-precision cadence (machine-readable).** PRV-0 v2 §3.2 replaces `preferred_local_hours int[]` with `preferred_local_times time[]`. Cascaded into this brief: §2 DDL line; all 14 §3.1/§3.2 seed rows now use `ARRAY['HH:MM'::time]` matching `c.client_publish_schedule.publish_time` exactly (e.g. CFW FB → `ARRAY['09:06'::time]`); §3.4 column registry row replaces `preferred_local_hours` with `preferred_local_times`; §3.5 surface table column header → "time (Sydney)" with minute precision; §4 V1e adds type verification; §5 D-01 packet updated. Hour-only metadata derivable via `EXTRACT(HOUR FROM unnest(...))::int[]`.

  **Correction 2 — Paused-IG cadence preservation.** PRV-0 v2 §5.1 + §11.4 directs paused publish profiles do NOT collapse the cadence rule. NDIS-Yarns × IG and Property Pulse × IG cadence rules now seeded with `is_active=true` (was false in v1). Their `notes` capture `c.client_publish_profile.publish_enabled=false` + `paused_reason`. cc-0009 generator handles per-row suppression. Cascaded: §3.1 has all 14 rows; §3.2 retitled "Paused-IG cadence rules (2 rows, `is_active=true`)"; §3.5 surface table — all 14 `is_active=true` with separate `publish_enabled` column; §3.5 PK decision points — Option A/B + minute precision both RESOLVED upstream; §4 V2 expects 14/14/0; V3 reframes (every publish_profile row regardless of `publish_enabled` → 14:14); new V7 verifies paused-IG notes contain `meta_subcode_2207051` + `publish_enabled=false`.

  **Property Pulse × LinkedIn note (PK directive):** row 11 cadence-side intent = 1/day Mon-Fri 12:00; recent publish-side reality ~2.3/day. cc-0008 seed reflects config-side intent; cadence-drift-checker (cc-0011) will surface drift; documented in row's `notes`.

- **2026-05-09 Sydney — initial draft (v1)** under PK direction. Authored after PRV-0 v1 design lock landed. Pre-flight P1.1–P1.11 ran read-only against production via Supabase MCP `execute_sql`; results in §1. Seed derived empirically from `c.client_publish_schedule` × `c.client_publish_profile`. Committed at SHA `216a5ea2f7e9841c8db94d2f7c847f9e19e93e27` blob `2df46c744a9d426d2cd893dee9ebd942d3d3e523`.

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
- 7 verification queries V1–V7 (§4).
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
- Up to 3 retry attempts on V1–V7 (network/timeout reasons only).
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
- No DDL adjustments deviating from PRV-0 v2 §3.2 unless §1 pre-flight surfaces a constraint that genuinely blocks apply.
- No proceeding past D-01 if verdict is anything other than `agree` with `proceed`.
- No proceeding past PK seed review if PK requests modification — return to brief authoring (v3).
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

12 active publish profiles + 2 paused IG (per below):
- CFW: FB ✓ | IG ✓ | LI ✓
- Invegent: FB ✓ | IG ✓ | LI ✓
- NDIS-Yarns: FB ✓ | **IG ✗** (`meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam`) | LI ✓ | YT ✓
- Property Pulse: FB ✓ | **IG ✗** (`meta_subcode_2207051_block_25_apr_pp_ig_anti_spam`) | LI ✓ | YT ✓

**Findings:** 12 active + 2 paused IG. `max_per_day=2` all rows; `min_gap_minutes` ∈ {240, 360}. `preferred_format_facebook='image_quote'` on all 4 active FB rows; LI + IG preferred-format columns NULL throughout. No `paused_until`; only `publish_enabled=false` + `paused_reason` text.

### 1.5 `c.client_publish_schedule` aggregate cadence — PASS, 14 active patterns

All 14 (client × platform) pairs: weekly, weekdays=[1,2,3,4,5] (Mon–Fri PG convention), 1 enabled `publish_time` per pair (5 enabled slots/week). Times (full minute precision):

- **CFW:** FB 09:06 (image_quote) | IG 11:02 | LI 13:04
- **Invegent:** FB 08:06 (image_quote) | IG 10:36 | LI 12:36
- **NDIS-Yarns:** FB 08:00 (image_quote) | IG 12:00 (publish_enabled=false) | LI 10:00 | YT 19:00
- **Property Pulse:** FB 07:30 (image_quote) | IG 10:00 (publish_enabled=false) | LI 12:00 | YT 17:00

**Findings:** PG day_of_week 0..6 matches PRV-0 §3.2 `weekdays` comment "0=Sun..6=Sat" — no remapping. Disabled slot rows exist per pair (e.g. CFW FB has 4 publish_time options/weekday but only 09:06 enabled); cadence rule reflects ENABLED slots only. `paused_until` NULL on all 14 profile rows; paused-IG rows use `publish_enabled=false` + `paused_reason` (indefinite).

**Captured for D-01:** 14 uniform weekly patterns; cadence_type='weekly', posts_per_period=5, period_unit='week', weekdays=[1,2,3,4,5].

### 1.6 `c.client_ai_profile` interpretation (informational) — N/A for cadence

`c.client_ai_profile` columns (`platform_rules`/`generation`/`persona`/`guidelines`/`system_prompt`) do not encode cadence. Cadence is canonically in `c.client_publish_schedule`. No reads from `c.client_ai_profile` for seed derivation.

### 1.7 Slot-related table inventory — PASS

`audit.v_slot_health_by_client_platform`, `c.client_publish_schedule`, `m.slot`, `m.slot_alerts`, `m.slot_fill_attempt`, `m.slots_in_critical_window`. `c.client_publish_schedule` is the cadence config (correct seed source). `m.slot` is runtime materialisation (irrelevant to cc-0008 seed).

### 1.8 `k.table_registry` + `k.column_registry` shape + convention — PASS

- **`k.table_registry`:** PK `table_id bigint`. NOT NULL: schema_name, table_name, table_kind, status, allowed_ops, pii_risk, purpose, created_at, updated_at.
- **`k.column_registry`:** PK `column_id bigint`. NOT NULL: table_id (FK to table_registry), column_name, ordinal_position, data_type, is_nullable, is_foreign_key, pii_risk, created_at, updated_at.
- Joins go via `table_id` (k.column_registry has no schema_name/table_name columns); table-level doc column is `purpose`.
- Convention from sample existing rows (`c.client`, `c.client_ai_profile`): `table_kind='table'`, `status='active'`, `allowed_ops='upsert'`, `pii_risk='none'`.

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

## 2. Proposed DDL (PRV-0 v2 §3.2 verbatim, with defensive `IF NOT EXISTS`)

PRV-0 v2 §3.2 DDL is reproduced unmodified except for one safety adjustment: `IF NOT EXISTS` on `CREATE TABLE` and indexes for idempotency protection (zero risk; protects narrow race windows). No CHECK, FK, or column changed beyond the v2 amendment. PRV-0 v2 contract honoured exactly.

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
    preferred_local_times  time[],                                        -- v2 (PRV-0 v2 §3.2): authoritative; minute precision; Sydney local; e.g. ARRAY['09:06'::time, '13:04'::time]; replaces preferred_local_hours from v1
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

**v2 column-count note:** `preferred_local_times` REPLACES `preferred_local_hours` — column count remains 19 (rename + retype, no add/remove). V1a column_count=19 verification stays valid.

**v2 hour-derivation note (informational):** if a downstream view or query needs hour-only metadata, derive at query time:

```sql
SELECT cadence_rule_id,
       (SELECT array_agg(EXTRACT(HOUR FROM t)::int)
        FROM unnest(preferred_local_times) AS t) AS preferred_local_hours_derived
FROM c.client_cadence_rule;
```

This is documentation-side only; cc-0008 does not create such a view.

---

## 3. Proposed DML — initial seed (chat-authored per PRV-0 §11.2; PK reviews before D-01 fires)

**v2 seed model (PRV-0 v2 §11.4 directive):** All 14 (client × platform) rows are seeded with `is_active=true`. The `is_active` flag now means "rule is part of cadence" (not "currently producing expected rows"). Two paused IG profiles (NDIS-Yarns × IG, Property Pulse × IG) keep their cadence intent active; their `notes` capture the publish-side pause state. cc-0009 generator (PRV-0 v2 §5.1) detects `c.client_publish_profile.publish_enabled=false` and either skips the insert or emits `expected_status='suppressed'` (cc-0009 brief locks option (a) vs (b)).

**v1 Option A vs Option B is RESOLVED upstream by PK directive — single canonical model below.**

### 3.1 Active cadence rules — all 14 rows, `is_active=true`

```sql
INSERT INTO c.client_cadence_rule (
    client_id, platform, cadence_type, posts_per_period, period_unit,
    weekdays, preferred_local_times, expected_format,
    timezone, valid_from, valid_to, is_active, suppression_dates, notes,
    created_by, updated_by
) VALUES
-- Care For Welfare Pty Ltd
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['09:06'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 09:06).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['11:02'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 11:02).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['13:04'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 13:04).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- Invegent
('93494a09-cc89-41d1-b364-cb63983063a6', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['08:06'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 08:06).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('93494a09-cc89-41d1-b364-cb63983063a6', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['10:36'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 10:36).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('93494a09-cc89-41d1-b364-cb63983063a6', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['12:36'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 12:36).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- NDIS-Yarns (FB / LI / YT active; IG paused — see §3.2)
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['08:00'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 08:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['10:00'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 10:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'youtube',   'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['19:00'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 19:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- Property Pulse (FB / LI / YT active; IG paused — see §3.2)
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['07:30'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 07:30).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['12:00'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; cadence-side intent = 1/day Mon-Fri 12:00. Recent publish-side reality has been ~2.3 posts/day on this profile (slot table + queue residue) — divergence flagged by PK 2026-05-09 for cadence-drift-checker (cc-0011) to surface; cc-0008 seed faithfully reflects the config-side intent, not the runtime drift.', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'youtube',   'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['17:00'::time], NULL,           'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 17:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed');
```

### 3.2 Paused-IG cadence rules — 2 rows, `is_active=true` (cadence intent preserved per PRV-0 v2 §11.4)

These rules keep the cadence shape so the rule is preserved across the pause. Generator-side suppression is handled in cc-0009 (per PRV-0 v2 §5.1); cc-0008 only stores the cadence intent + the pause-context notes.

```sql
INSERT INTO c.client_cadence_rule (
    client_id, platform, cadence_type, posts_per_period, period_unit,
    weekdays, preferred_local_times, expected_format,
    timezone, valid_from, valid_to, is_active, suppression_dates, notes,
    created_by, updated_by
) VALUES
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['12:00'::time], NULL, 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; cadence intent preserved at Mon-Fri 12:00. c.client_publish_profile.publish_enabled=false; paused_reason=meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam. cc-0009 generator detects paused profile (PRV-0 v2 §5.1) and either skips insert OR emits expected_status=suppressed (cc-0009 brief decides). is_active=true preserves cadence shape; pause is a publish-side runtime state, not a cadence-side disablement.', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['10:00'::time], NULL, 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v2 initial seed; cadence intent preserved at Mon-Fri 10:00. c.client_publish_profile.publish_enabled=false; paused_reason=meta_subcode_2207051_block_25_apr_pp_ig_anti_spam. cc-0009 generator detects paused profile (PRV-0 v2 §5.1) and either skips insert OR emits expected_status=suppressed (cc-0009 brief decides). is_active=true preserves cadence shape; pause is a publish-side runtime state, not a cadence-side disablement.', 'cc-0008-chat-seed', 'cc-0008-chat-seed');
```

When a paused-IG profile is later un-paused (anti-spam block resolved), no edit to `c.client_cadence_rule` is required — only the `c.client_publish_profile.publish_enabled` flag flips, and cc-0009 generator naturally resumes emitting normal `expected` rows for that (client × platform) at the next run.

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
    '1 row per (client, platform, valid window). is_active=true preserves cadence shape; per-(client × platform) runtime publish-enabled state lives in c.client_publish_profile (queried by cc-0009 generator for per-row suppression). Edits do not auto-propagate to c.client_publish_schedule until PRV-7+.',
    'cc-0008 v2 introduced this table with all 14 rows is_active=true (paused IG profiles preserve cadence intent; cc-0009 generator handles publish-side suppression per PRV-0 v2 §5.1). cc-0009 will deploy cadence-rule-generator EF reading this table. cc-0011 will deploy cadence-drift-checker comparing predictions vs publish-side config.'
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
     'FK to c.client. ON DELETE CASCADE.'),
    ('platform',              NULL, NULL, NULL,
     'Platform identifier. CHECK enum: facebook | instagram | linkedin | youtube. Excludes website (PRV-0 D-22).'),
    ('cadence_type',          NULL, NULL, NULL,
     'CHECK enum: daily | weekly | monthly | custom_cron | none. cc-0008 seed uses ''weekly''.'),
    ('posts_per_period',      NULL, NULL, NULL,
     'Expected publications per period_unit. CHECK > 0; jointly NULL or set with period_unit.'),
    ('period_unit',           NULL, NULL, NULL,
     'CHECK enum: day | week | month. Jointly NULL or set with posts_per_period.'),
    ('weekdays',              NULL, NULL, NULL,
     'Allowed weekdays. 0=Sun..6=Sat Sydney local. CHECK <@ ARRAY[0..6]. cc-0008 v2 seed: {1,2,3,4,5} for all 14 rows.'),
    ('preferred_local_times', NULL, NULL, NULL,
     'Authoritative cadence schedule field (PRV-0 v2 §3.2). Minute-precision Sydney local times. cc-0009 generator computes expected_window from valid_from/valid_to date + each time element. cc-0008 v2 seed: 1 element per (client × platform), e.g. ARRAY[''09:06''::time]. Replaces v1 preferred_local_hours int[]; hour-only metadata derivable via EXTRACT(HOUR FROM unnest(...))::int[].'),
    ('expected_format',       NULL, NULL, NULL,
     'Tier 4 fuzzy-match hint. cc-0008 v2 seed: ''image_quote'' for FB rows; NULL elsewhere.'),
    ('timezone',              NULL, NULL, NULL,
     'IANA tz for valid_from/valid_to/preferred_local_times/weekdays. NOT NULL; default Australia/Sydney.'),
    ('valid_from',            NULL, NULL, NULL,
     'Earliest date rule applies. NOT NULL; default current_date.'),
    ('valid_to',              NULL, NULL, NULL,
     'Latest date rule applies. NULL = open-ended. CHECK valid_to IS NULL OR valid_to >= valid_from.'),
    ('is_active',             NULL, NULL, NULL,
     'Whether the rule is part of cadence. cc-0008 v2: all 14 rows true. PRV-0 v2 §5.1 separates this from runtime publish-side pause (c.client_publish_profile.publish_enabled); generator reads both layers.'),
    ('suppression_dates',     NULL, NULL, NULL,
     'One-off cancellation dates within validity window. cc-0008 seed: empty.'),
    ('notes',                 NULL, NULL, NULL,
     'Free-text narrative. cc-0008 seed populates with derivation provenance.'),
    ('created_at',            NULL, NULL, NULL, 'Row creation timestamp. NOT NULL; default now().'),
    ('created_by',            NULL, NULL, NULL, 'Creating actor. cc-0008 seed: ''cc-0008-chat-seed''.'),
    ('updated_at',            NULL, NULL, NULL, 'Last-modified timestamp. NOT NULL; default now().'),
    ('updated_by',            NULL, NULL, NULL, 'Last-modifying actor. cc-0008 seed: ''cc-0008-chat-seed''.')
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

**Summary:** 14 rows total — all `is_active=true`. 2 rows are for IG profiles currently paused on the publish side (`c.client_publish_profile.publish_enabled=false`); cadence intent preserved at the rule level per PRV-0 v2 §11.4.

| # | client_slug | platform | time (Sydney) | format | is_active | publish_enabled (publish_profile side) |
|---|---|---|---|---|---|---|
| 1 | care-for-welfare-pty-ltd | facebook | 09:06 | image_quote | true | true |
| 2 | care-for-welfare-pty-ltd | instagram | 11:02 | NULL | true | true |
| 3 | care-for-welfare-pty-ltd | linkedin | 13:04 | NULL | true | true |
| 4 | invegent | facebook | 08:06 | image_quote | true | true |
| 5 | invegent | instagram | 10:36 | NULL | true | true |
| 6 | invegent | linkedin | 12:36 | NULL | true | true |
| 7 | ndis-yarns | facebook | 08:00 | image_quote | true | true |
| 8 | ndis-yarns | linkedin | 10:00 | NULL | true | true |
| 9 | ndis-yarns | youtube | 19:00 | NULL | true | true |
| 10 | property-pulse | facebook | 07:30 | image_quote | true | true |
| 11 | property-pulse | linkedin | 12:00 | NULL | true | true |
| 12 | property-pulse | youtube | 17:00 | NULL | true | true |
| 13 | ndis-yarns | instagram | 12:00 | NULL | true | **false** (anti-spam) |
| 14 | property-pulse | instagram | 10:00 | NULL | true | **false** (anti-spam) |

Common attributes for all 14 rows: `cadence_type='weekly'`, `posts_per_period=5`, `period_unit='week'`, `weekdays=[1,2,3,4,5]`, `timezone='Australia/Sydney'`, `valid_from=current_date`, `valid_to=NULL`, `suppression_dates={}`.

**Property Pulse × LinkedIn divergence note (PK directive 2026-05-09):** row 11 cadence-side intent is `1/day Mon-Fri 12:00`. Recent publish-side observed runtime has been ~2.3 posts/day on this profile (drifted from intent). cadence-drift-checker (cc-0011) will surface this drift; cc-0008 v2 seed reflects the config-side `c.client_publish_schedule` faithfully (1/day Mon-Fri 12:00) and documents the reality drift in the row's `notes`.

**v2 RESOLVED upstream by PK directive (no longer PK gates here):**

- ~~Option A vs Option B (paused IG handling)~~ — RESOLVED: single canonical model. All 14 rules `is_active=true`. cc-0009 generator handles publish-side pause via PRV-0 v2 §5.1 clause.
- ~~Hour aggregation policy (collapsed minute precision)~~ — RESOLVED: `preferred_local_times time[]` stores minute precision authoritatively. All 14 rows reflect `c.client_publish_schedule.publish_time` exactly.

**v2 PK decision points still open (before D-01 fire):**

1. **`expected_format` policy.** Currently 4 FB rows have `image_quote`; 10 rows have NULL (matches `c.client_publish_profile` empirical state). PRV-0 §6.1 Tier 4 matcher uses `expected_format` only as a hint, not a blocker. PK confirms NULL is acceptable for IG/LI/YT, or supplies values to set.
2. **`valid_from=current_date` for all rows.** Not historical; rule applies forward from apply date. Acceptable per PRV-0 D-23 (PRV-1 backfill is 7-day, generated by cc-0009). PK confirms.

PK explicit approval phrase required after seed review and before chat fires §5 D-01 packet.

---

## 4. Verification queries (post-apply, V1–V7)

All 7 must PASS post-apply. Run via Supabase MCP `execute_sql` (read-only) within ~60s of `apply_migration` completion. v2 added V7 (paused-IG notes verification) and V1e (preferred_local_times type verification).

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
- V1a: `table_exists=true` AND `column_count=19` (preferred_local_times replaces preferred_local_hours; column count unchanged).
- V1b: ≥ 6 inline-CHECK + 2 named CHECK constraints (cadence_rule_period_when_count_set + cadence_rule_active_window_valid). Note v2: one inline CHECK (`preferred_local_hours <@ ARRAY(0..23)`) was removed because the column was removed; new column `preferred_local_times time[]` has no CHECK (all `time` values are valid in PostgreSQL).
- V1c: 1 FK constraint referencing `c.client(client_id)` with `ON DELETE CASCADE`.
- V1d: ≥ 3 indexes (PK + cadence_rule_active_lookup + cadence_rule_validity_lookup). **v2 addition:** verify `preferred_local_times` column has data type `time without time zone` and is array (`udt_name='_time'` in pg_attribute), confirming PRV-0 v2 §3.2 contract:

```sql
-- V1e (v2): verify preferred_local_times column data type
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema='c' AND table_name='client_cadence_rule'
  AND column_name='preferred_local_times';
```

V1e Pass: `data_type='ARRAY' AND udt_name='_time'` (one row).

### V2 — Seed row count matches chat-authored expectation (v2 model)

```sql
SELECT COUNT(*) AS total_rows,
       COUNT(*) FILTER (WHERE is_active=true) AS active_rows,
       COUNT(*) FILTER (WHERE is_active=false) AS inactive_rows
FROM c.client_cadence_rule;
```

**Pass (v2 single canonical model):** `total_rows=14 AND active_rows=14 AND inactive_rows=0`.

### V3 — Every (client × platform) profile (regardless of `publish_enabled`) has a corresponding active cadence rule

**v2 logic change:** v1 V3 filtered `WHERE cli.status='active' AND cpp.publish_enabled=true` (expected 12). v2 drops the `publish_enabled` filter — paused publish profiles still have cadence rules per PRV-0 v2 §11.4. Expected pairs = 14, seeded pairs = 14.

```sql
WITH expected_pairs AS (
    SELECT cli.client_id, cli.client_slug, cpp.platform
    FROM c.client_publish_profile cpp
    JOIN c.client cli ON cli.client_id = cpp.client_id
    WHERE cli.status='active'                                 -- v2: any publish_enabled state
),
seeded_pairs AS (
    SELECT client_id, platform FROM c.client_cadence_rule WHERE is_active=true
)
SELECT
    (SELECT COUNT(*) FROM expected_pairs) AS expected_pairs_count,
    (SELECT COUNT(*) FROM seeded_pairs) AS seeded_pairs_count,
    array_agg(client_slug || '/' || platform) FILTER (
        WHERE NOT EXISTS (SELECT 1 FROM seeded_pairs s WHERE s.client_id = expected_pairs.client_id AND s.platform = expected_pairs.platform)
    ) AS missing_pairs
FROM expected_pairs;
```

**Pass (v2):** `expected_pairs_count = seeded_pairs_count = 14 AND missing_pairs IS NULL`.

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

### V7 (v2) — Paused-IG cadence rules carry pause-context tokens in `notes`

Verifies cc-0008 v2 §3.2 paused rows correctly capture the publish-side pause state for cc-0009 generator + future drift-checker reads.

```sql
SELECT cli.client_slug, ccr.platform, ccr.is_active,
       (ccr.notes ILIKE '%publish_enabled=false%')              AS notes_mentions_publish_disabled,
       (ccr.notes ILIKE '%meta_subcode_2207051%')               AS notes_mentions_anti_spam_subcode,
       (ccr.notes ILIKE '%cadence intent preserved%')           AS notes_mentions_cadence_preserved,
       (ccr.notes ILIKE '%cc-0009 generator%')                  AS notes_mentions_cc_0009_handoff
FROM c.client_cadence_rule ccr
JOIN c.client cli ON cli.client_id = ccr.client_id
JOIN c.client_publish_profile cpp
    ON cpp.client_id = ccr.client_id AND cpp.platform = ccr.platform
WHERE cpp.publish_enabled = false
ORDER BY cli.client_slug, ccr.platform;
```

**Pass:**
- 2 rows returned (NDIS-Yarns × IG, Property Pulse × IG).
- All 4 boolean columns = true on both rows.
- `is_active = true` on both rows.

---

## 5. D-01 packet content (NOT YET FIRED)

### 5.1 `proposal` (prose)

```
Apply cc-0008 v2 (PRV-1 first build): create c.client_cadence_rule
table per PRV-0 v2 §3.2 + seed all 14 rows with is_active=true (12
active publish profiles + 2 paused-but-cadence-active IG profiles
per PRV-0 v2 §11.4) + populate k.table_registry (1 row) +
k.column_registry (19 rows). Single apply_migration named
cc_0008_client_cadence_rule.

Source design: PRV-0 v2 commit 6e989517ceaf600e1373f7f319ab5b7d5c2c7147
§3.2 (DDL with preferred_local_times time[] minute-precision) +
§5.1 (generator paused-profile clause) + §11.4 (PK v2 directive).

v2 changes from cc-0008 v1:
1. preferred_local_hours int[] → preferred_local_times time[]
   (minute-precision; e.g. ARRAY['09:06'::time]).
2. All 14 rows is_active=true (was 12 + 2-inactive in v1 Option B).
   Paused IG rows preserve cadence intent; cc-0009 generator
   handles publish-side suppression per PRV-0 v2 §5.1.

Pre-flight P1.1–P1.11 PASS (re-run §1.1, §1.5, §1.10, §1.11 within
~60s of apply for final re-verification):
- c.client_cadence_rule does not exist; pgcrypto+schemas ready
- c.client.client_id uuid PK, FK target valid
- 4 active clients (CFW, Invegent, NDIS-Yarns, Property Pulse)
- 14 (client × platform) profiles in c.client_publish_profile;
  12 publish_enabled=true, 2 false (Meta IG anti-spam)
- c.client_publish_schedule shows uniform Mon-Fri weekly with
  full minute precision (09:06, 11:02, 13:04, 08:06, 10:36,
  12:36, 08:00, 10:00, 19:00, 12:00, 07:30, 12:00, 17:00, 10:00)
- day_of_week 0..6 PG convention matches PRV-0 §3.2 weekdays
- k.* registry shapes confirmed
- No prior cc-0008 D-01 row in m.chatgpt_review

DDL: PRV-0 v2 §3.2 verbatim + IF NOT EXISTS defensive additions.
Column count unchanged at 19 (preferred_local_times replaces
preferred_local_hours). No CHECK on time[] (all PG time values
valid).

DML: 14 INSERTs into c.client_cadence_rule + 1 INSERT into
k.table_registry + 19 INSERTs into k.column_registry (CTE-driven
join with information_schema.columns). All in one transactional
unit.

Verification V1–V7: V1 (table+FKs+CHECKs+indexes+V1e type),
V2 (14/14/0), V3 (14:14 every publish_profile pair seeded
regardless of publish_enabled), V4 (NOT NULL + joint period +
window valid), V5 (validity invariant), V6 (k.* registry rows),
V7 (paused-IG notes contain publish_enabled=false +
meta_subcode_2207051 + cadence-preserved + cc-0009 handoff).
All 7 must PASS.

Rollback: DROP TABLE c.client_cadence_rule CASCADE + explicit
DELETE on k.column_registry + k.table_registry rows (see §6.3).

No production behaviour change in cc-0008 v2 isolation: no EF
reads the table until cc-0009 deploys cadence-rule-generator
(which implements PRV-0 v2 §5.1 paused-profile clause).
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply cc-0008 v2: create c.client_cadence_rule per PRV-0 v2 §3.2 (preferred_local_times time[]) + 14-row seed (all is_active=true; 12 active publish profiles + 2 paused-but-cadence-preserved IG profiles per PRV-0 v2 §11.4) + 1 k.table_registry row + 19 k.column_registry rows, in one apply_migration named cc_0008_client_cadence_rule.",
  "production_action_if_approved": "Single Supabase MCP apply_migration call: DDL per PRV-0 v2 §3.2 (preferred_local_times time[] replaces v1 preferred_local_hours int[]; IF NOT EXISTS defensive additions) + DML per §3.1+§3.2 (14 INSERTs into c.client_cadence_rule) + §3.3 (1 INSERT into k.table_registry) + §3.4 (19 INSERTs into k.column_registry via CTE-driven join with information_schema.columns).",
  "consequence_if_delayed": "PRV-1 build sequence stalls. cc-0009 (r.* schema + cadence-rule-generator EF deploy + first backfill) cannot apply until cc-0008 v2 lands. Direct schedule slip on PRV-1.",
  "cost_of_waiting": "Low. No live system degraded. PRV-1 is the next strategic deliverable, not an active incident.",
  "current_evidence": [
    "PRV-0 v2 design lock: commit 6e989517ceaf600e1373f7f319ab5b7d5c2c7147 blob 3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7; §3.2 (DDL preferred_local_times time[]); §5.1 (generator paused-profile clause); §11.4 (PK v2 directive).",
    "cc-0008 v1 brief landed: commit 216a5ea2f7e9841c8db94d2f7c847f9e19e93e27 blob 2df46c744a9d426d2cd893dee9ebd942d3d3e523; this v2 supersedes (Option A/B framing removed; preferred_local_hours replaced).",
    "Pre-flight §1.1: c.client_cadence_rule does not exist; pgcrypto installed; schemas c+k exist.",
    "Pre-flight §1.2: c.client.client_id is uuid NOT NULL with gen_random_uuid() default. FK valid.",
    "Pre-flight §1.3: 4 active clients (CFW, Invegent, NDIS-Yarns, Property Pulse); all Australia/Sydney.",
    "Pre-flight §1.4: 14 (client × platform) rows in c.client_publish_profile; 12 publish_enabled=true + 2 false (NDIS-Yarns IG + Property Pulse IG; Meta anti-spam blocks).",
    "Pre-flight §1.5: 14 uniform weekly cadence patterns; weekdays=[1,2,3,4,5]; full minute precision in publish_time (09:06, 11:02, 13:04, 08:06, 10:36, 12:36, 08:00, 10:00, 19:00, 12:00, 07:30, 12:00, 17:00, 10:00).",
    "Pre-flight §1.8: k.table_registry + k.column_registry shapes confirmed.",
    "Pre-flight §1.10: m.chatgpt_review has no prior cc-0008 row (clean ledger).",
    "PK directive 2026-05-09 (PP × LinkedIn): cadence-side intent = 1/day Mon-Fri 12:00; recent publish-side reality ~2.3/day; documented in row 11 notes for cadence-drift-checker (cc-0011)."
  ],
  "known_weak_evidence": [
    "expected_format empirically NULL for IG/LI/YT in publish_profile; Tier 4 matcher uses it as hint, not blocker. PK can populate later without re-applying cc-0008.",
    "valid_from=current_date for all 14 rows; not historical. 7-day backfill in cc-0009. Acceptable per PRV-0 D-23.",
    "k.table_registry.table_id is bigint; cc-0008 assumes identity-default. If schema reveals not-identity, halt and re-issue v3.",
    "cc-0009 brief decision (option a skip vs option b expected_status='suppressed') not yet locked; cc-0008 v2 seed is correct under either path.",
    "No EF reads c.client_cadence_rule until cc-0009 lands. Sits inert with seed.",
    "v1 Option A/B framing was RESOLVED upstream by PK directive 2026-05-09 — reviewer should not re-litigate.",
    "v1 hour-aggregation question was RESOLVED upstream by PK directive 2026-05-09 — reviewer should not flag absence of hour-only column."
  ],
  "default_action": "proceed if D-01 returns clean agree AND PK has reviewed §3.5 v2 seed + given explicit approval phrase AND final §1 re-verification within ~60s shows no drift",
  "references": {
    "cc-0008 v2 brief (this)": "docs/briefs/cc-0008-client-cadence-rule-table-and-seed.md",
    "cc-0008 v1 brief (predecessor)": "@ commit 216a5ea2f7e9841c8db94d2f7c847f9e19e93e27",
    "PRV-0 v2 design lock (authority)": "docs/dashboard-review-2026-05/prv-0-design-lock.md @ commit 6e989517ceaf600e1373f7f319ab5b7d5c2c7147",
    "PRV-0 v1 design lock (predecessor)": "@ commit 24d08aeeb6ed793171f76191f41545cdaca32b5d",
    "Memory standing rules": "Lesson #61 (P1-P5 pre-flight); D-01 protocol per docs/runtime/mcp_review_protocol.md; apply_migration is ONLY DDL path for c/m/f/t schemas; D-50 / Lesson v2.50 acceptance integrity"
  },
  "sql_to_apply": "Single apply_migration named cc_0008_client_cadence_rule containing the DDL from §2 (preferred_local_times time[]) + DML from §3.1 (12 active rows, all is_active=true, time-array minute-precision) + §3.2 (2 paused-IG rows, is_active=true, notes capture publish_enabled=false + paused_reason + cc-0009 handoff) + §3.3 (k.table_registry) + §3.4 (k.column_registry CTE)."
}
```

### 5.3 Decision rule on D-01 verdict

- `agree` + `proceed` + risk ≤ medium + 0 pushback → apply (with PK explicit approval phrase received post-§3.5 seed review).
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
- **6.2.l PK seed review rejection:** PK reviews §3.5 and rejects → HALT v2; chat re-issues v3 with PK-directed changes. (v2 already incorporates PK directives 2026-05-09 on minute precision + paused-profile suppression; v1 Option A/B was resolved upstream and is no longer a v2 PK-decision lever.)

### 6.3 ROLLBACK path (verification fails after apply)

If V1–V7 FAIL post-apply:

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
6. PK escalation; cc-0008 v3 brief.

---

## 7. Result-file convention

**Path:** `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`

**Standard sections (mirror cc-0006 / cc-0007 result pattern):**

1. **Header** — brief reference (cc-0008 v2), apply session date, executor, D-01 verdict, PK approval phrase, outcome summary, brief version applied (v2 single canonical model — no Option choice).
2. **Apply summary** — logical action, project, method, result, table created (yes/no), seed rows inserted (14 expected, all is_active=true), k.* registry rows inserted, rollback fired (yes/no), §6 path triggered (or NONE).
3. **Pre-flight + final re-verification** — table comparing initial pre-flight values (per §1) vs ~60s-before-apply re-verification values; status PASS/FAIL per §1.1–§1.11.
4. **DDL applied** — exact CREATE TABLE + CREATE INDEX + COMMENT statements applied (mirroring §2 of brief; preferred_local_times time[]).
5. **DML applied** — number of seed rows by client × platform (matching §3.5 surface table); confirm preferred_local_times values match `c.client_publish_schedule.publish_time` exactly; 1 k.table_registry row; 19 k.column_registry rows.
6. **Verification (V1–V7)** — status table per V; capture exact returned counts and any anomalies; V7 confirms paused-IG notes.
7. **D-01 record** — `m.chatgpt_review` row id, verdict, conditions stated by reviewer, PK approval phrase, action_type ('sql_destructive'), close-the-loop UPDATE status.
8. **Hold-state assertions** — STANDING_THREE EFs untouched, no EF deploy, no cron edit, no temp log tables, no `r.*` schema work, no Phase 0 scheduling, no M8 work, no other DDL/DML.
9. **Open / next** — propose readiness gate for cc-0009 (now also includes locking option (a) skip vs option (b) `expected_status='suppressed'` per PRV-0 v2 §5.1); flag any seed adjustments observed during apply; flag any new findings observed.
10. **New brief-runner-v0 patterns observed** — capture lessons for future PRV-1 build briefs (this is the first PRV-1 cc-NNNN brief; first to combine DDL + 14-row seed + 20 k.* rows in one apply_migration; first to use preferred_local_times time[] minute-precision pattern).

---

## 8. Stop condition

1. §1 pre-flight all §1.1–§1.11 PASS (no HALT triggered).
2. PK reviewed §3.5 v2 seed surface table and gave explicit approval phrase. (Option A/B no longer a PK lever — single canonical model.)
3. §5 D-01 fire returns clean agree; reviewer's notes match v2 brief content.
4. Final read-only re-verification confirms no drift (re-run §1.1, §1.5, §1.10, §1.11 within ~60s of apply).
5. §3 apply_migration call completes successfully (single transactional unit; no partial apply).
6. §4 verification V1–V7 all PASS (V7 added in v2).
7. Close-the-loop UPDATE on `m.chatgpt_review` for the cc-0008 D-01 row.
8. Result file `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md` committed.
9. PRV-1 cc-0008 closure documented in 4-way sync close.
10. cc-0009 readiness signal logged for next session pickup, with explicit cc-0009-brief-decision flag: option (a) skip vs option (b) `expected_status='suppressed'` for paused-profile rows (PRV-0 v2 §5.1).

If any of §6.1, §6.2.{a-l}, or §6.3 paths trigger: report and stop.

---

## Notes

This is the **eighth cc-NNNN brief** (sixth-applied class will be when this lands). It is the **first PRV-1 build-class apply brief** — earlier cc-NNNN were Phase 0 (cc-0001), M-class queue integrity remediation (cc-0003..cc-0006), and recovery class (cc-0007).

### Brief-runner-v0 watch items specific to cc-0008 v2

1. **34 INSERTs in one apply_migration** (14 cadence + 1 table_registry + 19 column_registry). All transactional; ROLLBACK on any failure unwinds entire migration.
2. **First brief consuming a PRV-0 contract.** PRV-0 v2 §3.2 DDL is source of truth (preferred_local_times time[] minute-precision). Deviation = v3.
3. **First brief generating k.* doc-catalog rows alongside the table** (PRV-0 §3.12 standing rule).
4. **First brief with empirical seed derivation surfaced for §3.5 review.**
5. **First cc-NNNN at PRV build class.** cc-0009..cc-0011 will follow this pattern.
6. **First brief using minute-precision `time[]` cadence column.** Pattern: store native `time` arrays matching publish-side `publish_time`; derive hour-only metadata at query time.
7. **First brief using two-layer is_active / publish_enabled separation.** cadence rule `is_active=true` = part of cadence; runtime pause lives in `c.client_publish_profile.publish_enabled`; cc-0009 generator reads both layers (PRV-0 v2 §5.1).

**Lesson candidates (post-apply):**
- L26 — DDL + seed + k.* registry in one apply_migration.
- L27 — PRV contract consumption discipline (PRV-0 v2 §3.2 verbatim).
- L28 — Seed provenance documentation (notes reference source query + slot times).
- L29 — Two-layer state separation in seed model (cadence-side is_active vs publish-side publish_enabled).
- L30 — Output-budget discipline: brief commits ≤ 65KB to stay under output-token limit; trim verbose sections rather than splitting files.
- L31 — Acceptance-integrity re-fetch on large commits: UTF-8 multibyte char accounting can produce apparent size discrepancies (e.g. PRV-0 v2 70KB local vs 59KB landed) without content loss; verify section-by-section instead.

### Open dependencies for the apply session

- PK reviews §3.5 v2 seed surface table.
- PK directs on the 2 remaining decision points (expected_format NULL + valid_from current_date acceptance).
- Final §1 re-verification within ~60s of apply.
- D-01 fire (`ask_chatgpt_review` action_type=sql_destructive) returns clean agree.
- PK explicit approval phrase received in chat after D-01.

When all hold: apply session proceeds with one `apply_migration` call.

**No M8 dependency. cc-0008 v2 can apply independently of cc-0005 v4 or cc-0007 status.**

### Sequencing reminders (PK directives 2026-05-09 — boilerplate forbidden)

cc-0008 v2 must NOT: deploy cadence-rule-generator EF, create r.* schema, create r.reconciliation_run / r.expected_publication, set up cron, run first generator backfill, create temp log tables, decide cc-0009 generator option (a) skip vs (b) suppressed. All deferred to cc-0009 (PRV-0 v2 §8.2). Violation → HALT per §6.2.k.

---

*Brief authored 2026-05-09 Sydney by chat (v1 + v2 patch in same session). v2 inputs: PRV-0 v2 design lock (commit 6e989517ceaf600e1373f7f319ab5b7d5c2c7147); PK directive 2026-05-09 (minute precision + paused-profile suppression); cc-0008 v1 (commit 216a5ea2f7e9841c8db94d2f7c847f9e19e93e27). Output: full apply brief v2 (11-step pre-flight + DDL with preferred_local_times + 14-row all-active seed + k.* doc-catalog + V1–V7 + D-01 packet sql_destructive + rollback path + result-file convention). No production state changed by drafting (read-only SELECTs only). Apply gated by §3.5 v2 seed review + D-01 + PK approval phrase.*
