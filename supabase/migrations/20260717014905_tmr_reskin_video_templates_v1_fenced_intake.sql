-- Migration name (permanent identity): tmr_reskin_video_templates_v1_fenced_intake
-- Lane: SIDE_PROVING · T2 · additive fenced intake into the LIVE TMR registry.
-- Writes: 3 c.creative_provider_template rows (status='classified', scope='generic',
--         output_type='video') + 18 c.creative_provider_template_tag rows.
-- Does NOT write: families, variant_candidate, platform_suitability, client_assignment,
--         proof_event; no DDL, no GRANT/REVOKE, no RLS/RPC/worker change.
-- Idempotent: ON CONFLICT DO NOTHING on both unique keys. Fail-closed assertion at end.

BEGIN;

-- ── 01 · Stat Reveal 9:16 → family generic.stat_hero_card ─────────────────────────────
WITH ins AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, inventory_hash,
     status, image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
  SELECT 'creatomate', 'c6dcaa2d-f3fe-4564-a588-6ac588680387',
         'ICE Generic Stat Reveal 9x16 v1 (video)', f.id, 'generic',
         720, 1280, '9:16', 'video', 'mp4', 8,
         'captured_from_render_probe',
         'ICE reskin_video_templates_v1 direct+v2 Creatomate smoke 2026-07-16',
         'ICE orchestrator (tmr reskin video intake v1)', now(),
         '3dc71c360d3d4773d219686c919a149b9221b21ead9016dde078250e523b826c',
         'classified', 0, 0, false, NULL
  FROM c.creative_template_family f
  WHERE f.family_key = 'generic.stat_hero_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING
  RETURNING id
)
INSERT INTO c.creative_provider_template_tag (template_id, namespace, value)
SELECT ins.id, v.namespace, v.value FROM ins,
  (VALUES ('vertical','generic'),('use_case','stat_reveal'),('tone','clean'),
          ('motion_treatment','counter_reveal'),('length_class','short_video'),('aspect_fit','9x16')
  ) AS v(namespace,value)
ON CONFLICT (template_id, namespace, value) DO NOTHING;

-- ── 02 · Multi-Stat / Tips 1:1 → family generic.listicle_card ─────────────────────────
WITH ins AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, inventory_hash,
     status, image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
  SELECT 'creatomate', '817ce92d-6843-4580-ad09-3d35d80d8154',
         'ICE Generic Multi-Stat Tips 1x1 v1 (video)', f.id, 'generic',
         1080, 1080, '1:1', 'video', 'mp4', 9,
         'captured_from_render_probe',
         'ICE reskin_video_templates_v1 direct+v2 Creatomate smoke 2026-07-16',
         'ICE orchestrator (tmr reskin video intake v1)', now(),
         '0fd5248c8d1b40b8689946ebf24557a2dbf81c76679053ee4fdcb4526815d3ca',
         'classified', 0, 0, false, NULL
  FROM c.creative_template_family f
  WHERE f.family_key = 'generic.listicle_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING
  RETURNING id
)
INSERT INTO c.creative_provider_template_tag (template_id, namespace, value)
SELECT ins.id, v.namespace, v.value FROM ins,
  (VALUES ('vertical','generic'),('use_case','tips_listicle'),('tone','clean'),
          ('motion_treatment','staggered_slide'),('length_class','short_video'),('aspect_fit','1x1')
  ) AS v(namespace,value)
ON CONFLICT (template_id, namespace, value) DO NOTHING;

-- ── 03 · Quote Statement 9:16 → family generic.news.quote_card ─────────────────────────
WITH ins AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, inventory_hash,
     status, image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
  SELECT 'creatomate', '416658f5-f565-4351-95e6-12b9a4063df0',
         'ICE Generic Quote Statement 9x16 v1 (video)', f.id, 'generic',
         720, 1280, '9:16', 'video', 'mp4', 8,
         'captured_from_render_probe',
         'ICE reskin_video_templates_v1 direct+v2 Creatomate smoke 2026-07-16',
         'ICE orchestrator (tmr reskin video intake v1)', now(),
         'c7613d6933c475352f3d652f948fdafad3a3f45f06bc668f735fba6eabc9f976',
         'classified', 0, 0, false, NULL
  FROM c.creative_template_family f
  WHERE f.family_key = 'generic.news.quote_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING
  RETURNING id
)
INSERT INTO c.creative_provider_template_tag (template_id, namespace, value)
SELECT ins.id, v.namespace, v.value FROM ins,
  (VALUES ('vertical','generic'),('use_case','quote_statement'),('tone','dramatic'),
          ('motion_treatment','searchlight_reveal'),('length_class','short_video'),('aspect_fit','9x16')
  ) AS v(namespace,value)
ON CONFLICT (template_id, namespace, value) DO NOTHING;

-- ── Fail-closed in-transaction assertion (rolls back on any mismatch) ──────────────────
DO $$
DECLARE
  v_ids uuid[];
  v_rows int; v_tags int; v_vc int; v_ps int; v_ca int;
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM c.creative_provider_template
  WHERE provider='creatomate'
    AND provider_template_id IN (
      'c6dcaa2d-f3fe-4564-a588-6ac588680387',
      '817ce92d-6843-4580-ad09-3d35d80d8154',
      '416658f5-f565-4351-95e6-12b9a4063df0');

  SELECT count(*) INTO v_rows FROM c.creative_provider_template
    WHERE id = ANY(v_ids) AND status='classified' AND scope='generic' AND output_type='video';
  SELECT count(*) INTO v_tags FROM c.creative_provider_template_tag WHERE template_id = ANY(v_ids);
  SELECT count(*) INTO v_vc FROM c.creative_template_variant_candidate WHERE template_id = ANY(v_ids);
  SELECT count(*) INTO v_ps FROM c.creative_template_platform_suitability WHERE template_id = ANY(v_ids);
  SELECT count(*) INTO v_ca FROM c.creative_template_client_assignment WHERE template_id = ANY(v_ids);

  IF v_rows <> 3 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: expected 3 classified/generic/video rows, got %', v_rows; END IF;
  IF v_tags <> 18 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: expected 18 tag rows, got %', v_tags; END IF;
  IF v_vc <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: variant_candidate rows must be 0, got %', v_vc; END IF;
  IF v_ps <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: platform_suitability rows must be 0, got %', v_ps; END IF;
  IF v_ca <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: client_assignment rows must be 0, got %', v_ca; END IF;
END $$;

COMMIT;
