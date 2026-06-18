-- AGP D-01 Gate-3 Phase 3.1 — avatar shadow-resolver + telemetry (ADDITIVE / SHADOW-ONLY).
--
-- Purpose: measure the nondeterminism of the LIVE avatar pick (heygen-worker's
-- lookupAvatar runs `... LIMIT 1` with NO ORDER BY) WITHOUT changing selection.
-- This migration adds:
--   (a) r.avatar_resolution_shadow — append-only telemetry table.
--   (b) public.resolve_and_record_avatar_shadow(...) — SECURITY DEFINER RPC that
--       re-reads the same candidate set, computes a TOTAL deterministic shadow
--       pick, classifies drift vs the passed-in LIVE pick, and records one row.
--
-- STRICTLY OUT OF SCOPE (must NOT happen here or downstream):
--   * NO change to the live selection path. lookupAvatar / runSubmitPhase pick is
--     authoritative; this telemetry NEVER influences which avatar renders.
--   * NO write to c.brand_avatar / c.brand_stakeholder or any selection state.
--   * NO avatar activation, NO A2 pin change, NO brand_avatar marker backfill,
--     NO stakeholder_role logic change, NO Branch B.
--   * The function writes ONLY r.avatar_resolution_shadow.
--
-- `r` is NOT REST-exposed (direct supabase-js inserts → PGRST106), so the EF
-- writes telemetry via this RPC, never a direct table insert.
--
-- DRAFT — DO NOT APPLY from here. Apply is a gated Phase-3.2 step (PK-run).

-- Idempotency-abort guard: refuse to re-run if the telemetry table already exists,
-- so an accidental second apply is a clear error rather than a silent partial.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'r' AND table_name = 'avatar_resolution_shadow') THEN
    RAISE EXCEPTION 'ABORT: r.avatar_resolution_shadow already exists — AGP D-01 Phase 3.1 already applied?';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- (a) r.avatar_resolution_shadow — append-only shadow telemetry
