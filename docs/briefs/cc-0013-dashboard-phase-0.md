# cc-0013 — Dashboard Phase 0 — DESIGN BRIEF

**Status:** v1 (authored 2026-05-13 Sydney; awaiting CCH D-01 review).
**Parent:** cc-0012 (Phase E — Platform Reconciliation View).
**Depends on:** cc-0012 v1 — `op.*` operator views live (5 views + `op_reader` role).
**Blocks:** subsequent dashboard stages (B = scaffold / C = read-routes / D = render / E = deploy).
**Phase:** **BRIEF-ONLY DESIGN PHASE.** No UI. No scaffold. No prototype. No production touch.

---

## 1. Purpose / operator problem

cc-0012 closed at v2.71 with PRV v1 operator views live in production. The five `op.*` views surface reconciliation v1 + PRV v1 health to anyone who can `SET ROLE op_reader` from `postgres` / `service_role` — i.e. database-tooling operators, not the human operator (PK) doing routine triage.

PK currently has no web surface to ask:

- "Is the system on-time this week?" (would read `op.v_reconciliation_summary`)
- "Which clients need attention?" (would read `op.v_per_client_rollup`)
- "Which platforms are unhealthy across the client base?" (would read `op.v_per_platform_rollup`)
- "What drift findings landed in the last 30 days?" (would read `op.v_drift_rollup`)
- "When did we last see evidence from every (client, platform) pair?" (would read `op.v_freshness_rollup`)

Phase 0 fixes this — by *designing* the dashboard. Not building it. The brief pins the stack, auth model, data-access pattern, surface hierarchy, Var-A3 handling rule, forbidden actions, risk register, V-check contract, and out-of-scope items so subsequent stages have a deterministic build target. **Phase 0 does not produce code.**

---

## 2. Current production contract (read-only inputs)

Stable contract from cc-0012 v1 close (v2.71). Dashboard reads these and only these:

| View | Cardinality | Source | Read column shape |
|---|---|---|---|
| `op.v_reconciliation_summary` | 1 row | `r.mv_reconciliation_daily_matrix` + `r.cadence_drift_log` + `r.mv_observer_freshness_summary` | `as_of_at`, `window_start`, `window_end`, `total_expected_7d`, `total_matched_7d`, `total_late_7d`, `total_suppressed_7d`, `total_cancelled_7d`, `on_time_rate_7d`, `late_rate_7d`, `drift_info_count_7d`, `drift_warn_count_7d`, `drift_critical_count_7d`, `observer_stale_client_platform_count`, `attention_needed` |
| `op.v_per_client_rollup` | ≥1 row per client with activity (4 rows at cc-0012 close) | r.mv_reconciliation_daily_matrix + r.cadence_drift_log + r.mv_observer_freshness_summary | `client_id`, `client_slug`, `platform_count`, `total_expected_7d`, `total_matched_7d`, `total_late_7d`, `total_suppressed_7d`, `on_time_rate_7d`, `late_rate_7d`, `drift_warn_critical_count_7d`, `observer_stale_platform_count`, `last_evidence_at`, `attention_needed`, `as_of_at` |
| `op.v_per_platform_rollup` | ≥1 row per platform | same | `platform`, `client_count`, `total_*_7d`, `*_rate_7d`, `drift_warn_critical_count_7d`, `observer_stale_client_count`, `last_evidence_at`, `attention_needed`, `as_of_at` |
| `op.v_drift_rollup` | trailing 30 days of `r.cadence_drift_log` (3 rows at cc-0012 close) | r.cadence_drift_log + r.reconciliation_run | `cadence_drift_log_id`, `drift_check_run_id`, `run_started_at`, `client_id`, `client_slug`, `platform`, `drift_type`, `drift_severity`, `expected_publication_id`, `observation_window_start/end`, `observed_count`, `expected_count`, `drift_details` (jsonb), `created_at`, `is_recent`, `is_actionable` |
| `op.v_freshness_rollup` | one row per (client, platform) tuple (14 rows at cc-0012 close) | r.mv_observer_freshness_summary + r.platform_observer_health (LEFT JOIN) | `client_id`, `client_slug`, `platform`, `last_evidence_at`, `last_match_at`, `last_drift_log_at`, `evidence_count_7d`, `match_count_7d`, `drift_warn_critical_count_7d`, `freshness_status`, `minutes_since_last_evidence`, `observer_is_healthy`, `observer_consecutive_failure_count`, `observer_last_failure_reason`, `observer_last_observed_at`, `attention_needed`, `as_of_at` |

