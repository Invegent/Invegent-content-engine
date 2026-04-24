# CC-TASK-01 — Dashboard roadmap sync (22 Apr + 24 Apr full day)

**Priority:** P1 — overdue per standing rule
**Estimated effort:** 20-30 minutes
**Risk:** LOW — one file edit, no DB, no hot path
**Trigger:** PK pings `@InvegentICEbot` with this file path

---

## CONTEXT

Per standing rule: whenever `docs/00_sync_state.md` is updated, the `PHASES` array + `lastUpdated` date in `invegent-dashboard/app/(dashboard)/roadmap/page.tsx` must be synced in the same session. This sync is overdue — covers 22 Apr closures plus 24 Apr full-day work (morning housekeeping, mid-day A11b, afternoon cron monitoring, late afternoon A21 audit, evening router catalog unification).

## SETUP — READ FIRST

1. Read `docs/00_sync_state.md` in full — the authoritative state summary. This task's content is sourced from there.
2. Read `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` for evening context.
3. Read `docs/briefs/2026-04-24-a21-on-conflict-audit.md` for late-afternoon context.
4. Read `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md` for afternoon context.
5. Dev workflow: direct-push to main per the standing rule adopted 22 Apr (D165 context).
6. Before starting: orphan branch sweep on `invegent-dashboard` repo. Flag any non-main branches.

## OBJECTIVE

Update `app/(dashboard)/roadmap/page.tsx` in `github.com/Invegent/invegent-dashboard` to reflect all closures from 22-24 Apr 2026. Specifically:

- Update the `lastUpdated` date constant to `2026-04-24`
- Update the `PHASES` array to reflect closures listed below
- Maintain existing prose style (don't rewrite sections that don't need changes)
- Deploy to Vercel (auto-deploy on main push)

## CLOSURES TO REFLECT

### 22 Apr
- M5 — getPublishSchedule RPC hardening
- M6 — portal exec_sql eradication
- M7 — dashboard feeds/create exec_sql
- M8 — bundler draft multiplication (Gate 4 passed 24 Apr AM)
- M9 — client-switch staleness
- M11 — FB-vs-IG publish disparity
- Q4 — A7 privacy policy update
- D166 — router sequencing reversal
- D167 — router MVP shadow infrastructure (R1+R2+R3 landed)
- Privacy policy migration + invegent.com domain verified for Meta

### 24 Apr morning
- Orphan branch sweep clean
- M8 Gate 4 regression check — PASSED (zero duplicate canonicals)
- CFW wiring correction (was wrongly flagged "never wired")

### 24 Apr mid-day
- **M1 / A11b CLOSED** — CFW full stack locked + Invegent v0.1 locked
- `chk_persona_type` constraint widened for hybrid_operator_and_avatar
- 6 `c.content_type_prompt` rows seeded for CFW (FB/IG/LI × rewrite_v1/synth_bundle_v1)

### 24 Apr afternoon
- **Cron failure-rate monitoring Layer 1 LIVE** — watches 46 crons every 15 min via `m.refresh_cron_health()`
- **Q5 CLOSED** — `public.check_token_expiry()` schema drift fixed (8-day silent outage ended)
- First refresh caught and fixed a live bug same session

### 24 Apr late afternoon
- **L6 / A21 ON CONFLICT audit CLOSED** — 2 orphaned v1 seed functions dropped, 7 redundant unique constraints/indexes cleaned up, 1 architectural inconsistency flagged for R6

### 24 Apr evening
- **Router catalog unification SHIPPED** — Findings 2, 3, 5, 6, 9 closed from the hardcoded-values audit:
  - `t.5.0_social_platform` extended with `is_router_target` + `content_pipeline`
  - 17 platforms catalogued (14 existing + 3 new: blog/newsletter/website)
  - 29 FKs replacing 7 hardcoded CHECK constraints
  - Validation view switched to ABS tolerance
  - CFW + Invegent backfilled with explicit digest_policy rows
- **BONUS:** `k.refresh_column_registry` multi-FK bug fixed (DISTINCT ON)
- R4 classifier spec v2 (table-driven) committed
- Comprehensive hardcoded-values audit committed (9 findings, 5 closed)

## METHOD

1. `git clone` or `cd` into `invegent-dashboard`
2. Open `app/(dashboard)/roadmap/page.tsx`
3. Study the existing `PHASES` array shape — match the style of existing entries exactly
4. Add entries for each closure above, grouping by phase (most of this is Phase 1/Phase 2 already complete → Phase 3 active work)
5. Update `lastUpdated` constant to `'2026-04-24'`
6. Run `pnpm build` (or `npm run build`) locally to catch type errors before push
7. Commit directly to `main` with the message below
8. Monitor Vercel deployment — should be green within ~60s
9. Verify `/roadmap` renders with new entries

## DELIVERABLES

**File edited:** `invegent-dashboard/app/(dashboard)/roadmap/page.tsx`

**Commit message:**
```
docs(roadmap): sync 22 Apr + 24 Apr full-day closures

Covers:
- 22 Apr: M5/M6/M7/M8/M9/M11/Q4 sprint closures, D166/D167 router pivot, privacy policy migration
- 24 Apr morning: orphan sweep, M8 Gate 4 regression PASS, CFW correction
- 24 Apr mid-day: M1/A11b CLOSED (CFW full stack + Invegent v0.1)
- 24 Apr afternoon: Cron monitoring Layer 1 LIVE, Q5 token-expiry fix
- 24 Apr late afternoon: L6/A21 ON CONFLICT audit CLOSED
- 24 Apr evening: Router catalog unification SHIPPED, Findings 2/3/5/6/9 closed, k.refresh_column_registry robustness fix

lastUpdated bumped to 2026-04-24.

Source: docs/00_sync_state.md (evening version committed in Invegent-content-engine).
```

**Closes brief task:** `docs/briefs/claude-code/2026-04-25-cc-task-01-dashboard-roadmap-sync.md`

## VERIFICATION CHECKLIST

- [ ] `lastUpdated` shows `2026-04-24`
- [ ] All closures listed above appear in the appropriate phase section
- [ ] `pnpm build` passes locally
- [ ] Vercel deployment green
- [ ] `/roadmap` page renders without errors
- [ ] Orphan branch sweep performed at session start (no new orphans created)

## OUT OF SCOPE

- Any DB work
- Any code changes outside `page.tsx`
- Any changes to the roadmap's visual design / layout
- Backfilling older dates (only 22-24 Apr window matters for this sync)

## COMMIT BACK TO SYNC_STATE

After this lands, add a single line to `docs/00_sync_state.md` under "TODAY'S COMMITS" noting "Dashboard roadmap sync CC-TASK-01 CLOSED — commit {sha}". This closes the loop.
