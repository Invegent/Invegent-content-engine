# Apply Runbook + Dashboard-Readiness Handoff — B-roll Rotation Governance v1

**Tier: T3.** PK owns every step below. Nothing here has been executed.
**Artifacts:** `broll-rotation-governance-v1-migration.sql` ·
`broll-rotation-governance-v1-rollback.sql`
**Record:** `docs/briefs/results/broll-rotation-governance-v1-result.md`

---

## 1. Pre-apply gates (all must clear first)

| # | Gate | Status |
|---|---|---|
| 1 | `db-rls-auditor` on the two new tables — RLS posture, grants, `c`-schema PostgREST exposure | ⛔ **NOT RUN** — required |
| 2 | External review (`ask_chatgpt_review`) on the frozen packet, `reviewed_input_hash` pinned | ⛔ **NOT RUN** — required |
| 3 | `branch-warden` — HEAD/parity/file-set before the apply commit | pending |
| 4 | PK ratification of brief §3 D1 (declared copy geography = `au`) and D2 (sticky retry) | pending |
| 5 | Rollback validated | ✅ done — result §4.3 |

## 2. Apply

Single migration, one transaction. **`apply_migration` mints its own version number** — the
file name is not the migration identity (standing ICE carry).

**STOP conditions (any ⇒ abort, do not continue):**

- the packet hash differs from the reviewed hash;
- `pg_proc.proacl` for `resolve_slot_assets` after apply is anything other than
  `postgres=X/postgres | service_role=X/postgres`;
- the post-apply function diff (§3.1) is non-empty;
- `c.geo_class` or `c.client_format_copy_geography` is reachable by `anon`/`authenticated`;
- any governed video render fail-closes with `no_geo_compatible_background` immediately
  after apply (would mean the declaration row did not land).

## 3. Post-apply verification (run in order, before declaring success)

### 3.1 Byte-identity check — MANDATORY, closes result §5

The dry runs proved the packet semantically; this is the byte-level guarantee.

```bash
python scripts/db-read.py "SELECT 1" >/dev/null && echo "read path ok"
```

Then dump the live definition and diff it against the file body:

```bash
python - <<'PY'
# after apply: compare pg_get_functiondef against the migration file body
PY
```

Expect: the live `resolve_slot_assets` body is identical to the
`CREATE OR REPLACE FUNCTION public.resolve_slot_assets … $function$` block in
`broll-rotation-governance-v1-migration.sql`. Any diff ⇒ **STOP and roll back**.

### 3.2 Declaration landed

```sql
SELECT cl.client_slug, g.format_key, g.copy_geo_key, g.declared_by
FROM c.client_format_copy_geography g JOIN c.client cl USING (client_id);
```
Expect exactly one row: `property-pulse / video_short_stat / au / PK`.

### 3.3 Grants and RLS fenced

```sql
SELECT relname, relrowsecurity, relacl FROM pg_class
WHERE relname IN ('geo_class','client_format_copy_geography');
SELECT proname, array_to_string(proacl,' | ') FROM pg_proc
WHERE proname IN ('resolve_slot_assets','geo_relation');
```
Expect: RLS enabled on both tables · no `anon=`/`authenticated=` entry anywhere.

### 3.4 Live resolver smoke — pool intact, all six reachable

```sql
SELECT DISTINCT public.resolve_slot_assets(
  'property-pulse', NULL, 'video_short_stat',
  'dd5fd75e-982d-4c3d-89cd-7ce0936076b2'::uuid, 'seed-'||g)->'broll_selection'->>'selected_asset_key'
FROM generate_series(1,90) g;
```
Expect **6 distinct keys**, `pool_eligible:6`, `pool_after_geo:6`.

### 3.5 The four proofs the task asks for AFTER deployment

Run once real governed B-roll renders exist:

1. **No immediate repeats** — consecutive `succeeded` renders never share `bg_asset_key`:
   ```sql
   SELECT created_at, bg, lag(bg) OVER (ORDER BY created_at) AS prev FROM (
     SELECT prl.created_at,
            jsonb_path_query_first(prl.render_spec,'$.template.tmr.slot_reasons[*] ? (@.slot == "Background")')->>'asset_key' AS bg
     FROM m.post_render_log prl JOIN c.client cl USING (client_id)
     WHERE cl.client_slug='property-pulse' AND prl.ice_format_key='video_short_stat' AND prl.status='succeeded') s
   ORDER BY created_at DESC;
   ```
   Expect: no row where `bg = prev`.
