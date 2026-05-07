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
| 2026-05-07 | p1-sd-triage-sync | **P1 SECURITY-DEFINER triage CLOSED (v2.50).** All 3 standing-three EFs now repo-aligned to deployed source via sync-only commits: `a83ab4c0` (draft-notifier, 77 lines, UNDER threshold), `448eeb30` (heygen-avatar-creator, 86 lines, UNDER), `5aefd6e6` (heygen-avatar-poller, 269 lines, OVER cond i; held → diff reviewed in chat against actual artifact → PK approved). 3 D-01 fires: `32ade261` advisory partial → STEP C.5 adopted; `9cbc7de3` verification partial → corrected_action verified empirically (surfaced orphan-RPC finding); `4a48024f` sync-close partial → non-testable corrected_action, PK override approved (state-capture exception). NEW finding F-HEYGEN-RPC-MIGRATIONS-MISSING P2 (4 orphan-deployed RPCs surfaced by diff review). NEW standing rule: acceptance integrity (generalised from v2.49 visual-acceptance integrity). Lesson #62 refinement: testable corrected_action → verify; non-testable → override. T-MCP-02 44 → 47. State-capture exceptions v2.50: 1. 0 production mutations chat-side. | `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md` |
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** `scripts/safe-deploy.sh` live. CC commit `3d43796`. §1.5 schema delta adapted (`function_name` → `slug`, `class` → `current_class`); curl + `exec_sql` RPC connection method. All 8 acceptance tests PASS. Above-spec defensive additions: SQL-injection guard, standing-three pre-DB ordering, unknown-class fallback. 2 D-01 fires (brief + read-only verification, both PASS). T-MCP-02 42 → 44. P1 SECURITY-DEFINER triage trio NEWLY UNBLOCKED. v2.49 manifest folded: 5th-deferral correction, visual-acceptance integrity standing rule, AI cost view P3, cc-0001 parenthetical. Hold-state respected; 0 production mutations chat-side. | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED on desktop (v2.48).** CC commit `66aea99` (dashboard) + `9564297` (result file). Live at `dashboard.invegent.com/ef-drift`. 5/5 SQL V1–V5 PASS. PK visual acceptance 7/7 desktop checks PASS. Stage 3 + P1 SECURITY-DEFINER triage trio NEWLY UNBLOCKED. | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** Cron-backed drift logging confirmed live. | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** 12 docs at `docs/dashboard-review-2026-05/`. | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint. PP×YT + LinkedIn-PP CLEARED; NY×YT STILL BLOCKED. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin RESOLVED. Stage 2a UNBLOCKED. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | Stage 2a CHECKPOINT. drift-check EF v1.0.8 deployed. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | Stage 1 APPLIED. 3 D-01 fires. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | Tier 2 inventory LOCKED. Option F APPROVED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED via dashboard `/connect`. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-07 Sydney — P1 SECURITY-DEFINER triage CLOSED (v2.50)

**Outcome:** P1 SECURITY-DEFINER regression-risk triage closed end-to-end. All three standing-three Edge Functions now have repo source aligned to deployed source via three sync-only commits on main. v2.49 Stage 3 ship (`scripts/safe-deploy.sh`) was the prerequisite that made this triage safe — gate remained mechanically active throughout.

**Closure artifacts:**
- `a83ab4c0` chore(sync): align draft-notifier (77 lines, UNDER threshold)
- `448eeb30` chore(sync): align heygen-avatar-creator (86 lines, UNDER threshold)
- `5aefd6e6` chore(sync): align heygen-avatar-poller (269 lines, OVER cond i; held → diff reviewed in chat against actual artifact → PK approved)

**STEP C.5 threshold checkpoint** (>100 lines OR >50% size delta → STOP, report full diff, wait for explicit `proceed with <ef> sync` phrase) was adopted from D-01 advisory `32ade261` corrected_action and worked exactly as designed: pair under-threshold autocommitted, third over-threshold held until PK reviewed actual diff.

**3 D-01 fires (T-MCP-02 44 → 47):**
- `32ade261-5f99-4c75-a643-5a20c7c978ae` advisory: partial → STEP C.5 adopted; no re-fire per PK
- `9cbc7de3-537f-425c-8e77-b1245a76a2e1` verification: partial → corrected_action verified empirically; surfaced **F-HEYGEN-RPC-MIGRATIONS-MISSING (P2)** as real adjacent finding
- `4a48024f-e361-4876-b5a0-89651eb7c662` sync-close: partial → non-testable corrected_action; PK override approved (state-capture exception count v2.50: 1)

