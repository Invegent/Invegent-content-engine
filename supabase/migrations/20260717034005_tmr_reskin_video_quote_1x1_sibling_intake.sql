-- Migration name (permanent identity): tmr_reskin_video_quote_1x1_sibling_intake
-- Lane: SIDE_PROVING · T2 · additive fenced intake — SAME SHAPE as tmr_reskin_video_templates_v1_fenced_intake (v5.57).
-- Writes: 1 c.creative_provider_template row (status='classified', scope='generic', output_type='video')
--         + 6 c.creative_provider_template_tag rows, into EXISTING family generic.news.quote_card.
-- Does NOT write: families, variant_candidate, platform_suitability, client_assignment, proof_event;
--         no DDL, no GRANT/REVOKE, no RLS/RPC/worker change.
-- Idempotent: ON CONFLICT DO NOTHING on both unique keys. Fail-closed assertion at end.

BEGIN;

-- 04 · Quote Statement 1:1 (square sibling of 03) -> family generic.news.quote_card
WITH ins AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, inventory_hash,
     status, image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
  SELECT 'creatomate', '314974f6-93f9-41d7-b6a4-dec9e997cc3e',
         'ICE Generic Quote Statement 1x1 v1 (video)', f.id, 'generic',
         1080, 1080, '1:1', 'video', 'mp4', 8,
         'captured_from_render_probe',
         'ICE reskin_video_templates_v1 direct+v2 Creatomate smoke 2026-07-17',
         'ICE orchestrator (tmr reskin video quote 1x1 sibling)', now(),
         '1361a4bf5c7ad83d8afdfa9a19c522a63ad01f54ec2b74abddb044ea722baaa0',
         'classified', 0, 0, false, NULL
  FROM c.creative_template_family f
  WHERE f.family_key = 'generic.news.quote_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING
  RETURNING id
)
INSERT INTO c.creative_provider_template_tag (template_id, namespace, value)
SELECT ins.id, v.namespace, v.value FROM ins,
  (VALUES ('vertical','generic'),('use_case','quote_statement'),('tone','dramatic'),
          ('motion_treatment','searchlight_reveal'),('length_class','short_video'),('aspect_fit','1x1')
  ) AS v(namespace,value)
ON CONFLICT (template_id, namespace, value) DO NOTHING;

-- Fail-closed in-transaction assertion (rolls back on any mismatch)
DO $$
DECLARE
  v_id uuid;
  v_rows int; v_tags int; v_vc int; v_ps int; v_ca int;
BEGIN
  SELECT id INTO v_id FROM c.creative_provider_template
   WHERE provider='creatomate' AND provider_template_id='314974f6-93f9-41d7-b6a4-dec9e997cc3e';

  SELECT count(*) INTO v_rows FROM c.creative_provider_template
   WHERE id=v_id AND status='classified' AND scope='generic' AND output_type='video';
  SELECT count(*) INTO v_tags FROM c.creative_provider_template_tag WHERE template_id=v_id;
  SELECT count(*) INTO v_vc FROM c.creative_template_variant_candidate WHERE template_id=v_id;
  SELECT count(*) INTO v_ps FROM c.creative_template_platform_suitability WHERE template_id=v_id;
  SELECT count(*) INTO v_ca FROM c.creative_template_client_assignment WHERE template_id=v_id;

  IF v_rows <> 1 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: expected 1 classified/generic/video row, got %', v_rows; END IF;
  IF v_tags <> 6 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: expected 6 tag rows, got %', v_tags; END IF;
  IF v_vc <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: variant_candidate rows must be 0, got %', v_vc; END IF;
  IF v_ps <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: platform_suitability rows must be 0, got %', v_ps; END IF;
  IF v_ca <> 0 THEN RAISE EXCEPTION 'FENCE-ASSERT fail: client_assignment rows must be 0, got %', v_ca; END IF;
END $$;

COMMIT;