**Access path on production:**
- `op` schema **NOT** in `supabase/config.toml exposed_schemas` (zero PostgREST exposure).
- `op_reader` role: `rolcanlogin = false`; SELECT-grantee on `op.*` only.
- `service_role`: also SELECT-grantee on `op.*`; PostgREST-accessible via the standard service-role JWT.
- `anon` + `authenticated`: explicit `REVOKE ALL` on `op` schema + all views.

**Freshness contract:**
- `mv_reconciliation_daily_matrix` + `mv_observer_freshness_summary` are refreshed by `r.refresh_cc_0011_views()` called BEFORE drift evaluation inside `cadence-drift-checker` EF runs (cron 85 weekly + on-demand). Operator sees data as fresh as the last cron-85 fire OR the most-recent on-demand drift check. **Dashboard does NOT trigger refresh in Phase 0**; future stages may add an operator-callable refresh affordance under a separate brief.

**Anti-write contract carried from cc-0012:**
- Dashboard MUST NOT write to `r.*`, `m.*`, `c.*`, `k.*`, or any other production schema.
- Dashboard MUST NOT issue `INSERT` / `UPDATE` / `DELETE` / `MERGE` / `UPSERT` / `TRUNCATE` / `REFRESH MATERIALIZED VIEW` on any production surface.
- All five `op.*` views are read-only by construction (plain `CREATE VIEW`, no `INSTEAD OF` triggers).

---

## 3. Dashboard Phase 0 boundary

Phase 0 = **brief-only design phase**. Produces this brief. Produces nothing else.

**Phase 0 deliverables:**
- This file (`docs/briefs/cc-0013-dashboard-phase-0.md`).
- One git commit landing this file on `main`.
- One subsequent CCH D-01 review of this brief (out of Phase 0 scope; happens before Stage B authoring).

**Phase 0 explicit non-deliverables:**
- No application code (no `.tsx` / `.jsx` / `.ts` other than this `.md`).
- No scaffolding (no `package.json` add; no `next dev` run).
- No prototype.
- No deployment.
- No domain / DNS / hosting configuration.
- No environment variable setup.
- No PostgREST exposure prep (no `exposed_schemas` change).
- No Auth provider configuration in Supabase or anywhere else.
- No SQL migration / patch / new view / new table / new role / new policy / GRANT change.
- No Edge Function source.
- No cron edit.
- No production Supabase touch.
- No fold of Var-A1 / Var-A2 / Var-A3 (those remain cc-0012 v1.1 doc-patch territory).

**Stage map (future, out of Phase 0 scope):**

| Future stage | Scope (not authored yet) |
|---|---|
| B | Repo scaffold + chosen-stack initialisation + auth gate stub + at least 1 SSR route reading 1 `op.*` view via service_role server-side |
| C | All 5 surfaces wired (one page per `op.*` view per §4); Var-A3 handling implemented + tested |
| D | Render polish + V-check pass (V1–V10 below) + lint/typecheck clean |
| E | Deploy to private Vercel project with Vercel platform auth gate + operator allowlist; smoke-test in production |

Each future stage requires its own brief authoring + CCH D-01 + PK approval phrase. Phase 0 does not pre-author them.

---

## 4. Proposed v1 dashboard surfaces

Five operator-facing pages, one per `op.*` view, plus a navigation shell.

