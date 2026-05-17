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
| 2026-05-18 | cc-0014-archived-and-recon-daily | **cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + HOLD-STANCE LIFTED (v2.77).** Closed 11 days before Day-19 by PK reframing decision. Migration `cc_0014_close_archived` applied (status running→archived; criteria_snapshot preserved immutable). Migration `cc_0014_recon_daily_cadence` applied (cron 85 weekly→daily). **D-IOL-001 logged in decisions.md**: friction register reframed from experiment to standing infrastructure. **IOL hold-stance LIFTED**: cc-0015 + cc-0016 + publisher recovery sequence + dashboard PHASES all unblocked. Postmortem authored per brief §14. 2 D-01 fires (both type-(c) generic, PK approval stood per L62). 0 state-capture overrides this session. Cumulative T-MCP-02 = 69. Day-19 calendar item retired. | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | **cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PROD + cc-0015 + cc-0016 DRAFTED (v2.76).** Stage E close via migration `cc_0014_e_close_experiment_run_start`. Window opened 2026-05-15 06:20 UTC → 2026-05-29 06:20 UTC. FAB live via Vercel env var. Live FAB smoke test + triage end-to-end PASS. cc-0015 + cc-0016 briefs drafted PENDING_EXECUTION. Memory 30→19. 0 D-01 fires. L58 PROMOTED TO BASELINE. 6 NEW L-candidates a–f. **(Window closed early 2026-05-18 per v2.77 — see above.)** | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | **cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75).** Stage D fully closed via V-D1..V-D5 + Supp-1/2 PASS. Stage E backend + frontend + brief-completing promotion trigger APPLIED. V-E1/V-E2/V-E3 + V-P1..V-P8 PASS. 5 V-D5 observations backfilled into 5 cases. 0 D-01 fires. 3 NEW L-candidates v2.75 (L63 + L64 + L65). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | **cc-0014 Stage C APPLIED (v2.74).** Health-check dual-write emitter live. 5 of 6 V-checks PASS; V-C3 PENDING. Cowork brief v2.1 → v3.0. 0 D-01 fires. L58 strengthened (2nd preventive). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | **cc-0014 Stage B APPLIED (v2.73).** Reconciliation emitter trigger live on `r.cadence_drift_log`. 5 V-checks PASS. 0 D-01 fires. 3 brief V-B1 defects caught pre-execution. L60 NEW candidate. L58 first preventive. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | **cc-0014 Stage A APPLIED (v2.72).** friction.* schema deployed (5 tables + 2 v1.1-patch triggers + full grants matrix). 11 V-checks PASS. 8 review rounds. 2 D-01 fires. L58 + L59 NEW candidates. T-MCP-02 cum 66. State-capture exceptions: 1. | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |
| 2026-05-13 | cc-0012-closed-with-variance | cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71). PRV v1 delivered. | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70). cadence-drift-checker EF v2 ACTIVE; cron 85 installed. | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69). reconciliation-matcher EF v1 deployed; cron 84 installed. | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68). | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-18 Sydney — cc-0014 CLOSED-ARCHIVED + RECON DAILY + HOLD-STANCE LIFTED (v2.77)

