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
| 2026-05-19 | v2.91-cc0017e-v1.1-8item-doc-patch | **cc-0017e v1.1 8-item backlog doc patch CLOSED** at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. 5-file atomic push_files (vchecks.md + migration-sql.md + risks-and-grants.md + d01-postapply-deferred.md + lessons-metadata-changelog.md). All 9 items covered: severity='info' + category='unclassified' + fixture naming `cc-0017e-test/...` (vchecks.md V-D-setup + V-Z1) + explicit `DROP FUNCTION` for fn_triage_case arity change (migration-sql.md §2) + R4 reframe + §3 narrowed lockdown scope (risks-and-grants.md) + phantom `resolved_at`/`result_summary` removal from 4 templates (d01-postapply-deferred.md §4) + L-v2.90-a through L-v2.90-f added (a/b HIGH-SIGNAL). Reconciliation daily cadence diagnostic promoted P1 rank 1. L-v2.85-e **6th consecutive occurrence** promotion-confirmed carries forward. L-v2.83-a **11+ STRONG**. L-v2.88-a "identical PK-directive loop" 2nd documented occurrence (PK re-sent v2.90 cleanup directive verbatim at v2.91 start; handled via hard-stop + read-only state-verification probe + disposition options; no re-execution). T-MCP-02 cum ~86 unchanged. State-capture exceptions cum 1 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 44th deferral. 0 production mutations / 0 Supabase calls / 0 D-01 fires / 0 memory edits / 0 decisions.md edits. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-8item-doc-patch.md` |
| 2026-05-19 | v2.90-cc0017e-applied | cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION. Main migration `cc_0017e_friction_case_history_and_compat` applied — case_history shadow table + lockdown grants + fn_triage_case 11-arg patched + 5 cc-0017d mutation functions patched byte-stable + 8-row acknowledged-legacy backfill. 5 brief defects + 4 Path B-prime corrective migrations: severity (case_severity_check), category (case_category_fkey), explicit `DROP FUNCTION` legacy 10-arg fn_triage_case (CREATE OR REPLACE arity-change semantics), explicit dependency-ordered cleanup DELETEs (purge_test_case regex mismatch + case_history coverage gap), schema-correct close-the-loop UPDATE (resolved_at + result_summary phantom columns). D-01 review `315baf84-65ed-4086-9e58-cc2497737f5f` AGREE → resolved/applied_with_correction. Final V-check matrix PASS. **8-item v1.1 doc patch backlog identified — CLOSED at v2.91 (see above).** | `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` |
| 2026-05-19 | v2.89-cc0017e-v1.1-doc-patch | cc-0017e v1.1 doc patch CLOSED at commit `587ee4ac894a50708611cf9a053253083ae39e2b`. 2-file atomic `push_files` corrects m.chatgpt_review column-name anomaly in preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4: 6× `review_id`→`id`, 2× `proposal_text`→`proposal`. L-v2.85-e extended to 1+1+1 split this session due to atomic push_files timeout. NEW L-v2.89-a candidate. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-doc-patch.md` |
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

### 2026-05-19 Sydney evening — v2.91: cc-0017e v1.1 8-item backlog doc patch CLOSED

**Outcome:** cc-0017e v1.1 8-item backlog doc patch CLOSED at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. 5 brief files patched in single atomic push_files. All 9 items covered. Apply state preserved (cc-0017e Wave 0e remains APPLIED-WITH-VCHECK-CORRECTION; D-01 `315baf84-...` remains resolved/applied_with_correction).

**Files patched (5):**

| File | New blob SHA | Items covered |
|---|---|---|
| `docs/briefs/cc-0017e/vchecks.md` | `9dc7ca7cb96bb067713e19a7406e5b608127d964` | 1 (severity), 2 (category), 3 (fixture naming + V-Z1 + step 10), V-A1 dual-overload note, V-Z1 cleanup note (helper coverage gap workaround) |
| `docs/briefs/cc-0017e/migration-sql.md` | `fa5542e5e53a694adf73e7f90586e681153ee0b2` | 4 (explicit DROP statement + arity-change discipline + L-v2.86-a scope clarification + §3 preamble + apply ordering + COMMENT update) |
| `docs/briefs/cc-0017e/risks-and-grants.md` | `5a7727ecdc76b6d3af47bbaad93234483feeb6af` | 5 (R4 reframe + grant-preservation caveat), 6 (§3 narrowed lockdown scope + R2 harness scope clarification) |
| `docs/briefs/cc-0017e/d01-postapply-deferred.md` | `25a23ad7e05aa9d78a78a3cb462a9a0330f93205` | 7 (`resolved_at` phantom removed), 8 (`result_summary` phantom removed), all 4 §4 templates schema-corrected, apply-time discipline note added |
| `docs/briefs/cc-0017e/lessons-metadata-changelog.md` | `9d2ea6443682ade79351d26d0f5937541fc5aae0` | 9 (L-v2.90-a through L-v2.90-f added; a/b HIGH-SIGNAL; §3.1 commit map + §3.2 file inventory + §3.4 session metadata + §4 changelog v1.1 v2.91 entry + §5 sign-off updated) |

