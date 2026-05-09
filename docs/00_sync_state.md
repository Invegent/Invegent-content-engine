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
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | **M6 Phase A CLOSED via cc-0003 v2 APPLIED (v2.55).** Brief-runner-v0 HALT-then-correction loop completed end-to-end across 8–9 May. CC HALTed cc-0003 v1 at §1.5 (slot_driven_count=2 vs expected 0; commit `2acdee33`); chat fired post-HALT diagnostic confirming both anomalous queue_ids are v4 mismatch (Phase B) rows that incidentally fingerprint Bug 3 because M4 was forward-only on `pd`; cc-0003 v1 → v2 patch + v1 result preservation in single chat commit `f91d9c79`; cc-0004 §1.5 propagation patch (CC, PK direct greenlight) commit `6675aa7c`; cc-0005 M8 atomic cutover brief draft (chat) commit `6f16c40e`; cc-0003 v2 D-01 PASS + PK explicit approval phrase + cc-0003 v2 APPLIED by CC via Supabase MCP (commit `d60dcfbc`, 9 rows dead-lettered, V1–V6 all PASS, no rollback). cc-0004 (M6 Phase B) sequencing gate now **MET**; CC owns apply when PK directs. cc-0005 PARKED at §1.0 hard PK confirmation gate (post-cutover enqueue path + `get_next_scheduled_for` callers). 6 brief-runner-v0 lessons captured (L1 v1 HALT works, L2 v2 patch works, L3 result-file preservation works, L4 pre-state baseline pattern now required, L5 invariants must be empirically pre-tested, L6 cross-brief propagation required when invariant fails). T-MCP-02 quota +1. P0+P1 open: ~4 → ~3. PHASES reconciliation now **11th** carry. | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | **video-worker v3.0.0 DEPLOYED + verify_jwt regression recovered + durable `supabase/config.toml` LANDED (v2.54).** Commit `4ae5b5a7` shipped F-VIDEO-QUALITY-UPGRADE-A-B-C (env-gated music default OFF, 9:16 layout fix, animation polish). Deployed via `safe-deploy.sh video-worker --allow-warn` (gate WARN→PASS, exit 0). Cron jobid 33 401'd because CLI default flips `verify_jwt: true` when no `supabase/config.toml`. Recovered same session via `supabase functions deploy video-worker --no-verify-jwt`. Drift round-trip COMPLETED: scan `cb7fe77b-2011-48cf-8ffc-806d63e535aa` 07:20:56 UTC, video-worker B-FD → A-LE, repo=deploy=3.0.0. Durable `supabase/config.toml` LANDED this turn covering 23 EFs (10 custom-header + 13 service-role; excluded as stale: `ingest`, `compliance-monitor`, `pipeline-ai-summary`, `pipeline-doctor`). 4 m.chatgpt_review records closed-the-loop (`8bd6ac37`, `fa4322e5`, `ee27dd37`, `4e0e9c00`). YouTube cadence prior-session memory entry RETRACTED (NDIS-Yarns Mon–Fri 19:00 AEST/09:00 UTC, Property Pulse Mon–Fri 17:00 AEST/07:00 UTC, **5 slots/wk each**, **not** "~3-day cadence" — Sat–Sun gap mislabelled, fill_window_opens_at conflated with scheduled_publish_at; system healthy via cron 72/73/75/76). NEW findings: F-CRON-INGEST-STALE (P2), F-CRON-COMPLIANCE-MONITOR-STALE (P2), F-CRON-PIPELINE-AI-SUMMARY-STALE (P2), F-CRON-PIPELINE-DOCTOR-STALE (P2 — NOT a rename of pipeline-diagnostician), F-CRON-PG-NET-TIMEOUT-5S (P2), F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec). Closed v2.54: video-worker verify_jwt durable fix (P3). PHASES reconciliation now **10th** carry. | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |
| 2026-05-08 | f-yt-ny-format-fix | **F-YT-NY-FORMAT-SELECTION CLOSED end-to-end (v2.53).** Commit `1ccfe9a2`: ai-worker v2.11.1 → v2.12.0. Two-part format-advisor-v1 fix. ai-worker class B-FD → A-LE. T-MCP-02 49 → 50. **0 state-capture exceptions.** ~4 P0+P1 open of 20 cap. NEW P3: F-YT-PUB-AVATAR-EXCLUSION. | `docs/runtime/sessions/2026-05-08-f-yt-ny-format-fix.md` |
| 2026-05-08 | v2.52-insights-sync-rpc-closure | **Productive close (v2.52).** 3 findings closed in single session. Commit `57daf877`: insights-worker forward-sync. Commit `7555b98a`: combined RPC migration orphan closure. | `docs/runtime/sessions/2026-05-08-v2.52-insights-sync-rpc-closure.md` |
| 2026-05-08 | personal-finance-cowork-inbox-brief | **Lightweight close (v2.51).** Crazy Domains analysis; morning-inbox-sweep-v1 brief drafted. | `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md` |
| 2026-05-07 | p1-sd-triage-sync | **P1 SECURITY-DEFINER triage CLOSED (v2.50).** | `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md` |
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** `scripts/safe-deploy.sh` live. | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED on desktop (v2.48).** | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin RESOLVED. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | Stage 2a CHECKPOINT. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | Stage 1 APPLIED. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | Tier 2 inventory LOCKED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
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

