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
| 2026-05-07 | s30-paused-stuck-cluster-recheck | **Lightweight checkpoint.** S30 deferred to natural cron fire (~11.5h, 17:00 UTC tonight). Read-only re-evaluation: PP×YT + LinkedIn-PP clusters CLEARED (4 PP×YT publishes confirmed 05-05 09:15–09:45 UTC, no invalid_grant 7d); NY×YT STILL BLOCKED by F-YT-NY-FORMAT-SELECTION (8 text-format ready rows + 2 latent dead avatar tests); Invegent IG backlog same root cause as NY/PP IG (jobid 53 paused, ~104 total overdue when T05 unblocks). No NULL scheduled_for. Active publisher crons all green. F-AI-WORKER-PARSER-SKIP-BUG V3 PASS (28 jobs, 0 bug fingerprints); V5 PASS (4/4 sched written); V4 INCONCLUSIVE (no natural skip in 48h). Zero production mutations. ~35 min closure. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. Daily drift-check + 90-day retention crons applied via Supabase MCP per D170 (D-01 review `c261e338` agree, no pushback). Two crons live (jobid 80 + 81). All 7 PK verification criteria PASS including dry-run smoke. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin investigation RESOLVED. `pg_stat_statements` traced to same `postgres` DB role + chat-authored SQL fingerprint as v2.42 chat session itself. PK keep-both decision documented. Stage 2a UNBLOCKED. Lesson candidate #68 captured. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — was BLOCKED on bef6be96 origin investigation; resolved + closed v2.44. drift-check EF v1.0.8 deployed (commit `d81de062`). T-MCP-02 37→40; T-MCP-08 1→2. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | F-EF-DRIFT-PREVENTION **Stage 1 APPLIED** (backend foundation). 3 D-01 fires. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | F-EF-DRIFT-PREVENTION Tier 2 inventory LOCKED at 46/46 EFs. Option F APPROVED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse via dashboard `/connect`. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for + 147-row backfill) APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
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

### 2026-05-07 Sydney — S30 Paused / Stuck-Cluster Recheck Checkpoint

**Outcome:** Lightweight checkpoint. S30 deferred to natural cron fire (~11.5h away, 17:00 UTC). Read-only stuck-cluster re-evaluation + parser-skip-bug forward acid test. Zero production mutations.

**S30 status:**
- jobid 80 (`drift-check-daily-fire`) and jobid 81 (`ef-drift-log-retention-90d`) both `active=true`, 0 runs ever in `cron.job_run_details` (correct — first natural fire is 17:00 UTC tonight)
- Cron infrastructure healthy: `pipeline-sentinel-every-15m` succeeded 1 min ago at 04:45 UTC
- Run S30 around 17:15 UTC / 03:15 AEST tomorrow

**3 stuck-item clusters re-evaluation:**
| Cluster | v2.42 state | Now |
|---|---|---|
| PP×YT | UNEXPECTED stuck; 4 drafts stalled | ✅ **CLEARED.** 4 publishes 05-05 09:15–09:45 UTC, real platform_post_ids, all `attempt_no=1` |
| LinkedIn-PP residual | residual concerns | ✅ **CLEARED.** 17 PP-LI publishes/7d, 2/24h, 0 failed |
| NY×YT | UNEXPECTED stuck; format-selection bug | ⚠️ **STILL BLOCKED.** 8 ready rows all `format=text`; F-YT-NY-FORMAT-SELECTION still gating per existing block chain |

**Side findings:**
- Invegent IG 6 queued rows attempts=0 — same root cause as NY-IG/PP-IG (jobid 53 paused, intentional carry-forward). Combined ~104 IG-overdue when T05 unblocks; cap-throttle planning needed.
- 32 historical `post_draft_not_found` orphans (16 NY-FB + 16 PP-FB) = expected M6 Phase A scope state.
- Several CFW drafts went `approval_status='dead'` post-ai-worker (downstream issue, not ai-worker scope).
- Invegent has no `c.client_channel` rows but FB/LI publish fine — different routing mechanism, not blocking.

