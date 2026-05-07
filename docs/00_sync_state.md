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
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** Cron-backed drift logging confirmed live: jobid 80 fired 2026-05-06 17:00 UTC = 03:00 AEST 7 May, succeeded, wrote 49 rows under `c3446a47`. `m.ef_drift_log` 98 → 147. All 8 S30 criteria PASS. Class distribution stable across all 3 runs (A=16, A-LE=9, B-RR=5, B-FD=1, C=9, D=7, repo-only=2). 3 SD-risk rows = standing don't-redeploy three. v2.46 UTC/Sydney framing recorded as documentation-only error per PK directive (cron behaved as scheduled). Stage 2b brief authored at `docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md` — 12 sections, includes §1.5 Pre-flight discovery added per D-01 corrected_action. D-01 review `e0ab4a0b` returned partial/escalate (Lesson #62 echo pattern); incorporation chosen over override. Stage 3 + P1 SD triage held until Stage 2b ships. 0 production mutations. PK approval gate before CC hand-off. T-MCP-02 41 → 42. | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** 12 docs (`00_overview.md` + `01_*` through `11_*`) committed to `docs/dashboard-review-2026-05/` across 11 sequential turns from kickoff (2026-05-04). 5-section IA Option B locked. HYBRID Brief locked. 6 product primitives at contract level. 17 build-blockers as PK execution checklist (§11.4). 5-phase implementation plan ~44–54h. Zero production mutations. | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint + mid-hold audit + 4-way sync close. S30 deferred to natural cron fire. PP×YT + LinkedIn-PP clusters CLEARED; NY×YT STILL BLOCKED. F-AI-WORKER-PARSER-SKIP-BUG V3+V5 PASS, V4 INCONCLUSIVE. Lesson candidate #69 captured. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. Daily drift-check + 90-day retention crons applied. Two crons live (jobid 80 + 81). | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin investigation RESOLVED. Same chat session via `pg_stat_statements`. Stage 2a UNBLOCKED. Lesson candidate #68 captured. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — was BLOCKED on bef6be96; resolved + closed v2.44. drift-check EF v1.0.8 deployed. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | F-EF-DRIFT-PREVENTION Stage 1 APPLIED (backend foundation). 3 D-01 fires. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | F-EF-DRIFT-PREVENTION Tier 2 inventory LOCKED at 46/46 EFs. Option F APPROVED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse via dashboard `/connect`. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for + 147-row backfill) APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff (4 review rounds, 11-section structure, 6-section IA, 3 foundational decisions). | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 v1→v2; F-PUB-009 brief. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1; F-HISTORIC-DEAD-CLEANUP retired. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 root cause. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-07 Sydney — S30 PASS + Stage 2b kickoff (v2.47)

**Outcome:** S30 closed PASS (all 8 criteria). Cron-backed drift logging confirmed LIVE end-to-end. Stage 2b brief authored and D-01-reviewed; PK approval gate held before CC hand-off. 0 production mutations; hold-state respected throughout.