### 2026-05-09 Sydney — cc-0003 v2 APPLIED (M6 Phase A closed; brief-runner-v0 HALT-then-correction loop end-to-end) (v2.55)

**Outcome:** **M6 Phase A CLOSED.** cc-0003 v2 APPLIED via Supabase MCP `apply_migration` by CC. 9 rows dead-lettered (NY × 7 IG + PP × 2 IG; all `approval_status='approved'`; all `pd.slot_id IS NULL`). All 6 verification queries (V1–V6) PASS. No rollback. **cc-0004 (M6 Phase B) sequencing gate now MET.** cc-0005 (M8 atomic cutover) PARKED at §1.0 hard PK confirmation gate.

**Multi-stage cycle (8–9 May Sydney):**
1. cc-0001 Phase 0 defaults result + M5–M8 reconciliation brief (8 May late evening).
2. cc-0003 v1 brief drafted + patched (V1 baseline + softened D-01 wording); cc-0004 v1 brief drafted.
3. cc-0003 v1 EXECUTED by CC → **HALTED at §1.5** (slot_driven_count=2 vs expected 0). Result file `2acdee33`.
4. Chat fired post-HALT read-only diagnostic on the 2 anomalous queue_ids (`929ee2f9-...`, `30fa6594-...`). Confirmed: both rows are v4 mismatch (Phase B / cc-0004) scope that incidentally fingerprint Bug 3 because M4 was forward-only on `pd`. v1 §1.5 invariant assumption ("M4 backfilled, slot-driven can't fingerprint Bug 3") empirically falsified.
5. cc-0003 v1 → v2 patch + v1 HALT result file preservation in single chat commit `f91d9c79`. v2 narrows criterion to `pd.slot_id IS NULL`; expected count 11 → 9; range [5,25] → [3,20]; §1.5 inverted from disjointness HALT to partition arithmetic check; multi-table JOIN + IN-subquery SQL form.
6. cc-0004 §1.5 propagation patch (CC, PK direct greenlight) commit `6675aa7c`. Removed empirically-falsified disjointness assumption; established structural disjointness on `pd.slot_id` discriminator (cc-0003 v2 = `IS NULL`; cc-0004 = `IS NOT NULL`); §8.2.b RETIRED with audit note. cc-0004 v1 migration name retained (never applied or HALTed).
7. cc-0005 M8 atomic cutover brief drafted (chat) commit `6f16c40e`. Three-component atomic migration (cron 48 disable + legacy-origin future cleanup + `public.get_next_scheduled_for` deprecation). Novel §1.0 hard PK confirmation gate.
8. cc-0003 v2 D-01 review fired chat-side — verdict `agree` / `proceed` / clean PASS / 0 pushback / 0 escalation.
9. PK explicit approval phrase received: `"myself pk approve - proceed with cc-0003 v2 apply"`.
10. cc-0003 v2 APPLIED by CC via Supabase MCP `apply_migration` (commit `d60dcfbc`). `{"success": true}`. Final read-only re-verification (~60s before apply): identical to initial pre-flight (no drift). V1–V6 all PASS. No rollback. Result file appended (v1 HALT + v2 APPLIED co-located).
11. **This turn (chat 4-way sync close):** session file + sync_state v2.55 + action_list v2.55. Doc-only single commit. No Supabase writes. No D-01. No cron edits. No deploys.

**Verification (V1–V6 all PASS):** V1 post_dead_reason_count = 9 (= 0 + 9); V2 v2_count = 0; V3 queued+failed = 479 (= 488 - 9); V4 dead = 57 (= 48 + 9); V5 result list set-equal to captured 9 IDs; V6 per-status totals coherent (queued=479, dead=57, published=95, failed absent both sides).

