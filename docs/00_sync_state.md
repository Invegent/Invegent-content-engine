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
| 2026-05-09 | cc-0006-closed-cc-0005-v3-patched | **F-CRON-PG-NET-TIMEOUT-5S CLOSED via cc-0006 APPLIED + cc-0005 / M8 Path A v3 PATCHED (v2.57).** Combined doc-only close. cc-0006 (`cron_pg_net_timeout_30s_v1`) APPLIED by CC via Supabase MCP `execute_sql` wrapping 3 `cron.alter_job(...)` in single transaction; jobs 33/44/58 each patched with `timeout_milliseconds := 30000` (35-byte command growth, byte-for-byte URL/headers/schedule preservation, job 58 inline secret preserved character-for-character). V1+V2+V3 PASS strictly; V4 PASS for load-bearing "no regression in `timed_out`" (3 pre-existing background HTTP 401s on `*/5` schedule, stable across apply boundary). No rollback. Result file commit `c72bc327`. First `cron_edit` D-01 action_type. **F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately OPEN (P2 sec) — cc-0006 deliberately preserved job 58's inline `x-auto-approver-key`.** **HTTP 401 5-min cron pattern surfaced as NEW v2.57 triage candidate** — likely jobid 48 or another `*/5` cron whose endpoint returns 401; out-of-scope for cc-0006; not a regression. **cc-0005 / M8 Path A v3 PATCHED** chat-side under PK direction (commit `245005a3`); supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs (substring matches against `get_next_scheduled_for` would have matched comment text in rewritten cron 48 body and fired V8/V10 RAISE EXCEPTION). v3 fixes: function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` at all 11 call sites; comment rephrase to "legacy fallback removed from COALESCE chain."; H1–H6 extended pre-flight (P1.5b distinct created_by, P1.5c un-publishable cohort, P1.5d alignment HALT §8.2.l, §1.4b ORIGINAL_COMMENT capture); M1–M4 hygiene (rollback unique tag, 4-item amendment list, removed unused var, TOCTOU note); L1–L2 (§1.2 expanded trigger survey, §1.3+V7 schedule capture). **Brief ready for pre-flight gating, NOT apply.** Apply gates remaining: §1.5d alignment=0 + §1.5c PK direction on un-publishable cohort + D-01 + PK approval. Brief-runner-v0 L10–L14 captured from cc-0006 cycle (cron_edit, md5 fingerprint, substrate-drift guard, V3 immediate eval, V4 strict-vs-load-bearing) + L15–L18 from cc-0005 v3 (review pass before apply, function-call regex, in-place patching, pre-flight cohort surfacing). T-MCP-02 +1 (cc-0006 D-01); cumulative pending close-the-loops now 3 (cc-0003 v2 + cc-0004 + cc-0006). State-capture exceptions v2.57: 0. P0+P1 open: ~2 → ~2 (cc-0006 was P2). PHASES reconciliation now **13th** carry. | `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` |
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

### 2026-05-09 Sydney — cc-0006 CLOSED + cc-0005 v3 PATCHED (v2.57)

**Outcome:** Combined doc-only v2.57 close covering two prior cycles. **(1) F-CRON-PG-NET-TIMEOUT-5S CLOSED.** cc-0006 APPLIED via Supabase MCP `execute_sql` by CC (single transaction wrapping three `cron.alter_job(...)` statements). Jobs 33 (`video-worker-every-30min`), 44 (`heygen-worker-every-30min`), 58 (`auto-approver-sweep`) each patched with `timeout_milliseconds := 30000`. Each command grew by exactly 35 bytes; URLs/headers/body/schedule/active flag byte-for-byte preserved per job; job 58's inline `x-auto-approver-key` value preserved character-for-character. V1+V2+V3 PASS strictly. V4 PASS for load-bearing "no regression in `timed_out`" criterion (3 pre-existing background HTTP 401s on a `*/5` schedule, stable across apply boundary). No rollback. Result file commit `c72bc3276b7575c0c920b75c76ead396dbaa6a95` (blob `9613c133`, size 11,188 B). First `cron_edit` D-01 action_type in cc-NNNN series. **(2) cc-0005 / M8 Path A v3 PATCHED** chat-side under PK direction. v3 supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs that would have blocked first apply at the in-migration verify gates (substring matches against `get_next_scheduled_for` would have matched comment text in the rewritten cron 48 body, fired RAISE EXCEPTION, rolled back the transaction). v3 fixes: function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` at all 11 call sites; comment rephrase to "legacy fallback removed from COALESCE chain."; H1–H6 extended pre-flight (P1.5b distinct `pd.created_by` enumeration; P1.5c un-publishable legacy draft cohort; P1.5d slot-driven alignment check with HALT §8.2.l; §1.4b ORIGINAL_COMMENT capture); M1–M4 hygiene (rollback unique-tag guidance, 4-item amendment list, removed unused `v_min_expected`, TOCTOU note); L1–L2 defensive (§1.2 expanded trigger survey, §1.3 + V7 schedule capture). v3 commit `245005a3c86dc23cac8bd6cae41fea5fd135e5f9` (blob `2284ef2d`, size 75,985 B). Brief now ready for pre-flight gating; apply still requires §1.5d alignment=0 + §1.5c PK direction on un-publishable cohort + D-01 + PK approval.

