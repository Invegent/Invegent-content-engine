# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-06 Sydney morning session-end (v2.41 — **F-EF-DRIFT-PREVENTION Stage 1 APPLIED. Backend foundation live: `m.ef_drift_log` (19 cols, 5 CHECK constraints, 5 indexes), `m.vw_ef_drift_current` view, `public.write_ef_drift_log(jsonb)` SECURITY DEFINER batch writer. Schema implements PK-directed clearer first-run semantics: `is_first_observation` boolean + NULL-tri-state `state_changed` (NULL on first obs; class-or-hash diff on later) + CHECK constraint enforcing consistency. 3 D-01 fires: Fire 1 escalated on real ambiguity (PK rejected Lesson #62 override → revise); Fire 2 + Fire 3 cleared. Live test verified 4 semantic cases. Stage 2a (drift-check EF + 90-day retention pg_cron) is top P1 next session. M6 Phase A + F-YT-NY-FORMAT-SELECTION remain BLOCKED behind build close + P1 SECURITY-DEFINER triage.**). Closure budget: ~2.5h this session, day total ~2.5h, trailing-14-day ~30h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.41 application**: 3 D-01 fires this session (T-MCP-02 34 → 37). Fire 1 escalated, PK rejected Lesson #62 override → revise. Fire 2 + Fire 3 cleared.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Build is staged. Stage 1 closed v2.41. Stage 2a + 2b + 3 remain. Until Stage 2a is live AND the 4 P1 triage cases are addressed (3 SECURITY-DEFINER syncs + insights-worker manual review), no further EF patching is safe — this includes M6 Phase A and F-YT-NY-FORMAT-SELECTION, both of which are explicitly BLOCKED.

**NEW STANDING RULE refinement (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, the default is NOT automatic state-capture override. If the underlying ambiguity is real (multiple defensible design answers), Claude should propose revision first. State-capture override is reserved for cases where the reviewer's pushback genuinely is generic and the verified_claims body has cleared the substantive concerns.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~9 (T05 P1-urgent + F-EF-DRIFT-PREVENTION Stage 2a/2b/3 build pending + 3 P1 SECURITY-DEFINER triage + insights-worker P1 + F-YT-NY-FORMAT-SELECTION blocked + M6 Phase A blocked + 3 cluster diagnoses still active + 6 May health check follow-up) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~30h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~2.5h** (Stage 1 design + 3 D-01 fires + 2 migrations applied + live test + 4-way sync).

**Day total (6 May): ~2.5h** (single session today).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-06 Sydney morning session-end (v2.41).
> **This session: F-EF-DRIFT-PREVENTION Stage 1 APPLIED + 4-way sync.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **F-EF-DRIFT-PREVENTION Stage 2a — drift-check EF + retention pg_cron** | **P1 (TOP next session)** | Stage 1 backend foundation live as of 6 May. The drift-check EF is what produces actual rows in `m.ef_drift_log`; without it the table stays empty and the dashboard panel has nothing to render. ~2.25h estimated. | Compose CC-stage brief for the EF (slug `drift-check`). Apply 90-day retention pg_cron via Supabase MCP per D170. Deploy drift-check EF via Windows CLI from `C:\Users\parve\Invegent-content-engine`. First scheduled fire 03:00 AEST after deploy. Manual trigger to verify writes 46 rows to `m.ef_drift_log`. |
| 3 | **F-EF-DRIFT-PREVENTION Stage 2b — dashboard drift panel** | **P1** | Reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Surfaces drift to PK at low friction. ~1-2h. View shape may be revisited here once dashboard requirements are concrete. | After Stage 2a fires successfully and table has data: design panel; lists by class bucket, P1 SECURITY-DEFINER list highlighted, B-FD informational, state_changed=true badge, repo-only directories listed separately. |
| 4 | **F-EF-DRIFT-PREVENTION Stage 3 — `scripts/safe-deploy.sh`** | **P1** | Wraps `npx supabase functions deploy <slug>`. Pre-deploy `git status` clean check + local-matches-`origin/main` check. Warns but does NOT refuse. ~30min. | Author script; commit; PK adopts on next manual deploy. Habit-builder. |
| 5 | **P1 SECURITY-DEFINER regression-risk triage** | **P1** | Three cases (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) where repo redeploy = silent production bug. Best sequenced AFTER Stage 2b live so the sync commits show up green in the dashboard. | Sync repo → deployed via Windows CLI `npx supabase functions download` for each, commit as sync-only commits. Verify drift-check classifies each as Class A post-sync. |

**Demoted from prior Today/Next 5 in v2.40→v2.41 cycle:**

- **F-EF-DRIFT-PREVENTION build phase (Option F)** — split out: Stage 1 closed (this session). Stages 2a/2b/3 promoted as ranks 2-4.
- **insights-worker P1 functional drift** — still Active P1 but sequenced after rank 5 (P1 SECURITY-DEFINER triage); was rank 4 in v2.40.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.41 update)

