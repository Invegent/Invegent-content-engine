-- Migration name (permanent identity): tmr_reskin_video_stat1x1_tips9x16_intake
-- Lane: SIDE_PROVING · T2 · additive fenced intake — SAME SHAPE as v5.57 / v5.59.
-- Writes: 2 c.creative_provider_template rows (status='classified', scope='generic',
--         output_type='video') + 12 c.creative_provider_template_tag rows, into EXISTING
--         families generic.stat_hero_card (05, 1:1) + generic.listicle_card (06, 9:16).
-- Does NOT write: families, variant_candidate, platform_suitability, client_assignment,
--         proof_event; no DDL, no GRANT/REVOKE, no RLS/RPC/worker change.
-- Idempotent: ON CONFLICT DO NOTHING on both unique keys. Fail-closed assertion at end.

BEGIN;

-- 05 · Stat Reveal 1:1 -> family generic.stat_hero_card
WITH ins AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, inventory_hash,
     status, image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
  SELECT 'creatomate', '8d5cd8df-94c2-4b3d-bb51-ed3bd3e163ae',
         'ICE Generic Stat Reveal 1x1 v1 (video)', f.id, 'generic',
         1080, 1080, '1:1', 'video', 'mp4', 8,
         'captured_from_render_probe',
         'ICE reskin_video_templates_v1 direct+v2 Creatomate smoke 2026-07-17',
         'ICE orchestrator (tmr reskin video stat1x1/tips9x16)', now(),
         '491947c4e312cef411fc0410639378ff5de2b9ebe8949c20e7458e0a533371f9',
         'classified', 0, 0, false, NULL
  FROM c.creative_template_family f
  WHERE f.family_key = 'generic.stat_hero_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING
  RETURNING id
)
INSERT INTO c.creative_provider_template_tag (template_id, namespace, value)
SELECT ins.id, v.namespace, v.value FROM ins,
  (VALUES ('vertical','generic'),('use_case','stat_reveal'),('tone','clean'),
          ('motion_treatment','counter_reveal'),('length_class','short_video'),('aspect_fit','1x1')
  ) AS v(namespace,value)
ON CONFLICT (template_id, namespace, value) DO NOTHING;

-- 06 · Multi-Stat / Tips 9:16 -> family generic.listicle_card
WITH ins AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, inventory_hash,
     status, image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
  SELECT 'creatomate', '2bda9382-3b11-4395-9b87-05a752e22678',
         'ICE Generic Multi-Stat Tips 9x16 v1 (video)', f.id, 'generic',
         720, 1280, '9:16', 'video', 'mp4', 9,
         'captured_from_render_probe',
         'ICE reskin_video_templates_v1 direct+v2 Creatomate smoke 2026-07-17 (browser-transposed)',
         'ICE orchestrator (tmr reskin video stat1x1/tips9x16)', now(),
         'b593cd7d4145620260f733ae4fbaa60ee13e18af9968b115baa19926c74fecec',
         'classified', 0, 0, false, NULL
  FROM c.creative_template_family f
  WHERE f.family_key = 'generic.listicle_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING
  RETURNING id
)
INSERT INTO c.creative_provider_template_tag (template_id, namespace, value)
SELECT ins.id, v.namespace, v.value FROM ins,
  (VALUES ('vertical','generic'),('use_case','tips_listicle'),('tone','clean'),
          ('motion_treatment','staggered_slide'),('length_class','short_video'),('aspect_fit','9x16')
  ) AS v(namespace,value)
ON CONFLICT (template_id, namespace, value) DO NOTHING;

-- Fail-closed in-transaction assertion (rolls back on any mismatch)
DO $$
DECLARE
  v_ids uuid[];
  v_rows int; v_tags int; v_vc int; v_ps int; v_ca int;
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM c.creative_provider_template
  WHERE provider='creatomate'
    AND provider_template_id IN (
      '8d5cd8df-94c2-4b3d-bb51-ed3bd3e163ae',
      '2bda9382-3b11-4395-9b87-05a752e22678');

  SELECT count(*) INTO v_rows FROM c.creative_provider_template
    WHERE id = ANY(v_ids) AND status='classified' AND scope='generic' AND output_type='video';
  SELECT count(*) INTO v_tags FROM c.creative_provider_template_tag WHERE template_id = ANY(v_ids);
  SELECT count(*) INTO v_vc FROM c.creative_template_variant_candidate WHERE template_id = ANY(v_ids);
  SELECT count(*) INTO v_ps FROM c.creative_template_platform_suitability WHERE template_id = ANY(v_ids);
  SELECT count(*) INTO v_ca FROM c.creative_template_client_assignment WHERE template_id = ANY(v_ids);

  IF v_rows <> 2 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: expected 2 classified/generic/video rows, got %', v_rows; END IF;
  IF v_tags <> 12 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: expected 12 tag rows, got %', v_tags; END IF;
  IF v_vc <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: variant_candidate rows must be 0, got %', v_vc; END IF;
  IF v_ps <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: platform_suitability rows must be 0, got %', v_ps; END IF;
  IF v_ca <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: client_assignment rows must be 0, got %', v_ca; END IF;
END $$;

COMMIT;
