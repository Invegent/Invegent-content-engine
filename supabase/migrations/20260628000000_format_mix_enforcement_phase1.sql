-- 20260628000000_format_mix_enforcement_phase1.sql
-- =====================================================================
-- FORMAT MIX ENFORCEMENT — PHASE 1 (Option B: enforce at materialise time)
-- =====================================================================
--
-- SCOPE: Make the weekly slot materialiser place a *format mix* across the
--   week's occurrences instead of stamping every slot with the single
--   client preferred_format_<platform>. Function-body-only (CREATE OR
--   REPLACE). NO table/schema/DDL. NO grant changes. NO caller/worker
--   changes. m.fill_pending_slots is NOT touched.
--
-- OPTION B: the mix is enforced when slots are *materialised* (one format
--   chosen per slot ordinal), NOT by a downstream re-balancer. fill_pending_
--   slots continues to consume format_preference[1] unchanged.
--
-- AMENDMENT A (week-anchored, position-indexed, convergent allocation):
--   For each enrolled (client, platform), the FULL ISO-week occurrence set
--   is enumerated (Monday-anchored, past + future, NO future-filter) so each
--   occurrence has a STABLE 1-based ordinal. A Hamilton (largest-remainder)
--   allocation over the ACTUAL occurrence count N is spread via smooth
--   weighted round-robin; the slot at ordinal k gets assignment[k]. Because
--   the ordinal set is anchored to the week (not to "now"), re-running the
--   materialiser on later nights produces the SAME format for the SAME slot
--   (convergence). materialise_slots v2 does NOT trust grid.weekly_slot_count;
--   it re-allocates over the actual occurrence count.
--
-- AMENDMENT B (synthesize + quality policy guard):
--   The allocatable format set is intersected with formats that have BOTH a
--   current t.format_synthesis_policy AND a current t.format_quality_policy.
--   A format enabled in client_format_config but missing either policy is
--   EXCLUDED (0 slots) — this avoids handing fill_pending_slots a format it
--   would fail with skip_reason 'format_policy_missing'. Dropped share is
--   reallocated by normalising surviving shares to sum 100.
--
-- PHASE-1 GATE (PP-only, fail-closed):
--   m.format_mix_enrolled(client) is a temporary hardcoded gate returning
--   true ONLY for Property Pulse (4036a6b5-b4a3-406e-998d-c2fe14a8bbdd) and
--   false for everyone else. Non-enrolled clients take the BYTE-IDENTICAL
--   legacy preferred_format_<platform> path. Enrolled path also falls back
--   to legacy if the allocatable set is empty / N=0 / ordinal not found
--   (fail-closed; never emits empty or garbage format_preference).
--
-- max_per_week: NOT enforced in Phase 1 (the current materialise_slots does
--   not enforce it either); recorded here as a future guardrail.
--
-- INVARIANTS PRESERVED on each replaced function:
--   * m.materialise_slots — SECURITY DEFINER, SET search_path 'public','pg_temp',
--     LANGUAGE plpgsql, returns jsonb {inserted, skipped_already_exist,
--     days_forward, ran_at}. Same INSERT columns + ON CONFLICT DO NOTHING.
--   * m.build_weekly_demand_grid — STABLE (NOT security definer), same
--     signature + same return columns (client_id, platform, ice_format_key,
--     share_pct, weekly_slot_count).
--   * m.allocate_week_formats — NEW pure helper, IMMUTABLE, no I/O / random / now.
--   * m.format_mix_enrolled — NEW pure helper, IMMUTABLE.
--   Owner/grants on the replaced functions are unchanged by CREATE OR REPLACE
--   (Postgres preserves owner + ACL across OR REPLACE). The two NEW helpers
--   acquire default ownership/grants on apply — flag for db-rls-auditor.
--
-- STATUS: NOT YET APPLIED. PK-gated apply later (apply order: helpers ->
--   grid v2 -> materialise v2). m.compute_rule_slot_times is unchanged and is
--   the timing source of truth (occurrence formula matched exactly below).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Helper 1: m.format_mix_enrolled(uuid) -> boolean
-- PHASE 1 PROOF ONLY — temporary hardcoded PP gate; MUST migrate to a real
-- config/enrollment model before multi-client rollout; defaults false
-- (fail-closed).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.format_mix_enrolled(p_client_id uuid)
  RETURNS boolean
  LANGUAGE sql
  IMMUTABLE