**Brief:** `docs/briefs/2026-05-05-f-ef-drift-prevention.md` (status APPROVED)
**Parent:** RECONCILE-EF-DRIFT (CLOSED 2026-05-05 morning, commit `7ba441e2`)

### Stage 1 — Backend foundation: ✅ COMPLETE 2026-05-06

**Built:**
- `m.ef_drift_log` table — 19 cols + 5 CHECK constraints + 5 indexes (3 plain + 2 partial)
- `m.vw_ef_drift_current` view — latest-per-slug + derived `first_seen_in_class` + `last_resolved_at`
- `public.write_ef_drift_log(jsonb)` — SECURITY DEFINER batch writer
- GRANTs locked down: authenticated SELECT only on table + view; service_role only EXECUTE on writer fn

**Migrations applied:**
- `f_ef_drift_prevention_stage1_v2_drift_log_table` (D-01 `10635f1d-...`)
- `f_ef_drift_prevention_stage1_v2_fix_writer_fn_ambiguity` (D-01 `d2415cc4-...`)

**Schema highlights (per PK direction):**
- Renamed `class` → `current_class` for symmetry with `previous_class`
- Added `is_first_observation` boolean NOT NULL
- `state_changed` is NULL-tri-state: NULL on first observation, false when no diff, true when class-or-hash diff vs prior row (`IS DISTINCT FROM` for NULL-safe comparison on deployed_hash_normalised + repo_hash_normalised)
- CHECK constraint `ef_drift_log_first_obs_consistency` enforces invariants
- Hash-aware change detection covers within-class redeploys

**Live test verified all 4 semantic cases.** Test rows cleaned. Table + view empty until Stage 2a EF runs.

### Investigation phase: ✅ COMPLETE v2.40 (Tier 2 inventory locked at 46/46 EFs + 2 repo-only)

### Stage 2a — drift-check EF + retention cron: ⏳ PENDING (next session, top P1)

| # | Component | Detail | Effort |
|---|---|---|---|
| 1 | `drift-check` Edge Function | Daily 03:00 AEST pg_cron. Iterates 46 EFs via `Supabase:list_edge_functions`. For each: fetch deployed source via `get_edge_function`; fetch repo source from `supabase/functions/<slug>/index.ts` on `main`; CRLF-normalise both; compute body hashes; parse banner with permissive parser; classify A/A-LE/B-RR/B-FD/C/D; run targeted SECURITY-DEFINER regex detector; call `public.write_ef_drift_log()` once per run. Lists repo-only directories in returned summary. | ~2h |
| 2 | pg_cron 90-day retention sweep | Daily DELETE on `m.ef_drift_log WHERE checked_at < now() - interval '90 days'` | ~15min |

### Stage 2b — Dashboard drift panel: ⏳ PENDING

Reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Drift by class. P1 SECURITY-DEFINER list highlighted. B-FD informational. State_changed badge. Repo-only directories listed separately. ~1-2h.

### Stage 3 — `scripts/safe-deploy.sh`: ⏳ PENDING

Pre-deploy `git status` + `origin/main` check. Warns but does NOT refuse. Habit-builder. ~30min.

### Triage phase: ⏳ PENDING (after Stage 2b live, sequenced sensibly)

### 13 existing drift cases (priority buckets, action items) — UNCHANGED FROM v2.40

