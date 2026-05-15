# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | **cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75).** Stage D fully closed via V-D1..V-D5 + Supp-1/2 PASS after a 2-commit FAB relocation arc: CCD's initial Stage D commits (`fe7bf346...` → `ca935d4e...` after env-gate triage) landed in the wrong repo — `Invegent-content-engine/dashboard/` cc-0013 scaffold sandbox subdirectory instead of the deployed `invegent-dashboard` repo (HEAD `13d66210...` from 2026-05-08, untouched). Chat verification of expected target HEAD caught the mismatch. Recovery via PK directive v2 (kebab-case file naming matching dashboard convention + Option K2 reuse of existing `createServiceClient()` from `lib/supabase/service.ts` with `.schema("friction")` per-call + Option E2 no `.env.example` with env doc in top-of-file action comment + `DASHBOARD_FRICTION_FAB_ENABLED` as only new env var). Task 1: `invegent-dashboard` 3 new + 1 modified file at HEAD `6711d5f47583078556d512f8263d0202a86c3555` (actions/emit-friction.ts reuses createServiceClient + .schema("friction") typechecked cleanly without @ts-expect-error mitigation; components/friction-fab.tsx + components/friction-form.tsx per directive; app/layout.tsx integrates FAB mount preserving favicon metadata + globals.css + antialiased body class verbatim; env read inside RootLayout function body for request-time eval per ca935d4e lesson). Task 2: `Invegent-content-engine` `git checkout 753120124e... -- dashboard/` revert at HEAD `86d2c2b9fa78e10f3c178a462a713706759a9ca5` (4 deletes + 2 reverts all under dashboard/; cc-0013 sandbox files untouched). `npx tsc --noEmit` PASS; `npm run lint` baseline issue noted (no ESLint config in dashboard repo, pre-existing, out of scope). **PostgREST exposed_schemas fix**: first manual FAB submission failed with `Error: The schema must be one of the following: public, graphql_public, k, f, m, c, r, a, t` — at PostgREST API layer not DB (schema existed in pg_namespace, functions reachable via direct SQL). PK manual UI change in Supabase dashboard Settings → API → Exposed schemas added `friction`; ~10s PostgREST reload; second submission succeeded with event_id `33a88634-1dca-4085-af9d-b78e0a25b48c`. **V-D4 + V-D5 PASS**: 5 timed PK submissions across 5 distinct routes (/overview, /monitor, /pipeline-log, /content-studio, /clients) all under 15s target (PK reported 5-10s). 5 rows verified in friction.event via SQL probe; all dedupe_fingerprints distinct (problem_key derived from observation_text first-50-chars); 0 emit_error rows; observations are real friction (top-side submenu instability, draft-review redundancy, AI diagnostic summary usefulness, YouTube content series scope, clients-overview visual density). **Stage E backend** via migration `cc_0014_e_read_surface_and_triage` (apply_migration MCP; first attempt timed out at 4-minute wait without committing — verified via function-existence query post-timeout, retry succeeded): `friction.fn_recent_cases(int)` returns 12-column TABLE sorted by severity → triage_state → last_seen_at DESC; `friction.fn_triage_case(uuid, ...)` uses COALESCE leave-untouched-when-NULL semantics with defensive IF NOT FOUND THEN RAISE P0002 (chat-added, not in brief §10). Both SECURITY DEFINER, REVOKE EXECUTE FROM PUBLIC + GRANT EXECUTE TO authenticated + service_role per L36 lesson (cc-0008 service_role grants defect class). **V-E1 PASS**: fn_recent_cases as authenticated returns 0 rows (expected at this point). **V-E2 PASS**: test case seed + fn_triage_case as authenticated + verify triage_state='acknowledged', quality_flag=true, reviewed_at populated. Supplementary: non-existent case_id raises P0002. Initial V-E2 attempt used non-hex UUID `cc0014etest2` caught at SQLSTATE 22P02 (L60 fixture-defect pattern 7th occurrence in cc-0014); fixed to all-hex `00000cc01402`. **Stage E frontend** delivered by CCD at HEAD `5753f41b9c554c4eeb7a271691a95430ccac3294` (was `6711d5f4...`): 3 new files actions/triage-case.ts + app/(dashboard)/operations/page.tsx + app/(dashboard)/operations/case-row.tsx (687 insertions); kebab-case throughout; reuses createServiceClient + .schema("friction").rpc() per Stage D pattern; route under (dashboard) group auth-protected via existing middleware; CCD validation parity audit found 8 friction.case CHECK constraints (vs 4 cited in directive) with all 4 user-facing constraints validated in action and remaining 4 enforced at DB; fn_recent_cases TypeScript interface verified against pg_get_function_result; sidebar nav link deferred per directive. **THE BRIEF GAP discovered** at end of frontend deploy via CCD's report parenthetical "(if defined in cc-0014 Stage A)" — chat verified 0 case-creation mechanism existed across 8 friction.* functions + 2 DELETE-protection-only triggers + 5 orphan events (case_id=NULL) + 0 cases. cc-0014 brief §7 reconciliation emitter comment `-- recurrence via 7-day case lookup` was design assumption never implemented; ALL Day-19 success criteria are on friction.case rows joined to friction.event via case_id; without case creation experiment cannot pass any criterion. **PK directive G1** sharpened chat's initial problem_key+category proposal (too coarse) to use `dedupe_fingerprint` as primary case identity via friction.event join: find existing case where category matches AND last_seen_at within 7-day recurrence window AND triage_state not in (duplicate, ignored) AND EXISTS event with matching dedupe_fingerprint linked to that case. Migration `cc_0014_e_promote_event_to_case` deployed: SECURITY DEFINER function + BEFORE INSERT trigger FOR EACH ROW on friction.event; idempotent on pre-set NEW.case_id; severity escalation critical > warn > info; case_title from LEFT(observation_text, 100); triage_state='new' on new case. **V-P1..V-P8 PASS**: V-P1 orphan event creates new case (event_count=1); V-P2 matching dedupe_fingerprint within 7d → same case (event_count=2); V-P3 different fingerprint → separate case (2 cases total); V-P4 critical event matching info case → escalates to critical (event_count=3); V-P5 backfill DO block iterated 5 PK V-D5 orphans → 5 new cases (1:1 mapping because all 5 fingerprints distinct, all triage_state='new'); V-P6 0 residual cc-0014-test rows; V-P7 0 experiment_run.status='running' rows; V-P8 0 experiment_run for brief_id='cc-0014'. **V-E3 PASS** via PK manual: 4 screenshots captured — list render (5 cases, INFO badges, "1h ago" times, ×1 event counts, "new" badges), row expanded (full inline form with conditional fields rendering), edit-in-progress with conditional fields revealed (next_review_at appearing after track selected, capture_reason_note Optional vs Required label per capture_reason value), post-save (row collapsed + list re-fetched + acknowledged case moved to bottom per sort). Chat verified DB persistence via SQL probe: 8 fields PK saved all landed correctly including next_review_at at 2026-05-22 10:00 Sydney, capture_reason='routine_log', capture_reason_note='Found it visually ' with trailing space preserved, reviewed_at + updated_at both set; 4 other cases remained `new` with triage fields null (clean isolation). **0 D-01 fires this session** per brief §13 governance gate (Stage D execution matched brief §9; Stage E backend matched brief §10; promotion trigger non-divergent per brief §7 "7-day case lookup" reference). T-MCP-02 cum unchanged at **66**. State-capture exceptions cumulative unchanged at **1**. **14-day experiment window still NOT started** — begins next session at experiment_run INSERT with status='running' + criteria_snapshot from brief §10 verbatim JSON. Verdict Day-19 = **2026-05-29 Sydney**. **3 NEW L-candidates v2.75**: L63 (brief implementation gap detected at sub-stage UI integration; cc-0014 §7 "7-day case lookup" mentioned but never built; discovered at Stage E frontend completion via empty /operations state with 5 orphan events; CCD's "(if defined in cc-0014 Stage A)" parenthetical was the cue); L64 (repo-target verification before chaining CCD operations; CCD's HEAD report technically accurate for the wrong working clone; chat must separately verify SHA matches expected target repo when CCD has not recently touched that repo); L65 (PostgREST exposed_schemas as runtime config dependency; new schema visible to direct SQL but not PostgREST API until project setting updated; pre-flight via apply_migration cannot detect; add to brief pre-flight checklist for any new-schema work with supabase-js access path). All 3 candidates 1 empirical occurrence within cc-0014; promotion pending pattern repeat in independent brief. **L58 strengthened — 3rd preventive application this session pair**: v2.75 sync via 3 single-file chat MCP commits per L58 strict — 3-file atomic push at ~107KB combined payload (session file 14KB + sync_state 42KB + action_list 53KB) declined as outside L58 comfort band; per-file at each size within MCP single-file write reliability profile. Cumulative L58: 1 originating reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **L58 promotion to baseline recommended at v2.76** — 3 consecutive preventive applications within consistent context with zero failures. **L41 + L45** re-exercised at 4 baseline-eligible exercises now (cc-0010A + cc-0010B + cc-0014 Stage C + cc-0014 Stages D/E v2.75; 3 CCD commit HEAD-verifications this session: `6711d5f4` + `86d2c2b9` + `5753f41b`). **L44** baseline-eligible at 6 cycles (cc-0010A v1.3/v1.4/v1.5 + Stage B v2.73 + Stage C v2.74 + Stage E v2.75 backend + Stage E v2.75 promotion). **L48** re-exercised (2 atomic migrations this session). **L55** reactive at 4 cycles. **L60** re-exercised at 7 occurrences (3 Stage A + 3 Stage B + 1 Stage E V-E2). **Production state v2.75 close**: friction.event 5 rows, friction.case 5 rows (4 new + 1 acknowledged), friction.experiment_run empty (no running row), 8 friction.* functions (3 NEW v2.75: fn_recent_cases, fn_triage_case, fn_promote_event_to_case), 4 triggers on friction.* (3 dormant DELETE-protection + 1 NEW v2.75 active BEFORE INSERT promote_to_case), PostgREST exposed_schemas includes `friction` (NEW v2.75 PK manual UI). `invegent-dashboard` HEAD `5753f41b...` (FAB live + /operations route live). **Sync debt resolved this session via 3 separate single-file chat MCP commits**: session file new + sync_state v2.74→v2.75 + action_list v2.74→v2.75. **3-of-4-way sync** (docs + memory carries; dashboard PHASES **28th consecutive deferral** per IOL hold-stance pending Day-19 verdict 2026-05-29). 0 memory edits this session (30/30 cap; v2.75 state will need memory edit cycle next session before run start). **Next session rank 1**: pre-experiment cleanup (V-P6 confirmed 0 residue, so documented-noop per brief §5) + INSERT into friction.experiment_run with status='running' + criteria_snapshot=brief §10 verbatim. **One step from 14-day clock start.** | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | **cc-0014 Stage C APPLIED (v2.74).** Health-check dual-write emitter live. Migration `cc_0014_c_health_check_emitter` applied atomically (2 SECURITY DEFINER functions + 1 pg_cron job 86 `friction-verification-daily` at `15 1 * * *` UTC). `friction.fn_emit_health_check_findings(text,text,jsonb)` deployed; iterates JSONB findings array with per-finding EXCEPTION handler routing failures to `friction.emit_error`. `friction.fn_verify_health_check_daily(date)` deployed; writes `NO_EVENTS_NO_ERRORS` marker to emit_error if both event_count and error_count zero. 5 of 6 V-checks PASS (V-C1 synthetic + V-C2 mixed batch defensive + V-C4 cron active + V-C5 authenticated denied + V-C6 zero residual); V-C3 PENDING live Cowork run. Cowork brief `nightly-health-check-v1` modified v2.1 → v3.0 (33,469 B) and committed at HEAD `bc32e86a3056c0b4d6d881c0bba1b2f6e1440aa3` via Path C. 0 D-01 fires per brief §13. T-MCP-02 cum 66 (unchanged). L58 strengthened to 2nd preventive application. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | **cc-0014 Stage B APPLIED (v2.73).** Reconciliation emitter trigger live on `r.cadence_drift_log`. 5 V-checks PASS. 0 D-01 fires per brief §13. 3 brief V-B1 defects caught pre-execution at L53/L55 pre-flight; L60 NEW candidate fabricated test-fixture validity. L58 first preventive application via Path C. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | **cc-0014 Stage A APPLIED (v2.72).** friction.* schema deployed (5 tables + 2 v1.1-patch triggers + full grants matrix). 11 V-checks PASS. 8 review rounds across strategic v0.1→v0.4 + brief v1.0→v1.1. 2 D-01 fires (903cfd8e type-(b) → v1.1 patch; 873985f7 type-(c) → PK state-capture override per L62). L58 + L59 NEW candidates. T-MCP-02 cum 66 (+2). State-capture exceptions: 1. | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |
| 2026-05-13 | cc-0012-closed-with-variance | **cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71).** Platform Reconciliation View (PRV) v1 delivered as DDL-only build. op schema + op_reader role (NOLOGIN) + 5 plain views live. **Reconciliation v1 + PRV v1 family complete end-to-end** (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 + cc-0012 all closed). | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | **cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70).** cadence-drift-checker EF v2 ACTIVE; cron 85 installed. L42 reified at 4-job cardinality. L52 fourth-consecutive clean CLI deploy. L62 type-(c) NEW empirical use. | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | **cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69).** reconciliation-matcher EF v1 deployed; cron 84 installed. First natural cron 84 fire succeeded with 5 Tier-1 ICE matches in 754ms. | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | **cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68).** ice-evidence-materialiser EF v2 deployed; first post-v2 cron fire succeeded with 30 rows_inserted in 3.5 sec. L40 reified end-to-end. | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED — PRV-1 second build COMPLETE (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |
| 2026-05-11 | cc-0009-stage-c-doc-sync | cc-0009 Stage C documentation sync (v2.64). | (no per-session file — retroactive doc-only) |
| 2026-05-11 | cc-0009-stage-b-applied-closed | cc-0009 Stage B applied + merged + closed (v2.63). | `docs/runtime/sessions/2026-05-11-cc-0009-stage-b-applied-closed.md` |
| 2026-05-10 | cc-0009-authored | cc-0009 v1 authored (v2.62). | `docs/runtime/sessions/2026-05-10-cc-0009-authored.md` |
| 2026-05-09 | cc-0008-applied | cc-0008 v5 applied (v2.61). | `docs/runtime/sessions/2026-05-09-cc-0008-applied.md` |
| 2026-05-09 | cc-0005-v4-m8a-applied-pipeline-integrity-complete | M8a Path A applied (v2.59). | `docs/runtime/sessions/2026-05-09-cc-0005-v4-m8a-applied-pipeline-integrity-complete.md` |
| 2026-05-09 | cc-0007-applied-ai-worker-401-recovered | cc-0007 (v2.58). | `docs/runtime/sessions/2026-05-09-cc-0007-applied-ai-worker-401-recovered.md` |
| 2026-05-09 | cc-0006-closed-cc-0005-v3-patched | cc-0006 (v2.57). | `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` |
| 2026-05-09 | cc-0004-applied-m6-phase-b-closed | cc-0004 (v2.56). | `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` |
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | cc-0003 v2 (v2.55). | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | video-worker v3.0.0 deployed (v2.54). | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---
## 🟢 Most recent session — inline summary

### 2026-05-15 Sydney — cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75)

**Outcome:** **Stage D fully closed + Stage E backend + frontend + brief-completing promotion trigger ALL APPLIED. 14-day experiment window still NOT started** — one step remains for next session: pre-experiment cleanup (V-P6 confirmed 0 residue; documented-noop per brief §5) + INSERT into `friction.experiment_run` with `status='running'`, `starts_at=now()`, `ends_at=now()+INTERVAL '14 days'`, `criteria_locked_at=now()`, `criteria_snapshot=brief §10 verbatim JSON`. Verdict Day-19 = **2026-05-29 Sydney**.

**Build arc this session (5 phases):**

**Phase 1 — Stage D close via FAB relocation.** CCD's initial Stage D commits (`fe7bf346...` → `ca935d4e...` after env-gate triage) landed in the wrong repo — `Invegent-content-engine/dashboard/` cc-0013 sandbox subdirectory instead of `invegent-dashboard`. Chat verified expected target HEAD still at `13d66210...` (untouched). PK directive v2 amended initial relocation draft: kebab-case file naming (matching dashboard convention `client-card.tsx` / `ef-drift.ts` neighbours) + Option K2 reuse of existing `createServiceClient()` with `.schema("friction")` per-call + Option E2 no `.env.example` (env doc in top-of-file action comment) + `DASHBOARD_FRICTION_FAB_ENABLED` as only new env var. CCD executed 2-task atomic: **Task 1** `invegent-dashboard/main` HEAD `6711d5f47583078556d512f8263d0202a86c3555` (3 new + 1 modified file; `.schema("friction")` typechecked cleanly without `@ts-expect-error`; app/layout.tsx integrates FAB mount preserving favicon metadata + globals.css + antialiased body class verbatim; env read at request time inside RootLayout function body); **Task 2** `Invegent-content-engine/main` HEAD `86d2c2b9fa78e10f3c178a462a713706759a9ca5` (`git checkout 753120124e... -- dashboard/` revert; 4 deletes + 2 reverts all under `dashboard/`; cc-0013 sandbox files untouched). `npx tsc --noEmit` PASS; `npm run lint` baseline issue noted (no ESLint config in dashboard repo, pre-existing, out of scope; CCD flagged as separate small follow-on).

**PostgREST exposed_schemas fix.** First manual FAB submission failed with `Error: The schema must be one of the following: public, graphql_public, k, f, m, c, r, a, t` at PostgREST API layer not DB (schema existed in pg_namespace, `friction.fn_emit_manual_event` reachable via direct SQL Supabase MCP). PK manual UI change in Supabase dashboard Settings → API → Exposed schemas added `friction`; ~10s PostgREST reload; second submission succeeded with event_id returned. **V-D4 + V-D5 PASS** via 5 timed PK submissions across 5 distinct routes (/overview, /monitor, /pipeline-log, /content-studio, /clients) all 5-10s per submission (well under 15s target). 5 rows verified in friction.event via SQL probe: source='manual', reported_by='pk', route correctly captured in `related_object->>'dashboard_route'`. The 5 observations are real friction PK captured during V-D5 not test rows.

**Phase 2 — Stage E backend.** Pre-flight via Supabase MCP (L44 cycle 6): both functions confirmed not pre-existing; friction.case columns match brief expectations. Migration `cc_0014_e_read_surface_and_triage` applied via apply_migration MCP — first attempt timed out at 4-minute wait without committing (verified non-commit via function-existence query post-timeout); retry succeeded. Both functions deployed SECURITY DEFINER with `SET search_path = friction, public`. `fn_recent_cases(p_limit int DEFAULT 50)` returns 12-column TABLE sorted severity → triage_state → last_seen_at DESC. `fn_triage_case(p_case_id uuid, p_triage_state text, ...)` uses COALESCE leave-untouched-when-NULL semantics; `reviewed_at` + `updated_at` set on update; defensive `IF NOT FOUND THEN RAISE EXCEPTION ... USING ERRCODE = 'P0002'` added (brief §10 spec did not include; defensive completion). Grants per L36: REVOKE EXECUTE FROM PUBLIC + GRANT EXECUTE TO authenticated + service_role on both. **V-E1 PASS** (0 rows returned, no cases existed). **V-E2 PASS** — initial attempt used non-hex UUID `cc0014etest2` caught at SQLSTATE 22P02 (L60 fixture-defect 7th occurrence); fixed to `00000cc01402`. Triage as authenticated set triage_state='acknowledged' + quality_flag=true; reviewed_at populated. Supplementary V-check: non-existent case_id raised P0002.

**Phase 3 — Stage E frontend handoff to CCD.** Directive: 3 new files in `invegent-dashboard` (actions/triage-case.ts Server Action + app/(dashboard)/operations/page.tsx server component + app/(dashboard)/operations/case-row.tsx client component). Kebab-case naming. Top-level actions/ + components/. Route under `(dashboard)` group (auth-protected via existing middleware). Reuse createServiceClient + `.schema("friction").rpc()`. Tailwind dark-mode + lucide-react icons. Sidebar nav link deferred per directive. **CCD report**: HEAD `5753f41b9c554c4eeb7a271691a95430ccac3294`; tsc PASS; 3 new files + 687 insertions; CCD validation parity audit found 8 friction.case CHECK constraints (vs 4 cited in directive — all 4 user-facing validated in action; DB enforces all 8); fn_recent_cases TypeScript interface verified against `pg_get_function_result`.

**Phase 4 — Brief gap discovery + Stage E promotion trigger.** CCD's report parenthetical "(if defined in cc-0014 Stage A)" was the cue. Chat verified DB state: 8 friction.* functions (none promote events to cases), 2 triggers (both DELETE-protection from Stage A v1.1 patch), 5 PK V-D5 events with case_id=NULL (orphaned), 0 cases. **The brief gap**: cc-0014 brief §7 reconciliation emitter comment `-- Dedupe fingerprint (no day component; recurrence via 7-day case lookup)` was design assumption never built across Stages A-D. ALL Day-19 success criteria are on friction.case rows joined via case_id — without case creation experiment cannot pass any criterion. **PK directive G1 with correction**: chat proposed problem_key + category 7-day matching; PK approved G1 sharpened to use `dedupe_fingerprint` as primary identity via friction.event join (find existing case where category matches AND last_seen_at within 7-day window AND triage_state not in (duplicate, ignored) AND EXISTS event with matching dedupe_fingerprint linked to that case). Migration `cc_0014_e_promote_event_to_case` deployed: SECURITY DEFINER `fn_promote_event_to_case()` + BEFORE INSERT trigger FOR EACH ROW on `friction.event`; idempotent on pre-set `NEW.case_id`; severity escalation critical > warn > info; case_title from `LEFT(observation_text, 100)`; triage_state='new' on new case. **V-P1..V-P8 PASS**: V-P1 new case created from orphan event; V-P2 same dedupe_fingerprint → same case (event_count=2); V-P3 different fingerprint → separate case; V-P4 critical event matching info case → escalation; V-P5 backfill DO block iterated 5 PK V-D5 orphans → 5 new cases (1:1 because all 5 fingerprints distinct, all triage_state='new'); V-P6 0 residual test rows; V-P7 0 experiment_run.status='running'; V-P8 0 experiment_run for brief_id='cc-0014'.

**Phase 5 — V-E3 PK manual verification.** PK opened `localhost:3000/operations` — 4 screenshots captured: (1) list render with 5 cases + INFO badges + "1h ago" times + ×1 event counts + "new" badges; (2) row expanded with full inline form; (3) edit-in-progress showing conditional fields working — next_review_at appears after track selected, capture_reason_note shows "Optional" vs "Required" by capture_reason value, suppression_reason hidden when action != suppress; (4) post-save state — row collapsed + list re-fetched via router.refresh() + acknowledged case moved to bottom per sort. Chat verified DB persistence via SQL probe: all 8 fields PK saved landed correctly (triage_state='acknowledged', quality_flag=true, action_decision='track', next_review_at=2026-05-22 10:00 Sydney, category=operator_friction unchanged, capture_reason='routine_log', capture_reason_note='Found it visually ' with trailing space preserved, reviewed_at + updated_at both set). 4 other cases remained `new` with triage fields null — clean isolation.

**V-check matrix (16 PASS this session):**
- V-D1/V-D2/V-D3 PASS (carried v2.74)
- **V-D4 / V-D5 PASS v2.75** (PK manual; 5 routes; 5-10s per submission)
- V-D6 N/A (V-D5 are real observations not test rows; kept)
- Supp-1 / Supp-2 PASS (relocation v2 commit `6711d5f4`)
- **V-E1 / V-E2 PASS v2.75** (backend RPCs callable + validating)
- **V-E3 PASS v2.75** (PK manual; 4 screenshots; SQL persistence verified)
- V-E4 / V-E5 DEFERRED (next session step 1)
- **V-P1 / V-P2 / V-P3 / V-P4 / V-P5 / V-P6 / V-P7 / V-P8 PASS v2.75** (promotion trigger + backfill)
- V-C3 PENDING (Cowork output pipeline silent since 2026-05-06; cron 86 marker only)

**3 NEW L-candidates this session:**
- **L63 candidate**: Brief implementation gap detected at sub-stage UI integration. cc-0014 §7 "7-day case lookup" comment was design assumption never built across Stages A-D; gap was masked through emitters-only stages until UI surface (Stage E /operations) forced inspection. Pattern: review brief comments + standalone references for implied-but-unbuilt mechanisms before declaring a sub-stage closed. 1 empirical occurrence; promotion pending pattern repeat in independent brief.
- **L64 candidate**: Repo-target verification before chaining CCD operations. CCD's HEAD reports were technically accurate for the working clone CCD pushed to, but the working clone was the wrong repo (content-engine `dashboard/` cc-0013 sandbox vs `invegent-dashboard`). Pattern: when CCD reports `HEAD: <sha>`, separately verify the SHA matches a commit in the expected target repo, especially for first-time work in a repo CCD has not recently touched. 1 empirical occurrence; promotion pending pattern repeat.
- **L65 candidate**: PostgREST exposed_schemas as runtime config dependency. New schema visible to direct SQL but NOT exposed to PostgREST until project setting updated; failure surfaces only at first supabase-js / PostgREST API call. Pattern: add exposed_schemas check to brief pre-flight checklist for any new-schema work that includes server-side or client-side supabase-js access path. 1 empirical occurrence; promotion pending pattern repeat.

**L-series carries:**
- **L41 + L45** baseline-eligible at 4 exercises (this session: 3 CCD commit HEAD-verifications + 1 PostgREST exposed_schemas verification post-PK-UI-change).
- **L44** baseline-eligible at 6 cycles (Stage E backend pre-flight + Stage E promotion trigger pre-flight added v2.75).
- **L48** re-exercised (2 atomic migrations).
- **L52** not exercised (no EF deploys).
- **L53** not exercised (no FK fabrications).
- **L55** reactive catch (4 cycles: V-E2 UUID fixture defect).
- **L58 strengthened — 3rd preventive application** (3 single-file commits per L58 strict; 1 reactive + 3 preventive cumulative). **Promotion to baseline recommended at v2.76**.
- **L60** re-exercised at 7 occurrences (V-E2 fixture).
- **L62** not exercised (0 D-01 fires).

**Production mutations this session:**
- 2 `apply_migration` calls (cc_0014_e_read_surface_and_triage + cc_0014_e_promote_event_to_case). First apply timed out 4 min without committing; verified non-commit + retry succeeded.
- ~22 `execute_sql` calls (V-E1, V-E2 + supplementary, V-P1..V-P8, backfill DO block, summary case views, post-V-E3 verification probe, pre-flight checks). All test data cleaned.
- 0 EF deploys, 0 cron mutations, 0 vault writes, 0 D-01 fires (per brief §13).
- 3 GitHub commits via push_files / create_or_update_file MCP this session (session file + sync_state + action_list as 3 separate single-file commits per L58 strict).
- 3 GitHub commits via CCD local git (Task 1 + Task 2 + Stage E frontend).
- 1 PK manual UI change (Supabase dashboard exposed_schemas added `friction`).
- 1 PK manual env edit (`.env.local` added `DASHBOARD_FRICTION_FAB_ENABLED=true`).
- 0 memory edits (30/30 cap; v2.75 state needs memory cycle next session before run start).

**Production state at v2.75 close:**
- `friction.*` schema live in Supabase `mbkmaxqhsohbtwsqolns`
- **5 friction.event rows** (PK V-D5 observations from 2026-05-15 14:12-14:18 Sydney, all linked to cases)
- **5 friction.case rows** (1:1 from 5 events with distinct dedupe_fingerprints): 4 in triage_state='new', 1 in triage_state='acknowledged' with full triage fields filled
- `friction.emit_error`: 1 verification marker row (cron-86 `NO_EVENTS_NO_ERRORS` from 2026-05-15 01:15 UTC; V-C3 still pending live Cowork run)
- `friction.experiment_run`: empty (no `running` row — 14-day window NOT started)
- **8 friction.* functions** (3 NEW v2.75): fn_emit_health_check_findings, fn_emit_manual_event, fn_emit_reconciliation_event, fn_lock_criteria_snapshot, fn_prevent_delete_during_run, **fn_promote_event_to_case (NEW)**, **fn_recent_cases (NEW)**, **fn_triage_case (NEW)**, fn_verify_health_check_daily
- **4 triggers on friction.* tables** (1 NEW v2.75): friction_event_no_delete_during_run + friction_case_no_delete_during_run + friction_experiment_run_criteria_immutable (all dormant) + **friction_event_promote_to_case (NEW, active BEFORE INSERT FOR EACH ROW)**
- 1 active trigger on r.cadence_drift_log: friction_emit_reconciliation (Stage B v2.73)
- 5 pg_cron jobs (82, 83, 84, 85, 86 — unchanged)
- **PostgREST exposed_schemas: includes `friction` (NEW v2.75 PK manual UI change)**
- `invegent-dashboard` HEAD: **`5753f41b9c554c4eeb7a271691a95430ccac3294`** (FAB live + /operations route live)
- DASHBOARD_FRICTION_FAB_ENABLED=true in PK's local `.env.local` (dev server boot reads it)
- T-MCP-02 cum: **66** (unchanged from v2.72)
- State-capture exceptions cumulative: **1** (unchanged from v2.72)
- main HEAD on Invegent-content-engine: this commit (v2.75 sync_state) building on session file commit `dd8cd83d...` building on `86d2c2b9` (Stage D revert)

---

### 2026-05-15 Sydney — cc-0014 STAGE C APPLIED (v2.74)

**Outcome:** **Health-check dual-write emitter live in Supabase `mbkmaxqhsohbtwsqolns`.** Migration `cc_0014_c_health_check_emitter` applied via `apply_migration` MCP — atomic (2 SECURITY DEFINER functions + 1 pg_cron job in single migration call). `friction.fn_emit_health_check_findings(text, text, jsonb)` and `friction.fn_verify_health_check_daily(date)` deployed; pg_cron job 86 `friction-verification-daily` scheduled `15 1 * * *` UTC. Cowork brief `nightly-health-check-v1` modified v2.1 → v3.0 with finding-id schema + Section 10 HTML-comment markers + Section 12 emission instructions; committed at HEAD `bc32e86a3056c0b4d6d881c0bba1b2f6e1440aa3` via Path C (CC local git per L58 strict compliance). 5 of 6 V-checks PASS; **V-C3 PENDING next live Cowork run**. **0 D-01 fires this session** per brief §13. **14-day experiment window still NOT started** — begins at end of Stage E; no `experiment_run.status='running'` row exists.

**Build arc this session:**
- Pre-flight verification via Supabase MCP (Stage A+B production state, no pre-existing Stage C objects, pg_cron jobid namespace clear, `pipeline_integrity` category active, no running experiment_run, function reachability/grant prerequisites verified)
- Migration `cc_0014_c_health_check_emitter` applied per brief §8 verbatim → all 5 production V-checks PASS (V-C3 deferred to live run)
- v3.0 brief draft authored over multiple iterations (P3 non-emission rule introduced as content design within function-contract scope per PK approval; no §8 divergence; no D-01 needed per brief §13)
- Path C commit handoff to CC after L58 strict compliance applied (33.5 KB brief > 30 KB threshold)
- CC local-git push success at HEAD `bc32e86` with fast-forward from `d3c952d`
- L41/L45 post-mutation truth check PASS (6 properties verified: HEAD SHA, byte size exact, frontmatter v3.0, P3 non-emission verbatim wording at 2 locations, file structure intact, blob SHA changed)
- PK directive for v2.74 docs sync via Path C → 3-file atomic commit covering: 2026-05-15 Stage C session file new + action_list v2.74 + sync_state v2.74

**V-check results (5 PASS + 1 PENDING):**
- **V-C1** — synthetic emission with single finding → function returns `{success_count:1, failure_count:0}`; friction.event row has all 12 expected fields (severity=`critical`, category=`pipeline_integrity`, category_source=`emitter_default`, reported_by=`system`, problem_key=`cc-0014-test`, source_event_id composite of run_id/finding_id, raw_payload includes finding_id + run_id + markdown_path + priority + raw_finding, dedupe_fingerprint md5).
- **V-C2** — mixed batch (2 good + 1 malformed missing finding_id) → function returns `{success_count:2, failure_count:1}`; 2 good events inserted; malformed routed to emit_error with SQLSTATE 23502 (NULL source_event_id violates NOT NULL constraint) + emitter_version `cc-0014-v1.0` + raw_payload preserved.
- **V-C3** — **PENDING next live Cowork run with v3.0 brief**; verification: source_event_id count + finding_id value match markdown HTML-comment markers (`<!-- finding_id: priority-N/short-key -->`). Cowork output pipeline silent since 2026-05-06 (9-day gap as of v2.74; now 10-day at v2.75); manual Cowork trigger by PK on Windows is the recovery path if next scheduled cron fire continues the existing failure pattern. NOT a Stage C HARD-STOP at this state.
- **V-C4** — `cron.job` row for jobid 86: jobname `friction-verification-daily`, schedule `15 1 * * *`, active=true, command `SELECT friction.fn_verify_health_check_daily();`.
- **V-C5** — `SET ROLE authenticated; SELECT friction.fn_emit_health_check_findings(...)` raises SQLSTATE 42501 (`permission denied for function fn_emit_health_check_findings`).
- **V-C6** — DELETE on `friction.event` + `friction.emit_error` filtered to test rows produced 0 residual.

**P3 non-emission rule** (PK-approved as content design, not §8 divergence): "Only P1 and P2 findings are emitted to friction.event. P3 items are informational markdown-only observations and are excluded from friction emission and ID-level count matching." Wording landed verbatim at TWO locations in v3.0 brief.

**L-series outcomes:**
- **L41** re-exercised v2.74 (3 baseline-eligible exercises total).
- **L44** baseline-eligible at 5 cycles.
- **L45** baseline-eligible at 3 exercises (strengthened by Stage C real-time verification).
- **L46** not exercised (0 D-01 fires; pattern shape v2.74 mirrors v2.73).
- **L48** re-exercised (Stage C migration atomic).
- **L58 strengthened** — 2nd preventive application this session pair. 1 reactive + 2 preventive cumulative.

**Production mutations this session:**
- 1 `apply_migration` (`cc_0014_c_health_check_emitter`) — CREATE FUNCTION × 2 + `cron.schedule` × 1 + GRANT/REVOKE matrix
- ~8 `execute_sql` calls for V-checks (V-C1 + V-C2 + V-C2 verify + V-C4 + V-C5 + V-C6 + 2 pre-flight) — all test data cleaned in V-C6
- 0 EF deploys
- 0 cron mutations beyond the migration's `cron.schedule` call (which installed jobid 86)
- 0 `ask_chatgpt_review` D-01 fires (per brief §13)
- 1 GitHub commit via CC local git workflow (`bc32e86` — v3.0 brief, Path C per PK directive)
- 3 GitHub commits via CC local git for v2.74 sync (session file + action_list + sync_state)
- 0 memory edits (no directive; user_memories at 30/30 cap; v2.73→v2.74 carry-by-reference)

---

## 🟡 Next session priorities (rebuilt v2.75)

1. **cc-0014 Stage E close + 14-day window start** — **P1 rank 1 v2.75.** One step: DELETE any residual `cc-0014-test/%` rows from friction.event + friction.case + friction.emit_error (V-P6 confirmed 0 residue; documented-noop per brief §5) then INSERT into `friction.experiment_run` with `status='running'`, `starts_at=now()`, `ends_at=now()+INTERVAL '14 days'`, `criteria_locked_at=now()`, `criteria_snapshot=brief §10 verbatim JSON` (5 success criteria + invalidation thresholds). From the moment of INSERT: 14-day clock runs (Day-19 verdict = **2026-05-29 Sydney**), criteria_snapshot becomes immutable (trigger `friction_experiment_run_criteria_immutable` activates), DELETEs on friction.event + friction.case blocked (triggers `friction_event_no_delete_during_run` + `friction_case_no_delete_during_run` activate). Chat operation; PK confirms before INSERT.
2. **V-C3 live Cowork verification** — P1 rank 2 carry from v2.74. Cowork output pipeline silent since 2026-05-06 (10-day gap as of v2.75 close). Recovery via PK manual `openclaw tui` trigger on Windows if natural scheduled cron continues silent.
3. **Memory edit cycle** — P1 rank 3 NEW v2.75. v2.75 state (Stage D APPLIED, Stage E APPLIED, promotion trigger live, /operations route live, 14-day window status) needs to land in user_memories before next sessions can rely on memory alone. Currently at 30/30 cap; PK to direct pruning + insertion.
4. **Brief v1.2 doc patch (combined defects + L60 + L63 + L64 + L65 framing)** — P3 rank 4 carry from v2.74, scope expanded v2.75 to add L63 + L64 + L65 candidate framing alongside the 6 documented Stage A/B fixture defects and L60 brief-authoring discipline section. Doc-only.
5. **cc-0013 Dashboard Phase 0** — **P2 DEPRIORITISED rank 5 carry v2.72/v2.73/v2.74/v2.75.** Hold pending cc-0014 Day-19 verdict (2026-05-29).
6. **Close-the-loop batch sweep** — P2 rank 6. 5 prior cc-NNNN rows still `escalated` + 2 from v2.72 (903cfd8e + 873985f7 both PK-resolved; pending status='resolved' UPDATE) + 24 unrelated historical rows untouched per CCH = **31 eligible**. v2.75 adds 0 new D-01 rows.
7. **Personal businesses check-in** — standing P0. Crazy Domains refund + clean-up follow-up still carried from v2.51.

Carries (lower priority unchanged from v2.74):
- v1.1 cc-0012 doc patch (3 carry items, P3 deprioritised pending IOL outcome)
- v1.6 cc-0010A doc patch (3 items, P3 deprioritised pending IOL outcome)
- v1.3 cc-0011 doc patch (5 carry items, P3 deprioritised pending IOL outcome)
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, PK approval required)
- Publisher latent config risk follow-up (P3)
- M8b separate brief (NOT YET AUTHORED)
- 94-row un-publishable legacy draft cohort
- Feature branch `feature/cc-0009-stage-b-ef-source` preservation (P3)
- Memory cap hygiene (30/30 cap; 0 edits v2.75; now urgently in scope)
- Dashboard mobile responsiveness (P3)
- AI cost view (P3 quick win)
- github MCP write tools — confirmed L58 caution band; per-file single-commit strategy preventively used v2.75 (3 commits this session)
- Platform Reconciliation View brief authoring (P2, fully eligible since v2.68)
- 3 pre-v2 forensic `r.reconciliation_run failed` rows (P3 carry; PK forensic-accepted; NO repair)
- Cron 82 cadence_rule_generator_daily firing normally
- Cron 83 ice_evidence_materialiser_30min firing every 30 min UTC
- Cron 84 reconciliation_matcher_30min firing every 30 min UTC
- Cron 85 cadence_drift_checker_weekly firing Sun 17:30 UTC
- Cron 86 friction-verification-daily firing daily 01:15 UTC

