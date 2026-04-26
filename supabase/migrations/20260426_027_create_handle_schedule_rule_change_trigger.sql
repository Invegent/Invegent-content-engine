-- Stage 5.027 — Re-materialise affected client's slots on schedule rule change
-- Fires on UPDATE of c.client_publish_schedule.enabled, publish_time, day_of_week.
-- Deletes future-status slots for the affected schedule_id and re-runs materialiser
-- for that client (covering all the client's other schedules too — simpler than
-- per-rule re-materialisation).

CREATE OR REPLACE FUNCTION c.handle_schedule_rule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only re-materialise on meaningful changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.enabled IS NOT DISTINCT FROM NEW.enabled
       AND OLD.publish_time IS NOT DISTINCT FROM NEW.publish_time
       AND OLD.day_of_week IS NOT DISTINCT FROM NEW.day_of_week THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Delete future-status slots tied to the changed schedule
  DELETE FROM m.slot
  WHERE schedule_id = NEW.schedule_id
    AND status = 'future';

  -- Re-materialise (covers all this client's schedules; ON CONFLICT handles duplicates)
  PERFORM m.materialise_slots(7);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION c.handle_schedule_rule_change() IS
  'Trigger function: on c.client_publish_schedule UPDATE of enabled/publish_time/day_of_week, delete affected future slots and re-materialise. Stage 5.027.';

DROP TRIGGER IF EXISTS trg_handle_schedule_rule_change ON c.client_publish_schedule;

CREATE TRIGGER trg_handle_schedule_rule_change
AFTER UPDATE ON c.client_publish_schedule
FOR EACH ROW
EXECUTE FUNCTION c.handle_schedule_rule_change();