**Triage candidate surfaced (NEW v2.57): HTTP 401 5-min cron pattern.** During cc-0006 V4, 3 HTTP 401 responses were observed in the 30-min `_http_response` window at 02:20, 02:25, 02:35 UTC — pattern matches a `*/5` cron schedule. NOT a regression introduced by cc-0006 (stable across apply boundary). Out-of-scope for cc-0006. Likely candidates: jobid 48 `enqueue-publish-queue-every-5m` or another 5-min cron whose endpoint returns 401. Logged for separate triage if PK directs.

**D-01 fires this cycle (chat side):** 1 fire (cc-0006 D-01 review, prior cycle by chat). v2.57 4-way sync close commit (this) is doc-only and per protocol does NOT require a fire. cc-0005 v3 patch (prior turn by chat) is doc-only and did NOT require a fire.

**Brief-runner-v0 lessons — cc-0006 + cc-0005 v3 cycles:**

- **L10 (cron_edit action_type)** — reviewer applied same standards as `sql_destructive` despite zero data-state impact.
- **L11 (md5 baseline + post-md5 fingerprint)** — cheap fingerprint-level proof that the patch landed exactly as specified.
- **L12 (substrate-drift guard)** — paranoid but cheap; worth promoting to standing pattern for any brief that justifies an action on a substrate constant.
- **L13 (V3 immediate evaluation)** — fresh cron_health_snapshot landed right after apply; cannot be relied on in general; future cron-edit briefs should retain the wait-for-next-snapshot expectation.
- **L14 (V4 strict-vs-load-bearing distinction)** — pre-existing 401 background falsified strict 100%-http_200 criterion but downgraded "no regression in `timed_out`" semantic resolved cleanly.
- **L15 (chat review pass before apply)** — explicit doc-review step caught 5 critical regex bugs + 6 H + 4 M + 2 L items before first apply. Pattern: explicit review pass before D-01 fire materially reduces apply-time risk for any new brief shape.
- **L16 (function-call regex pattern)** — portable PostgreSQL pattern for verifying function-call presence/absence in function/view/cron bodies.
- **L17 (in-place patching pattern)** — a brief with critical correctness or premise bugs caught at review time can be in-place patched as long as it has not yet been applied.
- **L18 (pre-flight cohort surfacing pattern)** — when a brief retires or modifies a code path, surface the cohorts the retired path was processing; PK decides handling.

L10–L18 are candidates from cc-0006 + cc-0005 v3; promotion to canonical or baseline after one more vindication each.

**cc-0005 §1.0 PK confirmation gate state (post v2.57):**

- ✅ Item 3: cc-0003 v2 result Complete — met v2.55.
- ✅ Item 4: cc-0004 result Complete — met v2.56.
- 🔲 Item 1: post-cutover enqueue path — Path A architecture (rewrite cron 48 in place) confirmed by chat investigation 9 May; brief patched v3. Apply pending.
- 🔲 Item 2: `public.get_next_scheduled_for` callers — 1 caller confirmed (cron 48). PK confirmation pending.

**Constraints respected this turn:** No Supabase writes. No D-01 fire. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. No M8 apply work. Single doc-only commit covering 3 files. cc-0003 / cc-0004 / cc-0005 / cc-0006 briefs and result files **untouched**.

**Closed v2.57:** F-CRON-PG-NET-TIMEOUT-5S (P2) — cc-0006 commit `c72bc327`.