**Brief-runner-v0 lessons captured (6):**
- **L1** v1 HALT works — first apply-class HALT in trial, load-bearing, no production state touched.
- **L2** v2 patch works — doc-only patch produced correctly-scoped migration that applied cleanly.
- **L3** result-file preservation works — v1 HALT + v2 APPLIED co-located in same file (commit `d60dcfbc`).
- **L4** pre-state baseline pattern is now required — V1 must use `pre_dead_reason_count + N`, never assume baseline = 0; code-collision check is NOT a guarantee about row state.
- **L5** brief invariant assumptions can be empirically wrong — disjointness invariants must be pre-tested with read-only SELECT before being baked into HALT rules.
- **L6** cross-brief patch propagation required when invariant fails — cc-0004 §1.5 carried the same v1 invariant; patched in same cycle.

L1–L4 are now baseline patterns. L5 + L6 reinforce Lesson #61 — promotion candidates after one more vindication.

**Sequencing gate state:**
- **cc-0004 (M6 Phase B):** Sequencing gate **MET.** CC owns apply when PK directs. Expected scope: 43 v4 mismatch rows + the 2 slot-driven CFW IG rows surfaced by cc-0003 v1 HALT.
- **cc-0005 (M8 atomic cutover):** **PARKED.** Blocked by cc-0004 completion + §1.0 PK confirmation (post-cutover enqueue path + `get_next_scheduled_for` callers).

**Constraints respected this turn:** No Supabase writes. No D-01 fire. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. Single doc-only commit covering 3 files (this update + session file + action_list v2.55). cc-0003 brief + result + cc-0004 + cc-0005 briefs **untouched**.

**Closed v2.55:** M6 Phase A (P1) — cc-0003 v2 commit `d60dcfbc`.

**Open / deferred this turn (not in PK scope):**
- `m.chatgpt_review` close-the-loop UPDATE for cc-0003 v2 D-01 fire (Supabase write; PK excluded).
- Memory `recent_updates` v2.55 entry (chat-owned at next opportunity).
- Dashboard PHASES reconciliation — **11th** consecutive deferral (was 10th in v2.54).

---

### 2026-05-08 Sydney — video-worker v3.0.0 deploy + verify_jwt regression recovered + durable supabase/config.toml landed (v2.54)

**Outcome:** F-VIDEO-QUALITY-UPGRADE-A-B-C shipped via two CLI invocations within ~5 minutes; verify_jwt regression introduced + recovered same session; durable `supabase/config.toml` covering 23 EFs landed this turn; drift round-trip CLOSED with B-FD → A-LE Class A family; 4 m.chatgpt_review records closed-the-loop; YouTube cadence prior memory entry RETRACTED; 6 new P2 findings logged. STANDING_THREE array unchanged. Other holds (cron 53/11/64/65 paused, NDIS-Yarns IG `publish_enabled=false`, etc.) preserved.

