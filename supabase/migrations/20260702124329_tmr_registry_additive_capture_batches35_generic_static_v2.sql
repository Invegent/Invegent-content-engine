-- TMR registry additive capture v2 — generic static library batches 3-5 (9 templates)
-- Source of truth: Creatomate live templates. ADDITIVE (no deletes); idempotent (ON CONFLICT / NOT EXISTS).
BEGIN;

-- 1) Families (9 new)
INSERT INTO c.creative_template_family (family_key, family_name, creative_purpose, default_variant_candidate, scope, industry_vertical, description, status) VALUES
  ('generic.square_news_card', 'News Summary Card', 'Summarise a news story with category, location, date and source', 'news_summary.v1', 'generic', 'news', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.listicle_card', 'Listicle / Tips Card', 'Top-3 tips / checklist / educational post', 'educational.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.before_after_card', 'Before/After Comparison', 'Compare two states, metrics or visuals', 'comparison.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.testimonial_card', 'Testimonial Card', 'Customer quote / testimonial with rating', 'testimonial.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.carousel.cover', 'Carousel Cover Slide', 'Opening slide of a multi-slide carousel', 'carousel_cover.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.carousel.body', 'Carousel Body Slide', 'Instructional / list / explanation slide', 'carousel_body.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.carousel.closing', 'Carousel Closing / CTA Slide', 'Final slide with CTA / next step', 'carousel_closing.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.story_static_card', 'Story Static Card 9:16', 'Vertical story / reel-style static frame', 'story_static.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft'),
  ('generic.linkedin_landscape_card', 'LinkedIn Landscape Card', 'LinkedIn / Facebook link-style insight card', 'market_update.v1', 'generic', 'general', 'Captured from live Creatomate template; classified by element truth', 'draft')
ON CONFLICT (family_key) DO NOTHING;

-- 2) Provider templates (9) — bind live Creatomate IDs, status=smoke_rendered
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', 'b662f999-597b-4848-8aa9-a5b411540601', 'generic_news_summary_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', '86b134ce799cf86eea61f8dea4e2c7d8c5fc4f43c72dfa36f497b93bcd266aba', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.square_news_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '47ad6a9c-dd3e-41b5-a815-88f09b99da69', 'generic_listicle_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', 'e457506f17b831472b610da21a9711ded46e81742f28acc90510b9f0be8b1dcc', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.listicle_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', 'b95e0c9e-5c5c-4204-b0e7-abe24dc9cc28', 'generic_before_after_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', '446ba4d17efc55a7820d6a810cd29c0a68a3c4884cc83e355841e0e9e6a69101', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.before_after_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '1dcb4c91-30c6-481b-a065-b6e64d5f478e', 'generic_testimonial_card_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', 'c0f357e41e47c07623775bd32f0f9d5fec5db252bb79b84f90c89bbf7fede85a', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.testimonial_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', 'c9a59faa-6600-4f2b-817e-6051f824f5e7', 'generic_carousel_cover_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', 'dd86bf18efa3bff9e0767756dc822de767fb1abd072798436c8d581358b49085', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.carousel.cover'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', 'c4c0fc9d-f59b-4604-a242-a6777c5d76b9', 'generic_carousel_body_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', '6f92dccdd1098ef6948668f1b4a1877e4b07851d567a3c8f2a1ee16fae5195d4', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.carousel.body'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '8aeb946c-406b-483d-b822-f21b4ba16973', 'generic_carousel_closing_1x1_v1', f.id, 'generic', 1080, 1080, '1:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', '85ba6405fc6a225ab055cdb7d600fc3b1c3cf5a68f9cf9998b26c2d76c93bf07', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.carousel.closing'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '0b1f7079-e50b-41c1-9f35-05b47f980903', 'generic_story_static_card_9x16_v1', f.id, 'generic', 1080, 1920, '9:16', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', 'd140db8db2851a13ee00ddd337101e15603f471cd51e4cf6e2be06f83cf16f6e', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.story_static_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;
INSERT INTO c.creative_provider_template (provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, inventory_status, inventory_source, captured_by, inventory_hash, status)
  SELECT 'creatomate', '590ca39a-6e27-4ec6-8a22-bc38a9fa1e30', 'generic_linkedin_landscape_card_1200x628_v1', f.id, 'generic', 1200, 628, '1.91:1', 'static_image', 'captured_from_provider_read', 'creatomate_v1_templates_read', 'tmr-live-capture-generic-static-v2', 'd24540db54d25cd6c54122fc43b3d347704172b721b7dbf10e962e33a315d03b', 'smoke_rendered'
  FROM c.creative_template_family f WHERE f.family_key='generic.linkedin_landscape_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING;