AS $$
  SELECT p_client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid;
$$;


-- ---------------------------------------------------------------------
-- Helper 2: m.allocate_week_formats(p_formats jsonb, p_n integer) -> text[]
-- Pure / deterministic / IMMUTABLE. No I/O, no random(), no now().
--   p_formats = JSON array of {"key":text,"share":numeric}
--   returns text[] of length p_n, one format per 1-based slot ordinal.
-- Algorithm:
--   1. p_n<=0 OR empty formats -> '{}'.
--   2. Hamilton (largest-remainder): floor(share/100*n) base seats, then
--      +1 to the highest remainders. Sort rem DESC, share DESC, key ASC.
--      All-zero shares -> even split by key ASC.
--   3. Smooth weighted round-robin spread: for each of n positions, pick the
--      format minimising (assigned+1)/count (only among formats with
--      assigned<count), tie-break share DESC, key ASC; increment its
--      assigned. Interleaves formats, fully deterministic.
--   4. Per-format output totals == Hamilton counts; output length == n.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.allocate_week_formats(p_formats jsonb, p_n integer)
  RETURNS text[]
  LANGUAGE plpgsql
  IMMUTABLE
AS $$
DECLARE
  v_m           integer;        -- number of distinct formats
  v_total_share numeric;
  v_all_zero    boolean;
  v_keys        text[];         -- format keys, indexed 1..v_m
  v_shares      numeric[];      -- shares, aligned to v_keys
  v_cnt         integer[];      -- Hamilton seat counts, aligned to v_keys
  v_asg         integer[];      -- assigned-so-far, aligned to v_keys
  v_base_sum    integer;
  v_result      text[] := ARRAY[]::text[];
  v_pos         integer;
  v_i           integer;
  v_best_i      integer;
  v_best_ratio  numeric;
BEGIN
  -- 1. degenerate inputs
  IF p_n IS NULL OR p_n <= 0 THEN
    RETURN ARRAY[]::text[];
  END IF;
  IF p_formats IS NULL OR jsonb_typeof(p_formats) <> 'array'
     OR jsonb_array_length(p_formats) = 0 THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Materialise the input into aligned arrays, ordered deterministically by
  -- key ASC so identical inputs always produce identical internal ordering.
  SELECT array_agg(key ORDER BY key ASC),
         array_agg(share ORDER BY key ASC)
    INTO v_keys, v_shares
  FROM (
    SELECT (e->>'key')::text AS key,
           COALESCE((e->>'share')::numeric, 0) AS share
    FROM jsonb_array_elements(p_formats) e
  ) s;

  v_m := COALESCE(array_length(v_keys, 1), 0);
  IF v_m = 0 THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT COALESCE(sum(x), 0), bool_and(COALESCE(x, 0) = 0)
    INTO v_total_share, v_all_zero
  FROM unnest(v_shares) x;

  -- 2. Hamilton (largest-remainder) seat counts.
  v_cnt := array_fill(0, ARRAY[v_m]);
  v_asg := array_fill(0, ARRAY[v_m]);

  IF v_all_zero OR v_total_share = 0 THEN
    -- even split by key ASC: first (n mod m) keys (already key-sorted) get +1.
    FOR v_i IN 1 .. v_m LOOP
      v_cnt[v_i] := (p_n / v_m) + CASE WHEN (v_i - 1) < (p_n % v_m) THEN 1 ELSE 0 END;
    END LOOP;
  ELSE
    -- raw_i = (share_i / total) * n ; floor + largest-remainder distribution.
    -- Defensively normalise against the actual total (shares assumed ~100).
    DECLARE
      v_rem   numeric[];
      v_fl    integer;
      v_raw   numeric;
      v_order integer[];  -- format indices ordered by (rem DESC, share DESC, key ASC)
      v_left  integer;
    BEGIN
      v_rem := array_fill(0::numeric, ARRAY[v_m]);
      v_base_sum := 0;
      FOR v_i IN 1 .. v_m LOOP
        v_raw := (v_shares[v_i] / v_total_share) * p_n;
        v_fl  := floor(v_raw)::integer;
        v_cnt[v_i] := v_fl;
        v_rem[v_i] := v_raw - v_fl;
        v_base_sum := v_base_sum + v_fl;
      END LOOP;

      v_left := p_n - v_base_sum;

      -- order indices by remainder DESC, share DESC, key ASC (key order == index order).
      SELECT array_agg(idx ORDER BY v_rem[idx] DESC, v_shares[idx] DESC, v_keys[idx] ASC)
        INTO v_order
      FROM generate_series(1, v_m) idx;

      FOR v_i IN 1 .. v_left LOOP
        v_cnt[v_order[v_i]] := v_cnt[v_order[v_i]] + 1;
      END LOOP;
    END;
  END IF;

  -- 3. Smooth weighted round-robin spread over n positions.
  --    Each position: pick the format minimising (asg+1)/cnt among formats
  --    with remaining seats (asg<cnt); tie-break share DESC, key ASC (the
  --    arrays are key-sorted, so earlier index == lower key for equal share).
  FOR v_pos IN 1 .. p_n LOOP
    v_best_i := NULL;
    v_best_ratio := NULL;
    FOR v_i IN 1 .. v_m LOOP
      IF v_asg[v_i] < v_cnt[v_i] THEN
        IF v_best_i IS NULL
           OR ((v_asg[v_i] + 1)::numeric / v_cnt[v_i]) < v_best_ratio
           OR ( ((v_asg[v_i] + 1)::numeric / v_cnt[v_i]) = v_best_ratio
                AND v_shares[v_i] > v_shares[v_best_i] )
        THEN
          v_best_i := v_i;
          v_best_ratio := (v_asg[v_i] + 1)::numeric / v_cnt[v_i];
        END IF;
      END IF;
    END LOOP;

    -- v_best_i is guaranteed non-null: remaining seats == p_n - (v_pos-1) > 0.
    v_result := v_result || v_keys[v_best_i];
    v_asg[v_best_i] := v_asg[v_best_i] + 1;
  END LOOP;

  RETURN v_result;
