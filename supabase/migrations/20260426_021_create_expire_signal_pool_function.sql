-- Stage 4.021 — m.expire_signal_pool: mark entries past pool_expires_at as inactive
-- Runs hourly via cron (registered in Stage 6).

CREATE OR REPLACE FUNCTION m.expire_signal_pool()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count integer;
BEGIN
  UPDATE m.signal_pool
  SET is_active = FALSE,
      updated_at = now()
  WHERE is_active = TRUE
    AND pool_expires_at < now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_count', v_expired_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.expire_signal_pool() IS
  'Marks pool entries past pool_expires_at as is_active=false. Runs hourly. Returns jsonb {expired_count, ran_at}. Stage 4.021.';
