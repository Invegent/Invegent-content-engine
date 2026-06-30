# TMR First Template Seed — APPLY HARD-STOP PACKET CORRECTION

> **Status:** **CORRECTION — PREPARED, NOT APPLIED. HARD STOP. Requires FRESH PK apply authorization.**
> One-column client-identity fix after a failed fail-closed apply. **No migration created, no corrected
> SQL executed, no DB mutation, no seed applied.**
> **Produced:** 2026-06-30 (CE Session 3). **Type:** docs/design (apply hard-stop correction) + register.
> **CE state:** `main == origin/main == 279ecab`; register **v4.55 → v4.56** with this packet.

---

## A. Correction status

- **Old hard-stop packet hash:** `25624600c450bbf09166faae12bb7628d3c855e1912a646c53053b4eafb4429a`
  (`docs/briefs/tmr-first-template-seed-apply-hard-stop-packet.md`, v4.54) — now **STALE / DEFECTIVE
  for apply**.
- **Old authorization status:** **EXHAUSTED** — the PK authorization was scoped to that exact hash and
  must NOT be reused.
- **Old apply result:** **FAILED, fail-closed** (errored at the first statement).
- **Transaction result:** **FULL ROLLBACK** (single transactional `DO` block).
- **Registry result:** **still EMPTY** (all 8 TMR tables = 0 rows; 0 proof events) — read-only re-confirmed.
- **Correction type:** **one-column client-identity correction** (`id` → `client_id`) in the Property
  Pulse resolver only. No other change.
- **No migration created. No corrected SQL executed. No DB mutation. No seed applied.**

## B. Failure record

- `mcp__supabase__apply_migration` — **harness-denied** (as anticipated).
- `mcp__supabase__execute_sql` fallback — attempted under the (now-exhausted) PK authorization.
- **Failure:** `ERROR: 42703: column "id" does not exist`.
- **Failing statement:** `SELECT id FROM c.client WHERE client_slug = 'property-pulse'` (the
  fail-closed PP resolver).
- **Reason:** `c.client` primary key is **`client_id`**, not `id`.
- **Zero partial mutation confirmed:** the single `DO` block aborted on statement 1 → entire
  transaction rolled back → no rows inserted anywhere; read-only re-check returned all 8 TMR tables = 0.

## C. Root cause

- The v4.55 DB/RLS audit verified the **slug cardinality** (`client_slug='property-pulse'` = 1), the
  **ON CONFLICT** strategy (expression index byte-match), and the **hash** availability — but it **did
  not verify the identity (PK) column name** of `c.client`. The seed assumed `c.client.id`.
- The **fail-closed `DO` block** is what prevented any partial insert: the column error aborted the
  whole transaction before any row was written (the guard discipline did its job — nothing leaked).
- **Correct fix:**
  ```sql
  SELECT client_id INTO STRICT v_client_id
  FROM c.client
  WHERE client_slug = 'property-pulse';
  ```

## D. Corrected SQL

> **CORRECTED FINAL SQL — NOT EXECUTED — REQUIRES FRESH PK AUTHORIZATION.** Differs from the v4.54 SQL
> in **exactly one line** (the PP resolver: `SELECT id` → `SELECT client_id`). No row added/removed, no
> safety guard removed, no status changed, no proof/enabling logic changed.
>
> **Migration identity (new, distinct — old name carried the defective SQL):**
> `tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix`