| Priority | Slug | Detail | Required action |
|---|---|---|---|
| **P1 SECURITY-DEFINER** | heygen-avatar-creator | Deployed v2.2.0 uses `save_avatar_generation()` SECURITY DEFINER fn; repo v2.0.0 uses broken `exec_sql` UPDATE on `c.brand_avatar`. **Repo redeploy = silent fail.** | Sync repo → deployed. Best after Stage 2b live. |
| **P1 SECURITY-DEFINER** | heygen-avatar-poller | Deployed v2.0.0 uses 4 SECURITY DEFINER fns + `api2.heygen.com/v2/avatar_group` endpoints; repo v1.0.0 uses broken `exec_sql` UPDATE + `api.heygen.com/v2/photo_avatar/train` endpoints. **Repo redeploy = silent fail + broken endpoints.** | Sync repo → deployed. |
| **P1 SECURITY-DEFINER** | draft-notifier | Deployed v1.1.0 uses `mark_drafts_notified()` SECURITY DEFINER fn; repo v1.0.0 uses broken `exec_sql` UPDATE on `m.post_draft`. **Repo redeploy = drafts never marked notified → every 30min cron sends duplicate review-emails.** | Sync repo → deployed. |
| **P1 functional drift** | insights-worker | Deployed v14.0.0 vs repo v1.6.0 — substantial functional drift. Per D-PREV-07, no auto-sync. | PK manually reviews deployed source for correctness; if canonical, sync; if not, manual repair. |
| **P2 feature drift** | series-writer | Deployed v1.3.0 reads `c.content_series.source_material` and `format_preference` (added 20 Mar 2026); repo v1.2.0 doesn't. | Sync repo → deployed. |
| **P2 forward-drift (PK decision)** | feed-discovery | Repo v1.2.0 ahead of deployed v1.1.0. Pending deploy state. | PK decides: deploy repo v1.2.0 OR leave deployed v1.1.0. |
| **P3 Class C polish-sync** | image-worker | Deployed minified, repo formatted; functionally equivalent. | **Skip per D-PREV-05** (no sync needed). |
| **P3 Class C polish-sync** | feed-intelligence | Repo has dead code removed; deployed still has it. | Sync repo → deployed (low priority). |
| **P3 Class C polish-sync** | onboarding-notifier | Deployed has comments stripped + 1 type annotation added (Studio inline-edit signature). | Sync repo → deployed (low priority). |
| **P3 Class C polish-sync** | ai-profile-bootstrap | Repo extracted slug as variable in `buildPrompt`. | Sync repo → deployed (low priority). |
| **P3 Class C polish-sync** | series-outline | **Affects content quality.** Deployed has carousel guidance + narrative-arc instruction in prompt; repo doesn't. | Sync repo → deployed (medium priority). |
| **P3 Class C polish-sync** | email-ingest | Deployed has section dividers + slightly different `console.warn` text. | Sync repo → deployed (very low priority). |
| **P3 Class C polish-sync** | compliance-reviewer | **Affects content quality.** Deployed has different system prompt and rules-scope label. | Sync repo → deployed (medium priority). |
| **P3 Class D** | ingest, pipeline-doctor, pipeline-ai-summary, compliance-monitor, video-analyser, heygen-intro, heygen-youtube-upload | Deployed but no repo file. | Per slug: commit deployed source to repo OR remove deployed EF. |
| **Repo-only triage** | ai-diagnostic | Repo v1.0.0; no deployed slug. | Investigate: deploy from repo OR remove dead repo file. |
| **Repo-only triage** | linkedin-publisher | Repo v1.2.0; deliberate forward-staging for B24/F06. | Leave alone. |

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.40 — all migrations applied + verifications PASS. M6-M8 still pending; M6 Phase A explicitly BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2a + 2b close + P1 triage per v2.41.

---

## 🔄 Standing session-start checks

Unchanged from v2.40 (S1–S29).

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31. **v2.41 status delta**: F-EF-DRIFT-PREVENTION Stage 1 closed; Stage 2a is top P1 next session.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 37 of 5)

**v2.41 application: 3 D-01 fires** (review IDs `2af1b03a-...`, `10635f1d-...`, `d2415cc4-...`).

- Fire 1 (`2af1b03a-...`): partial verdict, escalated. Two pushback points were echoes of self-disclosed weak evidence. Initial chat read: looked like Lesson #62 type-(c) consistency-bias. **PK explicit override: NOT Lesson #62 — real design ambiguity. Revise.**
- Fire 2 (`10635f1d-...`): agree, no pushback. Applied.
- Fire 3 (`d2415cc4-...`): agree, low risk. Applied.

**Lesson #62 boundary refined this session:** echoes of self-disclosed weak evidence by themselves do NOT classify as type-(c) consistency-bias. The substantive question is whether the underlying ambiguity is real (multiple defensible design answers) vs whether the reviewer is genuinely failing to recognise that Path B has cleared concerns. PK called this one correctly as design ambiguity. Future Claude default: propose revision first, escalate to PK for the call.

**Cumulative T-MCP-02 quota: 37 of 5.** Quota of 5 was a v2.5 floor; well exceeded. Cost still well under $0.50 cumulative.

---

## 🤖 Cowork automation (D182)

