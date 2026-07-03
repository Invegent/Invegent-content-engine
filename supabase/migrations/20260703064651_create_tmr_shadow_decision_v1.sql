-- Migration: create_tmr_shadow_decision_v1
-- TMR Shadow-Mode Stamping — c.tmr_shadow_decision (shadow decision record table, S0 lane)
--
-- Design:  docs/briefs/tmr-shadow-mode-stamping-design-packet.md
--          (§3a record home · §3c divergence taxonomy · §3d hard boundaries — PK-accepted,
--           registers v4.80 record the ratified Gate-1 decisions 1–6)
-- Mirror:  supabase/migrations/20260703035154_create_select_template_v1.sql and
--          20260703002813_create_resolve_slot_assets_v1.sql (posture precedents) +
--          schema-c sibling table grant posture (Lane A audit: postgres ALL ·
--          service_role CRUD · inspector_ro SELECT · nothing to anon/authenticated).
--
-- WHAT IT IS
--   One row per shadowed event: what TMR (public.select_template, composed with
--   public.resolve_slot_assets) WOULD have selected for a real Property Pulse draft/render,
--   stored beside what production ACTUALLY did (extracted from m.post_render_log.render_spec),
--   plus a computed divergence classification (ratified taxonomy, design packet §3c) and the
--   registry state at compute time (design packet R2: shadow answers "what TMR would pick NOW
--   for that event" — computed_at + registry_context make the stale-at-compute semantics
--   explicit, recorded, never hidden).
--
-- S0-ONLY PURPOSE
--   This table exists to receive the S0 retroactive batch
--   (_harness/s0-shadow-retroactive-batch.sql, batch_label 's0-retroactive-2026-07' — the
--   rollback key) over the 17-render / 14-draft historical creative_library_b1_production
--   pool. Forward stamping (S1) is DEFERRED to its own gate (ratified decision 3) and is NOT
--   built by this migration.
--
-- NON-CLAIMS (hard boundaries, design packet §3d)
--   · Shadow rows grant NO status: nothing is approved, proven, enabled, or promoted by a
--     row existing here.
--   · Consumed by NOTHING at runtime: no worker, EF, trigger, view, cron, publisher,
--     dashboard, Format Mix, or enablement path reads this table. A shadow failure can never
--     fail a render.
--   · Writes NOTHING outside itself: shadow reads production tables; only this table is
--     written. m.post_draft / render_spec / queue / publisher surfaces are never touched.
--   · No production consumer ships with this migration — it ships dark.
--
-- IDEMPOTENCY KEY
--   render_log_id is UNIQUE where NOT NULL (partial unique index) — one shadow row per
--   historical render. render_log_id stays nullable so future (S1, separately gated)
--   draft-time events without a render can share the table.
--
-- SECURITY POSTURE (service-fenced like schema-c siblings)
--   RLS ENABLED with ZERO policies (deny-by-default) · service_role CRUD · inspector_ro
--   SELECT (grant present; RLS still yields zero rows to inspector_ro — deny-by-default,
--   mirroring sibling posture) · NO grants to anon / authenticated (revoking PUBLIC alone is
--   insufficient — anon and authenticated are named explicitly).
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED. Do not run it without explicit
--    PK apply approval.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   Full:          DROP TABLE IF EXISTS c.tmr_shadow_decision;
--   S0-batch only: DELETE FROM c.tmr_shadow_decision WHERE batch_label = 's0-retroactive-2026-07';

CREATE TABLE c.tmr_shadow_decision (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_draft_id     uuid        NOT NULL,
  render_log_id     uuid        NULL,      -- m.post_render_log.render_log_id; UNIQUE where not null (partial index below)
  client_id         uuid        NOT NULL,
  platform          text        NULL,
  format            text        NOT NULL,
  seed_used         text        NULL,      -- ratified decision 6: S0 uses seed = post_draft_id::text
  computed_at       timestamptz NOT NULL DEFAULT now(),
  selector_version  text        NOT NULL,  -- e.g. 'select_template_v1@20260703035154'
  selector_output   jsonb       NOT NULL,  -- FULL select_template payload (status/selected/slot_resolution/alternatives/rejected/warnings/context)
  production_actual jsonb       NOT NULL,  -- extracted from m.post_render_log.render_spec (see S0 harness)
  divergence        jsonb       NOT NULL,  -- {primary_class, template_match, background_match, asset_matches jsonb, notes}
  registry_context  jsonb       NOT NULL,  -- {selectable_count, proposed_count, visual_proofs, ...} at compute time (design packet R2)
  batch_label       text        NOT NULL,  -- 's0-retroactive-2026-07' (rollback key)
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tmr_shadow_decision_primary_class_check CHECK (
    (divergence->>'primary_class') IN (
      'agreement',
      'expected_structural_divergence',
      'background_divergence',
      'selector_disagreement',
      'selector_fail_closed'))
);

-- Idempotency key for S0 rows: at most one shadow row per historical render.
CREATE UNIQUE INDEX tmr_shadow_decision_render_log_id_uniq
  ON c.tmr_shadow_decision (render_log_id)
  WHERE render_log_id IS NOT NULL;

COMMENT ON TABLE c.tmr_shadow_decision IS
'TMR shadow-mode decision record: what select_template WOULD have picked per PP draft/render vs what production actually did (render_spec extract), with ratified divergence taxonomy. Shadow rows grant no status and are consumed by nothing at runtime (design packet §3d). S0 retroactive batch keyed by batch_label; render_log_id unique where not null. Service-fenced: RLS-on-zero-policies, service_role CRUD, inspector_ro SELECT, no anon/authenticated grants.';

-- ── Posture: deny-by-default (RLS on, ZERO policies), service-fenced like schema-c siblings ──
ALTER TABLE c.tmr_shadow_decision ENABLE ROW LEVEL SECURITY;

-- Revoking PUBLIC alone is insufficient — name anon and authenticated explicitly.
REVOKE ALL ON TABLE c.tmr_shadow_decision FROM PUBLIC;
REVOKE ALL ON TABLE c.tmr_shadow_decision FROM anon, authenticated;

-- Sibling-grant mirror (Lane A audit: postgres ALL [owner] · service_role CRUD · inspector_ro SELECT).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE c.tmr_shadow_decision TO service_role;
GRANT SELECT ON TABLE c.tmr_shadow_decision TO inspector_ro;
