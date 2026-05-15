# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-15 Sydney (**v2.75 — cc-0014 STAGE D CLOSED + STAGE E APPLIED.** Stage D fully closed via V-D1..V-D5 + Supp-1/2 PASS after a 2-commit FAB relocation arc: CCD's initial Stage D commits (`fe7bf346...` → `ca935d4e...` after env-gate triage) landed in the wrong repo — `Invegent-content-engine/dashboard/` cc-0013 sandbox subdirectory instead of `invegent-dashboard`. Chat verification of expected target HEAD caught the mismatch. PK directive v2 (kebab-case + Option K2 reuse of existing `createServiceClient()` with `.schema("friction")` per-call + Option E2 top-of-file env doc + `DASHBOARD_FRICTION_FAB_ENABLED` as only new env var). Task 1 `invegent-dashboard` HEAD `6711d5f4...` (3 new + 1 modified file; tsc PASS without @ts-expect-error). Task 2 `Invegent-content-engine` HEAD `86d2c2b9...` (`git checkout 753120124e... -- dashboard/` revert; cc-0013 sandbox untouched). PostgREST exposed_schemas fix: first FAB submission failed with `Error: The schema must be one of the following: public, graphql_public, k, f, m, c, r, a, t`; PK manual UI change in Supabase dashboard Settings → API → Exposed schemas added `friction`; ~10s reload; second submission succeeded. V-D4/V-D5 PASS via 5 PK timed submissions across 5 distinct routes (5-10s each, well under 15s target). Stage E delivered in 3 sub-stages: (1) backend RPCs via migration `cc_0014_e_read_surface_and_triage` — fn_recent_cases + fn_triage_case both SECURITY DEFINER + grants to authenticated + service_role per L36 + defensive IF NOT FOUND raise P0002 in triage; first apply_migration timed out at 4-min wait, verified non-commit + retry succeeded. (2) frontend `/operations` route via CCD commit `5753f41b...` — 3 new files (actions/triage-case.ts + page.tsx + case-row.tsx, 687 insertions); kebab-case + reuse createServiceClient + `.schema("friction").rpc()` per Stage D pattern; CCD validation parity audit found 8 friction.case CHECK constraints (vs 4 in directive) with 4 user-facing validated in action and 4 enforced at DB. (3) brief-completing event→case promotion trigger via migration `cc_0014_e_promote_event_to_case` — **brief gap discovered** at end of frontend deploy: cc-0014 brief §7 referenced `-- recurrence via 7-day case lookup` but no migration in Stages A-D built it; ALL Day-19 success criteria are on friction.case rows joined via case_id; without case creation experiment cannot pass. PK directive G1 sharpened chat's initial problem_key+category proposal to use `dedupe_fingerprint` as primary identity via friction.event join (find existing case where category matches AND last_seen_at within 7-day window AND triage_state not in (duplicate, ignored) AND EXISTS event with matching dedupe_fingerprint linked to that case). BEFORE INSERT trigger on friction.event FOR EACH ROW; idempotent on pre-set NEW.case_id; severity escalation critical > warn > info; case_title from LEFT(observation_text, 100). V-E1/V-E2/V-E3 PASS + V-P1..V-P8 PASS. 5 PK V-D5 observations backfilled into 5 friction.case rows (1:1 because all 5 fingerprints distinct, all triage_state='new'). V-E3 PASS via 4 PK screenshots — list render + row expand + edit-in-progress with all conditional fields working + post-save state — and SQL probe confirming all 8 fields PK saved landed correctly (triage_state='acknowledged', quality_flag=true, action_decision='track', next_review_at 2026-05-22 10:00 Sydney, capture_reason='routine_log', capture_reason_note='Found it visually ' with trailing space preserved, reviewed_at + updated_at both set). **0 D-01 fires this session** per brief §13 governance gate (Stage D execution matched brief §9; Stage E backend matched brief §10; promotion trigger non-divergent per brief §7 "7-day case lookup" reference). T-MCP-02 cum unchanged at **66**. State-capture exceptions cumulative unchanged at **1**. **14-day experiment window still NOT started** — begins next session at experiment_run INSERT with status='running' + criteria_snapshot=brief §10 verbatim JSON. Verdict Day-19 = **2026-05-29 Sydney**. **3 NEW L-candidates v2.75**: L63 (brief implementation gap detected at sub-stage UI integration), L64 (repo-target verification before chaining CCD operations), L65 (PostgREST exposed_schemas as runtime config dependency). All 3 candidates 1 empirical occurrence within cc-0014; promotion pending pattern repeat in independent brief. **L58 strengthened — 3rd preventive application** (3 single-file chat MCP commits this session per L58 strict; 3-file atomic at ~107KB combined declined as outside comfort band). Cumulative L58: 1 reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **L58 promotion to baseline recommended at v2.76**. L41 + L44 + L45 + L48 re-exercised v2.75. L55 reactive cycle 4 + L60 occurrence 7 (V-E2 UUID fixture). **Sync this session via 3 separate single-file chat MCP commits** (session file + sync_state + action_list). Dashboard PHASES NOT updated — **28th consecutive deferral** intentional per IOL hold-stance pending Day-19 verdict. **Next major:** cc-0014 Stage E close + 14-day window start (one INSERT into friction.experiment_run with status='running' + criteria_snapshot=brief §10 verbatim) — first action next session.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.74.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 carried.

