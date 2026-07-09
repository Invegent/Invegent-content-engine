-- cc-0032 · V2 — register the governed vid_market_stat_reveal_v2 Creatomate VIDEO provider template (COMBO AUDIO).
-- provider-template-bound · visuals byte-identical to V1 901a30ce · ADDS named audio elements MusicBed + VoiceAudio · 9:16 · 12s.
-- Brief: docs/briefs/cc-0032-governed-video-combo-audio-vo-music-bed.md (Gate 1 approved 2026-07-09; D2 = new _v2 revision, 901a30ce stays silent baseline).
-- provider_template_id c11bb8ab-18bd-45ff-aedd-0a59cb3773ab = PK-authored Creatomate template 'vid_market_stat_reveal_v2'
--   (verified present via read-only API GET 2026-07-09: 1080x1920/12s, 11 elements incl. audio MusicBed + VoiceAudio; co-resident with 901a30ce).
-- Additive INSERT only. status=governance_reviewed (NOT rendered/approved) — no render/enable side-effect.
-- APPLIED 2026-07-09, prod ledger 20260709205827. Post-apply proof GREEN: exactly 1 row; creatomate templates 18 -> 19;
--   status=governance_reviewed; shape video 1080x1920 12s. Chain: db-rls pass, creative-graph PASS, external agree (hash b934ee51).
INSERT INTO c.creative_provider_template
  (provider, provider_template_id, provider_template_name, family_id, scope, client_id,
   width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
   provider_project_reference, inventory_status, inventory_source, captured_by, status)
VALUES
  ('creatomate',
   'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab',
   'video_stat_reveal_9x16_v2',
   'c0b10001-0000-4000-8000-000000000001',
   'client',
   '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
   1080, 1920, '9:16',
   'video', 'mp4', 12,
   'creatomate account of the ICE video Creatomate API key (operator-held, out-of-transcript); v2 template c11bb8ab-18bd-45ff-aedd-0a59cb3773ab verified present in this account 2026-07-09 (read-only API GET), co-resident with 901a30ce; governed video-worker renders by provider_template_id with this key — confirm renderability at the step-6 smoke gate',
   'captured_from_manual_entry',
   'V2 authoring spec _harness/video_tmr/vid_market_stat_reveal_v2_provider_template_source.json; visuals byte-identical to V1 901a30ce; ADDS named audio elements MusicBed (bed, default Drifting Piano approved_scoped, vol 70% first-estimate) + VoiceAudio (VO slot, worker-set, vol 100%); declarative variant stat-reveal-9x16-video-v2 (property-pulse.json v0.9)',
   'v2-video-provider-template-register-combo-audio',
   'governance_reviewed')
ON CONFLICT (provider, provider_template_id) DO NOTHING;
