# ⚠ PROPOSED / NOT FROZEN / NOT PK-APPROVED — draft only; authorises nothing; applies nothing.

# Apply Packet (DRAFT v1) — cc-0090 Asset Graduation Read Model v1

**Lane:** instantiate the O-4-mandated "Asset Graduation Read Model v1" — a dedicated, secret-free,
read-only `ice_ro` surface exposing ONLY the asset / fence / pool-policy / resolver-reachability
fields the Asset Graduation Contract requires, closing the R0 view gap named in
`docs/briefs/artifacts/asset-graduation-candidates-v1.sql` (header, "CHANNEL" block) and ratified as
required follow-on in `docs/briefs/asset-graduation-contract-v1.md` §13 O-4.
**Tier (recommendation):** **T2** (dark/additive read-only DDL, no production caller, no secret, no
posture change beyond `GRANT SELECT` on the four new views to the already-confined `ice_readonly`
role). Convention 3 maps "grants" to T3; the grant here is additive SELECT inside the proven G-RO v2
confinement pattern, which CLAUDE.md's R0 section explicitly contemplates ("coverage gap → new view
... under the normal T2/T3 gate"). **Doubt escalates: the final tier is PK's Gate-1 call.** The
packet is written to T3 discipline (verify-or-abort, fail-closed assertions, rollback authored
before apply, named STOPs) either way.
**Lane class (CCF-02):** SAFETY_GATE.
**Status:** **PROPOSED — NOT FROZEN.** Authored 2026-07-30 (overnight autonomous session, branch
`claude/creatomate-global-progress-r0vbuf`, HEAD `09eae15`, clean tree). No external review run, no
hash pinned, no register version claimed, nothing applied. PK has not seen this document.
**cc- id note:** `cc-0090` is the task-assigned id; it appears nowhere in the registers yet —
allocation is PK's at Gate 1.

---

## 0. Provenance honesty — what existed before this draft

**No prior cc-0090 artifact exists in the repo.** `grep -r "cc-0090"` returns nothing. What exists
(commit `09eae15`, v6.86) is Slice 1: the shadow evaluator (`.claude/helpers/asset-graduation-check.mjs`,
sha256 `ddd0bfeb…`), its 85 hermetic tests (`d3f21871…`), and the hash-pinned read pack
(`docs/briefs/artifacts/asset-graduation-candidates-v1.sql`, `16f8f4dd…`) whose header **names** the
Read Model v1 as a follow-on lane. This packet is the first drafted instantiation of that named
follow-on — it was authored fresh in this session, not recovered from a prior draft.

## 1. What this lane closes (and what it deliberately does not)

- **Closes:** the O-4 gap — `ice_ro` has no asset view (`asset_governance_status` is format-contract
  shaped; verified 2026-07-30 in the read pack header), so every graduation batch read is a prompted
  `execute_sql` call. This packet adds four secret-free `ice_ro` views so view-coverable graduation
  reads route through the zero-prompt R0 path (`scripts/db-read.py`).
- **Does NOT close:** O-4's larger condition. The Read Model is **necessary but not sufficient** for
  any unattended production graduation — that door stays shut (contract §13 O-3: no auto-graduation
  carve-out). These views grant no eligibility, flip no fence, and change no resolver behaviour.
- **Does NOT change:** the Slice-1 evaluator, the read pack, `resolve_slot_assets`,
  `select_template`, any worker, any table, any RLS policy, any existing grant. A read-pack v2 that
  consumes these views instead of raw `c.*` reads is a **separate future lane**, out of scope here.

## 2. The change — ONE additive migration

**Migration name (permanent identity, per naming discipline — a revision gets a NEW number + name):**

```
supabase/migrations/20260730230000_cc_0090_asset_graduation_read_model_v1.sql
```

Content: 4 `CREATE VIEW` + 1 `GRANT SELECT` + executable verify-or-abort preconditions + fail-closed
post-assertions. Zero DML. Zero table/function/role/policy change. The four views follow the proven
G-RO v2 pattern (`20260719150000_ice_ro_r0_views_and_confined_role.sql`, sha256 `2ae3c1cbe75b831c`):
owner-rights views (NOT `security_invoker` — deliberate, owner bypasses RLS for cross-client operator
monitoring, confidentiality governed by the explicit column lists), explicit columns only, all
freeform/jsonb/URL/notes columns withheld.

> **File-placement note (session constraint):** this overnight session may write only under
> `docs/briefs/`, so the executable SQL is embedded verbatim below. On PK approval, the applying
> session cuts it byte-identically to the migration path above (STOP-1 hashes it).

### 2.1 Forward SQL — embedded verbatim

