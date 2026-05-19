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
| 2026-05-19 | v2.87-cc0017d-v1.1-doc-patch | **cc-0017d v1.1 doc-only patch CLOSED** at commit `f0367405c04dd21e4e08bc4c8beebd4d77635229`. Exactly 4 files patched + read-back verified (blob SHAs match push_files response): main brief v1.0→v1.1; `migration-sql.md` v1.1 Addendum (24× RAISE %%→% + 6× ROWTYPE quoting + Path B-prime + L-v2.86-a pre-apply discipline; v1.0 SQL preserved as authored); `vchecks.md` v1.1 Addendum (Drift 1 direct-INSERT fallback + Drift 2 mark_duplicate internal-prefix audit + Drift 3 corrective cleanup v2; corrected V-F1 matrix; recommended V-Z3); `lessons-metadata-changelog.md` lessons reconciled to authoritative v2.86 a–e set per sync_state. **No production mutations. No D-01 fire. No Wave 0e work started.** cc-0017d v1.1 source-of-truth now matches v2.86 production apply / V-check reality. Sync close itself used 1+2 split commit per L-v2.85-e mitigation (per-session standalone `786fb9be` + this atomic 2-file push_files). T-MCP-02 cum ~85 unchanged. State-capture exceptions 1 unchanged. Dashboard PHASES 40th consecutive deferral carried. No new lesson exercises (L-v2.85-e re-applied, 2nd occurrence). Wave 0e promoted rank 2 P2 → rank 1 P1; next task. | `docs/runtime/sessions/2026-05-19-cc0017d-v1.1-doc-patch.md` |
| 2026-05-19 | v2.86-cc0017d-applied-with-vcheck-correction | cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION. 6 SECURITY DEFINER mutation functions deployed. Path B-prime (24 RAISE %%→% + 6 ROWTYPE quoting). 22/23 V-checks strict PASS + V-F1 PARTIAL (PK-disposition). V-F1 cleanup v2 removed 1 row. D-01 `206d2258-...` AGREE. Plan gate 12 CLOSED. 5 new L-v2.86 candidates. T-MCP-02 cum ~85. | `docs/runtime/sessions/2026-05-19-cc0017d-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.85-cc0017c-applied-with-vcheck-correction | cc-0017c APPLIED-WITH-VCHECK-CORRECTION. Migration `20260519004545` + cleanup `20260519005322`. Fresh D-01 `d18fa6db-...` AGREE. 9/9 V-checks acceptable. V-B4 PK Path 1 inline rewrite with 12-param emit_event signature confirmed SECURITY DEFINER bypass post lockdown. Friction.* Wave 0 (0a+0b+0c) COMPLETE. T-MCP-02 75→76. 5 new L-v2.85 candidates. | `docs/runtime/sessions/2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md` |
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
| 2026-05-13 | cc-0012-closed-with-variance | cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71). | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70). | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69). | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |

*(Older sessions truncated for brevity.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-19 Sydney evening — v2.87: cc-0017d v1.1 doc-only patch CLOSED

**Outcome:** cc-0017d v1.1 doc-only patch **CLOSED** at commit `f0367405c04dd21e4e08bc4c8beebd4d77635229`. Exactly 4 files patched and read-back verified — blob SHAs match the push_files response byte-for-byte. **No production mutations. No D-01 fire. No Wave 0e work started.** cc-0017d v1.1 source-of-truth now matches the v2.86 production-apply / V-check reality.

**v1.1 doc patch scope (4 files, commit `f0367405`):**
- `docs/briefs/cc-0017d-friction-case-mutation-functions.md` (`04b1edf1…`) — header v1.0→v1.1; status CLOSED-APPLIED-WITH-VCHECK-CORRECTION; v1.1 patch summary block; structure-table v1.1 notes; `purge_test_case` + `Loose resolve_case` annotations.
- `docs/briefs/cc-0017d/migration-sql.md` (`2a8e0287…`) — v1.1 Addendum at top (Substitution class 1: 24× RAISE `%%`→`%`; class 2: 6× `friction.case%ROWTYPE` → `friction.\"case\"%ROWTYPE`; Path B-prime sequence; L-v2.86-a HIGH-SIGNAL pre-apply discipline). v1.0 SQL preserved as authored below. Function 4 + 6 COMMENT updates; mark_duplicate v1.1 inline note.
- `docs/briefs/cc-0017d/vchecks.md` (`15b924fe…`) — v1.1 Addendum at end (Drift 1 direct-INSERT fallback; Drift 2 mark_duplicate internal-prefix audit `cc-0017d/mark_duplicate/…`; Drift 3 corrective cleanup v2 pattern). Fixture-naming slash vs hyphen convention reaffirmed. Corrected V-F1 expected matrix. Recommended V-Z3 cross-check.
- `docs/briefs/cc-0017d/lessons-metadata-changelog.md` (`ec292723…`) — lesson numbering reconciled to authoritative v2.86 a–e: L-v2.86-a HIGH-SIGNAL NEW from apply; -b REALISED; -c NEW from apply; -d REALISED; -e NEW from apply. v1.0 draft "legacy/new coexistence" candidate retired/not-promoted. Metadata + v1.1 changelog.

