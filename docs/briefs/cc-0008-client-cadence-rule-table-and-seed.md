# Brief cc-0008 — `c.client_cadence_rule` table + initial seed (PRV-1 first build)

**Created:** 2026-05-09 Sydney
**Author:** chat (Claude)
**Executor:** chat applies via Supabase MCP `apply_migration` per memory standing rule ("apply_migration is the ONLY correct DDL path for c/m/f/t schemas"). DML seed applied in the same migration call (single transactional unit). CC role: 0 in cc-0008 (chat-driven DDL+DML; no `supabase/migrations/*.sql` file required).
**Status:** drafted v5 (apply pending NEW D-01 fire + PK explicit approval phrase; PK §3.5 seed review COMPLETE 2026-05-09; CCD independent review of v3 PASS w/2 minor WARNs addressed in v4; **v4 apply attempt 2026-05-09 ~11:55 UTC FAILED with `uq_schema_table` constraint violation — auto-rolled back atomically, no production state changed — root cause: `trg_k_registry_sync_on_create_table` event trigger auto-INSERTs into `k.table_registry` at `ddl_command_end` causing collision with brief's manual §3.3 INSERT; v4 D-01 row `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` SUPERSEDED — close-the-loop UPDATE to `m.chatgpt_review` will mark it `superseded`, NOT `applied`**; v5 introduces trigger-aware UPSERT pattern (Path B per PK directive 2026-05-09) — both conflict targets pre-flight verified)
**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7` (v1 was commit `24d08aeeb6ed793171f76191f41545cdaca32b5d` blob `ea67a51b0e69c22f7f68712beba07946b8cc968a`)
**Source design section:** PRV-0 v2 §3.2 (DDL — `preferred_local_times time[]`), §5.1 (generator paused-profile clause), §8.1 (cc-0008 scope contract — all 14 rows is_active=true), §11.4 (PK v2 directive)
**Result file:** `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md` (created on completion of apply session)

---

## Patch history

- **2026-05-09 Sydney — v5 patch** (doc-only; no apply) — **trigger-aware UPSERT pattern after v4 apply rolled back atomically**:
  - **v4 root cause:** event trigger `trg_k_registry_sync_on_create_table` (function `k.evtrg_sync_registry_on_create_table` → `k.fn_sync_registry`) fires at `ddl_command_end` after `CREATE TABLE` in registered schemas; auto-INSERTs 1 stub `k.table_registry` row + 19 stub `k.column_registry` rows. v4 §3.3 explicit INSERT then collided on `uq_schema_table` → atomic rollback, no production state changed.
  - **v4 D-01 SUPERSEDED:** `m.chatgpt_review` row `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` no longer authoritative; v5 requires NEW D-01 fire. Close-the-loop UPDATE post-v5-apply marks v4 row `status='superseded'` (NOT `applied`).
  - **PK directive 2026-05-09** Path B (`ON CONFLICT DO UPDATE`) preferred IF conflict targets verified. **VERIFIED PASS in §1.13:** `uq_schema_table` (k.table_registry) + `uq_table_column` (k.column_registry) both exist as proper UNIQUE constraints. Path B selected.
  - **v5 changes:** §1.12 (event trigger survey) + §1.13 (k.* unique constraints + column defaults + schema_registry) NEW pre-flight; §3.3 rewritten with `ON CONFLICT (schema_name, table_name) DO UPDATE`; §3.4 rewritten with `ON CONFLICT (table_id, column_name) DO UPDATE` (preserves v4's `(p.fk_schema IS NOT NULL)` derivation); §4 V6 updated to verify final-state regardless of insert-vs-upsert path; V6c NEW (allowed_ops upgrade verification); §5.1.a NEW (v4 supersession close-the-loop direction); §6.2.m/n/o NEW HALTs (trigger config drift / unique constraint drift / schema_registry drift).
  - **DDL/seed values UNCHANGED from v4.** PRV-0 v2 §3.2 contract honoured.
  - **Lessons** L33 (DDL briefs in registered schemas MUST include `pg_event_trigger` survey) + L34 (`k.fn_sync_registry` auto-registration affects all PRV-1 build briefs) + L35 (ON CONFLICT DO UPDATE defensive pattern for k.* registry).

- **2026-05-09 — v4** (doc-only; SUPERSEDED by v5). Addressed 2 minor CCD WARNs: V1b CHECK count corrected to 5+2=7; §3.4 inline note on `is_foreign_key` NOT NULL via `(p.fk_schema IS NOT NULL)`. SHA `026dfbd7bd79708a1a1871fa4c2cd101eb5b497f` blob `a3890be2ad6eaef8ab8fd4ddefbf2555d9c478c2`. **Apply 2026-05-09 ~11:55 UTC FAILED at uq_schema_table; v4 D-01 row 5c5e8f05 superseded.**

- **2026-05-09 — v3** (doc-only). PK + ChatGPT seed review of v2 §3.5 RESOLVED: (1) `expected_format` non-null all 14 rows; (2) `valid_from=current_date` APPROVED. SHA `b9a76e9ad7566316a1587e5ea0ccbeb612e21ab9`.

- **2026-05-09 — v2** (doc-only). PK directives: (1) `preferred_local_hours int[]` → `preferred_local_times time[]` (PRV-0 v2 §3.2); (2) paused-IG cadence preservation `is_active=true`; V7 added; V3 reframed 14:14. SHA `e11890e3e52b5b535b7f82cfb6dcb577ec73c42e`.

- **2026-05-09 — v1** (initial draft). Pre-flight read-only; seed derived from `c.client_publish_schedule` × `c.client_publish_profile`. SHA `216a5ea2f7e9841c8db94d2f7c847f9e19e93e27`.

---

## Investigation record

Source: PRV-0 design lock (this session) + chat pre-flight discovery 2026-05-09.

**Trigger:** PRV-0 §8.1 cc-0008 scope contract locked at PK approval — cc-0008 creates and seeds `c.client_cadence_rule` only; no generator EF deploy, no cron, no live execution.

**Why now:** First cc-NNNN in PRV-1 build sequence (PRV-1 = cc-0008..cc-0011). cc-0009 cannot generate `r.expected_publication` rows until `c.client_cadence_rule` exists with seed rows.

**Delivers:** (1) New `c.client_cadence_rule` per PRV-0 §3.2; (2) 14-row seed (one per active client × platform) derived from `c.client_publish_schedule` × `c.client_publish_profile`; (3) `k.*` doc-catalog rows per §3.12.

**Does NOT deliver:** No `r.*` schema, no `r.reconciliation_run`, no `r.expected_publication`, no cadence-rule-generator EF, no cron, no first generator invocation, no temp log tables. All deferred to cc-0009.

**Class:** Build-class brief. DDL + seed in one transactional unit; seed reviewed by PK pre-apply.

---

## Design intent

**Intent:** Establish canonical source of truth for "this client should publish on this platform with this cadence" as a first-class table in `c.*`, replacing implicit cadence currently spread across `c.client_publish_schedule` (row-per-slot) + `c.client_publish_profile` (per-platform pause flag, format, max-per-day).

**Why a new table not a view:** (1) PRV-0 D-2 reconciliation needs cadence derivable independent of queue/publish state; one row per (client × platform × cadence regime) makes generator pseudocode simpler. (2) PRV-0 D-3 schedules publish-side migration onto this table after PRV-6; canonical table now means "switch reads" not "build new + migrate". (3) PRV-0 §5.3 drift-checker compares cadence-side vs publish-side; both must exist as queryable surfaces.

**No production behaviour changes from cc-0008 isolation.** Read by no EF, cron, or UI until cc-0009 wires it up.

## Blast radius

**Zero immediate runtime impact.** No EF reads `c.client_cadence_rule` until cc-0009.

**Indirect risk:** (1) Wrong seed → wrong `r.expected_publication` predictions; mitigated by PK §3.5 seed review. (2) Schema drift if PRV-7+ changes columns; cc-0008 follows PRV-0 §3.2 verbatim. (3) `k.*` registry sync drift; mitigated by standing rule §3.12 + L34 (trigger architecture).

**Cost-of-waiting:** Low. PRV-1 cannot proceed without it, but no live system is degraded.

---

## Source context

- **PRV-0 v2 design lock** — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147`. Authoritative for §3.2 (DDL), §5.1 (paused-profile), §8.1+§8.2 (cc-NNNN sequencing), §11 (PK approvals).
- **`c.client_publish_schedule`** — canonical cadence config (1 row per client × platform × dow × publish_time × enabled).
- **`c.client_publish_profile`** — `publish_enabled`, `paused_reason`, `preferred_format_<platform>`, `max_per_day`, `min_gap_minutes`.
- **`c.client_ai_profile`** — informational only (cadence is in publish-schedule).
- **`c.client`** — FK target (4 active rows).
- **`k.table_registry` + `k.column_registry`** — doc-catalog targets per PRV-0 §3.12.
- **`m.chatgpt_review`** — D-01 audit trail.
- **PRV-0 §11.2 seed authority** — chat authors → PK reviews → D-01 fires → apply.

## Scope

**In scope:** read-only pre-flight (§1, completed); ONE NEW v5 D-01 fire (`ask_chatgpt_review`, action_type `sql_destructive`); ONE `apply_migration` (`cc_0008_client_cadence_rule`); V1–V7 verification (§4); TWO `m.chatgpt_review` UPDATEs (v5 close-the-loop + v4 supersession per §5.1.a); ONE commit creating result file; 4-way sync close.

**Out of scope:** any DDL/DML beyond `c.client_cadence_rule` + its k.* doc rows; `r.*` schema/tables/helpers (cc-0009); cadence-rule-generator/cadence-drift-checker/reconciliation-matcher EFs (cc-0009..cc-0011); cron; first generator backfill; temp log tables; Phase 0 scheduling; M8b separate brief; 5 outstanding `m.chatgpt_review` close-the-loop carries (separate).

## Allowed actions

- Read-only `SELECT` against `c.client`, `c.client_publish_profile`, `c.client_publish_schedule`, `c.client_ai_profile`, `k.*` tables, `m.chatgpt_review`, `pg_*`, `information_schema.*` for pre-flight + verification.
- One `ask_chatgpt_review` D-01 fire per §5.
- One `apply_migration` call per §3 (DDL + DML + k.* registry rows in one transactional unit).
- Up to 3 retry attempts on V1–V7 (network/timeout only).
- TWO `m.chatgpt_review` UPDATE post-apply: v5 close-the-loop + v4 supersession (per §5.1.a).
- One commit creating `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`.
- One commit updating 4-way sync (`docs/00_sync_state.md` + `docs/00_action_list.md` + `docs/runtime/sessions/YYYY-MM-DD-cc-0008-applied.md` + dashboard PHASES) at session close.

## Forbidden actions

- **No `apply_migration` before NEW v5 D-01 returns clean agree + PK explicit approval phrase.** (v4 D-01 row 5c5e8f05 is SUPERSEDED — not authoritative for v5.)
- **No `execute_sql` for any DDL** (memory standing rule).
- No `r.*` schema work (cc-0009).
- No EF deploy of any kind.
- No cron edit of any kind.
- No insert into `c.client_cadence_rule` outside the migration seed.
- No update to `c.client_publish_schedule` / `c.client_publish_profile` (read-only sources).
- No update to `m.chatgpt_review` beyond the v5 close-the-loop + v4 supersession UPDATEs.
- No `apply_migration` other than `cc_0008_client_cadence_rule`.
- No EF deploys (cadence-rule-generator, ice-evidence-materialiser, cadence-drift-checker, reconciliation-matcher).
- No creation of `r.*` table/view/function.
- **No temporary log tables** (PK sequencing clarification).
- No DDL deviation from PRV-0 §3.2 unless §1 pre-flight surfaces a genuine blocker.
- No proceeding past v5 D-01 if verdict != `agree` with `proceed` (or PK explicit Lesson #62 override).
- No M8 work; no Phase 0 scheduling.

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

**Result:** `{table_exists:false, pgcrypto_installed:true, schema_c_exists:true, schema_k_exists:true}`. Decision: any `false` on the three required `true` values → HALT (§6.2.a/b/c); `table_exists=true` → HALT §6.2.a.

### 1.2 `c.client` FK target — PASS

`client_id` is `uuid`, NOT NULL, default `gen_random_uuid()`. PRV-0 §3.2 FK satisfied.

### 1.3 Active clients (FK seed targets) — PASS, count = 4

| client_slug | client_id | timezone |
|---|---|---|
| care-for-welfare-pty-ltd | `3eca32aa-e460-462f-a846-3f6ace6a3cae` | Australia/Sydney |
| invegent | `93494a09-cc89-41d1-b364-cb63983063a6` | Australia/Sydney |
| ndis-yarns | `fb98a472-ae4d-432d-8738-2273231c1ef4` | Australia/Sydney |
| property-pulse | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` | Australia/Sydney |

Decision: count != 4 → SURFACE; tz drift → HALT §6.2.e.

### 1.4 `c.client_publish_profile` — PASS, 14 rows

12 `publish_enabled=true` + 2 `false` (NDIS-Yarns × IG: `meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam`; Property Pulse × IG: `meta_subcode_2207051_block_25_apr_pp_ig_anti_spam`). `max_per_day=2`; `min_gap_minutes ∈ {240,360}`. `preferred_format_facebook='image_quote'` on 4 active FB; LI/IG preferred-format columns NULL. No `paused_until`; only `publish_enabled=false` + `paused_reason`.

### 1.5 `c.client_publish_schedule` aggregate cadence — PASS, 14 active patterns

All 14 (client × platform) pairs: weekly, weekdays=[1,2,3,4,5] (PG convention), 1 enabled `publish_time` per pair (5 slots/week). Times:

- **CFW:** FB 09:06 | IG 11:02 | LI 13:04
- **Invegent:** FB 08:06 | IG 10:36 | LI 12:36
- **NDIS-Yarns:** FB 08:00 | IG 12:00 (`publish_enabled=false`) | LI 10:00 | YT 19:00
- **Property Pulse:** FB 07:30 | IG 10:00 (`publish_enabled=false`) | LI 12:00 | YT 17:00

PG day_of_week 0..6 matches PRV-0 §3.2 `weekdays` "0=Sun..6=Sat" — no remap. Disabled-slot rows exist per pair; cadence rule reflects ENABLED slots only. **D-01 capture:** 14 uniform weekly patterns; cadence_type='weekly', posts_per_period=5, period_unit='week', weekdays=[1,2,3,4,5].

### 1.6 `c.client_ai_profile` — N/A for cadence

Does not encode cadence. No reads for seed derivation.

### 1.7 Slot-related table inventory — PASS

`c.client_publish_schedule` is the cadence config (correct seed source). `m.slot` is runtime materialisation (irrelevant).

### 1.8 `k.table_registry` + `k.column_registry` shape + convention — PASS

- **`k.table_registry`:** PK `table_id bigint`. NOT NULL: schema_name, table_name, table_kind, status, allowed_ops, pii_risk, purpose, created_at, updated_at.
- **`k.column_registry`:** PK `column_id bigint`. NOT NULL: table_id (FK to table_registry), column_name, ordinal_position, data_type, is_nullable, is_foreign_key, pii_risk, created_at, updated_at.
- Joins go via `table_id`; table-level doc column is `purpose`.
- Sample existing rows (`c.client`, `c.client_ai_profile`): `table_kind='table'`, `status='active'`, `allowed_ops='upsert'`, `pii_risk='none'`.

### 1.9 Day-of-week convention — PASS

distinct_dow ⊆ {0..6}; PG 0=Sun..6=Sat aligns with PRV-0 §3.2.

### 1.10 `m.chatgpt_review` audit trail — PASS at v3 authoring (cc_0008_review_rows = 0); now 1 row from v4 D-01 fire `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` (SUPERSEDED). Decision: count > 1 → HALT §6.2.i (separate session fired).

### 1.11 `apply_migration` history — informational

Migration name `cc_0008_client_cadence_rule` MUST be unique vs `supabase_migrations.schema_migrations`:

```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE name = 'cc_0008_client_cadence_rule';  -- expect 0 rows
```

Row exists → HALT (§6.2.g).

### 1.12 (v5) Event-trigger survey on `k.*` — PASS, 2 relevant triggers identified

```sql
SELECT evtname, evtevent, evtenabled, pg_proc.proname AS function_name
FROM pg_event_trigger
JOIN pg_proc ON pg_proc.oid = pg_event_trigger.evtfoid
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE pg_namespace.nspname = 'k'
ORDER BY evtname;
```

**Result:** 2 enabled triggers (evtenabled='O') in `k.*`:

| evtname | evtevent | function | role |
|---|---|---|---|
| `trg_k_refresh_catalog` | `ddl_command_end` | `k.evt_refresh_catalog` | informational catalog refresh |
| `trg_k_registry_sync_on_create_table` | `ddl_command_end` | `k.evtrg_sync_registry_on_create_table` | **auto-INSERTs stub rows into k.table_registry + k.column_registry** for affected registered schemas |

**`k.fn_sync_registry` semantics** (read from pg_proc body): inserts 1 stub `k.table_registry` row (`purpose='auto-registered'`, `allowed_ops='read-only'` default) + 19 stub `k.column_registry` rows (basic shape from `information_schema.columns`, relying on `is_foreign_key DEFAULT false` and `pii_risk='none'` default — both verified §1.13). NOT EXISTS guards on both INSERTs prevent duplicates if rerun.

**Decision rule:** if either trigger is disabled (`evtenabled='D'`), removed, or replaced with different INSERT semantics → HALT (§6.2.m). Re-run §1.12 within ~60s of apply.

### 1.13 (v5) `k.*` registry constraints + column defaults + schema membership — PASS

**Unique constraints (Path B conflict targets):**

```sql
SELECT t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'k' AND t.relname IN ('table_registry', 'column_registry')
  AND c.contype IN ('p', 'u', 'f');
```

**Result (filtered to UNIQUE):**
- `k.table_registry.uq_schema_table` UNIQUE `(schema_name, table_name)` ✓
- `k.column_registry.uq_table_column` UNIQUE `(table_id, column_name)` ✓

Plus relevant FK: `k.column_registry.table_id → k.table_registry(table_id) ON DELETE CASCADE` (rollback implication: §6.3 single `DELETE FROM k.table_registry` cascades to all 19 column_registry rows).

**Column defaults relevant to UPSERT:**

| Table | Column | NOT NULL | Default | UPSERT relevance |
|---|---|---|---|---|
| `k.table_registry` | `purpose` | YES | `'auto-registered'` | trigger inserts 'auto-registered'; v5 §3.3 UPDATEs to rich text |
| `k.table_registry` | `allowed_ops` | YES | `'read-only'` | trigger leaves 'read-only'; v5 §3.3 UPDATEs to 'upsert' |
| `k.table_registry` | `table_kind`, `status`, `pii_risk` | YES | `'table'`, `'active'`, `'none'` | match brief intent |
| `k.column_registry` | `is_foreign_key` | YES | `false` | trigger relies on default; v5 §3.4 UPDATEs to `true` for `client_id` only |
| `k.column_registry` | `pii_risk` | YES | `'none'` | matches brief |
| `k.column_registry` | `column_purpose` | NO | NULL | trigger leaves NULL; v5 §3.4 UPDATEs all 19 |

**Schema registry membership:** 7 rows for `a`, `c`, `f`, `k`, `m`, `r`, `t` all status='active'. `c` registered → trigger fires on `CREATE TABLE c.client_cadence_rule`. `r` already registered (informational for cc-0009 readiness — schema row exists; cc-0009 only creates tables within it).

**Decision rule:** if any `k.*` UNIQUE constraint definition drifts since v5 authoring → HALT §6.2.n. If `c` not in `k.schema_registry` → HALT §6.2.o. Re-run §1.13 within ~60s of apply.

---

## 2. Proposed DDL (PRV-0 v2 §3.2 verbatim, with defensive `IF NOT EXISTS`)

```sql
CREATE TABLE IF NOT EXISTS c.client_cadence_rule (
    cadence_rule_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id              uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform               text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    cadence_type           text NOT NULL CHECK (cadence_type IN ('daily','weekly','monthly','custom_cron','none')),
    posts_per_period       int CHECK (posts_per_period > 0),
    period_unit            text CHECK (period_unit IN ('day','week','month')),
    weekdays               int[] CHECK (weekdays <@ ARRAY[0,1,2,3,4,5,6]),
    preferred_local_times  time[],
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

**v2 column-count note:** `preferred_local_times` REPLACES `preferred_local_hours` — column count remains 19. V1a verification stays valid.

**v2 hour-derivation note (documentation-only):** if a downstream view needs hour-only metadata, derive at query time via `EXTRACT(HOUR FROM unnest(preferred_local_times))::int[]`. cc-0008 does not create such a view.

---

## 3. Proposed DML — initial seed (chat-authored per PRV-0 §11.2; PK §3.5 v3 review COMPLETE 2026-05-09; v5 trigger-aware UPSERT pattern)

**v5 seed model + UPSERT strategy:** All 14 (client × platform) rows seeded `is_active=true`. Seed values unchanged from v3/v4 (FB→`image_quote`, IG→`image`, LI→`linkedin_post`, YT→`youtube_short`). v5 difference: event trigger auto-INSERTs stub k.* rows at `ddl_command_end`; §3.3+§3.4 follow with `INSERT ... ON CONFLICT DO UPDATE` to enrich.

### 3.1 Active cadence rules — all 14 rows, `is_active=true`

```sql
INSERT INTO c.client_cadence_rule (
    client_id, platform, cadence_type, posts_per_period, period_unit,
    weekdays, preferred_local_times, expected_format,
    timezone, valid_from, valid_to, is_active, suppression_dates, notes,
    created_by, updated_by
) VALUES
-- Care For Welfare Pty Ltd
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['09:06'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 09:06).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['11:02'::time], 'image',          'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 11:02).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('3eca32aa-e460-462f-a846-3f6ace6a3cae', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['13:04'::time], 'linkedin_post', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 13:04).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- Invegent
('93494a09-cc89-41d1-b364-cb63983063a6', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['08:06'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 08:06).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('93494a09-cc89-41d1-b364-cb63983063a6', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['10:36'::time], 'image',          'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 10:36).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('93494a09-cc89-41d1-b364-cb63983063a6', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['12:36'::time], 'linkedin_post', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 12:36).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- NDIS-Yarns (FB / LI / YT active; IG paused — see §3.2)
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['08:00'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 08:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['10:00'::time], 'linkedin_post', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 10:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'youtube',   'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['19:00'::time], 'youtube_short', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 19:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),

-- Property Pulse (FB / LI / YT active; IG paused — see §3.2)
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'facebook',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['07:30'::time], 'image_quote', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 07:30).', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'linkedin',  'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['12:00'::time], 'linkedin_post', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; cadence-side intent = 1/day Mon-Fri 12:00. Recent publish-side reality has been ~2.3 posts/day on this profile (slot table + queue residue) — divergence flagged by PK 2026-05-09 for cadence-drift-checker (cc-0011) to surface; cc-0008 seed faithfully reflects the config-side intent, not the runtime drift.', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'youtube',   'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['17:00'::time], 'youtube_short', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; derived from c.client_publish_schedule enabled slot (Mon-Fri 17:00).', 'cc-0008-chat-seed', 'cc-0008-chat-seed');
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
('fb98a472-ae4d-432d-8738-2273231c1ef4', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['12:00'::time], 'image', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; cadence intent preserved at Mon-Fri 12:00. c.client_publish_profile.publish_enabled=false; paused_reason=meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam. cc-0009 generator detects paused profile (PRV-0 v2 §5.1) and either skips insert OR emits expected_status=suppressed (cc-0009 brief decides). is_active=true preserves cadence shape; pause is a publish-side runtime state, not a cadence-side disablement.', 'cc-0008-chat-seed', 'cc-0008-chat-seed'),
('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'instagram', 'weekly', 5, 'week', ARRAY[1,2,3,4,5], ARRAY['10:00'::time], 'image', 'Australia/Sydney', current_date, NULL, true, '{}', 'cc-0008 v3 initial seed; cadence intent preserved at Mon-Fri 10:00. c.client_publish_profile.publish_enabled=false; paused_reason=meta_subcode_2207051_block_25_apr_pp_ig_anti_spam. cc-0009 generator detects paused profile (PRV-0 v2 §5.1) and either skips insert OR emits expected_status=suppressed (cc-0009 brief decides). is_active=true preserves cadence shape; pause is a publish-side runtime state, not a cadence-side disablement.', 'cc-0008-chat-seed', 'cc-0008-chat-seed');
```

When a paused-IG profile is later un-paused (anti-spam block resolved), no edit to `c.client_cadence_rule` is required — only the `c.client_publish_profile.publish_enabled` flag flips, and cc-0009 generator naturally resumes emitting normal `expected` rows for that (client × platform) at the next run.

### 3.3 (v5) `k.table_registry` upsert via ON CONFLICT

Trigger auto-INSERTs stub row (`purpose='auto-registered'`, `allowed_ops='read-only'`, rich fields NULL) at `ddl_command_end`. v5 §3.3 INSERT with full metadata + `ON CONFLICT (schema_name, table_name) DO UPDATE` upgrades the stub in-place. Survives whether trigger fires first or not.

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
    'cc-0008 v5 introduced this table with all 14 rows is_active=true (paused IG profiles preserve cadence intent; cc-0009 generator handles publish-side suppression per PRV-0 v2 §5.1). cc-0009 will deploy cadence-rule-generator EF reading this table. cc-0011 will deploy cadence-drift-checker comparing predictions vs publish-side config.'
)
ON CONFLICT (schema_name, table_name) DO UPDATE SET
    table_kind        = EXCLUDED.table_kind,
    status            = EXCLUDED.status,
    owner             = EXCLUDED.owner,
    source_system     = EXCLUDED.source_system,
    source_reference  = EXCLUDED.source_reference,
    refresh_method    = EXCLUDED.refresh_method,
    refresh_cadence   = EXCLUDED.refresh_cadence,
    allowed_ops       = EXCLUDED.allowed_ops,
    pii_risk          = EXCLUDED.pii_risk,
    purpose           = EXCLUDED.purpose,
    primary_use_cases = EXCLUDED.primary_use_cases,
    join_keys         = EXCLUDED.join_keys,
    rules_summary     = EXCLUDED.rules_summary,
    advisory          = EXCLUDED.advisory,
    updated_at        = now();
```

`table_id` not in clause (PK identity, auto-fills on INSERT or untouched on conflict). `created_at` preserved. `updated_at = now()` records v5 enrichment.

### 3.4 (v5) `k.column_registry` upsert via ON CONFLICT

Trigger auto-INSERTs 19 stub column rows (basic shape from `information_schema.columns`, `is_foreign_key=false` default, `pii_risk='none'`). v5 §3.4 retains v4 CTE-driven pattern + `(p.fk_schema IS NOT NULL)` derivation; routes through `ON CONFLICT (table_id, column_name) DO UPDATE`.

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
     'Allowed weekdays. 0=Sun..6=Sat Sydney local. CHECK <@ ARRAY[0..6]. cc-0008 v5 seed: {1,2,3,4,5} for all 14 rows.'),
    ('preferred_local_times', NULL, NULL, NULL,
     'Authoritative cadence schedule field (PRV-0 v2 §3.2). Minute-precision Sydney local times. cc-0009 generator computes expected_window from valid_from/valid_to date + each time element. cc-0008 v5 seed: 1 element per (client × platform), e.g. ARRAY[''09:06''::time]. Replaces v1 preferred_local_hours int[].'),
    ('expected_format',       NULL, NULL, NULL,
     'Tier 4 fuzzy-match hint. cc-0008 v5 seed: ''image_quote'' for FB; ''image'' for IG; ''linkedin_post'' for LI; ''youtube_short'' for YT.'),
    ('timezone',              NULL, NULL, NULL,
     'IANA tz for cadence fields. NOT NULL; default Australia/Sydney.'),
    ('valid_from',            NULL, NULL, NULL,
     'Earliest date rule applies. NOT NULL; default current_date.'),
    ('valid_to',              NULL, NULL, NULL,
     'Latest date rule applies. NULL = open-ended. CHECK valid_to IS NULL OR valid_to >= valid_from.'),
    ('is_active',             NULL, NULL, NULL,
     'Whether the rule is part of cadence. cc-0008 v5: all 14 rows true. PRV-0 v2 §5.1 separates this from runtime publish-side pause.'),
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
CROSS JOIN t
ON CONFLICT (table_id, column_name) DO UPDATE SET
    column_purpose  = EXCLUDED.column_purpose,
    is_foreign_key  = EXCLUDED.is_foreign_key,
    fk_ref_schema   = EXCLUDED.fk_ref_schema,
    fk_ref_table    = EXCLUDED.fk_ref_table,
    fk_ref_column   = EXCLUDED.fk_ref_column,
    pii_risk        = EXCLUDED.pii_risk,
    updated_at      = now();
```

ON CONFLICT clause omits `data_type`/`udt_name`/`is_nullable`/`column_default`/`ordinal_position` (trigger and v5 INSERT pull from same `information_schema.columns` source — identical). Only brief-authored fields (`column_purpose`, `is_foreign_key`, `fk_ref_*`, `pii_risk`) upserted. `is_foreign_key=true` for `client_id` only (1+18 distribution; V6b verifies).

### 3.5 Seed surface for PK review

**Summary:** 14 rows total — all `is_active=true`. 2 rows are for IG profiles currently paused on the publish side (`c.client_publish_profile.publish_enabled=false`); cadence intent preserved at the rule level per PRV-0 v2 §11.4. v3: all 14 rows now carry non-null `expected_format` per PK directive.

| # | client_slug | platform | time (Sydney) | format | is_active | publish_enabled (publish_profile side) |
|---|---|---|---|---|---|---|
| 1 | care-for-welfare-pty-ltd | facebook | 09:06 | image_quote | true | true |
| 2 | care-for-welfare-pty-ltd | instagram | 11:02 | image | true | true |
| 3 | care-for-welfare-pty-ltd | linkedin | 13:04 | linkedin_post | true | true |
| 4 | invegent | facebook | 08:06 | image_quote | true | true |
| 5 | invegent | instagram | 10:36 | image | true | true |
| 6 | invegent | linkedin | 12:36 | linkedin_post | true | true |
| 7 | ndis-yarns | facebook | 08:00 | image_quote | true | true |
| 8 | ndis-yarns | linkedin | 10:00 | linkedin_post | true | true |
| 9 | ndis-yarns | youtube | 19:00 | youtube_short | true | true |
| 10 | property-pulse | facebook | 07:30 | image_quote | true | true |
| 11 | property-pulse | linkedin | 12:00 | linkedin_post | true | true |
| 12 | property-pulse | youtube | 17:00 | youtube_short | true | true |
| 13 | ndis-yarns | instagram | 12:00 | image | true | **false** (anti-spam) |
| 14 | property-pulse | instagram | 10:00 | image | true | **false** (anti-spam) |

Common attributes for all 14 rows: `cadence_type='weekly'`, `posts_per_period=5`, `period_unit='week'`, `weekdays=[1,2,3,4,5]`, `timezone='Australia/Sydney'`, `valid_from=current_date`, `valid_to=NULL`, `suppression_dates={}`. Non-null `expected_format` for all 14 rows: 4×`image_quote` (FB) + 4×`image` (IG) + 4×`linkedin_post` (LI) + 2×`youtube_short` (YT) = 14.

**Property Pulse × LinkedIn divergence note (PK directive 2026-05-09):** row 11 cadence-side intent is `1/day Mon-Fri 12:00`. Recent publish-side observed runtime has been ~2.3 posts/day on this profile (drifted from intent). cadence-drift-checker (cc-0011) will surface this drift; cc-0008 v3 seed reflects the config-side `c.client_publish_schedule` faithfully (1/day Mon-Fri 12:00) and documents the reality drift in the row's `notes`.

**v3+v4+v5 RESOLVED upstream (no PK decision points open):** Option A vs B (paused IG handling) RESOLVED v2; hour aggregation RESOLVED v2 (`preferred_local_times time[]`); `expected_format` policy RESOLVED v3 (non-null all 14); `valid_from=current_date` RESOLVED v3; V1b CHECK count + V6b `is_foreign_key` handling RESOLVED v4 (CCD WARNs); trigger-aware k.* strategy RESOLVED v5 (Path B; conflict targets verified §1.13).

**v5 ready for NEW D-01 fire + PK explicit approval phrase.** v4 D-01 `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` SUPERSEDED.

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
- V1b: **5 inline CHECK + 2 named CHECK = 7 total** (v4 correction per CCD review WARN). Inline (5): `platform IN (...)`, `cadence_type IN (...)`, `posts_per_period > 0`, `period_unit IN (...)`, `weekdays <@ ARRAY[0..6]`. Named (2): `cadence_rule_period_when_count_set` + `cadence_rule_active_window_valid`. v3 said "≥6 inline + 2 named" — overcounted because it carried v1's `preferred_local_hours <@ ARRAY[0..23]` forward in prose; PRV-0 v2 removed that column. New `time[]` column has no CHECK (all PG `time` values valid).
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

**Pass (v5 — measures final state regardless of insert-vs-upsert path):**
- V6a: 1 row with `status='active'`, `allowed_ops='upsert'` (UPDATEd from default 'read-only'), `pii_risk='none'`, `purpose` matches §3.3 rich text (UPDATEd from 'auto-registered'), all rich fields populated (`primary_use_cases`, `join_keys`, `rules_summary`, `advisory`, `owner='invegent'`, `source_system='manual'`, `source_reference`, `refresh_method='manual_upsert'`, `refresh_cadence='on_change'`).
- V6b: 19 rows, ordinal_position 1..19, every `column_purpose` non-NULL.
- **V6b `is_foreign_key` distribution:** exactly 1 row `is_foreign_key=true` (`client_id`, `fk_ref_schema='c'`, `fk_ref_table='client'`, `fk_ref_column='client_id'`) + 18 rows `is_foreign_key=false` (`fk_ref_*=NULL`). Verify:

```sql
SELECT cr.column_name, cr.is_foreign_key, cr.fk_ref_schema, cr.fk_ref_table, cr.fk_ref_column
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name='c' AND tr.table_name='client_cadence_rule'
ORDER BY cr.is_foreign_key DESC, cr.ordinal_position;
```

Aggregate: `COUNT(*) FILTER (WHERE is_foreign_key) = 1` AND `COUNT(*) FILTER (WHERE NOT is_foreign_key) = 18`.

- **V6c (v5 NEW) — `allowed_ops` upgrade verification:** proves ON CONFLICT executed correctly:

```sql
SELECT allowed_ops, purpose FROM k.table_registry
WHERE schema_name='c' AND table_name='client_cadence_rule';
```

V6c Pass: `allowed_ops='upsert'` AND `purpose` ILIKE 'Canonical cadence rules per (client, platform)%' (NOT 'auto-registered').

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
Apply cc-0008 v5 (PRV-1 first build; trigger-aware UPSERT pattern after
v4 apply attempt rolled back atomically): create c.client_cadence_rule
table per PRV-0 v2 §3.2 + seed all 14 rows is_active=true (12 active +
2 paused-but-cadence-active IG per PRV-0 v2 §11.4) + UPSERT
k.table_registry (1 row via ON CONFLICT DO UPDATE) + UPSERT
k.column_registry (19 rows via ON CONFLICT DO UPDATE). Single
apply_migration named cc_0008_client_cadence_rule.

v4 SUPERSEDED. v4 D-01 row 5c5e8f05-2bcd-4d54-881a-b96244ce3e36 marked
status='superseded' in close-the-loop UPDATE (NOT 'applied'). v4 apply
attempt 2026-05-09 ~11:55 UTC failed at uq_schema_table due to event-
trigger collision; auto-rolled back; no production state changed.

Source: PRV-0 v2 commit 6e989517 §3.2+§5.1+§11.4.
PK directives 2026-05-09: (a) non-null expected_format all 14 rows;
(b) valid_from=current_date; (c) Path B ON CONFLICT DO UPDATE for
trigger-aware k.* handling.

v4→v5: §1.12+§1.13 NEW pre-flight (event triggers + k.* unique
constraints + column defaults + schema_registry); §3.3+§3.4 rewritten
with ON CONFLICT DO UPDATE; V6 verifies final state; V6c NEW
(allowed_ops upgrade verification). DDL/seed values UNCHANGED from v4.

Pre-flight P1.1–P1.13 PASS (re-run §1.1, §1.5, §1.10, §1.11, §1.12,
§1.13 within ~60s). DDL: PRV-0 v2 §3.2 verbatim + IF NOT EXISTS;
column count=19; no CHECK on time[] or expected_format.

DML: 14 INSERTs into c.client_cadence_rule + 1 UPSERT k.table_registry
(ON CONFLICT (schema_name, table_name) DO UPDATE) + 19 UPSERTs
k.column_registry (ON CONFLICT (table_id, column_name) DO UPDATE).
One transactional unit. Trigger trg_k_registry_sync_on_create_table
will fire at ddl_command_end and auto-INSERT 1+19 stub rows; v5
ON CONFLICT clauses upgrade in-place.

Verification V1–V7 all must PASS: V1 (table+FKs+5+2 CHECKs+indexes+V1e),
V2 (14/14/0), V3 (14:14), V4 (NOT NULL+joint period+window valid),
V5 (validity invariant), V6 (k.* final state — V6a allowed_ops='upsert'+
purpose populated; V6b is_foreign_key 1+18; V6c upgrade confirmed),
V7 (paused-IG notes).

Rollback: DROP TABLE CASCADE c.client_cadence_rule + DELETE FROM
k.table_registry WHERE schema_name='c' AND table_name='client_
cadence_rule' (FK ON DELETE CASCADE on column_registry.table_id
auto-cascades 19 column_registry rows). §6.3.

No production behaviour change in cc-0008 v5 isolation: no EF reads
this table until cc-0009 deploys cadence-rule-generator.
```

### 5.1.a (v5) v4 D-01 close-the-loop direction

`m.chatgpt_review` row id `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` MUST be UPDATEd post-v5-apply: `status='superseded'`, `resolved_by='cc-0008-v5-supersession'`, `escalation_resolved_at=now()`, `action_taken='superseded — v4 apply 2026-05-09 ~11:55 UTC failed at uq_schema_table due to trg_k_registry_sync_on_create_table collision; auto-rolled back; v5 trigger-aware ON CONFLICT applied via separate D-01 fire'`. This is in addition to the v5 D-01 close-the-loop (status='applied' post-success).

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply cc-0008 v5 (trigger-aware UPSERT pattern after v4 apply rolled back atomically): create c.client_cadence_rule per PRV-0 v2 §3.2 + 14-row seed (all is_active=true; 12 active + 2 paused-but-cadence-preserved IG per PRV-0 v2 §11.4) + 1 k.table_registry UPSERT (ON CONFLICT (schema_name, table_name) DO UPDATE) + 19 k.column_registry UPSERTs (ON CONFLICT (table_id, column_name) DO UPDATE) in one apply_migration cc_0008_client_cadence_rule.",
  "production_action_if_approved": "Single Supabase MCP apply_migration call: DDL per PRV-0 v2 §3.2 (preferred_local_times time[]; IF NOT EXISTS) + 14 INSERTs into c.client_cadence_rule (non-null expected_format) + INSERT...ON CONFLICT DO UPDATE on k.table_registry + CTE-driven INSERT...ON CONFLICT DO UPDATE on k.column_registry. Trigger trg_k_registry_sync_on_create_table will auto-INSERT 1+19 stub rows at ddl_command_end; ON CONFLICT clauses upgrade in-place.",
  "consequence_if_delayed": "PRV-1 build sequence stalls. cc-0009 (r.* + cadence-rule-generator EF + first backfill) cannot apply until cc-0008 v5 lands.",
  "cost_of_waiting": "Low. No live system degraded.",
  "current_evidence": [
    "PRV-0 v2 design lock: commit 6e989517 §3.2 + §5.1 + §11.4.",
    "v4 apply 2026-05-09 ~11:55 UTC FAILED at uq_schema_table; auto-rolled back; no production state changed. v4 D-01 row 5c5e8f05 SUPERSEDED.",
    "v5 §1.12 (event triggers): trg_k_registry_sync_on_create_table ENABLED → calls k.fn_sync_registry; auto-INSERTs 1 stub k.table_registry row + 19 stub k.column_registry rows on CREATE TABLE.",
    "v5 §1.13 (k.* unique constraints): uq_schema_table (k.table_registry) + uq_table_column (k.column_registry) both exist. Path B conflict targets verified.",
    "v5 §1.13 (k.* defaults): is_foreign_key bool DEFAULT false (NOT NULL); allowed_ops text DEFAULT 'read-only' (NOT NULL); purpose text DEFAULT 'auto-registered' (NOT NULL).",
    "v5 §1.13 (schema_registry): c, k, m, f, t, a, r all status='active'. c registered → trigger fires.",
    "Pre-flight §1.1–§1.11 PASS (re-run ~60s pre-apply confirmed no drift at 2026-05-09 11:54:43 UTC).",
    "PK directives 2026-05-09: (a) non-null expected_format all 14 rows; (b) valid_from=current_date; (c) Path B ON CONFLICT DO UPDATE."
  ],
  "known_weak_evidence": [
    "expected_format values chat-authored seed (no CHECK enum); cc-0009 Tier 4 treats as hints. PK can edit later without re-applying cc-0008.",
    "Trigger config could change between v5 brief authoring and apply-time; §1.12 re-run within ~60s mitigates.",
    "cc-0009 brief decision (option a skip vs option b suppressed) not yet locked; v5 seed correct under either."
  ],
  "default_action": "proceed if D-01 returns clean agree AND PK explicit approval phrase received AND final §1.1+§1.5+§1.10+§1.11+§1.12+§1.13 re-verification within ~60s shows no drift",
  "references": {
    "cc-0008 v5 brief (this)": "docs/briefs/cc-0008-client-cadence-rule-table-and-seed.md",
    "cc-0008 v4 brief (SUPERSEDED)": "@ commit 026dfbd7bd79708a1a1871fa4c2cd101eb5b497f; v4 D-01 row 5c5e8f05-2bcd-4d54-881a-b96244ce3e36 to be marked superseded",
    "PRV-0 v2 design lock (authority)": "docs/dashboard-review-2026-05/prv-0-design-lock.md @ commit 6e989517ceaf600e1373f7f319ab5b7d5c2c7147",
    "Memory standing rules": "Lesson #61 (P1-P5 pre-flight); D-01 protocol; apply_migration is ONLY DDL path; Lesson #62 state-capture exception; v5 lessons L33+L34+L35"
  },
  "sql_to_apply": "Single apply_migration cc_0008_client_cadence_rule: DDL from §2 + DML from §3.1 (12 active) + §3.2 (2 paused-IG) + §3.3 (k.table_registry UPSERT) + §3.4 (k.column_registry CTE UPSERT)."
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
- **6.2.l PK seed review rejection:** PK reviews §3.5 and rejects → HALT v5; chat re-issues v6 with PK-directed changes. (At v5: PK §3.5 seed review COMPLETE 2026-05-09; CCD WARNs addressed at v4; v5 trigger-aware UPSERT addresses v4 apply failure; no known open review items.)
- **6.2.m (v5) Event-trigger config drift:** §1.12 re-run reveals `trg_k_registry_sync_on_create_table` disabled, removed, or function body differs from captured. → HALT. ON CONFLICT works either way, but new trigger semantics may need different field handling.
- **6.2.n (v5) `k.*` UNIQUE constraint drift:** §1.13 re-run reveals `uq_schema_table` or `uq_table_column` definitions changed. → HALT. ON CONFLICT clauses depend on these.
- **6.2.o (v5) `c` not in `k.schema_registry`:** §1.13 re-run reveals `c` missing or status != 'active'. → HALT. Trigger only fires for registered schemas.

### 6.3 ROLLBACK path (verification fails after apply)

If V1–V7 FAIL post-apply:

1. Halt session continuation immediately.
2. Diagnose which V failed and why (capture full output).
3. Issue rollback DDL via `apply_migration` named `cc_0008_rollback_client_cadence_rule`:

```sql
-- cc-0008 v5 rollback — drop table + remove k.* registry rows
-- Note (v5): k.column_registry has FK to k.table_registry(table_id) ON DELETE CASCADE
-- (per §1.13), so DELETE on k.table_registry auto-removes the 19 column_registry rows.
-- DROP TABLE itself does NOT fire any sql_drop trigger that cleans up k.* (verified §1.12).

DROP TABLE IF EXISTS c.client_cadence_rule CASCADE;

DELETE FROM k.table_registry
WHERE schema_name='c' AND table_name='client_cadence_rule';
```

4. Re-run V1 (table_exists=false expected) and V6 (k.* registry rows = 0 expected) to confirm rollback applied.
5. Document failure mode + diagnosis in result file.
6. PK escalation; cc-0008 v6 brief.

---

## 7. Result-file convention

**Path:** `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`

**Standard sections (mirror cc-0006 / cc-0007 result pattern):**

1. **Header** — brief reference (cc-0008 v5), apply session date, executor, NEW v5 D-01 verdict (NOT v4 D-01 5c5e8f05 which is SUPERSEDED), PK approval phrase, outcome summary, brief version applied (v5 trigger-aware UPSERT — non-null expected_format on all 14 rows; ON CONFLICT DO UPDATE on §3.3+§3.4).
2. **Apply summary** — logical action, project, method, result, table created (yes/no), seed rows inserted (14 expected, all is_active=true, all expected_format non-null), k.* registry rows in final state via UPSERT, rollback fired (yes/no), §6 path triggered (or NONE), v4 supersession close-the-loop UPDATE confirmed (m.chatgpt_review row 5c5e8f05 status='superseded').
3. **Pre-flight + final re-verification** — table comparing initial pre-flight values (per §1.1–§1.13) vs ~60s-before-apply re-verification values; status PASS/FAIL. NEW §1.12 (event triggers) + §1.13 (k.* constraints + defaults + schema membership) included.
4. **DDL applied** — exact CREATE TABLE + CREATE INDEX + COMMENT statements applied (mirroring §2; preferred_local_times time[]).
5. **DML applied** — number of seed rows by client × platform (matching §3.5 surface table); confirm preferred_local_times values match `c.client_publish_schedule.publish_time` exactly; confirm expected_format breakdown 4×image_quote + 4×image + 4×linkedin_post + 2×youtube_short = 14; UPSERT semantics observed for k.table_registry (1 row, allowed_ops='upsert' upgrade verified) + k.column_registry (19 rows, is_foreign_key 1+18 distribution, all column_purpose non-NULL).
6. **Verification (V1–V7)** — status table per V; V1b records 5+2=7 CHECK count; V6a records final allowed_ops='upsert' + purpose populated; V6b records is_foreign_key 1+18; V6c records allowed_ops upgrade confirmed; V7 confirms paused-IG notes.
7. **D-01 record** — TWO m.chatgpt_review rows: (a) v5 fire row id, verdict, conditions, PK approval phrase, action_type ('sql_destructive'), close-the-loop UPDATE status='applied'; (b) v4 row 5c5e8f05 close-the-loop UPDATE status='superseded' with action_taken capturing uq_schema_table failure root cause.
8. **Hold-state assertions** — STANDING_THREE EFs untouched, no EF deploy, no cron edit, no temp log tables, no `r.*` schema work, no Phase 0 scheduling, no M8 work, no other DDL/DML.
9. **Open / next** — cc-0009 readiness gate (option (a) skip vs option (b) `expected_status='suppressed'` per PRV-0 v2 §5.1); `r` schema confirmed pre-registered in `k.schema_registry` (informational for cc-0009); flag any seed adjustments observed; flag any new findings.
10. **New brief-runner-v0 patterns observed** — capture L33 (event trigger pre-flight survey now mandatory), L34 (`k.fn_sync_registry` architecture impacts all PRV-1 build briefs), L35 (ON CONFLICT DO UPDATE defensive pattern), plus any v5-cycle lessons.

---

## 8. Stop condition

1. §1 pre-flight all §1.1–§1.13 PASS (no HALT triggered; §1.12 + §1.13 are NEW v5 pre-flight steps).
2. PK §3.5 v3 seed surface review COMPLETE 2026-05-09; CCD WARNs addressed in v4; v5 trigger-aware pattern empirically grounded in §1.12+§1.13.
3. NEW v5 §5 D-01 fire returns clean agree; reviewer's notes match v5 brief content; v4 D-01 row `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` is treated as SUPERSEDED, not as authority for v5 apply.
4. Final read-only re-verification confirms no drift (re-run §1.1, §1.5, §1.10, §1.11, §1.12, §1.13 within ~60s of apply).
5. §3 apply_migration call completes successfully (single transactional unit; no partial apply; trigger auto-INSERTs + ON CONFLICT DO UPDATE both succeed within the transaction).
6. §4 verification V1–V7 all PASS (V6 includes new V6c allowed_ops upgrade confirmation).
7. Close-the-loop UPDATE on m.chatgpt_review for v5 D-01 row (status='applied').
8. Close-the-loop UPDATE on m.chatgpt_review row `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` (status='superseded'; per §5.1.a).
9. Result file `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md` committed.
10. PRV-1 cc-0008 closure documented in 4-way sync close.
11. cc-0009 readiness signal logged for next session pickup, with explicit cc-0009-brief-decision flag: option (a) skip vs option (b) `expected_status='suppressed'` for paused-profile rows (PRV-0 v2 §5.1). `r` schema pre-registered in k.schema_registry confirmed (informational).

If any of §6.1, §6.2.{a-o}, or §6.3 paths trigger: report and stop.

---

## Notes

This is the **eighth cc-NNNN brief** (sixth-applied class will be when this lands). It is the **first PRV-1 build-class apply brief** — earlier cc-NNNN were Phase 0 (cc-0001), M-class queue integrity remediation (cc-0003..cc-0006), and recovery class (cc-0007).

### Brief-runner-v0 watch items specific to cc-0008 v5

1. 14 cadence INSERTs + 1 k.table_registry UPSERT + 19 k.column_registry UPSERTs in one apply_migration; transactional rollback unwinds all.
2. First brief consuming a PRV-0 contract (PRV-0 v2 §3.2 DDL verbatim).
3. First brief generating k.* doc-catalog rows alongside the table — now via trigger-aware UPSERT.
4. First brief with empirical seed derivation surfaced for §3.5 PK review.
5. First cc-NNNN at PRV build class — cc-0009..cc-0011 follow with same trigger-aware k.* pattern.
6. First brief using minute-precision `time[]` cadence column.
7. First brief using two-layer `is_active` / `publish_enabled` separation.
8. First brief with CCD WARN→doc-only-patch cycle (v3→v4).
9. **First brief recovering from atomic apply rollback to v5 substantive re-strategy** (v4→v5 trigger-aware UPSERT); first requiring TWO D-01 close-the-loop UPDATEs (v5 'applied' + v4 'superseded').

**Lesson candidates (post-apply):** L26 (DDL+seed+k.* in one apply_migration); L27 (PRV contract verbatim); L28 (seed provenance in notes); L29 (two-layer is_active/publish_enabled); L30 (output-budget ≤65KB landed); L31 (acceptance-integrity re-fetch); L32 (v4: WARN→doc-only-patch without re-fire); **L33 (v5): DDL briefs touching `k.schema_registry`-registered schemas MUST include `pg_event_trigger` survey in §1 pre-flight.** **L34 (v5): `k.fn_sync_registry` auto-registration is part of database architecture; affects all PRV-1 build briefs cc-0009..cc-0011.** **L35 (v5): `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows — works whether trigger fires first, is disabled, or semantics drift.**

### Open dependencies for the apply session

PK seed review COMPLETE 2026-05-09. CCD WARNs addressed at v4. v4 apply 2026-05-09 ~11:55 UTC FAILED at `uq_schema_table` (auto-rolled back; no production state changed). v5 apply gates: (1) final §1.1+§1.5+§1.10+§1.11+**§1.12**+**§1.13** re-verification within ~60s; (2) **NEW v5 D-01 fire** (v4 D-01 row `5c5e8f05` SUPERSEDED — not authoritative for v5); (3) PK explicit approval phrase. Post-apply: TWO close-the-loop UPDATEs (v5='applied'; v4=`superseded`).

**No M8 dependency. cc-0008 v5 can apply independently.**

### Sequencing reminders (PK directives 2026-05-09 — boilerplate forbidden)

cc-0008 v5 must NOT: deploy cadence-rule-generator EF, create r.* schema, create r.reconciliation_run / r.expected_publication, set up cron, run first generator backfill, create temp log tables, decide cc-0009 generator option (a) skip vs (b) suppressed. All deferred to cc-0009 (PRV-0 v2 §8.2). Violation → HALT §6.2.k.

---

*Brief authored 2026-05-09 Sydney by chat across v1→v2→v3→v4→v5 in same session. v5 inputs: v4 apply rolled back atomically at uq_schema_table due to event-trigger collision; PK directive Path B (ON CONFLICT DO UPDATE) preferred IF conflict targets verified — VERIFIED PASS §1.13. v5 changes: §1.12 + §1.13 NEW pre-flight; §3.3+§3.4 rewritten with ON CONFLICT DO UPDATE; V6 verifies final state regardless of insert-vs-upsert (V6c new); §5.1.a documents v4 D-01 supersession; §6.2 adds m/n/o HALT criteria. DDL/seed values UNCHANGED from v4. NEW D-01 fire required for v5 apply.*