**Deploy chronology:**
1. Pre-fire drift scan `6a381ec7-dc37-418c-8ff1-e7b8d76801ca` (06:17:56 UTC): video-worker class B-FD, repo 3.0.0 ahead of deploy 2.1.0, `previous_class=A`, `state_changed=true`.
2. D-01 fire `4e0e9c00-11d3-4096-afd3-ec765b296b36` (deploy fire #2 — escalation-resolved by re-fire from `ee27dd37`): PASS.
3. `./scripts/safe-deploy.sh video-worker --allow-warn` → gate WARN → PASS, CLI `Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`, exit 0.
4. **Regression detected:** cron jobid 33 401'd. Root cause: CLI default sets `verify_jwt: true` on the gateway when no `supabase/config.toml` exists.
5. **Recovery (same session):** `supabase functions deploy video-worker --no-verify-jwt`. Same v3.0.0 source, gateway flag flipped only. Exit 0. Cron jobid 33 unblocked.

**Post-deploy drift round-trip (chat-owned, COMPLETED):** scan `cb7fe77b-2011-48cf-8ffc-806d63e535aa` at 2026-05-08 07:20:56 UTC. video-worker `current_class=A-LE`, `previous_class=B-FD`, `state_changed=true`, repo=deploy=3.0.0. Textbook B-FD → A-LE.

**Durable `supabase/config.toml` landed (this turn):** 23 EFs encoded with `verify_jwt = false` — 10 custom-header (video-worker, content_fetch, image-worker, feed-discovery, heygen-worker, linkedin-zapier-publisher, pipeline-fixer, wordpress-publisher, youtube-publisher, auto-approver) + 13 service-role (ai-diagnostic, client-weekly-summary, compliance-reviewer, draft-notifier, drift-check, email-ingest, external-reviewer-digest, feed-intelligence, insights-feedback, insights-worker, pipeline-healer, pipeline-sentinel, weekly-manager-report). 4 slugs excluded as stale: `ingest`, `compliance-monitor`, `pipeline-ai-summary`, `pipeline-doctor` — F-CRON-*-STALE findings logged for each.

**4 m.chatgpt_review close-the-loop (chat-owned, COMPLETED):**
- `8bd6ac37-fa9e-43af-803f-75a171080554` — sql_destructive F-YT-PUB-AVATAR-EXCLUSION fire #1, escalated → resolved by re-fire `fa4322e5` PASS. resolved_by `chat-via-refire-fa4322e5-pass`.
- `fa4322e5-69a7-4b77-a745-cdd0296dccc4` — sql_destructive fire #2, PASS. action_taken: catalog UPDATE applied 2026-05-08 05:24:00.472666 UTC removing youtube from `t."5.3_content_format".platform_support` for `video_short_avatar`. status completed.
- `ee27dd37-472a-443c-b29d-dd07f8a8c7d3` — ef_deploy video-worker fire #1, escalated → resolved by re-fire `4e0e9c00` PASS. resolved_by `chat-via-refire-4e0e9c00-pass`.
- `4e0e9c00-11d3-4096-afd3-ec765b296b36` — ef_deploy video-worker fire #2, PASS. action_taken: deploy completed + verify_jwt regression+recovery saga documented inline. status completed.

**YouTube cadence retraction:** prior session memory entry claimed "~3-day cadence" with "next fill 49h forward" for NDIS-Yarns / Property Pulse YouTube. **INCORRECT.** Actual state: NDIS-Yarns YT Mon–Fri 19:00 AEST / 09:00 UTC, 5 slots/wk. Property Pulse YT Mon–Fri 17:00 AEST / 07:00 UTC, 5 slots/wk. Slot pipeline healthy via cron jobid 72 + 73/75/76. Root of error: Sat–Sun weekend gap mislabelled as "cadence"; fill_window_opens_at conflated with scheduled_publish_at. System issue: NONE. Reporting issue: corrected.

**NEW v2.54 findings (6 logged):** F-CRON-INGEST-STALE (P2); F-CRON-COMPLIANCE-MONITOR-STALE (P2); F-CRON-PIPELINE-AI-SUMMARY-STALE (P2); F-CRON-PIPELINE-DOCTOR-STALE (P2 — NOT a rename of pipeline-diagnostician); F-CRON-PG-NET-TIMEOUT-5S (P2); F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 security).

**Closed v2.54:** video-worker `verify_jwt` durable fix (P3) — landed via `supabase/config.toml` this turn.

**Open from this session (deferred to v2.55+):** F-CRON-PG-NET-TIMEOUT-5S; F-CRON-AUTO-APPROVER-SECRET-INLINE; F-CRON-INGEST-STALE + F-CRON-COMPLIANCE-MONITOR-STALE + F-CRON-PIPELINE-AI-SUMMARY-STALE + F-CRON-PIPELINE-DOCTOR-STALE; Music library activation checklist (PK action); Emergency redeploy governance question (PK decision); first deploy that uses the new `config.toml` (will require D-01); PHASES reconciliation now **10th**-deferred.

**Constraints respected:** No EF deploys. No Supabase writes (no DDL, no DML). No cron edits. `supabase functions list` only (read). Read-only `SELECT` against `cron.job` and `m.vw_ef_drift_current`. Memory `recent_updates` v2.54 entry handled by chat at session end.

---

## 🟡 Next session priorities (rebuilt v2.55 per M6 Phase A closure)

1. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — unchanged from v2.54. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent (M6 Phase A now closed; M6 Phase B + M8 still pending per their respective briefs).
2. **AI cost view P3** (quick win, ~1h) — unchanged. Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile.
3. **cc-0004 (M6 Phase B) apply** — sequencing gate **MET v2.55**; CC owns apply when PK directs. Expected scope: 43 v4 mismatch rows + 2 slot-driven CFW IG rows from cc-0003 v1 HALT. Promoted from carry to Top 3 by M6 Phase A closure.

Plus standing P0:
- **Personal businesses check-in** — Crazy Domains refund status + any new items from Care for Welfare / Property Buyers Agent / NDIS Accessories.

