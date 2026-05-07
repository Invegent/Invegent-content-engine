# Brief — F-EF-DRIFT-PREVENTION Stage 2b: Dashboard Drift Panel

**Author:** chat (v2.47, 2026-05-07 Sydney)
**Target:** Claude Code (CC)
**Repo:** `Invegent/invegent-dashboard`
**Estimated effort:** 1.5–2 hours
**Status:** Drafted, pending D-01 review

---

## 1. Goal

Make the cron-verified `m.vw_ef_drift_current` data **visible and auditable** in the operations dashboard before adding any deploy-time enforcement (Stage 3). Operator (PK) must be able to inspect the full 49-EF drift state at a glance, with the 3 SECURITY-DEFINER regression-risk rows pinned and unmissable.

This is the third stage of the F-EF-DRIFT-PREVENTION programme:

- **Stage 1 (closed v2.41):** Backend foundation — `m.ef_drift_log` table + `vw_ef_drift_current` view + `drift-check` Edge Function.
- **Stage 2a (closed v2.44):** Daily cron + 90-day retention cron applied. Verified via S30 (v2.47) — first natural fire 2026-05-06 17:00 UTC succeeded, 49 rows written.
- **Stage 2b (this brief):** Dashboard panel.
- **Stage 3 (held):** `scripts/safe-deploy.sh` deploy enforcement. Held until Stage 2b is shipped and PK has inspected the panel state.

---

## 1.5 Pre-flight discovery (CC executes before any code is written)

The brief makes three assumptions that CC must verify against the actual repo before implementation, and adapt where necessary. **Do not assume — discover.** Report findings in the result file even if assumptions held.

**1.5.1 Route convention.** Brief assumes an `/admin/*` route grouping exists. CC inspects `app/` (Next.js App Router) to determine the canonical operator-only route pattern. If the convention is `/internal/*`, `/ops/*`, `/(operator)/*`, or anything else — adapt the panel route accordingly. Document the discovered convention in the result file.

**1.5.2 Auth gate.** Brief assumes there is an existing auth gate for operator-only pages. CC identifies how the existing operator-only pages (e.g. the `/connect` flow, client management, anything that requires the operator session and not a tenant session) gate access — middleware? layout-level redirect? server-component auth check? — and uses the *same* mechanism for the new drift panel. **Do not invent a new auth pattern.** If no operator-only auth pattern exists in the repo and the dashboard is currently fully open or only-PK-by-deploy-restriction, document that and proceed without adding new auth (the panel reads operations-internal data via service-role on the server, never exposed client-side; the data is not personally-sensitive).

**1.5.3 UI library.** Brief assumes shadcn/ui primitives are canonical. CC inspects `package.json` and existing pages to confirm. If shadcn/ui is in use → use Card/Badge/Table/Collapsible from `@/components/ui/*`. If a different library is canonical (Radix raw, Headless UI, hand-rolled with Tailwind only) → use *that* convention. The visual outcome described in §5 must be achievable in any of these; the implementation primitives are flexible.

**1.5.4 Output of pre-flight.** Before writing the page, CC briefly notes (e.g. as a comment in the PR description or first lines of the result file): the chosen route, the auth mechanism reused, the UI primitives used. This is a 3-bullet note — not a new design doc.

