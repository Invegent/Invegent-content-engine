# Invegent Reconciliation Dashboard — cc-0013 Stage B scaffold

**Status:** Stage B scaffold — operator-internal, design-only at v1.
**Phase 0 brief:** `docs/briefs/cc-0013-dashboard-phase-0.md` (frozen at commit `0d14fee` / blob `0c1f87f6c470d5742331796eb3a2d27a60d641ac`).
**Production touch:** **none.** No deploy. No env config. No Supabase change.

This package is a Next.js 15 App Router scaffold that reads cc-0012 Platform Reconciliation View (`op.*`) surfaces via server-side Supabase calls and renders a minimal operator dashboard. **Stage B delivers only the scaffold + the home page** (`/` reading `op.v_reconciliation_summary`). The other four surfaces (`/clients`, `/platforms`, `/drift`, `/freshness`) are deferred to **Stage C** under a separate brief.

---

## Architecture (per Phase 0 brief)

- **Stack:** Next.js 15+ App Router, React 19, TypeScript strict.
- **Runtime:** Node runtime (not Edge).
- **Data access:** server-side Supabase client (`lib/supabase/server.ts`) using `SUPABASE_SERVICE_ROLE_KEY`, scoped to `db: { schema: 'op' }`.
- **Rendering:** Server Components only. No client-side Supabase client. No `"use client"` directives in v1.
- **Auth:** **deferred to Stage E.** Stage B has no auth gate; the scaffold is intended to run locally only and never to be exposed publicly during Stage B. Production deploy under Vercel Authentication (SSO + email allowlist) lands in Stage E behind its own brief.
- **Forbidden:** writes, mutations, forms, direct `r.*` reads, exposing `op` via PostgREST, leaking the service-role key to the client bundle. See Phase 0 brief §9 + V-checks §11.

---

## Local run instructions (development only)

> **Do not deploy this Stage B scaffold to production.** Stage E provisions deploy + auth gate.

### 1. Prerequisites
- Node.js ≥ 20 (tested under 24.x)
- npm ≥ 10 (tested under 11.x)
- A Supabase project where the `op` schema and 5 `op.*` views exist (cc-0012 v1 production state).

### 2. Install
```bash
cd dashboard
npm install
```

### 3. Configure local env
Copy `.env.example` to `.env.local` and populate:
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>
```

**Never** commit `.env.local`. The `.gitignore` excludes it. **Never** prefix these vars with `NEXT_PUBLIC_` — service-role credentials must stay server-side.

### 4. Run dev server
```bash
npm run dev
```

Visit http://localhost:3000 — should render the Reconciliation Summary page.

### 5. Quality gates
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # next build
```

All three must pass before merging Stage B for review. V1–V10 acceptance checklist in the Phase 0 brief §11.

---

## File layout

```
dashboard/
├── .env.example              # Local env template — copy to .env.local; no real secrets committed
├── .gitignore                # Excludes node_modules/, .next/, .env*.local
├── README.md                 # This file
├── eslint.config.mjs         # Next 15 ESLint flat config preset
├── next-env.d.ts             # Next.js TypeScript ambient types (do not edit)
├── next.config.ts            # Minimal Next config (no experimental features at v1)
├── package.json              # Stack pins: next ^15, react ^19, supabase-js ^2.45.4
├── tsconfig.json             # TypeScript strict mode
├── app/
│   ├── layout.tsx            # Root layout (Server Component; no client state)
│   └── page.tsx              # Home — reads op.v_reconciliation_summary; KPI panel
└── lib/
    └── supabase/
        └── server.ts         # createOpClient() — ONLY module touching SUPABASE_SERVICE_ROLE_KEY
```

---

## What this scaffold does NOT do

- **Auth:** none in Stage B (deferred to Stage E). Do not expose this scaffold publicly.
- **Mutations:** zero write paths. No `.insert/.upsert/.update/.delete/.rpc` calls anywhere. No forms. No mutation handlers. (Enforced by Phase 0 V3 grep gate.)
- **Direct `r.*` reads:** none. The Supabase client is hard-scoped to `db: { schema: 'op' }`. Direct `r.*` access requires an explicit `.schema('r')` call which is forbidden. (Enforced by Phase 0 V4 grep gate.)
- **Client-side Supabase:** none. The supabase-js client lives only in `lib/supabase/server.ts` with `import 'server-only'` at the top. Any client-side import raises a Next.js build error. (Enforced by Phase 0 V5 + V6.)
- **Realtime / WebSocket / SSE:** none.
- **Refresh button / interactive controls:** none (deferred).
- **Filtering / search / detail pages:** none (deferred).
- **Mobile responsiveness polish:** none (desktop-first; deferred).
- **Theming / dark mode:** none (deferred).
- **Customer-facing surface:** never. Operator-internal only.

Phase 0 brief §12 enumerates the full out-of-scope list.

---

## Production deploy posture (deferred to Stage E)

Production deploy is **explicitly out of Stage B scope**. When Stage E lands:

- **Hosting:** Vercel project under a private domain (or `*.vercel.app` with platform auth).
- **Auth gate:** Vercel Authentication (Vercel-platform-level SSO) with email allowlist provisioned in Vercel project settings. PK email = initial allowlist; PK adds operator emails at deploy time.
- **Env vars:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in the Vercel project environment (production scope; not preview).
- **No customer-facing surface:** even with Vercel Authentication, the dashboard is internal-only.
- **Pre-deploy V8 probe:** an unauthenticated `curl` against any route must redirect to the Vercel Auth sign-in page (zero data exposure pre-auth).

---

## Pinned design decisions (from Phase 0 brief)

| Decision | Value | Brief reference |
|---|---|---|
| Stack | Next.js 15+ App Router, Node runtime, on Vercel | §5 |
| Auth model | Vercel Authentication + email allowlist (deferred to Stage E) | §6 |
| Data-access pattern | Server Components → `createOpClient()` → service-role + `db: { schema: 'op' }` | §7 |
| Var-A3 UI rule | `attention_needed === true` → AttentionBadge; `false` OR `null` → OkBadge (strict equality; no `?? true` fallback) | §8 |

---

## Carry-forward awareness

The following remain open as future doc patches / future briefs (NOT Stage B scope):

- **cc-0012 v1.1 minor doc patch** (3 carry items: Var-A1 / Var-A2 / Var-A3 SQL fixes)
- **v1.6 cc-0010A doc patch** (3 items)
- **v1.3 cc-0011 minor doc patch** (5 items)
- **5-row close-the-loop batch** (12 sessions overdue at v2.71)
- **24-row historical escalated batch**

cc-0013 Stage B authors none of these.

---

*Stage B scaffold authored 2026-05-13 Sydney by chat under PK directive. Phase 0 brief frozen at commit `0d14fee`. CCH D-01 review on Stage B output to follow before any Stage C work. No production mutation in Stage B.*