```sql
-- 20260730230000_cc_0090_asset_graduation_read_model_v1.sql
-- cc-0090 — Asset Graduation Read Model v1 (Asset Graduation Contract §13 O-4 follow-on).
-- Additive, read-only: 4 secret-free ice_ro views + SELECT grants to ice_readonly.
-- No table, role-attribute, policy, function, or DML change of any kind.
-- Runs in ONE transaction via ONE apply_migration call (the named single-call channel).

-- ===== Section 0: verify-or-abort preconditions (executable, fail-closed) =====
DO $pre$
DECLARE n int;
BEGIN
  -- P1: the proven R0 substrate must exist (schema + confined role).
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'ice_ro') THEN
    RAISE EXCEPTION 'ABORT cc-0090 P1: schema ice_ro missing - R0 substrate absent, STOP';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ice_readonly') THEN
    RAISE EXCEPTION 'ABORT cc-0090 P1: role ice_readonly missing, STOP';
  END IF;
  -- P2: baseline = exactly the 10 proven R0 views, no strays (unknown concurrent state -> re-cut).
  SELECT count(*) INTO n FROM pg_class k JOIN pg_namespace ns ON ns.oid = k.relnamespace
   WHERE ns.nspname = 'ice_ro' AND k.relkind = 'v';
  IF n <> 10 THEN
    RAISE EXCEPTION 'ABORT cc-0090 P2: expected exactly 10 ice_ro views pre-apply, found % - STOP, re-cut packet', n;
  END IF;
  -- P3: grant baseline = exactly 10 ice_ro SELECT grants to ice_readonly.
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE grantee = 'ice_readonly' AND table_schema = 'ice_ro' AND privilege_type = 'SELECT';
  IF n <> 10 THEN
    RAISE EXCEPTION 'ABORT cc-0090 P3: expected exactly 10 ice_ro SELECT grants pre-apply, found % - STOP', n;
  END IF;
  -- P4: none of the four cc-0090 names exists (this apply is CREATE, never REPLACE).
  IF EXISTS (SELECT 1 FROM pg_class k JOIN pg_namespace ns ON ns.oid = k.relnamespace
             WHERE ns.nspname = 'ice_ro'
               AND k.relname IN ('asset_graduation_client_candidate_status',
                                 'asset_graduation_shared_candidate_status',
                                 'asset_graduation_pool_policy',
                                 'asset_graduation_geo_class')) THEN
    RAISE EXCEPTION 'ABORT cc-0090 P4: a cc-0090 view name already exists - STOP, never CREATE OR REPLACE';
  END IF;
  -- P5: confinement intact BEFORE we touch anything (if already broken, this lane must not proceed).
  IF has_schema_privilege('ice_readonly', 'm', 'USAGE')
     OR has_schema_privilege('ice_readonly', 'c', 'USAGE') THEN
    RAISE EXCEPTION 'ABORT cc-0090 P5: ice_readonly holds m/c USAGE pre-apply - confinement broken, STOP';
  END IF;
END $pre$;

-- ===== Section A: the four views =====

-- 11. asset_graduation_client_candidate_status <- c.client_brand_asset (join c.client for slug)
--     WITHHELD: asset_url, asset_name, notes, full asset_meta, source_url, license_url,
--     author/photographer/creator names, pk_exception text (all -> presence booleans or omitted).
--     The view is deliberately UNFILTERED (all rows, all usages): candidate filtering is the
--     reader's WHERE clause; a view that pre-filters would hide rows and "an absent row proves
--     nothing" (read-pack correction 2, 2026-07-30).
CREATE VIEW ice_ro.asset_graduation_client_candidate_status AS
SELECT
  cba.asset_id,
  cba.client_id,
  cl.client_slug,
  cba.asset_type,
  cba.asset_meta->>'asset_key'                          AS asset_key,
  cba.asset_meta->>'usage'                              AS asset_meta_usage,
  -- asset_kind is DERIVED (c.client_brand_asset has NO asset_kind column - verified live
  -- 2026-07-30): mime is authoritative, usage a fallback only when mime is absent; an
  -- unresolvable kind is NULL (a reported gap), never a silent 'image'.
  CASE
    WHEN cba.asset_meta->>'mime' LIKE 'video/%' THEN 'video'
    WHEN cba.asset_meta->>'mime' LIKE 'image/%' THEN 'image'
    WHEN cba.asset_meta->>'mime' IS NOT NULL     THEN NULL
    WHEN cba.asset_meta->>'usage' = 'background'       THEN 'image'
    WHEN cba.asset_meta->>'usage' = 'broll_background' THEN 'video'
    ELSE NULL
  END                                                   AS asset_kind_derived,
  cba.asset_meta->>'mime'                               AS mime,
  cba.is_active,                                        -- COLUMN, defaults TRUE (the open-by-default trap)
  -- approved: tri-state, fail-closed. TRUE only when the key is exactly 'true';
  -- FALSE for any other present value; NULL when undeclared. No ::boolean cast that
  -- could throw at query time on a malformed row.
  (lower(cba.asset_meta->>'approved') = 'true')         AS approved_is_true,
  cba.asset_meta->>'approved'                           AS approved_declared,
  lower(cba.asset_meta->>'sha256')                      AS sha256,
  cba.asset_meta->>'bucket'                             AS bucket,   -- raw, no default baked in
  cba.platform_scope,
  cba.asset_meta->>'safe_for_text_overlay'              AS safe_for_text_overlay,
  cba.asset_meta->>'geo_scope'                          AS geo_scope,
  cba.asset_meta->>'geo_basis'                          AS geo_basis,
  -- guarded numeric extraction: never a query-time cast error on a garbage value
  CASE WHEN cba.asset_meta->>'width'  ~ '^[0-9]{1,5}$' THEN (cba.asset_meta->>'width')::int  END AS source_width,
  CASE WHEN cba.asset_meta->>'height' ~ '^[0-9]{1,5}$' THEN (cba.asset_meta->>'height')::int END AS source_height,
  cba.asset_meta->>'crop_geometry_key'                  AS crop_geometry_key,
  cba.asset_meta->>'identifiable_person'                AS identifiable_person,
  cba.asset_meta->>'cultural_element'                   AS cultural_element,
  cba.asset_meta->>'legible_signage'                    AS legible_signage,
  cba.asset_meta->>'ndis_phase'                         AS ndis_phase,
  cba.asset_meta->>'reviewer_verdict'                   AS reviewer_verdict,
  -- provenance identity/licence scalars (key fallbacks per the 2026-07-30 live census);
  -- URLs and freeform stay withheld -> presence booleans only.
  COALESCE(cba.asset_meta->>'provider', cba.asset_meta->>'source_platform', cba.asset_meta->>'source_site')            AS provider,
  COALESCE(cba.asset_meta->>'provider_asset_id', cba.asset_meta->>'source_pexels_id')                                  AS provider_asset_id,
  COALESCE(cba.asset_meta->>'license_type', cba.asset_meta->>'license')                                                AS licence_name,
  cba.asset_meta->>'license_expires_at'                 AS licence_expires_at,
  cba.asset_meta->>'commercial_use_permitted'           AS commercial_use_permitted,
  (COALESCE(cba.asset_meta->>'source_url',  '') <> '')  AS has_source_url,
  (COALESCE(cba.asset_meta->>'license_url', '') <> '')  AS has_licence_url,
  (COALESCE(cba.asset_meta->>'author', cba.asset_meta->>'photographer', cba.asset_meta->>'creator') IS NOT NULL)       AS has_author,
  (COALESCE(cba.asset_meta->>'pk_exception', cba.asset_meta->>'pk_decision', cba.asset_meta->>'pk_design_approval') IS NOT NULL) AS has_pk_exception,
  cba.created_at,
  cba.updated_at
FROM c.client_brand_asset cba
LEFT JOIN c.client cl ON cl.client_id = cba.client_id;

-- 12. asset_graduation_shared_candidate_status <- c.shared_creative_asset
--     WITHHELD: asset_url, asset_name, full asset_meta, use_case_tags, tone_tags + the same
--     provenance URL/freeform keys as view 11. INCLUDES the four reachability columns the
--     Slice-1 read pack disclosed as a named gap (purpose_bound boolean, vertical_key,
--     allowed_clients, excluded_clients) so a read-pack v2 can close that gap without DDL.
CREATE VIEW ice_ro.asset_graduation_shared_candidate_status AS
SELECT
  sca.id                                                AS asset_id,
  sca.asset_meta->>'asset_key'                          AS asset_key,
  sca.asset_kind,                                       -- native CHECK vocabulary: static_background|logo|image|video_broll
  sca.governance_scope,                                 -- global_generic|vertical_shared|purpose_bound
  sca.vertical_key,
  sca.allowed_clients,
  sca.excluded_clients,
  sca.purpose_bound,
  sca.brand_neutral,
  sca.participant_neutral,
  sca.sensitivity_class,
  sca.licence_allows_multi_entity_use,                  -- British spelling is the real column name
  sca.is_active,                                        -- DEFAULT false (fenced-first)
  sca.production_use_allowed,                           -- DEFAULT false (fenced-first)
  sca.approval_status,
  sca.platform_scope,
  sca.subject_tags,
  sca.aspect_ratio,
  (lower(sca.asset_meta->>'approved') = 'true')         AS approved_is_true,
  sca.asset_meta->>'approved'                           AS approved_declared,
  lower(sca.asset_meta->>'sha256')                      AS sha256,
  sca.asset_meta->>'bucket'                             AS bucket,   -- raw, no default baked in
  sca.asset_meta->>'safe_for_text_overlay'              AS safe_for_text_overlay,
  sca.asset_meta->>'geo_scope'                          AS geo_scope,
  sca.asset_meta->>'geo_basis'                          AS geo_basis,
  CASE WHEN sca.asset_meta->>'width'  ~ '^[0-9]{1,5}$' THEN (sca.asset_meta->>'width')::int  END AS source_width,
  CASE WHEN sca.asset_meta->>'height' ~ '^[0-9]{1,5}$' THEN (sca.asset_meta->>'height')::int END AS source_height,
  sca.asset_meta->>'crop_geometry_key'                  AS crop_geometry_key,
  sca.asset_meta->>'identifiable_person'                AS identifiable_person,
  sca.asset_meta->>'cultural_element'                   AS cultural_element,
  sca.asset_meta->>'legible_signage'                    AS legible_signage,
  sca.asset_meta->>'ndis_phase'                         AS ndis_phase,
  sca.asset_meta->>'reviewer_verdict'                   AS reviewer_verdict,
  COALESCE(sca.asset_meta->>'provider', sca.asset_meta->>'source_platform', sca.asset_meta->>'source_site')            AS provider,
  COALESCE(sca.asset_meta->>'provider_asset_id', sca.asset_meta->>'source_pexels_id')                                  AS provider_asset_id,
  COALESCE(sca.asset_meta->>'license_type', sca.asset_meta->>'license')                                                AS licence_name,
  sca.asset_meta->>'license_expires_at'                 AS licence_expires_at,
  sca.asset_meta->>'commercial_use_permitted'           AS commercial_use_permitted,
  (COALESCE(sca.asset_meta->>'source_url',  '') <> '')  AS has_source_url,
  (COALESCE(sca.asset_meta->>'license_url', '') <> '')  AS has_licence_url,
  (COALESCE(sca.asset_meta->>'author', sca.asset_meta->>'photographer', sca.asset_meta->>'creator') IS NOT NULL)       AS has_author,
  (COALESCE(sca.asset_meta->>'pk_exception', sca.asset_meta->>'pk_decision', sca.asset_meta->>'pk_design_approval') IS NOT NULL) AS has_pk_exception,
  sca.created_at,
  sca.updated_at
FROM c.shared_creative_asset sca;

-- 13. asset_graduation_pool_policy <- c.client LEFT JOIN c.client_asset_pool_policy
--     One row per client, ALWAYS - so "no policy row" (which means client_only, shared pool
--     structurally unreachable) is VISIBLE as policy_row_exists=false, never an absent view row.
--     This preserves the read pack's load-bearing "looked and found nothing" vs "never looked"
--     distinction at the view layer. All columns safe scalars; no jsonb.
CREATE VIEW ice_ro.asset_graduation_pool_policy AS
SELECT
  cl.client_id,
  cl.client_slug,
  cl.status                                             AS client_status,
  (pp.client_id IS NOT NULL)                            AS policy_row_exists,
  pp.pool_policy,                                       -- client_only|client_preferred|best_fit
  pp.allow_vertical_shared,
  pp.allow_global_shared,
  pp.client_asset_score_bias,
  pp.minimum_fit_score,
  pp.policy_version,
  pp.updated_at
FROM c.client cl
LEFT JOIN c.client_asset_pool_policy pp ON pp.client_id = cl.client_id;

-- 14. asset_graduation_geo_class <- c.geo_class (all columns SAFE, C5 geography vocabulary)
CREATE VIEW ice_ro.asset_graduation_geo_class AS
SELECT geo_key, geo_level, parent_key, label, created_at
FROM c.geo_class;

-- ===== Section B: grants (additive SELECT only, to the already-confined role) =====
GRANT SELECT ON ice_ro.asset_graduation_client_candidate_status,
               ice_ro.asset_graduation_shared_candidate_status,
               ice_ro.asset_graduation_pool_policy,
               ice_ro.asset_graduation_geo_class
TO ice_readonly;

-- ===== Section C: fail-closed post-assertions (any failure aborts the whole transaction) =====
DO $assert$
DECLARE n int;
BEGIN
  -- A1: exactly 14 ice_ro views now (10 R0 + 4 cc-0090), nothing else appeared.
  SELECT count(*) INTO n FROM pg_class k JOIN pg_namespace ns ON ns.oid = k.relnamespace
   WHERE ns.nspname = 'ice_ro' AND k.relkind = 'v';
  IF n <> 14 THEN RAISE EXCEPTION 'cc-0090 A1: expected exactly 14 ice_ro views post-apply, found %', n; END IF;
  -- A2: no cc-0090 view is security_invoker (would change RLS semantics / break owner-rights reads).
  SELECT count(*) INTO n FROM pg_class k JOIN pg_namespace ns ON ns.oid = k.relnamespace
   WHERE ns.nspname = 'ice_ro' AND k.relkind = 'v' AND k.relname LIKE 'asset_graduation_%'
     AND (SELECT option_value FROM pg_options_to_table(k.reloptions)
          WHERE option_name = 'security_invoker') = 'true';
  IF n <> 0 THEN RAISE EXCEPTION 'cc-0090 A2: % cc-0090 view(s) are security_invoker', n; END IF;
  -- A3: grant state = exactly 14 ice_ro SELECTs, and ZERO write privileges anywhere.
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE grantee = 'ice_readonly' AND table_schema = 'ice_ro' AND privilege_type = 'SELECT';
  IF n <> 14 THEN RAISE EXCEPTION 'cc-0090 A3: expected exactly 14 ice_ro SELECT grants, got %', n; END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE grantee = 'ice_readonly'
     AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
  IF n <> 0 THEN RAISE EXCEPTION 'cc-0090 A3: ice_readonly holds % write privilege(s)', n; END IF;
  -- A4: confinement unchanged - still NO m/c USAGE, still no role memberships.
  IF has_schema_privilege('ice_readonly', 'm', 'USAGE') THEN RAISE EXCEPTION 'cc-0090 A4: m USAGE leaked'; END IF;
  IF has_schema_privilege('ice_readonly', 'c', 'USAGE') THEN RAISE EXCEPTION 'cc-0090 A4: c USAGE leaked'; END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members am JOIN pg_roles r ON r.oid = am.member
             WHERE r.rolname = 'ice_readonly') THEN
    RAISE EXCEPTION 'cc-0090 A4: ice_readonly gained a role membership';
  END IF;
  -- A5: secret-free exposure - no withheld column name leaked into any cc-0090 view.
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema = 'ice_ro' AND table_name LIKE 'asset_graduation_%'
     AND column_name IN ('asset_url','asset_meta','notes','asset_name',
                         'source_url','license_url','licence_url','storage_path',
                         'author','photographer','creator','pk_exception');
  IF n <> 0 THEN RAISE EXCEPTION 'cc-0090 A5: % withheld column name(s) exposed', n; END IF;
  RAISE NOTICE 'cc-0090 ok: 4 graduation views live, ice_readonly confined, exposure clean.';
END $assert$;
```