**Pre-patch state-verification (after PK identical-directive loop):** PK re-sent v2.90 cleanup directive verbatim at v2.91 start. Claude hard-stopped, ran read-only state-verification probe (7 metrics: 29 cases / 29 events / 8 case_history / 8 backfill kind / 0 non-backfill / 0 vd_residue / d01 status=resolved — all AS_EXPECTED), presented 4 disposition options, awaited PK redirection. No re-execution; v2.90 state preserved intact. L-v2.88-a "identical PK-directive loop" pattern — 2nd documented occurrence (v2.88 + v2.91).

**Hard stops respected:**
- 0 production mutations / 0 Supabase calls / 0 D-01 fires / 0 memory edits / 0 decisions.md edits / 0 Wave 0f scope creep / 0 purge_test_case helper changes
- 0 re-execution of cc-0017e apply instructions despite PK re-send
- v2.90 apply state preserved intact (verified via read-only probe)
- Atomic multi-file push_files per L-v2.85-e 1+2 split succeeded on first attempt; L-v2.89-a 1+1+1 fallback NOT invoked

**Items closed v2.91:**
- **cc-0017e v1.1 8-item doc patch** (P2 rank 1 v2.90) → **CLOSED** ✅ at `be4e6772`

**Items promoted v2.91 (rank shift per PK directive):**
- **Reconciliation daily cadence diagnostic** (P1 rank 2 v2.90) → **rank 1 P1 v2.91**
- **Health_check V-C3 + signal-production diagnostic** (P1 rank 3 v2.90) → rank 2 P1 v2.91
- **Platform Reconciliation View brief authoring** (P2 rank 4 v2.90) → rank 3 P2 v2.91
- **Close-the-loop sweep / Pre-sales criteria / `purge_test_case` helper extension** (P2/P3 rank 5 v2.90) → rank 4 P2/P3 v2.91

**Lesson exercise v2.91:**
- **L-v2.85-e**: re-applied **6th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90 + v2.91). 1+2 split close. Promotion-confirmed v2.88 carries forward.
- **L-v2.83-a**: re-applied at doc patch commit + sync close commit. Cumulative **11+ STRONG**.
- **L-v2.88-a "identical PK-directive loop"**: **2nd documented occurrence v2.91** (handled via hard-stop + read-only probe + disposition options; no re-execution). Watcher carries forward.
- **L-v2.89-a**: atomic push_files succeeded; fallback NOT invoked. Not re-exercised.
- **L-v2.85-a (HIGH-SIGNAL)**: not re-exercised v2.91 (doc-only).
- **L-v2.90-a-f**: not re-exercised v2.91 (lessons codified documentationally, not empirically).
- **L40 / L41 / L46 / L58 / L62**: not exercised v2.91 (no DB / no DDL / no D-01 / no apply).
- **No new L-v2.91-X candidates surfaced.**

**Sync close mechanics v2.91:**
1. Doc patch commit `be4e6772` (5 files via push_files; earlier this session).
2. Per-session detail commit `404475172ad54f022a6ccf6203aac06fb824b45d` standalone via `create_or_update_file` (13,800 B).
3. sync_state.md + action_list.md atomic push_files (this commit, 2 files).

Total git commits this session: 3.

**v2.91 honest limitations:**
- **Doc-only patch close session.** No production schema change. No migration applied. No V-check executed. No fresh empirical evidence beyond v2.90 apply-time verification carried forward.
- **friction.* schema state end of v2.91 = state end of v2.90** (10 tables, fn_triage_case 11-arg only, 8 case_history backfill rows, 8 acknowledged-NULL-triage cases backfilled).
- **22 outstanding close-the-loop UPDATEs unchanged net** from v2.90.
- **purge_test_case helper case_history coverage gap (L-v2.90-d)** remains open future Wave candidate. v1.1 documented workaround; helper itself unchanged.
- **L-v2.85-e is now mechanical sync-close discipline** (6 consecutive occurrences). Pattern stable; promotion already confirmed v2.88.