**v2.41 status delta:** **`docs/audit/health/2026-05-06.md` did not push at 02:00 AEST 6 May.** Cowork ICE Nightly Health Check is part of D182 standing automation (per memory). Cron either ran late, didn't fire, or pushed to wrong location. Logged as follow-up. To investigate next session if not back online.

Sunset review: 12 May 2026 (unchanged).

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.40 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **F-EF-DRIFT-PREVENTION Stage 2a** | drift-check EF + 90-day retention pg_cron | **P1 (top next session)** | PENDING | chat → next session | Compose CC-stage brief for EF; apply retention cron via Supabase MCP per D170; deploy EF via Windows CLI. ~2.25h. |
| **F-EF-DRIFT-PREVENTION Stage 2b** | Dashboard drift panel | P1 | PENDING (sequenced after Stage 2a) | chat → future session | Read `m.vw_ef_drift_current` + filtered drift queries; class buckets; P1 SECURITY-DEFINER highlighted. ~1-2h. |
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 | PENDING | chat → future session | Author wrapper; commit; habit-builder. ~30min. |
| **P1 SECURITY-DEFINER triage** | heygen-avatar-creator + heygen-avatar-poller + draft-notifier | P1 | Sequenced after Stage 2b live | PK + chat | `npx supabase functions download` from `C:\Users\parve\Invegent-content-engine` for each, commit as sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review first | PK | After Stage 2b live: PK reviews deployed source for correctness, then decides sync direction. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2b close + P1 triage** | chat → future session | After triage clears: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A — 108 historical Bug 3 dead-letter** (carry-forward) | Clean up `queued` rows with Bug 3 fingerprint | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2b close + P1 triage** | PK → chat → future session | After F-YT-NY-FORMAT-SELECTION clears: PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | PP×YT cluster cleared by F-YT-OAUTH-PP; NY×YT cluster blocked on F-YT-NY-FORMAT-SELECTION | chat → next session | Re-query S21 audit matrix. |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | NEW v2.41 | chat → next session if still absent | Investigate Cowork status; not derailing. |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete; §1 next | chat ↔ PK | PK signals start. |
| (others) | per v2.40 | — | — | — | per v2.40 |

**Closed v2.41:**

- **F-EF-DRIFT-PREVENTION Stage 1 — Backend foundation** ✅ — `m.ef_drift_log` + view + writer fn + indexes + grants live. 4 semantic cases verified by live test. Stage 2a top P1 next. Traceability: `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md`.

**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.
**Closed v2.39:** F-YT-OAUTH-PP for Property Pulse.
**Closed v2.38:** M5.

---

## 💼 Personal businesses

*(none flagged at 6 May session start — PK confirmed nothing live today; ICE proceeded)*

---

## 📌 Backlog

**v2.41 changes**:

- **NEW v2.41**: F-EF-DRIFT-PREVENTION Stages 2a, 2b, 3 (Active, all P1; Stage 2a top next session).
- **NEW v2.41**: `docs/audit/health/2026-05-06.md` follow-up (P3, watch-only).
- **NEW v2.41**: Lesson #62 boundary refinement — echoes of self-disclosed weak evidence ≠ automatic state-capture override; treat as design ambiguity unless reviewer's pushback is genuinely generic AND verified_claims body has cleared substantive concerns.
- **Closed v2.41**: F-EF-DRIFT-PREVENTION Stage 1 (backend foundation).

**v2.40 changes** (still active):

- 13 existing drift cases triaged into priority buckets.
- D-PREV-13/14/15/16 in brief decisions log.

**v2.39 changes** (still active):

- T-MCP-15 lesson candidate — code-search 0-hits ≠ feature missing.
- D-YT-OAUTH-1 standing rule.
- S29 standing check.

**v2.38 changes** (still active):

- T-MCP-13 + T-MCP-14 lesson candidates.

**v2.37 + v2.36 changes** (still active):

- M6-M8 sequenced (now blocked).
- 108 historical Bug 3 fingerprint queue rows retained.
- queue_id `ad573844` dead-lettered.
- 47 v4-origin queue rows mismatch slot intent.

**v2.35 changes** (still active):

- 3 stuck-item clusters from health check.
- ICE Dashboard Architecture Review.

**v2.34 changes** (still active):

- F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009 V3-V5 acid tests.

**v2.33 additions** (still active):

- F-AAP-NEEDS-REVIEW-BACKLOG (P2), B-TOKEN-HEALTH-EMPTY (P3), F-CFW-LI-DUP-SLOTS (P3).