-- 3) Provider template fields
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('ccc23524-cae9-448b-ab37-9408c6e533f8', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('a646ab9d-53c8-44bc-aa6b-86850a0390ec', 'Logo', 'image', '3', true, 'logo', '', false),
    ('eb6abff5-6bf6-4d8f-8015-a84bfd2ef713', 'CategoryBadge', 'text', '4', true, 'text', 'CATEGORY', false),
    ('673207da-1cf9-4a80-864e-eeda6239e54e', 'Headline', 'text', '5', true, 'text', 'Headline goes here in up to two lines', true),
    ('Summary', 'Summary', 'text', '6', true, 'text', 'News summary caps at two to three clear lines to keep the card readable', false),
    ('Location', 'Location', 'text', '7', true, 'text', 'Location', false),
    ('Date', 'Date', 'text', '8', true, 'text', 'Date', false),
    ('SourceLabel', 'SourceLabel', 'text', '9', true, 'text', 'Source', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='b662f999-597b-4848-8aa9-a5b411540601'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('Headline', 'Headline', 'text', '4', true, 'text', 'Headline for the tips list', true),
    ('N1', 'N1', 'text', '5', false, 'text', '1', false),
    ('Item1', 'Item1', 'text', '6', true, 'text', 'First tip goes here in one short line', false),
    ('N2', 'N2', 'text', '7', false, 'text', '2', false),
    ('Item2', 'Item2', 'text', '8', true, 'text', 'Second tip goes here in one short line', false),
    ('N3', 'N3', 'text', '9', false, 'text', '3', false),
    ('Item3', 'Item3', 'text', '10', true, 'text', 'Third tip goes here in one short line', false),
    ('Footer', 'Footer', 'text', '11', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='47ad6a9c-dd3e-41b5-a815-88f09b99da69'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('BackgroundSolid', 'BackgroundSolid', 'shape', '1', false, 'background', NULL, false),
    ('6e178164-df47-48e7-bdac-90b95323e8b7', 'Logo', 'image', '2', true, 'logo', '', false),
    ('f463ab89-854c-4858-b30b-4e1430b383a8', 'Headline', 'text', '3', true, 'text', 'Headline goes here', true),
    ('Divider', 'Divider', 'shape', '4', false, 'shape', NULL, false),
    ('LeftLabel', 'LeftLabel', 'text', '5', true, 'text', 'BEFORE', false),
    ('LeftMetric', 'LeftMetric', 'text', '6', true, 'text', '00', false),
    ('RightLabel', 'RightLabel', 'text', '7', true, 'text', 'AFTER', false),
    ('RightMetric', 'RightMetric', 'text', '8', true, 'text', '00', false),
    ('Subtitle', 'Subtitle', 'text', '9', true, 'text', 'Supporting line explaining the comparison', false),
    ('90773304-7cec-4e85-9446-9674b3aeb101', 'Footer', 'text', '10', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='b95e0c9e-5c5c-4204-b0e7-abe24dc9cc28'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('Rating', 'Rating', 'text', '4', true, 'text', '★★★★★', false),
    ('QuoteText', 'QuoteText', 'text', '5', true, 'text', 'Customer testimonial goes here with a clear name and location below', true),
    ('Attribution', 'Attribution', 'text', '6', true, 'text', 'Customer name', false),
    ('RoleLocation', 'RoleLocation', 'text', '7', true, 'text', 'Role, Location', false),
    ('Footer', 'Footer', 'text', '8', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='1dcb4c91-30c6-481b-a065-b6e64d5f478e'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('SlideNumber', 'SlideNumber', 'text', '4', true, 'text', '1/5', false),
    ('CategoryBadge', 'CategoryBadge', 'text', '5', true, 'text', 'GUIDE', false),
    ('Headline', 'Headline', 'text', '6', true, 'text', 'Carousel cover headline goes here', true),
    ('Subtitle', 'Subtitle', 'text', '7', true, 'text', 'Supporting subtitle for the opening slide', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='c9a59faa-6600-4f2b-817e-6051f824f5e7'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('BackgroundSolid', 'BackgroundSolid', 'shape', '1', false, 'background', NULL, false),
    ('709d3470-cba5-46d6-b5e6-b7f02bfc7b94', 'Logo', 'image', '2', true, 'logo', '', false),
    ('9a2c016c-f918-4788-a067-be6fe759405c', 'SlideNumber', 'text', '3', true, 'text', '2/5', false),
    ('2838df6c-dd31-48cc-83d8-0a85439f2535', 'Headline', 'text', '4', true, 'text', 'Body slide headline', true),
    ('BodyText', 'BodyText', 'text', '5', true, 'text', 'Short body text for this slide — keep it to a few clear lines and protect the text safe area.', false),
    ('Footer', 'Footer', 'text', '6', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='c4c0fc9d-f59b-4604-a242-a6777c5d76b9'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('BackgroundSolid', 'BackgroundSolid', 'shape', '1', false, 'background', NULL, false),
    ('Logo', 'Logo', 'image', '2', true, 'logo', '', false),
    ('Headline', 'Headline', 'text', '3', true, 'text', 'Closing headline goes here', true),
    ('CTA', 'CTA', 'text', '4', true, 'text', 'Call to action', false),
    ('ContactLine', 'ContactLine', 'text', '5', true, 'text', 'Contact line', false),
    ('Footer', 'Footer', 'text', '6', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='8aeb946c-406b-483d-b822-f21b4ba16973'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('cdd13c74-a623-4964-9dd7-7cbd00a99be2', 'Headline', 'text', '4', true, 'text', 'Vertical story headline goes here', true),
    ('55740712-af2d-4295-beb7-81f0d717b671', 'Subtitle', 'text', '5', true, 'text', 'Supporting subtitle for the story frame', false),
    ('CTA', 'CTA', 'text', '6', true, 'text', 'Call to action', false),
    ('Footer', 'Footer', 'text', '7', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='0b1f7079-e50b-41c1-9f35-05b47f980903'
  ON CONFLICT (template_id, element_name) DO NOTHING;
INSERT INTO c.creative_provider_template_field (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render)
  SELECT pt.id, v.element_id, v.element_name, v.element_type, v.track, v.dynamic, v.field_kind, v.default_value_safe, v.required_for_render
  FROM c.creative_provider_template pt JOIN (VALUES
    ('Background', 'Background', 'image', '1', true, 'background', '', true),
    ('Scrim', 'Scrim', 'shape', '2', false, 'shape', NULL, false),
    ('Logo', 'Logo', 'image', '3', true, 'logo', '', false),
    ('Headline', 'Headline', 'text', '4', true, 'text', 'LinkedIn landscape headline in up to two lines', true),
    ('Subtitle', 'Subtitle', 'text', '5', true, 'text', 'Short supporting line, mobile-readable', false),
    ('1672de69-54db-4c91-8882-625dda0739df', 'Footer', 'text', '6', true, 'text', 'Footer', false)
  ) AS v(element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, required_for_render) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='590ca39a-6e27-4ec6-8a22-bc38a9fa1e30'
  ON CONFLICT (template_id, element_name) DO NOTHING;

-- 4) Variant candidates (purpose-built = strong_candidate)
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'news_summary.v1', 'strong_candidate', 'Purpose-built news_summary.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='b662f999-597b-4848-8aa9-a5b411540601'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'educational.v1', 'strong_candidate', 'Purpose-built educational.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='47ad6a9c-dd3e-41b5-a815-88f09b99da69'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'comparison.v1', 'strong_candidate', 'Purpose-built comparison.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='b95e0c9e-5c5c-4204-b0e7-abe24dc9cc28'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'testimonial.v1', 'strong_candidate', 'Purpose-built testimonial.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='1dcb4c91-30c6-481b-a065-b6e64d5f478e'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'carousel_cover.v1', 'strong_candidate', 'Purpose-built carousel_cover.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='c9a59faa-6600-4f2b-817e-6051f824f5e7'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'carousel_body.v1', 'strong_candidate', 'Purpose-built carousel_body.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='c4c0fc9d-f59b-4604-a242-a6777c5d76b9'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'carousel_closing.v1', 'strong_candidate', 'Purpose-built carousel_closing.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='8aeb946c-406b-483d-b822-f21b4ba16973'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'story_static.v1', 'strong_candidate', 'Purpose-built story_static.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='0b1f7079-e50b-41c1-9f35-05b47f980903'
  ON CONFLICT (template_id, variant_key) DO NOTHING;
INSERT INTO c.creative_template_variant_candidate (template_id, variant_key, fit_status, fit_reason, required_field_mapping_status)
  SELECT pt.id, 'market_update.v1', 'strong_candidate', 'Purpose-built market_update.v1 template; element set matches the variant', 'pending'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='590ca39a-6e27-4ec6-8a22-bc38a9fa1e30'
  ON CONFLICT (template_id, variant_key) DO NOTHING;

-- 5) Platform suitability (candidate)
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='b662f999-597b-4848-8aa9-a5b411540601'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='47ad6a9c-dd3e-41b5-a815-88f09b99da69'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='b95e0c9e-5c5c-4204-b0e7-abe24dc9cc28'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('instagram', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='1dcb4c91-30c6-481b-a065-b6e64d5f478e'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('instagram', 'carousel', 'candidate', 'Best-platform per template matrix'),
    ('facebook', 'carousel', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'carousel', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='c9a59faa-6600-4f2b-817e-6051f824f5e7'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('instagram', 'carousel', 'candidate', 'Best-platform per template matrix'),
    ('facebook', 'carousel', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'carousel', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='c4c0fc9d-f59b-4604-a242-a6777c5d76b9'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('instagram', 'carousel', 'candidate', 'Best-platform per template matrix'),
    ('facebook', 'carousel', 'candidate', 'Best-platform per template matrix'),
    ('linkedin', 'carousel', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='8aeb946c-406b-483d-b822-f21b4ba16973'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('instagram', 'story', 'candidate', 'Best-platform per template matrix'),
    ('facebook', 'story', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='0b1f7079-e50b-41c1-9f35-05b47f980903'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;
INSERT INTO c.creative_template_platform_suitability (template_id, platform, placement, suitability_status, reason)
  SELECT pt.id, v.platform, v.placement, v.suitability_status, v.reason
  FROM c.creative_provider_template pt JOIN (VALUES
    ('linkedin', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('facebook', 'feed', 'candidate', 'Best-platform per template matrix'),
    ('website', 'card', 'candidate', 'Best-platform per template matrix')
  ) AS v(platform, placement, suitability_status, reason) ON true
  WHERE pt.provider='creatomate' AND pt.provider_template_id='590ca39a-6e27-4ec6-8a22-bc38a9fa1e30'
  ON CONFLICT (template_id, platform, placement) DO NOTHING;

-- 6) Proof events: smoke_render PASSED (idempotent via NOT EXISTS)
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:ee71ee41-6f70-4d11-a5c2-fe388821fa72', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='b662f999-597b-4848-8aa9-a5b411540601'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:ee71ee41-6f70-4d11-a5c2-fe388821fa72');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:9129b681-7c6e-43cf-a2af-bcd261c545cc', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='47ad6a9c-dd3e-41b5-a815-88f09b99da69'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:9129b681-7c6e-43cf-a2af-bcd261c545cc');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:90106a00-2be5-42ac-bda9-56c642dfd84a', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='b95e0c9e-5c5c-4204-b0e7-abe24dc9cc28'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:90106a00-2be5-42ac-bda9-56c642dfd84a');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:6d5b3330-4e68-4deb-b6f8-cde7fed5d06e', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='1dcb4c91-30c6-481b-a065-b6e64d5f478e'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:6d5b3330-4e68-4deb-b6f8-cde7fed5d06e');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:b4fb8f13-341e-4b2c-af35-341d9214e5b3', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='c9a59faa-6600-4f2b-817e-6051f824f5e7'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:b4fb8f13-341e-4b2c-af35-341d9214e5b3');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:795c0796-d8d5-4a86-ad22-9f236205c2f9', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='c4c0fc9d-f59b-4604-a242-a6777c5d76b9'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:795c0796-d8d5-4a86-ad22-9f236205c2f9');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:cc9d6b40-fbf9-4be0-8adc-8aa2fdc6e034', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='8aeb946c-406b-483d-b822-f21b4ba16973'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:cc9d6b40-fbf9-4be0-8adc-8aa2fdc6e034');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:5681ed0c-17a2-4b8c-81ea-a3043a6f2d1f', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='0b1f7079-e50b-41c1-9f35-05b47f980903'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:5681ed0c-17a2-4b8c-81ea-a3043a6f2d1f');
INSERT INTO c.creative_template_proof_event (template_id, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT pt.id, 'smoke_render', 'passed', 'creatomate_render:c70587ba-1ef2-4c86-967b-ce3b5a863b5d', 'creatomate_render_id', now(), 'tmr-live-capture-generic-static-v2'
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='590ca39a-6e27-4ec6-8a22-bc38a9fa1e30'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event pe WHERE pe.template_id=pt.id AND pe.evidence_reference='creatomate_render:c70587ba-1ef2-4c86-967b-ce3b5a863b5d');

-- 7) Inventory audit (idempotent via NOT EXISTS on hash)
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/b662f999-597b-4848-8aa9-a5b411540601', '86b134ce799cf86eea61f8dea4e2c7d8c5fc4f43c72dfa36f497b93bcd266aba', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='b662f999-597b-4848-8aa9-a5b411540601'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='86b134ce799cf86eea61f8dea4e2c7d8c5fc4f43c72dfa36f497b93bcd266aba');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/47ad6a9c-dd3e-41b5-a815-88f09b99da69', 'e457506f17b831472b610da21a9711ded46e81742f28acc90510b9f0be8b1dcc', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='47ad6a9c-dd3e-41b5-a815-88f09b99da69'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='e457506f17b831472b610da21a9711ded46e81742f28acc90510b9f0be8b1dcc');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/b95e0c9e-5c5c-4204-b0e7-abe24dc9cc28', '446ba4d17efc55a7820d6a810cd29c0a68a3c4884cc83e355841e0e9e6a69101', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='b95e0c9e-5c5c-4204-b0e7-abe24dc9cc28'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='446ba4d17efc55a7820d6a810cd29c0a68a3c4884cc83e355841e0e9e6a69101');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/1dcb4c91-30c6-481b-a065-b6e64d5f478e', 'c0f357e41e47c07623775bd32f0f9d5fec5db252bb79b84f90c89bbf7fede85a', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='1dcb4c91-30c6-481b-a065-b6e64d5f478e'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='c0f357e41e47c07623775bd32f0f9d5fec5db252bb79b84f90c89bbf7fede85a');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/c9a59faa-6600-4f2b-817e-6051f824f5e7', 'dd86bf18efa3bff9e0767756dc822de767fb1abd072798436c8d581358b49085', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='c9a59faa-6600-4f2b-817e-6051f824f5e7'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='dd86bf18efa3bff9e0767756dc822de767fb1abd072798436c8d581358b49085');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/c4c0fc9d-f59b-4604-a242-a6777c5d76b9', '6f92dccdd1098ef6948668f1b4a1877e4b07851d567a3c8f2a1ee16fae5195d4', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='c4c0fc9d-f59b-4604-a242-a6777c5d76b9'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='6f92dccdd1098ef6948668f1b4a1877e4b07851d567a3c8f2a1ee16fae5195d4');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/8aeb946c-406b-483d-b822-f21b4ba16973', '85ba6405fc6a225ab055cdb7d600fc3b1c3cf5a68f9cf9998b26c2d76c93bf07', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='8aeb946c-406b-483d-b822-f21b4ba16973'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='85ba6405fc6a225ab055cdb7d600fc3b1c3cf5a68f9cf9998b26c2d76c93bf07');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/0b1f7079-e50b-41c1-9f35-05b47f980903', 'd140db8db2851a13ee00ddd337101e15603f471cd51e4cf6e2be06f83cf16f6e', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='0b1f7079-e50b-41c1-9f35-05b47f980903'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='d140db8db2851a13ee00ddd337101e15603f471cd51e4cf6e2be06f83cf16f6e');
INSERT INTO c.creative_template_inventory_audit (template_id, captured_by, capture_method, source_reference, inventory_hash, decision, no_secret_assertion, no_mutation_assertion)
  SELECT pt.id, 'tmr-live-capture-generic-static-v2', 'provider_read_endpoint', 'creatomate GET /v1/templates/590ca39a-6e27-4ec6-8a22-bc38a9fa1e30', 'd24540db54d25cd6c54122fc43b3d347704172b721b7dbf10e962e33a315d03b', 'captured_additive_batch35', true, true
  FROM c.creative_provider_template pt WHERE pt.provider='creatomate' AND pt.provider_template_id='590ca39a-6e27-4ec6-8a22-bc38a9fa1e30'
    AND NOT EXISTS (SELECT 1 FROM c.creative_template_inventory_audit ia WHERE ia.template_id=pt.id AND ia.inventory_hash='d24540db54d25cd6c54122fc43b3d347704172b721b7dbf10e962e33a315d03b');

COMMIT;