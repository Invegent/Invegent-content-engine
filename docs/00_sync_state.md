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
| 2026-05-07 | stage2a-cron-applied | **F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED.** Daily drift-check + 90-day retention crons applied via Supabase MCP per D170 (D-01 review `c261e338` agree, no pushback). Migration `f_ef_drift_prevention_stage2a_cron_jobs`. Two crons live: `drift-check-daily-fire` (jobid 80, 03:00 AEST daily, parallel single-statement with shared scan_id) + `ef-drift-log-retention-90d` (jobid 81, 03:15 AEST daily, 90-day DELETE). All 7 PK verification criteria PASS including dry-run smoke (`?write=false&slug=publisher`, HTTP 200, `wrote_rows=false`, no DB mutation, m.ef_drift_log row count unchanged at 98). First automated scan tomorrow 2026-05-08 03:00 AEST. Stage 2b (dashboard panel) is now top P1 next session. T-MCP-02 quota 40→41. ~25 min closure on top of ~30–40 min investigation; combined ~70–80 min day. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin investigation RESOLVED. Read-only forensics traced the unexpected prior scan to the same `postgres` DB role + chat-authored SQL fingerprint as the v2.42 chat session itself. `pg_stat_statements` recovered the exact 03:24:06 UTC SQL block: "`-- Generate ONE scan_id, fire all 5 write chunks…`" + CTE structure + `vault.decrypted_secrets` MCP convention. Most likely cause: discarded first parallel-block write attempt that v2.42 chat re-did sequentially as a2124145. PK decision: keep both scans, document, no row mutation. Both scans byte-identical per slug; zero data corruption / zero production impact. Stage 2a UNBLOCKED. Lesson candidate #68 captured. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — was BLOCKED on bef6be96 origin investigation; resolved + closed v2.44. drift-check EF v1.0.8 deployed (commit `d81de062`); F1 multipart fix; writer fn migrated to accept `p_run_id`; manual chunked write a2124145 succeeded 49 rows. T-MCP-02 37→40; T-MCP-08 1→2. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | F-EF-DRIFT-PREVENTION **Stage 1 APPLIED** (backend foundation). `m.ef_drift_log` table + `m.vw_ef_drift_current` view + `public.write_ef_drift_log()` SECURITY DEFINER batch writer. 3 D-01 fires (T-MCP-02 34 → 37). | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | F-EF-DRIFT-PREVENTION Tier 2 inventory LOCKED at 46/46 EFs. Option F APPROVED. 13 drift cases triaged. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse via dashboard `/connect`. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED. 7/7 verifications PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for + 147-row backfill) APPLIED. 8/8 verifications PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
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

### 2026-05-07 Sydney — Stage 2a Cron Applied (CLOSED)

**Outcome:** F-EF-DRIFT-PREVENTION **Stage 2a fully CLOSED**. Daily drift-check + 90-day retention crons live in production. ~25 min closure on top of ~30–40 min investigation; combined ~70–80 min day. No row mutations.

**Sequence:**
1. Pre-flight P1–P5 — all 5 PASS (no existing drift cron; columns + FK clean; postgres can `cron.schedule`; vault secrets resolve; writer fn signature correct)
2. Design proposal to PK — parallel single-statement, 03:00/03:15 AEST schedules, 90-day retention
3. PK approval with adjustment (no manual `write=true` post-apply)
4. D-01 review `c261e338-5f4f-473f-900c-f5ad8d8711a9` — verdict agree, risk medium, confidence high, no pushback (T-MCP-02 40→41)
5. Migration `f_ef_drift_prevention_stage2a_cron_jobs` applied via Supabase MCP per D170
6. Verifications all PASS (7 PK criteria):
   - V1: both jobs in `cron.job` (jobid 80 + 81, `active=true`)
   - V2: schedules `0 17 * * *` + `15 17 * * *`
   - V3: command path `/functions/v1/drift-check?write=true&limit=10`
   - V4: 5 offsets (0/10/20/30/40) + 5 references to `s.scan_id::text` (single CTE-generated UUID)
   - V5: retention `DELETE FROM m.ef_drift_log WHERE checked_at < now() - interval '90 days'`
   - V6 dry-run smoke: HTTP 200, `wrote_rows=false`, errors=[], slug_filter=publisher
   - V7: `m.ef_drift_log` row count = 98 (unchanged)

