# ICE — Sync State Index

> **This file is the lightweight session pointer index.** Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-19 | v2.92-vc3-signal-production-closed | **Health_check V-C3 + signal-production diagnostic CLOSED-PASS**. Evidence anchored to 2026-05-17 `nightly-health-check-v1` v3.0 run (`run_id=nightly-health-check-v1/2026-05-17T160210Z`). 4 read-only checks PASS: (1) `friction.fn_emit_health_check_findings(text,text,jsonb)→jsonb` SECURITY DEFINER owner=postgres signature intact; (2) all 5 markdown finding_ids reconcile 1:1 with `friction.event` rows (source='health_check', severity='critical', category='pipeline_integrity', all case_linked); (3) 0 health_check `emit_error` rows; (4) all-time aggregate shows only the 2026-05-17 v3.0 run as expected (earlier 2026-05-02/04/05 markdown files predate v3.0 emission). Markdown footer `success_count=5 failure_count=0` empirically true. **NEW P2 follow-up spawned: Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** (rank 2). Of 5 calendar days since brief v3.0 published 2026-05-15, only 1 file produced (20% hit rate) — signal works when invoked; invocation sparse. **Platform Reconciliation View brief described as next practical planning item** per PK directive (rank 3 — positionally unchanged but now first non-wait, non-investigative item). L-v2.85-e **7th consecutive occurrence** (1+2 split close v2.92). L-v2.83-a 12+ STRONG. Dashboard PHASES **45th deferral**. T-MCP-02 cum ~86 unchanged. 0 production mutations / 0 Supabase mutations / 0 D-01 fires / 0 memory edits / 0 decisions.md edits / 0 Wave 0f work / 0 force-run of `nightly-health-check-v1` / 0 force-run of cron 85. Per-session detail commit `55d26d3d07346acd1ab9be91f3c3f92d3ed48842` (11,169 B). sync_state + action_list atomic this commit. | `docs/runtime/sessions/2026-05-19-vc3-signal-production-closed.md` |
| 2026-05-19 | v2.91-cc0017e-v1.1-8item-doc-patch | **cc-0017e v1.1 8-item backlog doc patch CLOSED** at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. 5-file atomic push_files (vchecks.md + migration-sql.md + risks-and-grants.md + d01-postapply-deferred.md + lessons-metadata-changelog.md). All 9 items covered. Reconciliation daily cadence diagnostic promoted P1 rank 1. L-v2.85-e 6th consecutive occurrence. L-v2.83-a 11+ STRONG. L-v2.88-a 2nd documented occurrence. Dashboard PHASES 44th deferral. 0 production mutations / 0 Supabase calls / 0 D-01 fires. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-8item-doc-patch.md` |
| 2026-05-19 | v2.90-cc0017e-applied | cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION. Main migration `cc_0017e_friction_case_history_and_compat` applied — case_history shadow table + lockdown grants + fn_triage_case 11-arg patched + 5 cc-0017d mutation functions patched byte-stable + 8-row acknowledged-legacy backfill. 5 brief defects + 4 Path B-prime corrective migrations. D-01 review `315baf84-65ed-4086-9e58-cc2497737f5f` AGREE → resolved/applied_with_correction. Final V-check matrix PASS. **8-item v1.1 doc patch backlog identified — CLOSED at v2.91.** | `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` |
| 2026-05-19 | v2.89-cc0017e-v1.1-doc-patch | cc-0017e v1.1 doc patch CLOSED at commit `587ee4ac894a50708611cf9a053253083ae39e2b`. 2-file atomic `push_files` corrects m.chatgpt_review column-name anomaly. L-v2.85-e extended to 1+1+1 split this session. NEW L-v2.89-a candidate. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-doc-patch.md` |
| 2026-05-19 | v2.88-cc0017e-v1.0-authored | cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY at commit chain `8502fc49 → 1659b293 → d349bdfe`. 8 files. Open anomaly: m.chatgpt_review column-name discrepancy — **resolved v2.89; surfaced 7 more brief defects at v2.90 apply; closed v2.91**. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.0-authored.md` |
| 2026-05-19 | v2.87-cc0017d-v1.1-doc-patch | cc-0017d v1.1 doc-only patch CLOSED at commit `f0367405`. 4 files patched + read-back verified. No production mutations. | `docs/runtime/sessions/2026-05-19-cc0017d-v1.1-doc-patch.md` |
| 2026-05-19 | v2.86-cc0017d-applied-with-vcheck-correction | cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION. 6 SECURITY DEFINER mutation functions deployed. | `docs/runtime/sessions/2026-05-19-cc0017d-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.85-cc0017c-applied-with-vcheck-correction | cc-0017c APPLIED-WITH-VCHECK-CORRECTION. Friction.* Wave 0 (0a+0b+0c) COMPLETE. | `docs/runtime/sessions/2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.84-cc0017c-v1.0-v1.1-d01-deferred | cc-0017c v1.0+v1.1 BRIEF AUTHORED + 2× D-01 + APPLY DEFERRED TO FRESH SESSION (Path C). | `docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md` |
| 2026-05-18 | v2.83-cc0017b-v1.1-close-cc0017c-open | cc-0017b v1.1 doc-only patch CLOSED + L-v2.81-a re-exercised + cc-0017c authoring open. | `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` |
| 2026-05-18 | cc-0017b-applied | cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-CHECKS PASS (v2.82). | `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` |
| 2026-05-18 | cc-0017a-applied-l41-l47 | cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS (v2.81). | `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` |
| 2026-05-18 | cc-0017a-v1.1-and-d01-fire | cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B (v2.80). | `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` |
| 2026-05-18 | v2.79-friction-plan-signed | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED (v2.79). | `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` |
| 2026-05-18 | v2.78-friction-register-consolidation-planning | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED (v2.78). | `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` |
| 2026-05-18 | cc-0014-archived-and-recon-daily | cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY (v2.77). | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW + FAB LIVE + cc-0015/0016 DRAFTED (v2.76). | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | cc-0014 Stage C APPLIED (v2.74). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | cc-0014 Stage B APPLIED (v2.73). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | cc-0014 Stage A APPLIED (v2.72). | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |

*(Older sessions truncated for brevity.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-19 Sydney evening — v2.92: Health_check V-C3 signal-production CLOSED-PASS + Cowork-cadence WARN spawned

**Outcome:** Health_check V-C3 + signal-production diagnostic CLOSED-PASS based on read-only evidence gathered earlier this session. Signal-production contract empirically validated against the 2026-05-17 `nightly-health-check-v1` v3.0 run. Separate Cowork-cadence WARN spawned as NEW P2 follow-up (rank 2): the brief is firing only ~20% of scheduled days since v3.0 publish on 2026-05-15.

**V-C3 evidence (4 read-only `execute_sql` queries; reproduced in per-session detail):**

| # | Check | Result |
|---|---|---|
| 1 | `friction.fn_emit_health_check_findings(text, text, jsonb) → jsonb` SECURITY DEFINER owner=postgres exists | PASS — matches v3.0 brief §12 contract |
| 2 | 5 `friction.event` rows for run_id `nightly-health-check-v1/2026-05-17T160210Z` reconcile 1:1 with markdown finding_ids | PASS — source='health_check', severity='critical', category='pipeline_integrity', all case_linked=true, observed_at=2026-05-17 16:08:35 UTC |
| 3 | `friction.emit_error` filtered for health_check pattern | PASS — 0 rows; markdown `failure_count=0` true |
| 4 | All-time aggregate of `nightly-health-check-v1/%` source_event_ids | PASS — only 2026-05-17T160210Z run (5 events) appears; pre-v3.0 runs correctly absent |

**Items closed v2.92:**
- **Health_check V-C3 + signal-production diagnostic** (P1 rank 2 v2.91) → **CLOSED-PASS** ✅

**Items spawned v2.92:**
- **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** (P2 NEW v2.92, rank 2). Of 5 days since brief v3.0 published 2026-05-15, only 1 file produced (20% hit rate). Root-cause candidates: Cowork agent uptime / idempotency-check false positives / schedule misconfiguration / task paused. Recommended next step: read-only probe of `docs/runtime/runs/nightly-health-check-v1-*.md` state files + Cowork agent run history.

**Items promoted v2.92:**
- **Platform Reconciliation View brief authoring** (rank 3 v2.91 → rank 3 v2.92, positionally unchanged but described as **next practical planning item** per PK directive — first non-wait, non-investigative item in the queue).

**Items unchanged v2.92:**
- **Reconciliation daily cadence diagnostic** — P1 rank 1, still pending first natural post-cc-0017e cron 85 fire. Next scheduled: 2026-05-19 17:30 UTC ≈ 2026-05-20 03:30 AEST. Latest fire visible in `cron.job_run_details` is 2026-05-18 17:30:00 UTC (succeeded, pre-cc-0017e).
- **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper extension** — P2/P3 rank 4.

**Hard stops respected v2.92:**
- 0 production mutations / 0 Supabase mutations (sync close itself) / 0 DDL / 0 apply_migration / 0 D-01 fires
- 0 force-run of `nightly-health-check-v1`
- 0 force-run of cron 85
- 0 Wave 0f work
- 0 production code edits
- 0 memory edits / 0 decisions.md edits
- 0 `purge_test_case` helper changes
- 4 read-only `execute_sql` calls earlier this session for V-C3 evidence (reported in per-session detail) — diagnostic-only, no mutations

**Sync close mechanics v2.92 (1+2 split per L-v2.85-e baseline — 7th consecutive occurrence):**
1. Per-session detail standalone commit `55d26d3d07346acd1ab9be91f3c3f92d3ed48842` (`docs/runtime/sessions/2026-05-19-vc3-signal-production-closed.md`, 11,169 B) via `create_or_update_file`.
2. sync_state + action_list atomic commit this commit via `push_files` (2 files).

Total git commits this session: 2. L-v2.89-a fallback (1+1+1) ready but not invoked.

**Lesson exercise v2.92:**
- **L-v2.85-e**: re-applied **7th consecutive occurrence** (v2.86 → v2.92). Promotion-confirmed v2.88 carries forward.
- **L-v2.83-a**: re-applied at sync close commit. Cumulative **12+ STRONG**.
- **L-v2.88-a**: NOT re-occurring v2.92 (PK directive forward-looking close-and-spawn, not directive-loop).
- **L-v2.89-a**: atomic push_files in flight; fallback ready.
- **L-v2.85-a / L-v2.86-a / L-v2.90-a-f**: NOT re-exercised v2.92 (doc-sync only; no DB / no V-checks).
- **L40 / L41 / L46 / L58 / L62**: NOT exercised v2.92.

**No new L-v2.92-X candidates surfaced.** Mechanical close-and-spawn session.

**v2.92 honest limitations:**
- **V-C3 close is empirically anchored to a single v3.0 run** (2026-05-17T160210Z). Future runs continue to validate or break the contract daily. Cowork-cadence WARN means the contract is not being exercised daily as scheduled.
- **No fresh production state change v2.92.** friction.* state end of v2.92 = state end of v2.91 (29 cases / 29 events / 8 case_history backfill rows / fn_triage_case 11-arg only).
- **22 outstanding close-the-loop UPDATEs unchanged net from v2.91.**
- **Dashboard PHASES 45th deferral** carried (was 44; +1 v2.92). No file-touch.

---

### 2026-05-19 Sydney evening — v2.91 close (brief)

cc-0017e v1.1 8-item backlog doc patch CLOSED at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. 5 brief files patched atomically. All 9 items covered (8 backlog defects + L-v2.90 family addition). Reconciliation daily diagnostic promoted P1 rank 1. L-v2.85-e 6th consecutive occurrence. L-v2.83-a 11+ STRONG. L-v2.88-a 2nd documented occurrence. Per-session detail `40447517`; sync close `82b608c4`.

*(Full detail at `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-8item-doc-patch.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.92)

