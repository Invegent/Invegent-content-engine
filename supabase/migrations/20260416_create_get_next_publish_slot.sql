-- public.get_next_publish_slot(p_client_id, p_platform)
-- Returns the next available publish-schedule slot as timestamptz.
-- Returns NULL if no schedule is configured (= publish immediately).
-- Used by publisher Edge Function to defer queue items to their scheduled slot.

CREATE OR REPLACE FUNCTION public.get_next_publish_slot(
  p_client_id UUID,
  p_platform  TEXT
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, c
AS $fn$
DECLARE
  v_tz         TEXT;
  v_now_local  TIMESTAMP;
  v_today_dow  INT;       -- 0=Sun..6=Sat (EXTRACT(DOW ...))
  v_slot_dow   INT;
  v_slot_time  TIME;
  v_days_ahead INT;
BEGIN
  -- Resolve client timezone (default Australia/Sydney)
  SELECT COALESCE(timezone, 'Australia/Sydney') INTO v_tz
  FROM c.client WHERE client_id = p_client_id;
  v_tz := COALESCE(v_tz, 'Australia/Sydney');

  v_now_local := NOW() AT TIME ZONE v_tz;
  v_today_dow := EXTRACT(DOW FROM v_now_local)::INT;

  -- 1) Find the next enabled slot later this week (including later today)
  SELECT day_of_week, publish_time INTO v_slot_dow, v_slot_time
  FROM c.client_publish_schedule
  WHERE client_id = p_client_id
    AND platform  = p_platform
    AND enabled   = true
    AND (
      day_of_week > v_today_dow
      OR (day_of_week = v_today_dow AND publish_time > v_now_local::TIME)
    )
  ORDER BY day_of_week, publish_time
  LIMIT 1;

  -- 2) If nothing remains this week, wrap to the earliest slot next week
  IF v_slot_dow IS NULL THEN
    SELECT day_of_week, publish_time INTO v_slot_dow, v_slot_time
    FROM c.client_publish_schedule
    WHERE client_id = p_client_id
      AND platform  = p_platform
      AND enabled   = true
    ORDER BY day_of_week, publish_time
    LIMIT 1;

    IF v_slot_dow IS NULL THEN
      RETURN NULL;  -- no schedule configured → publish immediately
    END IF;

    -- Wrapped slot is always next week
    v_days_ahead := (v_slot_dow - v_today_dow + 7) % 7;
    IF v_days_ahead = 0 THEN v_days_ahead := 7; END IF;
  ELSE
    v_days_ahead := v_slot_dow - v_today_dow;
  END IF;

  -- Convert local date+time back to timestamptz
  RETURN ((v_now_local::DATE + v_days_ahead) + v_slot_time) AT TIME ZONE v_tz;
END;
$fn$;

COMMENT ON FUNCTION public.get_next_publish_slot IS
  'Returns the next publish-schedule slot (timestamptz) for a client+platform. '
  'Returns NULL if no schedule is configured, meaning publish immediately.';
