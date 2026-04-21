-- M5 — read RPC for the dashboard Schedule tab.
-- Replaces actions/schedule.ts getPublishSchedule's exec_sql raw-string call
-- with a proper SECURITY DEFINER function. Closes two bugs in one change:
--   1. SQL injection surface (clientId + platform interpolated into SQL body)
--   2. Read-path silent-swallow (same anti-pattern M2 closed on write side)
--
-- Return shape matches the existing ScheduleSlotRow contract in the action
-- (schedule_id::text, day_of_week integer, publish_time HH24:MI string, enabled).
-- No UI change needed.

CREATE OR REPLACE FUNCTION public.get_publish_schedule(
  p_client_id uuid,
  p_platform text
)
RETURNS TABLE (
  schedule_id  text,
  day_of_week  integer,
  publish_time text,
  enabled      boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    schedule_id::text,
    day_of_week,
    to_char(publish_time, 'HH24:MI') AS publish_time,
    enabled
  FROM c.client_publish_schedule
  WHERE client_id = p_client_id
    AND platform  = p_platform
  ORDER BY publish_time, day_of_week;
$$;

GRANT EXECUTE ON FUNCTION public.get_publish_schedule(uuid, text) TO authenticated, service_role;
