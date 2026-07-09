-- Migration: seed_client_creative_governance_video_short_stat_v1
-- Creatomate Video TMR Sprint · Phase 2 — V4 additive governance row (DARK).
--
-- Brief:   docs/briefs/creatomate-video-tmr-sprint-phase2-packet-v2.md (PK Gate 1
--          approved 2026-07-09; D1(a) provider-template-bound, D2=baked still-image
--          Ken-Burns, D4=render-inspect only). Dark-first phasing.
-- Table:   c.client_creative_governance (created in
--          20260707000000_create_client_creative_governance_v1.sql — table +
--          columns client_id, format, contract_ref, declarative_registry_ref,
--          render_label, enabled + UNIQUE(client_id, format) confirmed present).
--
-- WHAT IT IS
--   A single idempotent INSERT of ONE additive governance row: Property Pulse ×
--   video_short_stat, the first governed VIDEO slice. NO DDL, NO grant/revoke, NO
--   schema change — the table + posture already exist.
--
--   DARK / enabled=false ON PURPOSE. The row is seeded with enabled=false so the
--   tmr-drift-probe does NOT yet check the video governance (it flips to true only
--   AFTER the Creatomate template is authored, the governed video-worker branch is
--   wired [V2], and the first governed render proof passes). Reproduces intent
--   only; governs nothing new and enables no render/publish/gate path. No worker,
--   publisher, gate, or resolver reads this row in this lane.
--
--   V5 mapping chain (declarative, no separate artifact): this row's
--   format='video_short_stat' -> contract_ref='property_pulse.video_short_stat.market_stat'
--   -> the contract in property-pulse.json (V3b) -> maps_to_variant
--   'stat-reveal-9x16-video-v1' (V3a) -> provider_template_id
--   'PENDING_CREATOMATE_AUTHORING' (placeholder, pinned by PK later).
--
-- ⛔ APPLY IS PK-GATED. PREPARED, NOT APPLIED — a local draft until PK explicitly
--    approves the apply. No deploy, no push in this lane.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   DELETE FROM c.client_creative_governance
--     WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
--       AND format = 'video_short_stat';

-- Idempotent: re-applying is a no-op on the (client_id, format) pair.
INSERT INTO c.client_creative_governance
  (client_id, format, contract_ref, declarative_registry_ref, render_label, enabled)
VALUES
  ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',            -- Property Pulse
   'video_short_stat',
   'property_pulse.video_short_stat.market_stat',     -- contract_ref (V3b capability contract)
   'property-pulse.json',
   'creative_library_video_stat_production',
   false)                                             -- DARK: drift probe does NOT check this yet
ON CONFLICT (client_id, format) DO NOTHING;
