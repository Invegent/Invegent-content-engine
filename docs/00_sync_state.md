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
| 2026-05-09 | cc-0004-applied-m6-phase-b-closed | **M6 Phase B CLOSED via cc-0004 APPLIED (v2.56).** 43 rows dead-lettered across 7 (client, platform) partitions; both cc-0003 v1 HALT slot-bound CFW IG rows captured. All V1–V6 PASS. No rollback. Result file commit `9d5bdd37`. **M6 dead-letter cycle now functionally complete: 9 (Phase A) + 43 (Phase B) = 52 residual rows cleared.** Schedule deltas -1d to +21d confirm pre-M4 residue, not minor drift. P3.3 outlier: 1 LinkedIn queue row with `pd.approval_status='draft'` dead-lettered (D-01 reviewer cleared as not blocking). Brief-runner-v0 L6 (cross-brief propagation) validated end-to-end. New L7 (informational co-occurrence pattern), L8 (multi-table IN-subquery pattern), L9 (schedule-delta evidence pattern) logged as candidates. cc-0005 §1.0 gate: items 3 + 4 now MET; items 1 + 2 still blocked. Chat investigation last turn established Path (A) cutover architecture (rewrite cron 48 in place, do not disable). cc-0005 patch deferred to PK direction. T-MCP-02 +1. P0+P1 open: ~3 → ~2. PHASES reconciliation now **12th** carry. | `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` |
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | **M6 Phase A CLOSED via cc-0003 v2 APPLIED (v2.55).** Brief-runner-v0 HALT-then-correction loop completed end-to-end across 8–9 May. CC HALTed cc-0003 v1 at §1.5 (slot_driven_count=2 vs expected 0; commit `2acdee33`); chat fired post-HALT diagnostic confirming both anomalous queue_ids are v4 mismatch (Phase B) rows that incidentally fingerprint Bug 3 because M4 was forward-only on `pd`; cc-0003 v1 → v2 patch + v1 result preservation in single chat commit `f91d9c79`; cc-0004 §1.5 propagation patch (CC, PK direct greenlight) commit `6675aa7c`; cc-0005 M8 atomic cutover brief draft (chat) commit `6f16c40e`; cc-0003 v2 D-01 PASS + PK explicit approval phrase + cc-0003 v2 APPLIED by CC via Supabase MCP (commit `d60dcfbc`, 9 rows dead-lettered, V1–V6 all PASS, no rollback). cc-0004 (M6 Phase B) sequencing gate **MET**; cc-0005 PARKED at §1.0 hard PK confirmation gate. 6 brief-runner-v0 lessons captured (L1–L6). T-MCP-02 +1. P0+P1 open: ~4 → ~3. PHASES reconciliation now **11th** carry. | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | **video-worker v3.0.0 DEPLOYED + verify_jwt regression recovered + durable `supabase/config.toml` LANDED (v2.54).** | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |
| 2026-05-08 | f-yt-ny-format-fix | **F-YT-NY-FORMAT-SELECTION CLOSED end-to-end (v2.53).** | `docs/runtime/sessions/2026-05-08-f-yt-ny-format-fix.md` |
| 2026-05-08 | v2.52-insights-sync-rpc-closure | **Productive close (v2.52).** 3 findings closed in single session. | `docs/runtime/sessions/2026-05-08-v2.52-insights-sync-rpc-closure.md` |
| 2026-05-08 | personal-finance-cowork-inbox-brief | **Lightweight close (v2.51).** | `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md` |
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

### 2026-05-09 Sydney — cc-0004 APPLIED (M6 Phase B closed; M6 dead-letter cycle now functionally complete) (v2.56)

**Outcome:** **M6 Phase B CLOSED.** cc-0004 (v4 mismatch dead-letter) APPLIED via Supabase MCP `apply_migration` by CC (commit `9d5bdd37`). 43 rows dead-lettered across 7 `(client, platform)` partitions. Both cc-0003 v1 HALT slot-bound CFW IG rows (`929ee2f9-...`, `30fa6594-...`) captured. All 6 verification queries (V1–V6) PASS. No rollback. **M6 dead-letter cycle now functionally complete: 9 (Phase A) + 43 (Phase B) = 52 residual rows cleared.**

