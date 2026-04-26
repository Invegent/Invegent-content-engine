-- Stage 5.024 — m.compute_rule_slot_times: generate future timestamps for one schedule rule
-- Returns one row per matching weekday in the next N days, at the rule's publish_time
-- in the client's timezone, expressed as UTC timestamptz.

CREATE OR REPLACE FUNCTION m.compute_rule_slot_times(
  p_schedule_id   uuid,
  p_days_forward  integer DEFAULT 7
)
RETURNS TABLE(scheduled_publish_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_tz    text;
  v_day_of_week  integer;
  v_publish_time time;
BEGIN
  -- Read schedule rule + client timezone
  SELECT cps.day_of_week, cps.publish_time, c.timezone
    INTO v_day_of_week, v_publish_time, v_client_tz
  FROM c.client_publish_schedule cps
  JOIN c.client c ON c.client_id = cps.client_id
  WHERE cps.schedule_id = p_schedule_id;

  IF v_client_tz IS NULL THEN
    RETURN;
  END IF;

  -- Walk every day in the next p_days_forward; emit those whose ISO weekday matches
  -- the rule's day_of_week. Convention: ISO Monday=1, Sunday=7 — matches PG extract(isodow).
  RETURN QUERY
  SELECT (d::date + v_publish_time)::timestamp AT TIME ZONE v_client_tz AS scheduled_publish_at
  FROM generate_series(
    (now() AT TIME ZONE v_client_tz)::date,
    (now() AT TIME ZONE v_client_tz)::date + (p_days_forward - 1),
    interval '1 day'
  ) d
  WHERE EXTRACT(isodow FROM d)::integer = v_day_of_week
    AND ((d::date + v_publish_time)::timestamp AT TIME ZONE v_client_tz) > now();
END;
$$;

COMMENT ON FUNCTION m.compute_rule_slot_times(uuid, integer) IS
  'Returns future timestamptz values when a schedule rule should fire over next N days. ISO weekday convention. Stage 5.024.';
