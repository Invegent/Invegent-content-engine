-- Stage 7.035 — Evergreen threshold check + recommendation (D.7/LD12)
--
-- Reads m.evergreen_ratio_7d for one client; picks the live ratio when
-- live sample exists, else falls back to shadow (Phase B observation
-- case where no live drafts have been written yet).
--
-- Returns jsonb with the ratio used, sample size, threshold, alert flag,
-- and a recommendation string the fill function (or operator) can act on.
--
-- LD12 default threshold = 0.30 (30%). Per Stage 13 exit criteria:
-- evergreen ratio < 30% over the week is acceptable.
--
-- STABLE: reads view + table.

CREATE OR REPLACE FUNCTION m.check_evergreen_threshold(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_row              record;
  v_threshold        numeric := 0.30;  -- LD12 default
  v_ratio_for_check  numeric;
  v_sample_size      integer;
  v_source           text;
  v_alert            boolean := false;
  v_recommendation   text;
BEGIN
  SELECT * INTO v_row
  FROM m.evergreen_ratio_7d
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'client_id',       p_client_id,
      'ratio',           NULL,
      'sample_size',     0,
      'source',          'none',
      'threshold',       v_threshold,
      'alert',           false,
      'recommendation',  'no_data',
      'reason',          'Client not active or no slots filled in last 7 days',
      'checked_at',      NOW()
    );
  END IF;

  -- Prefer live when there's a live sample; else shadow
  IF COALESCE(v_row.live_filled_total, 0) > 0 THEN
    v_ratio_for_check := v_row.live_evergreen_ratio;
    v_sample_size     := v_row.live_filled_total;
    v_source          := 'live';
  ELSIF COALESCE(v_row.shadow_filled_total, 0) > 0 THEN
    v_ratio_for_check := v_row.shadow_evergreen_ratio;
    v_sample_size     := v_row.shadow_filled_total;
    v_source          := 'shadow';
  ELSE
    v_ratio_for_check := NULL;
    v_sample_size     := 0;
    v_source          := 'none';
  END IF;

  IF v_ratio_for_check IS NULL THEN
    v_recommendation := 'no_data';
  ELSIF v_ratio_for_check >= v_threshold THEN
    v_alert          := true;
    v_recommendation := 'over_threshold_seed_evergreen_or_widen_pool';
  ELSIF v_ratio_for_check >= v_threshold * 0.7 THEN
    v_recommendation := 'approaching_threshold_monitor';
  ELSE
    v_recommendation := 'healthy';
  END IF;

  RETURN jsonb_build_object(
    'client_id',                 p_client_id,
    'client_name',               v_row.client_name,
    'live_filled_total',         v_row.live_filled_total,
    'live_evergreen_ratio',      v_row.live_evergreen_ratio,
    'shadow_filled_total',       v_row.shadow_filled_total,
    'shadow_evergreen_ratio',    v_row.shadow_evergreen_ratio,
    'ratio_used',                v_ratio_for_check,
    'sample_size',               v_sample_size,
    'source',                    v_source,
    'threshold',                 v_threshold,
    'alert',                     v_alert,
    'recommendation',            v_recommendation,
    'checked_at',                NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.check_evergreen_threshold(uuid) IS
  'D.7/LD12 evergreen threshold check. Prefers live ratio if sample > 0, else shadow. Threshold default 0.30. Returns jsonb with alert + recommendation: healthy | approaching_threshold_monitor | over_threshold_seed_evergreen_or_widen_pool | no_data. STABLE. Stage 7.035.';
