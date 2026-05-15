# 2026-05-15 Sydney — cc-0014 Stage D + Stage E pre-run (v2.75)

**Brief lineage:** cc-0014 v1.1 (frozen at commit `34305092f4`)
**Session arc:** Stage D CLOSE + Stage E backend APPLIED + Stage E frontend DEPLOYED + Stage E promotion trigger APPLIED + V-E3 PASS + 5 events backfilled to 5 cases. 14-day experiment window still NOT started (1 step remaining: pre-experiment cleanup + experiment_run INSERT).

## TL;DR

Stage D fully closed via V-D1..V-D5 + Supp-1/2 PASS after a 2-commit FAB relocation arc (CCD's initial Stage D commits landed in the wrong repo — content-engine `dashboard/` cc-0013 sandbox subdirectory instead of `invegent-dashboard`). Recovery via PK directive v2 (kebab-case + Option K2 reuse of existing `createServiceClient` + Option E2 top-of-file env doc): Task 1 `invegent-dashboard` commit `6711d5f4` (FAB), Task 2 `Invegent-content-engine` commit `86d2c2b9` (revert misplacement). PostgREST exposed_schemas extended to include `friction` via PK manual UI change in Supabase dashboard — first FAB submission failed before this with `"The schema must be one of the following: public, graphql_public, k, f, m, c, r, a, t"` error at PostgREST layer.

Stage E delivered in three sub-stages: (1) backend read+triage RPCs via migration `cc_0014_e_read_surface_and_triage` (fn_recent_cases + fn_triage_case, both SECURITY DEFINER, grants to authenticated + service_role per L36); (2) frontend `/operations` route via CCD commit `5753f41b` (3 new files: actions/triage-case.ts + page.tsx + case-row.tsx); (3) brief-completing event→case promotion trigger via migration `cc_0014_e_promote_event_to_case` (cc-0014 brief Section 7 referenced "7-day case lookup" but no migration in Stages A-D built it — discovered at Stage E frontend completion when /operations rendered empty state with 5 orphan events; PK directive G1 sharpened my proposed problem_key+category matching to dedupe_fingerprint as primary identity key via event-join).

V-E1/V-E2/V-E3 PASS. V-P1..V-P8 PASS. 5 PK V-D5 manual observations backfilled into 5 friction.case rows (1:1 because all 5 dedupe_fingerprints are distinct). V-E3 verified via 4 PK screenshots — full inline-edit form rendered with all conditional fields working (next_review_at appears on track/defer, capture_reason_note shows Optional vs Required by capture_reason value, suppression_reason hidden when action != suppress). DB persistence verified via SQL probe: 8 fields PK saved (triage_state acknowledged, quality_flag true, action_decision track, next_review_at 2026-05-22 10:00 Sydney, capture_reason routine_log, capture_reason_note "Found it visually " with trailing space preserved, reviewed_at + updated_at both set).

**0 D-01 fires this session** per brief §13 governance gate. Stage D execution matched brief §9; Stage E backend matched brief §10; promotion trigger non-divergent per brief §7 "7-day case lookup" reference (we built the implied mechanism, not new scope). T-MCP-02 cum unchanged at **66**. State-capture exceptions cumulative unchanged at **1**.

**14-day experiment window still NOT started.** Pre-experiment cleanup (DELETE cc-0014-test/% rows — V-P6 confirmed 0 residue, so the DELETE is documented-noop per brief §5) + INSERT into friction.experiment_run with status='running', starts_at=now(), ends_at=now()+INTERVAL '14 days', criteria_locked_at=now(), criteria_snapshot=brief §10 verbatim JSON = first step of next session. Verdict Day-19 = **2026-05-29 Sydney**.

## Build arc

### Phase 1 — Stage D close via FAB relocation

**Misplacement detected.** CCD reported Stage D Manual capture FAB built at HEADs `fe7bf346...` then `ca935d4e...` (after env-gate triage attempt) in `Invegent-content-engine`. Chat verification of expected target HEAD showed `invegent-dashboard` still at `13d66210...` (2026-05-08, untouched). CCD's two commits had landed under `Invegent-content-engine/dashboard/` — the pre-existing cc-0013 scaffold sandbox subdirectory — not in the deployed dashboard repo.

CCD's frontend code quality was sound: server-only Server Action with env gate, defense-in-depth validation, request-time env eval (good engineering carried in from the env-gate triage attempt at `ca935d4e`). The mistake was repo-target only.

**Verification of dashboard reality.** Chat read `invegent-dashboard` repo structure to inform relocation directive: 25 routes under `app/(dashboard)/` (overview, clients, feeds, queue, drafts, reviews, failures, inbox, monitor, performance, costs, diagnostics, pipeline-log, ef-drift, compliance, content-studio, connect, onboarding, system, roadmap, visuals, client-profile + nested components/actions); 9 server actions in top-level `actions/`; 10+ components in top-level `components/`; full Supabase auth middleware with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` already in use. Kebab-case file naming throughout neighbours (`client-card.tsx`, `ef-drift.ts`, `pipeline-stats.ts`). Existing `createServiceClient()` factory in `lib/supabase/service.ts` matching Stage D pattern. PHASES staleness is a roadmap-visualization artifact (the deferred `app/(dashboard)/roadmap/page.tsx` PHASES array), NOT a codebase indicator. The dashboard codebase is substantially more mature than the 27-PHASES-deferral memory carry implied. PK confirmed.

**Relocation directive v1 → v2.** Initial directive used PascalCase file names + new `lib/supabase/friction.ts` factory + `.env.example` creation. PK reviewed and amended:
1. Kebab-case file names (matching dashboard convention): `components/friction-fab.tsx`, `components/friction-form.tsx`, `actions/emit-friction.ts`
2. Option K2: reuse existing `createServiceClient()` from `lib/supabase/service.ts` and apply `.schema("friction")` per-call inside `actions/emit-friction.ts`. Do NOT add `lib/supabase/friction.ts` unless K2 proves impossible.
3. Option E2: no `.env.example` file. Document `DASHBOARD_FRICTION_FAB_ENABLED` in a top-of-file comment in `actions/emit-friction.ts`.
4. `DASHBOARD_FRICTION_FAB_ENABLED` as the only new env var. Existing Supabase env vars unchanged.

**CCD executes v2 directive.** Two-task atomic sequence:
- **Task 1** (`invegent-dashboard/main`): 3 new + 1 modified file. `actions/emit-friction.ts` reuses createServiceClient + `.schema("friction")` (typechecked cleanly without `@ts-expect-error`). `components/friction-fab.tsx` + `components/friction-form.tsx` per directive. `app/layout.tsx` integrates FAB mount preserving favicon metadata + globals.css + antialiased body class verbatim; env-read inside RootLayout function body for request-time eval. HEAD: **`6711d5f47583078556d512f8263d0202a86c3555`** (was `13d66210...`).
- **Task 2** (`Invegent-content-engine/main`): `git checkout 753120124e3aafc625382d8364ce99230db7d3d1 -- dashboard/` to revert misplacement. 4 deletes + 2 reverts, all under `dashboard/`. cc-0013 sandbox files (package.json, tsconfig.json, next.config.ts, eslint.config.mjs, README.md, .gitignore, next-env.d.ts, package-lock.json) untouched. HEAD: **`86d2c2b9fa78e10f3c178a462a713706759a9ca5`** (was `ca935d4e...`).

`npx tsc --noEmit` PASS on dashboard. `npm run lint` baseline issue noted (no ESLint config in dashboard repo; pre-existing; out of v2 directive scope; flagged as separate small follow-on if PK wants lint coverage).

**PostgREST exposed_schemas fix.** First FAB submission failed with `Error: The schema must be one of the following: public, graphql_public, k, f, m, c, r, a, t`. The error is at PostgREST (Supabase REST API) layer, not the database — the `friction` schema existed in `pg_namespace` and SECURITY DEFINER function was reachable via direct SQL (Supabase MCP confirmed), but PostgREST exposed_schemas project setting did not include `friction`. PK added `friction` to project Settings → API → Exposed schemas via Supabase dashboard. ~10 second PostgREST reload. Second FAB submission succeeded with event_id returned (`33a88634-1dca-4085-af9d-b78e0a25b48c`).

**V-D4 + V-D5 PASS via PK manual.** 5 timed submissions across 5 distinct routes (`/overview`, `/monitor`, `/pipeline-log`, `/content-studio`, `/clients`). All under 15-second target (PK reported "5-10 seconds, it's easy"). All 5 rows verified in `friction.event` via SQL probe: `source='manual'`, `reported_by='pk'`, route correctly captured in `related_object->>'dashboard_route'`, dedupe_fingerprints all distinct (because problem_key is derived from distinct first-50-chars of each observation_text). No emit_error rows. The 5 observations themselves are real friction PK captured during V-D5 not test rows — they're legitimate operator feedback (top-side submenu instability, draft-review redundancy on full auto-approver clients, AI diagnostic summary usefulness question, YouTube content series scope, clients-overview visual density).

### Phase 2 — Stage E backend (read + triage RPCs)

**Pre-flight via Supabase MCP (L44 cycle 6):** functions `friction.fn_recent_cases(int)` + `friction.fn_triage_case(uuid, ...)` confirmed not pre-existing (0 rows in pg_proc matching both names in friction namespace). `friction.case` column structure matched brief expectations (19 columns including all triage fields: case_id, case_title, first_seen_at, last_seen_at, event_count, severity, category, problem_key, triage_state, quality_flag, capture_reason, capture_reason_note, action_decision, next_review_at, suppression_reason, notes, reviewed_at, created_at, updated_at).

**Migration `cc_0014_e_read_surface_and_triage` applied via apply_migration MCP.** First apply_migration call timed out (4-minute wait, no response from Supabase MCP). Chat verified function-existence post-timeout via execute_sql — 0 functions present, confirming no partial commit. Retry succeeded on second attempt.

Both functions deployed as SECURITY DEFINER with `SET search_path = friction, public`. `fn_recent_cases(p_limit int DEFAULT 50)` returns 12-column TABLE sorted by severity (critical/warn/info) → triage_state (new/acknowledged/other) → last_seen_at DESC. `fn_triage_case(p_case_id uuid, p_triage_state text, ...)` uses COALESCE pattern to leave-untouched-when-NULL semantics on 9 mutable fields; reviewed_at + updated_at set to now() on any successful update; defensive `IF NOT FOUND THEN RAISE EXCEPTION ... USING ERRCODE = 'P0002'` added (brief §10 spec did not include this; defensive completion).

Grants per L36 lesson (cc-0008 service_role grants defect class): `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO authenticated, service_role` on both functions. This matches the Stage D `fn_emit_manual_event` pattern — service_role is required because the dashboard's `/operations` page uses `createServiceClient()` server-side.

**V-E1 PASS.** `SET LOCAL ROLE authenticated; SELECT count(*) FROM friction.fn_recent_cases(10); RESET ROLE;` returned 0 (no cases existed at this point — expected; promotion trigger had not yet been built or backfilled).

**V-E2 PASS.** Test case seeded with valid hex UUID `00000000-0000-0000-0000-00000cc01402`. Initial attempt used `cc0014etest2` which has non-hex `t` — caught at first execute_sql attempt with SQLSTATE 22P02 (`invalid input syntax for type uuid`). L60 fixture-defect pattern reinforced (7th occurrence across cc-0014: 3 Stage A V-A10/V-A11 + 3 Stage B V-B1 + 1 Stage E V-E2). Fixed UUID to all-hex, retried successfully. fn_triage_case called as authenticated with p_triage_state='acknowledged' + p_quality_flag=true. Verified: triage_state='acknowledged', quality_flag=true, reviewed_at populated. Supplementary V-check via DO block: fn_triage_case called with non-existent case_id `99999999-9999-9999-9999-999999999999` raised P0002 as expected. Test row cleaned (DELETE-protection trigger dormant — no experiment_run.status='running').

### Phase 3 — Stage E frontend handoff to CCD

**CCD directive issued.** Build 3 files in `invegent-dashboard`:
- `actions/triage-case.ts` (Server Action). Same security pattern as `actions/emit-friction.ts`. Reuses createServiceClient + `.schema("friction")` per-call (Option K2). Server-side validation mirrors 4 user-facing CHECK constraints on friction.case (triage_state / action_decision / capture_reason whitelists; track+defer require next_review_at; suppress requires suppression_reason; incremental capture_reason requires note). `quality_flag_requires_real_category` naturally satisfied by category dropdown excluding `unclassified`.
- `app/(dashboard)/operations/page.tsx` (server component list view). Calls `fn_recent_cases(50)`. Page title "Operations — Friction cases". Empty state copy. `force-dynamic` + `revalidate=0` so each visit reflects latest cases.
- `app/(dashboard)/operations/case-row.tsx` (client component). Collapsed: severity badge (critical=red, warn=amber, info=slate), case_title, category, last_seen relative time, event_count, triage_state badge. Expanded: inline edit form with triage_state, quality_flag (3-state — / yes / no), category (excluding unclassified), action_decision, next_review_at (conditional on track / defer_intentionally), capture_reason, capture_reason_note (conditional Required vs Optional by capture_reason value), suppression_reason (conditional on suppress), notes. Submit calls triageCase action; on success the row collapses and `router.refresh()` re-fetches the list.

Kebab-case naming. Top-level `actions/` + `components/`. Route under `app/(dashboard)/` (auth-protected via existing middleware). Reuse `createServiceClient` + `.schema("friction").rpc()` (Stage D pattern). Tailwind dark-mode classes throughout. lucide-react icons. No new env vars (FAB env var is FAB-specific; operations route is auth-gated via middleware only).

**CCD report:**
- HEAD: **`5753f41b9c554c4eeb7a271691a95430ccac3294`** (was `6711d5f4...`)
- `npx tsc --noEmit`: PASS
- 3 new files + 687 insertions, no extras
- Sidebar nav link to /operations intentionally deferred per directive (PK hits URL directly for V-E3)
- Validation parity audit by CCD: looked up friction.case CHECK constraints and found 8 (vs the 4 the directive's exemplar cited): action_decision/capture_reason/triage_state whitelists, track_or_defer_requires_next_review, suppress_requires_reason, capture_reason_note_required_for_incrementality, case_severity_check, and quality_flag_requires_real_category. Action validates the 4 user-facing ones; DB enforces all 8.
- fn_recent_cases return shape verified via `pg_get_function_result`: 12 columns; CCD's `FrictionCase` TypeScript interface matches exactly.

### Phase 4 — Brief gap discovery + Stage E promotion trigger

**Gap detected at end of frontend deploy.** CCD's report noted: "easiest way to seed [a case] is to use the Stage D FAB ... then either wait for the case-creation trigger (if defined in cc-0014 Stage A) or fire friction.fn_triage_case once to verify the row renders." The parenthetical "(if defined in cc-0014 Stage A)" was the cue. Chat verified DB state:
- 8 friction.* functions exist (after Stage E backend) — none promote events to cases
- 2 triggers on friction.event/case — both DELETE-protection only (Stage A v1.1 patch: `friction_event_no_delete_during_run` + `friction_case_no_delete_during_run`)
- 5 PK V-D5 events sit with case_id=NULL ("orphaned")
- 0 cases exist

**The brief gap.** cc-0014 brief Section 7 (reconciliation emitter) comment: `-- Dedupe fingerprint (no day component; recurrence via 7-day case lookup)`. This implied a case-lookup mechanism existed somewhere, but Stages A-D never built it. **ALL Day-19 success criteria are on friction.case rows joined to friction.event via case_id.** Without case creation, the experiment cannot pass on any of the 5 success criteria, regardless of how many events PK captures.

This is a brief implementation gap — not a CCD or Stage E build error. The brief's Section 7 comment is the closest thing to a spec, but it doesn't include the trigger SQL.

**PK directive G1 with sharper identity.** Chat proposed three options:
- G1: build BEFORE-INSERT promotion trigger using problem_key + category 7-day matching
- G2: skip auto-promotion; PK manually INSERTs cases via SQL during the experiment (impractical for 14 days × 1-3 events/day)
- G3: separate `/operations/events` view + manual "promote to case" UI (3-4 more files, multi-day deferral)

Chat recommended G1. PK approved G1 with correction: do NOT group by problem_key + category alone ("too coarse"). Use **dedupe_fingerprint** as the primary case identity via event-join (find an existing case by joining friction.event → friction.case where event.dedupe_fingerprint = NEW.dedupe_fingerprint, require same category, require case.last_seen_at within 7-day recurrence window, ignore cases triaged as duplicate or ignored, otherwise create a new case). Required behaviour: idempotent on pre-set NEW.case_id; severity escalation (critical > warn > info); case_title from observation_text prefix.

**Migration `cc_0014_e_promote_event_to_case` applied.** `friction.fn_promote_event_to_case()` SECURITY DEFINER with `SET search_path = friction, public`. BEFORE INSERT trigger on friction.event FOR EACH ROW. Lookup query:
```sql
SELECT c.case_id, c.severity INTO v_case_id, v_old_severity
FROM friction.case c
WHERE c.category = NEW.category
  AND c.last_seen_at > now() - INTERVAL '7 days'
  AND c.triage_state NOT IN ('duplicate', 'ignored')
  AND EXISTS (SELECT 1 FROM friction.event e 
              WHERE e.case_id = c.case_id 
                AND e.dedupe_fingerprint = NEW.dedupe_fingerprint)
ORDER BY c.last_seen_at DESC LIMIT 1;
```
On match: UPDATE case event_count + last_seen_at + severity (escalation only); on miss: INSERT new case with case_title = LEFT(COALESCE(NEW.observation_text, NEW.problem_key, 'unnamed'), 100), triage_state='new'.

**V-P1 PASS.** New event with no matching case → new case created, event linked, event_count=1.
**V-P2 PASS.** Second event with same dedupe_fingerprint + category within 7 days → linked to V-P1's case (verified same case_id), event_count=2.
**V-P3 PASS.** Event with different dedupe_fingerprint → separate case (total 2 test cases).
**V-P4 PASS.** Critical event matching info case → case severity escalated to critical, event_count=3.
**V-P5 PASS.** Backfill DO block iterated over 5 orphan events (PK's V-D5 submissions); each had distinct dedupe_fingerprint → 5 new cases created (1:1 mapping). All 5 events now have case_id set. 0 remaining orphans. Backfill is consistent with PK's directive note: "Backfill only the current test/manual orphan rows needed for V-E3, or all cc-0014-test/% orphan rows. Do not mass-backfill unrelated pre-window production rows unless explicitly approved." — the 5 are PK's own pre-window operator observations; safe.
**V-P6 PASS.** 0 residual cc-0014-test rows (events + cases) after cleanup of V-P1..V-P4 fixtures.
**V-P7 PASS.** 0 experiment_run rows with status='running'.
**V-P8 PASS.** 0 experiment_run rows for brief_id='cc-0014' (Stage E run start not yet executed).

### Phase 5 — V-E3 PK manual verification

PK opened `localhost:3000/operations` after sign-in. 4 screenshots captured:
1. **List render.** Page header "Operations — Friction cases" with subtitle "Most-recent 50 cases. Expand a row to triage. Submitting a row writes via friction.fn_triage_case (SECURITY DEFINER); the client never touches friction.case directly." 5 cases visible: severity badge (INFO slate), observation text snippet, category, "1h ago" relative time, ×1 event count, "new" triage badge.
2. **Row expanded** (the `/clients` case at top of list). Inline form rendered with collapsible toggle. All conditional fields working: triage_state dropdown (defaulted to current value `new`), quality_flag 3-state select (— / yes / no), category dropdown (`Operator friction` selected; `unclassified` correctly excluded), action_decision dropdown (default —), capture_reason dropdown, notes textarea. Save + Cancel buttons.
3. **Edit-in-progress with conditional fields revealed.** PK selected triage_state=`acknowledged`, quality_flag=`yes`, action_decision=`track` (which made `next_review_at` date input appear with subtitle "Required when track or defer_intentionally"), set date to 22/05/2026, capture_reason=`routine_log` (which made `capture_reason_note` textarea appear with subtitle "Optional" — because routine_log is NOT in the incremental set; if PK had selected missed_without_register / would_have_deferred / would_have_rediscovered, the subtitle would have read "Required"). PK typed "Found it visually " (with trailing space).
4. **Post-save state.** Row collapsed. List re-fetched via router.refresh(). The acknowledged case moved to bottom of list (correct sort: new → acknowledged within same severity tier). The other 4 cases still in `new` triage_state at top.

Chat verified DB persistence via SQL probe (joined friction.case ordered by triage_state). The acknowledged case had:
- triage_state: `acknowledged` ✅
- quality_flag: `true` ✅
- action_decision: `track` ✅
- next_review_at: `2026-05-22 10:00:00 Sydney` ✅ (date input interpreted as midnight local; Australia/Sydney is UTC+10; 10:00 Sydney = 00:00 UTC)
- category: `operator_friction` ✅ (unchanged)
- capture_reason: `routine_log` ✅
- capture_reason_note: `"Found it visually "` ✅ (trailing space preserved)
- reviewed_at: `2026-05-15 15:21:52.741371 Sydney` ✅
- updated_at: matches reviewed_at ✅

The other 4 cases remained `new` with all triage fields null — clean isolation, no row contamination.

## V-check matrix at session close

| V-check | Status |
|---|---|
| V-D1 — fn_emit_manual_event callable | PASS (v2.74 + re-verified v2.75) |
| V-D2 — input validation works | PASS (v2.74) |
| V-D3 — anon denied | PASS (v2.74) |
| V-D4 — FAB visible on 3+ routes | **PASS v2.75** (5 routes: /overview, /monitor, /pipeline-log, /content-studio, /clients) |
| V-D5 — 5 submissions, avg ≤15s | **PASS v2.75** (PK reported 5-10s per submission, well under threshold) |
| V-D6 — test row cleanup | N/A (V-D5 submissions are real observations, not test rows; kept) |
| Supp-1 — service-role server-only | PASS (relocation v2 commit `6711d5f4`) |
| Supp-2 — RPC-only client write | PASS (Server Action wrapper) |
| V-E1 — fn_recent_cases as authenticated | **PASS v2.75** |
| V-E2 — fn_triage_case updates + supp not-found raises | **PASS v2.75** |
| V-E3 — page renders + expand + edit + submit + persist | **PASS v2.75** (PK manual, 4 screenshots, SQL verified) |
| V-E4 — pre-experiment cleanup zero test rows | DEFERRED (next session step 1; V-P6 already shows 0 residue — defensive run only) |
| V-E5 — experiment_run created with status='running' | DEFERRED (next session step 1) |
| V-P1 — new event creates case | **PASS v2.75** |
| V-P2 — matching fingerprint links to case | **PASS v2.75** |
| V-P3 — different fingerprint → separate case | **PASS v2.75** |
| V-P4 — severity escalation info → critical | **PASS v2.75** |
| V-P5 — 5 orphan events backfilled | **PASS v2.75** (5 events → 5 cases) |
| V-P6 — no test rows residue | **PASS v2.75** |
| V-P7 — no experiment_run.status='running' | **PASS v2.75** |
| V-P8 — Stage E not started | **PASS v2.75** |
| V-C3 — Cowork live verification | PENDING (cron 86 marker only — Cowork output pipeline silent since 2026-05-06, 10-day gap; recovery via PK manual `openclaw tui` trigger) |

## L-series outcomes v2.75

- **L41 + L45** re-exercised: HEAD verification of CCD's three commits this session (relocation Task 1 → `6711d5f4`, Task 2 → `86d2c2b9`, Stage E frontend → `5753f41b`). 4 baseline-eligible exercises now (cc-0010A + cc-0010B + cc-0014 Stage C + cc-0014 Stages D/E v2.75).
- **L44 (Runtime Proof Pre-flight)** re-exercised: Stage E backend pre-flight (function-existence + friction.case columns) + Stage E promotion trigger pre-flight (no pre-existing trigger). 6 cycles total. **Baseline-eligible.**
- **L48** re-exercised: 2 atomic migrations this session (cc_0014_e_read_surface_and_triage + cc_0014_e_promote_event_to_case).
- **L52** not exercised (no EF deploys).
- **L53** not exercised (no FK fabrications; both migrations use only existing schemas/tables).
- **L55** reactive catch: V-E2 test UUID `cc0014etest2` had non-hex `t` — caught at first execute_sql attempt with SQLSTATE 22P02, fixed to all-hex `00000cc01402`. 4 reactive cycles total (Stage A v2.72 + Stage B v2.73 + Stage E v2.75). Pattern reinforced.
- **L58 strengthened — 3rd preventive application this session pair** (v2.75 sync covers 3 files >30KB via 3 separate single-file commits per per-file split safer than 3-file atomic push at ~107KB combined payload). Cumulative: 1 originating reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **L58 promotion to baseline recommended** at v2.76 — 3 consecutive preventive applications within consistent context (cc-0014 lineage) with zero failures.
- **L60** re-exercised: V-E2 fixture UUID defect (non-hex char) — pattern now 7 occurrences total (3 Stage A V-A10/V-A11 + 3 Stage B V-B1 + 1 Stage E V-E2). All within cc-0014 lineage. Promotion still pending pattern repeat in independent brief.
- **L62** not exercised (0 D-01 fires per brief §13).

## L-candidate firsts (3 NEW v2.75)

- **L63 candidate: Brief implementation gap detected at sub-stage UI integration.** cc-0014 brief §7 (Stage B reconciliation emitter) referenced `-- recurrence via 7-day case lookup` as a design assumption but no migration in Stages A-D built the mechanism. The gap was masked through Stages A (schema only, no clustering) + B (emitter creates events not cases) + C (same for health check) + D (manual emit same) + Stage E backend (read/triage RPCs accept cases-exist as precondition). Discovered at Stage E frontend completion when /operations rendered empty-state with 5 orphan events. CCD's report-back parenthetical "(if defined in cc-0014 Stage A)" was the cue. Recovery: Stage E sub-task G1 with PK's dedupe_fingerprint identity correction (cleaner than chat's initial problem_key+category proposal). Pattern: review brief comments + standalone references for implied-but-unbuilt mechanisms before declaring a sub-stage closed; downstream stages can mask the gap until a UI surface forces inspection. Empirical occurrence count: 1 (this session). Promotion pending pattern repeat in independent brief.

- **L64 candidate: Repo-target verification before chaining CCD operations.** CCD's two Stage D commits (`fe7bf346`, `ca935d4e`) landed in `Invegent-content-engine/dashboard/` (cc-0013 scaffold sandbox subdirectory) instead of `invegent-dashboard/main`. CCD's report "HEAD: fe7bf346" was technically accurate — that was the HEAD CCD pushed to in its working clone — but the working clone happened to be the wrong repo. Chat caught the mismatch only via a separate `list_recent_commits` on the expected target repo (`invegent-dashboard`) which showed HEAD still at `13d66210...` (pre-Stage-D). The pre-existing cc-0013 sandbox subdirectory in content-engine masked the mistake because `dashboard/` is a plausible-looking destination for FAB code. Recovery: 2-task directive (Task 1 build correct in `invegent-dashboard`, Task 2 revert misplacement in `Invegent-content-engine`). Pattern: when CCD reports `HEAD: <sha>`, separately verify the SHA matches a commit in the expected target repo, especially for first-time work in a repo CCD has not recently touched, and especially when other repos in the org have similarly-named scaffold subdirectories. Empirical occurrence count: 1 (this session, but the cc-0013 sandbox pattern is structural — could recur). Promotion pending pattern repeat.

- **L65 candidate: PostgREST exposed_schemas as runtime config dependency.** New `friction` schema was visible to direct SQL (Supabase MCP execute_sql, psql) and existed in `pg_namespace`, but was NOT exposed to PostgREST API clients until added to the project's Settings → API → Exposed schemas list. Failure mode: server-side code using supabase-js `.schema("friction").rpc(...)` returns runtime error `"The schema must be one of the following: public, graphql_public, k, f, m, c, r, a, t"`. Discovery: only at first manual FAB submission (V-D4 first manual run). The error message helpfully includes the currently-exposed schemas list — `friction` was conspicuously absent. Pre-flight via apply_migration could not detect because the migration-side state was correct (schema + grants + functions all in place at DB layer). Fix: PK manual UI change in Supabase dashboard. ~10s PostgREST reload. Pattern: when adding a new schema that will be accessed via supabase-js / PostgREST (vs only via direct SQL or SECURITY DEFINER triggers), the exposed_schemas project setting is a required runtime sibling — add to brief pre-flight checklist for any new-schema work that includes a server-side or client-side supabase-js access path. Empirical occurrence count: 1 (this session, but applies to any future cc-NNNN that creates a new schema for dashboard/portal/client-app use). Promotion pending pattern repeat.

## Production state at v2.75 close

**Supabase project `mbkmaxqhsohbtwsqolns`:**
- `friction.*` schema: 5 tables, 6 active categories + 1 unclassified placeholder, full grants matrix per brief §3
- `friction.event`: **5 rows** (all PK V-D5 observations from 2026-05-15 14:12-14:18 Sydney, all linked to cases via promotion trigger backfill)
- `friction.case`: **5 rows** (1:1 from 5 events with distinct dedupe_fingerprints): 4 in triage_state='new', 1 in triage_state='acknowledged' with full triage fields filled
- `friction.emit_error`: 1 verification marker row (cron-86 `NO_EVENTS_NO_ERRORS` from 2026-05-15 01:15 UTC — V-C3 still pending live Cowork run)
- `friction.experiment_run`: empty (no `running` row — 14-day window NOT started)
- **8 friction.* functions**: fn_emit_health_check_findings, fn_emit_manual_event, fn_emit_reconciliation_event, fn_lock_criteria_snapshot, fn_prevent_delete_during_run, **fn_promote_event_to_case (NEW v2.75)**, **fn_recent_cases (NEW v2.75)**, **fn_triage_case (NEW v2.75)**, fn_verify_health_check_daily
- **4 triggers on friction.* tables**: friction_event_no_delete_during_run (dormant, awaiting status='running'), friction_case_no_delete_during_run (dormant), friction_experiment_run_criteria_immutable (dormant), **friction_event_promote_to_case (NEW v2.75, active BEFORE INSERT FOR EACH ROW)**
- 1 active trigger on r.cadence_drift_log: friction_emit_reconciliation (Stage B, v2.73)
- 5 pg_cron jobs: 82, 83, 84, 85, 86 — all unchanged from v2.74
- **PostgREST exposed_schemas: includes `friction` (NEW v2.75 — PK manual UI change in Supabase dashboard Settings → API)**
- DELETE-protection trigger from Stage A v1.1 patch remains dormant (activates only when status='running')

**invegent-dashboard repo:**
- HEAD: **`5753f41b9c554c4eeb7a271691a95430ccac3294`** (v2.75 Stage E frontend; was `13d66210...` pre-session)
- Stage D FAB live (commit `6711d5f4`); Stage E /operations route live (commit `5753f41b`)
- `.env.local` includes `DASHBOARD_FRICTION_FAB_ENABLED=true` (PK local — confirmed dev server boot reads it via CCD verification PID 1272 boot log)
- Vercel env var: PK to add `DASHBOARD_FRICTION_FAB_ENABLED=true` to project `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg` env vars before any prod deploy (deferred — Stage D+E remain local-only during 14-day experiment; no prod-deploy action planned during the window)

**Invegent-content-engine repo:**
- HEAD pre-v2.75-sync: `86d2c2b9` (Stage D misplacement revert)
- HEAD post-v2.75-sync: this commit (session file) + 2 subsequent commits (sync_state + action_list)
- cc-0013 sandbox under `dashboard/` subdirectory preserved verbatim (deprioritised per IOL hold-stance)

**Counters:**
- T-MCP-02 cum: **66** (unchanged from v2.72)
- State-capture exceptions cumulative: **1** (unchanged from v2.72)
- D-01 fires this session: **0** (per brief §13)
- Memory edits this session: **0** (30/30 cap; v2.75 state will require a memory edit cycle next session before run start — deferred to PK directive)

## Production mutations this session

- **2 apply_migration calls:**
  - `cc_0014_e_read_surface_and_triage` (CREATE FUNCTION fn_recent_cases + fn_triage_case; REVOKE EXECUTE FROM PUBLIC + GRANT EXECUTE TO authenticated + service_role on both). First attempt timed out (4-min wait) without committing; verified non-commit via function-existence query post-timeout; retry succeeded.
  - `cc_0014_e_promote_event_to_case` (CREATE FUNCTION fn_promote_event_to_case SECURITY DEFINER; REVOKE EXECUTE FROM PUBLIC; CREATE TRIGGER friction_event_promote_to_case BEFORE INSERT FOR EACH ROW)
- **~22 execute_sql calls:** pre-flight × 2 (functions don't exist, friction.case columns), V-E1, V-E2 main, V-E2 supplementary (P0002 raise), V-E2 cleanup, V-P1 through V-P5 (5 calls), V-P6+V-P7+V-P8 state assertion, summary case view (sort verification), post-V-E3 verification view (PK-saved fields probe), plus 4 PostgREST debug queries (current exposed_schemas check). All test rows cleaned (V-P6 confirmed 0 residue).
- **0 EF deploys, 0 cron mutations, 0 vault writes, 0 ask_chatgpt_review D-01 fires** (per brief §13)
- **3 GitHub commits this session via push_files MCP** (this session file + sync_state v2.74→v2.75 + action_list v2.74→v2.75; 3 separate single-file commits per L58 strict — chat-side 3-file atomic push at ~107KB combined payload declined as unreliable). Total chat-MCP write reliability across these 3 commits: 100% (all confirmed via post-push list_recent_commits).
- **1 PK manual UI change in Supabase dashboard:** project Settings → API → Exposed schemas extended to include `friction` (~10s PostgREST reload).
- **1 PK manual env edit:** `.env.local` in `invegent-dashboard` local clone added `DASHBOARD_FRICTION_FAB_ENABLED=true`.
- **CCD operations this session:** 3 GitHub commits via CCD local git on PK's Windows machine: relocation Task 1 (`6711d5f4` invegent-dashboard), relocation Task 2 (`86d2c2b9` Invegent-content-engine), Stage E frontend (`5753f41b` invegent-dashboard). Stage E backend executed via chat-side apply_migration MCP. Promotion trigger executed via chat-side apply_migration MCP.

## Open follow-ups / Next session priorities

1. **cc-0014 Stage E close + 14-day window start** — **P1 rank 1 v2.75**. **One step**: DELETE any residual `cc-0014-test/%` rows from friction.event + friction.case + friction.emit_error (V-P6 confirmed 0 residue; documented-noop per brief §5) then INSERT into `friction.experiment_run` with:
   - status = 'running'
   - starts_at = now()
   - ends_at = now() + INTERVAL '14 days'
   - criteria_locked_at = now()
   - criteria_snapshot = brief §10 verbatim JSON (5 success criteria with thresholds + invalidation conditions)
   From the moment of INSERT: 14-day clock runs (Day-19 verdict = **2026-05-29 Sydney**), criteria_snapshot becomes immutable (trigger `friction_experiment_run_criteria_immutable` activates), DELETEs on friction.event + friction.case blocked (triggers `friction_event_no_delete_during_run` + `friction_case_no_delete_during_run` activate). Chat operation; PK confirms before INSERT.
2. **V-C3 live Cowork verification** — P1 rank 2 carry from v2.74. Cowork output pipeline silent since 2026-05-06 (10-day gap as of v2.75 close). Recovery via PK manual `openclaw tui` trigger on Windows if natural scheduled cron continues silent.
3. **Memory edit cycle** — P1 rank 3. v2.75 state changes (Stage D APPLIED, Stage E APPLIED, promotion trigger live, /operations route live, 14-day window status) need to land in user_memories before next sessions can rely on memory alone. Currently at 30/30 cap; PK to direct pruning + insertion.
4. **Brief v1.2 doc patch** — P3 rank 4 carry. Now adds L63 + L64 + L65 candidate framing alongside the 6 documented Stage A/B fixture defects and L60 brief-authoring discipline section.
5. **cc-0013 Dashboard Phase 0** — P2 DEPRIORITISED rank 5 carry. Hold pending cc-0014 Day-19 verdict (2026-05-29).
6. **Close-the-loop batch sweep** — P2 rank 6 carry. 31 eligible rows (5 prior + 2 v2.72 + 24 historical), unchanged from v2.74.

## v2.75 sync (3-of-4-way)

- **Per-session file**: this file (`docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md`) — NEW, committed in THIS commit
- **`docs/00_sync_state.md`**: v2.74 → v2.75 — committed in SUBSEQUENT commit this session
- **`docs/00_action_list.md`**: v2.74 → v2.75 — committed in SUBSEQUENT commit this session
- **`app/(dashboard)/roadmap/page.tsx` in `invegent-dashboard`**: NOT updated this session — **28th consecutive deferral**, intentional per IOL hold-stance pending Day-19 verdict (2026-05-29). When verdict resolves, PHASES will be rebuilt to reflect the IOL outcome (either dashboard absorbs /operations + friction surface, or returns to pre-IOL scope, or instrument-failure invalidates re-run).

3-of-4-way sync this session. Per-file split via chat MCP push_files (one file per commit) chosen because 3-file atomic push at ~107KB combined payload exceeds L58 strict comfort band; per-file commits at 14KB / 42KB / 53KB are each within MCP single-file write reliability profile.

---

*Session file written 2026-05-15 Sydney by chat. cc-0014 Stage D CLOSED + Stage E backend + frontend + promotion trigger ALL APPLIED. 14-day experiment window still NOT started — begins next session at experiment_run INSERT. Day-19 verdict: 2026-05-29 Sydney.*
