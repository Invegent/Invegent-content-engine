# Result — cc-0008 v5: `c.client_cadence_rule` table + initial seed (PRV-1 first build)

## 1. Header

| Field | Value |
|---|---|
| Brief reference | cc-0008 v5 |
| Brief commit | `d4cd3b088c98b37667c85382a52b024ef3636b2d` |
| Brief blob | `2575f0bb9c3d1a21035b729095eb126465dc7f9e` (67,494 B landed) |
| Brief path | `docs/briefs/cc-0008-client-cadence-rule-table-and-seed.md` |
| Apply session date | 2026-05-09 (Sydney) |
| Apply timestamp (UTC) | ~13:12 UTC (DDL+seed+k.* via single `apply_migration cc_0008_client_cadence_rule`) |
| Executor | Claude (chat) via Supabase MCP |
| v5 D-01 verdict | partial / escalate=true / risk=medium / confidence=high |
| v5 D-01 review_id | `cd35b93b-6d9f-4f09-8fa1-26a0c3d669b4` |
| PK approval phrase | Lesson #62 type-(c) state-capture exception override 2026-05-09 |
| Outcome summary | DDL + 14-row seed + k.* registry rows applied via trigger-aware ON CONFLICT DO UPDATE; V1-V7 all PASS; both D-01 rows closed (v5=resolved/applied; v4=resolved/superseded) |
| Lineage | v1 → v2 (PRV-0 v2 `time[]` directive + V7) → v3 (non-null `expected_format`) → v4 (CCD WARN doc-only patch — APPLY ROLLED BACK at uq_schema_table) → **v5 (trigger-aware ON CONFLICT DO UPDATE — APPLIED)** |

---

## 2. Apply summary

| Field | Value |
|---|---|
| Logical action | Single `apply_migration cc_0008_client_cadence_rule` (DDL + 14 INSERTs into `c.client_cadence_rule` + 1 UPSERT `k.table_registry` + 19 UPSERTs `k.column_registry`) — one transactional unit |
| Project | `mbkmaxqhsohbtwsqolns` (ap-southeast-2) |
| Method | Supabase MCP `apply_migration` (memory standing rule: ONLY correct DDL path for c/m/f/t schemas) |
| Result | SUCCESS — `{"success":true}` |
| Table created | YES — `c.client_cadence_rule` (19 columns, 5 inline + 2 named CHECKs, 1 FK, 3 indexes per V1) |
| Seed rows inserted | 14 (12 active + 2 paused-IG cadence-preserved per PRV-0 v2 §11.4) — all `is_active=true`, all `expected_format` non-null |
| `k.table_registry` row | 1 — final state `allowed_ops='upsert'`, `purpose` rich text (UPDATEd from default 'auto-registered'), all rich fields populated. UPSERT executed (V6c upgrade confirmed). |
| `k.column_registry` rows | 19 — `is_foreign_key` 1+18 distribution, `client_id` FK detail correct (c/client/client_id), all 19 `column_purpose` populated |
| Trigger interaction observed | `trg_k_registry_sync_on_create_table` fired at `ddl_command_end` after `CREATE TABLE`; auto-INSERTed stub k.* rows; v5 §3.3+§3.4 ON CONFLICT clauses upgraded in-place (V6c proves) |
| Rollback fired | NO |
| §6 path triggered | NONE |
| v4 supersession close-the-loop UPDATE | YES — `m.chatgpt_review` row `5c5e8f05-...` → `status='resolved'`, `resolved_by='cc-0008-v5-supersession-2026-05-09'`, `action_taken` captures uq_schema_table failure root cause |
| v5 close-the-loop UPDATE | YES — `m.chatgpt_review` row `cd35b93b-...` → `status='resolved'`, `resolved_by='cc-0008-v5-apply-2026-05-09'`, `action_taken` captures V1-V7 PASS summary |

---

## 3. Pre-flight + final re-verification