**Carried from v2.31**: per v2.40.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.40 plus:

- **Lesson #62 boundary refinement (v2.41)**: Echoes of self-disclosed weak evidence by themselves do NOT classify as type-(c) consistency-bias. The substantive question is whether the underlying ambiguity is real. Surfaced and validated 2026-05-06 morning. Update Lesson #62 docs at promotion.
- **F-EF-DRIFT-PREVENTION investigation pattern v2.40 — candidate canonical**: still pending 1 reuse for promotion.
- **D-PREV-13 taxonomy split** (structural × directional axes) — still pending 1 reuse for promotion.

---

## v2.41 honest limitations

- All v2.31-v2.40 limitations apply.
- **F-EF-DRIFT-PREVENTION Stage 1 closed but Stages 2a/2b/3 NOT done.** The 13 drift cases identified in v2.40 remain unchanged in production until Stage 2b ships and triage runs. Most are benign; the 3 P1 SECURITY-DEFINER cases are the active risk — a redeploy of any of those repo files would silently break production. PK is aware; do not redeploy heygen-avatar-creator, heygen-avatar-poller, or draft-notifier from repo until sync'd.
- **`m.ef_drift_log` is empty until Stage 2a EF runs.** Table is live but unpopulated. View returns 0 rows. Both correct.
- **Stage 2a is the next critical step.** Without the drift-check EF firing, drift accumulation between sessions remains invisible. The recommendation is to ship Stage 2a before any other EF deploy work.
- **`ai-diagnostic` repo-only directory operational status remains unclear** (carry-over from v2.40).
- **12 close-the-loop UPDATEs still pending** (carry-over). v2.41 added 3 review_ids (`2af1b03a-...`, `10635f1d-...`, `d2415cc4-...`). Combine in next batch closure.
- **`docs/audit/health/2026-05-06.md` did not push.** Cowork ICE Nightly Health Check 02:00 AEST cron status unknown. Logged as follow-up; investigate next session only if still absent. Do not manually re-run Cowork without PK direction.
- **Closure budget remains well above floor** (~30h trailing-14-day). v2.41 added ~2.5h.

---

## Changelog

- v1.0–2.40: per previous changelog.
- **v2.41 (2026-05-06 Sydney morning session-end, F-EF-DRIFT-PREVENTION Stage 1 APPLIED):**
  - **F-EF-DRIFT-PREVENTION Stage 1 (backend foundation) CLOSED.** `m.ef_drift_log` table (19 cols, 5 CHECK constraints, 5 indexes) + `m.vw_ef_drift_current` view + `public.write_ef_drift_log(jsonb)` SECURITY DEFINER batch writer + GRANTs all live.
  - **3 D-01 fires this session** (T-MCP-02 34 → 37). Fire 1 escalated on real first-run `state_changed` ambiguity — PK explicitly rejected Lesson #62 state-capture override → revise. Fire 2 (revised v2 with `is_first_observation` boolean + NULL-tri-state `state_changed` + CHECK constraint enforcing consistency + hash-aware change detection) cleared agree, applied. Fire 3 (writer-fn ambiguity bug-fix via `#variable_conflict use_column` directive) cleared agree, applied.
  - **Live test verified all 4 semantic cases:** first observation → NULL state_changed; no diff → false; class diff → true; hash diff within same class → true.
  - **Lesson #62 boundary refined**: echoes of self-disclosed weak evidence by themselves do NOT classify as type-(c) consistency-bias if the underlying ambiguity is real. State-capture override is reserved for genuinely generic reviewer pushback that the verified_claims body has cleared.
  - **`docs/audit/health/2026-05-06.md` absent at session start** — Cowork 02:00 AEST cron 6 May didn't push. Logged as P3 follow-up; not derailing.
  - **Net P0+P1 open: 7 → 9** (F-EF-DRIFT-PREVENTION Stages 2a + 2b + 3 promoted to Active P1; Stage 1 closed; 6 May health check follow-up added P3). Within 20-finding cap.
  - **Closure budget**: +~2.5h Stage 1 design + 2 migrations + live test + 4-way sync. Day total ~2.5h. Trailing-14-day ~30h. Well above 8.0 floor.
  - **No EF deploys.** **M6 untouched.** **No DML beyond test inserts (cleaned up).**
  - **Stage 2a is top P1 next session** (drift-check EF + 90-day retention pg_cron, ~2.25h). Stage 2b + Stage 3 sequenced behind. P1 SECURITY-DEFINER triage remains deferred until Stage 2b live.