**Apply summary:** migration `m6_phase_b_v4_mismatch_dead_letter_v1`; `dead_reason='anomalous_pre_m4_v4_mismatch'`; `apply_migration` returned `{"success": true}`; sequencing gate MET (cc-0003 v2 result `d60dcfb`); D-01 PASS; PK approval phrase `"proceed with cc-0004 apply"`; final read-only re-verification identical to initial pre-flight (no drift on §1.3 = 43, §1.5 = 2 informational, §1.7 = 0, §1.4 queue_id list); SQL applied with `updated_at = NOW()` per brief §3 note 3 amendment.

**Verification (V1–V6 all PASS):** V1 post_dead_reason_count = 43 (= 0 + 43); V2 v2_count = 0; V3 queued+failed = 436 (= 479 - 43); V4 dead = 100 (= 57 + 43); V5 result list set-equal to captured 43 IDs; V6 per-status totals coherent (queued=436, dead=100, published=95, failed absent both sides).

**Partition characterization (7 (client, platform) pairs):**

| client_id | platform | rows | min Δsec | max Δsec |
|---|---|---:|---:|---:|
| `3eca32aa-…` | facebook | 1 | +440343 | +440343 |
| `3eca32aa-…` | instagram | 7 | -71504 | +20642 |
| `3eca32aa-…` | linkedin | 1 | +1029368 | +1029368 |
| `4036a6b5-…` | facebook | 10 | +1188899 | +1814400 |
| `4036a6b5-…` | youtube | 10 | +621899 | +1728000 |
| `93494a09-…` | instagram | 6 | -85821 | +22185 |
| `fb98a472-…` | youtube | 8 | -84572 | +604800 |

Schedule deltas range -85,821s (-1 day) to +1,814,400s (+21 days) — confirms these were materially-wrong scheduling artifacts (pre-M4 residue), not minor drift.

**P3.3 outlier (noted, not blocking):** 1 of 43 rows had `pd.approval_status='draft'` (queue_id `1a21199e-...`, LinkedIn). D-01 reviewer cleared: "queue row dead-lettered, draft itself unchanged." Confirmed. Logged as P3 backlog observation (passive validator).

**Brief-runner-v0 lessons — cc-0004 cycle:**
- **L6 (cross-brief propagation) VALIDATED end-to-end.** cc-0003 v1 HALT triggered chat-authored cc-0004 §1.5 patch (commit `6675aa7c`) BEFORE cc-0003 v2 was applied. CC executed cc-0004 cleanly post-cc-0003 v2 with no friction. The 2 CFW IG rows surfaced in cc-0004 §1.5 (informational, post-patch) and were correctly captured in apply set.
- **L7 candidate** — "informational, expected non-zero" co-occurrence pattern works (cc-0004 §1.5 downgraded from HALT to capture-for-D-01-packet).
- **L8 candidate** — multi-table criterion via IN-subquery pattern works at production scale (cc-0004 was first multi-table criterion bulk UPDATE in M-series).
- **L9 candidate** — schedule-delta evidence in result files validates dead-letter rationale post-apply.

L1–L4 + L6 are baseline patterns. L5 + L7 + L8 + L9 are promotion candidates after one more vindication.

**M6 dead-letter cycle complete:**

| Brief | Phase | dead_reason | Rows | Apply commit |
|---|---|---|---:|---|
| cc-0003 v2 | M6 Phase A | `anomalous_scheduled_for_bug3_fallback` | 9 | `d60dcfb` |
| cc-0004 | M6 Phase B | `anomalous_pre_m4_v4_mismatch` | 43 | `9d5bdd37` |
| **Total** | | | **52** | |

