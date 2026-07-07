-- Migration: create_client_creative_governance_v1
-- Spine Generalisation v1 (Ultimate TMR, Phase 5) — c.client_creative_governance table
--
-- Brief:   docs/briefs/spine-generalisation-v1-packet.md (PK Gate 1 approved,
--          D1–D5 as recommended; D2=(a) new thin DB table).
-- Mirror:  20260706024858_create_tmr_drift_probe_run_v1.sql /
--          20260703064651_create_tmr_shadow_decision_v1.sql (schema-c service-fenced
--          posture precedent: RLS-on-zero-policies, named anon/authenticated revoke,
--          service_role grant only).
--
-- WHAT IT IS
--   The single source of truth for "which client is governed for which creative
--   format, with which capability-contract ref, declarative registry, and render
--   label". Consumed (initially) by the tmr-drift-probe to know which clients to
--   check; later by the live gate (v2, a separate T3 lane).
--
--   DARK / ADDITIVE. This reproduces the current PP-only truth EXACTLY (one seed
--   row) and governs nothing new: no worker, publisher, gate, or enablement path
--   reads it yet, and no client becomes governed by its existence. The live
--   image-worker/ai-worker gate is NOT rewired in this lane (that is v2).
--
-- SECURITY POSTURE
--   RLS ENABLED with ZERO policies (deny-by-default, house pattern) · service_role
--   only (the probe/operators read via service-role paths) · NO grants to anon /
--   authenticated (revoking PUBLIC alone is insufficient — anon and authenticated
--   are named explicitly). Schema `c` is NOT REST-exposed and stays that way.
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED — a local draft until PK
--    explicitly approves the apply inside the Spine Generalisation v1 sequence.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   DROP TABLE IF EXISTS c.client_creative_governance;

CREATE TABLE c.client_creative_governance (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid        NOT NULL REFERENCES c.client(client_id),
  format                   text        NOT NULL,
  contract_ref             text,        -- e.g. 'property_pulse.image_quote.news_card' (vendored contract_ref)
  declarative_registry_ref text,        -- e.g. 'property-pulse.json' (pointer only; registry never read at runtime)
  render_label             text,        -- e.g. 'creative_library_b1_production' (S1 stamper / B1 render_spec label)
  enabled                  boolean     NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, format)
);

COMMENT ON TABLE c.client_creative_governance IS
'Single source of truth for governed-creative spine (Spine Generalisation v1): governed(client_id, format) -> {contract_ref, declarative_registry_ref, render_label, enabled}. Consumed initially by tmr-drift-probe to know which clients to check; later by the live gate (v2). Dark/additive — reproduces current PP-only truth exactly, governs nothing new. Service-fenced: RLS-on-zero-policies, service_role only, no anon/authenticated grants.';

-- ── Posture: deny-by-default (RLS on, ZERO policies), service-fenced ──────────────
ALTER TABLE c.client_creative_governance ENABLE ROW LEVEL SECURITY;

-- Revoking PUBLIC alone is insufficient — name anon and authenticated explicitly.
REVOKE ALL ON TABLE c.client_creative_governance FROM PUBLIC;
REVOKE ALL ON TABLE c.client_creative_governance FROM anon, authenticated;

-- service_role only (the probe reads governed clients; operators via service-role paths).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE c.client_creative_governance TO service_role;

-- ── Seed: reproduce today's truth EXACTLY (one row — Property Pulse × image_quote) ──
-- Idempotent: re-applying is a no-op on the (client_id, format) pair.
INSERT INTO c.client_creative_governance
  (client_id, format, contract_ref, declarative_registry_ref, render_label, enabled)
VALUES
  ('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',   -- Property Pulse
   'image_quote',
   'property_pulse.image_quote.news_card',   -- image-worker/creative_contract.ts contract_ref
   'property-pulse.json',
   'creative_library_b1_production',
   true)
ON CONFLICT (client_id, format) DO NOTHING;
