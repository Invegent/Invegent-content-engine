# Result — Creative Asset Selection Slice-1 — `resolve_slot_assets` read-only RPC

**Brief:** `docs/briefs/creative-asset-selection-slice1-rpc-brief.md` (PK gate 1 approved 2026-07-03; 3 defaults ratified: seed rotation in RPC · scrim constants provisional · rank tiebreak text-safe class then oldest-first)
**Completed:** 2026-07-03 Sydney
**Executor:** ef-builder (isolated worktree `agent-a8cb55426ff906273`, base `6c27c2c`) under orchestrator; apply PK-approved, orchestrator-run on PK tool grant
**Status:** ✅ APPLIED + VERIFIED — ships dark (zero callers)

---

## 1. What shipped

**`public.resolve_slot_assets(p_client_slug, p_platform, p_format, p_template_id, p_seed default null) → jsonb`** — the Asset Selection Slice-1 read-only slot resolver (v4.74 design; bridge between Asset Intake and TMR). Given a client + platform + format + TMR registry template (+ optional rotation seed) it returns either `{status:'ok', modifications:{Background.source, Logo.source, Scrim.opacity}, selected[]}` or `{status:'fail_closed', fail_reason, ...}` — **with a machine-readable reason code on every selection and every rejection** (day-one explainability contract for the future "why picked / why not" dashboard).

- plpgsql · **STABLE** (read-only) · **SECURITY DEFINER** · `SET search_path=''` · all refs schema-qualified · no dynamic SQL.
- Grants: EXECUTE revoked from PUBLIC + anon + authenticated (Supabase default-ACL leak explicitly neutralized), granted to **service_role only** — byte-matches the `resolve_brand_assets` posture.
- Filter chain (v0 §5 order): active → approved → license present (unknown/expired = reject) → `brand-assets` bucket only (output-as-input guard; missing bucket fails closed) → platform (permissive-until-backfilled + `platform_scope_unbacked` warning; **NULL `p_platform` passes permissively + `platform_input_missing` warning — never silent**) → text-safety for backgrounds (`false`/unknown = reject) → rank `true` > `needs_scrim`, tiebreak `created_at`/`asset_id` → optional FNV-1a seed rotation.
- **Missing governed logo = `fail_closed 'missing_required_logo'`** (PK decision 3; registry `required_for_render=false` deliberately not consulted; no placeholder substitution ever).
- Scrim constants `needs_scrim→64` / `true→40` **provisional / to_be_calibrated**. `p_format` accepted but unused in v1 (`context.format_used=false`).

## 2. Migration identity + hash trail

- **Ledger row:** version `20260703002813`, name `create_resolve_slot_assets_v1` (applied via `apply_migration`, 2026-07-03). Repo file renamed to match: `supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql`.
- **Reviewed artifact hash (all reviews pinned to it):** `b6a0589ee340b303e6b616a8527b0d8ca6957505405dc41d50b39bcbef98c7ae` — re-verified immediately before apply; function-absent precondition confirmed (`to_regprocedure IS NULL`).
- **Applied/repo file hash:** `e09aefb8061c9b4d555d5188188e7cc707843d252385606cd940aaf1e438d115`. **Delta vs reviewed artifact = 2 header COMMENT lines only** (the "PREPARED, NOT APPLIED" banner replaced with the applied-on-PK-approval record); the functional payload (`CREATE FUNCTION` … `GRANT`) is byte-identical. Recorded transparently; no functional text changed post-review.
- First apply attempt was **permission-denied** by the harness (`mcp__supabase__apply_migration`); not retried or routed around — surfaced to PK, PK granted the tool, apply then run on the second Supabase MCP mount. No DDL was ever executed via `execute_sql`.

## 3. Tests (pre-apply, hermetic)