END;
$$;


-- ---------------------------------------------------------------------
-- m.build_weekly_demand_grid — v2 (same signature, same return columns)
-- STABLE (NOT security definer) — preserved from original.
--
-- Backward-compatible columns: (client_id, platform, ice_format_key,
--   share_pct, weekly_slot_count). This grid benefits the seed path if ever
--   re-enabled; materialise_slots v2 uses share_pct (the normalised mix) but
--   does NOT trust weekly_slot_count (it re-allocates over ACTUAL occurrences).
--
-- Allocatable-set construction:
--   (1) UNION of t.platform_format_mix_default(is_current) keys AND
--       c.client_format_mix_override(is_current, this client) keys, so
--       override-only rows are NOT dropped.
--       share = COALESCE(override_share_pct, default_share_pct, 0).
--   (2) Enablement with platform precedence: a platform-specific
--       client_format_config row wins over a NULL-platform row; NULL-platform
--       applies only when no platform-specific row exists; NO config row at
--       all -> NOT allocatable (fail-closed). Keep only is_enabled = true.
--   (3) Amendment B: intersect with formats having BOTH a current
--       t.format_synthesis_policy AND a current t.format_quality_policy.
--   (4) Unsupported platform/format pairs are excluded by (1)-(3).
--   (5) Normalise surviving shares to sum 100 over the allocatable set.
--   (6) weekly_slot_count = Hamilton over slots_per_platform.weekly_slots
--       using the normalised shares (backward-compat only).
--   (7) Return rows only for the allocatable set; ORDER BY platform,
--       share_pct DESC, ice_format_key.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
  RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
  LANGUAGE plpgsql
  STABLE
