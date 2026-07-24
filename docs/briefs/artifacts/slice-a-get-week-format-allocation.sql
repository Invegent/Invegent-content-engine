-- =====================================================================
-- Slice A — public.get_week_format_allocation  (READ-ONLY WRAPPER)
--
-- ⚠⚠ NOT APPLIED. NOT YET A MIGRATION. ⚠⚠
-- Deliberately authored OUTSIDE supabase/migrations/ so no tooling can pick it
-- up. On PK approval at its OWN database gate it moves to supabase/migrations/
-- with a fresh version number and a distinct name (migration name is permanent
-- identity; a revision gets a new number, never the same name with new SQL).
--
-- SCOPE OF THE EXCEPTION (PK, verbatim):
--   "Do not broaden access to schema t, grant direct allocator execution, or
--    expose the internal functions generally."
-- This wrapper is the ONLY widening. It is an exception, not a precedent.
-- It does NOT grant USAGE on t, does NOT grant EXECUTE on m.allocate_week_formats
-- or m.build_weekly_demand_grid, and exposes no internal function generally.
--
-- WHY IT IS NEEDED (proven by execution, not by reading grant tables):
--   A SET ROLE service_role probe against the live database, 2026-07-24:
--     m.allocate_week_formats    -> 42501 permission denied for function
--                                   (proacl = postgres=X/postgres; PUBLIC revoked
--                                    in 20260628000000_format_mix_enforcement_phase1.sql)
--     m.build_weekly_demand_grid -> 42501 permission denied for schema t
--                                   (SECURITY INVOKER; body reads t.*, and
--                                    service_role holds no USAGE on schema t)
--   The dashboard executes as service_role, so it cannot call either directly.
--
-- =====================================================================
-- CONTROL CHECKLIST (PK-mandated) — where each is satisfied
-- =====================================================================
--  1. Fixed, explicit search_path .......... SET search_path TO '' (below)
--  2. Fully qualified object references .... every non-pg_catalog reference is
--                                            schema-qualified: c.client,
--                                            c.client_publish_schedule,
--                                            c.client_publish_profile,
--                                            t."5.3_content_format",
--                                            m.format_mix_enrolled,
--                                            m.build_weekly_demand_grid,
--                                            m.allocate_week_formats
--  3. NO dynamic SQL ....................... no EXECUTE, no format(), no
--                                            string-built statement anywhere
--  4. NO mutation capability ............... STABLE; body contains no INSERT /
--                                            UPDATE / DELETE / TRUNCATE / COPY /
--                                            DDL / nextval / setval
--  5. NO generic function forwarding ....... calls exactly three named functions;
--                                            no function name ever derives from
--                                            input; no regprocedure, no dispatch
--  6. Minimal typed inputs, validated ...... (uuid, date). NULL client rejected;
--                                            unknown client rejected; the date is
--                                            normalised to an ISO Monday and can
--                                            only ever drive a fixed 7-day series
--  7. Minimal output ....................... ONLY the fields Slice A renders.
--                                            Deliberately NOT returned: client_id,
--                                            client_slug, client_status,
--                                            generated_at, occurrence timestamps,
--                                            share percentages, the raw grid, the
--                                            raw platform_support map
--  8. EXECUTE revoked from PUBLIC .......... plus anon AND authenticated named
--                                            explicitly — revoking from PUBLIC
--                                            alone has previously been
--                                            insufficient here, and public
--                                            functions are born anon-executable
--                                            via pg_default_acl
--  9. EXECUTE granted only to service_role . single GRANT, no other grantee
-- 10. Owner pinned ........................ OWNER TO postgres
-- 11. Lower-privileged roles cannot invoke . PROOF §P1 (post-apply, executable)
-- 12. Cannot reach unrelated rows ......... PROOF §P2 (pre-apply, executed)
-- 13. Fails VISIBLY, never false-empty ..... §13 below + PROOF §P3
--
-- =====================================================================
-- §13 — FAIL VISIBLY. THIS IS THE ONE THAT MATTERS MOST.
-- =====================================================================
-- There is deliberately NO EXCEPTION handler in this function. An allocator
-- error MUST propagate to the caller as an error, so the dashboard renders its
-- red "could not be loaded" block. Swallowing it into an empty payload would
-- reintroduce, one layer down, the exact false-empty-state failure Slice A
-- exists to expose. DO NOT ADD A CATCH-ALL HERE.
--
-- Degraded-but-not-error states are reported EXPLICITLY rather than inferred
-- from emptiness, via per-platform allocation_status:
--   'allocated'                    — the allocator ran and assigned every slot
--   'not_enrolled_legacy_fallback' — client not enrolled; production uses the
--                                    legacy preferred format, allocator unused
--   'grid_empty_legacy_fallback'   — enrolled but the demand grid returned no
--                                    allocatable formats for this platform;
--                                    production falls back to legacy
-- An empty platform list and an empty entry list are therefore always a
-- FINDING, never a silent "nothing to show".
--
-- =====================================================================
-- FIDELITY CONTRACT — mirrors m.materialise_slots' enrolled-client path.
-- Any divergence makes the panel lie. Rules copied from that function's body:
--   1. N = matched-occurrence count: enabled schedule rows JOINed to the 7
--      ISO-week dates on EXTRACT(isodow FROM d) = day_of_week.
--      NOT count(*) of enabled rows, NOT grid.weekly_slot_count.
--      day_of_week = 0 (and anything outside 1..7) matches no isodow and is
--      therefore excluded from N — see §Sunday.
--   2. shares = m.build_weekly_demand_grid(client, monday) filtered to the
--      platform, aggregated ORDER BY share_pct DESC, ice_format_key ASC.
--   3. ordinal = row_number() OVER (ORDER BY occurrence timestamp ASC), the
--      occurrence being (date + publish_time) AT TIME ZONE the client's tz.
--      No future-filter, so ordinals are stable across nights.
--   4. The slot at ordinal receives assignment[ordinal].
--   5. Fail-closed to the legacy preferred format when not enrolled, when the
--      grid is empty, or when N = 0 (youtube's legacy is the hardcoded
--      'video_short_avatar', matching materialise_slots).
--
-- §Sunday — DETECT AND LABEL, DO NOT REPAIR.
--   ScheduleTab.tsx writes Sunday as day_of_week = 0; the engine matches ISO
--   Sunday as 7. Such a row saves, shows "Saved ✓", and produces ZERO slots
--   forever — silently. This function reports every enabled row that matches no
--   isodow in `unmatchable_rows`. It does NOT fix the convention, does NOT
--   write, and does NOT activate or rewrite any row. The repair is a separate
--   S2-authored packet with its own gate.
--
-- §p_week_start — m.build_weekly_demand_grid ACCEPTS AND IGNORES its
--   p_week_start parameter (verified via pg_get_functiondef): the grid is
--   week-independent. It is passed through for call-site fidelity with
--   materialise_slots only. The week IS real for occurrence enumeration and
--   ordinals; it is NOT real for the mix. The UI must not imply otherwise.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_week_format_allocation(
  p_client_id  uuid,
  p_week_start date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_tz        text;
  v_monday    date;
  v_enrolled  boolean;
  v_platforms jsonb;
  v_unmatched jsonb;
BEGIN
  -- Control 6 — input validation. Both inputs are strongly typed (uuid, date),
  -- so no string ever reaches a query. Beyond the type system:
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_client',
                              'message', 'No client supplied.');
  END IF;

  SELECT cl.timezone INTO v_tz
  FROM c.client cl
  WHERE cl.client_id = p_client_id;

  IF NOT FOUND THEN
    -- Unknown client is an explicit refusal, never an empty success.
    RETURN jsonb_build_object('error', 'client_not_found',
                              'message', 'No such client.');
  END IF;

  -- Normalise to an ISO Monday. Mirrors materialise_slots, which derives the
  -- week from the slot's LOCAL date. The result can only ever drive a fixed
  -- 7-day generate_series — caller input cannot widen the scanned range.
  v_monday := date_trunc(
                'week',
                COALESCE(p_week_start,
                         (now() AT TIME ZONE COALESCE(v_tz, 'UTC'))::date)
              )::date;

  v_enrolled := m.format_mix_enrolled(p_client_id);

  -- ---------------------------------------------------------------
  -- Enabled rows that can NEVER fire (day_of_week outside isodow 1..7).
  -- The Sunday defect surfaces here. DETECTION ONLY.
  -- ---------------------------------------------------------------
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'platform',     s.platform,
           'schedule_id',  s.schedule_id::text,
           'day_of_week',  s.day_of_week,
           'publish_time', to_char(s.publish_time, 'HH24:MI'),
           'reason_code',  CASE WHEN s.day_of_week = 0
                                THEN 'sunday_written_as_zero'
                                ELSE 'day_of_week_out_of_isodow_range' END
         ) ORDER BY s.platform, s.publish_time), '[]'::jsonb)
    INTO v_unmatched
  FROM c.client_publish_schedule s
  WHERE s.client_id = p_client_id                      -- caller scope, always
    AND s.enabled = true
    AND (s.day_of_week IS NULL OR s.day_of_week NOT BETWEEN 1 AND 7);

  -- ---------------------------------------------------------------
  -- The per-slot allocation, mirroring m.materialise_slots.
  -- NO exception handler — see §13.
  -- ---------------------------------------------------------------
  WITH occ AS (
    SELECT s.platform,
           s.schedule_id,
           s.day_of_week,
           s.publish_time,
           row_number() OVER (
             PARTITION BY s.platform
             ORDER BY (d::date + s.publish_time)::timestamp
                        AT TIME ZONE COALESCE(v_tz, 'UTC') ASC
           ) AS ordinal
    FROM c.client_publish_schedule s
    JOIN generate_series(v_monday, v_monday + 6, interval '1 day') d
      ON EXTRACT(isodow FROM d)::integer = s.day_of_week
    WHERE s.client_id = p_client_id                    -- caller scope, always
      AND s.enabled = true
  ),
  n AS (
    SELECT occ.platform, count(*)::integer AS n
    FROM occ GROUP BY occ.platform
  ),
  grid AS (
    SELECT g.platform,
           jsonb_agg(jsonb_build_object('key', g.ice_format_key, 'share', g.share_pct)
                     ORDER BY g.share_pct DESC, g.ice_format_key ASC) AS shares
    FROM m.build_weekly_demand_grid(p_client_id, v_monday) g
    GROUP BY g.platform
  ),
  alloc AS (
    SELECT n.platform,
           n.n,
           CASE
             WHEN v_enrolled AND grid.shares IS NOT NULL AND n.n > 0
               THEN m.allocate_week_formats(grid.shares, n.n)
             ELSE ARRAY[]::text[]
           END AS a,
           CASE
             WHEN NOT v_enrolled            THEN 'not_enrolled_legacy_fallback'
             WHEN grid.shares IS NULL       THEN 'grid_empty_legacy_fallback'
             ELSE 'allocated'
           END AS allocation_status
    FROM n LEFT JOIN grid ON grid.platform = n.platform
  ),
  legacy AS (
    SELECT a.platform,
           CASE a.platform
             WHEN 'youtube' THEN 'video_short_avatar'
             ELSE (
               SELECT CASE a.platform
                        WHEN 'facebook'  THEN pr.preferred_format_facebook
                        WHEN 'instagram' THEN pr.preferred_format_instagram
                        WHEN 'linkedin'  THEN pr.preferred_format_linkedin
                      END
               FROM c.client_publish_profile pr
               WHERE pr.client_id = p_client_id        -- caller scope, always
                 AND pr.platform = a.platform
                 AND pr.status = 'active'
                 AND pr.publish_enabled = true
               LIMIT 1
             )
           END AS legacy_format
    FROM alloc a
  ),
  marked AS (
    SELECT occ.platform,
           occ.ordinal,
           occ.schedule_id,
           occ.day_of_week,
           occ.publish_time,
           alloc.n,
           alloc.allocation_status,
           l.legacy_format,
           CASE WHEN array_length(alloc.a, 1) IS NOT NULL
                     AND occ.ordinal <= array_length(alloc.a, 1)
                THEN alloc.a[occ.ordinal] END AS allocator_format,
           COALESCE(
             CASE WHEN array_length(alloc.a, 1) IS NOT NULL
                       AND occ.ordinal <= array_length(alloc.a, 1)
                  THEN alloc.a[occ.ordinal] END,
             l.legacy_format
           ) AS assigned_format
    FROM occ
    JOIN alloc ON alloc.platform = occ.platform
    LEFT JOIN legacy l ON l.platform = occ.platform
  ),
  scored AS (
    SELECT mk.*,
           f.ice_format_key AS known_format,
           (f.platform_support ? mk.platform)     AS support_key_present,
           (f.platform_support ->> mk.platform)   AS support_raw
    FROM marked mk
    LEFT JOIN t."5.3_content_format" f
           ON f.ice_format_key = mk.assigned_format
  )
  SELECT COALESCE(jsonb_agg(x.p ORDER BY x.p ->> 'platform'), '[]'::jsonb)
    INTO v_platforms
  FROM (
    SELECT jsonb_build_object(
             'platform',          sc.platform,
             'slot_count',        sc.n,
             'allocation_status', min(sc.allocation_status),
             'legacy_format',     min(sc.legacy_format),
             'invalid_count',     count(*) FILTER (
                                    WHERE NOT COALESCE(sc.support_raw::boolean, false)),
             'entries',           jsonb_agg(jsonb_build_object(
                 'ordinal',           sc.ordinal,
                 'schedule_id',       sc.schedule_id::text,
                 'day_of_week',       sc.day_of_week,
                 'publish_time',      to_char(sc.publish_time, 'HH24:MI'),
                 'assigned_format',   sc.assigned_format,
                 'allocation_source', CASE WHEN sc.allocator_format IS NOT NULL
                                           THEN 'format_mix_allocator'
                                           ELSE 'legacy_preferred_format' END,
                 'is_valid',          COALESCE(sc.support_raw::boolean, false),
                 'invalid_reason_code',
                   CASE
                     WHEN sc.assigned_format IS NULL       THEN 'no_format_assigned'
                     WHEN sc.known_format IS NULL          THEN 'format_key_unknown'
                     WHEN NOT sc.support_key_present       THEN 'platform_absent_from_support_map'
                     WHEN sc.support_raw::boolean IS FALSE THEN 'platform_support_false'
                     ELSE NULL
                   END
               ) ORDER BY sc.ordinal)
           ) AS p
    FROM scored sc
    GROUP BY sc.platform, sc.n
  ) x;

  RETURN jsonb_build_object(
    'contract_version',    'slice_a_allocation_v1',
    'timezone',            COALESCE(v_tz, 'UTC'),
    'week_monday',         v_monday,
    'format_mix_enrolled', v_enrolled,
    'platforms',           COALESCE(v_platforms, '[]'::jsonb),
    'unmatchable_rows',    COALESCE(v_unmatched, '[]'::jsonb)
  );
