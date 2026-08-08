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
--   for which cell      -> client_id, client_slug, platform, evidence_iso_week
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
  -- Discriminator added by A3-3 analysis while this table was still unapplied.
  -- One evidence surface, two detection sources — retrofitting this onto a live
  -- table later would be far more expensive.
  --   'runtime_grid' : A3-1 — carried a mix share, dropped by m.build_weekly_demand_grid
  --   'mix_rewrite'  : A3-3 — held a share in the prior mix generation, absent from current
  detection_source              text NOT NULL DEFAULT 'runtime_grid'
                                  CHECK (detection_source IN ('runtime_grid','mix_rewrite')),
  evidence_iso_week             date,

  -- NULLABLE by design: a 'mix_rewrite' removal is PLATFORM-level
  -- (t.platform_format_mix_default has no client_id), whereas a 'runtime_grid' drop is
  -- always client-scoped. The CHECK below enforces exactly that, so nullability cannot
  -- be abused to write an unattributable runtime drop.
  client_id                     uuid,
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
  -- External review corrected_action (review_id 692a9f1c, 2026-08-08): the packet
  -- persists public.classify_format_capability's output VERBATIM rather than inventing a
  -- second taxonomy (owner ruling C1). Nothing versioned that classifier, so a future
  -- change to it would silently change what OLD evidence rows MEAN — reinterpretation
  -- without notice, a quieter cousin of the defect this lane exists to fix.
  -- This stamps the classifier's identity at write time: md5 of its pg_get_functiondef,
  -- the same function-pinning pattern ICE already uses elsewhere. A reader can then tell
  -- whether two rows were classified by the SAME logic, and refuse to compare them if not.
  -- NULL is legitimate and expected on 'mix_rewrite' rows (the classifier is client-scoped
  -- and a mix rewrite is platform-level, so it is never consulted) and on any row whose
  -- classifier lookup failed. It is therefore deliberately NOT in ck_fcd_class_scope.
  classifier_version            text,
  -- raw platform_support facts (absent-key vs explicit-false); NOT a derived label
  platform_support_raw          text,
  platform_support_key_present  boolean NOT NULL,
  -- ── M1 FIX (db-rls-auditor, 2026-08-08) ────────────────────────────────────
  -- The class-elimination facts are PERSISTED here rather than recomputed by a view.
  -- Two reasons, one of which is a defect fix:
  --   (a) DEFECT: a view that CALLS m.detect_mix_rewrite_removals is privilege-checked
  --       against the INVOKER (functions in views are not owner-rights, and a function
  --       carrying SET search_path is non-inlinable), so ice_readonly — which has no
  --       USAGE on schema t — would get 42501 on a surface that appears to exist and
  --       appears to be granted. All 15 pre-existing ice_ro views are pure relation
  --       projections; that is exactly why they work. This restores that pattern.
  --   (b) CORRECTNESS: these are facts AS AT DETECTION TIME. Recomputing them later
  --       would silently re-answer against a mix and a platform_support that have since
  --       moved — which is the same class of error this lane exists to eliminate.
  prior_effective_from          date,      -- mix_rewrite: generation removed FROM
  output_mime_type              text,      -- class axis (format_category is NULL for video)
  class_share_before            numeric,
  class_share_after             numeric,
  class_eliminated              boolean,
  -- N2 (PK decision 2026-08-08): LAST-SEEN semantics. observed_at is FIRST seen and is
  -- never rewritten; last_observed_at advances on every re-detection of the same key.
  -- The pair makes recurrence visible without duplicating evidence.
  last_observed_at              timestamptz NOT NULL DEFAULT now(),
  created_at                    timestamptz NOT NULL DEFAULT now(),
  -- A runtime drop MUST be client-attributable; a mix rewrite MUST NOT pretend to be.
  CONSTRAINT ck_fcd_client_scope CHECK (
    (detection_source = 'runtime_grid' AND client_id IS NOT NULL)
    OR
    (detection_source = 'mix_rewrite'  AND client_id IS NULL)
  ),

  -- ── N8 (db-rls-auditor; priority RAISED in the 4th round) ──────────────────
  -- This stopped being tidy schema design the moment R1 added NULLS NOT DISTINCT to
  -- uq_fcd_runtime_grid. That option applies to ALL FIVE key columns, not only
  -- reason_code, and evidence_iso_week is nullable at the table — pinned NOT NULL only
  -- by the writer. So the failure direction FLIPPED:
  --   before R1: a NULL evidence_iso_week meant no conflict -> unbounded DUPLICATE rows.
  --              Noisy, but LOSSLESS.
  --   after  R1: every NULL-week row sharing (client_id, platform, requested_format,
  --              reason_code) COLLAPSES INTO ONE -> silent EVIDENCE LOSS.
  -- Silent evidence loss is the precise defect class cc-0091 exists to abolish, so this
  -- constraint is now load-bearing rather than hygienic. It is unreachable through the
  -- sanctioned writer (which pins the value) and only postgres can INSERT at all, but it
  -- is the single thing standing between a future second writer — or one hand-written
  -- row — and exactly that failure.
  -- CHECK violations are NOT swallowed by ON CONFLICT DO NOTHING/DO UPDATE, so this stays
  -- genuinely fail-closed. Free now on an empty unapplied table; a validate scan under the
  -- T3 gate later.
  CONSTRAINT ck_fcd_class_scope CHECK (
    (detection_source = 'mix_rewrite'
       AND prior_effective_from IS NOT NULL      -- uq_fcd_mix_rewrite depends on it
       AND evidence_iso_week    IS NULL)          -- platform-level: no week bucket
    OR
    (detection_source = 'runtime_grid'
       AND evidence_iso_week    IS NOT NULL       -- closes the silent-merge hole above
       AND prior_effective_from IS NULL
       AND output_mime_type     IS NULL           -- class facts are mix-rewrite-only
       AND class_share_before   IS NULL
       AND class_share_after    IS NULL
       AND class_eliminated     IS NULL)
  )
);