**S30 verification — 8/8 criteria PASS:**
- jobid 80 ran ✅ — runid 164707, `succeeded`, 2026-05-06 17:00:00 UTC (= 03:00 AEST 7 May Sydney)
- jobid 81 ran ✅ — runid 164756, `succeeded`, `DELETE 0`, 2026-05-06 17:15:00 UTC
- new `drift_check_run_id` ✅ — `c3446a47-2cb2-4ad4-b4f3-25059b324b25`
- 49 rows in new run ✅ (matches expected EF inventory)
- errors empty ✅ (all rows fully populated, no error severity)
- SD-risk count = 3 ✅ (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller` — exactly the standing don't-redeploy three)
- `vw_ef_drift_current` updated ✅ (all 49 rows now read `c3446a47`)
- no duplicate cron-driven scans ✅ (prior 2 scans were chat-authored 03:24/03:30 UTC, predate cron window)

**Net state change:** `m.ef_drift_log` 98 → **147 rows** (+49 from cron fire). 3 distinct runs total (`bef6be96` chat-traced + `a2124145` manual + `c3446a47` cron). Class distribution stable across all 3 runs: A=16, A-LE=9, B-RR=5, B-FD=1, C=9, D=7, repo-only=2.

**v2.46 UTC/Sydney framing recorded as documentation error only** per PK directive. Session opener misparsed v2.46 framing "first natural fire 17:00 UTC tonight" as 17:00 UTC 7 May (~17 hrs in future) when it actually referred to 17:00 UTC 6 May (the fire that had already succeeded). Cron behaved as scheduled. No system error.

**Stage 2b brief authored** at `docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md`:
- Target: `Invegent/invegent-dashboard`. Estimated CC effort: 1.5–2h.
- Goal: read-only operator panel reading `m.vw_ef_drift_current`, with 🚨 SD-risk pinned section + 4-card summary + Active drift section + collapsible Background observations.
- Interim location `/admin/ef-drift`, no top-nav link, Phase 4 B-09-36 will relocate to NOW > Investigate per `06_final_target_design.md` §6.9.
- §1.5 Pre-flight discovery added per D-01 corrected_action: CC must verify route convention, auth gate, UI library against actual repo before coding.
- 5 SQL verification queries chat will run post-deploy.

**D-01 review** `e0ab4a0b-3593-4323-ade5-076b90c1343b`: `partial` / `escalate=true` / risk `medium` / confidence `medium`. Pushback was Lesson #62 echo pattern (verbatim of self-disclosed weak evidence). `verified_claims` confirmed brief is read-only / no mutations. corrected_action ("add pre-flight discovery step") was sound and incorporated; not re-fired after incorporation. PK approval still required before CC hand-off because escalate=true. T-MCP-02 41 → 42.

**0 D-01 fires for production patches** this session (no apply work). 1 D-01 fire for plan_review. T-MCP-08 unchanged at 2.

**Closure budget:** ~2h chat. Trailing-14-day ~48h above 8.0 floor.

**4-way sync close at this commit:**
- Session file: `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md`
- Sync state (this file): inline summary refreshed; new index row added; next priorities updated; carry-forward updated for cron-LIVE state
- Action list: v2.47 bump (S30 closed; Stage 2b brief authored = Active; Today/Next 5 rebuilt)
- Memory: v2.47 entry queued via `memory_user_edits` after this commit

**Dashboard roadmap** (`app/(dashboard)/roadmap/page.tsx`) — separate small commit to bump `LAST_UPDATED`. PHASES array reconciliation deferred to dedicated session per v2.45/v2.46 carry.

**Open from this session:**
- **PK approval gate on Stage 2b brief** (D-01 escalate=true; chat does not auto-proceed).
- Dashboard roadmap PHASES reconciliation still deferred.
- `docs/audit/health/2026-05-06.md` still absent (P3).
- 18+ close-the-loop UPDATEs pending (this session's `e0ab4a0b` adds one).

**Hold-state respected throughout (no Stage 2b implementation, no Stage 3, no P1 triage, no NY×YT, no M6, no EF deploys, no cron triggers, no DDL/DML, no close-the-loop UPDATEs, no vault edits, no heygen-creator/poller/draft-notifier deploys). `m.ef_drift_log` 98 → 147 from expected cron fire only.**

---

## 🟡 Next session priorities (rebuilt for v2.47)

1. **PK approves Stage 2b brief** (gate) — review `docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md` §1.5 + §10 acceptance + D-01 record §12. Confirm or revise. Hand to CC.
2. **CC builds Stage 2b panel** — 1.5–2h. CC writes `2026-05-07-f-ef-drift-prevention-stage-2b-result.md` after build. Vercel auto-deploys main.
3. **Stage 2b post-ship verification** (chat) — run 5 SQL queries from brief §8 against live `/admin/ef-drift`. ~10 min.
4. **F-EF-DRIFT-PREVENTION Stage 3** (P1) — `scripts/safe-deploy.sh` consumes `m.vw_ef_drift_current` to gate redeploy. After Stage 2b is live and PK has inspected. ~30 min.
5. **P1 SECURITY-DEFINER regression-risk triage** (P1) — sequenced after Stage 2b live + Stage 3. Sync repo → deployed for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`.
6. **insights-worker P1 functional drift** (P1) — manual review (D-PREV-07).
7. **F-YT-NY-FORMAT-SELECTION** (P1) — BLOCKED until Stage 3 + P1 triage.
8. **M6 Phase A** (P1) — BLOCKED behind same gate.
9. **T05 Meta dev support contact** (P1-urgent).
10. **Personal businesses check-in** (P0).
11. **Dashboard Architecture Review Phase 0 prerequisites** (P1) — PK confirms 7 default-blockers in `11_final_consolidation.md` §11.4. Independent of Stage 2b/3 timeline.
12. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts. Closes via Phase 2 B-09-14 bulk approve.
13. **F-PUB-009 7-day flow check** (P2).
14. **F-AI-WORKER-PARSER-SKIP-BUG V4** — inconclusive at v2.45; either wait for natural skip or schedule synthetic test.
15. **Vault `service_role_key` naming hygiene scope-check** (P3).
16. **`docs/audit/health/2026-05-06.md` follow-up** (P3) — investigate if still absent.
17. **18+ close-the-loop UPDATEs pending** to `m.chatgpt_review` — next batch closure.
18. **Dashboard roadmap reconciliation** (deferred from v2.45/v2.46) — PHASES array hasn't been touched since 3 May; needs a dedicated session.
19. **`00_overview.md` 11-section table reconciliation** (carry from v2.46) — required updates specified in `11_final_consolidation.md` §11.1.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 (`instagram-publisher-every-15m`) `active=false` — do not re-enable until S16 + T05; when re-enabled, ~104 IG-overdue posts will fire (NY 41 + PP 57 + Invegent 6) — cap-throttle planning required
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 18+ review_ids close-the-loop pending (carry-over). Combine in next batch closure.
- 47 historic dead queue rows retained as audit trail (Phase 1.7 design)
- 32 historical `post_draft_not_found` orphans (16 NY-FB + 16 PP-FB) — M6 Phase A scope (BLOCKED)
- 6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts` — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design
- NDIS-Yarns LinkedIn slot `8f9e5c57-…` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- 108 historical Bug 3 fingerprint queue rows — intentionally retained as `queued`; M6 Phase A scope (BLOCKED)
- queue_id `ad573844-…` — dead-lettered; do not re-queue
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B scope
- 160 records previously flagged is_shadow=true lost flag metadata — acceptable, flag was inert
- 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent
- `is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai` — investigate post-drift-check infrastructure
- 13 drift cases active in priority buckets (v2.40 inventory)
- 2 repo-only directories (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction
- `docs/audit/health/2026-05-06.md` absent — Cowork 02:00 AEST cron did not push 6 May. P3 follow-up.
- **v2.47: cron-backed drift logging is LIVE.** jobid 80 + 81 active=true. First natural fire 2026-05-06 17:00 UTC succeeded. Next fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May.
- **v2.47: `m.ef_drift_log` retains 147 rows** (98 prior + 49 from cron fire). Keep-both per PK v2.43 decision. **Do not delete.**
- **v2.47: 3 distinct `drift_check_run_id` values** in `m.ef_drift_log` (`bef6be96` + `a2124145` + `c3446a47`).
- **v2.47: drift-check v1.0.8 LIVE.** Daily fire cron LIVE (jobid 80, 1 successful run). Retention cron LIVE (jobid 81, 1 successful run with `DELETE 0`).
- **v2.47: Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` — confirmed via fresh cron-driven scan, all 3 still SD-risk B-RR P1.
- **v2.47: Vault `service_role_key` 15-char value.** Confirmed non-blocking for drift-check (verify_jwt:false + auto-injected env). Other consumers not yet scope-checked. P3 hygiene cleanup logged.
- **v2.47: Dashboard roadmap PHASES array stale since 3 May.** No reconciliation in this session. Defer to dedicated session.
- **v2.47: Stage 2b brief drafted with PK approval gate** (D-01 escalate=true). Chat does not auto-proceed to CC hand-off.
- **v2.46: Dashboard Architecture Review COMPLETE.** 12 docs at `docs/dashboard-review-2026-05/`. 17 build-blockers as PK execution checklist. Phase 0 prerequisites (S30 + M5–M8 reconciliation + 7 confirm-defaults) gate Phase 0 start. **S30 cleared this session; M5–M8 + confirm-defaults remain.**
- **v2.46: `00_overview.md` 11-section table out-of-sync.** Required updates specified in `11_final_consolidation.md` §11.1; not applied at v2.47 close.
- **v2.46: Architecture review docs carry "Created 2026-05-06 (Sydney)" footer dating** based on UTC perspective during composition; actual Sydney close is 2026-05-07. 1-day discrepancy known; not retroactively fixed.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-07 Sydney — S30 PASS + Stage 2b kickoff (v2.47). Cron-backed drift logging LIVE. Next: PK approves Stage 2b brief, then CC builds, then chat verifies, then Stage 3.*