| Check | Brief baseline | Final pre-apply re-verify (~60s pre-apply) | Post-apply re-verify (close-out) | Status |
|---|---|---|---|---|
| §1.1 `table_exists` | false | false | **true** (post-apply) | PASS |
| §1.1 `pgcrypto_installed` | true | true | true | PASS |
| §1.1 `schema_c_exists` | true | true | true | PASS |
| §1.1 `schema_k_exists` | true | true | true | PASS |
| §1.5 active cadence patterns | 14 | 14 | 14 | PASS |
| §1.10 `cc_0008_review_rows` | 0 (v3) → 1 (v4 fired) | 1 (v4) | **2** (v4+v5 fired) | EXPECTED |
| §1.11 prior `cc_0008_client_cadence_rule` migration | 0 | 0 | **1** (post-apply) | PASS |
| §1.12 `trg_k_registry_sync_on_create_table` | enabled, function `k.fn_sync_registry` | enabled (no drift) | enabled (still wired) | PASS |
| §1.12 `trg_k_refresh_catalog` | enabled (informational) | enabled | enabled | PASS |
| §1.13 `uq_schema_table` UNIQUE | exists | exists | exists | PASS |
| §1.13 `uq_table_column` UNIQUE | exists | exists | exists | PASS |
| §1.13 `is_foreign_key` default | bool DEFAULT false NOT NULL | confirmed | (in use, FK column = client_id) | PASS |
| §1.13 `allowed_ops` default | 'read-only' NOT NULL | confirmed | (UPDATEd to 'upsert' via ON CONFLICT) | PASS |
| §1.13 `purpose` default | 'auto-registered' NOT NULL | confirmed | (UPDATEd to rich text via ON CONFLICT) | PASS |
| §1.13 `c` in `k.schema_registry` | active | active | active | PASS |
| §1.13 `r` in `k.schema_registry` | active (cc-0009 readiness) | active | active | INFO |

No drift triggered HALT. §1.12 and §1.13 are NEW v5 pre-flight steps introduced by lessons L33+L34.

---