2. **No geographic contradictions** — every render's reasons carry a `geo_compat:` value in
   {`generic_asset`, `exact_match`, `asset_narrower_than_copy`, `asset_broader_than_copy`};
   **no** render carries a bound background alongside a `geo_conflict` rejection.
3. **All six assets reachable** — §3.4 over a fresh seed sweep.
4. **Output parity unchanged** — `render_spec.template.tmr.output_spec` still reads
   `1080 × 1920 / 12.0s / render_time_parity_overlay` on every governed render.

## 4. Rollback

Run `broll-rotation-governance-v1-rollback.sql` **in full and in order** (resolver restored
first, tables dropped second). Its own assertion block fails closed if either half did not
take. Zero asset rows are touched in either direction.

---

## 5. Dashboard-readiness handoff

Everything below is **already recorded per render** once the packet is applied — no further
worker or resolver change is needed to surface it. This is a read/display task.

### 5.1 Where the data lives

`m.post_render_log.render_spec.template.tmr`:

- `slot_reasons[]` where `slot='Background'` → `asset_key` plus the reason strings;
- `slot_warnings[]` → resolver warnings verbatim.

Extraction shape:

```sql
SELECT prl.created_at, prl.status,
  r->>'asset_key' AS broll_asset_key,
  (SELECT x FROM jsonb_array_elements_text(r->'reasons') x WHERE x LIKE 'geo_class:%')        AS geo_class,
  (SELECT x FROM jsonb_array_elements_text(r->'reasons') x WHERE x LIKE 'geo_compat:%')       AS geo_compat,
  (SELECT x FROM jsonb_array_elements_text(r->'reasons') x WHERE x LIKE 'recent_use:%')       AS recent_use,
  (SELECT x FROM jsonb_array_elements_text(r->'reasons') x WHERE x LIKE 'pool_eligible:%')    AS pool_eligible,
  (SELECT x FROM jsonb_array_elements_text(r->'reasons') x WHERE x LIKE 'pool_after_geo:%')   AS pool_after_geo,
  (SELECT x FROM jsonb_array_elements_text(r->'reasons') x WHERE x LIKE 'pool_after_recent:%')AS pool_after_recent,
  (SELECT x FROM jsonb_array_elements_text(r->'reasons') x WHERE x LIKE 'fallback:%')         AS fallback_reason
FROM m.post_render_log prl
CROSS JOIN LATERAL jsonb_path_query_first(prl.render_spec,
  '$.template.tmr.slot_reasons[*] ? (@.slot == "Background")') r
WHERE r IS NOT NULL;
```

### 5.2 The six required visibility fields → where each comes from

| Required | Source |
|---|---|
| Selected B-roll asset key | `slot_reasons[Background].asset_key` |
| Geography classification | `geo_class:` reason |
| Recent-use exclusion applied | `recent_use:` reason (`excluded_2` / `excluded_1` / `full_pool_fallback` / `none`) |
| Compatibility result | `geo_compat:` reason |
| Candidate count before / after filtering | `pool_eligible:` → `pool_after_geo:` → `pool_after_recent:` |
| Fallback reason, if any | `fallback:` reason (absent when no fallback fired) |

### 5.3 Recommended next step (NOT built here)

Add a secret-free `ice_ro.broll_rotation_status` view over §5.1 so the dashboard and the R0
read path get it without touching `m.*`. That is a normal T2 lane under the standing rule:
a recurring read with no view is a signal to add a view, never to widen `execute_sql`.

### 5.4 Standing gap this does NOT close

The thin-pool detector remains unbuilt (readiness handoff §5.1). v1.5 now emits
`pool_eligible` per render, which makes option (1) of that handoff — machine-checkable
thin-pool state — **cheap to finish**: the count it needed is now stamped. Building the
alarm on top is still a separate lane.
