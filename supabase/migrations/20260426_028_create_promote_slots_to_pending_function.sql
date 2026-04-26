-- Stage 5.028 — m.promote_slots_to_pending: future → pending_fill at fill_window_opens_at
-- F8: 10-minute lookahead lets promotion happen slightly early so the fill cron picks
-- up the slot on its next tick.
-- Stage 10 wires this to a 5-minute cron.

CREATE OR REPLACE FUNCTION m.promote_slots_to_pending()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_promoted_count integer;
BEGIN
  UPDATE m.slot
  SET status = 'pending_fill',
      updated_at = now()
  WHERE status = 'future'
    AND fill_window_opens_at <= now() + interval '10 minutes';

  GET DIAGNOSTICS v_promoted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'promoted_count', v_promoted_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.promote_slots_to_pending() IS
  'Promotes future slots to pending_fill when fill_window_opens_at <= now + 10min (F8 buffer). Stage 5.028.';