### 2.2 Assertion / STOP register (declared control set → executable enforcement site)

Every declared control in this packet, mapped to where it is enforced. Baselines are **pinned
literal constants** (10 views / 10 grants pre, 14/14 post), not in-transaction snapshots — a
deliberate choice: the pre-image is a known, PK-proven fixed state (G-RO v2), so a hardcoded
baseline is stronger than a captured one (a snapshot would blindly bless whatever state it found;
the literal refuses an unexpected state outright at P2/P3).

| Control id | Declared control | Executable enforcement site |
|---|---|---|
| P1 | R0 substrate exists (schema `ice_ro` + role `ice_readonly`) | forward §2.1 Section 0 `DO $pre$`, `RAISE EXCEPTION 'ABORT cc-0090 P1…'` |
| P2 | pre-apply baseline: exactly 10 `ice_ro` views | same block, `RAISE … P2` (pinned literal 10) |
| P3 | pre-apply baseline: exactly 10 `ice_ro` SELECT grants to `ice_readonly` | same block, `RAISE … P3` (pinned literal 10) |
| P4 | no cc-0090 view name pre-exists (CREATE, never REPLACE) | same block, `RAISE … P4` |
| P5 | confinement intact pre-apply (no m/c USAGE) | same block, `RAISE … P5` |
| A1 | post-apply: exactly 14 `ice_ro` views | forward Section C `DO $assert$`, `RAISE … A1` (pinned literal 14) |
| A2 | no cc-0090 view is `security_invoker` | same block, `RAISE … A2` |
| A3 | exactly 14 SELECT grants; zero write privileges for `ice_readonly` | same block, `RAISE … A3` |
| A4 | confinement unchanged post-apply (no m/c USAGE, no memberships) | same block, `RAISE … A4` |
| A5 | secret-free exposure: no withheld column name in any cc-0090 view | same block, `RAISE … A5` |
| R-pre | rollback refuses foreign state (all 4 views must exist) | rollback §5 `DO $pre$`, `RAISE EXCEPTION 'ABORT cc-0090 rollback…'` |
| R-drop | fail-loud drops (no `IF EXISTS`, no `CASCADE`) | rollback §5, the four bare `DROP VIEW` statements |
| R-post | pre-image restored (10 views / 10 grants / confinement) | rollback §5 `DO $post$`, `RAISE … rollback post` |
| STOP-1…7 | operator-sequence STOPs (hash pin · pre-check · single-call apply · post-verify · R0 proof · advisors · PK accept) | §6 table — STOPs 2–4 are backed by the executable P/A blocks above; STOPs 1, 5, 6, 7 are operator/PK-owned steps **outside SQL reach** (hashing, `db-read.py` on the PK machine, `get_advisors`, PK judgment) and are named as such, not claimed as SQL-enforced |