**cc-0005 §1.0 PK confirmation gate state (post v2.56):**
- ✅ Item 3: cc-0003 v2 result Complete — met v2.55.
- ✅ Item 4: cc-0004 result Complete — **met v2.56 (this turn).**
- 🔲 Item 1: post-cutover enqueue path — NOT confirmed. Chat investigation last turn (9 May) established cron 48 is the SOLE autonomous inserter into `m.post_publish_queue`; `m.fill_pending_slots` creates drafts + ai_jobs only; no triggers insert queue rows; the 4 other inserters are dashboard-manual / audit. Disabling cron 48 with no replacement = autonomous publishing stops. **cc-0005 brief premise (component 1 = disable cron 48) is incorrect as written.**
- 🔲 Item 2: `public.get_next_scheduled_for` callers — 1 caller confirmed (cron 48). PK confirmation pending.

**Recommended Path (A):** rewrite cc-0005 component 1 from "disable cron 48" to "`cron.alter_job(48, command := <new body>)` removing `public.get_next_scheduled_for` from the COALESCE chain in cron 48's command body". Cron 48 keeps handling autonomous v4 enqueue; legacy fallback deprecated at the call site. Components 2 + 3 remain valid. **Requires cc-0005 doc-only patch under PK direction.** Not yet acted on.

**Constraints respected this turn:** No Supabase writes. No D-01 fire. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. No cc-0005 apply work. Single doc-only commit covering 3 files. cc-0003/cc-0004/cc-0005 briefs and result files **untouched**.

**Closed v2.56:** M6 Phase B (P1) — cc-0004 commit `9d5bdd37`.

**Open / deferred this turn (carried per PK explicit scope):**
- 2 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 D-01 fires) — Supabase writes, PK excluded.
- Memory `recent_updates` v2.55 + v2.56 entries (chat-owned at next opportunity).
- Dashboard PHASES reconciliation — **12th** consecutive deferral.
- cc-0005 Path (A) patch — awaiting PK direction.

---

### 2026-05-09 Sydney — cc-0003 v2 APPLIED (M6 Phase A closed; brief-runner-v0 HALT-then-correction loop end-to-end) (v2.55)

**Outcome:** **M6 Phase A CLOSED.** cc-0003 v2 APPLIED via Supabase MCP `apply_migration` by CC. 9 rows dead-lettered (NY × 7 IG + PP × 2 IG; all `approval_status='approved'`; all `pd.slot_id IS NULL`). All 6 verification queries (V1–V6) PASS. No rollback. **cc-0004 (M6 Phase B) sequencing gate now MET.** cc-0005 (M8 atomic cutover) PARKED at §1.0 hard PK confirmation gate.

**Multi-stage cycle (8–9 May Sydney):**
1. cc-0001 Phase 0 defaults result + M5–M8 reconciliation brief (8 May late evening).
2. cc-0003 v1 brief drafted + patched (V1 baseline + softened D-01 wording); cc-0004 v1 brief drafted.
3. cc-0003 v1 EXECUTED by CC → **HALTED at §1.5** (slot_driven_count=2 vs expected 0). Result file `2acdee33`.
4. Chat fired post-HALT read-only diagnostic on the 2 anomalous queue_ids (`929ee2f9-...`, `30fa6594-...`). Confirmed: both rows are v4 mismatch (Phase B / cc-0004) scope that incidentally fingerprint Bug 3 because M4 was forward-only on `pd`. v1 §1.5 invariant assumption ("M4 backfilled, slot-driven can't fingerprint Bug 3") empirically falsified.
5. cc-0003 v1 → v2 patch + v1 HALT result file preservation in single chat commit `f91d9c79`. v2 narrows criterion to `pd.slot_id IS NULL`; expected count 11 → 9; range [5,25] → [3,20]; §1.5 inverted from disjointness HALT to partition arithmetic check; multi-table JOIN + IN-subquery SQL form.
6. cc-0004 §1.5 propagation patch (CC, PK direct greenlight) commit `6675aa7c`. Removed empirically-falsified disjointness assumption; established structural disjointness on `pd.slot_id` discriminator. cc-0004 v1 migration name retained (never applied or HALTed).
7. cc-0005 M8 atomic cutover brief drafted (chat) commit `6f16c40e`. Three-component atomic migration. Novel §1.0 hard PK confirmation gate.
8. cc-0003 v2 D-01 review fired chat-side — verdict `agree` / `proceed` / clean PASS / 0 pushback / 0 escalation.
9. PK explicit approval phrase received: `"myself pk approve - proceed with cc-0003 v2 apply"`.
10. cc-0003 v2 APPLIED by CC via Supabase MCP `apply_migration` (commit `d60dcfbc`). `{"success": true}`. Final read-only re-verification: identical to initial pre-flight (no drift). V1–V6 all PASS. No rollback.