### 4.1 `/` — Reconciliation Summary (home)
- **Reads:** `op.v_reconciliation_summary` (single row).
- **Renders:** large KPI tiles for `total_expected_7d`, `total_matched_7d`, `total_late_7d`, `on_time_rate_7d` (percentage), `late_rate_7d` (percentage), and three drift severity counts (`info` / `warn` / `critical` over 7 days).
- **Attention banner:** if `attention_needed = true`, render a top-of-page warning band linking to `/clients` + `/drift`.
- **Freshness footer:** "Data as of {as_of_at}" rendered in operator-local timezone (Australia/Sydney).
- **No interactive controls** at v1. No date-range picker. No refresh button. (Both deferred to a future stage; Phase 0 does not pin them.)

### 4.2 `/clients` — Per-Client Rollup
- **Reads:** `op.v_per_client_rollup` ordered by `attention_needed DESC, late_rate_7d DESC NULLS LAST, client_slug ASC`.
- **Renders:** table with columns `client_slug`, `platform_count`, `total_expected_7d`, `total_matched_7d`, `total_late_7d`, `on_time_rate_7d` (%), `late_rate_7d` (%), `drift_warn_critical_count_7d`, `observer_stale_platform_count`, `last_evidence_at`, `attention_needed` (badge).
- **Row tap behaviour:** non-clickable at v1 (no per-client detail page).
- **Empty state:** "No client data in trailing 7 days" if 0 rows.

### 4.3 `/platforms` — Per-Platform Rollup
- **Reads:** `op.v_per_platform_rollup` ordered by `attention_needed DESC, late_rate_7d DESC NULLS LAST, platform ASC`.
- **Renders:** table with columns `platform`, `client_count`, `total_*_7d`, `*_rate_7d`, `drift_warn_critical_count_7d`, `observer_stale_client_count`, `last_evidence_at`, `attention_needed`.
- **Row tap behaviour:** non-clickable at v1.
- **Empty state:** same pattern.

### 4.4 `/drift` — Drift Queue (trailing 30 days)
- **Reads:** `op.v_drift_rollup` ordered by `is_actionable DESC, drift_severity DESC, created_at DESC`.
- **Renders:** scrollable list with columns `created_at`, `client_slug`, `platform`, `drift_type`, `drift_severity` (badge: info / warn / critical), `observation_window_start..end`, `observed_count`, `expected_count`, `drift_details` (collapsed JSON; expandable per row).
- **Filters at v1:** none (no client filter, no platform filter, no severity filter). Filters deferred to a future stage.
- **Empty state:** "No drift findings in trailing 30 days" if 0 rows (this is the default healthy state).

### 4.5 `/freshness` — Observer Freshness Scoreboard
- **Reads:** `op.v_freshness_rollup` ordered by `attention_needed DESC, last_evidence_at ASC NULLS FIRST, client_slug ASC, platform ASC`.
- **Renders:** grid or table with columns `client_slug`, `platform`, `freshness_status` (badge: fresh / aging / stale / no_evidence_ever), `last_evidence_at`, `last_match_at`, `evidence_count_7d`, `match_count_7d`, `drift_warn_critical_count_7d`, `minutes_since_last_evidence` (human-readable: "12 min ago" / "3 days ago" / "—"), `attention_needed` (badge).
- **Observer columns (currently NULL pre-PRV-2/3/4):** `observer_is_healthy`, `observer_consecutive_failure_count`, `observer_last_failure_reason`, `observer_last_observed_at` rendered as `—` when NULL (single em-dash placeholder).
- **Empty state:** "No freshness data" if 0 rows.

### 4.6 Navigation shell
- Top nav: 5 links (`Summary`, `Clients`, `Platforms`, `Drift`, `Freshness`).
- Footer: `Data as of {as_of_at}` (max of all source `as_of_at` timestamps on the current page).
- No sidebar. No tenant switcher (single-tenant operator-only). No search.

---

## 5. Stack decision

**Decision: Next.js 15+ App Router on Vercel (Node runtime; not Edge runtime).**