```sql
DO $$
DECLARE
  v_client_id   uuid;
  v_family_id   uuid;
  v_template_id uuid;
  v_inv_hash    text;
BEGIN
  -- (1) FAIL-CLOSED Property Pulse resolution: exactly one row, else abort (CORRECTED: client_id, was id)
  SELECT client_id INTO STRICT v_client_id
  FROM c.client
  WHERE client_slug = 'property-pulse';

  -- (2) deterministic inventory hash of the sanitized capture manifest (core sha256, PG13+)
  v_inv_hash := encode(sha256(convert_to(
    'tmr-seed:v1|template:490ad9ea-7473-49e4-9d3c-e1ae8a12d790'
    || '|family:generic.real_estate.market_insight_card'
    || '|fields:Background,Scrim,CategoryBadge,Logo,Headline,Subtitle,Location,Date,Footer'
    || '|platforms:facebook,instagram,linkedin,website,youtube'
    || '|variants:market_update.v1,quote_card.v1', 'UTF8')), 'hex');

  -- family (idempotent)
  INSERT INTO c.creative_template_family
    (family_key, family_name, creative_purpose, default_variant_candidate,
     scope, industry_vertical, description, status)
  VALUES
    ('generic.real_estate.market_insight_card', 'Real Estate Market Insight Card',
     'Headline-led market/news insight card; brand-skinnable', 'market_update.v1',
     'generic', 'real_estate', 'First TMR family; classified by element truth, not provider name',
     'draft')
  ON CONFLICT (family_key) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_family_id;

  -- provider template (idempotent)
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, inventory_status, inventory_source,
     captured_by, captured_at, inventory_hash, status)
  VALUES
    ('creatomate', '490ad9ea-7473-49e4-9d3c-e1ae8a12d790', 'news_quote_insight_1x1_v1',
     v_family_id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_docs',
     'manual_sanitized_export', 'tmr-seed-apply', now(), v_inv_hash, 'inventory_captured')
  ON CONFLICT (provider, provider_template_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_template_id;

  -- field inventory (9 rows, idempotent) — required_for_render left NULL (unknown)
  INSERT INTO c.creative_provider_template_field
    (template_id, element_name, element_type, field_kind, dynamic, required_for_render, style_summary)
  SELECT v_template_id, x.element_name, x.element_type, x.field_kind, x.dynamic, NULL::boolean, x.style_summary
  FROM (VALUES
    ('Background',    'image', 'background', true,  NULL),
    ('Scrim',         'shape', 'shape',      false, 'fixed overlay, opacity 75%'),
    ('CategoryBadge', 'text',  'text',       true,  NULL),
    ('Logo',          'image', 'logo',       true,  NULL),
    ('Headline',      'text',  'text',       true,  NULL),
    ('Subtitle',      'text',  'text',       true,  NULL),
    ('Location',      'text',  'text',       true,  NULL),
    ('Date',          'text',  'text',       true,  NULL),
    ('Footer',        'text',  'text',       true,  NULL)
  ) AS x(element_name, element_type, field_kind, dynamic, style_summary)
  ON CONFLICT (template_id, element_name) DO NOTHING;

  -- platform suitability (5 rows, idempotent) — candidate/not_suitable only
  INSERT INTO c.creative_template_platform_suitability
    (template_id, platform, placement, suitability_status, reason)
  SELECT v_template_id, x.platform, 'default', x.status, x.reason
  FROM (VALUES
    ('facebook',  'candidate',    'static 1:1 fits FB feed image'),
    ('instagram', 'candidate',    '1:1 native IG feed'),
    ('linkedin',  'candidate',    '1:1 image valid in LI feed'),
    ('website',   'candidate',    '1:1 image embeddable'),
    ('youtube',   'not_suitable', 'video surface; static 1:1 not a YT video unless transformed')
  ) AS x(platform, status, reason)
  ON CONFLICT (template_id, platform, placement) DO NOTHING;

  -- variant candidates (2 rows, idempotent) — format_key NULL (no binding)
  INSERT INTO c.creative_template_variant_candidate
    (template_id, format_key, variant_key, fit_status, required_field_mapping_status, missing_fields, fit_reason)
  SELECT v_template_id, NULL, x.variant_key, x.fit_status, x.mapping_status, x.missing_fields, x.fit_reason
  FROM (VALUES
    ('market_update.v1', 'strong_candidate',    'pending',
       NULL::jsonb, 'Headline/Subtitle/Location/Date/Footer/CategoryBadge fits market insight card'),
    ('quote_card.v1',    'needs_template_edit', 'blocked_missing_fields',
       '["quote_text","attribution_source"]'::jsonb, 'no quote slot, no attribution/source slot — requires template edit')
  ) AS x(variant_key, fit_status, mapping_status, missing_fields, fit_reason)
  ON CONFLICT (template_id, variant_key) DO NOTHING;

  -- client assignment (PP, fail-closed id, idempotent) — proposed/pilot_only, NOT enabled
  INSERT INTO c.creative_template_client_assignment
    (template_id, client_id, assignment_scope, assignment_status, style_guide_reference)
  VALUES
    (v_template_id, v_client_id, 'pilot_only', 'proposed',
     'docs/creative-library/property-pulse-styleguide-v1.md')
  ON CONFLICT (template_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

  -- (3) inventory audit (append-only, run-once guard)
  INSERT INTO c.creative_template_inventory_audit
    (template_id, captured_by, capture_method, source_reference, inventory_hash, changed_fields,
     no_secret_assertion, no_mutation_assertion)
  SELECT v_template_id, 'tmr-seed-apply', 'manual_sanitized_export',
         'Session 3 intake mapping + schema migration (docs-derived)', v_inv_hash,
         '{"captured":"family,template,9 fields,5 platforms,2 variants,1 assignment"}'::jsonb,
         true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM c.creative_template_inventory_audit a
    WHERE a.template_id = v_template_id AND a.inventory_hash = v_inv_hash
  );

  -- ZERO inserts into c.creative_template_proof_event. NO production_proven. NO enablement.
END $$;
```