1. **Reconciliation daily cadence diagnostic** — **P1 carry, rank 1 v2.92 (UNCHANGED)**. First post-cc-0017e cron 85 fire still pending; next scheduled 2026-05-19 17:30 UTC ≈ 2026-05-20 03:30 AEST. Re-run 9-check diagnostic after natural fire lands.
2. **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** — **P2 NEW, rank 2 v2.92**. Spawned from V-C3 close. Signal-production contract validated; invocation sparse. Read-only probe of state files + Cowork agent run history when PK directs.
3. **Platform Reconciliation View brief authoring** — **P2 carry, rank 3 (described as next practical planning item per PK directive)**. PK greenlight required.
4. **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** — **P2/P3 carry, rank 4**. 22 outstanding close-the-loop UPDATEs; Pre-sales 3-clock criteria; helper extension future Wave 0f candidate (L-v2.90-d).

**Standing P0:** Personal businesses check-in. Crazy Domains follow-up carry from v2.51.

Carries: cc-0015 friction-pool-view (Wave 7, still gated on observation window closing 2026-05-26); cc-0016 friction-capture-evidence (Wave 8, gated on Wave 7); cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; minor doc patches (cc-0010A/0011/0012); Dashboard PHASES **45th deferral**; F-CRON-AUTO-APPROVER-SECRET-INLINE; lesson promotions (L-v2.78-a + L-v2.81-a eligible; **L-v2.83-a STRONG 12+**; L-v2.84-a/b/c/d watching; L-v2.85-a HIGH-SIGNAL 4 occurrences; **L-v2.85-e PROMOTION-CONFIRMED 7th consecutive v2.92**; L-v2.86-a/b/c/d/e watching; L-v2.88-a/b/c/d candidates; L-v2.89-a candidate; **L-v2.90-a through L-v2.90-f** (a/b HIGH-SIGNAL; c/d/e/f candidates)).

