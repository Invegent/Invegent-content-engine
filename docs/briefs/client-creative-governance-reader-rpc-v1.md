# Brief cc-NNNN — client-creative-governance reader RPC (public.get_client_creative_governance)

**Created:** 2026-07-19 Sydney
**Author:** brief-author (draft — orchestrator persisted)
**Executor:** Claude Code (DB lane) + PK (apply hard-stop)
**Status:** draft
**Result file:** `docs/briefs/results/cc-NNNN-client-creative-governance-reader-rpc.md` (created on completion)

> Lane origin: the **D-B** decision from the Static-Image Governance Dashboard
> (`invegent-dashboard/docs/dashboard/static-image-governance-v1-brief.md`). Slices 1+2 are
> live in prod; the governance-enablement panel is blocked because **no reader RPC exists** for
> `c.client_creative_governance`. This lane creates that reader RPC only (CE/DB); dashboard
> wiring is a separate future lane.

---

## Task

Create ONE new read-only reader RPC in schema `public` — `public.get_client_creative_governance(p_client_slug text DEFAULT NULL)` — that exposes the governed-creative enablement spine `c.client_creative_governance` (governed `(client_id, format) -> {contract_ref, declarative_registry_ref, render_label, enabled}`; DDL `supabase/migrations/20260707000000_create_client_creative_governance_v1.sql:34-45`) so a trusted backend (the invegent-dashboard via its service-role client) can later surface a governance-enablement panel. TODAY there is no reader RPC for this table and schema `c` is not REST-exposed, so the table is unreachable except via a service-role path (posture at `20260707000000_…:50-58`; same why-a-reader-RPC-is-needed pattern that forced `grant_service_role_select_client` at `20260707010000_grant_service_role_select_client.sql:6`). This lane AUTHORS AND PREPARES the migration ONLY; it does not apply it.

## Source context

- `supabase/migrations/20260707000000_create_client_creative_governance_v1.sql:34-45` — target table columns: `id uuid PK`, `client_id uuid NOT NULL REFERENCES c.client(client_id)`, `format text NOT NULL`, `contract_ref text`, `declarative_registry_ref text`, `render_label text`, `enabled boolean NOT NULL DEFAULT false`, `created_at`, `updated_at`, `UNIQUE(client_id, format)`.
- `…20260707000000_…:50-58` — security posture to preserve at the reader boundary: RLS ENABLED zero-policies (deny-by-default), `REVOKE ALL … FROM PUBLIC` then explicitly `FROM anon, authenticated`, `GRANT … TO service_role` only. Schema `c` not REST-exposed.
- `supabase/migrations/20260613070000_list_active_clients.sql:12-41` — THE house reader-RPC pattern to mirror exactly: `CREATE OR REPLACE FUNCTION public.<name>(…) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','c','public' AS $$ SELECT COALESCE(jsonb_agg(…), '[]'::jsonb) … $$;` → `COMMENT ON FUNCTION …;` → `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated;` → `GRANT EXECUTE … TO service_role;` (`:40-41`).
- `supabase/migrations/20260629120000_ppp_slice1a_get_publishing_plan_pyramid_rpc.sql:219` — confirms `c.client.client_slug` is a real, readable column; resolve/return the client by `client_slug` (NOT `id`; `c.client` PK is `client_id` per DDL FK `…v1.sql:36`).
- Live governance rows (db-rls-auditor ASSERTED, verified live earlier this session): PP×`image_quote` enabled=true; PP×`video_short_stat` enabled=true; NDIS×`image_quote` enabled=true. No reader RPC reads the table today — grep across `supabase/migrations/**` returns only create/seed/comment references, zero `CREATE FUNCTION` reading it.
- `CLAUDE.md` — risk-tier rules (Convention 3), standing deploy/DB gotchas, findings contract, PK apply/deploy hard stop.

## Scope

**In scope:** Author ONE new migration that CREATES exactly one new function `public.get_client_creative_governance(p_client_slug text DEFAULT NULL)`; set its EXECUTE ACL to service_role-only (REVOKE from PUBLIC, anon, authenticated; GRANT to service_role); add `COMMENT ON FUNCTION`. Prepare (do NOT execute) a reference rollback. Prepare the ACL post-assert query for the post-apply gate.

**Out of scope:** Applying the migration (PK hard-stop, deny-listed apply_migration + temporary lift). Any change to `c.client_creative_governance` (no DDL, no data). Any change to existing objects. Any dashboard code / Slice-3 wiring (a separate future dashboard lane). Any EF deploy. Any grant to anon/authenticated. Any REST exposure of schema `c`.

## Allowed actions

- Author a new migration file in `supabase/migrations/` creating `public.get_client_creative_governance(p_client_slug text DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','c','public'`, mirroring `list_active_clients` precisely (`20260613070000_…:12-41`).
- Body (final shape pending DEC-2/DEC-3): `SELECT COALESCE(jsonb_agg(jsonb_build_object('client_slug', cl.client_slug, 'format', g.format, 'enabled', g.enabled, 'contract_ref', g.contract_ref, 'render_label', g.render_label, 'declarative_registry_ref', g.declarative_registry_ref, 'updated_at', g.updated_at) ORDER BY cl.client_slug, g.format), '[]'::jsonb) FROM c.client_creative_governance g JOIN c.client cl ON cl.client_id = g.client_id WHERE (p_client_slug IS NULL OR cl.client_slug = p_client_slug);`
- Add `COMMENT ON FUNCTION public.get_client_creative_governance(text)` describing it as read-only, service-role-only, no write path.
- Add the ACL lines in the SAME migration so there is no exposed window: `REVOKE EXECUTE ON FUNCTION public.get_client_creative_governance(text) FROM PUBLIC, anon, authenticated;` then `GRANT EXECUTE ON FUNCTION public.get_client_creative_governance(text) TO service_role;`.
- Prepare (reference only) rollback: `DROP FUNCTION IF EXISTS public.get_client_creative_governance(text);`.
- Prepare the post-apply ACL post-assert: verify `has_function_privilege('anon', 'public.get_client_creative_governance(text)', 'EXECUTE') = false` AND same for `authenticated`, AND `has_function_privilege('service_role', …) = true`.
- Run local, non-applying checks only (read/grep of repo, static SQL review).