**Open / deferred this turn (carried per PK explicit scope):**

- 3 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 D-01 fires) — Supabase writes, PK excluded.
- Memory `recent_updates` v2.55 + v2.56 + v2.57 entries (chat-owned at next opportunity).
- Dashboard PHASES reconciliation — **13th** consecutive deferral.
- cc-0005 v3 apply work — awaiting PK direction to schedule apply session.
- HTTP 401 5-min cron triage — awaiting PK direction.
- Phase 0 still NOT scheduled.

---

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

**Brief-runner-v0 lessons — cc-0004 cycle:** L6 (cross-brief propagation) VALIDATED end-to-end. L7–L9 candidates logged. (See v2.56 session file for detail.)

**M6 dead-letter cycle complete:**

| Brief | Phase | dead_reason | Rows | Apply commit |
|---|---|---|---:|---|
| cc-0003 v2 | M6 Phase A | `anomalous_scheduled_for_bug3_fallback` | 9 | `d60dcfb` |
| cc-0004 | M6 Phase B | `anomalous_pre_m4_v4_mismatch` | 43 | `9d5bdd37` |
| **Total** | | | **52** | |

**Closed v2.56:** M6 Phase B (P1) — cc-0004 commit `9d5bdd37`.

---

## 🟡 Next session priorities (rebuilt v2.57)

1. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — unchanged from v2.55/v2.56. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation: M6 Phase A + B both **CLOSED v2.55/v2.56**; M7 (doc-only) + M8 (cc-0005 v3 patched, awaiting apply) still pending.
2. **AI cost view P3** (quick win, ~1h) — unchanged. Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile.
3. **cc-0005 / M8 Path A v3 — APPLY scheduling** — **REPHRASED v2.57.** Brief is patched to v3 (commit `245005a3`) and ready for pre-flight gating. **Apply gates remaining: §1.5d alignment count = 0 + §1.5c PK direction on un-publishable legacy draft cohort + D-01 fire + PK approval.** PK directs whether to schedule apply session (chat-driven OR CC-driven per brief-runner-v0).
4. **HTTP 401 5-min cron triage** — **NEW v2.57.** 3 HTTP 401 responses on `*/5` schedule observed during cc-0006 V4 (likely jobid 48 `enqueue-publish-queue-every-5m` or another 5-min cron). NOT a regression. Read-only triage if PK directs. Likely a brief shape similar to cc-0006 (cron-edit class) IF the resolution is a config or auth fix.

Plus standing P0:
- **Personal businesses check-in** — Crazy Domains refund status + any new items from Care for Welfare / Property Buyers Agent / NDIS Accessories.

Carries (lower priority, mostly unchanged from v2.56):
- **F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN)** — cc-0006 deliberately preserved job 58's inline `x-auto-approver-key` value. Rotation requires PK auth + vault entry creation + cron command refactor (separate cc-NNNN brief).
- F-YT-PUB-AVATAR-EXCLUSION (P3, latent)
- F-PUB-009 V3-V5 + 7-day flow (P2, passive monitoring)
- F-AAP-NEEDS-REVIEW-BACKLOG (P2)
- F-AI-WORKER-PARSER-SKIP-BUG V4 (P2, passive)
- morning-inbox-sweep-v1 brief amendment (P3)
- Vault `service_role_key` naming hygiene (P3)
- `docs/audit/health/2026-05-06.md` follow-up (P3)
- Dashboard mobile responsiveness (P3)
- 3 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 D-01 fires)
- Dashboard roadmap PHASES reconciliation (P3, **13th** consecutive deferral, was 12th in v2.56)
- `00_overview.md` 11-section table reconciliation (P3)
- Invegent IG cap-throttle planning (P3)
- CFW post-ai-worker dead drafts (P3)
- 4× F-CRON-*-STALE (P2, all carried from v2.54): F-CRON-COMPLIANCE-MONITOR-STALE, F-CRON-INGEST-STALE, F-CRON-PIPELINE-AI-SUMMARY-STALE, F-CRON-PIPELINE-DOCTOR-STALE.
- Music library activation checklist (PK action) + Emergency redeploy governance question (PK decision) — carried from v2.54.
- v2.56 P3 backlog observation — 1 LinkedIn queue row (`1a21199e-...`) was in queue with `draft.approval_status='draft'`; investigation deferred as passive-validator.

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.56 except for v2.57 closure deltas.