-- ----------------------------------------------------------------------------
CREATE TABLE r.avatar_resolution_shadow (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolved_at              timestamptz NOT NULL DEFAULT now(),
  post_draft_id            uuid REFERENCES m.post_draft (post_draft_id) ON DELETE SET NULL,  -- nullable FK; telemetry must NOT block/cascade draft deletion
  client_id                uuid,
  stakeholder_role         text,
  render_style             text,
  -- LIVE pick (passed in from the EF — the avatar that ACTUALLY renders)
  live_avatar_id           text,
  live_voice_id            text,
  live_selected_by         text,                  -- role_filter | fallback_limit1 | preset
  -- SHADOW pick (computed here with a TOTAL deterministic order — observational only)
  shadow_avatar_id         text,
  shadow_voice_id          text,
  shadow_rule              text,                  -- primary | default_host | tiebreak_created_at | tiebreak_id | empty
  -- candidate evidence + drift analysis
  candidate_set            jsonb,                 -- ordered candidate rows (deterministic order)
  rejection_reasons        jsonb,                 -- why non-picked candidates lost (per candidate)
  candidate_count          int,
  agree                    boolean,               -- shadow_avatar_id IS NOT DISTINCT FROM live_avatar_id
  agree_but_multicandidate boolean,               -- agree IS TRUE AND candidate_count > 1: shadow==live but >1 candidate (live-nondeterminism surface still present)
  drift_class              text,                  -- none|ordering_drift|marker_drift|candidate_empty|multi_primary|multi_default_host|input_anomaly
  brand_avatar_snapshot_hash text,                -- md5 of ordered candidate rows (for replay)
  created_by_run_id        uuid,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- RLS ON, no policies: service_role bypasses RLS so the RPC's INSERT still works,
-- while anon/authenticated have no policy and no grant. Matches sibling r.* tables + D-003 posture.
ALTER TABLE r.avatar_resolution_shadow ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE r.avatar_resolution_shadow IS
  'AGP D-01 Phase 3.1: append-only SHADOW telemetry measuring nondeterminism of the live avatar pick (lookupAvatar LIMIT 1 with no ORDER BY). Records, per submit, the live pick (passed in), a deterministic shadow pick, the candidate set, and a drift classification. Observational ONLY — never influences selection; this table is written exclusively by public.resolve_and_record_avatar_shadow.';
COMMENT ON COLUMN r.avatar_resolution_shadow.live_avatar_id IS
  'The avatar that ACTUALLY renders (authoritative live pick, passed in from the EF). The shadow columns are never used for rendering.';
COMMENT ON COLUMN r.avatar_resolution_shadow.shadow_rule IS
  'Which rung of the deterministic order produced the shadow pick: primary | default_host | tiebreak_created_at | tiebreak_id | empty.';
COMMENT ON COLUMN r.avatar_resolution_shadow.drift_class IS
  'none (agree) | ordering_drift (>1 candidate, markers false, shadow!=live) | marker_drift (shadow chose a marked primary/default_host) | candidate_empty | multi_primary | multi_default_host | input_anomaly (null/blank render_style).';
COMMENT ON COLUMN r.avatar_resolution_shadow.brand_avatar_snapshot_hash IS
  'md5 of the ordered candidate rows at resolution time — lets a later replay confirm the candidate set was identical.';

CREATE INDEX avatar_resolution_shadow_client_style_resolved_idx
  ON r.avatar_resolution_shadow (client_id, render_style, resolved_at DESC);
CREATE INDEX avatar_resolution_shadow_drift_class_idx
  ON r.avatar_resolution_shadow (drift_class);

-- ----------------------------------------------------------------------------
-- (a.security) Telemetry table grants — service_role + postgres only.
-- `r` is not REST-exposed; revoke any default access and grant least privilege.
-- ----------------------------------------------------------------------------
REVOKE ALL ON r.avatar_resolution_shadow FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON r.avatar_resolution_shadow TO service_role;
GRANT SELECT, INSERT ON r.avatar_resolution_shadow TO postgres;

-- ----------------------------------------------------------------------------
-- (b) public.resolve_and_record_avatar_shadow(...)
--     Re-reads the candidate set exactly like the live filter, computes a TOTAL
--     deterministic shadow pick, classifies drift vs the LIVE pick, records one
--     telemetry row, and returns the decision record. NEVER raises on an empty
--     candidate set. Writes ONLY r.avatar_resolution_shadow.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_and_record_avatar_shadow(
  p_post_draft_id    uuid,
  p_client_id        uuid,
  p_stakeholder_role text,
  p_render_style     text,
  p_live_avatar_id   text,
  p_live_voice_id    text,
  p_live_selected_by text,
  p_run_id           uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidates         jsonb;
  v_candidate_count    int;
  v_shadow             jsonb;
  v_shadow_avatar_id   text;
  v_shadow_voice_id    text;
  v_shadow_rule        text;
  v_primary_count      int;
  v_default_host_count int;
  v_agree              boolean;
  v_agree_but_multicandidate boolean;
  v_drift_class        text;
  v_hash               text;
  v_rejection_reasons  jsonb;
  v_id                 uuid;
  v_input_anomaly      boolean;
BEGIN
  -- input anomaly: live pick is captured upstream, but a null/blank render_style
  -- means the live filter itself was degenerate. Record it but still proceed.
  v_input_anomaly := (p_render_style IS NULL OR btrim(p_render_style) = '');

  -- Candidate set: EXACTLY the live filter (client + is_active + render_style +
  -- optional role join), but read in a TOTAL deterministic order so the shadow
  -- pick is reproducible. The live path uses the SAME WHERE with NO ORDER BY.
  WITH ranked AS (
    SELECT
      ba.brand_avatar_id,
      ba.stakeholder_id,
      bs.role_code,
      ba.heygen_avatar_id,
      ba.heygen_voice_id,
      ba.is_primary,
      ba.is_default_host,
      ba.created_at
    FROM c.brand_avatar ba
    JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
    WHERE ba.client_id = p_client_id
      AND ba.is_active = true
      AND ba.render_style = p_render_style
      AND (p_stakeholder_role IS NULL OR bs.role_code = p_stakeholder_role)
    ORDER BY
      ba.is_primary DESC,
      ba.is_default_host DESC,
      ba.created_at ASC,
      ba.brand_avatar_id ASC
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'brand_avatar_id',  rk.brand_avatar_id,
      'stakeholder_id',   rk.stakeholder_id,
      'role_code',        rk.role_code,
      'heygen_avatar_id', rk.heygen_avatar_id,
      'heygen_voice_id',  rk.heygen_voice_id,
      'is_primary',       rk.is_primary,
      'is_default_host',  rk.is_default_host,
      'created_at',       rk.created_at
    ) ORDER BY rk.is_primary DESC, rk.is_default_host DESC, rk.created_at ASC, rk.brand_avatar_id ASC), '[]'::jsonb),
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE rk.is_primary)::int,
    COUNT(*) FILTER (WHERE rk.is_default_host)::int,
    md5(COALESCE(string_agg(
      rk.brand_avatar_id::text || '|' || COALESCE(rk.heygen_avatar_id,'') || '|' ||
      rk.is_primary::text || '|' || rk.is_default_host::text || '|' || rk.created_at::text,
      ';' ORDER BY rk.is_primary DESC, rk.is_default_host DESC, rk.created_at ASC, rk.brand_avatar_id ASC
    ), ''))
  INTO v_candidates, v_candidate_count, v_primary_count, v_default_host_count, v_hash
  FROM ranked rk;

  -- Shadow pick = first row of the deterministic order (LIMIT 1 over the same set).
  v_shadow := v_candidates -> 0;

  IF v_shadow IS NULL THEN
    -- empty candidate set: never raise. Record candidate_empty and return.
    v_shadow_avatar_id := NULL;
    v_shadow_voice_id  := NULL;
    v_shadow_rule      := 'empty';
  ELSE
    v_shadow_avatar_id := v_shadow ->> 'heygen_avatar_id';
    v_shadow_voice_id  := v_shadow ->> 'heygen_voice_id';
    -- which rung produced the pick (reflects the deterministic order)
    IF (v_shadow ->> 'is_primary')::boolean THEN
      v_shadow_rule := 'primary';
    ELSIF (v_shadow ->> 'is_default_host')::boolean THEN
      v_shadow_rule := 'default_host';
    ELSE
      -- no marker won the top slot → it came down to a tiebreak. If more than one
      -- candidate shares the top created_at, the brand_avatar_id ASC broke the tie.
      IF v_candidate_count > 1
         AND (v_candidates -> 1 ->> 'created_at') = (v_shadow ->> 'created_at')
         AND NOT (v_candidates -> 1 ->> 'is_primary')::boolean
         AND NOT (v_candidates -> 1 ->> 'is_default_host')::boolean THEN
        v_shadow_rule := 'tiebreak_id';
      ELSE
        v_shadow_rule := 'tiebreak_created_at';
      END IF;
    END IF;
  END IF;

  -- agreement: NULL-safe compare of shadow vs LIVE avatar id.
  v_agree := (v_shadow_avatar_id IS NOT DISTINCT FROM p_live_avatar_id);

  -- agree-but-multicandidate: shadow==live yet >1 candidate existed. Surfaces every
  -- multi-candidate resolution even when shadow==live by storage-order luck, so the
  -- live-nondeterminism surface the gate measures is never hidden by a lucky agree.
  v_agree_but_multicandidate := (v_agree IS TRUE AND v_candidate_count > 1);

  -- Drift classification (priority order).
  IF v_input_anomaly THEN
    v_drift_class := 'input_anomaly';
  ELSIF v_candidate_count = 0 THEN
    v_drift_class := 'candidate_empty';
  ELSIF v_primary_count > 1 THEN
    v_drift_class := 'multi_primary';
  ELSIF v_default_host_count > 1 THEN
    v_drift_class := 'multi_default_host';
  ELSIF v_agree THEN
    v_drift_class := 'none';
  ELSIF v_shadow_rule IN ('primary', 'default_host') THEN
    -- shadow chose a marked avatar that the live (no-ORDER-BY) pick missed
    v_drift_class := 'marker_drift';
  ELSE
    -- >1 candidate, markers not decisive, shadow != live → pure ordering nondeterminism
    v_drift_class := 'ordering_drift';
  END IF;

  -- Rejection reasons: for each non-picked candidate, why it lost to the shadow pick.
  IF v_candidate_count > 0 THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'brand_avatar_id', t.cand ->> 'brand_avatar_id',
      'reason', CASE
        WHEN (t.ord - 1) = 0 THEN 'selected'
        WHEN (v_shadow ->> 'is_primary')::boolean AND NOT (t.cand ->> 'is_primary')::boolean
          THEN 'lost_to_primary'
        WHEN (v_shadow ->> 'is_default_host')::boolean AND NOT (t.cand ->> 'is_default_host')::boolean
          THEN 'lost_to_default_host'
        WHEN (t.cand ->> 'created_at') > (v_shadow ->> 'created_at')
          THEN 'newer_created_at'
        ELSE 'lost_on_id_tiebreak'
      END
    ) ORDER BY t.ord), '[]'::jsonb)
    INTO v_rejection_reasons
    FROM jsonb_array_elements(v_candidates) WITH ORDINALITY AS t(cand, ord);
  ELSE
    v_rejection_reasons := '[]'::jsonb;
  END IF;

  -- Record exactly one telemetry row. This is the ONLY write this function performs.
  INSERT INTO r.avatar_resolution_shadow (
    post_draft_id, client_id, stakeholder_role, render_style,
    live_avatar_id, live_voice_id, live_selected_by,
    shadow_avatar_id, shadow_voice_id, shadow_rule,
    candidate_set, rejection_reasons, candidate_count,
    agree, agree_but_multicandidate, drift_class, brand_avatar_snapshot_hash, created_by_run_id
  ) VALUES (
    p_post_draft_id, p_client_id, p_stakeholder_role, p_render_style,
    p_live_avatar_id, p_live_voice_id, p_live_selected_by,
    v_shadow_avatar_id, v_shadow_voice_id, v_shadow_rule,
    v_candidates, v_rejection_reasons, v_candidate_count,
    v_agree, v_agree_but_multicandidate, v_drift_class, v_hash, p_run_id
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'shadow_telemetry_id',        v_id,
    'post_draft_id',              p_post_draft_id,
    'client_id',                  p_client_id,
    'stakeholder_role',           p_stakeholder_role,
    'render_style',               p_render_style,
    'live_avatar_id',             p_live_avatar_id,
    'live_voice_id',              p_live_voice_id,
    'live_selected_by',           p_live_selected_by,
    'shadow_avatar_id',           v_shadow_avatar_id,
    'shadow_voice_id',            v_shadow_voice_id,
    'shadow_rule',                v_shadow_rule,
    'candidate_count',            v_candidate_count,
    'agree',                      v_agree,
    'agree_but_multicandidate',   v_agree_but_multicandidate,
    'drift_class',                v_drift_class,
    'brand_avatar_snapshot_hash', v_hash,
    'candidate_set',              v_candidates,
    'rejection_reasons',          v_rejection_reasons
  );
END;
$$;

COMMENT ON FUNCTION public.resolve_and_record_avatar_shadow(uuid, uuid, text, text, text, text, text, uuid) IS
  'AGP D-01 Phase 3.1: SHADOW avatar resolver + telemetry. Re-reads the live candidate set (c.brand_avatar JOIN c.brand_stakeholder; client + is_active + render_style + optional role) in a TOTAL deterministic order (is_primary DESC, is_default_host DESC, created_at ASC, brand_avatar_id ASC), computes a shadow pick, classifies drift vs the passed-in LIVE pick, and records ONE row in r.avatar_resolution_shadow. Observational ONLY — never influences selection, never writes c.brand_avatar. Never raises on an empty candidate set. SECURITY DEFINER; service_role-only EXECUTE.';

-- ----------------------------------------------------------------------------
-- (b.security) Function grants — service_role only (the EF's server-side caller).
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.resolve_and_record_avatar_shadow(uuid, uuid, text, text, text, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_and_record_avatar_shadow(uuid, uuid, text, text, text, text, text, uuid) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.resolve_and_record_avatar_shadow(uuid, uuid, text, text, text, text, text, uuid) TO service_role;