## 4. DDL applied

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
    ON c.client_cadence_rule (client_id, platform, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS cadence_rule_validity_lookup
    ON c.client_cadence_rule (valid_from, valid_to) WHERE is_active = true;

COMMENT ON TABLE c.client_cadence_rule IS 'Canonical cadence rules per (client, platform). ...';
```

PRV-0 v2 §3.2 contract honoured verbatim. Column count = 19. `preferred_local_times` confirmed `data_type=ARRAY`, `udt_name=_time` (V1e PASS).

---

## 5. DML applied

### 5.1 `c.client_cadence_rule` seed — 14 rows, all `is_active=true`

| # | client_slug | platform | local_time (Syd) | expected_format | publish_enabled | is_active |
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
| 13 | ndis-yarns | instagram | 12:00 | image | **false** (anti-spam) | true |
| 14 | property-pulse | instagram | 10:00 | image | **false** (anti-spam) | true |

Common attributes (all 14): `cadence_type='weekly'`, `posts_per_period=5`, `period_unit='week'`, `weekdays=[1,2,3,4,5]`, `timezone='Australia/Sydney'`, `valid_from=current_date`, `valid_to=NULL`, `suppression_dates={}`. `preferred_local_times` values match `c.client_publish_schedule.publish_time` exactly. `expected_format` breakdown: 4×`image_quote` + 4×`image` + 4×`linkedin_post` + 2×`youtube_short` = 14 (V2/V3/V4/V5 PASS).

### 5.2 `k.table_registry` UPSERT — 1 row, ON CONFLICT executed

`INSERT ... ON CONFLICT (schema_name, table_name) DO UPDATE SET <14 fields> + updated_at=now()`.

Final state: `allowed_ops='upsert'` (UPDATEd from default `read-only`), `status='active'`, `pii_risk='none'`, `owner='invegent'`, `source_system='manual'`, `source_reference` populated, `refresh_method='manual_upsert'`, `refresh_cadence='on_change'`, `purpose` rich text matches §3.3 (UPDATEd from default `auto-registered`), `primary_use_cases` / `join_keys` / `rules_summary` / `advisory` all populated. **V6c upgrade confirmed.** Trigger auto-INSERT semantics observed: stub row inserted at `ddl_command_end` then upgraded by §3.3 INSERT...ON CONFLICT.

### 5.3 `k.column_registry` UPSERT — 19 rows, ON CONFLICT executed

CTE-driven `INSERT ... ON CONFLICT (table_id, column_name) DO UPDATE SET column_purpose, is_foreign_key, fk_ref_*, pii_risk, updated_at=now()`.

Final state: 19 rows, `is_foreign_key=true` count = 1 (`client_id` only with `fk_ref_schema='c'`, `fk_ref_table='client'`, `fk_ref_column='client_id'`), `is_foreign_key=false` count = 18, all 19 `column_purpose` populated (no NULLs). FK derivation `(p.fk_schema IS NOT NULL)` from CTE worked correctly.

---

## 6. Verification (V1–V7) — all PASS

| Check | Expected | Observed | Status |
|---|---|---|---|
| V1a table_exists | true | true | PASS |
| V1a column_count | 19 | 19 | PASS |
| V1b CHECK count (5 inline + 2 named) | 7 | 7 | PASS |
| V1c FK count | 1 | 1 | PASS |
| V1d index count | ≥3 | 3 | PASS |
| V1e preferred_local_times type | ARRAY / `_time` | ARRAY / `_time` | PASS |
| V2 total_rows / active_rows / inactive_rows | 14 / 14 / 0 | 14 / 14 / 0 | PASS |
| V3 expected_pairs : seeded_pairs | 14 : 14 | 14 : 14 | PASS |
| V4 null_violations | 0 | 0 | PASS |
| V4 broken_period_pair | 0 | 0 | PASS |
| V4 broken_validity_window | 0 | 0 | PASS |
| V5 invariant_violations | 0 | 0 | PASS |
| V6a allowed_ops | 'upsert' | 'upsert' | PASS |
| V6a status | 'active' | 'active' | PASS |
| V6a purpose_rich | true | true | PASS |
| V6a rich_fields_populated | true | true | PASS |
| V6b column_rows | 19 | 19 | PASS |
| V6b is_foreign_key true count | 1 | 1 | PASS |
| V6b is_foreign_key false count | 18 | 18 | PASS |
| V6b purpose_populated count | 19 | 19 | PASS |
| V6b client_id FK detail correct | true | true | PASS |
| **V6c (NEW v5) allowed_ops upgrade confirmed** | true | true | **PASS** |
| V7 paused_rows | 2 | 2 | PASS |
| V7 paused_rows_all_tokens | 2 (both rows carry all 4 tokens) | 2 | PASS |
| Format breakdown sum | 14 (4+4+4+2, 0 NULL) | 14 (4 image_quote + 4 image + 4 linkedin_post + 2 youtube_short, 0 NULL) | PASS |

Final post-apply re-verify timestamp: 2026-05-09 13:25:22 UTC (§1) + 2026-05-09 21:30 UTC range (V1-V7 fresh re-confirmation in close-out turn). All boxes ticked.

---

## 7. D-01 record — TWO `m.chatgpt_review` rows closed

### 7.1 v5 D-01 row `cd35b93b-6d9f-4f09-8fa1-26a0c3d669b4` — RESOLVED (applied)

| Field | Value |
|---|---|
| action_type | `sql_destructive` |
| verdict | partial |
| escalate | true |
| risk_level | medium |
| confidence | high |
| pushback summary | A: trigger config future change (mitigated by §1.12 ~60s re-verify); B: data corruption from v4 failure (atomic txn semantics + new ON CONFLICT strategy); C: runtime side-effects (no EF/cron/runtime reader until cc-0009) |
| corrected_action | "consider performing additional testing on a staging environment" — N/A; ICE has no staging environment; v5 design IS the additional testing |
| Pattern | Lesson #62 type-(c) (generic non-specific pushback matching v4 fire shape) |
| PK override | Lesson #62 type-(c) state-capture exception 2026-05-09 |
| Final status | `resolved` |
| resolved_by | `cc-0008-v5-apply-2026-05-09` |
| escalation_resolved_at | 2026-05-09 21:41:47 UTC |
| action_taken | "applied — V1-V7 all PASS post-apply ..." (full empirical summary in row) |

### 7.2 v4 D-01 row `5c5e8f05-2bcd-4d54-881a-b96244ce3e36` — RESOLVED (superseded)

| Field | Value |
|---|---|
| Original verdict | partial / escalate / medium / medium |
| Original PK override | Lesson #62 type-(c) 2026-05-09 (for v4 apply attempt) |
| Apply outcome | FAILED 2026-05-09 ~11:55 UTC at `uq_schema_table` due to `trg_k_registry_sync_on_create_table` event-trigger collision; auto-rolled back |
| Supersession reason | v4 apply strategy (manual INSERT into k.*) incompatible with active event trigger; v5 trigger-aware ON CONFLICT DO UPDATE supersedes |
| v5 brief commit | `d4cd3b088c98b37667c85382a52b024ef3636b2d` |
| Final status | `resolved` (NOT `applied`) |
| resolved_by | `cc-0008-v5-supersession-2026-05-09` |
| escalation_resolved_at | 2026-05-09 21:41:47 UTC |
| action_taken | "superseded — v4 apply attempt 2026-05-09 ~11:55 UTC failed at uq_schema_table ..." (full root-cause record in row) |

`m.chatgpt_review.chatgpt_review_status_check` enum values discovered: `{pending, completed, failed, escalated, resolved}`. Both close-the-loop UPDATEs map to `resolved`; the "applied vs superseded" distinction lives in `action_taken` + `resolved_by` text fields. See L36 candidate.

---

## 8. Hold-state assertions (intact)

- ✅ Production state changed via successful v5 apply (intended) — `c.client_cadence_rule` + 14 seed rows + k.* registry rows committed
- ✅ V1-V7 all PASS post-apply
- ✅ STANDING_THREE EFs untouched
- ✅ No EF deploy this session
- ✅ No cron edits
- ✅ No `r.*` schema work
- ✅ No temp log tables
- ✅ No Phase 0 scheduling
- ✅ No M8 work
- ✅ No DDL/DML beyond `c.client_cadence_rule` + its k.* rows + 2 close-the-loop UPDATEs to `m.chatgpt_review`
- ✅ Both D-01 rows closed in `m.chatgpt_review`

---

## 9. Open / next

### 9.1 cc-0009 readiness

- `r` schema confirmed pre-registered in `k.schema_registry` (status='active'). cc-0009 only creates tables within it.
- **cc-0009 brief decision flag** (PRV-0 v2 §5.1): for paused-IG rows, cadence-rule-generator EF must choose option (a) skip OR option (b) `expected_status='suppressed'`.
- v5 seed correct under either path. Notes on rows 13+14 capture handoff to cc-0009.

### 9.2 Discovered constraints / mechanism notes (carry forward)

- **`m.chatgpt_review.chatgpt_review_status_check` allowed values:** `{pending, completed, failed, escalated, resolved}`. ALL prior outstanding close-the-loop carries (cc-0003 v2, cc-0004, cc-0006, cc-0007, cc-0005 v4) blocked by status enum mismatch can now be closed by mapping their semantic intent to `resolved` with distinguishing text in `action_taken` + `resolved_by`.
- **`execute_sql` DML on `m.chatgpt_review` works** (RLS does not block; only the CHECK constraint did). Memory standing rule "execute_sql is effectively read-only on c/f/m/t schemas for DML" appears overly cautious for `m.chatgpt_review` specifically. L36 candidate.
- **Event trigger architecture impacts all PRV-1 build briefs** (cc-0009 / cc-0010 / cc-0011) that touch registered schemas (a/c/f/k/m/r/t). Each must include §1.12 + §1.13 pre-flight survey. L33+L34 reified.

### 9.3 Standing carries

- 5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2, cc-0004, cc-0006, cc-0007, cc-0005 v4) — now unblocked by enum discovery; recommend batched close-out next session
- Dashboard PHASES roadmap reconciliation (17th carry per action_list v2.61)
- Publisher latent config risk (P3, doc-only patch to `supabase/config.toml`)
- `F-CRON-AUTO-APPROVER-SECRET-INLINE` (P2 sec, OPEN)
- 4× P2 cron staleness findings
- M8b separate brief authoring (gated on manual caller remediation)
- 94-row legacy un-publishable cohort cleanup decision
- v2.60 future ideation Brand Topic Notebook (queued)

---

## 10. New brief-runner-v0 patterns observed (lessons L33-L36)

### L33 — Event trigger pre-flight survey is mandatory for DDL briefs in registered schemas

DDL briefs touching schemas registered in `k.schema_registry` (a/c/f/k/m/r/t) MUST include `pg_event_trigger` survey in §1 pre-flight. v4 apply rolled back at `uq_schema_table` because v4 brief did not survey active event triggers in `k.*`; the brief assumed it was authoring the only INSERT into `k.table_registry`. v5 added §1.12 (event trigger survey) — discovered `trg_k_registry_sync_on_create_table` auto-INSERTs at `ddl_command_end`. Lesson reified across all PRV-1 build briefs (cc-0009 / cc-0010 / cc-0011).

### L34 — `k.fn_sync_registry` auto-registration is part of database architecture

The function `k.fn_sync_registry` (called by `k.evtrg_sync_registry_on_create_table`) is invariantly active for all CREATE TABLE in registered schemas. It auto-INSERTs 1 stub `k.table_registry` row + N stub `k.column_registry` rows. Brief authoring strategy must accommodate this — not work around it. Affects all PRV-1 build briefs.

### L35 — `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows

Path B (ON CONFLICT) survives whether trigger fires first, is disabled, or has different semantics. Path A (try-detect-modify INSERT-or-UPDATE) requires runtime branching and is fragile. v5 §3.3 + §3.4 use ON CONFLICT for both `k.table_registry` (conflict target `(schema_name, table_name)`) and `k.column_registry` (conflict target `(table_id, column_name)`). V6c verifies the upgrade actually executed by checking `allowed_ops='upsert'` (UPDATEd from default `read-only`).

### L36 (NEW this session — close-the-loop discovery)

`m.chatgpt_review.chatgpt_review_status_check` CHECK enum is `{pending, completed, failed, escalated, resolved}`. Close-the-loop UPDATEs map all positive terminal outcomes (`applied`, `superseded`, `resolved` semantic intents) to `status='resolved'` with semantic distinction stored in `action_taken` + `resolved_by` text fields. This unblocks the 5 prior outstanding close-the-loop carries. Empirical fact: `execute_sql` DML on `m.chatgpt_review` works; the prior memory rule "execute_sql is effectively read-only on c/f/m/t schemas for DML" appears over-cautious for `m.chatgpt_review` specifically.

### Earlier reified lessons (cc-0008 lineage)

- L26: DDL+seed+k.* in one `apply_migration` (single transactional unit)
- L27: PRV contract verbatim in DDL
- L28: seed provenance recorded in row notes
- L29: two-layer `is_active` (cadence shape) / `publish_enabled` (runtime pause) separation
- L30: output-budget ≤67KB landed (v4=67,598; v5=67,494 — within practical envelope)
- L31: acceptance-integrity re-fetch after commit
- L32: v4 CCD WARN→doc-only-patch without re-fire pattern

---

*Result authored 2026-05-09 Sydney by chat per cc-0008 v5 brief §7 ten-section template. cc-0008 v5 apply landmark complete; PRV-1 first build delivered. cc-0009 (r.* schema + cadence-rule-generator EF + first backfill) unblocked.*
