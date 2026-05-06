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
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | **F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — blocked on unexpected prior scan origin.** drift-check EF iterated v1.0.0 → v1.0.8 (final fix: F1 `multipart/form-data` parsing — Management API `/body` returns multipart, not raw text). Publisher now correctly Class A; auto-approver still Class C with real 4-byte diff at byte 8790. Dry-run chunks 1-5 PASS all 6 PK criteria (49 rows: A:16, A-LE:9, B-FD:1, B-RR:5, C:9, D:7, repo-only:2; SD-risks exactly 3). Writer fn migrated to accept caller-supplied `p_run_id` (D-01 `0a9012e7` agree). Chunked write attempted scan_id `a2124145-…` 49 rows successful. **Verification surfaced unexpected prior scan `bef6be96-…` (49 rows at 03:24 UTC, 6 min before mine) from unidentified caller** — 5 concurrent parallel-fire invocations matching all 49 slugs byte-identical to mine. `m.ef_drift_log` now 98 rows. `m.vw_ef_drift_current` returns 49 latest-per-slug (mine), internally consistent. **Stage 2a BLOCKED.** Cron NOT applied. No cleanup decisions taken. T-MCP-02 37→40 (3 fires); T-MCP-08 1→2 (state-capture override on chunked-write per PK pre-auth). Closure ~5h session, day ~7.5h, 14d ~35h. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | F-EF-DRIFT-PREVENTION **Stage 1 APPLIED** (backend foundation). Built `m.ef_drift_log` (19 cols + 5 CHECK constraints + 5 indexes), `m.vw_ef_drift_current` view (latest-per-slug + derived `first_seen_in_class` + `last_resolved_at`), `public.write_ef_drift_log(jsonb)` SECURITY DEFINER batch writer. **3 D-01 fires** (T-MCP-02 34 → 37): Fire 1 escalated on real first-run `state_changed` ambiguity (PK rejected Lesson #62 override → revise); Fire 2 cleared on revised v2 with `is_first_observation` boolean + NULL-tri-state `state_changed` + CHECK constraint enforcing consistency + hash-aware change detection per PK's "previous class/hash differs"; Fire 3 cleared on writer-fn ambiguity bug fix (`#variable_conflict use_column` directive). Live test verified all 4 semantic cases: first obs → NULL; no diff → false; class diff → true; hash diff within same class → true. Test rows cleaned. Stage 2a (drift-check EF + 90-day retention pg_cron) is top P1 next session. Stage 2b (dashboard panel) and Stage 3 (safe-deploy.sh) follow. P1 SECURITY-DEFINER triage remains deferred until drift-check infrastructure live. **`docs/audit/health/2026-05-06.md` absent** — Cowork 02:00 AEST cron didn't push; logged as follow-up, not derailing. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | F-EF-DRIFT-PREVENTION Tier 2 inventory LOCKED at 46/46 EFs (Batches 1-5). Final classification: 26 A + 5 B-RR + 1 B-FD + 7 C + 7 D + 2 repo-only. Mid-session taxonomy cleanup retired "reverse-drift" in favour of B-RR/B-FD. **Option F APPROVED by PK** as target prevention design (drift-check EF + m.ef_drift_log + CRLF-normalised body hashing + SECURITY DEFINER regression detector + dashboard drift panel + non-blocking safe-deploy.sh). ~4-5h build = separate session. 13 drift cases triaged into priority buckets. M6 Phase A + F-YT-NY-FORMAT-SELECTION remain blocked behind build close + P1 triage. D-PREV-13/14/15/16 added. 0 D-01 fires (read-only). Three commits: `bec80b73` Batch 4, `7bb588fa` taxonomy cleanup, `0abd8ca5` Batch 5 + lock; this session's commit marks brief APPROVED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse. Dashboard reconnect at `dashboard.invegent.com/connect` superseded staged Template 1 SQL — refreshed both PP+NY YouTube tokens. Template 2 SQL (4-draft reset) D-01 cleared first-fire `91caf322`; applied via Supabase MCP. Both subsequent cron 34 firings published all 4 stuck PP×YT drafts cleanly. First PP×YT pipeline-driven publishes since 2026-04-01. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED via `m5_remove_p_shadow_corrected_v2` after first attempt failed at view-rewrite. Cascade fix added for `m.check_evergreen_threshold`. 7/7 post-apply verifications PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for source + 147-row slot backfill) APPLIED via Lesson #62 state-capture override. 8/8 post-apply verifications PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | Tier 1 queue integrity remediation applied: M1+M2+M3. All 8/8 post-apply checks pass. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | ICE Dashboard Architecture Review formally kicked off. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 v1→v2; F-PUB-009 brief; F-AI-WORKER-PARSER-SKIP-BUG diagnosed. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1; F-HISTORIC-DEAD-CLEANUP retired. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 root cause. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-06 Sydney afternoon — F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT (blocked on unexpected prior scan origin)

~5h chat. Full detail: `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md`.

**Outcome:** Stage 2a build went through 8 EF iterations (v1.0.0 → v1.0.8), ending with a multipart/form-data parsing fix that resolved a 47-of-47 false-positive-drift bug. Dry-run chunks 1–5 of v1.0.8 PASS all six PK criteria. Manual chunked write of the baseline succeeded with intended scan_id `a2124145-…` (49 rows). Verification surfaced an unexpected prior scan `bef6be96-…` (also 49 rows at 03:24 UTC, six minutes before the intentional write) from an unidentified caller. **Stage 2a is BLOCKED pending investigation of the bef6be96 origin.** Cron migration NOT applied. No row deletions; 98 rows preserved.

**v1.0.8 multipart fix (root cause of 47-of-47 false drift):**
- Management API endpoint `GET /v1/projects/{ref}/functions/{slug}/body` returns `multipart/form-data`, not raw text. v1.0.0–v1.0.7 read it as text, capturing boundary markers + headers in deployed_hash_normalised.
- Fix: `Accept: multipart/form-data` + `Response.formData()` parse + read `metadata.entrypoint_path` + pick matching file part. Mirrors supabase CLI's `downloadWithServerSideUnbundle`.
- Verified end-to-end against CLI ground truth: publisher genuinely Class A; auto-approver real 4-byte diff at byte 8790 (Studio inline-edit signature).

**Dry-run aggregate (v1.0.8) — all 6 PK criteria PASS:** 49 rows (A:16, A-LE:9, B-FD:1, B-RR:5, C:9, D:7, repo-only:2); SD-risks exactly 3 (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`); Class C dropped from 34 (v1.0.6) to 9; repo-only deduped to chunk 1 only.

**Writer fn migration:** `f_ef_drift_prevention_writer_accept_run_id` applied via Supabase MCP. New signature `public.write_ef_drift_log(p_rows jsonb, p_run_id uuid DEFAULT NULL)` enables chunked writes with shared correlation key. Body byte-identical to Stage 1 except `v_run_id := COALESCE(p_run_id, gen_random_uuid())`. D-01 `0a9012e7` agree. Rolled-back tx verified `is_first_observation` / `state_changed` / `previous_class` semantics intact.

**Chunked write — intended:** scan_id `a2124145-a519-4fbf-b0b0-1da28782f152`. 5 sequential write chunks (request IDs 96479-96484) at 03:30:33 - 03:32:44 UTC. All 200, errors=[], 12+10+10+10+7 = 49 rows. Cumulative table-row count verification PASS each step.

**Anomaly:** `m.ef_drift_log` actually had 98 rows after my write, not 49.

| drift_check_run_id | rows | earliest UTC | latest UTC | first_obs | sd_risk |
|---|---|---|---|---|---|
| `bef6be96-dbca-4a1f-ba29-f9bbcb95f1b3` | 49 | 03:24:10.159 | 03:24:10.954 | 49 | 3 |
| `a2124145-…` (mine) | 49 | 03:30:33.025 | 03:32:44.817 | 0 | 3 |

Per-slug JOIN: 49/49 byte-identical. `net._http_response` audit shows request IDs 96457-96461 all completed at 03:24:06.78579 UTC (5 concurrent parallel-fire invocations) with `write_mode=true` and shared scan_id `bef6be96-…`. Preceded by 4 dry-run chunks at 03:21-03:22 UTC (96453-96456) covering offsets 10/20/30/40 — no chunk-1 dry-run for that actor. **Caller unidentified.** No matching `cron.job` entries.

**Functional state:** Internally consistent. Mine correctly shows `state_changed=false` (49) + `previous_class` populated (49) — writer fn working as designed against prior data. `m.vw_ef_drift_current` returns 49 latest-per-slug (mine).

**Hard stops in effect (per PK):**
- Do not mark Stage 2a complete.
- Do not apply cron migration.
- Do not delete any rows from `m.ef_drift_log`.
- Do not run more writes.
- Do not start dashboard / safe-deploy / P1 triage / NY×YT / M6.
- Next session must begin with origin investigation.

**Cleanup options for next session (PK to decide):** A. Keep both scans. B. Roll back both. C. Roll back bef6be96 only (NOT recommended — breaks integrity of mine).

**3 D-01 fires this session** (T-MCP-02 37 → 40):
- v1.0.x EF deploy series (combined entry — reconcile in next batch closure)
- Writer-fn migration `0a9012e7` agree, applied
- Chunked-write proposal `d53c9918` escalated on single self-undermining objection ("non-atomic rollback… although there is a rollback plan in place"). State-capture override invoked per PK explicit pre-authorisation in directive ("If all dry-runs pass, proceed to option 2"). T-MCP-08 1 → 2.

**Lesson candidates surfaced (defer to next session for canonical assessment):** #63 SUPABASE_* secrets reserved by CLI; #64 `verify_jwt:false` convention; #65 EF resource limits ≠ wall-clock only; #66 Management API `/body` is multipart/form-data; #67 writer-fn caller-supplied `run_id` enables chunked writes.

**Standing rules honoured:** D-01 (3 fires); D170 (chat applied via Supabase MCP, not CC); D186 (closure ~5h this session, trailing-14-day ~35h, well above 8.0 floor); G1 separate session-detail file; D-PREV-16 stage-gated build.

**`docs/audit/health/2026-05-06.md` still absent** at session close — Cowork didn't push; carry as P3 follow-up.

**No P1 triage.** **M6 untouched.** **F-YT-NY-FORMAT-SELECTION still blocked.** **No more EF deploys this session.**

---

## 🟡 Next session priorities (carry-forward from action_list v2.42)

1. **Personal businesses check-in** (P0) — ICE is bonus.
2. **Investigate `bef6be96` scan origin** (P1, top next session) — ask PK first; cross-check Cowork / dashboard / Vercel / Supabase EF logs. PK then decides cleanup strategy (A/B/C). Stage 2a unblocks only after this resolves.
3. **F-EF-DRIFT-PREVENTION Stage 2a finalisation** (P1) — apply 90-day retention pg_cron migration only after #2 resolves and PK approves.
4. **F-EF-DRIFT-PREVENTION Stage 2b** — dashboard drift panel. Sequenced after Stage 2a closes.
5. **F-EF-DRIFT-PREVENTION Stage 3** — `scripts/safe-deploy.sh`. ~30min.
6. **P1 SECURITY-DEFINER regression-risk triage** — sync repo → deployed for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. Deferred until Stage 2b live.
7. **insights-worker P1 functional drift** — manual review of deployed v14.0.0 source (D-PREV-07).
8. **F-YT-NY-FORMAT-SELECTION (P1)** — BLOCKED until F-EF-DRIFT-PREVENTION build close + P1 triage.
9. **M6 Phase A** (P1 — 108 historical Bug 3 dead-letter) — BLOCKED behind same gate.
10. **T05 Meta dev support contact** (P1-urgent) — unchanged.
11. **3 stuck-item clusters re-evaluation** (P1) — verify next session.
12. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
13. **F-PUB-009 7-day flow check** (P2).
14. **Dashboard Architecture Review §1** — when PK signals; ~1.5h.
15. **Investigate `docs/audit/health/2026-05-06.md` absence** — only if cron still not back online.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **12 review_ids close-the-loop pending** (carry-over) — combine in next batch closure. v2.42 added 2 more (`0a9012e7-…`, `d53c9918-…`) and the consolidated v1.0.x EF deploy series entry still TBD.
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-…` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- **108 historical Bug 3 fingerprint queue rows** — intentionally retained as `queued`; M6 Phase A scope (now blocked behind F-EF-DRIFT-PREVENTION build close + P1 triage)
- **queue_id `ad573844-…`** — dead-lettered; do not re-queue
- **47 v4-origin queue rows still mismatch slot intent** — M6 Phase B address scope
- **160 records previously flagged is_shadow=true lost flag metadata** — acceptable, flag was inert
- **2 NY×YT avatar test drafts** (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent, not actionable until heygen-* drift resolved post-build
- **`is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai`** — legacy code path; investigate post-drift-check infrastructure
- **13 drift cases active in priority buckets** (v2.40 inventory) — see `docs/00_action_list.md` for the triage table. Do not patch any until drift-check infrastructure is live and the 3 SECURITY-DEFINER cases are visibly green in the dashboard.
- **2 repo-only directories** (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction. linkedin-publisher is intentional forward-staging for B24/F06.
- **`docs/audit/health/2026-05-06.md` absent** — Cowork 02:00 AEST cron did not push 6 May. Logged as follow-up; investigate only if not back online by next session. Do not attempt manual re-run of Cowork without PK direction.
- **NEW v2.42: `m.ef_drift_log` has 98 rows preserved.** 49 from `a2124145-…` (mine, 03:30 UTC) + 49 from unexplained `bef6be96-…` (03:24 UTC, 6 min prior, parallel-fire from unidentified caller). **Do not delete any rows** until PK decides cleanup strategy after origin investigation.
- **NEW v2.42: drift-check v1.0.8 deployed but cron NOT applied.** EF works correctly (multipart fix verified). Manual triggers safe; automated cron pending PK approval after Stage 2a unblocks.
- **NEW v2.42: Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER regression-risk) — confirmed by v1.0.8 baseline scan.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-06 Sydney afternoon — F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT (blocked on unexpected prior scan origin) (v2.42).*