`docs/briefs/creative-asset-selection-slice1-validation.mjs` (sha256 `5c44c540a4bf10865d3a9b5c06953497b1f5bdc901e2bea4e7edbfc5f34ece30`) — PGlite WASM Postgres loading the REAL migration file verbatim incl. grants against fixture roles. **67 passed / 0 failed** (56 initial + 11 for the NULL-platform guard), independently re-run by the orchestrator with identical results. Covers: happy path, ranking, seed determinism + SQL↔JS FNV-1a parity (10 seeds), all rejection codes, fail-closed paths, warnings, no-Background templates, posture asserts, filter-order precedence.

## 4. Gate trail

| Gate | Result |
|---|---|
| PK brief approval (gate 1) | approved, 3 defaults ratified |
| ef-builder isolated worktree | 2 files only; nothing tracked modified; main uncontaminated |
| branch-warden | `stop` on benign origin advance (`a422b64`, automated docs marker) → contract-permitted fast-forward → parity 0/0; all else clean |
| db-rls-auditor (draft) | `concerns`, zero must-fix; 1 behavioural find (NULL-platform silent bypass) |
| fix + re-test | guard + `platform_input_missing` warning added; 67/67 |
| security-auditor | **GREEN / pass** — containment verified in-source, service-role-only, no new disclosure, D-01 readiness; nits: uncapped `p_seed` length (future hardening), logo-variant warning deferred to intake — **both PK-accepted as non-blocking** |
| external review | **agree / proceed · risk low · confidence high · zero pushback** — `review_id fa5a3ac1-6849-46aa-a285-aea86ce45a2e`, `reviewed_input_hash b6a0589e…` |
| PK apply gate (HARD STOP) | approved pinned to hash; applied 2026-07-03 |

## 5. Post-apply verification (all PASS, 2026-07-03)

1. **ACL/posture:** `prosecdef=t`, `provolatile='s'`, `proconfig=[search_path=""]`, `proacl={postgres=X/postgres,service_role=X/postgres}`; `has_function_privilege`: anon **false**, authenticated **false**, service_role **true**.
2. **Negative REST:** anon-key `POST /rest/v1/rpc/resolve_slot_assets` → **42501 / HTTP 401** (authenticated covered by the privilege assert; no user JWT minted).
3. **Happy path (PP, `generic_announcement_card_1x1_v1` `fb8a4a9b…`, platform facebook):** `status ok` · Background `bg_perth_cbd` (predicted rank #1) · Logo `pp_logo_primary` · `Scrim.opacity 64` · full reason codes · `rejected []` · warnings `['platform_scope_unbacked']` — matches db-rls-auditor's live-data prediction exactly.
4. **Guards:** bogus template → `template_not_found`; bogus client → `client_not_found`; NULL platform → warnings `['platform_input_missing','platform_scope_unbacked']`.
5. **Seed rotation:** `seed-a`→`bg_perth_cbd` (repeat-identical), `seed-b`→`bg_sydney_cbd` — deterministic, distributing.
6. **Security advisors:** zero findings reference `resolve_slot_assets` (pre-existing baseline unchanged; the `rls_enabled_no_policy` INFO on the TMR tables is pre-existing and NOT claimed resolved).

## 6. Non-claims (explicit)

NOT wired to any worker/runtime — **zero callers exist; the function is dark**. NOT a render/publish/proof event. NOT platform_safe. NOT production_proven. NO Format Mix claim. Platform fencing is permissive-with-warning (scopes unbacked); scrim constants uncalibrated; format-aware selection does not exist (Template Selection v0 is a future lane); logo light/dark variants remain an Asset Intake carry.

## 7. Carries

- `p_seed` length cap (future hardening nit, security-auditor F2).
- Scrim constant calibration (with the PP branded visual proof lane).
- `platform_scope` backfill (activates real platform fencing).
- Consumers: Template Selection v0 → shadow-mode stamping (each its own PK-gated lane).

## 8. Rollback (standing)

`DROP FUNCTION IF EXISTS public.resolve_slot_assets(text, text, text, uuid, text);` — zero dependents, zero callers; if applied via the migration lane it takes a NEW migration number.
