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
| 2026-05-18 | v2.78-friction-register-consolidation-planning | **FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED (v2.78).** Planning-only session. Zero production mutations. 4-layer architecture locked. 32 decisions governing execution. 3 independent LLM reviews → 10 of 11 findings incorporated → 2 acknowledged v2 scope → 0 rejected. Wave 0 split to 0a/0b/0c. Telegram re-sequenced Wave 6→2. Empirical inventory: **26 active diagnostic crons** (was 20 in initial census), **11 distinct output tables**, **22 friction.event rows** with **dedupe NOT working** (max events/case = 1). cc-0015 + cc-0016 demoted from "next-up parallel" to Waves 7-8. cc-0017a (Wave 0a) ready for authoring on PK explicit approval. **0 D-01 fires. No new L-candidates** (1 watcher candidate L-v2.78-a logged at 1 occurrence). | `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` |
| 2026-05-18 | cc-0014-archived-and-recon-daily | **cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + HOLD-STANCE LIFTED (v2.77).** Closed 11 days before Day-19 by PK reframing decision. D-IOL-001 logged: friction register reframed from experiment to standing infrastructure. cc-0015 + cc-0016 + publisher recovery + dashboard PHASES all unblocked. 2 D-01 fires (type-(c) PK approval per L62). Cumulative T-MCP-02 = 69. Day-19 calendar item retired. | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | **cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PROD + cc-0015 + cc-0016 DRAFTED (v2.76).** Stage E close via migration `cc_0014_e_close_experiment_run_start`. Window opened 2026-05-15 06:20 UTC → 2026-05-29 06:20 UTC. FAB live via Vercel env var. cc-0015 + cc-0016 briefs drafted PENDING_EXECUTION. Memory 30→19. 0 D-01 fires. L58 PROMOTED TO BASELINE. **(Window closed early 2026-05-18 per v2.77 — see above.)** | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | **cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75).** Stage D fully closed via V-D1..V-D5 + Supp-1/2 PASS. Stage E backend + frontend + brief-completing promotion trigger APPLIED. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | **cc-0014 Stage C APPLIED (v2.74).** Health-check dual-write emitter live. 5 of 6 V-checks PASS; V-C3 PENDING. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | **cc-0014 Stage B APPLIED (v2.73).** Reconciliation emitter trigger live on `r.cadence_drift_log`. 5 V-checks PASS. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | **cc-0014 Stage A APPLIED (v2.72).** friction.* schema deployed. 11 V-checks PASS. | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |
| 2026-05-13 | cc-0012-closed-with-variance | cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71). PRV v1 delivered. | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70). cadence-drift-checker EF v2 ACTIVE; cron 85 installed. | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69). | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68). | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-18 Sydney evening — FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED (v2.78)

**Outcome:** Planning-only session. Zero production mutations. Two committed planning documents (v1 plan + amendments after 3 independent LLM reviews). 32 decisions governing execution. cc-0017a (Wave 0a) ready for authoring on PK explicit approval. cc-0015 + cc-0016 demoted from "next-up parallel" to Waves 7-8 in revised sequencing.

**Build arc (5 phases):**

**Phase 1 — Scope agreement.** PK directed session focus: make friction register fully operational. Read cc-0015 + cc-0016 current drafts to ground discussion empirically.

**Phase 2 — Estate inventory.** Live census against Supabase. Initial census surfaced 20 diagnostic-adjacent crons; ChatGPT review corrected to **26 actual crons** (missed 6: pipeline-fixer + pipeline-healer + incident-auto-resolver + pipeline-ai-summary + 2 signal-pool maintenance). 11 distinct output tables. **Empirical critical finding**: 444 dead items + 116 past-due + 141 fixer escalations + 10 pending compliance + 6 unacknowledged slot_alerts + 7 open m.pipeline_incident — all sitting in invisible log tables today. **pipeline-doctor genuinely auto-fixing** (350 fixes/week, mostly image-worker nudge) — cannot retire casually.

**Phase 3 — Architectural model.** Converged across 3 ChatGPT exchange rounds on 4-layer architecture: telemetry → detectors → friction.event (facts) → friction.case (decisions) → operator action. Foundational principle: "Events are facts. Cases are decisions." 5 emission credibility requirements adopted.