AS $$
-- Prefer table columns over the RETURNS TABLE OUT variables (client_id,
-- platform, ice_format_key, share_pct, weekly_slot_count) when a bare name
-- could resolve to either — avoids "column reference ambiguous" in the CTEs.
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH slots_per_platform AS (
    SELECT cps.platform, COUNT(*)::integer AS weekly_slots
    FROM c.client_publish_schedule cps
    WHERE cps.client_id = p_client_id AND cps.enabled = true
    GROUP BY cps.platform
  ),
  -- (1) UNION of default keys and this client's override keys.
  candidate AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct AS share_pct
    FROM t.platform_format_mix_default d
    WHERE d.is_current = true
    UNION
    SELECT o.platform, o.ice_format_key, NULL::numeric
    FROM c.client_format_mix_override o
    WHERE o.client_id = p_client_id AND o.is_current = true
  ),
  candidate_share AS (
    -- collapse to one row per (platform, ice_format_key); prefer override share.
    SELECT cand.platform, cand.ice_format_key,
           COALESCE(
             (SELECT o.override_share_pct
                FROM c.client_format_mix_override o
               WHERE o.client_id = p_client_id AND o.is_current = true
                 AND o.platform = cand.platform AND o.ice_format_key = cand.ice_format_key
               LIMIT 1),
             max(cand.share_pct),  -- default_share_pct if present
             0
           ) AS share_pct
    FROM candidate cand
    GROUP BY cand.platform, cand.ice_format_key
  ),
  -- (2) Enablement with platform precedence.
  enabled_set AS (
    SELECT cs.platform, cs.ice_format_key, cs.share_pct
    FROM candidate_share cs
    WHERE EXISTS (
      -- platform-specific row wins; else NULL-platform row applies.
      SELECT 1
      FROM c.client_format_config cfg
      WHERE cfg.client_id = p_client_id
        AND cfg.ice_format_key = cs.ice_format_key
        AND cfg.is_enabled = true
        AND (
          cfg.platform = cs.platform
          OR (
            cfg.platform IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM c.client_format_config cfg2
              WHERE cfg2.client_id = p_client_id
                AND cfg2.ice_format_key = cs.ice_format_key
                AND cfg2.platform = cs.platform
            )
          )
        )
    )
  ),
  -- (3) Amendment B: BOTH current synthesis + quality policy.
  policy_backed AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
    FROM enabled_set es
    WHERE EXISTS (SELECT 1 FROM t.format_synthesis_policy sp
                   WHERE sp.ice_format_key = es.ice_format_key AND sp.is_current = true)
      AND EXISTS (SELECT 1 FROM t.format_quality_policy qp
                   WHERE qp.ice_format_key = es.ice_format_key AND qp.is_current = true)
  ),
  -- (5) Normalise surviving shares to sum 100 per platform.
  per_platform_total AS (
    SELECT pb.platform AS platform, NULLIF(SUM(pb.share_pct), 0) AS total_share
    FROM policy_backed pb
    GROUP BY pb.platform
  ),
  normalised AS (
    SELECT pb.platform, pb.ice_format_key,
           CASE
             WHEN ppt.total_share IS NULL
               -- all-zero shares: even split across the surviving set.
               THEN 100.0 / NULLIF(COUNT(*) OVER (PARTITION BY pb.platform), 0)
             ELSE pb.share_pct * 100.0 / ppt.total_share
           END AS share_pct
    FROM policy_backed pb
    JOIN per_platform_total ppt ON ppt.platform = pb.platform
  ),
  -- (6) Hamilton weekly_slot_count over slots_per_platform (backward-compat).
  with_slots AS (
    SELECT n.platform, n.ice_format_key, n.share_pct,
           COALESCE(sp.weekly_slots, 0) AS weekly_slots
    FROM normalised n
    LEFT JOIN slots_per_platform sp ON sp.platform = n.platform
  ),
  raw_alloc AS (
    SELECT ws.platform, ws.ice_format_key, ws.share_pct, ws.weekly_slots,
           (ws.share_pct / 100.0) * ws.weekly_slots AS raw,
           floor((ws.share_pct / 100.0) * ws.weekly_slots)::integer AS fl,
           ((ws.share_pct / 100.0) * ws.weekly_slots)
             - floor((ws.share_pct / 100.0) * ws.weekly_slots) AS rem
    FROM with_slots ws
  ),
  alloc_ranked AS (
    SELECT ra.*,
           row_number() OVER (
             PARTITION BY ra.platform
             ORDER BY ra.rem DESC, ra.share_pct DESC, ra.ice_format_key ASC
           ) AS rk,
           SUM(ra.fl) OVER (PARTITION BY ra.platform) AS base_sum,
           MAX(ra.weekly_slots) OVER (PARTITION BY ra.platform) AS plat_slots
    FROM raw_alloc ra
  )
  SELECT p_client_id AS client_id,
         ar.platform,
         ar.ice_format_key,
         ar.share_pct,
         (ar.fl + CASE WHEN ar.rk <= (ar.plat_slots - ar.base_sum) THEN 1 ELSE 0 END)::integer
           AS weekly_slot_count
  FROM alloc_ranked ar
  ORDER BY ar.platform, ar.share_pct DESC, ar.ice_format_key;