---

## ⛔ Carried-forward "do not touch" state

**v2.92 updates on standing items:**

- **Health_check V-C3 + signal-production diagnostic CLOSED-PASS v2.92** — empirically validated against 2026-05-17 `nightly-health-check-v1` v3.0 run. Function signature intact (`fn_emit_health_check_findings(text,text,jsonb)→jsonb` SECURITY DEFINER owner=postgres); 5 finding_ids reconcile 1:1 with friction.event; 0 emit_errors; all-time aggregate clean.
- **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** — NEW v2.92 follow-up. Brief published v3.0 on 2026-05-15; only 1 v3.0 run has fired since (2026-05-17). 20% hit rate over 5-day window. Signal-production contract works when invoked; invocation cadence sparse.
- **cc-0017e v1.1 8-item doc patch CLOSED v2.91** at `be4e6772f20a73d093f53f609230fb565b1fe0df` — unchanged v2.92.
- **cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION v2.90** — unchanged. friction.case_history table exists; fn_triage_case 11-arg only; 5 cc-0017d functions patched byte-stable; 8-row backfill executed; D-01 `315baf84-...` resolved.
- **m.chatgpt_review row `315baf84-...`** — status=resolved/action_taken=applied_with_correction/resolved_by=cc-0017e-close-v2.90 (unchanged).
- **purge_test_case helper case_history coverage gap** — unchanged from v2.90. Future Wave 0f brief candidate (L-v2.90-d).
- **Friction Register Consolidation Plan** — Gate 13.c CLOSED v2.90; Gate 13.d CLOSED v2.91. No new gates v2.92.
- **Gate 11** (1-week observation window 2026-05-19 → 2026-05-26) ACTIVE Day 1 of 7 unchanged (v2.92 same calendar day as v2.86–v2.91 closes).
- **Wave 0f** — NOT YET SCOPED. Items B/E/F/G deferred from cc-0017e + purge_test_case helper extension are candidates.
- **cc-0017c APPLIED v2.85**, **cc-0017b APPLIED v2.82 + v1.1 v2.83**, **cc-0017a APPLIED v2.81**, **cc-0014 CLOSED-ARCHIVED v2.77** — all unchanged.
- **cc-0015** (Wave 7) + **cc-0016** (Wave 8) — Wave 0e gate cleared v2.90; still gated on observation window + sequencing.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** unchanged. **V-C3 signal-production CLOSED-PASS v2.92 (empirically validated)** — replaces prior "V-C3 PENDING" carry from v2.91.
- **cron 82-86** firing normally. First cc-0017e-post-apply cron 85 fire still pending — diagnostic P1 rank 1 v2.92.
- **L41**: cumulative v2.80-v2.92 = 11 (no new exercises v2.92 — doc-sync only).
- **L40 / L46 / L58 / L62**: not exercised v2.92.
- **L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
- **L-v2.83-a**: **12+ occurrences v2.92**. STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c/d**: unchanged.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences unchanged (doc-sync only v2.92; not re-exercised).
- **L-v2.85-b/c/d**: not re-exercised v2.92.
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88 carries forward; 7th consecutive occurrence v2.92**.
- **L-v2.86-a (HIGH-SIGNAL)**: not re-exercised v2.92.
- **L-v2.86-b/c/d/e**: not re-exercised v2.92.
- **L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.92.
- **L-v2.88-b/c/d**: realised v2.90; carry forward.
- **L-v2.89-a**: atomic push_files in flight v2.92; fallback ready.
- **L-v2.90-a-f**: codified documentationally v2.91. Not empirically re-exercised v2.92. Watchers.
- **22 close-the-loop UPDATEs outstanding** unchanged net from v2.91. v2.92 added 0.
- **T-MCP-02 quota: ~86 cumulative v2.92** unchanged (no D-01 v2.92). State-capture exceptions: 1 unchanged.
- **Dashboard roadmap PHASES — 45th consecutive deferral.** No file-touch v2.92.
- M-series total dead-letter rows cleared since 8 May 2026: 396.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Production FAB live on dashboard.invegent.com** unchanged.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** (severity_override query-pattern note) carried.
- **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-19-vc3-signal-production-closed.md` written first as standalone commit (`55d26d3d07346acd1ab9be91f3c3f92d3ed48842`, 11,169 B). sync_state and action_list updated as **atomic push_files commit** this session per L-v2.85-e baseline mitigation 1+2 split (**7th consecutive occurrence** — promotion-confirmed v2.88 carries forward). `decisions.md` not touched. Dashboard PHASES **45th consecutive deferral** — no file-touch. L-v2.89-a fallback (1+1+1) ready if atomic push_files times out — **not invoked v2.92** (first attempt succeeded).

**This file size**: ~22KB after this update.

---

*Last updated: 2026-05-19 Sydney evening — v2.92: Health_check V-C3 + signal-production diagnostic CLOSED-PASS. Empirically validated against 2026-05-17 `nightly-health-check-v1` v3.0 run (`run_id=nightly-health-check-v1/2026-05-17T160210Z`). 4 read-only checks PASS: function signature intact / 5 finding_ids reconcile 1:1 with friction.event / 0 emit_errors / all-time aggregate clean. NEW P2 follow-up spawned rank 2: Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN (20% hit rate since brief v3.0 published 2026-05-15). Platform Reconciliation View brief described as next practical planning item per PK directive (rank 3, positionally unchanged). L-v2.85-e 7th consecutive occurrence — promotion-confirmed carries forward. L-v2.83-a 12+ STRONG. T-MCP-02 cum ~86 unchanged. State-capture exceptions cum 1 unchanged. Memory 19/30 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 45th deferral. 0 production mutations / 0 Supabase mutations / 0 D-01 fires / 0 force-run of `nightly-health-check-v1` / 0 force-run of cron 85. Per-session detail commit `55d26d3d07346acd1ab9be91f3c3f92d3ed48842`. sync_state + action_list atomic push_files this commit (1+2 split per L-v2.85-e baseline; L-v2.89-a fallback ready but not invoked).*