COMMENT ON TABLE m.format_capability_drop IS
  'cc-0091 A3-1. Durable evidence that a format carrying a mix share was requested for a '
  'client/platform and dropped by m.build_weekly_demand_grid. Persists the OUTPUTS of '
  'public.classify_format_capability verbatim (status/reason_code/routed_lane/evidence) — '
  'this table defines NO capability taxonomy of its own. Retention: 90 days via '
  'm.prune_format_capability_drop(). Write path: m.record_format_capability_drops().';

COMMENT ON COLUMN m.format_capability_drop.evidence_iso_week IS
  'cc-0091 A3-1. ISO/Monday-based week bucket (date_trunc(''week'')), pinned inside '
  'm.record_format_capability_drops — callers do not choose it. DELIBERATELY NOT the ICE '
  'scheduling week: ICE''s live schedule functions are Sunday-based (DOW, Sunday=0). This '
  'column is an EVIDENCE bucket for deduplication, NOT a scheduling coordinate, and was '
  'renamed from week_start (PK ruling 2026-08-08, R3) precisely so it cannot be joined to '
  'a scheduling week by mistake. Do not derive a schedule from it.';

COMMENT ON COLUMN m.format_capability_drop.platform_support_key_present IS
  'RAW fact, not a classification: false means the platform key was ABSENT from '
  't."5.3_content_format".platform_support (never stated), true means a value was stated. '
  'With platform_support_raw this distinguishes "unproven" from "explicitly unsupported" '
  'without introducing a second enum.';

CREATE INDEX IF NOT EXISTS ix_fcd_cell
  ON m.format_capability_drop (client_id, platform, evidence_iso_week);
CREATE INDEX IF NOT EXISTS ix_fcd_observed_at
  ON m.format_capability_drop (observed_at);           -- retention pruning
CREATE INDEX IF NOT EXISTS ix_fcd_source
  ON m.format_capability_drop (detection_source, observed_at);
CREATE INDEX IF NOT EXISTS ix_fcd_routed_lane
  ON m.format_capability_drop (routed_lane)
  WHERE routed_lane IS NOT NULL;                        -- Asset Gap consumption