**Verification (V1–V6 all PASS):** V1 post_dead_reason_count = 9 (= 0 + 9); V2 v2_count = 0; V3 queued+failed = 479 (= 488 - 9); V4 dead = 57 (= 48 + 9); V5 result list set-equal to captured 9 IDs; V6 per-status totals coherent (queued=479, dead=57, published=95, failed absent both sides).

**Brief-runner-v0 lessons captured (6):**
- **L1** v1 HALT works — first apply-class HALT in trial, load-bearing, no production state touched.
- **L2** v2 patch works — doc-only patch produced correctly-scoped migration that applied cleanly.
- **L3** result-file preservation works — v1 HALT + v2 APPLIED co-located in same file (commit `d60dcfbc`).
- **L4** pre-state baseline pattern is now required — V1 must use `pre_dead_reason_count + N`, never assume baseline = 0.
- **L5** brief invariant assumptions can be empirically wrong — disjointness invariants must be pre-tested with read-only SELECT.
- **L6** cross-brief patch propagation required when invariant fails (cc-0004 §1.5 patched in same cycle).

**Closed v2.55:** M6 Phase A (P1) — cc-0003 v2 commit `d60dcfbc`.

---

## 🟡 Next session priorities (rebuilt v2.56 per M6 Phase B closure)

1. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — unchanged from v2.55. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation: M6 Phase A + B both **CLOSED v2.56**; M7 (doc-only) + M8 still pending.
2. **AI cost view P3** (quick win, ~1h) — unchanged. Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile.
3. **cc-0005 / M8 atomic cutover — Path (A) patch under PK direction** — **NEW Top 3 v2.56.** §1.0 gate items 3 + 4 now MET; items 1 + 2 still blocked. Recommended cutover architecture (Path A): rewrite cron 48's command body in place via `cron.alter_job` to remove `get_next_scheduled_for` from COALESCE; do NOT disable cron 48 (would stop autonomous publishing). Requires cc-0005 doc-only patch under PK direction before any apply work.

Plus standing P0:
- **Personal businesses check-in** — Crazy Domains refund status + any new items from Care for Welfare / Property Buyers Agent / NDIS Accessories.

Carries (lower priority, unchanged from v2.55 except M6 Phase B closure):
- F-YT-PUB-AVATAR-EXCLUSION (P3, latent)
- F-PUB-009 V3-V5 + 7-day flow (P2, passive monitoring)
- F-AAP-NEEDS-REVIEW-BACKLOG (P2)
- F-AI-WORKER-PARSER-SKIP-BUG V4 (P2, passive)
- morning-inbox-sweep-v1 brief amendment (P3)
- Vault `service_role_key` naming hygiene (P3)
- `docs/audit/health/2026-05-06.md` follow-up (P3)
- Dashboard mobile responsiveness (P3)
- 2 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 D-01 fires)
- Dashboard roadmap PHASES reconciliation (P3, **12th** consecutive deferral, was 11th in v2.55)
- `00_overview.md` 11-section table reconciliation (P3)
- Invegent IG cap-throttle planning (P3)
- CFW post-ai-worker dead drafts (P3)
- F-CRON-PG-NET-TIMEOUT-5S, F-CRON-AUTO-APPROVER-SECRET-INLINE (security), 4× F-CRON-*-STALE (all P2, carried from v2.54)
- Music library activation checklist (PK action) + Emergency redeploy governance question (PK decision) — carried from v2.54.
- **NEW v2.56 P3 backlog observation** — 1 LinkedIn queue row (`1a21199e-...`) was in queue with `draft.approval_status='draft'` (cc-0004 P3.3 outlier); investigation deferred as passive-validator.

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.55 except for M6 Phase B closure.