**NEW finding:** F-HEYGEN-RPC-MIGRATIONS-MISSING (P2). Four RPCs called by heygen-avatar-poller v2.0.0 deployed source (`store_gen_poll_response`, `advance_avatar_to_creating`, `complete_avatar_training`, `fail_avatar_generation`) not present in repo migrations. Pre-existing orphan-deployed drift surfaced by diff review. ~30 min next session: `pg_get_functiondef` (read-only) + new migration file.

**NEW STANDING RULE — Acceptance integrity (generalised from v2.49 visual-acceptance integrity):** Acceptance is not complete until actual review artifact is received and reviewed regardless of artifact type — visual, diff, log, command output, screen capture, or otherwise. "Looks good" / "passed" / "matches" signal alone NOT sufficient. Chat does not advance state on unverified summary. Empirically validated this session: STEP C.5 held heygen-avatar-poller until full diff was in chat, which is what surfaced the orphan-RPC finding.

**Lesson #62 refinement (v2.50):** When corrected_action is **low-cost and testable** → prefer empirical verification over override. When **non-testable** → override remains default (with PK approval as state-capture exception). Two empirical proofs this session: fire #2 testable → verified → real finding logged; fire #3 non-testable → override approved.

**Closure budget:** ~1.5h chat. Day total v2.47+v2.48+v2.49+v2.50 ~6.0h. Trailing-14-day ~52h above 8.0 floor. ~6 P0+P1 open (was ~7).

**Closures this session:**
- F-EF-DRIFT-PREVENTION P1 SECURITY-DEFINER triage → CLOSED (3 sync commits as artifacts)

**Newly unblocked:**
- **insights-worker P1 functional drift** — was sequenced after triage trio; now next-session #1
- **F-YT-NY-FORMAT-SELECTION** (carry-forward) — was BLOCKED behind P1 SD triage; now unblocked
- **M6 Phase A** (carry-forward) — was BLOCKED behind P1 SD triage; now unblocked