Atomicity makes the register enforceable: all P/A controls run in the **same single transaction**
as the DDL (one `apply_migration` call), so any `RAISE` aborts the entire apply — there is no
branch in which a failed assertion leaves the DDL behind.

### 2.3 Atomicity + channel (named)

- **Channel:** ONE `mcp__Supabase__apply_migration` call (PK-run), name
  `cc_0090_asset_graduation_read_model_v1`. `apply_migration` executes the file in a single
  transaction, so every precondition, CREATE, GRANT, and assertion above either all commit or all
  roll back — there is no partial-apply state. It also records the migration in the ledger
  (cc-0087 reconciliation discipline: migrations go through the ledger, not raw `execute_sql`).
- **No pooled multi-call composition exists in this apply** — one call, one file, one transaction.

## 3. Exposure map — what is exposed, what is withheld, and why

Per the G-RO v2 exposure rule (SAFE + IDENTIFIER columns only; freeform/jsonb/URL/actor columns →
R1 `execute_sql`):

| Class | Disposition |
|---|---|
| ids, slugs, enums, booleans, timestamps, counts, dimensions | **exposed** (fence + reachability truth: `is_active`, `approved_is_true`, `production_use_allowed`, `approval_status`, `governance_scope`, pool-policy booleans, geo vocabulary) |
| `sha256`, `mime`, `bucket`, `licence_name`, `licence_expires_at`, `commercial_use_permitted`, `provider`, `provider_asset_id` | **exposed** — scalar identity/licence facts the graduation checks (C6/C9-class, provenance completeness) need; precedent: `music_governance_status` already exposes `sha256`/`mime`/`source`/licence-adjacent scalars |
| `asset_url`, `source_url`, `license_url` | **withheld** → `has_source_url` / `has_licence_url` presence booleans (URL discipline). Byte/URL truth (C1/C2) is out-of-band by contract design anyway |
| `author`/`photographer`/`creator`, `pk_exception` text | **withheld** → `has_author` / `has_pk_exception` presence booleans (freeform/person-name discipline) |
| full `asset_meta` jsonb, `notes`, `asset_name`, `use_case_tags`, `tone_tags` | **withheld** (jsonb/freeform discipline) |

