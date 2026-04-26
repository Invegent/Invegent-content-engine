-- Stage 9.041 — slots_in_critical_window view (§B.11)
--
-- Slots scheduled to publish within the next 4 hours that are not yet
-- filled/approved/published. Tagged with urgency:
--   critical = publish in <= 1h
--   warning  = publish in 1-2h
--   info     = publish in 2-4h
--
-- Used by scan_critical_windows function for alerting; also surfaceable
-- in the dashboard.

CREATE OR REPLACE VIEW m.slots_in_critical_window AS
SELECT
  s.slot_id,
  s.client_id,
  c.client_name,
  s.platform,
  s.scheduled_publish_at,
  s.fill_window_opens_at,
  s.status,
  s.fill_lead_time_minutes,
  s.skip_reason,
  ROUND((EXTRACT(epoch FROM (s.scheduled_publish_at - NOW())) / 60.0)::numeric, 1)
    AS minutes_until_publish,
  CASE
    WHEN s.scheduled_publish_at <= NOW() + interval '1 hour'  THEN 'critical'
    WHEN s.scheduled_publish_at <= NOW() + interval '2 hours' THEN 'warning'
    WHEN s.scheduled_publish_at <= NOW() + interval '4 hours' THEN 'info'
  END AS urgency
FROM m.slot s
JOIN c.client c ON c.client_id = s.client_id
WHERE s.scheduled_publish_at >  NOW()
  AND s.scheduled_publish_at <= NOW() + interval '4 hours'
  AND s.status IN ('future', 'pending_fill', 'fill_in_progress')
ORDER BY s.scheduled_publish_at ASC;

COMMENT ON VIEW m.slots_in_critical_window IS
  'Slots in next 4h not yet filled/approved/published. Urgency: critical (<1h) | warning (1-2h) | info (2-4h). Stage 9.041.';