**Outcome:** cc-0014 closed at Day 4 of 14-day window by PK reframing decision. status=archived (brief's neutral terminal state). Reconciliation cron promoted weekly → daily. D-IOL-001 logged. Friction register transitions from experiment to standing operational infrastructure. IOL hold-stance lifted across the board.

**Build arc (4 phases):**

**Phase 1 — Reframing.** Yesterday evening (2026-05-17) PK observed that 12 more window days would not yield evaluable verdict signal. Manual FAB proven at Day 3 (3/3 events). Reconciliation under-frequenced (weekly cadence → ≤2 fires possible in window). Health_check zero signal due to upstream Cowork blocker. Reframing emerged: register is operational spine, not experiment. Manual proven. Recon and health_check identified as needing diagnostic follow-up, not experimental failures.

**Phase 2 — D-01 cycle on close framing.** Initial close proposal as status=passed; D-01 `3ff74643` returned 4 type-(b) genuine pushbacks correctly identifying overclaim. PK accepted pushback; revised plan to status=archived. Subsequent D-01 `6a90cacf` on revised plan returned partial / 3 type-(c) generic objections (echoes of self-disclosed open questions). PK explicit approval per L62 stood. Migration `cc_0014_close_archived` applied single-shot. Post-state verified: status=archived, notes=2001 chars, criteria_snapshot preserved immutable (939 chars).

**Phase 3 — Recon cadence change.** D-01 `94bd6835` on recon daily cadence returned partial / 1 type-(c) generic objection. PK explicit approval stood. First attempt with rename failed permission denied on `cron.job` UPDATE; second attempt schedule-only succeeded. Post-verify: cron 85 schedule `30 17 * * *` daily, jobname stays cosmetic `cadence_drift_checker_weekly`. First daily fire 2026-05-19 03:30 AEST.

**Phase 4 — Docs sync.** 5 files atomic push (postmortem + session note + decisions D-IOL-001 + sync_state v2.77 + action_list v2.77). Dashboard PHASES NOT updated in this commit — deferred to dashboard session (30th deferral now structural).

**D-01 fires this session: 2** (both type-(c) generic, PK approval stood). Cumulative T-MCP-02 = 69 (66 prior + 1 yesterday's `3ff74643` + 2 today's). State-capture exceptions unchanged at cumulative 1 (no override consumed — PK explicit approval on type-(c) objections is not the same as a state-capture override on a type-(b) genuine pushback).

**Production mutations:** 2 apply_migration; ~5 execute_sql; 1 cron mutation (cron.alter_job on 85); 1 GitHub atomic push (5 files); 0 EF deploys; 0 vault writes.

**Production state at v2.77 close:**
- friction.experiment_run: 1 row, **status=archived**, brief_id=cc-0014, notes=verbatim reframing rationale, criteria_snapshot immutable
- friction.event: 6 rows (no change). friction.case: 6 rows (no change).
- 3 DELETE-protection / immutability triggers now dormant (no run is `running`)
- 1 always-active promotion BEFORE INSERT trigger continues to operate
- cron 85: schedule daily `30 17 * * *` (was weekly). All other crons (82, 83, 84, 86) unchanged.
- FAB live on dashboard.invegent.com (unchanged)
- /operations route live (unchanged)
- IOL hold-stance: **LIFTED**

**Items unblocked by D-IOL-001:**
- cc-0015 friction-pool-view brief — now P2 actionable (was P3 blocked)
- cc-0016 friction-capture-evidence brief — same; parallel-executable
- Music library activation — now P2 actionable
- IG cron 53 re-enable — same
- YT publisher diagnostic — same
- Dashboard PHASES sync — now eligible for next dashboard session (30 deferrals)
- Brief authoring (Platform Reconciliation View etc.) — no longer self-paused

**Lesson outcomes:** L62 re-exercised twice (3+ exercises cumulative, baseline-eligible). L41 + L45 re-exercised (post-mutation verification). L58 baseline applied (atomic 5-file push). No new L-candidates this session.

---

## 🟡 Next session priorities (rebuilt v2.77)

1. **Reconciliation diagnostic** — first daily fire 2026-05-19 03:30 AEST. Read-only count comparison: `r.cadence_drift_log` rows post-fire vs `friction.event` source='reconciliation' rows. Determine if daily detects drift weekly missed.
2. **Health_check V-C3** — still PENDING. Next Cowork fire post-`9215de77` produces test material. Read markdown + run-state vs friction.event rows source=health_check.
3. **Music library activation** — PK action: create `post-music` bucket, upload 9 tracks at `post-music/{news,upbeat,calm}/track-{1,2,3}.mp3`, set `VIDEO_WORKER_MUSIC_ENABLED=true`. Code already wired in video-worker v3.0.0.
4. **IG cron 53 re-enable** — verify throttles in `c.client_publish_profile`, dry-run smoke test, re-enable cron.
5. **YT publisher diagnostic** — audit `m.post_draft` by recommended_format + video_status; determine if avatar videos reach `generated`; decide on filter expansion or upstream chain investigation.
6. **cc-0015 friction-pool-view execution** — Stage A schema additions; D-01 fire per brief §13. 7 stages, 12-15h over ~3 sessions.
7. **cc-0016 friction-capture-evidence execution** — parallel with cc-0015; D-01 fire per brief §13. 5 stages, 8-10h over ~2 sessions.
8. **Personal businesses check-in** — standing P0. Crazy Domains refund + clean-up follow-up.

Carries (lower priority):
- 22 escalated m.chatgpt_review rows — gated on PK directive lifting CCH standing rule
- Dashboard PHASES sync — 30 deferrals; next dashboard session
- Brief v1.2 doc patch (combined defects + L60 + L63–L65 + L-v2.76 a–f framing)
- Platform Reconciliation View brief authoring
- v1.1 cc-0012 / v1.6 cc-0010A / v1.3 cc-0011 minor doc patches
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN)
- Publisher latent config risk follow-up
- M8b separate brief authoring
- 94-row un-publishable legacy draft cohort
- Memory cap hygiene (19/30; 11 free slots)
- Localhost FAB cleanup (`.env.local` flag still on)

