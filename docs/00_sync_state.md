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
| 2026-05-19 | v2.85-cc0017c-applied-with-vcheck-correction | **cc-0017c APPLIED-WITH-VCHECK-CORRECTION. Migration `20260519004545` + cleanup `20260519005322`. Fresh D-01 review_id `d18fa6db-...` verdict=AGREE (empty pushback, empty corrected_action). 9/9 V-checks acceptable. V-B4 PK Path 1 inline rewrite with 12-param emit_event signature confirmed SECURITY DEFINER bypass post lockdown. Friction.* Wave 0 (0a+0b+0c) COMPLETE. Wave 0d brief authoring NOW BLOCKING. Final state event=29, case=29, source=3/3, NULL=21/act_now=1/track=7. T-MCP-02 cum 75→76. 4 new L-v2.85 candidates (a HIGH-SIGNAL). Dashboard PHASES 38th deferral carried.** | `docs/runtime/sessions/2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.84-cc0017c-v1.0-v1.1-d01-deferred | cc-0017c v1.0 + v1.1 BRIEF AUTHORED + 2× D-01 FIRED + APPLY DEFERRED TO FRESH SESSION (Path C). v1.0 commit `92f9e868`; v1.1 commit `d3d8381f`. D-01 review_ids `a37eff28-...` (v1.0 partial→Path A) + `9e602a2d-...` (v1.1 partial type-c→Path C). | `docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md` |
| 2026-05-18 | v2.83-cc0017b-v1.1-close-cc0017c-open | cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN + L-v2.81-a re-exercised (occurrence 2) + cc-0017c authoring open (v2.83). | `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` |
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
| 2026-05-13 | cc-0012-closed-with-variance | cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71). | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70). | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69). | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68). | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |

*(Older sessions truncated for brevity.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-19 Sydney morning — v2.85: cc-0017c APPLIED-WITH-VCHECK-CORRECTION (Friction.* Wave 0 COMPLETE)

**Outcome:** cc-0017c Wave 0c applied via single atomic `apply_migration` (`cc_0017c_friction_register_lockdown_and_backfill` version `20260519004545`), completing the friction.* foundational schema. 9/9 V-checks acceptable (8 PASS + V-A3 PARTIAL acceptable per brief). V-B4 brief defect surfaced (7-param vs deployed 12-param emit_event signature) and was remediated via PK-directed Path 1 inline rewrite — corrected V-B4 returned `event_id=f4c94457-...`, `case_id=fd573ea1-...`, `case_disposition=created_new`, empirically confirming SECURITY DEFINER bypass works post Section B REVOKE lockdown. Smoke cleanup via dedicated migration `cc_0017c_v_b4_smoke_cleanup` version `20260519005322` (postgres-owner DELETE; service_role lacks DELETE post lockdown). D-01 row `d18fa6db-...` closed-the-loop to status=resolved. Friction Register Consolidation Plan v1 reaches Wave 0 completion.

**Production mutations: 2** (main + smoke cleanup). **D-01 fires v2.85: 1** (fresh fire, verdict AGREE — cleanest narrative; validates v2.84 honest limitation hypothesis). T-MCP-02 cum **75 → 76**. State-capture exceptions **1** (unchanged).

**Note on commit history:** This 4-way sync close was repushed after an earlier `push_files` attempt was truncated mid-construction (response length cap during initial drafting). No partial artefact landed; repo was at clean v2.84 close commit `2cdef219` when this v2.85 commit landed. Production mutations had completed before the truncated push attempt and were unaffected.

**Key sequence:**
1. Session open — read sync_state v2.84 + action_list v2.84 + cc-0017c brief sub-files.
2. G3 review presented to PK with D1/D2/D3 decision matrix.
3. PK directive (G3 prep): P-1 to P-5 read-only; fresh D-01 if match; hold apply.
4. P-set rerun: P-1 grants match design-time; P-2 29 events all FK_VALID (+7 reconciliation drift from cron 85, benign); P-3 backfill_candidate_count=0, done_count_audit=0; P-4 baseline within envelope; P-5 CHECK definition exact match.
5. Fresh D-01 fire — review_id `d18fa6db-3a5c-42ff-8aef-55fcb4fb4f92`. Verdict **agree**. Empty pushback. Empty corrected_action. Procedural escalate only.
6. PK directive: approved apply this session.
7. `apply_migration` → version `20260519004545`. `{success:true}`.
8. V-checks sequential: V-A1 ✅ PASS, V-A2 ✅ PASS, V-A3 ✅ PARTIAL (REVOKE-first acceptable), V-B1/B2/B3 ✅ PASS, **V-B4 ❌ FAIL** (function signature mismatch — `42883 function does not exist`).
9. Hard-stop per PK directive item 4. Diagnostic probe revealed deployed 12-param signature (cc-0017b unified). Characterised as brief defect, not migration defect.
10. PK directive: Path 1 — inline V-B4 rewrite with 12-param signature; specified smoke values verbatim.
11. V-B4 corrected ✅ PASS — `event_id=f4c94457-...`, `case_id=fd573ea1-...`, `case_disposition=created_new`. **Empirical SECURITY DEFINER bypass confirmation post lockdown.**
12. V-C1 ✅ PASS (0/0/0). V-C2 ✅ PASS (NULL=22 with smoke = 21 pre + 1 smoke; act_now=1, track=7 exact match brief = proof Section C UPDATE was 0-row no-op).
13. Cleanup migration `cc_0017c_v_b4_smoke_cleanup` → version `20260519005322`. Postgres-owner DELETE.
14. Final state probe: event=29, case=29, source=3/3, smoke_event_remaining=0, smoke_case_remaining=0, NULL=21/act_now=1/track=7/closed_class=0/done=0.
15. Close-the-loop UPDATE on `m.chatgpt_review` id=`d18fa6db-...` → status=resolved, escalation_resolved_at=2026-05-19 00:54:22.90659 UTC. L40 column-name discipline maintained.
16. 4-way sync close v2.85 — this 3-file atomic push_files (sync_state + action_list + per-session file). Initial attempt truncated mid-draft; this is the clean repush. Dashboard PHASES 38th consecutive deferral carried per PK directive item 5. No `decisions.md` change (Wave 0c is execution of v2.79-signed plan).

**Items closed v2.85:**
- cc-0017c apply (was P1 rank 1 BLOCKED v2.84) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION** ✅
- Fresh D-01 fire (review_id `d18fa6db-...`) → **resolved** ✅
- V-B4 PK Path 1 inline rewrite → **PASS** ✅
- V-B4 smoke cleanup → **applied** ✅
- Friction Register Consolidation Plan Wave 0c apply (gate 10) → **CLOSED** ✅
- Friction.* foundational schema Wave 0 → **COMPLETE** ✅

**Items newly active or blocking v2.85:**
- **Wave 0d triage/resolution SECURITY DEFINER functions** — NOW BLOCKING. service_role lost UPDATE on friction.case post Section B REVOKE. P1 rank 1 next session. Scope candidates: `friction.triage_case`, `friction.resolve_case`, `friction.reopen_case`, `friction.purge_test_event` (L-v2.85-d helper).
- **vchecks.md V-B4 doc patch** — P3 NEW. Update V-B4 SQL to 12-param signature.
- **1-week empirical observation window** — gate 11 ACTIVE 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) execution gated.

**Lesson outcomes v2.85:**
- **L40 exercised** — close-the-loop UPDATE used `id` + `escalation_resolved_at` correctly (lesson from v2.84 internalised; L-v2.84-d candidate possibly auto-resolved).
- **L41 NOT exercised** — apply_migration for DDL; execute_sql for DML on m.chatgpt_review (exempt) + SELECTs. Cumulative v2.80-v2.85 = 6.
- **L46 Evidence Gate exercised** — fresh D-01 with verbatim P-set + 9 known_weak_evidence items.
- **L58 applied** — 3-file atomic push_files close. *(Note: needed retry after first attempt truncated; documented as honest limitation, not lesson failure.)*
- **L62 exercised 1×** — fresh D-01 cycle clean.
- **L-v2.83-a candidate** re-exercised 1× (6+ cumulative). STRONG PROMOTION CANDIDATE.
- **L-v2.85-a candidate (NEW, HIGH-SIGNAL)** — V-check function calls must be validated against deployed signatures at brief authoring. Pattern: V-B4 7-param brief vs deployed 12-param. Detection: runtime `42883 function does not exist`. Recommendation: brief P-set should include `pg_get_function_identity_arguments` probe.
- **L-v2.85-b candidate (NEW)** — Inline V-check rewrite is valid Path 1 when brief defect surfaces during apply AND migration is structurally correct. Brief defect ≠ migration defect; rollback reserved for migration defects.
- **L-v2.85-c candidate (NEW)** — SECURITY DEFINER bypass empirically confirmed post REVOKE-lockdown. Validates Amendment F design pattern.
- **L-v2.85-d candidate (NEW)** — Postgres-owner cleanup migration when service_role lacks DELETE. Wave 0d recommendation: `friction.purge_test_event(uuid)` SECURITY DEFINER helper.
- **L-v2.85-e candidate (NEW, this commit)** — Large multi-file push_files commits can exceed response-construction length budget. Mitigation: keep individual file payloads compact and avoid duplicating per-session detail across sync_state + action_list. First occurrence: v2.85 close initial attempt truncated; clean retry succeeded.

**v2.85 honest limitations:**
- **V-B4 brief defect was preventable** — vchecks.md not updated when cc-0017b unified emit_event with 12-param signature. L-v2.85-a addresses.
- **Cleanup migration entry** — `cc_0017c_v_b4_smoke_cleanup` adds to migration history. Trade-off accepted for clean production data.
- **V-A3 PARTIAL via execute_sql** — structural limitation, anticipated by brief.
- **Wave 0d now BLOCKING** — friction.case state mutations require SECURITY DEFINER mediation.
- **Dashboard PHASES at 38th consecutive deferral** (carried per PK directive item 5).
- **22 outstanding close-the-loop UPDATEs** unchanged (v2.85's 1 new closed in-session).
- **Memory cap 19/30** unchanged.
- **Initial push_files attempt truncated mid-construction** — new L-v2.85-e candidate captures the pattern. Clean repush succeeded after detecting truncation via list_recent_commits showing latest commit still at v2.84 close `2cdef219`. Production mutations (apply_migration + V-checks + close-the-loop) had completed before the truncated push attempt — repo state is consistent.
- **No `decisions.md` change** — Wave 0c apply is execution of v2.79-signed plan.

---

### 2026-05-19 Sydney morning — v2.84 close (brief)

cc-0017c v1.0 + v1.1 brief authored (commits `92f9e868` + `d3d8381f`); 2× D-01 fired (`a37eff28-...` partial→Path A satisfied by v1.1; `9e602a2d-...` partial type-c→Path C deferred). Production mutations 0. D-01 fires 2. T-MCP-02 73→75. Apply BLOCKED on fresh-session + PK approval. 4 new L-v2.84 candidates.

*(Full detail at `docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.85)