**Production state at close:**
- **drift-check-daily-fire** (jobid 80) — 17:00 UTC daily; generates one scan_id; fires 5 parallel chunks; slug-disjoint, race-free per writer fn design
- **ef-drift-log-retention-90d** (jobid 81) — 17:15 UTC daily; first row eligible for delete on 2026-08-04
- **First automated scan:** tomorrow 2026-05-08 03:00 AEST. Expected: new `drift_check_run_id` with 49 rows, all `state_changed=false` against a2124145 baseline
- **`m.ef_drift_log`**: 98 rows preserved (keep-both per v2.43)
- **`m.vw_ef_drift_current`**: returns 49 latest-per-slug (a2124145)

**Closure budget:** combined ~70–80 min today (investigation + cron). Day total ~9.5h. Trailing-14-day ~36h above 8.0 floor.

**1 D-01 fire this session** (`c261e338`): cron migration agree, no pushback. T-MCP-02 quota 40→41.

**Hard stops still in effect (per PK):**
- Do not start Stage 2b / Stage 3 / P1 triage / NY×YT / M6 in this session
- DO NOT REDEPLOY heygen-avatar-creator / heygen-avatar-poller / draft-notifier (P1 SECURITY-DEFINER regression-risk)
- Do not delete rows from `m.ef_drift_log` (98-row keep-both preserved)

---

## 🟡 Next session priorities (rebuilt for v2.44)

1. **Personal businesses check-in** (P0) — ICE is bonus.
2. **F-EF-DRIFT-PREVENTION Stage 2b** (P1 TOP) — dashboard drift panel. Reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Class buckets; P1 SECURITY-DEFINER list highlighted; B-FD informational; state_changed=true badge; repo-only directories listed separately. ~1–2h.
3. **F-EF-DRIFT-PREVENTION Stage 3** (P1) — `scripts/safe-deploy.sh`. ~30 min.
4. **P1 SECURITY-DEFINER regression-risk triage** (P1) — `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. Sequenced after Stage 2b live.
5. **insights-worker P1 functional drift** (P1) — manual review (D-PREV-07).
6. **F-YT-NY-FORMAT-SELECTION** (P1) — BLOCKED until F-EF-DRIFT-PREVENTION build close + P1 triage.
7. **M6 Phase A** (P1 — 108 historical Bug 3 dead-letter) — BLOCKED behind same gate.
8. **T05 Meta dev support contact** (P1-urgent).
9. **3 stuck-item clusters re-evaluation** (P1).
10. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
11. **F-PUB-009 7-day flow check** (P2).
12. **Dashboard Architecture Review §1** — when PK signals; ~1.5h.
13. **`docs/audit/health/2026-05-06.md` follow-up** (P3) — investigate if still absent.
14. **16+ close-the-loop UPDATEs pending** to `m.chatgpt_review` — next batch closure (now includes `c261e338`).
15. **Verify first automated scan** (2026-05-08 03:00 AEST) — confirm new `drift_check_run_id` appears with 49 rows.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 16+ review_ids close-the-loop pending (carry-over). Combine in next batch closure.
- 47 historic dead queue rows retained as audit trail (Phase 1.7 design)
- 6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts` — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design
- NDIS-Yarns LinkedIn slot `8f9e5c57-…` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- 108 historical Bug 3 fingerprint queue rows — intentionally retained as `queued`; M6 Phase A scope (BLOCKED behind drift-check build close + P1 triage)
- queue_id `ad573844-…` — dead-lettered; do not re-queue
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B scope
- 160 records previously flagged is_shadow=true lost flag metadata — acceptable, flag was inert
- 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent
- `is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai` — investigate post-drift-check infrastructure
- 13 drift cases active in priority buckets (v2.40 inventory) — see action_list. Do not patch any until drift-check infrastructure is live and the 3 SECURITY-DEFINER cases are visibly green in the dashboard.
- 2 repo-only directories (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction. linkedin-publisher is intentional forward-staging for B24/F06.
- `docs/audit/health/2026-05-06.md` absent — Cowork 02:00 AEST cron did not push 6 May. Logged as P3 follow-up. Investigate only if not back online.
- **v2.44: `m.ef_drift_log` retains 98 rows.** Keep-both per PK v2.43 decision. Per-slug content byte-identical. `m.vw_ef_drift_current` returns 49 latest-per-slug (a2124145). **Do not delete any rows.** Finding doc: `docs/audit/findings/2026-05-06-ef-drift-duplicate-scan-origin.md`.
- **v2.44: drift-check v1.0.8 LIVE**, daily fire cron LIVE (jobid 80), retention cron LIVE (jobid 81). First automated scan 2026-05-08 03:00 AEST.
- **v2.44: Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER regression-risk).

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-07 Sydney — F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED (v2.44). Cron live; first automated scan 2026-05-08.*