**v2.56 update on standing items:**
- **M6 dead-letter cycle: COMPLETE.** cc-0003 v2 (9 rows Phase A) + cc-0004 (43 rows Phase B) = 52 residual rows cleared. `m.post_publish_queue` `status IN ('queued','failed')` rows now reflect current intent, not historical drift.
- **2 slot-driven CFW IG queue rows** (`929ee2f9-...`, `30fa6594-...`) — **dead-lettered v2.56** as part of cc-0004's 43-row apply set. Fully resolved.
- **47 v4 mismatch queue rows** carry-forward note from v2.50 sessions — **resolved v2.56** (cc-0004 dead-lettered 43; the original 47 figure from M5 session record dropped to 43 via natural drain over 4 days).
- **108 historical Bug 3 fingerprint queue rows** carry-forward note — cc-0003 v2 dead-lettered the actively-queued narrowed-criterion cohort (9 rows). The remaining ~99 from the original 108 figure include already-dead rows from prior cycles, the 2 slot-driven CFW IG rows now caught by cc-0004, and others outside the v2 narrowed criterion. Net legacy queue noise after cc-0003 v2 + cc-0004 = materially resolved.
- **M8 atomic cutover (cc-0005)** — brief drafted commit `6f16c40e`; **REMAINS PARKED.** §1.0 gate items 3 + 4 MET v2.55/v2.56; items 1 + 2 still pending PK confirmation. Chat investigation 9 May established Path (A) is the recommended architecture (rewrite cron 48 in place, do not disable). cc-0005 patch under Path (A) deferred to PK direction.
- **M7 closure** — doc-only; folds into cc-0005 / M8 4-way sync per reconciliation §6 Q2 when M8 lands.
- **T-MCP-02 quota:** cumulative +1 v2.56 for cc-0004 D-01 fire. Cumulative +1 v2.55 for cc-0003 v2 D-01 fire. **2 close-the-loop UPDATEs pending** (deferred per PK "no Supabase writes" scope across both v2.55 and v2.56).
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true). No drift fires this cycle.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged.
- Dashboard roadmap PHASES array stale since 3 May — **12th** consecutive deferral.
- M6 Phase A P1 — **CLOSED v2.55**. M6 Phase B P1 — **CLOSED v2.56**.
- cc-0003 / cc-0004 / cc-0005 briefs and result files — untouched by this turn.
- Memory `recent_updates` v2.55 + v2.56 entries **deferred** per PK explicit scope across both versions.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (oldest of the prior 1–2 inlined sessions drops out)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** **v2.56 status:** ~24KB after this update (was ~24KB at v2.55 close — v2.56 inline replaces v2.54 inline; v2.55 inline preserved as second-most-recent). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54 close. Sweep will require relocating older inlined sessions into a v2.50+ archive bucket; deferred to a separate cycle.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-09 Sydney — v2.56: **M6 Phase B CLOSED via cc-0004 APPLIED** by CC via Supabase MCP `apply_migration` (commit `9d5bdd37`, 43 rows dead-lettered across 7 (client, platform) partitions, V1–V6 all PASS, no rollback). Both cc-0003 v1 HALT slot-bound CFW IG rows captured. **M6 dead-letter cycle now functionally complete: 9 (Phase A) + 43 (Phase B) = 52 residual rows cleared.** Schedule deltas -1d to +21d confirm pre-M4 residue. P3.3 outlier (1 LinkedIn 'draft' row) cleared not-blocking. cc-0005 §1.0 gate: items 3 + 4 now MET v2.55/v2.56; items 1 + 2 still blocked (chat investigation last turn established Path A recommended cutover). Brief-runner-v0 L6 (cross-brief propagation) validated end-to-end; L7–L9 candidates logged. T-MCP-02 quota +1 (close-the-loop deferred). P0+P1 open: ~3 → ~2. PHASES reconciliation now **12th** carry. Previous (v2.55): M6 Phase A CLOSED via cc-0003 v2 APPLIED.*