-- ── S4 FIX (db-rls-auditor, 2026-08-08) — dedupe keys ────────────────────────
-- Without these, both writers are pure appends. The mix_rewrite writer is the acute
-- case: the prior generation is STATIC (effective_from 2026-04-22 for fb/ig/li), so a
-- nightly Gate-B call site would re-record the SAME 10 historical removals every night —
-- ~900 byte-identical rows inside the 90-day retention window, degrading the very
-- evidence surface this table exists to provide. Added NOW, while the table is not live;
-- retrofitting a unique constraint onto a populated table is far more expensive.
-- Partial, because the natural key differs per detection_source: a runtime drop is
-- client+week scoped, a mix rewrite is platform+generation scoped and client-less.
-- N2 (db-rls-auditor + PK decision): reason_code is PART OF THE KEY. Without it, a format
-- dropped early in the week for reason A and later the same week for reason B collided, and
-- the second row was silently discarded — a dedupe that HIDES evidence, worse than the
-- duplication it replaced. With it, a changed reason records a NEW row while a repeated
-- reason merely advances last_observed_at.
-- R1 FIX (db-rls-auditor, 3rd round): NULLS NOT DISTINCT. Adding reason_code to the key
-- was right, but PostgreSQL treats NULLs as DISTINCT in a unique index by default — and
-- m.detect_format_capability_drops emits a NULL reason_code on its OWN documented
-- classifier-failure path (v_slug IS NULL -> classifier_error='client_slug_unresolved').
-- Those rows would never conflict, so the dedupe would silently fail on exactly the rows
-- an operator most needs to trust. The NULL hole had MOVED from evidence_iso_week to
-- reason_code, not closed. PG 15+ (live is 17.6) supports NULLS NOT DISTINCT, and
-- ON CONFLICT inference still resolves against such an index, so no writer change needed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fcd_runtime_grid
  ON m.format_capability_drop (client_id, platform, requested_format, evidence_iso_week, reason_code)
  NULLS NOT DISTINCT
  WHERE detection_source = 'runtime_grid';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fcd_mix_rewrite
  ON m.format_capability_drop (platform, requested_format, prior_effective_from)
  WHERE detection_source = 'mix_rewrite';

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
DECLARE
  v_n       integer;
  v_week    date;
  v_clsver  text;
BEGIN
  -- Point-in-time identity of the classifier whose output we are about to persist.
  -- Catalog-only lookup: safe under search_path='' (pg_catalog is implicitly searched),
  -- and it yields NULL rather than raising if the classifier is absent — a metadata stamp
  -- must never be able to abort the evidence write it annotates.
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_clsver
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'classify_format_capability'
   LIMIT 1;
  -- N2 (PK decision): the week bucket is PINNED HERE, not left to the caller.
  -- m.build_weekly_demand_grid never reads its p_week_start, so evidence_iso_week exists solely
  -- as a dedupe-key component; leaving it to a Gate-B convention would make the index
  -- either inert (run-date) or lossy. COALESCE closes the NULL hole at the writer, since
  -- NULLs are DISTINCT in a unique index and a NULL would silently restore duplication.
  v_week := date_trunc('week', COALESCE(p_week_start, CURRENT_DATE))::date;

  INSERT INTO m.format_capability_drop (
    detection_source,
    evidence_iso_week, client_id, client_slug, platform, requested_format, requested_share_pct,
    capability_status, reason_code, routed_lane, classifier_evidence, classifier_error,
    classifier_version,
    platform_support_raw, platform_support_key_present
  )
  SELECT 'runtime_grid',
         v_week, d.client_id, d.client_slug, d.platform, d.requested_format,
         d.requested_share_pct, d.capability_status, d.reason_code, d.routed_lane,
         d.classifier_evidence, d.classifier_error,
         v_clsver,
         d.platform_support_raw, d.platform_support_key_present
    FROM m.detect_format_capability_drops(p_client_id, p_week_start) d
  -- N2/N3: LAST-SEEN. Every detected row either inserts or updates, so ROW_COUNT below
  -- equals rows DETECTED — which repairs the return contract DO NOTHING had silently
  -- changed to "rows newly inserted" (a 0 that could not be told from "no drops").
  ON CONFLICT (client_id, platform, requested_format, evidence_iso_week, reason_code)
    WHERE detection_source = 'runtime_grid'
    DO UPDATE SET last_observed_at = now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$function$;

COMMENT ON FUNCTION m.record_format_capability_drops(uuid, date) IS
  'cc-0091 A3-1. Persists m.detect_format_capability_drops output. RETURN VALUE = rows '
  'DETECTED (each detected row either inserts or advances last_observed_at, so ROW_COUNT '
  'covers both) — it is NOT "rows newly inserted", and 0 therefore means "no drops '
  'detected", unambiguously. evidence_iso_week is bucketed to date_trunc(''week'') INSIDE this '
  'function; callers do not choose it and it is an ISO/Monday bucket, NOT the Sunday-based '
  'ICE scheduling week. classifier_version records the classifier identity AT FIRST '
  'DETECTION and is NOT refreshed by the DO UPDATE arm — consistent with every other '
  'column being first-seen-wins, and it is what makes the row honestly point-in-time. '
  'NOT wired to any trigger or cron — Gate B owns the nightly call site.';

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
SELECT observed_at, last_observed_at, detection_source, evidence_iso_week, prior_effective_from,
       client_id, client_slug, platform,
       requested_format, requested_share_pct,
       capability_status, reason_code, routed_lane, classifier_version,
       platform_support_raw, platform_support_key_present,
       output_mime_type, class_share_before, class_share_after, class_eliminated
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