**v2.57 update on standing items:**

- **F-CRON-PG-NET-TIMEOUT-5S: CLOSED.** cc-0006 commit `c72bc327`. Jobs 33/44/58 patched with `timeout_milliseconds := 30000`. V1+V2+V3 PASS strictly; V4 PASS load-bearing. No rollback.
- **F-CRON-AUTO-APPROVER-SECRET-INLINE: still OPEN.** cc-0006 deliberately preserved job 58 inline secret. Rotation requires PK auth.
- **HTTP 401 5-min cron pattern: NEW triage candidate.** Out-of-scope for cc-0006; not a regression. Logged for separate triage.
- **cc-0005 / M8 Path A: PATCHED v3, NOT APPLIED.** Commit `245005a3`. v2 Path A patch (`f70cb41f`) superseded due to 5 critical regex bugs caught in chat review. Apply gates remaining: §1.5d alignment + §1.5c PK direction + D-01 + PK approval.
- **M7 closure** — doc-only; folds into cc-0005 / M8 4-way sync per reconciliation §6 Q2 when M8 lands.
- **T-MCP-02 quota:** cumulative +1 v2.57 for cc-0006 D-01 fire (prior cycle by chat). Cumulative +1 v2.56 for cc-0004 D-01 fire. Cumulative +1 v2.55 for cc-0003 v2 D-01 fire. **3 close-the-loop UPDATEs pending** (deferred per PK "no Supabase writes" scope across v2.55/v2.56/v2.57).
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true). No drift fires this cycle.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged.
- Dashboard roadmap PHASES array stale since 3 May — **13th** consecutive deferral.
- M6 dead-letter cycle complete (Phase A v2.55, Phase B v2.56). 52 residual rows cleared.
- cc-0003 / cc-0004 / cc-0005 / cc-0006 briefs and result files — untouched by this turn.
- Memory `recent_updates` v2.55 + v2.56 + v2.57 entries **deferred** per PK explicit scope across all three versions.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (oldest of the prior 1–2 inlined sessions drops out)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** **v2.57 status:** ~25KB after this update (was ~24KB at v2.56 close; v2.57 inline replaces v2.55 inline). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54 close. Sweep will require relocating older inlined sessions into a v2.50+ archive bucket; deferred to a separate cycle.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-09 Sydney — v2.57: **F-CRON-PG-NET-TIMEOUT-5S CLOSED via cc-0006 APPLIED** by CC via Supabase MCP `execute_sql` (commit `c72bc327`, jobs 33/44/58 each patched with `timeout_milliseconds := 30000`, 35-byte command growth, byte-for-byte URL/headers/schedule preservation, job 58 inline secret preserved character-for-character, V1+V2+V3 PASS strictly, V4 PASS load-bearing "no regression" criterion, no rollback). First `cron_edit` D-01 action_type. **F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately OPEN (P2 sec).** **HTTP 401 5-min cron pattern surfaced as new triage candidate** — likely jobid 48 or another `*/5` cron whose endpoint returns 401; out-of-scope for cc-0006; not a regression. **cc-0005 / M8 Path A v3 PATCHED** chat-side under PK direction (commit `245005a3`); supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs (substring matches against `get_next_scheduled_for` would have matched comment text in rewritten cron 48 body and fired V8/V10 RAISE EXCEPTION). v3 fixes: function-call regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` at all 11 call sites; comment rephrase; H1–H6 extended pre-flight (P1.5b distinct created_by, P1.5c un-publishable cohort, P1.5d alignment HALT §8.2.l, §1.4b ORIGINAL_COMMENT capture); M1–M4 hygiene; L1–L2 defensive. **Brief ready for pre-flight gating, NOT apply.** Apply gates remaining: §1.5d alignment=0 + §1.5c PK direction + D-01 + PK approval. Brief-runner-v0 L10–L18 candidates captured. T-MCP-02 +1 (cc-0006 D-01); cumulative pending close-the-loops now 3 (cc-0003 v2 + cc-0004 + cc-0006). State-capture exceptions v2.57: 0. P0+P1 open: ~2 → ~2 (cc-0006 was P2). PHASES reconciliation now **13th** carry. Previous (v2.56): M6 Phase B CLOSED via cc-0004 APPLIED.*