1. **Wave 0d brief authoring — friction.case triage/resolution SECURITY DEFINER functions** — P1 rank 1 NEW BLOCKING. service_role lost UPDATE on friction.case. Scope: `friction.triage_case`, `friction.resolve_case`, `friction.reopen_case`, `friction.purge_test_event`. PK scope confirmation required first.
2. **Reconciliation daily cadence diagnostic** — P1 rank 2. First post-cc-0017c cron 85 fire ≈2026-05-19 17:30 UTC.
3. **Health_check V-C3 + signal-production diagnostic** — P1 rank 3. V-C3 PENDING.
4. **Music library activation** — P2 rank 4.
5. **Platform Reconciliation View brief authoring** — P2 rank 5.

**Standing P0:** Personal businesses check-in. Crazy Domains follow-up carry from v2.51.

Carries: cc-0017c v1.2 doc patch (EXPANDED v2.85 — V-B4 12-param correction added); cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch (NEW P3); 22 close-the-loop outstanding; Dashboard PHASES 38th; minor doc patches; F-CRON-AUTO-APPROVER-SECRET-INLINE; lesson candidate promotions (L-v2.78-a + L-v2.81-a eligible; L-v2.83-a strong; L-v2.84-a/b/c/d watching; L-v2.85-a/b/c/d/e new).