Asserted mechanically by post-assertion **A5**.

**Known consequence (open question Q2, §11):** the Slice-1 evaluator's rights check currently reads
the actual `source_url` string. Serving it presence-booleans requires either (a) an evaluator/read-
pack-v2 adaptation accepting presence as sufficient for the *mechanical* completeness check, or
(b) keeping the URL fields on the R1 path for the rights check only. That is a `policy_decision`
for PK, not a defect in this DDL — the view layer must not leak URLs just to avoid the question.

## 4. RLS / exposure posture (static reasoning — live confirmation is a named handoff, §10)

- **Catalog shape verified this session** via read-only `list_tables` (project `mbkmaxqhsohbtwsqolns`):
  every column referenced by the four views exists with the expected type on `c.client_brand_asset`,
  `c.shared_creative_asset` (incl. `purpose_bound`, `vertical_key`, `allowed_clients`,
  `excluded_clients`), `c.client_asset_pool_policy`, `c.geo_class`, `c.client`. `asset_meta` JSON
  **keys** are runtime data and cannot be catalog-verified — the extraction expressions are
  NULL-safe by construction, so an absent key yields NULL, never an error.
- **RLS state observed (pre-existing, NOT changed here):** `c.shared_creative_asset`,
  `c.client_asset_pool_policy`, `c.geo_class` have RLS **enabled**; `c.client_brand_asset` and
  `c.client` have RLS **disabled** (part of the standing 34-table `rls_disabled` advisory — a
  pre-existing security-debt arc, out of this lane's scope, named for the record).
- **Why owner-rights views are correct here:** identical posture to the 10 proven R0 views — the
  executor (postgres) owns the base tables (`force_rls=false`), so the views return all rows for
  cross-client operator monitoring without per-table policies; `ice_readonly`'s confinement (USAGE
  on `ice_ro` ONLY, never m/c) is the load-bearing control and is asserted unchanged (P5/A4).
