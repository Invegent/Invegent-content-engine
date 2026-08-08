-- cc-0091 A3-1 — durable format-capability drop surface (FORWARD)
--
-- STATUS: NOT APPLIED. Authored under cc-0091 Gate A (brief v3, ISSUED 2026-08-08,
--         pinned 241cb1c1). Gate A applies nothing and changes no live behaviour.
--         Apply + nightly wiring are Gate B, under its behavioural rollout gate,
--         after the production-mutation watch gate (~2026-08-11 20:20 Sydney).
--
-- ROLLBACK: NOT_APPLIED_cc0091_a3_1_format_capability_drop_surface_ROLLBACK_v1.sql
--
-- PK rulings encoded here (2026-08-08):
--   Q1  Materialiser-side table. DO NOT change m.build_weekly_demand_grid's return
--       contract to surface drops.
--   Q2  Bounded retention — 90 days of detailed drop evidence. Long-horizon trend
--       reporting is A5/aggregation's job, not an ever-growing event ledger.
--   Q3  Authored + tested + rollback-proven + frozen in Gate A; NOT applied.
--   C1  DO NOT build a second capability taxonomy. Persist the OUTPUTS of
--       public.classify_format_capability verbatim, including routed_lane. A3 makes an
--       existing decision visible; it does not create another decision system.
--
-- ─── What this creates (all additive; nothing existing is altered) ────────────
--   m.format_capability_drop                  durable evidence table
--   m.detect_format_capability_drops(...)     STABLE detector (reads; writes nothing)
--   m.record_format_capability_drops(...)     VOLATILE writer (Gate B wires this in)
--   m.prune_format_capability_drop(...)       bounded 90-day retention
--   ice_ro.format_capability_drop_status      secret-free operator/dashboard read
--
-- NOT created, NOT wired: no trigger, no cron, no call site inside
-- m.materialise_slots or m.fill_pending_slots. Nothing runs until Gate B wires it.
-- Applying this file alone is therefore behaviour-inert: it adds an unused table and
-- three uncalled functions.
--
-- ─── Design: drops are grounded in the grid's REAL output ─────────────────────
-- The naive approach re-derives the grid's capability predicate in a second place and
-- lets the two drift. This does NOT do that.
--
-- The detector mirrors ONLY `enabled_set` (the mix + client-config candidate set) and
-- then LEFT JOINs against the live m.build_weekly_demand_grid(...) result. A candidate
-- present in enabled_set but ABSENT from the grid output was, by definition, dropped by
-- the grid — whatever the reason, including the platform_support gate AND the
-- select_template fail-closed leg. If the grid's gating ever changes, this detector
-- stays truthful with no edit. The capability predicate is duplicated NOWHERE.
--
-- Residual (named, not hidden): `enabled_set` itself IS mirrored, so a future change to
-- the grid's candidate derivation (t.platform_format_mix_default /
-- c.client_format_mix_override / c.client_format_config joins) must be mirrored here
-- too. The hermetic test suite asserts candidates ⊇ survivors, which fails loudly if
-- the two derivations diverge.
--
-- ─── Evidence preserved (PK Q1: what/who/why/where) ───────────────────────────
--   what was requested  -> requested_format, requested_share_pct
--   for which cell      -> client_id, client_slug, platform, week_start
--   what state caused it-> capability_status  (classifier verbatim)
--   why                 -> reason_code, classifier_evidence (classifier verbatim)
--   where it routes     -> routed_lane        (classifier verbatim; incl. asset_gap_s8)
--   absent vs denied    -> platform_support_raw, platform_support_key_present (RAW facts,
--                          NOT a derived label — the UNPROVEN/UNSUPPORTED_WITH_CAUSE
--                          distinction is derivable from these without a new enum)
--
-- ─── Safety posture ───────────────────────────────────────────────────────────
-- Schema m is NOT PostgREST-exposed, matching sibling m.slot_fill_attempt / m.slot:
-- RLS disabled, grants limited to inspector_ro SELECT. anon/authenticated/PUBLIC are
-- explicitly REVOKEd rather than assumed absent. Functions are SECURITY INVOKER (never
-- DEFINER — no over-grant surface) with SET search_path = '' and fully-qualified names.

BEGIN;

