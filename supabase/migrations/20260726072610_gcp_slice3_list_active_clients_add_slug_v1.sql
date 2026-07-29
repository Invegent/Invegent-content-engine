-- ================================================================================================
-- GIT-HISTORY RECONCILIATION RECORD — NOT executable greenfield DDL.
-- ================================================================================================
-- This file replaces the stale, never-git-tracked working-tree file
-- `NOT_APPLIED_gcp_slice3_list_active_clients_add_slug_v1.sql`. That file's own header said "STATUS:
-- NOT YET APPLIED... the apply lane renames it to a real timestamped identity at the PK apply gate"
-- — that rename was never carried out even though the change WAS applied. Confirmed live 2026-07-29
-- by db-rls-auditor: `public.list_active_clients()` already returns the `slug` key sourced from
-- `c.client.client_slug`, byte-matching the body below. The "NOT_APPLIED" framing was stale and is
-- corrected here. Writing this file performs NO database mutation.
--
-- VERSION CHOSEN (20260726072610): the Supabase `supabase_migrations.schema_migrations` ledger's
-- own recorded version+name for this migration (`gcp_slice3_list_active_clients_add_slug`),
-- confirmed fresh via `list_migrations` during this reconciliation lane (2026-07-29). Unlike the
-- three B-roll files reconciled alongside this one, a real ledger row DOES exist for this change —
-- it was originally applied via `apply_migration`, which mints its own version from wall clock
-- independently of any local filename (see the standing note in every migration file's footer: "A
-- revision gets a NEW number and a DISTINCT name — apply_migration mints its OWN version and ignores
-- this filename"). This file's version is a re-statement of that ledger fact, not a new identity.
--
-- CITATION CHECK before choosing rename over documentation-only mapping (per the standing rule "do
-- not rename blindly where another migration depends on the existing filename or ordering"): the
-- old `NOT_APPLIED_...`/`ROLLBACK_...` filenames were searched across all git-tracked docs, code,
-- and SQL — zero hits outside the two migration files themselves (which are being reconciled
-- together) and non-authoritative local hook dry-run logs. Renaming carries no citation-breakage
-- risk. Contrast with the other five ledger/filename mismatches closed in this same lane, which DO
-- have real citations elsewhere and were therefore left in place with a documentation-only mapping
-- instead (see docs/briefs/results/creatomate-migration-integrity-closeout-v1-result.md).
--
-- SOURCE (byte-exact copy of the CREATE OR REPLACE body, zero SQL changes):
--   NOT_APPLIED_gcp_slice3_list_active_clients_add_slug_v1.sql (local working-tree file, never
--   committed to git on any branch — confirmed via `git log --all`)
--
-- GROUNDING EVIDENCE (re-verified live 2026-07-29 by db-rls-auditor during this reconciliation):
--   * `pg_get_functiondef(public.list_active_clients())` — full live body confirmed to return
--     `jsonb_build_object('id', cl.client_id, 'slug', cl.client_slug, 'name', nm.name)`, exact
--     match to the body below.
--   * Design of record: invegent-dashboard/docs/dashboard/global-client-picker-completion-slice3-brief.md.
--     Lane: S2 · Dashboard (cross-repo T3). PK Gate-1 approved 2026-07-26.
--
-- ⚠ REPLAY WARNING: this is a `CREATE OR REPLACE` — it is NOT self-guarding the way the B-roll DML
-- reconciliation files in this same lane are. Replaying it against the current live database is
-- SAFE (it would re-write the function to the identical byte-for-byte body it already has — a true
-- no-op), but it is still not the correct way to think about this file: it is a historical record of
-- an already-applied change, not a change to make again. Do not use this file as a template for a
-- NEW change to `list_active_clients` (author a new migration with a new version+name instead, per
-- the standing "migration name = permanent identity" rule).
-- ================================================================================================

-- =====================================================================
-- Global Client Picker — Slice 3 · authoritative {id, slug, name} roster
-- =====================================================================
-- Design of record: invegent-dashboard/docs/dashboard/global-client-picker-completion-slice3-brief.md
-- Lane: S2 · Dashboard (cross-repo T3). PK Gate-1 APPROVED 2026-07-26.
-- Tier: T3 (SECURITY DEFINER RPC on the dashboard roster path).
--
-- WHAT THIS DOES (single additive change, backward-compatible):
--   public.list_active_clients() previously returned jsonb objects {id, name}. This
--   adds a third key 'slug' sourced from c.client.client_slug — the canonical
--   client slug — so the dashboard Global Client Picker receives an
--   authoritative {id, slug, name} identity instead of synthesising a slug in
--   the UI (PK: a static id->slug map is rejected; it will not scale).
--   Everything else (return type, volatility, SECURITY DEFINER, search_path,
--   name resolution, active-only filter, ORDER BY) is byte-identical to the
--   pre-image. Adding a key to an existing jsonb object is backward-compatible:
--   existing {id,name} consumers are unaffected.
--
-- WHY ADDITIVE / SAFE:
--   * No new grant, no ACL change — CREATE OR REPLACE preserves the existing
--     service-role-only ACL.
--   * c.client is already in the function's search_path; client_slug is a plain
--     column read. No new schema/table/exposure.
--   * Verified 2026-07-26: c.client.client_slug is populated (non-null) for all
--     4 active clients — property-pulse, ndis-yarns, invegent,
--     care-for-welfare-pty-ltd. (A future active client with a NULL slug would
--     surface slug:null honestly; the dashboard guards NULL slug as an
--     unavailable/unsupported identity rather than fabricating one.)
--
-- ROLLBACK (pinned live md5 of pg_get_functiondef, pre-image):
--   public.list_active_clients : 08c812cacf71d2851115526e9b7e36b9  (650 B)
--   Rollback = CREATE OR REPLACE back to the pre-image body captured in
--   ROLLBACK_20260726072610_gcp_slice3_list_active_clients_add_slug_v1.sql. Fast, in-txn,
--   touches no data.
--
-- NON-GOALS:
--   * No change to c.client, /api/clients logic, or any other RPC.
--   * Supported-client SETS of individual dashboard surfaces are unchanged —
--     making an unsupported client fail visibly is dashboard-side (this
--     migration only supplies the identity).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.list_active_clients()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'c', 'public'
AS $function$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', cl.client_id, 'slug', cl.client_slug, 'name', nm.name)
      ORDER BY nm.name
    ),
    '[]'::jsonb
  )
  FROM c.client cl
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT b.brand_name
         FROM c.client_brand_profile b
        WHERE b.client_id = cl.client_id AND b.is_active = true
        ORDER BY b.brand_name
        LIMIT 1),
      'Client ' || left(cl.client_id::text, 8)
    ) AS name
  ) nm
  WHERE cl.status = 'active';
$function$;