- **PostgREST:** `ice_ro` is not an exposed schema; the views must NOT become REST-reachable
  (PGRST106 expected on any REST probe). Live confirmation → §10.
- **No new principal, no writer function, no SECURITY DEFINER object, no search_path surface** — the
  migration creates only plain views and one SELECT grant.

## 5. Rollback — authored now, before any apply

Executable body embedded verbatim. On PK approval it is cut byte-identically to
`supabase/migrations/ROLLBACK_20260730230000_cc_0090_asset_graduation_read_model_v1.sql`
(house `ROLLBACK_*` convention — NOT itself a migration; applied as ONE `execute_sql` call).

```sql
-- ROLLBACK_20260730230000_cc_0090_asset_graduation_read_model_v1.sql
-- Reverses EXACTLY the four objects the forward migration created. Nothing else.
-- ONE execute_sql call; single transaction; fail-closed both directions.

DO $pre$
DECLARE n int;
BEGIN
  -- Refuse a state this rollback did not come from: all four cc-0090 views must exist.
  SELECT count(*) INTO n FROM pg_class k JOIN pg_namespace ns ON ns.oid = k.relnamespace
   WHERE ns.nspname = 'ice_ro' AND k.relkind = 'v'
     AND k.relname IN ('asset_graduation_client_candidate_status',
                       'asset_graduation_shared_candidate_status',
                       'asset_graduation_pool_policy',
                       'asset_graduation_geo_class');
  IF n <> 4 THEN
    RAISE EXCEPTION 'ABORT cc-0090 rollback: expected the 4 cc-0090 views, found % - state is not this lane''s, STOP', n;
  END IF;
END $pre$;

-- No IF EXISTS, no CASCADE: fail loud on anything unexpected (a dependent object appearing
-- on these views would be exactly the kind of surprise that must STOP the rollback).
DROP VIEW ice_ro.asset_graduation_client_candidate_status;
DROP VIEW ice_ro.asset_graduation_shared_candidate_status;
DROP VIEW ice_ro.asset_graduation_pool_policy;
DROP VIEW ice_ro.asset_graduation_geo_class;

DO $post$
DECLARE n int;
BEGIN
  -- Pre-image restored: exactly the 10 R0 views, exactly 10 SELECT grants, confinement intact.
  SELECT count(*) INTO n FROM pg_class k JOIN pg_namespace ns ON ns.oid = k.relnamespace
   WHERE ns.nspname = 'ice_ro' AND k.relkind = 'v';
  IF n <> 10 THEN RAISE EXCEPTION 'cc-0090 rollback post: expected 10 ice_ro views, found %', n; END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE grantee = 'ice_readonly' AND table_schema = 'ice_ro' AND privilege_type = 'SELECT';
  IF n <> 10 THEN RAISE EXCEPTION 'cc-0090 rollback post: expected 10 ice_ro SELECT grants, found %', n; END IF;
  IF has_schema_privilege('ice_readonly', 'm', 'USAGE')
     OR has_schema_privilege('ice_readonly', 'c', 'USAGE') THEN
    RAISE EXCEPTION 'cc-0090 rollback post: m/c USAGE present - NOT the pre-image';
  END IF;
  RAISE NOTICE 'cc-0090 rollback ok: pre-image restored (10 R0 views, 10 grants, confinement intact).';
END $post$;
```