-- ── 1. Durable evidence table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m.format_capability_drop (
  drop_id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observed_at                   timestamptz NOT NULL DEFAULT now(),
  week_start                    date,
  client_id                     uuid NOT NULL,
  client_slug                   text,
  platform                      text NOT NULL,
  requested_format              text NOT NULL,
  requested_share_pct           numeric,
  -- classifier outputs, persisted VERBATIM (PK C1 — no second taxonomy)
  capability_status             text,
  reason_code                   text,
  routed_lane                   text,
  classifier_evidence           jsonb,
  classifier_error              text,
  -- raw platform_support facts (absent-key vs explicit-false); NOT a derived label
  platform_support_raw          text,
  platform_support_key_present  boolean NOT NULL,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.format_capability_drop IS
  'cc-0091 A3-1. Durable evidence that a format carrying a mix share was requested for a '
  'client/platform and dropped by m.build_weekly_demand_grid. Persists the OUTPUTS of '
  'public.classify_format_capability verbatim (status/reason_code/routed_lane/evidence) — '
  'this table defines NO capability taxonomy of its own. Retention: 90 days via '
  'm.prune_format_capability_drop(). Write path: m.record_format_capability_drops().';

COMMENT ON COLUMN m.format_capability_drop.platform_support_key_present IS
  'RAW fact, not a classification: false means the platform key was ABSENT from '
  't."5.3_content_format".platform_support (never stated), true means a value was stated. '
  'With platform_support_raw this distinguishes "unproven" from "explicitly unsupported" '
  'without introducing a second enum.';

CREATE INDEX IF NOT EXISTS ix_fcd_cell
  ON m.format_capability_drop (client_id, platform, week_start);
CREATE INDEX IF NOT EXISTS ix_fcd_observed_at
  ON m.format_capability_drop (observed_at);           -- retention pruning
CREATE INDEX IF NOT EXISTS ix_fcd_routed_lane
  ON m.format_capability_drop (routed_lane)
  WHERE routed_lane IS NOT NULL;                        -- Asset Gap consumption

-- Sibling-consistent exposure posture (m is not REST-exposed).
ALTER TABLE m.format_capability_drop DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON m.format_capability_drop FROM PUBLIC;
REVOKE ALL ON m.format_capability_drop FROM anon;
REVOKE ALL ON m.format_capability_drop FROM authenticated;
GRANT SELECT ON m.format_capability_drop TO inspector_ro;

-- ── 2. Detector — STABLE, writes nothing ─────────────────────────────────────
CREATE OR REPLACE FUNCTION m.detect_format_capability_drops(
  p_client_id  uuid,
  p_week_start date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  client_id                    uuid,
  client_slug                  text,
  platform                     text,
  requested_format             text,
  requested_share_pct          numeric,
  capability_status            text,
  reason_code                  text,
  routed_lane                  text,
  classifier_evidence          jsonb,
  classifier_error             text,
  platform_support_raw         text,
  platform_support_key_present boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_slug text;
BEGIN
  SELECT cl.client_slug INTO v_slug FROM c.client cl WHERE cl.client_id = p_client_id;

  RETURN QUERY
  WITH candidate AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct AS share_pct
      FROM t.platform_format_mix_default d
     WHERE d.is_current = true
    UNION
    SELECT o.platform, o.ice_format_key, NULL::numeric
      FROM c.client_format_mix_override o
     WHERE o.client_id = p_client_id AND o.is_current = true
  ),
  candidate_share AS (
    SELECT cand.platform, cand.ice_format_key,
           COALESCE(
             (SELECT o.override_share_pct
                FROM c.client_format_mix_override o
               WHERE o.client_id = p_client_id AND o.is_current = true
                 AND o.platform = cand.platform AND o.ice_format_key = cand.ice_format_key
               LIMIT 1),
             max(cand.share_pct),
             0
           ) AS share_pct
      FROM candidate cand
     GROUP BY cand.platform, cand.ice_format_key
  ),
  enabled_set AS (   -- mirrors m.build_weekly_demand_grid's enabled_set
    SELECT cs.platform, cs.ice_format_key, cs.share_pct
      FROM candidate_share cs
     WHERE EXISTS (
       SELECT 1 FROM c.client_format_config cfg
        WHERE cfg.client_id = p_client_id
          AND cfg.ice_format_key = cs.ice_format_key
          AND cfg.is_enabled = true
          AND ( cfg.platform = cs.platform
             OR ( cfg.platform IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM c.client_format_config cfg2
                     WHERE cfg2.client_id = p_client_id
                       AND cfg2.ice_format_key = cs.ice_format_key
                       AND cfg2.platform = cs.platform))))
  ),
  survivors AS (   -- the LIVE grid result; the capability predicate is NOT duplicated
    SELECT g.platform, g.ice_format_key
      FROM m.build_weekly_demand_grid(p_client_id, p_week_start) g
  ),
  dropped AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
      FROM enabled_set es
      LEFT JOIN survivors s
        ON s.platform = es.platform AND s.ice_format_key = es.ice_format_key
     WHERE s.ice_format_key IS NULL
  ),
  classified AS (
    SELECT d.platform, d.ice_format_key, d.share_pct,
           CASE WHEN v_slug IS NULL THEN NULL
                ELSE public.classify_format_capability(v_slug, d.platform, d.ice_format_key)
           END AS ev
      FROM dropped d
  )
  SELECT
    p_client_id,
    v_slug,
    cl2.platform,
    cl2.ice_format_key,
    cl2.share_pct,
    cl2.ev ->> 'status',
    cl2.ev ->> 'reason_code',
    cl2.ev ->> 'routed_lane',
    cl2.ev -> 'evidence',
    CASE WHEN v_slug IS NULL THEN 'client_slug_unresolved' ELSE NULL END,
    (cf.platform_support ->> cl2.platform),
    COALESCE(cf.platform_support ? cl2.platform, false)
  FROM classified cl2
  LEFT JOIN t."5.3_content_format" cf
    ON cf.ice_format_key = cl2.ice_format_key;
