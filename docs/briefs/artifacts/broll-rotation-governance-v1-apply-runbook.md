# Apply Runbook + Dashboard-Readiness Handoff — B-roll Rotation Governance v1

**Tier: T3.** PK owns every step below. Nothing here has been executed.
**Artifacts:** `broll-rotation-governance-v1-migration.sql` ·
`broll-rotation-governance-v1-rollback.sql`
**Record:** `docs/briefs/results/broll-rotation-governance-v1-result.md`

---

## 1. Pre-apply gates

| # | Gate | Status |
|---|---|---|
| 1 | `db-rls-auditor` | ✅ **RUN** — verdict `concerns`; 3 must-fix + 9 should-fix. **All 3 must-fix APPLIED**, 6 of 9 should-fix applied, 3 carried (§1.1) |
| 2 | External review, `reviewed_input_hash` re-pinned each round | ✅ **CLEAN at rev-4** — `agree` · medium · high · `escalate:false` · zero pushback, zero unverified claims. `review_id c6022ff0-a5bf-4eaf-9755-6cd2a8e066ce`, hash `8c32c08259bb0767` |
| 3 | `branch-warden` — HEAD/parity/file-set before the apply commit | pending |
| 4 | PK ratification of brief §3 D1 (declared copy geography = `au`) and D2 (sticky retry) | ⛔ pending — **the remaining hard stop** |
| 5 | Rollback validated | ✅ done — result §4.3, re-validated after revision |

### 1.1 Should-fix items deliberately CARRIED (not applied)

| Item | Why carried |
|---|---|
| `c.geo_class` does not cover the incumbent `geo_scope` vocabulary on IMAGE rows (`au_generic`, `none`, `non_au`, `unidentified`) | Seeding those as geography classes would be inventing semantics — `none`/`unidentified` are not places. Inert today (the `v_bg_is_video` fence means image rows never reach the filter). **Handled as an intake rule instead:** any new `broll_background` row's `geo_scope` MUST resolve in `c.geo_class` or it is rejected `geo_unclassified` (fail-closed, recorded). **PK question:** should `au_generic` be reconciled to `au`, or the vocabularies formally split? |
| History stream is keyed `(client_id, ice_format_key)` and does not separate video- from image-background renders | If the B-roll winner ever fail-closes, `select_template` falls back to image template `a3d8472d`, whose render writes an image key at the head of the same history and weakens tier 1 for the next render. Self-healing, low severity — **named in result §7 rather than fixed**, because filtering it needs a render-kind discriminator that does not exist yet |
| SQL not yet staged under `supabase/migrations/<version>_<name>.sql` | The version is minted by `apply_migration`. **Commit the SQL under its applied name as part of closeout** — otherwise this widens the known migration-ledger-vs-git drift carry |

## 2. Apply

**APPLY CHANNEL — decided (`db-rls-auditor` must-fix 3): `apply_migration` ONLY.**
The packet now carries **no `BEGIN;`/`COMMIT;` of its own** — that channel supplies the single
wrapping transaction. An inner `COMMIT` would end it early, decouple the DDL from the ledger
row, and destroy the all-or-nothing property the `IF NOT EXISTS` clauses and assertion blocks
depend on. Do not paste this into a channel that does not wrap the whole file in one
transaction. `apply_migration` mints its own version number — the file name is not the
migration identity. A free, non-colliding name: `resolve_slot_assets_v1_5_rotation_governance`
(verified against the applied ledger and the repo).

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

> This is now **also enforced inside the apply** by a fail-closed `RAISE` block, so a zero-row
> seed aborts the migration instead of committing silently. Verified in both directions during
> the dry run. The check is repeated here as defence in depth, not as the only guard.

### 3.2a Advisor delta is exactly what was predicted

```sql
-- re-run get_advisors(security) and diff against the pre-apply baseline of 248 lints
```
Expect **+2 `rls_enabled_no_policy` (INFO)** — for `c.geo_class` and
`c.client_format_copy_geography`, joining the 22 schema-`c` tables already in that set — and
**nothing else**. Specifically `public.geo_relation` must NOT appear under
`anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`,
or `function_search_path_mutable`. Any other delta ⇒ **STOP**.

### 3.3 Grants and RLS fenced

```sql
SELECT relname, relrowsecurity, relacl FROM pg_class
WHERE relname IN ('geo_class','client_format_copy_geography');
SELECT proname, array_to_string(proacl,' | ') FROM pg_proc
WHERE proname IN ('resolve_slot_assets','geo_relation');
```
Expect: RLS enabled on both tables · no `anon=`/`authenticated=` entry anywhere.

> Two corrections from the audit, recorded so a future reader does not inherit a false rule:
> **(a)** `relforcerowsecurity` will be `false` and that is correct — `postgres` has
> `rolbypassrls = TRUE`, so FORCE and ENABLE are behaviourally identical for every principal
> that exists here; FORCE would *not* have blocked the SECURITY DEFINER owner. The standing
> ICE note "RLS needs FORCE" is imprecise for the same reason.
> **(b)** An anon/authenticated REST call against these tables fails **42501 permission
> denied**, not PGRST106 — schema `c` *is* exposed, so the PGRST106 class does not apply.
> **(c)** `service_role` and `inspector_ro` retain SELECT via the schema-`c` default ACL.
> `inspector_ro` lacks BYPASSRLS, so it sees an **empty table rather than an error** — expected,
> and the reason both tables carry a `COMMENT ON TABLE` explaining the posture.

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