END;
$function$;

-- Control 10 — owner pinned to the governed database owner.
ALTER FUNCTION public.get_week_format_allocation(uuid, date) OWNER TO postgres;

-- Control 8 — PUBLIC is not sufficient on its own in this database, and
-- pg_default_acl grants EXECUTE to anon + authenticated on every new public
-- function. All three are named explicitly and deliberately.
REVOKE ALL ON FUNCTION public.get_week_format_allocation(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_week_format_allocation(uuid, date) FROM anon;
REVOKE ALL ON FUNCTION public.get_week_format_allocation(uuid, date) FROM authenticated;

-- Control 9 — the dashboard's role, and nothing else.
GRANT EXECUTE ON FUNCTION public.get_week_format_allocation(uuid, date) TO service_role;

COMMENT ON FUNCTION public.get_week_format_allocation(uuid, date) IS
  'Slice A read-only operator-truth panel. Mirrors m.materialise_slots enrolled-client '
  'allocation (matched-occurrence N, isodow join, occurrence-order ordinal, fail-closed '
  'to legacy). Reports demand/allocation ONLY — never the final published format, which '
  'the Advisor writes to m.post_draft.recommended_format. Surfaces enabled schedule rows '
  'that can never fire (day_of_week outside isodow 1..7) without repairing them. '
  'Has no EXCEPTION handler by design: allocator errors must propagate, never become an '
  'empty result.';

-- =====================================================================
-- ROLLBACK (single statement, no data touched, no dependents)
--   DROP FUNCTION public.get_week_format_allocation(uuid, date);
-- Additive and read-only: dropping it restores the exact prior state. The
-- dashboard panel then renders its red "could not be loaded" block, which is
-- the designed degraded behaviour, not a regression.
-- =====================================================================

-- =====================================================================
-- POST-APPLY PROOF §P1 — control 11: lower-privileged roles cannot invoke.
-- MUST be run at the apply gate, immediately after the CREATE. Read-only.
-- EXPECTED: both probes report DENIED with SQLSTATE 42501.
-- =====================================================================
-- DO $p1$
-- DECLARE v_out text := ''; v_cid uuid;
-- BEGIN
--   SELECT client_id INTO v_cid FROM c.client WHERE client_slug = 'property-pulse';
--
--   SET LOCAL ROLE anon;
--   BEGIN
--     PERFORM public.get_week_format_allocation(v_cid, NULL);
--     v_out := v_out || 'anon=INVOKED(FAIL — must be denied); ';
--   EXCEPTION WHEN OTHERS THEN
--     v_out := v_out || 'anon=DENIED[' || SQLSTATE || ']; ';
--   END;
--   RESET ROLE;
--
--   SET LOCAL ROLE authenticated;
--   BEGIN
--     PERFORM public.get_week_format_allocation(v_cid, NULL);
--     v_out := v_out || 'authenticated=INVOKED(FAIL — must be denied); ';
--   EXCEPTION WHEN OTHERS THEN
--     v_out := v_out || 'authenticated=DENIED[' || SQLSTATE || ']; ';
--   END;
--   RESET ROLE;
--
--   SET LOCAL ROLE service_role;
--   BEGIN
--     PERFORM public.get_week_format_allocation(v_cid, NULL);
--     v_out := v_out || 'service_role=OK; ';
--   EXCEPTION WHEN OTHERS THEN
--     v_out := v_out || 'service_role=DENIED[' || SQLSTATE || '] (FAIL — must succeed); ';
--   END;
--   RESET ROLE;
--
--   RAISE NOTICE 'P1: %', v_out;
-- END $p1$;
--
-- And confirm the ACL is exactly one grantee:
--   SELECT array_to_string(proacl, ' | ') FROM pg_proc p
--     JOIN pg_namespace nsp ON nsp.oid = p.pronamespace
--    WHERE nsp.nspname = 'public' AND p.proname = 'get_week_format_allocation';
--   EXPECTED: postgres=X/postgres | service_role=X/postgres   (no anon, no
--   authenticated, no bare '=X/' PUBLIC entry)
--
-- ALSO re-assert the exception did NOT widen anything else:
--   SELECT has_schema_privilege('service_role','t','USAGE')                  -- expect false
--        , has_function_privilege('service_role','m.allocate_week_formats(jsonb,integer)','EXECUTE'); -- expect false
-- =====================================================================