**v2.75 ADDITIONS:**
- **cc-0014 Stage D CLOSED + Stage E APPLIED (backend + frontend + promotion).** Three migrations + three CCD commits + one PK manual UI change this session. Stage D fully verified via PK manual V-D4 + V-D5 (5 routes, 5-10s per submission). Stage E backend + frontend + promotion all V-checked PASS. 14-day experiment window NOT yet started — one step remains (experiment_run INSERT) for next session rank 1.
- **3 NEW L-candidates this session**: L63 (brief implementation gap detected at sub-stage UI integration; cc-0014 §7 "7-day case lookup" referenced but never built across Stages A-D; discovered at Stage E frontend completion via empty /operations state); L64 (repo-target verification before chaining CCD operations; CCD's HEAD reports were technically accurate for the wrong working clone; chat must separately verify SHA matches expected target repo); L65 (PostgREST exposed_schemas as runtime config dependency; new schema visible to direct SQL but NOT exposed to PostgREST API until project setting updated; pre-flight via apply_migration cannot detect).
- **L58 strengthened — 3rd preventive application this session pair**: v2.75 sync via 3 single-file chat MCP commits per L58 strict — 3-file atomic push at ~107KB combined payload (session file 14KB + sync_state 49KB + action_list ~53KB) declined as outside L58 comfort band; per-file at each size within MCP single-file write reliability profile. Cumulative L58: 1 originating reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **Promotion to baseline recommended at v2.76** — 3 consecutive preventive applications within consistent cc-0014 context with zero failures.
- **0 D-01 fires this session** per brief §13. T-MCP-02 cum stays at 66 cumulative. State-capture exceptions stay at 1 cumulative.
- **PostgREST exposed_schemas now includes `friction`** (PK manual UI change in Supabase dashboard Settings → API). Required runtime sibling for any new schema accessed via supabase-js / PostgREST.
- **Sync debt resolved this commit**: 1 new session file (2026-05-15 Stage D + E pre-run) + action_list v2.74 → v2.75 + sync_state v2.74 → v2.75. **3 single-file chat MCP commits this session**. 3-of-4-way sync (docs + memory carries; dashboard PHASES intentionally deferred — **28th consecutive** — per IOL hold-stance pending Day-19 verdict 2026-05-29).
- **CCD commits this session**: 3 via local git on PK's Windows machine. Task 1 relocation `6711d5f4` (invegent-dashboard FAB), Task 2 relocation `86d2c2b9` (Invegent-content-engine revert), Stage E frontend `5753f41b` (invegent-dashboard /operations).

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (cc-0014 Stage E pending experiment_run INSERT; V-C3 live verification pending; memory edit cycle pending) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~10h v2.75 (Stage D close arc + Stage E backend + Stage E frontend CCD cycle + brief gap discovery + Stage E promotion trigger + V-checks + backfill + V-E3 + 3-commit sync drafting) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**v2.75 cycle: ~10h total** (Stage D FAB relocation directive authoring ~1.5h + CCD relocation cycle handoff + V-D4/V-D5 PK manual verification ~30 min + PostgREST exposed_schemas fix diagnosis ~10 min + Stage E backend pre-flight + apply_migration + V-E1/V-E2 ~45 min + Stage E frontend directive authoring ~30 min + CCD handoff ~30 min + V-E3 PK manual ~15 min + brief gap discovery + G1 directive amendment ~45 min + Stage E promotion trigger apply_migration + V-P1..V-P8 + backfill ~1h + V-E3 SQL verification ~15 min + 3-commit sync drafting ~3h).

**State-capture exception count v2.75: 0** (no D-01 fires this session; v2.72's count of 1 carries cumulatively).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-15 Sydney (v2.75).
> **v2.75 note:** cc-0014 Stage D CLOSED + Stage E APPLIED (backend + frontend + promotion). 14-day experiment window NOT yet started. Stage E close + experiment_run INSERT is one focused step away (rank 1 next session). V-C3 live Cowork verification still pending (rank 2 carry; Cowork output pipeline silent since 2026-05-06, now 10-day gap). Memory edit cycle escalated to rank 3 (v2.75 state needs to land in user_memories before next sessions rely on memory alone). Brief v1.2 doc patch carries with expanded scope (now 6 fixture defects + L60 + L63 + L64 + L65 framing). cc-0013 Dashboard Phase 0 stays deprioritised at rank 5 pending Day-19 verdict. Close-the-loop batches rank 6 (31 eligible). Personal businesses retained as standing P0.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0014 Stage E close + 14-day window start** | **P1 (rank 1 v2.75)** | One step remaining: DELETE any residual `cc-0014-test/%` rows from friction.event + friction.case + friction.emit_error (V-P6 confirmed 0 residue; documented-noop per brief §5) then INSERT into `friction.experiment_run` with `status='running'`, `starts_at=now()`, `ends_at=now()+INTERVAL '14 days'`, `criteria_locked_at=now()`, `criteria_snapshot=brief §10 verbatim JSON` (5 success criteria + invalidation thresholds). From the moment of INSERT: 14-day clock runs (Day-19 verdict = **2026-05-29 Sydney**), criteria_snapshot becomes immutable (trigger `friction_experiment_run_criteria_immutable` activates), DELETEs on friction.event + friction.case blocked (triggers `friction_event_no_delete_during_run` + `friction_case_no_delete_during_run` activate). | chat → PK confirm → execute | Chat operation: 1 `execute_sql` for cleanup verification + 1 `execute_sql` (or `apply_migration`) for experiment_run INSERT. PK explicit confirmation immediately before INSERT (one-way door). |
| 2 | **V-C3 live Cowork verification (manual trigger if needed)** | P1 (rank 2 v2.75 carry from v2.74) | Stage C HARD-STOP scope: a live Cowork run with v3.0 brief must produce friction.event rows whose `source_event_id` (`run_id/finding_id`) match the Section 10 markdown HTML-comment finding_ids by both count and value. Cowork output pipeline has been silent since 2026-05-06 (10-day gap as of v2.75 close). If next cron-scheduled Cowork run does not fire/commit, PK runs `openclaw tui` on Windows to manually trigger one run with v3.0 brief. Post-run reconciliation: chat runs single `execute_sql` joining `friction.event` (filtered to `source='health_check'` + `raw_payload->>'health_check_run_id' = '<run_id>'`) against the markdown file's `<!-- finding_id: priority-N/short-key -->` markers. Match → V-C3 PASS. Mismatch → HARD-STOP. | PK → Cowork (or natural cron) → chat | If natural Cowork run fires within next 24h, automatic verification. Otherwise PK manually triggers Cowork on Windows. |
| 3 | **Memory edit cycle (v2.75 state)** | **P1 NEW rank 3 v2.75** | v2.75 changes (Stage D APPLIED, Stage E APPLIED — backend + frontend + promotion, /operations route live, 14-day window status PENDING run start, PostgREST exposed_schemas includes friction) need to land in user_memories before next sessions can rely on memory alone for these facts. Currently at **30/30 cap**; PK needs to decide pruning cadence — likely drop pre-v2.70 memories or compress cc-0010* entries. | PK → chat | Single-pass memory_user_edits: PK identifies prune candidates; chat applies replace/remove operations to bring count to ~27, then add ~3 new entries reflecting v2.75 state. |
| 4 | **Brief v1.2 doc patch (combined defects + L60/L63/L64/L65 framing)** | **P3 (rank 4 v2.75, carry from v2.74)** | Combine 6 documented brief defects into a single v1.2 doc patch: (a) V-A10 UUID `cc0014va10` non-hex `v` (v2.72); (b) V-A11 UUID `cc00014va11a` 13-char segment (v2.72); (c) V-B1 UUID `cc0014test01` non-hex `t`/`s` (v2.73); (d) V-B1 missing FK seed for `drift_check_run_id` + `created_by_run_id` (v2.73); (e) V-B1 missing `updated_by_run_id` in INSERT col list (v2.73); (f) V-E2 UUID `cc0014etest2` non-hex `t` (v2.75) — extending L60 to 7 occurrences. Plus add L63 (brief implementation gap discovery) + L64 (repo-target verification) + L65 (PostgREST exposed_schemas) framing as brief-authoring + execution discipline sections. **v2.75**: 1 new fixture defect (V-E2) + 3 new L-candidates. Doc-only; no production state change. | chat → future session (PK directs) | Single doc patch via local git when PK greenlights. |
| 5 | **cc-0013 Dashboard Phase 0** | **P2 (DEPRIORITISED — rank 5 carry from v2.72/v2.73/v2.74/v2.75)** | DEPRIORITISED pending cc-0014 Day-19 verdict (2026-05-29). If cc-0014 PASSES, dashboard work should fold the IOL read surface (`/operations` route now live at HEAD `5753f41b`) as the new dashboard anchor rather than the pre-IOL `cc-0013` framing. If cc-0014 FAILS, return to cc-0013 original scope. If cc-0014 INVALID, address instrument cause first. **Hold and register stance**: use the dashboard as-is during the 14-day window; capture friction observations via Stage D manual form when they surface; reconsider scope after verdict. | chat → future session post-Day 19 | Hold. |
| 6 | **Close-the-loop batch sweep** | P2 (rank 6 v2.75) | 5 prior cc-NNNN rows still in escalated status + 2 from v2.72 (`903cfd8e` + `873985f7`, both PK-resolved with type-(b) patch + type-(c) override; pending status='resolved' UPDATE) + 24 unrelated historical escalated rows untouched per CCH directive. v2.75 adds **0 new D-01 rows** (Stage D + Stage E execution fired 0 D-01 per brief §13). Total eligible: **31 rows** (5 + 2 + 24, unchanged from v2.74). | chat → next session | Single `execute_sql` UPDATE with CASE for 5+2 row batch; separate review for 24-row historical batch. |

**Standing P0 (not ranked in Today/Next 5):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51. PK reports any time-sensitive items at session start.

**Passive observation v2.75**: Cron 83 `ice_evidence_materialiser_30min` (steady-state); cron 84 `reconciliation_matcher_30min` (steady-state); cron 85 `cadence_drift_checker_weekly` (Sun 17:30 UTC); cron 86 `friction-verification-daily` (`15 1 * * *` UTC, active; produced first marker row 2026-05-15 01:15 UTC). PRV v1 operator views queryable via `op_reader` role. **friction.\* schema state v2.75**: 5 tables live; 6 active categories + 1 unclassified placeholder seeded; `friction_emit_reconciliation` trigger live on `r.cadence_drift_log` (Stage B); `friction.fn_emit_health_check_findings` + `friction.fn_verify_health_check_daily` functions live (Stage C); **`friction.fn_recent_cases` + `friction.fn_triage_case` functions live (Stage E backend NEW v2.75)**; **`friction.fn_promote_event_to_case` function + `friction_event_promote_to_case` BEFORE INSERT trigger live on friction.event (Stage E promotion NEW v2.75)**; **5 events + 5 cases (1 acknowledged + 4 new)**; 0 experiment_run rows (no `running` row, 14-day window not started). **PostgREST exposed_schemas includes `friction` (NEW v2.75 PK manual UI change)**. **/operations route live in invegent-dashboard at HEAD `5753f41b`**. Next natural production fires: cron 85 Sun 18 May 17:30 UTC (first opportunity for reconciliation trigger to emit `friction.event` rows in production with auto-promotion to cases); cron 86 daily 01:15 UTC.

---

## 🟢 cc-0014 friction register experiment — STATUS BLOCK (UPDATED v2.75)

**Status v2.75: STAGES A + B + C + D + E APPLIED.** Migration `cc_0014_a_friction_schema` applied 2026-05-14 (Stage A). Migration `cc_0014_b_reconciliation_emitter` applied 2026-05-15 (Stage B). Migration `cc_0014_c_health_check_emitter` applied 2026-05-15 (Stage C). Migration `cc_0014_d_manual_emit_function` applied during Stage D backend (covered in v2.74; frontend completed via FAB relocation arc v2.75). **Migration `cc_0014_e_read_surface_and_triage` applied v2.75 (Stage E backend)**. **Migration `cc_0014_e_promote_event_to_case` applied v2.75 (Stage E promotion — brief-completing per §7 "7-day case lookup" reference)**. All 11 V-A + 5 V-B + 5 V-C + 5 V-D + 3 V-E (E1/E2/E3) + 8 V-P checks PASS. V-C3 + V-E4 + V-E5 pending (V-C3 awaiting live Cowork; V-E4 + V-E5 are next session step 1). Stage E close (run start) pending. The 14-day experiment window has NOT started — one INSERT remains.

**Brief lineage (unchanged from v2.72):** v1.0 → v1.1 final (frozen at commit `34305092f4`). Stages B + C + D + E applied without further D-01 cycles per §13 governance gate.

**Stages delivered:**
- Stage A v1.1: schema + grants + 2 triggers + 11 V-checks all PASS (v2.72, 2026-05-14)
- Stage B: SECURITY DEFINER function + AFTER INSERT trigger on `r.cadence_drift_log` + 5 V-checks all PASS (v2.73, 2026-05-15)
- Stage C: 2 SECURITY DEFINER functions + pg_cron job 86 + Cowork brief v2.1 → v3.0 + 5 V-checks PASS; V-C3 PENDING live run (v2.74, 2026-05-15)
- **Stage D: SECURITY DEFINER function (fn_emit_manual_event) + frontend FAB at HEAD `6711d5f4` in invegent-dashboard + PostgREST exposed_schemas extended to include `friction` + 5 V-D checks + Supp-1/2 PASS via PK manual (v2.75, 2026-05-15)**
- **Stage E backend: 2 SECURITY DEFINER functions (fn_recent_cases + fn_triage_case) + 2 V-E checks (E1 + E2) PASS (v2.75, 2026-05-15)**
- **Stage E frontend: `/operations` route at HEAD `5753f41b` in invegent-dashboard (page.tsx + case-row.tsx) + Server Action wrapper (actions/triage-case.ts) + V-E3 PASS via PK manual + SQL probe verification (v2.75, 2026-05-15)**
- **Stage E promotion (brief-completing): SECURITY DEFINER function (fn_promote_event_to_case) + BEFORE INSERT trigger (friction_event_promote_to_case) + 8 V-P checks PASS + 5 PK V-D5 observations backfilled into 5 friction.case rows (v2.75, 2026-05-15)**

**Stages pending:**
- **Stage E close: pre-experiment cleanup + experiment_run INSERT (one-way door to 14-day window)** — next session rank 1
- Stage E V-E4 (pre-experiment cleanup zero test rows) + V-E5 (experiment_run row created with status='running') — both deferred to next session

**V-C3 live verification pending:**
- Requires live Cowork run with v3.0 brief that produces markdown + emits to friction.event via the SECURITY DEFINER function
- Reconciliation: `source_event_id` (composite `run_id/finding_id`) joins to markdown HTML-comment `<!-- finding_id: priority-N/short-key -->` markers by BOTH count and finding_id value
- Cowork output pipeline silent since 2026-05-06 (10-day gap as of v2.75 close); manual Cowork trigger by PK on Windows is the recovery path if next scheduled fire does not commit

**Production state at v2.75 close:**
- `friction` schema live in Supabase `mbkmaxqhsohbtwsqolns`
- 5 tables: `friction.category` (6 active + 1 unclassified), **`friction.event` (5 rows — all PK V-D5 manual observations from 2026-05-15 14:12-14:18 Sydney, all linked to cases via promotion trigger backfill)**, **`friction.case` (5 rows — 1:1 from 5 events with distinct dedupe_fingerprints; 4 in triage_state='new', 1 in triage_state='acknowledged' with full triage fields filled)**, `friction.emit_error` (1 verification marker row from cron-86 NO_EVENTS_NO_ERRORS 2026-05-15 01:15 UTC), `friction.experiment_run` (empty — no `running` row yet)
- 4 CHECK constraints on `friction.case`
- **4 dormant triggers + 1 active trigger** in `friction.*`:
  - dormant: `friction_event_no_delete_during_run`, `friction_case_no_delete_during_run`, `friction_experiment_run_criteria_immutable` (Stage A v1.1 patch — activate when status='running')
  - **active NEW v2.75: `friction_event_promote_to_case` BEFORE INSERT FOR EACH ROW on friction.event**
- 1 active trigger on `r.cadence_drift_log`: `friction_emit_reconciliation` AFTER INSERT (Stage B)
- **8 functions in `friction.*` schema (3 NEW v2.75):** `fn_prevent_delete_during_run`, `fn_lock_criteria_snapshot` (Stage A); `fn_emit_reconciliation_event` (Stage B); `fn_emit_health_check_findings`, `fn_verify_health_check_daily` (Stage C); `fn_emit_manual_event` (Stage D); **`fn_recent_cases`, `fn_triage_case` (Stage E backend NEW v2.75)**; **`fn_promote_event_to_case` (Stage E promotion NEW v2.75)**
- 5 pg_cron jobs: 82, 83, 84, 85, 86 — all unchanged from v2.74
- **PostgREST exposed_schemas: now includes `friction` (NEW v2.75 PK manual UI change)**
- Cowork brief `nightly-health-check-v1` v3.0 live at HEAD `bc32e86`
- **invegent-dashboard HEAD: `5753f41b9c554c4eeb7a271691a95430ccac3294`** (FAB live + /operations route live)
- DASHBOARD_FRICTION_FAB_ENABLED=true in PK's local `.env.local`; Vercel env var deferred (Stage D + E remain local-only during 14-day experiment)
- Grants per brief Section 3 role matrix; service_role/authenticated/anon all explicit
- main HEAD on Invegent-content-engine at session close: this commit (v2.75 action_list) building on sync_state commit `5baa6d41...` building on session file commit `dd8cd83d...` building on `86d2c2b9` (Stage D revert)

**Stage E V-check evidence:**

| V-check | Evidence |
|---|---|
| V-E1 | `SET LOCAL ROLE authenticated; SELECT count(*) FROM friction.fn_recent_cases(10);` returned 0 (no cases existed at this point) |
| V-E2 | Test case seed at hex UUID `00000000-0000-0000-0000-00000cc01402` (initial attempt non-hex `cc0014etest2` caught at SQLSTATE 22P02 + L60 7th occurrence; fixed); `fn_triage_case` as authenticated set triage_state='acknowledged' + quality_flag=true; reviewed_at populated; supplementary V-check raised P0002 on non-existent case_id; test row cleaned |
| V-E3 | PK manual: page renders with 5 cases (severity badge + observation snippet + category + relative time + event count + triage badge); row expand reveals full inline edit form with conditional fields (next_review_at on track/defer, capture_reason_note Optional vs Required by capture_reason value, suppression_reason on suppress only); save → row collapses + list refreshes + acknowledged case moves to bottom per sort; SQL probe verified all 8 fields PK saved (triage_state='acknowledged', quality_flag=true, action_decision='track', next_review_at 2026-05-22 10:00 Sydney, capture_reason='routine_log', capture_reason_note='Found it visually ' with trailing space preserved, reviewed_at + updated_at both set); 4 other cases remained `new` with triage fields null (clean isolation) |
| V-E4 | DEFERRED to next session (pre-experiment cleanup; V-P6 already shows 0 residue — defensive run only) |
| V-E5 | DEFERRED to next session (experiment_run INSERT with status='running' + criteria_snapshot=brief §10 verbatim) |
| V-P1 | New event with no matching case → new case created, event linked, event_count=1 |
| V-P2 | Second event with same dedupe_fingerprint + category within 7 days → linked to V-P1's case (verified same case_id), event_count=2 |
| V-P3 | Event with different dedupe_fingerprint → separate case (total 2 test cases) |
| V-P4 | Critical event matching info case → case severity escalated to critical, event_count=3 |
| V-P5 | Backfill DO block iterated over 5 orphan events (PK's V-D5 submissions); each had distinct dedupe_fingerprint → 5 new cases created (1:1 mapping); 0 remaining orphans |
| V-P6 | 0 residual cc-0014-test rows (events + cases) after cleanup of V-P1..V-P4 fixtures |
| V-P7 | 0 experiment_run rows with status='running' |
| V-P8 | 0 experiment_run rows for brief_id='cc-0014' (Stage E run start not yet executed) |

**Stage D V-check evidence:**

| V-check | Evidence |
|---|---|
| V-D1 | fn_emit_manual_event callable (v2.74); re-verified via FAB submission v2.75 |
| V-D2 | Input validation works (v2.74) |
| V-D3 | anon denied (v2.74) |
| V-D4 | FAB visible on 5 distinct routes via PK manual: /overview, /monitor, /pipeline-log, /content-studio, /clients; SQL probe verified 5 events written with correct dashboard_route in related_object |
| V-D5 | 5 PK timed submissions: PK reported 5-10s per submission, well under 15s target average; all 5 events landed in friction.event |
| V-D6 | N/A — V-D5 submissions are real observations not test rows; kept (and now backfilled into cases via promotion trigger) |
| Supp-1 | Service-role server-only — `server-only` import in actions/emit-friction.ts at HEAD `6711d5f4`; no client bundle exposure |
| Supp-2 | RPC-only client write — Server Action wrapper; client never touches friction.event directly |

**D-01 fires this session (Stage D + Stage E): 0** (per brief §13). Stage D execution matched brief §9; Stage E backend matched brief §10; Stage E promotion trigger non-divergent per brief §7 "7-day case lookup" reference (chat surfaced gap, PK directed G1, implementation completes brief intent rather than adding new scope).

**Cumulative D-01 history for cc-0014 (unchanged from v2.74):**
| review_id | brief version | session | verdict | classification | resolution status |
|---|---|---|---|---|---|
| `903cfd8e-5c59-45d5-a310-1e2ff35ef93e` | v1.0 | v2.72 | partial | type-(b) | PK-resolved (v1.1 patch); pending close-the-loop UPDATE |
| `873985f7-4069-4471-a3e1-0e0e0e0e0e0e` | v1.1 | v2.72 | partial | type-(c) | PK-resolved (state-capture override); pending close-the-loop UPDATE |

**Result file:** (deferred — cc-0014 closes at Day 19 verdict 2026-05-29, not at Stage A/B/C/D/E apply).

**Session files:**
- `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` (retroactive, written v2.73)
- `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` (written v2.73)
- `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` (written v2.74)
- **`docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` (NEW v2.75)**

**Open follow-ups:**
- **Stage E close + 14-day window start** (rank 1 v2.75 — chat operation, PK explicit confirmation before INSERT)
- V-C3 live Cowork verification (rank 2 v2.75 — natural cron OR PK manual trigger)
- Memory edit cycle (rank 3 v2.75 NEW — 30/30 cap requires pruning)
- Close-the-loop UPDATEs on 2 m.chatgpt_review rows from v2.72
- Brief v1.2 doc patch — 6 documented Stage A/B/E fixture defects + L60 + L63 + L64 + L65 framing (scope expanded v2.75)
- L58 + L59 + L60 + L63 + L64 + L65 candidates — promotion pending pattern repeat in independent contexts

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.75, condensed)

**Status v2.75:** **CLOSED-WITH-VERIFIED-VARIANCE v2.71.** PRV v1 operator views live. `op_reader` role NOLOGIN; SELECT to `op_reader` + `service_role` only; REVOKE ALL from PUBLIC/anon/authenticated. **Reconciliation v1 + PRV v1 family complete end-to-end** (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 + cc-0012 all closed).

3 carry items into v1.1 cc-0012 minor doc patch (now P3 deprioritised pending IOL outcome):
- Var-A1: information_schema.columns vs pg_attribute relkind-aware primitive
- Var-A2: §7 V5 narrative 7-client → 4-client correction
- Var-A3: op.v_freshness_rollup.attention_needed NULL handling

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.75, condensed)

**Status v2.75:** **CLOSED-WITH-VERIFIED-VARIANCE v2.68.** EF v2 ACTIVE; cron 83 firing every 30 min. F4 path (b) hotfix encoded → merged → deployed → cron-validated. L40 reified end-to-end at runtime. **Result file:** `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.75, condensed)

**Status v2.75:** **APPLIED + CLOSED v2.67.** 6 r.* tables + 1 helper + 1 FK + 86 k.column_registry rows live. **v1.6 doc patch (3 items) DEPRIORITISED to P3 pending IOL outcome.** **Result file:** `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 — STATUS BLOCK (UPDATED v2.75)

**Status v2.75:** **L44 + L45 + L46 + L48 baseline-eligible.** L40 reified end-to-end v2.68. L52 + L53 + L57 candidates carry from v2.68–v2.74. **L58 candidate STRENGTHENED v2.75 — 3rd preventive application. Promotion to baseline recommended at v2.76.** L59 candidate carry. L60 NEW candidate strengthened v2.75 (7th occurrence). **3 NEW candidates v2.75: L63 (brief implementation gap), L64 (repo-target verification), L65 (PostgREST exposed_schemas).**

- **L40**: reified end-to-end at runtime v2.68; not re-exercised v2.75.
- **L41**: honored v2.68 + re-exercised v2.74 + **v2.75** (3 CCD commit HEAD-verifications this session: relocation Task 1 `6711d5f4` + Task 2 `86d2c2b9` + Stage E frontend `5753f41b`; plus 1 PostgREST exposed_schemas post-PK-UI-change verification). 4 baseline-eligible exercises now.
- **L44 (Runtime Proof Pre-flight)**: 5 cycles at v2.74. **v2.75 adds 6th**: Stage E backend pre-flight (functions don't exist + friction.case columns) + Stage E promotion trigger pre-flight (no pre-existing trigger). **Baseline-eligible — pre-flight discipline reified for the fourth consecutive Stage.**
- **L45 (Post-mutation truth check)**: 3 baseline-eligible exercises at v2.74. **v2.75 adds 4th**: 3 CCD commit HEAD-verifications via `list_recent_commits` (relocation Task 1 + Task 2 + Stage E frontend). Baseline-eligible — strengthened by Stage E verification cycle.
- **L46 (Reviewer Evidence Gate)**: 5 consecutive clean pass-through D-01s at v2.68 (strongest baseline). v2.72: 0 clean pass-through (both fires returned partial). v2.73 + v2.74 + **v2.75**: not exercised (0 D-01 fires per brief §13 in all three). **Pattern shape v2.75 reinforces v2.73 + v2.74**: three consecutive stage-execution sessions with 0 D-01 fires when brief governance gate (§13) honored — saves D-01 budget for genuine divergence cases.
- **L47**: still deferred. No race opportunity v2.75.
- **L48**: vindicated v2.67–v2.68. **Re-exercised v2.75** (2 atomic migrations: cc_0014_e_read_surface_and_triage + cc_0014_e_promote_event_to_case).
- **L49 carry**: PG reserved-word collision check. No PL/pgSQL-heavy work v2.75 (standard control flow + standard types in both Stage E migrations).
- **L52 (MCP vs CLI deploy reliability)**: 4 consecutive clean CLI deploys v2.70 STRONG PROMOTION CANDIDATE. v2.72/v2.73/v2.74/v2.75: no EF deploys.
- **L53 (FK source-column-type asymmetry at brief authoring)**: 4 cycles at v2.74. **v2.75: not exercised** (Stage E migrations had no FK fabrications). Promotion eligibility unchanged.
- **L54 (V-check duration derivation)**: v2.69 reified.
- **L55 (EF grep checklist for column names → extends to column-value validity)**: 3 cycles at v2.74. **v2.75 adds 4th**: V-E2 UUID fixture `cc0014etest2` had non-hex `t` — caught at first execute_sql attempt with SQLSTATE 22P02 (`invalid input syntax for type uuid`); fixed at first attempt to all-hex `00000cc01402`. Reactive pattern reinforced.
- **L56 (timestamptz string-parsing pre-validation)**: v2.70 informal.
- **L57 (relkind-aware column-shape probe)**: v2.71 NEW candidate. Not exercised v2.75 (no view/matview probes).
- **L58 (MCP `create_or_update_file` >30KB reliability)**: pattern-of-one at v2.72. **v2.73: 1st preventive application** (Path C 4-file sync). **v2.74: 2nd preventive application** (Path C v3.0 brief at 33.5 KB). **v2.75: 3rd preventive application** (3 single-file chat MCP commits this session; 3-file atomic at ~107KB combined declined as outside L58 comfort band). Cumulative: 1 originating reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **PROMOTION TO BASELINE RECOMMENDED AT v2.76** — 3 consecutive preventive applications within consistent cc-0014 context with zero failures. v2.76 promotion blocker only if there's reason to wait for one more independent occurrence in a non-cc-0014 context.
- **L59 (schema-enforced append-only > convention)**: v2.72 reified in Stage A v1.1 patch. Not re-exercised v2.75.
- **L60 (fabricated test-fixture validity)**: v2.73 NEW candidate covering UUID hex-validity + FK target row existence + NOT NULL completeness. 6 occurrences across cc-0014 V-A10/V-A11/V-B1 at v2.74. **v2.75 adds 7th**: V-E2 UUID `cc0014etest2` non-hex `t` (same defect class as v2.72/v2.73 occurrences). All 7 occurrences within cc-0014 lineage. Promotion still pending pattern repeat in independent brief.
- **L62 type-(c) state-capture override empirically used v2.72** at Stage A v1.1 D-01. Not exercised v2.73 or v2.74 or **v2.75** (0 D-01 fires in all three).
- **L63 NEW candidate v2.75 — Brief implementation gap at sub-stage UI integration.** cc-0014 brief §7 reconciliation emitter comment `-- recurrence via 7-day case lookup` was design assumption never built across Stages A-D. Gap was masked through emitters-only stages until UI surface (Stage E /operations) forced inspection. CCD's report parenthetical "(if defined in cc-0014 Stage A)" was the cue. Pattern: review brief comments + standalone references for implied-but-unbuilt mechanisms before declaring a sub-stage closed; downstream stages can mask the gap until a UI surface forces inspection. 1 empirical occurrence; promotion pending pattern repeat in independent brief.
- **L64 NEW candidate v2.75 — Repo-target verification before chaining CCD operations.** CCD's two Stage D commits (`fe7bf346`, `ca935d4e`) landed in `Invegent-content-engine/dashboard/` (cc-0013 scaffold sandbox subdirectory) instead of `invegent-dashboard/main`. CCD's `HEAD: <sha>` reports were technically accurate — that was the HEAD CCD pushed to in its working clone — but the working clone happened to be the wrong repo. Chat caught the mismatch only via a separate `list_recent_commits` on the expected target repo (`invegent-dashboard`) which showed HEAD still at `13d66210...` (pre-Stage-D). The pre-existing cc-0013 sandbox subdirectory in content-engine masked the mistake because `dashboard/` is a plausible-looking destination for FAB code. Pattern: when CCD reports `HEAD: <sha>`, separately verify the SHA matches a commit in the expected target repo, especially for first-time work in a repo CCD has not recently touched, and especially when other repos in the org have similarly-named scaffold subdirectories. 1 empirical occurrence; promotion pending pattern repeat.
- **L65 NEW candidate v2.75 — PostgREST exposed_schemas as runtime config dependency.** New `friction` schema was visible to direct SQL (Supabase MCP execute_sql, psql) and existed in `pg_namespace`, but was NOT exposed to PostgREST API clients until added to project Settings → API → Exposed schemas list. Failure mode: server-side code using supabase-js `.schema("friction").rpc(...)` returns runtime error `"The schema must be one of the following: public, graphql_public, k, f, m, c, r, a, t"`. Discovery: only at first manual FAB submission (V-D4 first manual run). Pre-flight via apply_migration could not detect because the migration-side state was correct. Pattern: when adding a new schema that will be accessed via supabase-js / PostgREST (vs only via direct SQL or SECURITY DEFINER triggers), the exposed_schemas project setting is a required runtime sibling — add to brief pre-flight checklist for any new-schema work that includes a server-side or client-side supabase-js access path. 1 empirical occurrence; promotion pending pattern repeat.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.75)

Unchanged from v2.65–v2.74. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.75 update:** Day-19 verdict date for cc-0014 set to **2026-05-29 Sydney** once experiment_run INSERT happens next session. If next session is 2026-05-16, Day-19 = 2026-05-30. (Day-19 is 14 calendar days from `experiment_run.starts_at`.) Track this as a soft deadline; chat fires Day-19 verdict queries automatically.

Other time-bound items unchanged from v2.74.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.75 application**: 0 D-01 fires this session (Stage D execution did not diverge from brief §9; Stage E backend matched brief §10; promotion trigger non-divergent per brief §7 reference per §13). Cumulative T-MCP-02 stays at **66** (unchanged from v2.72).

**L46 Evidence Gate v2.75**: not exercised this session. v2.72's 2 partial verdicts (903cfd8e + 873985f7) remain the most-recent operational data point. Pattern reinforced v2.75 (extends v2.73 + v2.74): three consecutive stage-execution sessions with 0 D-01 fires under brief §13 governance gate.

**Close-the-loop UPDATEs to m.chatgpt_review v2.75: 0 this session.** 5 prior + 2 from v2.72 + 24 historical = **31 eligible** for next-session batch sweep (unchanged from v2.74).

---

## 🤖 Cowork automation (D182)

**v2.75 status:** Cowork brief `nightly-health-check-v1` v3.0 frozen (committed v2.74 at HEAD `bc32e86`). Cron 82 firing daily (Cowork brief picker). Cron 83 firing every 30 min. Cron 86 `friction-verification-daily` at `15 1 * * *` UTC produced its first marker row at 2026-05-15 01:15 UTC (NO_EVENTS_NO_ERRORS, confirming verification function works). **Cowork output pipeline observed silent since 2026-05-06** (V-C3 live verification dependency) — 10-day gap as of v2.75 close. Recovery via PK manual `openclaw tui` trigger on Windows if natural scheduled fire continues to not commit.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0014 Stage E close** | Pre-experiment cleanup + experiment_run INSERT = 14-day window start | **P1 (rank 1 v2.75 — one INSERT remaining)** | UNBLOCKED. All Stage E sub-stages applied (backend + frontend + promotion). V-E1/V-E2/V-E3 PASS + V-P1..V-P8 PASS. Pending: V-E4 + V-E5 + experiment_run INSERT (chat operation, PK explicit confirmation). | chat → PK confirm → execute | Single execute_sql for cleanup verification + single INSERT into friction.experiment_run with status='running' + criteria_snapshot=brief §10 verbatim JSON |
| **cc-0014 Stage D** | Manual capture FAB + `friction.fn_emit_manual_event` | **P1 (CLOSED v2.75)** | CLOSED. Migration applied (covered v2.74). Frontend at HEAD `6711d5f4` invegent-dashboard. PostgREST exposed_schemas extended. V-D1..V-D5 + Supp-1/2 all PASS via PK manual. | informational | (closed) |
| **cc-0014 Stage E backend** | fn_recent_cases + fn_triage_case RPCs | **P1 (CLOSED v2.75)** | CLOSED. Migration `cc_0014_e_read_surface_and_triage` applied. V-E1 + V-E2 PASS. | informational | (closed) |
| **cc-0014 Stage E frontend** | /operations route + case-row.tsx + actions/triage-case.ts | **P1 (CLOSED v2.75)** | CLOSED. CCD commit `5753f41b` invegent-dashboard. V-E3 PASS via PK manual + SQL probe verification. | informational | (closed) |
| **cc-0014 Stage E promotion** | fn_promote_event_to_case + BEFORE INSERT trigger | **P1 (CLOSED v2.75 — brief-completing)** | CLOSED. Migration `cc_0014_e_promote_event_to_case` applied. V-P1..V-P8 PASS. 5 PK V-D5 orphans backfilled into 5 cases (1:1). | informational | (closed) |
| **cc-0014 Stage C** | Health check Cowork brief v3.0 dual-write + pg_cron verification | P1 (v2.74 — APPLIED, V-C3 PENDING) | APPLIED. 5/6 V-checks PASS. V-C3 pending live Cowork run (rank 2 v2.75). | chat → Cowork run / PK manual trigger | Wait for natural cron Cowork fire OR PK runs `openclaw tui` to manually trigger one v3.0 run |
| **V-C3 live Cowork verification** | Live Cowork run with v3.0 brief produces friction.event rows matching markdown finding_ids by source_event_id | P1 (rank 2 v2.75 carry from v2.74) | PENDING. Cowork output pipeline silent since 2026-05-06 (10-day gap); may require manual trigger by PK. | PK → Cowork → chat | Natural cron fire OR `openclaw tui` manual; chat runs reconciliation SQL post-run |
| **Memory edit cycle (v2.75 state)** | Persist Stage D APPLIED + Stage E APPLIED + 14-day window pending into user_memories | **P1 NEW rank 3 v2.75** | UNBLOCKED. 30/30 cap requires pruning + insertion. | PK → chat | PK identifies prune candidates; chat applies replace/remove + add operations |
| **Brief v1.2 doc patch (combined defects + L60/L63/L64/L65)** | 6 brief defects (3 Stage A + 3 Stage B + 1 Stage E) + L60/L63/L64/L65 framing | **P3 (rank 4 v2.75, carry from v2.74 with expanded scope)** | DRAFT scope updated; v2.75 adds 1 fixture defect (V-E2 UUID) + 3 new L-candidates. Doc-only. | chat → future session (PK directs) | Single doc patch via local git when PK greenlights |
| **cc-0013 Dashboard Phase 0** | DEPRIORITISED pending cc-0014 Day 19 verdict | P2 (DEPRIORITISED, carry v2.72/v2.73/v2.74/v2.75) | HOLD. PRV v1 operator views + /operations route consumable for ad-hoc sustained observation. | chat → future session post-Day 19 | Hold |
| **v1.1 cc-0012 minor doc patch (3 carry items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry v2.72) | HOLD pending cc-0014 outcome. | chat → future session | Doc-only patch via local git |
| **v1.6 doc-only patch to cc-0010A (3 items)** | result_jsonb rename + r.set_updated_at trigger audit + m.post_publish.queue_id non-FK | P3 (carry v2.72) | HOLD pending cc-0014 outcome. | chat → future session | Doc-only patch via local git |
| **v1.3 cc-0011 minor doc patch (5 carry items)** | E1 + Var-A + Var-B + Var-C + Var-E | P3 (carry v2.72) | HOLD pending cc-0014 outcome. | chat → future session | Doc-only patch via local git |
| **Close-the-loop batch sweep** | 5-row + 2 v2.72 rows + 24-row historical = 31 eligible | P2 (rank 6 v2.75) | UNBLOCKED. v2.75 adds 0 new rows (no D-01 fires this session). | chat → next session | Single execute_sql UPDATE with CASE for 5+2 row batch; separate review for 24-row historical |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit (combined)** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68 by E1. | chat → future session | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | P2 — fully eligible v2.68 | cc-0010A delivered schema; cc-0010B delivered data. | PK → chat | Brief authoring when PK greenlights |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | Carry. | PK | Confirm via cc-0001 |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future session | DDL + tile |
| **Publisher latent config risk follow-up** | `[functions.publisher] verify_jwt = false` doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort cleanup** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation for rotation |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P3 (carry) | LOGGED | chat → future (passive) | — |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **24 unrelated historical escalated m.chatgpt_review rows** | Historical escalated review backlog | P3 (carry v2.75) | Untouched per CCH. Eligible for next-session sweep. | chat → next session | Single execute_sql query to enumerate + categorise, then batched UPDATEs |
| **Memory cap hygiene carry** | Memory at 30/30 cap; line-replacement strategy | **P1 NEW rank 3 v2.75** | ESCALATED v2.75: 0 memory edits this session; v2.75 state cannot land in memory without prune cadence decision. | PK → future | PK to direct pruning + insertion |
| **Parallel agent coordination observation** | L47 informational | P3 (carry) | No parallel-writer conflicts observed v2.75. | chat → future | Continue passive observation |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | — |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | — |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check |
| **Cowork output pipeline silence since 2026-05-06** | `docs/audit/health/` last commit was 2026-05-05 (06 cron did not push) | P2 (escalated from P3 v2.74 — V-C3 dependency; 10-day gap at v2.75) | OPEN. v2.75 escalation continues. | PK → next session | PK investigates Cowork commit pipeline OR manually triggers `openclaw tui` to seed V-C3 verification |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates | chat → future session | ~15 min |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | Bulk approve UI in Phase 2 |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried (**28th deferral v2.75**) | chat → dedicated session post-cc-0014 verdict | Update PHASES + LAST_UPDATED after Day 19 |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural skip event OR synthetic test |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 call slugs whose folders are absent | P2 | LOGGED | PK → future session | Decide |
| **Music library activation checklist** | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | — |
| **Emergency redeploy governance question** | Expedited D-01 for bounded production-restoration? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules |
| **`f4a0dd85` bridge health-check `sql_read` row** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire failures | P3 (carry v2.68) | Retained per directives. PK forensic-accepted. | informational | — |
| **github MCP local server restart needed** | Write tools unresponsive on >30KB payloads | P3 (operational carry v2.68) | Recovered via Windows-MCP local git workflow v2.68. v2.72 confirmed: MCP `create_or_update_file` reliability degrades on >30KB payloads — pattern, not transient. v2.73 + v2.74 + v2.75: applied preventively (3 preventive applications). L58 candidate STRONG-promotion-eligible at v2.76. | PK | Continue per-file single commits OR local git for any >30KB writes |

**Closed v2.75:** Stage D (V-D4/V-D5 PASS via PK manual); Stage E backend (cc_0014_e_read_surface_and_triage migration + V-E1/V-E2 PASS); Stage E frontend (CCD commit 5753f41b + V-E3 PASS via PK manual); Stage E promotion (cc_0014_e_promote_event_to_case migration + V-P1..V-P8 PASS + 5 V-D5 orphans backfilled). cc-0014 itself remains open pending Stage E close + 14-day verdict.

**Closed v2.74:** (none — Stage C is a milestone within cc-0014.)
**Closed v2.73:** (none — Stage B is a milestone within cc-0014.)
**Closed v2.72:** (none — Stage A is a milestone within cc-0014.)
**Closed v2.71:** cc-0012 PRV v1 CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.70:** cc-0011 cadence-drift-checker CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.69:** cc-0010C reconciliation-matcher CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.68:** cc-0010B ice-evidence-materialiser CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.67:** cc-0010A v1.5 APPLIED + CLOSED.
*(Older closures truncated; see v2.71 archive.)*

---

## 💼 Personal businesses

**v2.75 carry (unchanged from v2.55–v2.74):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check status next session.

*(no other items flagged at v2.75 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.74.

---

## 📌 Backlog

**v2.75 changes:**

- **NEW v2.75**: cc-0014 Stage D CLOSED + Stage E APPLIED (backend + frontend + promotion). 3 migrations applied this session (Stage D's `cc_0014_d_manual_emit_function` was applied at v2.74 backend; v2.75 added Stage E `cc_0014_e_read_surface_and_triage` + Stage E `cc_0014_e_promote_event_to_case`). 3 CCD commits this session: relocation Task 1 `6711d5f4` (invegent-dashboard FAB), relocation Task 2 `86d2c2b9` (Invegent-content-engine revert of misplaced commits), Stage E frontend `5753f41b` (invegent-dashboard /operations route). 1 PK manual UI change: Supabase dashboard Settings → API → Exposed schemas extended to include `friction`. 1 PK manual env edit: `.env.local` added `DASHBOARD_FRICTION_FAB_ENABLED=true`.
- **STATE CHANGE v2.75**: Today/Next 5 reshuffled — rank 1 now "cc-0014 Stage E close + 14-day window start" (one INSERT remaining); V-C3 rank 2 carry; **memory edit cycle escalated to rank 3 NEW v2.75** (30/30 cap requires pruning before v2.75 state can land in user_memories); Brief v1.2 doc patch rank 4 carry with expanded scope; cc-0013 rank 5 deprioritised; close-the-loop rank 6.
- **L58 STRONG STRENGTHENED v2.75**: 3rd preventive application this session (3 single-file chat MCP commits per L58 strict — session file 14KB + sync_state ~49KB + action_list ~53KB; 3-file atomic at ~107KB combined declined as outside L58 comfort band; per-file at each size within MCP single-file write reliability profile). Cumulative L58: 1 originating reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **PROMOTION TO BASELINE RECOMMENDED AT v2.76** — 3 consecutive preventive applications within consistent cc-0014 context with zero failures.
- **L41 + L45 re-exercised v2.75**: 3 CCD commit HEAD-verifications via `list_recent_commits` (Task 1 + Task 2 + Stage E frontend); 4 baseline-eligible exercises now.
- **L44 re-exercised v2.75**: Stage E backend pre-flight + Stage E promotion pre-flight = 6 cycles total. Baseline-eligible.
- **L48 re-exercised v2.75**: 2 atomic migrations.
- **L55 reactive STRENGTHENED v2.75** (4 cycles: V-E2 UUID fixture caught at SQLSTATE 22P02).
- **L60 STRENGTHENED v2.75** (7th occurrence: V-E2 UUID `cc0014etest2` non-hex `t`). All 7 occurrences within cc-0014 lineage.
- **L63 + L64 + L65 NEW candidates v2.75** — 1 empirical occurrence each within cc-0014; promotion pending pattern repeat in independent brief.
- **0 D-01 fires this session** per brief §13. T-MCP-02 cumulative unchanged at 66. State-capture exceptions cumulative unchanged at 1. Pattern reinforced (v2.73 + v2.74 + v2.75 = three consecutive 0-D-01 stage-execution sessions).
- **Sync this session via 3 separate single-file chat MCP commits** per L58 strict (session file + sync_state + action_list). 3-of-4-way sync this session (docs + memory carries; dashboard PHASES intentionally deferred — 28th consecutive — per IOL hold-stance pending Day-19 verdict 2026-05-29).
- **ESCALATION v2.75**: Memory cap hygiene escalated from P3 carry to P1 rank 3 — 30/30 cap means v2.75 state cannot land in memory without pruning decision; affects next-session reliance on memory for Stage D APPLIED + Stage E APPLIED facts.
- **Brief v1.2 doc patch scope expanded v2.75**: 6 fixture defects (3 Stage A + 3 Stage B + 1 Stage E V-E2) + L60 + L63 + L64 + L65 framing.
- **PostgREST exposed_schemas now includes `friction`** (NEW v2.75 PK manual UI change). Required runtime sibling whenever a new schema needs supabase-js access path.
- **CARRIED v2.75**: Dashboard roadmap PHASES — **28th** consecutive deferral. All v2.74 carries unchanged otherwise.

**Pre-v2.75 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

L37–L65 framing carried + extended from v2.74. **v2.75 updates:**

- **L41 + L45 re-exercised v2.75**: 4 baseline-eligible exercises now.
- **L44 re-exercised v2.75**: 6 cycles total. Baseline-eligible.
- **L46**: not exercised v2.75 (0 D-01 fires). Pattern reinforced — three consecutive 0-D-01 stage-execution sessions.
- **L48 re-exercised v2.75**: 2 atomic migrations.
- **L52**: not exercised v2.75 (no EF deploys).
- **L53**: not exercised v2.75 (no FK fabrications). Promotion eligibility unchanged from v2.74 (4 cycles).
- **L55 STRENGTHENED v2.75**: reactive catch via V-E2 UUID fixture defect (4 cycles cumulative). Reactive pattern reinforced.
- **L57 candidate carry from v2.71**: not exercised v2.75.
- **L58 candidate STRONG STRENGTHENED v2.75**: 3 preventive applications now logged. Cumulative: 1 reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75). **PROMOTION TO BASELINE RECOMMENDED AT v2.76** — 3 consecutive preventive applications within consistent context with zero failures.
- **L59 candidate carry from v2.72**: not re-exercised v2.75.
- **L60 STRENGTHENED v2.75**: 7th occurrence (V-E2 UUID fixture). All 7 within cc-0014 lineage. Promotion still pending pattern repeat in independent brief.
- **L62**: not exercised v2.75 (0 D-01 fires).
- **L63 NEW candidate v2.75 — Brief implementation gap at sub-stage UI integration.** 1 empirical occurrence. Promotion pending pattern repeat.
- **L64 NEW candidate v2.75 — Repo-target verification before chaining CCD operations.** 1 empirical occurrence. Promotion pending pattern repeat.
- **L65 NEW candidate v2.75 — PostgREST exposed_schemas as runtime config dependency.** 1 empirical occurrence. Promotion pending pattern repeat.

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37 + L38 + L39 + L40 + L41 + L42 + L43 + L44 + L45 + L46 + L47 + L48 + L49 + L52 + L53 + L54 + L55 + L56 + L57 + L58 + L59 + L60 + L63 + L64 + L65 — plus standing baseline).

---

## v2.75 honest limitations

- All v2.31–v2.74 limitations apply.
- **Stage E close + 14-day window start NOT yet executed** — Stage E backend + frontend + promotion all applied + verified, but one INSERT into friction.experiment_run remains for next session. The 14-day clock has not yet started; Day-19 verdict date is not yet locked.
- **V-C3 PENDING live Cowork run** — Stage C is design-complete + production-installed but the count-and-value reconciliation between markdown finding_ids and friction.event rows has not yet been observed on a real run. Cowork output pipeline silence since 2026-05-06 (10-day gap as of v2.75 close).
- **L58 STRONG STRENGTHENED but not yet baseline-promoted**: 3 preventive applications this session pair (all Path C / per-file chat MCP per PK directive or per L58 strict). Promotion to baseline recommended at v2.76; all 3 occurrences within cc-0014 lineage — one more independent occurrence in non-cc-0014 context would be ideal but not strictly required given 3 consecutive zero-failure preventive applications.
- **L60 candidate still all within single brief** (cc-0014). 7 occurrences total. Promotion pending pattern repeat in cc-NNNN where NNNN ≠ 0014.
- **L63 + L64 + L65 NEW candidates each at 1 occurrence within cc-0014**. Promotion all pending pattern repeat in independent brief.
- **0 clean pass-through D-01s v2.75** — different operational shape from v2.68's 5-streak; v2.75 has 0 D-01 fires period (per brief §13 governance gate). Pattern shape v2.73 + v2.74 reinforced: stage-execution D-01 budget conserved when brief itself does not diverge.
- **5 prior outstanding m.chatgpt_review close-the-loop UPDATEs UNBLOCKED v2.61, still pending v2.75** — batch now **16 sessions overdue** + 2 from v2.72 (`903cfd8e` + `873985f7`).
- **24 unrelated historical escalated rows** untouched per CCH directive — eligible for next-session review.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION** still P3; geography drift still present.
- **Dashboard roadmap PHASES still stale** — **28th** consecutive deferral. Pending cc-0014 Day-19 verdict before update.
- **Memory cap 30/30 — escalated** to P1 rank 3 v2.75. v2.75 state changes (Stage D APPLIED, Stage E APPLIED, promotion trigger live, /operations route live, PostgREST exposed_schemas with friction, 14-day window pending) cannot land in user_memories without pruning decision.
- **Action_list file size**: estimated ~53KB at v2.75 close (up from ~50KB at v2.74 close; target was 10KB — historically over since v2.30s). Sync_state estimated ~49KB at v2.75 close (target 16KB).
- **Per-session files written v2.75**: 1 — `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` (new).
- **Result file written v2.75**: N/A (cc-0014 not yet closed; result file is at Day 19 verdict).
- **Doc-sync this session**: 3 separate single-file chat MCP commits (session file + sync_state + action_list) per L58 strict. Dashboard PHASES NOT updated this session — 28th consecutive deferral, intentional per IOL hold-stance.
- **Close-the-loop UPDATEs on m.chatgpt_review v2.75**: 0 this session. 5 prior + 2 v2.72 + 24 historical = 31 eligible for batch sweep at next session.
- **State-capture exceptions v2.75: 0** (no D-01 fires this session). Cumulative since v2.72: 1.
- **Cowork output pipeline silence is P2 OPEN** — continues from v2.74 escalation; V-C3 verification depends on it.
- **Brief v1.2 doc patch scope expanded v2.75 at 7 defects + L60 + L63 + L64 + L65 framing**: 1 new fixture defect this session (V-E2 UUID) + 3 new L-candidates.
- **CCD repo-target mistake recovery**: 2 commits in content-engine `dashboard/` cc-0013 sandbox subdirectory (`fe7bf346` + `ca935d4e`) are still in git history (no longer at tip after revert `86d2c2b9`). Forward-only revert per directive. cc-0013 sandbox itself remains in place pending Day-19 verdict.

---

## Changelog

- v1.0–v2.74: per commit history + sync_state archive.
- **v2.75 (2026-05-15 Sydney, cc-0014 STAGE D CLOSED + STAGE E APPLIED — backend + frontend + promotion; 14-day experiment window still NOT yet started — one INSERT remaining):**
  - **Build arc**: FAB relocation directive v1 → v2 amendment (kebab-case + Option K2 + Option E2 + only-new-env-var) → CCD 2-task execution (Task 1 `6711d5f4` invegent-dashboard, Task 2 `86d2c2b9` Invegent-content-engine revert) → PostgREST exposed_schemas fix via PK manual UI → V-D4/V-D5 PASS via PK manual → Stage E backend pre-flight + apply_migration `cc_0014_e_read_surface_and_triage` (first timeout 4-min, verified non-commit + retry) → V-E1 + V-E2 PASS (V-E2 UUID fixture caught at SQLSTATE 22P02, fixed) → Stage E frontend CCD directive → commit `5753f41b` → V-E3 PASS via PK manual + SQL probe → brief gap discovery (cc-0014 §7 "7-day case lookup" never built) → PK directive G1 with dedupe_fingerprint identity correction → apply_migration `cc_0014_e_promote_event_to_case` → V-P1..V-P8 PASS → 5 V-D5 orphan backfill → 3-commit sync drafting (session file + sync_state + action_list).
  - **Stage D + E V-check pattern**: V-D4/V-D5 PASS via PK manual (5 routes, 5-10s submissions); V-E1/V-E2 + supplementary PASS via SQL; V-E3 PASS via PK manual screenshots + SQL probe verification; V-P1..V-P8 PASS via SQL trigger tests + backfill. V-E4 + V-E5 deferred to next session (cleanup + experiment_run INSERT).
  - **D-01 fires (0)**: brief §13 governance gate honored — Stage D execution matched brief §9, Stage E backend matched brief §10, promotion trigger non-divergent per brief §7 "7-day case lookup" reference (chat surfaced gap, PK directed G1 dedupe_fingerprint identity, implementation completes brief intent rather than adding new scope). T-MCP-02 cumulative unchanged at 66. State-capture exceptions cumulative unchanged at 1.
  - **L-series outcomes**: L41 + L45 re-exercised (3 CCD commit HEAD-verifications). L44 re-exercised (Stage E backend + promotion pre-flights = 6 cycles). L48 re-exercised (2 atomic migrations). L55 reactive cycle 4 (V-E2 UUID fixture defect). L60 occurrence 7 (V-E2 UUID fixture). L58 strengthened to 3rd preventive application (promotion to baseline recommended at v2.76). 3 NEW L-candidates: L63 (brief implementation gap), L64 (repo-target verification), L65 (PostgREST exposed_schemas runtime config).
  - **Pattern firsts (4)**: (1) first cc-NNNN where a brief implementation gap was discovered post-stage-deploy and resolved via brief-completing sub-task (Stage E promotion trigger as G1); (2) first session with 3 separate single-file chat MCP commits for doc sync (per L58 strict on 3-file ~107KB combined payload); (3) first cc-NNNN with 3 successive stages executing with 0 D-01 fires under brief §13 governance gate (Stage B v2.73 + Stage C v2.74 + Stage D + Stage E v2.75); (4) first session where chat-side caught CCD's wrong-repo commit via independent target-repo HEAD verification.
  - **Today/Next 5 rebuild**: rank 1 = cc-0014 Stage E close + 14-day window start (one INSERT remaining); rank 2 = V-C3 live Cowork verification (carry); rank 3 = NEW memory edit cycle (30/30 cap escalation); rank 4 = Brief v1.2 doc patch (scope expanded with L63+L64+L65); rank 5 = cc-0013 deprioritised; rank 6 = close-the-loop batch (31 eligible).
  - **Active rows updated v2.75**: Stage D row updated to "CLOSED v2.75"; Stage E backend + frontend + promotion rows all CLOSED v2.75; new "Stage E close" row at top of Active table as P1 rank 1. Memory cap hygiene escalated from P3 carry to P1 rank 3. PostgREST exposed_schemas note added.
  - **STATUS BLOCK v2.75**: "🟢 cc-0014 friction register experiment — STATUS BLOCK (UPDATED v2.75)" with Stage D + Stage E V-check evidence tables + cumulative 8-function list + 4-trigger-on-friction list + PostgREST exposed_schemas note + 4-screenshot V-E3 evidence summary.
  - **Closure budget**: ~10h v2.75 cycle (Stage D close arc + Stage E backend + frontend CCD cycle + brief gap discovery + Stage E promotion trigger + V-checks + backfill + V-E3 + 3-commit sync drafting). Trailing-14-day cumulative ~108h above 8.0h floor.
  - **Doc-sync this session**: 3 separate single-file chat MCP commits (session file + sync_state + action_list) per L58 strict; 0 memory edits (30/30 cap; escalated to P1 rank 3); dashboard PHASES NOT updated (28th consecutive deferral, intentional per IOL hold-stance).
  - **Production mutations this session**: 2 apply_migration (cc_0014_e_read_surface_and_triage + cc_0014_e_promote_event_to_case); ~22 execute_sql calls for V-checks + backfill DO block + state probes (all test data cleaned); 0 EF deploys; 0 cron mutations; 0 vault writes; 0 ask_chatgpt_review D-01 fires; 3 chat MCP GitHub commits (session file + sync_state + action_list as 3 separate single-file commits per L58 strict); 3 CCD local-git GitHub commits (relocation Task 1 + Task 2 + Stage E frontend); 1 PK manual UI change (Supabase dashboard exposed_schemas); 1 PK manual env edit (.env.local DASHBOARD_FRICTION_FAB_ENABLED=true); 0 memory edits.
  - **T-MCP-02 cum**: 66 (unchanged from v2.72). State-capture exceptions cumulative: 1 (unchanged from v2.72). L46 baseline: not exercised this session.