**Phase 4 — Pressure-testing decisions.** Going through each locked decision deliberately trying to break it. **Critical empirical finding from schema check**: current dedupe is NOT working — 22 events / 22 cases / max-events-per-case = 1 / avg = 1.00. The `fn_promote_event_to_case` trigger creates a new case per event, not attaching to open cases sharing `dedupe_fingerprint`. Surfaced 2 additional decisions (#23 fix dedupe + #24 source registry FK) and 1 derived (#25 case closure semantics). 25 decisions locked total.

**Phase 5 — v1 doc + 3 reviews + amendments.** Wrote v1 planning doc (commit `afc9306`, 28KB, includes ASCII architecture visual). 3 independent LLM reviewers reviewed against the 8 review questions embedded in §14. Wrote amendments doc (commit `9c90687`, 15.6KB) capturing 7 amendments + Telegram re-sequencing + naming consistency fix.

**Reviewer convergence pattern** (high-signal):
- **All 3 reviewers said:** Split Wave 0, dedupe key inconsistencies, triage time metric not measurable
- **2 of 3 said:** Telegram should land earlier, sentinel overlap needs time + count, case lifecycle needs richer state
- **1 of 3 each:** severity dynamic override, direct-write enforcement, cross-source dedupe v2 (acknowledged not blocker)

Result: 10 of 11 findings incorporated, 2 acknowledged as v2 scope, 0 rejected.

**D-01 fires this session: 0.** Planning is pre-execution.

**Production mutations: 0.** Two read-only `Supabase:execute_sql` inventories. Three `Invegent GitHub:create_or_update_file` commits (planning doc + amendments + session note).

**Production state at v2.78 close (unchanged from v2.77 except friction.event grew):**
- friction.experiment_run: status=archived (cc-0014), unchanged
- **friction.event: 22 rows** (was 6 at v2.77 close — grew via daily reconciliation cron 85 fire 2026-05-17 17:30 UTC: 16 new events from one cron run, all unique fingerprints because dedupe-to-existing-case not yet working)
- friction.case: 22 rows (one case per event — confirmed dedupe gap empirically)
- IOL hold-stance: still lifted
- cron 85: daily, unchanged
- All other crons unchanged
- No new schema; no new migrations; no EF deploys

**Items unblocked by v2.78:** cc-0017a authoring (the new Wave 0a).

**Items deferred by re-sequencing:**
- cc-0015 friction-pool-view: "next-up parallel" → Wave 7 (after empirical volume data)
- cc-0016 friction-capture-evidence: "next-up parallel" → Wave 8

**Items elevated by re-sequencing:**
- Telegram migration: Wave 6 → Wave 2 (avoid 5-wave operator alert black hole)
- Compliance reviewer fix: Wave 1 (highest business risk)

**Lesson outcomes:** No new L-candidates (planning-only session). L-v2.78-a watcher candidate logged at 1 occurrence (reviewer convergence pattern is high signal). L41 + L62 referenced but not newly exercised.

---

## 🟡 Next session priorities (rebuilt v2.78)

1. **PK explicit approval of v1 plan + amendments** — the only remaining execution gate. Sign-off line in amendments §9 is empty. Once approved, cc-0017a authoring begins.
2. **cc-0017a Wave 0a authoring** — foundational schema (source registry + emission_rule + history + notification_policy + 7 new case columns). D-01 fire required. ~3-4h authoring session, additional session for execution.
3. **Reconciliation daily cadence diagnostic** — P1 carry from v2.77. First daily fire 2026-05-19 03:30 AEST. Post-fire SQL count comparison of `r.cadence_drift_log` rows vs `friction.event` source='reconciliation' rows. **Material exists**: the recent cron 85 fire emitted 16 new friction events (visible in friction.event since v2.77 close).
4. **Health_check V-C3 diagnostic** — P1 carry. Awaiting next Cowork fire post-`9215de77`.
5. **Music library activation** — P2 carry (PK action: create bucket, upload tracks, set env var).
6. **Personal businesses check-in** — standing P0. Crazy Domains refund + clean-up follow-up.

Carries (lower priority):
- 25 close-the-loop UPDATEs (22 historical CCH-locked + 3 v2.77 new)
- Dashboard PHASES sync — 31st consecutive deferral
- Brief v1.2 doc patch (combined defects + L60 + L63–L65 + L-v2.76 a–f framing)
- v1.1 cc-0012 / v1.6 cc-0010A / v1.3 cc-0011 minor doc patches
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN)
- Memory cap hygiene (19/30; 11 free slots)
- Localhost FAB cleanup
- IG cron 53 re-enable
- YT publisher diagnostic
- Platform Reconciliation View brief authoring
- M8b separate brief authoring

---

## ⛔ Carried-forward "do not touch" state

**v2.78 update on standing items:**

