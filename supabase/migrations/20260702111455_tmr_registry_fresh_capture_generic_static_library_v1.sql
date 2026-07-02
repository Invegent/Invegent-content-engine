-- TMR registry fresh capture — generic static template library v1
-- Source of truth: Creatomate account (7 live saved templates). PK-authorized fresh start.
-- Read-only capture (provider_read_endpoint); this migration is the only mutation. No secrets stored.
BEGIN;

-- 1) FRESH START: remove all existing TMR registry rows (Creatomate is truth)
DELETE FROM c.creative_template_proof_event;
DELETE FROM c.creative_template_platform_suitability;
DELETE FROM c.creative_template_variant_candidate;
DELETE FROM c.creative_provider_template_field;
DELETE FROM c.creative_template_client_assignment;
DELETE FROM c.creative_template_inventory_audit;
DELETE FROM c.creative_provider_template;
DELETE FROM c.creative_template_family;

-- 2) Families (7)
INSERT INTO c.creative_template_family (family_key, family_name, creative_purpose, default_variant_candidate, scope, industry_vertical, description, status) VALUES
  ('generic.real_estate.market_insight_card', 'Real Estate Market Insight Card', 'Single market update or insight card; headline-led, brand-skinnable', 'market_update.v1', 'generic', 'real_estate', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.real_estate.auction_snapshot_card', 'Auction Snapshot Card', 'Auction clearance / weekly market statistic; metric-led', 'market_update.v1', 'generic', 'real_estate', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.news.quote_card', 'Quote / Pull-Quote Card', 'Quote from article, agent, customer, or market source; has quote+attribution+source slots', 'quote_card.v1', 'generic', 'news', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.stat_hero_card', 'Stat Hero Card', 'One key number with supporting explanation; solid brand background', 'stat_card.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.text_announcement_card', 'Announcement / Update Card', 'Simple announcement with a call-to-action; no metric or quote', 'announcement.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.feed_portrait_card', 'Portrait Feed Card 4:5', 'Mobile feed card with more vertical space', 'market_update.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.youtube.thumbnail_16x9', 'YouTube Thumbnail 16:9', 'Video thumbnail or cover; short bold headline + face/object slot', 'thumbnail.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft');

-- 3) Provider templates — bind live Creatomate IDs (status=smoke_rendered: production-path smoke render passed)
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '48cba556-0a53-4001-90f0-05420d10efc0', 'generic_market_insight_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v1', 'a565e711a2b710a794675849e7f529cbe5bfdea61b6bbd825488b987960cb88a', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.real_estate.market_insight_card';
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '03459d76-8af7-4e58-80dd-8c107c168002', 'generic_auction_snapshot_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v1', '6396dafe762d1542ed00f8be3678cd0f2c0f52fda0c8c49c07046b24b64f9389', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.real_estate.auction_snapshot_card';
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '2140ca19-d075-49d3-9dc9-30d924805e22', 'generic_quote_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v1', '688c499f2b648d4689e0d3327bf69fc8de36bda6365fdc3413aa3237fac42eef', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.news.quote_card';
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '54b305c8-c92e-4978-8673-6fa4e5983fde', 'generic_stat_hero_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v1', 'c8c3ba217db8f86d2b041bff8144831ca87f1b7e4426241cf5c50a53fc3eb5ad', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.stat_hero_card';
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', 'a75e7139-1eec-4bba-a8c1-40b8e07b2b0e', 'generic_announcement_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v1', '057ab422cd8a2686e593879dfddd292935d34cd971be853aea23111bb07f2cf6', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.text_announcement_card';
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '05c37472-c3e2-4831-bbe6-fc366fcbaa83', 'generic_portrait_feed_card_4x5_v1', f.id, 'generic', 1080, 1350, '4:5', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v1', '7129ae3ab8bba1a5917999d980b4b3696ef5639a4c685013feb92aa8327f26be', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.feed_portrait_card';
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', 'ca5b1509-8866-4ade-be5d-d37ee54599e3', 'generic_youtube_thumbnail_16x9_v1', f.id, 'generic', 1280, 720, '16:9', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v1', 'b077c2a567c07807ea7fb514ecfa8cb21b45934d71585dd8e44cbab07ecc328d', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.youtube.thumbnail_16x9';