**Rationale:**
1. **Existing alignment.** Repo environment already shows an `invegent-dashboard` Next.js App Router project in a sibling working directory (`C:\Users\parve\invegent-dashboard\app\(dashboard)\...`). Phase 0's chosen stack matches the established pattern; subsequent stages can extend that existing project OR initialise a parallel project under the same conventions without re-litigating stack.
2. **Server Components are the natural fit for the data-access pattern (§7).** RSC runs server-side by construction; `SUPABASE_SERVICE_ROLE_KEY` env var lives only in the Node runtime; the client bundle never receives it. No bespoke API-route serialisation needed for the read-only operator surface.
3. **Node runtime over Edge runtime** because `supabase-js` is well-supported in Node and the Edge runtime adds size/compatibility constraints with no operator-perceived benefit at v1 read-only scale (≤ 50 rows per page).
4. **Vercel deployment** because (a) Vercel-native auth gating is the auth model decision (§6), (b) zero-config Next.js deployment + preview branches + production promotions, (c) consistent with existing Invegent dashboard hosting.

**Versions pinned at Stage B (not Phase 0):** Stage B authoring captures the exact `next` / `react` / `@supabase/supabase-js` version pins. Phase 0 only fixes the stack family.

**Out of stack scope at Phase 0:** styling system (Tailwind vs CSS modules vs other); component library (shadcn vs other); deployment region. Those are Stage B authoring decisions.

---

## 6. Auth model decision

**Decision: Vercel platform-level access protection (Vercel Authentication) with email allowlist.**

**Rationale:**
1. **Phase 0 forbids Auth provider configuration.** Supabase Auth set-up (magic links, provider config) is explicitly forbidden. Vercel Authentication is a built-in Vercel feature provisioned at the project level — it is *deployment infrastructure*, not Supabase Auth configuration. Stage E deploy work configures it; the brief pins the model.
2. **Operator-internal scope.** Dashboard v1 is operator-internal only. Vercel Authentication's SSO + email allowlist model directly matches "PK + any PK-approved operators only".
3. **No customer-facing surface.** No public registration, no password reset flow, no user table. Eliminates entire auth-provider attack surface.
4. **Cleanly defers RLS work.** Multi-tenant operator-filtering (Var-A2 future) is out of Phase 0 scope. Vercel Authentication gates the whole site uniformly at v1; future RLS work happens behind a separate brief.

**Allowlist posture:**
- Initial allowlist = PK email only.
- PK adds operator emails via Vercel project settings at Stage E deploy time (no code change required).
- No email belongs in the brief (operator personal data; not version-controllable).

**Failure mode:** any request without a valid Vercel Authentication SSO session → Vercel redirects to the SSO sign-in screen before any Next.js code runs → zero data exposure to unauthenticated requests.

**Alternative considered + rejected:**
- HTTP Basic Auth via Next.js middleware: simpler but credential rotation requires code deploy; no per-user identity for future audit logs.
- Supabase Auth magic link: requires Supabase Auth provider configuration which is forbidden in Phase 0.
- Cloudflare Access: equivalent to Vercel Authentication but introduces a second hosting layer (Cloudflare in front of Vercel) for no v1 benefit.

---

## 7. Data-access pattern

**Decision: Next.js Server Components calling a server-side Supabase client with `SUPABASE_SERVICE_ROLE_KEY`, schema scoped to `op` via `db: { schema: 'op' }`.**

