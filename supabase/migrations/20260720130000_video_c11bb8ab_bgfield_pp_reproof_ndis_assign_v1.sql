-- BACKFILL RECORD — applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration is
-- harness-deny-listed); recorded post-hoc. Already applied; NOT for replay (the time-windowed
-- postcondition + unique Background field make a replay fail-closed by design).
-- T3 chain: db-rls-auditor pass · external review 0b709641 (partial->PK gate, no defect) · forward.sql sha256 a5f15afa.
-- Version > the already-applied 20260720120000 so the ledger stays monotonic; name is unique.
--
-- cc-0044 Checkpoint E · Step 3 — GOVERNED VIDEO ENABLEMENT (coupled PP/NDIS, post visual+audio PASS)
-- Migration identity: 20260720130000_video_c11bb8ab_bgfield_pp_reproof_ndis_assign_v1
--
-- Applied ONLY after PK's visual+audio PASS of the controlled renders (2026-07-20):
--   PP   render f607a66d-7210-4e0c-b439-53218d618f3e (governed dynamic bg bg_pp_family_backyard_summer)
--   NDIS render 233ab253-6424-475f-8356-9877c9080b3e (governed dynamic bg bg_ny_morning_light_home)
-- THREE coupled writes (one atomic txn): (1) template-level dynamic Background field on a3d8472d (c11bb8ab)
-- — retires the D2 baked-bg divergence; (2) fresh PP visual_approval proof (supersedes baked 58c8ac8f);
-- (3) NDIS visually_approved assignment + passed proof (clears no_assignment). Fail-closed end-to-end
-- postcondition: both clients' select_template must return ok WITH a Background.source. NDIS production
-- video enablement is NOT part of this step (c.client_creative_governance stays OFF).

BEGIN;

-- (1) template-level dynamic Background field (mirror the generic image Background field bd38617e).
INSERT INTO c.creative_provider_template_field
  (template_id, element_id, element_name, element_type, track, dynamic, field_kind, default_value_safe, style_summary, required_for_render)
VALUES
  ('a3d8472d-9438-4312-9f11-b6a920be4014', 'Background', 'Background', 'image', '1', true, 'background', '',
   'cc-0044 CP-E convergence: governed dynamic background (retires the D2 baked-bg divergence; each client resolves its own governed bg via resolve_slot_assets). c11bb8ab exposes an addressable Background image element.',
   true);

-- (2) fresh PP visual_approval proof against the approved PP dynamic-bg render.
INSERT INTO c.creative_template_proof_event
  (template_id, assignment_id, proof_type, proof_status, occurred_at, recorded_by, evidence_kind, evidence_reference)
VALUES
  ('a3d8472d-9438-4312-9f11-b6a920be4014', '1ee1a547-08b8-4ce8-8045-d545be16c699',
   'visual_approval', 'passed', now(), 'PK (cc-0044 CP-E coupled proof 2026-07-20)', 'local_render_file',
   'Controlled direct Creatomate render f607a66d-7210-4e0c-b439-53218d618f3e of a3d8472d/c11bb8ab with PP GOVERNED DYNAMIC background bg_pp_family_backyard_summer (needs_scrim, under baked 0.55 scrim) + pp_logo_primary + governed voice YCxeyFA0G7yTk6Wuv2oq + brand_name intro "Property Pulse" + Drifting Piano bed; PK visual+audio PASS 2026-07-20. SUPERSEDES baked-bg proof 58c8ac8f (Background field added; D2 divergence retired). Local: _harness/cc0044_cpE_coupled_proof/renders/cc0044_cpE_pp_governed_video.mp4');

-- (3) NDIS visually_approved assignment + passed proof against the approved NDIS render.
WITH a AS (
  INSERT INTO c.creative_template_client_assignment
    (template_id, client_id, assignment_status, assignment_scope, approved_by, approved_at, style_guide_reference)
  VALUES
    ('a3d8472d-9438-4312-9f11-b6a920be4014', 'fb98a472-ae4d-432d-8738-2273231c1ef4',
     'visually_approved', 'client_allowed', 'PK', now(), 'docs/creative-library/ndis-yarns.json (video_short_stat)')
  RETURNING id
)
INSERT INTO c.creative_template_proof_event
  (template_id, assignment_id, proof_type, proof_status, occurred_at, recorded_by, evidence_kind, evidence_reference)
SELECT
  'a3d8472d-9438-4312-9f11-b6a920be4014', a.id,
  'visual_approval', 'passed', now(), 'PK (cc-0044 CP-E coupled proof 2026-07-20)', 'local_render_file',
  'Controlled direct Creatomate render 233ab253-6424-475f-8356-9877c9080b3e of a3d8472d/c11bb8ab (generic) with NDIS GOVERNED DYNAMIC background bg_ny_morning_light_home (text_safe) + ny_logo_mark_only + governed voice iamiUYVj7ixJcRZQkS8B + brand_name intro "NDIS Yarns" + Drifting Piano bed; PK visual+audio PASS 2026-07-20 (first governed video on a second brand). Local: _harness/cc0044_cpE_coupled_proof/renders/cc0044_cpE_ndis_governed_video.mp4'
FROM a;

-- Fail-closed postconditions (field present · PP fresh proof · NDIS assignment · both selectors ok+bg).
DO $$
DECLARE r_pp jsonb; r_nd jsonb;
BEGIN
  IF (SELECT count(*) FROM c.creative_provider_template_field
        WHERE template_id='a3d8472d-9438-4312-9f11-b6a920be4014'
          AND element_name='Background' AND field_kind='background' AND dynamic=true) <> 1 THEN
    RAISE EXCEPTION 'cc0044_cpE_step3 bg_field_postcondition_failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event
        WHERE assignment_id='1ee1a547-08b8-4ce8-8045-d545be16c699' AND proof_type='visual_approval'
          AND proof_status='passed' AND occurred_at >= now() - interval '1 hour') THEN
    RAISE EXCEPTION 'cc0044_cpE_step3 pp_fresh_proof_postcondition_failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM c.creative_template_client_assignment
        WHERE template_id='a3d8472d-9438-4312-9f11-b6a920be4014'
          AND client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND assignment_status='visually_approved') THEN
    RAISE EXCEPTION 'cc0044_cpE_step3 ndis_assignment_postcondition_failed'; END IF;
  r_pp := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'governed_video_stat_smoke_v1');
  r_nd := public.select_template('ndis-yarns',     NULL, 'video_short_stat', NULL, 'governed_video_stat_smoke_v1');
  IF (r_pp->>'status') <> 'ok' OR (r_pp#>'{slot_resolution,modifications,Background.source}') IS NULL THEN
    RAISE EXCEPTION 'cc0044_cpE_step3 pp_selector_postcondition_failed: status=%', r_pp->>'status'; END IF;
  IF (r_nd->>'status') <> 'ok' OR (r_nd#>'{slot_resolution,modifications,Background.source}') IS NULL THEN
    RAISE EXCEPTION 'cc0044_cpE_step3 ndis_selector_postcondition_failed: status=%', r_nd->>'status'; END IF;
END $$;

COMMIT;