Carries (lower priority, unchanged from v2.54 except M6 Phase A removed and cc-0004 promoted):
- F-YT-PUB-AVATAR-EXCLUSION (P3, latent)
- F-PUB-009 V3-V5 + 7-day flow (P2, passive monitoring)
- F-AAP-NEEDS-REVIEW-BACKLOG (P2)
- F-AI-WORKER-PARSER-SKIP-BUG V4 (P2, passive)
- morning-inbox-sweep-v1 brief amendment (P3)
- Vault `service_role_key` naming hygiene (P3)
- `docs/audit/health/2026-05-06.md` follow-up (P3)
- Dashboard mobile responsiveness (P3)
- 21+ close-the-loop UPDATEs to `m.chatgpt_review` (cumulative ~25+ pending after v2.55 cc-0003 v2 fire)
- Dashboard roadmap PHASES reconciliation (P3, **11th** consecutive deferral, was 10th in v2.54)
- `00_overview.md` 11-section table reconciliation (P3)
- Invegent IG cap-throttle planning (P3)
- CFW post-ai-worker dead drafts (P3)
- **cc-0005 (M8 atomic cutover) PARKED** — blocked by cc-0004 completion + §1.0 PK confirmation (post-cutover enqueue path + `get_next_scheduled_for` callers).
- F-CRON-PG-NET-TIMEOUT-5S, F-CRON-AUTO-APPROVER-SECRET-INLINE (security), 4× F-CRON-*-STALE (all P2, carried from v2.54)
- Music library activation checklist (PK action) + Emergency redeploy governance question (PK decision) — carried from v2.54.

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.54. All standing items intact (NDIS-Yarns IG `publish_enabled=false`, cron 53/11/64/65 paused, jobid 12 planner-hourly, ~25+ close-the-loop UPDATEs pending, 32 historical orphans, etc.).

**v2.55 update on standing items:**
- 108 historical Bug 3 fingerprint queue rows — cc-0003 v2 dead-lettered 9 of these (the actively-queued cohort matching the v2 narrowed criterion of `pd.slot_id IS NULL`). The remaining 99 may be a mix of already-dead rows from prior cycles + 2 slot-driven rows that fall to cc-0004 + others outside the v2 criterion. cc-0004 will sweep the 2 slot-driven CFW IG rows. **Net legacy queue noise after cc-0003 v2:** materially reduced.
- 47 v4 mismatch queue rows / M6 Phase B — sequencing gate **MET v2.55**; cc-0004 apply ready when PK directs. CC owns apply.
- M8 atomic cutover (cc-0005) — brief drafted commit `6f16c40e`; **PARKED** at §1.0 hard PK confirmation gate.
- T-MCP-02 quota: cumulative +1 this session for cc-0003 v2 D-01 fire (clean PASS). Close-the-loop UPDATE deferred per PK scope.
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true). No drift fires this session.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged.
- Dashboard roadmap PHASES array stale since 3 May — **11th** consecutive deferral (was 10th in v2.54).
- M6 Phase A P1 — **CLOSED v2.55** (commit `d60dcfbc`).
- cc-0003 v1 brief + result + cc-0003 v2 brief + result + cc-0004 brief + cc-0005 brief — untouched by this turn (all CC's commits + chat's prior commits stay canonical).
- Memory `recent_updates` v2.55 entry **deferred** this turn per PK explicit scope.
- `m.chatgpt_review` close-the-loop UPDATE for cc-0003 v2 D-01 fire **deferred** this turn per PK explicit scope ("no Supabase writes").

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (oldest of the prior 1–2 inlined sessions drops out)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** **v2.55 status:** ~24KB after this update (was ~25KB at v2.54 close — v2.55 inline replaces v2.53 inline; v2.54 inline preserved as second-most-recent). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54 close. Sweep will require relocating older inlined sessions into a v2.50+ archive bucket; deferred to a separate cycle.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-09 Sydney — v2.55: **M6 Phase A CLOSED via cc-0003 v2 APPLIED** by CC via Supabase MCP `apply_migration` (commit `d60dcfbc`, 9 rows dead-lettered, V1–V6 all PASS, no rollback). cc-0004 (M6 Phase B) sequencing gate **MET**; CC owns apply when PK directs. cc-0005 (M8 atomic cutover) **PARKED** at §1.0 hard PK confirmation gate. Brief-runner-v0 HALT-then-correction loop completed end-to-end (cc-0003 v1 HALT → diagnostic → v2 patch + result preservation → v2 APPLIED). 6 lessons captured (L1–L6). T-MCP-02 quota +1 (close-the-loop deferred). P0+P1 open: ~4 → ~3. PHASES reconciliation now **11th** carry. Previous (v2.54): video-worker v3.0.0 deploy + verify_jwt regression recovered + durable `supabase/config.toml` landed.*