---

### 2026-05-19 Sydney evening — v2.90 close (brief)

cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION. Main migration `cc_0017e_friction_case_history_and_compat` applied. 5 brief defects + 4 Path B-prime corrective migrations. D-01 `315baf84-...` resolved/applied_with_correction. 8-item v1.1 doc patch backlog identified — **CLOSED at v2.91 (see above).** 6 NEW L-v2.90 candidates (a/b HIGH-SIGNAL; c/d/e/f). Per-session detail `77d09376`; sync close `7af9f2ff`.

*(Full detail at `docs/runtime/sessions/2026-05-19-cc0017e-applied.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.91)

1. **Reconciliation daily cadence diagnostic** — **P1 carry, rank 1 v2.91 (NEW TOP)**. First post-cc-0017e cron 85 fire pending; check after fire lands. Unblocked from cc-0017e apply + doc-patch gating.
2. **Health_check V-C3 + signal-production diagnostic** — **P1 carry, rank 2**. V-C3 still PENDING. Cowork brief v3.0 ready.
3. **Platform Reconciliation View brief authoring** — **P2 carry, rank 3**. PK greenlight required.
4. **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** — **P2/P3 carry, rank 4**. 22 outstanding close-the-loop UPDATEs; Pre-sales 3-clock criteria; helper extension future Wave candidate (L-v2.90-d).

**Standing P0:** Personal businesses check-in. Crazy Domains follow-up carry from v2.51.

Carries: cc-0015 friction-pool-view (Wave 7, still gated on observation window closing 2026-05-26); cc-0016 friction-capture-evidence (Wave 8, gated on Wave 7); cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; minor doc patches (cc-0010A/0011/0012); Dashboard PHASES 44th deferral; F-CRON-AUTO-APPROVER-SECRET-INLINE; lesson promotions (L-v2.78-a + L-v2.81-a eligible; **L-v2.83-a STRONG 11+**; L-v2.84-a/b/c/d watching; L-v2.85-a HIGH-SIGNAL 4 occurrences; **L-v2.85-e PROMOTION-CONFIRMED 6th consecutive v2.91**; L-v2.86-a/b/c/d/e watching; L-v2.88-a/b/c/d candidates (a re-observed v2.91 — 2nd occurrence); L-v2.89-a candidate; **L-v2.90-a through L-v2.90-f** (a/b HIGH-SIGNAL; c/d/e/f candidates)).

---

## ⛔ Carried-forward "do not touch" state

**v2.91 updates on standing items:**

- **cc-0017e v1.1 8-item doc patch CLOSED v2.91** at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. 5 brief files patched atomically. All 9 backlog items covered (8 defects + L-v2.90 family addition). Apply state preserved.
- **cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION v2.90** — unchanged. friction.case_history table exists; fn_triage_case 11-arg only; 5 cc-0017d functions patched byte-stable; 8-row backfill executed; D-01 `315baf84-...` resolved.
- **m.chatgpt_review row `315baf84-...`** — status=resolved/action_taken=applied_with_correction/resolved_by=cc-0017e-close-v2.90 (unchanged).
- **m.chatgpt_review schema** — no `resolved_at` / no `result_summary` (documented in cc-0017e v1.1 d01-postapply-deferred.md §4).
- **purge_test_case helper case_history coverage gap** — unchanged from v2.90. Future Wave brief candidate. v1.1 documented inline workaround pattern; helper itself unchanged.
- **L-v2.88-a "identical PK-directive loop"** — re-observed v2.91 at session start. 2 occurrences total. Watcher.
- **Friction Register Consolidation Plan** — Gate 13.c (cc-0017e apply) CLOSED v2.90 unchanged. Wave 0e APPLIED unchanged. No new gates v2.91.
- **Gate 11** (1-week observation window 2026-05-19 → 2026-05-26) ACTIVE. Day 1 of 7 unchanged (v2.91 same calendar day as v2.86–v2.90 closes).
- **Wave 0f** — NOT YET SCOPED. Items B/E/F/G deferred from cc-0017e + purge_test_case helper extension are candidates.
- **cc-0017c APPLIED v2.85**, **cc-0017b APPLIED v2.82 + v1.1 v2.83**, **cc-0017a APPLIED v2.81**, **cc-0014 CLOSED-ARCHIVED v2.77** — all unchanged.
- **cc-0015** (Wave 7) + **cc-0016** (Wave 8) — Wave 0e gate cleared v2.90; still gated on observation window + sequencing.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** unchanged.
- **cron 82-86** firing normally. First cc-0017e-post-apply cron 85 fire pending — diagnostic P1 rank 1 v2.91.
- **L41**: cumulative v2.80-v2.91 = 11 (no new exercises v2.91 — doc-only).
- **L40 / L46 / L58 / L62**: not exercised v2.91.
- **L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
- **L-v2.83-a**: **11+ occurrences v2.91**. STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c/d**: unchanged. L-v2.84-d related to L-v2.90-a.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.91; not re-exercised in doc-only).
- **L-v2.85-b**: 4× occurrences from v2.90 carry; not re-exercised v2.91.
- **L-v2.85-d**: REALIZED v2.86 + re-exercised v2.90 (helper bypass). Not re-exercised v2.91.
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88 carries forward; 6th consecutive occurrence v2.91**.
- **L-v2.86-a (HIGH-SIGNAL)**: PARTIALLY exercised v2.90 (P2 disclosed as PARTIAL). Not re-exercised v2.91.
- **L-v2.86-b/c**: exercised v2.90 byte-stable; not re-exercised v2.91.
- **L-v2.88-a**: **2 occurrences (v2.88 + v2.91 identical-directive loop)**. Watcher.
- **L-v2.88-b/c/d**: realised v2.90; carry forward.
- **L-v2.89-a**: not re-exercised v2.91 (atomic succeeded; fallback not invoked).
- **L-v2.90-a (HIGH-SIGNAL) / b (HIGH-SIGNAL) / c / d / e / f**: codified documentationally v2.91 (lessons-metadata-changelog.md §2). Not empirically re-exercised. Watchers.
- **22 close-the-loop UPDATEs outstanding** unchanged net from v2.90. v2.91 added 0.
- **T-MCP-02 quota: ~86 cumulative v2.91** unchanged from v2.90 (no D-01 v2.91). State-capture exceptions: 1 unchanged.
- **Dashboard roadmap PHASES — 44th consecutive deferral.** No file-touch v2.91.
- M-series total dead-letter rows cleared since 8 May 2026: 396.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Cowork output pipeline V-C3 still PENDING.**
- **Production FAB live on dashboard.invegent.com** unchanged.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** (severity_override query-pattern note) carried.
- **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-8item-doc-patch.md` written first as standalone commit (`404475172ad54f022a6ccf6203aac06fb824b45d`, 13,800 B). sync_state and action_list updated as **atomic push_files commit** this session per L-v2.85-e baseline mitigation 1+2 split (6th consecutive occurrence — promotion-confirmed v2.88 carries forward). `decisions.md` not touched. Dashboard PHASES 44th consecutive deferral — no file-touch. L-v2.89-a fallback (1+1+1) ready if atomic push_files times out — **not invoked v2.91** (first attempt succeeded).

**This file size**: ~25KB after this update.

---

*Last updated: 2026-05-19 Sydney evening — v2.91: cc-0017e v1.1 8-item backlog doc patch CLOSED at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. 5 brief files patched atomically (vchecks.md + migration-sql.md + risks-and-grants.md + d01-postapply-deferred.md + lessons-metadata-changelog.md). All 9 items covered (8 backlog defects + L-v2.90 family addition). Reconciliation daily cadence diagnostic promoted P1 rank 1. L-v2.85-e 6th consecutive occurrence — promotion-confirmed carries forward. L-v2.83-a 11+ STRONG. L-v2.88-a "identical PK-directive loop" 2nd occurrence v2.91 (handled via hard-stop + read-only probe; no re-execution). T-MCP-02 cum ~86 unchanged. State-capture exceptions cum 1 unchanged. Memory 19/30 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 44th deferral. 0 production mutations / 0 Supabase calls / 0 D-01 fires. Per-session detail commit `404475172ad54f022a6ccf6203aac06fb824b45d`. sync_state + action_list atomic push_files this commit (1+2 split per L-v2.85-e baseline; L-v2.89-a fallback ready but not invoked).*