**Apply mechanics (unchanged from v4.54 except the resolver + new migration name):** `apply_migration`
(name `tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix`, query = the block above);
`execute_sql` fallback under fresh PK authorization if denied, then a separate PK-gated ledger backfill.
Post-apply verification = the v4.54 §7 set. Rollback = the v4.54 §6 scoped DELETEs.

## E. Diff proof

**Exactly one intended semantic change** vs the v4.54 SQL:

```diff
-  SELECT id INTO STRICT v_client_id
+  SELECT client_id INTO STRICT v_client_id
   FROM c.client
   WHERE client_slug = 'property-pulse';
```

- Old resolver used **`id`** (nonexistent column → 42703).
- New resolver uses **`client_id`** (the real PK).
- **All other hard-stop safety properties UNCHANGED:** zero proof_event rows · no verified · no
  platform_safe · no production_proven · no enablement · no binding (`format_key` NULL) · conservative
  statuses (`inventory_captured`/`captured_from_docs`/`candidate`/`not_suitable`/`proposed`/`pilot_only`/`draft`)
  · `INTO STRICT` fail-closed guard · deterministic `sha256` hash · audit run-once `WHERE NOT EXISTS` ·
  idempotent `ON CONFLICT` · same 7 target tables, same 9/5/2/1/1 row counts.

## F. Correction evidence (read-only)

| Check | Result |
|---|---|
| `c.client` primary key column | **`client_id`** |
| `c.client` has a column literally named `id` | **no** |
| `c.client` has `client_id` | **yes** (uuid) |
| Corrected resolver dry-check (`SELECT client_id … WHERE client_slug='property-pulse'`) | returns **exactly one non-null `uuid`** |
| `count(*) WHERE client_slug='property-pulse'` | **1** |
| TMR registry total rows (8 tables summed) | **0** (still empty) |
| `c.creative_template_proof_event` rows | **0** |

(Read-only `SELECT`/catalog queries only — no mutation.)

## G. External re-review on the corrected SQL

- **Tool:** `ask_chatgpt_review` (`action_type=sql_destructive`).
- **review_id:** `a8948273-3d30-4c80-8468-eb5cf4de0269`.
- **Verdict:** **`agree`** · risk **low** · confidence **high** · **pushback_points: [] (none)** ·
  unverified_claims: none · assumptions: none.
- **verified_claims:** prior failure was the `id` column; `id`→`client_id` is the only change; live
  evidence confirms `client_id` exists and `id` does not.
- **`requires_pk_escalation`: true** — escalation_reason = *"Fresh PK authorization is required for
  execution as it's a destructive action."* This is the **standard irreversible-apply escalation, NOT
  a concrete SQL defect** (per the directive, recorded honestly and not treated as a blocker).
- The prior corrected-SQL predecessor review `20d37004` is superseded for the apply input.

## H. Corrected packet hash

`corrected_hard_stop_packet_hash` = recorded in the final report after this file is written
(`shasum -a 256 docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md`). The fresh
PK authorization must reference **this** corrected packet hash, not the stale `25624600…`.

## I. Final correction verdict

**READY FOR FRESH PK APPLY AUTHORIZATION.**

The single `id` → `client_id` correction is grounded in live read-only evidence (PK = `client_id`,
`id` absent, resolver returns one uuid), all other safety properties are byte-preserved, the registry
is still empty (clean first insert), and the external re-review **agrees** with **no concrete defect**.
The only gate remaining is **fresh PK apply authorization** for the corrected packet hash (the
irreversible apply remains a PK hard stop).

**Next lane:** Fresh PK Apply Authorization for the corrected packet hash → apply
`tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix` (PK-run/authorized) → §7 post-apply
verification.

## J. Explicit non-claims / scope

Docs/register only. **No** migration file · `supabase/migrations/` change · `apply_migration` ·
`execute_sql` mutation · corrected-SQL execution · row insert/update/delete · proof event · render /
publish / deploy · `invegent-dashboard` / runtime / server-action / dashboard / CCF / `.claude` /
`_harness` edit · secret. Only **read-only** catalog/SELECT queries were run. The original hard-stop
packet (`25624600…`), the v4.55 DB/RLS audit, and the reviews are **unmodified**. **Seed NOT applied.**

## Cross-references
- Original (defective) hard-stop packet: `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet.md` (v4.54, `25624600…` — stale for apply).
- DB/RLS audit: `docs/briefs/tmr-first-template-seed-db-rls-audit.md` (v4.55, `c9f54667…`).
- External re-review (corrected SQL): `ask_chatgpt_review` `a8948273-3d30-4c80-8468-eb5cf4de0269` (agree/low/high, no defect).
- Schema source of truth: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`.
- Register: v4.56 (this correction).
