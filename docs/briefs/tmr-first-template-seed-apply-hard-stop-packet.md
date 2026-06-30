# TMR First Template Seed — PK APPLY HARD-STOP PACKET

> **Status:** **PREPARED — NOT APPLIED. HARD STOP before any DB write.** This packet specifies the
> exact seed apply and bakes in the four mandatory apply-lane checks; it does **not** run it.
> **PK explicitly approved preparing this packet and explicitly did NOT approve applying the seed.**
> **Produced:** 2026-06-30 (CE Session 3). **Type:** docs/design (apply hard-stop) + register record.
> **CE state:** `main == origin/main == 105f616`; register **v4.53 → v4.54** with this packet.
> **DB (future apply target):** prod `mbkmaxqhsohbtwsqolns`.
> **Scope locks:** first-template seed only · 7 TMR tables · ZERO proof events · nothing
> verified/platform_safe/production_proven/enabled/bound · no second template · no binding · no UI.

---

## 1. Gate trail

| Gate | Register | Verdict |
|---|---|---|
| Combined review (data-shape + security) | v4.52 | **CLEAN FOR EXTERNAL REVIEW** (`cb625af8…`); 6×PASS + 4×IMPLEMENTATION-LANE VERIFY + 1×WARNING |
| External review (design-only SQL) | v4.53 | **PARTIAL → PK-escalated** (`ask_chatgpt_review` `ab1cd393-9f9b-499b-858d-e7b0d3e16dd0`); no new concrete defect — 4 pushbacks = the apply-lane verifies |
| **PK gate** | — | **PK approved proceeding to this packet; NOT approval to apply** |
| External RE-review (FINAL hardened SQL) | v4.54 (this) | **PARTIAL → PK-escalated** (`20d37004-6020-4347-84e4-244932f862b2`); **guards verified correct**; escalates the irreversible apply to PK by design |
| db-rls-auditor (on hardened SQL) | — | **NOT YET RUN** — required pre-apply gate (DB read; deferred from this docs-only lane) |

**Review-staleness discipline (CLAUDE.md rules 1 & 4):** the v4.53 review `ab1cd393` is **STALE** — it
covered the un-hardened design SQL (packet hash `661b3d79`). The hardened apply SQL in §3 was
**re-reviewed** → `20d37004…`. **If the §3 SQL changes again, `20d37004` becomes stale and must be
re-run before apply.**

---

## 2. The four mandatory checks — how each is baked in

| # | Prior escalation (v4.52/v4.53) | Resolution in §3 SQL |
|---|---|---|
| 1 | PP `client_id` must resolve fail-closed (exactly one row) | `SELECT id INTO STRICT v_client_id FROM c.client WHERE client_slug='property-pulse'` — **aborts the whole transaction** on 0 (`NO_DATA_FOUND`) or >1 (`TOO_MANY_ROWS`). No faked UUID. |
| 2 | `inventory_hash` must be deterministic | `encode(sha256(convert_to(<fixed canonical manifest>,'UTF8')),'hex')` — reproducible from a constant manifest string (core `sha256`, PG13+). |
| 3 | Audit append-only → run-once | `INSERT … SELECT … WHERE NOT EXISTS (… template_id = v_template_id AND inventory_hash = v_inv_hash)` — re-run inserts nothing. |
| 4 | All inserts idempotent | `ON CONFLICT … DO UPDATE`/`DO NOTHING` on the real unique keys (incl. the assignment **expression** index `(template_id, coalesce(client_id,'000…'::uuid))`). |
| (carry) | Canonical `market_update` ice_format_key | `format_key` left **NULL** — confirmed only before a **future binding** lane, never in this seed. |
| (carry) | `production_proven` only via real publish | **ZERO `c.creative_template_proof_event` rows** inserted. |

---

## 3. Exact apply (PK-run — do NOT run before the gate clears)

**Migration name (new permanent identity — never reuse):**
`tmr_first_template_seed_news_quote_insight_1x1_v1`

**Apply via** `mcp__supabase__apply_migration` (project `mbkmaxqhsohbtwsqolns`), `name` above,
`query` = the block below. Single transactional `DO` block; any guard failure aborts the whole apply.

