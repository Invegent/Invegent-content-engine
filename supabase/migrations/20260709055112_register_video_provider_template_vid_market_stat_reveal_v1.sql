-- Video TMR Sprint Phase 2 · V1 — register the governed vid_market_stat_reveal Creatomate VIDEO provider template.
-- provider-template-bound (D1a) · still-image Ken-Burns (D2 baked) · 0.55 scrim · output_type=video · 9:16 · 12s.
-- Brief: docs/briefs/creatomate-video-tmr-sprint-phase2-packet-v2.md (Gate 1 approved 2026-07-09).
-- provider_template_id 901a30ce... = PK-authored Creatomate template 'vid_market_stat_reveal_v1' (verified present via read-only API GET 2026-07-09).
-- Additive INSERT only. status=governance_reviewed (NOT rendered/approved) — no render/enable side-effect.
-- APPLIED 2026-07-09, prod ledger 20260709055112. Post-apply proof GREEN: exactly 1 row; 17 static_image untouched;
--   select_template image_quote winner UNCHANGED (48cba556); video_short_stat still fail_closed/format_unmapped (row not selectable).
INSERT INTO c.creative_provider_template
  (provider, provider_template_id, provider_template_name, family_id, scope, client_id,
   width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
   provider_project_reference, inventory_status, inventory_source, captured_by, status)
VALUES
  ('creatomate',
   '901a30ce-292a-4e4f-8e46-fef93f71e098',
   'video_stat_reveal_9x16_v1',
   'c0b10001-0000-4000-8000-000000000001',
   'client',
   '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
   1080, 1920, '9:16',
   'video', 'mp4', 12,
   'creatomate account of the ICE video Creatomate API key (operator-held, out-of-transcript); template 901a30ce-292a-4e4f-8e46-fef93f71e098 verified present in this account 2026-07-09 (read-only API GET); V2 video-worker renders by provider_template_id with this key — confirm renderability at the V2 render-proof gate',
   'captured_from_manual_entry',
   'V1 authoring spec _harness/video_tmr/vid_market_stat_reveal_v1_provider_template_source.json; design video_premium_market_v4.json; D2 baked still bg_perth_cbd + 0.55 scrim; declarative variant stat-reveal-9x16-video-v1 (property-pulse.json v0.8)',
   'v1-video-provider-template-register',
   'governance_reviewed')
ON CONFLICT (provider, provider_template_id) DO NOTHING;