**Apply/rollback identity:** the forward creates exactly 4 named views + their SELECT grants
(revoked implicitly by `DROP VIEW`); the rollback drops exactly the same 4 names, listed
identically, and proves the numeric pre-image (10 views / 10 grants) that forward preconditions
P2/P3 pinned. The pre-image is **structural** (object existence + grant counts), not row data —
this lane writes no rows, so no data pre-image capture is required.

**Migration-ledger note (PK):** rolling back leaves
`cc_0090_asset_graduation_read_model_v1` recorded in the migration ledger with its objects gone —
the standing cc-0087 ledger-reconciliation discipline covers recording that divergence; a
re-attempt gets a NEW timestamp + name, never a reused identity.

## 6. Ordered apply sequence + non-removable STOPs

| # | Step | STOP condition (any → void the remainder, fresh PK gate to resume) |
|---|---|---|
| 1 | Re-hash this packet and the extracted forward/rollback SQL against the values frozen at Gate 2 | any hash mismatch (packet moved after review) |
| 2 | Pre-check (read-only): `SELECT count(*) FROM pg_class k JOIN pg_namespace ns ON ns.oid=k.relnamespace WHERE ns.nspname='ice_ro' AND k.relkind='v'` = **10**; ice_readonly ice_ro SELECT grants = **10**; no m/c USAGE | any other value ⇒ unknown concurrent state, re-cut the packet |
| 3 | Apply: **ONE** `apply_migration` call, name `cc_0090_asset_graduation_read_model_v1`, body = §2.1 verbatim | any `ABORT`/exception — all preconditions and assertions are executable `RAISE`s and the whole transaction self-rolls-back |
| 4 | Post-apply verify (read-only): re-run step-2 counts (expect **14/14**), plus one SELECT from each new view returns without error | any assertion failure ⇒ run §5 rollback |
| 5 | R0-path proof (PK machine — this container has no DSN): `python scripts/db-read.py "SELECT client_slug, policy_row_exists, pool_policy FROM ice_ro.asset_graduation_pool_policy"` succeeds **zero-prompt**; then a deliberate write attempt through the same path still fails `42501` | zero-prompt read fails, or the write probe does NOT fail ⇒ run §5 rollback |
| 6 | `get_advisors` (security) re-run: no NEW advisory attributable to the four views | new attributable advisory ⇒ surface to PK before proceeding |
| 7 | PK accepts; register pointer + result doc cut per Convention 1 | — |

**Rollback at any point after step 3:** §5, one `execute_sql` call, self-refusing on foreign state.

## 7. Blast radius / what is NOT touched

- **Zero rows written or read-modified** — DDL is CREATE VIEW + GRANT SELECT only.
- **Production content path untouched:** `resolve_slot_assets`, `select_template`, all workers,
  all templates, all fences, all pools — byte-unchanged. No render, publish, or selection behaviour
  can change: nothing in production reads `ice_ro`.
- **Existing R0 surface untouched:** the 10 proven views are not altered, re-created, or re-granted.
- **`ice_readonly` role attributes untouched:** no password, timeout, or login change; kill switch
  (`ALTER ROLE ice_readonly NOLOGIN`) still kills the whole path including these views.
- **Slice-1 artifacts untouched:** evaluator, tests, read pack — byte-identical
  (`ddd0bfeb…` / `d3f21871…` / `16f8f4dd…`).
- **No RLS policy, no REVOKE, no function, no trigger, no extension, no secret.**

## 8. Zero-production-authority statement

These views **observe**; they cannot **decide**. They grant no graduation, flip no fence, feed no
production caller, and do not satisfy O-4's condition for unattended graduation by themselves —
O-3's "no auto-graduation carve-out" stands. Any future lane that wants automation on top of this
read model starts at its own Gate 1. A clean read from these views is not an approval of anything.

## 9. Evidence recorded this session (2026-07-30, overnight autonomous)

| Check | Result |
|---|---|
| Hermetic evaluator suite (`node .claude/helpers/asset-graduation-check.test.mjs`) | **85 / 85 pass** (matches the Slice-1 baseline; this lane changes none of those files) |
| Catalog shape (read-only `list_tables`, schema `c`) | all referenced columns confirmed present with expected types; RLS states as recorded in §4 |
| Forward SQL static discipline | DDL additive only: 4 CREATE VIEW + 1 GRANT SELECT; zero DML tokens; zero DROP/ALTER/REVOKE in forward; no `CREATE OR REPLACE` |
| `apply-harness-auditor` (registered SHADOW helper) on this packet | see §9.1 — **shadow mode: its verdict clears nothing** |
| Slice-1 base | commit `09eae15` (v6.86), clean tree, branch `claude/creatomate-global-progress-r0vbuf` |

