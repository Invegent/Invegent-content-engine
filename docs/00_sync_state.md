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

### 2026-05-05 Sydney late-evening — F-EF-DRIFT-PREVENTION Tier 2 LOCKED + Option F APPROVED

~3h chat. Full detail: `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md`.

**Outcome:** Continuation chat from earlier same-day inspection (Batches 1-3 in compacted previous chat). Completed Batches 4 + 5 + repo-only checks. Applied mid-session taxonomy cleanup at PK direction (retired ambiguous "reverse-drift"; introduced B-RR regression-risk vs B-FD forward-drift directional sub-classes). Locked Section 6 hypothesis matrix, Section 7 banner reliability, Section 8 prevention recommendation. PK approved Option F as the target prevention design.

**Final classification (46 deployed EFs):** A=26 (17 byte-identical + 9 line-ending), B-RR=5, B-FD=1, C=7 (current; ever-observed 8), D=7. Plus 2 repo-only directories (ai-diagnostic unclear; linkedin-publisher deliberate forward-staging for B24/F06).

**Three commits this session** (plus this session's commit closing the brief): `bec80b73` Batch 4, `7bb588fa` taxonomy cleanup, `0abd8ca5` Batch 5 + lock.

**Top finding:** Drift accumulates at three seams. (1) **c/m/f/t schema-write boundary** — highest-severity. 3 cases (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) where deployed source replaces broken `exec_sql` UPDATE with `SECURITY DEFINER` rpc, but repo still has the broken pattern. **Repo redeploy = silent production bug.** (2) **Repo-formatting/post-deploy seam** — 7 Class C cases. (3) **Feature-fix seam** — 5 B-RR cases. Plus 9/35 (26%) of repo-comparable EFs have Windows CLI CRLF/LF mismatch. No CI deploy pipeline exists. Recently-built MCP/observability/reviewer infrastructure is in clean sync (Batch 3 was 10/10 Class A) — drift is concentrated, not uniform.

**Option F approved (target design):**
1. `drift-check` Edge Function — daily 03:00 AEST pg_cron; iterates 46 EFs; CRLF-normalised body hashing; classifies A/B-RR/B-FD/C/D; runs SECURITY DEFINER pattern detector (regex catches the highest-severity class); writes to `m.ef_drift_log`. Lists repo-only directories.
2. `m.ef_drift_log` table — 90-day retention, indexes on (slug, checked_at) + (class, checked_at).
3. Dashboard drift panel — P1 SECURITY-DEFINER list, B-FD informational, Class C/D + repo-only lists, state_changed badge.
4. `scripts/safe-deploy.sh` — pre-deploy `git status` + `origin/main` warning (non-blocking; PK retains hot-fix capability).

Not building: CI deploy policy (breaks hot-fix), real-time hook (daily sufficient), auto-backfill (sync commits remain manual). **Build effort: ~4-5h split across two sessions, NOT this session.**

**13 existing drift cases triaged:**
- P1 SECURITY-DEFINER (do NOT redeploy from repo): heygen-avatar-creator, heygen-avatar-poller, draft-notifier
- P1 functional drift: insights-worker (D-PREV-07 says manual review first)
- P2 feature drift: series-writer
- P2 forward-drift (PK decision): feed-discovery
- P3 Class C polish-sync: image-worker (skip per D-PREV-05), feed-intelligence, onboarding-notifier, ai-profile-bootstrap, series-outline (content quality), email-ingest (cosmetic), compliance-reviewer (content quality)
- P3 Class D (commit deployed source to repo OR remove EF): ingest, pipeline-doctor, pipeline-ai-summary, compliance-monitor, video-analyser, heygen-intro, heygen-youtube-upload
- Repo-only triage: ai-diagnostic (deploy from repo or remove), linkedin-publisher (leave alone)

**D-01 fires this session: 0** — read-only inspection scope. No patches, no deploys, no DML.

**Decisions added:** D-PREV-13 (taxonomy locked), D-PREV-14 (Option F locked), D-PREV-15 (repo-only state separate from drift), D-PREV-16 (PK approved Option F; build is separate session).

**Standing rules honoured:** D170 (N/A read-only), D186 (closure ~3h this session, day total ~10h, trailing-14d ~28h above 8.0 floor), G1 (separate session-detail file). **No EF deploys.** **M6 untouched.** **F-YT-NY-FORMAT-SELECTION still blocked.**

**What's blocked:** M6 Phase A and F-YT-NY-FORMAT-SELECTION remain blocked until the F-EF-DRIFT-PREVENTION build phase closes AND the 4 P1 triage cases are addressed (3 SECURITY-DEFINER syncs + insights-worker manual review). The drift-check infrastructure being live before further EF patching is the precondition.

---

## 🟡 Next session priorities (carry-forward from action_list v2.40)

1. **Personal businesses check-in** (P0) — ICE is bonus.
2. **F-EF-DRIFT-PREVENTION build phase** (P1, top next session) — Option F: drift-check EF + `m.ef_drift_log` migration + dashboard panel + `safe-deploy.sh`. ~4-5h split across two sessions.
3. **P1 SECURITY-DEFINER regression-risk triage** — sync repo → deployed for heygen-avatar-creator, heygen-avatar-poller, draft-notifier. Best done after the drift-check infrastructure is live so the sync commits show up green in the dashboard.
4. **insights-worker P1 functional drift** — manual review of deployed v14.0.0 source for correctness, then sync (per D-PREV-07).
5. **F-YT-NY-FORMAT-SELECTION (P1)** — BLOCKED until F-EF-DRIFT-PREVENTION build close + P1 triage. Sequenced after item #3 + #4.
6. **M6 Phase A** (P1 — 108 historical Bug 3 dead-letter) — BLOCKED until F-EF-DRIFT-PREVENTION build close + P1 triage. Sequenced after F-YT-NY-FORMAT-SELECTION.
7. **T05 Meta dev support contact** (P1-urgent) — unchanged.
8. **3 stuck-item clusters re-evaluation** (P1) — PP×YT cluster cleared by F-YT-OAUTH-PP; verify next session.
9. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
10. **F-PUB-009 7-day flow check** (P2).
11. **Dashboard Architecture Review §1** — when PK signals; ~1.5h.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **12 review_ids close-the-loop pending** (carry-over) — 9 prior + v2.38's `b3609bc4` + `713dc407` + v2.39's `91caf322`. v2.40 added 0 (no D-01 fires this session). Combine in next batch closure.
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- **108 historical Bug 3 fingerprint queue rows** — intentionally retained as `queued`; M6 Phase A scope (now blocked behind F-EF-DRIFT-PREVENTION build close + P1 triage)
- **queue_id `ad573844-...`** — dead-lettered; do not re-queue
- **47 v4-origin queue rows still mismatch slot intent** — M6 Phase B address scope
- **160 records previously flagged is_shadow=true lost flag metadata** — acceptable, flag was inert
- **2 NY×YT avatar test drafts** (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent, not actionable until heygen-* drift resolved post-build
- **`is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai`** — legacy code path; investigate post-drift-check infrastructure
- **NEW v2.40: 13 drift cases active in priority buckets** — see `docs/00_action_list.md` for the triage table. Do not patch any until the drift-check infrastructure is live and the 3 SECURITY-DEFINER cases are visibly green in the dashboard.
- **NEW v2.40: 2 repo-only directories** (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction. linkedin-publisher is intentional forward-staging for B24/F06.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-05 Sydney late-evening — F-EF-DRIFT-PREVENTION Tier 2 LOCKED + Option F APPROVED (v2.40).*