---

## ⛔ Carried-forward "do not touch" state

**v2.75 update on standing items:**

- **cc-0014 Stage D: CLOSED v2.75.** V-D1..V-D5 + Supp-1/2 PASS via PK manual (5 routes, 5-10s per submission, all 5 events landed in friction.event). FAB relocation arc: CCD's initial commits landed in wrong repo (Invegent-content-engine/dashboard/ cc-0013 sandbox); recovery via PK directive v2 (kebab-case + Option K2 + Option E2); HEADs `6711d5f4` (invegent-dashboard) + `86d2c2b9` (Invegent-content-engine revert). PostgREST exposed_schemas fix required PK manual UI change. Result file deferred (cc-0014 closes at Day 19, not at Stage D apply). Session file at `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md`.
- **cc-0014 Stage E: APPLIED v2.75** (backend + frontend + promotion). Migration `cc_0014_e_read_surface_and_triage` deployed (fn_recent_cases + fn_triage_case both SECURITY DEFINER, grants to authenticated + service_role per L36). Migration `cc_0014_e_promote_event_to_case` deployed (NEW SCOPE: brief gap discovered at frontend completion; PK directive G1 with dedupe_fingerprint identity key; non-divergent per brief §7 "7-day case lookup" reference). CCD frontend at `5753f41b` (3 new files: actions/triage-case.ts + page.tsx + case-row.tsx). V-E1/V-E2/V-E3 PASS + V-P1..V-P8 PASS. 5 V-D5 observations backfilled into 5 cases (1:1 mapping, all distinct fingerprints).
- **cc-0014 Stage E pending: 14-day window start.** One step remaining for next session: pre-experiment cleanup (V-P6 0 residue; documented-noop) + INSERT into friction.experiment_run with status='running' + criteria_snapshot=brief §10 verbatim JSON. Verdict Day-19 = 2026-05-29 Sydney.
- **cc-0014 Stage C: APPLIED v2.74.** Unchanged. V-C3 PENDING live Cowork run.
- **cc-0014 Stage B: APPLIED v2.73.** Unchanged.
- **cc-0014 Stage A: APPLIED v2.72.** Unchanged.
- **cc-0014 V-C3 verification: PENDING.** Cowork output pipeline silent since 2026-05-06 (10-day gap); manual trigger by PK on Windows is the recovery path if next scheduled cron continues silent.
- **cc-0014 brief FROZEN at v1.1** (commit `34305092f4`). Brief v1.2 doc-patch scope expanded v2.75 to include L63 + L64 + L65 framing alongside prior 6 defects + L60 framing.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **L38 candidate VINDICATED v2.67 + reaffirmed v2.68.** Recommend promotion to baseline next cycle.
- **L40 reified end-to-end at runtime v2.68.** Not re-exercised v2.72/v2.73/v2.74/v2.75.
- **L41 honored v2.68 + re-exercised v2.74 + v2.75** (3 CCD commit HEAD-verifications this session + 1 PostgREST exposed_schemas post-PK-UI-change verification). 4 baseline-eligible exercises total.
- **L44 baseline-eligible** strengthened v2.75 (Stage E backend + Stage E promotion pre-flights = 6 cycles cumulative).
- **L45 baseline-eligible** strengthened v2.75 (3 CCD commit verifications). 4 baseline-eligible exercises now.
- **L46 baseline shape v2.75**: 0 D-01 fires this session (same shape as v2.73 + v2.74). Pattern reinforced: three consecutive stage-execution sessions with 0 D-01 fires when brief governance gate (§13) honored.
- **L47 still deferred v2.75.** No parallel-writer race opportunity observed.
- **L48 vindicated v2.67–v2.68; re-exercised v2.75** (2 atomic migrations: Stage E backend + Stage E promotion).
- **L52 candidate carry from v2.70**. Not exercised v2.75 (no EF deploys).
- **L53 reactive carry from v2.74** (4 cycles total at v2.74 close). Not exercised v2.75 (Stage E migrations had no FK fabrications).
- **L55 reactive STRENGTHENED v2.75** (4 cycles: V-E2 UUID fixture defect caught at SQLSTATE 22P02; fixed at first attempt).
- **L57 candidate carry from v2.71**: not exercised v2.75.
- **L58 candidate STRENGTHENED v2.75**: **3rd preventive application** this session (per-file split of 3-file sync via single-file MCP commits because 3-file atomic at ~107KB combined payload exceeded comfort band). Cumulative: 1 reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **Promotion to baseline recommended at v2.76** — 3 consecutive preventive applications within consistent cc-0014 context with zero failures.
- **L59 candidate carry from v2.72**: not re-exercised v2.75.
- **L60 candidate STRENGTHENED v2.75** (7th occurrence: V-E2 UUID `cc0014etest2` non-hex `t`). All occurrences within cc-0014 lineage. Promotion still pending pattern repeat in independent brief.
- **L62 carry from v2.72** (type-(c) state-capture override): not exercised v2.75 (0 D-01 fires).
- **L63 candidate NEW v2.75**: Brief implementation gap detected at sub-stage UI integration. 1 occurrence. Promotion pending pattern repeat.
- **L64 candidate NEW v2.75**: Repo-target verification before chaining CCD operations. 1 occurrence. Promotion pending pattern repeat.
- **L65 candidate NEW v2.75**: PostgREST exposed_schemas as runtime config dependency. 1 occurrence. Promotion pending pattern repeat.
- **L49 carry from v2.67** (PG reserved-word collision check). No PL/pgSQL-heavy work v2.75.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **cc-0012 PRV v1: CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.
- **cc-0011 cadence-drift-checker: CLOSED-WITH-VERIFIED-VARIANCE v2.70.** Cron 85 firing every Sunday 17:30 UTC.
- **cc-0010C reconciliation-matcher: CLOSED-WITH-VERIFIED-VARIANCE v2.69.** Cron 84 steady-state.
- **cc-0010B ice-evidence-materialiser: CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Cron 83 steady-state.
- **cc-0010A r.* DDL Foundation: APPLIED + CLOSED v2.67.** Unchanged.
- **5 prior close-the-loop carries: still pending, batch now 16 sessions overdue v2.75.**
- **2 new close-the-loop carries v2.72**: `903cfd8e` + `873985f7` both PK-resolved. Both pending status='resolved' UPDATE.
- **24 unrelated historical escalated m.chatgpt_review rows**: intentionally untouched per CCH directive.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN; unchanged.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN.
- **L34 trigger filter audit**: P3 carry.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives 12 + 24 + 25.
- **T-MCP-02 quota: 66 cumulative v2.75** (unchanged from v2.72).
- **State-capture exceptions cumulative: 1** (unchanged from v2.72; 0 new this session).
- Cron 82 cadence_rule_generator_daily firing normally.
- Cron 83 ice_evidence_materialiser_30min firing successfully every 30 min UTC.
- Cron 84 reconciliation_matcher_30min firing successfully every 30 min UTC.
- Cron 85 cadence_drift_checker_weekly firing Sun 17:30 UTC.
- Cron 86 friction-verification-daily firing daily 01:15 UTC; cron-86 produced its first marker row at 2026-05-15 01:15 UTC (NO_EVENTS_NO_ERRORS — confirming function works; V-C3 dependency on Cowork output remains pending).
- Dashboard roadmap PHASES — **28th** consecutive deferral. Intentional per IOL hold-stance pending Day-19 verdict 2026-05-29.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows (unchanged).
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- github MCP write tools reliability reaffirmed v2.75: 3 single-file commits this session at 14KB + 42KB + 53KB sizes per L58 strict (3-file atomic push at ~107KB combined declined as outside comfort band).
- **PostgREST exposed_schemas now includes `friction`** (NEW v2.75 PK manual UI change). Required runtime sibling whenever a new schema needs supabase-js access path.
- **Cowork output pipeline silence since 2026-05-06** — observed 10-day gap as of v2.75 close. Continues to be P2 OPEN escalated from P3 carry because V-C3 verification depends on it.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` (new this session) written. This sync_state + action_list updated. **No result file** (cc-0014 closes at Day 19 verdict, not at Stage A/B/C/D/E apply). All 3 files via chat MCP per-file single commits this session per L58 strict (per-file safer than 3-file atomic at ~107KB combined payload). 3-of-4-way sync this session (docs + memory carries; dashboard PHASES 28th consecutive deferral per IOL hold-stance pending Day-19 verdict).

**This file size**: ~42KB after this update (v2.75 — v2.75 current + v2.74 previous inlined per G1 "1-2 sessions inlined" rule; v2.73 + earlier retained as pointer rows in session index table only).

---

*Last updated: 2026-05-15 Sydney — v2.75: **cc-0014 STAGE D CLOSED + STAGE E APPLIED.** Stage D fully closed via V-D1..V-D5 + Supp-1/2 PASS after 2-commit FAB relocation arc. Stage E backend + frontend + new promotion trigger ALL APPLIED. V-E1/V-E2/V-E3 PASS + V-P1..V-P8 PASS. 5 PK V-D5 observations backfilled into 5 friction.case rows (1:1 because all 5 fingerprints distinct). PostgREST exposed_schemas extended via PK manual UI to include `friction`. 0 D-01 fires per brief §13. T-MCP-02 cum unchanged at 66. State-capture exceptions cum unchanged at 1. **14-day experiment window still NOT started** — begins next session at experiment_run INSERT. Verdict Day-19 = 2026-05-29 Sydney. 3 NEW L-candidates v2.75: L63 (brief implementation gap discovery at sub-stage UI integration), L64 (repo-target verification before chaining CCD operations), L65 (PostgREST exposed_schemas as runtime config dependency). L58 strengthened to 3rd preventive application; promotion to baseline recommended at v2.76. L41 + L44 + L45 + L48 re-exercised v2.75. L55 reactive cycle 4 + L60 occurrence 7 (V-E2 UUID fixture). Sync this session via 3 separate single-file chat MCP commits per L58 strict. Dashboard PHASES NOT updated — 28th consecutive deferral intentional per IOL hold-stance. Previous (v2.74): cc-0014 Stage C APPLIED.*