**Out of scope at v1.1 (unchanged from v1.0):** `risks-and-grants.md`, `preflight-pset.md`, `hardstop-rollback.md`, `d01-postapply-deferred.md`. Latter is now historical record (D-01 `206d2258-…` fired+resolved at v2.86).

**Sync close mechanics this session:**
1. v1.1 doc patch commit `f0367405…` had landed in the prior turn before compaction. This session's task was the doc-patch close only — no redundant commit issued.
2. Read-back verification: 4× GET against `main` → all blob SHAs matched push_files response byte-for-byte; spot-checks confirmed v1.1 content in each file.
3. PK directive received for sync close — 3 files: per-session detail + sync_state v2.87 + action_list v2.87. Recording requirements specified.
4. Per L-v2.85-e split-commit mitigation, 1+2 split applied: per-session detail standalone (`docs/runtime/sessions/2026-05-19-cc0017d-v1.1-doc-patch.md`, commit `786fb9be…`) + this atomic 2-file push_files (sync_state + action_list).
5. Wave 0e brief authoring deferred until this sync close verifies cleanly — opens as the next task post-verification.

**Production mutations v2.87: 0.** Schema state end of v2.87 = schema state end of v2.86.

**D-01 fires v2.87: 0.** Doc-only patch + sync close — no production action.

**T-MCP-02 cum: ~85 unchanged** (read-only GETs against `main` do not consume the budget).

**State-capture exceptions cumulative: 1 unchanged.**

**Items closed v2.87:**
- cc-0017d v1.1 doc patch (P1 rank 1 NEW v2.86) → **CLOSED** ✅ at commit `f0367405`

**Items promoted v2.87:**
- **Wave 0e — case history / audit brief authoring** — rank 2 P2 v2.86 → **rank 1 P1 v2.87**. Next task. Opens immediately after this sync close verifies cleanly.

**Lesson outcomes v2.87:**
- **No new lesson exercises.** Doc-only patch + sync close: no production action, no V-check, no D-01 cycle, no new empirical evidence.
- **L-v2.85-e mitigation re-applied** — 2nd consecutive occurrence (v2.86 + v2.87). Both close cycles used 1+2 split rather than single-atomic 3-file push_files. Promotion-eligible after one more cycle.
- No new L-v2.87 candidates surfaced.

**v2.87 honest limitations:**
- **Doc-only patch + sync close.** No production schema change, no migration applied, no V-check run, no fresh empirical evidence. v2.87 changes are purely at the docs-tree layer.
- **v1.0 SQL preserved verbatim in `migration-sql.md` below the v1.1 Addendum.** Future authors using this brief as a template MUST apply both substitution classes before any production apply attempt. v1.1 Addendum at the top flags this loudly.
- **V-D-setup block in `vchecks.md`** still shows the `emit_event` path as the documented setup, with inline v1.1 note + addendum-end Drift 1 documenting the fallback direct-INSERT path. Future-author convention: when `emit_event` emission_rule rejects test-prefix payloads, fall back to direct INSERT and document at the V-D-setup block.
- **V-Z3 cross-check not retroactively added** to cc-0017d V-checks (recommended in the v1.1 Addendum for future briefs introducing a `mark_duplicate`-class function; v2.86 corrective cleanup v2 already resolved the residue empirically for cc-0017d).
- **1+2 split commit pattern** carries the L58 atomic-close-the-loop / L-v2.85-e length-budget trade-off into v2.87 as well. Per-session detail and sync_state+action_list bumps are causally one logical close split into two commits for response-truncation safety.
- **Wave 0e is the next active item but is not started in this session.**
- **22 outstanding close-the-loop UPDATEs** unchanged. No new D-01 fires in v2.87.
- **Memory cap 19/30** unchanged.
- **Dashboard PHASES 40th deferral** carried (was 39 at v2.86; +1 at v2.87 = 40). No file-touch.
- **T-MCP-02 cum ~85** unchanged.
- **State-capture exceptions cum 1** unchanged.
- **No decisions.md change.**