**4-way sync close at this commit:**
- Session file: `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md`
- Sync state (this file): refreshed v2.50
- Action list: v2.50 bump (P1 SD triage closed; F-HEYGEN-RPC-MIGRATIONS-MISSING P2 added; Today/Next 5 rebuilt; new acceptance-integrity standing rule + Lesson #62 refinement)
- Memory: v2.50 entry committed separately
- Brief retroactive commit: `docs/briefs/cc-0002-p1-sd-triage-sync.md` folded into same v2.50 commit so three sync commits' citations resolve

**Hold-state respected throughout.** 0 EF redeploys, 0 SQL DDL/DML, 0 cron changes, STANDING_THREE array unchanged.

**Open from this session:**
- F-HEYGEN-RPC-MIGRATIONS-MISSING P2 (NEW) — ~30 min next session
- Filename-only scan caveat for orphan-RPC finding (not file-content grep)
- Standard CC paste-back chain rather than chat-direct execution
- Dashboard roadmap PHASES — **6th** consecutive deferral (corrected from v2.49 5th)
- 18+ close-the-loop UPDATEs to `m.chatgpt_review`; v2.50 adds 3 more (`32ade261` + `9cbc7de3` + `4a48024f`); cumulative 21+

---

## 🟡 Next session priorities (rebuilt for v2.50)

1. **insights-worker P1 functional drift** (P1 TOP, NEWLY UNBLOCKED) — manual review by PK. Deployed v14.0.0 vs repo v1.6.0. D-PREV-07: manual review, no auto-sync.
2. **Personal businesses check-in** (P0 standing).
3. **Dashboard Architecture Review Phase 0 prerequisites** (P1) — 7 confirm-defaults via `cc-0001-dashboard-phase-0-defaults.md` + M5–M8 reconciliation. Independent of insights-worker timeline; can run in parallel.
4. **F-HEYGEN-RPC-MIGRATIONS-MISSING** (P2 NEW v2.50) — `pg_get_functiondef` (read-only) + new migration file for 4 orphan-deployed RPCs. ~30 min.
5. **AI cost view P3** (carry from v2.49) — `vw_ai_cost_monthly` + NOW dashboard tile. ~1h.
6. **F-YT-NY-FORMAT-SELECTION** (P1, NEWLY UNBLOCKED) — read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes.
7. **M6 Phase A** (P1, NEWLY UNBLOCKED) — 108 historical Bug 3 dead-letter; coordinate with M-09-03 view definition.
8. **Dashboard mobile responsiveness — system-wide** (P3).
9. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts; closure target = architecture review Phase 2 B-09-14.
10. **F-PUB-009 7-day flow check** (P2).
11. **F-AI-WORKER-PARSER-SKIP-BUG V4** — inconclusive.
12. **Vault `service_role_key` naming hygiene scope-check** (P3).
13. **`docs/audit/health/2026-05-06.md` follow-up** (P3, still absent).
14. **18+ close-the-loop UPDATEs** to `m.chatgpt_review` — next batch closure (v2.50 adds 3 more; cumulative 21+).
15. **Dashboard roadmap reconciliation** (P3, **6th** consecutive deferral).
16. **`00_overview.md` 11-section table reconciliation** (P3, carry from v2.46).

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 (`instagram-publisher-every-15m`) `active=false` — do not re-enable until S16 + T05; ~104 IG-overdue posts will fire when re-enabled
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 21+ review_ids close-the-loop pending (v2.50 adds 3 more)
- 47 historic dead queue rows retained as audit trail
- 32 historical `post_draft_not_found` orphans (16 NY-FB + 16 PP-FB) — M6 Phase A scope (NEWLY UNBLOCKED v2.50)
- 6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts` — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design
- NDIS-Yarns LinkedIn slot `8f9e5c57-…` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- 108 historical Bug 3 fingerprint queue rows — M6 Phase A scope (NEWLY UNBLOCKED v2.50)
- queue_id `ad573844-…` — dead-lettered; do not re-queue
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B scope
- 160 records previously flagged is_shadow=true lost flag metadata — acceptable
- 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 — latent
- `is_shadow: true` JSONB residue in `m.post_draft.draft_format.ai`
- 13 drift cases active in priority buckets (v2.40 inventory)
- 2 repo-only directories (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction
- `docs/audit/health/2026-05-06.md` absent — Cowork did not push 6 May. P3.
- **Cron-backed drift logging is LIVE.** jobid 80 + 81 active=true.
- **`m.ef_drift_log` retains 147 rows** (next fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May → 196 rows expected).
- **3 distinct `drift_check_run_id` values** (`bef6be96` + `a2124145` + `c3446a47`).
- **drift-check v1.0.8 LIVE.**
- **Standing don't-redeploy three** (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — confirmed via cron-driven scan AND mechanically encoded in `scripts/safe-deploy.sh` STANDING_THREE array. v2.50: repo source NOW aligned to deployed for all three; standing-three list unchanged.
- **Vault `service_role_key` 15-char value.** Confirmed non-blocking for drift-check. P3 hygiene cleanup logged.
- **Dashboard roadmap PHASES array stale since 3 May. SIXTH consecutive deferral** (corrected v2.50 from v2.49's 5th).
- **v2.49: `scripts/safe-deploy.sh` LIVE.** Pre-deploy gate consuming `m.vw_ef_drift_current`. Hard-blocks standing three. CC commit `3d43796`. Read-only D-01 verification PASS.
- **v2.50: P1 SECURITY-DEFINER triage CLOSED.** Three sync-only commits as closure artifacts. Standing-three list unchanged. 0 production mutations.
- **v2.50 NEW STANDING RULE — Acceptance integrity (generalised from v2.49).** Acceptance not complete until actual review artifact received and reviewed regardless of artifact type. "Looks good" / "passed" / "matches" signal alone insufficient. Chat does not advance state on unverified summary.
- **v2.50 Lesson #62 refinement.** When corrected_action is low-cost and testable → verify empirically. When non-testable → override remains default with PK approval as state-capture exception. Two empirical proofs this session.
- **v2.50 NEW (P2) — F-HEYGEN-RPC-MIGRATIONS-MISSING.** Four RPCs called by heygen-avatar-poller v2.0.0 deployed source not in repo migrations. Pre-existing orphan-deployed drift. ~30 min next session.
- **v2.49 NEW (P3) — AI cost view.** `vw_ai_cost_monthly` view + NOW dashboard tile. ~1h estimate. Carry to v2.50.
- **v2.48: Stage 2b SHIPPED + ACCEPTED on desktop.** Live at `dashboard.invegent.com/ef-drift`.
- **v2.46: Dashboard Architecture Review COMPLETE.** 12 docs at `docs/dashboard-review-2026-05/`. 17 build-blockers. Phase 0 prerequisites: M5–M8 reconciliation + 7 confirm-defaults remain. cc-0001 brief-runner-v0 cycle #1 still open and unexecuted.
- **v2.46: `00_overview.md` 11-section table out-of-sync.** Required updates in `11_final_consolidation.md` §11.1.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-07 Sydney — P1 SECURITY-DEFINER triage CLOSED (v2.50). 3 sync-only commits as closure artifacts. F-HEYGEN-RPC-MIGRATIONS-MISSING P2 logged. NEW standing rule: acceptance integrity (generalised). Lesson #62 refinement: testable → verify, non-testable → override. T-MCP-02 44 → 47. State-capture exceptions v2.50: 1. 0 production mutations chat-side.*
