-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md §D
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- Source: docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md §D
-- Corrected FINAL SQL (differs from the defective v4.54 SQL in exactly one line: the PP resolver
-- SELECT id -> SELECT client_id). No row added/removed, no safety guard removed, no status changed.

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