---

## ⛔ Carried-forward "do not touch" state

**v2.85 update on standing items:**

- **cc-0017c migration applied:** version `20260519004545`. Production state: friction.event.source enforced by FK→friction.source(source_code); event_source_check CHECK gone; service_role SELECT-only on event + case.
- **cc-0017c smoke cleanup migration applied:** version `20260519005322`. Smoke `f4c94457-.../fd573ea1-...` removed via postgres-owner DELETE.
- **m.chatgpt_review row `d18fa6db-...`** (fresh D-01): status=resolved v2.85; verdict was AGREE empty/empty.
- **Friction Register Consolidation Plan Wave 0 COMPLETE.** Gates 1-10 CLOSED. Gate 11 (1-week observation window 2026-05-19 → 2026-05-26) ACTIVE. Gate 12 (Wave 0d) NEW BLOCKING.
- **Wave 0d triage/resolution SECURITY DEFINER functions** — NEW BLOCKING. Required before any friction.case state mutation workflow resumes.
- **m.chatgpt_review rows `a37eff28-...`, `9e602a2d-...`, `b612a8e4-...`, `a6415afa-...`, `adcc8385-...`** all status=resolved (unchanged from prior sessions).
- **cc-0017b APPLIED-WITH-CORRECTIVE v2.82 + v1.1 doc patch v2.83.** Unchanged.
- **cc-0017a APPLIED v2.81.** Unchanged.
- **cc-0014 CLOSED-ARCHIVED v2.77.** Unchanged.
- **cc-0015 friction-pool-view** (commit `9a5dc155`): Wave 7; now also gated on Wave 0d + 1-week window.
- **cc-0016 friction-capture-evidence** (commit `f35f8ea4`): Wave 8; now also gated on Wave 0d + Wave 7.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **PostgREST exposed_schemas includes `friction`** (carry).
- **cron 85 daily** (since v2.77). All crons unchanged. First cc-0017c-post-apply cron 85 fire expected ≈2026-05-19 17:30 UTC.
- **L58 BASELINE v2.76** carried (applied 1× v2.85 — 3-file close on retry).
- **L62 baseline-eligible v2.77** — exercised 1× v2.85.
- **L41 not exercised v2.85.** Cumulative v2.80-v2.85 = 6.
- **L40 exercised v2.85** — m.chatgpt_review column-name discipline maintained (lesson from v2.84 internalised).
- **L-v2.78-a / L-v2.81-a / L-v2.83-a candidates**: unchanged occurrence counts (L-v2.83-a +1 to 6+, STRONG CANDIDATE).
- **L-v2.84-a/b/c/d candidates**: 1 occurrence each (L-v2.84-d possibly auto-resolved by L40 in v2.85).
- **L-v2.85-a candidate (NEW v2.85)** — V-check function signature validation at brief authoring. HIGH-SIGNAL.
- **L-v2.85-b candidate (NEW v2.85)** — Inline V-check rewrite as Path 1 for brief-defect-during-apply.
- **L-v2.85-c candidate (NEW v2.85)** — SECURITY DEFINER bypass empirically confirmed post REVOKE-lockdown.
- **L-v2.85-d candidate (NEW v2.85)** — Postgres-owner cleanup migration when service_role lacks DELETE; Wave 0d helper recommendation.
- **L-v2.85-e candidate (NEW v2.85)** — Multi-file push_files response-construction length budget. Mitigation: compact payloads + no per-session duplication.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.85.
- **cc-0009 / cc-0010A / cc-0010B / cc-0010C / cc-0011 / cc-0012**: unchanged from v2.84.
- **22 close-the-loop UPDATEs outstanding** unchanged. v2.85's 1 new closed in-session.
- **T-MCP-02 quota: 76 cumulative v2.85** (+1 from v2.84).
- **State-capture exceptions cumulative: 1** (unchanged).
- Cron 82-86 firing normally.
- **Dashboard roadmap PHASES — 38th consecutive deferral.**
- M-series total dead-letter rows cleared since 8 May 2026: 396.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Cowork output pipeline V-C3 still PENDING.**
- **Production FAB live on dashboard.invegent.com** unchanged.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** (severity_override query-pattern note) carried.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md` written. This sync_state + action_list updated. `decisions.md` not touched. Dashboard PHASES 38th consecutive deferral. 3-file atomic sync via push_files (L58 baseline applied; L-v2.85-e learning captured re: retry after initial truncation).

**This file size**: ~24KB after this update (compacted for v2.85; L-v2.85-e mitigation applied).

---

*Last updated: 2026-05-19 Sydney morning — v2.85: cc-0017c APPLIED-WITH-VCHECK-CORRECTION. Migrations `20260519004545` + `20260519005322`. D-01 review_id `d18fa6db-...` (verdict=AGREE, status=resolved). 9/9 V-checks acceptable; V-B4 PK Path 1 inline rewrite with 12-param signature confirmed emit_event SECURITY DEFINER bypass functional post lockdown. Friction.* Wave 0 COMPLETE. T-MCP-02 75→76. State-capture exceptions 1 unchanged. Final state: event=29, case=29, source=3/3, NULL=21/act_now=1/track=7/closed_class=0/done=0. Wave 0d brief authoring NOW BLOCKING (P1 rank 1 next session). 5 new L-v2.85 candidates (L-v2.85-a HIGH-SIGNAL; L-v2.85-e captures truncated-push retry pattern). Dashboard PHASES 38th carried. Repushed cleanly after initial push_files truncation; no partial artefact landed on main.*