-- 4) Provider template fields (per element; dynamic = modification slot)
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('513233c6-5c12-4b6b-9426-800b739d63ab', 'Logo', 'image', '3', true, 'logo', '', false),
    ('CategoryBadge', 'CategoryBadge', 'text', '4', true, 'text', 'CATEGORY', false),
    ('Headline', 'Headline', 'text', '5', true, 'text', 'Headline goes here in up to two lines', true),
    ('Subtitle', 'Subtitle', 'text', '6', true, 'text', 'Supporting subtitle adds context in one or two clear lines', false),
    ('Location', 'Location', 'text', '7', true, 'text', 'Location', false),
    ('Date', 'Date', 'text', '8', true, 'text', 'Date', false),
    ('Footer', 'Footer', 'text', '9', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='48cba556-0a53-4001-90f0-05420d10efc0';
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('Headline', 'Headline', 'text', '4', true, 'text', 'Headline goes here', true),
    ('MetricValue', 'MetricValue', 'text', '5', true, 'text', '00%', true),
    ('MetricLabel', 'MetricLabel', 'text', '6', true, 'text', 'Metric label', false),
    ('Subtitle', 'Subtitle', 'text', '7', true, 'text', 'Short supporting line for the auction result', false),
    ('Location', 'Location', 'text', '8', true, 'text', 'Location', false),
    ('Date', 'Date', 'text', '9', true, 'text', 'Date', false),
    ('Footer', 'Footer', 'text', '10', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='03459d76-8af7-4e58-80dd-8c107c168002';
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('QuoteMark', 'QuoteMark', 'text', '4', false, 'text', '“', false),
    ('QuoteText', 'QuoteText', 'text', '5', true, 'text', 'Quote text goes here with a clear attribution below', true),
    ('Attribution', 'Attribution', 'text', '6', true, 'text', 'Attribution name, role', false),
    ('SourceLabel', 'SourceLabel', 'text', '7', true, 'text', 'Source label', false),
    ('d306d254-aa5d-47a9-917a-c499d04d88c5', 'Footer', 'text', '8', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='2140ca19-d075-49d3-9dc9-30d924805e22';
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('6c859365-31cc-4871-8558-bdd10e6100be', 'BackgroundSolid', 'shape', '1', false, 'background', NULL, false),
    ('7b97a9ca-6fae-4da7-ab60-8b924a0e97e9', 'Logo', 'image', '2', true, 'logo', '', false),
    ('Headline', 'Headline', 'text', '3', true, 'text', 'Headline goes here', true),
    ('MetricValue', 'MetricValue', 'text', '4', true, 'text', '$0.0M', true),
    ('MetricLabel', 'MetricLabel', 'text', '5', true, 'text', 'Metric label', false),
    ('Subtitle', 'Subtitle', 'text', '6', true, 'text', 'One line of supporting explanation for the stat', false),
    ('SourceLabel', 'SourceLabel', 'text', '7', true, 'text', 'Source', false),
    ('Date', 'Date', 'text', '8', true, 'text', 'Date', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='54b305c8-c92e-4978-8673-6fa4e5983fde';
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('Headline', 'Headline', 'text', '4', true, 'text', 'Announcement headline here', true),
    ('a99926eb-7117-4d01-bdee-0fe4770e7819', 'Subtitle', 'text', '5', true, 'text', 'One or two lines of supporting detail for the announcement', false),
    ('CTA', 'CTA', 'text', '6', true, 'text', 'Call to action', false),
    ('Footer', 'Footer', 'text', '7', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='a75e7139-1eec-4bba-a8c1-40b8e07b2b0e';
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('CategoryBadge', 'CategoryBadge', 'text', '4', true, 'text', 'PROPERTY NEWS', false),
    ('Headline', 'Headline', 'text', '5', true, 'text', 'Headline goes here for the feed card', true),
    ('Subtitle', 'Subtitle', 'text', '6', true, 'text', 'Supporting subtitle with a little extra room in the taller 4:5 feed format', false),
    ('CTA', 'CTA', 'text', '7', true, 'text', 'Call to action', false),
    ('Footer', 'Footer', 'text', '8', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='05c37472-c3e2-4831-bbe6-fc366fcbaa83';
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('FaceObject', 'FaceObject', 'image', '2', true, 'image', '', false),
    ('Scrim', 'Scrim', 'shape', '3', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '4', true, 'logo', '', false),
    ('CategoryBadge', 'CategoryBadge', 'text', '5', true, 'text', 'MARKET NEWS', false),
    ('Headline', 'Headline', 'text', '6', true, 'text', 'SHORT PUNCHY HEADLINE', true),
    ('EpisodeNumber', 'EpisodeNumber', 'text', '7', true, 'text', 'EP. 00', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='ca5b1509-8866-4ade-be5d-d37ee54599e3';

-- 5) Variant candidates (purpose-built fit = strong_candidate; quote_card now has real quote+attribution slots)
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'market_update.v1', 'strong_candidate', 'Purpose-built market_update.v1 template; element set matches the variant''s required fields', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='48cba556-0a53-4001-90f0-05420d10efc0';
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'market_update.v1', 'strong_candidate', 'Purpose-built market_update.v1 template; element set matches the variant''s required fields', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='03459d76-8af7-4e58-80dd-8c107c168002';
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'quote_card.v1', 'strong_candidate', 'Genuine quote card: has QuoteText + Attribution + SourceLabel slots (resolves the prior news_quote_insight_1x1_v1 unsuitable gap)', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='2140ca19-d075-49d3-9dc9-30d924805e22';
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'stat_card.v1', 'strong_candidate', 'Purpose-built stat_card.v1 template; element set matches the variant''s required fields', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='54b305c8-c92e-4978-8673-6fa4e5983fde';
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'announcement.v1', 'strong_candidate', 'Purpose-built announcement.v1 template; element set matches the variant''s required fields', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='a75e7139-1eec-4bba-a8c1-40b8e07b2b0e';
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'market_update.v1', 'strong_candidate', 'Purpose-built market_update.v1 template; element set matches the variant''s required fields', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='05c37472-c3e2-4831-bbe6-fc366fcbaa83';
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'thumbnail.v1', 'strong_candidate', 'Purpose-built thumbnail.v1 template; element set matches the variant''s required fields', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='ca5b1509-8866-4ade-be5d-d37ee54599e3';

-- 6) Platform suitability (candidate for best platforms per workbook)
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='48cba556-0a53-4001-90f0-05420d10efc0';
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='03459d76-8af7-4e58-80dd-8c107c168002';
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='2140ca19-d075-49d3-9dc9-30d924805e22';
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='54b305c8-c92e-4978-8673-6fa4e5983fde';
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='a75e7139-1eec-4bba-a8c1-40b8e07b2b0e';
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='05c37472-c3e2-4831-bbe6-fc366fcbaa83';
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('youtube', 'thumbnail', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='ca5b1509-8866-4ade-be5d-d37ee54599e3';

-- 7) Proof events: smoke_render PASSED (production-path template_id+modifications render)
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:d455a6ed-84a4-40e3-85b0-049cd8cd8fca', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v1'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='48cba556-0a53-4001-90f0-05420d10efc0';
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:89efef06-bc36-46eb-8d1a-70dff1c1106a', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v1'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='03459d76-8af7-4e58-80dd-8c107c168002';
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:6a5ca77e-0ccc-41df-993b-06fae6d5647e', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v1'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='2140ca19-d075-49d3-9dc9-30d924805e22';
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:eda4ee24-ddf8-45d1-9ef0-0e3ae051c341', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v1'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='54b305c8-c92e-4978-8673-6fa4e5983fde';
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:c353dd3b-3d21-4ef2-bbdd-192274514186', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v1'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='a75e7139-1eec-4bba-a8c1-40b8e07b2b0e';
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:7ec6e6e4-8b60-4b9a-93ca-13d269421824', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v1'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='05c37472-c3e2-4831-bbe6-fc366fcbaa83';
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:b2cd99d4-8729-4305-96fb-a232673b3c96', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v1'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='ca5b1509-8866-4ade-be5d-d37ee54599e3';

-- 8) Inventory audit (read-only capture assertions)
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v1', 'provider_read_endpoint', 'creatomate GET /v1/templates/48cba556-0a53-4001-90f0-05420d10efc0', 'a565e711a2b710a794675849e7f529cbe5bfdea61b6bbd825488b987960cb88a', 'captured_fresh_start', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='48cba556-0a53-4001-90f0-05420d10efc0';
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v1', 'provider_read_endpoint', 'creatomate GET /v1/templates/03459d76-8af7-4e58-80dd-8c107c168002', '6396dafe762d1542ed00f8be3678cd0f2c0f52fda0c8c49c07046b24b64f9389', 'captured_fresh_start', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='03459d76-8af7-4e58-80dd-8c107c168002';
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v1', 'provider_read_endpoint', 'creatomate GET /v1/templates/2140ca19-d075-49d3-9dc9-30d924805e22', '688c499f2b648d4689e0d3327bf69fc8de36bda6365fdc3413aa3237fac42eef', 'captured_fresh_start', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='2140ca19-d075-49d3-9dc9-30d924805e22';
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v1', 'provider_read_endpoint', 'creatomate GET /v1/templates/54b305c8-c92e-4978-8673-6fa4e5983fde', 'c8c3ba217db8f86d2b041bff8144831ca87f1b7e4426241cf5c50a53fc3eb5ad', 'captured_fresh_start', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='54b305c8-c92e-4978-8673-6fa4e5983fde';
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v1', 'provider_read_endpoint', 'creatomate GET /v1/templates/a75e7139-1eec-4bba-a8c1-40b8e07b2b0e', '057ab422cd8a2686e593879dfddd292935d34cd971be853aea23111bb07f2cf6', 'captured_fresh_start', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='a75e7139-1eec-4bba-a8c1-40b8e07b2b0e';
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v1', 'provider_read_endpoint', 'creatomate GET /v1/templates/05c37472-c3e2-4831-bbe6-fc366fcbaa83', '7129ae3ab8bba1a5917999d980b4b3696ef5639a4c685013feb92aa8327f26be', 'captured_fresh_start', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='05c37472-c3e2-4831-bbe6-fc366fcbaa83';
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v1', 'provider_read_endpoint', 'creatomate GET /v1/templates/ca5b1509-8866-4ade-be5d-d37ee54599e3', 'b077c2a567c07807ea7fb514ecfa8cb21b45934d71585dd8e44cbab07ecc328d', 'captured_fresh_start', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='ca5b1509-8866-4ade-be5d-d37ee54599e3';

COMMIT;