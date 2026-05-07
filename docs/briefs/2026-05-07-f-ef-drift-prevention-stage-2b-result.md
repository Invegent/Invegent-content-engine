# Result — F-EF-DRIFT-PREVENTION Stage 2b: Dashboard Drift Panel

**Author:** Claude Code (CC)
**Brief:** `docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md`
**Repo:** `Invegent/invegent-dashboard`
**Branch:** `main` (direct push per ICE dev workflow)
**Implementation commit:** `66aea99`
**Date:** 2026-05-07 Sydney

---

## Pre-flight discovery (§1.5)

- **Route convention (§1.5.1):** no `/admin/*` exists. Canonical pattern in this repo is `app/(dashboard)/<feature>/page.tsx` resolving to `/<feature>` (route group in parens does not appear in URL). Adapted brief's `/admin/ef-drift` to **`/ef-drift`**.
- **Auth gate (§1.5.2):** `middleware.ts` runs Supabase `getUser()` against the matcher and redirects unauthenticated requests to `/login`. Single-tier — any authenticated user has access to every `(dashboard)` page; no separate operator-role check exists. Reused that mechanism — no new auth code added.
- **UI library (§1.5.3):** `package.json` shows `tailwindcss` + `lucide-react` only — no shadcn/ui, no Radix. Hand-rolled Tailwind throughout. Reused the existing badge / card / table conventions from `monitor`, `pipeline-log`, and `components/stat-card.tsx`. Built a `<details>`/`<summary>` collapsible (no client JS) for the Background Observations section.

None of the discoveries changed the brief materially; the route adaptation is the only surface delta and is documented in the commit message.

---

## Acceptance checklist (§10)

- [x] **Page route shipped at `/admin/ef-drift` (or specify final route if different).** — Shipped at `/ef-drift` per pre-flight §1.5.1. No `/admin/*` route group exists in this repo.
- [x] **Panel renders all rows from `m.vw_ef_drift_current` without errors.** — Server component reads via `fetchEfDriftCurrent()` → `exec_sql` RPC on `m.vw_ef_drift_current`. Build green. Live row count to be verified by chat against §8 V1 (expected 49).
- [x] **3 SD-risk rows pinned at top in red panel.** — Filtered `security_definer_regression_risk = true` rendered inside red-50/red-300 bordered section, immediately below summary cards, above active drift. 🔒 lock icon prefixes each row.
- [x] **6 active drift findings (3 SD-risk + 3 non-SD-risk B-FD/B-RR) visible above the fold.** — SD-risk panel + Active drift findings section both render before the collapsible background, with one row per finding.
- [x] **Background observations collapsible, default collapsed.** — `<details>` element (no `open` attribute) groups by class with sub-tables for A / A-LE / C / D / repo-only. SSR-friendly (no client JS).
- [x] **Mobile responsive (375px width tested).** — Summary cards `grid-cols-2 lg:grid-cols-4` (2x2 stacked on mobile). DriftRowCard uses `flex-col sm:flex-row` to stack slug + version block on narrow viewports. Background table is `overflow-x-auto`. Visual verification in browser deferred to PK after Vercel deploy.
- [x] **No mutation surfaces.** — Page is a pure server component. No `<form>`, no client buttons, no Supabase RPCs that mutate. The only RPC is `exec_sql` with a `SELECT` query.
- [x] **`export const dynamic = 'force-dynamic'` set.** — `app/(dashboard)/ef-drift/page.tsx:11`.
- [x] **`createClient()` inside helper, not module-level.** — `createServiceClient()` is invoked inside `fetchEfDriftCurrent` (`actions/ef-drift.ts:34`), not at module scope.
- [x] **Vercel build green.** — Local `next build` exit 0. Page appears in route table as `ƒ /ef-drift` (dynamic, server-rendered). Vercel verification pending push trigger.
- [x] **Direct URL works; no top-nav/sidebar link added.** — `components/sidebar.tsx` not modified. Page is reachable only by direct URL `/ef-drift`.
- [x] **Commit SHA reported.** — `66aea99` in `Invegent/invegent-dashboard` `main`.

---

## Files added

| File | Purpose |
|---|---|
| `actions/ef-drift.ts` | Server-action data fetcher. Calls `createServiceClient()` inside the helper; queries `m.vw_ef_drift_current` via `exec_sql` RPC, returns typed `DriftRow[]`. |
| `app/(dashboard)/ef-drift/page.tsx` | Server-component page. Header, 4 summary cards, SD-risk pinned section, Active drift findings, collapsible Background Observations. Class + severity badge maps follow brief §6. |

No other files modified — sidebar, middleware, layout, package.json all untouched.

---

## Verification next steps (chat owns)

Once Vercel preview/production builds the new commit, chat runs §8 V1–V5 SQL queries against the live deployment to confirm the panel matches `m.vw_ef_drift_current` state.

PK manual checks (§8 visual):
- Page loads without errors.
- 3 SD-risk rows visible at top in red panel without scrolling on a 1080p desktop.
- 3 non-SD-risk active findings visible without scrolling.
- Background observations collapsed by default.
- Mobile (375px width): all sections stack, summary cards 2x2 grid.

---

## Out of scope (deferred per §9 + user instruction)

- Stage 3 `scripts/safe-deploy.sh` — held until Stage 2b accepted.
- P1 SECURITY-DEFINER triage (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — held until Stage 2b accepted.
- Dashboard roadmap PHASES reconciliation (carry-forward from v2.45/v2.46/v2.47) — separate deferred task; not bundled.
- Refresh button, filters/sort, trend charts, top-nav link — Phase 4 B-09-36.

---

*Stage 2b ships standalone. Awaiting chat §8 verification + PK acceptance.*