---

### 2026-05-19 Sydney evening — v2.86 close (brief)

cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION. 6 SECURITY DEFINER case-mutation functions deployed via Path B-prime (24 RAISE %%→% + 6 ROWTYPE quoting inline fixes). 22/23 V-checks strict PASS + V-F1 PARTIAL (PK-disposition: brief-expectation drift, not migration failure). V-F1 corrective cleanup v2 removed exactly 1 leftover audit row. Final residue zero across 8 cross-checks; total_cases=29 baseline preserved. D-01 review_id `206d2258-...` AGREE; closed-the-loop. Plan gate 12 CLOSED. 5 new L-v2.86 candidates (a HIGH-SIGNAL).

*(Full detail at `docs/runtime/sessions/2026-05-19-cc0017d-applied-with-vcheck-correction.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.87)

1. **Wave 0e — case history / audit brief authoring** — **P1 (rank 1, PROMOTED from rank 2 P2 v2.86)**. cc-0017d v1.1 doc patch closed v2.87 → Wave 0e is the next active item. Likely sub-files following cc-0017a/b/c/d multi-file precedent. Audit-trail and event-replay design. PK scope confirmation expected at session start.
2. **Reconciliation daily cadence diagnostic** — **P1 (rank 2 v2.87)** carried. First post-cc-0017d cron 85 fire pending; check after fire lands.
3. **Health_check V-C3 + signal-production diagnostic** — **P1 (rank 3 v2.87)** carried. V-C3 still PENDING.
4. **Platform Reconciliation View brief authoring** — **P2 (rank 4 v2.87)** carried. PK greenlight required.
5. **Dashboard PHASES sync** — **P2 (rank 5 v2.87)** carried. 40th consecutive deferral. Discipline call overdue.

**Standing P0:** Personal businesses check-in. Crazy Domains follow-up carry from v2.51.

Carries: cc-0017c v1.2 doc patch (EXPANDED v2.85); cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; 22 close-the-loop outstanding; Dashboard PHASES 40th deferral; minor doc patches; F-CRON-AUTO-APPROVER-SECRET-INLINE; lesson promotions (L-v2.78-a + L-v2.81-a eligible; L-v2.83-a STRONG; L-v2.84-a/b/c/d watching; L-v2.85-a/b/c/d/e watching with proactive applications + L-v2.85-e re-applied 2× consecutive v2.87; L-v2.86-a/b/c/d/e watching — all live in cc-0017d v1.1 brief now).

---

## ⛔ Carried-forward "do not touch" state

**v2.87 update on standing items:**

- **cc-0017d v1.1 doc patch CLOSED v2.87** at commit `f0367405c04dd21e4e08bc4c8beebd4d77635229`. 4 files patched: main brief (v1.0→v1.1), migration-sql.md (v1.1 Addendum top, v1.0 SQL preserved), vchecks.md (v1.1 Addendum end), lessons-metadata-changelog.md (lessons reconciled to v2.86 a–e). cc-0017d v1.1 source-of-truth = production apply / V-check reality.
- **cc-0017d migration applied v2.86** — unchanged. `cc_0017d_friction_case_mutation_functions`. 6 SECURITY DEFINER mutation functions live; postgres-owner; search_path=friction,public; out_-prefix discipline on RETURNS TABLE columns.
- **cc-0017d V-check artefacts** — unchanged from v2.86. V-D-setup seed + cleanup v1 (zero-effect) + cleanup v2 (1 row removed). Final residue zero across all 8 cross-checks.
- **m.chatgpt_review row `206d2258-...`** — unchanged from v2.86. resolved_by `cc-0017d-close-v2.86`; status `completed`; verdict `agree`.
- **Friction Register Consolidation Plan gate 12** (Wave 0d) → CLOSED v2.86 (unchanged v2.87).
- **Gate 11** (1-week observation window 2026-05-19 → 2026-05-26) ACTIVE. Day 1 of 7 → Day 1 of 7 (v2.87 same calendar day as v2.86 close; no elapsed observation time).
- **Gate 13** (Wave 0e case history / audit) **OPEN; next task v2.87+**.
- **Wave 0e** — case history/audit — **P1 (PROMOTED rank 2 P2 → rank 1 P1 v2.87)**. NOT yet started.
- **m.chatgpt_review rows `d18fa6db-...`, `a37eff28-...`, `9e602a2d-...`, `b612a8e4-...`, `a6415afa-...`, `adcc8385-...`** all status=resolved (unchanged from prior sessions).
- **cc-0017c APPLIED-WITH-VCHECK-CORRECTION v2.85** unchanged.
- **cc-0017b APPLIED-WITH-CORRECTIVE v2.82 + v1.1 doc patch v2.83.** Unchanged.
- **cc-0017a APPLIED v2.81.** Unchanged.
- **cc-0014 CLOSED-ARCHIVED v2.77.** Unchanged.
- **cc-0015 friction-pool-view** (Wave 7, commit `9a5dc155`): Wave 0d gate cleared v2.86; still gated on 1-week observation window closing 2026-05-26.
- **cc-0016 friction-capture-evidence** (Wave 8, commit `f35f8ea4`): Wave 0d gate cleared v2.86; still gated on Wave 7 sequencing.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **PostgREST exposed_schemas includes `friction`** (carry).
- **cron 85 daily** (since v2.77). First cc-0017d-post-apply cron 85 fire pending.
- **L58 BASELINE v2.76** carried (applied 1× v2.87 — 1+2 split close per L-v2.85-e).
- **L62 baseline-eligible v2.77** — not exercised v2.87 (no D-01 cycle).
- **L41 not exercised v2.87** for non-friction schemas. Cumulative v2.80-v2.87 = 6 unchanged.
- **L40 not exercised v2.87** (no DML against m.chatgpt_review).
- **L46 not exercised v2.87** (no fresh D-01).
- **L-v2.78-a / L-v2.81-a / L-v2.83-a candidates**: L-v2.83-a unchanged at 7+ STRONG.
- **L-v2.84-a/b/c/d candidates**: not re-exercised v2.87.
- **L-v2.85-a/b/c/d/e candidates**: L-v2.85-e re-applied v2.87 (2nd consecutive occurrence; promotion-eligible after one more cycle). Others not re-exercised v2.87.
- **L-v2.86-a/b/c/d/e candidates**: all now live in cc-0017d v1.1 brief on `main`. Watching.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.87.
- **cc-0009 / cc-0010A / cc-0010B / cc-0010C / cc-0011 / cc-0012**: unchanged from v2.86.
- **22 close-the-loop UPDATEs outstanding** unchanged. v2.87 added 0.
- **T-MCP-02 quota: ~85 cumulative v2.87** unchanged from v2.86 (read-only GETs against `main` do not consume).
- **State-capture exceptions cumulative: 1** unchanged.
- Cron 82-86 firing normally.
- **Dashboard roadmap PHASES — 40th consecutive deferral.** No file-touch this session.
- M-series total dead-letter rows cleared since 8 May 2026: 396.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Cowork output pipeline V-C3 still PENDING.**
- **Production FAB live on dashboard.invegent.com** unchanged.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** (severity_override query-pattern note) carried.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-19-cc0017d-v1.1-doc-patch.md` written first as standalone commit (`786fb9be`). This sync_state + action_list updated in atomic 2-file push_files commit. `decisions.md` not touched. Dashboard PHASES 40th consecutive deferral — no file-touch. L-v2.85-e mitigation re-applied (2nd consecutive occurrence v2.86 + v2.87; 1+2 split commits instead of single 3-file atomic; trade L58 strict atomicity for length-budget safety).

**This file size**: ~28KB after this update.

---

*Last updated: 2026-05-19 Sydney evening — v2.87: cc-0017d v1.1 doc-only patch CLOSED at commit `f0367405c04dd21e4e08bc4c8beebd4d77635229`. Exactly 4 files patched and read-back verified. No production mutations. No D-01 fire. No Wave 0e work started. cc-0017d v1.1 source-of-truth now matches v2.86 production apply / V-check reality. Wave 0e brief authoring promoted rank 2 P2 → rank 1 P1; next task. T-MCP-02 cum ~85 unchanged. State-capture exceptions cumulative 1 unchanged. Dashboard PHASES 40th deferral carried. No new lesson exercises (L-v2.85-e re-applied 2nd occurrence). Per-session detail at commit `786fb9be`. Sync close via 1+2 split commits per L-v2.85-e mitigation.*