**Rationale:**
1. **Matches CCH default** ("BFF Edge Function with service_role, OR framework-native server-side API route with service_role"). RSC is the framework-native pattern; no separate API route needed for v1 read-only pages.
2. **Service-role key never reaches the client bundle.** Next.js Server Components run in the Node runtime only; their code and imports are stripped from the client bundle. The key lives in a Vercel env var with no `NEXT_PUBLIC_` prefix and is therefore inaccessible to client JS by construction.
3. **`op` schema scoping prevents accidental r.* reads.** The Supabase client at the server constructs with `db: { schema: 'op' }`. Even if a future contributor writes `client.from('cadence_drift_log')`, PostgREST routes it to `op.cadence_drift_log` (which doesn't exist) — fast failure. Direct r.* reads require explicit `client.schema('r').from(...)` and are forbidden by §9.
4. **PostgREST goes through `service_role` JWT.** Service-role auth is `authenticated=false`-equivalent — bypasses RLS. Since op.* has no RLS at v1, this matches the cc-0012 v1 contract.
5. **Operator-side caching.** Server Components use Next.js `fetch` cache defaults (in this case: `cache: 'no-store'` per page, since freshness depends on the most-recent cron-85 fire). No client-side state library at v1; fully SSR.

**Pattern detail (illustrative, not Stage-B authoring):**

```
// Stage B will author this pattern; brief pins the shape:
//   server-only module: lib/supabase/server.ts
//   - exports: createOpClient() : SupabaseClient
//   - uses: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//                        { auth: { persistSession: false, autoRefreshToken: false },
//                          db: { schema: 'op' } })
//   - file MUST start with `import 'server-only'` to prevent accidental client import.
//   - read operations: client.from('v_reconciliation_summary').select('*').single()
//                      client.from('v_per_client_rollup').select('*')
//                      ...
```

**Operator-callable refresh:** intentionally absent at v1. Dashboard reads cron-85-refreshed MV state. Adding a "refresh now" button requires either calling `cadence-drift-checker` EF (out of scope; that's an EF invocation) or directly calling `r.refresh_cc_0011_views()` via a service-role RPC (out of scope; that's a non-trivial side-effect surface). Deferred to a future stage.

**Alternative considered + rejected:**
- BFF Edge Function with service_role: equivalent semantics but adds an extra deployment surface (a new EF) for zero v1 benefit. RSC is the lighter pattern.
- Direct PostgREST from the client: rejected explicitly per directive — would require `op` to be added to `exposed_schemas`, an RLS strategy, and per-operator auth. All forbidden in Phase 0. Deferred behind a future RLS/exposure brief.
- supabase-js with anon key + RLS: rejected; cc-0012 v1 has no RLS on op.* and explicitly REVOKEs anon/authenticated access.

---

## 8. Var-A3 UI-handling rule

**Rule (pinned):**

> When rendering any `attention_needed` column from `op.v_freshness_rollup` (or any future `op.*` view exhibiting analogous LEFT JOIN + SQL 3VL NULL semantics), the dashboard MUST treat `NULL` as **no attention needed** — visually identical to `false`. The badge MUST NOT render as "unknown" or "warning" or any error/unclear state.

**Why:**
- cc-0012 Var-A3 documented that `op.v_freshness_rollup.attention_needed` evaluates to `NULL` whenever `r.platform_observer_health` is empty (current state pre-PRV-2/3/4) AND `freshness_status` is not in the truthy set. With 14 current rows all having `observer_is_healthy IS NULL`, expected v1 distribution will have most rows return `NULL` for `attention_needed`, which semantically means "no observer health data yet" → "no observer-side reason to flag attention".
- Treating `NULL` as `false` (no attention) is the safe operational default; treating it as `true` (attention) would render an ocean of warnings for healthy systems pre-PRV-2/3/4.
- Future cc-0012 v1.1 patch will apply `COALESCE(observer_is_healthy, true)` at the SQL level. Until then, the UI handles it.

**Implementation note (Stage B authoring will translate; Phase 0 pins the rule only):**

```
// Dashboard component for the attention badge:
//   const isAttention = row.attention_needed === true;  // strict equality
//   // NOT: !!row.attention_needed  (treats NULL as falsy, but be explicit)
//   // NOT: row.attention_needed ?? true  (treats NULL as attention — WRONG)
//   return isAttention ? <AttentionBadge /> : <OkBadge />;
```

V7 (§11) covers the test.

---

## 9. Forbidden actions

The Phase 0 brief AND all subsequent dashboard stages (B / C / D / E) MUST NOT:

1. **Add `op` schema to `supabase/config.toml exposed_schemas`** (no PostgREST exposure).
2. **Read directly from `r.*` schemas** (no `client.schema('r').from(...)`; no raw SQL touching `r.*`).
3. **Write or mutate any production surface** (`r.*`, `m.*`, `c.*`, `k.*`, `op.*`, `vault.*`, `cron.*`, `supabase_migrations.*`).
4. **Change GRANT / REVOKE / role definitions** (no `GRANT ... TO ...`, no `CREATE ROLE`, no `ALTER ROLE`).
5. **Escalate to roles other than `service_role`** server-side (no `SET ROLE postgres`; no superuser ops).
6. **Leak credentials to the client bundle** (no `NEXT_PUBLIC_*` env var carrying `SUPABASE_SERVICE_ROLE_KEY` or any token).
7. **Build a customer-facing surface** (no public registration; no payment; no admin writes; operator-internal only).
8. **Silently resolve Var-A1 / Var-A2 / Var-A3** (those are cc-0012 v1.1 doc-patch territory; dashboard handles Var-A3 at the UI layer only per §8).

---

## 10. Risk register

Dashboard-specific risks (8 items, all v1 design-time):

### R1 — Service-role credential leak to client bundle (HIGH severity)
- **Vector:** developer accidentally imports `SUPABASE_SERVICE_ROLE_KEY` into a client component or assigns it to a `NEXT_PUBLIC_*` env var.
- **Mitigation:** server-side Supabase client lives in `lib/supabase/server.ts` with `import 'server-only'` as the first line; key is read from a non-`NEXT_PUBLIC_*` env var. Build-time check (`next build`) errors if `server-only` package is imported into a client component. V6 (§11) greps the client bundle post-build.

### R2 — XSS via `drift_details` jsonb rendering
- **Vector:** `op.v_drift_rollup.drift_details` is a jsonb column that may contain operator-supplied strings (e.g. `error_summary` from `r.reconciliation_run`). Rendering raw HTML from this JSON could XSS.
- **Mitigation:** React's default escaping handles `{value}` text-node rendering. Forbidden: `dangerouslySetInnerHTML` for any `drift_details` content. JSON expansion view uses `<pre><code>{JSON.stringify(drift_details, null, 2)}</code></pre>`. Stage C authoring grep ensures no `dangerouslySetInnerHTML` exists.

### R3 — CSRF on any mutation path (LOW severity at v1)
- **Vector:** Phase 0 has no mutation paths, but a future contributor could add one without proper CSRF protection.
- **Mitigation:** v1 has zero mutation paths (V3 in §11 enforces). When mutations land in a future stage, they go via Next.js server actions with built-in origin checks + Vercel-platform-level auth — both required.

### R4 — Accidental write path via Supabase client
- **Vector:** `client.from('v_reconciliation_summary').upsert(...)` is syntactically valid even though `op.*` views are read-only at the database level. The DB would reject it, but the code path exists.
- **Mitigation:** Stage C grep for `.insert(`, `.upsert(`, `.update(`, `.delete(`, `.rpc(` in any dashboard source file → must return zero matches. V3 enforces.

### R5 — Framework auto-form-binding to write paths
- **Vector:** Next.js Server Actions provide `<form action={serverAction}>` automatic POST handling. A future contributor could wire a form to a mutation.
- **Mitigation:** No `<form action={...}>` and no `'use server'` directives in dashboard source files at v1. V3 + V5 grep enforce. When forms land in a future stage, they must be authored under their own brief.

### R6 — Role escalation via DB function call
- **Vector:** dashboard could call `r.refresh_cc_0011_views()` via `.rpc('refresh_cc_0011_views')` which is `SECURITY DEFINER` and would execute with elevated privileges.
- **Mitigation:** No `.rpc(` calls in dashboard source at v1. V3 enforces. (When this is needed in a future stage, an explicit allowlist of permitted RPC names lands in a separate brief.)

### R7 — SSR/CSR data-fetch boundary confusion
- **Vector:** developer accidentally moves a Server Component query into a Client Component (e.g. by adding `'use client'` at the top), exposing service-role data fetch logic to the browser.
- **Mitigation:** `import 'server-only'` pragma on `lib/supabase/server.ts` raises a Next.js build error on client-side import. ESLint rule `import/no-restricted-paths` blocks accidental imports of `lib/supabase/server` from `app/**/client.*` files. Stage B authoring sets up the lint config.

### R8 — Future multi-tenant filter bypass risk (deferred awareness)
- **Vector:** when PRV-2/3/4 / customer dashboard work begins, an early version may forget tenant filters and leak cross-tenant data.
- **Mitigation:** Phase 0 explicitly out-of-scopes multi-tenant. When that work happens, RLS on `op.*` views is the load-bearing control, not application filters. The future brief authoring that work must explicitly design RLS-first; Phase 0 carries this as awareness only.

---

## 11. Stage B acceptance / validation gates

Stage B (and all subsequent stages) must satisfy these 10 V-checks before close:

| V-check | Check | Pass criterion |
|---|---|---|
| **V1** | Repo structure matches selected stack | Dashboard root contains `package.json` with `"next": ">=15"`, `"react": ">=18"`. App Router layout (`app/` directory; no `pages/` directory). `lib/supabase/server.ts` exists with `import 'server-only'` as first line. |
| **V2** | Lint / typecheck pass | `npx tsc --noEmit` exits 0. `npx eslint .` exits 0 with no errors. |
| **V3** | Grep confirms no write-method calls or mutation handlers | `grep -rn '\.insert(\|\.upsert(\|\.update(\|\.delete(\|\.rpc(\|use server\|<form action=' app/ lib/ components/` returns zero hits. |
| **V4** | Grep confirms no direct r.* schema references | `grep -rn "from('r\." app/ lib/ components/` and `grep -rn '\.schema(.\?'\''r'\''.\?)' app/ lib/ components/` both return zero hits. |
| **V5** | All dashboard data reads route only through approved server-side access layer | All `from('v_*')` calls trace through `createOpClient()` in `lib/supabase/server.ts`. No `createClient` or `supabase-js` import outside that module. |
| **V6** | Service_role credential never present in client bundle | `npx next build` succeeds, then `grep -r SUPABASE_SERVICE_ROLE_KEY .next/static/ .next/server/app/_next/static/` returns zero hits in client-shipped files (`.next/static/`). Build-time `import 'server-only'` check passes (build fails if violated). No `NEXT_PUBLIC_*` env var carries the service-role key. |
| **V7** | Var-A3 NULL handling implemented and tested | `op.v_freshness_rollup.attention_needed = NULL` rows render as "OK" badge (not attention). Unit/component test or manual check covers: `attention_needed = true` → AttentionBadge; `attention_needed = false` → OkBadge; `attention_needed = null` → OkBadge (NULL-equivalent-to-false rendering). |
| **V8** | Anon / public access blocked by selected auth gate | Hitting any dashboard route without a valid Vercel Authentication session redirects to SSO sign-in. No data exposure pre-auth. Verified at Stage E deploy via curl probe of any route from non-SSO context. |
| **V9** | No `supabase/config.toml exposed_schemas` change | `git diff main..HEAD supabase/config.toml` returns either no change or only the cc-0010A/B/C-era `[functions.*] verify_jwt = false` entries (none of which touch `exposed_schemas`). |
| **V10** | No production mutation / migration / cron / EF deploy / GRANT change | Dashboard repo contains no `supabase/migrations/*.sql` additions, no `supabase/functions/*` additions, no `supabase/config.toml` `exposed_schemas` line, no `GRANT` / `REVOKE` SQL anywhere in repo. PK confirms via Supabase console post-deploy that no cron jobs / EFs / migrations were created by the dashboard work. |

V-checks form a Stage B / C / D / E gate. Brief authoring for later stages references this section.

---

## 12. Out-of-scope / future cc items

The following are explicitly OUT of cc-0013 Phase 0 (AND out of subsequent dashboard stages B / C / D / E at v1):

1. **Customer-facing dashboard.** v1 is operator-internal only. Customer surfaces require a separate brief with tenant-filter RLS, public auth provider configuration, billing, etc.
2. **Billing / payment / admin writes.** Zero write surface at v1.
3. **cc-0012 v1.1 patch.** Var-A1 / Var-A2 / Var-A3 carry items live in a separate cc-0012 v1.1 minor doc patch brief, not in cc-0013.
4. **New `op.*` views.** Dashboard reads the 5 existing views only. Additions (e.g. `op.v_run_history`, `op.v_match_detail`) are future stages or separate briefs.
5. **Platform observer API integration (PRV-2 / PRV-3 / PRV-4).** Observer EFs are entirely out of dashboard scope; dashboard reads only their downstream MV outputs once they populate.
6. **PostgREST exposure / RLS project.** No `op` exposure via PostgREST at v1. If/when client-side direct access is needed, a separate brief designs RLS + per-operator auth + exposure controls first; dashboard waits on that work.
7. **Operator-callable refresh button.** No "refresh now" affordance at v1. Operators see data as fresh as the most-recent cron-85 fire. A future stage may add operator-callable refresh under a separate brief.
8. **Multi-tenant operator filtering.** Single-tenant operator persona at v1; multi-tenant filtering deferred behind RLS work above.
9. **Filters, search, date-range pickers.** No interactive controls at v1; pure SSR.
10. **Per-row detail pages.** No `/clients/:id` or `/drift/:id` routes at v1; tables/lists are non-clickable.
11. **Real-time updates / subscriptions.** No Supabase Realtime, no WebSocket, no SSE at v1; each page request triggers a fresh server-side read.
12. **Mobile responsiveness polish.** Desktop-first at v1; mobile responsiveness is a Stage C/D polish item, not a Phase 0 requirement.
13. **Dark mode / theming.** Out of v1 polish.
14. **Audit logging of operator views.** No "who looked at what when" log at v1.
15. **Export / CSV download.** Out of v1.

---

## 13. Brief metadata + freeze terms

- **Authored:** 2026-05-13 Sydney (v2.71 post-cc-0012 close).
- **Author:** chat (Claude) under PK directive ("cc-0013 Dashboard Phase 0 scope-definition D-01 → READY → author brief").
- **Phase 0 strict-limits compliance:** docs-only this turn — no `.tsx` / `.jsx` / `.svelte` / `.astro` / `.vue` / `.sql` / EF source / `supabase/config.toml` change / scaffolding / package installation / env var setup / production touch.
- **Lesson application:** L57 candidate (relkind-aware primitive selection) inherited from cc-0012 close — applies to any future dashboard schema-shape probe; recorded in §10 R8 awareness carry. L55 + L56 inherited from v2.70.
- **Brief blob freeze policy:** brief becomes frozen-by-reference at Stage B authoring start. Future amendments (v1.1, v2) require new CCH D-01 review + explicit version bump.
- **Carry-forward awareness at brief authoring time:**
  - cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 + cc-0012 all closed on main at v2.71.
  - main HEAD at authoring start: `0de7215f4cd94f77f54c9c22a72173fdf63b42bf`.
  - cc-0012 v1.1 minor doc patch (3 items: Var-A1 + Var-A2 + Var-A3) carries forward into next-session queue — not folded here.
  - v1.6 cc-0010A doc patch (3 items) carries forward unchanged.
  - v1.3 cc-0011 minor doc patch (5 items) carries forward unchanged.
  - 24 historical escalated `m.chatgpt_review` rows still untouched (CCH directive carry).
  - 5-row close-the-loop batch now 12 sessions overdue.

---

*Brief authored 2026-05-13 Sydney by chat (Claude) at v2.71 post-cc-0012 close. Mirrors cc-0012-style 12-section structure (with §13 metadata). Phase 0 = brief-only design phase. No code, no scaffold, no prototype, no production touch. Awaiting CCH D-01 review before any dashboard implementation. cc-0009 / cc-0010A / cc-0010B / cc-0010C / cc-0011 / cc-0012 all unchanged; this is purely additive design surface.*