---

## ⛔ Carried-forward "do not touch" state

**v2.77 update on standing items:**

- **cc-0014 CLOSED-ARCHIVED v2.77.** Postmortem at `docs/postmortems/cc-0014-closing-note.md`. Brief frozen at v1.1 commit `34305092f4`. D-IOL-001 supersedes the cc-0014 experimental framing. Day-19 verdict and mid-window check-in calendar items retired.
- **cc-0015 friction-pool-view**: AUTHORED PENDING_EXECUTION (commit `9a5dc155`). Now unblocked per D-IOL-001.
- **cc-0016 friction-capture-evidence**: AUTHORED PENDING_EXECUTION (commit `f35f8ea4`). Now unblocked per D-IOL-001. Parallel-executable.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **friction.* schema unchanged.** 5 tables, 8 functions, 4 triggers, 1 active trigger on r.cadence_drift_log.
- **PostgREST exposed_schemas continues to include `friction`** (carry).
- **cron 85 schedule: daily** (was weekly). All other crons in friction lineage (82, 83, 84, 86) unchanged.
- **L58 PROMOTED TO BASELINE v2.76.** Per-file or atomic-push strategy depending on coordination needs.
- **L62 baseline-eligible v2.77.** 3+ exercises cumulative.
- **Other L-series**: L41 + L45 re-exercised. L44 baseline-eligible. No new candidates.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.77; promotion still pending pattern repeat.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **cc-0012 PRV v1: CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.
- **cc-0011 cadence-drift-checker: CLOSED-WITH-VERIFIED-VARIANCE v2.70.**
- **cc-0010C reconciliation-matcher: CLOSED-WITH-VERIFIED-VARIANCE v2.69.**
- **cc-0010B ice-evidence-materialiser: CLOSED-WITH-VERIFIED-VARIANCE v2.68.**
- **cc-0010A r.* DDL Foundation: APPLIED + CLOSED v2.67.**
- **2 close-the-loop carries v2.72**: RESOLVED 2026-05-17.
- **4 cc-NNNN family carries**: RESOLVED 2026-05-17.
- **22 escalated m.chatgpt_review rows remain** as of 2026-05-17 (21 historical CCH-locked + 1 T-MCP-05 meta). Not to be closed without explicit PK directive.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN.
- **L34 trigger filter audit**: P3 carry.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives.
- **T-MCP-02 quota: 69 cumulative v2.77**.
- **State-capture exceptions cumulative: 1**.
- Cron 82-86 firing normally (cron 85 now daily).
- **Dashboard roadmap PHASES** — 30 consecutive deferrals. **NOW UNBLOCKED** per D-IOL-001; eligible for next dashboard session.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- **Cowork output pipeline**: V-C3 still PENDING live run. Commit `9215de77` reset brief to v3.0 `status: ready`. Diagnostic now part of standing infrastructure follow-up (not blocking).
- **Production FAB live on dashboard.invegent.com**: unchanged from v2.76.
- **Localhost FAB cleanup pending**: `.env.local` still has flag enabled. Carry P3.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` written. This sync_state + action_list updated. **No cc-0014 result file** (postmortem at `docs/postmortems/cc-0014-closing-note.md` satisfies the closure-doc commitment). All 5 sync files via chat MCP atomic push per L58 (single commit for coordinated state change). 3-of-4-way sync this session (docs + decisions updated; dashboard PHASES 30th consecutive deferral — now unblocked for next dashboard session).

**This file size**: ~40KB after this update (v2.77 current + v2.76 previous inlined per G1 "1-2 sessions inlined" rule; v2.75 + earlier retained as pointer rows in session index table only).

---

*Last updated: 2026-05-18 Sydney — v2.77: cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + IOL HOLD-STANCE LIFTED. D-IOL-001 logged: friction register reframed from experiment to standing infrastructure. Migration `cc_0014_close_archived` applied (status running→archived; criteria_snapshot preserved immutable). Migration `cc_0014_recon_daily_cadence` applied (cron 85 weekly→daily). Postmortem at `docs/postmortems/cc-0014-closing-note.md`. 2 D-01 fires (both type-(c), PK approval stood per L62). 0 state-capture overrides. Cumulative T-MCP-02 = 69. Day-19 calendar item retired. cc-0015 + cc-0016 + publisher recovery + dashboard PHASES all unblocked. Previous (v2.76): cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN (window now closed early).*