END;
$function$;

COMMENT ON FUNCTION m.detect_format_capability_drops(uuid, date) IS
  'cc-0091 A3-1. Returns formats that carried a mix share for a client/platform but are '
  'ABSENT from the live m.build_weekly_demand_grid result — i.e. dropped. Grounded in the '
  'grid''s real output, so the capability predicate is duplicated nowhere. STABLE: writes '
  'nothing. Enriches each drop with public.classify_format_capability output verbatim.';

-- ── 3. Writer — VOLATILE; Gate B wires this into the materialiser ────────────
CREATE OR REPLACE FUNCTION m.record_format_capability_drops(
  p_client_id  uuid,
  p_week_start date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE v_n integer;
BEGIN
  INSERT INTO m.format_capability_drop (
    week_start, client_id, client_slug, platform, requested_format, requested_share_pct,
    capability_status, reason_code, routed_lane, classifier_evidence, classifier_error,
    platform_support_raw, platform_support_key_present
  )
  SELECT p_week_start, d.client_id, d.client_slug, d.platform, d.requested_format,
         d.requested_share_pct, d.capability_status, d.reason_code, d.routed_lane,
         d.classifier_evidence, d.classifier_error, d.platform_support_raw,
         d.platform_support_key_present
    FROM m.detect_format_capability_drops(p_client_id, p_week_start) d;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$function$;

COMMENT ON FUNCTION m.record_format_capability_drops(uuid, date) IS
  'cc-0091 A3-1. Persists m.detect_format_capability_drops output. NOT wired to any '
  'trigger or cron by this migration — Gate B owns the nightly call site.';

-- ── 4. Bounded retention (PK Q2: 90 days) ────────────────────────────────────
CREATE OR REPLACE FUNCTION m.prune_format_capability_drop(p_retain_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE v_n integer;
BEGIN
  -- Fail-closed: a zero/negative/NULL retention must never be read as "delete everything".
  IF p_retain_days IS NULL OR p_retain_days < 1 THEN
    RAISE EXCEPTION 'cc-0091 A3-1: p_retain_days must be >= 1 (got %)', p_retain_days;
  END IF;
  DELETE FROM m.format_capability_drop
   WHERE observed_at < now() - make_interval(days => p_retain_days);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$function$;

COMMENT ON FUNCTION m.prune_format_capability_drop(integer) IS
  'cc-0091 A3-1. Bounded 90-day retention for detailed drop evidence (PK Q2). Long-horizon '
  'trend reporting belongs to A5/aggregation, not to this ledger. Fail-closed on '
  'p_retain_days < 1. NOT scheduled by this migration — cron is Gate B''s.';

-- ── 5. Secret-free operator/dashboard read (R0 path) ─────────────────────────
CREATE OR REPLACE VIEW ice_ro.format_capability_drop_status AS
SELECT observed_at, week_start, client_id, client_slug, platform,
       requested_format, requested_share_pct,
       capability_status, reason_code, routed_lane,
       platform_support_raw, platform_support_key_present
  FROM m.format_capability_drop;

COMMENT ON VIEW ice_ro.format_capability_drop_status IS
  'cc-0091 A3-1. R0 read of m.format_capability_drop. Secret-free: classifier_evidence '
  'and classifier_error are deliberately excluded (free-text/diagnostic).';

REVOKE ALL ON ice_ro.format_capability_drop_status FROM PUBLIC;
REVOKE ALL ON ice_ro.format_capability_drop_status FROM anon;
REVOKE ALL ON ice_ro.format_capability_drop_status FROM authenticated;
GRANT SELECT ON ice_ro.format_capability_drop_status TO ice_readonly;

COMMIT;

-- ── POST-APPLY VERIFICATION (behaviour-inertness proof) ──────────────────────
-- 1. Table exists and is EMPTY (nothing is wired, so nothing has written):
--    SELECT count(*) FROM m.format_capability_drop;                -- expect 0
-- 2. No call site was created anywhere:
--    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--     WHERE n.nspname IN ('m','public')
--       AND p.proname NOT IN ('record_format_capability_drops')
--       AND pg_get_functiondef(p.oid) ILIKE '%record_format_capability_drops%';  -- expect 0
-- 3. Detector is read-only and returns without writing:
--    SELECT count(*) FROM m.detect_format_capability_drops(
--      (SELECT client_id FROM c.client WHERE client_slug='property-pulse'), CURRENT_DATE);
--    SELECT count(*) FROM m.format_capability_drop;                -- STILL 0
-- 4. Exposure posture matches siblings:
--    SELECT grantee, privilege_type FROM information_schema.role_table_grants
--     WHERE table_schema='m' AND table_name='format_capability_drop';
--    -- expect inspector_ro:SELECT (+ owner); NO anon / authenticated / PUBLIC