END;
$$;


-- ---------------------------------------------------------------------
-- m.materialise_slots — v2
-- SECURITY DEFINER, SET search_path 'public','pg_temp' — PRESERVED.
-- LANGUAGE plpgsql. Returns jsonb {inserted, skipped_already_exist,
--   days_forward, ran_at} — PRESERVED.
--
-- Non-enrolled clients: BYTE-IDENTICAL legacy preferred_format_<platform>
--   path (unchanged from the original function).
--
-- Enrolled clients (Amendment A): the week's FULL ISO-week occurrence set is
--   enumerated per (client, platform, Monday-of-S-week); each occurrence gets
--   a stable 1-based ordinal (ORDER BY occ_ts ASC, past + future, NO future-
--   filter). The grid's allocatable set + normalised shares feed
--   m.allocate_week_formats over the ACTUAL occurrence count N; the slot at
--   ordinal_of_S receives assignment[ordinal_of_S].
--   Fail-closed to legacy if: not enrolled, no grid rows, N=0, or S not found
--   in the enumerated set.
--
--   Occurrence formula matches m.compute_rule_slot_times exactly:
--     occ_ts = (wk_monday + (day_of_week-1) days + publish_time)::timestamp
--                AT TIME ZONE client_tz
--   isodow: 1=Mon..7=Sun; date_trunc('week', d) = Monday.
--
-- The per-(platform, week) allocation is cached in a temp table so it is
--   computed once and reused across that week's slots — the per-slot result
--   is byte-identical to the per-slot algorithm and convergence holds.
--
-- max_per_week: NOT enforced in Phase 1 (parity with current function);
--   recorded as a future guardrail.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.materialise_slots(p_days_forward integer DEFAULT 7)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count  integer := 0;
  v_rule           record;
  v_slot_time      timestamptz;
  v_format_pref    text[];
  v_preferred_fmt  text;
  -- enrolled-path locals
  v_enrolled       boolean;
  v_tz             text;
  v_local_date     date;
  v_wk_monday      date;
  v_cache          jsonb;        -- {"<platform>|<wk_monday>": ["fmt1","fmt2",...]}
  v_cache_key      text;
  v_assignment     text[];
  v_n              integer;
  v_ordinal        integer;
  v_shares_json    jsonb;
  v_chosen         text;