**F-AI-WORKER-PARSER-SKIP-BUG forward acid test:**
- **V3 PASS** — 28 ai_jobs across 14 client/platform combos in 48h; 0 V3 bug fingerprints (`skip=true ∧ body present`)
- **V5 PASS** — 4 drafts progressed to queue; 4/4 have `scheduled_for` non-null
- **V4 INCONCLUSIVE** — 0 natural skip events in window; skip path not exercised by current data. Not a bug, just absence of trigger.

**Health checks:**
- Invalid_grant errors last 7d: **0**
- NULL `scheduled_for` (active rows): **0**
- Active publisher crons all green (FB, LI, YT, WP, enqueuer + `instagram-publisher-every-15m` paused intentionally)

**Closure budget:** +~35 min this checkpoint. Combined day ~10h. Trailing-14-day ~36.25h above 8.0 floor.

**0 D-01 fires this session** (read-only). T-MCP-02 quota unchanged at 41.

**Hold-state in effect (per PK):**
- No Stage 2b / Stage 3 / P1 triage / NY×YT / M6
- No manual cron triggers
- No DML / DDL
- No close-the-loop UPDATEs
- DO NOT REDEPLOY heygen-avatar-creator / heygen-avatar-poller / draft-notifier (P1 SECURITY-DEFINER regression-risk)
- Do not delete rows from `m.ef_drift_log` (98-row keep-both preserved)

---

## 🟡 Next session priorities (rebuilt for v2.45)

1. **S30** — forward verification of first automated drift-check cron fire (17:00 UTC tonight). Run around 17:15 UTC / 03:15 AEST tomorrow.
2. **F-EF-DRIFT-PREVENTION Stage 2b** (P1 TOP after S30 green) — dashboard drift panel.
3. **F-EF-DRIFT-PREVENTION Stage 3** (P1) — `scripts/safe-deploy.sh`. ~30 min.
4. **P1 SECURITY-DEFINER regression-risk triage** (P1) — sequenced after Stage 2b live.
5. **insights-worker P1 functional drift** (P1) — manual review (D-PREV-07).
6. **F-YT-NY-FORMAT-SELECTION** (P1) — BLOCKED until Stage 2b close + P1 triage.
7. **M6 Phase A** (P1) — BLOCKED behind same gate.
8. **T05 Meta dev support contact** (P1-urgent).
9. **Personal businesses check-in** (P0).
10. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
11. **F-PUB-009 7-day flow check** (P2).
12. **F-AI-WORKER-PARSER-SKIP-BUG V4** — inconclusive at v2.45; either wait for natural skip event or schedule synthetic test.
13. **Dashboard Architecture Review §1** — when PK signals; ~1.5h.
14. **`docs/audit/health/2026-05-06.md` follow-up** (P3) — investigate if still absent.
15. **16+ close-the-loop UPDATEs pending** to `m.chatgpt_review` — next batch closure (includes `c261e338`).

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 (`instagram-publisher-every-15m`) `active=false` — do not re-enable until S16 + T05; **note v2.45**: when re-enabled, ~104 IG-overdue posts will fire (NY 41 + PP 57 + Invegent 6) — cap-throttle planning required
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 16+ review_ids close-the-loop pending (carry-over). Combine in next batch closure.
- 47 historic dead queue rows retained as audit trail (Phase 1.7 design)
- 32 historical `post_draft_not_found` orphans (16 NY-FB + 16 PP-FB) confirmed v2.45 — M6 Phase A scope (BLOCKED)
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
- 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent; confirmed v2.45 still in `dead` status with no video_url
- `is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai` — investigate post-drift-check infrastructure
- 13 drift cases active in priority buckets (v2.40 inventory)
- 2 repo-only directories (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction
- `docs/audit/health/2026-05-06.md` absent — Cowork 02:00 AEST cron did not push 6 May. P3 follow-up.
- **v2.45: `m.ef_drift_log` retains 98 rows.** Keep-both per PK v2.43 decision. **Do not delete.**
- **v2.45: drift-check v1.0.8 LIVE.** Daily fire cron LIVE (jobid 80, 0 runs ever — first fire 17:00 UTC tonight). Retention cron LIVE (jobid 81).
- **v2.45: Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-07 Sydney — S30 paused / stuck-cluster recheck checkpoint (v2.45). Next: S30 after natural cron fire 17:00 UTC.*