## Forbidden actions

- **NO apply in this lane.** `apply_migration` (and `deploy_edge_function`) are harness deny-listed; applying is a PK HARD STOP requiring an explicit temporary lift. Do not apply, do not request auto-apply.
- **NO deploy** of any edge function.
- **NO change to any existing object** — CREATE the one new function only; no `CREATE OR REPLACE` over a different existing function, no ALTER of other objects.
- **NO data change** — no INSERT/UPDATE/DELETE on `c.client_creative_governance` or any table.
- **NO change to `c.client_creative_governance` itself** (no DDL on the table; it is LIVE/populated in production).
- **NO grant to anon or authenticated** — service_role only. Revoking PUBLIC alone is insufficient; new `public` functions are BORN anon+authenticated-executable via `pg_default_acl`, so the explicit `REVOKE … FROM anon, authenticated` is mandatory (`20260613070000_…:40`).
- **NO REST exposure of schema `c`.**
- **NO dashboard code change** (Slice 3 is a separate future lane).
- **Migration name = permanent identity** — a revision gets a NEW name, never the same name with different SQL.
- Respect active holds in `docs/00_sync_state.md` / `docs/00_action_list.md`. Video D6 arc is PARKED — this reader RPC does not touch video-worker or the D6 gate and must not be used to re-open it.

## Success criteria

- Exactly ONE new function is created: `public.get_client_creative_governance(text)`; no other object created, altered, or dropped by the migration.
- Mirrors the proven house pattern: `RETURNS jsonb`, `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, explicit `SET search_path TO 'pg_catalog','c','public'`, `COALESCE(…, '[]'::jsonb)` (no NULL return), `COMMENT ON FUNCTION` present.
- Return exposes ONLY the agreed governance metadata (DEC-3) — `client_slug, format, enabled, contract_ref, render_label, declarative_registry_ref, updated_at`; NO `id`, NO `client_id`, NO `created_at`.
- `p_client_slug IS NULL` → all governed clients; a slug → that client's rows only; ordered by `client_slug, format`.
- ACL post-assert (run at the PK-gated apply, verified by db-rls-auditor): after apply, anon EXECUTE = absent, authenticated EXECUTE = absent, service_role EXECUTE = present. No window in which anon/authenticated can execute.
- Reference rollback prepared and recorded: `DROP FUNCTION IF EXISTS public.get_client_creative_governance(text);` (not executed).
- Migration-version divergence handled BEFORE the commit gate: `apply_migration` mints its own wall-clock version at apply and keeps the `name` — rename-or-record decision made and noted.
- Live existence + ACL truth confirmed ONLY after the PK-gated apply, by db-rls-auditor (handoff).

## Stop condition

When the migration is authored, statically reviewed, ACL lines + rollback + post-assert prepared, and DEC-1..DEC-6 are resolved at Gate 1: STOP for the PK apply gate (deny-list temporary lift). Report result per result template. Do not apply.

---

## PK decisions (Gate 1)

- **DEC-1 — Signature/scope:** nullable `p_client_slug` (NULL = all governed clients) **[recommended]** vs a required slug.
- **DEC-2 — Return shape:** jsonb array mirroring `list_active_clients` **[recommended]** vs a typed `TABLE(...)` return.
- **DEC-3 — Columns exposed:** `client_slug, format, enabled, contract_ref, render_label, declarative_registry_ref, updated_at` — confirm none sensitive (internal identifiers, not secrets); `id/client_id/created_at` excluded.
- **DEC-4 — Function name:** `get_client_creative_governance` — confirm (permanent identity once chosen).
- **DEC-5 — Tier:** **T3 [recommended]** (SECURITY DEFINER + EXECUTE grant + anon-default-ACL gotcha → db-rls-auditor + security-auditor + external review + PK apply gate + rollback proven + post-apply ACL verification). PK may down-tier to T2 (additive, read-only, service-role-only, mirrors a proven pattern). DML/DDL is ≥ T2 regardless.
- **DEC-6 — Scope boundary:** this lane = CE/DB RPC ONLY; dashboard wiring (replace the register-sourced governance note with a live read) is a separate future dashboard lane (Slice 3) — confirm.

## Notes

- SECURITY DEFINER runs as the function OWNER; with RLS-on-zero-policies on `c.client_creative_governance`, whether the definer sees rows is a post-apply db-rls-auditor check — but the pattern is proven live (`list_active_clients` reads `c.*` successfully), so low risk. The closed column projection + WHERE + deny-by-default ACL are the only exposure controls, hence load-bearing.
- Handoffs: db-rls-auditor (post-apply: function exists, definer can read under RLS, ACL post-assert, rows/shape live, confirm no prior reader in the live catalog) · security-auditor (blast-radius / caller sign-off on the EXECUTE grant) · branch-warden (commit gate: file set == one new migration).
