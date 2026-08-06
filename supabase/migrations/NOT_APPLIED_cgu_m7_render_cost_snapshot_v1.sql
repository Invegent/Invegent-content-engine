-- NOT_APPLIED_cgu_m7_render_cost_snapshot_v1.sql
-- =====================================================================
-- M7 — RENDER COST SNAPSHOT  (author-only — NOT APPLIED, NOT deployed)
-- =====================================================================
-- STATUS: NOT YET APPLIED. Prepared under the PK build-acceleration ruling
--   (docs/briefs/cgu-final-build-acceleration-ruling-v1.md) as an ISOLATED,
--   NON-PRODUCTION artifact: isolated branch lane/m7-cost-capture-build,
--   schema/migration/RPC authoring WITHOUT live apply. Filename is
--   deliberately NOT a bare timestamped migration name so no apply tool
--   sweeps it up (mirrors the NOT_APPLIED_cc0080_reconcile_publish_status_v3
--   precedent). Do NOT add this file to any "run these migrations" script
--   or list. Apply requires a fresh Gate-1 brief + full T2/T3 chain
--   (db-rls-auditor + branch-warden + external review + explicit PK gate),
--   none of which has run against this file.
--
-- GOVERNING DESIGN: docs/briefs/seeds/cgu-m7-render-cost-capture-design-v1.md
--   (Option C, §3-§6). Read that file in full before touching this one.
--
-- ── WHAT THIS CLOSES ─────────────────────────────────────────────────────
-- The existing per-render `m.post_render_log.credits_used` capture (fed by
-- Creatomate's GET /v2/renders/{id} `data.credits` field, threaded through
-- video-worker/creatomate_submit.ts + the write_render_log RPC) is confirmed
-- PERMANENTLY NULL on this account/plan — a vendor gap, not an ICE-side
-- bug (documented since 20260502102054_audit_post_render_log_column_purposes.sql:86,
-- re-confirmed live 2026-08-05 across 20 recent video-worker renders, 0/20
-- non-null). THIS MIGRATION DOES NOT TOUCH THAT PLUMBING. m.post_render_log
-- and its credits_used column are left byte-for-byte unchanged — this is a
-- wholly separate, additive capture channel (design §4: "no touch to
-- m.post_render_log").
--
-- ── NO AUTOMATED SWEEP — CONFIRMED, NOT ASSUMED ─────────────────────────
-- The design's §6 named two independently-viable cadences: (1) an automated
-- weekly sweep against a Creatomate account-level usage/billing endpoint,
-- contingent on that endpoint existing (§2, §8 open question 1 — explicitly
-- NOT checked when the design was written), and (2) manual/interim entry.
-- The orchestrator checked Creatomate's public API documentation live on
-- 2026-08-06 (creatomate.com/docs/api/reference/introduction + the
-- pricing/account docs): CONFIRMED there is no documented account-level
-- usage/credits-balance/billing API endpoint. Creatomate's public API
-- surface is render + template CRUD only (consistent with the render-only
-- surface already established in this repo's own evidence, design §2, and
-- memory `creatomate-api-gotchas`: no renders-list endpoint, no template
-- CRUD endpoint either). Building a sweep Edge Function that polls a
-- nonexistent account-usage endpoint would be fabricating an integration
-- against an endpoint that does not exist. Per the design's own §6
-- sequencing ("starting with option 2 ... is the lower-risk sequencing —
-- it does not gate 'documented weekly figure exists' on an unconfirmed
-- vendor API"), and now that the vendor API is confirmed absent rather
-- than merely unconfirmed, THIS LANE BUILDS ONLY THE MANUAL/INTERIM ENTRY
-- PATH (design §6 option 2). No cron job, no Edge Function, no HTTP call
-- to Creatomate is created anywhere in this migration or this lane. If
-- Creatomate ever ships an account-usage endpoint, the automated sweep
-- becomes a SEPARATE later lane — this table's `source` CHECK vocabulary
-- already reserves 'account_usage_api' for that future value so no schema
-- change would be needed to switch capture channel, only a new EF.
--
-- ── STORAGE SHAPE (design §4) ────────────────────────────────────────────
-- A periodic observability snapshot table, following the same shape as
-- m.pipeline_health_log / m.cron_health_status (append-only, no relation to
-- the row-level render log, exposed read-only via its own ice_ro view).
-- Not upserted in place — every capture (manual or, later, automated) is a
-- NEW row, so the history of weekly figures is preserved and auditable.
--
-- ── READ PATH (design §5) ────────────────────────────────────────────────
-- `ice_ro.render_cost_status` — mirrors the *_status naming convention of
-- the existing 10 R0 views (slot_status/draft_status/render_status/
-- publish_status/cron_health/...). Straight SELECT * — all columns of
-- m.render_cost_snapshot are already safe (no secrets, no freeform PII;
-- mirrors cron_health/pipeline_health's "all columns SAFE" framing,
-- 20260719150000_ice_ro_r0_views_and_confined_role.sql:66,80).
--
-- ── GRANT REASONING (do not blindly copy the R0 migration) ───────────────
-- The existing `GRANT SELECT ON ALL TABLES IN SCHEMA ice_ro TO ice_readonly`
-- (20260719150000_ice_ro_r0_views_and_confined_role.sql:128) is a
-- point-in-time grant, NOT an `ALTER DEFAULT PRIVILEGES` clause — in
-- PostgreSQL, `GRANT ... ON ALL TABLES IN SCHEMA` only covers objects that
-- exist at the moment the GRANT statement runs; it does not automatically
-- cover objects created by a LATER migration. Because this migration (if
-- ever applied) runs strictly after that one, `ice_ro.render_cost_status`
-- would NOT be covered by the earlier grant and needs its OWN explicit
-- `GRANT SELECT ... TO ice_readonly` below (Section C). This migration does
-- NOT touch role creation, USAGE grants, or any of the other 10 views —
-- additive only, assumes `ice_ro`/`ice_readonly` already exist.
--
-- ── SECURITY POSTURE (mirrors music_library_v0 / TMR / asset-registry) ───
-- m.render_cost_snapshot: RLS ENABLE with NO permissive policy (deny-all —
-- service_role bypasses RLS; every other principal denied). REVOKE ALL FROM
-- public, anon, authenticated explicitly (revoking PUBLIC alone is
-- insufficient — standing CLAUDE.md gotcha). No direct REST exposure (m is
-- not USAGE-granted to anon/authenticated) — the read path is the ice_ro
-- view; the write path is the guarded RPC below, SECURITY DEFINER,
-- owner-only EXECUTE (no anon/authenticated/PUBLIC grant), mirroring the
-- write_render_log / m.reconcile_publish_status idiom.
--
-- ── WHY A GUARDED RPC, NOT A BARE INSERT RECIPE ──────────────────────────
-- This table has no client-scoping / RLS-policy complexity (it is a global,
-- operator-entered weekly figure), but the guarded-RPC idiom is the
-- established house convention for any write into a schema-m table
-- (write_render_log's own attempt_number computation +
-- m.reconcile_publish_status's validation pattern) and costs little extra:
-- it centralises the `unit`/`source` vocabulary check and the
-- period_end > period_start sanity check in ONE place instead of relying on
-- every caller to get the INSERT right, and it does not require granting
-- direct INSERT on m.render_cost_snapshot to anything broader than the
-- function's own SECURITY DEFINER context.
--
-- ── APPLY ORDER (if/when a future Gate-1 authorises apply) ───────────────
--   1. Table (Section A)  →  2. View (Section B)  →  3. Grants (Section C)
--   →  4. RPC (Section D)  →  5. fail-closed assertions (Section E).
--
-- ── ROLLBACK (reference only — NOT executed by this migration) ───────────
--   DROP FUNCTION IF EXISTS m.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text);
--   REVOKE SELECT ON ice_ro.render_cost_status FROM ice_readonly;
--   DROP VIEW IF EXISTS ice_ro.render_cost_status;
--   DROP TABLE IF EXISTS m.render_cost_snapshot;
--   (v1 ships empty — no data, no worker/EF change to unwind.)
--
-- OUT OF SCOPE (confirmed NOT done in this lane): any touch to
--   m.post_render_log or its credits_used column · any Edge Function /
--   cron job / HTTP call to Creatomate (no account-usage endpoint exists,
--   see above) · any change under supabase/functions/** · any DB apply,
--   deploy, or schema-live mutation · a cost cap/guardrail (design §7,
--   explicitly logging-only) · folding image-worker's identical dark
--   credits_used state into this table (design §8 open question 5, left
--   for a future lane — provider discriminator already anticipates it).
-- =====================================================================


-- ═══════════════════════════════════════════════════════════════════════
-- Section A — m.render_cost_snapshot
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE m.render_cost_snapshot (
  snapshot_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start        timestamptz NOT NULL,
  period_end          timestamptz NOT NULL,
  provider             text NOT NULL DEFAULT 'creatomate',
  credits_or_spend     numeric NOT NULL CHECK (credits_or_spend >= 0),
  unit                 text NOT NULL
                          CHECK (unit IN ('credits', 'usd')),
  source               text NOT NULL
                          CHECK (source IN ('account_usage_api', 'dashboard_manual_entry', 'invoice_manual_entry')),
  captured_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT render_cost_snapshot_period_valid CHECK (period_end > period_start)
);

COMMENT ON TABLE m.render_cost_snapshot IS
'M7 cost-capture: periodic (weekly, manually-entered in v1) render-provider cost/credit snapshot. Additive, separate from m.post_render_log.credits_used (confirmed permanently NULL from Creatomate on this account/plan). No automated sweep exists — Creatomate has no documented account-usage API endpoint (confirmed 2026-08-06); source is dashboard_manual_entry / invoice_manual_entry until/unless that changes. NOT_APPLIED as of authoring — see file header.';

COMMENT ON COLUMN m.render_cost_snapshot.provider IS
'Reserved discriminator for a future multi-provider capture (mirrors render_engine''s own discriminator framing) — v1 only ever writes ''creatomate''.';
COMMENT ON COLUMN m.render_cost_snapshot.source IS
'Honestly distinguishes a manually-entered figure from a future automated read. ''account_usage_api'' is reserved for if/when Creatomate ships an account-usage endpoint — not used by anything in this lane.';

-- RLS ENABLE, no permissive policy — deny-all (service_role bypasses RLS via
-- BYPASSRLS; every other principal is denied). Mirrors music_library_v0 /
-- TMR / asset-registry posture.
ALTER TABLE m.render_cost_snapshot ENABLE ROW LEVEL SECURITY;

-- Revoking PUBLIC alone is insufficient — anon/authenticated named explicitly
-- (standing CLAUDE.md gotcha).
REVOKE ALL ON m.render_cost_snapshot FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON m.render_cost_snapshot TO service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- Section B — ice_ro.render_cost_status (design §5)
-- ═══════════════════════════════════════════════════════════════════════
CREATE VIEW ice_ro.render_cost_status AS
SELECT snapshot_id, period_start, period_end, provider, credits_or_spend, unit, source, captured_at
FROM m.render_cost_snapshot;

COMMENT ON VIEW ice_ro.render_cost_status IS
'R0 read path for M7 render-cost snapshots. Straight SELECT * of m.render_cost_snapshot — all columns already safe (no secrets/PII), same minimal-withholding pattern as ice_ro.cron_health / ice_ro.pipeline_health.';


-- ═══════════════════════════════════════════════════════════════════════
-- Section C — grants (additive; see header reasoning — the earlier
-- schema-wide grant does NOT retroactively cover this new view)
-- ═══════════════════════════════════════════════════════════════════════
GRANT SELECT ON ice_ro.render_cost_status TO ice_readonly;


-- ═══════════════════════════════════════════════════════════════════════
-- Section D — m.record_render_cost_snapshot(...) — guarded manual-entry RPC
-- SECURITY DEFINER, owner-only EXECUTE (no anon/authenticated/PUBLIC),
-- mirrors write_render_log / m.reconcile_publish_status validation idiom.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION m.record_render_cost_snapshot(
  p_period_start       timestamptz,
  p_period_end         timestamptz,
  p_credits_or_spend   numeric,
  p_unit               text,
  p_source             text DEFAULT 'dashboard_manual_entry',
  p_provider           text DEFAULT 'creatomate'
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  v_snapshot_id uuid;
BEGIN
  IF p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'm.record_render_cost_snapshot: period_start and period_end are required';
  END IF;
  IF p_period_end <= p_period_start THEN
    RAISE EXCEPTION 'm.record_render_cost_snapshot: period_end (%) must be after period_start (%)', p_period_end, p_period_start;
  END IF;
  IF p_credits_or_spend IS NULL OR p_credits_or_spend < 0 THEN
    RAISE EXCEPTION 'm.record_render_cost_snapshot: credits_or_spend must be a non-negative number, got %', p_credits_or_spend;
  END IF;
  IF p_unit IS NULL OR p_unit NOT IN ('credits', 'usd') THEN
    RAISE EXCEPTION 'm.record_render_cost_snapshot: unit must be one of credits|usd, got %', p_unit;
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('account_usage_api', 'dashboard_manual_entry', 'invoice_manual_entry') THEN
    RAISE EXCEPTION 'm.record_render_cost_snapshot: source must be one of account_usage_api|dashboard_manual_entry|invoice_manual_entry, got %', p_source;
  END IF;
  IF p_provider IS NULL OR length(trim(p_provider)) = 0 THEN
    RAISE EXCEPTION 'm.record_render_cost_snapshot: provider is required';
  END IF;

  INSERT INTO m.render_cost_snapshot
    (period_start, period_end, provider, credits_or_spend, unit, source)
  VALUES
    (p_period_start, p_period_end, p_provider, p_credits_or_spend, p_unit, p_source)
  RETURNING snapshot_id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- Owner-only. No anon/authenticated/PUBLIC EXECUTE (mirrors
-- m.reconcile_publish_status R7; this is an operator-run manual-entry RPC,
-- not a client-facing or worker-facing one).
REVOKE EXECUTE ON FUNCTION m.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION m.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION m.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION m.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- Section E — fail-closed assertions (catalog introspection only; these
-- validate structure via information_schema/pg_constraint and WOULD run
-- correctly if this migration were ever applied to a scratch/dev DB, but
-- authoring them does not require a live apply — house pattern per
-- 20260719150000_ice_ro_r0_views_and_confined_role.sql Section D and
-- 20260728090000_authz_last_admin_delete_guard_v1.sql's presence assertion)
-- ═══════════════════════════════════════════════════════════════════════
DO $assert$
DECLARE n int;
BEGIN
  -- table + PK exist
  IF to_regclass('m.render_cost_snapshot') IS NULL THEN
    RAISE EXCEPTION 'm7 assert: m.render_cost_snapshot missing';
  END IF;

  -- unit CHECK constraint present and correctly scoped
  SELECT count(*) INTO n
  FROM pg_constraint co
  JOIN pg_class cl ON cl.oid = co.conrelid
  JOIN pg_namespace ns ON ns.oid = cl.relnamespace
  WHERE ns.nspname = 'm' AND cl.relname = 'render_cost_snapshot'
    AND co.contype = 'c'
    AND pg_get_constraintdef(co.oid) ILIKE '%unit%credits%usd%';
  IF n < 1 THEN
    RAISE EXCEPTION 'm7 assert: expected a unit CHECK constraint (credits|usd) on m.render_cost_snapshot, found %', n;
  END IF;

  -- source CHECK constraint present and correctly scoped
  SELECT count(*) INTO n
  FROM pg_constraint co
  JOIN pg_class cl ON cl.oid = co.conrelid
  JOIN pg_namespace ns ON ns.oid = cl.relnamespace
  WHERE ns.nspname = 'm' AND cl.relname = 'render_cost_snapshot'
    AND co.contype = 'c'
    AND pg_get_constraintdef(co.oid) ILIKE '%source%account_usage_api%dashboard_manual_entry%invoice_manual_entry%';
  IF n < 1 THEN
    RAISE EXCEPTION 'm7 assert: expected a source CHECK constraint (account_usage_api|dashboard_manual_entry|invoice_manual_entry) on m.render_cost_snapshot, found %', n;
  END IF;

  -- period_end > period_start sanity constraint present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint co
    JOIN pg_class cl ON cl.oid = co.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE ns.nspname = 'm' AND cl.relname = 'render_cost_snapshot'
      AND co.conname = 'render_cost_snapshot_period_valid'
  ) THEN
    RAISE EXCEPTION 'm7 assert: render_cost_snapshot_period_valid CHECK constraint missing';
  END IF;

  -- non-negative spend/credits constraint present
  SELECT count(*) INTO n
  FROM pg_constraint co
  JOIN pg_class cl ON cl.oid = co.conrelid
  JOIN pg_namespace ns ON ns.oid = cl.relnamespace
  WHERE ns.nspname = 'm' AND cl.relname = 'render_cost_snapshot'
    AND co.contype = 'c'
    AND pg_get_constraintdef(co.oid) ILIKE '%credits_or_spend%>=%';
  IF n < 1 THEN
    RAISE EXCEPTION 'm7 assert: expected a non-negative CHECK on credits_or_spend, found %', n;
  END IF;

  -- RLS enabled, no permissive policy (deny-all)
  IF NOT (SELECT relrowsecurity FROM pg_class cl JOIN pg_namespace ns ON ns.oid = cl.relnamespace
          WHERE ns.nspname = 'm' AND cl.relname = 'render_cost_snapshot') THEN
    RAISE EXCEPTION 'm7 assert: m.render_cost_snapshot must have RLS ENABLEd';
  END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'm' AND tablename = 'render_cost_snapshot';
  IF n <> 0 THEN
    RAISE EXCEPTION 'm7 assert: m.render_cost_snapshot must have zero permissive policies (deny-all), found %', n;
  END IF;

  -- anon/authenticated/PUBLIC hold no table privileges
  SELECT count(*) INTO n
  FROM information_schema.role_table_grants
  WHERE table_schema = 'm' AND table_name = 'render_cost_snapshot'
    AND grantee IN ('PUBLIC', 'anon', 'authenticated');
  IF n <> 0 THEN
    RAISE EXCEPTION 'm7 assert: PUBLIC/anon/authenticated must hold zero grants on m.render_cost_snapshot, found %', n;
  END IF;

  -- the view exists and is not security_invoker (owner-rights read, matches
  -- the other 9 R0 views)
  IF to_regclass('ice_ro.render_cost_status') IS NULL THEN
    RAISE EXCEPTION 'm7 assert: ice_ro.render_cost_status view missing';
  END IF;
  SELECT count(*) INTO n
  FROM pg_class cl JOIN pg_namespace ns ON ns.oid = cl.relnamespace
  WHERE ns.nspname = 'ice_ro' AND cl.relname = 'render_cost_status' AND cl.relkind = 'v'
    AND (SELECT option_value FROM pg_options_to_table(cl.reloptions)
         WHERE option_name = 'security_invoker') = 'true';
  IF n <> 0 THEN
    RAISE EXCEPTION 'm7 assert: ice_ro.render_cost_status must not be security_invoker';
  END IF;

  -- ice_readonly can SELECT the new view
  IF NOT has_table_privilege('ice_readonly', 'ice_ro.render_cost_status', 'SELECT') THEN
    RAISE EXCEPTION 'm7 assert: ice_readonly must hold SELECT on ice_ro.render_cost_status';
  END IF;

  -- RPC exists, is SECURITY DEFINER, and anon/authenticated hold no EXECUTE
  IF to_regprocedure('m.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'm7 assert: m.record_render_cost_snapshot(...) missing';
  END IF;
  IF has_function_privilege('anon', 'm.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'm.record_render_cost_snapshot(timestamptz, timestamptz, numeric, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'm7 assert: anon/authenticated must NOT hold EXECUTE on m.record_render_cost_snapshot';
  END IF;

  RAISE NOTICE 'M7 cost-capture assert ok: table+view+grants+RPC present, deny-all posture intact, no anon/authenticated reach.';
END $assert$;

-- END NOT_APPLIED_cgu_m7_render_cost_snapshot_v1.sql