```sql
DO $$
DECLARE
  v_client_id   uuid;
  v_family_id   uuid;
  v_template_id uuid;
  v_inv_hash    text;
BEGIN
  -- (1) FAIL-CLOSED Property Pulse resolution: exactly one row, else abort (no faked UUID)
  SELECT id INTO STRICT v_client_id
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

**execute_sql fallback:** if `apply_migration` is harness-denied, apply the identical block via
`execute_sql` under explicit PK authorization, then schedule a **separate PK-gated ledger backfill** so
`supabase_migrations.schema_migrations` records `tmr_first_template_seed_news_quote_insight_1x1_v1`
once (same pattern as prior TMR applies).

---

## 4. Remaining pre-apply gates (must clear BEFORE the PK apply)

1. **db-rls-auditor on the §3 hardened SQL** — **NOT YET RUN** (DB read; deferred from this docs-only
   lane). Must confirm: schema-`c` grants unchanged, no RLS change, no PGRST106 surface, the `c.client`
   read is sound under the definer/service-role context, `get_advisors(security)` no new finding.
2. **External RE-review currency** — `20d37004…` covers the §3 SQL. If §3 changes, re-run.
3. **`sha256()` core availability** — confirm `sha256(bytea)` exists in the target PG (PG13+ expected).
   **Fallback** if absent: `pgcrypto` `digest(…, 'sha256')`, or compute the manifest hash in the apply
   tooling and pass it as a literal (do NOT change the manifest string — determinism depends on it).
4. **Registry-empty precheck** — confirm the registry is still empty (or at least that
   `490ad9ea…` is absent) so this is genuinely the first seed; the SQL is idempotent regardless.

---

## 5. Preconditions (verify at apply time)

- CE `main == origin/main` and clean; register at v4.54 (or later with this packet recorded).
- Schema migration hash `f6733fa7…` and read-RPC hash `88efec0c…` unchanged.
- `c.client` has a single `client_slug='property-pulse'` row (else the INTO STRICT guard aborts — by design).
- No `c.creative_template_proof_event` row will be created.

## 6. Rollback (reference — PK-run if needed)

Additive rows in a (previously empty) registry — fully reversible, touches no external/operational
table:

```sql
-- reverse dependency order; scoped to the seeded template + family
DELETE FROM c.creative_template_inventory_audit       WHERE template_id IN (SELECT id FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id='490ad9ea-7473-49e4-9d3c-e1ae8a12d790');
DELETE FROM c.creative_template_client_assignment     WHERE template_id IN (SELECT id FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id='490ad9ea-7473-49e4-9d3c-e1ae8a12d790');
DELETE FROM c.creative_template_variant_candidate     WHERE template_id IN (SELECT id FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id='490ad9ea-7473-49e4-9d3c-e1ae8a12d790');
DELETE FROM c.creative_template_platform_suitability  WHERE template_id IN (SELECT id FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id='490ad9ea-7473-49e4-9d3c-e1ae8a12d790');
DELETE FROM c.creative_provider_template_field        WHERE template_id IN (SELECT id FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id='490ad9ea-7473-49e4-9d3c-e1ae8a12d790');
DELETE FROM c.creative_provider_template               WHERE provider='creatomate' AND provider_template_id='490ad9ea-7473-49e4-9d3c-e1ae8a12d790';
DELETE FROM c.creative_template_family                 WHERE family_key='generic.real_estate.market_insight_card'
  AND NOT EXISTS (SELECT 1 FROM c.creative_provider_template t WHERE t.family_id = c.creative_template_family.id);
```

## 7. Post-apply verification (run only after a PK-authorised apply)

- **Rows present:** 1 family · 1 provider_template (`status='inventory_captured'`,
  `inventory_status='captured_from_docs'`, `inventory_hash` non-null) · 9 fields · 5 suitability ·
  2 variants · 1 assignment (`proposed`/`pilot_only`, `client_id` = the resolved PP id) · 1 audit.
- **Zero proof events** for the template.
- **No `production_proven`** anywhere; no suitability `platform_safe`.
- **Dashboard `/create/templates`** shows exactly **one row**, `lifecycle_rollup=needs_template_edit`,
  `blocker_summary=[needs_template_edit,no_render_proof,no_publish_proof]`, `proof_summary=[]`; detail
  drawer shows fields/platforms/variants/assignment/audit, `proof_events:[]`.
- **Secret scan** of the live `get_tmr_template_detail` payload = clean (no tokens/secrets/raw payload).
- **Ledger** records the migration once (or schedule the backfill if `execute_sql` fallback used).

## 8. PK hard-stop

The orchestrator prepared this packet and **stops**. The apply is a HARD STOP: PK clears the
db-rls-auditor re-run + sha256 confirmation, then PK runs/authorises the apply. **This packet is not
authorisation to apply.**

## 9. Final packet verdict

**READY FOR PK APPLY HARD-STOP — pending (a) db-rls-auditor re-run on the §3 hardened SQL and
(b) PK apply authorisation.** The hardened SQL bakes in all four mandatory checks; the external
re-review (`20d37004…`) **verified the guards are correct** and escalated the *irreversible apply* to
PK (the designed hard stop) — it raised **no new concrete defect**. The only open items are the named
pre-apply gates (§4), which are exactly what the hard stop holds.

## 10. Explicit non-claims / scope

Docs/register only. **No** migration file written to `supabase/migrations/` · **no** `execute_sql` ·
**no** `apply_migration` · **no** DB query / DB mutation · **no** seed / row insert · **no** proof
event · **nothing** verified / `platform_safe` / `production_proven` / enabled / bound · **no**
provider / Creatomate call · **no** render / publish / deploy · **no** `invegent-dashboard` / runtime /
server-action / dashboard / CCF / `.claude` / `_harness` edit · **no** secret. The seed is **NOT
applied**. Reviewed packet (`661b3d79…`) and combined review (`cb625af8…`) unmodified.

## Cross-references
- Seed packet (data): `docs/briefs/tmr-first-template-seed-packet-draft.md` (v4.51, `661b3d79…`).
- Combined review: `docs/briefs/tmr-first-template-seed-packet-combined-review.md` (v4.52, `cb625af8…`).
- External review (design SQL): `docs/briefs/tmr-first-template-seed-packet-external-review.md` (v4.53, `ab1cd393…`).
- Schema / read RPC: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- External RE-review (hardened SQL): `ask_chatgpt_review` `20d37004-6020-4347-84e4-244932f862b2`.
- Register: v4.54 (this packet).