- **Friction Register Consolidation Plan v1 + amendments LOCKED.** Two committed planning documents at `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) + `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (commit `9c90687`). 32 decisions governing execution. cc-0017a (Wave 0a) ready for authoring on PK explicit approval. Do not begin execution without that gate.
- **cc-0014 CLOSED-ARCHIVED v2.77.** Postmortem at `docs/postmortems/cc-0014-closing-note.md`. Brief frozen at v1.1 commit `34305092f4`. D-IOL-001 supersedes the cc-0014 experimental framing. Day-19 verdict and mid-window check-in calendar items retired.
- **cc-0015 friction-pool-view**: AUTHORED PENDING_EXECUTION (commit `9a5dc155`). **Re-sequenced as Wave 7 in v2.78 plan** (was "next-up parallel" v2.77). Stages B–F deferred until 1 week of empirical volume from Waves 1-6.
- **cc-0016 friction-capture-evidence**: AUTHORED PENDING_EXECUTION (commit `f35f8ea4`). **Re-sequenced as Wave 8 in v2.78 plan** (was "next-up parallel" v2.77).
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **friction.* schema unchanged at v2.78.** Schema work scoped to Wave 0a (cc-0017a) — not yet executed.
- **PostgREST exposed_schemas continues to include `friction`** (carry).
- **cron 85 schedule: daily** (unchanged since v2.77 promotion). All other crons (82, 83, 84, 86) unchanged.
- **L58 BASELINE v2.76** carried.
- **L62 baseline-eligible v2.77** carried (3+ exercises cumulative).
- **L-v2.78-a watcher candidate v2.78**: reviewer convergence pattern is high-signal. 1 occurrence. Promotion at 1 more independent occurrence.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.78; promotion still pending pattern repeat.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **cc-0012 PRV v1: CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.
- **cc-0011 cadence-drift-checker: CLOSED-WITH-VERIFIED-VARIANCE v2.70.**
- **cc-0010C reconciliation-matcher: CLOSED-WITH-VERIFIED-VARIANCE v2.69.**
- **cc-0010B ice-evidence-materialiser: CLOSED-WITH-VERIFIED-VARIANCE v2.68.**
- **cc-0010A r.* DDL Foundation: APPLIED + CLOSED v2.67.**
- **25 close-the-loop UPDATEs outstanding** (22 historical CCH-locked + 3 v2.77 D-01 fires). Gated on PK directive. **No new D-01 fires v2.78**, so no new close-the-loops added.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN.
- **L34 trigger filter audit**: P3 carry.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives.
- **T-MCP-02 quota: 69 cumulative v2.78** (unchanged from v2.77 — no D-01 fires).
- **State-capture exceptions cumulative: 1** (unchanged).
- Cron 82-86 firing normally (cron 85 daily).
- **Dashboard roadmap PHASES** — **31st** consecutive deferral. Remains unblocked per D-IOL-001; eligible for next dashboard session.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- **Cowork output pipeline**: V-C3 still PENDING live run. Diagnostic now part of standing infrastructure follow-up (not blocking).
- **Production FAB live on dashboard.invegent.com**: unchanged from v2.76.
- **Localhost FAB cleanup pending**: `.env.local` still has flag enabled. Carry P3.
- **22 escalated m.chatgpt_review rows remain** as of 2026-05-17 (21 historical CCH-locked + 1 T-MCP-05 meta). Not to be closed without explicit PK directive.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` written. This sync_state + action_list updated. **No execution brief / result file v2.78** — planning documents serve as session output. 3-of-4-way sync this session (docs updated; dashboard PHASES 31st consecutive deferral — still unblocked but deferred to next dashboard session).

**This file size**: ~16KB after this update (v2.78 current + v2.77 previous inlined per G1 "1-2 sessions inlined" rule; v2.76 + earlier retained as pointer rows only).

---

*Last updated: 2026-05-18 Sydney evening — v2.78: FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED. 32 decisions governing execution after 3 independent LLM reviews. 4-layer architecture locked. Wave 0 split to 0a/0b/0c. Telegram re-sequenced Wave 6→2. cc-0015 + cc-0016 re-sequenced to Waves 7-8. Planning-only session. Zero production mutations. cc-0017a (Wave 0a) ready for authoring on PK explicit approval. Empirical critical finding: friction.event grew from 6 to 22 rows via cron 85 first daily fire; dedupe NOT working empirically (1 event per case across all 22). L-v2.78-a watcher candidate logged. Previous (v2.77): cc-0014 CLOSED-ARCHIVED + IOL HOLD-STANCE LIFTED.*