BEGIN
  FOR v_rule IN
    SELECT cps.schedule_id, cps.client_id, cps.platform, cps.day_of_week, cps.publish_time
    FROM c.client_publish_schedule cps
    JOIN c.client c ON c.client_id = cps.client_id AND c.status = 'active'
    WHERE cps.enabled = TRUE
  LOOP
    v_enrolled := m.format_mix_enrolled(v_rule.client_id);

    -- ----- legacy preferred_format_<platform> (BYTE-IDENTICAL to original) -----
    v_format_pref := ARRAY[]::text[];
    v_preferred_fmt := NULL;
    IF v_rule.platform = 'facebook' THEN
      SELECT preferred_format_facebook INTO v_preferred_fmt FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'facebook' AND status = 'active' AND publish_enabled = TRUE LIMIT 1;
    ELSIF v_rule.platform = 'instagram' THEN
      SELECT preferred_format_instagram INTO v_preferred_fmt FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'instagram' AND status = 'active' AND publish_enabled = TRUE LIMIT 1;
    ELSIF v_rule.platform = 'linkedin' THEN
      SELECT preferred_format_linkedin INTO v_preferred_fmt FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'linkedin' AND status = 'active' AND publish_enabled = TRUE LIMIT 1;
    ELSIF v_rule.platform = 'youtube' THEN
      v_preferred_fmt := 'video_short_avatar';
    END IF;
    IF v_preferred_fmt IS NOT NULL THEN v_format_pref := ARRAY[v_preferred_fmt]; END IF;
    -- v_format_pref now holds the legacy assignment (used as fallback below).

    -- Resolve client timezone once per rule (only needed for enrolled path).
    IF v_enrolled THEN
      SELECT timezone INTO v_tz FROM c.client WHERE client_id = v_rule.client_id;
    END IF;

    FOR v_slot_time IN SELECT scheduled_publish_at FROM m.compute_rule_slot_times(v_rule.schedule_id, p_days_forward)
    LOOP
      -- default: legacy format (fail-closed baseline).
      v_chosen := NULL;

      IF v_enrolled AND v_tz IS NOT NULL THEN
        v_local_date := (v_slot_time AT TIME ZONE v_tz)::date;
        v_wk_monday  := date_trunc('week', v_local_date)::date;
        v_cache_key  := v_rule.platform || '|' || v_wk_monday::text;

        -- Build (or reuse cached) full-week assignment for this platform+week.
        IF v_cache IS NULL THEN v_cache := '{}'::jsonb; END IF;
        IF NOT (v_cache ? v_cache_key) THEN
          -- (a) grid: allocatable set + normalised shares for this client+platform.
          SELECT jsonb_agg(jsonb_build_object('key', g.ice_format_key, 'share', g.share_pct)
                           ORDER BY g.share_pct DESC, g.ice_format_key ASC)
            INTO v_shares_json
          FROM m.build_weekly_demand_grid(v_rule.client_id, v_wk_monday) g
          WHERE g.platform = v_rule.platform;

          -- (b) full ISO-week occurrence count N for this client+platform.
          SELECT COUNT(*)::integer INTO v_n
          FROM c.client_publish_schedule s
          WHERE s.client_id = v_rule.client_id AND s.platform = v_rule.platform AND s.enabled = TRUE;

          IF v_shares_json IS NULL OR v_n IS NULL OR v_n = 0 THEN
            v_assignment := ARRAY[]::text[];   -- triggers legacy fallback below.
          ELSE
            v_assignment := m.allocate_week_formats(v_shares_json, v_n);
          END IF;

          v_cache := v_cache || jsonb_build_object(
            v_cache_key,
            to_jsonb(v_assignment)
          );
        END IF;

        -- ordinal of S within the full ISO-week occurrence set (past+future).
        SELECT occ.ordinal INTO v_ordinal
        FROM (
          SELECT s.schedule_id,
                 (v_wk_monday + (s.day_of_week - 1) + s.publish_time)::timestamp AT TIME ZONE v_tz AS occ_ts,
                 row_number() OVER (
                   ORDER BY (v_wk_monday + (s.day_of_week - 1) + s.publish_time)::timestamp AT TIME ZONE v_tz ASC
                 ) AS ordinal
          FROM c.client_publish_schedule s
          WHERE s.client_id = v_rule.client_id AND s.platform = v_rule.platform AND s.enabled = TRUE
        ) occ
        WHERE occ.occ_ts = v_slot_time;

        -- read the cached assignment for this platform+week.
        v_assignment := ARRAY(
          SELECT jsonb_array_elements_text(v_cache -> v_cache_key)
        );

        IF v_ordinal IS NOT NULL
           AND v_assignment IS NOT NULL
           AND array_length(v_assignment, 1) IS NOT NULL
           AND v_ordinal >= 1
           AND v_ordinal <= array_length(v_assignment, 1) THEN
          v_chosen := v_assignment[v_ordinal];
        END IF;
      END IF;

      -- Fail-closed: enrolled-but-unresolved OR non-enrolled -> legacy.
      IF v_chosen IS NOT NULL THEN
        v_format_pref := ARRAY[v_chosen];
      ELSE
        v_format_pref := CASE WHEN v_preferred_fmt IS NOT NULL THEN ARRAY[v_preferred_fmt] ELSE ARRAY[]::text[] END;
      END IF;

      INSERT INTO m.slot (client_id, platform, scheduled_publish_at, format_preference, fill_window_opens_at, fill_lead_time_minutes, status, source_kind, schedule_id)
      VALUES (v_rule.client_id, v_rule.platform, v_slot_time, v_format_pref, v_slot_time - interval '1440 minutes', 1440, 'future', 'scheduled', v_rule.schedule_id)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted_count := v_inserted_count + 1; ELSE v_skipped_count := v_skipped_count + 1; END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted_count, 'skipped_already_exist', v_skipped_count, 'days_forward', p_days_forward, 'ran_at', now());
END;
$$;