If any of the three discoveries reveal a constraint that meaningfully changes the brief (e.g. operator-only auth doesn't exist in repo and PK has not yet built it), CC pauses and reports back rather than improvising.

---

## 2. Context — what S30 verified (read this before building)

S30 verification (v2.47) confirmed the cron-driven scan pipeline works end-to-end:

| Metric | Value |
|---|---|
| Cron `drift-check-daily-fire` (jobid 80) | Fires `0 17 * * *` UTC daily |
| First natural fire | 2026-05-06 17:00:00 UTC (= 03:00 AEST 7 May), `succeeded` |
| Retention cron `ef-drift-log-retention-90d` (jobid 81) | Fires `15 17 * * *` UTC daily, `DELETE 0` (no rows >90d) |
| New `drift_check_run_id` from cron | `c3446a47-2cb2-4ad4-b4f3-25059b324b25` |
| Rows written | 49 (1 per EF slug) |
| Class distribution | A=16, A-LE=9, B-RR=5, B-FD=1, C=9, D=7, repo-only=2 |
| SD-risk count | 3 (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`) |
| `vw_ef_drift_current` reads | latest run only (DISTINCT ON slug ordered by `checked_at` DESC) |

The dashboard panel must display this exact state.

---

## 3. Data source

### 3.1 Primary view: `m.vw_ef_drift_current`

DISTINCT-ON-by-slug latest-row view. Reads `m.ef_drift_log` and projects the most-recent row per slug, plus two computed columns (`first_seen_in_class`, `last_resolved_at`).

**Columns to consume:**

| Column | Type | Notes |
|---|---|---|
| `slug` | text | EF identifier (PK) |
| `last_checked_at` | timestamptz | Most recent scan timestamp |
| `drift_check_run_id` | uuid | Run UUID — display truncated (first 8) |
| `current_class` | text | One of: `A`, `A-LE`, `B-FD`, `B-RR`, `C`, `D`, `repo-only` |
| `direction` | text | `repo-ahead`, `deploy-ahead`, `match`, `unknown` |
| `severity` | text | `P1`, `P2`, `P3`, or NULL |
| `deploy_version` | text | Currently deployed version |
| `repo_version` | text | Repo source version |
| `repo_path_status` | text | `present`, `repo-only`, etc. |
| `deployed_hash_normalised` | text | For deep diff comparison |
| `repo_hash_normalised` | text | For deep diff comparison |
| `security_definer_regression_risk` | boolean | **Pinning trigger** |
| `is_first_observation` | boolean | TRUE on first scan that ever observed this slug |
| `previous_class` | text | Class on prior scan (NULL if first observation) |
| `state_changed` | boolean | TRUE if class changed vs prior scan |
| `notes` | text | Operator-readable summary |
| `first_seen_in_class` | timestamptz | When current class was first observed |
| `last_resolved_at` | timestamptz | Most recent A/A-LE timestamp (NULL if never resolved) |

### 3.2 Read pattern

- **Server-side** read via Next.js server component (`async` page).
- **Service-role client** (`SUPABASE_SERVICE_ROLE_KEY` env). Drift data is operations-internal — not exposed to client tenants.
- **Single query**: `SELECT * FROM m.vw_ef_drift_current ORDER BY current_class, slug` is sufficient. No JOINs needed; view already pre-aggregates.
- **No client-side polling.** Refresh on page load only. Add a "Refresh" button later in Stage 2b v2 if needed.

### 3.3 Tech constraints (carry-forward from existing dashboard patterns)

- `export const dynamic = 'force-dynamic'` on the page (prevents static caching of mutable drift state).
- `createClient()` inside a helper function, **not** at module level (Vercel build-time eval otherwise fails per prior 8–14s build-fail incidents).
- Auth: same admin gate as existing operator-only pages (e.g. `/admin/*` routes if that pattern exists; otherwise gate behind whatever protects `/connect` and `/clients`).

---

## 4. Page route

**Interim location:** `/admin/ef-drift` (or whichever `/admin/*` pattern matches the existing dashboard).

**Architectural note (do not alter):** The Dashboard Architecture Review of 2026-05 (`docs/dashboard-review-2026-05/`) reserves the **final** drift panel slot under **NOW > Investigate** per `06_final_target_design.md` §6.9, with full implementation in **Phase 4 B-09-36** of `09_implementation_plan.md`. Stage 2b is an **interim location**. To minimise rework when Phase 4 ships:

- **Do** publish the panel at `/admin/ef-drift`.
- **Do** make it accessible by direct URL.
- **Do not** add a top-nav or sidebar link to it. PK will navigate by URL during Stage 2b's interim life.
- **Do not** invest UI scaffolding (filters, sorting, pagination beyond row-count) that will be replaced in Phase 4.

---

## 5. Layout

The panel has 4 vertical sections, top-down:

### 5.1 Header (always visible)

- Title: **EF Deployment Drift**
- Subtitle line: `Last scan: {last_checked_at relative} · {last_checked_at absolute UTC} · run {drift_check_run_id first 8 chars}`
- Right-aligned: small badge with cron status — green dot + "Daily 17:00 UTC" if jobid 80 is `active=true`, red dot + "Cron paused" if not. (Stage 2b can hardcode green; Stage 3 will wire actual status.)

### 5.2 Summary cards (4-up grid, full width on desktop, stacked on mobile)

| Card | Number | Label | Border colour |
|---|---|---|---|
| Total scanned | 49 | "EFs scanned" | neutral |
| SD-risk | 3 | "SECURITY-DEFINER regression risk" | red |
| Active drift | 6 | "Active drift findings" (B-FD + B-RR) | amber |
| Clean | 25 | "In-spec" (A + A-LE) | green |

The 6 / 25 totals must be computed from the data, not hardcoded.

### 5.3 🚨 SD-risk pinned section (always rendered, always at top below summary cards, even if empty)

**Heading:** "🚨 SECURITY-DEFINER regression risk — DO NOT REDEPLOY without triage"

**Background:** red-50 panel, red-300 border, red-900 text.

**Rows:** filtered to `security_definer_regression_risk = true`. Currently 3:

- `draft-notifier` (P1, B-RR, 1.1.0 deployed, 1.0.0 repo)
- `heygen-avatar-creator` (P1, B-RR, 2.2.0 deployed, 2.0.0 repo)
- `heygen-avatar-poller` (P1, B-RR, 2.0.0 deployed, 1.0.0 repo)

**Per-row display:**
- Slug (mono, large)
- Class badge (B-RR, amber)
- Severity badge (P1, red)
- Lock icon (🔒) before slug — denotes SD-risk
- Two-column version block: `Deployed v{x}` | `Repo v{y}`
- `notes` truncated to ~120 chars with hover-expand for full

**Empty state:** if zero rows, render dim-grey panel "No SECURITY-DEFINER regression risks detected. ✅" (still in red-bordered container so the slot is recognisable when populated).

### 5.4 Active drift findings (B-FD + B-RR rows where `security_definer_regression_risk = false`)

**Heading:** "Active drift findings"

**Currently 3 rows:**
- `insights-worker` (P2, B-RR, 14.0.0 deployed, 1.6.0 repo)
- `series-writer` (P2, B-RR, 1.3.0 deployed, 1.2.0 repo)
- `feed-discovery` (P3, B-FD, 1.1.0 deployed, 1.2.0 repo — repo ahead)

**Per-row display:** same shape as 5.3 minus the lock icon.

**Empty state:** "No active drift findings."

### 5.5 Background observations (collapsible, default collapsed)

**Heading button:** "Background observations (43)" — click to expand.

**When expanded:** plain table grouped by `current_class`:
- A (16) — In-spec, repo and deployed match.
- A-LE (9) — In-spec, local edit pattern (acceptable).
- C (9)
- D (7)
- repo-only (2) — `ai-diagnostic`, `linkedin-publisher` per carry-forward "do not deploy or remove".

**Per-row display:** slug · class badge · deployed_v · repo_v · last_checked_at relative.

---

## 6. Component primitives

Use existing shadcn/ui primitives where the dashboard already uses them. If shadcn isn't standard, use Tailwind directly.

- Card / Badge / Table / Collapsible (shadcn) or hand-rolled equivalents.
- Lucide icons: `Lock` (for SD-risk), `AlertTriangle` (active drift), `CheckCircle2` (clean), `RefreshCw` (last scan).

**Class badge colour map:**

| Class | Background | Text | Note |
|---|---|---|---|
| A | green-100 | green-900 | "In-spec" |
| A-LE | green-50 | green-700 | "In-spec (local edit)" |
| B-FD | amber-100 | amber-900 | "Functional drift" |
| B-RR | amber-200 | amber-900 | "Regression risk" (heavier) |
| C | sky-100 | sky-900 | "Lower-priority drift" |
| D | slate-100 | slate-700 | "Documentation/metadata drift" |
| repo-only | violet-100 | violet-900 | "Repo-only — not deployed" |

**Severity badge colour map:**

| Severity | Background | Text |
|---|---|---|
| P1 | red-600 | white |
| P2 | amber-500 | white |
| P3 | yellow-200 | yellow-900 |
| (NULL) | (no badge) | – |

---

## 7. Read-only enforcement

This panel **must not** perform any mutation. No PUT/POST/PATCH/DELETE. No Supabase RPC calls that mutate. No buttons that fire actions. Read-only display surface only.

If CC is tempted to add a "rescan now" button, **do not.** That belongs in Stage 3 (`safe-deploy.sh`) or Phase 4 B-09-36, not Stage 2b.

---

## 8. Verification queries (chat will run post-deploy)

CC does not run these — chat runs them after CC pushes and Vercel deploys.

```sql
-- V1: row count matches
SELECT COUNT(*) AS expected_49 FROM m.vw_ef_drift_current;

-- V2: class distribution matches S30
SELECT current_class, COUNT(*) AS n
FROM m.vw_ef_drift_current
GROUP BY current_class
ORDER BY n DESC;

-- V3: SD-risk pinning candidates
SELECT slug, current_class, severity, deploy_version, repo_version
FROM m.vw_ef_drift_current
WHERE security_definer_regression_risk = true
ORDER BY slug;

-- V4: active drift (non-SD-risk)
SELECT slug, current_class, severity, deploy_version, repo_version
FROM m.vw_ef_drift_current
WHERE current_class IN ('B-FD', 'B-RR')
  AND security_definer_regression_risk = false
ORDER BY current_class, slug;

-- V5: cron run identity
SELECT DISTINCT drift_check_run_id, MAX(last_checked_at) AS latest
FROM m.vw_ef_drift_current
GROUP BY drift_check_run_id;
```

Manual visual checks (PK):
- Page loads without errors.
- 3 SD-risk rows visible at top in red panel without scrolling on a 1080p desktop.
- 3 non-SD-risk active findings visible without scrolling.
- Background observations collapsed by default.
- Mobile (375px width): all sections stack, summary cards 2x2 grid.

---

## 9. Out of scope (defer)

- Deploy-time enforcement (`scripts/safe-deploy.sh`) — Stage 3.
- One-click triage actions ("approve", "ack", "ignore") — Phase 4 B-09-36.
- Filters / sort / search beyond what's described in §5 — Phase 4.
- Trend charts (drift over time) — Phase 4.
- Multi-run comparison — Phase 4.
- Top-nav / sidebar link — Phase 4 (Stage 2b is interim).
- Refresh button — defer to Stage 2b v2 if PK requests after Stage 2b ships.

---

## 10. Acceptance criteria (CC reports against these in result file)

CC commits a `2026-05-07-f-ef-drift-prevention-stage-2b-result.md` file in `docs/briefs/` after build, capturing:

- [ ] Page route shipped at `/admin/ef-drift` (or specify final route if different).
- [ ] Panel renders 49 rows total without errors.
- [ ] 3 SD-risk rows pinned at top in red panel.
- [ ] 6 active drift findings (3 SD-risk + 3 non-SD-risk B-FD/B-RR) visible above the fold.
- [ ] Background observations collapsible, default collapsed.
- [ ] Mobile responsive (375px width tested).
- [ ] No mutation surfaces.
- [ ] `export const dynamic = 'force-dynamic'` set.
- [ ] `createClient()` inside helper, not module-level.
- [ ] Vercel build green.
- [ ] Direct URL works; no top-nav/sidebar link added.
- [ ] Commit SHA reported.

---

## 11. References

- Architecture review: `docs/dashboard-review-2026-05/06_final_target_design.md` §6.9 (final placement under NOW > Investigate).
- Implementation plan: `docs/dashboard-review-2026-05/09_implementation_plan.md` Phase 4 B-09-36 (final replacement).
- Stage 1 brief: `docs/briefs/2026-05-05-f-ef-drift-prevention.md`.
- S30 closure: `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` (this session).
- Standing rule D-PREV-16: F-EF-DRIFT-PREVENTION Option F is approved target design.

---

## 12. D-01 review record

- **Review ID:** `e0ab4a0b-3593-4323-ade5-076b90c1343b`
- **Verdict:** `partial` — `escalate=true`, risk_level `medium`, confidence `medium`
- **Pushback shape:** echo-of-self-disclosed-weak-evidence (Lesson #62 pattern). All three pushback points were self-flagged in the review fire's `known_weak_evidence` block. `verified_claims` confirmed the brief is read-only / no mutations.
- **Corrected_action:** "Include a step for the CC to confirm the existence of the /admin/* route structure and verify the authentication pattern before proceeding."
- **Incorporation:** Added §1.5 *Pre-flight discovery* requiring CC to verify route convention, auth gate, and UI library against the actual repo before writing any code. This addresses all three pushback points without re-firing the review.
- **PK approval gate:** PK reviews this brief (with §1.5 added) and confirms execution. The escalate=true on the original fire means chat does not auto-proceed; PK explicitly authorises the hand-off to CC.

---

*Brief authored 2026-05-07 Sydney. v2.47.*