### 9.1 apply-harness-auditor shadow record (both runs, verbatim verdicts)

Run: `node .claude/helpers/apply-harness-auditor.mjs docs/briefs/cc-0090-read-model-apply-packet-PROPOSED-v1.md`
**Shadow mode — the verdict clears NOTHING; findings are an author-review signal only.**

- **Run 1 (pre-register draft): `INCOMPLETE` (CCF-02 `block`), 5 findings.** The INCOMPLETE
  trigger was **AHA-10-1** (high): no declared assertion/control register. **Acted on** — §2.2 was
  added mapping every P/A/R control and STOP to its executable enforcement site. This is exactly
  the auditor's intended pre-freeze authoring loop.
- **Run 2 (current document): `CONCERNS` (CCF-02 `concerns`), 4 findings — AHA-06-1..4** (medium,
  check 6 baseline-coverage): the auditor wants an in-transaction full-table snapshot backing the
  non-regression assertions, and its parsed baseline "scopes" are extraction artifacts of this
  packet's text (`'ice_readonly'`, `'v'`, `'SELECT'`, and a code comment's `'usage'`).
- **Author disposition (disclosed, not dismissed):** this packet deliberately uses **pinned
  literal baselines** (exactly 10→14 views / 10→14 grants) instead of captured snapshots, with the
  rationale stated in §2.2 — the pre-image is a fixed, PK-proven state, and a snapshot would bless
  whatever state it happened to find, weakening P2/P3. The four findings are left enumerated for
  PK to accept or overrule at Gate 1; the SQL was **not** altered to silence the heuristic.
  Per the registered charter, a shadow CONCERNS is an author-review signal — the author reviewed,
  and this is the review.

## 10. Named live-truth handoffs (NOT verified from this container — do not assume)

| # | Item | Owner |
|---|---|---|
| H1 | Live `ice_ro` view count is exactly 10 and grant baseline exactly 10 immediately pre-apply (P2/P3 will enforce; a pre-flight read avoids burning the apply call on a known-stale packet) | `db-rls-auditor` or PK pre-check |
| H2 | `ice_readonly` role state: LOGIN still enabled (kill switch not tripped), `default_transaction_read_only=on`, timeouts intact | `db-rls-auditor` |
| H3 | `asset_meta` key census still current (jsonb keys are runtime data; the 2026-07-30 census backs the extraction fallback chains) | `db-rls-auditor` |
| H4 | PostgREST: `ice_ro` not in the exposed-schemas list; REST probe of a new view returns PGRST106 | `db-rls-auditor` / PK |
| H5 | Post-apply `get_advisors` security pass — no new advisory attributable to the views | PK (step 6) |
| H6 | `scripts/db-read.py` zero-prompt read + `42501` write-block re-proof through the new views (this container has no DSN — cannot be pre-verified here) | PK (step 5) |

## 11. Open questions for PK (Gate 1)

1. **Q1 — cc- id + register:** confirm `cc-0090` allocation and the register version at claim time
   (this draft claims none).
2. **Q2 — URL exposure policy** (§3): presence-booleans vs raw `source_url`/`license_url` in the
   view. Booleans are drafted (strict R0 discipline); if PK prefers the rights check fully
   view-served, that is a deliberate exposure widening to rule on explicitly. `policy_decision`.
3. **Q3 — shared-gap columns:** the draft exposes `purpose_bound`/`vertical_key`/`allowed_clients`/
   `excluded_clients` now (additive, closes the read-layer half of the disclosed Slice-1 gap ahead
   of need). The contract's "not before it is needed" note argued for deferral — PK may strike
   these four columns from view 12. `policy_decision`.
4. **Q4 — tier:** T2 recommended; Convention 3's "grants → T3" reading would escalate. PK assigns.
5. **Q5 — view naming:** `asset_graduation_*` prefix (4 views) vs folding into one wide view.
   Four views keep per-table exposure rules auditable and match the R0 one-view-per-concern style.

## 12. Review chain status (nothing waived — all pending)

| Step | State |
|---|---|
| Packet drafted + rollback authored before apply | ✅ this document |
| Hermetic tests (85/85) + catalog shape | ✅ recorded §9 |
| `apply-harness-auditor` shadow pass | ✅ run (shadow — clears nothing), §9.1 |
| PK Gate 1 (tier + open questions Q1–Q5) | ⛔ **pending — first stop** |
| Freeze + hash pin (`hash-checkpoint` helper) | ⛔ pending (post-Gate-1 edits) |
| `db-rls-auditor` live pass (H1–H4) | ⛔ pending |
| `ask_chatgpt_review` pinned to the frozen hash | ⛔ pending |
| `branch-warden` | ⛔ pending |
| **PK Gate 2 — apply HARD STOP (PK-run `apply_migration`)** | ⛔ **pending** |

---

*Drafted 2026-07-30 by the overnight autonomous session under the ICE orchestration contract.
Everything above is a proposal. PK decides; this document decides nothing.*
